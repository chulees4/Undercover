import { t } from '../../i18n';
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
        <CardTitle
          centered
          title={t('game.reveal.dealSecretWordProgress', {
            value1: player.seat,
            value2: game.players.length,
          })}
        />
        <p>{t('game.reveal.handPhoneTo')}</p>
        <PlayerBadge player={player} />
        <p>{t('game.reveal.ensureNoOneCanSeeScreen')}</p>
        <button
          class="btn btn-primary"
          onClick={() => send({ type: 'OPEN_CARD' })}
        >
          {t('game.reveal.ready')}
        </button>
      </section>
    );
  }

  return (
    <section class={`glass-card center-stage ${styles.reveal}`}>
      <CardTitle
        centered
        title={t('game.reveal.playerProgress', {
          value1: player.seat,
          value2: game.players.length,
        })}
      />
      <PlayerBadge player={player} showName={false} />
      <div class={styles.profile}>
        <label for="playerNameInput">{t('game.reveal.enterYourName')}</label>
        <input
          class="input-field"
          id="playerNameInput"
          maxlength={16}
          placeholder={player.name}
          value={name}
          onInput={(event) => setName(event.currentTarget.value)}
        />
        <span id="playerAvatarLabel">{t('game.reveal.chooseAvatar')}</span>
        <div
          class="avatar-picker"
          role="group"
          aria-labelledby="playerAvatarLabel"
        >
          {AVATAR_LIST.map((avatar) => (
            <button
              key={avatar}
              class="avatar-opt"
              aria-label={t('game.reveal.chooseAvatarLabel', {
                avatar: avatar,
              })}
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
        aria-label={t('game.reveal.holdToSeeSecretWordLabel')}
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
                <strong class="secret-word-text">
                  {t('game.reveal.youAreMrWhite')}
                </strong>
                <span>{t('game.reveal.mrWhiteListenAndGuess')}</span>
              </>
            ) : (
              <>
                <span>{t('game.reveal.yourSecretWord')}</span>
                <strong class="secret-word-text">{player.assignedWord}</strong>
              </>
            )}
            {player.specialRoles.includes('JUSTICE') && (
              <span>{`⚖️ ${t('game.reveal.justiceRole')}`}</span>
            )}
            {player.specialRoles.includes('LOVER') && (
              <span>
                {`💘 ${t('game.reveal.lover', {
                  name:
                    game.players.find(({ id }) => id === player.loverId)
                      ?.name ?? '',
                })}`}
              </span>
            )}
            {player.specialRoles.includes('AVENGER') && (
              <span>{`⚔️ ${t('game.reveal.avengerRole')}`}</span>
            )}
          </span>
        ) : (
          <>
            <span class="hold-icon">🔒</span>
            <strong>{t('game.reveal.holdToSeeSecretWordPrompt')}</strong>
          </>
        )}
      </button>
      <div
        class="dist-progress"
        aria-label={t('game.reveal.secretWordDistributionProgress')}
      >
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
        {!seen
          ? t('game.reveal.mustViewSecretWord')
          : last
            ? t('game.reveal.startRoundOne')
            : t('game.reveal.passToNextPlayer')}
      </button>
    </section>
  );
}
