import { t } from '../../i18n';
import type { ComponentChildren } from 'preact';
import type { Command } from '../../app/game-controller';
import { CATEGORIES } from '../../game/data/words';
import {
  configurePlayerCount,
  impostorLimit,
  type Config,
  type State,
} from '../../game/model';
import { wordPool } from '../../game/rules';
import { Section } from '../../shared/components';
import styles from './Setup.module.css';

function Stepper({
  label,
  details,
  value,
  min,
  max,
  change,
}: {
  label: string;
  details?: string;
  value: number;
  min: number;
  max: number;
  change: (value: number) => void;
}) {
  return (
    <div class="stepper-row">
      <div class="stepper-info">
        <div class="stepper-label">{label}</div>
        {details && <div class="stepper-sub">{details}</div>}
      </div>
      <div class="stepper-ctrl">
        <button
          class="step-btn"
          aria-label={t('game.setup.decreaseLabel', { label: label })}
          disabled={value <= min}
          onClick={() => change(value - 1)}
        >
          -
        </button>
        <span class="step-val">{value}</span>
        <button
          class="step-btn"
          aria-label={t('game.setup.increaseLabel', { label: label })}
          disabled={value >= max}
          onClick={() => change(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function Segment<T extends string | number>({
  options,
  value,
  change,
}: {
  options: { value: T; label: string }[];
  value: T;
  change: (value: T) => void;
}) {
  return (
    <div class="seg-group">
      {options.map((option) => (
        <button
          key={option.value}
          class="seg-btn"
          aria-pressed={value === option.value}
          onClick={() => change(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  details,
  active,
  disabled,
  change,
}: {
  label: string;
  details: string;
  active: boolean;
  disabled?: boolean;
  change: (checked: boolean) => void;
}) {
  return (
    <div class="toggle-row">
      <div>
        <div class="stepper-label">{label}</div>
        <div class="stepper-sub">{details}</div>
      </div>
      <label class="switch">
        <input
          type="checkbox"
          aria-label={label}
          checked={active}
          disabled={disabled}
          onChange={(event) => change(event.currentTarget.checked)}
        />
        <span class="slider" />
      </label>
    </div>
  );
}

export function Setup({
  state,
  send,
  start,
  resume,
  manageWords,
  clearProfiles,
  discard,
}: {
  state: State;
  send: (action: Command) => boolean;
  start: () => void;
  resume: () => void;
  manageWords: () => void;
  clearProfiles: () => void;
  discard: () => void;
}) {
  const { config, game, profiles, customWords } = state;
  const { playerCount, undercoverCount, mrWhiteCount } = config;
  const maxImpostors = impostorLimit(playerCount);
  const wordCount = wordPool(state).length;
  const set = (patch: Partial<Config>) =>
    send({ type: 'CONFIGURE', config: { ...config, ...patch } });
  const counts: ComponentChildren = (
    <div class="role-summary-bar">
      <span class="role-pill civ">
        {`👨‍🌾 ${t('game.setup.civilianCount', {
          count: playerCount - undercoverCount - mrWhiteCount,
        })}`}
      </span>
      <span class="role-pill und">
        {`🕵️ ${t('game.setup.undercoverCount', { count: undercoverCount })}`}
      </span>
      <span class="role-pill mrw">
        {`🎩 ${t('game.setup.whiteCount', { count: mrWhiteCount })}`}
      </span>
    </div>
  );

  return (
    <div class={styles.setup}>
      {game && (
        <div class="resume-banner">
          <div class="resume-status">
            <strong>{`⚡ ${t('game.setup.gameInProgress')}`}</strong>
            <div class="marquee">
              <span>
                {t('game.setup.savedGameSummary', {
                  round: game.roundNumber,
                  count: game.players.length,
                })}
              </span>
            </div>
          </div>
          <div class={styles.actions}>
            <button class="btn btn-primary" onClick={resume}>
              {t('game.setup.resume')}
            </button>
            <button
              class="icon-btn btn-danger"
              aria-label={t('game.setup.discardSavedGame')}
              onClick={discard}
            >
              x
            </button>
          </div>
        </div>
      )}
      <Section
        title={`👥 ${t('game.setup.playersAndRoles')}`}
        action={
          profiles.length > 0 && (
            <button class="btn btn-sm btn-danger" onClick={clearProfiles}>
              {`🔄 ${t('game.setup.clearScores')}`}
            </button>
          )
        }
      >
        <Stepper
          label={t('game.setup.playerCount')}
          details={t('game.setup.playerCountRange')}
          value={playerCount}
          min={3}
          max={20}
          change={(count) =>
            send({
              type: 'CONFIGURE',
              config: configurePlayerCount(config, count),
            })
          }
        />
        <Stepper
          label={`🕵️ ${t('game.setup.undercoverCountLabel')}`}
          details={t('game.setup.undercover')}
          value={undercoverCount}
          min={mrWhiteCount ? 0 : 1}
          max={maxImpostors - mrWhiteCount}
          change={(count) => set({ undercoverCount: count })}
        />
        <Stepper
          label={`🎩 ${t('game.setup.mrWhiteCountLabel')}`}
          details={t('game.setup.mrWhite')}
          value={mrWhiteCount}
          min={undercoverCount ? 0 : 1}
          max={maxImpostors - undercoverCount}
          change={(count) => set({ mrWhiteCount: count })}
        />
        {counts}
      </Section>
      <Section title={`✨ ${t('game.setup.specialRoles')}`}>
        <Toggle
          label={`⚖️ ${t('game.setup.justiceRole')}`}
          details={t('game.setup.justiceTieBreakDescription')}
          active={config.justiceEnabled}
          change={(justiceEnabled) => set({ justiceEnabled })}
        />
        <Toggle
          label={`💘 ${t('game.setup.loversRole')}`}
          details={t('game.setup.loversEliminationDescription')}
          active={config.loversEnabled}
          disabled={playerCount < 4}
          change={(loversEnabled) => set({ loversEnabled })}
        />
        <Toggle
          label={`⚔️ ${t('game.setup.avengerRole')}`}
          details={t('game.setup.chooseLivingEliminationTarget')}
          active={config.avengerEnabled}
          change={(avengerEnabled) => set({ avengerEnabled })}
        />
      </Section>
      <Section
        title={`📚 ${t('game.setup.wordCategories')}`}
        action={
          <button class="btn btn-sm" onClick={manageWords}>
            {`✍️ ${t('game.setup.manageCustomWords')}`}
          </button>
        }
      >
        <div class="cat-grid">
          {CATEGORIES.map(({ id, labelKey, emoji }) => {
            const selected = config.categories.includes(id);
            const count = wordPool(state, {
              ...config,
              categories: [id],
            }).length;
            return (
              <button
                key={id}
                class="cat-chip"
                aria-pressed={selected}
                disabled={id === 'custom' && !customWords.length && !selected}
                onClick={() =>
                  set({
                    categories: selected
                      ? config.categories.filter((category) => category !== id)
                      : [...config.categories, id],
                  })
                }
              >
                <span class="emoji">{emoji}</span>
                <span class="meta">
                  <span class="name">{t(`game.categories.${labelKey}`)}</span>
                  <span class="count">
                    {t('game.setup.wordCount', { count: count })}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title={`⚙️ ${t('game.setup.gameSettings')}`}>
        <h3>{`⏱️ ${t('game.setup.descriptionTimer')}`}</h3>
        <Segment<Config['timerSeconds']>
          value={config.timerSeconds}
          change={(timerSeconds) => set({ timerSeconds })}
          options={[
            { value: 0, label: t('game.setup.off') },
            { value: 30, label: t('game.setup.thirtySeconds') },
            { value: 45, label: t('game.setup.fortyFiveSeconds') },
          ]}
        />
        <h3>{`🗳️ ${t('game.setup.votingMethod')}`}</h3>
        <Segment
          value={config.votingMode}
          change={(votingMode) => set({ votingMode })}
          options={[
            { value: 'offline', label: `✋ ${t('game.setup.publicVoting')}` },
            { value: 'secret', label: `🔒 ${t('game.setup.secretVoting')}` },
          ]}
        />
      </Section>
      {!wordCount && (
        <p role="status">{t('game.setup.selectCategoryWithWords')}</p>
      )}
      <button class="btn btn-primary" disabled={!wordCount} onClick={start}>
        {`🚀 ${t('game.setup.startGame')}`}
      </button>
    </div>
  );
}
