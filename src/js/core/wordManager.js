/**
 * Word pool management, non-repeating selection & custom word persistence
 */
import { BUILT_IN_WORDS } from '../../data/words.js';
import { LS_KEYS, lsSet } from './storage.js';
import { appState } from './state.js';
import { showToast } from '../ui/feedback.js';

export function getAllAvailableWords(selectedCats) {
  const pool = [];
  BUILT_IN_WORDS.forEach((w) => {
    if (selectedCats.includes(w.category)) pool.push(w);
  });
  if (selectedCats.includes('custom')) {
    appState.customWords.forEach((w) => pool.push(w));
  }
  return pool;
}

export function pickNonRepeatingWordPair(selectedCats) {
  const pool = getAllAvailableWords(selectedCats);
  if (pool.length === 0) return null;

  let unused = pool.filter((w) => !appState.usedWordIds.includes(w.id));
  if (unused.length === 0) {
    const poolIds = new Set(pool.map((w) => w.id));
    appState.usedWordIds = appState.usedWordIds.filter((id) => !poolIds.has(id));
    unused = pool;
    showToast('🔄 Đã chơi hết kho từ các chủ đề này — Tự động làm mới kho từ!');
  }

  const chosen = unused[Math.floor(Math.random() * unused.length)];
  appState.usedWordIds.push(chosen.id);
  lsSet(LS_KEYS.USED_WORDS, appState.usedWordIds);
  return chosen;
}

export function addCustomWord(civ, und, syns) {
  const newPair = {
    id: 'cw_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    category: 'custom',
    word_civilian: civ,
    word_undercover: und,
    synonyms: syns
  };
  appState.customWords.unshift(newPair);
  lsSet(LS_KEYS.CUSTOM_WORDS, appState.customWords);

  if (!appState.setupConfig.categories.includes('custom')) {
    appState.setupConfig.categories.push('custom');
  }
  return newPair;
}

export function removeCustomWord(id) {
  appState.customWords = appState.customWords.filter((w) => w.id !== id);
  lsSet(LS_KEYS.CUSTOM_WORDS, appState.customWords);
}
