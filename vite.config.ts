import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import https from 'https';

function googleSheetsDevProxy(): Plugin {
  return {
    name: 'google-sheets-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/sync-sheet')) {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const sheetId = urlObj.searchParams.get('id') || '1bFTL1edC-btgjp2KvvkwIM5WaJnycVFylTmFQQFRixk';
          const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

          const fetchFollow = (url: string) => {
            https.get(url, (googleRes) => {
              if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
                fetchFollow(googleRes.headers.location);
                return;
              }
              if (googleRes.statusCode !== 200) {
                res.statusCode = googleRes.statusCode || 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Google Sheets returned status ${googleRes.statusCode}` }));
                return;
              }
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              res.setHeader('Access-Control-Allow-Origin', '*');
              googleRes.pipe(res);
            }).on('error', (err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            });
          };

          fetchFollow(targetUrl);
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    googleSheetsDevProxy(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'icon.svg', 'app-logo.jpg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        id: '/',
        name: 'سیستم جامع امور مالی و حسابداری مدرسة القرآن الکریم شهرضا',
        short_name: 'مدرسه القرآن',
        description: 'سیستم جامع مدیریت مالی، شهریه و حسابداری مدارس و مهدالرضاهای مجموعه مدرسة القرآن الکریم شهرضا',
        theme_color: '#62205f',
        background_color: '#f8f5f9',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
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
