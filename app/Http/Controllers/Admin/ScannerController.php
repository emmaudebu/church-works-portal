<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Service;
use App\Models\User;
use App\Support\CheckIn;
use App\Support\ServiceGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ScannerController extends Controller
{
    /**
     * Go straight to the only live service, or offer a choice.
     */
    public function index(Request $request): RedirectResponse|Response
    {
        ServiceGenerator::generate();

        $services = Service::managedBy($request->user())
            ->with('department:id,name')
            ->whereDate('date', '>=', today()->subDay())
            ->whereDate('date', '<=', today()->addDays(7))
            ->orderBy('opens_at')
            ->get();

        $live = $services->filter->acceptsCheckIns();

        if ($live->count() === 1) {
            return to_route('admin.scanner.show', $live->first());
        }

        return Inertia::render('Admin/ScannerPicker', [
            'services' => $services->map(fn (Service $service) => [
                'id' => $service->id,
                'title' => $service->title,
                'department' => $service->department->name,
                'date_label' => $service->date->format('D j M'),
                'window' => $service->opens_at->format('g:i A').' to '.$service->closes_at->format('g:i A'),
                'accepting' => $service->acceptsCheckIns(),
            ]),
        ]);
    }

    /**
     * Display the full-screen scanner.
     */
    public function show(Request $request, Service $service): Response
    {
        $this->authorizeFor($request, $service);

        return Inertia::render('Admin/Scanner', [
            'service' => [
                ...$service->only(['id', 'title']),
                'date_label' => $service->date->format('D j M Y'),
                'accepting' => $service->acceptsCheckIns(),
            ],
            ...$this->liveCounts($service),
        ]);
    }

    /**
     * Check in a scanned QR code.
     */
    public function checkIn(Request $request, Service $service): JsonResponse
    {
        $this->authorizeFor($request, $service);

        $validated = $request->validate(['token' => ['required', 'string', 'max:255']]);

        return response()->json([
            ...CheckIn::scan($service, $validated['token'], $request->user()),
            ...$this->liveCounts($service),
        ]);
    }

    /**
     * Mark someone present by hand.
     */
    public function manual(Request $request, Service $service): JsonResponse
    {
        $this->authorizeFor($request, $service);

        $validated = $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        return response()->json([
            ...CheckIn::manual($service, User::findOrFail($validated['user_id']), $request->user()),
            ...$this->liveCounts($service),
        ]);
    }

    /**
     * Find members for the manual fallback.
     */
    public function search(Request $request, Service $service): JsonResponse
    {
        $this->authorizeFor($request, $service);

        $search = trim((string) $request->query('q'));

        if (mb_strlen($search) < 2) {
            return response()->json([]);
        }

        $members = User::where('department_id', $service->department_id)
            ->where(fn (Builder $query) => $query
                ->where('full_name', 'like', "%{$search}%")
                ->orWhere('member_id', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%"))
            ->orderBy('full_name')
            ->limit(8)
            ->get();

        return response()->json($members->map(fn (User $member) => [
            ...CheckIn::present($member),
            'status' => $member->status,
        ]));
    }

    private function authorizeFor(Request $request, Service $service): void
    {
        abort_unless(
            $request->user()->canAccessDepartment($service->department_id),
            SymfonyResponse::HTTP_NOT_FOUND,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function liveCounts(Service $service): array
    {
        return [
            'count' => $service->attendance()->count(),
            'recent' => Attendance::where('service_id', $service->id)
                ->with('user')
                ->latest('checked_in_at')
                ->latest('id')
                ->limit(8)
                ->get()
                ->map(fn (Attendance $row) => [
                    ...CheckIn::present($row->user),
                    'attendance_id' => $row->id,
                    'checked_in_at' => $row->checked_in_at->format('g:i A'),
                ]),
        ];
    }
}
