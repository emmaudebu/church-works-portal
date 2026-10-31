import Badge from '@/Components/Badge';
import DangerButton from '@/Components/DangerButton';
import EmptyState from '@/Components/EmptyState';
import Modal from '@/Components/Modal';
import Pagination, { PageLink } from '@/Components/Pagination';
import { POST_TYPE_LABELS } from '@/Components/PostCard';
import SecondaryButton from '@/Components/SecondaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';
import { useState } from 'react';

type Row = {
    id: number;
    type: keyof typeof POST_TYPE_LABELS;
    title: string;
    published: boolean;
    audience: string;
    author: string | null;
    date_label: string;
};

export default function Index({
    posts,
    filters,
}: {
    posts: { data: Row[]; links: PageLink[] };
    filters: { type?: string };
}) {
    const [deleting, setDeleting] = useState<Row | null>(null);

    const confirmDelete = () => {
        if (deleting) {
            router.delete(route('admin.posts.destroy', deleting.id), {
                preserveScroll: true,
                onSuccess: () => setDeleting(null),
            });
        }
    };

    return (
        <AdminLayout>
            <Head title="Posts" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Posts</h1>
                    <div className="gold-rule" />
                </div>
                <Link
                    href={route('admin.posts.create')}
                    className="inline-flex items-center rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                >
                    New post
                </Link>
            </div>

            <select
                aria-label="Filter by type"
                value={filters.type ?? ''}
                onChange={(e) =>
                    router.get(
                        route('admin.posts'),
                        e.target.value ? { type: e.target.value } : {},
                        { preserveState: true, replace: true },
                    )
                }
                className="mt-6 rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
            >
                <option value="">All types</option>
                <option value="news">News</option>
                <option value="event">Events</option>
                <option value="announcement">Announcements</option>
            </select>

            <div className="mt-4 max-w-4xl">
                {posts.data.length === 0 ? (
                    <EmptyState
                        icon={Newspaper}
                        message="No posts yet. Create the first one."
                    />
                ) : (
                    <ul className="space-y-3">
                        {posts.data.map((post) => (
                            <li
                                key={post.id}
                                className="card flex flex-wrap items-center gap-3 p-4"
                            >
                                <div className="min-w-0 flex-1 basis-56">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-sans text-base font-semibold">
                                            {post.title}
                                        </h2>
                                        {post.published ? (
                                            <Badge variant="success">
                                                Published
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning">
                                                Draft
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-neutral-600">
                                        {POST_TYPE_LABELS[post.type]} ·{' '}
                                        {post.audience} · {post.date_label}
                                        {post.author && ` · ${post.author}`}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={route(
                                            'admin.posts.edit',
                                            post.id,
                                        )}
                                        className="inline-flex items-center rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                    >
                                        Edit
                                    </Link>
                                    <DangerButton
                                        type="button"
                                        onClick={() => setDeleting(post)}
                                    >
                                        Delete
                                    </DangerButton>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Pagination links={posts.links} />

            <Modal
                show={deleting !== null}
                onClose={() => setDeleting(null)}
                maxWidth="md"
            >
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl">Delete this post?</h2>
                    <p className="mt-2 text-sm text-neutral-600">
                        "{deleting?.title}" will be removed for everyone. This
                        can't be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setDeleting(null)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton type="button" onClick={confirmDelete}>
                            Delete
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
