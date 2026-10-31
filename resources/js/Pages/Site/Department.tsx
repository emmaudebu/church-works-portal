import Badge from '@/Components/Badge';
import DepartmentCard from '@/Components/DepartmentCard';
import PostCard from '@/Components/PostCard';
import CountUp from '@/Components/Site/CountUp';
import Gallery from '@/Components/Site/Gallery';
import PageHero from '@/Components/Site/PageHero';
import SectionHeading from '@/Components/Site/SectionHeading';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    Department as DepartmentData,
    GalleryImage,
    PostCard as PostCardData,
} from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Department({
    department,
    units,
    gallery,
    events,
    news,
    others,
}: {
    department: DepartmentData;
    units: string[];
    gallery: GalleryImage[];
    events: PostCardData[];
    news: PostCardData[];
    others: DepartmentData[];
}) {
    const active = department.status === 'active';

    return (
        <PublicLayout>
            <Head title={department.name} />

            <PageHero
                image={department.image_url}
                eyebrow={department.description ?? 'Department'}
                title={department.name}
            >
                <div className="mt-4">
                    {active ? (
                        <Badge variant="success">Active</Badge>
                    ) : (
                        <Badge variant="gold">Coming Soon</Badge>
                    )}
                </div>
            </PageHero>

            <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-8 lg:grid-cols-[2fr_1fr]">
                <div className="reveal">
                    <p className="eyebrow">About</p>
                    <h2 className="mt-2 text-3xl">
                        {active
                            ? 'What we do'
                            : 'This department opens soon'}
                    </h2>
                    <p className="mt-4 whitespace-pre-line text-lg text-neutral-600">
                        {department.about ??
                            department.description ??
                            'More about this department is coming soon.'}
                    </p>

                    {units.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-xl">Our units</h3>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {units.map((unit) => (
                                    <li
                                        key={unit}
                                        className="rounded-full bg-primary-50 px-4 py-1.5 text-sm font-medium"
                                    >
                                        {unit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <aside className="reveal self-start rounded-2xl bg-charcoal-900 p-6 text-white">
                    {active ? (
                        <>
                            <p className="font-serif text-5xl tabular-nums text-gold-300">
                                <CountUp value={department.members_count} />
                            </p>
                            <p className="text-sm text-silver-300">
                                {department.members_count === 1
                                    ? 'member serving'
                                    : 'members serving'}
                            </p>
                            <Link
                                href={route('register')}
                                className="mt-6 inline-block rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                            >
                                Join this department
                            </Link>
                        </>
                    ) : (
                        <p className="text-sm text-silver-300">
                            Registration opens when this department goes live.
                        </p>
                    )}
                </aside>
            </section>

            {gallery.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
                    <SectionHeading
                        eyebrow="Moments"
                        title="Our"
                        accent="Gallery"
                    />
                    <Gallery images={gallery} />
                </section>
            )}

            {events.length > 0 && (
                <section className="bg-neutral-50 py-16">
                    <div className="mx-auto max-w-7xl px-4 md:px-8">
                        <SectionHeading
                            eyebrow="Coming up"
                            title="Upcoming"
                            accent="Events"
                        />
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {events.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {news.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
                    <SectionHeading
                        eyebrow="From the department"
                        title="Latest"
                        accent="News"
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {news.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                </section>
            )}

            {others.length > 0 && (
                <section className="bg-neutral-50 py-16">
                    <div className="mx-auto max-w-7xl px-4 md:px-8">
                        <SectionHeading
                            eyebrow="Keep exploring"
                            title="Other"
                            accent="Departments"
                        />
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {others.map((item) => (
                                <DepartmentCard
                                    key={item.id}
                                    department={item}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}
