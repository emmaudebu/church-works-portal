<?php

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RoleSeeder;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    $this->seed([RoleSeeder::class, DepartmentSeeder::class]);

    $this->technical = Department::firstWhere('slug', 'technical-department');
    $this->choir = Department::firstWhere('slug', 'choir');

    $this->admin = User::factory()->create(['department_id' => $this->technical->id])->assignRole('dept_admin');
    $this->member = User::factory()->create(['department_id' => $this->technical->id, 'full_name' => 'Ada Late'])->assignRole('member');
    $this->early = User::factory()->create(['department_id' => $this->technical->id, 'full_name' => 'Bola Early'])->assignRole('member');

    $this->service = Service::factory()->finished(3)->create(['department_id' => $this->technical->id]);
});

function logClockIn(Service $service, User $member, string $time, string $method = 'qr', ?User $recorder = null): void
{
    Attendance::create([
        'service_id' => $service->id,
        'user_id' => $member->id,
        'method' => $method,
        'checked_in_at' => $service->date->setTimeFromTimeString($time),
        'recorded_by' => $recorder?->id,
    ]);
}

test('the log lists who clocked in to a service, earliest first, with the time', function () {
    logClockIn($this->service, $this->member, '09:15:30', 'manual', $this->admin);
    logClockIn($this->service, $this->early, '08:02:05');

    $this->actingAs($this->admin)->get(route('admin.attendance-log', ['service' => $this->service->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/AttendanceLog')
            ->where('service.id', $this->service->id)
            ->has('entries', 2)
            ->where('entries.0.full_name', 'Bola Early')
            ->where('entries.0.time', '8:02:05 AM')
            ->where('entries.0.method', 'QR scan')
            ->where('entries.1.full_name', 'Ada Late')
            ->where('entries.1.position', 2)
            ->where('entries.1.method', 'Manual')
            ->where('entries.1.recorded_by', $this->admin->full_name));
});

test('without a chosen service the log opens the latest one anybody clocked in to', function () {
    $latest = Service::factory()->finished(1)->create(['department_id' => $this->technical->id]);
    logClockIn($latest, $this->member, '09:00:00');
    logClockIn($this->service, $this->member, '09:00:00');
    Service::factory()->finished(0)->create(['department_id' => $this->technical->id]);
    $future = Service::factory()->create(['department_id' => $this->technical->id, 'date' => today()->addDays(3), 'opens_at' => now()->addDays(3)]);

    $this->actingAs($this->admin)->get(route('admin.attendance-log'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('service.id', $latest->id)
            ->where('services', fn ($services) => ! collect($services)->contains('id', $future->id)));
});

test('an admin can not see the log of another department service', function () {
    $choirService = Service::factory()->finished(1)->create(['department_id' => $this->choir->id]);

    $this->actingAs($this->admin)->get(route('admin.attendance-log', ['service' => $choirService->id]))->assertNotFound();
    $this->actingAs($this->admin)->get(route('admin.attendance-log.export', $choirService))->assertNotFound();
});

test('a member without the reports office can not open the log', function () {
    $this->actingAs($this->member)->get(route('admin.attendance-log'))->assertForbidden();
    $this->actingAs($this->member)->get(route('admin.attendance-log.export', $this->service))->assertForbidden();
});

test('the log downloads as excel with one row per member', function () {
    logClockIn($this->service, $this->early, '08:02:05');
    logClockIn($this->service, $this->member, '09:15:30');

    $response = $this->actingAs($this->admin)->get(route('admin.attendance-log.export', $this->service))->assertOk();

    $sheet = IOFactory::load($response->baseResponse->getFile()->getPathname())->getActiveSheet();

    expect($sheet->getCell('C1')->getValue())->toBe('Full name')
        ->and($sheet->getCell('C2')->getValue())->toBe('Bola Early')
        ->and($sheet->getCell('F2')->getValue())->toBe('8:02:05 AM')
        ->and($sheet->getHighestRow())->toBe(3);
});
