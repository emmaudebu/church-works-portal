import Avatar from '@/Components/Avatar';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import MemberLayout from '@/Layouts/MemberLayout';
import { PageProps } from '@/types';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Head, usePage } from '@inertiajs/react';
import { Lock, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const DOWNLOAD_SIZE = 1024;

async function downloadPng(url: string, fileName: string) {
    const svg = await (await fetch(url)).blob();
    const source = URL.createObjectURL(svg);
    const image = new Image();

    image.onload = () => {
        const canvas = document.createElement('canvas');

        canvas.width = DOWNLOAD_SIZE;
        canvas.height = DOWNLOAD_SIZE;

        const context = canvas.getContext('2d');

        if (!context) {
            return;
        }

        context.imageSmoothingEnabled = false;
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);
        context.drawImage(image, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);

        const link = document.createElement('a');

        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
        URL.revokeObjectURL(source);
    };
    image.src = source;
}

/** Web pages can't raise screen brightness, so this fills the screen with white and keeps it awake. */
function BrightView({
    url,
    onClose,
}: {
    url: string;
    onClose: () => void;
}) {
    useEffect(() => {
        let lock: WakeLockSentinel | undefined;

        navigator.wakeLock
            ?.request('screen')
            .then((sentinel) => (lock = sentinel))
            .catch(() => {});

        return () => {
            lock?.release();
        };
    }, []);

    return (
        <Dialog open onClose={onClose} className="relative z-50">
            <DialogPanel className="fixed inset-0 flex flex-col items-center justify-center bg-white p-4">
                <DialogTitle className="sr-only">Bright QR code</DialogTitle>
                <img
                    src={url}
                    alt="Your QR code"
                    className="aspect-square w-full max-w-md"
                />
                <p className="mt-6 text-center text-sm text-neutral-600">
                    Turn your phone's brightness up if the scanner struggles.
                </p>
                <PrimaryButton type="button" onClick={onClose} className="mt-4">
                    Close
                </PrimaryButton>
            </DialogPanel>
        </Dialog>
    );
}

export default function MyQr({
    member_id,
    qr_url,
}: {
    member_id: string | null;
    qr_url: string | null;
}) {
    const { user } = usePage<PageProps>().props.auth;
    const [bright, setBright] = useState(false);

    return (
        <MemberLayout>
            <Head title="My QR" />

            {qr_url ? (
                <div className="mx-auto max-w-sm">
                    <section className="card border-t-2 border-gold-500 p-6 text-center">
                        <img
                            src={qr_url}
                            alt="Your attendance QR code"
                            className="mx-auto aspect-square w-full max-w-72"
                        />
                        <div className="mt-4 flex items-center justify-center gap-3 text-left">
                            <Avatar
                                name={user.full_name}
                                src={user.photo_url}
                                className="h-12 w-12 shrink-0 text-sm"
                            />
                            <div className="min-w-0">
                                <h1 className="truncate text-xl">
                                    {user.full_name}
                                </h1>
                                <p className="text-sm text-neutral-600">
                                    {[user.department, member_id]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="mt-4 grid gap-3">
                        <PrimaryButton
                            type="button"
                            onClick={() => setBright(true)}
                        >
                            <Sun
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                                className="mr-2"
                            />
                            Boost brightness
                        </PrimaryButton>
                        <div className="grid grid-cols-2 gap-3">
                            <SecondaryButton
                                onClick={() =>
                                    downloadPng(
                                        qr_url,
                                        `qr-${member_id ?? user.id}.png`,
                                    )
                                }
                            >
                                Download
                            </SecondaryButton>
                            <a
                                href={route('id-card', user.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                            >
                                Print ID card
                            </a>
                        </div>
                    </div>

                    {bright && (
                        <BrightView
                            url={qr_url}
                            onClose={() => setBright(false)}
                        />
                    )}
                </div>
            ) : (
                <section className="card mx-auto max-w-sm p-8 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-danger">
                        <Lock size={24} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h1 className="mt-4 text-2xl">QR code locked</h1>
                    <p className="mt-2 text-sm text-neutral-600">
                        Your QR code isn't available right now. Please speak to
                        your department admin.
                    </p>
                </section>
            )}
        </MemberLayout>
    );
}
