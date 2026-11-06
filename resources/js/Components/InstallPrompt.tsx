import {
    canInstall,
    isInstalled,
    isIos,
    takeInstallPrompt,
} from '@/lib/install';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'install-prompt-dismissed-at';

/** After "Not now" the prompt rests this long before asking again. */
const REST_DAYS = 7;

/** Gives the page a moment to load before asking. */
const DELAY_MS = 3000;

function isPhone(): boolean {
    return (
        /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent))
    );
}

function recentlyDismissed(): boolean {
    try {
        const at = Number(localStorage.getItem(DISMISSED_KEY));

        return at > 0 && Date.now() - at < REST_DAYS * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

function rememberDismissal(): void {
    try {
        localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
        // Private browsing: the prompt simply asks again next visit.
    }
}

/**
 * Invites people on a phone to add the app to their home screen. Android
 * browsers install it with one tap; on iPhone it explains the Share menu,
 * since Safari has no install button of its own.
 */
export default function InstallPrompt({ raised = false }: { raised?: boolean }) {
    const { branding } = usePage<PageProps>().props;
    const [ready, setReady] = useState(false);
    const [available, setAvailable] = useState(canInstall);
    const [closed, setClosed] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setReady(true), DELAY_MS);
        const show = () => setAvailable(true);
        const installed = () => setClosed(true);

        window.addEventListener('install-available', show);
        window.addEventListener('appinstalled', installed);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('install-available', show);
            window.removeEventListener('appinstalled', installed);
        };
    }, []);

    const ios = isIos() || /macintosh/i.test(navigator.userAgent);

    if (
        closed ||
        !ready ||
        !isPhone() ||
        isInstalled() ||
        recentlyDismissed() ||
        (!available && !ios)
    ) {
        return null;
    }

    /** Slides the toast away before removing it. */
    const close = () => {
        setLeaving(true);
        setTimeout(() => setClosed(true), 300);
    };

    const dismiss = () => {
        rememberDismissal();
        close();
    };

    const install = async () => {
        const prompt = takeInstallPrompt();

        close();

        if (prompt) {
            await prompt.prompt();

            if ((await prompt.userChoice).outcome === 'dismissed') {
                rememberDismissal();
            }
        }
    };

    return (
        <aside
            role="dialog"
            aria-labelledby="install-prompt-title"
            className={`fixed inset-x-3 z-40 mx-auto max-w-sm overflow-hidden rounded-2xl border border-gold-500/40 bg-charcoal-900/95 text-white shadow-2xl backdrop-blur transition duration-300 ${
                raised
                    ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]'
                    : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'
            } ${leaving ? 'translate-y-4 opacity-0' : 'animate-toast-bottom'}`}
        >
            <div className="flex gap-3 p-4">
                <span className="relative shrink-0">
                    <span
                        aria-hidden="true"
                        className="absolute -inset-1 rounded-2xl bg-gold-500/30 blur-md"
                    />
                    <img
                        src="/images/icons/icon-192.png"
                        alt=""
                        className="relative h-12 w-12 rounded-xl ring-2 ring-gold-500"
                    />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
                        Get the app
                    </p>
                    <p
                        id="install-prompt-title"
                        className="mt-0.5 font-serif text-lg leading-snug"
                    >
                        Add {branding.church_name} to your home screen
                    </p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Close"
                    className="self-start rounded-full p-1 text-silver-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                </button>
            </div>

            {available ? (
                <div className="px-4 pb-4">
                    <p className="text-sm text-silver-300">
                        Opens like any other app, loads faster and can send
                        you notices.
                    </p>
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={dismiss}
                            className="rounded-full px-4 py-2 text-sm font-medium text-silver-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            Not now
                        </button>
                        <button
                            type="button"
                            onClick={install}
                            className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-900"
                        >
                            <span
                                aria-hidden="true"
                                className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 animate-shine bg-gradient-to-r from-transparent via-white/60 to-transparent"
                            />
                            <Download
                                size={16}
                                strokeWidth={2}
                                aria-hidden="true"
                                className="relative"
                            />
                            <span className="relative">Install</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-4 pb-4">
                    <ol className="space-y-2 text-sm">
                        <li className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold-300">
                                <Share
                                    size={16}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                />
                            </span>
                            <span>
                                Tap <strong>Share</strong> in the browser bar
                            </span>
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold-300">
                                <SquarePlus
                                    size={16}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                />
                            </span>
                            <span>
                                Choose <strong>Add to Home Screen</strong>
                            </span>
                        </li>
                    </ol>
                    <p className="mt-3 text-xs text-silver-300">
                        Opened from WhatsApp? Open this page in Safari first.
                    </p>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="mt-3 w-full rounded-full bg-gold-500 px-5 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-900"
                    >
                        Got it
                    </button>
                </div>
            )}
        </aside>
    );
}
