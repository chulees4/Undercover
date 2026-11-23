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
          aria-label={`Giảm ${label}`}
          disabled={value <= min}
          onClick={() => change(value - 1)}
        >
          −
        </button>
        <span class="step-val">{value}</span>
        <button
          class="step-btn"
          aria-label={`Tăng ${label}`}
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
          class={`seg-btn ${value === option.value ? 'active' : ''}`}
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
  resume,
  manageWords,
  clearProfiles,
  discard,
}: {
  state: State;
  send: (action: Command) => boolean;
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
        👨‍🌾 {playerCount - undercoverCount - mrWhiteCount} Dân thường
      </span>
      <span class="role-pill und">🕵️ {undercoverCount} Gián điệp</span>
      <span class="role-pill mrw">🎩 {mrWhiteCount} Mũ Trắng</span>
    </div>
  );

  return (
    <div class={styles.setup}>
      {game && (
        <div class="resume-banner">
          <div>
            <strong>⚡ Có ván đang chơi dở!</strong>
            <div>
              Vòng {game.roundNumber} · {game.players.length} người chơi
            </div>
          </div>
          <div class={styles.actions}>
            <button class="btn btn-primary" onClick={resume}>
              Tiếp tục
            </button>
            <button
              class="icon-btn"
              aria-label="Bỏ ván đã lưu"
              onClick={discard}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <Section
        title="👥 Người chơi & Phân bổ vai trò"
        action={
          profiles.length > 0 && (
            <button class="btn btn-secondary" onClick={clearProfiles}>
              🔄 Xóa điểm
            </button>
          )
        }
      >
        <Stepper
          label="Tổng người chơi"
          details="3–20 người"
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
          label="🕵️ Gián điệp (Undercover)"
          value={undercoverCount}
          min={mrWhiteCount ? 0 : 1}
          max={maxImpostors - mrWhiteCount}
          change={(count) => set({ undercoverCount: count })}
        />
        <Stepper
          label="🎩 Mũ Trắng (Mr. White)"
          value={mrWhiteCount}
          min={undercoverCount ? 0 : 1}
          max={maxImpostors - undercoverCount}
          change={(count) => set({ mrWhiteCount: count })}
        />
        {counts}
      </Section>
      <Section title="✨ Vai trò mở rộng">
        <Toggle
          label="⚖️ Nữ thần Công lý"
          details="Một Dân thường quyết định khi bỏ phiếu kín hòa."
          active={config.justiceEnabled}
          change={(justiceEnabled) => set({ justiceEnabled })}
        />
        <Toggle
          label="💘 Cặp đôi Người tình"
          details="Hai người cùng bị loại nếu một người rời cuộc chơi."
          active={config.loversEnabled}
          disabled={playerCount < 4}
          change={(loversEnabled) => set({ loversEnabled })}
        />
        <Toggle
          label="⚔️ Kẻ báo thù"
          details="Chọn một người còn sống bị loại cùng mình."
          active={config.avengerEnabled}
          change={(avengerEnabled) => set({ avengerEnabled })}
        />
      </Section>
      <Section
        title="📚 Chủ đề từ khóa"
        action={
          <button class="btn btn-secondary" onClick={manageWords}>
            ✍️ Quản lý từ tự tạo
          </button>
        }
      >
        <div class="cat-grid">
          {CATEGORIES.map(({ id, name, emoji }) => {
            const selected = config.categories.includes(id);
            const count = wordPool(state, {
              ...config,
              categories: [id],
            }).length;
            return (
              <button
                key={id}
                class={`cat-chip ${selected ? 'selected' : ''}`}
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
                  <span class="name">{name}</span>
                  <span class="count">{count} cặp từ</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="⚙️ Cài đặt ván chơi">
        <h3>⏱️ Thời gian mô tả</h3>
        <Segment<Config['timerSeconds']>
          value={config.timerSeconds}
          change={(timerSeconds) => set({ timerSeconds })}
          options={[
            { value: 0, label: 'Tắt' },
            { value: 30, label: '30 giây' },
            { value: 45, label: '45 giây' },
          ]}
        />
        <h3>🗳️ Cách bỏ phiếu</h3>
        <Segment
          value={config.votingMode}
          change={(votingMode) => set({ votingMode })}
          options={[
            { value: 'offline', label: '✋ Ngoài đời' },
            { value: 'secret', label: '🔒 Bỏ phiếu kín' },
          ]}
        />
      </Section>
      {!wordCount && (
        <p role="status">Chọn một chủ đề có từ khóa để bắt đầu.</p>
      )}
      <button
        class="btn btn-primary"
        disabled={!wordCount}
        onClick={() => send({ type: 'START' })}
      >
        🚀 Bắt đầu ván chơi
      </button>
    </div>
  );
}
