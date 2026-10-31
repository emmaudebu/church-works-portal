<?php

use App\Models\Department;
use App\Models\User;
use App\Support\Offices;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->department = Department::firstWhere('slug', 'technical-unit');
    $this->choir = Department::firstWhere('slug', 'choir');
    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->member = User::factory()->create(['department_id' => $this->department->id])->assignRole('member');
});

function officer(object $test, string $office): User
{
    return User::factory()->create(['department_id' => $test->department->id])->assignRole($office);
}

test('all six offices exist with defaults', function () {
    expect(Role::whereIn('name', Offices::roles())->count())->toBe(6)
        ->and(officer($this, 'vice_head')->canDo('manage_members'))->toBeTrue()
        ->and(officer($this, 'dept_admin')->canDo('manage_department'))->toBeTrue();
});

test('a super admin assigns an office and each office has one holder', function () {
    $this->actingAs($this->superAdmin)->post(route('admin.departments.admins.store', $this->department), [
        'user_id' => $this->member->id, 'office' => 'treasurer',
    ])->assertSessionHasNoErrors();

    expect($this->member->fresh()->hasRole('treasurer'))->toBeTrue()
        ->and($this->member->fresh()->office())->toBe('Treasurer');

    $other = User::factory()->create(['department_id' => $this->department->id])->assignRole('member');

    $this->actingAs($this->superAdmin)->post(route('admin.departments.admins.store', $this->department), [
        'user_id' => $other->id, 'office' => 'treasurer',
    ])->assertSessionHasErrors('user_id');

    expect($other->fresh()->hasRole('treasurer'))->toBeFalse();
});

test('different departments can each have their own holder', function () {
    officer($this, 'treasurer');

    $this->actingAs($this->superAdmin)->post(route('admin.departments.admins.store', $this->choir), [
        'user_id' => $this->member->id, 'office' => 'treasurer',
    ])->assertSessionHasNoErrors();
});

test('removing an officer returns them to being a member', function () {
    $treasurer = officer($this, 'treasurer');

    $this->actingAs($this->superAdmin)->delete(route('admin.departments.admins.destroy', [$this->department, $treasurer]))->assertRedirect();

    expect($treasurer->fresh()->isOfficer())->toBeFalse()
        ->and($treasurer->fresh()->hasRole('member'))->toBeTrue();
});

test('each office only reaches its own screens', function (string $office, array $allowed, array $forbidden) {
    $user = officer($this, $office);

    foreach ($allowed as $uri) {
        $this->actingAs($user)->get($uri)->assertOk();
    }

    foreach ($forbidden as $uri) {
        $this->actingAs($user)->get($uri)->assertForbidden();
    }
})->with([
    'treasurer' => ['treasurer', ['/admin', '/admin/members', '/admin/payments', '/admin/reports'], ['/admin/posts', '/admin/services', '/admin/elections', '/admin/scanner']],
    'financial secretary' => ['financial_secretary', ['/admin/payments'], ['/admin/reports', '/admin/posts', '/admin/services']],
    'secretary' => ['secretary', ['/admin/services', '/admin/scanner', '/admin/posts', '/admin/reports'], ['/admin/payments', '/admin/elections']],
    'welfare officer' => ['welfare_officer', ['/admin/members', '/admin/reports', '/admin/posts'], ['/admin/payments', '/admin/services', '/admin/scanner']],
]);

test('only some offices can change member records', function () {
    $treasurer = officer($this, 'treasurer');
    $secretary = officer($this, 'secretary');

    $this->actingAs($treasurer)->post(route('admin.members.suspend', $this->member), ['reason' => 'x'])->assertNotFound();
    $this->actingAs($secretary)->post(route('admin.members.suspend', $this->member), ['reason' => 'x'])->assertRedirect();

    expect($this->member->fresh()->status)->toBe('suspended');
});

test('officers can not act on one another', function () {
    $secretary = officer($this, 'secretary');
    $head = officer($this, 'dept_admin');

    $this->actingAs($secretary)->post(route('admin.members.suspend', $head), ['reason' => 'x'])->assertNotFound();
    $this->actingAs($head)->post(route('admin.members.reset-password', $secretary))->assertNotFound();
});

test('an officer of another department is still kept out', function () {
    $treasurer = User::factory()->create(['department_id' => $this->choir->id])->assignRole('treasurer');

    $this->actingAs($treasurer)->get(route('admin.members.show', $this->member))->assertNotFound();
});

test('a super admin changes what an office can do and it applies at once', function () {
    $welfare = officer($this, 'welfare_officer');

    $this->actingAs($welfare)->get('/admin/payments')->assertForbidden();

    $this->actingAs($this->superAdmin)->put(route('admin.settings.permissions'), [
        'offices' => ['welfare_officer' => ['view_payments'], 'dept_admin' => []],
    ])->assertSessionHasNoErrors();

    $this->actingAs($welfare->fresh())->get('/admin/payments')->assertOk();
    $this->actingAs($welfare->fresh())->get('/admin/reports')->assertForbidden();

    expect(officer($this, 'dept_admin')->canDo('manage_members'))->toBeTrue();
});

test('unknown permissions are refused and only super admins can edit', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.settings.permissions'), ['offices' => ['secretary' => ['fly']]])
        ->assertSessionHasErrors();

    $this->actingAs(officer($this, 'dept_admin'))->put(route('admin.settings.permissions'), ['offices' => []])->assertForbidden();
});

test('reseeding keeps permissions a super admin changed', function () {
    Role::findByName('secretary', 'web')->syncPermissions(['view_reports']);

    $this->seed(RoleSeeder::class);

    expect(Role::findByName('secretary', 'web')->permissions->pluck('name')->all())->toBe(['view_reports']);
});

test('the browser is told what the person may do', function () {
    $this->actingAs(officer($this, 'financial_secretary'))->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->where('auth.user.office', 'Financial Secretary')
        ->where('auth.user.permissions', fn ($permissions) => collect($permissions)->sort()->values()->all() === ['record_payments', 'view_payments']));
});

test('members stay out of every admin screen', function () {
    $this->actingAs($this->member)->get('/admin')->assertForbidden();
    $this->actingAs($this->member)->get('/admin/members')->assertForbidden();
});
