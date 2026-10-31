<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Support\ServiceGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([RoleSeeder::class, DepartmentSeeder::class]);

        $password = config('covenant.super_admin.password');

        if (app()->isProduction() && blank($password)) {
            throw new RuntimeException('Set SUPER_ADMIN_PASSWORD before seeding production.');
        }

        User::firstOrCreate(
            ['email' => config('covenant.super_admin.email')],
            ['full_name' => 'Super Admin', 'status' => 'active', 'password' => $password ?: 'password'],
        )->assignRole('super_admin');

        if (app()->isProduction()) {
            return;
        }

        $technicalUnit = Department::firstWhere('slug', 'technical-unit');

        User::updateOrCreate(
            ['email' => 'deptadmin@covenantworkforce.test'],
            ['department_id' => $technicalUnit->id, 'full_name' => 'Grace Department', 'phone' => '+2348000000001', 'status' => 'active', 'password' => 'password'],
        )->assignRole('dept_admin');

        User::updateOrCreate(
            ['email' => 'member@covenantworkforce.test'],
            ['department_id' => $technicalUnit->id, 'full_name' => 'Daniel Member', 'phone' => '+2348000000002', 'status' => 'active', 'password' => 'password'],
        )->assignRole('member');

        User::whereNull('member_id')->withoutRole('super_admin')->get()
            ->each(fn (User $user) => $user->update(['member_id' => User::nextMemberId($user)]));

        if (User::where('department_id', $technicalUnit->id)->count() < 10) {
            $this->seedSampleMembers($technicalUnit);
        }

        if (Attendance::doesntExist()) {
            $this->seedSampleAttendance($technicalUnit);
        }
    }

    /**
     * Twelve weeks of history, with each member keeping their own habit so the
     * reports show regulars and absentees.
     */
    private function seedSampleAttendance(Department $department): void
    {
        ServiceGenerator::generate(CarbonImmutable::today()->subWeeks(12), CarbonImmutable::today()->subDay());

        $members = User::where('department_id', $department->id)->where('status', 'active')->get();

        $members->toQuery()->update(['created_at' => now()->subWeeks(13)]);

        $habits = $members->mapWithKeys(fn (User $member) => [$member->id => fake()->randomElement([30, 60, 80, 90, 95])]);

        Service::where('department_id', $department->id)
            ->where('closes_at', '<', now())
            ->each(function (Service $service) use ($members, $habits) {
                foreach ($members as $member) {
                    if (fake()->numberBetween(1, 100) <= $habits[$member->id]) {
                        Attendance::create([
                            'service_id' => $service->id,
                            'user_id' => $member->id,
                            'method' => 'qr',
                            'checked_in_at' => $service->opens_at->addMinutes(fake()->numberBetween(5, 90)),
                        ]);
                    }
                }
            });
    }

    private function seedSampleMembers(Department $department): void
    {
        $states = [...array_fill(0, 10, 'active'), 'pending', 'pending', 'pending', 'suspended'];

        foreach ($states as $status) {
            $member = User::factory()->create([
                'department_id' => $department->id,
                'status' => $status,
                'suspension_reason' => $status === 'suspended' ? 'Absent without notice' : null,
            ])->assignRole('member');

            $member->update(['member_id' => User::nextMemberId($member)]);

            $member->profile()->create([
                'next_of_kin_name' => fake()->name(),
                'next_of_kin_relationship' => fake()->randomElement(['Spouse', 'Parent', 'Sibling']),
                'next_of_kin_phone' => '+23481'.fake()->numerify('########'),
                'occupation' => fake()->jobTitle(),
                'technical_skills' => fake()->randomElements(['Sound mixing', 'Video editing', 'Camera', 'Live streaming', 'Lighting'], 2),
            ]);

            if ($status === 'suspended') {
                $member->suspensionLogs()->create(['action' => 'suspended', 'reason' => $member->suspension_reason]);
            }
        }
    }
}
