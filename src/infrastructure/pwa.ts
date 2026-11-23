import { registerSW } from 'virtual:pwa-register';

export function observePwa(
  updateAvailable: () => void,
  offlineReady: () => void,
  canReload: () => boolean,
) {
  if (!import.meta.env.PROD) return async () => {};
  let registration: ServiceWorkerRegistration | undefined;
  let accepted = false;
  let controlling = false;
  const updateServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh: updateAvailable,
    onOfflineReady: offlineReady,
    onRegisteredSW: (_url, result) => {
      registration = result;
    },
    onNeedReload: () => {
      controlling = true;
      if (accepted && canReload()) window.location.reload();
      else updateAvailable();
    },
  });
  return async () => {
    if (!canReload()) return;
    accepted = true;
    if (controlling || !registration?.waiting) {
      window.location.reload();
      return;
    }
    await updateServiceWorker(true);
  };
}
