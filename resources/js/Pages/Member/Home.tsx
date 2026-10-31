import Avatar from '@/Components/Avatar';
import PostCard from '@/Components/PostCard';
import { naira } from '@/lib/money';
import MemberLayout from '@/Layouts/MemberLayout';
import { PageProps, PostCard as PostCardData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    CalendarCheck,
    CalendarDays,
    IdCard,
    LucideIcon,
    Pencil,
    QrCode,
    Vote,
    Wallet,
} from 'lucide-react';
import { PropsWithChildren, ReactNode } from 'react';

function AttendanceRing({ rate }: { rate: number | null }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative h-28 w-28 shrink-0">
            <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="h-full w-full -rotate-90"
            >
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="9"
                    className="stroke-neutral-200"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - (rate ?? 0) / 100)}
                    className="stroke-gold-500"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums">
                {rate === null ? '—' : `${rate}%`}
            </span>
        </div>
    );
}

function Panel({
    title,
    action,
    children,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
    return (
        <section className="card p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl">{title}</h2>
                {action}
            </div>
            <div className="mt-3">{children}</div>
        </section>
    );
}

function QuickAction({
    label,
    href,
    icon: Icon,
}: {
    label: string;
    href: string;
    icon: LucideIcon;
}) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 rounded-lg bg-neutral-50 p-3 text-center text-sm font-medium transition hover:-translate-y-0.5 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 text-primary-700">
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            {label}
        </Link>
    );
}

export default function Home({
    profile,
    upcoming,
    recentCheckIns,
    month,
    nextService,
    dues,
    openElection,
    announcements,
    events,
}: {
    profile: { member_id: string | null; percent: number; missing: string[] };
    upcoming: {
        id: number;
        title: string;
        date_label: string;
        time: string;
    }[];
    recentCheckIns: {
        id: number;
        title: string;
        date_label: string;
        time: string;
    }[];
    month: { attended: number; total: number; rate: number | null };
    nextService: { title: string; date_label: string; time: string } | null;
    dues: { count: number; total: number };
    openElection: { id: number; title: string } | null;
    announcements: PostCardData[];
    events: PostCardData[];
}) {
    const { auth, branding } = usePage<PageProps>().props;
    const { user } = auth;

    return (
        <MemberLayout wide>
            <Head title="Home" />

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    <section className="bg-hero flex items-center gap-4 rounded-2xl p-6 text-white shadow-soft">
                        <Avatar
                            name={user.full_name}
                            src={user.photo_url}
                            className="h-14 w-14 shrink-0 text-lg lg:h-20 lg:w-20 lg:text-2xl"
                        />
                        <div className="min-w-0">
                            <h1 className="text-2xl lg:text-3xl">
                                Welcome back, {user.full_name.split(' ')[0]}
                            </h1>
                            <p className="text-sm text-gold-300">
                                {[user.unit, user.department]
                                    .filter(Boolean)
                                    .join(' · ') || branding.church_name}
                            </p>
                        </div>
                    </section>

                    {dues.count > 0 && (
                        <Link
                            href={route('member.payments')}
                            className="card flex items-center justify-between gap-3 border-l-2 border-warning p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            <span>
                                <span className="block font-medium">
                                    Dues owing
                                </span>
                                <span className="text-sm tabular-nums text-neutral-600">
                                    {naira(dues.total)} · {dues.count}{' '}
                                    {dues.count === 1 ? 'payment' : 'payments'}
                                </span>
                            </span>
                            <span className="text-sm font-semibold text-primary-700">
                                View
                            </span>
                        </Link>
                    )}

                    {openElection && (
                        <section className="card flex items-center justify-between gap-3 border-t-2 border-gold-500 p-5">
                            <span className="min-w-0">
                                <span className="block font-medium">
                                    {openElection.title}
                                </span>
                                <span className="text-sm text-neutral-600">
                                    Voting is open
                                </span>
                            </span>
                            <Link
                                href={route(
                                    'member.elections.show',
                                    openElection.id,
                                )}
                                className="shrink-0 rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                            >
                                Vote now
                            </Link>
                        </section>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                        <Link
                            href={route('member.attendance')}
                            className="card flex items-center gap-5 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            <AttendanceRing rate={month.rate} />
                            <span>
                                <span className="block font-serif text-xl font-semibold">
                                    This month
                                </span>
                                <span className="text-sm tabular-nums text-neutral-600">
                                    {month.attended} of {month.total} service
                                    days
                                </span>
                                <span className="mt-1 block text-sm font-medium text-primary-700">
                                    View history
                                </span>
                            </span>
                        </Link>

                        <section className="card p-5">
                            <h2 className="text-xl">Next service</h2>
                            {nextService ? (
                                <>
                                    <p className="mt-1 font-medium">
                                        {nextService.title}
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                        {nextService.date_label} ·{' '}
                                        {nextService.time}
                                    </p>
                                    <Link
                                        href={route('member.my-qr')}
                                        className="mt-3 inline-flex rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                                    >
                                        Show my QR
                                    </Link>
                                </>
                            ) : (
                                <p className="mt-1 text-sm text-neutral-600">
                                    No services scheduled yet.
                                </p>
                            )}
                        </section>
                    </div>

                    <section>
                        <h2 className="text-xl">Announcements</h2>
                        {announcements.length === 0 ? (
                            <p className="mt-2 text-sm text-neutral-600">
                                No announcements right now.
                            </p>
                        ) : (
                            <ul className="mt-2 grid gap-3 md:grid-cols-2">
                                {announcements.map((post) => (
                                    <li key={post.id}>
                                        <Link
                                            href={route('posts.show', post.id)}
                                            className="card flex h-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                        >
                                            <img
                                                src={post.image_url}
                                                alt=""
                                                loading="lazy"
                                                className="w-24 shrink-0 object-cover"
                                            />
                                            <span className="min-w-0 border-l-2 border-gold-500 p-4">
                                                <span className="block font-medium">
                                                    {post.title}
                                                </span>
                                                <span className="mt-1 block text-sm text-neutral-600">
                                                    {post.excerpt}
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    {events.length > 0 && (
                        <section>
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-xl">Upcoming events</h2>
                                <Link
                                    href={route('member.events', { type: 'event' })}
                                    className="text-sm font-medium text-primary-700 underline"
                                >
                                    See all
                                </Link>
                            </div>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                {events.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <aside className="space-y-4">
                    <section className="card border-t-2 border-gold-500 p-5">
                        <div className="flex items-center gap-3">
                            <Avatar
                                name={user.full_name}
                                src={user.photo_url}
                                className="h-14 w-14 shrink-0 text-lg"
                            />
                            <div className="min-w-0">
                                <p className="truncate font-serif text-lg font-semibold">
                                    {user.full_name}
                                </p>
                                <p className="text-sm text-neutral-600">
                                    {profile.member_id ?? 'No member ID'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex justify-between text-sm">
                                <span>Profile complete</span>
                                <span className="tabular-nums text-neutral-600">
                                    {profile.percent}%
                                </span>
                            </div>
                            <div
                                role="progressbar"
                                aria-label="Profile complete"
                                aria-valuenow={profile.percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200"
                            >
                                <div
                                    className="h-full rounded-full bg-gold-500"
                                    style={{ width: `${profile.percent}%` }}
                                />
                            </div>
                            {profile.missing.length > 0 && (
                                <p className="mt-2 text-sm text-neutral-600">
                                    Still needed: {profile.missing.join(', ')}
                                </p>
                            )}
                        </div>

                        <Link
                            href={route('profile.edit')}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            <Pencil
                                size={16}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                            Edit profile
                        </Link>
                    </section>

                    <Panel title="Quick actions">
                        <div className="grid grid-cols-3 gap-2">
                            <QuickAction
                                label="My QR"
                                href={route('member.my-qr')}
                                icon={QrCode}
                            />
                            <QuickAction
                                label="Attendance"
                                href={route('member.attendance')}
                                icon={CalendarCheck}
                            />
                            <QuickAction
                                label="Payments"
                                href={route('member.payments')}
                                icon={Wallet}
                            />
                            <QuickAction
                                label="Events"
                                href={route('member.events', { type: 'event' })}
                                icon={CalendarDays}
                            />
                            <QuickAction
                                label="Elections"
                                href={route('member.elections')}
                                icon={Vote}
                            />
                            <QuickAction
                                label="ID card"
                                href={route('id-card', user.id)}
                                icon={IdCard}
                            />
                        </div>
                    </Panel>

                    <Panel title="Upcoming services">
                        {upcoming.length === 0 ? (
                            <p className="text-sm text-neutral-600">
                                Nothing scheduled yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-neutral-200 text-sm">
                                {upcoming.map((service) => (
                                    <li
                                        key={service.id}
                                        className="flex justify-between gap-3 py-2"
                                    >
                                        <span className="min-w-0 truncate font-medium">
                                            {service.title}
                                        </span>
                                        <span className="shrink-0 text-neutral-600">
                                            {service.date_label},{' '}
                                            {service.time}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Recent check-ins">
                        {recentCheckIns.length === 0 ? (
                            <p className="text-sm text-neutral-600">
                                Your check-ins will appear here.
                            </p>
                        ) : (
                            <ul className="divide-y divide-neutral-200 text-sm">
                                {recentCheckIns.map((row) => (
                                    <li
                                        key={row.id}
                                        className="flex justify-between gap-3 py-2"
                                    >
                                        <span className="min-w-0 truncate font-medium">
                                            {row.title}
                                        </span>
                                        <span className="shrink-0 text-neutral-600">
                                            {row.date_label}, {row.time}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </aside>
            </div>

        </MemberLayout>
    );
}
