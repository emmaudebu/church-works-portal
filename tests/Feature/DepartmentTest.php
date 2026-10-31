<?php

use App\Models\Department;
use App\Models\User;
use App\Support\CurrentDepartment;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
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
