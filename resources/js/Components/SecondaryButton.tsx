import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center rounded-lg border border-primary-700 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 ${
                    disabled && 'opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
