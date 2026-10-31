import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Toast() {
    const { flash } = usePage<PageProps>().props;
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!flash.success) {
            return;
        }

        setMessage(flash.success);

        const timer = setTimeout(() => setMessage(null), 4000);

        return () => clearTimeout(timer);
    }, [flash]);

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed inset-x-4 top-4 z-50 flex justify-center md:inset-x-auto md:right-6"
        >
            {message && (
                <p className="card pointer-events-auto flex items-center gap-2 border-l-2 border-success px-4 py-3 text-sm">
                    <CheckCircle2
                        size={20}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="shrink-0 text-success"
                    />
                    {message}
                </p>
            )}
        </div>
    );
}
