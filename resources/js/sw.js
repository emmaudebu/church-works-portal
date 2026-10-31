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
