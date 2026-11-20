/**
 * Game Initialization, Role Assignment & Session Resume
 */
import { AVATAR_LIST } from '../../data/avatars.js';
import { LS_KEYS, lsGet, lsRemove } from '../core/storage.js';
import { fisherYates } from '../core/utils.js';
import { SFX } from '../core/audio.js';
import { appState, persistSession } from '../core/state.js';
import { getAllAvailableWords, pickNonRepeatingWordPair } from '../core/wordManager.js';
import { goToSetup, renderCurrentGameState } from '../core/router.js';
import { showToast } from '../ui/feedback.js';

export function startNewGame(keepRosterFromPrevious) {
  const cfg = appState.setupConfig;

  if (cfg.categories.length === 0) {
    SFX.alarm();
    showToast('Vui lòng chọn ít nhất 1 chủ đề từ khóa!', 'error');
    return;
  }

  const available = getAllAvailableWords(cfg.categories);
  if (available.length === 0) {
    SFX.alarm();
    showToast('Chủ đề đã chọn chưa có cặp từ nào! Hãy thêm từ tự tạo hoặc chọn thêm chủ đề khác.', 'error');
    return;
  }

  const wordPair = pickNonRepeatingWordPair(cfg.categories);
  if (!wordPair) return;

  const n = cfg.playerCount;
  const uCount = cfg.undercoverCount;
  const wCount = cfg.mrWhiteCount;
  const cCount = n - uCount - wCount;

  // Build and shuffle role array (Fisher-Yates)
  const rolesArray = [
    ...Array(cCount).fill('CIVILIAN'),
    ...Array(uCount).fill('UNDERCOVER'),
    ...Array(wCount).fill('MR_WHITE')
  ];
  const shuffledRoles = fisherYates(rolesArray);

  // Build players preserving saved names/avatars/scores when available
  const prevPlayers = (keepRosterFromPrevious && appState.game && appState.game.players)
    ? appState.game.players
    : appState.savedProfiles;

  const players = [];
  for (let i = 0; i < n; i++) {
    const prev = prevPlayers[i];
    const role = shuffledRoles[i];
    players.push({
      id: 'p_' + (i + 1),
      seat: i + 1,
      name: (prev && prev.name) ? prev.name : `Người chơi ${i + 1}`,
      namedByUser: !!(prev && prev.namedByUser),
      avatar: (prev && prev.avatar) ? prev.avatar : AVATAR_LIST[i % AVATAR_LIST.length],
      role,
      specialRoles: [],
      loverId: null,
      assignedWord: role === 'CIVILIAN'
        ? wordPair.word_civilian
        : (role === 'UNDERCOVER' ? wordPair.word_undercover : null),
      wordLocked: false,
      isAlive: true,
      totalScore: (prev && typeof prev.totalScore === 'number') ? prev.totalScore : 0,
      lastPointsEarned: 0
    });
  }

  // Assign Special Roles
  // 1. Goddess of Justice -> must be a Civilian
  if (cfg.roles.justice) {
    const civs = players.filter((p) => p.role === 'CIVILIAN');
    if (civs.length > 0) {
      const chosen = civs[Math.floor(Math.random() * civs.length)];
      chosen.specialRoles.push('JUSTICE');
    }
  }

  // 2. Lovers -> 2 random distinct players (when n >= 4)
  if (cfg.roles.lovers && n >= 4) {
    const shuffledIdx = fisherYates(players.map((_, idx) => idx));
    const pA = players[shuffledIdx[0]];
    const pB = players[shuffledIdx[1]];
    pA.specialRoles.push('LOVER');
    pB.specialRoles.push('LOVER');
    pA.loverId = pB.id;
    pB.loverId = pA.id;
  }

  // 3. Avenger -> 1 random player (prefer someone without other special role if possible)
  if (cfg.roles.avenger) {
    let candidates = players.filter((p) => p.specialRoles.length === 0);
    if (candidates.length === 0) candidates = players;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    chosen.specialRoles.push('AVENGER');
  }

  appState.game = {
    sessionId: 'sess_' + Date.now(),
    status: 'DISTRIBUTE',
    subState: 'PRIVACY', // 'PRIVACY' | 'CARD'
    config: JSON.parse(JSON.stringify(cfg)),
    roundNumber: 1,
    currentWordPair: wordPair,
    players,
    distributeIndex: 0,
    firstSpeakerId: null,
    speakerOrder: [],
    activeSpeakerIdx: 0,
    secretVote: null,
    eliminationState: null,
    winner: null, // 'CIVILIANS' | 'IMPOSTORS' | 'MR_WHITE_GUESS'
    winningMrWhiteId: null
  };

  SFX.flip();
  persistSession();
  renderCurrentGameState();
}

export function resumeSavedGame() {
  SFX.flip();
  const saved = lsGet(LS_KEYS.SESSION, null);
  if (!saved) {
    goToSetup();
    return;
  }
  appState.game = saved;
  appState.setupConfig = JSON.parse(JSON.stringify(appState.game.config || appState.setupConfig));
  renderCurrentGameState();
}

export function discardSavedGame() {
  SFX.click();
  lsRemove(LS_KEYS.SESSION);
  goToSetup();
}
