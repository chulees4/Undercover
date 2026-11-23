import { useEffect, useRef } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { roleEmoji, roleLabelVN } from '../../game/data/avatars';
import type { Game, Phase } from '../../game/model';
import { startConfetti } from '../../infrastructure/confetti';
import { Section } from '../../shared/components';

export function Results({
  game,
  phase,
  send,
}: {
  game: Game;
  phase: Extract<Phase, { type: 'results' }>;
  send: (action: Command) => boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) return startConfetti(canvas.current);
  }, []);
  const white = game.players.find(({ id }) => id === phase.winningMrWhiteId);
  const title =
    phase.winner === 'CIVILIANS'
      ? '👨‍🌾 PHE DÂN THƯỜNG CHIẾN THẮNG!'
      : phase.winner === 'IMPOSTORS'
        ? '🕵️ PHE ẨN DANH CHIẾN THẮNG!'
        : '🎩 MŨ TRẮNG LẬT KÈO THẮNG LỚN!';
  const subtitle =
    phase.winner === 'CIVILIANS'
      ? 'Toàn bộ Gián điệp & Mũ Trắng đã bị vạch trần.'
      : phase.winner === 'IMPOSTORS'
        ? 'Gián điệp / Mũ Trắng đã ẩn mình thành công đến phút chót.'
        : `${white?.name} đã đoán chính xác từ khóa của Dân thường (+8 điểm)!`;
  return (
    <>
      <canvas id="confettiCanvas" ref={canvas} aria-hidden="true" />
      <section class="glass-card center-stage">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div class="word-reveal-pair">
          <div class="word-box civ">
            <span>Từ Dân thường</span>
            <strong>{game.pair.word_civilian}</strong>
          </div>
          <div class="word-box und">
            <span>Từ Gián điệp</span>
            <strong>{game.pair.word_undercover}</strong>
          </div>
        </div>
      </section>
      <Section title="🏆 Bảng xếp hạng & Vai trò ván này">
        <div class="score-list">
          {[...game.players]
            .sort((left, right) => right.totalScore - left.totalScore)
            .map((player, index) => (
              <div
                class={`score-item ${index === 0 && player.totalScore > 0 ? 'top-1' : ''}`}
                key={player.id}
              >
                <strong>
                  {index + 1}. {player.avatar} {player.name}
                  {player.specialRoles.map((role) => (
                    <span key={role}>
                      {role === 'JUSTICE'
                        ? ' ⚖️'
                        : role === 'LOVER'
                          ? ' 💘'
                          : ' ⚔️'}
                    </span>
                  ))}
                </strong>
                <span class={`role-chip ${player.role}`}>
                  {roleEmoji(player.role)} {roleLabelVN(player.role)}
                  {!player.isAlive && ' • Đã loại'}
                </span>
                <span>
                  {player.totalScore} đ{' '}
                  {player.lastPointsEarned > 0 && (
                    <strong>+{player.lastPointsEarned} đ</strong>
                  )}
                </span>
              </div>
            ))}
        </div>
      </Section>
      <div class="btn-row">
        <button
          class="btn btn-secondary"
          onClick={() => send({ type: 'RESET' })}
        >
          ⚙️ Cài đặt / Sửa
        </button>
        <button
          class="btn btn-primary"
          onClick={() => send({ type: 'REPLAY' })}
        >
          🔄 Chơi ván tiếp
        </button>
      </div>
    </>
  );
}
