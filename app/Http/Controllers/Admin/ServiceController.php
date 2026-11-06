<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Models\Service;
use App\Support\CurrentDepartment;
use App\Support\ServiceGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    /**
     * List services, topping up the recurring ones so no cron job is needed to start.
     */
    public function index(Request $request): Response
    {
        ServiceGenerator::generate();

        $admin = $request->user();
        $isSuperAdmin = $admin->hasRole('super_admin');

        return Inertia::render('Admin/Services', [
            'services' => Service::managedBy($admin)
                ->with('department:id,name')
                ->withCount('attendance')
                ->whereDate('date', '>=', today()->subDays(60))
                ->orderByDesc('date')
                ->orderByDesc('opens_at')
                ->paginate(20)
                ->through(fn (Service $service) => [
                    ...$service->only(['id', 'type', 'title', 'is_open', 'attendance_count']),
                    'recurring' => $service->recurring_key !== null,
                    'date' => $service->date->toDateString(),
                    'date_label' => $service->date->format('D j M Y'),
                    'opens_at' => $service->opens_at->format('H:i'),
                    'closes_at' => $service->closes_at->format('H:i'),
                    'ends_at' => $service->endsAt()->format('H:i'),
                    'department' => $service->department->name,
                    'accepting' => $service->acceptsCheckIns(),
                    'can_open' => $service->date->lte(today()),
                    'can_delete' => $isSuperAdmin || ($service->recurring_key === null && $service->attendance_count === 0),
                ]),
            'canCreate' => CurrentDepartment::forNewRecords($admin) !== null,
        ]);
    }

    /**
     * Create a special service in the admin's working department.
     */
    public function store(ServiceRequest $request): RedirectResponse
    {
        $departmentId = CurrentDepartment::forNewRecords($request->user());

        abort_unless($departmentId, 422, 'Choose a department first.');

        Service::create([...$request->serviceData(), 'department_id' => $departmentId, 'type' => 'special']);

        return back()->with('success', 'Service created.');
    }

    /**
     * Update a service's title and attendance window.
     */
    public function update(ServiceRequest $request, Service $service): RedirectResponse
    {
        abort_unless($request->user()->canAccessDepartment($service->department_id), 404);

        $service->update($request->serviceData());

        return back()->with('success', 'Service updated.');
    }

    /**
     * Open attendance straight away.
     */
    public function open(Request $request, Service $service): RedirectResponse
    {
        abort_unless($request->user()->canAccessDepartment($service->department_id), 404);

        abort_if($service->date->isFuture(), 422, 'A future service can not be opened yet.');

        $service->open();

        return back()->with('success', 'Attendance is open.');
    }

    /**
     * Close attendance straight away.
     */
    public function close(Request $request, Service $service): RedirectResponse
    {
        abort_unless($request->user()->canAccessDepartment($service->department_id), 404);

        $service->update(['is_open' => false]);

        return back()->with('success', 'Attendance is closed.');
    }

    /**
     * Delete a service. Officers can only delete a special service nobody
     * attended. A super admin can delete any, along with its attendance, and a
     * recurring one stays deleted rather than being generated again.
     */
    public function destroy(Request $request, Service $service): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user->canAccessDepartment($service->department_id), 404);
        abort_unless(
            $user->hasRole('super_admin') || ($service->recurring_key === null && ! $service->attendance()->exists()),
            422,
        );

        DB::transaction(function () use ($service) {
            $service->attendance()->delete();
            $service->delete();
        });

        return back()->with('success', 'Service deleted.');
    }
}
