<?php

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Support\ServiceGenerator;
use App\Support\Settings;
use Carbon\CarbonImmutable;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    Storage::fake('public');

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->colors = Settings::DEFAULT_COLORS;
});

test('only super admins can use settings', function (string $user) {
    $actor = $this->{$user};

    $this->actingAs($actor)->get('/admin/settings')->assertForbidden();
    $this->actingAs($actor)->put(route('admin.settings.colors'), $this->colors)->assertForbidden();
    $this->actingAs($actor)->post(route('admin.settings.branding'), ['church_name' => 'X'])->assertForbidden();
    $this->actingAs($actor)->post(route('admin.settings.super-admins.store'), ['user_id' => $actor->id, 'password' => 'password'])->assertForbidden();

    expect($actor->fresh()->hasRole('super_admin'))->toBeFalse()
        ->and(Settings::churchName())->toBe('Covenant Technical Department');
})->with(['admin', 'member']);

test('the church name reaches every page', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('admin.settings.branding'), ['church_name' => 'Winners Chapel'])
        ->assertSessionHasNoErrors();

    $this->post('/logout');

    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('branding.church_name', 'Winners Chapel'));
});

test('a logo upload replaces the old file and can be reset', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.branding'), [
        'church_name' => 'Church',
        'logo_dark' => UploadedFile::fake()->image('one.png', 900, 900),
    ])->assertSessionHasNoErrors();

    $first = Settings::get('logo_dark');
    Storage::disk('public')->assertExists($first);

    expect(getimagesizefromstring(Storage::disk('public')->get($first))[0])->toBe(640);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.branding'), [
        'church_name' => 'Church',
        'logo_dark' => UploadedFile::fake()->image('two.png'),
    ]);

    Storage::disk('public')->assertMissing($first);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.branding'), ['church_name' => 'Church', 'reset_logos' => true]);

    expect(Settings::logoUrl('dark'))->toBe('/images/logo-dark.png');
});

test('saving without choosing a logo keeps the current one', function () {
    Settings::set('logo_light', 'branding/keep.png');

    $this->actingAs($this->superAdmin)->post(route('admin.settings.branding'), ['church_name' => 'Church']);

    expect(Settings::get('logo_light'))->toBe('branding/keep.png');
});

test('an svg can not be uploaded as a logo', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.branding'), [
        'church_name' => 'Church',
        'logo_light' => UploadedFile::fake()->createWithContent('x.svg', '<svg onload="alert(1)"/>'),
    ])->assertSessionHasErrors('logo_light');
});

test('colours are written into the page as css variables', function () {
    $this->actingAs($this->superAdmin)
        ->put(route('admin.settings.colors'), [...$this->colors, 'primary_700' => '#123456'])
        ->assertSessionHasNoErrors();

    expect(Settings::cssVariables())->toContain('--primary-700: 18 52 86;');

    $this->get('/admin/settings')->assertSee('--primary-700: 18 52 86;', false);
});

test('colours that would make text unreadable are refused', function () {
    $this->actingAs($this->superAdmin)
        ->put(route('admin.settings.colors'), [...$this->colors, 'primary_700' => '#FFEEEE'])
        ->assertSessionHasErrors('primary_700');

    $this->actingAs($this->superAdmin)
        ->put(route('admin.settings.colors'), [...$this->colors, 'gold_500' => '#222222'])
        ->assertSessionHasErrors('gold_500');

    expect(Settings::colors())->toBe(Settings::DEFAULT_COLORS);
});

test('a colour must be a plain hex value so it can not break out of the style tag', function () {
    $this->actingAs($this->superAdmin)
        ->put(route('admin.settings.colors'), [...$this->colors, 'primary_900' => '</style><script>'])
        ->assertSessionHasErrors('primary_900');
});

test('the default colours pass the readability rules', function () {
    $this->actingAs($this->superAdmin)
        ->put(route('admin.settings.colors'), $this->colors)
        ->assertSessionHasNoErrors();
});

function recurring(array ...$services): array
{
    return ['services' => $services];
}

test('several services can recur on the same day', function () {
    Carbon::setTestNow('2026-11-01 05:00:00');

    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring(
        ['title' => 'First Service', 'day' => 0, 'opens' => '06:00', 'closes' => '08:00'],
        ['title' => 'Second Service', 'day' => 0, 'opens' => '08:00', 'closes' => '10:00'],
        ['title' => 'Third Service', 'day' => 0, 'opens' => '10:00', 'closes' => '12:00'],
    ))->assertSessionHasNoErrors();

    ServiceGenerator::generate();

    $titles = Service::whereDate('date', '2026-11-01')->orderBy('opens_at')->pluck('title')->all();

    expect($titles)->toBe(['First Service', 'Second Service', 'Third Service'])
        ->and(Service::where('type', 'sunday')->count())->toBe(9);

    Carbon::setTestNow();
});

test('a service can recur on any day', function () {
    Settings::set('services', [['key' => 'friday', 'title' => 'Vigil', 'day' => 5, 'opens' => '21:00', 'closes' => '23:00']]);

    $friday = CarbonImmutable::parse('2027-01-01');

    ServiceGenerator::generate($friday, $friday);

    expect(Service::first()->title)->toBe('Vigil')
        ->and(Service::first()->type)->toBe('special')
        ->and(Service::first()->recurring_key)->toBe('friday');
});

test('generating twice does not duplicate services', function () {
    ServiceGenerator::generate();
    $count = Service::count();

    ServiceGenerator::generate();

    expect(Service::count())->toBe($count);
});

test('the first visit of the day creates the coming services without the scheduler', function () {
    $this->travelTo('2026-11-02 10:00:00');

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('nextService.title', 'Wednesday Service')
        ->where('nextService.date_label', 'Wednesday, 4 November'));

    expect(Service::whereDate('date', '2026-11-08')->value('title'))->toBe('Sunday Service');

    $this->travelTo('2026-11-20 10:00:00');

    $this->get('/');

    expect(Service::whereDate('date', '2026-11-29')->exists())->toBeTrue();
});

test('new times apply to upcoming services but not to ones already used', function () {
    $this->travelTo('2026-11-03 10:00:00');

    ServiceGenerator::generate();

    $sundays = Service::where('recurring_key', 'sunday')->orderBy('date')->get();
    Attendance::create(['service_id' => $sundays[1]->id, 'user_id' => $this->member->id, 'method' => 'manual', 'checked_in_at' => now()]);

    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring(
        ['key' => 'sunday', 'title' => 'Sunday Service', 'day' => 0, 'opens' => '08:00', 'closes' => '12:00'],
    ))->assertSessionHasNoErrors();

    expect(Service::whereDate('date', $sundays[0]->date)->first()->opens_at->format('H:i'))->toBe('08:00')
        ->and($sundays[1]->fresh()->opens_at->format('H:i'))->toBe('07:00');
});

test('removing a recurring service removes its unused upcoming services', function () {
    ServiceGenerator::generate();

    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring(
        ['key' => 'sunday', 'title' => 'Sunday Service', 'day' => 0, 'opens' => '07:00', 'closes' => '13:00'],
    ))->assertSessionHasNoErrors();

    expect(Service::where('recurring_key', 'wednesday')->exists())->toBeFalse()
        ->and(Service::where('recurring_key', 'sunday')->exists())->toBeTrue();
});

test('past services survive changes to the recurring list', function () {
    $past = Service::factory()->finished()->create(['department_id' => $this->technical->id, 'recurring_key' => 'sunday']);

    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring());

    expect(Service::find($past->id))->not->toBeNull();
});

test('every recurring service can be removed', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring())->assertSessionHasNoErrors();

    ServiceGenerator::generate();

    expect(Settings::services())->toBe([])
        ->and(Service::count())->toBe(0);
});

test('closing time must be after opening time', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring(
        ['title' => 'Bad', 'day' => 0, 'opens' => '13:00', 'closes' => '09:00'],
    ))->assertSessionHasErrors('services.0.closes');
});

test('a day must be a real weekday', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.services'), recurring(
        ['title' => 'Bad', 'day' => 9, 'opens' => '08:00', 'closes' => '09:00'],
    ))->assertSessionHasErrors('services.0.day');
});

function homeSettings(array $overrides = []): array
{
    return [
        'slides' => [
            ['id' => 'welcome', 'label' => 'One', 'title' => 'New headline', 'accent' => 'Gold line', 'text' => 'A sentence'],
        ],
        'welcome' => [
            'eyebrow' => 'Hello',
            'title' => 'New welcome',
            'accent' => 'Word',
            'text' => 'New paragraph',
            'button_label' => 'Go',
            'button_link' => '/news',
        ],
        'join' => [
            'eyebrow' => 'Come along',
            'title' => 'New join heading',
            'accent' => 'Today',
            'text' => 'Join sentence',
            'steps' => [
                ['title' => 'First step', 'text' => 'First sentence'],
                ['title' => 'Second step', 'text' => 'Second sentence'],
                ['title' => 'Third step', 'text' => 'Third sentence'],
            ],
        ],
        ...$overrides,
    ];
}

test('the homepage starts with the original content', function () {
    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('home.slides', 3)
        ->where('home.slides.0.title', 'Serving with')
        ->where('home.welcome.image', '/images/site/cross.jpg'));
});

test('hero text and the welcome section can be changed', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), homeSettings())
        ->assertSessionHasNoErrors();

    $this->post('/logout');

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->has('home.slides', 1)
        ->where('home.slides.0.title', 'New headline')
        ->where('home.slides.0.image', '/images/site/worship.jpg')
        ->where('home.welcome.text', 'New paragraph')
        ->where('home.welcome.button_link', '/news'));
});

test('hero and welcome images can be uploaded and old uploads are removed', function () {
    $data = homeSettings();
    $data['slides'][0]['image'] = UploadedFile::fake()->image('hero.jpg', 2000, 1000);
    $data['welcome']['image'] = UploadedFile::fake()->image('arch.jpg', 800, 1000);
    $data['welcome']['small_image'] = UploadedFile::fake()->image('round.jpg', 400, 400);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)->assertSessionHasNoErrors();

    $home = Settings::home();

    Storage::disk('public')->assertExists([$home['slides'][0]['image'], $home['welcome']['image'], $home['welcome']['small_image']]);

    $data = homeSettings();
    $data['slides'][0]['image'] = UploadedFile::fake()->image('new.jpg');

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data);

    Storage::disk('public')->assertMissing($home['slides'][0]['image']);
    Storage::disk('public')->assertExists($home['welcome']['image']);
});

test('the join the team section can be changed and keeps its pictures', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), homeSettings())
        ->assertSessionHasNoErrors();

    $this->post('/logout');

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('home.join.eyebrow', 'Come along')
        ->where('home.join.title', 'New join heading')
        ->where('home.join.steps.1.title', 'Second step')
        ->where('home.join.steps.1.text', 'Second sentence')
        ->where('home.join.steps.1.image', '/images/site/auditorium.jpg'));
});

test('a join step picture can be replaced and the old upload is removed', function () {
    $data = homeSettings();
    $data['join']['steps'][0]['image'] = UploadedFile::fake()->image('first.jpg', 800, 600);
    $data['join']['steps'][2]['image'] = UploadedFile::fake()->image('third.jpg', 800, 600);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)->assertSessionHasNoErrors();

    $steps = Settings::home()['join']['steps'];

    Storage::disk('public')->assertExists([$steps[0]['image'], $steps[2]['image']]);

    $data = homeSettings();
    $data['join']['steps'][0]['image'] = UploadedFile::fake()->image('newer.jpg', 800, 600);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)->assertSessionHasNoErrors();

    Storage::disk('public')->assertMissing($steps[0]['image']);
    Storage::disk('public')->assertExists($steps[2]['image']);
});

test('a homepage saved before the join section existed still shows it', function () {
    $saved = Settings::DEFAULT_HOME;
    unset($saved['join']);

    Settings::set('home', $saved);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('home.join.title', 'Your Place')
        ->has('home.join.steps', 3));
});

test('every join step needs a title and there must be three', function () {
    $data = homeSettings();
    $data['join']['steps'][1]['title'] = '';

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)
        ->assertSessionHasErrors('join.steps.1.title');

    $data = homeSettings();
    array_pop($data['join']['steps']);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)
        ->assertSessionHasErrors('join.steps');
});

test('slides can be added and a new slide needs a picture', function () {
    $data = homeSettings();
    $data['slides'][] = ['label' => 'Two', 'title' => 'Second'];

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)
        ->assertSessionHasErrors('slides.1.image');

    $data['slides'][1]['image'] = UploadedFile::fake()->image('two.jpg');

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)->assertSessionHasNoErrors();

    expect(Settings::home()['slides'])->toHaveCount(2);
});

test('at least one slide must remain', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), homeSettings(['slides' => []]))
        ->assertSessionHasErrors('slides');
});

test('the welcome button link must be safe', function () {
    $data = homeSettings();
    $data['welcome']['button_link'] = 'javascript:alert(1)';

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), $data)
        ->assertSessionHasErrors('welcome.button_link');
});

test('only super admins can change the homepage', function () {
    $this->actingAs($this->admin)->post(route('admin.settings.home'), homeSettings())->assertForbidden();
});

function verseSettings(array $overrides = []): array
{
    return [
        'enabled' => true,
        'position' => 'top-left',
        'first_delay' => 5,
        'interval' => 30,
        'duration' => 8,
        'verses' => "John 3:16 | For God so loved the world\nPsalm 23:1 | The LORD is my shepherd",
        ...$overrides,
    ];
}

test('visitors receive the verse toast by default', function () {
    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('verseToast.position', 'bottom-right')
        ->where('verseToast.verses.0.reference', 'John 3:16'));
});

test('position, timing and verses can be changed', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.verses'), verseSettings())->assertSessionHasNoErrors();

    expect(Settings::verseToast())->toMatchArray(['position' => 'top-left', 'interval' => 30])
        ->and(Settings::verseToast()['verses'])->toEqual([
            ['reference' => 'John 3:16', 'text' => 'For God so loved the world'],
            ['reference' => 'Psalm 23:1', 'text' => 'The LORD is my shepherd'],
        ]);
});

test('the verse toast can be switched off', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.verses'), verseSettings(['enabled' => false]));

    $this->post('/logout');

    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('verseToast', null));
});

test('a verse line without a reference is refused with its line number', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.verses'), verseSettings(['verses' => "John 3:16 | Fine\nNo separator here"]))
        ->assertSessionHasErrors(['verses' => 'Line 2 needs a reference and a verse, like: John 3:16 | For God so loved the world']);
});

test('an unknown position or too-frequent interval is refused', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.verses'), verseSettings(['position' => 'middle', 'interval' => 2]))
        ->assertSessionHasErrors(['position', 'interval']);
});

test('only super admins can change the verse toast', function () {
    $this->actingAs($this->admin)->put(route('admin.settings.verses'), verseSettings())->assertForbidden();
});

function popupSettings(array $overrides = []): array
{
    return [
        'enabled' => true,
        'alt' => 'Greetings',
        'frequency' => 'every_visit',
        'transition' => 'zoom',
        'delay' => 2,
        ...$overrides,
    ];
}

test('visitors receive the covenant greetings pop-up by default', function () {
    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('popup.image_url', '/images/site/covenant-greetings.webp')
        ->where('popup.enabled', true)
        ->where('popup.frequency', 'every_visit'));

    expect(file_exists(public_path('images/site/covenant-greetings.webp')))->toBeTrue();
});

test('the pop-up can be switched off', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings(['enabled' => false]))
        ->assertSessionHasNoErrors();

    $this->post('/logout');

    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('popup', null));
});

test('link, frequency, count, transition and delay are all saved', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings([
        'link' => 'https://example.com/give',
        'frequency' => 'daily',
        'max_views' => 3,
        'transition' => 'bounce',
        'delay' => 5,
    ]))->assertSessionHasNoErrors();

    expect(Settings::popup())->toMatchArray([
        'link' => 'https://example.com/give',
        'frequency' => 'daily',
        'max_views' => 3,
        'transition' => 'bounce',
        'delay' => 5,
    ]);
});

test('a link can be a page on this site', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings(['link' => '/news']))
        ->assertSessionHasNoErrors();
});

test('unsafe links are refused', function (string $link) {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings(['link' => $link]))
        ->assertSessionHasErrors('link');
})->with(['javascript:alert(1)', 'data:text/html,x', '//evil.test', 'evil.test']);

test('an unknown transition or frequency is refused', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings(['transition' => 'spin', 'frequency' => 'hourly']))
        ->assertSessionHasErrors(['transition', 'frequency']);
});

test('uploading a new image replaces the old one and shows it to everyone again', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings([
        'image' => UploadedFile::fake()->image('one.png', 2000, 1000),
    ]))->assertSessionHasNoErrors();

    $first = Settings::popup();

    Storage::disk('public')->assertExists($first['image']);
    expect($first['version'])->toBe(2);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings([
        'image' => UploadedFile::fake()->image('two.png'),
    ]));

    Storage::disk('public')->assertMissing($first['image']);
});

test('saving without a new image keeps the current one and the view counts', function () {
    Settings::set('popup', ['image' => 'popups/keep.webp', 'version' => 4]);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings());

    expect(Settings::popup()['image'])->toBe('popups/keep.webp')
        ->and(Settings::popup()['version'])->toBe(4);
});

test('it can be shown again and go back to the original image', function () {
    Settings::set('popup', ['image' => 'popups/old.webp', 'version' => 4]);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings(['reset_views' => true]));

    expect(Settings::popup()['version'])->toBe(5);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), popupSettings(['reset_image' => true]));

    expect(Settings::popup()['image'])->toBeNull();
});

test('only super admins can change the pop-up', function () {
    $this->actingAs($this->admin)->post(route('admin.settings.popup'), popupSettings(['enabled' => false]))->assertForbidden();
});

test('message templates are saved and shared with admins only', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.whatsapp'), [
        'greeting' => 'Shalom {name}',
        'temp_password' => 'Use {password}',
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->admin)->get('/admin')
        ->assertInertia(fn (Assert $page) => $page->where('whatsappTemplates.greeting', 'Shalom {name}'));

    $this->actingAs($this->member)->get('/home')
        ->assertInertia(fn (Assert $page) => $page->where('whatsappTemplates', null));
});

test('the temporary password template must include the password', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.whatsapp'), [
        'greeting' => 'Hello',
        'temp_password' => 'Your password was reset',
    ])->assertSessionHasErrors('temp_password');
});

test('adding a super admin needs your own password', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.settings.super-admins.store'), [
        'user_id' => $this->member->id, 'password' => 'wrong-password',
    ])->assertSessionHasErrors('password');

    expect($this->member->fresh()->hasRole('super_admin'))->toBeFalse();

    $this->actingAs($this->superAdmin)->post(route('admin.settings.super-admins.store'), [
        'user_id' => $this->member->id, 'password' => 'password',
    ])->assertSessionHasNoErrors();

    expect($this->member->fresh()->hasRole('super_admin'))->toBeTrue();
});

test('a suspended user can not become a super admin', function () {
    $this->member->update(['status' => 'suspended']);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.super-admins.store'), [
        'user_id' => $this->member->id, 'password' => 'password',
    ])->assertSessionHasErrors('user_id');
});

test('you can not remove your own super admin role', function () {
    $this->actingAs($this->superAdmin)
        ->delete(route('admin.settings.super-admins.destroy', $this->superAdmin))
        ->assertStatus(422);

    expect($this->superAdmin->fresh()->hasRole('super_admin'))->toBeTrue();
});

test('removing another super admin makes them a member', function () {
    $other = User::factory()->create()->assignRole('super_admin');

    $this->actingAs($this->superAdmin)->delete(route('admin.settings.super-admins.destroy', $other))->assertRedirect();

    expect($other->fresh()->hasRole('member'))->toBeTrue()
        ->and($other->fresh()->hasRole('super_admin'))->toBeFalse();
});
