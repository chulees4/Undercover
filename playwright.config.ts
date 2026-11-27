import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173/Undercover/',
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
  webServer: {
    command:
      'npm run build -- --base=/Undercover/ && node tests/e2e/preview.mjs',
    url: 'http://localhost:4173/Undercover/',
    timeout: 60_000,
  },
});
