<?php

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Media;
use App\Models\Post;
use App\Models\User;
use App\Support\MediaLibrary;
use App\Support\Settings;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    Storage::fake('public');

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
});

/**
 * A picture already in the library, with its file on the public disk.
 */
function libraryPicture(string $name = 'stage.jpg'): Media
{
    $file = UploadedFile::fake()->image($name, 1200, 800);

    return MediaLibrary::register($file->store('posts', 'public'), $file);
}

/**
 * The homepage form as it is sent, with one new slide.
 *
 * @param  array<string, mixed>  $slide
 * @return array<string, mixed>
 */
function homepageWithSlide(array $slide): array
{
    $home = Settings::home();

    return [
        'slides' => [['label' => 'New', 'title' => 'New slide', ...$slide]],
        'welcome' => collect($home['welcome'])->except(['image', 'small_image'])->all(),
        'units' => collect($home['units'])->except('image')->all(),
        'join' => [
            ...collect($home['join'])->except('steps')->all(),
            'steps' => collect($home['join']['steps'])->map(fn (array $step) => collect($step)->only(['title', 'text'])->all())->all(),
        ],
    ];
}

test('every picture uploaded for the site goes into the library', function () {
    $this->actingAs($this->head)->post(route('admin.departments.page', $this->technical), [
        'image' => UploadedFile::fake()->image('Sunday banner.jpg', 2000, 900),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $media = Media::firstOrFail();

    expect($media->path)->toBe($this->technical->fresh()->image)
        ->and($media->name)->toBe('Sunday banner.jpg')
        ->and($media->width)->toBe(1600)
        ->and($media->uploaded_by)->toBe($this->head->id);
});

test('a library picture can be used for a section without uploading it again', function () {
    $picture = libraryPicture();

    $this->actingAs($this->head)->post(route('admin.departments.page', $this->technical), ['about_image_media' => $picture->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    $this->actingAs($this->head)->post(route('admin.posts.store'), [
        'type' => 'news', 'title' => 'Hello', 'body' => '<p>Body</p>', 'publish' => true, 'image_media' => $picture->id,
    ])->assertSessionHasNoErrors();

    $this->actingAs($this->superAdmin)->post(route('admin.settings.popup'), [
        'enabled' => true, 'alt' => 'Greetings', 'frequency' => 'every_visit', 'transition' => 'zoom', 'delay' => 2,
        'image_media' => $picture->id,
    ])->assertSessionHasNoErrors();

    expect($this->technical->fresh()->about_image)->toBe($picture->path)
        ->and(Post::firstOrFail()->image)->toBe($picture->path)
        ->and(Settings::popup()['image'])->toBe($picture->path)
        ->and(Media::count())->toBe(1);
});

test('a new homepage slide can take its picture from the library', function () {
    $picture = libraryPicture();

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), homepageWithSlide(['image_media' => $picture->id]))
        ->assertRedirect()->assertSessionHasNoErrors();

    expect(Settings::home()['slides'][0]['image'])->toBe($picture->path);

    $this->actingAs($this->superAdmin)->post(route('admin.settings.home'), homepageWithSlide([]))
        ->assertSessionHasErrors('slides.0.image');
});

test('a picture that is not in the library is refused', function () {
    $this->actingAs($this->head)->post(route('admin.departments.page', $this->technical), ['image_media' => 999])
        ->assertSessionHasErrors('image_media');
});

test('the library lists pictures newest first and can be searched', function () {
    libraryPicture('choir.jpg');
    $stage = libraryPicture('stage.jpg');

    $this->actingAs($this->head)->get(route('admin.media'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Media')
            ->has('media.data', 2)
            ->where('media.data.0.id', $stage->id));

    $this->actingAs($this->head)->getJson(route('admin.media.picker', ['search' => 'stage']))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.url', $stage->url());
});

test('pictures can be uploaded straight into the library', function () {
    $this->actingAs($this->head)->post(route('admin.media.store'), [
        'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.png')],
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect(Media::pluck('name')->sort()->values()->all())->toBe(['a.jpg', 'b.png']);
});

test('a picture in use shows where and can not be deleted', function () {
    $picture = libraryPicture();
    $this->technical->update(['image' => $picture->path]);

    $this->actingAs($this->head)->getJson(route('admin.media.show', $picture))
        ->assertJsonPath('usages', ['Technical Department page']);

    $this->actingAs($this->head)->delete(route('admin.media.destroy', $picture))->assertSessionHasErrors('media');

    expect(Media::find($picture->id))->not->toBeNull();
    Storage::disk('public')->assertExists($picture->path);
});

test('an unused picture can be deleted with its file', function () {
    $picture = libraryPicture();

    $this->actingAs($this->head)->delete(route('admin.media.destroy', $picture))->assertRedirect()->assertSessionHasNoErrors();

    expect(Media::find($picture->id))->toBeNull();
    Storage::disk('public')->assertMissing($picture->path);
});

test('removing a gallery picture deletes it unless another section shows it', function () {
    $alone = libraryPicture('alone.jpg');
    $shared = libraryPicture('shared.jpg');
    $this->technical->update(['about_image' => $shared->path]);

    foreach ([$alone, $shared] as $picture) {
        $image = DepartmentImage::create(['department_id' => $this->technical->id, 'image' => $picture->path]);
        $this->actingAs($this->head)->delete(route('admin.gallery.destroy', $image))->assertRedirect();
    }

    Storage::disk('public')->assertMissing($alone->path);
    Storage::disk('public')->assertExists($shared->path);
    expect(Media::pluck('id')->all())->toBe([$shared->id]);
});

test('only people who edit the site can open the library', function () {
    $secretary = User::factory()->create(['department_id' => $this->technical->id])->assignRole('secretary');
    $treasurer = User::factory()->create(['department_id' => $this->technical->id])->assignRole('treasurer');
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($secretary)->get(route('admin.media'))->assertOk();
    $this->actingAs($treasurer)->get(route('admin.media'))->assertForbidden();
    $this->actingAs($treasurer)->getJson(route('admin.media.picker'))->assertForbidden();
    $this->actingAs($member)->get(route('admin.media'))->assertForbidden();
});

test('pictures already on the site are brought into the library', function () {
    $post = UploadedFile::fake()->image('old.jpg')->store('posts', 'public');
    $gallery = UploadedFile::fake()->image('service.jpg')->store('gallery', 'public');
    UploadedFile::fake()->image('logo.png')->store('branding', 'public');

    MediaLibrary::importExisting();
    MediaLibrary::importExisting();

    expect(Media::pluck('path')->sort()->values()->all())->toBe(collect([$post, $gallery])->sort()->values()->all());
});
