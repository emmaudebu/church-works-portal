import Embers from '@/Components/Site/Embers';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { useState } from 'react';

/** King James Version verses about finding the way. */
const VERSES = [
    {
        text: 'Thy word is a lamp unto my feet, and a light unto my path.',
        reference: 'Psalm 119:105',
    },
    {
        text: 'For the Son of man is come to seek and to save that which was lost.',
        reference: 'Luke 19:10',
    },
    {
        text: 'In all thy ways acknowledge him, and he shall direct thy paths.',
        reference: 'Proverbs 3:6',
    },
    {
        text: 'I am the way, the truth, and the life.',
        reference: 'John 14:6',
    },
    {
        text: 'I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye.',
        reference: 'Psalm 32:8',
    },
    {
        text: 'This is the way, walk ye in it.',
        reference: 'Isaiah 30:21',
    },
];

const MESSAGES: Record<number, { title: string; text: string }> = {
    403: {
        title: 'This page is not for you',
        text: 'You do not have permission to open this page.',
    },
    404: {
        title: 'This page has lost its way',
        text: 'We could not find what you were looking for, but you are not lost with us.',
    },
    500: {
        title: 'Something went wrong',
        text: 'The problem is on our side. Please try again in a moment.',
    },
    503: {
        title: 'We will be right back',
        text: 'The site is being looked after. Please try again shortly.',
    },
};

const WORD_MS = 90;

function AnimatedVerse({ text, reference }: (typeof VERSES)[number]) {
    const words = text.split(' ');

    return (
        <figure>
            <blockquote aria-label={text} className="font-serif text-xl italic leading-relaxed text-white md:text-2xl">
                {words.map((word, index) => (
                    <span
                        key={`${word}-${index}`}
                        aria-hidden="true"
                        className="inline-block animate-word-in whitespace-pre"
                        style={{ animationDelay: `${index * WORD_MS}ms` }}
                    >
                        {word}{' '}
                    </span>
                ))}
            </blockquote>
            <figcaption
                className="mt-3 animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-gold-300"
                style={{ animationDelay: `${words.length * WORD_MS + 200}ms` }}
            >
                {reference}
            </figcaption>
        </figure>
    );
}

export default function Error({ status }: { status: number }) {
    const { branding } = usePage<PageProps>().props;
    const [verse, setVerse] = useState(() =>
        Math.floor(Math.random() * VERSES.length),
    );

    const message = MESSAGES[status] ?? MESSAGES[404];
    const digits = String(status).split('');

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal-900 px-4 py-12 text-center text-white">
            <Head title={message.title} />

            <div
                aria-hidden="true"
                className="absolute left-1/2 top-[28%] h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2"
            >
                <div className="h-full w-full animate-glow rounded-full bg-[radial-gradient(circle,rgb(var(--gold-500)/0.35),rgb(var(--primary-700)/0.15)_45%,transparent_70%)]" />
            </div>
            <Embers density={1.4} />

            <div className="relative w-full max-w-2xl">
                <div
                    role="img"
                    aria-label={`Error ${status}`}
                    className="flex animate-fade-up items-center justify-center gap-2 md:gap-4"
                >
                    {digits.map((digit, index) =>
                        digit === '0' && index === 1 ? (
                            <img
                                key={index}
                                src={
                                    branding?.logo_dark_url ??
                                    '/images/logo-dark.png'
                                }
                                alt=""
                                className="h-28 w-auto animate-float drop-shadow-[0_0_30px_rgb(var(--gold-500)/0.6)] md:h-44"
                            />
                        ) : (
                            <span
                                key={index}
                                aria-hidden="true"
                                className="animate-shimmer bg-[linear-gradient(110deg,rgb(var(--gold-500))_30%,#fff8dc_50%,rgb(var(--gold-500))_70%)] bg-[length:200%_auto] bg-clip-text font-serif text-8xl font-bold text-transparent md:text-[10rem] md:leading-none"
                            >
                                {digit}
                            </span>
                        ),
                    )}
                </div>

                <h1
                    className="mt-6 animate-fade-up text-3xl md:text-4xl"
                    style={{ animationDelay: '150ms' }}
                >
                    {message.title}
                </h1>
                <p
                    className="mx-auto mt-3 max-w-md animate-fade-up text-silver-300"
                    style={{ animationDelay: '250ms' }}
                >
                    {message.text}
                </p>

                <div
                    className="mx-auto mt-8 h-0.5 w-16 animate-fade-up bg-gold-500"
                    style={{ animationDelay: '300ms' }}
                />

                <div className="mt-6 min-h-32">
                    <AnimatedVerse key={verse} {...VERSES[verse]} />
                </div>

                <button
                    type="button"
                    onClick={() => setVerse((verse + 1) % VERSES.length)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg text-sm text-silver-300 transition hover:text-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                    <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                    Another verse
                </button>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                        href={route('home')}
                        className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <Home size={16} strokeWidth={1.75} aria-hidden="true" />
                        Back to home
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <ArrowLeft
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                        Go back
                    </button>
                </div>
            </div>
        </main>
    );
}
