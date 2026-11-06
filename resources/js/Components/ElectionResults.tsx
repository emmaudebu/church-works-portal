import { BallotCandidate, PositionResult, Turnout } from '@/types';
import { Crown, Vote } from 'lucide-react';
import { CSSProperties, useEffect, useRef, useState } from 'react';

/**
 * Bar finishes in the church colours, given to candidates in ballot order so
 * each keeps the same colour however the votes move. Wine and gold follow
 * the colours set in Settings.
 */
const FINISHES = [
    {
        bar: 'linear-gradient(90deg, rgb(var(--gold-500)) 0%, #E3C76A 55%, #F1DFA4 100%)',
        ring: 'rgb(var(--gold-500))',
        accent: '#F1DFA4',
        figure: '#1A1A1A',
    },
    {
        bar: 'linear-gradient(90deg, rgb(var(--primary-900)) 0%, rgb(var(--primary-700)) 50%, rgb(var(--primary-500)) 100%)',
        ring: 'rgb(var(--primary-500))',
        accent: '#F4B4B0',
        figure: '#FFFFFF',
    },
    {
        bar: 'linear-gradient(90deg, #8C9095 0%, #C0C0C0 55%, #EDEDED 100%)',
        ring: '#C0C0C0',
        accent: '#E2E2E2',
        figure: '#1A1A1A',
    },
    {
        bar: 'linear-gradient(90deg, #E9DCC0 0%, #FBF6E6 100%)',
        ring: '#FBF6E6',
        accent: '#FBF6E6',
        figure: '#1A1A1A',
    },
];

type Candidate = BallotCandidate & { votes: number };
type Finish = (typeof FINISHES)[number];

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * A number that glides to each new value instead of jumping, starting from
 * zero the first time it is shown.
 */
function useGlide(target: number, duration = 1100): number {
    const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
    const current = useRef(value);

    useEffect(() => {
        if (prefersReducedMotion()) {
            current.current = target;
            setValue(target);

            return;
        }

        const from = current.current;
        const startedAt = performance.now();
        let frame = 0;

        const step = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);

            current.current = from + (target - from) * eased;
            setValue(current.current);

            if (progress < 1) {
                frame = requestAnimationFrame(step);
            }
        };

        frame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frame);
    }, [target, duration]);

    return value;
}

/** True for a moment whenever the value goes up. */
function useBump(value: number): boolean {
    const previous = useRef(value);
    const [bumped, setBumped] = useState(false);

    useEffect(() => {
        if (value > previous.current) {
            setBumped(true);
            const timer = setTimeout(() => setBumped(false), 1400);

            previous.current = value;

            return () => clearTimeout(timer);
        }

        previous.current = value;
    }, [value]);

    return bumped;
}

function Photo({
    candidate,
    finish,
    bumped,
}: {
    candidate: Candidate;
    finish: Finish;
    bumped: boolean;
}) {
    const initials = candidate.full_name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('');

    return (
        <span className="absolute right-0 top-1/2 h-16 w-16 -translate-y-1/2 translate-x-1/2 sm:h-[4.5rem] sm:w-[4.5rem]">
            {bumped && (
                <span
                    aria-hidden="true"
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ backgroundColor: finish.ring }}
                />
            )}
            <span
                className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-charcoal-900 font-serif text-lg font-bold text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.8)] ring-4"
                style={{ ['--tw-ring-color' as string]: finish.ring } as CSSProperties}
            >
                {candidate.photo_url ? (
                    <img
                        src={candidate.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    initials
                )}
            </span>
        </span>
    );
}

function CandidateBar({
    candidate,
    total,
    leaderVotes,
    finish,
    leading,
    final,
}: {
    candidate: Candidate;
    total: number;
    leaderVotes: number;
    finish: Finish;
    leading: boolean;
    final: boolean;
}) {
    const share = total ? (candidate.votes / total) * 100 : 0;
    const length = leaderVotes ? (candidate.votes / leaderVotes) * 100 : 0;
    const shownShare = useGlide(share);
    const shownLength = useGlide(length);
    const shownVotes = useGlide(candidate.votes);
    const bumped = useBump(candidate.votes);
    const [first, ...rest] = candidate.full_name.split(' ');

    return (
        <li className="sm:grid sm:grid-cols-[14rem_1fr] sm:items-center lg:grid-cols-[16rem_1fr]">
            <div className="mb-2 flex items-end justify-between gap-3 sm:mb-0 sm:block sm:pr-5">
                <div className="min-w-0 leading-tight">
                    <p
                        className="break-words font-serif text-xl font-bold sm:text-2xl"
                        style={{ color: finish.accent }}
                    >
                        {first}
                    </p>
                    {rest.length > 0 && (
                        <p className="break-words font-serif text-base text-white sm:text-xl">
                            {rest.join(' ')}
                        </p>
                    )}
                    {candidate.unit && (
                        <p className="mt-0.5 text-xs uppercase tracking-wider text-white/50">
                            {candidate.unit}
                        </p>
                    )}
                </div>
                <p className="shrink-0 text-sm tabular-nums text-white/70 sm:mt-1">
                    <span className="font-semibold text-white">
                        {Math.round(shownVotes)}
                    </span>{' '}
                    {candidate.votes === 1 ? 'vote' : 'votes'}
                </p>
            </div>

            <div className="relative mt-4 pr-9 sm:mt-0 sm:border-l-2 sm:border-gold-500/70 sm:py-3 sm:pr-10">
                <div className="relative h-16 rounded-r-full bg-white/[0.04] sm:h-[4.5rem]">
                    <div
                        className="relative flex h-full min-w-[7.5rem] items-center rounded-r-full shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] sm:min-w-[9rem]"
                        style={{ width: `${shownLength}%`, background: finish.bar }}
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 overflow-hidden rounded-r-full"
                        >
                            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
                            {leading && !final && (
                                <span className="absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                            )}
                        </span>
                        <span
                            className="relative w-full pr-12 text-center font-sans text-3xl font-black tabular-nums tracking-tight sm:pr-14 sm:text-4xl"
                            style={{ color: finish.figure }}
                        >
                            {Math.round(shownShare)}%
                        </span>
                        <Photo
                            candidate={candidate}
                            finish={finish}
                            bumped={bumped}
                        />
                    </div>
                </div>
                {leading && (
                    <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-charcoal-900 shadow-lg sm:top-0">
                        <Crown size={12} strokeWidth={2.5} aria-hidden="true" />
                        {final ? 'Winner' : 'Leading'}
                    </span>
                )}
            </div>
        </li>
    );
}

function PositionCard({
    position,
    final,
}: {
    position: PositionResult;
    final: boolean;
}) {
    const ballotOrder = [...position.candidates].sort((a, b) => a.id - b.id);
    const leaderVotes = Math.max(0, ...position.candidates.map((c) => c.votes));
    const leaders = position.candidates.filter(
        (candidate) => candidate.votes === leaderVotes,
    );

    return (
        <section className="relative rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 ring-1 ring-gold-500/25 backdrop-blur sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h3 className="font-serif text-2xl font-bold text-white sm:text-3xl">
                        {position.title}
                    </h3>
                    <div className="mt-2 h-0.5 w-14 rounded-full bg-gold-500" />
                </div>
                <p className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs tabular-nums text-white/70 ring-1 ring-white/10">
                    <Vote size={14} aria-hidden="true" />
                    {position.total} {position.total === 1 ? 'vote' : 'votes'}{' '}
                    cast
                </p>
            </div>

            <ul
                className="mt-6 space-y-6 sm:space-y-4"
                aria-label={`${position.title}: ${position.candidates
                    .map((candidate) => `${candidate.full_name} ${candidate.votes}`)
                    .join(', ')}`}
            >
                {ballotOrder.map((candidate, index) => (
                    <CandidateBar
                        key={candidate.id}
                        candidate={candidate}
                        total={position.total}
                        leaderVotes={leaderVotes}
                        finish={FINISHES[index % FINISHES.length]}
                        final={final}
                        leading={
                            leaderVotes > 0 &&
                            leaders.length === 1 &&
                            leaders[0].id === candidate.id
                        }
                    />
                ))}
            </ul>
        </section>
    );
}

/**
 * The results as a scoreboard in the church colours: one card per
 * position, a bar for each candidate ending in their photo. Bars and
 * figures glide to their new values whenever fresh counts arrive, so an
 * open election plays out live.
 */
export default function ElectionResults({
    title,
    results,
    turnout,
    live,
}: {
    title: string;
    results: PositionResult[];
    turnout: Turnout;
    live: boolean;
}) {
    const shownTurnout = useGlide(turnout.percent);

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-charcoal-900 p-5 text-white shadow-2xl ring-1 ring-gold-500/30 sm:p-10">
            <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--primary-700)/0.75),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgb(var(--primary-900)/0.6),transparent_60%)]"
            />
            <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/15 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="absolute inset-0 opacity-[0.05] [background:repeating-linear-gradient(-12deg,#fff_0_2px,transparent_2px_26px)]"
            />
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-500 to-transparent"
            />

            <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
                    Election results
                </p>
                <h2 className="mt-2 font-serif text-3xl font-black leading-tight text-white sm:text-5xl">
                    {title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {live ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-lg ring-1 ring-white/20">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                            </span>
                            Live
                        </span>
                    ) : (
                        <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-widest text-charcoal-900">
                            Final
                        </span>
                    )}
                    <p className="font-serif text-white/80 sm:text-lg">
                        {live
                            ? 'Results update as votes come in'
                            : 'Voting has closed'}
                    </p>
                </div>

                <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div className="flex items-baseline justify-between gap-3 text-sm tabular-nums">
                        <span className="font-semibold uppercase tracking-wider text-gold-300">
                            Turnout
                        </span>
                        <span className="text-white/80">
                            <span className="text-lg font-bold text-white">
                                {Math.round(shownTurnout)}%
                            </span>{' '}
                            · {turnout.voted} of {turnout.eligible} voted
                        </span>
                    </div>
                    <div
                        role="progressbar"
                        aria-label="Turnout"
                        aria-valuenow={turnout.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
                    >
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                            style={{ width: `${shownTurnout}%` }}
                        />
                    </div>
                </div>

                {turnout.voted === 0 ? (
                    <p className="mt-6 rounded-2xl bg-white/5 p-8 text-center text-white/70 ring-1 ring-white/10">
                        No votes yet. The bars fill in as people vote.
                    </p>
                ) : (
                    <div className="mt-6 space-y-6">
                        {results.map((position) => (
                            <PositionCard
                                key={position.id}
                                position={position}
                                final={!live}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
