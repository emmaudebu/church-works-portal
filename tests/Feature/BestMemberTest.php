<?php

use App\Models\Attendance;
use App\Models\BestMember;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Support\BestMembers;
use App\Support\Settings;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Carbon::setTestNow('2026-11-01 10:00:00');

    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->department = Department::firstWhere('slug', 'technical-department');
    $this->superAdmin = User::factory()->create()->assignRole('super_admin');

    // Four October Sundays, with check-in opening at 7:00.
    $this->sundays = collect(['04', '11', '18', '25'])->map(fn (string $day) => Service::factory()->create([
        'department_id' => $this->department->id,
        'date' => "2026-10-{$day}",
        'opens_at' => "2026-10-{$day} 07:00:00",
        'closes_at' => "2026-10-{$day} 13:00:00",
    ]));
});

afterEach(fn () => Carbon::setTestNow());

function teamMember(object $test, string $role = 'member'): User
{
    $member = User::factory()->create(['department_id' => $test->department->id])->assignRole($role);
    $member->forceFill(['created_at' => '2026-01-01'])->save();

    return $member;
}

function clockIn(User $member, Service $service, string $time, string $method = 'qr'): void
{
    Attendance::create([
        'service_id' => $service->id, 'user_id' => $member->id, 'method' => $method,
        'checked_in_at' => $service->date->toDateString().' '.$time, 'recorded_by' => $member->id,
    ]);
}

test('coming every week and on time beats coming every week late', function () {
    $early = teamMember($this);
    $late = teamMember($this);

    foreach ($this->sundays as $sunday) {
        clockIn($early, $sunday, '07:30:00');
        clockIn($late, $sunday, '09:30:00');
    }

    $standings = BestMembers::standings($this->department->id, '2026-10', Settings::bestMember());

    expect($standings->pluck('user_id')->all())->toBe([$early->id, $late->id])
        ->and($standings[0]['score'])->toEqual(100.0)
        ->and($standings[1]['score'])->toEqual(70.0)
        ->and($standings[1]['punctuality'])->toBe(0);
});

test('the weighting can put punctuality ahead of attendance', function () {
    Settings::set('best_member', [...Settings::bestMember(), 'attendance_weight' => 10, 'minimum_attendance' => 0]);

    $faithful = teamMember($this);
    $punctual = teamMember($this);

    foreach ($this->sundays as $index => $sunday) {
        clockIn($faithful, $sunday, '09:30:00');

        if ($index < 2) {
            clockIn($punctual, $sunday, '07:10:00');
        }
    }

    expect(BestMembers::standings($this->department->id, '2026-10', Settings::bestMember())->first()['user_id'])
        ->toBe($punctual->id);
});

test('members below the minimums can not be nominated', function () {
    Settings::set('best_member', [...Settings::bestMember(), 'minimum_days' => 3]);

    $tooFew = teamMember($this);
    clockIn($tooFew, $this->sundays[0], '07:10:00');
    clockIn($tooFew, $this->sundays[1], '07:10:00');

    $regular = teamMember($this);
    $this->sundays->each(fn (Service $sunday) => clockIn($regular, $sunday, '09:30:00'));

    expect(BestMembers::standings($this->department->id, '2026-10', Settings::bestMember())->pluck('user_id')->all())
        ->toBe([$regular->id]);
});

test('a day marked by hand counts as attendance but not as clocking in on time', function () {
    $member = teamMember($this);

    clockIn($member, $this->sundays[0], '07:10:00');
    clockIn($member, $this->sundays[1], '07:10:00');
    clockIn($member, $this->sundays[2], '07:10:00');
    clockIn($member, $this->sundays[3], '12:00:00', 'manual');

    $row = BestMembers::standings($this->department->id, '2026-10', Settings::bestMember())->first();

    expect($row['attendance_rate'])->toBe(100)
        ->and($row['punctuality'])->toBe(100);
});

test('suspended members and, when excluded, executives are left out', function () {
    $head = teamMember($this, 'dept_admin');
    $suspended = teamMember($this);
    $member = teamMember($this);

    foreach ($this->sundays as $sunday) {
        clockIn($head, $sunday, '07:05:00');
        clockIn($suspended, $sunday, '07:05:00');
        clockIn($member, $sunday, '07:30:00');
    }

    $suspended->update(['status' => 'suspended']);

    $standings = fn () => BestMembers::standings($this->department->id, '2026-10', Settings::bestMember())->pluck('user_id');

    expect($standings())->toContain($head->id)->not->toContain($suspended->id);

    Settings::set('best_member', [...Settings::bestMember(), 'include_officers' => false]);

    expect($standings()->all())->toBe([$member->id]);
});

test('a winner is kept when the criteria later change, until recalculated', function () {
    $first = teamMember($this);
    $second = teamMember($this);

    foreach ($this->sundays as $sunday) {
        clockIn($first, $sunday, '07:10:00');
        clockIn($second, $sunday, '07:20:00');
    }

    expect(BestMembers::award($this->department->id, '2026-10')->user_id)->toBe($first->id);

    $this->actingAs($this->superAdmin)->put(route('admin.best-member.update'), [
        ...Settings::bestMember(), 'include_officers' => true, 'attendance_weight' => 50,
    ])->assertSessionHasNoErrors();

    $first->update(['status' => 'suspended']);

    expect(BestMembers::award($this->department->id, '2026-10')->user_id)->toBe($first->id);

    $this->actingAs($this->superAdmin)->post(route('admin.best-member.recalculate'))->assertRedirect();

    expect(BestMember::where('period', '2026-10')->sole()->user_id)->toBe($second->id);
});

test('members see last month\'s best member and only super admins see the criteria', function () {
    $member = teamMember($this);
    $head = teamMember($this, 'dept_admin');
    $this->sundays->each(fn (Service $sunday) => clockIn($member, $sunday, '07:10:00'));

    $this->actingAs($member)->get('/home')->assertInertia(fn (Assert $page) => $page
        ->where('bestMember.user_id', $member->id)
        ->where('bestMember.month', 'October 2026')
        ->where('bestMember.attendance_rate', 100));

    $this->actingAs($head)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->where('bestMembers.0.user_id', $member->id)
        ->where('bestMemberCriteria', null));

    $this->actingAs($this->superAdmin)->get('/admin')->assertInertia(fn (Assert $page) => $page
        ->where('bestMemberCriteria.attendance_weight', 70));

    $this->actingAs($head)->put(route('admin.best-member.update'), Settings::bestMember())->assertForbidden();
    $this->actingAs($head)->post(route('admin.best-member.recalculate'))->assertForbidden();
});

test('visitors see the best member on the department page without their scores', function () {
    $member = teamMember($this);
    $this->sundays->each(fn (Service $sunday) => clockIn($member, $sunday, '07:10:00'));

    $this->get(route('departments.show', 'technical-department'))->assertInertia(fn (Assert $page) => $page
        ->where('bestMember.full_name', $member->full_name)
        ->where('bestMember.month', 'October 2026')
        ->missing('bestMember.score')
        ->missing('bestMember.attendance_rate')
        ->missing('bestMember.punctuality')
        ->missing('bestMember.user_id'));
});

test('a winner who hid themselves or left stays off the public page', function () {
    $member = teamMember($this);
    $this->sundays->each(fn (Service $sunday) => clockIn($member, $sunday, '07:10:00'));

    BestMembers::award($this->department->id, '2026-10');

    $page = fn () => $this->get(route('departments.show', 'technical-department'));

    $member->update(['show_on_site' => false]);
    $page()->assertInertia(fn (Assert $page) => $page->where('bestMember', null));

    $member->update(['show_on_site' => true, 'status' => 'suspended']);
    $page()->assertInertia(fn (Assert $page) => $page->where('bestMember', null));
});

test('nothing is shown when the feature is switched off', function () {
    Settings::set('best_member', [...Settings::bestMember(), 'enabled' => false]);

    $member = teamMember($this);
    $this->sundays->each(fn (Service $sunday) => clockIn($member, $sunday, '07:10:00'));

    $this->actingAs($member)->get('/home')->assertInertia(fn (Assert $page) => $page->where('bestMember', null));

    expect(BestMember::count())->toBe(0);
});

test('criteria must be sensible', function () {
    $this->actingAs($this->superAdmin)->put(route('admin.best-member.update'), [
        ...Settings::bestMember(), 'attendance_weight' => 120, 'minimum_days' => 0,
    ])->assertSessionHasErrors(['attendance_weight', 'minimum_days']);
});
