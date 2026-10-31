import { POST_TYPE_LABELS } from '@/Components/PostCard';
import Badge from '@/Components/Badge';
import AccountLayout from '@/Layouts/AccountLayout';
import PublicLayout from '@/Layouts/PublicLayout';
import { PageProps, PostCard } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { CalendarPlus } from 'lucide-react';

export default function Show({ post }: { post: PostCard & { body: string } }) {
    const { user } = usePage<PageProps>().props.auth;

    const article = (
        <article className="mx-auto max-w-2xl">
            <Head title={post.title} />

            {post.image_url && (
                <img
                    src={post.image_url}
                    alt=""
                    className="mb-4 max-h-80 w-full rounded-2xl object-cover"
                />
            )}
            <Badge variant="gold">{POST_TYPE_LABELS[post.type]}</Badge>
            <h1 className="mt-2 text-3xl">{post.title}</h1>
            <div className="gold-rule" />
            <p className="mt-3 text-sm text-neutral-600">
                {post.date_label}
                {post.venue && ` · ${post.venue}`}
            </p>

            {post.type === 'event' && (
                <a
                    href={route('posts.calendar', post.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
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
                className="rich mt-6"
                dangerouslySetInnerHTML={{ __html: post.body }}
            />
        </article>
    );

    return user ? (
        <AccountLayout>{article}</AccountLayout>
    ) : (
        <PublicLayout>
            <div className="px-4 py-10 md:px-8">{article}</div>
        </PublicLayout>
    );
}
