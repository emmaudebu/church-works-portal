import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link } from '@inertiajs/react';
import { MoreVertical } from 'lucide-react';

export type Action = {
    label: string;
    href?: string;
    external?: boolean;
    onClick?: () => void;
    danger?: boolean;
};

export default function ActionMenu({
    label,
    actions,
}: {
    label: string;
    actions: Action[];
}) {
    const itemClass = (danger?: boolean) =>
        `block w-full px-4 py-2 text-left text-sm data-[focus]:bg-primary-50 ${
            danger ? 'text-danger' : 'text-neutral-900'
        }`;

    return (
        <Menu>
            <MenuButton
                aria-label={label}
                className="rounded-lg p-2 text-neutral-600 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
            >
                <MoreVertical size={20} strokeWidth={1.75} aria-hidden="true" />
            </MenuButton>
            <MenuItems
                anchor="bottom end"
                className="card z-50 w-48 py-1 ring-1 ring-neutral-200 focus:outline-none"
            >
                {actions.map((action) => (
                    <MenuItem key={action.label}>
                        {action.external ? (
                            <a
                                href={action.href}
                                target="_blank"
                                rel="noreferrer"
                                className={itemClass(action.danger)}
                            >
                                {action.label}
                            </a>
                        ) : action.href ? (
                            <Link
                                href={action.href}
                                className={itemClass(action.danger)}
                            >
                                {action.label}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={action.onClick}
                                className={itemClass(action.danger)}
                            >
                                {action.label}
                            </button>
                        )}
                    </MenuItem>
                ))}
            </MenuItems>
        </Menu>
    );
}
