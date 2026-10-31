import EmptyState from '@/Components/EmptyState';
import Pagination, { PageLink } from '@/Components/Pagination';
import PostCard from '@/Components/PostCard';
import MemberLayout from '@/Layouts/MemberLayout';
import { PostCard as PostCardData } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { useState } from 'react';

const TABS = [
    { label: 'All', type: null },
    { label: 'News', type: 'news' },
    { label: 'Events', type: 'event' },
    { label: 'Announcements', type: 'announcement' },
];

type CalendarEvent = { id: number; title: string; date: string };

function EventsCalendar({ events }: { events: CalendarEvent[] }) {
    const today = new Date();
    const [shown, setShown] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1),
    );

    const year = shown.getFullYear();
    const month = shown.getMonth();
    const offset = new Date(year, month, 1).getDay();
    const length = new Date(year, month + 1, 0).getDate();

    const dateKey = (day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return (
        <section className="card mb-4 p-4">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setShown(new Date(year, month - 1, 1))}
                    className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ChevronLeft size={20} strokeWidth={1.75} />
                </button>
                <h2 className="text-xl">
                    {shown.toLocaleString('en', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </h2>
                <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setShown(new Date(year, month + 1, 1))}
                    className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ChevronRight size={20} strokeWidth={1.75} />
                </button>
            </div>

            <ul
                aria-hidden="true"
                className="mt-2 grid grid-cols-7 text-center text-xs text-neutral-600"
            >
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <li key={index}>{day}</li>
                ))}
            </ul>
            <ul className="mt-1 grid grid-cols-7 gap-1 text-sm tabular-nums">
                {Array.from({ length: offset }, (_, index) => (
                    <li key={`blank-${index}`} aria-hidden="true" />
                ))}
                {Array.from({ length }, (_, index) => {
                    const day = index + 1;
                    const event = events.find(
                        (item) => item.date === dateKey(day),
                    );

                    return (
                        <li
                            key={day}
                            className="flex aspect-square items-center justify-center"
                        >
                            {event ? (
                                <Link
                                    href={route('posts.show', event.id)}
                                    title={event.title}
                                    aria-label={`${day}: ${event.title}`}
                                    className="flex h-full w-full items-center justify-center rounded-lg bg-primary-700 font-semibold text-white ring-2 ring-gold-500 focus:outline-none focus-visible:ring-primary-900"
                                >
                                    {day}
                                </Link>
                            ) : (
                                <span className="text-neutral-600">{day}</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

export default function Feed({
    type,
    posts,
    calendar,
}: {
    type: string | null;
    posts: { data: PostCardData[]; links: PageLink[] };
    calendar: CalendarEvent[];
}) {
    return (
        <MemberLayout>
            <Head title="News & Events" />

            <h1 className="text-3xl">News &amp; Events</h1>
            <div className="gold-rule mb-4" />

            <nav
                aria-label="Post types"
                className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1"
            >
                {TABS.map((tab) => (
                    <Link
                        key={tab.label}
                        href={route(
                            'member.events',
                            tab.type ? { type: tab.type } : {},
                        )}
                        aria-current={type === tab.type ? 'page' : undefined}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                            type === tab.type
                                ? 'bg-primary-700 text-white'
                                : 'bg-white text-neutral-600'
                        }`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </nav>

            {type === 'event' && <EventsCalendar events={calendar} />}

            {posts.data.length === 0 ? (
                <EmptyState icon={Newspaper} message="Nothing here yet." />
            ) : (
                <div className="space-y-3">
                    {posts.data.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
            )}

            <Pagination links={posts.links} />
        </MemberLayout>
    );
}
