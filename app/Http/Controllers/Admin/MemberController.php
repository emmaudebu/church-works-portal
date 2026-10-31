<?php

namespace App\Http\Controllers\Admin;

use App\Exports\MembersExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateMemberRequest;
use App\Models\Department;
use App\Models\MemberProfile;
use App\Models\User;
use App\Support\AttendanceStats;
use App\Support\MemberPhoto;
use App\Support\Phone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MemberController extends Controller
{
    /**
     * Display the searchable members directory.
     */
    public function index(Request $request): Response
    {
        $admin = $request->user();

        $members = $this->filtered($request)
            ->with('roles:id,name')
            ->orderBy('full_name')
            ->paginate(20)
            ->withQueryString();

        $rates = AttendanceStats::rates(
            $members->getCollection(),
            AttendanceStats::held($members->getCollection()->pluck('department_id')->filter()->unique()->values()),
        );

        $members->through(fn (User $member) => [
            ...$member->only(['id', 'member_id', 'full_name', 'phone', 'unit', 'status']),
            'photo_url' => $member->photoUrl(),
            'can_manage' => $admin->canManage($member),
            'attendance_rate' => $rates[$member->id]['rate'],
        ]);

        return Inertia::render('Admin/Members/Index', [
            'members' => $members,
            'filters' => $request->only(['search', 'status', 'unit']),
            'units' => User::managedBy($admin)->whereNotNull('unit')->distinct()->orderBy('unit')->pluck('unit'),
        ]);
    }

    /**
     * Download selected members, or everyone matching the filters, as a spreadsheet.
     */
    public function export(Request $request): BinaryFileResponse
    {
        $validated = $request->validate(['ids' => ['nullable', 'array'], 'ids.*' => ['integer']]);

        $members = $this->filtered($request)
            ->when($validated['ids'] ?? null, fn (Builder $query, array $ids) => $query->whereIn('id', $ids))
            ->with('department:id,name')
            ->orderBy('full_name')
            ->get();

        return Excel::download(new MembersExport($members), 'members-'.now()->toDateString().'.xlsx');
    }

    /**
     * Display a member's full record.
     */
    public function show(Request $request, User $member): Response
    {
        abort_unless($request->user()->canView($member), 404);

        $member->load(['department:id,name', 'profile', 'suspensionLogs.admin:id,full_name']);

        $held = AttendanceStats::held(collect([$member->department_id])->filter()->values());

        return Inertia::render('Admin/Members/Show', [
            'member' => $this->present($member),
            'attendance' => [
                ...AttendanceStats::rates(collect([$member]), $held)[$member->id],
                'recent' => $member->attendance()
                    ->with('service:id,title,date')
                    ->latest('checked_in_at')
                    ->limit(10)
                    ->get()
                    ->map(fn ($row) => [
                        'id' => $row->id,
                        'service' => $row->service->title,
                        'date' => $row->service->date->format('D j M Y'),
                        'method' => $row->method,
                    ]),
            ],
            'can_manage' => $request->user()->canManage($member),
            'logs' => $member->suspensionLogs->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'reason' => $log->reason,
                'by' => $log->admin?->full_name,
                'created_at' => $log->created_at->toDateTimeString(),
            ]),
        ]);
    }

    /**
     * Show the form for editing a member.
     */
    public function edit(Request $request, User $member): Response
    {
        abort_unless($request->user()->canManage($member), 404);

        $member->load('profile');

        return Inertia::render('Admin/Members/Edit', [
            'member' => $this->present($member),
            'departments' => $request->user()->hasRole('super_admin')
                ? Department::where('status', 'active')->orWhere('id', $member->department_id)->orderBy('name')->get(['id', 'name'])
                : null,
        ]);
    }

    /**
     * Update a member's bio data.
     */
    public function update(UpdateMemberRequest $request, User $member): RedirectResponse
    {
        abort_unless($request->user()->canManage($member), 404);

        $data = Arr::except($request->validated(), 'photo');

        if ($request->hasFile('photo')) {
            $data['photo'] = MemberPhoto::store($request->file('photo'), $member->photo);
        }

        $member->update(Arr::except($data, MemberProfile::BIO_FIELDS));
        $member->profile()->updateOrCreate([], Arr::only($data, MemberProfile::BIO_FIELDS));

        return to_route('admin.members.show', $member)->with('success', 'Member details saved.');
    }

    /**
     * Save the private admin notes on a member.
     */
    public function updateNotes(Request $request, User $member): RedirectResponse
    {
        abort_unless($request->user()->canManage($member), 404);

        $validated = $request->validate(['admin_notes' => ['nullable', 'string', 'max:5000']]);

        $member->profile()->updateOrCreate([], $validated);

        return back()->with('success', 'Notes saved.');
    }

    /**
     * The directory query for this admin with the search and filters applied.
     *
     * @return Builder<User>
     */
    private function filtered(Request $request): Builder
    {
        $search = trim((string) $request->query('search'));

        return User::managedBy($request->user())
            ->when($search !== '', fn (Builder $query) => $query->where(function (Builder $query) use ($search) {
                $query->where('full_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('member_id', 'like', "%{$search}%");

                if (Str::match('/^[\d\s+]+$/', $search)) {
                    $query->orWhere('phone', 'like', '%'.ltrim(Phone::digits($search), '0').'%');
                }
            }))
            ->when($request->query('status'), fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($request->query('unit'), fn (Builder $query, string $unit) => $query->where('unit', $unit));
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $member): array
    {
        return [
            ...$member->only([
                'id', 'department_id', 'member_id', 'full_name', 'gender', 'phone', 'email', 'address',
                'unit', 'foundation_class_done', 'wofbi_done', 'status', 'suspension_reason',
            ]),
            'date_of_birth' => $member->date_of_birth?->toDateString(),
            'date_joined' => $member->date_joined?->toDateString(),
            'department' => $member->department?->name,
            'photo_url' => $member->photoUrl(),
            'profile' => $member->profile?->makeVisible('admin_notes'),
        ];
    }
}
