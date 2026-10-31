import { useEffect, useState } from 'react';

function remaining(target: number) {
    const seconds = Math.max(0, Math.floor((target - Date.now()) / 1000));

    return {
        Days: Math.floor(seconds / 86400),
        Hrs: Math.floor(seconds / 3600) % 24,
        Min: Math.floor(seconds / 60) % 60,
        Sec: seconds % 60,
    };
}

export default function Countdown({
    to,
    tone = 'dark',
}: {
    to: string;
    tone?: 'dark' | 'light';
}) {
    const target = new Date(to).getTime();
    const [time, setTime] = useState(() => remaining(target));

    useEffect(() => {
        const timer = setInterval(() => setTime(remaining(target)), 1000);

        return () => clearInterval(timer);
    }, [target]);

    if (target <= Date.now()) {
        return (
            <p
                className={`text-sm font-semibold ${tone === 'dark' ? 'text-gold-300' : 'text-success'}`}
            >
                Happening now
            </p>
        );
    }

    return (
        <div
            role="timer"
            aria-label={`Starts in ${time.Days} days, ${time.Hrs} hours and ${time.Min} minutes`}
            className="grid grid-cols-4 gap-2"
        >
            {Object.entries(time).map(([label, value]) => (
                <div
                    key={label}
                    aria-hidden="true"
                    className={`rounded-lg px-2 py-2 text-center ${
                        tone === 'dark'
                            ? 'bg-white/10 text-white'
                            : 'bg-neutral-50 text-neutral-900'
                    }`}
                >
                    <span className="block font-serif text-xl tabular-nums">
                        {String(value).padStart(2, '0')}
                    </span>
                    <span
                        className={`text-[10px] uppercase tracking-wider ${
                            tone === 'dark'
                                ? 'text-silver-300'
                                : 'text-neutral-600'
                        }`}
                    >
                        {label}
                    </span>
                </div>
            ))}
        </div>
    );
}
