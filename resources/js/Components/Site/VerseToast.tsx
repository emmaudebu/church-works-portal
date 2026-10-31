import { VerseToastData } from '@/types';
import { BookOpen, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const DISMISSED_KEY = 'verse-toast-dismissed';
const NEXT_KEY = 'verse-toast-next';
const LAST_KEY = 'verse-toast-last';

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

const PLACES: Record<string, { place: string; enter: string }> = {
    'top-left': { place: 'left-4 top-20', enter: 'animate-toast-left' },
    'top-center': {
        place: 'inset-x-4 top-20 mx-auto',
        enter: 'animate-toast-top',
    },
    'top-right': { place: 'right-4 top-20', enter: 'animate-toast-right' },
    'bottom-left': { place: 'bottom-4 left-4', enter: 'animate-toast-left' },
    'bottom-center': {
        place: 'inset-x-4 bottom-4 mx-auto',
        enter: 'animate-toast-bottom',
    },
    'bottom-right': { place: 'bottom-4 right-4', enter: 'animate-toast-right' },
};

function read(key: string) {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function write(key: string, value: string) {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        // Without storage the timing simply restarts on each page.
    }
}

function randomIndex(length: number) {
    const last = Number(read(LAST_KEY) ?? -1);
    let index = Math.floor(Math.random() * length);

    if (length > 1 && index === last) {
        index = (index + 1) % length;
    }

    write(LAST_KEY, String(index));

    return index;
}

type Shown = { index: number; position: string; key: number };

export default function VerseToast({
    toast,
    preview = false,
    raised = false,
}: {
    toast: VerseToastData;
    preview?: boolean;
    raised?: boolean;
}) {
    const [shown, setShown] = useState<Shown | null>(null);
    const [leaving, setLeaving] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const pick = useCallback(
        (): Shown => ({
            index: randomIndex(toast.verses.length),
            position:
                toast.position === 'random'
                    ? CORNERS[Math.floor(Math.random() * CORNERS.length)]
                    : toast.position,
            key: Date.now(),
        }),
        [toast],
    );

    const hide = useCallback(() => {
        setLeaving(true);
        setTimeout(() => {
            setShown(null);
            setLeaving(false);
        }, 300);
    }, []);

    const startHideTimer = useCallback(() => {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(hide, toast.duration * 1000);
    }, [hide, toast.duration]);

    useEffect(() => {
        if (preview) {
            setShown(pick());
            startHideTimer();

            return;
        }

        if (read(DISMISSED_KEY)) {
            return;
        }

        let timer: ReturnType<typeof setTimeout>;

        const schedule = (wait: number) => {
            write(NEXT_KEY, String(Date.now() + wait));

            timer = setTimeout(() => {
                // Wait for a turn while a pop-up or menu is open, or the tab is hidden.
                if (document.hidden || document.querySelector('[role="dialog"]')) {
                    schedule(5000);

                    return;
                }

                setShown(pick());
                startHideTimer();
                schedule(toast.interval * 1000);
            }, wait);
        };

        const next = Number(read(NEXT_KEY) ?? 0);

        schedule(
            next > Date.now() ? next - Date.now() : toast.first_delay * 1000,
        );

        return () => clearTimeout(timer);
    }, [pick, preview, startHideTimer, toast.first_delay, toast.interval]);

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    if (!shown) {
        return null;
    }

    const verse = toast.verses[shown.index];
    const { place, enter } = PLACES[shown.position] ?? PLACES['bottom-right'];
    // Member pages have a tab bar along the bottom on phones.
    const placement = raised
        ? place.replace('bottom-4', 'bottom-24 lg:bottom-4')
        : place;

    const dismiss = () => {
        clearTimeout(hideTimer.current);

        if (!preview) {
            write(DISMISSED_KEY, '1');
        }

        hide();
    };

    return (
        <aside
            role="status"
            aria-label="Bible verse"
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={startHideTimer}
            className={`fixed z-40 w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border border-gold-500/40 bg-charcoal-900/95 text-white shadow-2xl backdrop-blur transition duration-300 ${placement} ${leaving ? 'translate-y-2 opacity-0' : enter}`}
        >
            <div className="flex gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-neutral-900">
                    <BookOpen size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <blockquote className="font-serif text-base italic leading-snug">
                        “{verse.text}”
                    </blockquote>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gold-300">
                        {verse.reference}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Close verse and stop showing verses for this visit"
                    onClick={dismiss}
                    className="self-start rounded-full p-1 text-silver-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                    <X size={16} strokeWidth={2} aria-hidden="true" />
                </button>
            </div>
            <span
                key={shown.key}
                aria-hidden="true"
                className="block h-0.5 origin-left animate-toast-timer bg-gold-500"
                style={{ animationDuration: `${toast.duration}s` }}
            />
        </aside>
    );
}
