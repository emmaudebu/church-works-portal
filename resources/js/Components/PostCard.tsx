import Badge from '@/Components/Badge';
import { PostCard as PostCardData } from '@/types';
import { Link } from '@inertiajs/react';

export const POST_TYPE_LABELS = {
    news: 'News',
    event: 'Event',
    announcement: 'Announcement',
};

export default function PostCard({ post }: { post: PostCardData }) {
    return (
        <Link
            href={route('posts.show', post.id)}
            className="card flex overflow-hidden transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
        >
            <span className="flex w-16 shrink-0 flex-col items-center justify-center border-r-2 border-gold-500 bg-primary-700 text-white">
                <span className="text-2xl font-semibold tabular-nums leading-none">
                    {post.day}
                </span>
                <span className="mt-1 text-xs uppercase text-gold-300">
                    {post.month}
                </span>
            </span>
            <span className="min-w-0 flex-1 p-4">
                <Badge variant="gold">{POST_TYPE_LABELS[post.type]}</Badge>
                <span className="mt-2 block font-serif text-lg font-semibold leading-snug">
                    {post.title}
                </span>
                <span className="mt-1 block text-sm text-neutral-600">
                    {post.excerpt}
                </span>
            </span>
        </Link>
    );
}
