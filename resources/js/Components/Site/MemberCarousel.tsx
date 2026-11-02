import Avatar from '@/Components/Avatar';
import MemberProfileCard from '@/Components/Site/MemberProfileCard';
import { SocialNetwork } from '@/Components/Site/SocialIcon';
import { prefersReducedMotion } from '@/lib/motion';
import { ArrowLeft, ArrowRight, GalleryHorizontal, LayoutGrid } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type TeamMember = {
    id: number;
    full_name: string;
    unit: string | null;
    photo_url: string | null;
    socials: { network: SocialNetwork; url: string }[];
};

const ADVANCE_MS = 3500;

export default function MemberCarousel({
    members,
    department,
}: {
    members: TeamMember[];
    department: string;
}) {
    const track = useRef<HTMLUListElement>(null);
    const [paused, setPaused] = useState(false);
    const [selected, setSelected] = useState<TeamMember | null>(null);
    const [showGrid, setShowGrid] = useState(false);

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
        if (paused || selected || showGrid || prefersReducedMotion()) {
            return;
        }

        const timer = setInterval(() => {
            if (!document.hidden) {
                move(1);
            }
        }, ADVANCE_MS);

        return () => clearInterval(timer);
    }, [paused, selected, showGrid]);

    return (
        <div
            role="group"
            aria-roledescription={showGrid ? undefined : 'carousel'}
            aria-label="Department members"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <div className="mb-4 flex justify-end">
                <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary-700 px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    {showGrid ? (
                        <GalleryHorizontal
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    ) : (
                        <LayoutGrid
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    )}
                    {showGrid ? 'View as carousel' : 'View all as grid'}
                </button>
            </div>

            <ul
                ref={track}
                tabIndex={showGrid ? undefined : 0}
                aria-label={
                    showGrid
                        ? 'Members list'
                        : 'Members list. Use the arrow buttons or scroll.'
                }
                className={
                    showGrid
                        ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5'
                        : 'flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 [&::-webkit-scrollbar]:hidden'
                }
            >
                {members.map((member) => (
                    <li
                        key={member.id}
                        className={
                            showGrid
                                ? 'group min-w-0'
                                : 'group w-44 shrink-0 snap-start sm:w-52'
                        }
                    >
                        <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-label={`View ${member.full_name}'s profile`}
                            onClick={() => setSelected(member)}
                            className="card h-full w-full p-5 text-center transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 group-hover:-translate-y-1"
                        >
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
                            <p className="mt-2 text-xs font-medium text-neutral-600 transition group-hover:text-primary-700">
                                View profile
                            </p>
                        </button>
                    </li>
                ))}
            </ul>

            {!showGrid && (
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
            )}

            {selected && (
                <MemberProfileCard
                    member={selected}
                    department={department}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
}
