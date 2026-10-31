<?php

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Support\ServiceGenerator;
use Carbon\CarbonImmutable;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->technical = Department::firstWhere('slug', 'technical-unit');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->outsider = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->service = Service::factory()->create(['department_id' => $this->technical->id]);
});

function scan(object $test, string $token, ?Service $service = null)
{
    return $test->actingAs($test->admin)
        ->postJson(route('admin.scanner.check-in', $service ?? $test->service), ['token' => $token]);
}

test('a valid scan marks the member present', function () {
    scan($this, $this->member->qr_token)
        ->assertOk()
        ->assertJsonPath('status', 'present')
        ->assertJsonPath('member.full_name', $this->member->full_name)
        ->assertJsonPath('count', 1);

    $row = Attendance::first();

    expect($row->user_id)->toBe($this->member->id)
        ->and($row->method)->toBe('qr')
        ->and($row->recorded_by)->toBe($this->admin->id);
});

test('a duplicate scan is flagged and not counted twice', function () {
    scan($this, $this->member->qr_token);

    scan($this, $this->member->qr_token)
        ->assertJsonPath('status', 'duplicate')
        ->assertJsonPath('count', 1);

    expect(Attendance::count())->toBe(1);
});

test('a suspended member is rejected at the scanner', function () {
    $this->member->update(['status' => 'suspended']);

    scan($this, $this->member->qr_token)->assertJsonPath('status', 'suspended');

    expect(Attendance::count())->toBe(0);
});

test('a suspended member is rejected even when attendance is closed', function () {
    $this->member->update(['status' => 'suspended']);
    $this->service->update(['is_open' => false]);

    scan($this, $this->member->qr_token)->assertJsonPath('status', 'suspended');
});

test('an unknown token is invalid and reveals nothing', function () {
    scan($this, 'not-a-real-token')
        ->assertJsonPath('status', 'invalid')
        ->assertJsonMissingPath('member');
});

test('a pending member is invalid', function () {
    $this->member->update(['status' => 'pending']);

    scan($this, $this->member->qr_token)
        ->assertJsonPath('status', 'invalid')
        ->assertJsonMissingPath('member');
});

test('a member of another department is invalid here', function () {
    scan($this, $this->outsider->qr_token)
        ->assertJsonPath('status', 'invalid')
        ->assertJsonMissingPath('member');
});

test('scans are refused outside the window', function () {
    $service = Service::factory()->finished()->create(['department_id' => $this->technical->id]);

    scan($this, $this->member->qr_token, $service)->assertJsonPath('status', 'closed');

    expect(Attendance::count())->toBe(0);
});

test('scans are refused once an admin closes attendance', function () {
    $this->actingAs($this->admin)->post(route('admin.services.close', $this->service));

    scan($this, $this->member->qr_token)->assertJsonPath('status', 'closed');
});

test('opening a finished service stretches the window so scans work', function () {
    $service = Service::factory()->finished()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->admin)->post(route('admin.services.open', $service));

    scan($this, $this->member->qr_token, $service)->assertJsonPath('status', 'present');
});

test('a future service can not be opened early', function () {
    $service = Service::factory()->create([
        'department_id' => $this->technical->id,
        'date' => today()->addWeek(),
        'opens_at' => now()->addWeek(),
        'closes_at' => now()->addWeek()->addHour(),
    ]);

    $this->actingAs($this->admin)->post(route('admin.services.open', $service))->assertStatus(422);

    scan($this, $this->member->qr_token, $service)->assertJsonPath('status', 'closed');
});

test('manual check-in works after the window closes and is recorded as manual', function () {
    $service = Service::factory()->finished()->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->admin)
        ->postJson(route('admin.scanner.manual', $service), ['user_id' => $this->member->id])
        ->assertJsonPath('status', 'present');

    expect(Attendance::first()->method)->toBe('manual');
});

test('manual check-in follows the same member rules', function (string $status, string $expected) {
    $this->member->update(['status' => $status]);

    $this->actingAs($this->admin)
        ->postJson(route('admin.scanner.manual', $this->service), ['user_id' => $this->member->id])
        ->assertJsonPath('status', $expected);

    expect(Attendance::count())->toBe(0);
})->with([['suspended', 'suspended'], ['pending', 'invalid']]);

test('manual check-in can not reach another department', function () {
    $this->actingAs($this->admin)
        ->postJson(route('admin.scanner.manual', $this->service), ['user_id' => $this->outsider->id])
        ->assertJsonPath('status', 'invalid');
});

test('manual search stays inside the department', function () {
    $this->actingAs($this->admin)
        ->getJson(route('admin.scanner.search', [$this->service, 'q' => $this->member->full_name]))
        ->assertJsonCount(1)
        ->assertJsonMissingPath('0.qr_token');

    $this->actingAs($this->admin)
        ->getJson(route('admin.scanner.search', [$this->service, 'q' => $this->outsider->full_name]))
        ->assertJsonCount(0);
});

test('a department admin can not use another department service', function () {
    $service = Service::factory()->create(['department_id' => $this->choir->id]);

    $this->actingAs($this->admin)->get(route('admin.scanner.show', $service))->assertNotFound();
    scan($this, $this->outsider->qr_token, $service)->assertNotFound();
    $this->actingAs($this->admin)->post(route('admin.services.close', $service))->assertNotFound();
    $this->actingAs($this->admin)
        ->patch(route('admin.services.update', $service), ['title' => 'x', 'date' => '2026-11-01', 'opens_at' => '09:00', 'closes_at' => '10:00'])
        ->assertNotFound();
});

test('members can not use the scanner', function () {
    $this->actingAs($this->member)
        ->postJson(route('admin.scanner.check-in', $this->service), ['token' => $this->member->qr_token])
        ->assertForbidden();

    expect(Attendance::count())->toBe(0);
});

test('the scanner opens the only live service directly', function () {
    $this->actingAs($this->admin)->get('/admin/scanner')
        ->assertRedirect(route('admin.scanner.show', $this->service, absolute: false));
});

test('recurring sunday and wednesday services are generated once for active departments only', function () {
    Carbon::setTestNow('2026-11-01 09:00:00');
    Service::query()->delete();

    ServiceGenerator::generate();
    ServiceGenerator::generate();

    expect(Service::where('department_id', $this->technical->id)->where('type', 'sunday')->count())->toBe(3)
        ->and(Service::where('type', 'wednesday')->count())->toBe(2)
        ->and(Service::where('department_id', $this->choir->id)->count())->toBe(0);

    $sunday = Service::firstWhere('type', 'sunday');

    expect($sunday->date->toDateString())->toBe('2026-11-01')
        ->and($sunday->title)->toBe('Sunday Service')
        ->and($sunday->opens_at->format('H:i'))->toBe('07:00');

    Carbon::setTestNow();
});

test('generating does not undo an edited window', function () {
    $from = CarbonImmutable::parse('2026-11-01');

    ServiceGenerator::generate($from, $from);

    $service = Service::where('type', 'sunday')->whereDate('date', $from)->first();
    $service->update(['opens_at' => '2026-11-01 06:00:00']);

    ServiceGenerator::generate($from, $from);

    expect($service->fresh()->opens_at->format('H:i'))->toBe('06:00');
});

test('a special service can be created with a valid window', function () {
    $this->actingAs($this->admin)->post(route('admin.services.store'), [
        'title' => 'Vigil', 'date' => '2026-11-06', 'opens_at' => '21:00', 'closes_at' => '23:30',
    ])->assertSessionHasNoErrors();

    $service = Service::firstWhere('title', 'Vigil');

    expect($service->type)->toBe('special')
        ->and($service->department_id)->toBe($this->technical->id);

    $this->actingAs($this->admin)->post(route('admin.services.store'), [
        'title' => 'Bad', 'date' => '2026-11-06', 'opens_at' => '23:00', 'closes_at' => '21:00',
    ])->assertSessionHasErrors('closes_at');
});

test('only an unused special service can be deleted', function () {
    $special = Service::factory()->create(['department_id' => $this->technical->id, 'type' => 'special']);

    $this->actingAs($this->admin)->delete(route('admin.services.destroy', $this->service))->assertStatus(422);
    $this->actingAs($this->admin)->delete(route('admin.services.destroy', $special))->assertRedirect();

    expect(Service::find($special->id))->toBeNull();
});

function heldService(object $test, int $daysAgo, array $present): Service
{
    $service = Service::factory()->finished($daysAgo)->create(['department_id' => $test->technical->id]);

    foreach ($present as $user) {
        Attendance::create(['service_id' => $service->id, 'user_id' => $user->id, 'method' => 'qr', 'checked_in_at' => $service->opens_at]);
    }

    return $service;
}

test('a service nobody attended does not count against anyone', function () {
    $this->member->forceFill(['created_at' => now()->subDays(30)])->save();
    $this->admin->forceFill(['created_at' => now()->subDays(30)])->save();

    heldService($this, 14, [$this->member]);
    heldService($this, 7, [$this->admin]);
    Service::factory()->finished(3)->create(['department_id' => $this->technical->id]);

    $this->actingAs($this->member)->get('/attendance')->assertInertia(fn (Assert $page) => $page
        ->where('overall.attended', 1)
        ->where('overall.total', 2)
        ->where('overall.rate', 50));
});

test('a member is not measured against services before they joined', function () {
    $this->member->forceFill(['created_at' => now()->subDays(5)])->save();

    heldService($this, 30, [$this->admin]);
    heldService($this, 3, [$this->member]);

    $this->actingAs($this->member)->get('/attendance')
        ->assertInertia(fn (Assert $page) => $page->where('overall.total', 1)->where('overall.rate', 100));
});

test('the dashboard raises an alert after three missed services in a row', function () {
    $this->member->forceFill(['created_at' => now()->subDays(60)])->save();

    heldService($this, 35, [$this->member, $this->admin]);
    heldService($this, 21, [$this->admin]);
    heldService($this, 14, [$this->admin]);
    heldService($this, 7, [$this->admin]);

    $this->actingAs($this->admin)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->has('absentees', 1)
        ->where('absentees.0.id', $this->member->id)
        ->where('absentees.0.missed', 3));
});

test('reports show the rate, groups and filters', function () {
    $this->member->forceFill(['created_at' => now()->subDays(60), 'unit' => 'Sound'])->save();
    $this->admin->forceFill(['created_at' => now()->subDays(60), 'unit' => 'Media'])->save();

    heldService($this, 14, [$this->member, $this->admin]);
    heldService($this, 7, [$this->member]);

    $this->actingAs($this->admin)->get('/admin/reports')->assertInertia(fn (Assert $page) => $page
        ->where('summary.services', 2)
        ->where('summary.rate', 75)
        ->where('summary.regular', 1)
        ->has('trend', 2));

    $this->actingAs($this->admin)->get(route('admin.reports', ['unit' => 'Sound']))
        ->assertInertia(fn (Assert $page) => $page->has('members', 1)->where('summary.rate', 100));

    $this->actingAs($this->admin)->get(route('admin.reports', ['type' => 'wednesday']))
        ->assertInertia(fn (Assert $page) => $page->where('summary.services', 0));
});

test('reports stay inside the department', function () {
    $this->actingAs($this->admin)->get('/admin/reports')
        ->assertInertia(fn (Assert $page) => $page->has('members', 2));
});

test('the excel export holds the report rows', function () {
    heldService($this, 3, [$this->member]);

    $response = $this->actingAs($this->admin)->get(route('admin.reports.export', 'xlsx'))->assertOk();

    $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();

    expect($sheet->getCell('A1')->getValue())->toBe('Member ID')
        ->and($sheet->getHighestRow())->toBe(3);
});

test('the pdf export is a real pdf', function () {
    heldService($this, 3, [$this->member]);

    $response = $this->actingAs($this->admin)->get(route('admin.reports.export', 'pdf'))->assertOk();

    expect($response->headers->get('Content-Type'))->toBe('application/pdf')
        ->and(substr($response->getContent(), 0, 4))->toBe('%PDF');
});

test('an unknown export format is not found', function () {
    $this->actingAs($this->admin)->get(route('admin.reports.export', 'csv'))->assertNotFound();
});

test('members only see their own attendance', function () {
    heldService($this, 3, [$this->admin]);

    $this->actingAs($this->member)->get('/attendance')->assertInertia(fn (Assert $page) => $page
        ->where('overall.attended', 0));
});

test('a past service reopened by an admin is not shown as the next service', function () {
    Service::query()->delete();

    $past = Service::factory()->finished(3)->create(['department_id' => $this->technical->id]);
    $past->open();

    $next = Service::factory()->create([
        'department_id' => $this->technical->id,
        'title' => 'Coming up',
        'date' => today()->addDay(),
        'opens_at' => now()->addDay(),
        'closes_at' => now()->addDay()->addHour(),
    ]);

    $this->actingAs($this->member)->get('/home')
        ->assertInertia(fn (Assert $page) => $page->where('nextService.title', $next->title));
});

test('the member home shows this month and the next service', function () {
    $this->actingAs($this->member)->get('/home')->assertInertia(fn (Assert $page) => $page
        ->component('Member/Home')
        ->where('nextService.title', 'Sunday Service'));
});
