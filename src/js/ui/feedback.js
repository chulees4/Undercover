/**
 * Toast notifications and Static/Dynamic Modals (no native alert/confirm)
 */
import { SFX } from '../core/audio.js';

export function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s';
    setTimeout(() => el.remove(), 260);
  }, 2800);
}

export function openModal(id) {
  SFX.click();
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

export function closeModal(id) {
  SFX.click();
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

export function showDynamicModal(html, allowBackdropClose = false) {
  const backdrop = document.getElementById('dynamicModal');
  const box = document.getElementById('dynamicModalBox');
  if (!backdrop || !box) return null;
  box.innerHTML = html;
  backdrop.dataset.allowClose = allowBackdropClose ? '1' : '0';
  backdrop.classList.add('open');
  return box;
}

export function closeDynamicModal() {
  const backdrop = document.getElementById('dynamicModal');
  if (backdrop) backdrop.classList.remove('open');
}
