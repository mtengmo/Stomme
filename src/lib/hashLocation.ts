import { useHashLocation } from 'wouter/use-hash-location';

/** Keep route queries in the hash, including on static/offline hosting. */
function navigateHash(
  to: string,
  {
    replace = false,
    state = null,
  }: { replace?: boolean; state?: unknown } = {},
) {
  const oldURL = window.location.href;
  const url = new URL(oldURL);
  url.hash = to.startsWith('#') ? to.slice(1) : to;
  window.history[replace ? 'replaceState' : 'pushState'](state, '', url);
  window.dispatchEvent(
    new HashChangeEvent('hashchange', { oldURL, newURL: url.href }),
  );
}

export const useAppHashLocation = Object.assign(
  (): [string, typeof navigateHash] => {
    const [hash] = useHashLocation();
    return [hash.split('?')[0] ?? '/', navigateHash];
  },
  { hrefs: (href: string) => `#${href}` },
);

export function useHashSearch(): string {
  const [hash] = useHashLocation();
  const separator = hash.indexOf('?');
  return separator < 0 ? '' : hash.slice(separator + 1);
}
