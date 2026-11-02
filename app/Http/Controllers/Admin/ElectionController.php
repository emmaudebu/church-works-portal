<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\Election;
use App\Models\Position;
use App\Models\User;
use App\Support\Ballot;
use App\Support\CurrentDepartment;
use App\Support\MemberPhoto;
use App\Support\MemberRules;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ElectionController extends Controller
{
    /**
     * List elections.
     */
    public function index(Request $request): Response
    {
        $admin = $request->user();

        return Inertia::render('Admin/Elections/Index', [
            'elections' => Election::managedBy($admin)
                ->with('department:id,name')
                ->latest('starts_at')
                ->get()
                ->map(fn (Election $election) => [
                    ...$election->only(['id', 'title', 'results_public']),
                    'status' => $election->status(),
                    'department' => $election->department->name,
                    'window' => $election->starts_at->format('j M, g:i A').' to '.$election->ends_at->format('j M, g:i A'),
                ]),
            'canCreate' => CurrentDepartment::forNewRecords($admin) !== null,
        ]);
    }

    /**
     * Create an election in the admin's working department.
     */
    public function store(Request $request): RedirectResponse
    {
        $departmentId = CurrentDepartment::forNewRecords($request->user());

        abort_unless($departmentId, 422, 'Choose a department first.');

        $election = Election::create([
            ...$request->validate([
                'title' => ['required', 'string', 'max:255'],
                'starts_at' => ['required', 'date', 'after_or_equal:now'],
                'ends_at' => ['required', 'date', 'after:starts_at'],
            ]),
            'department_id' => $departmentId,
        ]);

        return to_route('admin.elections.show', $election)->with('success', 'Election created. Now add positions and candidates.');
    }

    /**
     * Display the election manager.
     */
    public function show(Request $request, Election $election): Response
    {
        $this->authorizeFor($request, $election);

        return Inertia::render('Admin/Elections/Manage', [
            'election' => [
                ...$election->only(['id', 'title', 'results_public']),
                'status' => $election->status(),
                'starts_at' => $election->starts_at->format('Y-m-d\TH:i'),
                'ends_at' => $election->ends_at->format('Y-m-d\TH:i'),
                'locked' => $election->hasStarted(),
                'has_votes' => $election->hasVotes(),
            ],
            'positions' => $election->positions()->with('candidates.user')->get()->map(fn (Position $position) => [
                'id' => $position->id,
                'title' => $position->title,
                'candidates' => $position->candidates->map(fn (Candidate $candidate) => $candidate->toBallot())->values(),
            ]),
            'members' => User::where('department_id', $election->department_id)
                ->where('status', 'active')
                ->orderBy('full_name')
                ->get(['id', 'full_name']),
            'results' => Ballot::results($election),
            'turnout' => Ballot::turnout($election),
        ]);
    }

    /**
     * Update an election. Once voting starts only the closing time can change.
     */
    public function update(Request $request, Election $election): RedirectResponse
    {
        $this->authorizeFor($request, $election);

        if ($election->status() === 'closed') {
            throw ValidationException::withMessages(['ends_at' => 'A closed election can not be changed.']);
        }

        if ($election->hasStarted()) {
            $election->update($request->validate(['ends_at' => ['required', 'date', 'after:now']]));
        } else {
            $election->update($request->validate([
                'title' => ['required', 'string', 'max:255'],
                'starts_at' => ['required', 'date', 'after_or_equal:now'],
                'ends_at' => ['required', 'date', 'after:starts_at'],
            ]));
        }

        return back()->with('success', 'Election saved.');
    }

    /**
     * Delete an election nobody has voted in.
     */
    public function destroy(Request $request, Election $election): RedirectResponse
    {
        $this->authorizeFor($request, $election);

        abort_if($election->hasVotes(), 422, 'An election with votes can not be deleted.');

        Candidate::whereIn('position_id', $election->positions()->select('positions.id'))
            ->whereNotNull('photo')
            ->pluck('photo')
            ->each(fn (string $photo) => Storage::disk('local')->delete($photo));

        $election->delete();

        return to_route('admin.elections')->with('success', 'Election deleted.');
    }

    /**
     * End voting straight away.
     */
    public function close(Request $request, Election $election): RedirectResponse
    {
        $this->authorizeFor($request, $election);

        abort_unless($election->isOpen(), 422);

        $election->update(['ends_at' => now()]);

        return back()->with('success', 'Voting has closed.');
    }

    /**
     * Show or hide the results for members.
     */
    public function setResultsVisibility(Request $request, Election $election): RedirectResponse
    {
        $this->authorizeFor($request, $election);

        $election->update($request->validate(['results_public' => ['required', 'boolean']]));

        return back()->with('success', $election->results_public ? 'Results are published.' : 'Results are hidden.');
    }

    /**
     * Add a position to an election that has not started.
     */
    public function storePosition(Request $request, Election $election): RedirectResponse
    {
        $this->authorizeSetup($request, $election);

        $election->positions()->create([
            ...$request->validate(['title' => ['required', 'string', 'max:255']]),
            'sort_order' => $election->positions()->count(),
        ]);

        return back();
    }

    /**
     * Remove a position from an election that has not started.
     */
    public function destroyPosition(Request $request, Position $position): RedirectResponse
    {
        $this->authorizeSetup($request, $position->election);

        $position->candidates()->whereNotNull('photo')->pluck('photo')
            ->each(fn (string $photo) => Storage::disk('local')->delete($photo));

        $position->delete();

        return back();
    }

    /**
     * Add a candidate to a position on an election that has not started.
     */
    public function storeCandidate(Request $request, Position $position): RedirectResponse
    {
        $election = $position->election;

        $this->authorizeSetup($request, $election);

        $validated = $request->validate([
            'user_id' => [
                'required',
                Rule::exists('users', 'id')->where('department_id', $election->department_id)->where('status', 'active'),
                Rule::unique('candidates')->where('position_id', $position->id),
            ],
            'manifesto' => ['nullable', 'string', 'max:2000'],
            'photo' => ['nullable', ...MemberRules::photo()],
        ], ['user_id.unique' => 'This member is already standing for this position.']);

        $position->candidates()->create([
            ...$validated,
            'photo' => $request->hasFile('photo') ? MemberPhoto::store($request->file('photo')) : null,
        ]);

        return back();
    }

    /**
     * Remove a candidate from an election that has not started.
     */
    public function destroyCandidate(Request $request, Candidate $candidate): RedirectResponse
    {
        $this->authorizeSetup($request, $candidate->position->election);

        if ($candidate->photo) {
            Storage::disk('local')->delete($candidate->photo);
        }

        $candidate->delete();

        return back();
    }

    private function authorizeFor(Request $request, Election $election): void
    {
        abort_unless($request->user()->canAccessDepartment($election->department_id), 404);
    }

    /**
     * The ballot is frozen once voting starts so nobody votes on a changing list.
     */
    private function authorizeSetup(Request $request, Election $election): void
    {
        $this->authorizeFor($request, $election);

        abort_if($election->hasStarted(), 422, 'The ballot is locked once voting has started.');
    }
}
