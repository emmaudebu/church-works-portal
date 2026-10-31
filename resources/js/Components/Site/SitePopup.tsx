import { SitePopupData } from '@/types';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const CLOSE_MS = 250;

const TRANSITIONS: Record<SitePopupData['transition'], string> = {
    fade: 'animate-popup-fade',
    zoom: 'animate-popup-zoom',
    'slide-up': 'animate-popup-slide-up',
    'slide-down': 'animate-popup-slide-down',
    bounce: 'animate-popup-bounce',
    flip: 'animate-popup-flip',
};

type Seen = { views: number; last: string | null };

const today = () => new Date().toDateString();

function storageKey(popup: SitePopupData) {
    return `site-popup-${popup.version}`;
}

function readSeen(popup: SitePopupData): Seen {
    try {
        return (
            JSON.parse(localStorage.getItem(storageKey(popup)) ?? 'null') ?? {
                views: 0,
                last: null,
            }
        );
    } catch {
        return { views: 0, last: null };
    }
}

function seenThisVisit(popup: SitePopupData) {
    try {
        return sessionStorage.getItem(storageKey(popup)) === '1';
    } catch {
        return false;
    }
}

function shouldShow(popup: SitePopupData) {
    const seen = readSeen(popup);

    if (popup.max_views !== null && seen.views >= popup.max_views) {
        return false;
    }

    if (popup.frequency === 'daily') {
        return seen.last !== today();
    }

    return popup.frequency === 'every_page' || !seenThisVisit(popup);
}

function recordView(popup: SitePopupData) {
    try {
        const seen = readSeen(popup);

        localStorage.setItem(
            storageKey(popup),
            JSON.stringify({ views: seen.views + 1, last: today() }),
        );
        sessionStorage.setItem(storageKey(popup), '1');
    } catch {
        // Without storage the pop-up simply shows again next time.
    }
}

export default function SitePopup({
    popup,
    preview = false,
}: {
    popup: SitePopupData;
    preview?: boolean;
}) {
    const [open, setOpen] = useState(preview);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (preview || !shouldShow(popup)) {
            return;
        }

        const timer = setTimeout(() => {
            recordView(popup);
            setOpen(true);
        }, popup.delay * 1000);

        return () => clearTimeout(timer);
    }, [popup, preview]);

    const close = () => {
        setClosing(true);
        setTimeout(() => setOpen(false), CLOSE_MS);
    };

    const image = (
        <img
            src={popup.image_url}
            alt={popup.alt}
            className="mx-auto max-h-[85vh] w-auto max-w-full object-contain drop-shadow-2xl"
        />
    );

    const external = popup.link?.startsWith('http');

    return (
        <Dialog open={open} onClose={close} className="relative z-50">
            <DialogBackdrop
                className={`fixed inset-0 bg-charcoal-900/75 backdrop-blur-sm transition-opacity duration-200 ${
                    closing ? 'opacity-0' : 'animate-page-in'
                }`}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <DialogPanel
                    className={`relative max-w-4xl transition duration-200 ${
                        closing
                            ? 'scale-95 opacity-0'
                            : TRANSITIONS[popup.transition]
                    }`}
                >
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={close}
                        className="absolute right-0 top-0 z-10 rounded-full bg-primary-700 p-2 text-white shadow-soft ring-2 ring-gold-500 transition hover:bg-primary-500 focus:outline-none focus-visible:ring-white"
                    >
                        <X size={20} strokeWidth={2} aria-hidden="true" />
                    </button>
                    {popup.link ? (
                        <a
                            href={popup.link}
                            target={external ? '_blank' : undefined}
                            rel={external ? 'noreferrer' : undefined}
                            onClick={close}
                            className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            {image}
                        </a>
                    ) : (
                        image
                    )}
                </DialogPanel>
            </div>
        </Dialog>
    );
}
