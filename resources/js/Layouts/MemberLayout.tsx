import Avatar from '@/Components/Avatar';
import Logo from '@/Components/Logo';
import VerseToast from '@/Components/Site/VerseToast';
import Toast from '@/Components/Toast';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarCheck,
    CalendarDays,
    Home,
    LayoutDashboard,
    LogOut,
    QrCode,
    User,
    Vote,
    Wallet,
} from 'lucide-react';
import { PropsWithChildren } from 'react';

const tabs = [
    { label: 'Home', route: 'member.home', icon: Home },
    { label: 'Events', route: 'member.events', icon: CalendarDays },
    { label: 'My QR', route: 'member.my-qr', icon: QrCode, raised: true },
    { label: 'Elections', route: 'member.elections', icon: Vote },
    { label: 'Profile', route: 'profile.edit', icon: User },
];

const sideLinks = [
    { label: 'Home', route: 'member.home', icon: Home },
    { label: 'News & Events', route: 'member.events', icon: CalendarDays },
    { label: 'My QR', route: 'member.my-qr', icon: QrCode },
    { label: 'Attendance', route: 'member.attendance', icon: CalendarCheck },
    { label: 'Payments', route: 'member.payments', icon: Wallet },
    { label: 'Elections', route: 'member.elections', icon: Vote },
    { label: 'Profile', route: 'profile.edit', icon: User },
];

const sideLinkClass =
    'flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300';

export default function MemberLayout({
    children,
    wide = false,
}: PropsWithChildren<{ wide?: boolean }>) {
    const { auth, verseToast } = usePage<PageProps>().props;
    const { user } = auth;
    const width = wide ? 'max-w-6xl' : 'max-w-3xl';

    return (
        <div className="min-h-screen bg-neutral-50 pb-24 lg:flex lg:pb-0">
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-primary-900 lg:flex">
                <div className="flex h-16 items-center px-4">
                    <Logo
                        variant="dark"
                        href={route('home')}
                        wordmarkClassName="text-white"
                    />
                </div>
                <nav
                    aria-label="Member menu"
                    className="flex-1 space-y-1 overflow-y-auto p-3"
                >
                    {sideLinks.map((link) => {
                        const active = route().current(link.route);
                        const Icon = link.icon;

                        return (
                            <Link
                                key={link.route}
                                href={route(link.route)}
                                aria-current={active ? 'page' : undefined}
                                className={`${sideLinkClass} ${
                                    active
                                        ? 'border-gold-500 bg-white/10'
                                        : 'border-transparent hover:bg-white/5'
                                }`}
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="space-y-1 p-3">
                    {user.is_admin && (
                        <Link
                            href={route('admin.dashboard')}
                            className={`${sideLinkClass} border-transparent hover:bg-white/5`}
                        >
                            <LayoutDashboard
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                            Admin
                        </Link>
                    )}
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={`${sideLinkClass} border-transparent hover:bg-white/5`}
                    >
                        <LogOut
                            size={20}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                        Log out
                    </Link>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
                    <div
                        className={`mx-auto flex items-center justify-between px-4 py-2 lg:px-8 ${width}`}
                    >
                        <span className="lg:hidden">
                            <Logo href={route('home')} />
                        </span>
                        <span className="hidden lg:block" />
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
                                    className="text-sm font-medium text-primary-700 hover:underline lg:hidden"
                                >
                                    Admin
                                </Link>
                            )}
                            <Link
                                href={route('profile.edit')}
                                aria-label="Your profile"
                                className="hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 lg:block"
                            >
                                <Avatar
                                    name={user.full_name}
                                    src={user.photo_url}
                                />
                            </Link>
                        </div>
                    </div>
                </header>

                <Toast />
                {verseToast && <VerseToast toast={verseToast} raised />}

                <main className={`mx-auto px-4 py-6 lg:px-8 ${width}`}>
                    {children}
                </main>
            </div>

            <nav
                aria-label="Member"
                className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
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

