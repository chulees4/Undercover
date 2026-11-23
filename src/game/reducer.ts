import { AVATAR_LIST } from './data/avatars';
import type {
  Config,
  EliminationTarget,
  Game,
  Phase,
  Random,
  State,
  WordPair,
} from './model';
import { validRoleCounts } from './model';
import {
  discussion,
  living,
  matchesGuess,
  newGame,
  normalizeGuess,
  profilesFrom,
  score,
  victory,
} from './rules';

export type Action =
  | { type: 'CONFIGURE'; config: Config }
  | { type: 'START' | 'REPLAY'; sessionId: string; random: Random }
  | { type: 'RESET' | 'CLEAR_PROFILES' }
  | { type: 'ADD_WORD'; pair: WordPair }
  | { type: 'DELETE_WORD'; id: string }
  | { type: 'OPEN_CARD' }
  | { type: 'EDIT_PLAYER'; name?: string; avatar?: string }
  | { type: 'LOCK_WORD'; random: Random }
  | { type: 'NEXT_SPEAKER' | 'START_VOTE' | 'BACK_TO_DISCUSSION' }
  | { type: 'SELECT_OFFLINE'; id: string }
  | { type: 'CONFIRM_OFFLINE' | 'OPEN_BALLOT' }
  | { type: 'CAST_VOTE'; voterId: string; targetId: string }
  | { type: 'RESOLVE_VOTES'; targetId?: string }
  | { type: 'REVOTE' }
  | { type: 'SKIP_TIE'; random: Random }
  | { type: 'ADVANCE_ELIMINATION'; random: Random }
  | { type: 'GUESS'; text: string }
  | { type: 'REVENGE'; targetId: string; random: Random };

type SecretVote = Extract<Phase, { type: 'secret-vote' }>;
type Elimination = Extract<Phase, { type: 'elimination' }>;

export function currentVoter(phase: SecretVote) {
  return phase.voters.find((id) => !Object.hasOwn(phase.votes, id));
}

export function eligibleTargets(phase: SecretVote, voterId: string) {
  const otherTargets = phase.candidates.filter((id) => id !== voterId);
  return otherTargets.length ? otherTargets : phase.candidates;
}

export function tally(phase: SecretVote) {
  const votes = Object.values(phase.votes);
  return phase.candidates
    .map((id) => ({
      id,
      count:
        (phase.priorCounts?.[id] ?? 0) +
        votes.filter((target) => id === target).length,
    }))
    .sort((left, right) => right.count - left.count);
}

export function tiedLeaders(phase: SecretVote) {
  const results = tally(phase);
  return results
    .filter(({ count }) => count === results[0]?.count)
    .map(({ id }) => id);
}

export function justicePlayer(game: Game) {
  return living(game).find(({ specialRoles }) =>
    specialRoles.includes('JUSTICE'),
  );
}

function secretVote(game: Game, candidates: string[], runoff = 0): SecretVote {
  return {
    type: 'secret-vote',
    candidates,
    voters: living(game).map(({ id }) => id),
    votes: {},
    step: 'privacy',
    runoff,
  };
}

function withPhase(game: Game, phase: Phase): Game {
  return { ...game, phase };
}

function beginElimination(
  game: Game,
  target: EliminationTarget,
  pending: EliminationTarget[] = [],
): Game {
  const players = game.players.map((player) =>
    player.id === target.playerId ? { ...player, isAlive: false } : player,
  );
  return {
    ...game,
    players,
    phase: { type: 'elimination', target, step: 'card', pending },
  };
}

function nextRound(game: Game, random: Random) {
  return discussion({ ...game, roundNumber: game.roundNumber + 1 }, random);
}

export function revengeTargets(game: Game, phase: Elimination) {
  return living(game).filter(
    ({ id }) => !phase.pending.some(({ playerId }) => playerId === id),
  );
}

function advanceElimination(
  game: Game,
  phase: Elimination,
  random: Random,
): Game {
  const player = game.players.find(({ id }) => id === phase.target.playerId);
  if (!player) return game;
  if (phase.step === 'card' && player.role === 'MR_WHITE')
    return withPhase(game, { ...phase, step: 'guess' });
  if (phase.step === 'card' || phase.step === 'wrong-guess') {
    const partner = living(game).find(({ id }) => id === player.loverId);
    if (
      partner &&
      !phase.pending.some(({ playerId }) => playerId === partner.id)
    ) {
      return withPhase(game, {
        ...phase,
        step: 'lover',
        pending: [...phase.pending, { playerId: partner.id, cause: 'LOVER' }],
      });
    }
  }
  if (
    phase.step !== 'revenge' &&
    phase.step !== 'settle' &&
    player.specialRoles.includes('AVENGER') &&
    revengeTargets(game, phase).length
  ) {
    return withPhase(game, { ...phase, step: 'revenge' });
  }
  const queue = phase.pending.filter(({ playerId }) =>
    living(game).some(({ id }) => id === playerId),
  );
  const [target, ...pending] = queue;
  if (target) return beginElimination(game, target, pending);
  const winner = victory(game);
  return winner ? score(game, winner, null) : nextRound(game, random);
}

function updateGame(game: Game, action: Action): Game | null {
  const phase = game.phase;
  switch (action.type) {
    case 'OPEN_CARD':
      return phase.type === 'reveal' && phase.step === 'privacy'
        ? withPhase(game, { ...phase, step: 'card' })
        : null;
    case 'EDIT_PLAYER': {
      if (phase.type !== 'reveal' || phase.step !== 'card') return null;
      if (action.avatar !== undefined && !AVATAR_LIST.includes(action.avatar))
        return null;
      const players = game.players.map((player, index) =>
        index === phase.index
          ? {
              ...player,
              name: action.name?.trim().slice(0, 16) || player.name,
              namedByUser: action.name !== undefined || player.namedByUser,
              avatar: action.avatar ?? player.avatar,
            }
          : player,
      );
      return { ...game, players };
    }
    case 'LOCK_WORD': {
      if (phase.type !== 'reveal' || phase.step !== 'card') return null;
      const players = game.players.map((player, index) =>
        index === phase.index ? { ...player, wordLocked: true } : player,
      );
      if (phase.index + 1 === players.length)
        return discussion({ ...game, players }, action.random);
      return {
        ...game,
        players,
        phase: { ...phase, index: phase.index + 1, step: 'privacy' },
      };
    }
    case 'NEXT_SPEAKER':
      return phase.type === 'description'
        ? withPhase(game, {
            ...phase,
            index: (phase.index + 1) % phase.order.length,
          })
        : null;
    case 'START_VOTE':
      if (phase.type !== 'description') return null;
      return withPhase(
        game,
        game.config.votingMode === 'secret'
          ? secretVote(
              game,
              living(game).map(({ id }) => id),
            )
          : { type: 'offline-vote', discussion: phase, selectedId: null },
      );
    case 'BACK_TO_DISCUSSION':
      return phase.type === 'offline-vote'
        ? withPhase(game, phase.discussion)
        : null;
    case 'SELECT_OFFLINE':
      return phase.type === 'offline-vote' &&
        living(game).some(({ id }) => id === action.id)
        ? withPhase(game, { ...phase, selectedId: action.id })
        : null;
    case 'CONFIRM_OFFLINE':
      return phase.type === 'offline-vote' && phase.selectedId
        ? beginElimination(game, { playerId: phase.selectedId, cause: 'VOTE' })
        : null;
    case 'OPEN_BALLOT':
      return phase.type === 'secret-vote' && phase.step === 'privacy'
        ? withPhase(game, { ...phase, step: 'ballot' })
        : null;
    case 'CAST_VOTE': {
      if (
        phase.type !== 'secret-vote' ||
        phase.step !== 'ballot' ||
        currentVoter(phase) !== action.voterId ||
        !eligibleTargets(phase, action.voterId).includes(action.targetId)
      )
        return null;
      const votes = { ...phase.votes, [action.voterId]: action.targetId };
      return withPhase(game, {
        ...phase,
        votes,
        step: phase.voters.every((id) => Object.hasOwn(votes, id))
          ? 'tally'
          : 'privacy',
      });
    }
    case 'RESOLVE_VOTES': {
      if (phase.type !== 'secret-vote' || phase.step !== 'tally') return null;
      const leaders = tiedLeaders(phase);
      const target =
        leaders.length === 1 && !action.targetId
          ? leaders[0]
          : justicePlayer(game) &&
              action.targetId &&
              leaders.includes(action.targetId)
            ? action.targetId
            : null;
      return target
        ? beginElimination(game, { playerId: target, cause: 'VOTE' })
        : null;
    }
    case 'REVOTE':
    case 'SKIP_TIE': {
      if (
        phase.type !== 'secret-vote' ||
        phase.step !== 'tally' ||
        justicePlayer(game)
      )
        return null;
      const leaders = tiedLeaders(phase);
      if (leaders.length < 2) return null;
      return action.type === 'REVOTE'
        ? withPhase(game, secretVote(game, leaders, phase.runoff + 1))
        : nextRound(game, action.random);
    }
    case 'ADVANCE_ELIMINATION':
      return phase.type === 'elimination' &&
        (phase.step === 'card' ||
          phase.step === 'lover' ||
          phase.step === 'wrong-guess' ||
          phase.step === 'settle')
        ? advanceElimination(game, phase, action.random)
        : null;
    case 'GUESS':
      if (phase.type !== 'elimination' || phase.step !== 'guess') return null;
      return matchesGuess(game, action.text)
        ? score(game, 'MR_WHITE_GUESS', phase.target.playerId)
        : withPhase(game, {
            ...phase,
            step: 'wrong-guess',
            missedGuess: action.text.trim().slice(0, 160),
          });
    case 'REVENGE':
      if (
        phase.type !== 'elimination' ||
        phase.step !== 'revenge' ||
        !revengeTargets(game, phase).some(({ id }) => id === action.targetId)
      )
        return null;
      return advanceElimination(
        game,
        {
          ...phase,
          pending: [
            ...phase.pending,
            { playerId: action.targetId, cause: 'AVENGER' },
          ],
        },
        action.random,
      );
    default:
      return null;
  }
}

export type Transition =
  { ok: true; state: State } | { ok: false; reason: 'invalid-action' };

export function reduce(state: State, action: Action): Transition {
  const next = transition(state, action);
  return next
    ? { ok: true, state: next }
    : { ok: false, reason: 'invalid-action' };
}

function transition(state: State, action: Action): State | null {
  switch (action.type) {
    case 'CONFIGURE':
      return !state.game && validRoleCounts(action.config)
        ? { ...state, config: action.config }
        : null;
    case 'START':
    case 'REPLAY':
      return newGame(
        state,
        action.sessionId,
        action.random,
        action.type === 'REPLAY',
      );
    case 'RESET':
      return { ...state, game: null };
    case 'CLEAR_PROFILES':
      return state.game ? null : { ...state, profiles: [] };
    case 'ADD_WORD':
      return action.pair.category === 'custom' &&
        action.pair.word_civilian.trim() &&
        action.pair.word_undercover.trim() &&
        normalizeGuess(action.pair.word_civilian) !==
          normalizeGuess(action.pair.word_undercover) &&
        !state.customWords.some(({ id }) => id === action.pair.id)
        ? {
            ...state,
            customWords: [action.pair, ...state.customWords],
            config: state.config.categories.includes('custom')
              ? state.config
              : {
                  ...state.config,
                  categories: [...state.config.categories, 'custom'],
                },
          }
        : null;
    case 'DELETE_WORD':
      return state.customWords.some(({ id }) => id === action.id)
        ? {
            ...state,
            customWords: state.customWords.filter(({ id }) => id !== action.id),
          }
        : null;
    default: {
      const game = state.game && updateGame(state.game, action);
      if (!game) return null;
      const profiles =
        action.type === 'LOCK_WORD' || game.phase.type === 'results'
          ? profilesFrom(game.players)
          : state.profiles;
      return { ...state, game, profiles };
    }
  }
}
