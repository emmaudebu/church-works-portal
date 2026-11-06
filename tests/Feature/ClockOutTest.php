<?php

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Support\ServiceGenerator;
use App\Support\Settings;
use Carbon\CarbonImmutable;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Carbon::setTestNow('2026-11-08 12:30:00');

    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $this->member->forceFill(['created_at' => '2026-10-01'])->save();
    $this->outsider = User::factory()->create(['department_id' => $this->choir->id])->assignRole('member');

    $this->service = Service::factory()->create([
        'department_id' => $this->technical->id,
        'date' => '2026-11-08',
        'opens_at' => '2026-11-08 07:00',
        'closes_at' => '2026-11-08 11:00',
        'ends_at' => '2026-11-08 12:00',
    ]);
});

afterEach(fn () => Carbon::setTestNow());

function checkedIn(object $test, string $at = '2026-11-08 07:30', ?User $member = null): Attendance
{
    return Attendance::create([
        'service_id' => $test->service->id,
        'user_id' => ($member ?? $test->member)->id,
        'method' => 'qr',
        'checked_in_at' => $at,
        'recorded_by' => $test->admin->id,
    ]);
}

function scanOut(object $test, string $token)
{
    return $test->actingAs($test->admin)->postJson(route('admin.scanner.check-out', $test->service), ['token' => $token]);
}

test('a member is scanned out at the exit once, with the time they served', function () {
    $attendance = checkedIn($this);

    scanOut($this, $this->member->qr_token)
        ->assertOk()
        ->assertJsonPath('status', 'out')
        ->assertJsonPath('checked_out_at', '12:30 PM')
        ->assertJsonPath('served', '5h 0m')
        ->assertJsonPath('out_count', 1)
        ->assertJsonPath('recent_out.0.full_name', $this->member->full_name);

    expect($attendance->fresh()->checked_out_by)->toBe($this->admin->id);

    Carbon::setTestNow('2026-11-08 12:45:00');

    scanOut($this, $this->member->qr_token)
        ->assertJsonPath('status', 'already_out')
        ->assertJsonPath('checked_out_at', '12:30 PM');
});

test('scanning out only works from the end of the service until clock-out closes', function () {
    checkedIn($this);

    Carbon::setTestNow('2026-11-08 11:59:00');
    scanOut($this, $this->member->qr_token)->assertJsonPath('status', 'not_ended');

    Carbon::setTestNow('2026-11-08 15:01:00');
    scanOut($this, $this->member->qr_token)->assertJsonPath('status', 'out_closed');

    expect(Attendance::first()->checked_out_at)->toBeNull();

    $this->actingAs($this->admin)
        ->postJson(route('admin.scanner.manual-out', $this->service), ['user_id' => $this->member->id])
        ->assertJsonPath('status', 'out');
});

test('nobody can be clocked out without checking in or from another department', function () {
    scanOut($this, $this->member->qr_token)->assertJsonPath('status', 'not_checked_in');
    scanOut($this, $this->outsider->qr_token)->assertJsonPath('status', 'invalid');
    scanOut($this, 'not-a-token')->assertJsonPath('status', 'invalid');

    $this->actingAs($this->member)->postJson(route('admin.scanner.check-out', $this->service), ['token' => $this->member->qr_token])
        ->assertForbidden();
});

test('a service without its own end time ends when check-in closes', function () {
    $this->service->update(['ends_at' => null]);

    expect($this->service->fresh()->endsAt()->format('H:i'))->toBe('11:00')
        ->and($this->service->fresh()->acceptsCheckOuts())->toBeTrue();
});

test('the log shows who clocked out, how long they served, and who never did', function () {
    $other = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    checkedIn($this);
    checkedIn($this, '2026-11-08 08:00', $other);
    scanOut($this, $this->member->qr_token);

    $log = fn () => $this->actingAs($this->admin)->get(route('admin.attendance-log', ['service' => $this->service->id]));

    $log()->assertInertia(fn (Assert $page) => $page
        ->where('entries.0.clock_out', 'out')
        ->where('entries.0.served', '5h 0m')
        ->where('entries.1.clock_out', 'pending'));

    Carbon::setTestNow('2026-11-08 18:00:00');

    $log()->assertInertia(fn (Assert $page) => $page
        ->where('service.used_clock_out', true)
        ->where('entries.1.clock_out', 'missing')
        ->where('canFix', true));
});

test('people at a service where nobody was scanned out are not flagged', function () {
    checkedIn($this);
    Carbon::setTestNow('2026-11-08 18:00:00');

    $this->actingAs($this->admin)->get(route('admin.attendance-log', ['service' => $this->service->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('service.used_clock_out', false)
            ->where('entries.0.clock_out', 'unrecorded'));
});

test('an admin can fill in a missed clock-out, but not before they checked in', function () {
    $attendance = checkedIn($this);
    Carbon::setTestNow('2026-11-08 18:00:00');

    $this->actingAs($this->admin)->patch(route('admin.attendance.check-out', $attendance), ['time' => '07:00'])
        ->assertSessionHasErrors('time');

    $this->actingAs($this->admin)->patch(route('admin.attendance.check-out', $attendance), ['time' => '12:15'])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($attendance->fresh()->checked_out_at->format('H:i'))->toBe('12:15')
        ->and($attendance->fresh()->minutesServed())->toBe(285);

    $this->actingAs($this->admin)->patch(route('admin.attendance.check-out', $attendance), ['time' => '13:00'])
        ->assertSessionHasErrors('time');

    $this->actingAs($this->member)->patch(route('admin.attendance.check-out', $attendance), ['time' => '13:00'])
        ->assertForbidden();
});

test('members see when they checked in and out of each service', function () {
    checkedIn($this);
    scanOut($this, $this->member->qr_token);

    $this->actingAs($this->member)->get(route('member.attendance', ['month' => '2026-11']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('days.0.time_in', '7:30 AM')
            ->where('days.0.time_out', '12:30 PM')
            ->where('days.0.served', '5h 0m'));
});

test('reports show the average time served and missed clock-outs', function () {
    $other = User::factory()->create(['department_id' => $this->technical->id])->assignRole('member');
    $other->forceFill(['created_at' => '2026-10-01'])->save();
    checkedIn($this);
    checkedIn($this, '2026-11-08 08:00', $other);
    scanOut($this, $this->member->qr_token);
    Carbon::setTestNow('2026-11-08 18:00:00');

    $this->actingAs($this->admin)->get(route('admin.reports', ['from' => '2026-11-01', 'to' => '2026-11-08']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.average_served', '5h 0m')
            ->where('summary.no_clock_out', 1));
});

test('services get their end time from the form or from the recurring settings', function () {
    Settings::set('services', [['key' => 'sunday', 'title' => 'Sunday Service', 'day' => 0, 'opens' => '07:00', 'closes' => '10:00', 'ends' => '12:30']]);
    ServiceGenerator::generate(CarbonImmutable::parse('2026-11-15'), CarbonImmutable::parse('2026-11-15'));

    $this->actingAs($this->admin)->post(route('admin.services.store'), [
        'title' => 'Vigil', 'date' => '2026-11-13', 'opens_at' => '21:00', 'closes_at' => '22:00', 'ends_at' => '23:30',
    ])->assertSessionHasNoErrors();

    expect(Service::firstWhere('title', 'Vigil')->ends_at->format('H:i'))->toBe('23:30');

    expect(Service::where('date', '2026-11-15')->where('department_id', $this->technical->id)->first()->ends_at->format('H:i'))->toBe('12:30');
});
