import { useEffect, useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { AVATAR_LIST } from '../../game/data/avatars';
import type { Game, Phase } from '../../game/model';
import { CardTitle, PlayerBadge } from '../../shared/components';
import styles from './Reveal.module.css';

export function Reveal({
  game,
  phase,
  seen,
  reveal,
  send,
}: {
  game: Game;
  phase: Extract<Phase, { type: 'reveal' }>;
  seen: boolean;
  reveal: () => void;
  send: (action: Command) => boolean;
}) {
  const player = game.players[phase.index];
  const [holding, setHolding] = useState(false);
  const [name, setName] = useState(player.namedByUser ? player.name : '');
  const hide = () => setHolding(false);
  useEffect(() => {
    window.addEventListener('blur', hide);
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', hide);
    };
  }, []);

  function show() {
    setHolding(true);
    reveal();
  }
  const last = phase.index === game.players.length - 1;

  if (phase.step === 'privacy') {
    return (
      <section class="glass-card center-stage">
        <CardTitle centered title={`Phát từ bí mật • ${player.seat} / ${game.players.length}`} />
        <p>Đưa điện thoại cho</p>
        <PlayerBadge player={player} />
        <p>Đảm bảo không có ai xung quanh đang nhìn vào màn hình của bạn!</p>
        <button
        class="btn btn-primary"
          onClick={() => send({ type: 'OPEN_CARD' })}
        >
          Sẵn sàng
        </button>
      </section>
    );
  }

  return (
    <section class={`glass-card center-stage ${styles.reveal}`}>
      <CardTitle centered title={`Người chơi #${player.seat} / ${game.players.length}`} />
      <PlayerBadge player={player} showName={false} />
      <div class={styles.profile}>
        <label for="playerNameInput">Nhập tên của bạn:</label>
        <input
          class="input-field"
          id="playerNameInput"
          maxlength={16}
          placeholder={player.name}
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <span id="playerAvatarLabel">Chọn biểu tượng:</span>
        <div
          class="avatar-picker"
          role="group"
          aria-labelledby="playerAvatarLabel"
        >
          {AVATAR_LIST.map((avatar) => (
            <button
              key={avatar}
              class="avatar-opt"
              aria-label={`Chọn biểu tượng ${avatar}`}
              aria-pressed={player.avatar === avatar}
              disabled={game.players.some(
                (other) => other.wordLocked && other.avatar === avatar,
              )}
              onClick={() => send({ type: 'EDIT_PLAYER', avatar })}
            >
              {avatar}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        class={`hold-card ${styles.hold} ${holding ? 'holding' : ''} ${holding && player.role === 'MR_WHITE' ? 'mrwhite-reveal' : ''}`}
        aria-label="Nhấn giữ để xem từ bí mật"
        onPointerDown={(event) => {
          if (event.button !== 0 || !event.isPrimary) return;
          show();
        }}
        onPointerUp={hide}
        onPointerCancel={hide}
        onPointerLeave={hide}
        onLostPointerCapture={hide}
        onBlur={hide}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key !== ' ' && event.key !== 'Enter') return;
          event.preventDefault();
          if (!event.repeat) show();
        }}
        onKeyUp={(event) => {
          if (event.key !== ' ' && event.key !== 'Enter') return;
          event.preventDefault();
          hide();
        }}
      >
        {holding ? (
          <span data-testid="secret-word">
            {player.role === 'MR_WHITE' ? (
              <>
                <strong class="secret-word-text">Bạn là Mũ Trắng</strong>
                <span>
                  Bạn không có từ khóa! Hãy lắng nghe và đoán từ của Dân thường.
                </span>
              </>
            ) : (
              <>
                <span>TỪ KHÓA CỦA BẠN</span>
                <strong class="secret-word-text">{player.assignedWord}</strong>
              </>
            )}
            {player.specialRoles.includes('JUSTICE') && (
              <span>⚖️ Nữ thần Công lý</span>
            )}
            {player.specialRoles.includes('LOVER') && (
              <span>
                💘 Người tình của{' '}
                {game.players.find(({ id }) => id === player.loverId)?.name}
              </span>
            )}
            {player.specialRoles.includes('AVENGER') && (
              <span>⚔️ Kẻ báo thù</span>
            )}
          </span>
        ) : (
          <>
            <span class="hold-icon">🔒</span>
            <strong>NHẤN GIỮ ĐỂ XEM TỪ BÍ MẬT</strong>
          </>
        )}
      </button>
      <div class="dist-progress" aria-label="Tiến độ phát từ">
        {game.players.map(({ id, seat, wordLocked }) => (
          <span
            key={id}
            class={`dist-pill ${wordLocked ? 'locked' : seat === player.seat ? 'current' : 'waiting'}`}
          >
            {wordLocked ? '✓' : seat}
          </span>
        ))}
      </div>
      <button
        class="btn btn-primary"
        disabled={!seen}
        onClick={() => {
          hide();
          send({ type: 'EDIT_PLAYER', name });
          send({ type: 'LOCK_WORD' });
        }}
      >
        {!seen ? 'Cần xem từ bí mật' : last ? 'Bắt đầu vòng 1' : 'Chuyển người tiếp theo'}
      </button>
    </section>
  );
}
