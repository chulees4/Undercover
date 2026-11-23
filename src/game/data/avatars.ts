import type { Role } from '../model';

/**
 * Player avatars and role metadata helpers
 */

export const AVATAR_LIST = [
  '🦊',
  '🐼',
  '🐸',
  '🦁',
  '🐯',
  '🐨',
  '🐰',
  '🦄',
  '🐙',
  '🐧',
  '🦉',
  '🐝',
  '🦖',
  '👽',
  '🤖',
  '👻',
  '🤠',
  '🥷',
  '🧙',
  '🧛',
  '🧜',
  '🦸',
  '🕵️',
  '👑',
];

export function roleLabelVN(role: Role) {
  if (role === 'CIVILIAN') return 'Dân thường';
  if (role === 'UNDERCOVER') return 'Gián điệp';
  if (role === 'MR_WHITE') return 'Mũ Trắng';
  return role;
}

export function roleLabelShort(role: Role) {
  if (role === 'CIVILIAN') return 'Dân thường';
  if (role === 'UNDERCOVER') return 'Gián điệp';
  return 'Mũ Trắng';
}

export function roleEmoji(role: Role) {
  if (role === 'CIVILIAN') return '🙂';
  if (role === 'UNDERCOVER') return '🕵️';
  return '🎩';
}
