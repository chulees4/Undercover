/**
 * Centralized application state, auto-balance formula & persistence helpers
 */
import { LS_KEYS, lsGet, lsSet, lsRemove } from './storage.js';

export function getAutoBalance(n) {
  const table = {
    3:  { u: 1, w: 0 },
    4:  { u: 1, w: 0 },
    5:  { u: 1, w: 1 },
    6:  { u: 1, w: 1 },
    7:  { u: 2, w: 1 },
    8:  { u: 2, w: 1 },
    9:  { u: 2, w: 1 },
    10: { u: 3, w: 1 },
    11: { u: 3, w: 1 },
    12: { u: 3, w: 1 },
    13: { u: 3, w: 2 },
    14: { u: 3, w: 2 },
    15: { u: 4, w: 2 },
    16: { u: 4, w: 2 },
    17: { u: 4, w: 2 },
    18: { u: 4, w: 2 },
    19: { u: 5, w: 2 },
    20: { u: 5, w: 2 }
  };
  return table[n] || { u: 1, w: 0 };
}

export function getMaxImpostors(n) {
  // Civilians MUST be strictly > 50% => Impostors <= floor((n - 1) / 2)
  return Math.floor((n - 1) / 2);
}

export const appState = {
  // Persistent data
  savedProfiles: lsGet(LS_KEYS.PROFILES, []),
  customWords: lsGet(LS_KEYS.CUSTOM_WORDS, []),
  usedWordIds: lsGet(LS_KEYS.USED_WORDS, []),

  // Setup configuration
  setupConfig: {
    playerCount: 5,
    undercoverCount: 1,
    mrWhiteCount: 1,
    roles: {
      justice: false,
      lovers: false,
      avenger: false
    },
    categories: ['common', 'food', 'travel', 'entertainment', 'tech_life'],
    timerSeconds: 30, // 0 | 30 | 45
    votingMode: 'offline' // 'offline' | 'secret'
  },

  // Active Game Session
  game: null,

  // Runtime timers & UI flags (not persisted)
  descTimerInterval: null,
  descTimeRemaining: 0,
  descTimerRunning: false,
  mrWhiteTimerInterval: null,
  cardRevealedForCurrentPlayer: false,
  selectedOfflineVoteId: null
};

export function persistSession() {
  if (appState.game && appState.game.status !== 'SETUP') {
    lsSet(LS_KEYS.SESSION, appState.game);
  } else {
    lsRemove(LS_KEYS.SESSION);
  }
}

export function persistProfilesFromGame() {
  if (!appState.game || !appState.game.players) return;
  appState.savedProfiles = appState.game.players.map((p, idx) => ({
    name: p.name,
    avatar: p.avatar,
    totalScore: p.totalScore || 0,
    namedByUser: !!p.namedByUser,
    seat: idx + 1
  }));
  lsSet(LS_KEYS.PROFILES, appState.savedProfiles);
}

export function stopAllTimers() {
  if (appState.descTimerInterval) {
    clearInterval(appState.descTimerInterval);
    appState.descTimerInterval = null;
  }
  appState.descTimerRunning = false;
  if (appState.mrWhiteTimerInterval) {
    clearInterval(appState.mrWhiteTimerInterval);
    appState.mrWhiteTimerInterval = null;
  }
}
