import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// base: './' para que sirva igual en un subdirectorio, GitHub Pages o dentro de Capacitor (02 §9).
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Cerditos',
        short_name: 'Cerditos',
        description: 'Un juego incremental tranquilo sobre granjas de cerditos.',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#faf6ef',
        theme_color: '#faf6ef',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'], cleanupOutdatedCaches: true },
    }),
  ],
});
