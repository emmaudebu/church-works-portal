import Avatar from '@/Components/Avatar';
import Embers from '@/Components/Site/Embers';

export type Officer = {
    id: number;
    full_name: string;
    office: string | null;
    photo_url: string | null;
};

function HeadCard({ officer }: { officer: Officer }) {
    return (
        <article className="reveal relative mx-auto max-w-sm text-center">
            <div className="relative mx-auto w-56 sm:w-64">
                <div className="absolute -inset-3 rounded-t-full border border-gold-500/40" />
                <div className="aspect-[4/5] overflow-hidden rounded-t-full bg-primary-900 ring-2 ring-gold-500">
                    {officer.photo_url ? (
                        <img
                            src={officer.photo_url}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="flex h-full items-center justify-center font-serif text-6xl text-gold-300">
                            {officer.full_name
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join('')}
                        </span>
                    )}
                </div>
            </div>
            <span className="relative -mt-4 inline-block rounded-full bg-gold-500 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-900">
                {officer.office}
            </span>
            <h3 className="mt-3 text-2xl text-white">{officer.full_name}</h3>
        </article>
    );
}

function OfficerCard({ officer }: { officer: Officer }) {
    return (
        <article className="reveal w-[calc(50%-0.625rem)] rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-gold-500/60 lg:w-48">
            <Avatar
                name={officer.full_name}
                src={officer.photo_url}
                className="mx-auto h-24 w-24 text-2xl"
            />
            <h3 className="mt-4 text-lg text-white">{officer.full_name}</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gold-300">
                {officer.office}
            </p>
        </article>
    );
}

export default function Leadership({ officers }: { officers: Officer[] }) {
    const [head, ...others] = officers;

    return (
        <section
            id="leadership"
            className="relative scroll-mt-28 overflow-hidden bg-charcoal-900 py-20"
        >
            <Embers density={0.5} />
            <div className="relative mx-auto max-w-7xl px-4 md:px-8">
                <div className="reveal text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
                        Serving as executives
                    </p>
                    <h2 className="mt-2 text-3xl text-white md:text-4xl">
                        Our <em className="accent">Leadership</em>
                    </h2>
                    <div className="mx-auto mt-3 h-0.5 w-16 bg-gold-500" />
                </div>

                <div className="mt-12">
                    <HeadCard officer={head} />
                </div>

                {others.length > 0 && (
                    <div className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-5">
                        {others.map((officer) => (
                            <OfficerCard key={officer.id} officer={officer} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
