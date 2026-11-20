/**
 * STATE 1 – SETUP SCREEN
 */
import { CATEGORIES, BUILT_IN_WORDS } from '../../data/words.js';
import { LS_KEYS, lsGet, lsRemove } from '../core/storage.js';
import { SFX } from '../core/audio.js';
import { appState, getAutoBalance, getMaxImpostors, stopAllTimers } from '../core/state.js';
import { stopConfetti } from '../ui/confetti.js';
import { showDynamicModal, closeDynamicModal, showToast } from '../ui/feedback.js';
import { openCustomWordsModal } from '../ui/customWordsModal.js';
import { startNewGame, resumeSavedGame, discardSavedGame } from '../engine/gameInit.js';

export function renderSetup() {
  stopAllTimers();
  stopConfetti();

  const btnHome = document.getElementById('btnHome');
  if (btnHome) btnHome.classList.add('hidden');

  const savedSession = lsGet(LS_KEYS.SESSION, null);
  const hasResume = savedSession && savedSession.status && savedSession.status !== 'SETUP' && savedSession.status !== 'ENDGAME';

  const cfg = appState.setupConfig;
  const n = cfg.playerCount;
  const maxImp = getMaxImpostors(n);

  // Enforce constraints safely
  if (cfg.undercoverCount + cfg.mrWhiteCount > maxImp) {
    const auto = getAutoBalance(n);
    cfg.undercoverCount = auto.u;
    cfg.mrWhiteCount = auto.w;
  }
  if (cfg.undercoverCount + cfg.mrWhiteCount < 1) {
    cfg.undercoverCount = 1;
  }
  if (n < 4) {
    cfg.roles.lovers = false;
  }

  const civCount = n - cfg.undercoverCount - cfg.mrWhiteCount;
  const impTotal = cfg.undercoverCount + cfg.mrWhiteCount;

  const view = document.getElementById('appView');
  view.innerHTML = `
    ${hasResume ? `
      <div class="resume-banner">
        <div>
          <div style="font-weight:800;font-size:14px;">⚡ Có ván đang chơi dở!</div>
          <div class="muted" style="font-size:12px;">Vòng ${savedSession.roundNumber || 1} • ${savedSession.players ? savedSession.players.length : 0} người chơi</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button type="button" class="btn btn-orange btn-sm" id="btnResumeGame">Tiếp tục</button>
          <button type="button" class="btn btn-secondary btn-sm" id="btnDiscardGame" title="Hủy ván cũ" aria-label="Hủy ván cũ">✕</button>
        </div>
      </div>
    ` : ''}

    <!-- Card 1: Players & Roles -->
    <section class="glass-card">
      <div class="card-title">
        <div class="card-title-left"><span>👥</span><span>Người chơi & Phân bổ vai trò</span></div>
        ${appState.savedProfiles.length > 0 ? `<button type="button" class="btn btn-secondary btn-sm" id="btnResetScores">🔄 Xóa điểm</button>` : ''}
      </div>

      <div class="role-summary-bar">
        <div class="role-pill civ">
          <span class="num" style="color:#67e8f9">${civCount}</span>
          <span class="lbl">Dân thường</span>
        </div>
        <div class="role-pill und">
          <span class="num" style="color:#fdba74">${cfg.undercoverCount}</span>
          <span class="lbl">Gián điệp</span>
        </div>
        <div class="role-pill mrw">
          <span class="num" style="color:#ddd6fe">${cfg.mrWhiteCount}</span>
          <span class="lbl">Mũ Trắng</span>
        </div>
      </div>

      <div class="stepper-row">
        <div class="stepper-info">
          <span class="stepper-label">Tổng người chơi</span>
          <span class="stepper-sub">Từ 3 đến 20 người (tự cân bằng)</span>
        </div>
        <div class="stepper-ctrl">
          <button type="button" class="step-btn" data-player-delta="-1" ${n <= 3 ? 'disabled' : ''}>−</button>
          <span class="step-val">${n}</span>
          <button type="button" class="step-btn" data-player-delta="1" ${n >= 20 ? 'disabled' : ''}>+</button>
        </div>
      </div>

      <div class="stepper-row">
        <div class="stepper-info">
          <span class="stepper-label">🕵️ Gián điệp (Undercover)</span>
          <span class="stepper-sub">Nhận từ khóa gần nghĩa</span>
        </div>
        <div class="stepper-ctrl">
          <button type="button" class="step-btn" data-role-type="u" data-role-delta="-1" ${(cfg.undercoverCount <= 0 || impTotal <= 1) ? 'disabled' : ''}>−</button>
          <span class="step-val">${cfg.undercoverCount}</span>
          <button type="button" class="step-btn" data-role-type="u" data-role-delta="1" ${impTotal >= maxImp ? 'disabled' : ''}>+</button>
        </div>
      </div>

      <div class="stepper-row">
        <div class="stepper-info">
          <span class="stepper-label">🎩 Mũ Trắng (Mr. White)</span>
          <span class="stepper-sub">Không có từ khóa, đoán từ để lật kèo</span>
        </div>
        <div class="stepper-ctrl">
          <button type="button" class="step-btn" data-role-type="w" data-role-delta="-1" ${(cfg.mrWhiteCount <= 0 || impTotal <= 1) ? 'disabled' : ''}>−</button>
          <span class="step-val">${cfg.mrWhiteCount}</span>
          <button type="button" class="step-btn" data-role-type="w" data-role-delta="1" ${impTotal >= maxImp ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </section>

    <!-- Card 2: Special Roles -->
    <section class="glass-card">
      <div class="card-title">
        <div class="card-title-left"><span>✨</span><span>Vai trò mở rộng</span></div>
      </div>

      <div class="toggle-row">
        <div class="stepper-info">
          <span class="stepper-label">⚖️ Nữ thần Công lý</span>
          <span class="stepper-sub">Thuộc Dân thường • Quyết định loại ai khi hòa phiếu kín</span>
        </div>
        <label class="switch">
          <input type="checkbox" data-special-role="justice" ${cfg.roles.justice ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>

      <div class="toggle-row">
        <div class="stepper-info">
          <span class="stepper-label">💘 Cặp đôi Người tình</span>
          <span class="stepper-sub">${n < 4 ? 'Cần ít nhất 4 người chơi để bật' : '2 người ghép cặp • 1 người loại, người kia loại theo'}</span>
        </div>
        <label class="switch">
          <input type="checkbox" data-special-role="lovers" ${cfg.roles.lovers ? 'checked' : ''} ${n < 4 ? 'disabled' : ''} />
          <span class="slider"></span>
        </label>
      </div>

      <div class="toggle-row">
        <div class="stepper-info">
          <span class="stepper-label">⚔️ Kẻ báo thù</span>
          <span class="stepper-sub">Khi bị loại được chọn kéo theo 1 người bất kỳ</span>
        </div>
        <label class="switch">
          <input type="checkbox" data-special-role="avenger" ${cfg.roles.avenger ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </section>

    <!-- Card 3: Word Categories -->
    <section class="glass-card">
      <div class="card-title">
        <div class="card-title-left"><span>📚</span><span>Chủ đề từ khóa</span></div>
        <button type="button" class="btn btn-secondary btn-sm" id="btnManageCustomWords">✍️ Quản lý từ tự tạo</button>
      </div>
      <div class="cat-grid">
        ${CATEGORIES.map((c) => {
          const cnt = c.id === 'custom'
            ? appState.customWords.length
            : BUILT_IN_WORDS.filter((w) => w.category === c.id).length;
          const sel = cfg.categories.includes(c.id);
          return `
            <button type="button" class="cat-chip ${sel ? 'selected' : ''}" data-cat-id="${c.id}">
              <span class="emoji">${c.emoji}</span>
              <span class="meta">
                <span class="name">${c.name}</span>
                <span class="count">${cnt} cặp từ</span>
              </span>
            </button>
          `;
        }).join('')}
      </div>
    </section>

    <!-- Card 4: Timer & Voting Mode -->
    <section class="glass-card">
      <div class="card-title">
        <div class="card-title-left"><span>⚙️</span><span>Tùy chọn ván đấu</span></div>
      </div>

      <div class="mb-12">
        <div class="stepper-sub mb-8">⏱️ Đồng hồ đếm ngược mỗi lượt mô tả</div>
        <div class="seg-group">
          <button type="button" class="seg-btn ${cfg.timerSeconds === 0 ? 'active' : ''}" data-timer-sec="0">Tắt</button>
          <button type="button" class="seg-btn ${cfg.timerSeconds === 30 ? 'active' : ''}" data-timer-sec="30">30 giây</button>
          <button type="button" class="seg-btn ${cfg.timerSeconds === 45 ? 'active' : ''}" data-timer-sec="45">45 giây</button>
        </div>
      </div>

      <div>
        <div class="stepper-sub mb-8">🗳️ Chế độ bỏ phiếu</div>
        <div class="seg-group">
          <button type="button" class="seg-btn ${cfg.votingMode === 'offline' ? 'active' : ''}" data-voting-mode="offline">✋ Ngoài đời</button>
          <button type="button" class="seg-btn ${cfg.votingMode === 'secret' ? 'active' : ''}" data-voting-mode="secret">🔒 Bỏ phiếu kín</button>
        </div>
      </div>
    </section>

    <button type="button" class="btn btn-primary" id="btnStartGame" style="min-height:56px;font-size:17px;">
      🚀 Bắt đầu ván chơi
    </button>
  `;

  bindSetupEvents(view);
}

function bindSetupEvents(view) {
  const btnResume = view.querySelector('#btnResumeGame');
  if (btnResume) btnResume.addEventListener('click', resumeSavedGame);

  const btnDiscard = view.querySelector('#btnDiscardGame');
  if (btnDiscard) btnDiscard.addEventListener('click', discardSavedGame);

  const btnReset = view.querySelector('#btnResetScores');
  if (btnReset) btnReset.addEventListener('click', confirmResetScores);

  view.querySelectorAll('[data-player-delta]').forEach((btn) => {
    btn.addEventListener('click', () => changePlayerCount(Number(btn.dataset.playerDelta)));
  });

  view.querySelectorAll('[data-role-type]').forEach((btn) => {
    btn.addEventListener('click', () => changeRoleCount(btn.dataset.roleType, Number(btn.dataset.roleDelta)));
  });

  view.querySelectorAll('[data-special-role]').forEach((input) => {
    input.addEventListener('change', () => toggleSpecialRole(input.dataset.specialRole, input.checked));
  });

  const btnCustom = view.querySelector('#btnManageCustomWords');
  if (btnCustom) btnCustom.addEventListener('click', openCustomWordsModal);

  view.querySelectorAll('[data-cat-id]').forEach((btn) => {
    btn.addEventListener('click', () => toggleCategory(btn.dataset.catId));
  });

  view.querySelectorAll('[data-timer-sec]').forEach((btn) => {
    btn.addEventListener('click', () => setTimerOption(Number(btn.dataset.timerSec)));
  });

  view.querySelectorAll('[data-voting-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setVotingOption(btn.dataset.votingMode));
  });

  const btnStart = view.querySelector('#btnStartGame');
  if (btnStart) btnStart.addEventListener('click', () => startNewGame(false));
}

function changePlayerCount(delta) {
  SFX.click();
  const cfg = appState.setupConfig;
  const next = Math.max(3, Math.min(20, cfg.playerCount + delta));
  cfg.playerCount = next;
  const auto = getAutoBalance(next);
  cfg.undercoverCount = auto.u;
  cfg.mrWhiteCount = auto.w;
  if (next < 4) cfg.roles.lovers = false;
  renderSetup();
}

function changeRoleCount(type, delta) {
  SFX.click();
  const cfg = appState.setupConfig;
  const maxImp = getMaxImpostors(cfg.playerCount);
  let u = cfg.undercoverCount;
  let w = cfg.mrWhiteCount;
  if (type === 'u') u += delta;
  if (type === 'w') w += delta;
  if (u < 0 || w < 0) return;
  if (u + w < 1 || u + w > maxImp) return;
  cfg.undercoverCount = u;
  cfg.mrWhiteCount = w;
  renderSetup();
}

function toggleSpecialRole(roleKey, checked) {
  SFX.click();
  appState.setupConfig.roles[roleKey] = checked;
  renderSetup();
}

function toggleCategory(catId) {
  SFX.click();
  const cats = appState.setupConfig.categories;
  const idx = cats.indexOf(catId);
  if (idx >= 0) {
    cats.splice(idx, 1);
  } else {
    cats.push(catId);
  }
  renderSetup();
}

function setTimerOption(sec) {
  SFX.click();
  appState.setupConfig.timerSeconds = sec;
  renderSetup();
}

function setVotingOption(mode) {
  SFX.click();
  appState.setupConfig.votingMode = mode;
  renderSetup();
}

function confirmResetScores() {
  SFX.click();
  const box = showDynamicModal(`
    <div class="modal-header">
      <h3>🔄 Xóa danh sách & điểm?</h3>
      <button type="button" class="icon-btn" data-close-dyn aria-label="Đóng">✕</button>
    </div>
    <p class="muted">Thao tác này sẽ đặt lại điểm tích lũy và tên người chơi đã lưu từ các ván trước về mặc định.</p>
    <div class="btn-row mt-16">
      <button type="button" class="btn btn-secondary" data-close-dyn>Hủy</button>
      <button type="button" class="btn btn-danger" id="btnConfirmResetScores">Xác nhận xóa</button>
    </div>
  `, true);

  if (!box) return;
  box.querySelectorAll('[data-close-dyn]').forEach((b) => b.addEventListener('click', closeDynamicModal));
  const confirmBtn = box.querySelector('#btnConfirmResetScores');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      appState.savedProfiles = [];
      lsRemove(LS_KEYS.PROFILES);
      closeDynamicModal();
      showToast('Đã đặt lại điểm số và tên người chơi!');
      renderSetup();
    });
  }
}
