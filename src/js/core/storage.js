/**
 * LocalStorage keys & safe persistence helpers
 */

export const LS_KEYS = {
  SESSION: 'undercover_vn_session_v1',
  CUSTOM_WORDS: 'undercover_vn_custom_words_v1',
  USED_WORDS: 'undercover_vn_used_words_v1',
  PROFILES: 'undercover_vn_profiles_v1',
  SOUND: 'undercover_vn_sound_v1'
};

export function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage quota / private mode errors gracefully
  }
}

export function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}
