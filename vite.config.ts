import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.UNDERCOVER_BASE ?? './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Undercover – Gián Điệp Ẩn Danh',
        short_name: 'Undercover',
        description:
          'Board game suy luận xã hội Pass & Play 100% tiếng Việt, chơi offline cùng bạn bè trên một thiết bị.',
        start_url: './index.html',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#070914',
        theme_color: '#070914',
        lang: 'vi',
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
        globPatterns: ['**/*.{html,js,css}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        importScripts: ['cleanup-legacy-cache.js'],
      },
    }),
  ],
});
