/**
 * Custom Word Pack Manager Modal UI
 */
import { escapeHtml, normalizeVN } from '../core/utils.js';
import { SFX } from '../core/audio.js';
import { appState } from '../core/state.js';
import { addCustomWord, removeCustomWord } from '../core/wordManager.js';
import { goToSetup } from '../core/router.js';
import { openModal, showToast } from './feedback.js';

export function openCustomWordsModal() {
  renderCustomWordsList();
  openModal('customWordsModal');
}

export function renderCustomWordsList() {
  const countEl = document.getElementById('cwCountModal');
  const container = document.getElementById('cwListContainer');
  if (!countEl || !container) return;

  countEl.textContent = appState.customWords.length;

  if (appState.customWords.length === 0) {
    container.innerHTML = `<div class="muted" style="text-align:center;padding:18px 0;">Chưa có cặp từ tự tạo nào. Hãy thêm cặp từ đầu tiên ở trên!</div>`;
    return;
  }

  container.innerHTML = appState.customWords.map((w) => `
    <div class="custom-word-item">
      <div style="min-width:0;flex:1;">
        <div style="font-size:14px;font-weight:700;">
          <span style="color:#67e8f9">${escapeHtml(w.word_civilian)}</span>
          <span style="color:var(--text-dim)"> / </span>
          <span style="color:#fdba74">${escapeHtml(w.word_undercover)}</span>
        </div>
        ${w.synonyms && w.synonyms.length ? `<div class="muted" style="font-size:11px;">Đồng nghĩa: ${escapeHtml(w.synonyms.join(', '))}</div>` : ''}
      </div>
      <button type="button" class="icon-btn" style="width:34px;height:34px;font-size:14px;color:#fca5a5;" data-delete-cw="${w.id}" title="Xóa" aria-label="Xóa cặp từ">🗑️</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-delete-cw]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handleDeleteCustomWord(btn.dataset.deleteCw);
    });
  });
}

export function handleAddCustomWord() {
  const civEl = document.getElementById('cwCiv');
  const undEl = document.getElementById('cwUnd');
  const synEl = document.getElementById('cwSyn');
  if (!civEl || !undEl || !synEl) return;

  const civ = civEl.value.trim();
  const und = undEl.value.trim();
  const syns = synEl.value.split(',').map((s) => s.trim()).filter(Boolean);

  if (!civ || !und) {
    SFX.alarm();
    showToast('Vui lòng nhập đầy đủ cả Từ Dân thường và Từ Gián điệp!', 'error');
    return;
  }
  if (normalizeVN(civ) === normalizeVN(und)) {
    SFX.alarm();
    showToast('Hai từ khóa không được trùng nhau!', 'error');
    return;
  }

  addCustomWord(civ, und, syns);

  civEl.value = '';
  undEl.value = '';
  synEl.value = '';
  SFX.flip();
  showToast('✅ Đã thêm cặp từ tự tạo!');
  renderCustomWordsList();
  if (!appState.game || appState.game.status === 'SETUP') goToSetup();
}

function handleDeleteCustomWord(id) {
  SFX.click();
  removeCustomWord(id);
  renderCustomWordsList();
  if (!appState.game || appState.game.status === 'SETUP') goToSetup();
}
