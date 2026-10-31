import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { isInstalled, isIos } from '@/lib/install';
import axios from 'axios';
import { useEffect, useState } from 'react';

type State = 'loading' | 'unsupported' | 'blocked' | 'off' | 'on';

function keyToBytes(key: string) {
    const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4))
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function worker() {
    return navigator.serviceWorker.register('/sw.js');
}

export default function PushSettings({
    vapidPublicKey,
}: {
    vapidPublicKey: string | null;
}) {
    const [state, setState] = useState<State>('loading');
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const supported =
            vapidPublicKey &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;

        if (!supported) {
            setState('unsupported');

            return;
        }

        if (Notification.permission === 'denied') {
            setState('blocked');

            return;
        }

        worker()
            .then((registration) => registration.pushManager.getSubscription())
            .then((subscription) => setState(subscription ? 'on' : 'off'))
            .catch(() => setState('unsupported'));
    }, [vapidPublicKey]);

    const enable = async () => {
        setBusy(true);
        setFailed(false);

        try {
            if ((await Notification.requestPermission()) !== 'granted') {
                setState('blocked');

                return;
            }

            await worker();

            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyToBytes(vapidPublicKey ?? ''),
            });

            await axios.post(route('push.store'), subscription.toJSON());

            setState('on');
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    const disable = async () => {
        setBusy(true);

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription =
                await registration.pushManager.getSubscription();

            if (subscription) {
                await axios.post(route('push.destroy'), {
                    endpoint: subscription.endpoint,
                });
                await subscription.unsubscribe();
            }

            setState('off');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="card p-4 sm:p-8">
            <h2 className="text-xl">Notifications</h2>

            {state === 'unsupported' && (
                <p className="mt-1 text-sm text-neutral-600">
                    {isIos() && !isInstalled()
                        ? 'On iPhone, add this app to your home screen first, then turn notifications on here.'
                        : 'Notifications are not available on this device.'}
                </p>
            )}

            {state === 'blocked' && (
                <p className="mt-1 text-sm text-neutral-600">
                    Notifications are blocked. Allow them for this site in your
                    browser settings, then come back here.
                </p>
            )}

            {state === 'off' && (
                <>
                    <p className="mt-1 text-sm text-neutral-600">
                        Get news, events and announcements on this device as
                        soon as they are published.
                    </p>
                    <PrimaryButton
                        type="button"
                        disabled={busy}
                        onClick={enable}
                        className="mt-3"
                    >
                        Turn on notifications
                    </PrimaryButton>
                </>
            )}

            {state === 'on' && (
                <>
                    <p className="mt-1 text-sm text-neutral-600">
                        Notifications are on for this device.
                    </p>
                    <SecondaryButton
                        disabled={busy}
                        onClick={disable}
                        className="mt-3"
                    >
                        Turn off
                    </SecondaryButton>
                </>
            )}

            {failed && (
                <p className="mt-2 text-sm text-danger">
                    That did not work. Please try again.
                </p>
            )}
        </section>
    );
}
