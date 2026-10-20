import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'installing'
  | 'ready'
  | 'current'
  | 'offline'
  | 'failed'
  | 'unsupported'
  | 'applying';

export interface AppUpdate {
  needRefresh: boolean;
  showBanner: boolean;
  status: UpdateStatus;
  /** A different tab activated the worker; this tab still needs a safe reload. */
  reloadPending: boolean;
  checkForUpdate: () => Promise<void>;
  updateNow: () => Promise<void>;
}

export const UPDATE_INTERVAL = 5 * 60_000;
export const UPDATE_THROTTLE = 60_000;

/** Read the current route at activation time, including before React renders it. */
export function updateIsUnsafe(): boolean {
  return (
    /^#\/(session|smarta|stopp|ovning|kansla|traning)(\/|\?|$)/.test(
      window.location.hash,
    ) || document.querySelector('[role="dialog"][aria-modal="true"]') !== null
  );
}

/** One registration per app. Activation and reload always require local consent. */
export function useAppUpdate(inSession = false): AppUpdate {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [reloadPending, setReloadPending] = useState(false);
  const pending = useRef(false);
  const accepted = useRef(false);
  const unsafe = useRef(inSession);
  unsafe.current = inSession;
  const inFlight = useRef<Promise<void> | undefined>(undefined);
  const lastCheck = useRef(-Infinity);
  const mounted = useRef(true);
  const changeStatus = useCallback((next: UpdateStatus) => {
    if (mounted.current) setStatus(next);
  }, []);
  const needReload = useCallback(() => {
    pending.current = true;
    if (mounted.current) setReloadPending(true);
    changeStatus('ready');
    // Never let another tab's acceptance discard this tab's unfinished inputs.
    if (accepted.current && !unsafe.current && !updateIsUnsafe()) {
      accepted.current = false;
      window.location.reload();
    }
  }, [changeStatus]);
  const {
    needRefresh: [pluginReady],
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (mounted.current && reg) setRegistration(reg);
    },
    onRegisterError() {
      changeStatus(navigator.onLine ? 'failed' : 'offline');
    },
    onNeedReload: needReload,
  });

  const check = useCallback(
    (manual = false): Promise<void> => {
      if (inFlight.current) return inFlight.current;
      if (!navigator.onLine) {
        changeStatus('offline');
        return Promise.resolve();
      }
      if (
        !manual &&
        (document.visibilityState === 'hidden' ||
          Date.now() - lastCheck.current < UPDATE_THROTTLE)
      )
        return Promise.resolve();
      if (!('serviceWorker' in navigator)) {
        changeStatus('unsupported');
        return Promise.resolve();
      }
      lastCheck.current = Date.now();
      changeStatus('checking');
      const task = (async () => {
        try {
          // Also permits a deliberate retry after initial registration failed.
          const reg =
            registration ??
            (await navigator.serviceWorker.getRegistration(
              import.meta.env.BASE_URL,
            )) ??
            (await navigator.serviceWorker.register(
              `${import.meta.env.BASE_URL}sw.js`,
              {
                scope: import.meta.env.BASE_URL,
              },
            ));
          if (!mounted.current) return;
          if (reg !== registration) setRegistration(reg);
          if (pending.current || reg.waiting) {
            changeStatus('ready');
            return;
          }
          if (reg.installing) {
            changeStatus('installing');
            return;
          }
          await reg.update();
          if (pending.current || reg.waiting) changeStatus('ready');
          else if (reg.installing) changeStatus('installing');
          else changeStatus('current');
        } catch {
          changeStatus(navigator.onLine ? 'failed' : 'offline');
        }
      })();
      inFlight.current = task;
      void task.finally(() => {
        if (inFlight.current === task) inFlight.current = undefined;
      });
      return task;
    },
    [registration, changeStatus],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!registration) return;
    const workers = new Map<ServiceWorker, () => void>();
    const observe = () => {
      const worker = registration.installing;
      if (!worker || workers.has(worker)) return;
      const isUpdate =
        !!registration.active || !!navigator.serviceWorker.controller;
      const changed = () => {
        if (worker.state === 'redundant') changeStatus('failed');
        else if (worker.state === 'installed' && isUpdate)
          changeStatus('ready');
        else if (worker.state === 'activated' && !isUpdate)
          changeStatus('current');
        else if (worker.state === 'installing') changeStatus('installing');
      };
      workers.set(worker, changed);
      worker.addEventListener('statechange', changed);
      changed();
    };
    registration.addEventListener('updatefound', observe);
    observe();
    if (registration.waiting) changeStatus('ready');
    void check();
    return () => {
      registration.removeEventListener('updatefound', observe);
      for (const [worker, handler] of workers)
        worker.removeEventListener('statechange', handler);
    };
  }, [registration, check, changeStatus]);

  useEffect(() => {
    const automatic = () => {
      void check();
    };
    const offline = () => changeStatus('offline');
    let controller = navigator.serviceWorker?.controller;
    const controlled = () => {
      const next = navigator.serviceWorker.controller;
      if (controller && next !== controller) needReload();
      controller = next;
    };
    window.addEventListener('focus', automatic);
    window.addEventListener('online', automatic);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', automatic);
    navigator.serviceWorker?.addEventListener('controllerchange', controlled);
    const interval = window.setInterval(automatic, UPDATE_INTERVAL);
    if (!('serviceWorker' in navigator)) changeStatus('unsupported');
    return () => {
      window.removeEventListener('focus', automatic);
      window.removeEventListener('online', automatic);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', automatic);
      navigator.serviceWorker?.removeEventListener(
        'controllerchange',
        controlled,
      );
      window.clearInterval(interval);
    };
  }, [check, changeStatus, needReload]);

  const needRefresh =
    pluginReady ||
    !!registration?.waiting ||
    status === 'ready' ||
    reloadPending;
  const updateNow = async () => {
    if (!needRefresh || unsafe.current || updateIsUnsafe()) return;
    if (pending.current) {
      window.location.reload();
      return;
    }
    const worker = registration?.waiting;
    if (!worker) {
      // Never activate an unfinished installation, even if a plugin flag is stale.
      await check(true);
      return;
    }
    accepted.current = true;
    changeStatus('applying');
    // Workbox's message protocol also works after a registration retry.
    worker.postMessage({ type: 'SKIP_WAITING' });
  };

  return {
    needRefresh,
    showBanner: needRefresh && !inSession,
    status: needRefresh && status !== 'applying' ? 'ready' : status,
    reloadPending,
    checkForUpdate: () => check(true),
    updateNow,
  };
}
