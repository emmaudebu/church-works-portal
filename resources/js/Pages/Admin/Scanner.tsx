import Avatar from '@/Components/Avatar';
import { CheckedInMember, PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    LucideIcon,
    Search,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Status = 'present' | 'duplicate' | 'suspended' | 'invalid' | 'closed' | 'error';

type Result = {
    status: Status;
    member?: CheckedInMember;
    checked_in_at?: string;
};

type Live = { count: number; recent: CheckedInMember[] };

const RESCAN_MS = 3000;

const OUTCOMES: Record<
    Status,
    { label: string; className: string; icon: LucideIcon }
> = {
    present: {
        label: 'Marked present',
        className: 'bg-success',
        icon: CheckCircle2,
    },
    duplicate: {
        label: 'Already checked in',
        className: 'bg-warning',
        icon: AlertTriangle,
    },
    closed: {
        label: 'Attendance is closed',
        className: 'bg-warning',
        icon: AlertTriangle,
    },
    suspended: {
        label: 'Suspended or invalid code',
        className: 'bg-danger',
        icon: XCircle,
    },
    invalid: {
        label: 'Suspended or invalid code',
        className: 'bg-danger',
        icon: XCircle,
    },
    error: {
        label: 'Could not reach the server. Try again.',
        className: 'bg-danger',
        icon: XCircle,
    },
};

function playSound(context: AudioContext | null, status: Status) {
    if (!context) {
        return;
    }

    const tone = (frequency: number, start: number, length: number, type: OscillatorType) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.15;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + start);
        oscillator.stop(context.currentTime + start + length);
    };

    if (status === 'present') {
        tone(880, 0, 0.12, 'sine');
        tone(1320, 0.12, 0.2, 'sine');
    } else if (status !== 'duplicate' && status !== 'closed') {
        tone(140, 0, 0.35, 'square');
        navigator.vibrate?.(300);
    }
}

export default function Scanner({
    service,
    count,
    recent,
}: {
    service: {
        id: number;
        title: string;
        date_label: string;
        accepting: boolean;
    };
    count: number;
    recent: CheckedInMember[];
}) {
    const { branding } = usePage<PageProps>().props;
    const [live, setLive] = useState<Live>({ count, recent });
    const [result, setResult] = useState<Result | null>(null);
    const [scanning, setScanning] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [matches, setMatches] = useState<
        (CheckedInMember & { status: string })[]
    >([]);

    const scanner = useRef<Html5Qrcode | null>(null);
    const audio = useRef<AudioContext | null>(null);
    const lastScan = useRef({ token: '', at: 0 });
    const busy = useRef(false);

    const show = (data: Result & Partial<Live>) => {
        setResult({
            status: data.status,
            member: data.member,
            checked_in_at: data.checked_in_at,
        });
        playSound(audio.current, data.status);

        if (data.count !== undefined && data.recent) {
            setLive({ count: data.count, recent: data.recent });
        }
    };

    const send = async (url: string, body: Record<string, unknown>) => {
        try {
            const { data } = await axios.post(url, body);

            show(data);
        } catch {
            show({ status: 'error' });
        }
    };

    const onDecode = async (token: string) => {
        const repeat =
            lastScan.current.token === token &&
            Date.now() - lastScan.current.at < RESCAN_MS;

        if (busy.current || repeat) {
            return;
        }

        busy.current = true;
        lastScan.current = { token, at: Date.now() };

        await send(route('admin.scanner.check-in', service.id), { token });

        busy.current = false;
    };

    const start = async () => {
        audio.current ??= new AudioContext();
        setCameraError(null);

        try {
            scanner.current = new Html5Qrcode('reader', {
                verbose: false,
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            });

            await scanner.current.start(
                { facingMode: 'environment' },
                { fps: 10 },
                onDecode,
                () => {},
            );

            setScanning(true);
        } catch {
            setCameraError(
                window.isSecureContext
                    ? 'The camera could not start. Allow camera access for this site, then try again.'
                    : 'The camera only works on a secure (https) address. Use the manual search below.',
            );
        }
    };

    useEffect(
        () => () => {
            if (scanner.current?.isScanning) {
                scanner.current.stop().catch(() => {});
            }
        },
        [],
    );

    useEffect(() => {
        if (query.trim().length < 2) {
            setMatches([]);

            return;
        }

        const timer = setTimeout(async () => {
            const { data } = await axios.get(
                route('admin.scanner.search', service.id),
                { params: { q: query } },
            );

            setMatches(data);
        }, 250);

        return () => clearTimeout(timer);
    }, [query, service.id]);

    const markPresent = async (id: number) => {
        audio.current ??= new AudioContext();

        await send(route('admin.scanner.manual', service.id), { user_id: id });

        setQuery('');
    };

    const outcome = result ? OUTCOMES[result.status] : null;

    return (
        <main className="min-h-screen bg-charcoal-900 px-4 pb-8 pt-4 text-white">
            <Head title={`Scanner - ${service.title}`} />

            <div className="mx-auto max-w-md">
                <header className="flex items-center justify-between">
                    <Link
                        href={route('admin.services')}
                        aria-label="Back to services"
                        className="rounded-lg p-2 text-silver-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <ArrowLeft size={20} strokeWidth={1.75} />
                    </Link>
                    <img
                        src={branding.logo_dark_url}
                        alt="Church logo"
                        className="h-10 w-auto"
                    />
                    <span className="w-9" />
                </header>

                <div className="mt-3 text-center">
                    <h1 className="text-2xl">{service.title}</h1>
                    <p className="text-sm text-silver-300">
                        Scan member QR codes · {service.date_label}
                    </p>
                </div>

                {!service.accepting && (
                    <p className="mt-3 rounded-lg bg-warning p-2 text-center text-sm">
                        Attendance is closed. Scans are refused, but you can
                        still mark people present by hand.
                    </p>
                )}

                <div className="relative mx-auto mt-4 aspect-square w-full max-w-xs overflow-hidden rounded-lg bg-black">
                    <div
                        id="reader"
                        className="h-full w-full [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover"
                    />

                    {['left-2 top-2 border-l-4 border-t-4', 'right-2 top-2 border-r-4 border-t-4', 'bottom-2 left-2 border-b-4 border-l-4', 'bottom-2 right-2 border-b-4 border-r-4'].map(
                        (corner) => (
                            <span
                                key={corner}
                                aria-hidden="true"
                                className={`pointer-events-none absolute h-10 w-10 border-gold-500 ${corner}`}
                            />
                        ),
                    )}

                    {scanning ? (
                        <span
                            aria-hidden="true"
                            className="scan-line pointer-events-none absolute inset-x-4 border-t-2 border-dashed border-primary-500"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                            <button
                                type="button"
                                onClick={start}
                                className="rounded-lg bg-primary-700 px-5 py-3 text-sm font-semibold transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                            >
                                Start camera
                            </button>
                        </div>
                    )}
                </div>

                <p className="mt-2 text-center text-sm text-silver-300">
                    {cameraError ?? 'Point the camera at a member QR code'}
                </p>

                <div aria-live="assertive" className="mt-4">
                    {result && outcome && (
                        <div
                            className={`flex items-center gap-3 rounded-2xl p-4 ${outcome.className}`}
                        >
                            {result.member ? (
                                <Avatar
                                    name={result.member.full_name}
                                    src={result.member.photo_url}
                                    className="h-16 w-16 shrink-0 text-lg"
                                />
                            ) : (
                                <outcome.icon
                                    size={40}
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                    className="shrink-0"
                                />
                            )}
                            <div className="min-w-0">
                                {result.member && (
                                    <p className="truncate text-lg font-semibold">
                                        {result.member.full_name}
                                    </p>
                                )}
                                <p className="text-sm font-medium">
                                    {outcome.label}
                                    {result.status === 'duplicate' &&
                                        ` at ${result.checked_in_at}`}
                                </p>
                                {result.member?.unit && (
                                    <p className="text-sm">
                                        {result.member.unit}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <ul className="mt-3 flex justify-center gap-4 text-xs text-silver-300">
                    <li className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-success" />
                        Present
                    </li>
                    <li className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-warning" />
                        Already checked in
                    </li>
                    <li className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                        Suspended or invalid
                    </li>
                </ul>

                <div className="mt-4 grid grid-cols-[auto_1fr] gap-3">
                    <div className="rounded-2xl bg-white/10 p-4 text-center">
                        <p
                            data-testid="count"
                            className="text-3xl font-semibold tabular-nums"
                        >
                            {live.count}
                        </p>
                        <p className="text-xs text-silver-300">Checked in</p>
                    </div>
                    <div className="relative rounded-2xl bg-white/10 p-4">
                        <label
                            htmlFor="member-search"
                            className="text-xs text-silver-300"
                        >
                            No ID card? Search member
                        </label>
                        <div className="relative mt-1">
                            <Search
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                                className="absolute left-2 top-1/2 -translate-y-1/2 text-silver-300"
                            />
                            <input
                                id="member-search"
                                type="search"
                                autoComplete="off"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full rounded-lg border-silver-500 bg-transparent py-1.5 pl-9 text-sm text-white focus:border-gold-500 focus:ring-gold-500"
                            />
                        </div>
                    </div>
                </div>

                {matches.length > 0 && (
                    <ul className="mt-3 divide-y divide-white/10 rounded-2xl bg-white/10">
                        {matches.map((member) => (
                            <li key={member.id}>
                                <button
                                    type="button"
                                    onClick={() => markPresent(member.id)}
                                    className="flex w-full items-center gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                                >
                                    <Avatar
                                        name={member.full_name}
                                        src={member.photo_url}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm">
                                        {member.full_name}
                                    </span>
                                    <span className="text-xs text-gold-300">
                                        {member.status === 'active'
                                            ? 'Mark present'
                                            : member.status}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <section className="mt-6">
                    <h2 className="text-lg">Recent check-ins</h2>
                    {live.recent.length === 0 ? (
                        <p className="mt-2 text-sm text-silver-300">
                            Nobody has checked in yet.
                        </p>
                    ) : (
                        <ul className="mt-2 space-y-2">
                            {live.recent.map((member) => (
                                <li
                                    key={member.attendance_id}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <Avatar
                                        name={member.full_name}
                                        src={member.photo_url}
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                        {member.full_name}
                                    </span>
                                    <span className="tabular-nums text-silver-300">
                                        {member.checked_in_at}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </main>
    );
}
