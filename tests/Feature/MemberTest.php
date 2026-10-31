<?php

use App\Models\Department;
use App\Models\User;
use App\Support\CurrentDepartment;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->technical = Department::firstWhere('slug', 'technical-unit');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->superAdmin = User::factory()->create()->assignRole('super_admin');
    $this->deptAdmin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->outsider = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');
});

function bioPayload(User $member, array $overrides = []): array
{
    return [
        'member_id' => 'CW-9999',
        'full_name' => 'Renamed Person',
        'gender' => 'male',
        'date_of_birth' => '1990-01-01',
        'phone' => $member->phone,
        'address' => 'New address',
        'unit' => 'Media',
        'next_of_kin_name' => 'Kin',
        'next_of_kin_relationship' => 'Brother',
        'next_of_kin_phone' => '08011112222',
        ...$overrides,
    ];
}

test('the directory only shows a department admin their own department', function () {
    $this->actingAs($this->deptAdmin)->get('/admin/members')->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Members/Index')
        ->where('members.total', 2));
});

test('a department admin without a department sees nobody', function () {
    $admin = User::factory()->create()->assignRole('dept_admin');

    $this->actingAs($admin)->get('/admin/members')->assertInertia(fn (Assert $page) => $page
        ->where('members.total', 0));
});

test('a super admin sees everyone except super admins and can narrow by department', function () {
    $this->actingAs($this->superAdmin)->get('/admin/members')
        ->assertInertia(fn (Assert $page) => $page->where('members.total', 3));

    $this->withSession([CurrentDepartment::SESSION_KEY => $this->choir->id])
        ->get('/admin/members')
        ->assertInertia(fn (Assert $page) => $page->where('members.total', 1));
});

test('the directory can be searched and filtered', function (array $query, int $expected) {
    $this->member->update(['full_name' => 'Zainab Okoro', 'phone' => '+2348012345678', 'unit' => 'Lighting']);
    $this->deptAdmin->update(['unit' => 'Sound']);

    $this->actingAs($this->deptAdmin)->get(route('admin.members', $query))
        ->assertInertia(fn (Assert $page) => $page->where('members.total', $expected));
})->with([
    'by name' => [['search' => 'zainab'], 1],
    'by local phone' => [['search' => '0801 234'], 1],
    'by unit' => [['unit' => 'Lighting'], 1],
    'by status' => [['status' => 'suspended'], 0],
]);

test('a department admin can not touch another department', function (string $method, string $name, array $data) {
    $this->actingAs($this->deptAdmin)
        ->{$method}(route($name, $this->outsider), $data)
        ->assertNotFound();

    expect($this->outsider->fresh()->status)->toBe('active');
})->with([
    'view' => ['get', 'admin.members.show', []],
    'edit' => ['get', 'admin.members.edit', []],
    'suspend' => ['post', 'admin.members.suspend', ['reason' => 'x']],
    'reset password' => ['post', 'admin.members.reset-password', []],
    'notes' => ['patch', 'admin.members.notes', ['admin_notes' => 'x']],
]);

test('a department admin can view but not manage a fellow admin', function () {
    $peer = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $password = $peer->password;

    $this->actingAs($this->deptAdmin)->get(route('admin.members.show', $peer))->assertOk();
    $this->actingAs($this->deptAdmin)->post(route('admin.members.reset-password', $peer))->assertNotFound();
    $this->actingAs($this->deptAdmin)->post(route('admin.members.suspend', $peer), ['reason' => 'x'])->assertNotFound();

    expect($peer->fresh()->password)->toBe($password)
        ->and($peer->fresh()->status)->toBe('active');
});

test('super admins can not be suspended or edited through the directory', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('admin.members.suspend', $this->superAdmin), ['reason' => 'x'])
        ->assertNotFound();
});

test('members can not use any admin member action', function () {
    $this->actingAs($this->member)->get('/admin/members/export')->assertForbidden();
    $this->actingAs($this->member)->post(route('admin.members.suspend', $this->outsider), ['reason' => 'x'])->assertForbidden();
    $this->actingAs($this->member)->post('/admin/members/approve', ['ids' => [$this->outsider->id]])->assertForbidden();
});

test('bulk approve only touches pending members the admin can reach', function () {
    $mine = User::factory()->pending()->create(['department_id' => $this->technical->id])->assignRole('member');
    $theirs = User::factory()->pending()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->actingAs($this->deptAdmin)
        ->post('/admin/members/approve', ['ids' => [$mine->id, $theirs->id]])
        ->assertSessionHas('success', '1 member approved.');

    expect($mine->fresh()->status)->toBe('active')
        ->and($theirs->fresh()->status)->toBe('pending');
});

test('suspending requires a reason', function () {
    $this->actingAs($this->deptAdmin)
        ->post(route('admin.members.suspend', $this->member), ['reason' => ''])
        ->assertSessionHasErrors('reason');

    expect($this->member->fresh()->status)->toBe('active');
});

test('suspending and reactivating are logged with who and why', function () {
    $this->actingAs($this->deptAdmin)
        ->post(route('admin.members.suspend', $this->member), ['reason' => 'Repeated absence']);

    $member = $this->member->fresh();

    expect($member->status)->toBe('suspended')
        ->and($member->suspension_reason)->toBe('Repeated absence');

    $this->actingAs($this->deptAdmin)
        ->post(route('admin.members.reactivate', $this->member), ['reason' => 'Spoke with them']);

    $member = $this->member->fresh();

    expect($member->status)->toBe('active')
        ->and($member->suspension_reason)->toBeNull()
        ->and($member->suspensionLogs->pluck('action')->all())->toBe(['reactivated', 'suspended'])
        ->and($member->suspensionLogs->last()->by_user_id)->toBe($this->deptAdmin->id);
});

test('a suspended member is logged out on their next request', function () {
    $this->actingAs($this->member)->get('/home')->assertOk();

    $this->member->update(['status' => 'suspended']);

    $this->get('/home')->assertRedirect(route('login', absolute: false));
    $this->assertGuest();
});

test('a temporary password is shown once and must be changed before anything else', function () {
    $this->actingAs($this->deptAdmin)
        ->post(route('admin.members.reset-password', $this->member))
        ->assertSessionHas('temp_password');

    $password = session('temp_password');
    $member = $this->member->fresh();

    expect(Hash::check($password, $member->password))->toBeTrue()
        ->and($member->must_change_password)->toBeTrue();

    $this->actingAs($member)->get('/home')->assertRedirect(route('profile.edit', absolute: false));
    $this->actingAs($member)->get('/profile')->assertOk();

    $this->actingAs($member)->put(route('password.update'), [
        'current_password' => $password,
        'password' => 'a-new-password',
        'password_confirmation' => 'a-new-password',
    ])->assertSessionHasNoErrors();

    $this->actingAs($member->fresh())->get('/home')->assertOk();
});

test('an admin can edit bio data and the member id', function () {
    Storage::fake('local');

    $this->actingAs($this->deptAdmin)
        ->patch(route('admin.members.update', $this->member), bioPayload($this->member, [
            'photo' => UploadedFile::fake()->image('new.png', 300, 300),
        ]))
        ->assertRedirect(route('admin.members.show', $this->member, absolute: false));

    $member = $this->member->fresh();

    expect($member->full_name)->toBe('Renamed Person')
        ->and($member->member_id)->toBe('CW-9999')
        ->and($member->profile->next_of_kin_phone)->toBe('+2348011112222');

    Storage::disk('local')->assertExists($member->photo);
});

test('a department admin can not move a member to another department', function () {
    $this->actingAs($this->deptAdmin)
        ->patch(route('admin.members.update', $this->member), bioPayload($this->member, [
            'department_id' => $this->choir->id,
            'status' => 'suspended',
        ]))
        ->assertRedirect();

    $member = $this->member->fresh();

    expect($member->department_id)->toBe($this->technical->id)
        ->and($member->status)->toBe('active');
});

test('saving an edit without a new photo keeps the existing one', function () {
    $this->member->update(['photo' => 'photos/keep.jpg']);

    $this->actingAs($this->deptAdmin)
        ->patch(route('admin.members.update', $this->member), bioPayload($this->member, ['photo' => null]))
        ->assertSessionHasNoErrors();

    expect($this->member->fresh()->photo)->toBe('photos/keep.jpg');

    $this->actingAs($this->member)
        ->patch('/profile', bioPayload($this->member, ['photo' => null]))
        ->assertSessionHasNoErrors();

    expect($this->member->fresh()->photo)->toBe('photos/keep.jpg');
});

test('a member of a coming soon department can still be edited by a super admin', function () {
    $this->actingAs($this->superAdmin)
        ->patch(route('admin.members.update', $this->outsider), bioPayload($this->outsider, ['department_id' => $this->choir->id]))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->superAdmin)
        ->patch(route('admin.members.update', $this->member), bioPayload($this->member, ['department_id' => $this->choir->id, 'member_id' => 'CW-8888']))
        ->assertSessionHasErrors('department_id');
});

test('replacing a photo removes the old file', function () {
    Storage::fake('local');

    $this->actingAs($this->deptAdmin)->patch(route('admin.members.update', $this->member), bioPayload($this->member, [
        'photo' => UploadedFile::fake()->image('one.jpg'),
    ]));

    $first = $this->member->fresh()->photo;

    $this->actingAs($this->deptAdmin)->patch(route('admin.members.update', $this->member), bioPayload($this->member, [
        'photo' => UploadedFile::fake()->image('two.jpg'),
    ]));

    Storage::disk('local')->assertMissing($first);
});

test('photos are private to the member and admins who can view them', function () {
    Storage::fake('local');
    Storage::disk('local')->put('photos/a.jpg', 'image');
    $this->member->update(['photo' => 'photos/a.jpg']);

    $url = route('photos.show', $this->member);

    $this->get($url)->assertRedirect(route('login', absolute: false));

    $this->actingAs($this->member)->get($url)->assertOk();
    $this->actingAs($this->deptAdmin)->get($url)->assertOk();
    $this->actingAs($this->superAdmin)->get($url)->assertOk();
    $this->actingAs($this->outsider)->get($url)->assertForbidden();
});

test('members can edit their own details but not their status, id or department', function () {
    $this->actingAs($this->member)->patch('/profile', bioPayload($this->member, [
        'full_name' => 'Self Edited',
        'status' => 'suspended',
        'member_id' => 'HACKED',
        'department_id' => $this->choir->id,
    ]))->assertSessionHasNoErrors();

    $member = $this->member->fresh();

    expect($member->full_name)->toBe('Self Edited')
        ->and($member->status)->toBe('active')
        ->and($member->member_id)->not->toBe('HACKED')
        ->and($member->department_id)->toBe($this->technical->id);
});

test('a certificate can be opened by its owner and admins only', function () {
    Storage::fake('local');
    Storage::disk('local')->put('certificates/a.pdf', '%PDF-1.4');
    $this->member->update(['foundation_certificate' => 'certificates/a.pdf']);

    $url = route('certificates.show', ['user' => $this->member, 'type' => 'foundation']);

    $this->get($url)->assertRedirect(route('login', absolute: false));
    $this->actingAs($this->outsider)->get($url)->assertForbidden();
    $this->actingAs($this->member)->get($url)->assertOk();
    $this->actingAs($this->superAdmin)->get($url)->assertOk();

    $response = $this->actingAs($this->deptAdmin)->get($url)->assertOk();

    expect($response->headers->get('Content-Security-Policy'))->toBe('sandbox');
});

test('a missing certificate or unknown type is not found', function () {
    $this->actingAs($this->member)->get(route('certificates.show', ['user' => $this->member, 'type' => 'wofbi']))->assertNotFound();
    $this->actingAs($this->member)->get(route('certificates.show', ['user' => $this->member, 'type' => 'other']))->assertNotFound();
});

test('a member saying yes on their profile must upload the certificate', function () {
    $this->member->update(['foundation_class_done' => false]);

    $this->actingAs($this->member)->patch('/profile', bioPayload($this->member, ['foundation_class_done' => true]))
        ->assertSessionHasErrors('foundation_certificate');
});

test('existing members already marked yes can still save their profile', function () {
    $this->member->update(['foundation_class_done' => true]);

    $this->actingAs($this->member)->patch('/profile', bioPayload($this->member, ['foundation_class_done' => true]))
        ->assertSessionHasNoErrors();
});

test('changing a class to no removes its certificate', function () {
    Storage::fake('local');
    Storage::disk('local')->put('certificates/a.pdf', '%PDF-1.4');
    $this->member->update(['foundation_class_done' => true, 'foundation_certificate' => 'certificates/a.pdf']);

    $this->actingAs($this->member)->patch('/profile', bioPayload($this->member, ['foundation_class_done' => false]))
        ->assertSessionHasNoErrors();

    expect($this->member->fresh()->foundation_certificate)->toBeNull();
    Storage::disk('local')->assertMissing('certificates/a.pdf');
});

test('an admin can mark a class without a certificate and upload one for the member', function () {
    Storage::fake('local');

    $this->actingAs($this->deptAdmin)->patch(route('admin.members.update', $this->member), bioPayload($this->member, ['wofbi_done' => true]))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->deptAdmin)->patch(route('admin.members.update', $this->member), bioPayload($this->member, [
        'wofbi_done' => true,
        'wofbi_certificate' => UploadedFile::fake()->image('c.jpg'),
    ]))->assertSessionHasNoErrors();

    Storage::disk('local')->assertExists($this->member->fresh()->wofbi_certificate);
});

test('admin notes are not exposed to the member', function () {
    $this->actingAs($this->deptAdmin)
        ->patch(route('admin.members.notes', $this->member), ['admin_notes' => 'Private remark']);

    expect($this->member->fresh()->profile->admin_notes)->toBe('Private remark');

    $this->actingAs($this->member)->get('/profile')->assertInertia(fn (Assert $page) => $page
        ->missing('member.profile.admin_notes'));
});

test('the export contains only the admin department and neutralises formulas', function () {
    $this->member->update(['full_name' => '=HYPERLINK("http://evil.test")']);

    $response = $this->actingAs($this->deptAdmin)->get('/admin/members/export')->assertOk();

    $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();
    $names = collect($sheet->rangeToArray('B2:B'.$sheet->getHighestRow(), calculateFormulas: false))->flatten();

    expect($names)->toHaveCount(2)
        ->and($names)->toContain($this->deptAdmin->full_name)
        ->and($names)->not->toContain($this->outsider->full_name)
        ->and(collect(range(2, $sheet->getHighestRow()))->map(fn ($row) => $sheet->getCell("B{$row}")->getDataType())->unique()->all())
        ->toBe([DataType::TYPE_STRING]);
});

test('selected members can be exported on their own', function () {
    $response = $this->actingAs($this->deptAdmin)->get(route('admin.members.export', ['ids' => [$this->member->id]]))->assertOk();

    expect(IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet()->getHighestRow())->toBe(2);
});

test('the dashboard counts follow the admin department', function () {
    User::factory()->pending()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->deptAdmin)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->where('stats.total', 3)
        ->where('stats.pending', 1));
});

test('a generated member id steps past one typed by hand', function () {
    $user = User::factory()->create();
    User::factory()->create(['member_id' => 'CW-'.str_pad((string) $user->id, 4, '0', STR_PAD_LEFT)]);

    expect(User::nextMemberId($user))->toBe('CW-'.str_pad((string) ($user->id + 1), 4, '0', STR_PAD_LEFT));
});
