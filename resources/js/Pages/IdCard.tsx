import PrimaryButton from '@/Components/PrimaryButton';
import { PageProps } from '@/types';
import { Head, usePage } from '@inertiajs/react';

interface Member {
    full_name: string;
    member_id: string | null;
    unit: string | null;
    department: string | null;
    office: string;
    photo_url: string | null;
    qr_url: string;
}

/**
 * The curved bands in the corners of the card. The small ones on the back
 * stay clear of its text.
 */
function CornerWaves({
    flip = false,
    small = false,
}: {
    flip?: boolean;
    small?: boolean;
}) {
    const size = small ? 'h-1/2 w-3/5' : 'h-full w-full';
    const corner = flip ? 'bottom-0 right-0 rotate-180' : 'left-0 top-0';

    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 100 160"
            preserveAspectRatio="none"
            className={`pointer-events-none absolute ${size} ${corner}`}
        >
            <path
                d="M0 0 H62 C40 6 18 14 0 30 Z"
                className="fill-primary-700"
            />
            <path
                d="M0 30 C18 14 40 6 62 0 H70 C46 8 22 18 0 36 Z"
                className="fill-gold-500"
            />
        </svg>
    );
}

function Front({ member, churchName, logo }: { member: Member; churchName: string; logo: string }) {
    const [firstName, ...otherNames] = member.full_name.split(/\s+/);

    return (
        <article className="id-card relative flex flex-col overflow-hidden rounded-[0.9em] bg-white text-charcoal-900 shadow-soft">
            <CornerWaves />

            <header className="relative px-[1.4em] pt-[2.4em] text-center">
                <img src={logo} alt="" className="mx-auto h-[2.6em] w-auto" />
                <p className="mt-[0.4em] font-serif text-[1.15em] font-bold uppercase leading-tight text-primary-900">
                    {churchName}
                </p>
            </header>

            <div className="relative mx-auto mt-[1em] aspect-[4/5] w-[64%] overflow-hidden rounded-[0.4em] border-[0.2em] border-primary-700 bg-neutral-50">
                {member.photo_url ? (
                    <img
                        src={member.photo_url}
                        alt={member.full_name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center font-serif text-[3em] text-primary-700">
                        {member.full_name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join('')
                            .toUpperCase()}
                    </span>
                )}
            </div>

            <div className="relative my-auto px-[1em] py-[0.6em] text-center">
                <h1 className="text-[1.5em] font-bold leading-tight">
                    <span className="uppercase">{firstName}</span>{' '}
                    {otherNames.join(' ')}
                </h1>
                <p className="mt-[0.2em] text-[0.85em] font-semibold uppercase italic tracking-[0.15em] text-primary-700">
                    {member.office}
                </p>
                {member.unit && (
                    <p className="text-[0.75em] text-neutral-600">
                        {member.unit}
                    </p>
                )}
            </div>

            <footer className="relative mt-auto border-t-[0.25em] border-gold-500 bg-primary-700 px-[0.8em] py-[0.7em] text-center">
                <p className="text-[1.3em] font-extrabold uppercase leading-none tracking-wide text-white">
                    {member.department ?? 'Department'}
                </p>
            </footer>
        </article>
    );
}

function Back({ member, churchName, logo }: { member: Member; churchName: string; logo: string }) {
    return (
        <article className="id-card relative flex flex-col overflow-hidden rounded-[0.9em] bg-white text-center text-charcoal-900 shadow-soft">
            <CornerWaves small />
            <CornerWaves small flip />

            <div className="relative flex flex-1 flex-col items-center px-[1.6em] pt-[3.2em]">
                <p className="text-[0.78em] leading-snug text-neutral-600">
                    This is to certify that the person whose photograph and
                    name appear overleaf is a member of
                </p>

                <div className="mt-[0.6em] flex items-center gap-[0.5em]">
                    <img src={logo} alt="" className="h-[1.8em] w-auto" />
                    <p className="font-serif text-[0.95em] font-bold uppercase leading-tight text-primary-900">
                        {churchName}
                    </p>
                </div>
                {member.department &&
                    member.department.toLowerCase() !==
                        churchName.toLowerCase() && (
                        <p className="mt-[0.3em] text-[1.15em] font-extrabold uppercase leading-tight tracking-wide">
                            {member.department}
                        </p>
                    )}

                <div className="mt-[1em] w-[64%] rounded-[0.4em] border-[0.15em] border-gold-500 bg-white p-[0.3em]">
                    <img
                        src={member.qr_url}
                        alt="Attendance QR code"
                        className="w-full"
                    />
                </div>
                {member.member_id && (
                    <p className="mt-[0.3em] text-[0.85em] font-semibold tabular-nums tracking-wider">
                        {member.member_id}
                    </p>
                )}
                <p className="text-[0.65em] uppercase tracking-[0.15em] text-primary-700">
                    Scan for attendance
                </p>

                <p className="mt-[0.6em] text-[0.7em] leading-snug text-neutral-600">
                    If found, please return to the church office or the
                    nearest police station.
                </p>

                <div className="mt-auto w-[70%] pb-[0.4em]">
                    <div className="h-[2.2em] border-b border-charcoal-900" />
                    <p className="mt-[0.2em] text-[0.75em] font-semibold">
                        Authorised Signature
                    </p>
                </div>
            </div>

            <footer className="relative bg-charcoal-900 px-[1em] py-[0.5em]">
                <p className="text-[0.68em] text-white">
                    This ID card is only valid in the church premises
                </p>
            </footer>
        </article>
    );
}

export default function IdCard({ member }: { member: Member }) {
    const { branding } = usePage<PageProps>().props;
    const shared = {
        member,
        churchName: branding.church_name,
        logo: branding.logo_light_url,
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-4 print:block print:min-h-0 print:bg-white print:p-0">
            <Head title={`ID card - ${member.full_name}`} />

            <div className="flex flex-wrap items-start justify-center gap-6 print:block">
                <section className="flex flex-col items-center gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 print:hidden">
                        Front
                    </h2>
                    <Front {...shared} />
                </section>
                <section className="flex flex-col items-center gap-2">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600 print:hidden">
                        Back
                    </h2>
                    <Back {...shared} />
                </section>
            </div>

            <p className="max-w-sm text-center text-sm text-neutral-600 print:hidden">
                Prints the front and back as two card-sized pages, ready for
                a card printer or for gluing back to back.
            </p>

            <PrimaryButton
                type="button"
                onClick={() => window.print()}
                className="print:hidden"
            >
                Print
            </PrimaryButton>
        </main>
    );
}
