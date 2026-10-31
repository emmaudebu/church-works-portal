<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Service;
use App\Models\User;
use App\Support\AttendanceStats;
use App\Support\CheckIn;
use App\Support\CurrentDepartment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard.
     */
    public function __invoke(Request $request): Response
    {
        $admin = $request->user();
        $members = User::managedBy($admin);
        $active = (clone $members)->where('status', 'active')->get();

        $departmentId = CurrentDepartment::idFor($admin);
        $departments = $departmentId ? collect([$departmentId]) : Department::pluck('id');

        $held = AttendanceStats::held($departments, today()->subWeeks(12), today());

        $todayServices = Service::managedBy($admin)->whereDate('date', today())->pluck('id');
        $todayPresent = Attendance::whereIn('service_id', $todayServices)->distinct('user_id')->count('user_id');

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total' => (clone $members)->count(),
                'active' => $active->count(),
                'suspended' => (clone $members)->where('status', 'suspended')->count(),
                'pending' => (clone $members)->where('status', 'pending')->count(),
                'today' => $todayServices->isNotEmpty() && $active->isNotEmpty()
                    ? min(100, (int) round($todayPresent / $active->count() * 100))
                    : null,
            ],
            'trend' => AttendanceStats::trend($held, $active->count()),
            'absentees' => AttendanceStats::absentees($active, $held)->take(8),
            'recent' => Attendance::whereIn('service_id', Service::managedBy($admin)->select('id'))
                ->with(['user', 'service:id,title'])
                ->latest('checked_in_at')
                ->latest('id')
                ->limit(6)
                ->get()
                ->map(fn (Attendance $row) => [
                    ...CheckIn::present($row->user),
                    'attendance_id' => $row->id,
                    'service' => $row->service->title,
                    'checked_in_at' => $row->checked_in_at->format('j M, g:i A'),
                ]),
        ]);
    }
}
