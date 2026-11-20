/**
 * STATE 2 – PASS & PLAY SECRET WORD DISTRIBUTION (PRESS & HOLD + ANTI-PEEK LOCK)
 */
import { AVATAR_LIST } from '../../data/avatars.js';
import { escapeHtml } from '../core/utils.js';
import { SFX, vibrate } from '../core/audio.js';
import { appState, persistSession, persistProfilesFromGame, stopAllTimers } from '../core/state.js';
import { callPhase } from '../core/router.js';
import { showToast } from '../ui/feedback.js';

let backGuardAttached = false;

function ensureBackGuard() {
  if (backGuardAttached) return;
  backGuardAttached = true;

  window.addEventListener('popstate', () => {
    if (appState.game && appState.game.status === 'DISTRIBUTE') {
      // Prevent navigating back to a previous player's keyword screen
      history.pushState({ distributeLock: true }, '', window.location.href);
      SFX.alarm();
      showToast('🔒 Không thể quay lại xem từ khóa của người chơi trước!', 'warn');
    }
  });
}

function lockHistoryForward() {
  ensureBackGuard();
  try {
    history.pushState({ distributeLock: true }, '', window.location.href);
  } catch {
    // Ignore history API restrictions
  }
}

function renderProgressStrip(game, currentIdx) {
  return `
    <div class="dist-progress" aria-label="Tiến độ xem từ khóa">
      ${game.players.map((pl, i) => {
        const isLocked = i < currentIdx || !!pl.wordLocked;
        const isCurrent = i === currentIdx && !pl.wordLocked;
        const stateClass = isLocked ? 'locked' : (isCurrent ? 'current' : 'waiting');
        const statusIcon = isLocked ? '🔒' : (isCurrent ? '👁️' : '⏳');
        const label = isLocked ? 'Đã khóa' : escapeHtml(pl.name);
        return `
          <button type="button"
                  class="dist-pill ${stateClass}"
                  data-dist-pill="${i}"
                  ${isLocked ? 'aria-disabled="true"' : ''}
                  title="${isLocked ? `${escapeHtml(pl.name)} đã xem & khóa từ khóa` : escapeHtml(pl.name)}">
            <span>${statusIcon}</span>
            <span>#${pl.seat} ${label}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function bindProgressStripEvents(view, game, currentIdx) {
  view.querySelectorAll('[data-dist-pill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.distPill);
      const target = game.players[idx];
      if (!target) return;

      if (idx < currentIdx || target.wordLocked) {
        SFX.alarm();
        vibrate(30);
        showToast(`🔒 Từ khóa của ${target.name} đã bị khóa — không thể xem lại!`, 'warn');
      } else if (idx > currentIdx) {
        SFX.click();
        showToast(`⏳ Chưa tới lượt của ${target.name}!`, 'info');
      }
    });
  });
}

export function renderDistribute() {
  stopAllTimers();
  lockHistoryForward();

  const game = appState.game;
  // Always ensure all previous players are permanently locked
  for (let i = 0; i < game.distributeIndex; i++) {
    if (game.players[i]) game.players[i].wordLocked = true;
  }

  const idx = game.distributeIndex;
  const p = game.players[idx];
  const total = game.players.length;
  const view = document.getElementById('appView');

  if (game.subState === 'PRIVACY') {
    appState.cardRevealedForCurrentPlayer = false;
    view.innerHTML = `
      <div class="center-stage">
        ${renderProgressStrip(game, idx)}
        <div class="glass-card" style="padding: 32px 20px;">
          <div class="pill-badge mb-12">Phát từ bí mật • ${idx + 1} / ${total}</div>
          <div class="player-badge-lg">${p.avatar}</div>
          <p class="muted" style="margin:0 0 6px;">Đưa điện thoại cho</p>
          <h2 style="margin:0 0 12px;font-size:26px;font-weight:900;">${escapeHtml(p.name)}</h2>
          <p class="muted" style="margin:0 0 24px;">Đảm bảo không có ai xung quanh đang nhìn vào màn hình của bạn!</p>
          <button type="button" class="btn btn-primary" id="btnOpenCard" style="min-height:54px;font-size:16px;">
            👁️ Tôi là ${escapeHtml(p.name)} — Sẵn sàng
          </button>
        </div>
      </div>
    `;

    bindProgressStripEvents(view, game, idx);
    view.querySelector('#btnOpenCard').addEventListener('click', openPlayerCardScreen);
    return;
  }

  // CARD REVEAL SCREEN
  const showNameEditor = !p.namedByUser;
  const isLocked = !!p.wordLocked;

  view.innerHTML = `
    <div class="center-stage">
      ${renderProgressStrip(game, idx)}
      <div class="glass-card" style="padding: 22px 18px;">
        <div class="round-header">
          <span class="pill-badge">Người chơi #${p.seat} / ${total}</span>
          <span id="viewedBadge" class="pill-badge ${appState.cardRevealedForCurrentPlayer || isLocked ? 'cyan' : ''}">
            ${isLocked ? '🔒 Đã khóa từ' : (appState.cardRevealedForCurrentPlayer ? '✓ Đã xem từ' : '🔒 Chưa xem')}
          </span>
        </div>

        ${showNameEditor ? `
          <div style="text-align:left;margin-bottom:10px;">
            <label class="stepper-sub" style="display:block;margin-bottom:6px;">Nhập tên của bạn & chọn biểu tượng:</label>
            <input id="playerNameInput" class="input-field" type="text" maxlength="16"
                   value="${p.namedByUser ? escapeHtml(p.name) : ''}"
                   placeholder="VD: Minh, Lan... (mặc định: ${escapeHtml(p.name)})" />
            <div class="avatar-picker" id="avatarPicker">
              ${AVATAR_LIST.map((av) => `
                <button type="button" class="avatar-opt ${p.avatar === av ? 'selected' : ''}" data-avatar="${av}">${av}</button>
              `).join('')}
            </div>
          </div>
        ` : `
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin:4px 0 8px;">
            <span style="font-size:32px;">${p.avatar}</span>
            <h2 style="margin:0;font-size:22px;font-weight:800;">${escapeHtml(p.name)}</h2>
          </div>
        `}

        <!-- Press & Hold Secret Card -->
        <div id="holdSecretCard" class="hold-card ${isLocked ? 'locked' : ''}">
          <div id="holdCardContent">
            ${isLocked ? `
              <div style="font-size:44px;margin-bottom:8px;">🔒</div>
              <div style="font-size:17px;font-weight:800;">TỪ KHÓA ĐÃ BỊ KHÓA</div>
              <div class="muted mt-8">Không thể xem lại từ khóa sau khi đã xác nhận</div>
            ` : `
              <div class="hold-icon">👆</div>
              <div style="font-size:17px;font-weight:800;">NHẤN GIỮ ĐỂ XEM TỪ BÍ MẬT</div>
              <div class="muted mt-8">Thả tay ra từ khóa sẽ lập tức ẩn lại</div>
            `}
          </div>
        </div>

        <button type="button" id="btnNextPlayer" class="btn btn-primary">
          ${idx + 1 < total ? '🔒 Đã nhớ — Khóa từ & Chuyển người tiếp theo' : '🚀 Đã nhớ — Khóa từ & Bắt đầu Vòng 1'}
        </button>
      </div>
    </div>
  `;

  bindProgressStripEvents(view, game, idx);

  view.querySelectorAll('[data-avatar]').forEach((btn) => {
    btn.addEventListener('click', () => selectPlayerAvatar(btn.dataset.avatar));
  });

  const holdCard = view.querySelector('#holdSecretCard');
  if (holdCard) {
    holdCard.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  view.querySelector('#btnNextPlayer').addEventListener('click', confirmPlayerMemorized);
  if (!isLocked) {
    bindHoldCardEvents();
  }
}

function openPlayerCardScreen() {
  const game = appState.game;
  const p = game.players[game.distributeIndex];
  if (p && p.wordLocked) {
    SFX.alarm();
    showToast('🔒 Từ khóa của người chơi này đã bị khóa!', 'warn');
    return;
  }
  SFX.click();
  game.subState = 'CARD';
  persistSession();
  renderDistribute();
}

function selectPlayerAvatar(av) {
  SFX.click();
  const p = appState.game.players[appState.game.distributeIndex];
  p.avatar = av;
  const btns = document.querySelectorAll('#avatarPicker .avatar-opt');
  btns.forEach((b) => b.classList.toggle('selected', b.textContent === av));
}

function bindHoldCardEvents() {
  const card = document.getElementById('holdSecretCard');
  const content = document.getElementById('holdCardContent');
  if (!card || !content) return;

  const game = appState.game;
  const p = game.players[game.distributeIndex];

  const reveal = (e) => {
    if (e && e.cancelable) e.preventDefault();
    if (p.wordLocked) {
      SFX.alarm();
      showToast('🔒 Từ khóa đã bị khóa, không thể xem lại!', 'warn');
      return;
    }
    if (card.classList.contains('holding')) return;
    card.classList.add('holding');
    if (p.role === 'MR_WHITE') card.classList.add('mrwhite-reveal');

    if (!appState.cardRevealedForCurrentPlayer) {
      appState.cardRevealedForCurrentPlayer = true;
      const badge = document.getElementById('viewedBadge');
      if (badge) {
        badge.textContent = '✓ Đã xem từ';
        badge.classList.add('cyan');
      }
    }
    SFX.hold();
    vibrate(25);

    let secretHtml = '';
    if (p.role === 'MR_WHITE') {
      secretHtml = `
        <div style="font-size:44px;margin-bottom:6px;">🎩</div>
        <div class="secret-word-text" style="font-size:26px;">Bạn là Mũ Trắng</div>
        <div class="muted" style="color:#e2e8f0;">Bạn không có từ khóa! Hãy lắng nghe và đoán từ của Dân thường.</div>
      `;
    } else {
      secretHtml = `
        <div class="muted" style="color:#a5f3fc;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-size:11px;">TỪ KHÓA CỦA BẠN</div>
        <div class="secret-word-text">${escapeHtml(p.assignedWord)}</div>
      `;
    }

    if (p.specialRoles.includes('LOVER') && p.loverId) {
      const partner = game.players.find((pl) => pl.id === p.loverId);
      if (partner) {
        const partnerLabel = partner.namedByUser
          ? `${partner.name} (Vị trí #${partner.seat})`
          : `Người chơi #${partner.seat}`;
        secretHtml += `<div class="lover-secret-tag">💘 Người tình của bạn: ${escapeHtml(partnerLabel)}</div>`;
      }
    }
    if (p.specialRoles.includes('JUSTICE')) {
      secretHtml += `<div class="justice-secret-tag">⚖️ Bạn là Nữ thần Công lý</div>`;
    }
    if (p.specialRoles.includes('AVENGER')) {
      secretHtml += `<div class="avenger-secret-tag">⚔️ Bạn là Kẻ báo thù</div>`;
    }

    content.innerHTML = secretHtml;
  };

  const hide = (e) => {
    if (e && e.cancelable) e.preventDefault();
    card.classList.remove('holding', 'mrwhite-reveal');
    content.innerHTML = `
      <div class="hold-icon">👆</div>
      <div style="font-size:17px;font-weight:800;">NHẤN GIỮ ĐỂ XEM TỪ BÍ MẬT</div>
      <div class="muted mt-8">Thả tay ra từ khóa sẽ lập tức ẩn lại</div>
    `;
  };

  card.addEventListener('pointerdown', reveal);
  card.addEventListener('pointerup', hide);
  card.addEventListener('pointerleave', hide);
  card.addEventListener('pointercancel', hide);
  card.addEventListener('touchstart', reveal, { passive: false });
  card.addEventListener('touchend', hide, { passive: false });
  card.addEventListener('touchcancel', hide, { passive: false });
}

function confirmPlayerMemorized() {
  const game = appState.game;
  const p = game.players[game.distributeIndex];

  if (!appState.cardRevealedForCurrentPlayer && !p.wordLocked) {
    SFX.alarm();
    showToast('Hãy nhấn giữ vào thẻ để xem từ khóa của bạn trước đã!', 'warn');
    return;
  }

  const nameInput = document.getElementById('playerNameInput');
  if (nameInput) {
    const val = nameInput.value.trim();
    if (val) {
      p.name = val;
      p.namedByUser = true;
    } else {
      p.namedByUser = true;
    }
  }

  // Permanently lock this player's secret word so subsequent players can never view it
  p.wordLocked = true;

  // Immediately clear secret DOM before transitioning (Anti-Peek)
  const content = document.getElementById('holdCardContent');
  if (content) content.innerHTML = '';

  SFX.click();
  persistProfilesFromGame();

  if (game.distributeIndex + 1 < game.players.length) {
    game.distributeIndex++;
    game.subState = 'PRIVACY';
    persistSession();
    renderDistribute();
  } else {
    callPhase('ENTER_DESCRIPTION');
  }
}
