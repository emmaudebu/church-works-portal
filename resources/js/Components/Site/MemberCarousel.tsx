import Avatar from '@/Components/Avatar';
import { prefersReducedMotion } from '@/lib/motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type TeamMember = {
    id: number;
    full_name: string;
    unit: string | null;
    photo_url: string | null;
};

const ADVANCE_MS = 3500;

export default function MemberCarousel({ members }: { members: TeamMember[] }) {
    const track = useRef<HTMLUListElement>(null);
    const [paused, setPaused] = useState(false);

    const move = (direction: 1 | -1) => {
        const element = track.current;

        if (!element) {
            return;
        }

        const card = element.querySelector('li');
        const step = (card?.getBoundingClientRect().width ?? 200) + 20;
        const atEnd =
            element.scrollLeft + element.clientWidth >= element.scrollWidth - 8;

        element.scrollTo({
            left:
                direction === 1 && atEnd
                    ? 0
                    : element.scrollLeft + step * direction,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
    };

    useEffect(() => {
        if (paused || prefersReducedMotion()) {
            return;
        }

        const timer = setInterval(() => {
            if (!document.hidden) {
                move(1);
            }
        }, ADVANCE_MS);

        return () => clearInterval(timer);
    }, [paused]);

    return (
        <div
            role="group"
            aria-roledescription="carousel"
            aria-label="Department members"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <ul
                ref={track}
                tabIndex={0}
                aria-label="Members list. Use the arrow buttons or scroll."
                className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 [&::-webkit-scrollbar]:hidden"
            >
                {members.map((member) => (
                    <li
                        key={member.id}
                        className="group w-44 shrink-0 snap-start sm:w-52"
                    >
                        <div className="card h-full p-5 text-center transition duration-300 group-hover:-translate-y-1">
                            <Avatar
                                name={member.full_name}
                                src={member.photo_url}
                                className="mx-auto h-24 w-24 text-2xl transition duration-300 group-hover:scale-105 sm:h-28 sm:w-28"
                            />
                            <p className="mt-4 font-serif text-lg font-semibold leading-snug">
                                {member.full_name}
                            </p>
                            {member.unit && (
                                <p className="mt-1 text-sm text-primary-700">
                                    {member.unit}
                                </p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            <div className="mt-2 flex justify-center gap-2">
                <button
                    type="button"
                    aria-label="Previous members"
                    onClick={() => move(-1)}
                    className="rounded-full border border-primary-700 p-2.5 text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ArrowLeft size={20} strokeWidth={1.75} />
                </button>
                <button
                    type="button"
                    aria-label="Next members"
                    onClick={() => move(1)}
                    className="rounded-full border border-primary-700 p-2.5 text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ArrowRight size={20} strokeWidth={1.75} />
                </button>
            </div>
        </div>
    );
}
