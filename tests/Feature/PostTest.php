<?php

use App\Models\Department;
use App\Models\Media;
use App\Models\Post;
use App\Models\User;
use App\Notifications\PostPublished;
use App\Support\CurrentDepartment;
use App\Support\RichText;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    Storage::fake('public');

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->outsider = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->payload = ['type' => 'news', 'title' => 'Hello', 'body' => '<p>Body text</p>', 'publish' => true];
});

test('an admin can publish a post into their department', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), $this->payload)
        ->assertRedirect(route('admin.posts', absolute: false));

    $post = Post::first();

    expect($post->department_id)->toBe($this->technical->id)
        ->and($post->author_id)->toBe($this->admin->id)
        ->and($post->isPublished())->toBeTrue();
});

test('a draft is not published and stays hidden', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'publish' => false]);

    $post = Post::first();

    expect($post->published_at)->toBeNull();

    $this->actingAs($this->member)->get(route('posts.show', $post))->assertNotFound();
    $this->actingAs($this->member)->get('/events')->assertInertia(fn (Assert $page) => $page->has('posts.data', 0));
});

test('editing a published post keeps its original publish date', function () {
    Carbon::setTestNow('2026-10-01 10:00:00');
    $post = Post::factory()->create(['department_id' => $this->technical->id, 'published_at' => now()->subDay()]);
    $original = $post->published_at->toDateTimeString();
    Carbon::setTestNow('2026-10-10 10:00:00');

    $this->actingAs($this->admin)->patch(route('admin.posts.update', $post), $this->payload);

    expect($post->fresh()->published_at->toDateTimeString())->toBe($original);

    Carbon::setTestNow();
});

test('harmful html is removed before saving', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [
        ...$this->payload,
        'body' => '<p onclick="steal()">Safe <strong>bold</strong></p><script>steal()</script><img src=x onerror=steal()><a href="javascript:steal()">bad</a><iframe src="https://evil.test"></iframe>',
    ]);

    $body = Post::first()->body;

    expect($body)->toContain('<strong>bold</strong>')
        ->and($body)->toContain('Safe')
        ->not->toContain('script')
        ->not->toContain('onclick')
        ->not->toContain('onerror')
        ->not->toContain('javascript:')
        ->not->toContain('iframe');
});

test('links open safely and keep their address', function () {
    expect(RichText::sanitize('<a href="https://example.com">x</a>'))
        ->toContain('href="https://example.com"')
        ->toContain('rel="noopener noreferrer"');
});

test('a long post is not silently cut short', function () {
    $html = '<p>'.str_repeat('a', 30000).'</p><p>end</p>';

    expect(RichText::sanitize($html))->toContain('end');
});

test('a post with no words is refused', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'body' => '<p></p>'])
        ->assertSessionHasErrors('body');
});

test('an event needs a date', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'type' => 'event'])
        ->assertSessionHasErrors('event_date');
});

test('event fields are dropped when a post is not an event', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [
        ...$this->payload, 'event_date' => '2026-12-01 10:00', 'venue' => 'Hall',
    ]);

    expect(Post::first()->event_date)->toBeNull()
        ->and(Post::first()->venue)->toBeNull();
});

test('a cover image is stored and stays in the library when the post is deleted', function () {
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [
        ...$this->payload, 'image' => UploadedFile::fake()->image('cover.png', 2400, 1200),
    ]);

    $post = Post::first();
    Storage::disk('public')->assertExists($post->image);
    expect(getimagesizefromstring(Storage::disk('public')->get($post->image))[0])->toBe(1600);

    $this->actingAs($this->admin)->delete(route('admin.posts.destroy', $post));

    Storage::disk('public')->assertExists($post->image);
    expect(Post::count())->toBe(0)
        ->and(Media::where('path', $post->image)->exists())->toBeTrue();
});

test('saving without a new image keeps the existing one', function () {
    $post = Post::factory()->create(['department_id' => $this->technical->id, 'image' => 'posts/keep.jpg']);

    $this->actingAs($this->admin)->patch(route('admin.posts.update', $post), [...$this->payload, 'image' => null])
        ->assertSessionHasNoErrors();

    expect($post->fresh()->image)->toBe('posts/keep.jpg');
});

test('department admins can not touch another department or church-wide posts', function () {
    $theirs = Post::factory()->create(['department_id' => $this->choir->id]);
    $churchWide = Post::factory()->create();

    foreach ([$theirs, $churchWide] as $post) {
        $this->actingAs($this->admin)->get(route('admin.posts.edit', $post))->assertNotFound();
        $this->actingAs($this->admin)->patch(route('admin.posts.update', $post), $this->payload)->assertNotFound();
        $this->actingAs($this->admin)->delete(route('admin.posts.destroy', $post))->assertNotFound();
    }

    expect(Post::count())->toBe(2);
});

test('the posts manager follows the department', function () {
    Post::factory()->create(['department_id' => $this->technical->id]);
    Post::factory()->create(['department_id' => $this->choir->id]);

    $this->actingAs($this->admin)->get('/admin/posts')
        ->assertInertia(fn (Assert $page) => $page->has('posts.data', 1));

    $this->actingAs($this->superAdmin)->get('/admin/posts')
        ->assertInertia(fn (Assert $page) => $page->has('posts.data', 2));
});

test('a super admin on all departments posts to the whole church', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.posts.store'), $this->payload);

    expect(Post::first()->department_id)->toBeNull();

    $this->actingAs($this->member)->get('/events')->assertInertia(fn (Assert $page) => $page->has('posts.data', 1));
    $this->actingAs($this->outsider)->get('/events')->assertInertia(fn (Assert $page) => $page->has('posts.data', 1));
});

test('a super admin who picked a department posts into it', function () {
    $this->actingAs($this->superAdmin)
        ->withSession([CurrentDepartment::SESSION_KEY => $this->choir->id])
        ->post(route('admin.posts.store'), $this->payload);

    expect(Post::first()->department_id)->toBe($this->choir->id);
});

test('members can not manage posts', function () {
    $this->actingAs($this->member)->get('/admin/posts')->assertForbidden();
    $this->actingAs($this->member)->post(route('admin.posts.store'), $this->payload)->assertForbidden();
});

test('the feed shows own department and church-wide posts only', function () {
    Post::factory()->create(['department_id' => $this->technical->id]);
    Post::factory()->create(['department_id' => $this->choir->id]);
    Post::factory()->create();

    $this->actingAs($this->member)->get('/events')
        ->assertInertia(fn (Assert $page) => $page->component('Member/Feed')->has('posts.data', 2));
});

test('the feed filters by type', function () {
    Post::factory()->create(['department_id' => $this->technical->id]);
    Post::factory()->event()->create(['department_id' => $this->technical->id]);
    Post::factory()->announcement()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->member)->get(route('member.events', ['type' => 'event']))
        ->assertInertia(fn (Assert $page) => $page->has('posts.data', 1)->has('calendar', 1));
});

test('the landing page shows the latest three public posts and no announcements', function () {
    Post::factory()->count(4)->create(['department_id' => $this->technical->id]);
    Post::factory()->announcement()->create(['department_id' => $this->technical->id, 'published_at' => now()]);
    Post::factory()->draft()->create(['department_id' => $this->technical->id]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('posts', 3)
        ->where('posts.0.type', 'news'));
});

test('the public news page lists news and events but not announcements or drafts', function () {
    Post::factory()->create(['department_id' => $this->technical->id]);
    Post::factory()->event()->create(['department_id' => $this->technical->id]);
    Post::factory()->announcement()->create(['department_id' => $this->technical->id]);
    Post::factory()->draft()->create(['department_id' => $this->technical->id]);

    $this->get(route('news'))->assertInertia(fn (Assert $page) => $page->component('Site/News')->has('posts.data', 2));
    $this->get(route('news', ['type' => 'event']))->assertInertia(fn (Assert $page) => $page->has('posts.data', 1)->has('calendar', 1));
});

test('announcements on the news page need a login and stay in the department', function () {
    Post::factory()->announcement()->create(['department_id' => $this->technical->id]);

    $this->get(route('news', ['type' => 'announcement']))->assertRedirect(route('login', absolute: false));

    $this->actingAs($this->member)->get(route('news', ['type' => 'announcement']))
        ->assertInertia(fn (Assert $page) => $page->has('posts.data', 1));

    $this->actingAs($this->outsider)->get(route('news', ['type' => 'announcement']))
        ->assertInertia(fn (Assert $page) => $page->has('posts.data', 0));
});

test('a post without a cover still has a picture', function () {
    $post = Post::factory()->create(['department_id' => $this->technical->id]);

    expect($post->toCard()['image_url'])->toStartWith('/images/site/');
    expect(file_exists(public_path($post->toCard()['image_url'])))->toBeTrue();
});

test('related posts never reveal announcements to guests', function () {
    $news = Post::factory()->create(['department_id' => $this->technical->id]);
    Post::factory()->announcement()->create(['department_id' => $this->technical->id]);
    Post::factory()->draft()->create(['department_id' => $this->technical->id]);

    $this->get(route('posts.show', $news))->assertInertia(fn (Assert $page) => $page->has('related', 0));
});

test('the homepage shows the next service and real service times', function () {
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Welcome')
        ->where('nextService.title', fn ($title) => str_contains($title, 'Service'))
        ->has('serviceTimes', 2)
        ->where('stats.departments', 1)
        ->where('stats.members', 3));
});

test('guests can read news but must log in for announcements', function () {
    $news = Post::factory()->create(['department_id' => $this->technical->id]);
    $announcement = Post::factory()->announcement()->create(['department_id' => $this->technical->id]);

    $this->get(route('posts.show', $news))->assertOk();
    $this->get(route('posts.show', $announcement))->assertRedirect(route('login', absolute: false));
});

test('an announcement is hidden from other departments', function () {
    $announcement = Post::factory()->announcement()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->member)->get(route('posts.show', $announcement))->assertOk();
    $this->actingAs($this->outsider)->get(route('posts.show', $announcement))->assertNotFound();
});

test('the home screen shows announcements and upcoming events', function () {
    Post::factory()->announcement()->create(['department_id' => $this->technical->id]);
    Post::factory()->event()->create(['department_id' => $this->technical->id]);
    Post::factory()->event()->create(['department_id' => $this->technical->id, 'event_date' => now()->subWeek()]);

    $this->actingAs($this->member)->get('/home')->assertInertia(fn (Assert $page) => $page
        ->has('announcements', 1)
        ->has('events', 1));
});

test('an event can be added to a calendar', function () {
    $post = Post::factory()->event()->create([
        'department_id' => $this->technical->id,
        'title' => 'Workshop, part 1',
        'event_date' => '2026-12-05 10:00:00',
    ]);

    $response = $this->get(route('posts.calendar', $post))->assertOk();

    expect($response->headers->get('Content-Type'))->toContain('text/calendar')
        ->and($response->getContent())
        ->toContain('DTSTART:20261205T090000Z')
        ->toContain('SUMMARY:Workshop\, part 1');
});

test('only events have calendar files', function () {
    $post = Post::factory()->create(['department_id' => $this->technical->id]);

    $this->get(route('posts.calendar', $post))->assertNotFound();
});

function subscribe(User $user): void
{
    $user->updatePushSubscription('https://push.example.com/'.$user->id, 'key', 'token', 'aes128gcm');
}

test('publishing tells subscribers in the department only', function () {
    Notification::fake();
    subscribe($this->member);
    subscribe($this->outsider);

    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'notify' => true]);

    Notification::assertSentTo($this->member, PostPublished::class);
    Notification::assertNotSentTo($this->outsider, PostPublished::class);
});

test('a church-wide post tells every subscriber', function () {
    Notification::fake();
    subscribe($this->member);
    subscribe($this->outsider);

    $this->actingAs($this->superAdmin)->post(route('admin.posts.store'), [...$this->payload, 'notify' => true]);

    Notification::assertSentTo([$this->member, $this->outsider], PostPublished::class);
});

test('nothing is sent for drafts, when switched off, or to suspended members', function () {
    Notification::fake();
    subscribe($this->member);

    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'publish' => false, 'notify' => true]);
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'notify' => false]);

    $this->member->update(['status' => 'suspended']);
    $this->actingAs($this->admin)->post(route('admin.posts.store'), [...$this->payload, 'notify' => true]);

    Notification::assertNothingSent();
});

test('publishing a draft sends once and later edits send nothing', function () {
    Notification::fake();
    subscribe($this->member);
    $post = Post::factory()->draft()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->admin)->patch(route('admin.posts.update', $post), [...$this->payload, 'notify' => true]);
    $this->actingAs($this->admin)->patch(route('admin.posts.update', $post), [...$this->payload, 'notify' => true]);

    Notification::assertSentToTimes($this->member, PostPublished::class, 1);
});

test('the message links to the post and holds no script', function () {
    $post = Post::factory()->create(['department_id' => $this->technical->id, 'title' => 'Hello', 'body' => '<p>Body</p>']);

    $message = (new PostPublished($post))->toWebPush($this->member, null)->toArray();

    expect($message['title'])->toBe('Hello')
        ->and($message['body'])->toContain('Body')
        ->and($message['data']['url'])->toBe('/posts/'.$post->id);
});

test('a member can switch notifications on and off', function () {
    $data = ['endpoint' => 'https://push.example.com/abc', 'keys' => ['p256dh' => 'k', 'auth' => 'a']];

    $this->actingAs($this->member)->post(route('push.store'), $data)->assertNoContent();

    expect($this->member->pushSubscriptions()->count())->toBe(1);

    $this->actingAs($this->member)->post(route('push.destroy'), ['endpoint' => $data['endpoint']])->assertNoContent();

    expect($this->member->pushSubscriptions()->count())->toBe(0);
});

test('only https push addresses are accepted and a login is needed', function () {
    $this->actingAs($this->member)->post(route('push.store'), [
        'endpoint' => 'http://push.example.com/abc', 'keys' => ['p256dh' => 'k', 'auth' => 'a'],
    ])->assertSessionHasErrors('endpoint');

    $this->post('/logout');

    $this->post(route('push.store'), [])->assertRedirect(route('login', absolute: false));
});
