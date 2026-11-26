import { useEffect, useRef, useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { roleEmoji, roleLabelVN } from '../../game/data/avatars';
import type { Game, Phase, Player } from '../../game/model';
import { revengeTargets } from '../../game/reducer';
import { CardTitle, Dialog, PlayerBadge, PlayerGrid } from '../../shared/components';
import styles from './Elimination.module.css';

type EliminationPhase = Extract<Phase, { type: 'elimination' }>;

const causes = {
  VOTE: '🗳️ Bị bỏ phiếu loại',
  LOVER: '💔 Bị loại theo Cặp đôi Người tình',
  AVENGER: '⚔️ Bị Kẻ báo thù kéo theo',
} satisfies Record<EliminationPhase['target']['cause'], string>;

function Guess({
  player,
  submit,
  tick,
}: {
  player: Player;
  submit: (text: string) => void;
  tick: (remaining: number) => void;
}) {
  const [guess, setGuess] = useState('');
  const [seconds, setSeconds] = useState(20);
  const callbacks = useRef({ submit, tick });
  callbacks.current = { submit, tick };
  useEffect(() => {
    const deadline = Date.now() + 20_000;
    let previous = 20;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (previous === remaining) return;
      previous = remaining;
      setSeconds(remaining);
      if (remaining <= 5) callbacks.current.tick(remaining);
      if (!remaining) {
        clearInterval(timer);
        callbacks.current.submit('');
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <Dialog title="🎩⚡ Cơ hội cuối của Mũ Trắng!">
      <p>{player.name} có 20 giây để đoán từ khóa của Dân thường.</p>
      <p class={`timer-digits ${seconds <= 5 ? 'danger' : ''}`}>
        {seconds} giây
      </p>
      <form
        class={styles.guess}
        onSubmit={(event) => {
          event.preventDefault();
          if (guess.trim()) submit(guess);
        }}
      >
        <label for="white-guess">Từ khóa Dân thường</label>
        <input
          class="input-field"
          id="white-guess"
          maxlength={160}
          value={guess}
          onInput={(event) => setGuess(event.currentTarget.value)}
        />
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-secondary"
            onClick={() => submit('')}
          >
            Bỏ cuộc
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!guess.trim()}
          >
            🎯 Đoán ngay
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function Elimination({
  game,
  phase,
  send,
  flip,
  tick,
}: {
  game: Game;
  phase: EliminationPhase;
  send: (action: Command) => boolean;
  flip: () => void;
  tick: (remaining: number) => void;
}) {
  const [flipped, setFlipped] = useState(phase.step !== 'card');
  const onFlip = useRef(flip);
  onFlip.current = flip;
  useEffect(() => {
    if (phase.step !== 'card') return;
    const timer = setTimeout(() => {
      setFlipped(true);
      onFlip.current();
    }, 450);
    return () => clearTimeout(timer);
  }, [phase.step]);
  const player = game.players.find(({ id }) => id === phase.target.playerId);
  if (!player) return null;
  const partner = game.players.find(({ id }) => id === player.loverId);
  const advance = () => send({ type: 'ADVANCE_ELIMINATION' });
  return (
    <section class="glass-card center-stage">
      <CardTitle centered title={causes[phase.target.cause]} />
      <PlayerBadge player={player} />
      <div class="flip-scene">
        <div class={`flip-card ${flipped ? 'flipped' : ''}`}>
          <div class="flip-face flip-front" aria-hidden={flipped}>
            ❓<span>Đang lật vai trò...</span>
          </div>
          <div
            class={`flip-face flip-back role-${player.role}`}
            aria-hidden={!flipped}
          >
            {flipped && (
              <>
                <span>VAI TRÒ THẬT</span>
                <strong>
                  {roleEmoji(player.role)} {roleLabelVN(player.role)}
                </strong>
                {player.specialRoles.includes('JUSTICE') && (
                  <span>⚖️ Nữ thần Công lý</span>
                )}
                {player.specialRoles.includes('LOVER') && (
                  <span>💘 Người tình</span>
                )}
                {player.specialRoles.includes('AVENGER') && (
                  <span>⚔️ Kẻ báo thù</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {flipped && (phase.step === 'card' || phase.step === 'settle') && (
        <button class="btn btn-primary" onClick={advance}>
          Tiếp tục →
        </button>
      )}
      {phase.step === 'guess' && (
        <Guess
          player={player}
          tick={tick}
          submit={(text) => send({ type: 'GUESS', text })}
        />
      )}
      {phase.step === 'wrong-guess' && (
        <Dialog title="Đoán chưa chính xác!">
          <p>
            {phase.missedGuess
              ? `Từ “${phase.missedGuess}” không khớp với từ của Dân thường.`
              : 'Hết thời gian hoặc đã bỏ cuộc.'}
          </p>
          <p>Mũ Trắng chính thức bị loại!</p>
          <button class="btn btn-primary" onClick={advance}>
            Tiếp tục ván đấu
          </button>
        </Dialog>
      )}
      {phase.step === 'lover' && (
        <Dialog title="💘💔 Hiệu ứng Cặp đôi Người tình!">
          <p>
            {partner?.name} cũng bị loại vì là người tình của {player.name}.
          </p>
          <button class="btn btn-primary" onClick={advance}>
            Tiếp tục
          </button>
        </Dialog>
      )}
      {phase.step === 'revenge' && (
        <Dialog title="⚔️ Kẻ báo thù">
          <p>{player.name} có thể chọn một người chơi bị loại cùng mình.</p>
          <PlayerGrid
            players={revengeTargets(game, phase)}
            status={() => '⚔️ Chọn loại'}
            choose={(targetId) => send({ type: 'REVENGE', targetId })}
          />
        </Dialog>
      )}
    </section>
  );
}
