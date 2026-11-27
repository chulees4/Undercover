import { t } from '../i18n';
import { AVATAR_LIST } from './data/avatars';
import { BUILT_IN_WORDS } from './data/words';
import type {
  Description,
  Game,
  Player,
  Profile,
  Random,
  Role,
  State,
  Winner,
} from './model';
import { validRoleCounts } from './model';

function pick<T>(items: readonly T[], random: Random): T {
  return items[Math.floor(random() * items.length)];
}

function shuffle<T>(items: T[], random: Random) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

export function wordPool(state: State, config = state.config) {
  return [...BUILT_IN_WORDS, ...state.customWords].filter(({ category }) =>
    config.categories.includes(category),
  );
}

export function prepareRevealAvatar(game: Game, useDefault = false): Game {
  if (game.phase.type !== 'reveal') return game;

  const { index } = game.phase;
  const player = game.players[index];
  const usedAvatars = new Set(
    game.players
      .filter((other) => other.wordLocked)
      .map((other) => other.avatar),
  );
  if ((!useDefault || player.namedByUser) && !usedAvatars.has(player.avatar))
    return game;

  const avatar = AVATAR_LIST.find((option) => !usedAvatars.has(option));
  if (avatar === undefined || avatar === player.avatar) return game;

  const players = [...game.players];
  players[index] = { ...player, avatar };
  return { ...game, players };
}

export function profilesFrom(players: Player[]): Profile[] {
  return players.map(({ name, avatar, namedByUser, seat, totalScore }) => ({
    name,
    avatar,
    namedByUser,
    seat,
    totalScore,
  }));
}

export function newGame(
  state: State,
  sessionId: string,
  random: Random,
  replay: boolean,
): State | null {
  if (replay ? state.game?.phase.type !== 'results' : Boolean(state.game))
    return null;
  const config = replay && state.game ? state.game.config : state.config;
  const pool = wordPool(state, config);
  if (!validRoleCounts(config) || !pool.length) return null;
  const used = new Set(state.usedWordIds);
  const fresh = pool.filter(({ id }) => !used.has(id));
  if (!fresh.length) pool.forEach(({ id }) => used.delete(id));
  const pair = pick(fresh.length ? fresh : pool, random);
  used.add(pair.id);

  const { playerCount, undercoverCount, mrWhiteCount } = config;
  const roles = shuffle(
    Array.from({ length: playerCount }, (_, index): Role =>
      index < playerCount - undercoverCount - mrWhiteCount
        ? 'CIVILIAN'
        : index < playerCount - mrWhiteCount
          ? 'UNDERCOVER'
          : 'MR_WHITE',
    ),
    random,
  );
  const players: Player[] = roles.map((role, index) => {
    const profile = state.profiles[index];
    return {
      id: `p_${index + 1}`,
      seat: index + 1,
      name:
        profile?.name || t('game.players.defaultName', { value1: index + 1 }),
      namedByUser: profile?.namedByUser ?? false,
      avatar: profile?.avatar || AVATAR_LIST[index % AVATAR_LIST.length],
      role,
      specialRoles: [],
      loverId: null,
      assignedWord:
        role === 'CIVILIAN'
          ? pair.word_civilian
          : role === 'UNDERCOVER'
            ? pair.word_undercover
            : null,
      wordLocked: false,
      isAlive: true,
      totalScore: profile?.totalScore ?? 0,
      lastPointsEarned: 0,
    };
  });
  if (config.justiceEnabled) {
    pick(
      players.filter(({ role }) => role === 'CIVILIAN'),
      random,
    ).specialRoles.push('JUSTICE');
  }
  if (config.loversEnabled) {
    const [first, second] = shuffle([...players], random);
    first.specialRoles.push('LOVER');
    second.specialRoles.push('LOVER');
    first.loverId = second.id;
    second.loverId = first.id;
  }
  if (config.avengerEnabled) {
    const eligible = players.filter(
      ({ specialRoles }) => specialRoles.length === 0,
    );
    pick(eligible.length ? eligible : players, random).specialRoles.push(
      'AVENGER',
    );
  }
  return {
    ...state,
    config,
    game: {
      sessionId,
      config,
      roundNumber: 1,
      pair,
      players,
      firstSpeakerId: null,
      phase: { type: 'reveal', index: 0, step: 'privacy' },
    },
    usedWordIds: [...used],
  };
}

export function living(game: Game) {
  return game.players.filter(({ isAlive }) => isAlive);
}

export function discussion(game: Game, random: Random): Game {
  const players = living(game);
  const nonWhite = players.filter(({ role }) => role !== 'MR_WHITE');
  const speaker = pick(
    game.roundNumber === 1 && nonWhite.length ? nonWhite : players,
    random,
  );
  const firstIndex = players.indexOf(speaker);
  const phase: Description = {
    type: 'description',
    index: 0,
    order: [...players.slice(firstIndex), ...players.slice(0, firstIndex)].map(
      ({ id }) => id,
    ),
  };
  return { ...game, firstSpeakerId: speaker.id, phase };
}

export function normalizeGuess(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesGuess(game: Game, guess: string) {
  const normalized = normalizeGuess(guess);
  return (
    Boolean(normalized) &&
    [game.pair.word_civilian, ...game.pair.synonyms].some(
      (word) => normalizeGuess(word) === normalized,
    )
  );
}

export function victory(game: Game): Winner | null {
  const players = living(game);
  const civilians = players.filter(({ role }) => role === 'CIVILIAN').length;
  if (players.every(({ role }) => role === 'CIVILIAN')) return 'CIVILIANS';
  return civilians <= 1 ? 'IMPOSTORS' : null;
}

export function score(
  game: Game,
  winner: Winner,
  winningMrWhiteId: string | null,
): Game {
  const impostors = living(game).filter(({ role }) => role !== 'CIVILIAN');
  const players = game.players.map((player) => {
    let points = 0;
    if (winner === 'CIVILIANS' && player.role === 'CIVILIAN') points = 2;
    if (winner === 'MR_WHITE_GUESS' && player.id === winningMrWhiteId)
      points = 8;
    if (
      winner === 'IMPOSTORS' &&
      player.isAlive &&
      player.role !== 'CIVILIAN'
    ) {
      points = impostors.length === 1 && player.role === 'UNDERCOVER' ? 10 : 6;
    }
    return {
      ...player,
      lastPointsEarned: points,
      totalScore: player.totalScore + points,
    };
  });
  return {
    ...game,
    players,
    phase: { type: 'results', winner, winningMrWhiteId },
  };
}
