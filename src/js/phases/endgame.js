/**
 * STATE 6 – ENDGAME, SCORING & CONFETTI CELEBRATION
 */
import { roleLabelVN } from '../../data/avatars.js';
import { LS_KEYS, lsRemove } from '../core/storage.js';
import { escapeHtml } from '../core/utils.js';
import { SFX, vibrate } from '../core/audio.js';
import { appState, persistProfilesFromGame } from '../core/state.js';
import { goToSetup } from '../core/router.js';
import { startConfetti, stopConfetti } from '../ui/confetti.js';
import { startNewGame } from '../engine/gameInit.js';

export function finalizeScoresAndEndGame() {
  const game = appState.game;
  game.status = 'ENDGAME';

  // Reset lastPointsEarned first
  game.players.forEach((p) => { p.lastPointsEarned = 0; });

  if (game.winner === 'CIVILIANS') {
    game.players.forEach((p) => {
      if (p.role === 'CIVILIAN') {
        p.lastPointsEarned = 2;
        p.totalScore += 2;
      }
    });
  } else if (game.winner === 'MR_WHITE_GUESS') {
    const mw = game.players.find((p) => p.id === game.winningMrWhiteId);
    if (mw) {
      mw.lastPointsEarned = 8;
      mw.totalScore += 8;
    }
  } else if (game.winner === 'IMPOSTORS') {
    const survivingImpostors = game.players.filter((p) => p.isAlive && p.role !== 'CIVILIAN');
    const soleUndercover = survivingImpostors.length === 1 && survivingImpostors[0].role === 'UNDERCOVER';
    survivingImpostors.forEach((p) => {
      if (p.role === 'UNDERCOVER') {
        p.lastPointsEarned = soleUndercover ? 10 : 6;
        p.totalScore += p.lastPointsEarned;
      } else if (p.role === 'MR_WHITE') {
        p.lastPointsEarned = 6;
        p.totalScore += 6;
      }
    });
  }

  persistProfilesFromGame();
  lsRemove(LS_KEYS.SESSION); // Game finished, clear resume banner

  SFX.win();
  vibrate([60, 40, 60, 40, 120]);
  renderEndGame();
  startConfetti();
}

export function renderEndGame() {
  const game = appState.game;
  const view = document.getElementById('appView');
  const wp = game.currentWordPair;

  let title = '';
  let subtitle = '';
  let trophy = '🏆';

  if (game.winner === 'CIVILIANS') {
    trophy = '🎉';
    title = 'PHE DÂN THƯỜNG CHIẾN THẮNG!';
    subtitle = 'Toàn bộ Gián điệp & Mũ Trắng đã bị vạch trần.';
  } else if (game.winner === 'MR_WHITE_GUESS') {
    const mw = game.players.find((p) => p.id === game.winningMrWhiteId);
    trophy = '🎩✨';
    title = 'MŨ TRẮNG LẬT KÈO THẮNG LỚN!';
    subtitle = `${mw ? mw.name : 'Mũ Trắng'} đã đoán chính xác từ khóa của Dân thường (+8 điểm)!`;
  } else {
    trophy = '🕵️🔥';
    title = 'PHE ẨN DANH CHIẾN THẮNG!';
    subtitle = 'Gián điệp / Mũ Trắng đã ẩn mình thành công đến phút chót.';
  }

  const sortedPlayers = game.players.slice().sort((a, b) => b.totalScore - a.totalScore);

  view.innerHTML = `
    <section class="glass-card" style="text-align:center;">
      <div style="font-size:52px;margin-bottom:4px;">${trophy}</div>
      <h2 style="margin:0 0 6px;font-size:21px;font-weight:900;background:linear-gradient(90deg,#fde68a,#67e8f9,#f9a8d4);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">
        ${title}
      </h2>
      <p class="muted" style="margin:0;">${escapeHtml(subtitle)}</p>

      <div class="word-reveal-pair">
        <div class="word-box civ">
          <div class="tag">Từ Dân thường</div>
          <div class="word">${escapeHtml(wp.word_civilian)}</div>
        </div>
        <div class="word-box und">
          <div class="tag">Từ Gián điệp</div>
          <div class="word">${escapeHtml(wp.word_undercover)}</div>
        </div>
      </div>
    </section>

    <section class="glass-card">
      <div class="card-title">
        <div class="card-title-left"><span>🏅</span><span>Bảng xếp hạng & Vai trò ván này</span></div>
      </div>
      <div class="score-list">
        ${sortedPlayers.map((p, idx) => {
          const specials = [];
          if (p.specialRoles.includes('JUSTICE')) specials.push('⚖️');
          if (p.specialRoles.includes('LOVER')) specials.push('💘');
          if (p.specialRoles.includes('AVENGER')) specials.push('⚔️');
          return `
            <div class="score-item ${idx === 0 && p.totalScore > 0 ? 'top-1' : ''}">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                <div style="font-weight:900;width:22px;color:${idx === 0 ? '#fbbf24' : 'var(--text-muted)'};">#${idx + 1}</div>
                <div style="font-size:24px;">${p.avatar}</div>
                <div style="min-width:0;flex:1;">
                  <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHtml(p.name)} ${specials.join('')}
                  </div>
                  <div style="margin-top:2px;">
                    <span class="role-chip ${p.role}">${roleLabelVN(p.role)}</span>
                    ${!p.isAlive ? `<span class="muted" style="font-size:11px;margin-left:4px;">• Đã loại</span>` : ''}
                  </div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:17px;font-weight:900;color:#fff;">${p.totalScore} đ</div>
                ${p.lastPointsEarned > 0 ? `<div style="font-size:11px;font-weight:800;color:#34d399;">+${p.lastPointsEarned} đ</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <div class="btn-row">
      <button type="button" class="btn btn-secondary" id="btnBackToSetup">⚙️ Cài đặt / Sửa</button>
      <button type="button" class="btn btn-primary" id="btnPlayNextRound">🔄 Chơi ván tiếp</button>
    </div>
  `;

  view.querySelector('#btnBackToSetup').addEventListener('click', goBackToSetupFromEnd);
  view.querySelector('#btnPlayNextRound').addEventListener('click', () => startNewGame(true));
}

export function goBackToSetupFromEnd() {
  SFX.click();
  stopConfetti();
  appState.game = null;
  goToSetup();
}
