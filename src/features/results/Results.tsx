import { t } from '../../i18n';
import { useEffect, useRef } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { roleEmoji, roleLabelVN } from '../../game/data/avatars';
import type { Game, Phase } from '../../game/model';
import { startConfetti } from '../../infrastructure/confetti';
import { CardTitle, Section } from '../../shared/components';

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
      ? `👨‍🌾 ${t('game.results.civiliansWin')}`
      : phase.winner === 'IMPOSTORS'
        ? `🕵️ ${t('game.results.impostorsWin')}`
        : `🎩 ${t('game.results.mrWhiteWinsByGuess')}`;
  const subtitle =
    phase.winner === 'CIVILIANS'
      ? t('game.results.allImpostorsRevealed')
      : phase.winner === 'IMPOSTORS'
        ? t('game.results.impostorsSurvived')
        : t('game.results.whiteGuessWinner', { name: white?.name ?? '' });
  return (
    <>
      <canvas id="confettiCanvas" ref={canvas} aria-hidden="true" />
      <section class="glass-card center-stage">
        <CardTitle centered title={title} />
        <p>{subtitle}</p>
        <div class="word-reveal-pair">
          <div class="word-box civ">
            <span>{t('game.results.civilianWord')}</span>
            <strong>{game.pair.word_civilian}</strong>
          </div>
          <div class="word-box und">
            <span>{t('game.results.undercoverWord')}</span>
            <strong>{game.pair.word_undercover}</strong>
          </div>
        </div>
      </section>
      <Section title={`🏆 ${t('game.results.roundLeaderboard')}`}>
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
                  {!player.isAlive && ` • ${t('game.results.eliminated')}`}
                </span>
                <span>
                  {player.totalScore} {t('game.results.pointsUnit')}{' '}
                  {player.lastPointsEarned > 0 && (
                    <strong>
                      {t('game.results.pointsEarned', {
                        count: player.lastPointsEarned,
                      })}
                    </strong>
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
          {`⚙️ ${t('game.results.setupOrEdit')}`}
        </button>
        <button
          class="btn btn-primary"
          onClick={() => send({ type: 'REPLAY' })}
        >
          {`🔄 ${t('game.results.playNextGame')}`}
        </button>
      </div>
    </>
  );
}
