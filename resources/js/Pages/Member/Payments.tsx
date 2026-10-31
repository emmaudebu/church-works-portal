import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import MemberLayout from '@/Layouts/MemberLayout';
import { naira } from '@/lib/money';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Wallet } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Owing = {
    due_id: number;
    title: string;
    period: string;
    period_label: string;
    amount: number;
    under_review: boolean;
    rejection_reason: string | null;
};

type Payable = {
    due_id: number;
    title: string;
    type: 'monthly' | 'levy';
    amount: number;
    periods: string[];
};

type Choice = {
    due_id: number;
    title: string;
    months: number;
    amount: number;
    covers: string;
};

type BankAccount = {
    bank_name: string;
    account_number: string;
    account_name: string;
};

type Paid = {
    id: number;
    purpose: string;
    period: string;
    amount: number;
    reference: string;
    method: string;
    paid_at: string | null;
    receipt_url: string | null;
};

const MONTH_OPTIONS = [1, 2, 3, 6, 9, 12, 18, 24];

function PayCard({
    due,
    canPayOnline,
    canTransfer,
    busy,
    onPay,
    onTransfer,
}: {
    due: Payable;
    canPayOnline: boolean;
    canTransfer: boolean;
    busy: boolean;
    onPay: (choice: Choice) => void;
    onTransfer: (choice: Choice) => void;
}) {
    const [months, setMonths] = useState(1);

    const monthly = due.type === 'monthly';
    const covered = due.periods.slice(0, months);
    const first = covered[0];
    const last = covered[covered.length - 1];

    const choice: Choice = {
        due_id: due.due_id,
        title: due.title,
        months,
        amount: due.amount * months,
        covers:
            covered.length > 1 ? `${first} to ${last}` : first,
    };

    return (
        <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-medium">{due.title}</p>
                    <p className="text-sm tabular-nums text-neutral-600">
                        {naira(due.amount)}
                        {monthly ? ' a month' : ' one-off'}
                    </p>
                </div>
                {monthly && (
                    <label className="text-sm font-medium">
                        Months
                        <select
                            aria-label={`Months to pay for ${due.title}`}
                            value={months}
                            onChange={(e) => setMonths(Number(e.target.value))}
                            className="ml-2 rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                        >
                            {MONTH_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option === 12
                                        ? '12 (1 year)'
                                        : option === 24
                                          ? '24 (2 years)'
                                          : option}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gold-50 p-3">
                <p className="text-sm">
                    <span className="block text-neutral-600">
                        Covers {choice.covers}
                    </span>
                    <span
                        data-testid="pay-total"
                        className="text-lg font-semibold tabular-nums"
                    >
                        {naira(choice.amount)}
                    </span>
                </p>
                <div className="flex flex-wrap gap-2">
                    {canPayOnline && (
                        <PrimaryButton
                            type="button"
                            disabled={busy}
                            onClick={() => onPay(choice)}
                        >
                            {busy ? 'Opening...' : 'Pay now'}
                        </PrimaryButton>
                    )}
                    {canTransfer && (
                        <SecondaryButton onClick={() => onTransfer(choice)}>
                            Pay by transfer
                        </SecondaryButton>
                    )}
                </div>
            </div>
        </div>
    );
}

function TransferModal({
    item,
    bankAccount,
    memberId,
    onClose,
}: {
    item: Choice | null;
    bankAccount: BankAccount;
    memberId: string | null;
    onClose: () => void;
}) {
    const form = useForm<{
        due_id: number | null;
        months: number;
        receipt: File | null;
    }>({ due_id: null, months: 1, receipt: null });

    const [copied, setCopied] = useState(false);

    const close = () => {
        form.reset();
        form.clearErrors();
        setCopied(false);
        onClose();
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(bankAccount.account_number);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!item) {
            return;
        }

        form.transform((data) => ({
            ...data,
            due_id: item.due_id,
            months: item.months,
        }));

        form.post(route('member.payments.transfer'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: close,
        });
    };

    return (
        <Modal show={item !== null} onClose={close} maxWidth="md">
            {item && (
                <form onSubmit={submit} className="p-4 sm:p-6">
                    <h2 className="text-xl">Pay by transfer</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        Transfer exactly{' '}
                        <strong className="text-neutral-900">
                            {naira(item.amount)}
                        </strong>{' '}
                        for {item.title} ({item.covers}).
                    </p>

                    <dl className="mt-4 space-y-2 rounded-lg bg-gold-50 p-4 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-neutral-600">Bank</dt>
                            <dd className="text-right font-medium">
                                {bankAccount.bank_name}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-neutral-600">Account number</dt>
                            <dd className="text-right font-semibold tabular-nums">
                                {bankAccount.account_number}
                                <button
                                    type="button"
                                    onClick={copy}
                                    className="ml-2 text-xs font-medium text-primary-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-neutral-600">Account name</dt>
                            <dd className="text-right font-medium">
                                {bankAccount.account_name}
                            </dd>
                        </div>
                        {memberId && (
                            <div className="flex justify-between gap-4">
                                <dt className="text-neutral-600">
                                    Use as narration
                                </dt>
                                <dd className="text-right font-medium">
                                    {memberId}
                                </dd>
                            </div>
                        )}
                    </dl>

                    <div className="mt-4">
                        <label
                            htmlFor="receipt"
                            className="block text-sm font-medium"
                        >
                            Upload your receipt (PDF or photo)
                        </label>
                        <input
                            id="receipt"
                            type="file"
                            required
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            onChange={(e) =>
                                form.setData(
                                    'receipt',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                            className="mt-1 block w-full text-sm"
                        />
                        <InputError
                            message={form.errors.receipt}
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={close}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={form.processing}>
                            Submit receipt
                        </PrimaryButton>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default function Payments({
    owing,
    history,
    payable,
    canPayOnline,
    bankAccount,
    memberId,
}: {
    owing: Owing[];
    payable: Payable[];
    history: Paid[];
    canPayOnline: boolean;
    bankAccount: BankAccount | null;
    memberId: string | null;
}) {
    const errors = usePage().props.errors as Record<string, string>;
    const [paying, setPaying] = useState(false);
    const [transferring, setTransferring] = useState<Choice | null>(null);

    const pay = (choice: Choice) => {
        setPaying(true);

        router.post(
            route('member.payments.pay'),
            { due_id: choice.due_id, months: choice.months },
            { onFinish: () => setPaying(false) },
        );
    };

    const total = owing.reduce((sum, item) => sum + item.amount, 0);

    return (
        <MemberLayout>
            <Head title="Payments" />

            <h1 className="text-3xl">Payments</h1>
            <div className="gold-rule mb-6" />

            <InputError message={errors.payment} className="mb-3" />

            <section className="card p-5">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-xl">Owing</h2>
                    <p className="text-lg font-semibold tabular-nums">
                        {naira(total)}
                    </p>
                </div>

                {owing.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-600">
                        You are all paid up. Thank you.
                    </p>
                ) : (
                    <ul className="mt-3 divide-y divide-neutral-200">
                        {owing.map((item) => (
                            <li
                                key={`${item.due_id}:${item.period}`}
                                className="flex flex-wrap items-center justify-between gap-3 py-3"
                            >
                                <span className="min-w-0">
                                    <span className="block font-medium">
                                        {item.title}
                                    </span>
                                    <span className="text-sm tabular-nums text-neutral-600">
                                        {item.period_label} ·{' '}
                                        {naira(item.amount)}
                                    </span>
                                </span>
                                {item.under_review && (
                                    <Badge variant="warning">
                                        Under review
                                    </Badge>
                                )}
                                {item.rejection_reason &&
                                    !item.under_review && (
                                        <p className="w-full text-sm text-danger">
                                            Your last receipt was not accepted:{' '}
                                            {item.rejection_reason}
                                        </p>
                                    )}
                            </li>
                        ))}
                    </ul>
                )}

                {!canPayOnline && !bankAccount && payable.length > 0 && (
                    <p className="mt-3 text-sm text-neutral-600">
                        Online payment is not available yet. Please pay your
                        department admin.
                    </p>
                )}
            </section>

            {(canPayOnline || bankAccount) && payable.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-xl">Make a payment</h2>
                    <div className="mt-3 space-y-3">
                        {payable.map((due) => (
                            <PayCard
                                key={due.due_id}
                                due={due}
                                canPayOnline={canPayOnline}
                                canTransfer={bankAccount !== null}
                                busy={paying}
                                onPay={pay}
                                onTransfer={setTransferring}
                            />
                        ))}
                    </div>
                </section>
            )}

            <section className="mt-6">
                <h2 className="text-xl">Payment history</h2>
                {history.length === 0 ? (
                    <div className="mt-3">
                        <EmptyState
                            icon={Wallet}
                            message="Your payments will appear here."
                        />
                    </div>
                ) : (
                    <ul className="card mt-3 divide-y divide-neutral-200">
                        {history.map((payment) => (
                            <li
                                key={payment.id}
                                className="flex justify-between gap-4 p-4 text-sm"
                            >
                                <span className="min-w-0">
                                    <span className="block font-medium">
                                        {payment.purpose}
                                    </span>
                                    <span className="text-neutral-600">
                                        {payment.period} · {payment.paid_at}
                                    </span>
                                    <span className="block break-all text-xs text-neutral-600">
                                        {payment.reference}
                                    </span>
                                    {payment.receipt_url && (
                                        <a
                                            href={payment.receipt_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-primary-700 underline"
                                        >
                                            View receipt
                                        </a>
                                    )}
                                </span>
                                <span className="shrink-0 font-medium tabular-nums">
                                    {naira(payment.amount)}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {bankAccount && (
                <TransferModal
                    item={transferring}
                    bankAccount={bankAccount}
                    memberId={memberId}
                    onClose={() => setTransferring(null)}
                />
            )}
        </MemberLayout>
    );
}
