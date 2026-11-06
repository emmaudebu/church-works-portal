import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import Avatar from '@/Components/Avatar';
import Dropdown from '@/Components/Dropdown';
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
    SidebarTooltip,
    SWING,
    Tip,
    TURN,
    useMenuEntrance,
    WIGGLE,
} from '@/Components/Sidebar';
import Toast from '@/Components/Toast';
import { PageProps } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Bell,
    Building2,
    CalendarClock,
    ChevronsLeft,
    ClipboardList,
    ImagePlus,
    Images,
    LayoutDashboard,
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


const GROUPS = ['Overview', 'Attendance', 'Finance', 'Content', 'Manage'];

const navItems: NavItem[] = [
    {
        label: 'Dashboard',
        route: 'admin.dashboard',
        icon: LayoutDashboard,
        group: 'Overview',
        motion: POP,
    },
    {
        label: 'Members',
        route: 'admin.members',
        icon: Users,
        group: 'Overview',
        motion: HOP,
    },
    {
        label: 'Scanner',
        route: 'admin.scanner',
        icon: ScanLine,
        group: 'Attendance',
        motion: SCAN,
        permission: 'take_attendance',
    },
    {
        label: 'Services',
        route: 'admin.services',
        icon: CalendarClock,
        group: 'Attendance',
        motion: WIGGLE,
        permission: 'manage_services',
    },
    {
        label: 'Reports',
        route: 'admin.reports',
        icon: BarChart3,
        group: 'Attendance',
        motion: HOP,
        permission: 'view_reports',
    },
    {
        label: 'Attendance Log',
        route: 'admin.attendance-log',
        icon: ClipboardList,
        group: 'Attendance',
        motion: SWING,
        permission: 'view_reports',
    },
    {
        label: 'Payments',
        route: 'admin.payments',
        icon: Wallet,
        group: 'Finance',
        motion: WIGGLE,
        permission: 'view_payments',
    },
    {
        label: 'Posts',
        route: 'admin.posts',
        icon: Newspaper,
        group: 'Content',
        motion: SWING,
        permission: 'manage_posts',
    },
    {
        label: 'Elections',
        route: 'admin.elections',
        icon: Vote,
        group: 'Content',
        motion: HOP,
        permission: 'manage_elections',
    },
    {
        label: 'Upload Gallery',
        route: 'gallery.upload',
        icon: ImagePlus,
        group: 'Content',
        motion: POP,
        permission: 'upload_gallery',
    },
    {
        label: 'Media Library',
        route: 'admin.media',
        icon: Images,
        group: 'Content',
        motion: WIGGLE,
        anyPermission: ['manage_department', 'manage_posts'],
    },
    {
        label: 'Departments',
        route: 'admin.departments',
        icon: Building2,
        group: 'Manage',
        motion: HOP,
        superAdmin: true,
    },
    {
        label: 'Settings',
        route: 'admin.settings',
        icon: Settings,
        group: 'Manage',
        motion: TURN,
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
    const entering = useMenuEntrance();

    const ownDepartment: NavItem[] =
        !isSuperAdmin &&
        departmentId &&
        permissions.includes('manage_department')
            ? [
                  {
                      label: 'My department',
                      route: 'admin.departments.manage',
                      icon: Building2,
                      group: 'Manage',
                      motion: HOP,
                      params: departmentId,
                  },
              ]
            : [];

    const items = [
        ...navItems.filter(
            (item) =>
                (!item.superAdmin || isSuperAdmin) &&
                (!item.permission || permissions.includes(item.permission)) &&
                (!item.anyPermission ||
                    item.anyPermission.some((permission) =>
                        permissions.includes(permission),
                    )),
        ),
        ...ownDepartment,
    ];

    const [tip, setTip] = useState<Tip | null>(null);

    let index = 0;

    return (
        <nav
            aria-label="Admin"
            onScroll={() => setTip(null)}
            className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 [scrollbar-width:none]"
        >
            {collapsed && <SidebarTooltip tip={tip} />}
            {GROUPS.map((group) => {
                const inGroup = items.filter((item) => item.group === group);

                if (inGroup.length === 0) {
                    return null;
                }

                return (
                    <SidebarGroup key={group} title={group} collapsed={collapsed}>
                        {inGroup.map((item) => (
                            <SidebarLink
                                key={item.route}
                                item={item}
                                collapsed={collapsed}
                                index={index++}
                                entering={entering}
                                badge={
                                    item.route === 'admin.payments'
                                        ? pendingReceipts
                                        : 0
                                }
                                onTip={setTip}
                            />
                        ))}
                    </SidebarGroup>
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
                className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col transition-[width] duration-300 ease-out lg:flex ${
                    collapsed ? 'w-[84px]' : 'w-[17rem]'
                }`}
            >
                <SidebarBackdrop />
                <div
                    className={`relative flex h-20 items-center ${
                        collapsed ? 'justify-center px-2' : 'px-5'
                    }`}
                >
                    {collapsed ? (
                        <HomeLogo src={branding.logo_dark_url} />
                    ) : (
                        <Logo
                            variant="dark"
                            href={route('home')}
                            wordmarkClassName="text-white"
                        />
                    )}
                    <span
                        aria-hidden="true"
                        className="absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent"
                    />
                </div>
                <SidebarNav collapsed={collapsed} isSuperAdmin={isSuperAdmin} />
                <div className="relative pb-3 pt-2">
                    <SidebarProfile collapsed={collapsed} />
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={
                            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                        className="group mx-3 mt-2 flex w-[calc(100%-1.5rem)] items-center justify-center gap-2 rounded-xl p-2 text-xs font-medium text-silver-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <ChevronsLeft
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                            className={`transition-transform duration-500 ${
                                collapsed ? 'rotate-180' : 'group-hover:-translate-x-1'
                            }`}
                        />
                        {!collapsed && 'Collapse'}
                    </button>
                </div>
            </aside>

            <Dialog
                open={drawerOpen}
                onClose={setDrawerOpen}
                aria-label="Navigation"
                className="relative z-40 lg:hidden"
            >
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition duration-300 data-[closed]:opacity-0"
                />
                <DialogPanel
                    transition
                    className="fixed inset-y-0 left-0 flex w-72 flex-col transition duration-300 ease-out data-[closed]:-translate-x-full"
                >
                    <SidebarBackdrop />
                    <div className="relative flex h-16 items-center justify-between px-4">
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
                    <div className="relative pb-4 pt-2">
                        <SidebarProfile collapsed={false} />
                    </div>
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
                <InstallPrompt />
                <ReceiptPrompt />

                <main className="flex-1 p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
