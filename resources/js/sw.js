import {
    cleanupOutdatedCaches,
    matchPrecache,
    precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

const OFFLINE_URL = '/offline.html';

self.skipWaiting();
self.addEventListener('activate', (event) =>
    event.waitUntil(self.clients.claim()),
);

// Only the app's code, icons and offline page are stored. Pages, photos and QR
// codes hold personal data and must never be left on a shared phone.
cleanupOutdatedCaches();

// The plugin always lists the web manifest at the site root, but ours is in
// build/, and one missing file would make the whole install fail.
precacheAndRoute(
    self.__WB_MANIFEST.filter((entry) => !entry.url.endsWith('.webmanifest')),
);

registerRoute(
    new NavigationRoute(async ({ request }) => {
        try {
            return await fetch(request);
        } catch {
            return matchPrecache(OFFLINE_URL);
        }
    }),
);

self.addEventListener('push', (event) => {
    const payload = event.data?.json() ?? {};

    event.waitUntil(
        self.registration.showNotification(payload.title ?? 'New update', {
            body: payload.body,
            icon: payload.icon ?? '/images/icons/icon-192.png',
            badge: '/images/icons/icon-192.png',
            data: payload.data,
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = new URL(event.notification.data?.url ?? '/', self.location.origin);

    // Only ever open this site, whatever the message says.
    event.waitUntil(self.clients.openWindow(url.origin === self.location.origin ? url.href : '/'));
});
