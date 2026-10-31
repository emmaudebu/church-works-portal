import Avatar from '@/Components/Avatar';
import MemberLayout from '@/Layouts/MemberLayout';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

function AttendanceRing({ rate }: { rate: number | null }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative h-28 w-28 shrink-0">
            <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className="h-full w-full -rotate-90"
            >
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="9"
                    className="stroke-neutral-200"
                />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - (rate ?? 0) / 100)}
                    className="stroke-gold-500"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums">
                {rate === null ? '—' : `${rate}%`}
            </span>
        </div>
    );
}

export default function Home({
    month,
    nextService,
}: {
    month: { attended: number; total: number; rate: number | null };
    nextService: { title: string; date_label: string; time: string } | null;
}) {
    const { user } = usePage<PageProps>().props.auth;

    return (
        <MemberLayout>
            <Head title="Home" />

            <section className="bg-hero flex items-center gap-4 rounded-2xl p-6 text-white shadow-soft">
                <Avatar
                    name={user.full_name}
                    src={user.photo_url}
                    className="h-14 w-14 shrink-0 text-lg"
                />
                <div>
                    <h1 className="text-2xl">
                        Welcome back, {user.full_name.split(' ')[0]}
                    </h1>
                    <p className="text-sm text-gold-300">
                        {user.unit ?? user.department ?? 'Covenant Workforce'}
                    </p>
                </div>
            </section>

            <Link
                href={route('member.attendance')}
                className="card mt-4 flex items-center gap-5 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
            >
                <AttendanceRing rate={month.rate} />
                <span>
                    <span className="block font-serif text-xl font-semibold">
                        This month
                    </span>
                    <span className="text-sm tabular-nums text-neutral-600">
                        {month.attended} of {month.total} services
                    </span>
                    <span className="mt-1 block text-sm font-medium text-primary-700">
                        View history
                    </span>
                </span>
            </Link>

            <section className="card mt-4 p-5">
                <h2 className="text-xl">Next service</h2>
                {nextService ? (
                    <>
                        <p className="mt-1 font-medium">{nextService.title}</p>
                        <p className="text-sm text-neutral-600">
                            {nextService.date_label} · {nextService.time}
                        </p>
                        <Link
                            href={route('member.my-qr')}
                            className="mt-3 inline-flex rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                        >
                            Show my QR
                        </Link>
                    </>
                ) : (
                    <p className="mt-1 text-sm text-neutral-600">
                        No services scheduled yet.
                    </p>
                )}
            </section>
        </MemberLayout>
    );
}
