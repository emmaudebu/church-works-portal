<?php

use App\Models\Department;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $technical = Department::firstWhere('slug', 'technical-unit');
    $choir = Department::firstWhere('slug', 'choir');

    $this->admin = User::factory()->create(['department_id' => $technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $technical->id])->assignRole('member');
    $this->outsider = User::factory()->create(['department_id' => $choir->id])->assignRole('member');
});

test('every user gets their own unguessable token', function () {
    expect($this->member->qr_token)->toHaveLength(40)
        ->and($this->member->qr_token)->not->toBe($this->admin->qr_token);
});

test('the seeder gives sample members tokens', function () {
    $this->seed();

    expect(User::whereNull('qr_token')->count())->toBe(0);
});

test('the token is never sent to the browser in page data', function () {
    $this->actingAs($this->member)->get('/my-qr')
        ->assertOk()
        ->assertDontSee($this->member->qr_token);

    expect($this->member->toArray())->not->toHaveKey('qr_token');
});

test('the code is an svg that holds no personal data', function () {
    $response = $this->actingAs($this->member)->get(route('qr.show', $this->member))->assertOk();

    expect($response->headers->get('Content-Type'))->toContain('image/svg+xml')
        ->and($response->getContent())->not->toContain($this->member->full_name)
        ->and($response->getContent())->not->toContain((string) $this->member->phone);
});

test('codes are limited to the member and admins who can view them', function () {
    $url = route('qr.show', $this->member);

    $this->get($url)->assertRedirect(route('login', absolute: false));
    $this->actingAs($this->outsider)->get($url)->assertForbidden();
    $this->actingAs($this->admin)->get($url)->assertOk();
    $this->actingAs($this->admin)->get(route('qr.show', $this->outsider))->assertForbidden();
});

test('a suspended member has no code or card', function () {
    $this->actingAs($this->member)->get('/my-qr')
        ->assertInertia(fn (Assert $page) => $page->component('Member/MyQr')->whereNot('qr_url', null));

    DB::table('users')->where('id', $this->member->id)->update(['status' => 'suspended']);

    $this->actingAs($this->admin)->get(route('qr.show', $this->member))->assertForbidden();
    $this->actingAs($this->admin)->get(route('id-card', $this->member))->assertForbidden();
});

test('the id card shows the member details', function () {
    $this->actingAs($this->admin)->get(route('id-card', $this->member))
        ->assertInertia(fn (Assert $page) => $page
            ->component('IdCard')
            ->where('member.full_name', $this->member->full_name)
            ->where('member.department', 'Technical Unit'));
});

test('a member can not open someone else id card', function () {
    $this->actingAs($this->outsider)->get(route('id-card', $this->member))->assertForbidden();
});
