<?php

namespace App\Http\Controllers\Admin;

use App\Exports\AttendanceLogExport;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Service;
use App\Support\CheckIn;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AttendanceLogController extends Controller
{
    private const SERVICES_LISTED = 60;

    /**
     * Display who clocked in to a service and when. Without a chosen service
     * it shows the most recent one anybody clocked in to.
     */
    public function index(Request $request): Response
    {
        $admin = $request->user();

        $services = Service::managedBy($admin)
            ->with('department:id,name')
            ->withCount('attendance')
            ->where('opens_at', '<=', now())
            ->orderByDesc('date')
            ->orderByDesc('opens_at')
            ->limit(self::SERVICES_LISTED)
            ->get();

        $service = $request->filled('service')
            ? Service::managedBy($admin)->with('department:id,name')->findOrFail($request->integer('service'))
            : $services->firstWhere('attendance_count', '>', 0) ?? $services->first();

        return Inertia::render('Admin/AttendanceLog', [
            'services' => $services->map(fn (Service $item) => [
                'id' => $item->id,
                'label' => "{$item->title} · {$item->date->format('D j M Y')}",
                'attendance_count' => $item->attendance_count,
            ]),
            'service' => $service ? [
                'id' => $service->id,
                'title' => $service->title,
                'date_label' => $service->date->format('l j F Y'),
                'window' => $service->opens_at->format('g:i A').' to '.$service->closes_at->format('g:i A'),
                'clock_out_window' => $service->endsAt()->format('g:i A').' to '.$service->clockOutClosesAt()->format('g:i A'),
                'used_clock_out' => $this->usedClockOut($service),
                'ended' => $service->hasEnded(),
                'department' => $service->department->name,
            ] : null,
            'entries' => $service ? $this->entries($service) : [],
            'canFix' => $admin->canDo('take_attendance'),
        ]);
    }

    /**
     * Fill in when someone left, for a person who was never scanned out.
     */
    public function checkOut(Request $request, Attendance $attendance): RedirectResponse
    {
        $service = $attendance->service;

        abort_unless($service && $request->user()->canAccessDepartment($service->department_id), 404);

        $validated = $request->validate(['time' => ['required', 'date_format:H:i']]);

        $at = Carbon::parse($service->date->toDateString().' '.$validated['time']);

        if ($at->lte($attendance->checked_in_at)) {
            throw ValidationException::withMessages(['time' => 'The clock-out time must be after they checked in at '.$attendance->checked_in_at->format('g:i A').'.']);
        }

        $result = CheckIn::manualOut($service, $attendance->user, $request->user(), $at);

        if ($result['status'] !== 'out') {
            throw ValidationException::withMessages(['time' => match ($result['status']) {
                'already_out' => 'They have already clocked out.',
                'not_ended' => 'This service has not ended yet.',
                default => 'This clock-out could not be recorded.',
            }]);
        }

        return back()->with('success', "Clock-out recorded for {$attendance->user->full_name}.");
    }

    /**
     * Download the attendance log of a service as Excel.
     */
    public function export(Request $request, Service $service): BinaryFileResponse
    {
        abort_unless($request->user()->canAccessDepartment($service->department_id), 404);

        $fileName = 'attendance-log-'.Str::slug($service->title).'-'.$service->date->toDateString().'.xlsx';

        return Excel::download(new AttendanceLogExport($this->entries($service)), $fileName);
    }

    /**
     * Whether anybody was scanned out of this service, so missing clock-outs
     * mean something.
     */
    private function usedClockOut(Service $service): bool
    {
        return $service->attendance()->whereNotNull('checked_out_at')->exists();
    }

    /**
     * Everyone who clocked in, earliest first, with when they left.
     *
     * @return list<array{position: int, attendance_id: int, id: int, full_name: string, member_id: string|null, unit: string|null, phone: string|null, photo_url: string|null, time: string, method: string, recorded_by: string|null, out_time: string|null, served: string|null, clock_out: string}>
     */
    private function entries(Service $service): array
    {
        $usedClockOut = $this->usedClockOut($service);

        return $service->attendance()
            ->with(['user', 'recorder:id,full_name'])
            ->orderBy('checked_in_at')
            ->get()
            ->filter(fn (Attendance $attendance) => $attendance->user !== null)
            ->values()
            ->map(fn (Attendance $attendance, int $index) => [
                'position' => $index + 1,
                'attendance_id' => $attendance->id,
                'id' => $attendance->user->id,
                'full_name' => $attendance->user->full_name,
                'member_id' => $attendance->user->member_id,
                'unit' => $attendance->user->unit,
                'phone' => $attendance->user->phone,
                'photo_url' => $attendance->user->photoUrl(),
                'time' => $attendance->checked_in_at->format('g:i:s A'),
                'method' => $attendance->method === 'manual' ? 'Manual' : 'QR scan',
                'recorded_by' => $attendance->recorder?->full_name,
                'out_time' => $attendance->checked_out_at?->format('g:i:s A'),
                'served' => Attendance::durationLabel($attendance->minutesServed()),
                'clock_out' => $attendance->clockOutStatus($service, $usedClockOut),
            ])
            ->all();
    }
}
