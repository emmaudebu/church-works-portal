<?php

use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

test('an unknown address shows the friendly 404 page with the church logo', function () {
    $this->get('/this-page-does-not-exist')
        ->assertNotFound()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Error')
            ->where('status', 404)
            ->where('branding.logo_dark_url', '/images/logo-dark.png'));
});

test('a missing record shows the friendly 404 page too', function () {
    $this->get('/posts/999999')->assertNotFound()->assertInertia(fn (Assert $page) => $page->component('Error'));
});

test('a forbidden page shows the friendly 403 page', function () {
    $this->seed(RoleSeeder::class);

    $this->actingAs(User::factory()->create()->assignRole('member'))->get('/admin')
        ->assertForbidden()
        ->assertInertia(fn (Assert $page) => $page->component('Error')->where('status', 403));
});

test('a server error is friendly for visitors and hides the details', function () {
    config(['app.debug' => false]);

    Route::middleware('web')->get('/explode', fn () => throw new RuntimeException('secret detail'));

    $this->withoutExceptionHandling([]);

    $response = $this->withExceptionHandling()->get('/explode');

    $response->assertStatus(500)->assertInertia(fn (Assert $page) => $page->component('Error')->where('status', 500));

    expect($response->getContent())->not->toContain('secret detail');
});

test('apps asking for json still get json', function () {
    $this->getJson('/this-page-does-not-exist')->assertNotFound()->assertJsonStructure(['message']);
});
