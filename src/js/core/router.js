/**
 * Lightweight phase router to decouple game phases and prevent circular dependencies
 */
import { appState } from './state.js';

const handlers = {};

export function registerPhase(name, fn) {
  handlers[name] = fn;
}

export function callPhase(name, ...args) {
  const fn = handlers[name];
  if (typeof fn === 'function') {
    return fn(...args);
  }
  console.warn(`[Router] Unregistered phase handler: ${name}`);
  return undefined;
}

export function goToSetup() {
  callPhase('SETUP');
}

export function renderCurrentGameState() {
  if (!appState.game) {
    goToSetup();
    return;
  }

  const btnHome = document.getElementById('btnHome');
  if (btnHome) {
    btnHome.classList.toggle('hidden', appState.game.status === 'SETUP');
  }

  switch (appState.game.status) {
    case 'DISTRIBUTE':
      callPhase('DISTRIBUTE');
      break;
    case 'DESCRIPTION':
      callPhase('DESCRIPTION');
      break;
    case 'VOTING':
      callPhase('VOTING');
      break;
    case 'ELIMINATION':
      callPhase('ELIMINATION');
      break;
    case 'ENDGAME':
      callPhase('ENDGAME');
      break;
    default:
      goToSetup();
  }
}
