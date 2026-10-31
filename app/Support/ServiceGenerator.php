<?php

namespace App\Support;

use App\Models\Department;
use App\Models\Service;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;

class ServiceGenerator
{
    /**
     * Create the recurring services for every active department. Safe to run
     * repeatedly because a service that already exists is left alone.
     */
    public static function generate(?CarbonImmutable $from = null, ?CarbonImmutable $to = null): void
    {
        $from ??= CarbonImmutable::today();
        $to ??= $from->addDays(config('covenant.services.days_ahead'));

        $departments = Department::where('status', 'active')->pluck('id');
        $recurring = Settings::services();

        foreach ($departments as $departmentId) {
            foreach (CarbonPeriod::create($from, $to) as $day) {
                foreach ($recurring as $service) {
                    if ($day->dayOfWeek !== $service['day']) {
                        continue;
                    }

                    Service::firstOrCreate(
                        ['department_id' => $departmentId, 'recurring_key' => $service['key'], 'date' => $day->toDateString()],
                        [
                            'type' => match ($service['day']) {
                                0 => 'sunday',
                                3 => 'wednesday',
                                default => 'special',
                            },
                            'title' => $service['title'],
                            'opens_at' => $day->copy()->setTimeFromTimeString($service['opens']),
                            'closes_at' => $day->copy()->setTimeFromTimeString($service['closes']),
                        ],
                    );
                }
            }
        }
    }
}
