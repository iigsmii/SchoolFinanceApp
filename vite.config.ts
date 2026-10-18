import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Icon version: bump this whenever the logo artwork changes so that Android/iOS
// discard the previously cached launcher icon and pick up the new one.
const ICON_VERSION = '2';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        `apple-touch-icon.png?v=${ICON_VERSION}`,
        `icon.svg?v=${ICON_VERSION}`,
        `app-logo.jpg?v=${ICON_VERSION}`,
        `pwa-192x192.png?v=${ICON_VERSION}`,
        `pwa-512x512.png?v=${ICON_VERSION}`,
      ],
      manifest: {
        id: '/',
        name: 'سیستم مالی مدرسه القرآن',
        short_name: 'مدرسه القرآن',
        description: 'سیستم جامع مدیریت مالی، شهریه و حسابداری مدارس و مهدالرضاهای مجموعه مدرسة القرآن الکریم شهرضا',
        theme_color: '#62205f',
        background_color: '#f8f5f9',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: `/pwa-192x192.png?v=${ICON_VERSION}`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/pwa-512x512.png?v=${ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/pwa-maskable-512x512.png?v=${ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
