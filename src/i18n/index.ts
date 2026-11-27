import { createInstance } from 'i18next';
import { vi } from './locales/vi';
import { locale } from './config';

export { locale } from './config';
export const resources = { vi: { translation: vi } } as const;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: typeof resources.vi;
    strictKeyChecks: true;
  }
}

export const i18n = createInstance();

// Bundled resources initialize synchronously, including in domain/unit-test callers.
// Keep the promise so the browser entrypoint explicitly waits before rendering.
export const i18nReady = i18n.init({
  lng: locale,
  fallbackLng: locale,
  supportedLngs: [locale],
  defaultNS: 'translation',
  resources,
  initAsync: false,
  interpolation: { escapeValue: false },
});

export const t = i18n.t.bind(i18n);
