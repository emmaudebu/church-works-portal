import Badge from '@/Components/Badge';
import DepartmentCard from '@/Components/DepartmentCard';
import DepartmentIcon from '@/Components/DepartmentIcon';
import PostCard from '@/Components/PostCard';
import BestMemberSpotlight, {
    Spotlight,
} from '@/Components/Site/BestMemberSpotlight';
import CountUp from '@/Components/Site/CountUp';
import Embers from '@/Components/Site/Embers';
import Gallery from '@/Components/Site/Gallery';
import Leadership, { Officer } from '@/Components/Site/Leadership';
import MemberCarousel, { TeamMember } from '@/Components/Site/MemberCarousel';
import SectionHeading from '@/Components/Site/SectionHeading';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    Department as DepartmentData,
    GalleryImage,
    PostCard as PostCardData,
} from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

/** Shown until a department uploads pictures of its own. */
const SAMPLE_GALLERY: GalleryImage[] = [
    'worship',
    'stage',
    'auditorium',
    'praise',
    'congregation',
    'gathering',
    'surrender',
    'sunrise',
].map((name, index) => ({
    id: -index - 1,
    caption: null,
    url: `/images/site/${name}.jpg`,
}));

export default function Department({
    department,
    bestMember,
    units,
    gallery,
    officers,
    team,
    events,
    news,
    others,
}: {
    department: DepartmentData;
    bestMember: Spotlight | null;
    units: string[];
    gallery: GalleryImage[];
    officers: Officer[];
    team: TeamMember[];
    events: PostCardData[];
    news: PostCardData[];
    others: DepartmentData[];
}) {
    const active = department.status === 'active';
    const pictures = gallery.length > 0 ? gallery : SAMPLE_GALLERY;

    const aboutTitle =
        department.about_title ?? (active ? 'What we' : 'Opening');
    const aboutAccent =
        department.about_accent ??
        (department.about_title ? null : active ? 'do' : 'soon');

    const stats = [
        { label: 'Members', value: department.members_count },
        { label: 'Units', value: units.length },
        { label: 'Executives', value: officers.length },
    ];

    const sections = [
        { id: 'about', label: 'About' },
        ...(officers.length > 0 ? [{ id: 'leadership', label: 'Leadership' }] : []),
        ...(team.length > 0 ? [{ id: 'team', label: 'Members' }] : []),
        { id: 'gallery', label: 'Gallery' },
        ...(events.length > 0 ? [{ id: 'events', label: 'Events' }] : []),
        ...(news.length > 0 ? [{ id: 'news', label: 'News' }] : []),
    ];

    /** The best member always sits just before the last section. */
    const lastSection = sections[sections.length - 1].id;

    const spotlight = bestMember && <BestMemberSpotlight winner={bestMember} />;

    if (bestMember) {
        sections.splice(sections.length - 1, 0, {
            id: 'best-member',
            label: 'Best Member',
        });
    }

    return (
        <PublicLayout>
            <Head title={department.name} />

            <section className="relative overflow-hidden bg-charcoal-900 text-white">
                <img
                    src={department.image_url}
                    alt=""
                    className="absolute inset-0 h-full w-full animate-ken-burns object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/70 to-charcoal-900/40" />
                <Embers density={0.7} />

                <div className="relative mx-auto max-w-7xl animate-fade-up px-4 pb-24 pt-36 md:px-8 md:pb-32 md:pt-44">
                    <span className="flex h-14 w-14 animate-float items-center justify-center rounded-full bg-gold-50 text-primary-700 ring-4 ring-gold-500/40">
                        <DepartmentIcon name={department.icon} size={24} />
                    </span>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                        {department.description ?? 'Department'}
                    </p>
                    <h1 className="mt-2 max-w-3xl text-5xl font-medium leading-tight md:text-6xl">
                        {department.name}
                    </h1>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        {active ? (
                            <>
                                <Badge variant="success">Active</Badge>
                                <Link
                                    href={route('register')}
                                    className="group inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                                >
                                    Join this department
                                    <ArrowRight
                                        size={16}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                        className="transition group-hover:translate-x-1"
                                    />
                                </Link>
                            </>
                        ) : (
                            <Badge variant="gold">Coming Soon</Badge>
                        )}
                    </div>
                </div>
            </section>

            {active && (
                <div className="relative z-10 mx-auto -mt-14 max-w-4xl px-4 md:px-8">
                    <dl className="card reveal grid grid-cols-3 divide-x divide-neutral-200">
                        {stats.map((stat) => (
                            <div key={stat.label} className="p-4 text-center md:p-6">
                                <dd className="font-serif text-3xl tabular-nums text-primary-700 md:text-4xl">
                                    <CountUp value={stat.value} />
                                </dd>
                                <dt className="mt-1 text-sm text-neutral-600">
                                    {stat.label}
                                </dt>
                            </div>
                        ))}
                    </dl>
                </div>
            )}

            <nav
                aria-label="On this page"
                className="sticky top-16 z-20 mt-8 border-y border-neutral-200 bg-white/95 backdrop-blur"
            >
                <ul className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 md:justify-center md:px-8">
                    {sections.map((section) => (
                        <li key={section.id} className="shrink-0">
                            <a
                                href={`#${section.id}`}
                                className="block py-3 text-sm font-medium text-neutral-600 transition hover:text-primary-700 focus:outline-none focus-visible:underline"
                            >
                                {section.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            <section
                id="about"
                className="mx-auto grid max-w-7xl scroll-mt-28 items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-2"
            >
                <div className="reveal">
                    <p className="eyebrow">
                        {department.about_label ?? 'About us'}
                    </p>
                    <h2 className="mt-2 text-3xl md:text-4xl">
                        {aboutTitle}{' '}
                        <em className="font-medium text-primary-700">
                            {aboutAccent}
                        </em>
                    </h2>
                    <p className="mt-4 whitespace-pre-line text-lg text-neutral-600">
                        {department.about ??
                            department.description ??
                            'More about this department is coming soon.'}
                    </p>

                    {units.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-xl">Our units</h3>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {units.map((unit) => (
                                    <li
                                        key={unit}
                                        className="rounded-full border border-gold-500/50 bg-gold-50 px-4 py-1.5 text-sm font-medium"
                                    >
                                        {unit}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="reveal relative mx-auto w-full max-w-md">
                    <img
                        src={department.about_image_url ?? pictures[0].url}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/5] w-4/5 rounded-t-full object-cover shadow-soft"
                    />
                    <img
                        src={
                            department.about_small_image_url ??
                            pictures[1 % pictures.length].url
                        }
                        alt=""
                        loading="lazy"
                        className="absolute -bottom-4 right-0 h-40 w-40 animate-float rounded-full border-4 border-white object-cover shadow-soft"
                    />
                </div>
            </section>

            {officers.length > 0 && <Leadership officers={officers} />}

            {team.length > 0 && (
                <section
                    id="team"
                    className="scroll-mt-28 bg-neutral-50 py-16"
                >
                    <div className="mx-auto max-w-7xl px-4 md:px-8">
                        <SectionHeading
                            eyebrow="Serving together"
                            title="Meet Our"
                            accent="Members"
                        />
                        <MemberCarousel
                            members={team}
                            department={department.name}
                        />
                    </div>
                </section>
            )}

            {lastSection === 'gallery' && spotlight}

            <section
                id="gallery"
                className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 md:px-8"
            >
                <SectionHeading
                    eyebrow="Moments"
                    title="Our"
                    accent="Gallery"
                />
                <Gallery images={pictures} />
            </section>

            {lastSection === 'events' && spotlight}

            {events.length > 0 && (
                <section
                    id="events"
                    className="scroll-mt-28 bg-neutral-50 py-16"
                >
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

            {lastSection === 'news' && spotlight}

            {news.length > 0 && (
                <section
                    id="news"
                    className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 md:px-8"
                >
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
