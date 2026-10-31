<?php

use App\Models\Department;
use App\Models\DepartmentImage;
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
    $this->technical = Department::firstWhere('slug', 'technical-unit');
});

test('the seeder launches the technical unit with choir and ushering coming soon', function () {
    expect(Department::pluck('status', 'slug')->all())->toEqual([
        'choir' => 'coming_soon',
        'technical-unit' => 'active',
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
        ->where('departments.0.slug', 'technical-unit')
        ->where('departments.0.members_count', 2)
        ->where('departments.1.status', 'coming_soon'));
});

test('every department has its own public page', function () {
    $this->get(route('departments'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('Site/Departments')->has('departments', 3));

    $this->get(route('departments.show', 'technical-unit'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Site/Department')
            ->where('department.name', 'Technical Unit')
            ->where('units', ['Lighting', 'Media', 'Projection', 'Sound'])
            ->has('others', 2));

    $this->get(route('departments.show', 'choir'))->assertOk();
    $this->get('/departments/nothing-here')->assertNotFound();
});

test('a department page does not count suspended members', function () {
    User::factory()->suspended()->create(['department_id' => $this->technical->id]);

    $this->get(route('departments.show', 'technical-unit'))
        ->assertInertia(fn (Assert $page) => $page->where('department.members_count', 0));
});

test('a super admin can write a department page and upload its picture', function () {
    Storage::fake('public');

    $this->actingAs($this->superAdmin)->post(route('admin.departments.page', $this->technical), [
        'name' => 'Technical Unit',
        'icon' => 'mic',
        'description' => 'New line',
        'about' => 'Our story',
        'image' => UploadedFile::fake()->image('team.jpg', 1000, 600),
    ])->assertSessionHasNoErrors();

    $department = $this->technical->fresh();

    expect($department->about)->toBe('Our story');
    Storage::disk('public')->assertExists($department->image);

    $this->actingAs($this->superAdmin)->post(route('admin.departments.page', $this->technical), ['name' => 'Technical Unit', 'icon' => 'mic', 'about' => 'Edited', 'image' => null]);

    expect($this->technical->fresh()->image)->toBe($department->image);
});

test('department admins can not edit department pages', function () {
    $admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');

    $this->actingAs($admin)->post(route('admin.departments.page', $this->technical), ['about' => 'x'])->assertForbidden();
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

test('an empty department can be deleted but not one with members', function () {
    $choir = Department::firstWhere('slug', 'choir');
    User::factory()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $choir))->assertRedirect();
    $this->actingAs($this->superAdmin)->delete(route('admin.departments.destroy', $this->technical))->assertSessionHasErrors('department');

    expect(Department::find($choir->id))->toBeNull()
        ->and(Department::find($this->technical->id))->not->toBeNull();
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

    $this->get(route('departments.show', 'technical-unit'))
        ->assertInertia(fn (Assert $page) => $page->has('gallery', 2));

    $this->actingAs($this->superAdmin)->delete(route('admin.gallery.destroy', $image))->assertRedirect();

    Storage::disk('public')->assertMissing($image->image);
    expect(DepartmentImage::find($image->id))->toBeNull();
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
        ->post(route('admin.departments.admins.store', $this->technical), ['user_id' => $user->id])
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
