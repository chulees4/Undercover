import { useEffect, useState } from 'preact/hooks';
import { CustomWords } from '../features/custom-words/CustomWords';
import { Description } from '../features/description/Description';
import { Elimination } from '../features/elimination/Elimination';
import { Results } from '../features/results/Results';
import { Reveal } from '../features/reveal/Reveal';
import { Setup } from '../features/setup/Setup';
import { Voting } from '../features/voting/Voting';
import { observePwa } from '../infrastructure/pwa';
import { Dialog } from '../shared/components';
import type { bootstrap } from './bootstrap';
import styles from './App.module.css';

type Modal = 'rules' | 'words' | 'home' | 'scores' | 'discard' | 'start';

function Rules({ close }: { close: () => void }) {
  return (
    <Dialog title="📖 Luật chơi Undercover" close={close}>
      <h3>Vai trò chính</h3>
      <ul>
        <li>
          👨‍🌾 <strong>Dân thường</strong> nhận cùng một từ khóa và tìm người giả
          mạo.
        </li>
        <li>
          🕵️ <strong>Gián điệp</strong> nhận một từ tương tự và cố hòa vào nhóm.
        </li>
        <li>
          🎩 <strong>Mũ Trắng</strong> không có từ khóa. Khi bị loại, họ có 20
          giây để đoán từ của Dân thường.
        </li>
      </ul>
      <h3>Mỗi vòng chơi</h3>
      <p>
        Xem từ riêng, lần lượt mô tả mà không nói thẳng từ khóa, rồi bỏ phiếu
        loại một người. Có thể giơ tay hoặc bỏ phiếu kín trên máy.
      </p>
      <h3>Vai trò mở rộng</h3>
      <ul>
        <li>
          ⚖️ <strong>Nữ thần Công lý</strong> còn sống quyết định khi bỏ phiếu
          kín hòa.
        </li>
        <li>
          💘 <strong>Cặp đôi Người tình</strong> bị loại cùng nhau.
        </li>
        <li>
          ⚔️ <strong>Kẻ báo thù</strong> chọn một người khác bị loại cùng mình.
        </li>
      </ul>
      <h3>Thắng cuộc và tính điểm</h3>
      <p>
        Dân thường thắng khi loại hết Gián điệp và Mũ Trắng, mỗi người được 2
        điểm. Phe ẩn danh thắng khi còn tối đa một Dân thường. Người ẩn danh
        sống sót được 6 điểm, hoặc 10 điểm nếu chỉ còn một Gián điệp trong phe.
        Mũ Trắng đoán đúng thắng ngay và được 8 điểm.
      </p>
    </Dialog>
  );
}

export function App({ controller, flip, tick }: ReturnType<typeof bootstrap>) {
  const [snapshot, setSnapshot] = useState(controller.snapshot);
  const [modal, setModal] = useState<Modal | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [backWarning, setBackWarning] = useState(false);
  const [applyUpdate, setApplyUpdate] = useState<() => Promise<void>>(
    () => async () => {},
  );
  useEffect(() => {
    const apply = observePwa(
      () => setUpdateAvailable(true),
      () => setOfflineReady(true),
      () => {
        const { paused, state } = controller.snapshot();
        return paused || !state.game || state.game.phase.type === 'results';
      },
    );
    setApplyUpdate(() => apply);
  }, [controller]);
  useEffect(
    () => controller.subscribe(() => setSnapshot(controller.snapshot())),
    [controller],
  );
  useEffect(() => {
    if (!offlineReady) return;
    const timer = setTimeout(() => setOfflineReady(false), 4500);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  const { state, sound, paused, wordSeen, notice } = snapshot;
  const game = paused ? null : state.game;
  const phase = game?.phase;
  const active = Boolean(game && phase?.type !== 'results');
  const revealSession = phase?.type === 'reveal' ? game?.sessionId : undefined;
  useEffect(() => {
    if (!revealSession) return;
    setBackWarning(false);
    const guard = () =>
      history.pushState({ undercoverReveal: revealSession }, '', location.href);
    if (history.state?.undercoverReveal !== revealSession) guard();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onBack = () => {
      guard();
      setBackWarning(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBackWarning(false), 2600);
    };
    window.addEventListener('popstate', onBack);
    return () => {
      window.removeEventListener('popstate', onBack);
      clearTimeout(timer);
    };
  }, [revealSession]);
  const close = () => setModal(null);
  const send = controller.dispatch;

  function requestStart() {
    if (state.game) {
      setModal('start');
      return;
    }
    send({ type: 'START' });
  }

  function screen() {
    if (!game || !phase)
      return (
        <Setup
          state={state}
          send={send}
          start={requestStart}
          resume={controller.resume}
          manageWords={() => setModal('words')}
          clearProfiles={() => setModal('scores')}
          discard={() => setModal('discard')}
        />
      );
    switch (phase.type) {
      case 'reveal':
        return (
          <Reveal
            key={`${game.sessionId}-${phase.index}`}
            game={game}
            phase={phase}
            seen={wordSeen}
            reveal={controller.markWordSeen}
            send={send}
          />
        );
      case 'description':
        return (
          <Description
            key={game.roundNumber}
            game={game}
            phase={phase}
            send={send}
            tick={tick}
          />
        );
      case 'offline-vote':
      case 'secret-vote':
        return <Voting game={game} phase={phase} send={send} />;
      case 'elimination':
        return (
          <Elimination
            key={phase.target.playerId}
            game={game}
            phase={phase}
            send={send}
            flip={flip}
            tick={tick}
          />
        );
      case 'results':
        return <Results game={game} phase={phase} send={send} />;
    }
  }

  return (
    <>
      <div class="bg-ambient" aria-hidden="true" />
      <div class="app-shell">
        <header class="topbar">
          <div class="brand">
            <span class="brand-logo" aria-hidden="true">
              🕵️
            </span>
            <div class="brand-text">
              <h1>UNDERCOVER</h1>
              <span>Gián Điệp Ẩn Danh</span>
            </div>
          </div>
          <div class="topbar-actions">
            {game && (
              <button
                class="icon-btn"
                aria-label="Về thiết lập"
                onClick={() => {
                  if (active) setModal('home');
                  else send({ type: 'RESET' });
                }}
              >
                🏠
              </button>
            )}
            <button
              class="icon-btn sound-toggle"
              aria-label="Âm thanh"
              aria-pressed={sound}
              onClick={controller.toggleSound}
            >
              {sound ? '🔊' : '🔇'}
            </button>
            <button
              class="icon-btn"
              aria-label="Luật chơi"
              onClick={() => setModal('rules')}
            >
              📖
            </button>
          </div>
        </header>
        <main class="app-main" id="appView">
          {notice && (
            <p class={styles.notice} role="status">
              {notice}
            </p>
          )}
          {revealSession && backWarning && (
            <p class={styles.notice} role="status">
              🔒 Không thể quay lại xem từ khóa của người chơi trước!
            </p>
          )}
          {offlineReady && (
            <p class={styles.notice} role="status">
              ✓ Đã sẵn sàng chơi ngoại tuyến.
            </p>
          )}
          {updateAvailable && (
            <div class={styles.update} role="status">
              <div>
                <strong>Có phiên bản mới.</strong>
                {active && (
                  <div>
                    Bạn có thể cập nhật sau khi kết thúc hoặc về thiết lập.
                  </div>
                )}
                {updateError && <div>Chưa thể cập nhật. Hãy thử lại.</div>}
              </div>
              <button
                class="btn btn-secondary"
                disabled={active}
                onClick={() => {
                  const saved = controller.retryPersistence();
                  setUpdateError(!saved);
                  if (!saved) return;
                  void applyUpdate().catch(() => setUpdateError(true));
                }}
              >
                Cập nhật
              </button>
            </div>
          )}
          {screen()}
        </main>
      </div>
      {modal === 'rules' && <Rules close={close} />}
      {modal === 'words' && (
        <CustomWords close={close} words={state.customWords} send={send} />
      )}
      {modal === 'home' && (
        <Dialog title="🏠 Về màn hình thiết lập?" close={close}>
          <p>
            Ván chơi được lưu tự động. Chọn Tiếp tục ở màn hình thiết lập để
            quay lại.
          </p>
          <div class="modal-actions">
            <button class="btn btn-secondary" onClick={close}>
              Ở lại ván
            </button>
            <button
              class="btn btn-primary"
              onClick={() => {
                controller.pause();
                close();
              }}
            >
              Về thiết lập
            </button>
          </div>
        </Dialog>
      )}
      {modal === 'scores' && (
        <Dialog title="🔄 Xóa hồ sơ và điểm?" close={close}>
          <p>Tên, biểu tượng và điểm đã lưu của người chơi sẽ bị xóa.</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" onClick={close}>
              Hủy
            </button>
            <button
              class="btn btn-danger"
              onClick={() => {
                send({ type: 'CLEAR_PROFILES' });
                close();
              }}
            >
              Xóa điểm
            </button>
          </div>
        </Dialog>
      )}
      {(modal === 'discard' || modal === 'start') && (
        <Dialog
          title={modal === 'start' ? 'Bỏ ván đã lưu và bắt đầu ván mới?' : 'Bỏ ván đã lưu?'}
          close={close}
        >
          <div class="modal-actions">
            <button class="btn btn-secondary" onClick={close}>
              Hủy
            </button>
            <button
              class="btn btn-danger"
              onClick={() => {
                send({ type: modal === 'start' ? 'START' : 'RESET' });
                close();
              }}
            >
              {modal === 'start' ? 'Bỏ ván và bắt đầu' : 'Bỏ ván'}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
