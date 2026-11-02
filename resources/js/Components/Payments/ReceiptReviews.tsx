import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { naira } from '@/lib/money';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export type Review = {
    id: number;
    member: string | null;
    purpose: string;
    period: string;
    amount: number;
    receipt_url: string | null;
    submitted_at: string;
    own: boolean;
};

export default function ReceiptReviews({ reviews }: { reviews: Review[] }) {
    const [rejecting, setRejecting] = useState<Review | null>(null);
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

    if (reviews.length === 0) {
        return null;
    }

    return (
        <>
                <section className="card border-t-2 border-gold-500 p-4 sm:p-6">
                    <h2 className="text-xl">
                        Proofs of payment to approve ({reviews.length})
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

            <Modal
                show={rejecting !== null}
                onClose={() => setRejecting(null)}
                maxWidth="md"
            >
                <form onSubmit={reject} className="p-4 sm:p-6">
                    <h2 className="text-xl">Reject this proof of payment</h2>
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
        </>
    );
}
