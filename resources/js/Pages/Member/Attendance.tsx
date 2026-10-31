import MemberLayout from '@/Layouts/MemberLayout';
import { Head, Link } from '@inertiajs/react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

type Day = { id: number; date: string; title: string; present: boolean };

export default function Attendance({
    month,
    monthLabel,
    previousMonth,
    nextMonth,
    overall,
    days,
}: {
    month: string;
    monthLabel: string;
    previousMonth: string;
    nextMonth: string | null;
    overall: { attended: number; total: number; rate: number | null };
    days: Day[];
}) {
    const [year, monthNumber] = month.split('-').map(Number);
    const offset = new Date(year, monthNumber - 1, 1).getDay();
    const length = new Date(year, monthNumber, 0).getDate();

    const dayCell = (day: number) => {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        const services = days.filter((item) => item.date === date);
        const present = services.some((item) => item.present);
        const label = services
            .map((item) => `${item.title}: ${item.present ? 'present' : 'missed'}`)
            .join(', ');

        return (
            <li
                key={day}
                title={label || undefined}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums ${
                    services.length === 0
                        ? 'text-neutral-600'
                        : present
                          ? 'bg-success font-semibold text-white'
                          : 'border border-danger text-danger'
                }`}
            >
                <span>{day}</span>
                {services.length > 0 &&
                    (present ? (
                        <Check size={14} aria-hidden="true" />
                    ) : (
                        <X size={14} aria-hidden="true" />
                    ))}
                {label && <span className="sr-only">{label}</span>}
            </li>
        );
    };

    return (
        <MemberLayout>
            <Head title="Attendance" />

            <h1 className="text-3xl">Attendance</h1>
            <div className="gold-rule mb-6" />

            <p className="text-sm text-neutral-600">
                {overall.rate === null
                    ? 'No services recorded yet.'
                    : `Overall ${overall.rate}%, ${overall.attended} of ${overall.total} service days`}
            </p>

            <section className="card mt-4 p-4">
                <div className="flex items-center justify-between">
                    <Link
                        href={route('member.attendance', {
                            month: previousMonth,
                        })}
                        aria-label="Previous month"
                        className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        <ChevronLeft size={20} strokeWidth={1.75} />
                    </Link>
                    <h2 className="text-xl">{monthLabel}</h2>
                    {nextMonth ? (
                        <Link
                            href={route('member.attendance', {
                                month: nextMonth,
                            })}
                            aria-label="Next month"
                            className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            <ChevronRight size={20} strokeWidth={1.75} />
                        </Link>
                    ) : (
                        <span className="w-9" />
                    )}
                </div>

                <ul
                    aria-hidden="true"
                    className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-neutral-600"
                >
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                        <li key={index}>{day}</li>
                    ))}
                </ul>
                <ul className="mt-1 grid grid-cols-7 gap-1">
                    {Array.from({ length: offset }, (_, index) => (
                        <li key={`blank-${index}`} aria-hidden="true" />
                    ))}
                    {Array.from({ length }, (_, index) => dayCell(index + 1))}
                </ul>
            </section>

            <ul className="mt-3 flex gap-4 text-xs text-neutral-600">
                <li className="flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-success text-white">
                        <Check size={12} aria-hidden="true" />
                    </span>
                    Present
                </li>
                <li className="flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-danger text-danger">
                        <X size={12} aria-hidden="true" />
                    </span>
                    Missed
                </li>
            </ul>
        </MemberLayout>
    );
}
