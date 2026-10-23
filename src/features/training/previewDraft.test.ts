import { beforeEach, describe, expect, it } from 'vitest';
import { clearFlags, EMPTY_FLAGS, readFlags, writeFlags } from './previewDraft';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe('previewDraft', () => {
  it('round-trips flags and clears them', () => {
    const flags = {
      confirmed: true,
      checkBefore: true,
      removed: { item: { exerciseId: 'e12' } as never, index: 2 },
    };
    writeFlags('k', flags);
    expect(readFlags('k')).toEqual(flags);
    clearFlags('k');
    expect(readFlags('k')).toEqual(EMPTY_FLAGS);
  });
  it.each([
    'not json',
    '42',
    '{"confirmed":"yes","removed":{"item":{},"index":-1}}',
    '{"removed":{"item":{"exerciseId":"x"},"index":1.5}}',
  ])('ignores corrupt data %s', (raw) => {
    store.set('k.flags', raw);
    expect(readFlags('k')).toEqual(EMPTY_FLAGS);
  });
  it('survives a missing sessionStorage', () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = undefined;
    expect(readFlags('k')).toEqual(EMPTY_FLAGS);
    writeFlags('k', EMPTY_FLAGS);
    clearFlags('k');
  });
});
