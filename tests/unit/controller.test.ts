import { expect, it, vi } from 'vitest';
import { createGameController } from '../../src/app/game-controller';
import { DEFAULT_CONFIG, type Game, type State } from '../../src/game/model';
import type { Repository } from '../../src/infrastructure/persistence/repository';

function fixture() {
  let saved: Game | null = null;
  const empty: State = {
    game: null,
    config: DEFAULT_CONFIG,
    profiles: [],
    customWords: [],
    usedWordIds: [],
  };
  const repository = {
    load: () => ({
      state: { ...empty, game: saved },
      preferences: { sound: false, config: DEFAULT_CONFIG },
      notices: [],
    }),
    saveSession: vi.fn((game: Game | null) => {
      saved = game;
    }),
    saveProfiles: vi.fn(),
    savePreferences: vi.fn(),
    saveHistory: vi.fn(),
    saveWords: vi.fn(),
  } satisfies Repository;
  const controller = () =>
    createGameController(
      repository,
      () => 0,
      () => 'sess_test',
      () => {},
    );
  return { repository, controller };
}

it('requires another hold before locking a restored card', () => {
  const { controller } = fixture();
  const first = controller();
  expect(first.dispatch({ type: 'START' })).toBe(true);
  expect(first.dispatch({ type: 'OPEN_CARD' })).toBe(true);
  first.markWordSeen();
  expect(first.snapshot().wordSeen).toBe(true);

  const restored = controller();
  expect(restored.snapshot().paused).toBe(true);
  restored.resume();
  expect(restored.snapshot().state.game?.phase).toEqual({
    type: 'reveal',
    step: 'card',
    index: 0,
  });
  expect(restored.snapshot().wordSeen).toBe(false);
  expect(restored.dispatch({ type: 'LOCK_WORD' })).toBe(false);
  restored.markWordSeen();
  expect(restored.dispatch({ type: 'LOCK_WORD' })).toBe(true);
  expect(restored.snapshot().state.game?.phase).toMatchObject({
    step: 'privacy',
    index: 1,
  });
});

it('allows setup editing while a session is parked and restores its settings on resume', () => {
  const { controller } = fixture();
  const game = controller();
  game.dispatch({ type: 'START' });
  game.pause();
  expect(
    game.dispatch({
      type: 'CONFIGURE',
      config: { ...DEFAULT_CONFIG, timerSeconds: 45 },
    }),
  ).toBe(true);
  expect(game.snapshot().state.config.timerSeconds).toBe(45);
  expect(game.snapshot().state.game?.config.timerSeconds).toBe(30);
  game.resume();
  expect(game.snapshot().state.config.timerSeconds).toBe(30);
});

it('retries a transient write and keeps the preceding checkpoint until scores are saved', () => {
  const { controller, repository } = fixture();
  const game = controller();
  game.dispatch({
    type: 'CONFIGURE',
    config: { ...DEFAULT_CONFIG, playerCount: 3, mrWhiteCount: 0 },
  });
  game.dispatch({ type: 'START' });
  for (let seat = 0; seat < 3; seat++) {
    game.dispatch({ type: 'OPEN_CARD' });
    game.markWordSeen();
    game.dispatch({ type: 'LOCK_WORD' });
  }
  const undercover = game
    .snapshot()
    .state.game?.players.find(({ role }) => role === 'UNDERCOVER');
  if (!undercover) throw new Error('Expected an Undercover');
  game.dispatch({ type: 'START_VOTE' });
  game.dispatch({ type: 'SELECT_OFFLINE', id: undercover.id });
  game.dispatch({ type: 'CONFIRM_OFFLINE' });
  repository.saveProfiles.mockImplementationOnce(() => {
    throw new Error('Storage full');
  });
  expect(game.dispatch({ type: 'ADVANCE_ELIMINATION' })).toBe(true);
  expect(game.snapshot().state.game?.phase.type).toBe('results');
  expect(game.snapshot().notice).toMatch(/Không thể lưu/);
  expect(repository.saveSession.mock.lastCall?.[0]?.phase.type).toBe(
    'elimination',
  );
  expect(game.retryPersistence()).toBe(true);
  expect(repository.saveSession.mock.lastCall?.[0]?.phase.type).toBe('results');
});
