import { t } from '../i18n';
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
    <Dialog title={`📖 ${t('app.help.gameRulesTitle')}`} close={close}>
      <h3>{t('app.help.mainRolesHeading')}</h3>
      <ul>
        <li>
          👨‍🌾 <strong>{t('app.help.civilianRole')}</strong>{' '}
          {t('app.help.civilianObjective')}
        </li>
        <li>
          🕵️ <strong>{t('app.help.undercoverRole')}</strong>{' '}
          {t('app.help.undercoverObjective')}
        </li>
        <li>
          🎩 <strong>{t('app.help.mrWhiteRole')}</strong>{' '}
          {t('app.help.mrWhiteGuessRule')}
        </li>
      </ul>
      <h3>{t('app.help.eachRoundHeading')}</h3>
      <p>{t('app.help.roundInstructions')}</p>
      <h3>{t('app.help.specialRolesHeading')}</h3>
      <ul>
        <li>
          ⚖️ <strong>{t('app.help.justiceRole')}</strong>{' '}
          {t('app.help.justiceBreaksTies')}
        </li>
        <li>
          💘 <strong>{t('app.help.loversRole')}</strong>{' '}
          {t('app.help.loversEliminatedTogether')}
        </li>
        <li>
          ⚔️ <strong>{t('app.help.avengerRole')}</strong>{' '}
          {t('app.help.avengerEliminationChoice')}
        </li>
      </ul>
      <h3>{t('app.help.winningAndScoringHeading')}</h3>
      <p>{t('app.help.winningAndScoringRules')}</p>
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
              <h1>{t('app.brand.undercover')}</h1>
              <span>{t('app.brand.undercoverSubtitle')}</span>
            </div>
          </div>
          <div class="topbar-actions">
            {game && (
              <button
                class="icon-btn"
                aria-label={t('app.navigation.backToSetup')}
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
              aria-label={t('app.navigation.sound')}
              aria-pressed={sound}
              onClick={controller.toggleSound}
            >
              {sound ? '🔊' : '🔇'}
            </button>
            <button
              class="icon-btn"
              aria-label={t('app.navigation.gameRules')}
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
              {`🔒 ${t('app.navigation.cannotReviewPreviousWord')}`}
            </p>
          )}
          {offlineReady && (
            <p class={styles.notice} role="status">
              {`✓ ${t('app.updates.offlineReady')}`}
            </p>
          )}
          {updateAvailable && (
            <div class={styles.update} role="status">
              <div>
                <strong>{t('app.updates.updateAvailable')}</strong>
                {active && <div>{t('app.updates.updateLaterExplanation')}</div>}
                {updateError && <div>{t('app.updates.updateFailed')}</div>}
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
                {t('app.updates.update')}
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
        <Dialog title={`🏠 ${t('app.dialogs.returnToSetupDialog')}`} close={close}>
          <p>{t('app.dialogs.savedGameResumeExplanation')}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" onClick={close}>
              {t('app.dialogs.stayInGame')}
            </button>
            <button
              class="btn btn-primary"
              onClick={() => {
                controller.pause();
                close();
              }}
            >
              {t('app.navigation.backToSetup')}
            </button>
          </div>
        </Dialog>
      )}
      {modal === 'scores' && (
        <Dialog
          title={`🔄 ${t('app.dialogs.clearProfilesAndScoresDialog')}`}
          close={close}
        >
          <p>{t('app.dialogs.clearProfilesAndScoresExplanation')}</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" onClick={close}>
              {t('app.dialogs.cancel')}
            </button>
            <button
              class="btn btn-danger"
              onClick={() => {
                send({ type: 'CLEAR_PROFILES' });
                close();
              }}
            >
              {t('app.dialogs.clearScores')}
            </button>
          </div>
        </Dialog>
      )}
      {(modal === 'discard' || modal === 'start') && (
        <Dialog
          title={
            modal === 'start'
              ? t('app.dialogs.discardSavedGameAndStart')
              : t('app.dialogs.discardSavedGame')
          }
          close={close}
        >
          <div class="modal-actions">
            <button class="btn btn-secondary" onClick={close}>
              {t('app.dialogs.cancel')}
            </button>
            <button
              class="btn btn-danger"
              onClick={() => {
                send({ type: modal === 'start' ? 'START' : 'RESET' });
                close();
              }}
            >
              {modal === 'start'
                ? t('app.dialogs.discardGameAndStart')
                : t('app.dialogs.discardGame')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
