import Avatar from '@/Components/Avatar';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head } from '@inertiajs/react';

export default function IdCard({
    member,
}: {
    member: {
        full_name: string;
        member_id: string | null;
        unit: string | null;
        department: string | null;
        photo_url: string | null;
        qr_url: string;
    };
}) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 p-4 print:block print:min-h-0 print:bg-white print:p-0">
            <Head title={`ID card - ${member.full_name}`} />

            <article className="id-card flex aspect-[85.6/53.98] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-soft print:max-w-none">
                <div className="flex min-w-0 flex-1 flex-col bg-charcoal-900 p-[4%] text-white">
                    <div className="flex items-center gap-[3%]">
                        <img
                            src="/images/logo-dark.png"
                            alt=""
                            className="h-[1.7em] w-auto"
                        />
                        <p className="font-serif text-[0.8em] leading-tight">
                            Covenant Workforce
                        </p>
                    </div>
                    <div className="mt-[3%] h-px bg-gold-500" />
                    <div className="mt-auto flex items-center gap-[5%]">
                        <Avatar
                            name={member.full_name}
                            src={member.photo_url}
                            className="h-[4.5em] w-[4.5em] shrink-0 text-base"
                        />
                        <div className="min-w-0">
                            <h1 className="text-[1em] leading-tight">
                                {member.full_name}
                            </h1>
                            <p className="mt-1 text-[0.7em] text-gold-300">
                                {[member.department, member.unit]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                            <p className="mt-1 text-[0.7em] tabular-nums text-silver-300">
                                {member.member_id}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex w-[38%] shrink-0 items-center justify-center bg-white p-[2%]">
                    <img
                        src={member.qr_url}
                        alt="Attendance QR code"
                        className="w-full"
                    />
                </div>
            </article>

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
