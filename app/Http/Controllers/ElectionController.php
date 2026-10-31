<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use App\Models\Election;
use App\Models\Position;
use App\Support\Ballot;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ElectionController extends Controller
{
    /**
     * List the elections in the member's department.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Member/Elections/Index', [
            'elections' => Election::where('department_id', $user->department_id)
                ->with('positions')
                ->latest('starts_at')
                ->get()
                ->map(fn (Election $election) => [
                    ...$election->only(['id', 'title', 'results_public']),
                    'status' => $election->status(),
                    'has_voted' => Ballot::hasVoted($election, $user),
                    'window' => $election->starts_at->format('j M, g:i A').' to '.$election->ends_at->format('j M, g:i A'),
                ]),
        ]);
    }

    /**
     * Display the ballot.
     */
    public function show(Request $request, Election $election): Response|RedirectResponse
    {
        $user = $request->user();

        abort_unless($election->department_id === $user->department_id, 404);

        if (! $election->isOpen() || Ballot::hasVoted($election, $user)) {
            return to_route('member.elections');
        }

        return Inertia::render('Member/Elections/Ballot', [
            'election' => $election->only(['id', 'title']),
            'positions' => Ballot::positions($election)->map(fn (Position $position) => [
                'id' => $position->id,
                'title' => $position->title,
                'candidates' => $position->candidates->map(fn (Candidate $candidate) => $candidate->toBallot())->values(),
            ]),
        ]);
    }

    /**
     * Cast a ballot.
     */
    public function vote(Request $request, Election $election): RedirectResponse
    {
        abort_unless($election->department_id === $request->user()->department_id, 404);

        $validated = $request->validate(['choices' => ['required', 'array']]);

        Ballot::cast($election, $request->user(), $validated['choices']);

        return to_route('member.elections')->with('success', 'Thank you for voting.');
    }

    /**
     * Display published results.
     */
    public function results(Request $request, Election $election): Response
    {
        abort_unless($election->department_id === $request->user()->department_id, 404);
        abort_unless($election->results_public, 404);

        return Inertia::render('Member/Elections/Results', [
            'election' => $election->only(['id', 'title']),
            'results' => Ballot::results($election),
            'turnout' => Ballot::turnout($election),
        ]);
    }

    /**
     * Serve a candidate's photo to anyone taking part in the election.
     */
    public function photo(Request $request, Candidate $candidate): StreamedResponse
    {
        $user = $request->user();
        $departmentId = $candidate->position->election->department_id;

        abort_unless($user->department_id === $departmentId || $user->canAccessDepartment($departmentId), 403);

        $path = $candidate->photo ?? $candidate->user->photo;

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, headers: ['Cache-Control' => 'private, max-age=86400']);
    }
}
