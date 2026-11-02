<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Department;
use App\Models\Election;
use App\Models\Post;
use App\Models\Service;
use App\Models\User;
use App\Models\Vote;
use App\Support\Ballot;
use App\Support\Offices;
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

        $technicalUnit = Department::firstWhere('slug', 'technical-department');

        User::updateOrCreate(
            ['email' => 'deptadmin@covenantworkforce.test'],
            ['department_id' => $technicalUnit->id, 'full_name' => 'Grace Department', 'phone' => '+2348000000001', 'status' => 'active', 'password' => 'password'],
        )->assignRole(Offices::HEAD);

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

        if (Post::doesntExist()) {
            $this->seedSamplePosts($technicalUnit);
        }

        if (Election::doesntExist()) {
            $this->seedSampleElections($technicalUnit);
        }
    }

    /**
     * One election open for voting and one finished with published results.
     */
    private function seedSampleElections(Department $department): void
    {
        $members = User::where('department_id', $department->id)->where('status', 'active')->get();

        foreach ([
            ['Unit Leadership Election', now()->subHour(), now()->addDays(7), false, ['Unit Head', 'Assistant Unit Head'], false],
            ['Welfare Coordinator Election', now()->subMonth(), now()->subWeeks(3), true, ['Welfare Coordinator'], true],
        ] as [$title, $startsAt, $endsAt, $public, $positions, $withVotes]) {
            $election = Election::create([
                'department_id' => $department->id,
                'title' => $title,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'results_public' => $public,
            ]);

            foreach ($positions as $order => $positionTitle) {
                $position = $election->positions()->create(['title' => $positionTitle, 'sort_order' => $order]);

                $candidates = $members->random(3)->map(fn (User $member) => $position->candidates()->create([
                    'user_id' => $member->id,
                    'manifesto' => 'I will serve the unit faithfully and keep everyone informed.',
                ]));

                if ($withVotes) {
                    foreach ($members as $member) {
                        Vote::create([
                            'position_id' => $position->id,
                            'candidate_id' => $candidates->random()->id,
                            'voter_hash' => Ballot::voterHash($member, $position->id),
                        ]);
                    }
                }
            }
        }
    }

    private function seedSamplePosts(Department $department): void
    {
        $author = User::role(Offices::HEAD)->first();

        foreach ([
            ['news', 'New sound desk installed', 'The main auditorium now has a new digital sound desk. Training starts soon.', null, null],
            ['event', 'Technical Department workshop', 'A hands-on workshop for all units. Please bring a notebook.', now()->addDays(9)->setTime(10, 0), 'Main Auditorium'],
            ['event', 'Workforce retreat', 'A day of prayer and fellowship for the whole workforce.', now()->addDays(21)->setTime(9, 0), 'Faith Tabernacle Annex'],
            ['announcement', 'Rehearsal moved to Saturday', 'This week rehearsal holds on Saturday at 4 PM.', null, null],
            ['announcement', 'Update your details', 'Please make sure your next of kin details are current.', null, null],
        ] as [$type, $title, $body, $eventDate, $venue]) {
            Post::create([
                'department_id' => $department->id,
                'type' => $type,
                'title' => $title,
                'body' => "<p>{$body}</p>",
                'event_date' => $eventDate,
                'venue' => $venue,
                'published_at' => now()->subDay(),
                'author_id' => $author?->id,
            ]);
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
