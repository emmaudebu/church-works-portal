<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AttendanceExport;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\User;
use App\Support\AttendanceStats;
use App\Support\CurrentDepartment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\Response;

class ReportController extends Controller
{
    private const REGULAR_RATE = 75;

    private const ABSENTEE_RATE = 50;

    /**
     * Display the attendance report.
     */
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('Admin/Reports', [
            ...$this->report($request),
            'units' => User::managedBy($request->user())->whereNotNull('unit')->distinct()->orderBy('unit')->pluck('unit'),
        ]);
    }

    /**
     * Download the report as Excel or PDF.
     */
    public function export(Request $request, string $format): Response
    {
        abort_unless(in_array($format, ['xlsx', 'pdf']), 404);

        $report = $this->report($request);
        $fileName = 'attendance-'.$report['filters']['from'].'-to-'.$report['filters']['to'];

        if ($format === 'xlsx') {
            return Excel::download(new AttendanceExport(collect($report['members'])), "{$fileName}.xlsx");
        }

        return Pdf::loadView('reports.attendance', $report)->setPaper('a4')->download("{$fileName}.pdf");
    }

    /**
     * The average time served across everyone, weighting each member equally.
     *
     * @param  Collection<int, array{no_clock_out: int, average_minutes: int|null}>  $clockOuts
     */
    private function averageServed(Collection $clockOuts): ?int
    {
        $averages = $clockOuts->pluck('average_minutes')->filter(fn (?int $minutes) => $minutes !== null);

        return $averages->isNotEmpty() ? (int) round($averages->avg()) : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function report(Request $request): array
    {
        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'type' => ['nullable', 'in:sunday,wednesday,special'],
            'unit' => ['nullable', 'string', 'max:100'],
        ]);

        $admin = $request->user();
        $from = Carbon::parse($validated['from'] ?? today()->subWeeks(12));
        $to = Carbon::parse($validated['to'] ?? today());

        $members = User::managedBy($admin)
            ->where('status', 'active')
            ->when($validated['unit'] ?? null, fn ($query, $unit) => $query->where('unit', $unit))
            ->orderBy('full_name')
            ->get();

        $departmentId = CurrentDepartment::idFor($admin);
        $departments = $departmentId ? collect([$departmentId]) : Department::pluck('id');

        $held = AttendanceStats::held($departments, $from, $to)
            ->when($validated['type'] ?? null, fn ($services, $type) => $services->where('type', $type))
            ->values();

        $rates = AttendanceStats::rates($members, $held);
        $clockOuts = AttendanceStats::clockOuts($members, $held);

        $rows = $members->map(function (User $member) use ($rates, $clockOuts) {
            $rate = $rates[$member->id];

            return [
                ...$member->only(['id', 'member_id', 'full_name', 'unit']),
                ...$rate,
                'no_clock_out' => $clockOuts[$member->id]['no_clock_out'],
                'average_served' => Attendance::durationLabel($clockOuts[$member->id]['average_minutes']),
                'group' => match (true) {
                    $rate['rate'] === null => 'No services yet',
                    $rate['rate'] >= self::REGULAR_RATE => 'Regular',
                    $rate['rate'] < self::ABSENTEE_RATE => 'Frequent absentee',
                    default => 'Occasional',
                },
            ];
        })->sortBy([['rate', 'desc'], ['full_name', 'asc']])->values();

        $attended = $rows->sum('attended');
        $possible = $rows->sum('total');

        return [
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'type' => $validated['type'] ?? null,
                'unit' => $validated['unit'] ?? null,
            ],
            'summary' => [
                'rate' => $possible ? (int) round($attended / $possible * 100) : null,
                'services' => $held->count(),
                'regular' => $rows->where('group', 'Regular')->count(),
                'absentees' => $rows->where('group', 'Frequent absentee')->count(),
                'no_clock_out' => $rows->sum('no_clock_out'),
                'average_served' => Attendance::durationLabel($this->averageServed($clockOuts)),
            ],
            'trend' => AttendanceStats::trend($held, $members->count()),
            'members' => $rows,
        ];
    }
}
