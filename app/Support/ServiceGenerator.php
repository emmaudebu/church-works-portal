<?php

namespace App\Support;

use App\Models\Department;
use App\Models\Service;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;

class ServiceGenerator
{
    private const WEEKDAYS = ['sunday' => 0, 'wednesday' => 3];

    /**
     * Create the recurring services for every active department. Safe to run
     * repeatedly because a service that already exists is left alone.
     */
    public static function generate(?CarbonImmutable $from = null, ?CarbonImmutable $to = null): void
    {
        $from ??= CarbonImmutable::today();
        $to ??= $from->addDays(config('covenant.services.days_ahead'));

        $departments = Department::where('status', 'active')->pluck('id');

        foreach ($departments as $departmentId) {
            foreach (CarbonPeriod::create($from, $to) as $day) {
                foreach (config('covenant.services.recurring') as $type => $times) {
                    if ($day->dayOfWeek !== self::WEEKDAYS[$type]) {
                        continue;
                    }

                    Service::firstOrCreate(
                        ['department_id' => $departmentId, 'type' => $type, 'date' => $day->toDateString()],
                        [
                            'title' => ucfirst($type).' Service',
                            'opens_at' => $day->copy()->setTimeFromTimeString($times['opens']),
                            'closes_at' => $day->copy()->setTimeFromTimeString($times['closes']),
                        ],
                    );
                }
            }
        }
    }
}
