import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export default function Logo({
    variant = 'light',
    href = '/',
    className = '',
    wordmarkClassName = 'text-neutral-900',
}: {
    variant?: 'light' | 'dark';
    href?: string;
    className?: string;
    wordmarkClassName?: string;
}) {
    const { branding } = usePage<PageProps>().props;

    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${className}`}
        >
            <img
                src={branding[`logo_${variant}_url`]}
                alt=""
                className="h-9 w-auto"
            />
            <span
                className={`font-serif text-lg font-semibold leading-tight ${wordmarkClassName}`}
            >
                {branding.church_name}
            </span>
        </Link>
    );
}
