import {
  DEFAULT_CONFIG,
  type Config,
  type Game,
  type State,
} from '../../game/model';
import { migrateSession } from './legacy';
import {
  array,
  isActiveGame,
  isConfig,
  isProfile,
  isWord,
  record,
  string,
} from './validation';

export interface Preferences {
  sound: boolean;
  config: Config;
}

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type Slot =
  'session' | 'profiles' | 'custom_words' | 'used_words' | 'preferences';
type Validator<T> = (value: unknown) => value is T;

const version = 2;
const key = (slot: Slot, schema: number) => `undercover_vn_${slot}_v${schema}`;
const isSession = (value: unknown): value is Game | null =>
  value === null || isActiveGame(value);
const isPreferences = (value: unknown): value is Preferences =>
  record(value) && typeof value.sound === 'boolean' && isConfig(value.config);
const isProfiles = (value: unknown): value is State['profiles'] =>
  array(value, isProfile);
const isWords = (value: unknown): value is State['customWords'] =>
  array(value, isWord) &&
  value.every(({ category }) => category === 'custom') &&
  new Set(value.map(({ id }) => id)).size === value.length;
const isHistory = (value: unknown): value is string[] => array(value, string);

export function createRepository(storage: StoragePort) {
  const preservedRecords = new Map<Slot, string>();
  const notices = new Set<string>();

  function readRaw(storageKey: string) {
    try {
      return storage.getItem(storageKey);
    } catch {
      notices.add('Không thể đọc dữ liệu đã lưu trên thiết bị này.');
      return null;
    }
  }

  function parse(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  function loadSlot<T>(
    slot: Slot,
    validate: Validator<T>,
    fallback: T,
    legacy = (value: unknown) => value,
  ): T {
    const current = readRaw(key(slot, version));
    if (current !== null) {
      const envelope = parse(current);
      if (
        record(envelope) &&
        envelope.version === version &&
        validate(envelope.data)
      )
        return envelope.data;
      preservedRecords.set(slot, current);
      notices.add(
        'Một số dữ liệu đã lưu không đọc được. Bản gốc được giữ lại.',
      );
      return fallback;
    }
    const old = readRaw(key(slot, 1));
    if (old !== null) {
      const migrated = legacy(parse(old));
      if (validate(migrated)) return migrated;
      notices.add(
        'Một số dữ liệu cũ không khôi phục được. Bản gốc được giữ lại.',
      );
    }
    return fallback;
  }

  function saveSlot<T>(slot: Slot, data: T) {
    const storageKey = key(slot, version);
    const preserved = preservedRecords.get(slot);
    if (preserved !== undefined) {
      storage.setItem(`${storageKey}_backup`, preserved);
      preservedRecords.delete(slot);
    }
    storage.setItem(storageKey, JSON.stringify({ version, data }));
  }

  return {
    load() {
      const rawSound = readRaw('undercover_vn_sound_v1');
      const preferences = loadSlot('preferences', isPreferences, {
        sound: rawSound !== 'false',
        config: DEFAULT_CONFIG,
      });
      const game = loadSlot('session', isSession, null, migrateSession);
      const state: State = {
        game,
        config: preferences.config,
        profiles: loadSlot('profiles', isProfiles, []),
        customWords: loadSlot('custom_words', isWords, []),
        usedWordIds: loadSlot('used_words', isHistory, []),
      };
      return { state, preferences, notices: [...notices] };
    },
    saveSession(game: Game | null) {
      saveSlot('session', game?.phase.type === 'results' ? null : game);
    },
    saveProfiles(profiles: State['profiles']) {
      saveSlot('profiles', profiles);
    },
    saveWords(words: State['customWords']) {
      saveSlot('custom_words', words);
    },
    saveHistory(history: State['usedWordIds']) {
      saveSlot('used_words', history);
    },
    savePreferences(preferences: Preferences) {
      saveSlot('preferences', preferences);
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
