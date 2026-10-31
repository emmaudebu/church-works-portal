<?php

namespace App\Http\Controllers;

use App\Models\Election;
use App\Models\Post;
use App\Models\Service;
use App\Models\User;
use App\Support\AttendanceStats;
use App\Support\Ballot;
use App\Support\Dues;
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
            'profile' => $this->profileSummary($user),
            'upcoming' => Service::whereIn('department_id', $departments)
                ->whereDate('date', '>=', today())
                ->where('closes_at', '>=', now())
                ->orderBy('opens_at')
                ->limit(4)
                ->get()
                ->map(fn (Service $service) => [
                    'id' => $service->id,
                    'title' => $service->title,
                    'date_label' => $service->date->format('D j M'),
                    'time' => $service->opens_at->format('g:i A'),
                ]),
            'recentCheckIns' => $user->attendance()
                ->with('service:id,title,date')
                ->latest('checked_in_at')
                ->limit(4)
                ->get()
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'title' => $row->service->title,
                    'date_label' => $row->service->date->format('D j M'),
                    'time' => $row->checked_in_at->format('g:i A'),
                ]),
            'month' => $month,
            'nextService' => $next ? [
                'title' => $next->title,
                'date_label' => $next->date->format('l j F'),
                'time' => $next->opens_at->format('g:i A'),
            ] : null,
            'dues' => [
                'count' => ($owing = Dues::owing($user))->count(),
                'total' => $owing->sum('amount'),
            ],
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
     * How complete a member's details are, and what is still missing.
     *
     * @return array<string, mixed>
     */
    private function profileSummary(User $user): array
    {
        $profile = $user->profile;

        $checks = [
            'Passport photo' => $user->photo,
            'Email' => $user->email,
            'Home address' => $user->address,
            'Date of birth' => $user->date_of_birth,
            'Unit' => $user->unit,
            'Next of kin' => $profile?->next_of_kin_name,
            'Occupation' => $profile?->occupation,
            'Technical skills' => $profile?->technical_skills,
        ];

        $missing = collect($checks)->filter(fn ($value) => blank($value))->keys();

        return [
            'member_id' => $user->member_id,
            'percent' => (int) round((count($checks) - $missing->count()) / count($checks) * 100),
            'missing' => $missing->values(),
        ];
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
