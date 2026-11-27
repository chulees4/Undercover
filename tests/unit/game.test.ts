import { describe, expect, it } from 'vitest';
import { t } from '../../src/i18n';
import { AVATAR_LIST } from '../../src/game/data/avatars';
import {
  DEFAULT_CONFIG,
  defaultRoleCounts,
  type Config,
  type Game,
  type State,
} from '../../src/game/model';
import {
  currentVoter,
  eligibleTargets,
  reduce,
  tally,
  type Action,
} from '../../src/game/reducer';
import { matchesGuess, score, victory } from '../../src/game/rules';

function seeded(seed = 19) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function apply(state: State, action: Action) {
  const transition = reduce(state, action);
  if (!transition.ok) throw new Error(`Unexpectedly rejected ${action.type}`);
  return transition.state;
}

function start(config: Partial<Config> = {}, fields: Partial<State> = {}) {
  return apply(
    {
      game: null,
      profiles: [],
      customWords: [],
      usedWordIds: [],
      ...fields,
      config: { ...DEFAULT_CONFIG, ...config },
    },
    { type: 'START', sessionId: 'sess_test', random: seeded() },
  );
}

function gameOf(state: State): Game {
  if (!state.game) throw new Error('Expected a game');
  return state.game;
}

function revealAll(state: State) {
  for (const player of gameOf(state).players) {
    state = apply(state, { type: 'OPEN_CARD' });
    state = apply(state, { type: 'EDIT_PLAYER', name: player.name });
    state = apply(state, { type: 'LOCK_WORD', random: seeded() });
  }
  return state;
}

function eliminate(state: State, id: string) {
  state = apply(state, { type: 'START_VOTE' });
  state = apply(state, { type: 'SELECT_OFFLINE', id });
  return apply(state, { type: 'CONFIRM_OFFLINE' });
}

describe('game setup and reveal', () => {
  it.each(Array.from({ length: 18 }, (_, index) => index + 3))(
    'assigns valid roles and words to %i players',
    (playerCount) => {
      const [undercoverCount, mrWhiteCount] = defaultRoleCounts(playerCount);
      const game = gameOf(
        start({
          playerCount,
          undercoverCount,
          mrWhiteCount,
          justiceEnabled: true,
          loversEnabled: playerCount >= 4,
          avengerEnabled: true,
        }),
      );
      expect(game.players).toHaveLength(playerCount);
      expect(
        game.players.filter(({ role }) => role === 'UNDERCOVER'),
      ).toHaveLength(undercoverCount);
      expect(
        game.players.filter(({ role }) => role === 'MR_WHITE'),
      ).toHaveLength(mrWhiteCount);
      const justice = game.players.filter(({ specialRoles }) =>
        specialRoles.includes('JUSTICE'),
      );
      const lovers = game.players.filter(({ specialRoles }) =>
        specialRoles.includes('LOVER'),
      );
      expect(justice.map(({ role }) => role)).toEqual(['CIVILIAN']);
      expect(lovers).toHaveLength(playerCount >= 4 ? 2 : 0);
      if (lovers.length)
        expect(lovers.map(({ loverId }) => loverId)).toEqual([
          lovers[1].id,
          lovers[0].id,
        ]);
      expect(
        game.players.filter(({ specialRoles }) =>
          specialRoles.includes('AVENGER'),
        ),
      ).toHaveLength(1);
      for (const player of game.players) {
        expect(player.assignedWord).toBe(
          player.role === 'CIVILIAN'
            ? game.pair.word_civilian
            : player.role === 'UNDERCOVER'
              ? game.pair.word_undercover
              : null,
        );
      }
    },
  );

  it('rejects invalid phases and advances without mutating an earlier reveal state', () => {
    const state = start();
    expect(reduce(state, { type: 'LOCK_WORD', random: seeded() }).ok).toBe(
      false,
    );
    expect(reduce(state, { type: 'START_VOTE' }).ok).toBe(false);
    const opened = apply(state, { type: 'OPEN_CARD' });
    const next = apply(opened, { type: 'LOCK_WORD', random: seeded() });
    expect(gameOf(state).phase).toEqual({
      type: 'reveal',
      step: 'privacy',
      index: 0,
    });
    expect(gameOf(opened).players[0].wordLocked).toBe(false);
    expect(gameOf(next).phase).toEqual({
      type: 'reveal',
      step: 'privacy',
      index: 1,
    });
    expect(gameOf(next).players[0].wordLocked).toBe(true);
    const discussion = gameOf(revealAll(start()));
    expect(
      discussion.players.find(({ id }) => id === discussion.firstSpeakerId)
        ?.role,
    ).not.toBe('MR_WHITE');
  });

  it('reserves locked avatars and assigns the first available avatar to the next new player', () => {
    const [first, second, third] = AVATAR_LIST;
    let state = apply(start(), { type: 'OPEN_CARD' });
    state = apply(state, { type: 'EDIT_PLAYER', avatar: second });
    state = apply(state, { type: 'LOCK_WORD', random: seeded() });

    expect(gameOf(state).players[1].avatar).toBe(first);
    state = apply(state, { type: 'OPEN_CARD' });
    expect(reduce(state, { type: 'EDIT_PLAYER', avatar: second }).ok).toBe(
      false,
    );

    state = apply(state, { type: 'LOCK_WORD', random: seeded() });
    expect(gameOf(state).players[2].avatar).toBe(third);
  });

  it('chooses an unused word and recycles only the exhausted category', () => {
    const pair = {
      id: 'cw_unique',
      category: 'custom',
      word_civilian: 'Táo',
      word_undercover: 'Lê',
      synonyms: [],
    };
    const fresh = start(
      { categories: ['custom'] },
      {
        customWords: [pair],
        usedWordIds: ['c01', pair.id],
      },
    );
    expect(gameOf(fresh).pair).toBe(pair);
    expect(fresh.usedWordIds).toEqual(['c01', pair.id]);
    const other = { ...pair, id: 'cw_unused' };
    const unused = start(
      { categories: ['custom'] },
      { customWords: [pair, other], usedWordIds: [pair.id] },
    );
    expect(gameOf(unused).pair).toBe(other);
  });
});

it('uses the Vietnamese locale for generated player names', () => {
  const game = gameOf(start());
  expect(game.players.map((player) => player.name)).toEqual(
    game.players.map((_, index) =>
      t('game.players.defaultName', { value1: index + 1 }),
    ),
  );
});

describe('voting', () => {
  function tie(justiceEnabled: boolean) {
    let state = apply(
      revealAll(
        start({
          playerCount: 3,
          mrWhiteCount: 0,
          votingMode: 'secret',
          justiceEnabled,
        }),
      ),
      { type: 'START_VOTE' },
    );
    for (const [voterId, targetId] of [
      ['p_1', 'p_2'],
      ['p_2', 'p_3'],
      ['p_3', 'p_1'],
    ]) {
      state = apply(state, { type: 'OPEN_BALLOT' });
      expect(
        reduce(state, { type: 'CAST_VOTE', voterId, targetId: voterId }).ok,
      ).toBe(false);
      expect(
        reduce(state, { type: 'CAST_VOTE', voterId, targetId: 'not_a_player' })
          .ok,
      ).toBe(false);
      state = apply(state, { type: 'CAST_VOTE', voterId, targetId });
      expect(reduce(state, { type: 'CAST_VOTE', voterId, targetId }).ok).toBe(
        false,
      );
    }
    return state;
  }

  it('seals each ballot and offers a runoff or skip when no Justice is alive', () => {
    const state = tie(false);
    const phase = gameOf(state).phase;
    if (phase.type !== 'secret-vote') throw new Error('Expected secret voting');
    expect(currentVoter(phase)).toBeUndefined();
    expect(tally(phase).map(({ count }) => count)).toEqual([1, 1, 1]);
    expect(reduce(state, { type: 'RESOLVE_VOTES' }).ok).toBe(false);
    const runoff = apply(state, { type: 'REVOTE' });
    expect(gameOf(runoff).phase).toMatchObject({
      step: 'privacy',
      runoff: 1,
      votes: {},
    });
    expect(
      gameOf(apply(state, { type: 'SKIP_TIE', random: seeded() })).roundNumber,
    ).toBe(2);
    expect(eligibleTargets({ ...phase, candidates: ['p_1'] }, 'p_1')).toEqual([
      'p_1',
    ]);
  });

  it('lets living Justice select a tied leader, rejects invalid picks and resolves unique leaders', () => {
    const state = tie(true);
    expect(reduce(state, { type: 'REVOTE' }).ok).toBe(false);
    expect(reduce(state, { type: 'RESOLVE_VOTES', targetId: 'p_4' }).ok).toBe(
      false,
    );
    expect(
      gameOf(apply(state, { type: 'RESOLVE_VOTES', targetId: 'p_2' }))
        .players[1].isAlive,
    ).toBe(false);
    const game = gameOf(state);
    if (game.phase.type !== 'secret-vote')
      throw new Error('Expected secret voting');
    const majority = {
      ...state,
      game: {
        ...game,
        phase: { ...game.phase, votes: { ...game.phase.votes, p_3: 'p_2' } },
      },
    };
    const eliminated = apply(majority, { type: 'RESOLVE_VOTES' });
    expect(gameOf(eliminated).phase).toMatchObject({
      target: { playerId: 'p_2' },
    });
  });

  it('keeps the speaker when returning from a public vote and rejects dead targets', () => {
    let state = revealAll(start({ mrWhiteCount: 0 }));
    const phase = gameOf(state).phase;
    state = apply(state, { type: 'START_VOTE' });
    expect(gameOf(apply(state, { type: 'BACK_TO_DISCUSSION' })).phase).toEqual(
      phase,
    );
    const player = gameOf(state).players.find(
      ({ role }) => role === 'CIVILIAN',
    );
    if (!player) throw new Error('Expected a civilian');
    state = apply(state, { type: 'SELECT_OFFLINE', id: player.id });
    state = apply(state, { type: 'CONFIRM_OFFLINE' });
    state = apply(state, { type: 'ADVANCE_ELIMINATION', random: seeded() });
    state = apply(state, { type: 'START_VOTE' });
    expect(reduce(state, { type: 'SELECT_OFFLINE', id: player.id }).ok).toBe(
      false,
    );
  });
});

describe('eliminations and scoring', () => {
  it('handles an accent-insensitive White guess before other role effects', () => {
    const pair = {
      id: 'cw_guess',
      category: 'custom',
      word_civilian: 'Bánh mì',
      word_undercover: 'Bánh bao',
      synonyms: ['Ổ bánh'],
    };
    let state = revealAll(
      start({ categories: ['custom'] }, { customWords: [pair] }),
    );
    const white = gameOf(state).players.find(({ role }) => role === 'MR_WHITE');
    if (!white) throw new Error('Expected White');
    state = eliminate(state, white.id);
    state = apply(state, { type: 'ADVANCE_ELIMINATION', random: seeded() });
    expect(matchesGuess(gameOf(state), '  O, BANH ')).toBe(true);
    const wrong = apply(state, { type: 'GUESS', text: 'Bánh bao' });
    expect(gameOf(wrong).phase).toMatchObject({ step: 'wrong-guess' });
    const winner = apply(state, { type: 'GUESS', text: '  O, BANH ' });
    expect(gameOf(winner).phase).toMatchObject({
      winner: 'MR_WHITE_GUESS',
      winningMrWhiteId: white.id,
    });
    expect(
      gameOf(winner).players.map(
        ({ id, lastPointsEarned }) =>
          lastPointsEarned === (id === white.id ? 8 : 0),
      ),
    ).not.toContain(false);
    expect(reduce(winner, { type: 'GUESS', text: 'Ổ bánh' }).ok).toBe(false);
  });

  it('resolves the lovers and an Avenger before checking victory', () => {
    let state = revealAll(
      start({ loversEnabled: true, avengerEnabled: true, mrWhiteCount: 0 }),
    );
    const avenger = gameOf(state).players.find(({ specialRoles }) =>
      specialRoles.includes('AVENGER'),
    );
    const lover = gameOf(state).players.find(({ loverId }) => loverId);
    if (!avenger || !lover) throw new Error('Expected expanded roles');
    state = eliminate(state, avenger.id);
    state = apply(state, { type: 'ADVANCE_ELIMINATION', random: seeded() });
    expect(gameOf(state).phase).toMatchObject({ step: 'revenge' });
    expect(
      reduce(state, { type: 'REVENGE', targetId: avenger.id, random: seeded() })
        .ok,
    ).toBe(false);
    state = apply(state, {
      type: 'REVENGE',
      targetId: lover.id,
      random: seeded(),
    });
    expect(gameOf(state).phase).toMatchObject({
      target: { playerId: lover.id, cause: 'AVENGER' },
    });
    state = apply(state, { type: 'ADVANCE_ELIMINATION', random: seeded() });
    expect(gameOf(state).phase).toMatchObject({ step: 'lover' });
    state = apply(state, { type: 'ADVANCE_ELIMINATION', random: seeded() });
    expect(gameOf(state).phase).toMatchObject({
      target: { playerId: lover.loverId, cause: 'LOVER' },
    });
    expect(
      gameOf(state).players.filter(({ isAlive }) => !isAlive),
    ).toHaveLength(3);
  });

  it('scores civilians including the dead, lone Undercover, and surviving impostors', () => {
    const base = gameOf(start());
    const make = (
      alive: (role: Game['players'][number]['role']) => boolean,
    ) => ({
      ...base,
      players: base.players.map((player) => ({
        ...player,
        isAlive: alive(player.role),
      })),
    });
    const allCiv = make((role) => role === 'CIVILIAN');
    allCiv.players[
      allCiv.players.findIndex(({ role }) => role === 'CIVILIAN')
    ].isAlive = false;
    expect(victory(allCiv)).toBe('CIVILIANS');
    expect(
      score(allCiv, 'CIVILIANS', null).players.filter(
        ({ totalScore }) => totalScore === 2,
      ),
    ).toHaveLength(3);
    const lone = make((role) => role === 'UNDERCOVER');
    expect(victory(lone)).toBe('IMPOSTORS');
    expect(
      score(lone, 'IMPOSTORS', null).players.filter(
        ({ totalScore }) => totalScore === 10,
      ),
    ).toHaveLength(1);
    const both = make((role) => role !== 'CIVILIAN');
    expect(
      score(both, 'IMPOSTORS', null).players.filter(
        ({ totalScore }) => totalScore === 6,
      ),
    ).toHaveLength(2);
    expect(victory(base)).toBeNull();
  });

  it('keeps scored profiles on replay and reset', () => {
    const state = revealAll(start({ playerCount: 3, mrWhiteCount: 0 }));
    const undercover = gameOf(state).players.find(
      ({ role }) => role === 'UNDERCOVER',
    );
    if (!undercover) throw new Error('Expected an Undercover');
    const won = apply(eliminate(state, undercover.id), {
      type: 'ADVANCE_ELIMINATION',
      random: seeded(),
    });
    expect(gameOf(won).phase).toMatchObject({ winner: 'CIVILIANS' });
    const replay = apply(won, {
      type: 'REPLAY',
      sessionId: 'sess_next',
      random: seeded(),
    });
    expect(gameOf(replay).players.map(({ totalScore }) => totalScore)).toEqual(
      won.profiles.map(({ totalScore }) => totalScore),
    );
    expect(apply(replay, { type: 'RESET' })).toMatchObject({
      game: null,
      profiles: won.profiles,
    });
  });
});
