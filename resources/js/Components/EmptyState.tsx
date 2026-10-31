import { LucideIcon } from 'lucide-react';

export default function EmptyState({
    icon: Icon,
    message,
}: {
    icon: LucideIcon;
    message: string;
}) {
    return (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-500">
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <p className="mt-4 text-neutral-600">{message}</p>
        </div>
    );
}
