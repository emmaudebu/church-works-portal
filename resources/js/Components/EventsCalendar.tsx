import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export type CalendarEvent = { id: number; title: string; date: string };

export default function EventsCalendar({
    events,
}: {
    events: CalendarEvent[];
}) {
    const [shown, setShown] = useState(() => {
        const today = new Date();
        const upcoming = events.find(
            (event) => new Date(`${event.date}T23:59`) >= today,
        );
        const start = upcoming ? new Date(`${upcoming.date}T00:00`) : today;

        return new Date(start.getFullYear(), start.getMonth(), 1);
    });

    const year = shown.getFullYear();
    const month = shown.getMonth();
    const offset = new Date(year, month, 1).getDay();
    const length = new Date(year, month + 1, 0).getDate();

    const dateKey = (day: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return (
        <section className="card mb-6 p-4">
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setShown(new Date(year, month - 1, 1))}
                    className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ChevronLeft size={20} strokeWidth={1.75} />
                </button>
                <h2 className="text-xl">
                    {shown.toLocaleString('en', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </h2>
                <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setShown(new Date(year, month + 1, 1))}
                    className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ChevronRight size={20} strokeWidth={1.75} />
                </button>
            </div>

            <ul
                aria-hidden="true"
                className="mt-2 grid grid-cols-7 text-center text-xs text-neutral-600"
            >
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <li key={index}>{day}</li>
                ))}
            </ul>
            <ul className="mt-1 grid grid-cols-7 gap-1 text-sm tabular-nums">
                {Array.from({ length: offset }, (_, index) => (
                    <li key={`blank-${index}`} aria-hidden="true" />
                ))}
                {Array.from({ length }, (_, index) => {
                    const day = index + 1;
                    const event = events.find(
                        (item) => item.date === dateKey(day),
                    );

                    return (
                        <li
                            key={day}
                            className="flex h-10 items-center justify-center"
                        >
                            {event ? (
                                <Link
                                    href={route('posts.show', event.id)}
                                    title={event.title}
                                    aria-label={`${day}: ${event.title}`}
                                    className="flex h-full w-full items-center justify-center rounded-lg bg-primary-700 font-semibold text-white ring-2 ring-gold-500 focus:outline-none focus-visible:ring-primary-900"
                                >
                                    {day}
                                </Link>
                            ) : (
                                <span className="text-neutral-600">{day}</span>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
