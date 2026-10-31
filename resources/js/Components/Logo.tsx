import { Link } from '@inertiajs/react';

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
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${className}`}
        >
            <img
                src={`/images/logo-${variant}.png`}
                alt=""
                className="h-9 w-auto"
            />
            <span
                className={`font-serif text-lg font-semibold leading-tight ${wordmarkClassName}`}
            >
                Covenant Workforce
            </span>
        </Link>
    );
}
