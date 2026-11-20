/**
 * Web Audio API synthesizer (100% offline, zero audio file dependencies) & Haptics
 */
import { LS_KEYS, lsGet, lsSet } from './storage.js';

let soundEnabled = lsGet(LS_KEYS.SOUND, true);
let audioCtx = null;

export function isSoundEnabled() {
  return soundEnabled;
}

export function toggleSound() {
  soundEnabled = !soundEnabled;
  lsSet(LS_KEYS.SOUND, soundEnabled);
  return soundEnabled;
}

function getAudioCtx() {
  if (!soundEnabled) return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(freq, duration, type = 'sine', gainVal = 0.12, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch {
    // Ignore audio context errors on restricted devices
  }
}

export const SFX = {
  click: () => playTone(560, 0.06, 'triangle', 0.08),
  flip: () => {
    playTone(340, 0.08, 'sine', 0.1, 0);
    playTone(540, 0.12, 'sine', 0.1, 0.06);
  },
  hold: () => playTone(440, 0.09, 'sine', 0.09),
  beep: () => playTone(880, 0.11, 'square', 0.08),
  alarm: () => {
    playTone(620, 0.16, 'sawtooth', 0.1, 0);
    playTone(460, 0.25, 'sawtooth', 0.1, 0.18);
  },
  eliminate: () => {
    playTone(280, 0.18, 'sawtooth', 0.11, 0);
    playTone(190, 0.3, 'sawtooth', 0.11, 0.16);
  },
  win: () => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => playTone(n, 0.24, 'triangle', 0.13, idx * 0.11));
  }
};

export function vibrate(pattern) {
  try {
    if (navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported vibration API
  }
}
