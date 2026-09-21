import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'model/*'],
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
        // Everything the offline path needs, including the model's weights.bin.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json,bin}'],
        // Workbox skips files over 2 MB by default: the model and the TF.js bundle are bigger.
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
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
