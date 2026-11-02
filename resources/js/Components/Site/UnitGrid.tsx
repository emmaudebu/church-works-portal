import {
    Laptop,
    Lightbulb,
    LucideIcon,
    Projector,
    Video,
    Volume2,
    Wrench,
} from 'lucide-react';

const KNOWN_UNITS: Record<string, { icon: LucideIcon; text: string }> = {
    sound: {
        icon: Volume2,
        text: 'Keeps every word and every note clear, from the mixing desk to the last row.',
    },
    media: {
        icon: Video,
        text: 'Captures each service in pictures and video so the message travels further.',
    },
    lighting: {
        icon: Lightbulb,
        text: 'Sets the stage and keeps the auditorium bright and focused.',
    },
    projection: {
        icon: Projector,
        text: 'Puts scriptures, songs and notes on screen at the right moment.',
    },
    laptop: {
        icon: Laptop,
        text: 'Prepares and runs the computers that every service depends on.',
    },
};

export default function UnitGrid({ units }: { units: string[] }) {
    return (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((unit) => {
                const known = KNOWN_UNITS[unit.toLowerCase()];
                const Icon = known?.icon ?? Wrench;

                return (
                    <li
                        key={unit}
                        className="reveal group rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-gold-500/60"
                    >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-700 text-gold-300 ring-4 ring-gold-500/20 transition group-hover:ring-gold-500/50">
                            <Icon
                                size={22}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                        </span>
                        <h3 className="mt-4 text-xl text-white">{unit}</h3>
                        <p className="mt-2 text-sm text-silver-300">
                            {known?.text ??
                                'Part of the team that keeps every service running.'}
                        </p>
                    </li>
                );
            })}
        </ul>
    );
}
