import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'FasalRakshak',
        short_name: 'FasalRakshak',
        description: 'Crop risk alerts and offline leaf diagnosis',
        theme_color: '#c67139',
        background_color: '#f5ead8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // The app shell is precached. The crop models (~9 MB each, 4 crops) are NOT:
        // installing all of them would cost a farmer ~38 MB. Each farmer's own crop
        // model is cached at runtime instead (see the 'models' rule below), and the
        // app loads it on start-up, so it is on the phone before they go offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        globIgnores: ['model/**'],
        // Workbox skips files over 2 MB by default: the model and the TF.js bundle are bigger.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Model files never change in place: bump the cache name whenever new
            // model files are dropped in, or phones keep the old ones.
            urlPattern: /\/model\/.+/,
            handler: 'CacheFirst',
            options: { cacheName: 'models-v1', expiration: { maxEntries: 40 } }
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'weather', networkTimeoutSeconds: 4 }
          },
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 400 } }
          }
        ]
      }
    })
  ]
});
