import { t } from '../../i18n';
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
  if (role === 'CIVILIAN') return t('game.roles.civilian');
  if (role === 'UNDERCOVER') return t('game.roles.undercover');
  if (role === 'MR_WHITE') return t('game.roles.mrWhite');
  return role;
}

export function roleLabelShort(role: Role) {
  if (role === 'CIVILIAN') return t('game.roles.civilian');
  if (role === 'UNDERCOVER') return t('game.roles.undercover');
  return t('game.roles.mrWhite');
}

export function roleEmoji(role: Role) {
  if (role === 'CIVILIAN') return '🙂';
  if (role === 'UNDERCOVER') return '🕵️';
  return '🎩';
}
