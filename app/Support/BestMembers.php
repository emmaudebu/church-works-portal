<?php

namespace App\Support;

use App\Models\Attendance;
use App\Models\BestMember;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Chooses each department's best member of a finished month. The result is kept,
 * so changing the criteria later doesn't quietly rewrite who won.
 */
class BestMembers
{
    public static function lastMonth(): string
    {
        return now()->subMonthNoOverflow()->format('Y-m');
    }

    /**
     * The best members of last month, choosing any not chosen yet.
     *
     * @param  Collection<int, int>  $departmentIds
     * @return Collection<int, BestMember>
     */
    public static function forDepartments(Collection $departmentIds): Collection
    {
        if (! Settings::bestMember()['enabled']) {
            return collect();
        }

        return $departmentIds
            ->map(fn (int $departmentId) => self::award($departmentId, self::lastMonth()))
            ->filter()
            ->values();
    }

    /**
     * The winner of a month, or nobody if no member met the criteria. A month
     * with no winner is checked again, so a late attendance fix still counts.
     */
    public static function award(int $departmentId, string $period): ?BestMember
    {
        $existing = BestMember::with(['user', 'department'])
            ->where(['department_id' => $departmentId, 'period' => $period])
            ->first();

        if ($existing) {
            return $existing;
        }

        $winner = self::standings($departmentId, $period, Settings::bestMember())->first();

        if (! $winner) {
            return null;
        }

        return BestMember::createOrFirst(
            ['department_id' => $departmentId, 'period' => $period],
            collect($winner)->except(['arrival', 'full_name'])->all(),
        )->load(['user', 'department']);
    }

    /**
     * Choose last month's winners again with the current criteria.
     */
    public static function recalculate(): void
    {
        $period = self::lastMonth();

        BestMember::where('period', $period)->delete();

        Department::pluck('id')->each(fn (int $departmentId) => self::award($departmentId, $period));
    }

    /**
     * Everyone who met the criteria for a month, best first. A day counts once,
     * and a day marked by hand has no real clock-in time, so it counts towards
     * attendance but not punctuality.
     *
     * @param  array<string, mixed>  $criteria
     * @return Collection<int, array<string, mixed>>
     */
    public static function standings(int $departmentId, string $period, array $criteria): Collection
    {
        $start = Carbon::parse("{$period}-01");

        $held = AttendanceStats::held(collect([$departmentId]), $start, $start->copy()->endOfMonth());

        if ($held->isEmpty()) {
            return collect();
        }

        $members = User::where('department_id', $departmentId)
            ->where('status', 'active')
            ->with('roles:id,name')
            ->get()
            ->reject(fn (User $member) => $member->hasRole('super_admin') || (! $criteria['include_officers'] && $member->isOfficer()))
            ->values();

        $services = $held->keyBy('id');

        $scans = Attendance::whereIn('service_id', $held->pluck('id'))
            ->whereIn('user_id', $members->pluck('id'))
            ->where('method', '!=', 'manual')
            ->get(['service_id', 'user_id', 'checked_in_at'])
            ->groupBy('user_id');

        return AttendanceStats::rates($members, $held)
            ->map(function (array $rate, int $userId) use ($scans, $services, $criteria, $members, $departmentId, $period) {
                $arrivals = $scans->get($userId, collect())
                    ->groupBy(fn (Attendance $scan) => $services[$scan->service_id]->date->toDateString())
                    ->map(fn (Collection $day) => $day->min(
                        fn (Attendance $scan) => $services[$scan->service_id]->opens_at->diffInMinutes($scan->checked_in_at),
                    ));

                $onTime = $arrivals->filter(fn (float $minutes) => $minutes <= $criteria['on_time_minutes'])->count();

                $attendance = $rate['total'] ? $rate['attended'] / $rate['total'] * 100 : 0;
                $punctuality = $arrivals->isEmpty() ? 0 : $onTime / $arrivals->count() * 100;
                $weight = $criteria['attendance_weight'] / 100;

                return [
                    'department_id' => $departmentId,
                    'user_id' => $userId,
                    'period' => $period,
                    'full_name' => $members->firstWhere('id', $userId)->full_name,
                    'score' => round($attendance * $weight + $punctuality * (1 - $weight), 1),
                    'attendance_rate' => (int) round($attendance),
                    'punctuality' => (int) round($punctuality),
                    'days_attended' => $rate['attended'],
                    'days_held' => $rate['total'],
                    'arrival' => $arrivals->avg() ?? PHP_INT_MAX,
                ];
            })
            ->filter(fn (array $row) => $row['days_attended'] >= $criteria['minimum_days']
                && $row['attendance_rate'] >= $criteria['minimum_attendance'])
            ->sortBy([['score', 'desc'], ['attendance_rate', 'desc'], ['arrival', 'asc'], ['full_name', 'asc']])
            ->values();
    }
}
