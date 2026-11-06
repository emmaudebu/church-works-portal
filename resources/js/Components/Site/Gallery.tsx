import { GalleryImage } from '@/types';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Names the saved file after its caption, keeping the picture's own type. */
function downloadName(image: GalleryImage): string {
    const extension = image.url.split('?')[0].split('.').pop() ?? 'jpg';
    const name =
        image.caption
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || `photo-${Math.abs(image.id)}`;

    return `${name}.${extension}`;
}

/**
 * A grid of pictures that open full screen. Pass `reveal={false}` when the
 * grid appears after the page loads, which the scroll fade-in would miss.
 */
export default function Gallery({
    images,
    reveal = true,
}: {
    images: GalleryImage[];
    reveal?: boolean;
}) {
    const [open, setOpen] = useState<number | null>(null);

    const move = (by: number) =>
        setOpen(
            (index) =>
                ((index ?? 0) + by + images.length) % images.length,
        );

    const showing = open !== null;

    useEffect(() => {
        if (!showing) {
            return;
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                setOpen((index) => ((index ?? 0) + 1) % images.length);
            } else if (e.key === 'ArrowLeft') {
                setOpen(
                    (index) =>
                        ((index ?? 0) - 1 + images.length) % images.length,
                );
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showing, images.length]);

    const shown = open === null ? null : images[open];

    return (
        <>
            <ul className="columns-2 gap-4 md:columns-3 lg:columns-4">
                {images.map((image, index) => (
                    <li
                        key={image.id}
                        className={`${reveal ? 'reveal ' : ''}mb-4 break-inside-avoid`}
                    >
                        <button
                            type="button"
                            onClick={() => setOpen(index)}
                            aria-label={
                                image.caption ?? `Open picture ${index + 1}`
                            }
                            className="group block w-full overflow-hidden rounded-2xl shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            <img
                                src={image.url}
                                alt={image.caption ?? ''}
                                loading="lazy"
                                className="w-full transition duration-500 group-hover:scale-105"
                            />
                        </button>
                    </li>
                ))}
            </ul>

            <Dialog
                open={shown !== null}
                onClose={() => setOpen(null)}
                className="relative z-50"
            >
                <DialogBackdrop className="fixed inset-0 animate-page-in bg-charcoal-900/90" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="flex max-h-full max-w-5xl animate-popup-zoom flex-col items-center">
                        {shown && (
                            <>
                                <img
                                    src={shown.url}
                                    alt={shown.caption ?? ''}
                                    className="max-h-[80vh] rounded-lg object-contain"
                                />
                                {shown.caption && (
                                    <p className="mt-3 text-center text-sm text-white">
                                        {shown.caption}
                                    </p>
                                )}
                            </>
                        )}
                        <div className="mt-3 flex gap-2 text-white">
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    aria-label="Previous picture"
                                    onClick={() => move(-1)}
                                    className="rounded-full border border-white/40 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                                >
                                    <ChevronLeft size={20} strokeWidth={1.75} />
                                </button>
                            )}
                            <button
                                type="button"
                                aria-label="Close"
                                onClick={() => setOpen(null)}
                                className="rounded-full border border-white/40 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                            >
                                <X size={20} strokeWidth={1.75} />
                            </button>
                            {images.length > 1 && (
                                <button
                                    type="button"
                                    aria-label="Next picture"
                                    onClick={() => move(1)}
                                    className="rounded-full border border-white/40 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                                >
                                    <ChevronRight size={20} strokeWidth={1.75} />
                                </button>
                            )}
                            {shown && (
                                <a
                                    href={shown.url}
                                    download={downloadName(shown)}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/40 py-2 pl-3 pr-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                                >
                                    <Download
                                        size={20}
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                    />
                                    Download
                                </a>
                            )}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </>
    );
}
