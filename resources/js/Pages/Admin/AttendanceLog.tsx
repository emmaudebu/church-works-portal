import Avatar from '@/Components/Avatar';
import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Download } from 'lucide-react';
import { useState } from 'react';

type ServiceOption = {
    id: number;
    label: string;
    attendance_count: number;
};

type Entry = {
    position: number;
    id: number;
    full_name: string;
    member_id: string | null;
    unit: string | null;
    phone: string | null;
    photo_url: string | null;
    time: string;
    method: string;
    recorded_by: string | null;
};

const inputClass =
    'mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

export default function AttendanceLog({
    services,
    service,
    entries,
}: {
    services: ServiceOption[];
    service: {
        id: number;
        title: string;
        date_label: string;
        window: string;
        department: string;
    } | null;
    entries: Entry[];
}) {
    const [search, setSearch] = useState('');

    const term = search.trim().toLowerCase();
    const shown = term
        ? entries.filter((entry) =>
              [entry.full_name, entry.member_id, entry.unit, entry.phone]
                  .filter(Boolean)
                  .some((value) => value!.toLowerCase().includes(term)),
          )
        : entries;

    const choose = (id: string) =>
        router.get(
            route('admin.attendance-log'),
            { service: id },
            { preserveScroll: true, replace: true },
        );

    return (
        <AdminLayout>
            <Head title="Attendance Log" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Attendance Log</h1>
                    <div className="gold-rule" />
                </div>
                {service && entries.length > 0 && (
                    <a
                        href={route('admin.attendance-log.export', service.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        <Download
                            size={20}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                        Excel
                    </a>
                )}
            </div>

            {!service ? (
                <div className="mt-6">
                    <EmptyState
                        icon={ClipboardList}
                        message="No service has started yet."
                    />
                </div>
            ) : (
                <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium">
                            Service
                            <select
                                value={service.id}
                                onChange={(e) => choose(e.target.value)}
                                className={inputClass}
                            >
                                {!services.some(
                                    (option) => option.id === service.id,
                                ) && (
                                    <option value={service.id}>
                                        {service.title}
                                    </option>
                                )}
                                {services.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label} (
                                        {option.attendance_count})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-sm font-medium">
                            Search
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Name, member ID, unit or phone"
                                className={inputClass}
                            />
                        </label>
                    </div>

                    <section className="card mt-6 p-4 sm:p-6">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                                <h2 className="text-xl">{service.title}</h2>
                                <p className="text-sm text-neutral-600">
                                    {service.date_label} · {service.window} ·{' '}
                                    {service.department}
                                </p>
                            </div>
                            <p className="text-sm font-semibold tabular-nums">
                                {entries.length} clocked in
                            </p>
                        </div>

                        {entries.length === 0 ? (
                            <div className="mt-4">
                                <EmptyState
                                    icon={ClipboardList}
                                    message="Nobody clocked in to this service."
                                />
                            </div>
                        ) : shown.length === 0 ? (
                            <p className="mt-6 text-sm text-neutral-600">
                                No one matches “{search}”.
                            </p>
                        ) : (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-neutral-200 text-neutral-600">
                                            <th
                                                scope="col"
                                                className="p-2 font-medium"
                                            >
                                                #
                                            </th>
                                            <th
                                                scope="col"
                                                className="p-2 font-medium"
                                            >
                                                Member
                                            </th>
                                            <th
                                                scope="col"
                                                className="hidden p-2 font-medium sm:table-cell"
                                            >
                                                Unit
                                            </th>
                                            <th
                                                scope="col"
                                                className="hidden p-2 font-medium md:table-cell"
                                            >
                                                Phone
                                            </th>
                                            <th
                                                scope="col"
                                                className="p-2 font-medium"
                                            >
                                                Time in
                                            </th>
                                            <th
                                                scope="col"
                                                className="hidden p-2 font-medium sm:table-cell"
                                            >
                                                Method
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shown.map((entry) => (
                                            <tr
                                                key={entry.id}
                                                className="even:bg-neutral-50"
                                            >
                                                <td className="p-2 tabular-nums text-neutral-600">
                                                    {entry.position}
                                                </td>
                                                <td className="p-2">
                                                    <Link
                                                        href={route(
                                                            'admin.members.show',
                                                            entry.id,
                                                        )}
                                                        className="flex items-center gap-3 hover:text-primary-700 [&>:first-child]:shrink-0"
                                                    >
                                                        <Avatar
                                                            name={
                                                                entry.full_name
                                                            }
                                                            src={
                                                                entry.photo_url
                                                            }
                                                        />
                                                        <span>
                                                            <span className="block font-medium">
                                                                {
                                                                    entry.full_name
                                                                }
                                                            </span>
                                                            <span className="block text-xs tabular-nums text-neutral-600">
                                                                {
                                                                    entry.member_id
                                                                }
                                                                {entry.unit && (
                                                                    <span className="sm:hidden">
                                                                        {entry.member_id &&
                                                                            ' · '}
                                                                        {
                                                                            entry.unit
                                                                        }
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </span>
                                                    </Link>
                                                </td>
                                                <td className="hidden p-2 sm:table-cell">
                                                    {entry.unit ?? '—'}
                                                </td>
                                                <td className="hidden p-2 tabular-nums md:table-cell">
                                                    {entry.phone ? (
                                                        <a
                                                            href={`tel:${entry.phone}`}
                                                            className="hover:text-primary-700"
                                                        >
                                                            {entry.phone}
                                                        </a>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap p-2 font-semibold tabular-nums">
                                                    {entry.time}
                                                    <span className="block text-xs font-normal text-neutral-600 sm:hidden">
                                                        {entry.method}
                                                    </span>
                                                </td>
                                                <td className="hidden p-2 sm:table-cell">
                                                    <Badge
                                                        variant={
                                                            entry.method ===
                                                            'Manual'
                                                                ? 'gold'
                                                                : 'success'
                                                        }
                                                    >
                                                        {entry.method}
                                                    </Badge>
                                                    {entry.method ===
                                                        'Manual' &&
                                                        entry.recorded_by && (
                                                            <span className="mt-1 block text-xs text-neutral-600">
                                                                by{' '}
                                                                {
                                                                    entry.recorded_by
                                                                }
                                                            </span>
                                                        )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </AdminLayout>
    );
}
