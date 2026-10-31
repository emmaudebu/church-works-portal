import { RefObject, useEffect, useLayoutEffect, useState } from 'react';

export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const REVEAL_MS = 700;
const STAGGER_MS = 90;

/**
 * Fades in every `.reveal` element as it scrolls into view. Elements are only
 * hidden once this has run, so content can never get stuck invisible.
 */
export function useScrollReveal(key: string) {
    useLayoutEffect(() => {
        if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
            return;
        }

        const root = document.documentElement;

        root.classList.add('js-reveal');

        const observer = new IntersectionObserver(
            (entries) => {
                entries
                    .filter((entry) => entry.isIntersecting)
                    .forEach((entry) => {
                        const element = entry.target as HTMLElement;
                        const siblings = element.parentElement
                            ? [...element.parentElement.children]
                            : [];

                        element.classList.add('is-visible');
                        element.animate(
                            [
                                { opacity: 0, transform: 'translateY(28px)' },
                                { opacity: 1, transform: 'none' },
                            ],
                            {
                                duration: REVEAL_MS,
                                delay:
                                    Math.max(0, siblings.indexOf(element)) *
                                    STAGGER_MS,
                                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                fill: 'backwards',
                            },
                        );
                        observer.unobserve(element);
                    });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
        );

        document
            .querySelectorAll('.reveal')
            .forEach((element) => observer.observe(element));

        return () => {
            observer.disconnect();
            root.classList.remove('js-reveal');
        };
    }, [key]);
}

/** Counts up to a number the first time an element is seen. */
export function useCountUp(target: number, element: RefObject<HTMLElement | null>) {
    const [value, setValue] = useState(() =>
        prefersReducedMotion() ? target : 0,
    );

    useEffect(() => {
        const node = element.current;

        if (!node || prefersReducedMotion()) {
            setValue(target);

            return;
        }

        let frame = 0;

        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) {
                return;
            }

            observer.disconnect();

            const started = performance.now();
            const duration = 1200;

            const tick = (now: number) => {
                const progress = Math.min(1, (now - started) / duration);

                setValue(Math.round(target * (1 - (1 - progress) ** 3)));

                if (progress < 1) {
                    frame = requestAnimationFrame(tick);
                }
            };

            frame = requestAnimationFrame(tick);
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [target, element]);

    return value;
}
