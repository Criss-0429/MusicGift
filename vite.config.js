import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'fonts/rainyhearts.ttf', 'covers/*.png', 'audio/*.mp3'],
      manifest: {
        name: 'Cupid Player per Anamaria 💖',
        short_name: 'Anamaria Player',
        description: 'Un regalo speciale da Cristiano per Anamaria. Ascolta la nostra musica senza pubblicità e anche offline. 💌',
        theme_color: '#5a3a4a',
        background_color: '#1a1218',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ttf}'],
        // Exclude huge cached audio files from primary precache to save initial loading time;
        // they are cached dynamically or stored in IndexedDB.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/googlevideo\.com\/videoplayback/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-audio-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
