import Avatar from '@/Components/Avatar';
import EmptyState from '@/Components/EmptyState';
import InputLabel from '@/Components/InputLabel';
import {
    approveMembers,
    useMemberActions,
} from '@/Components/Members/MemberActions';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import StatusBadge from '@/Components/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { greetingUrl } from '@/lib/whatsapp';
import { MemberRecord } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { History, MessageCircle } from 'lucide-react';
import { FormEventHandler, PropsWithChildren } from 'react';

type Log = {
    id: number;
    action: 'suspended' | 'reactivated';
    reason: string | null;
    by: string | null;
    created_at: string;
};

function titleCase(value?: string | null) {
    return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function Details({ rows }: { rows: [string, string | null | undefined][] }) {
    return (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
                <div key={label}>
                    <dt className="text-neutral-600">{label}</dt>
                    <dd className="font-medium">{value || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function Show({
    member,
    can_manage,
    logs,
    attendance,
}: {
    member: MemberRecord;
    can_manage: boolean;
    logs: Log[];
    attendance: {
        attended: number;
        total: number;
        rate: number | null;
        recent: { id: number; service: string; date: string }[];
    };
}) {
    const actions = useMemberActions();
    const profile = member.profile;

    const notes = useForm({ admin_notes: profile?.admin_notes ?? '' });

    const saveNotes: FormEventHandler = (e) => {
        e.preventDefault();

        notes.patch(route('admin.members.notes', member.id), {
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout>
            <Head title={member.full_name} />

            <div className="max-w-4xl space-y-6">
                <section className="card flex flex-wrap items-center gap-4 border-t-2 border-gold-500 p-4 sm:p-6">
                    <Avatar
                        name={member.full_name}
                        src={member.photo_url}
                        className="h-20 w-20 text-xl"
                    />
                    <div className="min-w-0 flex-1 basis-48">
                        <h1 className="text-2xl">{member.full_name}</h1>
                        <p className="text-sm text-neutral-600">
                            {member.member_id ?? 'No member ID'} ·{' '}
                            {member.department ?? 'No department'}
                        </p>
                        <div className="mt-2">
                            <StatusBadge status={member.status} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {member.phone && (
                            <a
                                href={greetingUrl(
                                    member.phone,
                                    member.full_name,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                            >
                                <MessageCircle
                                    size={20}
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                WhatsApp
                            </a>
                        )}
                        {member.status === 'active' && (
                            <a
                                href={route('id-card', member.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                            >
                                Print ID card
                            </a>
                        )}
                        {can_manage && (
                            <>
                                <Link
                                    href={route(
                                        'admin.members.edit',
                                        member.id,
                                    )}
                                    className="inline-flex items-center rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    Edit
                                </Link>
                                {member.status === 'pending' && (
                                    <PrimaryButton
                                        type="button"
                                        onClick={() =>
                                            approveMembers([member.id])
                                        }
                                    >
                                        Approve
                                    </PrimaryButton>
                                )}
                                {member.status === 'suspended' ? (
                                    <PrimaryButton
                                        type="button"
                                        onClick={() =>
                                            actions.reactivate(member)
                                        }
                                    >
                                        Reactivate
                                    </PrimaryButton>
                                ) : (
                                    <DangerButton
                                        type="button"
                                        onClick={() => actions.suspend(member)}
                                    >
                                        Suspend
                                    </DangerButton>
                                )}
                                <SecondaryButton
                                    onClick={() =>
                                        actions.resetPassword(member)
                                    }
                                >
                                    Reset password
                                </SecondaryButton>
                            </>
                        )}
                    </div>
                </section>

                {member.status === 'suspended' && member.suspension_reason && (
                    <p className="rounded-lg bg-primary-50 p-4 text-sm text-danger">
                        Suspended: {member.suspension_reason}
                    </p>
                )}

                <Section title="Personal details">
                    <Details
                        rows={[
                            ['Gender', titleCase(member.gender)],
                            ['Date of birth', member.date_of_birth],
                            ['Phone', member.phone],
                            ['Email', member.email],
                            ['Home address', member.address],
                            ['Marital status', titleCase(profile?.marital_status)],
                            ['Occupation', profile?.occupation],
                        ]}
                    />
                </Section>

                <Section title="Church details">
                    <Details
                        rows={[
                            ['Unit', member.unit],
                            ['Date joined', member.date_joined],
                            [
                                'Foundation class',
                                member.foundation_class_done ? 'Yes' : 'No',
                            ],
                            ['WOFBI', member.wofbi_done ? 'Yes' : 'No'],
                            [
                                'Technical skills',
                                profile?.technical_skills?.join(', '),
                            ],
                        ]}
                    />
                </Section>

                <Section title="Emergency contact">
                    <Details
                        rows={[
                            ['Next of kin', profile?.next_of_kin_name],
                            [
                                'Relationship',
                                profile?.next_of_kin_relationship,
                            ],
                            ['Phone', profile?.next_of_kin_phone],
                        ]}
                    />
                </Section>

                <Section title="Attendance">
                    <p className="text-sm text-neutral-600">
                        {attendance.rate === null
                            ? 'No services held yet.'
                            : `${attendance.rate}% (${attendance.attended} of ${attendance.total} services)`}
                    </p>
                    {attendance.recent.length > 0 && (
                        <ul className="mt-3 divide-y divide-neutral-200 text-sm">
                            {attendance.recent.map((row) => (
                                <li
                                    key={row.id}
                                    className="flex justify-between gap-4 py-2"
                                >
                                    <span>{row.service}</span>
                                    <span className="text-neutral-600">
                                        {row.date}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                <Section title="Suspension log">
                    {logs.length === 0 ? (
                        <EmptyState
                            icon={History}
                            message="No suspensions recorded."
                        />
                    ) : (
                        <ul className="divide-y divide-neutral-200 text-sm">
                            {logs.map((log) => (
                                <li key={log.id} className="py-3">
                                    <p className="font-medium capitalize">
                                        {log.action}
                                    </p>
                                    {log.reason && <p>{log.reason}</p>}
                                    <p className="text-neutral-600">
                                        {log.created_at}
                                        {log.by ? ` by ${log.by}` : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {can_manage && (
                    <Section title="Admin notes">
                        <form onSubmit={saveNotes}>
                            <InputLabel
                                htmlFor="admin_notes"
                                value="Only admins can see these notes"
                            />
                            <textarea
                                id="admin_notes"
                                rows={4}
                                value={notes.data.admin_notes}
                                onChange={(e) =>
                                    notes.setData('admin_notes', e.target.value)
                                }
                                className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                            />
                            <PrimaryButton
                                disabled={notes.processing}
                                className="mt-3"
                            >
                                Save notes
                            </PrimaryButton>
                        </form>
                    </Section>
                )}
            </div>

            {actions.modals}
        </AdminLayout>
    );
}
