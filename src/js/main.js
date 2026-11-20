/**
 * Application Bootstrap: Phase Registration, Global Header/Modal Events & PWA Service Worker
 */
import { isSoundEnabled, toggleSound, SFX } from './core/audio.js';
import { appState, stopAllTimers } from './core/state.js';
import { registerPhase, goToSetup } from './core/router.js';
import { openModal, closeModal, showDynamicModal, closeDynamicModal } from './ui/feedback.js';
import { handleAddCustomWord } from './ui/customWordsModal.js';

import { renderSetup } from './phases/setup.js';
import { renderDistribute } from './phases/distribute.js';
import { enterDescriptionPhase, renderDescription } from './phases/describe.js';
import { enterVotingPhase, renderVoting } from './phases/voting.js';
import { startEliminationSequence, renderElimination } from './phases/elimination.js';
import { finalizeScoresAndEndGame, renderEndGame, goBackToSetupFromEnd } from './phases/endgame.js';

// Register all game phases into the router
registerPhase('SETUP', renderSetup);
registerPhase('DISTRIBUTE', renderDistribute);
registerPhase('ENTER_DESCRIPTION', enterDescriptionPhase);
registerPhase('DESCRIPTION', renderDescription);
registerPhase('ENTER_VOTING', enterVotingPhase);
registerPhase('VOTING', renderVoting);
registerPhase('START_ELIMINATION', startEliminationSequence);
registerPhase('ELIMINATION', renderElimination);
registerPhase('FINALIZE_ENDGAME', finalizeScoresAndEndGame);
registerPhase('ENDGAME', renderEndGame);

function updateSoundButtonUI() {
  const btn = document.getElementById('btnSound');
  if (!btn) return;
  const enabled = isSoundEnabled();
  btn.textContent = enabled ? '🔊' : '🔇';
  btn.classList.toggle('active-sound', enabled);
}

function bindGlobalEvents() {
  document.getElementById('btnSound')?.addEventListener('click', () => {
    const enabled = toggleSound();
    updateSoundButtonUI();
    if (enabled) SFX.click();
  });

  document.getElementById('btnRules')?.addEventListener('click', () => {
    openModal('rulesModal');
  });

  document.getElementById('btnHome')?.addEventListener('click', () => {
    SFX.click();
    if (appState.game && appState.game.status !== 'ENDGAME') {
      const box = showDynamicModal(`
        <div class="modal-header">
          <h3>🏠 Về màn hình thiết lập?</h3>
          <button type="button" class="icon-btn" data-close-dyn aria-label="Đóng">✕</button>
        </div>
        <p class="muted">Tiến trình ván hiện tại vẫn được tự động lưu. Bạn có thể bấm <strong>Tiếp tục</strong> lại bất cứ lúc nào.</p>
        <div class="btn-row mt-16">
          <button type="button" class="btn btn-secondary" data-close-dyn>Ở lại ván</button>
          <button type="button" class="btn btn-primary" id="btnConfirmGoHome">Về thiết lập</button>
        </div>
      `, true);

      if (box) {
        box.querySelectorAll('[data-close-dyn]').forEach((b) => b.addEventListener('click', closeDynamicModal));
        box.querySelector('#btnConfirmGoHome')?.addEventListener('click', () => {
          closeDynamicModal();
          stopAllTimers();
          appState.game = null;
          goToSetup();
        });
      }
    } else {
      goBackToSetupFromEnd();
    }
  });

  // Static modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Custom words modal add button
  document.getElementById('btnAddCustomWord')?.addEventListener('click', handleAddCustomWord);

  // Backdrop click close for informational modals
  ['rulesModal', 'customWordsModal'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target.id === id) closeModal(id);
    });
  });

  document.getElementById('dynamicModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'dynamicModal' && e.target.dataset.allowClose === '1') {
      closeDynamicModal();
    }
  });

  // Escape key closes dismissible modals
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    ['rulesModal', 'customWordsModal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el?.classList.contains('open')) closeModal(id);
    });
    const dyn = document.getElementById('dynamicModal');
    if (dyn?.classList.contains('open') && dyn.dataset.allowClose === '1') {
      closeDynamicModal();
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Service worker registration is optional in dev environments
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateSoundButtonUI();
  bindGlobalEvents();
  goToSetup();
  registerServiceWorker();
});
