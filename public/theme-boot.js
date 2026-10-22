/*
 * Blocking boot script (classic <script src> in <head>, allowed by the CSP):
 * applies the stored appearance before first paint so there is no flash of the
 * wrong theme. Keep in sync with src/lib/appearance.ts (a test runs both).
 * localStorage 'stomme.appearance' = { theme, scheme: 'system'|'light'|'dark' }.
 */
(() => {
  const KEY = 'stomme.appearance';
  // Registered theme ids; a test checks this list against the registry.
  const THEMES = ['rutat'];
  const DEFAULT_THEME = 'rutat';
  const root = document.documentElement;
  const media = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const read = () => {
    let theme = DEFAULT_THEME;
    let scheme = 'system';
    try {
      const stored = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      if (stored && typeof stored === 'object') {
        if (THEMES.indexOf(stored.theme) !== -1) theme = stored.theme;
        if (stored.scheme === 'light' || stored.scheme === 'dark')
          scheme = stored.scheme;
      }
    } catch {
      // storage blocked or corrupt: defaults
    }
    return { theme, scheme };
  };

  const apply = () => {
    const appearance = read();
    const dark =
      appearance.scheme === 'dark' ||
      (appearance.scheme === 'system' && !!media && media.matches);
    root.setAttribute('data-theme', appearance.theme);
    root.setAttribute('data-scheme', dark ? 'dark' : 'light');
    try {
      // Best effort: the stylesheet may not be parsed yet; main.tsx repeats this.
      const paper = window
        .getComputedStyle(root)
        .getPropertyValue('--paper')
        .trim();
      const meta = document.querySelector('meta[name="theme-color"]');
      if (paper && meta) meta.setAttribute('content', paper);
      window.dispatchEvent(new Event('stomme:appearance'));
    } catch {
      // ignore
    }
  };

  apply();
  if (media) {
    const onChange = () => {
      if (read().scheme === 'system') apply();
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  }
})();
