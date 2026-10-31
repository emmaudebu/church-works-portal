<?php

namespace App\Support;

use App\Models\Attendance;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class AttendanceStats
{
    /**
     * Attendance rates for a set of members. Each person is only measured against
     * services held since they joined.
     *
     * @param  Collection<int, User>  $members
     * @param  Collection<int, Service>  $held
     * @return Collection<int, array{attended: int, total: int, rate: int|null}>
     */
    public static function rates(Collection $members, Collection $held): Collection
    {
        $attended = Attendance::whereIn('service_id', $held->pluck('id'))
            ->whereIn('user_id', $members->pluck('id'))
            ->get(['service_id', 'user_id'])
            ->groupBy('user_id');

        return $members->mapWithKeys(function (User $member) use ($held, $attended) {
            $present = $attended->get($member->id, collect())->pluck('service_id')->flip();

            // A date counts once: being at any service that day is being present.
            $days = $held
                ->filter(fn (Service $service) => $service->department_id === $member->department_id
                    && ($service->date->gte($member->created_at->startOfDay()) || $present->has($service->id)))
                ->groupBy(fn (Service $service) => $service->date->toDateString());

            $total = $days->count();
            $count = $days->filter(fn ($services) => $services->contains(fn (Service $service) => $present->has($service->id)))->count();

            return [$member->id => [
                'attended' => $count,
                'total' => $total,
                'rate' => $total ? (int) round($count / $total * 100) : null,
            ]];
        });
    }

    /**
     * @param  Collection<int, int>  $departmentIds
     * @return Collection<int, Service>
     */
    public static function held(Collection $departmentIds, ?CarbonInterface $from = null, ?CarbonInterface $to = null): Collection
    {
        return Service::held()
            ->whereIn('department_id', $departmentIds)
            ->when($from, fn ($query) => $query->whereDate('date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('date', '<=', $to))
            ->orderBy('date')
            ->get(['id', 'department_id', 'title', 'type', 'date']);
    }

    /**
     * Active members who missed at least the given number of held services in a row.
     *
     * @param  Collection<int, User>  $members
     * @param  Collection<int, Service>  $held
     * @return Collection<int, array<string, mixed>>
     */
    public static function absentees(Collection $members, Collection $held, int $streak = 3): Collection
    {
        $present = Attendance::whereIn('service_id', $held->pluck('id'))
            ->whereIn('user_id', $members->pluck('id'))
            ->get(['service_id', 'user_id'])
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('service_id')->flip());

        return $members->map(function (User $member) use ($held, $present) {
            $missed = 0;

            $days = $held
                ->filter(fn (Service $service) => $service->department_id === $member->department_id
                    && $service->date->gte($member->created_at->startOfDay()))
                ->groupBy(fn (Service $service) => $service->date->toDateString())
                ->sortKeysDesc();

            foreach ($days as $services) {
                if ($services->contains(fn (Service $service) => $present->get($member->id)?->has($service->id))) {
                    break;
                }

                $missed++;
            }

            return ['id' => $member->id, 'full_name' => $member->full_name, 'unit' => $member->unit, 'missed' => $missed];
        })->filter(fn (array $row) => $row['missed'] >= $streak)->sortByDesc('missed')->values();
    }

    /**
     * Percent of the members who were present on each day services were held.
     *
     * @param  Collection<int, Service>  $held
     * @return Collection<int, array<string, mixed>>
     */
    public static function trend(Collection $held, int $memberCount): Collection
    {
        $attendance = Attendance::whereIn('service_id', $held->pluck('id'))
            ->get(['service_id', 'user_id'])
            ->groupBy('service_id');

        return $held->groupBy(fn (Service $service) => $service->date->toDateString())
            ->map(function (Collection $services) use ($attendance, $memberCount) {
                $present = $services
                    ->flatMap(fn (Service $service) => $attendance->get($service->id, collect())->pluck('user_id'))
                    ->unique()
                    ->count();

                $first = $services->first();

                return [
                    'id' => $first->id,
                    'title' => $services->count() > 1 ? $services->count().' services' : $first->title,
                    'date' => $first->date->toDateString(),
                    'label' => $first->date->format('j M'),
                    'present' => $present,
                    'rate' => $memberCount ? min(100, (int) round($present / $memberCount * 100)) : 0,
                ];
            })->values();
    }
}
