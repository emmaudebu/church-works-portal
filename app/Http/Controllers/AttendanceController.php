<?php

namespace App\Http\Controllers;

use App\Models\Election;
use App\Models\Post;
use App\Models\Service;
use App\Support\AttendanceStats;
use App\Support\Ballot;
use App\Support\ServiceGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class AttendanceController extends Controller
{
    /**
     * Display the member dashboard.
     */
    public function home(Request $request): Response
    {
        ServiceGenerator::generate();

        $user = $request->user();
        $departments = collect([$user->department_id])->filter()->values();

        $month = AttendanceStats::rates(
            collect([$user]),
            AttendanceStats::held($departments, today()->startOfMonth(), today()),
        )[$user->id];

        $next = Service::whereIn('department_id', $departments)
            ->whereDate('date', '>=', today())
            ->where('closes_at', '>=', now())
            ->orderBy('opens_at')
            ->first();

        return Inertia::render('Member/Home', [
            'month' => $month,
            'nextService' => $next ? [
                'title' => $next->title,
                'date_label' => $next->date->format('l j F'),
                'time' => $next->opens_at->format('g:i A'),
            ] : null,
            'openElection' => Election::where('department_id', $user->department_id)
                ->where('starts_at', '<=', now())
                ->where('ends_at', '>=', now())
                ->with('positions')
                ->get()
                ->first(fn (Election $election) => Ballot::isEligible($election, $user) && ! Ballot::hasVoted($election, $user))
                ?->only(['id', 'title']),
            'announcements' => Post::visibleTo($user)
                ->where('type', 'announcement')
                ->latest('published_at')
                ->limit(3)
                ->get()
                ->map->toCard(),
            'events' => Post::visibleTo($user)
                ->where('type', 'event')
                ->where('event_date', '>=', now())
                ->orderBy('event_date')
                ->limit(3)
                ->get()
                ->map->toCard(),
        ]);
    }

    /**
     * Display a member's calendar of attended services.
     */
    public function history(Request $request): Response
    {
        $validated = $request->validate(['month' => ['nullable', 'date_format:Y-m']]);

        $user = $request->user();
        $month = Carbon::parse(($validated['month'] ?? now()->format('Y-m')).'-01');
        $departments = collect([$user->department_id])->filter()->values();

        $held = AttendanceStats::held($departments, $month->copy()->startOfMonth(), $month->copy()->endOfMonth());

        $present = $user->attendance()
            ->whereIn('service_id', $held->pluck('id'))
            ->pluck('service_id')
            ->flip();

        return Inertia::render('Member/Attendance', [
            'month' => $month->format('Y-m'),
            'monthLabel' => $month->format('F Y'),
            'previousMonth' => $month->copy()->subMonth()->format('Y-m'),
            'nextMonth' => $month->copy()->addMonth()->lte(now()) ? $month->copy()->addMonth()->format('Y-m') : null,
            'overall' => AttendanceStats::rates(collect([$user]), AttendanceStats::held($departments))[$user->id],
            'days' => $held->map(fn (Service $service) => [
                'id' => $service->id,
                'date' => $service->date->toDateString(),
                'title' => $service->title,
                'present' => $present->has($service->id),
            ])->values(),
        ]);
    }
}
