import Modal from '@/Components/Modal';
import { naira } from '@/lib/money';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { BadgeCheck, FileText, Image as ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

const LATER_KEY = 'receipt-prompt-later';

function askedLater(id: number): boolean {
    try {
        return sessionStorage.getItem(LATER_KEY) === String(id);
    } catch {
        return false;
    }
}

/**
 * Once a payment goes through, approved by the Financial Secretary or paid
 * online, the member is asked to download its receipt. "Not now" waits until
 * their next visit; downloading it stops the question for good.
 */
export default function ReceiptPrompt() {
    const { receiptReady } = usePage<PageProps>().props;
    const [closedId, setClosedId] = useState<number | null>(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(
            receiptReady !== null &&
                receiptReady !== undefined &&
                receiptReady.id !== closedId &&
                !askedLater(receiptReady.id),
        );
    }, [receiptReady, closedId]);

    if (!receiptReady) {
        return null;
    }

    const close = () => setClosedId(receiptReady.id);

    const later = () => {
        try {
            sessionStorage.setItem(LATER_KEY, String(receiptReady.id));
        } catch {
            // Without storage it simply asks again on the next page.
        }

        close();
    };

    const approved = receiptReady.method === 'transfer';

    return (
        <Modal show={show} onClose={later} maxWidth="sm">
            <div className="relative overflow-hidden bg-primary-700 px-6 pb-8 pt-7 text-center text-white">
                <span
                    aria-hidden="true"
                    className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold-500/20 blur-2xl"
                />
                <span
                    aria-hidden="true"
                    className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
                />
                <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-neutral-900 shadow-lg ring-4 ring-gold-500/30">
                    <BadgeCheck size={32} strokeWidth={2} aria-hidden="true" />
                </span>
                <h2 className="relative mt-4 text-2xl text-white">
                    {approved ? 'Payment approved' : 'Payment received'}
                </h2>
                <p className="relative mt-1 text-sm text-white/80">
                    {approved
                        ? 'The Financial Secretary has confirmed your payment.'
                        : 'Your payment has been recorded.'}
                </p>
            </div>

            <div className="-mt-4 rounded-t-2xl bg-white px-6 pb-6 pt-5">
                <dl className="space-y-2 rounded-xl border border-gold-500/40 bg-gold-50 p-4 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-neutral-600">For</dt>
                        <dd className="text-right font-medium">
                            {receiptReady.purpose}
                        </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-neutral-600">Covers</dt>
                        <dd className="text-right font-medium">
                            {receiptReady.covers}
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-gold-500/30 pt-2">
                        <dt className="text-neutral-600">Amount</dt>
                        <dd className="text-lg font-semibold tabular-nums text-primary-700">
                            {naira(receiptReady.amount)}
                        </dd>
                    </div>
                </dl>

                <p className="mt-5 text-center text-sm font-medium">
                    Save your receipt as
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <a
                        href={receiptReady.download_url}
                        onClick={close}
                        className="relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gold-500 px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                    >
                        <span
                            aria-hidden="true"
                            className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/60 to-transparent"
                        />
                        <FileText
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                            className="relative"
                        />
                        <span className="relative">PDF</span>
                    </a>
                    <a
                        href={receiptReady.image_url}
                        onClick={close}
                        className="flex items-center justify-center gap-2 rounded-full border-2 border-primary-700 px-4 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                    >
                        <ImageIcon
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                        />
                        JPEG photo
                    </a>
                </div>
                <button
                    type="button"
                    onClick={later}
                    className="mt-2 w-full rounded-full px-5 py-2 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    Not now
                </button>
            </div>
        </Modal>
    );
}
