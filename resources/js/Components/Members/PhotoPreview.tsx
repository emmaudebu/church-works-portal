import Avatar from '@/Components/Avatar';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { useState } from 'react';

/** An avatar that opens the full photo when it is clicked. */
export default function PhotoPreview({
    name,
    src,
    className,
}: {
    name: string;
    src?: string | null;
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    if (!src) {
        return <Avatar name={name} className={className} />;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={`View photo of ${name}`}
                className="shrink-0 rounded-full transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
            >
                <Avatar name={name} src={src} className={className} />
            </button>

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                className="relative z-50"
            >
                <DialogBackdrop className="fixed inset-0 animate-page-in bg-charcoal-900/90" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="flex max-h-full w-full max-w-md animate-popup-zoom flex-col items-center">
                        <img
                            src={src}
                            alt={`Photo of ${name}`}
                            className="max-h-[80vh] w-full rounded-lg object-contain"
                        />
                        <p className="mt-3 text-center text-sm text-white">
                            {name}
                        </p>
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={() => setOpen(false)}
                            className="mt-3 rounded-full border border-white/40 p-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            <X size={20} strokeWidth={1.75} />
                        </button>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
