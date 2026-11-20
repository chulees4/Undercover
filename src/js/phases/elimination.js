/**
 * STATE 5 – ELIMINATION, MR. WHITE 20S GUESS, SPECIAL ROLES & WIN CHECK
 */
import { roleLabelVN, roleEmoji } from '../../data/avatars.js';
import { escapeHtml, normalizeVN } from '../core/utils.js';
import { SFX, vibrate } from '../core/audio.js';
import { appState, persistSession, stopAllTimers } from '../core/state.js';
import { callPhase } from '../core/router.js';
import { showDynamicModal, closeDynamicModal } from '../ui/feedback.js';

/**
 * Initiates elimination for a player, using a queue to handle chain reactions
 * (Mr. White Guess -> Lover chain -> Avenger pick -> Win Condition Check)
 */
export function startEliminationSequence(playerId, cause = 'VOTE') {
  stopAllTimers();
  const game = appState.game;
  game.status = 'ELIMINATION';
  game.eliminationState = {
    queue: [{ playerId, cause }],
    current: null,
    flipped: false,
    mrWhiteHandled: false,
    loverHandled: false,
    avengerHandled: false
  };
  advanceEliminationQueue();
}

function advanceEliminationQueue() {
  const game = appState.game;
  const es = game.eliminationState;
  let nextItem = null;

  while (es.queue.length > 0) {
    const candidate = es.queue.shift();
    const pl = game.players.find((p) => p.id === candidate.playerId);
    if (pl && pl.isAlive) {
      pl.isAlive = false;
      nextItem = candidate;
      break;
    }
  }

  if (!nextItem) {
    evaluateWinCondition();
    return;
  }

  es.current = nextItem;
  es.flipped = false;
  es.mrWhiteHandled = false;
  es.loverHandled = false;
  es.avengerHandled = false;

  SFX.eliminate();
  vibrate([80, 40, 80]);
  persistSession();
  renderElimination();

  setTimeout(() => {
    const card = document.getElementById('elimFlipCard');
    if (card) {
      card.classList.add('flipped');
      SFX.flip();
    }
    if (appState.game && appState.game.eliminationState) {
      appState.game.eliminationState.flipped = true;
      const btn = document.getElementById('btnAfterFlip');
      if (btn) btn.classList.remove('hidden');
    }
  }, 450);
}

export function renderElimination() {
  const game = appState.game;
  const es = game.eliminationState;
  const p = game.players.find((pl) => pl.id === es.current.playerId);
  const causeText = es.current.cause === 'LOVER'
    ? '💔 Bị loại theo Cặp đôi Người tình'
    : (es.current.cause === 'AVENGER' ? '⚔️ Bị Kẻ báo thù kéo theo' : '🗳️ Bị bỏ phiếu loại');

  const specialBadges = [];
  if (p.specialRoles.includes('JUSTICE')) specialBadges.push('⚖️ Nữ thần Công lý');
  if (p.specialRoles.includes('LOVER')) specialBadges.push('💘 Người tình');
  if (p.specialRoles.includes('AVENGER')) specialBadges.push('⚔️ Kẻ báo thù');

  const view = document.getElementById('appView');
  view.innerHTML = `
    <div class="center-stage">
      <div class="glass-card" style="padding:24px 18px;">
        <div class="pill-badge orange mb-8">${causeText}</div>
        <h2 style="margin:4px 0 6px;font-size:24px;font-weight:900;">${p.avatar} ${escapeHtml(p.name)}</h2>

        <div class="flip-scene">
          <div id="elimFlipCard" class="flip-card ${es.flipped ? 'flipped' : ''}">
            <div class="flip-face flip-front">
              <div style="font-size:56px;">❓</div>
              <div style="font-weight:800;margin-top:8px;">Đang lật vai trò...</div>
            </div>
            <div class="flip-face flip-back role-${p.role}">
              <div style="font-size:56px;margin-bottom:6px;">${roleEmoji(p.role)}</div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;opacity:0.85;">VAI TRÒ THẬT</div>
              <div style="font-size:28px;font-weight:900;margin-top:4px;">${roleLabelVN(p.role)}</div>
              ${specialBadges.length ? `<div style="margin-top:10px;font-size:12px;font-weight:700;background:rgba(0,0,0,0.3);padding:4px 10px;border-radius:999px;">${specialBadges.join(' • ')}</div>` : ''}
            </div>
          </div>
        </div>

        <button type="button" id="btnAfterFlip" class="btn btn-primary ${es.flipped ? '' : 'hidden'}">
          Tiếp tục →
        </button>
      </div>
    </div>
  `;

  view.querySelector('#btnAfterFlip').addEventListener('click', processPostEliminationTriggers);
}

function processPostEliminationTriggers() {
  SFX.click();
  const game = appState.game;
  const es = game.eliminationState;
  const p = game.players.find((pl) => pl.id === es.current.playerId);

  // 1. Mr. White Last Chance Guess!
  if (p.role === 'MR_WHITE' && !es.mrWhiteHandled) {
    es.mrWhiteHandled = true;
    persistSession();
    openMrWhiteGuessModal(p);
    return;
  }

  // 2. Lover Chain Trigger
  if (p.specialRoles.includes('LOVER') && p.loverId && !es.loverHandled) {
    es.loverHandled = true;
    const partner = game.players.find((pl) => pl.id === p.loverId);
    if (partner && partner.isAlive) {
      es.queue.push({ playerId: partner.id, cause: 'LOVER' });
      persistSession();
      const box = showDynamicModal(`
        <div style="text-align:center;padding:8px 0;">
          <div style="font-size:54px;margin-bottom:8px;">💘💔</div>
          <h3 style="margin:0 0 8px;color:#fbcfe8;">Hiệu ứng Cặp đôi Người tình!</h3>
          <p style="margin:0 0 16px;font-size:15px;">
            <strong>${escapeHtml(p.name)}</strong> là Người tình của <strong>${partner.avatar} ${escapeHtml(partner.name)}</strong>.<br>
            <strong>${escapeHtml(partner.name)}</strong> lập tức bị loại theo!
          </p>
          <button type="button" class="btn btn-orange" id="btnLoverContinue">Tiếp tục</button>
        </div>
      `, false);
      if (box) {
        box.querySelector('#btnLoverContinue').addEventListener('click', () => {
          closeDynamicModal();
          processPostEliminationTriggers();
        });
      }
      return;
    }
  }

  // 3. Avenger Trigger
  if (p.specialRoles.includes('AVENGER') && !es.avengerHandled) {
    es.avengerHandled = true;
    const aliveTargets = game.players.filter(
      (pl) => pl.isAlive && !es.queue.some((q) => q.playerId === pl.id)
    );
    if (aliveTargets.length > 0) {
      persistSession();
      openAvengerPickModal(p, aliveTargets);
      return;
    }
  }

  // 4. Move to next item in elimination queue (or Win Check if empty)
  advanceEliminationQueue();
}

function openMrWhiteGuessModal(mrWhitePlayer) {
  let timeLeft = 20;
  const box = showDynamicModal(`
    <div style="text-align:center;">
      <div style="font-size:48px;margin-bottom:4px;">🎩⚡</div>
      <h3 style="margin:0 0 6px;font-size:20px;">Cơ hội cuối của Mũ Trắng!</h3>
      <p class="muted" style="margin:0 0 12px;">
        <strong>${escapeHtml(mrWhitePlayer.name)}</strong> đã bị phát hiện!<br>
        Hãy đoán chính xác <strong>từ khóa của Dân thường</strong> để lật kèo chiến thắng ngay lập tức.
      </p>
      <div id="mwCountdown" class="timer-digits" style="margin:4px auto 12px;">20s</div>
      <input id="mwGuessInput" class="input-field mb-12" type="text" placeholder="Nhập từ khóa của Dân thường..." autocomplete="off" />
      <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="btnMwGiveUp">Bỏ cuộc</button>
        <button type="button" class="btn btn-orange" id="btnMwSubmit">🎯 Đoán ngay</button>
      </div>
    </div>
  `, false);

  if (!box) return;

  const inputEl = box.querySelector('#mwGuessInput');
  if (inputEl) {
    setTimeout(() => inputEl.focus(), 100);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitMrWhiteGuess(mrWhitePlayer.id, false);
    });
  }

  box.querySelector('#btnMwGiveUp').addEventListener('click', () => submitMrWhiteGuess(mrWhitePlayer.id, true));
  box.querySelector('#btnMwSubmit').addEventListener('click', () => submitMrWhiteGuess(mrWhitePlayer.id, false));

  if (appState.mrWhiteTimerInterval) clearInterval(appState.mrWhiteTimerInterval);
  appState.mrWhiteTimerInterval = setInterval(() => {
    timeLeft--;
    const el = document.getElementById('mwCountdown');
    if (el) {
      el.textContent = `${Math.max(0, timeLeft)}s`;
      el.classList.toggle('danger', timeLeft <= 5);
    }
    if (timeLeft > 0 && timeLeft <= 5) SFX.beep();
    if (timeLeft <= 0) {
      clearInterval(appState.mrWhiteTimerInterval);
      appState.mrWhiteTimerInterval = null;
      SFX.alarm();
      vibrate([100, 60, 100]);
      submitMrWhiteGuess(mrWhitePlayer.id, true);
    }
  }, 1000);
}

function submitMrWhiteGuess(mrWhiteId, gaveUp) {
  if (appState.mrWhiteTimerInterval) {
    clearInterval(appState.mrWhiteTimerInterval);
    appState.mrWhiteTimerInterval = null;
  }

  const inputEl = document.getElementById('mwGuessInput');
  const guessRaw = gaveUp ? '' : (inputEl ? inputEl.value : '');
  const guessNorm = normalizeVN(guessRaw);

  const game = appState.game;
  const wp = game.currentWordPair;
  const accepted = [wp.word_civilian, ...(wp.synonyms || [])].map(normalizeVN).filter(Boolean);
  const isCorrect = !gaveUp && guessNorm.length > 0 && accepted.includes(guessNorm);

  closeDynamicModal();

  if (isCorrect) {
    game.winner = 'MR_WHITE_GUESS';
    game.winningMrWhiteId = mrWhiteId;
    callPhase('FINALIZE_ENDGAME');
  } else {
    SFX.eliminate();
    const box = showDynamicModal(`
      <div style="text-align:center;padding:8px 0;">
        <div style="font-size:48px;margin-bottom:8px;">❌</div>
        <h3 style="margin:0 0 8px;">Đoán chưa chính xác!</h3>
        <p class="muted" style="margin:0 0 16px;">
          ${gaveUp ? 'Hết thời gian hoặc đã bỏ cuộc.' : `Từ "${escapeHtml(guessRaw)}" không khớp với từ của Dân thường.`}
          <br>Mũ Trắng chính thức bị loại!
        </p>
        <button type="button" class="btn btn-primary" id="btnMwWrongContinue">Tiếp tục ván đấu</button>
      </div>
    `, false);
    if (box) {
      box.querySelector('#btnMwWrongContinue').addEventListener('click', () => {
        closeDynamicModal();
        processPostEliminationTriggers();
      });
    }
  }
}

function openAvengerPickModal(avengerPlayer, aliveTargets) {
  const box = showDynamicModal(`
    <div>
      <div style="text-align:center;margin-bottom:14px;">
        <div style="font-size:46px;margin-bottom:4px;">⚔️🔥</div>
        <h3 style="margin:0 0 6px;color:#fecaca;">Kẻ Báo Thù hành động!</h3>
        <p class="muted" style="margin:0;">
          <strong>${escapeHtml(avengerPlayer.name)}</strong> được chọn 1 người chơi còn sống để kéo theo:
        </p>
      </div>
      <div class="player-grid">
        ${aliveTargets.map((t) => `
          <button type="button" class="player-card clickable" data-avenger-target="${t.id}">
            <div class="p-avatar">${t.avatar}</div>
            <div class="p-info">
              <div class="p-name">${escapeHtml(t.name)}</div>
              <div class="p-status" style="color:#fca5a5;">⚔️ Kéo theo</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `, false);

  if (!box) return;
  box.querySelectorAll('[data-avenger-target]').forEach((btn) => {
    btn.addEventListener('click', () => executeAvengerPick(btn.dataset.avengerTarget));
  });
}

function executeAvengerPick(targetId) {
  SFX.eliminate();
  appState.game.eliminationState.queue.push({ playerId: targetId, cause: 'AVENGER' });
  closeDynamicModal();
  persistSession();
  processPostEliminationTriggers();
}

function evaluateWinCondition() {
  const game = appState.game;
  const alive = game.players.filter((p) => p.isAlive);
  const C = alive.filter((p) => p.role === 'CIVILIAN').length;
  const U = alive.filter((p) => p.role === 'UNDERCOVER').length;
  const W = alive.filter((p) => p.role === 'MR_WHITE').length;

  if (U === 0 && W === 0) {
    game.winner = 'CIVILIANS';
    callPhase('FINALIZE_ENDGAME');
  } else if (C <= 1 && (U + W >= 1)) {
    game.winner = 'IMPOSTORS';
    callPhase('FINALIZE_ENDGAME');
  } else {
    game.roundNumber++;
    callPhase('ENTER_DESCRIPTION');
  }
}
