export const ROLES = ['CIVILIAN', 'UNDERCOVER', 'MR_WHITE'] as const;
export type Role = (typeof ROLES)[number];
export const SPECIAL_ROLES = ['JUSTICE', 'LOVER', 'AVENGER'] as const;
export type SpecialRole = (typeof SPECIAL_ROLES)[number];
export type Random = () => number;

export interface WordPair {
  id: string;
  category: string;
  word_civilian: string;
  word_undercover: string;
  synonyms: string[];
}

export interface Profile {
  name: string;
  avatar: string;
  namedByUser: boolean;
  totalScore: number;
  seat: number;
}

export interface Player extends Profile {
  id: string;
  role: Role;
  specialRoles: SpecialRole[];
  loverId: string | null;
  assignedWord: string | null;
  wordLocked: boolean;
  isAlive: boolean;
  lastPointsEarned: number;
}

export interface Config {
  playerCount: number;
  undercoverCount: number;
  mrWhiteCount: number;
  justiceEnabled: boolean;
  loversEnabled: boolean;
  avengerEnabled: boolean;
  categories: string[];
  timerSeconds: 0 | 30 | 45;
  votingMode: 'offline' | 'secret';
}

export interface Game {
  sessionId: string;
  config: Config;
  roundNumber: number;
  pair: WordPair;
  players: Player[];
  firstSpeakerId: string | null;
  phase: Phase;
}

export type Winner = 'CIVILIANS' | 'IMPOSTORS' | 'MR_WHITE_GUESS';
export type Description = {
  type: 'description';
  order: string[];
  index: number;
};
export type EliminationCause = 'VOTE' | 'LOVER' | 'AVENGER';
export type EliminationTarget = { playerId: string; cause: EliminationCause };

export type Phase =
  | { type: 'reveal'; index: number; step: 'privacy' | 'card' }
  | Description
  | { type: 'offline-vote'; discussion: Description; selectedId: string | null }
  | {
      type: 'secret-vote';
      candidates: string[];
      voters: string[];
      votes: Record<string, string>;
      priorCounts?: Record<string, number>;
      step: 'privacy' | 'ballot' | 'tally';
      runoff: number;
    }
  | {
      type: 'elimination';
      target: EliminationTarget;
      step: 'card' | 'guess' | 'wrong-guess' | 'lover' | 'revenge' | 'settle';
      missedGuess?: string;
      pending: EliminationTarget[];
    }
  | { type: 'results'; winner: Winner; winningMrWhiteId: string | null };

export interface State {
  game: Game | null;
  config: Config;
  profiles: Profile[];
  customWords: WordPair[];
  usedWordIds: string[];
}

export const DEFAULT_CONFIG: Config = {
  playerCount: 5,
  undercoverCount: 1,
  mrWhiteCount: 1,
  justiceEnabled: false,
  loversEnabled: false,
  avengerEnabled: false,
  categories: ['common', 'food', 'travel', 'entertainment', 'tech_life'],
  timerSeconds: 30,
  votingMode: 'offline',
};

export function defaultRoleCounts(playerCount: number) {
  if (playerCount <= 4) return [1, 0] as const;
  if (playerCount <= 6) return [1, 1] as const;
  if (playerCount <= 9) return [2, 1] as const;
  if (playerCount <= 12) return [3, 1] as const;
  if (playerCount <= 14) return [3, 2] as const;
  if (playerCount <= 18) return [4, 2] as const;
  return [5, 2] as const;
}

export function impostorLimit(playerCount: number) {
  return Math.floor((playerCount - 1) / 2);
}

export function configurePlayerCount(
  config: Config,
  playerCount: number,
): Config {
  const [undercoverCount, mrWhiteCount] = defaultRoleCounts(playerCount);
  return {
    ...config,
    playerCount,
    undercoverCount,
    mrWhiteCount,
    loversEnabled: playerCount >= 4 && config.loversEnabled,
  };
}

export function validRoleCounts(config: Config) {
  const { playerCount, undercoverCount, mrWhiteCount } = config;
  const impostors = undercoverCount + mrWhiteCount;
  return (
    Number.isInteger(playerCount) &&
    playerCount >= 3 &&
    playerCount <= 20 &&
    Number.isInteger(undercoverCount) &&
    Number.isInteger(mrWhiteCount) &&
    undercoverCount >= 0 &&
    mrWhiteCount >= 0 &&
    impostors >= 1 &&
    impostors <= impostorLimit(playerCount) &&
    (playerCount >= 4 || !config.loversEnabled)
  );
}
