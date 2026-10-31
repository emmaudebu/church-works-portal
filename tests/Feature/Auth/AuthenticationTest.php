<?php

use App\Models\User;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'login' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'login' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');
});

test('users can authenticate with their phone number in any common format', function (string $phone) {
    $user = User::factory()->create(['phone' => '+2348012345678']);

    $this->post('/login', ['login' => $phone, 'password' => 'password']);

    $this->assertAuthenticatedAs($user);
})->with(['+2348012345678', '08012345678', '2348012345678', '0801 234 5678']);

test('pending users can not log in', function () {
    $user = User::factory()->pending()->create();

    $response = $this->post('/login', ['login' => $user->email, 'password' => 'password']);

    $this->assertGuest();
    $response->assertSessionHasErrors(['login' => 'Your account is awaiting admin approval.']);
});

test('suspended users can not log in', function () {
    $user = User::factory()->suspended()->create();

    $response = $this->post('/login', ['login' => $user->email, 'password' => 'password']);

    $this->assertGuest();
    $response->assertSessionHasErrors('login');
});

test('account status is not revealed without the correct password', function () {
    $user = User::factory()->suspended()->create();

    $response = $this->post('/login', ['login' => $user->email, 'password' => 'wrong-password']);

    $response->assertSessionHasErrors(['login' => trans('auth.failed')]);
});

test('users suspended during a session are logged out', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/profile')->assertOk();

    $user->update(['status' => 'suspended']);

    $this->get('/profile')->assertRedirect(route('login', absolute: false));
    $this->assertGuest();
});
