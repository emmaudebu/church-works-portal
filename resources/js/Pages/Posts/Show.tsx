import Badge from '@/Components/Badge';
import PostCard, { POST_TYPE_LABELS } from '@/Components/PostCard';
import PageHero from '@/Components/Site/PageHero';
import AccountLayout from '@/Layouts/AccountLayout';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageProps, PostCard as PostCardData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { CalendarPlus, Clock, MapPin } from 'lucide-react';

export default function Show({
    post,
    related,
}: {
    post: PostCardData & { body: string };
    related: PostCardData[];
}) {
    const { user } = usePage<PageProps>().props.auth;

    const details = (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1">
                <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                {post.date_label}
            </span>
            {post.venue && (
                <span className="inline-flex items-center gap-1">
                    <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                    {post.venue}
                </span>
            )}
        </div>
    );

    const body = (
        <>
            {post.type === 'event' && (
                <a
                    href={route('posts.calendar', post.id)}
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-700 bg-white px-5 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <CalendarPlus
                        size={20}
                        strokeWidth={1.75}
                        aria-hidden="true"
                    />
                    Add to calendar
                </a>
            )}

            <div
                className="rich text-lg"
                dangerouslySetInnerHTML={{ __html: post.body }}
            />
        </>
    );

    const more = related.length > 0 && (
        <section className="mt-12">
            <h2 className="text-2xl">Read next</h2>
            <div className="gold-rule mb-6" />
            <div
                className={`grid gap-6 sm:grid-cols-2 ${user ? '' : 'lg:grid-cols-3'}`}
            >
                {related.map((item) => (
                    <PostCard key={item.id} post={item} />
                ))}
            </div>
        </section>
    );

    if (!user) {
        return (
            <PublicLayout>
                <Head title={post.title} />

                <PageHero
                    image={post.image_url}
                    eyebrow={POST_TYPE_LABELS[post.type]}
                    title={post.title}
                >
                    <div className="mt-4">{details}</div>
                </PageHero>

                <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
                    <div className="reveal mx-auto max-w-3xl">{body}</div>
                    {more}
                </div>
            </PublicLayout>
        );
    }

    return (
        <AccountLayout>
            <Head title={post.title} />

            <article className="mx-auto max-w-3xl">
                <div className="relative overflow-hidden rounded-2xl bg-charcoal-900 text-white shadow-soft">
                    <img
                        src={post.image_url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/90 via-charcoal-900/60 to-charcoal-900/20" />
                    <div className="relative p-6 pt-32">
                        <Badge variant="gold">
                            {POST_TYPE_LABELS[post.type]}
                        </Badge>
                        <h1 className="mt-2 text-3xl leading-tight">
                            {post.title}
                        </h1>
                        <div className="mt-2">{details}</div>
                    </div>
                </div>
                <div className="mt-6">{body}</div>
                {more}
            </article>
        </AccountLayout>
    );
}
