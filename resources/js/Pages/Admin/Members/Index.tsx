import ActionMenu, { Action } from '@/Components/ActionMenu';
import Avatar from '@/Components/Avatar';
import EmptyState from '@/Components/EmptyState';
import {
    approveMembers,
    useMemberActions,
} from '@/Components/Members/MemberActions';
import Pagination, { PageLink } from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import StatusBadge from '@/Components/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { useWhatsapp } from '@/lib/whatsapp';
import { MemberRow } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Download, Users } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Filters = { search?: string; status?: string; unit?: string };

const inputClass =
    'rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

export default function Index({
    members,
    filters,
    units,
}: {
    members: { data: MemberRow[]; links: PageLink[]; total: number };
    filters: Filters;
    units: string[];
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<number[]>([]);
    const actions = useMemberActions();
    const whatsapp = useWhatsapp();

    const apply = (changes: Filters) =>
        router.get(
            route('admin.members'),
            { ...filters, ...changes },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const submitSearch: FormEventHandler = (e) => {
        e.preventDefault();
        apply({ search });
    };

    const toggle = (id: number) =>
        setSelected(
            selected.includes(id)
                ? selected.filter((item) => item !== id)
                : [...selected, id],
        );

    const pageIds = members.data.map((member) => member.id);
    const allSelected =
        pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

    const rowActions = (member: MemberRow): Action[] => [
        { label: 'View', href: route('admin.members.show', member.id) },
        ...(member.can_manage
            ? [{ label: 'Edit', href: route('admin.members.edit', member.id) }]
            : []),
        ...(member.phone
            ? [
                  {
                      label: 'WhatsApp',
                      href: whatsapp.greeting(member.phone, member.full_name),
                      external: true,
                  },
              ]
            : []),
        ...(member.can_manage
            ? [
                  ...(member.status === 'pending'
                      ? [
                            {
                                label: 'Approve',
                                onClick: () => approveMembers([member.id]),
                            },
                        ]
                      : []),
                  member.status === 'suspended'
                      ? {
                            label: 'Reactivate',
                            onClick: () => actions.reactivate(member),
                        }
                      : {
                            label: 'Suspend',
                            danger: true,
                            onClick: () => actions.suspend(member),
                        },
                  {
                      label: 'Reset password',
                      onClick: () => actions.resetPassword(member),
                  },
              ]
            : []),
        ...(member.status === 'active'
            ? [
                  {
                      label: 'Print ID card',
                      href: route('id-card', member.id),
                      external: true,
                  },
              ]
            : []),
    ];

    const checkbox = (member: MemberRow) => (
        <input
            type="checkbox"
            aria-label={`Select ${member.full_name}`}
            checked={selected.includes(member.id)}
            onChange={() => toggle(member.id)}
            className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
        />
    );

    const nameLink = (member: MemberRow) => (
        <Link
            href={route('admin.members.show', member.id)}
            className="font-medium hover:text-primary-700 focus:outline-none focus-visible:underline"
        >
            {member.full_name}
        </Link>
    );

    return (
        <AdminLayout>
            <Head title="Members" />

            <h1 className="text-3xl">Members</h1>
            <div className="gold-rule mb-6" />

            <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={submitSearch} role="search">
                    <input
                        type="search"
                        aria-label="Search by name, phone, email or member ID"
                        placeholder="Search members"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`w-full sm:w-64 ${inputClass}`}
                    />
                </form>
                <select
                    aria-label="Filter by status"
                    value={filters.status ?? ''}
                    onChange={(e) => apply({ status: e.target.value })}
                    className={inputClass}
                >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select
                    aria-label="Filter by unit"
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
                <a
                    href={route('admin.members.export', {
                        ...filters,
                        ids: selected,
                    })}
                    className="ml-auto inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <Download size={20} strokeWidth={1.75} aria-hidden="true" />
                    {selected.length ? `Export ${selected.length}` : 'Export'}
                </a>
            </div>

            {selected.length > 0 && (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-primary-50 p-3">
                    <span className="text-sm tabular-nums">
                        {selected.length} selected
                    </span>
                    <PrimaryButton
                        type="button"
                        onClick={() =>
                            approveMembers(selected, () => setSelected([]))
                        }
                    >
                        Approve
                    </PrimaryButton>
                </div>
            )}

            <div className="mt-6">
                {members.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        message="No members match these filters."
                    />
                ) : (
                    <>
                        <div className="card hidden lg:block">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200 text-neutral-600">
                                        <th scope="col" className="w-10 p-3">
                                            <input
                                                type="checkbox"
                                                aria-label="Select all on this page"
                                                checked={allSelected}
                                                onChange={() =>
                                                    setSelected(
                                                        allSelected
                                                            ? []
                                                            : pageIds,
                                                    )
                                                }
                                                className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                                            />
                                        </th>
                                        <th scope="col" className="p-3 font-medium">
                                            Name
                                        </th>
                                        <th scope="col" className="p-3 font-medium">
                                            Phone
                                        </th>
                                        <th scope="col" className="p-3 font-medium">
                                            Unit
                                        </th>
                                        <th scope="col" className="p-3 font-medium">
                                            Status
                                        </th>
                                        <th scope="col" className="p-3 font-medium">
                                            Attendance
                                        </th>
                                        <th scope="col" className="w-12 p-3">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.data.map((member) => (
                                        <tr
                                            key={member.id}
                                            className="even:bg-neutral-50"
                                        >
                                            <td className="p-3">
                                                {checkbox(member)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        name={member.full_name}
                                                        src={member.photo_url}
                                                    />
                                                    {nameLink(member)}
                                                </div>
                                            </td>
                                            <td className="p-3 tabular-nums">
                                                {member.phone}
                                            </td>
                                            <td className="p-3">
                                                {member.unit}
                                            </td>
                                            <td className="p-3">
                                                <StatusBadge
                                                    status={member.status}
                                                />
                                            </td>
                                            <td className="p-3 tabular-nums text-neutral-600">
                                                {member.attendance_rate === null
                                                    ? '—'
                                                    : `${member.attendance_rate}%`}
                                            </td>
                                            <td className="p-3">
                                                <ActionMenu
                                                    label={`Actions for ${member.full_name}`}
                                                    actions={rowActions(member)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <ul className="space-y-3 lg:hidden">
                            {members.data.map((member) => (
                                <li
                                    key={member.id}
                                    className="card flex items-center gap-3 p-4"
                                >
                                    {checkbox(member)}
                                    <Avatar
                                        name={member.full_name}
                                        src={member.photo_url}
                                        className="h-11 w-11 shrink-0 text-sm"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate">
                                            {nameLink(member)}
                                        </div>
                                        <p className="truncate text-sm text-neutral-600">
                                            {member.unit}
                                        </p>
                                        <div className="mt-1">
                                            <StatusBadge
                                                status={member.status}
                                            />
                                        </div>
                                    </div>
                                    <ActionMenu
                                        label={`Actions for ${member.full_name}`}
                                        actions={rowActions(member)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                <Pagination links={members.links} />
            </div>

            {actions.modals}
        </AdminLayout>
    );
}
