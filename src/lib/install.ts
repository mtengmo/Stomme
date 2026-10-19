import { useSyncExternalStore } from 'react';

/** Chrome's non-standard install prompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable';

let deferred: BeforeInstallPromptEvent | null = null;
let installedEvent = false;
let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version += 1;
  for (const l of listeners) l();
}

/**
 * Starts capturing install events. Call once, early (main.tsx), because
 * beforeinstallprompt can fire before any component has mounted.
 * Returns a cleanup function (used by tests).
 */
export function initInstall(target: Window = window): () => void {
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  };
  const onInstalled = () => {
    deferred = null;
    installedEvent = true;
    emit();
  };
  target.addEventListener('beforeinstallprompt', onPrompt);
  target.addEventListener('appinstalled', onInstalled);
  return () => {
    target.removeEventListener('beforeinstallprompt', onPrompt);
    target.removeEventListener('appinstalled', onInstalled);
    deferred = null;
    installedEvent = false;
    emit();
  };
}

/** True when running as an installed app (standalone display mode). */
export function isInstalled(): boolean {
  if (installedEvent) return true;
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

export function canInstall(): boolean {
  return deferred !== null && !isInstalled();
}

/** Shows the browser's install dialog. The event can only be used once. */
export async function promptInstall(): Promise<InstallResult> {
  const event = deferred;
  if (!event) return 'unavailable';
  deferred = null;
  emit();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** For the settings screen: show the button only when canInstall. */
export function useInstall(): {
  canInstall: boolean;
  installed: boolean;
  prompt: () => Promise<InstallResult>;
} {
  useSyncExternalStore(subscribe, () => version);
  return {
    canInstall: canInstall(),
    installed: isInstalled(),
    prompt: promptInstall,
  };
}
