import Embers from '@/Components/Site/Embers';
import { PropsWithChildren } from 'react';

/** The image banner every public page opens with. */
export default function PageHero({
    image,
    eyebrow,
    title,
    children,
}: PropsWithChildren<{ image: string; eyebrow?: string; title: string }>) {
    return (
        <section className="relative overflow-hidden bg-charcoal-900 text-white">
            <img
                src={image}
                alt=""
                className="absolute inset-0 h-full w-full animate-ken-burns object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/40" />
            <Embers density={0.6} />
            <div className="relative mx-auto max-w-7xl animate-fade-up px-4 pb-16 pt-32 md:px-8 md:pb-20 md:pt-40">
                {eyebrow && (
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                        {eyebrow}
                    </p>
                )}
                <h1 className="mt-2 max-w-3xl text-4xl leading-tight md:text-5xl">
                    {title}
                </h1>
                <div className="gold-rule" />
                {children}
            </div>
        </section>
    );
}
