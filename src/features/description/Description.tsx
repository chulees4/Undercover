import { useEffect, useRef, useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { roleLabelShort } from '../../game/data/avatars';
import type { Description as Discussion, Game } from '../../game/model';
import { PlayerBadge, PlayerGrid } from '../../shared/components';

function Timer({
  seconds,
  tick,
}: {
  seconds: number;
  tick: (remaining: number) => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [deadline, setDeadline] = useState<number | null>(null);
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
    <div class="timer-box">
      <span class={`timer-digits ${remaining <= 5 ? 'danger' : ''}`}>
        {remaining} giây
      </span>
      <button
        class="btn btn-secondary"
        onClick={() => {
          if (deadline !== null) setDeadline(null);
          else {
            const next = remaining || seconds;
            lastTick.current = next;
            setRemaining(next);
            setDeadline(Date.now() + next * 1000);
          }
        }}
      >
        {deadline !== null ? '⏸ Tạm dừng' : '▶ Bắt đầu'}
      </button>
      {!remaining && <p role="status">⏰ Hết thời gian!</p>}
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
  return (
    <section class="glass-card center-stage">
      <h1>💬 Vòng {game.roundNumber} • Mô tả từ khóa</h1>
      <p>Đến lượt mô tả của</p>
      {speaker && <PlayerBadge player={speaker} />}
      {game.config.timerSeconds > 0 && (
        <Timer
          key={speaker?.id}
          seconds={game.config.timerSeconds}
          tick={tick}
        />
      )}
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
      <div class="btn-row">
        <button
          class="btn btn-secondary"
          onClick={() => send({ type: 'NEXT_SPEAKER' })}
        >
          ➡ Người tiếp theo
        </button>
        <button
          class="btn btn-primary"
          onClick={() => send({ type: 'START_VOTE' })}
        >
          🗳️ Bắt đầu bỏ phiếu
        </button>
      </div>
    </section>
  );
}
