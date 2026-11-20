/**
 * STATE 4 – VOTING PHASE (OFFLINE & SECRET PASS-AND-PLAY)
 */
import { escapeHtml } from '../core/utils.js';
import { SFX } from '../core/audio.js';
import { appState, persistSession, stopAllTimers } from '../core/state.js';
import { callPhase } from '../core/router.js';
import { showDynamicModal, closeDynamicModal, showToast } from '../ui/feedback.js';

export function enterVotingPhase() {
  stopAllTimers();
  SFX.click();
  const game = appState.game;
  game.status = 'VOTING';
  appState.selectedOfflineVoteId = null;

  if (game.config.votingMode === 'secret') {
    const aliveIds = game.players.filter((p) => p.isAlive).map((p) => p.id);
    game.secretVote = {
      stage: 'PRIVACY', // 'PRIVACY' | 'PICK' | 'TALLY'
      voterIds: aliveIds,
      currentVoterIdx: 0,
      allowedTargetIds: aliveIds,
      votes: {}, // targetId -> count
      isRevote: false
    };
  } else {
    game.secretVote = null;
  }

  persistSession();
  renderVoting();
}

export function renderVoting() {
  const game = appState.game;
  const view = document.getElementById('appView');

  // --- MODE A: OFFLINE VOTING ---
  if (game.config.votingMode === 'offline') {
    const alive = game.players.filter((p) => p.isAlive);
    view.innerHTML = `
      <section class="glass-card">
        <div class="round-header">
          <span class="pill-badge orange">🗳️ Vòng ${game.roundNumber} • Bỏ phiếu ngoài đời</span>
        </div>
        <p class="muted mb-12">Cả nhóm thảo luận và giơ tay biểu quyết. Sau đó chạm vào người nhận nhiều phiếu nhất để loại:</p>

        <div class="player-grid">
          ${alive.map((p) => `
            <button type="button" class="player-card clickable ${appState.selectedOfflineVoteId === p.id ? 'selected-target' : ''}" data-offline-target="${p.id}">
              <div class="p-avatar">${p.avatar}</div>
              <div class="p-info">
                <div class="p-name">${escapeHtml(p.name)}</div>
                <div class="p-status">${appState.selectedOfflineVoteId === p.id ? '🎯 Đang chọn loại' : 'Chạm để chọn'}</div>
              </div>
            </button>
          `).join('')}
        </div>

        <div class="btn-row mt-16">
          <button type="button" class="btn btn-secondary" id="btnBackToDesc">← Mô tả lại</button>
          <button type="button" class="btn btn-danger" id="btnConfirmOfflineElim" ${!appState.selectedOfflineVoteId ? 'disabled' : ''}>
            💀 Loại người này
          </button>
        </div>
      </section>
    `;

    view.querySelectorAll('[data-offline-target]').forEach((btn) => {
      btn.addEventListener('click', () => selectOfflineVoteTarget(btn.dataset.offlineTarget));
    });
    view.querySelector('#btnBackToDesc').addEventListener('click', backToDescription);
    view.querySelector('#btnConfirmOfflineElim').addEventListener('click', confirmOfflineElimination);
    return;
  }

  // --- MODE B: SECRET PASS & PLAY VOTING ---
  const sv = game.secretVote;
  if (sv.stage === 'PRIVACY') {
    const voter = game.players.find((p) => p.id === sv.voterIds[sv.currentVoterIdx]);
    view.innerHTML = `
      <div class="center-stage">
        <div class="glass-card" style="padding:30px 20px;">
          <div class="pill-badge orange mb-12">
            🔒 Bỏ phiếu kín ${sv.isRevote ? '(Bầu lại nhóm hòa)' : ''} • ${sv.currentVoterIdx + 1}/${sv.voterIds.length}
          </div>
          <div class="player-badge-lg">${voter.avatar}</div>
          <p class="muted" style="margin:0 0 6px;">Chuyền máy cho</p>
          <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;">${escapeHtml(voter.name)}</h2>
          <p class="muted mb-12">Hãy bí mật chọn người bạn nghi ngờ nhất.</p>
          <button type="button" class="btn btn-orange" id="btnOpenSecretPick">🗳️ Mở phiếu bầu của tôi</button>
        </div>
      </div>
    `;
    view.querySelector('#btnOpenSecretPick').addEventListener('click', openSecretVotePick);
  } else if (sv.stage === 'PICK') {
    const voter = game.players.find((p) => p.id === sv.voterIds[sv.currentVoterIdx]);
    const targets = game.players.filter((p) => p.isAlive && sv.allowedTargetIds.includes(p.id) && p.id !== voter.id);
    const finalTargets = targets.length > 0
      ? targets
      : game.players.filter((p) => p.isAlive && sv.allowedTargetIds.includes(p.id));

    view.innerHTML = `
      <section class="glass-card">
        <div class="round-header">
          <span class="pill-badge orange">🔒 Phiếu của ${escapeHtml(voter.name)}</span>
          <span class="pill-badge">${sv.currentVoterIdx + 1}/${sv.voterIds.length}</span>
        </div>
        <p class="muted mb-12">Chạm vào người bạn muốn bỏ phiếu loại (phiếu bầu được giữ kín):</p>
        <div class="player-grid">
          ${finalTargets.map((t) => `
            <button type="button" class="player-card clickable" data-secret-vote="${t.id}">
              <div class="p-avatar">${t.avatar}</div>
              <div class="p-info">
                <div class="p-name">${escapeHtml(t.name)}</div>
                <div class="p-status">Bỏ phiếu loại</div>
              </div>
            </button>
          `).join('')}
        </div>
      </section>
    `;

    view.querySelectorAll('[data-secret-vote]').forEach((btn) => {
      btn.addEventListener('click', () => castSecretVote(btn.dataset.secretVote));
    });
  } else if (sv.stage === 'TALLY') {
    renderSecretVoteTally();
  }
}

function backToDescription() {
  SFX.click();
  appState.game.status = 'DESCRIPTION';
  persistSession();
  callPhase('DESCRIPTION');
}

function selectOfflineVoteTarget(id) {
  SFX.click();
  appState.selectedOfflineVoteId = id;
  renderVoting();
}

function confirmOfflineElimination() {
  const game = appState.game;
  const target = game.players.find((p) => p.id === appState.selectedOfflineVoteId);
  if (!target) return;

  SFX.click();
  const box = showDynamicModal(`
    <div class="modal-header">
      <h3>⚠️ Xác nhận loại người chơi</h3>
      <button type="button" class="icon-btn" data-close-dyn aria-label="Đóng">✕</button>
    </div>
    <div style="text-align:center;padding:10px 0;">
      <div class="player-badge-lg">${target.avatar}</div>
      <p style="font-size:16px;margin:0 0 6px;">Bạn có chắc chắn muốn loại <strong>${escapeHtml(target.name)}</strong>?</p>
      <p class="muted" style="margin:0;">Vai trò thật của họ sẽ lập tức được công bố.</p>
    </div>
    <div class="btn-row mt-16">
      <button type="button" class="btn btn-secondary" data-close-dyn>Hủy</button>
      <button type="button" class="btn btn-danger" id="btnExecOfflineElim">💀 Loại ngay</button>
    </div>
  `, true);

  if (!box) return;
  box.querySelectorAll('[data-close-dyn]').forEach((b) => b.addEventListener('click', closeDynamicModal));
  box.querySelector('#btnExecOfflineElim').addEventListener('click', () => {
    closeDynamicModal();
    callPhase('START_ELIMINATION', target.id, 'VOTE');
  });
}

function openSecretVotePick() {
  SFX.click();
  appState.game.secretVote.stage = 'PICK';
  persistSession();
  renderVoting();
}

function castSecretVote(targetId) {
  SFX.click();
  const sv = appState.game.secretVote;
  sv.votes[targetId] = (sv.votes[targetId] || 0) + 1;

  if (sv.currentVoterIdx + 1 < sv.voterIds.length) {
    sv.currentVoterIdx++;
    sv.stage = 'PRIVACY';
  } else {
    sv.stage = 'TALLY';
    SFX.flip();
  }
  persistSession();
  renderVoting();
}

function renderSecretVoteTally() {
  const game = appState.game;
  const sv = game.secretVote;
  const view = document.getElementById('appView');

  const entries = sv.allowedTargetIds.map((id) => {
    const p = game.players.find((pl) => pl.id === id);
    return { player: p, count: sv.votes[id] || 0 };
  }).sort((a, b) => b.count - a.count);

  const maxVotes = entries.length > 0 ? entries[0].count : 0;
  const tied = entries.filter((e) => e.count === maxVotes && maxVotes > 0);
  const totalVotes = sv.voterIds.length || 1;
  const aliveJustice = game.players.find((p) => p.isAlive && p.specialRoles.includes('JUSTICE'));

  let actionBlock = '';
  if (tied.length === 1) {
    const doomed = tied[0].player;
    actionBlock = `
      <div style="text-align:center;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
        <div style="font-size:15px;margin-bottom:12px;">
          <strong>${doomed.avatar} ${escapeHtml(doomed.name)}</strong> nhận nhiều phiếu nhất (${maxVotes} phiếu)!
        </div>
        <button type="button" class="btn btn-danger" data-elim-id="${doomed.id}">
          🃏 Lật vai trò & Loại ${escapeHtml(doomed.name)}
        </button>
      </div>
    `;
  } else {
    const tiedNames = tied.map((t) => t.player.name).join(', ');
    if (aliveJustice) {
      actionBlock = `
        <div style="margin-top:16px;padding:14px;border-radius:16px;background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.5);">
          <div style="font-weight:800;color:#fde68a;margin-bottom:6px;">⚖️ HÒA PHIẾU! Quyền của Nữ thần Công lý</div>
          <div class="muted mb-12" style="color:#fef3c7;">
            Có sự hòa phiếu giữa: <strong>${escapeHtml(tiedNames)}</strong>.<br>
            Mời <strong>Nữ thần Công lý</strong> chọn trực tiếp 1 người trong nhóm hòa dưới đây để loại:
          </div>
          <div class="player-grid">
            ${tied.map((t) => `
              <button type="button" class="player-card clickable" data-elim-id="${t.player.id}">
                <div class="p-avatar">${t.player.avatar}</div>
                <div class="p-info">
                  <div class="p-name">${escapeHtml(t.player.name)}</div>
                  <div class="p-status" style="color:#fde68a">⚖️ Chọn loại</div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      actionBlock = `
        <div style="margin-top:16px;padding:14px;border-radius:16px;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.45);text-align:center;">
          <div style="font-weight:800;margin-bottom:6px;">🤝 HÒA PHIẾU (${maxVotes} phiếu)!</div>
          <div class="muted mb-12">Các người chơi bằng phiếu: <strong>${escapeHtml(tiedNames)}</strong></div>
          <div class="btn-row">
            <button type="button" class="btn btn-orange" id="btnTieRevote">🔄 Bầu lại nhóm hòa</button>
            <button type="button" class="btn btn-secondary" id="btnSkipRound">⏭️ Bỏ qua vòng này</button>
          </div>
        </div>
      `;
    }
  }

  view.innerHTML = `
    <section class="glass-card">
      <div class="round-header">
        <span class="pill-badge orange">📊 Kết quả bỏ phiếu kín</span>
      </div>
      <div style="margin-top:10px;">
        ${entries.map((e) => {
          const pct = Math.round((e.count / totalVotes) * 100);
          return `
            <div class="tally-row">
              <div style="width:120px;display:flex;align-items:center;gap:6px;overflow:hidden;">
                <span>${e.player.avatar}</span>
                <span style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(e.player.name)}</span>
              </div>
              <div class="tally-bar-wrap">
                <div class="tally-bar-fill" style="width:${pct}%"></div>
              </div>
              <div style="width:44px;text-align:right;font-weight:800;font-size:14px;">${e.count} 🗳️</div>
            </div>
          `;
        }).join('')}
      </div>
      ${actionBlock}
    </section>
  `;

  view.querySelectorAll('[data-elim-id]').forEach((btn) => {
    btn.addEventListener('click', () => callPhase('START_ELIMINATION', btn.dataset.elimId, 'VOTE'));
  });

  const btnRevote = view.querySelector('#btnTieRevote');
  if (btnRevote) {
    const tiedIds = tied.map((t) => t.player.id);
    btnRevote.addEventListener('click', () => startTieRevote(tiedIds));
  }

  const btnSkip = view.querySelector('#btnSkipRound');
  if (btnSkip) btnSkip.addEventListener('click', skipRoundNoElimination);
}

function startTieRevote(tiedIds) {
  SFX.click();
  const game = appState.game;
  const aliveIds = game.players.filter((p) => p.isAlive).map((p) => p.id);
  game.secretVote = {
    stage: 'PRIVACY',
    voterIds: aliveIds,
    currentVoterIdx: 0,
    allowedTargetIds: tiedIds,
    votes: {},
    isRevote: true
  };
  persistSession();
  renderVoting();
}

function skipRoundNoElimination() {
  SFX.click();
  showToast('Không có ai bị loại ở vòng này. Sang vòng tiếp theo!');
  appState.game.roundNumber++;
  callPhase('ENTER_DESCRIPTION');
}
