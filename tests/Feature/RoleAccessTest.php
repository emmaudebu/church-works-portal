<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;

beforeEach(fn () => $this->seed(RoleSeeder::class));

function userWithRole(string $role): User
{
    return User::factory()->create()->assignRole($role);
}

test('guests are sent to login from protected pages', function (string $uri) {
    $this->get($uri)->assertRedirect(route('login', absolute: false));
})->with(['/home', '/admin', '/admin/members']);

test('members can not reach admin pages', function (string $uri) {
    $this->actingAs(userWithRole('member'))->get($uri)->assertForbidden();
})->with(['/admin', '/admin/members', '/admin/departments', '/admin/settings']);

test('department admins can reach department pages but not super admin pages', function () {
    $admin = userWithRole('dept_admin');

    $this->actingAs($admin)->get('/admin')->assertOk();
    $this->actingAs($admin)->get('/admin/members')->assertOk();
    $this->actingAs($admin)->get('/admin/departments')->assertForbidden();
    $this->actingAs($admin)->get('/admin/settings')->assertForbidden();
});

test('super admins can reach every admin page', function (string $uri) {
    $this->actingAs(userWithRole('super_admin'))->get($uri)->assertOk();
})->with(['/admin', '/admin/members', '/admin/departments', '/admin/settings']);

test('the dashboard route sends each role to its own home', function (string $role, string $home) {
    $this->actingAs(userWithRole($role))->get('/dashboard')->assertRedirect(route($home, absolute: false));
})->with([
    ['member', 'member.home'],
    ['dept_admin', 'admin.dashboard'],
    ['super_admin', 'admin.dashboard'],
]);

test('the seeder creates the three roles and a super admin', function () {
    $this->seed();

    expect(User::role('super_admin')->count())->toBe(1);
});
