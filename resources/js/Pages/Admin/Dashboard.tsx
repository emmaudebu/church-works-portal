import AttendanceChart from '@/Components/AttendanceChart';
import Avatar from '@/Components/Avatar';
import AdminLayout from '@/Layouts/AdminLayout';
import { CheckedInMember, TrendPoint } from '@/types';
import { Head, Link } from '@inertiajs/react';
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
}) {
    const members = (status?: string) =>
        route('admin.members', status ? { status } : {});

    return (
        <AdminLayout>
            <Head title="Admin Dashboard" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Admin Dashboard</h1>
                    <div className="gold-rule" />
                </div>
                <Link
                    href={route('admin.scanner')}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                >
                    <ScanLine size={20} strokeWidth={1.75} aria-hidden="true" />
                    Start attendance
                </Link>
            </div>

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
                                Nobody has missed 3 services in a row.
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
                                            Missed {member.missed}
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
        </AdminLayout>
    );
}
