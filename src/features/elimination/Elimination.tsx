import { t } from '../../i18n';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import { roleEmoji, roleLabelVN } from '../../game/data/avatars';
import type { Game, Phase, Player } from '../../game/model';
import { revengeTargets } from '../../game/reducer';
import {
  CardTitle,
  Dialog,
  PlayerBadge,
  PlayerGrid,
} from '../../shared/components';
import styles from './Elimination.module.css';

type EliminationPhase = Extract<Phase, { type: 'elimination' }>;

const causes = {
  VOTE: `🗳️ ${t('game.elimination.eliminatedByVote')}`,
  LOVER: `💔 ${t('game.elimination.eliminatedByLover')}`,
  AVENGER: `⚔️ ${t('game.elimination.eliminatedByAvenger')}`,
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
    <Dialog title={`🎩⚡ ${t('game.elimination.mrWhiteLastChance')}`}>
      <p>{t('game.elimination.guessInstructions', { name: player.name })}</p>
      <p class={`timer-digits ${seconds <= 5 ? 'danger' : ''}`}>
        {t('game.elimination.secondsRemaining', { count: seconds })}
      </p>
      <form
        class={styles.guess}
        onSubmit={(event) => {
          event.preventDefault();
          if (guess.trim()) submit(guess);
        }}
      >
        <label for="white-guess">{t('game.elimination.civilianWord')}</label>
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
            {t('game.elimination.giveUp')}
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={!guess.trim()}
          >
            {`🎯 ${t('game.elimination.guessNow')}`}
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
            ❓<span>{t('game.elimination.revealingRole')}</span>
          </div>
          <div
            class={`flip-face flip-back role-${player.role}`}
            aria-hidden={!flipped}
          >
            {flipped && (
              <>
                <span>{t('game.elimination.actualRole')}</span>
                <strong>
                  {roleEmoji(player.role)} {roleLabelVN(player.role)}
                </strong>
                {player.specialRoles.includes('JUSTICE') && (
                  <span>{`⚖️ ${t('game.elimination.justiceRole')}`}</span>
                )}
                {player.specialRoles.includes('LOVER') && (
                  <span>{`💘 ${t('game.elimination.loverRole')}`}</span>
                )}
                {player.specialRoles.includes('AVENGER') && (
                  <span>{`⚔️ ${t('game.elimination.avengerRole')}`}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {flipped && (phase.step === 'card' || phase.step === 'settle') && (
        <button class="btn btn-primary" onClick={advance}>
          {`${t('game.elimination.continue')} →`}
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
        <Dialog title={t('game.elimination.incorrectGuess')}>
          <p>
            {phase.missedGuess
              ? t('game.elimination.guessDoesNotMatchCivilianWord', {
                  value1: phase.missedGuess,
                })
              : t('game.elimination.guessTimedOutOrGivenUp')}
          </p>
          <p>{t('game.elimination.mrWhiteEliminated')}</p>
          <button class="btn btn-primary" onClick={advance}>
            {t('game.elimination.continueGame')}
          </button>
        </Dialog>
      )}
      {phase.step === 'lover' && (
        <Dialog title={`💘💔 ${t('game.elimination.loversEffect')}`}>
          <p>
            {t('game.elimination.loverEliminated', {
              partnerName: partner?.name ?? '',
              playerName: player.name,
            })}
          </p>
          <button class="btn btn-primary" onClick={advance}>
            {t('game.elimination.continue')}
          </button>
        </Dialog>
      )}
      {phase.step === 'revenge' && (
        <Dialog title={`⚔️ ${t('game.elimination.avengerRole')}`}>
          <p>
            {t('game.elimination.revengeInstructions', { name: player.name })}
          </p>
          <PlayerGrid
            players={revengeTargets(game, phase)}
            status={() => `⚔️ ${t('game.elimination.chooseElimination')}`}
            choose={(targetId) => send({ type: 'REVENGE', targetId })}
          />
        </Dialog>
      )}
    </section>
  );
}
