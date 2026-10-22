/**
 * Device-local appearance: colour theme and light/dark preference.
 * Stored in localStorage 'stomme.appearance' (not in IndexedDB or backups:
 * it is a device preference). public/theme-boot.js applies the same state
 * before first paint; this module is the runtime side (get/set/subscribe).
 */
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
} from '../styles/themes/registry';

export const APPEARANCE_KEY = 'stomme.appearance';
export const APPEARANCE_EVENT = 'stomme:appearance';

export type SchemePreference = 'system' | 'light' | 'dark';

export interface Appearance {
  theme: string;
  scheme: SchemePreference;
}

export const DEFAULT_APPEARANCE: Readonly<Appearance> = {
  theme: DEFAULT_THEME_ID,
  scheme: 'system',
};

export function isSchemePreference(value: unknown): value is SchemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Validates stored text; anything unknown falls back to the defaults. */
export function parseAppearance(raw: string | null): Appearance {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const value = (parsed ?? {}) as Partial<Record<keyof Appearance, unknown>>;
  return {
    theme: isThemeId(value.theme) ? value.theme : DEFAULT_APPEARANCE.theme,
    scheme: isSchemePreference(value.scheme)
      ? value.scheme
      : DEFAULT_APPEARANCE.scheme,
  };
}

export function resolveScheme(
  scheme: SchemePreference,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (scheme === 'system') return prefersDark ? 'dark' : 'light';
  return scheme;
}

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function getAppearance(): Appearance {
  try {
    return parseAppearance(window.localStorage.getItem(APPEARANCE_KEY));
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

/** Sets data-theme and data-scheme on <html> and the theme-color meta. */
export function applyAppearance(
  appearance: Appearance = getAppearance(),
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', appearance.theme);
  root.setAttribute(
    'data-scheme',
    resolveScheme(appearance.scheme, prefersDark()),
  );
  applyThemeColor();
}

/** Points the single theme-color meta at the computed --paper. */
export function applyThemeColor(): void {
  if (typeof document === 'undefined') return;
  const paper = getComputedStyle(document.documentElement)
    .getPropertyValue('--paper')
    .trim();
  if (!paper) return;
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
  }
  if (meta.content !== paper) meta.content = paper;
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Merges a change, validates it, stores it and applies it immediately. */
export function setAppearance(change: Partial<Appearance>): Appearance {
  const next = parseAppearance(
    JSON.stringify({ ...getAppearance(), ...change }),
  );
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: the choice still applies for this page view
  }
  applyAppearance(next);
  emit();
  return next;
}

/** Forgets the stored choice (used by "Radera all data") and applies defaults. */
export function clearAppearance(): void {
  try {
    window.localStorage.removeItem(APPEARANCE_KEY);
  } catch {
    // nothing to clear
  }
  applyAppearance({ ...DEFAULT_APPEARANCE });
  emit();
}

/** Stable snapshot string for useSyncExternalStore ('theme|scheme|resolved'). */
export function appearanceSnapshot(): string {
  const { theme, scheme } = getAppearance();
  const resolved =
    typeof document === 'undefined'
      ? 'light'
      : document.documentElement.dataset.scheme === 'dark'
        ? 'dark'
        : 'light';
  return `${theme}|${scheme}|${resolved}`;
}

/** Display name of a theme id (falls back to the id). */
export function themeName(id: string): string {
  return getTheme(id)?.name ?? id;
}

/**
 * Called once from main.tsx. theme-boot.js has already set the attributes;
 * this keeps the theme-color meta in step with them (also when the boot script
 * reacts to the phone's light/dark switch) and follows changes made in
 * another tab. Returns a cleanup function.
 */
export function initAppearance(): () => void {
  applyThemeColor();
  const onBoot = () => {
    applyThemeColor();
    emit();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === APPEARANCE_KEY || event.key === null) {
      applyAppearance();
      emit();
    }
  };
  window.addEventListener(APPEARANCE_EVENT, onBoot);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, onBoot);
    window.removeEventListener('storage', onStorage);
  };
}
