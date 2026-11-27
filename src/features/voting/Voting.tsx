import { t } from '../../i18n';
import { useState } from 'preact/hooks';
import type { Command } from '../../app/game-controller';
import type { Game, Phase } from '../../game/model';
import {
  currentVoter,
  eligibleTargets,
  justicePlayer,
  tally,
  tiedLeaders,
} from '../../game/reducer';
import { living } from '../../game/rules';
import {
  CardTitle,
  Dialog,
  PlayerBadge,
  PlayerGrid,
} from '../../shared/components';
import styles from './Voting.module.css';

type VotePhase = Extract<Phase, { type: 'offline-vote' | 'secret-vote' }>;

export function Voting({
  game,
  phase,
  send,
}: {
  game: Game;
  phase: VotePhase;
  send: (action: Command) => boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const alive = living(game);
  if (phase.type === 'offline-vote') {
    const selected = alive.find(({ id }) => id === phase.selectedId);
    return (
      <section class="glass-card voting-stage">
        <CardTitle
          title={`🗳️ ${t('game.voting.roundPublicVoting', {
            value1: game.roundNumber,
          })}`}
        />
        <p>{t('game.voting.discussAndSelectMostVoted')}</p>
        <PlayerGrid
          players={alive}
          selectedId={phase.selectedId}
          status={({ id }) =>
            id === phase.selectedId
              ? `🎯 ${t('game.voting.selectedForElimination')}`
              : t('game.voting.tapToSelect')
          }
          choose={(id) => send({ type: 'SELECT_OFFLINE', id })}
        />
        <div class={styles.actions}>
          <button
            class="btn btn-secondary"
            onClick={() => send({ type: 'BACK_TO_DISCUSSION' })}
          >
            {`← ${t('game.voting.returnToDescription')}`}
          </button>
          <button
            class="btn btn-danger"
            disabled={!selected}
            onClick={() => setConfirm(true)}
          >
            {`💀 ${t('game.voting.eliminateThisPlayer')}`}
          </button>
        </div>
        {confirm && selected && (
          <Dialog
            title={`💀 ${t('game.voting.eliminatePlayerName', {
              value1: selected.name,
            })}`}
            close={() => setConfirm(false)}
          >
            <p>{t('game.voting.playerRoleWillBeRevealed')}</p>
            <div class="modal-actions">
              <button
                class="btn btn-secondary"
                onClick={() => setConfirm(false)}
              >
                {t('game.voting.cancel')}
              </button>
              <button
                class="btn btn-danger"
                onClick={() => send({ type: 'CONFIRM_OFFLINE' })}
              >
                {`💀 ${t('game.voting.eliminateNow')}`}
              </button>
            </div>
          </Dialog>
        )}
      </section>
    );
  }

  if (phase.step !== 'tally') {
    const voterId = currentVoter(phase);
    const voter = alive.find(({ id }) => id === voterId);
    if (!voter) return null;
    const candidates = eligibleTargets(phase, voter.id);
    const ballotCount =
      Object.values(phase.priorCounts ?? {}).reduce(
        (total, count) => total + count,
        0,
      ) + Object.keys(phase.votes).length;
    return phase.step === 'privacy' ? (
      <section class="glass-card center-stage">
        <CardTitle
          centered
          title={`🔒 ${t('game.voting.secretVotingProgress', {
            value1: ballotCount + 1,
            value2: alive.length,
          })}`}
        />
        <p>{t('game.voting.passDeviceTo')}</p>
        <PlayerBadge player={voter} />
        <button
          class="btn btn-primary"
          onClick={() => send({ type: 'OPEN_BALLOT' })}
        >
          {`🗳️ ${t('game.voting.revealMyBallot')}`}
        </button>
      </section>
    ) : (
      <section class="glass-card voting-stage">
        <CardTitle
          title={`🔒 ${t('game.voting.ballotOfPlayer', { value1: voter.name })}`}
        />
        <p>{t('game.voting.tapToVoteForElimination')}</p>
        <PlayerGrid
          players={alive.filter(({ id }) => candidates.includes(id))}
          status={() => t('game.voting.voteToEliminate')}
          choose={(id) =>
            send({ type: 'CAST_VOTE', voterId: voter.id, targetId: id })
          }
        />
      </section>
    );
  }

  const leaders = tiedLeaders(phase);
  const leadingPlayer = alive.find(({ id }) => id === leaders[0]);
  const justice = justicePlayer(game);
  return (
    <section class="glass-card voting-stage">
      <CardTitle title={`📊 ${t('game.voting.secretVotingResults')}`} />
      <div class={styles.tally}>
        {tally(phase).map(({ id, count }) => {
          const player = alive.find((candidate) => candidate.id === id);
          return (
            <div class="tally-row" key={id}>
              <span>
                {player?.avatar} {player?.name}
              </span>
              <div class="tally-bar-wrap" aria-hidden="true">
                <div
                  class="tally-bar-fill"
                  style={{ width: `${(count / alive.length) * 100}%` }}
                />
              </div>
              <strong>{t('game.voting.voteCount', { count: count })}</strong>
            </div>
          );
        })}
      </div>
      {leaders.length === 1 && leadingPlayer ? (
        <button
          class="btn btn-danger"
          onClick={() => send({ type: 'RESOLVE_VOTES' })}
        >
          {`🃏 ${t('game.voting.revealAndEliminate', { name: leadingPlayer.name })}`}
        </button>
      ) : justice ? (
        <>
          <p>{`⚖️ ${t('game.voting.justiceInstructions', { name: justice.name })}`}</p>
          <PlayerGrid
            players={alive.filter(({ id }) => leaders.includes(id))}
            status={() => t('game.voting.chooseElimination')}
            choose={(targetId) => send({ type: 'RESOLVE_VOTES', targetId })}
          />
        </>
      ) : (
        <>
          <p>{t('game.voting.tiedVoteOptions')}</p>
          <div class={styles.actions}>
            <button
              class="btn btn-primary"
              onClick={() => send({ type: 'REVOTE' })}
            >
              {`🔄 ${t('game.voting.revoteTiedPlayers')}`}
            </button>
            <button
              class="btn btn-secondary"
              onClick={() => send({ type: 'SKIP_TIE' })}
            >
              {`⏭️ ${t('game.voting.skipThisRound')}`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
