import Embers from '@/Components/Site/Embers';
import { HomeSlide } from '@/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';


const SLIDE_MS = 7000;

export default function HeroSlider({
    slides,
    actions,
    aside,
}: {
    slides: HomeSlide[];
    actions: ReactNode;
    aside?: ReactNode;
}) {
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );

    useEffect(() => {
        if (paused) {
            return;
        }

        const timer = setInterval(
            () => setActive((index) => (index + 1) % slides.length),
            SLIDE_MS,
        );

        return () => clearInterval(timer);
    }, [paused, slides.length]);

    const go = (index: number) => {
        setPaused(true);
        setActive((index + slides.length) % slides.length);
    };

    const slide = slides[active];

    return (
        <section
            aria-roledescription="carousel"
            aria-label="Welcome"
            className="relative overflow-hidden bg-charcoal-900 pb-28 text-white md:pb-40"
        >
            {slides.map((item, index) => (
                <img
                    key={item.id}
                    src={item.image}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                        index === active
                            ? 'animate-ken-burns opacity-100'
                            : 'opacity-0'
                    }`}
                />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/60 to-charcoal-900/30" />
            <Embers />

            <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pt-36 md:px-8 md:pt-44 lg:grid-cols-[1fr_340px] lg:items-end">
                <div aria-live={paused ? 'polite' : 'off'}>
                    <div key={active}>
                        <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                            {slide.label}
                        </p>
                        <h1
                            className="mt-3 animate-fade-up text-5xl font-medium leading-[1.05] md:text-7xl"
                            style={{ animationDelay: '120ms' }}
                        >
                            {slide.title}
                            <em className="accent block">{slide.accent}</em>
                        </h1>
                        <p
                            className="mt-5 max-w-xl animate-fade-up text-lg text-white"
                            style={{ animationDelay: '240ms' }}
                        >
                            {slide.text}
                        </p>
                    </div>
                    <div
                        className="mt-8 flex animate-fade-up flex-wrap gap-3"
                        style={{ animationDelay: '360ms' }}
                    >
                        {actions}
                    </div>
                </div>
                {aside}
            </div>

            <div className="relative mx-auto mt-10 flex max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
                <div className="flex min-w-0 gap-6">
                    {slides.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`Show slide ${index + 1}: ${item.label}`}
                            aria-current={index === active}
                            onClick={() => go(index)}
                            className={`border-b-2 pb-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
                                index === active
                                    ? 'border-gold-500 text-white'
                                    : 'border-white/30 text-silver-300'
                            }`}
                        >
                            0{index + 1}
                            <span className="ml-2 hidden sm:inline">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        aria-label="Previous slide"
                        onClick={() => go(active - 1)}
                        className="rounded-full border border-white/40 p-2.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <ArrowLeft size={20} strokeWidth={1.75} />
                    </button>
                    <button
                        type="button"
                        aria-label="Next slide"
                        onClick={() => go(active + 1)}
                        className="rounded-full border border-white/40 p-2.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <ArrowRight size={20} strokeWidth={1.75} />
                    </button>
                </div>
            </div>
        </section>
    );
}
