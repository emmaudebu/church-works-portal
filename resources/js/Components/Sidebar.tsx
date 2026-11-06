import Avatar from '@/Components/Avatar';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';
import { PropsWithChildren, useEffect, useState } from 'react';

export type NavItem = {
    label: string;
    route: string;
    icon: LucideIcon;
    group: string;
    /** The little move the icon makes when the row is hovered. */
    motion: string;
    superAdmin?: boolean;
    permission?: string;
    /** Shown when the person has any one of these. */
    anyPermission?: string[];
    params?: number;
};

export const WIGGLE = 'group-hover:motion-safe:animate-icon-wiggle';
export const HOP = 'group-hover:motion-safe:animate-icon-hop';
export const POP = 'group-hover:motion-safe:animate-icon-pop';
export const TURN = 'group-hover:motion-safe:animate-icon-turn';
export const SWING = 'group-hover:motion-safe:animate-icon-swing';
export const SCAN = 'group-hover:motion-safe:animate-icon-scan';

/**
 * The menu glides in once per visit; moving between pages after that keeps
 * it still. The animation is dropped once it has played.
 */
let hasEntered = false;

export function useMenuEntrance(): boolean {
    const [entering, setEntering] = useState(() => !hasEntered);

    useEffect(() => {
        hasEntered = true;

        const timer = setTimeout(() => setEntering(false), 1500);

        return () => clearTimeout(timer);
    }, []);

    return entering;
}

/** Where the label of a collapsed menu item shows, beside its icon. */
export type Tip = { label: string; top: number; left: number };

function tipFor(link: HTMLElement, label: string): Tip {
    const box = link.getBoundingClientRect();

    return { label, top: box.top + box.height / 2, left: box.right + 16 };
}

/** The wine panel with its glow, sheen and gold edge, behind the menu. */
export function SidebarBackdrop() {
    return (
        <>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-900 via-primary-900 to-[#2a0807]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-gold-500/20 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-primary-500/30 blur-3xl"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.04] [background:repeating-linear-gradient(-35deg,#fff_0_1px,transparent_1px_18px)]"
            />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-gold-500/0 via-gold-500/60 to-gold-500/0"
            />
        </>
    );
}

export function SidebarLink({
    item,
    collapsed,
    index,
    entering,
    badge,
    onTip,
}: {
    item: NavItem;
    collapsed: boolean;
    index: number;
    entering: boolean;
    badge: number;
    onTip: (tip: Tip | null) => void;
}) {
    const active = route().current(item.route);
    const Icon = item.icon;

    return (
        <Link
            href={route(item.route, item.params)}
            aria-current={active ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            style={entering ? { animationDelay: `${index * 45}ms` } : undefined}
            onMouseEnter={(e) => collapsed && onTip(tipFor(e.currentTarget, item.label))}
            onFocus={(e) => collapsed && onTip(tipFor(e.currentTarget, item.label))}
            onMouseLeave={() => onTip(null)}
            onBlur={() => onTip(null)}
            className={`group relative flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
                entering ? 'motion-safe:animate-nav-in' : ''
            } ${
                active
                    ? 'bg-gradient-to-r from-white/15 to-white/[0.03] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-white/75 hover:bg-white/[0.07] hover:text-white'
            } ${collapsed ? 'justify-center' : 'hover:translate-x-1'}`}
        >
            <span
                aria-hidden="true"
                className={`absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-gold-300 to-gold-500 shadow-[0_0_12px_rgb(var(--gold-500)/0.8)] transition-transform duration-300 ${
                    active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-50'
                }`}
            />
            <span
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                    active
                        ? 'bg-gradient-to-br from-gold-300 to-gold-500 text-charcoal-900 shadow-[0_6px_16px_-4px_rgb(var(--gold-500)/0.7)]'
                        : 'bg-white/[0.06] text-gold-300 ring-1 ring-white/10 group-hover:bg-gradient-to-br group-hover:from-gold-300 group-hover:to-gold-500 group-hover:text-charcoal-900 group-hover:shadow-[0_6px_16px_-4px_rgb(var(--gold-500)/0.7)] group-hover:ring-0'
                }`}
            >
                <Icon
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={item.motion}
                />
                {collapsed && badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-charcoal-900 ring-2 ring-primary-900">
                        {badge}
                    </span>
                )}
            </span>
            {!collapsed && (
                <span className="truncate transition-colors">{item.label}</span>
            )}
            {!collapsed && badge > 0 && (
                <span
                    title="Proofs of payment to approve"
                    className="ml-auto rounded-full bg-gold-500 px-2 py-0.5 text-xs font-semibold tabular-nums text-neutral-900 shadow motion-safe:animate-pulse"
                >
                    {badge}
                    <span className="sr-only"> to approve</span>
                </span>
            )}
        </Link>
    );
}


/** The label of a collapsed menu item, shown beside its icon. */
export function SidebarTooltip({ tip }: { tip: Tip | null }) {
    if (!tip) {
        return null;
    }

    return (
        <span
            key={tip.label}
            aria-hidden="true"
            style={{ top: tip.top, left: tip.left }}
            className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-charcoal-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl ring-1 ring-gold-500/40 motion-safe:animate-nav-in"
        >
            {tip.label}
            <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-charcoal-900" />
        </span>
    );
}

/** A labelled section of the menu, or a thin gold divider when collapsed. */
export function SidebarGroup({
    title,
    collapsed = false,
    children,
}: PropsWithChildren<{ title: string; collapsed?: boolean }>) {
    return (
        <div className="mt-4 first:mt-1">
            {collapsed ? (
                <div
                    aria-hidden="true"
                    className="mx-auto mb-2 h-px w-8 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent"
                />
            ) : (
                <p className="mb-1.5 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold-300/70">
                    {title}
                    <span
                        aria-hidden="true"
                        className="h-px flex-1 bg-gradient-to-r from-gold-500/30 to-transparent"
                    />
                </p>
            )}
            <div className="space-y-1">{children}</div>
        </div>
    );
}

export function SidebarProfile({
    collapsed = false,
}: {
    collapsed?: boolean;
}) {
    const { auth } = usePage<PageProps>().props;
    const { user } = auth;

    return (
        <Link
            href={route('profile.edit')}
            aria-label={collapsed ? 'Your profile' : undefined}
            className={`group relative mx-3 flex items-center gap-3 rounded-xl bg-white/[0.06] p-2 ring-1 ring-white/10 transition duration-300 hover:bg-white/10 hover:ring-gold-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
                collapsed ? 'justify-center' : ''
            }`}
        >
            <span className="relative shrink-0">
                <Avatar
                    name={user.full_name}
                    src={user.photo_url}
                    className="h-9 w-9 text-sm ring-2 ring-gold-500 transition duration-300 group-hover:scale-105"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-primary-900" />
            </span>
            {!collapsed && (
                <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold text-white">
                        {user.full_name}
                    </span>
                    <span className="block truncate text-xs text-gold-300/80">
                        {user.roles.includes('super_admin')
                            ? 'Super Admin'
                            : (user.office ?? 'Member')}
                    </span>
                </span>
            )}
        </Link>
    );
}
