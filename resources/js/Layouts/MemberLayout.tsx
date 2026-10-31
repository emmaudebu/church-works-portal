import Logo from '@/Components/Logo';
import Toast from '@/Components/Toast';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, CalendarDays, Home, QrCode, User, Vote } from 'lucide-react';
import { PropsWithChildren } from 'react';

const tabs = [
    { label: 'Home', route: 'member.home', icon: Home },
    { label: 'Events', route: 'member.events', icon: CalendarDays },
    { label: 'My QR', route: 'member.my-qr', icon: QrCode, raised: true },
    { label: 'Elections', route: 'member.elections', icon: Vote },
    { label: 'Profile', route: 'profile.edit', icon: User },
];

export default function MemberLayout({ children }: PropsWithChildren) {
    const { user } = usePage<PageProps>().props.auth;

    return (
        <div className="min-h-screen bg-neutral-50 pb-24">
            <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
                <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
                    <Logo href={route('member.home')} />
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            aria-label="Notifications"
                            className="rounded-lg p-2 text-neutral-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            <Bell size={20} strokeWidth={1.75} />
                        </button>
                        {user.is_admin && (
                            <Link
                                href={route('admin.dashboard')}
                                className="text-sm font-medium text-primary-700 hover:underline"
                            >
                                Admin
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <Toast />

            <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>

            <nav
                aria-label="Member"
                className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]"
            >
                <ul className="mx-auto grid max-w-2xl grid-cols-5">
                    {tabs.map((tab) => {
                        const active = route().current(tab.route);
                        const Icon = tab.icon;

                        return (
                            <li key={tab.route} className="flex justify-center">
                                <Link
                                    href={route(tab.route)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                                        active
                                            ? 'text-primary-700'
                                            : 'text-neutral-600'
                                    }`}
                                >
                                    {tab.raised ? (
                                        <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-primary-700 text-white shadow-soft ring-4 ring-gold-500">
                                            <Icon
                                                size={24}
                                                strokeWidth={1.75}
                                                aria-hidden="true"
                                            />
                                        </span>
                                    ) : (
                                        <Icon
                                            size={20}
                                            strokeWidth={1.75}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {tab.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}

