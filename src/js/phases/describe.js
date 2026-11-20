/**
 * STATE 3 – DESCRIPTION PHASE & COUNTDOWN TIMER
 */
import { roleLabelShort } from '../../data/avatars.js';
import { escapeHtml } from '../core/utils.js';
import { SFX, vibrate } from '../core/audio.js';
import { appState, persistSession, stopAllTimers } from '../core/state.js';
import { callPhase } from '../core/router.js';
import { showToast } from '../ui/feedback.js';

export function enterDescriptionPhase() {
  stopAllTimers();
  const game = appState.game;
  game.status = 'DESCRIPTION';

  const alive = game.players.filter((p) => p.isAlive);
  // First Speaker Rule: Round 1 NEVER picks Mr. White
  let eligible = alive;
  if (game.roundNumber === 1) {
    const nonWhite = alive.filter((p) => p.role !== 'MR_WHITE');
    if (nonWhite.length > 0) eligible = nonWhite;
  }
  const first = eligible[Math.floor(Math.random() * eligible.length)];
  game.firstSpeakerId = first.id;

  // Build speaking order cycling around table seats starting from first speaker
  const startSeatIdx = alive.findIndex((p) => p.id === first.id);
  game.speakerOrder = [
    ...alive.slice(startSeatIdx).map((p) => p.id),
    ...alive.slice(0, startSeatIdx).map((p) => p.id)
  ];
  game.activeSpeakerIdx = 0;

  appState.descTimeRemaining = game.config.timerSeconds || 0;
  appState.descTimerRunning = false;

  persistSession();
  renderDescription();
}

export function renderDescription() {
  const game = appState.game;
  const view = document.getElementById('appView');
  const hasTimer = game.config.timerSeconds > 0;
  const activeId = game.speakerOrder[game.activeSpeakerIdx];
  const activePlayer = game.players.find((p) => p.id === activeId);
  const firstPlayer = game.players.find((p) => p.id === game.firstSpeakerId);
  const aliveCount = game.players.filter((p) => p.isAlive).length;

  if (hasTimer && appState.descTimeRemaining <= 0 && !appState.descTimerRunning) {
    appState.descTimeRemaining = game.config.timerSeconds;
  }

  view.innerHTML = `
    <section class="glass-card">
      <div class="round-header">
        <span class="pill-badge orange">🗣️ Vòng ${game.roundNumber} • Mô tả</span>
        <span class="pill-badge cyan">Còn sống: ${aliveCount}/${game.players.length}</span>
      </div>

      <div style="text-align:center;padding:6px 0 12px;">
        <div class="muted">Người bắt đầu vòng này</div>
        <div style="font-size:20px;font-weight:900;margin-top:2px;">
          ${firstPlayer ? `${firstPlayer.avatar} ${escapeHtml(firstPlayer.name)}` : ''}
        </div>
        <div class="muted mt-8" style="font-size:12.5px;">
          Lần lượt mô tả từ khóa bằng 1 từ hoặc cụm từ ngắn (không nhắc thẳng từ khóa).
        </div>
      </div>

      ${hasTimer ? `
        <div class="timer-box">
          <div>
            <div class="muted" style="font-size:11px;">Đang tới lượt:</div>
            <div style="font-weight:800;font-size:15px;color:#fff;">
              ${activePlayer ? `${activePlayer.avatar} ${escapeHtml(activePlayer.name)}` : ''}
            </div>
            <div id="timerDigits" class="timer-digits ${appState.descTimeRemaining <= 5 ? 'danger' : ''}">
              00:${String(appState.descTimeRemaining).padStart(2, '0')}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:130px;">
            <button type="button" id="btnToggleTimer" class="btn btn-primary btn-sm">
              ${appState.descTimerRunning ? '⏸️ Tạm dừng' : '▶️ Bắt đầu'}
            </button>
            <button type="button" id="btnNextSpeaker" class="btn btn-secondary btn-sm">
              ⏭️ Người kế tiếp
            </button>
          </div>
        </div>
      ` : `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.04);padding:10px 12px;border-radius:14px;margin-bottom:12px;">
          <span class="muted" style="font-size:13px;">Đang tới lượt: <strong style="color:#67e8f9">${activePlayer ? escapeHtml(activePlayer.name) : ''}</strong></span>
          <button type="button" id="btnNextSpeaker" class="btn btn-secondary btn-sm">⏭️ Lượt kế</button>
        </div>
      `}

      <div class="player-grid">
        ${game.players.map((p) => {
          const isFirst = p.id === game.firstSpeakerId && p.isAlive;
          const isActive = p.id === activeId && p.isAlive;
          const turnNum = p.isAlive ? (game.speakerOrder.indexOf(p.id) + 1) : null;
          return `
            <div class="player-card ${p.isAlive ? '' : 'dead'} ${isActive ? 'active-speaker' : ''}">
              ${isFirst ? `<span class="first-tag">Nói đầu</span>` : ''}
              <div class="p-avatar">${p.avatar}</div>
              <div class="p-info">
                <div class="p-name">${escapeHtml(p.name)}</div>
                <div class="p-status">
                  ${p.isAlive
                    ? (isActive ? '🎤 Đang mô tả...' : `Lượt #${turnNum}`)
                    : `💀 Đã loại (${roleLabelShort(p.role)})`}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <button type="button" id="btnEnterVoting" class="btn btn-orange" style="min-height:54px;font-size:16px;">
      🗳️ Chuyển sang Thảo luận & Bỏ phiếu
    </button>
  `;

  const btnToggle = view.querySelector('#btnToggleTimer');
  if (btnToggle) btnToggle.addEventListener('click', toggleDescTimer);

  const btnNext = view.querySelector('#btnNextSpeaker');
  if (btnNext) btnNext.addEventListener('click', nextSpeakerTurn);

  const btnVote = view.querySelector('#btnEnterVoting');
  if (btnVote) btnVote.addEventListener('click', () => callPhase('ENTER_VOTING'));
}

function toggleDescTimer() {
  SFX.click();
  const game = appState.game;
  if (appState.descTimerRunning) {
    clearInterval(appState.descTimerInterval);
    appState.descTimerInterval = null;
    appState.descTimerRunning = false;
  } else {
    if (appState.descTimeRemaining <= 0) appState.descTimeRemaining = game.config.timerSeconds;
    appState.descTimerRunning = true;
    appState.descTimerInterval = setInterval(() => {
      appState.descTimeRemaining--;
      const dig = document.getElementById('timerDigits');
      if (dig) {
        dig.textContent = `00:${String(Math.max(0, appState.descTimeRemaining)).padStart(2, '0')}`;
        dig.classList.toggle('danger', appState.descTimeRemaining <= 5);
      }
      if (appState.descTimeRemaining > 0 && appState.descTimeRemaining <= 5) {
        SFX.beep();
      }
      if (appState.descTimeRemaining <= 0) {
        clearInterval(appState.descTimerInterval);
        appState.descTimerInterval = null;
        appState.descTimerRunning = false;
        SFX.alarm();
        vibrate([120, 60, 120]);
        showToast('⏰ Hết giờ mô tả! Hãy chuyển sang người tiếp theo.', 'warn');
        const btn = document.getElementById('btnToggleTimer');
        if (btn) btn.textContent = '▶️ Bắt đầu lại';
      }
    }, 1000);
  }
  const btn = document.getElementById('btnToggleTimer');
  if (btn) btn.textContent = appState.descTimerRunning ? '⏸️ Tạm dừng' : '▶️ Tiếp tục';
}

function nextSpeakerTurn() {
  SFX.click();
  stopAllTimers();
  const game = appState.game;
  game.activeSpeakerIdx = (game.activeSpeakerIdx + 1) % game.speakerOrder.length;
  appState.descTimeRemaining = game.config.timerSeconds || 0;
  appState.descTimerRunning = false;
  persistSession();
  renderDescription();
}
