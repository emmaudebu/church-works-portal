import AttendanceChart from '@/Components/AttendanceChart';
import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import AdminLayout from '@/Layouts/AdminLayout';
import { TrendPoint } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BarChart3, Download } from 'lucide-react';

type Filters = {
    from: string;
    to: string;
    type: string | null;
    unit: string | null;
};

type Row = {
    id: number;
    member_id: string | null;
    full_name: string;
    unit: string | null;
    attended: number;
    total: number;
    rate: number | null;
    average_served: string | null;
    no_clock_out: number;
    group: string;
};

const inputClass =
    'mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

const GROUP_BADGES = {
    Regular: 'success',
    Occasional: 'gold',
    'Frequent absentee': 'danger',
} as const;

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="card p-4">
            <p className="text-3xl font-semibold tabular-nums">{value}</p>
            <p className="text-sm text-neutral-600">{label}</p>
        </div>
    );
}

export default function Reports({
    filters,
    summary,
    trend,
    members,
    units,
}: {
    filters: Filters;
    summary: {
        rate: number | null;
        services: number;
        regular: number;
        absentees: number;
        average_served: string | null;
        no_clock_out: number;
    };
    trend: TrendPoint[];
    members: Row[];
    units: string[];
}) {
    const apply = (changes: Partial<Filters>) =>
        router.get(
            route('admin.reports'),
            { ...filters, ...changes },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const active = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value),
    );

    const exportLink = (format: string, label: string) => (
        <a
            href={route('admin.reports.export', { format, ...active })}
            className="inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
        >
            <Download size={20} strokeWidth={1.75} aria-hidden="true" />
            {label}
        </a>
    );

    return (
        <AdminLayout>
            <Head title="Attendance Reports" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Attendance Reports</h1>
                    <div className="gold-rule" />
                </div>
                <div className="flex gap-2">
                    {exportLink('xlsx', 'Excel')}
                    {exportLink('pdf', 'PDF')}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <label className="text-sm font-medium">
                    From
                    <input
                        type="date"
                        value={filters.from}
                        onChange={(e) => apply({ from: e.target.value })}
                        className={inputClass}
                    />
                </label>
                <label className="text-sm font-medium">
                    To
                    <input
                        type="date"
                        value={filters.to}
                        onChange={(e) => apply({ to: e.target.value })}
                        className={inputClass}
                    />
                </label>
                <label className="text-sm font-medium">
                    Service
                    <select
                        value={filters.type ?? ''}
                        onChange={(e) => apply({ type: e.target.value })}
                        className={inputClass}
                    >
                        <option value="">All services</option>
                        <option value="sunday">Sunday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="special">Special</option>
                    </select>
                </label>
                <label className="text-sm font-medium">
                    Unit
                    <select
                        value={filters.unit ?? ''}
                        onChange={(e) => apply({ unit: e.target.value })}
                        className={inputClass}
                    >
                        <option value="">All units</option>
                        {units.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                <Stat
                    label="Attendance rate"
                    value={summary.rate === null ? '—' : `${summary.rate}%`}
                />
                <Stat label="Services held" value={summary.services} />
                <Stat label="Regular members" value={summary.regular} />
                <Stat label="Frequent absentees" value={summary.absentees} />
                <Stat
                    label="Average time served"
                    value={summary.average_served ?? '—'}
                />
                <Stat label="Missed clock-outs" value={summary.no_clock_out} />
            </div>

            {trend.length === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        icon={BarChart3}
                        message="No services were held in this period."
                    />
                </div>
            ) : (
                <>
                    <section className="card mt-6 p-4 sm:p-6">
                        <h2 className="text-xl">Attendance by service</h2>
                        <div className="mt-4">
                            <AttendanceChart data={trend} />
                        </div>
                    </section>

                    <section className="card mt-6 p-4 sm:p-6">
                        <h2 className="text-xl">Members</h2>
                        <table className="mt-4 w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-neutral-600">
                                    <th scope="col" className="p-2 font-medium">
                                        Name
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden p-2 font-medium sm:table-cell"
                                    >
                                        Unit
                                    </th>
                                    <th scope="col" className="p-2 text-right font-medium">
                                        Rate
                                    </th>
                                    <th
                                        scope="col"
                                        className="hidden p-2 text-right font-medium md:table-cell"
                                    >
                                        Time served
                                    </th>
                                    <th scope="col" className="p-2 font-medium">
                                        Group
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="even:bg-neutral-50"
                                    >
                                        <td className="p-2">
                                            {member.full_name}
                                        </td>
                                        <td className="hidden p-2 sm:table-cell">
                                            {member.unit}
                                        </td>
                                        <td className="p-2 text-right tabular-nums">
                                            {member.rate === null
                                                ? '—'
                                                : `${member.rate}%`}
                                            <span className="block text-xs text-neutral-600">
                                                {member.attended} of{' '}
                                                {member.total} days
                                            </span>
                                        </td>
                                        <td className="hidden p-2 text-right tabular-nums md:table-cell">
                                            {member.average_served ?? '—'}
                                            {member.no_clock_out > 0 && (
                                                <span className="block text-xs text-warning">
                                                    {member.no_clock_out} missed
                                                    clock-out
                                                    {member.no_clock_out === 1
                                                        ? ''
                                                        : 's'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            {member.group in GROUP_BADGES ? (
                                                <Badge
                                                    variant={
                                                        GROUP_BADGES[
                                                            member.group as keyof typeof GROUP_BADGES
                                                        ]
                                                    }
                                                >
                                                    {member.group}
                                                </Badge>
                                            ) : (
                                                member.group
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </>
            )}
        </AdminLayout>
    );
}
