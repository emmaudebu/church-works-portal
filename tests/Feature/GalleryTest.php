<?php

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    Storage::fake('public');

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->choir = Department::firstWhere('slug', 'choir');
    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->service = Service::factory()->finished(3)->create(['department_id' => $this->technical->id]);
});

function galleryPicture(Department $department, array $attributes = []): DepartmentImage
{
    return $department->images()->create(['image' => 'gallery/'.fake()->uuid().'.jpg', ...$attributes]);
}

test('pictures uploaded for a service take the service date', function () {
    $this->actingAs($this->admin)->post(route('admin.gallery.store', $this->technical), [
        'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg')],
        'service_id' => $this->service->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $images = $this->technical->images()->get();

    expect($images)->toHaveCount(2)
        ->and($images->pluck('service_id')->unique()->all())->toBe([$this->service->id])
        ->and($images->first()->taken_on->toDateString())->toBe($this->service->date->toDateString())
        ->and($images->first()->event_name)->toBeNull();
});

test('pictures from an event that is not a service keep its name and date', function () {
    $this->actingAs($this->admin)->post(route('admin.gallery.store', $this->technical), [
        'images' => [UploadedFile::fake()->image('a.jpg')],
        'event_name' => '  Christmas Carol Night ',
        'event_date' => today()->subDays(2)->toDateString(),
    ])->assertRedirect()->assertSessionHasNoErrors();

    $image = $this->technical->images()->firstOrFail();

    expect($image->service_id)->toBeNull()
        ->and($image->event_name)->toBe('Christmas Carol Night')
        ->and($image->taken_on->toDateString())->toBe(today()->subDays(2)->toDateString());
});

test('an upload needs a service that took place in the department, or a past event', function (Closure $occasion, string $error) {
    $this->actingAs($this->admin)->post(route('admin.gallery.store', $this->technical), [
        'images' => [UploadedFile::fake()->image('a.jpg')],
        ...$occasion($this),
    ])->assertSessionHasErrors($error);

    expect($this->technical->images()->count())->toBe(0);
})->with([
    'nothing chosen' => [fn () => [], 'service_id'],
    'a future service' => [fn ($test) => ['service_id' => Service::factory()->create([
        'department_id' => $test->technical->id, 'date' => today()->addDays(3), 'opens_at' => now()->addDays(3),
    ])->id], 'service_id'],
    'another department service' => [fn ($test) => ['service_id' => Service::factory()->finished(1)->create([
        'department_id' => $test->choir->id,
    ])->id], 'service_id'],
    'an event without a date' => [fn () => ['event_name' => 'Outreach'], 'event_date'],
    'a future event' => [fn () => ['event_name' => 'Outreach', 'event_date' => today()->addDay()->toDateString()], 'event_date'],
]);

test('the gallery page groups pictures by service and event, newest first', function () {
    $older = Service::factory()->finished(10)->create(['department_id' => $this->technical->id]);

    galleryPicture($this->technical, ['caption' => 'From before']);
    galleryPicture($this->technical, ['service_id' => $older->id, 'taken_on' => $older->date]);
    galleryPicture($this->technical, ['event_name' => 'Outreach', 'taken_on' => today()->subDay()]);
    $first = galleryPicture($this->technical, ['service_id' => $this->service->id, 'taken_on' => $this->service->date]);
    galleryPicture($this->technical, ['service_id' => $this->service->id, 'taken_on' => $this->service->date]);
    galleryPicture($this->choir, ['event_name' => 'Choir night', 'taken_on' => today()]);

    $this->get(route('departments.gallery', $this->technical->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Site/Gallery')
            ->where('total', 5)
            ->has('occasions.data', 4)
            ->where('occasions.data.0.title', 'Outreach')
            ->where('occasions.data.0.is_service', false)
            ->where('occasions.data.1.title', 'Sunday Service')
            ->where('occasions.data.1.date_label', $this->service->date->format('D j M Y'))
            ->where('occasions.data.1.pictures_count', 2)
            ->where('occasions.data.1.pictures.0.id', $first->id)
            ->where('occasions.data.2.is_service', true)
            ->where('occasions.data.3.title', 'More moments')
            ->where('occasions.data.3.pictures.0.caption', 'From before'));
});

test('the gallery page loads older services a few at a time', function () {
    foreach (range(1, 8) as $daysAgo) {
        galleryPicture($this->technical, ['event_name' => "Event {$daysAgo}", 'taken_on' => today()->subDays($daysAgo)]);
    }

    $this->get(route('departments.gallery', $this->technical->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->has('occasions.data', 6)
            ->where('occasions.data.0.title', 'Event 1'));

    $this->get(route('departments.gallery', [$this->technical->slug, 'page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('occasions.data', 2)
            ->where('occasions.data.1.title', 'Event 8'));
});

test('the department page shows the latest pictures and how many there are', function () {
    foreach (range(1, 10) as $number) {
        galleryPicture($this->technical, ['caption' => "Picture {$number}"]);
    }

    $this->get(route('departments.show', $this->technical->slug))
        ->assertInertia(fn (Assert $page) => $page
            ->has('gallery', 8)
            ->where('gallery.0.caption', 'Picture 10')
            ->where('galleryCount', 10));
});

test('a picture or a whole group can be moved to another service or event', function () {
    $other = Service::factory()->finished(1)->create(['department_id' => $this->technical->id]);
    $wrong = galleryPicture($this->technical, ['service_id' => $this->service->id, 'taken_on' => $this->service->date]);
    $alsoWrong = galleryPicture($this->technical, ['service_id' => $this->service->id, 'taken_on' => $this->service->date]);
    $untouched = galleryPicture($this->technical, ['event_name' => 'Outreach', 'taken_on' => today()]);

    $this->actingAs($this->admin)->patch(route('admin.gallery.update', $wrong), [
        'event_name' => 'Training',
        'event_date' => today()->toDateString(),
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($wrong->fresh())->service_id->toBeNull()->event_name->toBe('Training');

    $this->actingAs($this->admin)->patch(route('admin.gallery.occasion', $alsoWrong), ['service_id' => $other->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($alsoWrong->fresh()->service_id)->toBe($other->id)
        ->and($alsoWrong->fresh()->taken_on->toDateString())->toBe($other->date->toDateString())
        ->and($wrong->fresh()->event_name)->toBe('Training')
        ->and($untouched->fresh()->event_name)->toBe('Outreach');
});

test('moving a group leaves pictures of other departments alone', function () {
    $mine = galleryPicture($this->technical, ['event_name' => 'Outreach', 'taken_on' => today()]);
    $theirs = galleryPicture($this->choir, ['event_name' => 'Outreach', 'taken_on' => today()]);

    $this->actingAs($this->admin)->patch(route('admin.gallery.occasion', $mine), ['service_id' => $this->service->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($mine->fresh()->service_id)->toBe($this->service->id)
        ->and($theirs->fresh()->service_id)->toBeNull();

    $this->actingAs($this->admin)->patch(route('admin.gallery.occasion', $theirs), ['service_id' => $this->service->id])
        ->assertNotFound();
    $this->actingAs($this->admin)->patch(route('admin.gallery.update', $theirs), ['event_name' => 'X', 'event_date' => today()->toDateString()])
        ->assertNotFound();
});

test('the manage page offers services that took place and earlier events', function () {
    Service::factory()->create(['department_id' => $this->technical->id, 'date' => today()->addDays(3), 'opens_at' => now()->addDays(3)]);
    galleryPicture($this->technical, ['event_name' => 'Outreach', 'taken_on' => today()->subDay()]);
    galleryPicture($this->technical, ['event_name' => 'Outreach', 'taken_on' => today()->subDay()]);

    $this->actingAs($this->admin)->get(route('admin.departments.manage', $this->technical))
        ->assertInertia(fn (Assert $page) => $page
            ->has('services', 1)
            ->where('services.0.id', $this->service->id)
            ->has('events', 1)
            ->where('events.0.name', 'Outreach')
            ->has('images', 2)
            ->where('images.0.occasion.title', 'Outreach'));
});

test('the head gives a member the upload duty and can take it back', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($this->admin)->post(route('admin.gallery.uploaders.store', $this->technical), ['user_id' => $member->id])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($member->fresh()->canDo('upload_gallery'))->toBeTrue();

    $this->actingAs($this->admin)->get(route('admin.departments.manage', $this->technical))
        ->assertInertia(fn (Assert $page) => $page
            ->where('uploaders.assigned.0.id', $member->id)
            ->where('uploaders.candidates', fn ($candidates) => ! collect($candidates)->contains('id', $member->id)));

    $this->actingAs($this->admin)->delete(route('admin.gallery.uploaders.destroy', [$this->technical, $member]))->assertRedirect();

    expect($member->fresh()->canDo('upload_gallery'))->toBeFalse();
});

test('only the head or a super admin hands out the upload duty, within their department', function () {
    $secretary = User::factory()->create(['department_id' => $this->technical->id])->assignRole('secretary');
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $choirMember = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->actingAs($secretary)->post(route('admin.gallery.uploaders.store', $this->technical), ['user_id' => $member->id])
        ->assertForbidden();
    $this->actingAs($this->admin)->post(route('admin.gallery.uploaders.store', $this->choir), ['user_id' => $choirMember->id])
        ->assertForbidden();
    $this->actingAs($this->admin)->post(route('admin.gallery.uploaders.store', $this->technical), ['user_id' => $choirMember->id])
        ->assertSessionHasErrors('user_id');

    expect($member->fresh()->canDo('upload_gallery'))->toBeFalse()
        ->and($choirMember->fresh()->canDo('upload_gallery'))->toBeFalse();
});

test('a member with the duty uploads service photos from their own page', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $member->givePermissionTo('upload_gallery');

    $this->actingAs($member)->get(route('member.home'))
        ->assertInertia(fn (Assert $page) => $page->where('auth.user.permissions', fn ($permissions) => collect($permissions)->contains('upload_gallery')));

    $this->actingAs($member)->get(route('gallery.upload'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Gallery/Upload')
            ->where('department.id', $this->technical->id)
            ->where('services.0.id', $this->service->id));

    $this->actingAs($member)->post(route('gallery.upload.store'), [
        'images' => [UploadedFile::fake()->image('a.jpg')],
        'service_id' => $this->service->id,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $image = $this->technical->images()->firstOrFail();

    expect($image->uploaded_by)->toBe($member->id)
        ->and($image->service_id)->toBe($this->service->id);

    $this->actingAs($member)->get(route('gallery.upload'))
        ->assertInertia(fn (Assert $page) => $page->where('recent.0.id', $image->id));
});

test('a member without the duty can not upload', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($member)->get(route('gallery.upload'))->assertForbidden();
    $this->actingAs($member)->post(route('gallery.upload.store'), [
        'images' => [UploadedFile::fake()->image('a.jpg')],
        'service_id' => $this->service->id,
    ])->assertForbidden();

    expect($this->technical->images()->count())->toBe(0);
});

test('the head can upload from the upload page too', function () {
    $this->actingAs($this->admin)->get(route('gallery.upload'))->assertOk();
});

test('an uploader can remove their own pictures but nobody else\'s', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $member->givePermissionTo('upload_gallery');

    $own = galleryPicture($this->technical, ['uploaded_by' => $member->id]);
    $someoneElses = galleryPicture($this->technical, ['uploaded_by' => $this->admin->id]);

    $this->actingAs($member)->delete(route('gallery.upload.destroy', $someoneElses))->assertForbidden();
    $this->actingAs($member)->delete(route('gallery.upload.destroy', $own))->assertRedirect();

    expect(DepartmentImage::find($own->id))->toBeNull()
        ->and(DepartmentImage::find($someoneElses->id))->not->toBeNull();
});
