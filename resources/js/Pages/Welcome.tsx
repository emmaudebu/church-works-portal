import DepartmentCard from '@/Components/DepartmentCard';
import EmptyState from '@/Components/EmptyState';
import PostCard from '@/Components/PostCard';
import PublicLayout from '@/Layouts/PublicLayout';
import { Department, PostCard as PostCardData } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Newspaper } from 'lucide-react';

export default function Welcome({
    departments,
    posts,
}: {
    departments: Department[];
    posts: PostCardData[];
}) {
    return (
        <PublicLayout>
            <Head title="Serving with Excellence" />

            <section className="bg-hero px-4 py-20 text-center text-white md:px-8 md:py-28">
                <h1 className="text-4xl font-bold md:text-5xl">
                    Serving with Excellence
                </h1>
                <div className="mx-auto mt-4 h-0.5 w-16 bg-gold-500" />
                <p className="mx-auto mt-4 max-w-xl text-lg text-white">
                    Members, attendance, events and elections in one place
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                        href={route('register')}
                        className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                    >
                        Register
                    </Link>
                    <Link
                        href={route('login')}
                        className="rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                    >
                        Login
                    </Link>
                </div>
            </section>

            <section
                id="departments"
                className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14 md:px-8"
            >
                <h2 className="text-3xl">Our Departments</h2>
                <div className="gold-rule mb-8" />
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((department) => (
                        <DepartmentCard
                            key={department.id}
                            department={department}
                        />
                    ))}
                </div>
            </section>

            <section className="bg-neutral-50">
                <div
                    id="news"
                    className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14 md:px-8"
                >
                    <h2 className="text-3xl">News and Events</h2>
                    <div className="gold-rule mb-8" />
                    {posts.length === 0 ? (
                        <EmptyState
                            icon={Newspaper}
                            message="News and events will appear here soon."
                        />
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}
