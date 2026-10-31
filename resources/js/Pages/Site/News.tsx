import EmptyState from '@/Components/EmptyState';
import EventsCalendar, { CalendarEvent } from '@/Components/EventsCalendar';
import Pagination, { PageLink } from '@/Components/Pagination';
import PostCard from '@/Components/PostCard';
import PageHero from '@/Components/Site/PageHero';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageProps, PostCard as PostCardData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';

const PAGES: Record<
    string,
    { title: string; eyebrow: string; image: string; text: string }
> = {
    all: {
        title: 'News, Events and Announcements',
        eyebrow: "What's happening",
        image: '/images/site/gathering.jpg',
        text: 'Everything happening across the workforce.',
    },
    news: {
        title: 'News',
        eyebrow: 'Latest stories',
        image: '/images/site/congregation.jpg',
        text: 'Stories and updates from across our departments.',
    },
    event: {
        title: 'Events',
        eyebrow: 'Dates for your diary',
        image: '/images/site/stage.jpg',
        text: 'See what is coming up and add it to your calendar.',
    },
    announcement: {
        title: 'Announcements',
        eyebrow: 'For the workforce',
        image: '/images/site/sunrise.jpg',
        text: 'Important notices for members.',
    },
};

const TABS = [
    { label: 'All', type: null },
    { label: 'News', type: 'news' },
    { label: 'Events', type: 'event' },
    { label: 'Announcements', type: 'announcement' },
];

export default function News({
    type,
    posts,
    calendar,
}: {
    type: string | null;
    posts: { data: PostCardData[]; links: PageLink[]; current_page: number };
    calendar: CalendarEvent[];
}) {
    const { user } = usePage<PageProps>().props.auth;
    const page = PAGES[type ?? 'all'];

    return (
        <PublicLayout>
            <Head title={page.title} />

            <PageHero
                image={page.image}
                eyebrow={page.eyebrow}
                title={page.title}
            >
                <p className="mt-4 max-w-xl text-lg">{page.text}</p>
            </PageHero>

            <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
                <nav
                    aria-label="Post types"
                    className="mb-8 flex gap-2 overflow-x-auto pb-1"
                >
                    {TABS.map((tab) => (
                        <Link
                            key={tab.label}
                            href={route(
                                'news',
                                tab.type ? { type: tab.type } : {},
                            )}
                            aria-current={
                                type === tab.type ? 'page' : undefined
                            }
                            className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                                type === tab.type
                                    ? 'bg-primary-700 text-white'
                                    : 'bg-neutral-50 text-neutral-600'
                            }`}
                        >
                            {tab.label}
                            {tab.type === 'announcement' &&
                                !user &&
                                ' (login)'}
                        </Link>
                    ))}
                </nav>

                {type === 'event' && (
                    <div className="mx-auto max-w-lg">
                        <EventsCalendar events={calendar} />
                    </div>
                )}

                {posts.data.length === 0 ? (
                    <EmptyState icon={Newspaper} message="Nothing here yet." />
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.data.map((post, index) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                featured={
                                    index === 0 && posts.current_page === 1
                                }
                            />
                        ))}
                    </div>
                )}

                <Pagination links={posts.links} />
            </section>
        </PublicLayout>
    );
}
