import Embers from '@/Components/Site/Embers';
import { Crown, Sparkles } from 'lucide-react';

export type Spotlight = {
    full_name: string;
    unit: string | null;
    department: string;
    photo_url: string | null;
    month: string;
};

const SPARKLES = [
    { place: '-left-5 top-10', size: 22, delay: '0s' },
    { place: '-right-6 top-1/4', size: 28, delay: '0.7s' },
    { place: '-left-7 bottom-1/4', size: 18, delay: '1.4s' },
    { place: '-right-4 bottom-14', size: 20, delay: '2.1s' },
];

export default function BestMemberSpotlight({
    winner,
}: {
    winner: Spotlight;
}) {
    const initials = winner.full_name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    return (
        <section
            id="best-member"
            className="relative scroll-mt-28 overflow-hidden bg-charcoal-900 py-20 text-white"
        >
            <Embers density={0.6} />
            <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 animate-glow rounded-full bg-gold-500/25 blur-3xl lg:left-1/4" />

            <div className="relative mx-auto grid max-w-5xl items-center gap-14 px-4 md:px-8 lg:grid-cols-2">
                <div className="reveal relative mx-auto w-full max-w-xs">
                    {SPARKLES.map((sparkle) => (
                        <Sparkles
                            key={sparkle.delay}
                            size={sparkle.size}
                            strokeWidth={1.5}
                            aria-hidden="true"
                            style={{ animationDelay: sparkle.delay }}
                            className={`absolute z-10 animate-twinkle text-gold-300 ${sparkle.place}`}
                        />
                    ))}

                    <span className="absolute -top-7 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 animate-float items-center justify-center rounded-full bg-gold-500 text-neutral-900 shadow-soft ring-4 ring-charcoal-900">
                        <Crown size={26} strokeWidth={1.75} aria-hidden="true" />
                    </span>

                    <div className="relative overflow-hidden rounded-3xl p-[3px] shadow-soft">
                        <div
                            aria-hidden="true"
                            className="absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 animate-border-spin bg-[conic-gradient(var(--tw-gradient-stops))] from-gold-500 via-white to-gold-500"
                        />
                        <div className="relative overflow-hidden rounded-[1.35rem] bg-primary-900">
                            <div className="relative aspect-[4/5]">
                                {winner.photo_url ? (
                                    <img
                                        src={winner.photo_url}
                                        alt={winner.full_name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="flex h-full items-center justify-center font-serif text-8xl text-gold-300"
                                    >
                                        {initials}
                                    </span>
                                )}
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/80 to-transparent px-5 pb-5 pt-16 text-center">
                                    <p className="font-serif text-2xl font-semibold leading-snug">
                                        {winner.full_name}
                                    </p>
                                    {winner.unit && (
                                        <p className="mt-0.5 text-sm text-gold-300">
                                            {winner.unit}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="reveal text-center lg:text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                        {winner.month}
                    </p>
                    <h2 className="mt-2 text-4xl font-medium leading-tight md:text-5xl">
                        Best Member of{' '}
                        <em className="accent">the Month</em>
                    </h2>
                    <div className="mx-auto mt-4 h-0.5 w-16 bg-gold-500 lg:mx-0" />
                    <p className="mt-5 text-lg text-white/80">
                        Congratulations to {winner.full_name}, honoured for
                        faithful attendance and punctuality in the{' '}
                        {winner.department} throughout {winner.month}.
                    </p>
                </div>
            </div>
        </section>
    );
}
