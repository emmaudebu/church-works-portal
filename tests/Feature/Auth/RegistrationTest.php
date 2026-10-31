<?php

use App\Models\Department;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    Storage::fake('local');

    $this->registration = [
        'full_name' => 'Test User',
        'gender' => 'female',
        'date_of_birth' => '1995-04-12',
        'phone' => '+234 0801 234 5678',
        'address' => '12 Faith Avenue',
        'department_id' => Department::firstWhere('slug', 'technical-unit')->id,
        'unit' => 'Sound',
        'foundation_class_done' => true,
        'wofbi_done' => false,
        'next_of_kin_name' => 'Kin Person',
        'next_of_kin_relationship' => 'Sister',
        'next_of_kin_phone' => '08098765432',
        'technical_skills' => ['Camera', 'Live streaming'],
        'photo' => UploadedFile::fake()->image('me.jpg', 800, 1000),
        'password' => 'password',
        'password_confirmation' => 'password',
    ];
});

test('registration wizard can be rendered with only active departments', function () {
    $this->get('/register')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Auth/Register')->has('departments', 1));
});

test('a new member registers as pending with full bio data and is not logged in', function () {
    $response = $this->post('/register', $this->registration);

    $this->assertGuest();
    $response->assertRedirect(route('register.pending', absolute: false));

    $user = User::firstWhere('phone', '+2348012345678');

    expect($user->status)->toBe('pending')
        ->and($user->hasRole('member'))->toBeTrue()
        ->and($user->member_id)->toBe('CW-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT))
        ->and($user->profile->next_of_kin_phone)->toBe('+2348098765432')
        ->and($user->profile->technical_skills)->toBe(['Camera', 'Live streaming']);

    Storage::disk('local')->assertExists($user->photo);

    [$width, $height] = getimagesizefromstring(Storage::disk('local')->get($user->photo));

    expect([$width, $height])->toBe([600, 600]);
});

test('each wizard step only validates its own fields', function () {
    $this->post('/register/check?step=1', ['full_name' => 'Only Name'])
        ->assertSessionHasErrors(['gender', 'date_of_birth', 'phone', 'address'])
        ->assertSessionDoesntHaveErrors(['unit', 'next_of_kin_name']);

    $this->post('/register/check?step=2', [])->assertSessionHasErrors(['department_id', 'unit']);
    $this->post('/register/check?step=3', [])->assertSessionHasErrors('next_of_kin_name');
});

test('a step parameter can not skip validation on the final submit', function () {
    $this->post('/register?step=1', [...$this->registration, 'step' => 1, 'photo' => null])
        ->assertSessionHasErrors('photo');

    expect(User::count())->toBe(0);
});

test('a phone number can only be registered once', function () {
    User::factory()->create(['phone' => '+2348012345678']);

    $this->post('/register', $this->registration)->assertSessionHasErrors('phone');
});

test('the pre-filled +234 alone is not a phone number', function () {
    $this->post('/register', [...$this->registration, 'phone' => '+234'])->assertSessionHasErrors('phone');
});

test('a coming soon department can not be joined', function () {
    $choir = Department::firstWhere('slug', 'choir');

    $this->post('/register', [...$this->registration, 'department_id' => $choir->id])
        ->assertSessionHasErrors('department_id');
});

test('only images are accepted as photos', function () {
    $this->post('/register', [...$this->registration, 'photo' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf')])
        ->assertSessionHasErrors('photo');
});
