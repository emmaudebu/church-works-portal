import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const revision = (path) =>
    createHash('md5').update(readFileSync(path)).digest('hex');

const precachedPublicFiles = [
    'offline.html',
    'images/logo-dark.png',
    'images/icons/icon-192.png',
].map((file) => ({ url: `/${file}`, revision: revision(`public/${file}`) }));

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'resources/js',
            filename: 'sw.js',
            outDir: 'public',
            base: '/',
            buildBase: '/',
            scope: '/',
            injectRegister: false,
            includeManifestIcons: false,
            injectManifest: {
                globDirectory: 'public/build',
                globPatterns: ['assets/*.{js,css}'],
                modifyURLPrefix: { assets: '/build/assets' },
                additionalManifestEntries: precachedPublicFiles,
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
            },
            manifest: {
                id: '/',
                name: 'Covenant Technical Department',
                short_name: 'Covenant Tech',
                description: 'Members, attendance, events and elections in one place',
                start_url: '/dashboard',
                scope: '/',
                display: 'standalone',
                orientation: 'portrait',
                background_color: '#FFFFFF',
                theme_color: '#7A1210',
                icons: [
                    { src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/images/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/images/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
                shortcuts: [
                    { name: 'My QR', url: '/my-qr', icons: [{ src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
                ],
            },
        }),
    ],
});
