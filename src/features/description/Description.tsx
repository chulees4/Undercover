import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { roleLabelShort } from '../../game/data/avatars';
import type { Description as Discussion, Game } from '../../game/model';
import { CardTitle, PlayerBadge, PlayerGrid } from '../../shared/components';

function Timer({
  seconds,
  tick,
  nextPlayerButton,
}: {
  seconds: number;
  tick: (remaining: number) => void;
  nextPlayerButton: JSX.Element;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const onTick = useRef(tick);
  onTick.current = tick;
  const lastTick = useRef(seconds);
  useEffect(() => {
    if (deadline === null) return;
    const interval = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (next === lastTick.current) return;
      lastTick.current = next;
      setRemaining(next);
      if (next <= 5) onTick.current(next);
      if (!next) setDeadline(null);
    }, 100);
    return () => clearInterval(interval);
  }, [deadline]);
  return (
    <div class="description-timer">
      <span class={`timer-digits ${remaining <= 5 ? 'danger' : ''}`}>
        {remaining > 0 && <span role="timer">{remaining} giây</span>}
        <span role="status">{remaining === 0 ? 'Hết thời gian!' : ''}</span>
      </span>
      <div class="timer-actions">
        <button
          class="btn btn-secondary"
          onClick={() => {
            if (deadline !== null) setDeadline(null);
            else {
              const next = remaining || seconds;
              lastTick.current = next;
              setHasStarted(true);
              setRemaining(next);
              setDeadline(Date.now() + next * 1000);
            }
          }}
        >
          {deadline !== null
            ? '⏸ Tạm dừng'
            : hasStarted && remaining > 0
              ? '▶ Tiếp tục'
              : '▶ Bắt đầu'}
        </button>
        {hasStarted && remaining > 0 && (
          <button
            class="btn btn-secondary"
            onClick={() => {
              setDeadline(null);
              lastTick.current = seconds;
              setRemaining(seconds);
            }}
          >
            Đặt lại
          </button>
        )}
        {nextPlayerButton}
      </div>
    </div>
  );
}

export function Description({
  game,
  phase,
  send,
  tick,
}: {
  game: Game;
  phase: Discussion;
  send: (action: Command) => boolean;
  tick: (remaining: number) => void;
}) {
  const speaker = game.players.find(
    ({ id }) => id === phase.order[phase.index],
  );
  const nextPlayerButton = (
    <button
      class="btn btn-secondary"
      onClick={() => send({ type: 'NEXT_SPEAKER' })}
    >
      ⏭️ Người tiếp theo
    </button>
  );
  return (
    <section class="glass-card">
      <CardTitle title={`💬 Vòng ${game.roundNumber} • Mô tả từ khóa`} />
      <div class="center-stage">
        <div class="description-turn">
          <div>
            <p>Đến lượt mô tả của</p>
            {speaker && <PlayerBadge player={speaker} />}
          </div>
          {game.config.timerSeconds > 0 && (
            <Timer
              key={speaker?.id}
              seconds={game.config.timerSeconds}
              tick={tick}
              nextPlayerButton={nextPlayerButton}
            />
          )}
        </div>
        <PlayerGrid
          players={game.players}
          activeId={speaker?.id}
          status={(player) =>
            !player.isAlive
              ? `💀 Đã loại (${roleLabelShort(player.role)})`
              : player.id === speaker?.id
                ? 'Đang mô tả'
                : 'Đang chờ'
          }
        />
        <div class="btn-row description-actions">
          {game.config.timerSeconds <= 0 && nextPlayerButton}
          <button
            class="btn btn-primary"
            onClick={() => send({ type: 'START_VOTE' })}
          >
            🗳️ Bắt đầu bỏ phiếu
          </button>
        </div>
      </div>
    </section>
  );
}
