import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type Config, type Game } from '../../src/game/model';
import { currentVoter, tally } from '../../src/game/reducer';
import { newGame } from '../../src/game/rules';
import { createRepository } from '../../src/infrastructure/persistence/repository';

const sessionKey = 'undercover_vn_session_v2';

function storageFixture() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const repository = createRepository(storage);
  return { data, repository };
}

function gameFixture(config: Config = DEFAULT_CONFIG) {
  const game = newGame(
    { game: null, config, profiles: [], customWords: [], usedWordIds: [] },
    'sess_test',
    () => 0,
    false,
  )?.game;
  if (!game) throw new Error('Expected a game');
  return game;
}

function legacySession(game: Game) {
  const { justiceEnabled, loversEnabled, avengerEnabled, ...config } =
    game.config;
  return {
    sessionId: game.sessionId,
    status: 'DISTRIBUTE',
    subState: 'CARD',
    config: {
      ...config,
      roles: {
        justice: justiceEnabled,
        lovers: loversEnabled,
        avenger: avengerEnabled,
      },
    },
    roundNumber: game.roundNumber,
    currentWordPair: game.pair,
    players: game.players,
    firstSpeakerId: game.firstSpeakerId,
    distributeIndex: 0,
    speakerOrder: [],
    activeSpeakerIdx: 0,
    eliminationState: null,
    secretVote: null,
    winner: null,
    winningMrWhiteId: null,
  };
}

describe('local storage repository', () => {
  it('restores the current checkpoint and persists only session data', () => {
    const { repository, data } = storageFixture();
    const game = {
      ...gameFixture(),
      phase: { type: 'reveal', step: 'card', index: 0 },
    } satisfies Game;
    repository.saveSession(game);
    expect(repository.load().state.game).toEqual(game);
    expect(data.get(sessionKey)).not.toContain('wordSeen');
  });

  it('migrates separate legacy records and prevents a discarded session from reappearing', () => {
    const { data, repository } = storageFixture();
    const game = gameFixture();
    const legacy = legacySession(game);
    data.delete(sessionKey);
    data.set('undercover_vn_session_v1', JSON.stringify(legacy));
    data.set(
      'undercover_vn_profiles_v1',
      JSON.stringify([
        {
          seat: 1,
          name: 'Lan',
          avatar: '🐱',
          totalScore: 8,
          namedByUser: true,
        },
      ]),
    );
    data.set(
      'undercover_vn_custom_words_v1',
      JSON.stringify([
        {
          id: 'cw_old',
          category: 'custom',
          word_civilian: 'Táo',
          word_undercover: 'Lê',
          synonyms: [],
        },
      ]),
    );
    data.set('undercover_vn_used_words_v1', JSON.stringify(['c01']));
    data.delete('undercover_vn_used_words_v2');
    data.set('undercover_vn_sound_v1', 'false');
    const loaded = repository.load();
    expect(loaded.state.game?.phase).toEqual({
      type: 'reveal',
      step: 'card',
      index: 0,
    });
    expect(loaded.state.profiles[0].totalScore).toBe(8);
    expect(loaded.state.customWords[0].id).toBe('cw_old');
    expect(loaded.state.usedWordIds).toEqual(['c01']);
    expect(loaded.preferences.sound).toBe(false);
    repository.saveSession(null);
    expect(repository.load().state.game).toBeNull();
    expect(data.get('undercover_vn_session_v1')).toBe(JSON.stringify(legacy));
  });

  it('continues a legacy secret ballot or its final tally using aggregate counts', () => {
    const { data, repository } = storageFixture();
    const game = gameFixture({ ...DEFAULT_CONFIG, votingMode: 'secret' });
    const voterIds = game.players.map(({ id }) => id);
    const legacy = {
      ...legacySession(game),
      status: 'VOTING',
      players: game.players.map((player) => ({
        ...player,
        wordLocked: true,
      })),
    };
    data.delete(sessionKey);
    const secretVote = {
      stage: 'PICK',
      voterIds,
      currentVoterIdx: 2,
      allowedTargetIds: voterIds,
      votes: { p_3: 2 },
      isRevote: false,
    };
    data.set(
      'undercover_vn_session_v1',
      JSON.stringify({ ...legacy, secretVote }),
    );
    const partial = repository.load().state.game?.phase;
    if (partial?.type !== 'secret-vote')
      throw new Error('Expected secret voting');
    expect(partial.step).toBe('privacy');
    expect(currentVoter(partial)).toBe('p_3');
    expect(tally(partial)[0]).toEqual({ id: 'p_3', count: 2 });
    data.set(
      'undercover_vn_session_v1',
      JSON.stringify({
        ...legacy,
        secretVote: {
          ...secretVote,
          stage: 'TALLY',
          currentVoterIdx: 4,
          votes: { p_3: 4, p_1: 1 },
        },
      }),
    );
    const complete = repository.load().state.game?.phase;
    if (complete?.type !== 'secret-vote')
      throw new Error('Expected completed voting');
    expect(complete.step).toBe('tally');
    expect(currentVoter(complete)).toBeUndefined();
    expect(tally(complete)[0]).toEqual({ id: 'p_3', count: 4 });
  });

  it('preserves malformed records and handles unavailable storage', () => {
    const { data, repository } = storageFixture();
    data.set(sessionKey, '{"version":2,"data":{"invalid":true}}');
    const restored = repository.load();
    expect(restored.state.game).toBeNull();
    expect(restored.notices[0]).toMatch(/Bản gốc/);
    repository.saveSession(gameFixture());
    expect(data.get(`${sessionKey}_backup`)).toBe(
      '{"version":2,"data":{"invalid":true}}',
    );
    expect(repository.load().state.game?.phase).toMatchObject({
      type: 'reveal',
    });

    const unavailable = createRepository({
      getItem() {
        throw new Error('unavailable');
      },
      setItem() {
        throw new Error('unavailable');
      },
    });
    expect(unavailable.load().notices[0]).toMatch(/Không thể đọc/);
    expect(() => unavailable.saveSession(null)).toThrow('unavailable');
  });

  it('retains a confirmed legacy Avenger target without offering another choice', () => {
    const { data, repository } = storageFixture();
    const game = gameFixture({ ...DEFAULT_CONFIG, avengerEnabled: true });
    const avenger = game.players.find(({ specialRoles }) =>
      specialRoles.includes('AVENGER'),
    );
    const target = game.players.find(({ id }) => id !== avenger?.id);
    if (!avenger || !target) throw new Error('Expected expanded roles');
    const pending = { playerId: target.id, cause: 'AVENGER' };
    data.set(
      'undercover_vn_session_v1',
      JSON.stringify({
        ...legacySession(game),
        status: 'ELIMINATION',
        players: game.players.map((player) => ({
          ...player,
          wordLocked: true,
          isAlive: player.id !== avenger.id,
        })),
        eliminationState: {
          current: { playerId: avenger.id, cause: 'VOTE' },
          queue: [pending],
          mrWhiteHandled: avenger.role === 'MR_WHITE',
          loverHandled: false,
          avengerHandled: true,
        },
      }),
    );
    expect(repository.load().state.game?.phase).toMatchObject({
      type: 'elimination',
      step: 'settle',
      pending: [pending],
    });
  });
});
