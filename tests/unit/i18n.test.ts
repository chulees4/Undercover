import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../../src/game/data/words';
import { roleLabelShort, roleLabelVN } from '../../src/game/data/avatars';
import { i18n, i18nReady, locale, t } from '../../src/i18n';
import { escapeHtml, localizeHtml } from '../../src/i18n/html';
import { vi } from '../../src/i18n/locales/vi';
import { createRepository } from '../../src/infrastructure/persistence/repository';

describe('Vietnamese locale', () => {
  it('initializes bundled Vietnamese resources before callers need them', async () => {
    expect(i18n.isInitialized).toBe(true);
    await i18nReady;
    expect(locale).toBe('vi');
    expect(i18n.resolvedLanguage).toBe('vi');
    expect(i18n.options.supportedLngs).toContain('vi');
    expect(i18n.options.backend).toBeUndefined();
  });

  it('formats complete messages and keeps player text intact for JSX rendering', () => {
    expect(t('game.setup.savedGameSummary', { round: 2, count: 5 })).toBe(
      'Vòng 2 · 5 người chơi',
    );
    expect(t('game.voting.voteCount', { count: 3 })).toBe('3 phiếu');
    expect(t('game.players.defaultName', { value1: 2 })).toBe('Người chơi 2');
    const name = 'Hải & <Minh>';
    expect(t('game.voting.revealAndEliminate', { name })).toBe(
      `Lật vai trò & Loại ${name}`,
    );
    expect(t('game.reveal.lover', { name })).toBe(`Người tình của ${name}`);
    expect(t('game.results.whiteGuessWinner', { name })).toBe(
      `${name} đã đoán chính xác từ khóa của Dân thường (+8 điểm)!`,
    );
  });

  it('provides labels for every category and role without changing their IDs', () => {
    for (const category of CATEGORIES) {
      expect(t(`game.categories.${category.labelKey}`)).toBe(
        vi.game.categories[category.labelKey],
      );
      expect(i18n.exists(`game.categories.${category.labelKey}`)).toBe(true);
    }
    expect(roleLabelVN('CIVILIAN')).toContain('Dân thường');
    expect(roleLabelVN('UNDERCOVER')).toContain('Gián điệp');
    expect(roleLabelVN('MR_WHITE')).toContain('Mũ Trắng');
    expect(roleLabelShort('CIVILIAN')).toContain('Dân thường');
  });

  it('returns a localized notice when saved data cannot be read', () => {
    const repository = createRepository({
      getItem: () => {
        throw new Error('Storage unavailable');
      },
      setItem: () => {},
    });
    expect(repository.load().notices).toContain(
      t('app.storage.cannotReadSavedData'),
    );
  });

  it('fills static HTML from the same locale resource used by the app', () => {
    const template = readFileSync(
      new URL('../../index.html', import.meta.url),
      'utf8',
    );
    const html = localizeHtml(template);
    expect(html).toContain('<html lang="vi">');
    expect(html).toContain(
      `<title>${escapeHtml(vi.app.metadata.name)}</title>`,
    );
    expect(html).toContain(
      `content="${escapeHtml(vi.app.metadata.pageDescription)}"`,
    );
    expect(html).toContain(
      `<noscript>${escapeHtml(vi.app.metadata.noscript)}</noscript>`,
    );
    expect(html).not.toMatch(/__APP_[A-Z]+__/);
    expect(escapeHtml(`A & B <tag> "quoted" 'text'`)).toBe(
      'A &amp; B &lt;tag&gt; &quot;quoted&quot; &#39;text&#39;',
    );
  });
});
