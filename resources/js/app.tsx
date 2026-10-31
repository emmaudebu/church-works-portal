import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import OfflineBanner from './Components/OfflineBanner';
import { listenForInstallPrompt } from './lib/install';

const appName = import.meta.env.VITE_APP_NAME || 'Covenant Workforce';

listenForInstallPrompt();

// The offline banner already explains this, so stay on the current page quietly.
router.on('exception', (event) => {
    if (!navigator.onLine) {
        event.preventDefault();
    }
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

createInertiaApp({
    title: (title) => `${title} · ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <>
                <OfflineBanner />
                <App {...props} />
            </>,
        );
    },
    progress: {
        color: '#D4AF37',
    },
});
