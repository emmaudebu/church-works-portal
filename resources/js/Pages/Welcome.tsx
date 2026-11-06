import DepartmentCard from '@/Components/DepartmentCard';
import EmptyState from '@/Components/EmptyState';
import PostCard from '@/Components/PostCard';
import BestMemberSpotlight, {
    Spotlight,
} from '@/Components/Site/BestMemberSpotlight';
import Countdown from '@/Components/Site/Countdown';
import CountUp from '@/Components/Site/CountUp';
import FloatingShapes from '@/Components/Site/FloatingShapes';
import HeroSlider from '@/Components/Site/HeroSlider';
import SectionHeading from '@/Components/Site/SectionHeading';
import UnitGrid from '@/Components/Site/UnitGrid';
import PublicLayout from '@/Layouts/PublicLayout';
import {
    Department,
    HomeContent,
    PageProps,
    PostCard as PostCardData,
} from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Clock, MapPin, Newspaper } from 'lucide-react';

type NextService = {
    title: string;
    date_label: string;
    time: string;
    opens_at: string;
};

function ArrowLink({ href, label }: { href: string; label: string }) {
    const external = href.startsWith('http');
    const Anchor = external ? 'a' : Link;

    return (
        <Anchor
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="group inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
        >
            {label}
            <ArrowRight
                size={16}
                strokeWidth={1.75}
                aria-hidden="true"
                className="transition group-hover:translate-x-1"
            />
        </Anchor>
    );
}

function SpotlightCard({ post, label }: { post: PostCardData; label: string }) {
    return (
        <div className="p-6 md:p-8">
            <p className="eyebrow">{label}</p>
            <div className="mt-4 flex items-start gap-4">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-t-full bg-primary-900 px-1 pb-2 pt-4 text-white">
                    <span className="font-serif text-2xl leading-none tabular-nums text-gold-300">
                        {post.day}
                    </span>
                    <span className="mt-1 text-xs uppercase tracking-wider">
                        {post.month}
                    </span>
                </div>
                <div className="min-w-0">
                    <Link
                        href={route('posts.show', post.id)}
                        className="font-serif text-xl font-semibold leading-snug hover:text-primary-700 focus:outline-none focus-visible:underline"
                    >
                        {post.title}
                    </Link>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                            <Clock
                                size={16}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                            {post.date_label}
                        </span>
                        {post.venue && (
                            <span className="inline-flex items-center gap-1">
                                <MapPin
                                    size={16}
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                {post.venue}
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <p className="mt-3 text-sm text-neutral-600">{post.excerpt}</p>
        </div>
    );
}

export default function Welcome({
    home,
    units,
    bestMember,
    departments,
    posts,
    nextService,
    nextEvent,
    latestNews,
    serviceTimes,
    stats,
}: {
    home: HomeContent;
    units: string[];
    bestMember: Spotlight | null;
    departments: Department[];
    posts: PostCardData[];
    nextService: NextService | null;
    nextEvent: PostCardData | null;
    latestNews: PostCardData | null;
    serviceTimes: { key: string; title: string; day: string; time: string }[];
    stats: {
        members: number;
        departments: number;
        units: number;
        services: number;
    };
}) {
    const { auth, singleDepartment } = usePage<PageProps>().props;
    const { user } = auth;

    const topBar = nextService && (
        <div className="hidden border-b border-white/15 md:block">
            <p className="mx-auto max-w-7xl px-8 py-2 text-xs">
                <span className="text-gold-300">Next gathering</span>{' '}
                <strong className="font-semibold">{nextService.title}</strong>{' '}
                {nextService.date_label}, {nextService.time}
            </p>
        </div>
    );

    const spotlight = [
        nextEvent && { post: nextEvent, label: 'Next event' },
        latestNews && { post: latestNews, label: 'Latest news' },
    ].filter((item) => !!item);

    return (
        <PublicLayout topBar={topBar}>
            <Head title="Serving with Excellence">
                <link
                    rel="preload"
                    as="image"
                    href={home.slides[0].image}
                />
            </Head>

            <HeroSlider
                slides={home.slides}
                actions={
                    user ? (
                        <Link
                            href={route('dashboard')}
                            className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            Go to my dashboard
                            <ArrowRight
                                size={16}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                        </Link>
                    ) : (
                    <>
                        <Link
                            href={route('register')}
                            className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            Register
                            <ArrowRight
                                size={16}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                        </Link>
                        <Link
                            href={route('login')}
                            className="rounded-full border border-white/60 px-6 py-3 text-sm font-semibold transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            Login
                        </Link>
                    </>
                    )
                }
                aside={
                    nextService && (
                        <aside className="animate-float rounded-2xl border border-white/15 bg-charcoal-900/70 p-5 backdrop-blur">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                                Next gathering
                            </p>
                            <p className="mt-2 font-serif text-2xl">
                                {nextService.title}
                            </p>
                            <p className="text-sm text-silver-300">
                                {nextService.date_label}, {nextService.time}
                            </p>
                            <div className="mt-4">
                                <Countdown to={nextService.opens_at} />
                            </div>
                        </aside>
                    )
                }
            />

            {spotlight.length > 0 && (
                <div className="relative z-10 mx-auto -mt-16 max-w-7xl px-4 md:-mt-24 md:px-8">
                    <div
                        className={`reveal card grid divide-y divide-neutral-200 md:divide-x md:divide-y-0 ${
                            spotlight.length > 1 ? 'md:grid-cols-2' : ''
                        }`}
                    >
                        {spotlight.map((item) => (
                            <SpotlightCard key={item.label} {...item} />
                        ))}
                    </div>
                </div>
            )}

            <section className="relative overflow-hidden">
                <FloatingShapes />
                <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:px-8 lg:grid-cols-2">
                <div className="reveal relative mx-auto w-full max-w-md lg:mx-0">
                    <img
                        src={home.welcome.image}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/5] w-4/5 rounded-t-full object-cover shadow-soft"
                    />
                    <div className="absolute right-0 top-10 flex h-32 w-32 animate-pulse flex-col items-center justify-center rounded-full bg-primary-700 text-center text-white ring-4 ring-gold-500/40">
                        <span className="font-serif text-3xl tabular-nums">
                            <CountUp value={stats.members} />
                        </span>
                        <span className="px-3 text-[10px] uppercase leading-tight tracking-wider">
                            Team members
                        </span>
                    </div>
                    <img
                        src={home.welcome.small_image}
                        alt=""
                        loading="lazy"
                        className="absolute -bottom-6 right-2 h-40 w-40 animate-float rounded-full border-4 border-white object-cover shadow-soft"
                    />
                </div>
                <div className="reveal">
                    <p className="eyebrow">{home.welcome.eyebrow}</p>
                    <h2 className="mt-2 text-4xl leading-tight md:text-5xl">
                        {home.welcome.title}{' '}
                        <em className="font-medium text-primary-700">
                            {home.welcome.accent}
                        </em>
                    </h2>
                    <p className="mt-5 whitespace-pre-line text-neutral-600">
                        {home.welcome.text}
                    </p>
                    <dl className="mt-8 grid grid-cols-3 divide-x divide-neutral-200 border-y border-neutral-200">
                        {[
                            [stats.members, 'Members'],
                            singleDepartment
                                ? [stats.units, 'Technical units']
                                : [stats.departments, 'Departments'],
                            [stats.services, 'Services a week'],
                        ].map(([value, label]) => (
                            <div key={label} className="px-3 py-4 first:pl-0">
                                <dt className="sr-only">{label}</dt>
                                <dd className="font-serif text-3xl tabular-nums">
                                    <CountUp value={Number(value)} />
                                </dd>
                                <p className="text-sm text-neutral-600">
                                    {label}
                                </p>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-8">
                        <ArrowLink
                            href={home.welcome.button_link}
                            label={home.welcome.button_label}
                        />
                    </div>
                </div>
                </div>
            </section>

            {singleDepartment && units.length > 0 && (
                <section
                    className="relative overflow-hidden py-20 text-white"
                    style={{ backgroundColor: home.units.overlay_color }}
                >
                    {home.units.image && (
                        <>
                            <img
                                src={home.units.image}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div
                                aria-hidden="true"
                                className="absolute inset-0"
                                style={{
                                    backgroundColor: home.units.overlay_color,
                                    opacity: home.units.overlay_opacity / 100,
                                }}
                            />
                        </>
                    )}
                    <div className="relative mx-auto max-w-7xl px-4 md:px-8">
                        <div className="reveal mb-10 max-w-2xl">
                            {home.units.eyebrow && (
                                <p className="eyebrow text-gold-300">
                                    {home.units.eyebrow}
                                </p>
                            )}
                            <h2 className="mt-2 text-4xl leading-tight text-white">
                                {home.units.title}{' '}
                                <em className="font-medium text-gold-300">
                                    {home.units.accent}
                                </em>
                            </h2>
                            {home.units.text && (
                                <p className="mt-4 text-silver-300">
                                    {home.units.text}
                                </p>
                            )}
                        </div>
                        <UnitGrid units={units} />
                    </div>
                </section>
            )}

            <section className="relative overflow-hidden bg-neutral-50 py-20">
                <FloatingShapes />
                <div className="relative mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[2fr_3fr]">
                    <div className="reveal">
                        <p className="eyebrow">{home.join.eyebrow}</p>
                        <h2 className="mt-2 text-4xl leading-tight">
                            {home.join.title}{' '}
                            <em className="font-medium text-primary-700">
                                {home.join.accent}
                            </em>
                        </h2>
                        <p className="mt-4 text-neutral-600">
                            {home.join.text}
                        </p>

                        {serviceTimes.length > 0 && (
                            <div className="mt-8 rounded-2xl bg-charcoal-900 p-6 text-white">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                                    Service times
                                </p>
                                <ul className="mt-4 space-y-3 text-sm">
                                    {serviceTimes.map((service) => (
                                        <li
                                            key={service.key}
                                            className="flex justify-between gap-4 border-b border-white/10 pb-3 last:border-0 last:pb-0"
                                        >
                                            <span>{service.title}</span>
                                            <span className="shrink-0 text-silver-300">
                                                {service.day}, {service.time}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <ol className="space-y-5">
                        {home.join.steps.map((step, index) => (
                            <li
                                key={index}
                                className="reveal group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 sm:flex-row"
                            >
                                <div className="relative h-44 shrink-0 overflow-hidden bg-charcoal-900 sm:h-auto sm:w-2/5">
                                    <img
                                        src={step.image}
                                        alt=""
                                        loading="lazy"
                                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                    <span className="absolute bottom-2 left-4 font-serif text-5xl italic text-white drop-shadow">
                                        0{index + 1}
                                    </span>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl">{step.title}</h3>
                                    <p className="mt-2 text-sm text-neutral-600">
                                        {step.text}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {bestMember && <BestMemberSpotlight winner={bestMember} />}

            {!singleDepartment && (
                <section className="mx-auto max-w-7xl px-4 py-20 md:px-8">
                    <SectionHeading
                        eyebrow="Serve with us"
                        title="Our"
                        accent="Departments"
                        action={
                            <ArrowLink
                                href={route('departments')}
                                label="All departments"
                            />
                        }
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {departments.map((department) => (
                            <DepartmentCard
                                key={department.id}
                                department={department}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="bg-neutral-50 py-20">
                <div className="mx-auto max-w-7xl px-4 md:px-8">
                    <SectionHeading
                        eyebrow="What's happening"
                        title="News and"
                        accent="Events"
                        action={
                            <ArrowLink href={route('news')} label="See all" />
                        }
                    />
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
