import AttendanceChart from '@/Components/AttendanceChart';
import Avatar from '@/Components/Avatar';
import BestMemberCard, { BestMember } from '@/Components/BestMemberCard';
import BestMemberCriteria, { Criteria } from '@/Components/BestMemberCriteria';
import ReceiptReviews, { Review } from '@/Components/Payments/ReceiptReviews';
import AdminLayout from '@/Layouts/AdminLayout';
import { CheckedInMember, PageProps, TrendPoint } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    CalendarCheck,
    Hourglass,
    LucideIcon,
    ScanLine,
    ShieldOff,
    UserCheck,
    Users,
} from 'lucide-react';
import { PropsWithChildren } from 'react';

function StatCard({
    label,
    value,
    icon: Icon,
    href,
}: {
    label: string;
    value: number | string;
    icon: LucideIcon;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
        >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-50 text-primary-700">
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span>
                <span className="block text-3xl font-semibold tabular-nums">
                    {value}
                </span>
                <span className="text-sm text-neutral-600">{label}</span>
            </span>
        </Link>
    );
}

function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

export default function Dashboard({
    stats,
    trend,
    absentees,
    recent,
    reviews,
    bestMembers,
    bestMemberCriteria,
}: {
    stats: {
        total: number;
        active: number;
        suspended: number;
        pending: number;
        today: number | null;
    };
    trend: TrendPoint[];
    absentees: {
        id: number;
        full_name: string;
        unit: string | null;
        missed: number;
    }[];
    recent: CheckedInMember[];
    reviews: Review[];
    bestMembers: BestMember[];
    bestMemberCriteria: Criteria | null;
}) {
    const { office, permissions } = usePage<PageProps>().props.auth.user;
    const heading = office ? `Welcome, ${office}` : 'Admin Dashboard';

    const members = (status?: string) =>
        route('admin.members', status ? { status } : {});

    return (
        <AdminLayout>
            <Head title={heading} />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">{heading}</h1>
                    <div className="gold-rule" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {permissions.includes('take_attendance') && (
                        <Link
                            href={route('admin.scanner')}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            <ScanLine
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                            Start attendance
                        </Link>
                    )}
                    {permissions.includes('manage_posts') && (
                        <Link
                            href={route('admin.posts.create')}
                            className="inline-flex items-center rounded-lg border border-primary-700 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            New post
                        </Link>
                    )}
                    {permissions.includes('manage_elections') && (
                        <Link
                            href={route('admin.elections')}
                            className="inline-flex items-center rounded-lg border border-primary-700 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            New election
                        </Link>
                    )}
                </div>
            </div>

            {reviews.length > 0 && (
                <div className="mt-6">
                    <ReceiptReviews reviews={reviews} />
                </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                    label="Total members"
                    value={stats.total}
                    icon={Users}
                    href={members()}
                />
                <StatCard
                    label="Active"
                    value={stats.active}
                    icon={UserCheck}
                    href={members('active')}
                />
                <StatCard
                    label="Suspended"
                    value={stats.suspended}
                    icon={ShieldOff}
                    href={members('suspended')}
                />
                <StatCard
                    label="Today's attendance"
                    value={stats.today === null ? '—' : `${stats.today}%`}
                    icon={CalendarCheck}
                    href={route('admin.reports')}
                />
                <StatCard
                    label="Pending approvals"
                    value={stats.pending}
                    icon={Hourglass}
                    href={members('pending')}
                />
            </div>

            {bestMembers.length > 0 && (
                <div className="mt-6">
                    <Panel title="Best members">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {bestMembers.map((winner) => (
                                <BestMemberCard
                                    key={winner.id}
                                    winner={winner}
                                />
                            ))}
                        </div>
                    </Panel>
                </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <Panel title="Attendance trend, last 12 weeks">
                        {trend.length === 0 ? (
                            <p className="text-sm text-neutral-600">
                                The trend appears after the first service.
                            </p>
                        ) : (
                            <AttendanceChart data={trend} />
                        )}
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Absentee alerts">
                        {absentees.length === 0 ? (
                            <p className="text-sm text-neutral-600">
                                Nobody has missed 3 service days in a row.
                            </p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {absentees.map((member) => (
                                    <li
                                        key={member.id}
                                        className="flex justify-between gap-3"
                                    >
                                        <Link
                                            href={route(
                                                'admin.members.show',
                                                member.id,
                                            )}
                                            className="truncate font-medium hover:text-primary-700"
                                        >
                                            {member.full_name}
                                        </Link>
                                        <span className="shrink-0 tabular-nums text-danger">
                                            Missed {member.missed} days
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Recent check-ins">
                        {recent.length === 0 ? (
                            <p className="text-sm text-neutral-600">
                                No check-ins yet.
                            </p>
                        ) : (
                            <ul className="space-y-3 text-sm">
                                {recent.map((member) => (
                                    <li
                                        key={member.attendance_id}
                                        className="flex items-center gap-3"
                                    >
                                        <Avatar
                                            name={member.full_name}
                                            src={member.photo_url}
                                        />
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">
                                                {member.full_name}
                                            </span>
                                            <span className="text-neutral-600">
                                                {member.checked_in_at}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                </div>
            </div>

            {bestMemberCriteria && (
                <div className="mt-6">
                    <BestMemberCriteria criteria={bestMemberCriteria} />
                </div>
            )}
        </AdminLayout>
    );
}
