import { useEffect, useState } from 'react';

export default function OfflineBanner() {
    const [offline, setOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);

        window.addEventListener('online', update);
        window.addEventListener('offline', update);

        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    if (!offline) {
        return null;
    }

    return (
        <p
            role="status"
            className="fixed inset-x-0 top-0 z-50 bg-warning px-4 py-1.5 text-center text-sm font-medium text-white"
        >
            You're offline. Some actions won't work until you reconnect.
        </p>
    );
}
