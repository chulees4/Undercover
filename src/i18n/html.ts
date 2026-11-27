import { locale } from './config.ts';
import { vi } from './locales/vi.ts';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export function localizeHtml(html: string): string {
  const values: Record<string, string> = {
    APP_LOCALE: locale,
    APP_NAME: vi.app.metadata.name,
    APP_DESCRIPTION: vi.app.metadata.pageDescription,
    APP_NOSCRIPT: vi.app.metadata.noscript,
  };
  return html.replace(/__(APP_[A-Z]+)__/g, (placeholder, key: string) =>
    key in values ? escapeHtml(values[key]) : placeholder,
  );
}
