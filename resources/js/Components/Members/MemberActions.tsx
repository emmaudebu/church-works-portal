import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useWhatsapp } from '@/lib/whatsapp';
import { PageProps } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export type ActionTarget = {
    id: number;
    full_name: string;
    phone: string | null;
};

type Kind = 'suspend' | 'reactivate' | 'reset';

/** State and modals for the suspend, reactivate and reset password actions. */
export function useMemberActions() {
    const [open, setOpen] = useState<{
        kind: Kind;
        member: ActionTarget;
    } | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const whatsapp = useWhatsapp();
    const form = useForm({ reason: '' });

    const close = () => {
        setOpen(null);
        setTempPassword(null);
        form.reset();
        form.clearErrors();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!open) {
            return;
        }

        if (open.kind === 'reset') {
            router.post(
                route('admin.members.reset-password', open.member.id),
                {},
                {
                    preserveScroll: true,
                    onSuccess: (page) =>
                        setTempPassword(
                            (page.props as unknown as PageProps).flash
                                .temp_password,
                        ),
                },
            );

            return;
        }

        const name =
            open.kind === 'suspend'
                ? 'admin.members.suspend'
                : 'admin.members.reactivate';

        form.post(route(name, open.member.id), {
            preserveScroll: true,
            onSuccess: close,
        });
    };

    const target = open?.member;
    const suspending = open?.kind === 'suspend';

    const modals = (
        <Modal show={open !== null} onClose={close} maxWidth="md">
            {target && open?.kind === 'reset' ? (
                <form onSubmit={submit} className="p-4 sm:p-6">
                    <h2 className="text-xl">Reset password</h2>
                    {tempPassword ? (
                        <>
                            <p className="mt-2 text-sm text-neutral-600">
                                Give {target.full_name} this temporary password.
                                It will not be shown again, and they must change
                                it when they log in.
                            </p>
                            <p className="mt-4 select-all rounded-lg bg-gold-50 p-3 text-center font-mono text-lg">
                                {tempPassword}
                            </p>
                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                {target.phone && (
                                    <a
                                        href={whatsapp.tempPassword(
                                            target,
                                            tempPassword,
                                        )}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                                    >
                                        Send on WhatsApp
                                    </a>
                                )}
                                <PrimaryButton type="button" onClick={close}>
                                    Done
                                </PrimaryButton>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="mt-2 text-sm text-neutral-600">
                                {target.full_name}'s current password will stop
                                working straight away.
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <SecondaryButton onClick={close}>
                                    Cancel
                                </SecondaryButton>
                                <DangerButton>Reset password</DangerButton>
                            </div>
                        </>
                    )}
                </form>
            ) : target ? (
                <form onSubmit={submit} className="p-4 sm:p-6">
                    <h2 className="text-xl">
                        {suspending ? 'Suspend' : 'Reactivate'}{' '}
                        {target.full_name}
                    </h2>
                    <p className="mt-2 text-sm text-neutral-600">
                        {suspending
                            ? 'They will be logged out, their QR code will be rejected and they will not be able to vote.'
                            : 'They will be able to log in, check in and vote again.'}
                    </p>
                    <div className="mt-4">
                        <InputLabel
                            htmlFor="reason"
                            value={suspending ? 'Reason' : 'Reason (optional)'}
                        />
                        <textarea
                            id="reason"
                            rows={3}
                            value={form.data.reason}
                            required={suspending}
                            onChange={(e) =>
                                form.setData('reason', e.target.value)
                            }
                            className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                        />
                        <InputError
                            message={form.errors.reason}
                            className="mt-2"
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={close}>
                            Cancel
                        </SecondaryButton>
                        {suspending ? (
                            <DangerButton disabled={form.processing}>
                                Suspend
                            </DangerButton>
                        ) : (
                            <PrimaryButton disabled={form.processing}>
                                Reactivate
                            </PrimaryButton>
                        )}
                    </div>
                </form>
            ) : null}
        </Modal>
    );

    return {
        suspend: (member: ActionTarget) => setOpen({ kind: 'suspend', member }),
        reactivate: (member: ActionTarget) =>
            setOpen({ kind: 'reactivate', member }),
        resetPassword: (member: ActionTarget) =>
            setOpen({ kind: 'reset', member }),
        modals,
    };
}

export function approveMembers(ids: number[], onSuccess?: () => void) {
    router.post(
        route('admin.members.approve'),
        { ids },
        { preserveScroll: true, onSuccess },
    );
}
