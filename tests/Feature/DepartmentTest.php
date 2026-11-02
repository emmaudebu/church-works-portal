<?php

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Due;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Unit;
use App\Models\User;
use App\Support\CurrentDepartment;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->technical = Department::firstWhere('slug', 'technical-department');
});

test('the seeder launches the technical department with choir and ushering coming soon', function () {
    expect(Department::pluck('status', 'slug')->all())->toEqual([
        'choir' => 'coming_soon',
        'technical-department' => 'active',
        'ushering' => 'coming_soon',
    ]);
});

test('reseeding does not undo a status switch', function () {
    Department::firstWhere('slug', 'choir')->update(['status' => 'active']);

    $this->seed(DepartmentSeeder::class);

    expect(Department::firstWhere('slug', 'choir')->status)->toBe('active');
});

test('the landing page lists active departments first with active member counts', function () {
    User::factory()->count(2)->create(['department_id' => $this->technical->id]);
    User::factory()->suspended()->create(['department_id' => $this->technical->id]);

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->component('Welcome')
        ->has('departments', 3)
        ->where('departments.0.slug', 'technical-department')
        ->where('departments.0.members_count', 2)
        ->where('departments.1.status', 'coming_soon'));
});

test('with one active department the site goes straight to it', function () {
    $this->get(route('departments'))->assertRedirect(route('departments.show', 'technical-department'));

    $this->get(route('departments.show', 'technical-department'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('singleDepartment.slug', 'technical-department')
            ->has('others', 0));

    $this->get('/')->assertInertia(fn (Assert $page) => $page
        ->where('units', ['Lighting', 'Media', 'Projection', 'Sound'])
        ->where('stats.units', 4));
});

test('a second active department brings the department list back', function () {
    Department::factory()->create();

    $this->get(route('departments'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Site/Departments')
            ->where('singleDepartment', null)
            ->has('departments', 4));

    $this->get('/')->assertInertia(fn (Assert $page) => $page->where('units', []));
    $this->actingAs($this->superAdmin)->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('departmentContext.options', 4));
});

test('with one active department a super admin works in it without choosing', function () {
    $this->actingAs($this->superAdmin)->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('departmentContext.options', null)
            ->where('departmentContext.current_name', 'Technical Department'));

    $this->post(route('admin.services.store'), [
        'title' => 'Vigil', 'date' => now()->addDay()->toDateString(), 'opens_at' => '21:00', 'closes_at' => '23:30',
    ])->assertSessionHasNoErrors();

    expect(Service::firstWhere('title', 'Vigil')->department_id)->toBe($this->technical->id);
});

test('a super admin left in a closed department can still switch away', function () {
    $this->actingAs($this->superAdmin)
        ->withSession([CurrentDepartment::SESSION_KEY => Department::firstWhere('slug', 'choir')->id])
        ->get(route('admin.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->has('departmentContext.options', 3));
});

test('the old technical unit address still works', function () {
    $this->get('/departments/technical-unit')->assertRedirect('/departments/technical-department');
});

test('every department has its own public page', function () {
    Department::factory()->create(['name' => 'Protocol', 'slug' => 'protocol']);

    $this->get(route('departments'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Site/Departments')->has('departments', 4));

    $this->get(route('departments.show', 'technical-department'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Site/Department')
            ->where('department.name', 'Technical Department')
            ->where('units', ['Lighting', 'Media', 'Projection', 'Sound'])
            ->has('others', 3));

    $this->get(route('departments.show', 'choir'))->assertOk();
    $this->get('/departments/nothing-here')->assertNotFound();
});

test('a department page does not count suspended members', function () {
    User::factory()->suspended()->create(['department_id' => $this->technical->id]);

    $this->get(route('departments.show', 'technical-department'))
        ->assertInertia(fn (Assert $page) => $page->where('department.members_count', 0));
});

test('the department page shows officers first and active members in the team', function () {
    $head = User::factory()->create(['department_id' => $this->technical->id, 'full_name' => 'Head Person'])->assignRole('dept_admin');
    $treasurer = User::factory()->create(['department_id' => $this->technical->id])->assignRole('treasurer');
    $member = User::factory()->create(['department_id' => $this->technical->id, 'photo' => 'photos/a.jpg'])->assignRole('member');
    User::factory()->create(['department_id' => $this->technical->id, 'show_on_site' => false])->assignRole('member');
    User::factory()->pending()->create(['department_id' => $this->technical->id])->assignRole('member');
    User::factory()->suspended()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->get(route('departments.show', 'technical-department'))->assertInertia(fn (Assert $page) => $page
        ->has('officers', 2)
        ->where('officers.0.id', $head->id)
        ->where('officers.0.office', 'Head of Department')
        ->where('officers.1.id', $treasurer->id)
        ->has('team', 1)
        ->where('team.0.id', $member->id)
        ->missing('team.0.phone')
        ->missing('team.0.email')
        ->missing('officers.0.phone'));
});

test('public photos only exist for active members who allow it', function () {
    Storage::fake('local');
    Storage::disk('local')->put('photos/a.jpg', 'image');

    $member = User::factory()->create(['department_id' => $this->technical->id, 'photo' => 'photos/a.jpg']);

    $this->get(route('team.photo', $member))->assertOk();

    $member->update(['show_on_site' => false]);
    $this->get(route('team.photo', $member))->assertNotFound();

    expect($member->fresh()->publicPhotoUrl())->toBeNull();

    $member->update(['show_on_site' => true, 'status' => 'suspended']);
    $this->get(route('team.photo', $member))->assertNotFound();
});

test('an officer who hides themselves keeps their name but not their photo', function () {
    $head = User::factory()->create(['department_id' => $this->technical->id, 'photo' => 'photos/a.jpg', 'show_on_site' => false])->assignRole('dept_admin');

    $this->get(route('departments.show', 'technical-department'))->assertInertia(fn (Assert $page) => $page
        ->where('officers.0.full_name', $head->full_name)
        ->where('officers.0.photo_url', null));
});

test('a member can hide themselves from their profile', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($member)->patch('/profile', [
        'full_name' => 'A', 'gender' => 'male', 'date_of_birth' => '1990-01-01', 'phone' => $member->phone, 'email' => $member->email,
        'address' => 'B', 'unit' => 'Sound', 'next_of_kin_name' => 'C', 'next_of_kin_relationship' => 'D', 'next_of_kin_phone' => '08011112222',
        'show_on_site' => false,
    ])->assertSessionHasNoErrors();

    expect($member->fresh()->show_on_site)->toBeFalse();
});

test('a member can share social links on their public card', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($member)->patch('/profile', [
        'full_name' => 'A', 'gender' => 'male', 'date_of_birth' => '1990-01-01', 'phone' => $member->phone, 'email' => $member->email,
        'address' => 'B', 'unit' => 'Sound', 'next_of_kin_name' => 'C', 'next_of_kin_relationship' => 'D', 'next_of_kin_phone' => '08011112222',
        'socials' => [
            'whatsapp' => '0801 234 5678',
            'facebook' => 'facebook.com/grace.ade',
            'instagram' => '@grace_ade',
            'x' => '',
            'tiktok' => 'graceade',
        ],
    ])->assertSessionHasNoErrors();

    expect($member->fresh()->socials)->toEqual([
        'whatsapp' => '+2348012345678',
        'facebook' => 'https://facebook.com/grace.ade',
        'instagram' => 'https://instagram.com/grace_ade',
        'tiktok' => 'https://tiktok.com/@graceade',
    ]);

    $this->get(route('departments.show', 'technical-department'))->assertInertia(fn (Assert $page) => $page
        ->has('team.0.socials', 4)
        ->where('team.0.socials.0', ['network' => 'whatsapp', 'url' => 'https://wa.me/2348012345678'])
        ->where('team.0.socials.2', ['network' => 'instagram', 'url' => 'https://instagram.com/grace_ade'])
        ->missing('team.0.phone'));
});

test('a social link can only point at its own site', function (string $network, string $value) {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($member)->patch('/profile', [
        'full_name' => 'A', 'gender' => 'male', 'date_of_birth' => '1990-01-01', 'phone' => $member->phone, 'email' => $member->email,
        'address' => 'B', 'unit' => 'Sound', 'next_of_kin_name' => 'C', 'next_of_kin_relationship' => 'D', 'next_of_kin_phone' => '08011112222',
        'socials' => [$network => $value],
    ])->assertSessionHasErrors("socials.$network");

    expect($member->fresh()->socials)->toBeNull();
})->with([
    ['facebook', 'https://evil.example/page'],
    ['facebook', 'https://facebook.com.evil.example/page'],
    ['instagram', 'javascript:alert(1)'],
    ['x', 'https://x.com'],
    ['whatsapp', '123'],
    ['whatsapp', 'call me'],
]);

test('hiding yourself also hides your social links', function () {
    $member = User::factory()->create(['socials' => ['whatsapp' => '+2348012345678']]);

    expect($member->fresh()->publicSocials())->toHaveCount(1);

    $member->update(['show_on_site' => false]);

    expect($member->fresh()->publicSocials())->toBe([]);
});

test('a super admin can write a department page and upload its picture', function () {
    Storage::fake('public');

    $this->actingAs($this->superAdmin)->post(route('admin.departments.page', $this->technical), [
        'name' => 'Technical Department',
        'icon' => 'mic',
        'description' => 'New line',
        'about' => 'Our story',
        'image' => UploadedFile::fake()->image('team.jpg', 1000, 600),
    ])->assertSessionHasNoErrors();

    $department = $this->technical->fresh();

    expect($department->about)->toBe('Our story');
    Storage::disk('public')->assertExists($department->image);

    $this->actingAs($this->superAdmin)->post(route('admin.departments.page', $this->technical), ['name' => 'Technical Department', 'icon' => 'mic', 'about' => 'Edited', 'image' => null]);

    expect($this->technical->fresh()->image)->toBe($department->image);
});

test('a head of department edits their own page but not its name or icon', function () {
    Storage::fake('public');
    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $image = $this->technical->image;

    $this->actingAs($head)->post(route('admin.departments.page', $this->technical), [
        'name' => 'Hacked', 'icon' => 'mic', 'description' => 'Fresh line', 'about' => 'Our new story',
        'image' => UploadedFile::fake()->image('team.jpg', 1000, 600),
    ])->assertSessionHasNoErrors();

    $department = $this->technical->fresh();

    expect($department->about)->toBe('Our new story')
        ->and($department->description)->toBe('Fresh line')
        ->and($department->name)->toBe('Technical Department')
        ->and($department->icon)->toBe('monitor-speaker')
        ->and($department->image)->not->toBe($image);

    Storage::disk('public')->assertExists($department->image);
});

test('the about section can be changed and shows on the public page', function () {
    Storage::fake('public');

    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');

    $this->actingAs($head)->post(route('admin.departments.page', $this->technical), [
        'about_label' => 'Who we are',
        'about_title' => 'Serving behind',
        'about_accent' => 'the scenes',
        'about_image' => UploadedFile::fake()->image('arch.jpg', 800, 1000),
        'about_small_image' => UploadedFile::fake()->image('round.jpg', 400, 400),
    ])->assertSessionHasNoErrors();

    $department = $this->technical->fresh();

    Storage::disk('public')->assertExists([$department->about_image, $department->about_small_image]);

    $this->get(route('departments.show', $department))->assertInertia(fn (Assert $page) => $page
        ->where('department.about_label', 'Who we are')
        ->where('department.about_title', 'Serving behind')
        ->where('department.about_accent', 'the scenes')
        ->where('department.about_image_url', Storage::disk('public')->url($department->about_image))
        ->where('department.about_small_image_url', Storage::disk('public')->url($department->about_small_image)));
});

test('a new about picture replaces only its own upload', function () {
    Storage::fake('public');

    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->technical->update([
        'about_image' => UploadedFile::fake()->image('old.jpg')->store('posts', 'public'),
        'about_small_image' => UploadedFile::fake()->image('small.jpg')->store('posts', 'public'),
    ]);

    $this->actingAs($head)->post(route('admin.departments.page', $this->technical), [
        'about_image' => UploadedFile::fake()->image('new.jpg'),
    ])->assertSessionHasNoErrors();

    Storage::disk('public')->assertMissing($this->technical->about_image);
    Storage::disk('public')->assertExists([$this->technical->fresh()->about_image, $this->technical->about_small_image]);
});

test('deleting a department removes its about pictures', function () {
    Storage::fake('public');

    $choir = Department::firstWhere('slug', 'choir');
    $choir->update(['about_image' => UploadedFile::fake()->image('arch.jpg')->store('posts', 'public')]);

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $choir))->assertSessionHasNoErrors();

    Storage::disk('public')->assertMissing($choir->about_image);
});

test('only pictures are accepted for the about section', function () {
    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');

    $this->actingAs($head)->post(route('admin.departments.page', $this->technical), [
        'about_image' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf'),
    ])->assertSessionHasErrors('about_image');
});

test('saving a page without a new picture keeps the banner', function () {
    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->technical->update(['image' => 'gallery/keep.jpg']);

    $this->actingAs($head)->post(route('admin.departments.page', $this->technical), ['about' => 'Edited', 'image' => null])
        ->assertSessionHasNoErrors();

    expect($this->technical->fresh()->image)->toBe('gallery/keep.jpg');
});

test('a head can not edit another department page', function () {
    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $choir = Department::firstWhere('slug', 'choir');

    $this->actingAs($head)->post(route('admin.departments.page', $choir), ['about' => 'Taken over'])->assertNotFound();

    expect($choir->fresh()->about)->not->toBe('Taken over');
});

test('offices without the permission and members can not edit the page', function () {
    $treasurer = User::factory()->create(['department_id' => $this->technical->id])->assignRole('treasurer');
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($treasurer)->post(route('admin.departments.page', $this->technical), ['about' => 'x'])->assertForbidden();
    $this->actingAs($member)->post(route('admin.departments.page', $this->technical), ['about' => 'x'])->assertForbidden();
});

test('a vice head can edit the page by default', function () {
    $vice = User::factory()->create(['department_id' => $this->technical->id])->assignRole('vice_head');

    $this->actingAs($vice)->post(route('admin.departments.page', $this->technical), ['about' => 'From the vice'])
        ->assertSessionHasNoErrors();
});

test('a super admin can create a department', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.departments.store'), [
        'name' => 'Protocol Team', 'icon' => 'shield', 'description' => 'Guests', 'status' => 'active',
    ])->assertSessionHasNoErrors();

    $department = Department::firstWhere('slug', 'protocol-team');

    expect($department->status)->toBe('active');

    $this->get(route('departments.show', 'protocol-team'))->assertOk();

    $this->post('/logout');

    $this->get('/register')->assertInertia(fn (Assert $page) => $page->has('departments', 2));
});

test('department names must be unique', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.departments.store'), [
        'name' => 'Choir', 'icon' => 'music', 'status' => 'active',
    ])->assertSessionHasErrors('name');
});

test('department admins can not create or delete departments', function () {
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');

    $this->actingAs($admin)->post(route('admin.departments.store'), ['name' => 'X', 'icon' => 'mic', 'status' => 'active'])->assertForbidden();
    $this->actingAs($admin)->delete(route('admin.departments.destroy', $this->technical))->assertForbidden();
});

test('an empty department can be deleted straight away', function () {
    $choir = Department::firstWhere('slug', 'choir');

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $choir))->assertRedirect();

    expect(Department::find($choir->id))->toBeNull();
});

test('a department in use needs its name typed to be deleted', function () {
    User::factory()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $this->technical))
        ->assertSessionHasErrors('confirm_name');

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $this->technical), ['confirm_name' => 'technical'])
        ->assertSessionHasErrors('confirm_name');

    expect(Department::find($this->technical->id))->not->toBeNull();
});

test('deleting a department keeps people and payments but not its offices', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $head = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $due = Due::create(['department_id' => $this->technical->id, 'title' => 'Dues', 'type' => 'monthly', 'amount' => 100000, 'starts_on' => '2026-01-01']);

    $payment = fn (string $reference, string $status) => Payment::create([
        'user_id' => $member->id, 'due_id' => $due->id, 'purpose' => 'Dues', 'period' => '2026-10',
        'amount' => 100000, 'reference' => $reference, 'batch' => $reference, 'status' => $status, 'method' => 'transfer',
    ]);

    $paid = $payment('TRF-A', 'success');
    $waiting = $payment('TRF-B', 'under_review');

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $this->technical), ['confirm_name' => $this->technical->name])
        ->assertRedirect(route('admin.departments'));

    expect(Department::find($this->technical->id))->toBeNull()
        ->and($member->fresh()->department_id)->toBeNull()
        ->and($head->fresh()->getRoleNames()->all())->toBe(['member'])
        ->and($paid->fresh()->status)->toBe('success')
        ->and($paid->fresh()->purpose)->toBe('Dues')
        ->and($waiting->fresh()->status)->toBe('rejected');

    $this->actingAs($member->fresh())->get('/payments')->assertInertia(fn (Assert $page) => $page->has('history', 1));
    $this->actingAs($member->fresh())->get('/home')->assertOk();
});

test('a department admin manages units in their own department only', function () {
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $choir = Department::firstWhere('slug', 'choir');

    $this->actingAs($admin)->post(route('admin.units.store', $this->technical), ['name' => 'Streaming'])->assertSessionHasNoErrors();
    $this->actingAs($admin)->post(route('admin.units.store', $this->technical), ['name' => 'Streaming'])->assertSessionHasErrors('name');
    $this->actingAs($admin)->post(route('admin.units.store', $choir), ['name' => 'Altos'])->assertNotFound();
    $this->actingAs($admin)->get(route('admin.departments.manage', $choir))->assertNotFound();

    $this->actingAs($admin)->get(route('admin.departments.manage', $this->technical))
        ->assertInertia(fn (Assert $page) => $page->component('Admin/DepartmentManage')->has('units', 5));
});

test('members can not manage units or the gallery', function () {
    $member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');

    $this->actingAs($member)->post(route('admin.units.store', $this->technical), ['name' => 'X'])->assertForbidden();
});

test('renaming a unit moves its members along', function () {
    $unit = $this->technical->units()->firstWhere('name', 'Sound');
    $member = User::factory()->create(['department_id' => $this->technical->id, 'unit' => 'Sound']);

    $this->actingAs($this->superAdmin)->patch(route('admin.units.update', $unit), ['name' => 'Audio'])->assertSessionHasNoErrors();

    expect($member->fresh()->unit)->toBe('Audio');
});

test('a unit with members can not be removed', function () {
    $unit = $this->technical->units()->firstWhere('name', 'Sound');
    $member = User::factory()->create(['department_id' => $this->technical->id, 'unit' => 'Sound']);

    $this->actingAs($this->superAdmin)->delete(route('admin.units.destroy', $unit))->assertSessionHasErrors('unit');

    $member->update(['unit' => 'Media']);

    $this->actingAs($this->superAdmin)->delete(route('admin.units.destroy', $unit))->assertRedirect();

    expect(Unit::find($unit->id))->toBeNull();
});

test('registration only accepts a unit from the chosen department', function () {
    $this->post('/register/check?step=2', ['department_id' => $this->technical->id, 'unit' => 'Dancing'])
        ->assertSessionHasErrors('unit');

    $this->post('/register/check?step=2', ['department_id' => $this->technical->id, 'unit' => 'Sound'])
        ->assertSessionHasNoErrors();
});

test('a department with no units accepts any unit', function () {
    $department = Department::create(['name' => 'New', 'slug' => 'new', 'status' => 'active']);

    $this->post('/register/check?step=2', ['department_id' => $department->id, 'unit' => 'Anything'])
        ->assertSessionHasNoErrors();
});

test('the gallery shows on the public page and pictures can be captioned and removed', function () {
    Storage::fake('public');

    $this->actingAs($this->superAdmin)->post(route('admin.gallery.store', $this->technical), [
        'images' => [UploadedFile::fake()->image('a.jpg', 2000, 1000), UploadedFile::fake()->image('b.png')],
    ])->assertSessionHasNoErrors();

    $image = $this->technical->images()->firstOrFail();

    Storage::disk('public')->assertExists($image->image);

    $this->actingAs($this->superAdmin)->patch(route('admin.gallery.update', $image), ['caption' => 'Sunday team']);

    $this->post('/logout');

    $this->get(route('departments.show', 'technical-department'))
        ->assertInertia(fn (Assert $page) => $page->has('gallery', 2));

    $this->actingAs($this->superAdmin)->delete(route('admin.gallery.destroy', $image))->assertRedirect();

    Storage::disk('public')->assertMissing($image->image);
    expect(DepartmentImage::find($image->id))->toBeNull();
});

test('the public banner uses a gallery picture until the department sets its own', function () {
    $banner = fn (string $expected) => $this->get(route('departments.show', $this->technical))
        ->assertInertia(fn (Assert $page) => $page->where('department.image_url', fn (string $url) => str_ends_with($url, $expected)));

    $banner($this->technical->imageUrl());

    $this->technical->images()->create(['image' => 'gallery/oldest.jpg']);
    $this->technical->images()->create(['image' => 'gallery/newest.jpg']);

    $banner('gallery/oldest.jpg');

    $this->technical->update(['image' => 'posts/banner.jpg']);

    $banner('posts/banner.jpg');
});

test('only pictures can go in the gallery and another department is off limits', function () {
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $choir = Department::firstWhere('slug', 'choir');

    $this->actingAs($admin)->post(route('admin.gallery.store', $this->technical), [
        'images' => [UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')],
    ])->assertSessionHasErrors('images.0');

    $this->actingAs($admin)->post(route('admin.gallery.store', $choir), ['images' => [UploadedFile::fake()->image('a.jpg')]])
        ->assertNotFound();
});

test('a super admin can switch a department on without a rebuild', function () {
    $choir = Department::firstWhere('slug', 'choir');

    $this->actingAs($this->superAdmin)
        ->patch(route('admin.departments.update', $choir), ['status' => 'active'])
        ->assertRedirect();

    expect($choir->fresh()->status)->toBe('active');
});

test('a department can only be given a known status', function () {
    $this->actingAs($this->superAdmin)
        ->patch(route('admin.departments.update', $this->technical), ['status' => 'closed'])
        ->assertSessionHasErrors('status');
});

test('department admins and members can not manage departments', function (string $role) {
    $user = User::factory()->create(['department_id' => $this->technical->id])->assignRole($role);

    $this->actingAs($user)
        ->patch(route('admin.departments.update', $this->technical), ['status' => 'coming_soon'])
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('admin.departments.admins.store', Department::firstWhere('slug', 'choir')), ['user_id' => $user->id, 'office' => 'secretary'])
        ->assertForbidden();

    expect($this->technical->fresh()->status)->toBe('active');
})->with(['dept_admin', 'member']);

test('assigning an admin moves them into the department and gives them the role', function () {
    $user = User::factory()->create()->assignRole('member');

    $this->actingAs($this->superAdmin)
        ->post(route('admin.departments.admins.store', $this->technical), ['user_id' => $user->id])
        ->assertRedirect();

    $user->refresh();

    expect($user->department_id)->toBe($this->technical->id)
        ->and($user->hasRole('dept_admin'))->toBeTrue()
        ->and($user->hasRole('member'))->toBeFalse();
});

test('suspended users and super admins can not be assigned as department admins', function () {
    $suspended = User::factory()->suspended()->create();

    $this->actingAs($this->superAdmin)
        ->post(route('admin.departments.admins.store', $this->technical), ['user_id' => $suspended->id])
        ->assertSessionHasErrors('user_id');

    $this->actingAs($this->superAdmin)
        ->post(route('admin.departments.admins.store', $this->technical), ['user_id' => $this->superAdmin->id])
        ->assertStatus(422);

    expect($this->superAdmin->fresh()->hasRole('super_admin'))->toBeTrue();
});

test('removing an admin returns them to being a member', function () {
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');

    $this->actingAs($this->superAdmin)
        ->delete(route('admin.departments.admins.destroy', [$this->technical, $admin]))
        ->assertRedirect();

    expect($admin->fresh()->hasRole('member'))->toBeTrue()
        ->and($admin->fresh()->hasRole('dept_admin'))->toBeFalse();
});

test('an admin can not be removed through another department', function () {
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $choir = Department::firstWhere('slug', 'choir');

    $this->actingAs($this->superAdmin)
        ->delete(route('admin.departments.admins.destroy', [$choir, $admin]))
        ->assertNotFound();
});

test('a super admin can switch working department and back to all', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('admin.current-department'), ['department_id' => $this->technical->id]);

    expect(CurrentDepartment::idFor($this->superAdmin))->toBe($this->technical->id);

    $this->actingAs($this->superAdmin)
        ->post(route('admin.current-department'), ['department_id' => null]);

    expect(CurrentDepartment::idFor($this->superAdmin))->toBeNull();
});

test('department admins are fixed to their own department', function () {
    $choir = Department::firstWhere('slug', 'choir');
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');

    $this->actingAs($admin)
        ->post(route('admin.current-department'), ['department_id' => $choir->id])
        ->assertForbidden();

    $this->actingAs($admin)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->where('departmentContext.current_id', $this->technical->id)
        ->where('departmentContext.options', null));
});
