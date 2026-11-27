import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { locale } from './src/i18n/config.ts';
import { localizeHtml } from './src/i18n/html.ts';
import { vi } from './src/i18n/locales/vi.ts';

export default defineConfig({
  base: process.env.UNDERCOVER_BASE ?? './',
  plugins: [
    { name: 'app-locale-html', transformIndexHtml: localizeHtml },
    preact(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: vi.app.metadata.name,
        short_name: vi.app.metadata.shortName,
        description: vi.app.metadata.description,
        start_url: './index.html',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#081120',
        theme_color: '#081120',
        lang: locale,
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: './assets/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: './assets/icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The PWA plugin adds the manifest and its icons with their own revisions.
        globPatterns: ['**/*.{html,js,css,woff2,otf,ttf}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        importScripts: ['cleanup-legacy-cache.js'],
      },
    }),
  ],
});
