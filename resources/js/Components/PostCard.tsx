import Badge from '@/Components/Badge';
import { PostCard as PostCardData } from '@/types';
import { Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

export const POST_TYPE_LABELS = {
    news: 'News',
    event: 'Event',
    announcement: 'Announcement',
};

export default function PostCard({
    post,
    featured = false,
}: {
    post: PostCardData;
    featured?: boolean;
}) {
    return (
        <Link
            href={route('posts.show', post.id)}
            className={`reveal group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ${
                featured ? 'sm:col-span-2 md:flex-row' : ''
            }`}
        >
            <span
                className={`relative block overflow-hidden bg-charcoal-900 ${
                    featured ? 'aspect-[16/10] md:aspect-auto md:w-3/5' : 'aspect-[16/10]'
                }`}
            >
                <img
                    src={post.image_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-0 left-4 flex w-14 flex-col items-center rounded-t-full bg-primary-700 px-1 pb-1.5 pt-3 text-white">
                    <span className="font-serif text-xl leading-none tabular-nums">
                        {post.day}
                    </span>
                    <span className="mt-0.5 text-[10px] uppercase tracking-wider text-gold-300">
                        {post.month}
                    </span>
                </span>
            </span>
            <span
                className={`flex flex-1 flex-col p-5 ${featured ? 'md:justify-center md:p-8' : ''}`}
            >
                <span>
                    <Badge variant="gold">{POST_TYPE_LABELS[post.type]}</Badge>
                </span>
                <span
                    className={`mt-2 block font-serif font-semibold leading-snug ${
                        featured ? 'text-2xl md:text-3xl' : 'text-lg'
                    }`}
                >
                    {post.title}
                </span>
                <span className="mt-1 block text-sm text-neutral-600">
                    {post.excerpt}
                </span>
                {post.venue && (
                    <span className="mt-2 flex items-center gap-1 text-sm text-neutral-600">
                        <MapPin
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                        {post.venue}
                    </span>
                )}
            </span>
        </Link>
    );
}
