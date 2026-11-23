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
import { Dialog, PlayerBadge, PlayerGrid } from '../../shared/components';
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
      <section class="glass-card">
        <h1>🗳️ Vòng {game.roundNumber} • Bỏ phiếu ngoài đời</h1>
        <p>Thảo luận, giơ tay và chạm vào người nhận nhiều phiếu nhất.</p>
        <PlayerGrid
          players={alive}
          selectedId={phase.selectedId}
          status={({ id }) =>
            id === phase.selectedId ? '🎯 Đang chọn loại' : 'Chạm để chọn'
          }
          choose={(id) => send({ type: 'SELECT_OFFLINE', id })}
        />
        <div class={styles.actions}>
          <button
            class="btn btn-secondary"
            onClick={() => send({ type: 'BACK_TO_DISCUSSION' })}
          >
            ← Mô tả lại
          </button>
          <button
            class="btn btn-danger"
            disabled={!selected}
            onClick={() => setConfirm(true)}
          >
            💀 Loại người này
          </button>
        </div>
        {confirm && selected && (
          <Dialog
            title={`💀 Loại ${selected.name}?`}
            close={() => setConfirm(false)}
          >
            <p>Vai trò của người chơi sẽ được lật cho cả nhóm xem.</p>
            <div class={styles.actions}>
              <button
                class="btn btn-secondary"
                onClick={() => setConfirm(false)}
              >
                Hủy
              </button>
              <button
                class="btn btn-danger"
                onClick={() => send({ type: 'CONFIRM_OFFLINE' })}
              >
                💀 Loại ngay
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
        <h1>
          🔒 Bỏ phiếu kín • {ballotCount + 1}/{alive.length}
        </h1>
        <p>Chuyền máy cho</p>
        <PlayerBadge player={voter} />
        <button
          class="btn btn-primary"
          onClick={() => send({ type: 'OPEN_BALLOT' })}
        >
          🗳️ Mở phiếu bầu của tôi
        </button>
      </section>
    ) : (
      <section class="glass-card">
        <h1>🔒 Phiếu của {voter.name}</h1>
        <p>Chạm vào người bạn muốn bỏ phiếu loại (phiếu bầu được giữ kín):</p>
        <PlayerGrid
          players={alive.filter(({ id }) => candidates.includes(id))}
          status={() => 'Bỏ phiếu loại'}
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
    <section class="glass-card">
      <h1>📊 Kết quả bỏ phiếu kín</h1>
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
              <strong>{count} phiếu</strong>
            </div>
          );
        })}
      </div>
      {leaders.length === 1 && leadingPlayer ? (
        <button
          class="btn btn-danger"
          onClick={() => send({ type: 'RESOLVE_VOTES' })}
        >
          🃏 Lật vai trò &amp; Loại {leadingPlayer.name}
        </button>
      ) : justice ? (
        <>
          <p>
            ⚖️ {justice.name} là Nữ thần Công lý. Chọn một người trong nhóm hòa.
          </p>
          <PlayerGrid
            players={alive.filter(({ id }) => leaders.includes(id))}
            status={() => 'Chọn loại'}
            choose={(targetId) => send({ type: 'RESOLVE_VOTES', targetId })}
          />
        </>
      ) : (
        <>
          <p>Hòa phiếu. Bầu lại trong nhóm hòa hoặc bỏ qua vòng này.</p>
          <div class={styles.actions}>
            <button
              class="btn btn-primary"
              onClick={() => send({ type: 'REVOTE' })}
            >
              🔄 Bầu lại nhóm hòa
            </button>
            <button
              class="btn btn-secondary"
              onClick={() => send({ type: 'SKIP_TIE' })}
            >
              ⏭️ Bỏ qua vòng này
            </button>
          </div>
        </>
      )}
    </section>
  );
}
