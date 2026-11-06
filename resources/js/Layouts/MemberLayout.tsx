import Avatar from '@/Components/Avatar';
import InstallPrompt from '@/Components/InstallPrompt';
import ReceiptPrompt from '@/Components/ReceiptPrompt';
import Logo from '@/Components/Logo';
import {
    HOP,
    NavItem,
    POP,
    SCAN,
    SidebarBackdrop,
    SidebarGroup,
    SidebarLink,
    SidebarProfile,
    SWING,
    useMenuEntrance,
    WIGGLE,
} from '@/Components/Sidebar';
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

const sideGroups: { title: string; items: NavItem[] }[] = [
    {
        title: 'My space',
        items: [
            { label: 'Home', route: 'member.home', icon: Home, group: 'My space', motion: POP },
            { label: 'News & Events', route: 'member.events', icon: CalendarDays, group: 'My space', motion: WIGGLE },
            { label: 'My QR', route: 'member.my-qr', icon: QrCode, group: 'My space', motion: SCAN },
        ],
    },
    {
        title: 'My records',
        items: [
            { label: 'Attendance', route: 'member.attendance', icon: CalendarCheck, group: 'My records', motion: HOP },
            { label: 'Payments', route: 'member.payments', icon: Wallet, group: 'My records', motion: WIGGLE },
            { label: 'Elections', route: 'member.elections', icon: Vote, group: 'My records', motion: HOP },
        ],
    },
    {
        title: 'Account',
        items: [
            { label: 'Profile', route: 'profile.edit', icon: User, group: 'Account', motion: SWING },
        ],
    },
];

const footerButtonClass =
    'group flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/10 transition duration-300 hover:bg-white/10 hover:text-white hover:ring-gold-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300';

function MemberSidebar() {
    const { auth } = usePage<PageProps>().props;
    const entering = useMenuEntrance();

    let index = 0;

    return (
        <aside className="sticky top-0 z-40 hidden h-screen w-[17rem] shrink-0 flex-col lg:flex">
            <SidebarBackdrop />
            <div className="relative flex h-20 items-center px-5">
                <Logo
                    variant="dark"
                    href={route('home')}
                    wordmarkClassName="text-white"
                />
                <span
                    aria-hidden="true"
                    className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent"
                />
            </div>
            <nav
                aria-label="Member menu"
                className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 [scrollbar-width:none]"
            >
                {sideGroups.map((group) => (
                    <SidebarGroup key={group.title} title={group.title}>
                        {group.items.map((item) => (
                            <SidebarLink
                                key={item.route}
                                item={item}
                                collapsed={false}
                                index={index++}
                                entering={entering}
                                badge={0}
                                onTip={() => undefined}
                            />
                        ))}
                    </SidebarGroup>
                ))}
            </nav>
            <div className="relative space-y-2 pb-4 pt-2">
                <SidebarProfile />
                <div className="mx-3 flex gap-2">
                    {auth.user.is_admin && (
                        <Link href={route('admin.dashboard')} className={footerButtonClass}>
                            <LayoutDashboard
                                size={16}
                                strokeWidth={2}
                                aria-hidden="true"
                                className={`text-gold-300 ${POP}`}
                            />
                            Admin
                        </Link>
                    )}
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className={footerButtonClass}
                    >
                        <LogOut
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                            className="text-gold-300 transition-transform duration-300 group-hover:translate-x-0.5"
                        />
                        Log out
                    </Link>
                </div>
            </div>
        </aside>
    );
}

export default function MemberLayout({
    children,
    wide = false,
}: PropsWithChildren<{ wide?: boolean }>) {
    const { auth, verseToast } = usePage<PageProps>().props;
    const { user } = auth;
    const width = wide ? 'max-w-6xl' : 'max-w-3xl';

    return (
        <div className="min-h-screen bg-neutral-50 pb-28 lg:flex lg:pb-0">
            <MemberSidebar />

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
                <InstallPrompt raised />
                <ReceiptPrompt />

                <main className={`mx-auto px-4 py-6 lg:px-8 ${width}`}>
                    {children}
                </main>
            </div>

            <nav
                aria-label="Member"
                className="fixed inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-30 rounded-2xl bg-white/90 shadow-[0_10px_40px_-10px_rgba(122,18,16,0.35)] ring-1 ring-neutral-200 backdrop-blur-md lg:hidden"
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
                                    className={`group relative flex flex-col items-center gap-0.5 rounded-xl px-1 pb-2 pt-1.5 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                                        active
                                            ? 'text-primary-700'
                                            : 'text-neutral-600'
                                    }`}
                                >
                                    {tab.raised ? (
                                        <span className="relative -mt-8 mb-0.5">
                                            <span
                                                aria-hidden="true"
                                                className="absolute inset-0 rounded-full motion-safe:animate-pulse"
                                            />
                                            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 via-primary-700 to-primary-900 text-white shadow-[0_10px_24px_-6px_rgba(122,18,16,0.7)] ring-4 ring-gold-500 transition-transform duration-300 group-active:scale-90">
                                                <Icon
                                                    size={24}
                                                    strokeWidth={2}
                                                    aria-hidden="true"
                                                    className={
                                                        active
                                                            ? 'motion-safe:animate-icon-pop'
                                                            : ''
                                                    }
                                                />
                                            </span>
                                        </span>
                                    ) : (
                                        <span
                                            className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-300 group-active:scale-90 ${
                                                active
                                                    ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-[0_6px_14px_-4px_rgba(122,18,16,0.6)]'
                                                    : ''
                                            }`}
                                        >
                                            <Icon
                                                size={20}
                                                strokeWidth={active ? 2.25 : 1.75}
                                                aria-hidden="true"
                                                className={
                                                    active
                                                        ? 'motion-safe:animate-icon-pop'
                                                        : ''
                                                }
                                            />
                                        </span>
                                    )}
                                    {tab.label}
                                    <span
                                        aria-hidden="true"
                                        className={`absolute bottom-0.5 h-1 w-1 rounded-full bg-gold-500 transition-all duration-300 ${
                                            active ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                                        }`}
                                    />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
}

