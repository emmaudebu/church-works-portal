import EmptyState from '@/Components/EmptyState';
import EventsCalendar, { CalendarEvent } from '@/Components/EventsCalendar';
import Pagination, { PageLink } from '@/Components/Pagination';
import PostCard from '@/Components/PostCard';
import MemberLayout from '@/Layouts/MemberLayout';
import { PostCard as PostCardData } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';

const TABS = [
    { label: 'All', type: null },
    { label: 'News', type: 'news' },
    { label: 'Events', type: 'event' },
    { label: 'Announcements', type: 'announcement' },
];

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
        <MemberLayout wide>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.data.map((post, index) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            featured={index === 0}
                        />
                    ))}
                </div>
            )}

            <Pagination links={posts.links} />
        </MemberLayout>
    );
}
