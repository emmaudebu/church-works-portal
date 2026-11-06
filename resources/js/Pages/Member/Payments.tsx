import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import MemberLayout from '@/Layouts/MemberLayout';
import { naira } from '@/lib/money';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    Clock,
    Copy,
    Download,
    Lock,
    Wallet,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

/** The most months one payment can cover, as the server allows. */
const MAX_MONTHS = 24;

type Arrear = {
    due_id: number;
    title: string;
    type: 'monthly' | 'levy';
    months: number;
    from: string | null;
    to: string | null;
    amount: number;
    under_review: number;
    rejection_reason: string | null;
};

type Month = {
    period: string;
    status: 'paid' | 'review' | 'open';
};

type Payable = {
    due_id: number;
    title: string;
    type: 'monthly' | 'levy';
    amount: number;
    months: Month[];
};

type Choice = {
    due_id: number;
    title: string;
    periods: string[];
    amount: number;
    covers: string;
};

type BankAccount = {
    bank_name: string;
    account_number: string;
    account_name: string;
};

type Waiting = {
    id: number;
    purpose: string;
    period: string;
    amount: number;
    submitted_at: string;
    receipt_url: string | null;
};

type Paid = {
    id: number;
    purpose: string;
    period: string;
    amount: number;
    reference: string;
    batch: string | null;
    method: string;
    paid_at: string | null;
    receipt_url: string | null;
    download_url: string | null;
    image_url: string | null;
};

/** "2026-03" as "March 2026", or "Mar" when short. */
function monthName(period: string, short = false): string {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1, 1);

    return short
        ? date.toLocaleString('en-GB', { month: 'short' })
        : date.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function coverLabel(periods: string[]): string {
    if (periods.length === 0) {
        return '';
    }

    return periods.length > 1
        ? `${monthName(periods[0])} to ${monthName(periods[periods.length - 1])}`
        : monthName(periods[0]);
}

function PayButtons({
    choice,
    canPayOnline,
    canTransfer,
    busy,
    onPay,
    onTransfer,
}: {
    choice: Choice | null;
    canPayOnline: boolean;
    canTransfer: boolean;
    busy: boolean;
    onPay: (choice: Choice) => void;
    onTransfer: (choice: Choice) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {canPayOnline && (
                <PrimaryButton
                    type="button"
                    disabled={busy || !choice}
                    onClick={() => choice && onPay(choice)}
                >
                    {busy ? 'Opening...' : 'Pay now'}
                </PrimaryButton>
            )}
            {canTransfer && (
                <SecondaryButton
                    disabled={!choice}
                    onClick={() => choice && onTransfer(choice)}
                >
                    Upload proof of payment
                </SecondaryButton>
            )}
        </div>
    );
}

/**
 * Pick a year, then tick the months to pay. Months must be ticked in order
 * from the oldest one still open, so arrears always go first.
 */
function MonthPicker({
    due,
    currentPeriod,
    ...buttons
}: {
    due: Payable;
    currentPeriod: string;
    canPayOnline: boolean;
    canTransfer: boolean;
    busy: boolean;
    onPay: (choice: Choice) => void;
    onTransfer: (choice: Choice) => void;
}) {
    const open = due.months
        .filter((month) => month.status === 'open')
        .map((month) => month.period);
    const owed = open.filter((period) => period <= currentPeriod).length;
    const byPeriod = new Map(due.months.map((month) => [month.period, month]));
    const years = [
        ...new Set(due.months.map((month) => month.period.slice(0, 4))),
    ];

    const [count, setCount] = useState(0);
    const [year, setYear] = useState(
        (open[0] ?? currentPeriod).slice(0, 4),
    );

    const selected = open.slice(0, count);
    const next = count < MAX_MONTHS ? open[count] : undefined;

    const toggle = (period: string) => {
        const index = open.indexOf(period);

        if (index < count) {
            setCount(index);
        } else if (index === count && count < MAX_MONTHS) {
            setCount(index + 1);
        }
    };

    const choice: Choice | null =
        selected.length > 0
            ? {
                  due_id: due.due_id,
                  title: due.title,
                  periods: selected,
                  amount: due.amount * selected.length,
                  covers: coverLabel(selected),
              }
            : null;

    const lockedEarlier =
        next !== undefined && next.slice(0, 4) < year
            ? next.slice(0, 4)
            : null;

    return (
        <div id={`pay-${due.due_id}`} className="card scroll-mt-24 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-medium">{due.title}</p>
                    <p className="text-sm tabular-nums text-neutral-600">
                        {naira(due.amount)} a month
                    </p>
                </div>
                {owed > count && (
                    <button
                        type="button"
                        onClick={() => {
                            setCount(Math.min(owed, MAX_MONTHS));
                            setYear(open[0].slice(0, 4));
                        }}
                        className="rounded-full border border-primary-700 px-3 py-1.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        Tick all {owed} {owed === 1 ? 'month' : 'months'} owed
                    </button>
                )}
            </div>

            <div
                role="tablist"
                aria-label="Year"
                className="mt-4 flex flex-wrap gap-2"
            >
                {years.map((option) => {
                    const ticked = selected.filter((period) =>
                        period.startsWith(option),
                    ).length;

                    return (
                        <button
                            key={option}
                            type="button"
                            role="tab"
                            aria-selected={year === option}
                            onClick={() => setYear(option)}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ${
                                year === option
                                    ? 'bg-charcoal-900 text-white'
                                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-200'
                            }`}
                        >
                            {option}
                            {ticked > 0 && (
                                <span
                                    className={`ml-1.5 rounded-full px-1.5 text-xs ${
                                        year === option
                                            ? 'bg-gold-500 text-neutral-900'
                                            : 'bg-primary-700 text-white'
                                    }`}
                                >
                                    {ticked}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 12 }, (_, index) => {
                    const period = `${year}-${String(index + 1).padStart(2, '0')}`;
                    const month = byPeriod.get(period);
                    const name = monthName(period, true);
                    const base =
                        'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border p-2 text-sm transition';

                    if (!month) {
                        return (
                            <div
                                key={period}
                                className={`${base} border-dashed border-neutral-200 text-neutral-600/50`}
                            >
                                <span className="font-medium">{name}</span>
                                <span className="text-[11px]">Not due</span>
                            </div>
                        );
                    }

                    if (month.status === 'paid') {
                        return (
                            <div
                                key={period}
                                className={`${base} border-success/30 bg-success/10 text-success`}
                            >
                                <span className="font-medium">{name}</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                    <Check size={12} aria-hidden="true" />
                                    Paid
                                </span>
                            </div>
                        );
                    }

                    if (month.status === 'review') {
                        return (
                            <div
                                key={period}
                                className={`${base} border-warning/30 bg-gold-50 text-warning`}
                            >
                                <span className="font-medium">{name}</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                    <Clock size={12} aria-hidden="true" />
                                    Checking
                                </span>
                            </div>
                        );
                    }

                    const ticked = selected.includes(period);
                    const locked = !ticked && period !== next;
                    const arrear = period <= currentPeriod;

                    return (
                        <button
                            key={period}
                            type="button"
                            aria-pressed={ticked}
                            disabled={locked}
                            onClick={() => toggle(period)}
                            title={
                                locked && next
                                    ? `Tick ${monthName(next)} first`
                                    : undefined
                            }
                            className={`${base} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ${
                                ticked
                                    ? 'border-primary-700 bg-primary-700 text-white shadow-md'
                                    : locked
                                      ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-600/60'
                                      : arrear
                                        ? 'border-danger/40 bg-white text-danger hover:bg-primary-50'
                                        : 'border-neutral-200 bg-white hover:border-primary-700 hover:bg-primary-50'
                            }`}
                        >
                            <span className="font-medium">{name}</span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                                {ticked ? (
                                    <>
                                        <Check size={12} aria-hidden="true" />
                                        Ticked
                                    </>
                                ) : locked ? (
                                    <>
                                        <Lock size={12} aria-hidden="true" />
                                        {arrear ? 'Owing' : 'Later'}
                                    </>
                                ) : arrear ? (
                                    'Owing'
                                ) : (
                                    'Tick'
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            <p className="mt-3 text-sm text-neutral-600" aria-live="polite">
                {lockedEarlier
                    ? `Pay what you owe in ${lockedEarlier} before these months.`
                    : next
                      ? `Months are paid in order. ${monthName(next)} is next.`
                      : 'You can not tick more months in one payment.'}
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-50 p-3">
                <p className="text-sm">
                    <span className="block text-neutral-600">
                        {choice
                            ? `${selected.length} × ${naira(due.amount)} · ${choice.covers}`
                            : 'Tick the months you are paying for'}
                    </span>
                    <span
                        data-testid="pay-total"
                        className="text-lg font-semibold tabular-nums"
                    >
                        {choice ? naira(choice.amount) : naira(0)}
                    </span>
                </p>
                <PayButtons choice={choice} {...buttons} />
            </div>
        </div>
    );
}

function LevyCard({
    due,
    ...buttons
}: {
    due: Payable;
    canPayOnline: boolean;
    canTransfer: boolean;
    busy: boolean;
    onPay: (choice: Choice) => void;
    onTransfer: (choice: Choice) => void;
}) {
    return (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
                <p className="font-medium">{due.title}</p>
                <p className="text-sm tabular-nums text-neutral-600">
                    {naira(due.amount)} one-off
                </p>
            </div>
            <PayButtons
                choice={{
                    due_id: due.due_id,
                    title: due.title,
                    periods: [],
                    amount: due.amount,
                    covers: 'One-off',
                }}
                {...buttons}
            />
        </div>
    );
}

function AccountDetails({
    bankAccount,
    memberId,
}: {
    bankAccount: BankAccount;
    memberId: string | null;
}) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(bankAccount.account_number);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <dl className="mt-4 space-y-2 rounded-lg bg-gold-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
                <dt className="text-neutral-600">Bank</dt>
                <dd className="text-right font-medium">
                    {bankAccount.bank_name}
                </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
                <dt className="text-neutral-600">Account number</dt>
                <dd className="text-right text-base font-semibold tabular-nums">
                    {bankAccount.account_number}
                    <button
                        type="button"
                        onClick={copy}
                        aria-label="Copy account number"
                        className="ml-2 inline-flex items-center gap-1 rounded-full border border-primary-700 px-2.5 py-1 text-xs font-medium text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        {copied ? (
                            <Check size={14} aria-hidden="true" />
                        ) : (
                            <Copy size={14} aria-hidden="true" />
                        )}
                        <span aria-live="polite">
                            {copied ? 'Copied' : 'Copy'}
                        </span>
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
                    <dt className="text-neutral-600">Use as narration</dt>
                    <dd className="text-right font-medium">{memberId}</dd>
                </div>
            )}
        </dl>
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
        periods: string[];
        receipt: File | null;
    }>({ due_id: null, periods: [], receipt: null });

    const close = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!item) {
            return;
        }

        form.transform((data) => ({
            ...data,
            due_id: item.due_id,
            periods: item.periods,
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
                    <h2 className="text-xl">Upload proof of payment</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        Pay exactly{' '}
                        <strong className="text-neutral-900">
                            {naira(item.amount)}
                        </strong>{' '}
                        for {item.title} ({item.covers}).
                    </p>

                    <AccountDetails
                        bankAccount={bankAccount}
                        memberId={memberId}
                    />

                    <div className="mt-4">
                        <label
                            htmlFor="receipt"
                            className="block text-sm font-medium"
                        >
                            Your bank receipt or transfer screenshot (PDF or
                            photo)
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
                        <InputError
                            message={
                                (form.errors as Record<string, string>)
                                    .periods
                            }
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={close}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={form.processing}>
                            Send for approval
                        </PrimaryButton>
                    </div>
                </form>
            )}
        </Modal>
    );
}

export default function Payments({
    arrears,
    waiting,
    history,
    payable,
    currentPeriod,
    canPayOnline,
    bankAccount,
    memberId,
}: {
    arrears: Arrear[];
    waiting: Waiting[];
    payable: Payable[];
    history: Paid[];
    currentPeriod: string;
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
            { due_id: choice.due_id, periods: choice.periods },
            { onFinish: () => setPaying(false) },
        );
    };

    const owing = arrears.filter((item) => item.months > 0);
    const total = owing.reduce((sum, item) => sum + item.amount, 0);
    const canPay = canPayOnline || bankAccount !== null;
    const buttons = {
        canPayOnline,
        canTransfer: bankAccount !== null,
        busy: paying,
        onPay: pay,
        onTransfer: setTransferring,
    };

    return (
        <MemberLayout>
            <Head title="Payments" />

            <h1 className="text-3xl">Payments</h1>
            <div className="gold-rule mb-6" />

            <InputError
                message={errors.payment ?? errors.periods}
                className="mb-3"
            />

            {owing.length === 0 ? (
                <section className="card flex items-center gap-3 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                        <Check size={20} aria-hidden="true" />
                    </span>
                    <p className="text-sm">
                        <strong className="block text-base">
                            You are all paid up
                        </strong>
                        <span className="text-neutral-600">
                            Thank you for your faithfulness.
                        </span>
                    </p>
                </section>
            ) : (
                <section
                    role="alert"
                    className="overflow-hidden rounded-2xl border border-danger/30 bg-white shadow-sm"
                >
                    <div className="flex items-start gap-3 bg-danger/5 p-4 sm:p-5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                            <AlertTriangle size={20} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-sans text-base font-semibold text-danger">
                                You are owing {naira(total)}
                            </h2>
                            <ul className="mt-1 space-y-1 text-sm">
                                {owing.map((item) => (
                                    <li key={item.due_id}>
                                        <strong>{item.title}</strong>
                                        {item.type === 'monthly' ? (
                                            <>
                                                {' '}
                                                for {item.months}{' '}
                                                {item.months === 1
                                                    ? 'month'
                                                    : 'months'}
                                                ,{' '}
                                                {item.months === 1
                                                    ? item.from
                                                    : `${item.from} to ${item.to}`}
                                            </>
                                        ) : (
                                            ' (one-off levy)'
                                        )}
                                        {owing.length > 1 && (
                                            <>
                                                {': '}
                                                <span className="font-semibold tabular-nums">
                                                    {naira(item.amount)}
                                                </span>
                                            </>
                                        )}
                                        {item.rejection_reason && (
                                            <span className="block text-danger">
                                                Your last proof was not
                                                accepted:{' '}
                                                {item.rejection_reason}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    {canPay && (
                        <div className="flex justify-end border-t border-danger/10 px-4 py-3 sm:px-5">
                            <a
                                href={`#pay-${owing[0].due_id}`}
                                className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                            >
                                Pay what I owe
                            </a>
                        </div>
                    )}
                </section>
            )}

            {!canPay && payable.length > 0 && (
                <p className="mt-3 text-sm text-neutral-600">
                    Your department's account details have not been added yet.
                    Please ask your Financial Secretary how to pay.
                </p>
            )}

            {waiting.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-xl">Waiting for approval</h2>
                    <ul className="card mt-3 divide-y divide-neutral-200">
                        {waiting.map((payment) => (
                            <li
                                key={payment.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                            >
                                <span className="min-w-0">
                                    <span className="block font-medium">
                                        {payment.purpose}
                                    </span>
                                    <span className="text-neutral-600">
                                        {payment.period} ·{' '}
                                        <span className="tabular-nums">
                                            {naira(payment.amount)}
                                        </span>
                                    </span>
                                    <span className="block text-xs text-neutral-600">
                                        Sent {payment.submitted_at}
                                    </span>
                                </span>
                                <Badge variant="warning">Under review</Badge>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {canPay && payable.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-xl">Make a payment</h2>
                    <div className="mt-3 space-y-3">
                        {payable.map((due) =>
                            due.type === 'monthly' ? (
                                <MonthPicker
                                    key={due.due_id}
                                    due={due}
                                    currentPeriod={currentPeriod}
                                    {...buttons}
                                />
                            ) : (
                                <div
                                    key={due.due_id}
                                    id={`pay-${due.due_id}`}
                                    className="scroll-mt-24"
                                >
                                    <LevyCard due={due} {...buttons} />
                                </div>
                            ),
                        )}
                    </div>
                </section>
            )}

            {bankAccount && (
                <section className="card mt-6 border-t-2 border-gold-500 p-5">
                    <h2 className="text-xl">Department account</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        Pay into this account from your bank, then come back
                        and upload your proof of payment. It can be done later.
                    </p>
                    <AccountDetails
                        bankAccount={bankAccount}
                        memberId={memberId}
                    />
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
                                className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium">
                                        {payment.purpose}
                                    </span>
                                    <span className="text-neutral-600">
                                        {payment.period} · {payment.paid_at}
                                    </span>
                                    <span className="block break-all text-xs text-neutral-600">
                                        {payment.batch ?? payment.reference}
                                    </span>
                                    {payment.receipt_url && (
                                        <a
                                            href={payment.receipt_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs text-primary-700 underline"
                                        >
                                            View my proof of payment
                                        </a>
                                    )}
                                </span>
                                <span className="flex shrink-0 items-center gap-3">
                                    <span className="font-semibold tabular-nums">
                                        {naira(payment.amount)}
                                    </span>
                                    {payment.download_url && (
                                        <span className="inline-flex overflow-hidden rounded-full bg-primary-700 text-xs font-semibold text-white">
                                            <span className="inline-flex items-center gap-1 py-1.5 pl-3 pr-1">
                                                <Download
                                                    size={14}
                                                    aria-hidden="true"
                                                />
                                                <span className="sr-only">
                                                    Download receipt as
                                                </span>
                                            </span>
                                            <a
                                                href={payment.download_url}
                                                className="px-2 py-1.5 transition hover:bg-primary-900 focus:outline-none focus-visible:bg-primary-900"
                                            >
                                                PDF
                                            </a>
                                            <a
                                                href={payment.image_url ?? undefined}
                                                className="border-l border-white/30 py-1.5 pl-2 pr-3 transition hover:bg-primary-900 focus:outline-none focus-visible:bg-primary-900"
                                            >
                                                JPEG
                                            </a>
                                        </span>
                                    )}
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
