import Avatar from '@/Components/Avatar';
import { TeamMember } from '@/Components/Site/MemberCarousel';
import SocialIcon, { SOCIAL_LABELS } from '@/Components/Site/SocialIcon';
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    DialogTitle,
} from '@headlessui/react';
import { X } from 'lucide-react';

export default function MemberProfileCard({
    member,
    department,
    onClose,
}: {
    member: TeamMember;
    department: string;
    onClose: () => void;
}) {
    return (
        <Dialog open onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 animate-page-in bg-charcoal-900/75 backdrop-blur-sm" />
            <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
                <DialogPanel className="relative w-full max-w-sm animate-popup-zoom overflow-hidden rounded-2xl bg-white text-center shadow-soft">
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={onClose}
                        className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-neutral-900 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <X size={18} strokeWidth={1.75} />
                    </button>

                    <div className="h-28 bg-charcoal-900" />

                    <div className="px-6 pb-8">
                        <Avatar
                            name={member.full_name}
                            src={member.photo_url}
                            className="mx-auto -mt-20 h-40 w-40 text-5xl ring-4"
                        />
                        <DialogTitle className="mt-4 font-serif text-2xl font-semibold leading-snug">
                            {member.full_name}
                        </DialogTitle>
                        <p className="mt-1 text-sm text-primary-700">
                            {member.unit ?? department}
                        </p>
                        {member.unit && (
                            <p className="text-sm text-neutral-600">
                                {department}
                            </p>
                        )}

                        {member.socials.length > 0 && (
                            <ul className="mt-6 flex flex-wrap justify-center gap-3">
                                {member.socials.map((social) => (
                                    <li key={social.network}>
                                        <a
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`${member.full_name} on ${SOCIAL_LABELS[social.network]}`}
                                            title={SOCIAL_LABELS[social.network]}
                                            className="flex h-11 w-11 items-center justify-center rounded-full border border-primary-700 text-primary-700 transition hover:bg-primary-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                        >
                                            <SocialIcon
                                                network={social.network}
                                            />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </DialogPanel>
            </div>
        </Dialog>
    );
}
