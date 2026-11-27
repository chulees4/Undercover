import { t } from '../i18n';
import { reduce, type Action } from '../game/reducer';
import type { Random, State } from '../game/model';
import { prepareRevealAvatar } from '../game/rules';
import type { Repository } from '../infrastructure/persistence/repository';

type RandomAction = Extract<Action, { random: Random }>;
type BrowserAction<T> = T extends { random: Random }
  ? Omit<T, 'random' | 'sessionId'>
  : T;
export type Command = BrowserAction<Action>;

export function createGameController(
  repository: Repository,
  random: Random,
  id: () => string,
  onEffect: (
    effect: 'click' | 'flip' | 'hold' | 'eliminate' | 'win',
    sound: boolean,
  ) => void,
) {
  const initial = repository.load();
  let state = initial.state;
  let sound = initial.preferences.sound;
  let paused = Boolean(state.game);
  let wordSeen = false;
  const restoreNotice = initial.notices.join(' ');
  let notice = restoreNotice;
  let snapshot = { state, sound, paused, wordSeen, notice };
  const listeners = new Set<() => void>();
  const storedRecords = {
    profiles: () => repository.saveProfiles(state.profiles),
    words: () => repository.saveWords(state.customWords),
    history: () => repository.saveHistory(state.usedWordIds),
    preferences: () =>
      repository.savePreferences({ sound, config: state.config }),
    session: () => repository.saveSession(state.game),
  };
  type StoredRecord = keyof typeof storedRecords;
  const pendingWrites = new Set<StoredRecord>();

  function publish() {
    snapshot = { state, sound, paused, wordSeen, notice };
    listeners.forEach((listener) => listener());
  }

  function flush() {
    for (const slot of Object.keys(storedRecords) as StoredRecord[]) {
      if (!pendingWrites.has(slot)) continue;
      // Retain the preceding elimination checkpoint until winning scores are durable.
      if (
        slot === 'session' &&
        (!state.game || state.game.phase.type === 'results') &&
        pendingWrites.has('profiles')
      )
        continue;
      try {
        storedRecords[slot]();
        pendingWrites.delete(slot);
      } catch {
        // Keep the latest record queued for the next interaction.
      }
    }
    notice = pendingWrites.size
      ? t('app.storage.cannotSaveChanges')
      : restoreNotice;
    return pendingWrites.size === 0;
  }

  function persist(previous: State) {
    if (state.profiles !== previous.profiles) pendingWrites.add('profiles');
    if (state.customWords !== previous.customWords) pendingWrites.add('words');
    if (state.usedWordIds !== previous.usedWordIds)
      pendingWrites.add('history');
    if (state.config !== previous.config) pendingWrites.add('preferences');
    if (state.game !== previous.game) pendingWrites.add('session');
    flush();
  }

  function effect(name: Parameters<typeof onEffect>[0]) {
    onEffect(name, sound);
  }

  function resolveCommand(command: Command): Action {
    switch (command.type) {
      case 'START':
      case 'REPLAY':
        return { ...command, sessionId: id(), random };
      case 'LOCK_WORD':
      case 'SKIP_TIE':
      case 'ADVANCE_ELIMINATION':
      case 'REVENGE':
        return { ...command, random } satisfies RandomAction;
      default:
        return command;
    }
  }

  return {
    snapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(command: Command) {
      if (command.type === 'LOCK_WORD' && !wordSeen) return false;
      const parked =
        paused &&
        (command.type === 'CONFIGURE' || command.type === 'CLEAR_PROFILES');
      const replacesSession = paused && command.type === 'START';
      if (
        paused &&
        !parked &&
        !replacesSession &&
        command.type !== 'RESET' &&
        command.type !== 'ADD_WORD' &&
        command.type !== 'DELETE_WORD'
      )
        return false;
      const input =
        parked || replacesSession ? { ...state, game: null } : state;
      const result = reduce(input, resolveCommand(command));
      if (!result.ok) return false;
      const previous = state;
      state = parked ? { ...result.state, game: previous.game } : result.state;
      const phase = state.game?.phase;
      const oldPhase = previous.game?.phase;
      if (
        command.type === 'LOCK_WORD' ||
        command.type === 'RESET' ||
        command.type === 'START' ||
        command.type === 'REPLAY'
      )
        wordSeen = false;
      if (command.type === 'RESET' || command.type === 'START') paused = false;
      persist(previous);
      if (phase?.type === 'results' && oldPhase?.type !== 'results')
        effect('win');
      else if (
        phase?.type === 'elimination' &&
        phase.target !==
          (oldPhase?.type === 'elimination' ? oldPhase.target : undefined)
      ) {
        effect('eliminate');
      } else if (command.type === 'OPEN_CARD') effect('flip');
      else effect('click');
      publish();
      return true;
    },
    markWordSeen() {
      const phase = state.game?.phase;
      if (paused || phase?.type !== 'reveal' || phase.step !== 'card') return;
      wordSeen = true;
      effect('hold');
      publish();
    },
    pause() {
      paused = Boolean(state.game);
      wordSeen = false;
      flush();
      publish();
    },
    resume() {
      paused = false;
      if (state.game) {
        const game = prepareRevealAvatar(state.game);
        if (game !== state.game) {
          state = { ...state, game };
          pendingWrites.add('session');
        }
        if (state.config !== game.config) {
          state = { ...state, config: game.config };
          pendingWrites.add('preferences');
        }
      }
      flush();
      publish();
    },
    toggleSound() {
      sound = !sound;
      pendingWrites.add('preferences');
      flush();
      effect('click');
      publish();
    },
    retryPersistence() {
      const saved = flush();
      publish();
      return saved;
    },
  };
}

export type Controller = ReturnType<typeof createGameController>;
