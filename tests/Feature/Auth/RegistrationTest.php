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

    $this->technical = Department::firstWhere('slug', 'technical-department');

    $this->registration = [
        'full_name' => 'Test User',
        'gender' => 'female',
        'date_of_birth' => '1995-04-12',
        'phone' => '+234 0801 234 5678',
        'email' => 'new.member@example.com',
        'address' => '12 Faith Avenue',
        'department_id' => Department::firstWhere('slug', 'technical-department')->id,
        'unit' => 'Sound',
        'foundation_class_done' => true,
        'foundation_certificate' => UploadedFile::fake()->create('foundation.pdf', 100, 'application/pdf'),
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

    expect([$width, $height])->toBe([600, 750]);
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

test('saying yes to a class requires its certificate', function (string $answer, string $certificate) {
    $data = [...$this->registration, 'foundation_class_done' => false, 'foundation_certificate' => null, $answer => true];
    $data[$certificate] = null;

    $this->post('/register', $data)->assertSessionHasErrors($certificate);

    expect(User::count())->toBe(0);
})->with([
    ['foundation_class_done', 'foundation_certificate'],
    ['wofbi_done', 'wofbi_certificate'],
]);

test('the wizard stops at the church step without the certificate', function () {
    $this->post('/register/check?step=2', [
        'department_id' => $this->technical->id,
        'unit' => 'Sound',
        'foundation_class_done' => true,
        'wofbi_done' => true,
    ])->assertSessionHasErrors(['foundation_certificate', 'wofbi_certificate']);
});

test('saying no needs no certificate', function () {
    $this->post('/register/check?step=2', [
        'department_id' => $this->technical->id,
        'unit' => 'Sound',
        'foundation_class_done' => false,
        'wofbi_done' => false,
    ])->assertSessionHasNoErrors();
});

test('certificates are stored privately as pdf or photo', function () {
    $this->post('/register', [
        ...$this->registration,
        'wofbi_done' => true,
        'wofbi_certificate' => UploadedFile::fake()->image('wofbi.png', 2600, 1800),
    ])->assertSessionHasNoErrors();

    $user = User::firstWhere('phone', '+2348012345678');

    Storage::disk('local')->assertExists([$user->foundation_certificate, $user->wofbi_certificate]);

    expect($user->foundation_certificate)->toEndWith('.pdf')
        ->and($user->wofbi_certificate)->toEndWith('.jpg')
        ->and(getimagesizefromstring(Storage::disk('local')->get($user->wofbi_certificate))[0])->toBe(2000)
        ->and($user->toArray())->toHaveKey('wofbi_certificate');
});

test('other file types are refused as certificates', function () {
    $this->post('/register', [
        ...$this->registration,
        'foundation_certificate' => UploadedFile::fake()->create('cert.exe', 10, 'application/octet-stream'),
    ])->assertSessionHasErrors('foundation_certificate');
});

test('a certificate the server turned away asks for a smaller file', function () {
    $turnedAway = new UploadedFile(__FILE__, 'wofbi.jpg', 'image/jpeg', UPLOAD_ERR_INI_SIZE, true);

    $this->post('/register/check?step=2', [
        'department_id' => $this->technical->id,
        'unit' => 'Sound',
        'wofbi_done' => true,
        'wofbi_certificate' => $turnedAway,
    ])->assertSessionHasErrors([
        'wofbi_certificate' => 'That file could not be uploaded. Please use a smaller one, up to 8 MB.',
    ]);
});

test('a file attached before changing the answer to no is not kept', function () {
    $this->post('/register', [...$this->registration, 'foundation_class_done' => false])
        ->assertSessionHasNoErrors();

    expect(User::firstWhere('phone', '+2348012345678')->foundation_certificate)->toBeNull();
});

test('an email is required so a password can be reset', function () {
    $this->post('/register/check?step=1', ['full_name' => 'A', 'email' => ''])
        ->assertSessionHasErrors('email');

    $this->post('/register', [...$this->registration, 'email' => ''])->assertSessionHasErrors('email');

    expect(User::count())->toBe(0);
});
