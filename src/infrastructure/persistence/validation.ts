import { ROLES, SPECIAL_ROLES, validRoleCounts } from '../../game/model';
import type {
  Config,
  Description,
  EliminationTarget,
  Game,
  Player,
  Profile,
  WordPair,
} from '../../game/model';
import { eligibleTargets } from '../../game/reducer';

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const string = (value: unknown): value is string =>
  typeof value === 'string';
const text = (value: unknown): value is string =>
  string(value) && value.trim().length > 0;
const boolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';
export const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export function array<T>(
  value: unknown,
  item: (entry: unknown) => entry is T,
): value is T[] {
  return Array.isArray(value) && value.every(item);
}

function uniqueIds(value: unknown): value is string[] {
  return array(value, text) && new Set(value).size === value.length;
}

export function isConfig(value: unknown): value is Config {
  if (!record(value)) return false;
  const {
    playerCount,
    undercoverCount,
    mrWhiteCount,
    justiceEnabled,
    loversEnabled,
    avengerEnabled,
    categories,
    timerSeconds,
    votingMode,
  } = value;
  return (
    integer(playerCount) &&
    integer(undercoverCount) &&
    integer(mrWhiteCount) &&
    boolean(justiceEnabled) &&
    boolean(loversEnabled) &&
    boolean(avengerEnabled) &&
    uniqueIds(categories) &&
    (timerSeconds === 0 || timerSeconds === 30 || timerSeconds === 45) &&
    (votingMode === 'offline' || votingMode === 'secret') &&
    validRoleCounts({
      playerCount,
      undercoverCount,
      mrWhiteCount,
      justiceEnabled,
      loversEnabled,
      avengerEnabled,
      categories,
      timerSeconds,
      votingMode,
    })
  );
}

export function isWord(value: unknown): value is WordPair {
  return (
    record(value) &&
    text(value.id) &&
    text(value.category) &&
    text(value.word_civilian) &&
    text(value.word_undercover) &&
    array(value.synonyms, string)
  );
}

export function isProfile(value: unknown): value is Profile {
  return (
    record(value) &&
    text(value.name) &&
    text(value.avatar) &&
    boolean(value.namedByUser) &&
    integer(value.totalScore) &&
    integer(value.seat) &&
    value.seat >= 1 &&
    value.seat <= 20
  );
}

const isRole = (value: unknown): value is Player['role'] =>
  ROLES.some((role) => role === value);
const isSpecialRole = (
  value: unknown,
): value is Player['specialRoles'][number] =>
  SPECIAL_ROLES.some((role) => role === value);

function isPlayer(value: unknown): value is Player {
  return (
    record(value) &&
    isProfile(value) &&
    text(value.id) &&
    isRole(value.role) &&
    array(value.specialRoles, isSpecialRole) &&
    (value.loverId === null || text(value.loverId)) &&
    (value.assignedWord === null || text(value.assignedWord)) &&
    boolean(value.wordLocked) &&
    boolean(value.isAlive) &&
    integer(value.lastPointsEarned)
  );
}

export function isEliminationTarget(
  value: unknown,
): value is EliminationTarget {
  return (
    record(value) &&
    text(value.playerId) &&
    (value.cause === 'VOTE' ||
      value.cause === 'LOVER' ||
      value.cause === 'AVENGER')
  );
}

function isDescription(value: unknown, alive: string[]): value is Description {
  return (
    record(value) &&
    value.type === 'description' &&
    uniqueIds(value.order) &&
    value.order.length > 0 &&
    value.order.length === alive.length &&
    value.order.every((id) => alive.includes(id)) &&
    integer(value.index) &&
    value.index < value.order.length
  );
}

function validPhase(phase: unknown, players: Player[], config: Config) {
  if (!record(phase)) return false;
  const alive = players.filter(({ isAlive }) => isAlive).map(({ id }) => id);
  if (phase.type !== 'reveal' && players.some(({ wordLocked }) => !wordLocked))
    return false;
  switch (phase.type) {
    case 'reveal': {
      const { index, step } = phase;
      return (
        integer(index) &&
        index < players.length &&
        (step === 'privacy' || step === 'card') &&
        alive.length === players.length &&
        players.slice(0, index).every(({ wordLocked }) => wordLocked)
      );
    }
    case 'description':
      return isDescription(phase, alive);
    case 'offline-vote':
      return (
        config.votingMode === 'offline' &&
        isDescription(phase.discussion, alive) &&
        (phase.selectedId === null ||
          alive.some((id) => id === phase.selectedId))
      );
    case 'secret-vote': {
      const { candidates, voters, votes, step, runoff, priorCounts } = phase;
      if (
        config.votingMode !== 'secret' ||
        !uniqueIds(candidates) ||
        candidates.length === 0 ||
        !candidates.every((id) => alive.includes(id)) ||
        !uniqueIds(voters) ||
        !voters.every((id) => alive.includes(id)) ||
        !record(votes) ||
        !integer(runoff) ||
        (step !== 'privacy' && step !== 'ballot' && step !== 'tally')
      )
        return false;
      const entries = Object.entries(votes);
      if (
        !entries.every(
          ([voter, target]) =>
            voters.includes(voter) &&
            string(target) &&
            eligibleTargets(
              {
                type: 'secret-vote',
                candidates,
                voters,
                votes: {},
                step,
                runoff,
              },
              voter,
            ).includes(target),
        )
      ) {
        return false;
      }
      if (
        !voters.every(
          (id, index) => Object.hasOwn(votes, id) === index < entries.length,
        )
      )
        return false;
      if ((step === 'tally') !== (entries.length === voters.length))
        return false;
      if (priorCounts === undefined) return voters.length === alive.length;
      if (!record(priorCounts)) return false;
      let priorTotal = 0;
      for (const [target, count] of Object.entries(priorCounts)) {
        if (!candidates.includes(target) || !integer(count)) return false;
        priorTotal += count;
      }
      return priorTotal + voters.length === alive.length;
    }
    case 'elimination': {
      const { target, step, pending } = phase;
      if (
        !isEliminationTarget(target) ||
        !array(pending, isEliminationTarget) ||
        !pending.every(({ playerId }) => alive.includes(playerId)) ||
        new Set(pending.map(({ playerId }) => playerId)).size !== pending.length
      )
        return false;
      const player = players.find(({ id }) => id === target.playerId);
      if (!player || player.isAlive) return false;
      return (
        step === 'card' ||
        step === 'settle' ||
        (step === 'guess' && player.role === 'MR_WHITE') ||
        (step === 'wrong-guess' &&
          player.role === 'MR_WHITE' &&
          string(phase.missedGuess)) ||
        (step === 'lover' &&
          pending.some(({ playerId }) => playerId === player.loverId)) ||
        (step === 'revenge' &&
          player.specialRoles.includes('AVENGER') &&
          alive.some((id) => !pending.some(({ playerId }) => id === playerId)))
      );
    }
    default:
      return false;
  }
}

export function isActiveGame(value: unknown): value is Game {
  if (!record(value)) return false;
  const {
    sessionId,
    config,
    roundNumber,
    pair,
    players,
    phase,
    firstSpeakerId,
  } = value;
  if (
    !text(sessionId) ||
    !isConfig(config) ||
    !integer(roundNumber) ||
    roundNumber < 1 ||
    !isWord(pair) ||
    !array(players, isPlayer) ||
    players.length !== config.playerCount
  )
    return false;
  if (
    !players.every(
      (player, index) =>
        player.seat === index + 1 &&
        player.id === `p_${index + 1}` &&
        player.assignedWord ===
          (player.role === 'CIVILIAN'
            ? pair.word_civilian
            : player.role === 'UNDERCOVER'
              ? pair.word_undercover
              : null) &&
        (player.loverId === null
          ? !player.specialRoles.includes('LOVER')
          : player.loverId !== player.id &&
            player.specialRoles.includes('LOVER') &&
            players.some(
              (partner) =>
                partner.id === player.loverId && partner.loverId === player.id,
            )),
    )
  )
    return false;
  return (
    players.filter(({ role }) => role === 'UNDERCOVER').length ===
      config.undercoverCount &&
    players.filter(({ role }) => role === 'MR_WHITE').length ===
      config.mrWhiteCount &&
    (firstSpeakerId === null ||
      players.some(({ id }) => id === firstSpeakerId)) &&
    validPhase(phase, players, config)
  );
}
