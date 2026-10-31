import PrimaryButton from '@/Components/PrimaryButton';
import {
    canInstall,
    isInstalled,
    isIos,
    takeInstallPrompt,
} from '@/lib/install';
import { useEffect, useState } from 'react';

export default function InstallApp() {
    const [available, setAvailable] = useState(canInstall);

    useEffect(() => {
        const show = () => setAvailable(true);

        window.addEventListener('install-available', show);

        return () => window.removeEventListener('install-available', show);
    }, []);

    const install = async () => {
        await takeInstallPrompt()?.prompt();

        setAvailable(false);
    };

    if (isInstalled() || (!available && !isIos())) {
        return null;
    }

    return (
        <section className="card p-4 sm:p-8">
            <h2 className="text-xl">Install the app</h2>
            {available ? (
                <>
                    <p className="mt-1 text-sm text-neutral-600">
                        Add Covenant Workforce to your home screen for quick
                        access.
                    </p>
                    <PrimaryButton
                        type="button"
                        onClick={install}
                        className="mt-3"
                    >
                        Install
                    </PrimaryButton>
                </>
            ) : (
                <p className="mt-1 text-sm text-neutral-600">
                    In Safari, tap the Share button, then choose Add to Home
                    Screen.
                </p>
            )}
        </section>
    );
}
