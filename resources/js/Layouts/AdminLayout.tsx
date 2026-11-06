import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import Avatar from '@/Components/Avatar';
import Dropdown from '@/Components/Dropdown';
import Logo from '@/Components/Logo';
import Toast from '@/Components/Toast';
import { PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Bell,
    Building2,
    CalendarClock,
    ChevronsLeft,
    ChevronsRight,
    ClipboardList,
    ImagePlus,
    LayoutDashboard,
    LucideIcon,
    Menu,
    Newspaper,
    ScanLine,
    Search,
    Settings,
    Users,
    Vote,
    Wallet,
    X,
} from 'lucide-react';
import { FormEventHandler, PropsWithChildren, useState } from 'react';

const navItems: {
    label: string;
    route: string;
    icon: LucideIcon;
    superAdmin?: boolean;
    permission?: string;
}[] = [
    { label: 'Dashboard', route: 'admin.dashboard', icon: LayoutDashboard },
    { label: 'Members', route: 'admin.members', icon: Users },
    {
        label: 'Scanner',
        route: 'admin.scanner',
        icon: ScanLine,
        permission: 'take_attendance',
    },
    {
        label: 'Services',
        route: 'admin.services',
        icon: CalendarClock,
        permission: 'manage_services',
    },
    {
        label: 'Reports',
        route: 'admin.reports',
        icon: BarChart3,
        permission: 'view_reports',
    },
    {
        label: 'Attendance Log',
        route: 'admin.attendance-log',
        icon: ClipboardList,
        permission: 'view_reports',
    },
    {
        label: 'Payments',
        route: 'admin.payments',
        icon: Wallet,
        permission: 'view_payments',
    },
    {
        label: 'Posts',
        route: 'admin.posts',
        icon: Newspaper,
        permission: 'manage_posts',
    },
    {
        label: 'Elections',
        route: 'admin.elections',
        icon: Vote,
        permission: 'manage_elections',
    },
    {
        label: 'Upload Gallery',
        route: 'gallery.upload',
        icon: ImagePlus,
        permission: 'upload_gallery',
    },
    {
        label: 'Departments',
        route: 'admin.departments',
        icon: Building2,
        superAdmin: true,
    },
    {
        label: 'Settings',
        route: 'admin.settings',
        icon: Settings,
        superAdmin: true,
    },
];

const COLLAPSED_KEY = 'admin-sidebar-collapsed';

function readCollapsed() {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

function SidebarNav({
    collapsed,
    isSuperAdmin,
}: {
    collapsed: boolean;
    isSuperAdmin: boolean;
}) {
    const { auth, pendingReceipts } = usePage<PageProps>().props;
    const { department_id: departmentId, permissions } = auth.user;

    const ownDepartment =
        !isSuperAdmin &&
        departmentId &&
        permissions.includes('manage_department')
            ? [
                  {
                      label: 'My department',
                      route: 'admin.departments.manage',
                      icon: Building2,
                      params: departmentId,
                      superAdmin: false,
                  },
              ]
            : [];

    return (
        <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto p-3">
            {[
                ...navItems.filter(
                    (item) =>
                        (!item.superAdmin || isSuperAdmin) &&
                        (!item.permission ||
                            permissions.includes(item.permission)),
                ),
                ...ownDepartment,
            ]
                .map((item) => {
                    const active = route().current(item.route);
                    const Icon = item.icon;
                    const params =
                        'params' in item ? (item.params as number) : undefined;

                    return (
                        <Link
                            key={item.route}
                            href={route(item.route, params)}
                            aria-current={active ? 'page' : undefined}
                            aria-label={collapsed ? item.label : undefined}
                            title={collapsed ? item.label : undefined}
                            className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
                                active
                                    ? 'border-gold-500 bg-white/10'
                                    : 'border-transparent hover:bg-white/5'
                            }`}
                        >
                            <Icon
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                                className="shrink-0"
                            />
                            {!collapsed && item.label}
                            {item.route === 'admin.payments' &&
                                pendingReceipts > 0 && (
                                    <span
                                        title="Proofs of payment to approve"
                                        className="ml-auto rounded-full bg-gold-500 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-900"
                                    >
                                        {pendingReceipts}
                                        <span className="sr-only">
                                            {' '}
                                            to approve
                                        </span>
                                    </span>
                                )}
                        </Link>
                    );
                })}
        </nav>
    );
}

function HomeLogo({ src }: { src: string }) {
    return (
        <Link
            href={route('home')}
            aria-label="Go to the homepage"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
        >
            <img src={src} alt="" className="h-9 w-auto" />
        </Link>
    );
}

function DepartmentSwitcher() {
    const { departmentContext } = usePage<PageProps>().props;

    if (!departmentContext) {
        return null;
    }

    if (!departmentContext.options) {
        return (
            <span className="truncate text-sm font-medium text-neutral-600">
                {departmentContext.current_name}
            </span>
        );
    }

    return (
        <select
            aria-label="Department"
            value={departmentContext.current_id ?? ''}
            onChange={(e) =>
                router.post(
                    route('admin.current-department'),
                    { department_id: e.target.value || null },
                    { preserveScroll: true },
                )
            }
            className="min-w-0 max-w-[11rem] rounded-lg border-neutral-200 py-1.5 text-sm focus:border-primary-700 focus:ring-primary-700"
        >
            <option value="">All departments</option>
            {departmentContext.options.map((department) => (
                <option key={department.id} value={department.id}>
                    {department.name}
                </option>
            ))}
        </select>
    );
}

function MemberSearch() {
    const [search, setSearch] = useState('');

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        router.get(route('admin.members'), { search });
    };

    return (
        <form onSubmit={submit} role="search" className="hidden md:block">
            <div className="relative">
                <Search
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                />
                <input
                    type="search"
                    aria-label="Search members"
                    placeholder="Search members"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 rounded-lg border-neutral-200 py-1.5 pl-10 text-sm focus:border-primary-700 focus:ring-primary-700"
                />
            </div>
        </form>
    );
}

export default function AdminLayout({ children }: PropsWithChildren) {
    const { auth, branding } = usePage<PageProps>().props;
    const { user } = auth;
    const isSuperAdmin = user.roles.includes('super_admin');

    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleCollapsed = () => {
        const next = !collapsed;

        setCollapsed(next);

        try {
            localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
        } catch {
            // The sidebar still works without a remembered preference.
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 lg:flex">
            <aside
                className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-primary-900 transition-all lg:flex ${
                    collapsed ? 'w-[72px]' : 'w-64'
                }`}
            >
                <div className="flex h-16 items-center px-4">
                    {collapsed ? (
                        <HomeLogo src={branding.logo_dark_url} />
                    ) : (
                        <Logo
                            variant="dark"
                            href={route('home')}
                            wordmarkClassName="text-white"
                        />
                    )}
                </div>
                <SidebarNav collapsed={collapsed} isSuperAdmin={isSuperAdmin} />
                <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label={
                        collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                    }
                    className="m-3 flex items-center justify-center rounded-lg p-2 text-silver-300 transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                >
                    {collapsed ? (
                        <ChevronsRight size={20} strokeWidth={1.75} />
                    ) : (
                        <ChevronsLeft size={20} strokeWidth={1.75} />
                    )}
                </button>
            </aside>

            <Dialog
                open={drawerOpen}
                onClose={setDrawerOpen}
                aria-label="Navigation"
                className="relative z-40 lg:hidden"
            >
                <DialogBackdrop className="fixed inset-0 bg-charcoal-900/60" />
                <DialogPanel className="fixed inset-y-0 left-0 flex w-64 flex-col bg-primary-900">
                    <div className="flex h-16 items-center justify-between px-4">
                        <HomeLogo src={branding.logo_dark_url} />
                        <button
                            type="button"
                            onClick={() => setDrawerOpen(false)}
                            aria-label="Close navigation"
                            className="rounded-lg p-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            <X size={20} strokeWidth={1.75} />
                        </button>
                    </div>
                    <SidebarNav collapsed={false} isSuperAdmin={isSuperAdmin} />
                </DialogPanel>
            </Dialog>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open navigation"
                        className="rounded-lg p-2 text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 lg:hidden"
                    >
                        <Menu size={20} strokeWidth={1.75} />
                    </button>
                    <div className="ml-auto flex min-w-0 items-center gap-3">
                        <MemberSearch />
                        <DepartmentSwitcher />
                        <button
                            type="button"
                            aria-label="Notifications"
                            className="rounded-lg p-2 text-neutral-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            <Bell size={20} strokeWidth={1.75} />
                        </button>
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    aria-label="Account menu"
                                    className="flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                                >
                                    <Avatar
                                        name={user.full_name}
                                        src={user.photo_url}
                                    />
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>
                                    Profile
                                </Dropdown.Link>
                                <Dropdown.Link href={route('member.home')}>
                                    Member view
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                >
                                    Log out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                <Toast />

                <main className="flex-1 p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
