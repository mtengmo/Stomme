import { describe, expect, it } from 'vitest';
import { isTabActive } from './BottomNav';

describe('isTabActive', () => {
  it('matches the root tab only on the root', () => {
    expect(isTabActive('/', '/')).toBe(true);
    expect(isTabActive('/', '/historik')).toBe(false);
  });
  it('keeps exactly one tab active on history and its sub-routes', () => {
    for (const loc of ['/historik', '/historik/abc']) {
      const active = ['/', '/historik', '/installningar'].filter((h) =>
        isTabActive(h, loc),
      );
      expect(active).toEqual(['/historik']);
    }
  });
  it('does not match a similarly prefixed path', () => {
    expect(isTabActive('/historik', '/historikx')).toBe(false);
  });
});
