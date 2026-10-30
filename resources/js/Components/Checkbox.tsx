import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-neutral-200 text-primary-700 shadow-sm focus:ring-primary-700 ' +
                className
            }
        />
    );
}
