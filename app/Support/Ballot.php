<?php

namespace App\Support;

use App\Models\Candidate;
use App\Models\Election;
use App\Models\Position;
use App\Models\User;
use App\Models\Vote;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every rule about who may vote and how votes are counted lives here.
 */
class Ballot
{
    /**
     * A one-way key for one voter on one position. It differs per position so a
     * person's choices can't be linked across positions, and it needs the app key
     * so it can't be recomputed from the database alone.
     */
    public static function voterHash(User $user, int $positionId): string
    {
        return hash_hmac('sha256', "{$positionId}:{$user->id}", config('app.key'));
    }

    public static function isEligible(Election $election, User $user): bool
    {
        return $user->isActive() && $user->department_id === $election->department_id;
    }

    public static function hasVoted(Election $election, User $user): bool
    {
        $hashes = $election->positions->map(fn (Position $position) => [
            'position_id' => $position->id,
            'voter_hash' => self::voterHash($user, $position->id),
        ]);

        return $hashes->contains(fn (array $key) => Vote::where($key)->exists());
    }

    /**
     * The positions on the ballot, with only candidates who are still active.
     *
     * @return Collection<int, Position>
     */
    public static function positions(Election $election): Collection
    {
        return $election->positions()
            ->with(['candidates' => fn ($query) => $query->whereHas('user', fn ($users) => $users->where('status', 'active'))->with('user')])
            ->get()
            ->filter(fn (Position $position) => $position->candidates->isNotEmpty())
            ->values();
    }

    /**
     * Record a whole ballot, one choice per position, or nothing at all.
     *
     * @param  array<int|string, mixed>  $choices  candidate id keyed by position id
     *
     * @throws ValidationException
     */
    public static function cast(Election $election, User $user, array $choices): void
    {
        if (! $election->isOpen()) {
            throw ValidationException::withMessages(['ballot' => 'This election is not open for voting.']);
        }

        if (! self::isEligible($election, $user)) {
            throw ValidationException::withMessages(['ballot' => 'You are not eligible to vote in this election.']);
        }

        $votes = self::positions($election)->map(function (Position $position) use ($choices, $user) {
            $candidate = $position->candidates->firstWhere('id', (int) ($choices[$position->id] ?? 0));

            if (! $candidate instanceof Candidate) {
                throw ValidationException::withMessages(['ballot' => "Please make a choice for {$position->title}."]);
            }

            return [
                'position_id' => $position->id,
                'candidate_id' => $candidate->id,
                'voter_hash' => self::voterHash($user, $position->id),
            ];
        });

        try {
            DB::transaction(fn () => $votes->each(fn (array $vote) => Vote::create($vote)));
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['ballot' => 'You have already voted in this election.']);
        }
    }

    /**
     * Counts for every position, most votes first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public static function results(Election $election): Collection
    {
        $positions = $election->positions()->with('candidates.user')->get();

        $counts = Vote::whereIn('position_id', $positions->pluck('id'))
            ->selectRaw('candidate_id, count(*) as total')
            ->groupBy('candidate_id')
            ->pluck('total', 'candidate_id');

        return $positions->map(function (Position $position) use ($counts) {
            $candidates = $position->candidates
                ->map(fn (Candidate $candidate) => [
                    ...$candidate->toBallot(),
                    'votes' => (int) $counts->get($candidate->id, 0),
                ])
                ->sortByDesc('votes')
                ->values();

            return [
                'id' => $position->id,
                'title' => $position->title,
                'total' => $candidates->sum('votes'),
                'candidates' => $candidates,
            ];
        })->values();
    }

    /**
     * Voters so far against everyone eligible. A ballot covers every position,
     * so the busiest position's total is the number of voters.
     *
     * @return array{voted: int, eligible: int, percent: int}
     */
    public static function turnout(Election $election): array
    {
        $voted = (int) Vote::whereIn('position_id', $election->positions()->select('positions.id'))
            ->selectRaw('count(*) as total')
            ->groupBy('position_id')
            ->get()
            ->max('total');

        $eligible = User::where('department_id', $election->department_id)->where('status', 'active')->count();

        return [
            'voted' => $voted,
            'eligible' => $eligible,
            'percent' => $eligible ? min(100, (int) round($voted / $eligible * 100)) : 0,
        ];
    }
}
