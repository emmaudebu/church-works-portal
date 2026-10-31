import { PropsWithChildren } from 'react';

const variants = {
    success: 'bg-success text-white',
    warning: 'bg-warning text-white',
    danger: 'bg-danger text-white',
    gold: 'border border-gold-500 bg-gold-50 text-neutral-900',
};

export default function Badge({
    variant,
    children,
}: PropsWithChildren<{ variant: keyof typeof variants }>) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
        >
            {children}
        </span>
    );
}
