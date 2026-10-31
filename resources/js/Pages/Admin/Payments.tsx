import Badge from '@/Components/Badge';
import DangerButton from '@/Components/DangerButton';
import EmptyState from '@/Components/EmptyState';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { naira } from '@/lib/money';
import { PageProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Download, Search, Wallet } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Due = {
    id: number;
    title: string;
    type: 'monthly' | 'levy';
    amount: number;
    is_active: boolean;
    department: string;
    starts_on: string;
    has_payments: boolean;
};

type ReportRow = {
    id: number;
    member_id: string | null;
    full_name: string;
    unit: string | null;
    paid: boolean;
    under_review: boolean;
    amount: number;
    method: string | null;
    paid_at: string | null;
};

type Report = {
    due_id: number;
    title: string;
    type: string;
    period: string;
    period_label: string;
    members: ReportRow[];
    paid_count: number;
    owing_count: number;
    collected: number;
    outstanding: number;
};

type Review = {
    id: number;
    member: string | null;
    purpose: string;
    period: string;
    amount: number;
    receipt_url: string | null;
    submitted_at: string;
    own: boolean;
};

type Transaction = {
    id: number;
    purpose: string;
    period: string;
    amount: number;
    method: string;
    paid_at: string | null;
    member: string | null;
};

const filterClass =
    'rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="card p-4">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-sm text-neutral-600">{label}</p>
        </div>
    );
}

function NewDueForm() {
    const form = useForm({
        title: '',
        type: 'monthly',
        amount: '',
        starts_on: new Date().toISOString().slice(0, 10),
        due_on: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.dues.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('title', 'amount', 'due_on'),
        });
    };

    return (
        <form onSubmit={submit} className="card space-y-3 p-4 sm:p-6">
            <h2 className="text-xl">New due or levy</h2>
            <div className="grid gap-3 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor="title" value="Title" />
                    <TextInput
                        id="title"
                        value={form.data.title}
                        placeholder="For example Monthly dues"
                        onChange={(e) => form.setData('title', e.target.value)}
                        required
                        className="mt-1 block w-full"
                    />
                    <InputError message={form.errors.title} className="mt-2" />
                </div>
                <div>
                    <InputLabel htmlFor="type" value="Type" />
                    <select
                        id="type"
                        value={form.data.type}
                        onChange={(e) => form.setData('type', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                    >
                        <option value="monthly">Monthly dues</option>
                        <option value="levy">One-off levy</option>
                    </select>
                </div>
                <div>
                    <InputLabel htmlFor="amount" value="Amount in naira" />
                    <TextInput
                        id="amount"
                        type="number"
                        min={50}
                        step="0.01"
                        value={form.data.amount}
                        onChange={(e) => form.setData('amount', e.target.value)}
                        required
                        className="mt-1 block w-full"
                    />
                    <InputError message={form.errors.amount} className="mt-2" />
                </div>
                <div>
                    <InputLabel htmlFor="starts_on" value="Starts on" />
                    <TextInput
                        id="starts_on"
                        type="date"
                        value={form.data.starts_on}
                        onChange={(e) =>
                            form.setData('starts_on', e.target.value)
                        }
                        required
                        className="mt-1 block w-full"
                    />
                    <InputError
                        message={form.errors.starts_on}
                        className="mt-2"
                    />
                </div>
            </div>
            <PrimaryButton disabled={form.processing}>Create</PrimaryButton>
        </form>
    );
}

export default function Payments({
    dues,
    selected,
    report,
    reviews,
    transactions,
    canCreate,
}: {
    dues: Due[];
    selected: number | null;
    report: Report | null;
    reviews: Review[];
    transactions: Transaction[];
    canCreate: boolean;
}) {
    const { auth, errors: pageErrors } = usePage<PageProps>().props;
    const errors = pageErrors as unknown as Record<string, string>;
    const canManage = auth.user.permissions.includes('manage_payments');
    const canRecord = auth.user.permissions.includes('record_payments');
    const [rejecting, setRejecting] = useState<Review | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [unitFilter, setUnitFilter] = useState('');

    const allMembers = report?.members ?? [];

    const units = [
        ...new Set(allMembers.flatMap((member) => member.unit ?? [])),
    ].sort();

    const memberStatus = (member: ReportRow) =>
        member.paid ? 'paid' : member.under_review ? 'review' : 'owing';

    const query = search.trim().toLowerCase();

    const shownMembers = allMembers.filter(
        (member) =>
            (!query ||
                member.full_name.toLowerCase().includes(query) ||
                member.member_id?.toLowerCase().includes(query)) &&
            (!statusFilter || memberStatus(member) === statusFilter) &&
            (!unitFilter || member.unit === unitFilter),
    );

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('');
        setUnitFilter('');
    };

    const rejection = useForm({ reason: '' });

    const reject: FormEventHandler = (e) => {
        e.preventDefault();

        if (rejecting) {
            rejection.post(route('admin.payments.reject', rejecting.id), {
                preserveScroll: true,
                onSuccess: () => {
                    rejection.reset();
                    setRejecting(null);
                },
            });
        }
    };

    const open = (changes: Record<string, string | number>) =>
        router.get(
            route('admin.payments'),
            { due: selected ?? '', period: report?.period ?? '', ...changes },
            { preserveScroll: true, preserveState: true, replace: true },
        );

    const post = (name: string, id: number) =>
        router.post(route(name, id), {}, { preserveScroll: true });

    const recordCash = (member: ReportRow) => {
        if (!report) {
            return;
        }

        const months =
            report.type === 'monthly'
                ? window.prompt(
                      `How many months did ${member.full_name} pay for, starting ${report.period_label}?`,
                      '1',
                  )
                : '1';

        if (months) {
            router.post(
                route('admin.dues.cash', report.due_id),
                { user_id: member.id, period: report.period, months },
                { preserveScroll: true },
            );
        }
    };

    return (
        <AdminLayout>
            <Head title="Payments" />

            <h1 className="text-3xl">Payments</h1>
            <div className="gold-rule mb-6" />

            <div className="max-w-5xl space-y-6">
                <InputError message={errors.payment ?? errors.due} />

                {canRecord && reviews.length > 0 && (
                    <section className="card border-t-2 border-gold-500 p-4 sm:p-6">
                        <h2 className="text-xl">
                            Receipts to check ({reviews.length})
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            Confirm the money reached the bank account before
                            approving.
                        </p>
                        <ul className="mt-3 divide-y divide-neutral-200">
                            {reviews.map((review) => (
                                <li
                                    key={review.id}
                                    className="flex flex-wrap items-center gap-3 py-3"
                                >
                                    <div className="min-w-0 flex-1 basis-56 text-sm">
                                        <p className="font-medium">
                                            {review.member}
                                        </p>
                                        <p className="text-neutral-600">
                                            {review.purpose}, {review.period},{' '}
                                            <span className="tabular-nums">
                                                {naira(review.amount)}
                                            </span>
                                        </p>
                                        <p className="text-xs text-neutral-600">
                                            Sent {review.submitted_at}
                                        </p>
                                    </div>
                                    {review.receipt_url && (
                                        <a
                                            href={review.receipt_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sm font-medium text-primary-700 underline"
                                        >
                                            View receipt
                                        </a>
                                    )}
                                    {review.own ? (
                                        <span className="text-sm text-neutral-600">
                                            Another admin must decide this
                                        </span>
                                    ) : (
                                        <>
                                            <PrimaryButton
                                                type="button"
                                                onClick={() =>
                                                    router.post(
                                                        route(
                                                            'admin.payments.approve',
                                                            review.id,
                                                        ),
                                                        {},
                                                        {
                                                            preserveScroll:
                                                                true,
                                                        },
                                                    )
                                                }
                                            >
                                                Approve
                                            </PrimaryButton>
                                            <DangerButton
                                                type="button"
                                                onClick={() =>
                                                    setRejecting(review)
                                                }
                                            >
                                                Reject
                                            </DangerButton>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {!canManage ? null : canCreate ? (
                    <NewDueForm />
                ) : (
                    <p className="text-sm text-neutral-600">
                        Choose a department in the top bar to add dues.
                    </p>
                )}

                {dues.length === 0 ? (
                    <EmptyState
                        icon={Wallet}
                        message="No dues yet. Create the first one above."
                    />
                ) : (
                    <section className="card p-4 sm:p-6">
                        <h2 className="text-xl">Dues and levies</h2>
                        <ul className="mt-3 divide-y divide-neutral-200">
                            {dues.map((due) => (
                                <li
                                    key={due.id}
                                    className="flex flex-wrap items-center gap-3 py-3"
                                >
                                    <div className="min-w-0 flex-1 basis-56">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                open({ due: due.id, period: '' })
                                            }
                                            className="text-left font-medium hover:text-primary-700 focus:outline-none focus-visible:underline"
                                        >
                                            {due.title}
                                        </button>
                                        <p className="text-sm tabular-nums text-neutral-600">
                                            {naira(due.amount)} ·{' '}
                                            {due.type === 'monthly'
                                                ? 'Monthly'
                                                : 'One-off'}{' '}
                                            · {due.department}
                                        </p>
                                    </div>
                                    {due.is_active ? (
                                        <Badge variant="success">Active</Badge>
                                    ) : (
                                        <Badge variant="warning">Stopped</Badge>
                                    )}
                                    {canManage && (
                                        <SecondaryButton
                                            onClick={() =>
                                                post(
                                                    'admin.dues.toggle',
                                                    due.id,
                                                )
                                            }
                                        >
                                            {due.is_active ? 'Stop' : 'Restart'}
                                        </SecondaryButton>
                                    )}
                                    {canManage && !due.has_payments && (
                                        <DangerButton
                                            type="button"
                                            onClick={() =>
                                                router.delete(
                                                    route(
                                                        'admin.dues.destroy',
                                                        due.id,
                                                    ),
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            Delete
                                        </DangerButton>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {report && (
                    <section className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2 className="text-2xl">{report.title}</h2>
                                <p className="text-sm text-neutral-600">
                                    {report.period_label}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-end gap-3">
                                {report.type === 'monthly' && (
                                    <label className="text-sm font-medium">
                                        Month
                                        <input
                                            type="month"
                                            value={report.period}
                                            onChange={(e) =>
                                                e.target.value &&
                                                open({ period: e.target.value })
                                            }
                                            className="mt-1 block rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                                        />
                                    </label>
                                )}
                                <a
                                    href={route('admin.dues.export', {
                                        due: report.due_id,
                                        period: report.period,
                                    })}
                                    className="inline-flex items-center gap-2 rounded-lg border border-primary-700 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    <Download
                                        size={20}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    Excel
                                </a>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Stat label="Paid" value={report.paid_count} />
                            <Stat label="Owing" value={report.owing_count} />
                            <Stat
                                label="Collected"
                                value={naira(report.collected)}
                            />
                            <Stat
                                label="Outstanding"
                                value={naira(report.outstanding)}
                            />
                        </div>

                        <div className="card p-4 sm:p-6">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <div className="relative min-w-0 flex-1 basis-56">
                                    <Search
                                        size={20}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                                    />
                                    <input
                                        type="search"
                                        aria-label="Search members by name or member ID"
                                        placeholder="Search by name or member ID"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        className={`w-full pl-10 ${filterClass}`}
                                    />
                                </div>
                                <select
                                    aria-label="Filter by payment status"
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(e.target.value)
                                    }
                                    className={filterClass}
                                >
                                    <option value="">All statuses</option>
                                    <option value="paid">Paid</option>
                                    <option value="owing">Owing</option>
                                    <option value="review">Under review</option>
                                </select>
                                {units.length > 0 && (
                                    <select
                                        aria-label="Filter by unit"
                                        value={unitFilter}
                                        onChange={(e) =>
                                            setUnitFilter(e.target.value)
                                        }
                                        className={filterClass}
                                    >
                                        <option value="">All units</option>
                                        {units.map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <p
                                aria-live="polite"
                                className="mb-2 text-sm tabular-nums text-neutral-600"
                            >
                                Showing {shownMembers.length} of{' '}
                                {allMembers.length} members
                            </p>

                            {shownMembers.length === 0 ? (
                                <p className="py-6 text-center text-sm text-neutral-600">
                                    No members match.{' '}
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="font-medium text-primary-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                    >
                                        Clear filters
                                    </button>
                                </p>
                            ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-200 text-neutral-600">
                                        <th scope="col" className="p-2 font-medium">
                                            Member
                                        </th>
                                        <th scope="col" className="hidden p-2 font-medium sm:table-cell">
                                            Unit
                                        </th>
                                        <th scope="col" className="p-2 font-medium">
                                            Status
                                        </th>
                                        <th scope="col" className="p-2">
                                            <span className="sr-only">
                                                Action
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shownMembers.map((member) => (
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
                                            <td className="p-2">
                                                {member.paid ? (
                                                    <>
                                                        <Badge variant="success">
                                                            Paid
                                                        </Badge>
                                                        <span className="ml-2 text-xs capitalize text-neutral-600">
                                                            {member.method},{' '}
                                                            {member.paid_at}
                                                        </span>
                                                    </>
                                                ) : member.under_review ? (
                                                    <Badge variant="gold">
                                                        Under review
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="warning">
                                                        Owing
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-2 text-right">
                                                {canRecord &&
                                                    !member.paid &&
                                                    !member.under_review && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            recordCash(member)
                                                        }
                                                        className="text-sm font-medium text-primary-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                                    >
                                                        Record cash
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            )}
                        </div>
                    </section>
                )}

                {transactions.length > 0 && (
                    <section className="card p-4 sm:p-6">
                        <h2 className="text-xl">Recent transactions</h2>
                        <ul className="mt-3 divide-y divide-neutral-200 text-sm">
                            {transactions.map((payment) => (
                                <li
                                    key={payment.id}
                                    className="flex justify-between gap-4 py-2"
                                >
                                    <span className="min-w-0">
                                        <span className="block font-medium">
                                            {payment.member}
                                        </span>
                                        <span className="capitalize text-neutral-600">
                                            {payment.purpose}, {payment.period},{' '}
                                            {payment.method}, {payment.paid_at}
                                        </span>
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                        {naira(payment.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <Modal
                show={rejecting !== null}
                onClose={() => setRejecting(null)}
                maxWidth="md"
            >
                <form onSubmit={reject} className="p-4 sm:p-6">
                    <h2 className="text-xl">Reject this receipt</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        {rejecting?.member} will see this reason and can upload
                        again.
                    </p>
                    <div className="mt-4">
                        <InputLabel htmlFor="reason" value="Reason" />
                        <textarea
                            id="reason"
                            rows={3}
                            required
                            value={rejection.data.reason}
                            onChange={(e) =>
                                rejection.setData('reason', e.target.value)
                            }
                            className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                        />
                        <InputError
                            message={rejection.errors.reason}
                            className="mt-2"
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setRejecting(null)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton disabled={rejection.processing}>
                            Reject
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
