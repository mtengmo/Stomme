import { describe, expect, it } from 'vitest';
import { isTabActive, tabs } from './BottomNav';

const hrefs = tabs.map((t) => t.href);
const activeFor = (location: string) =>
  hrefs.filter((href) => isTabActive(href, location));

describe('tabs', () => {
  it('are Idag, Övningar, Historik and Mer', () => {
    expect(tabs.map((t) => t.label)).toEqual([
      'Idag',
      'Övningar',
      'Historik',
      'Mer',
    ]);
  });
});

describe('isTabActive', () => {
  it('matches the root tab only on the root and the training flow', () => {
    expect(isTabActive('/', '/')).toBe(true);
    expect(isTabActive('/', '/historik')).toBe(false);
    expect(isTabActive('/', '/ovningar')).toBe(false);
  });
  it('keeps the whole Idag flow on the Idag tab', () => {
    for (const loc of [
      '/',
      '/traning/A',
      '/traning/B',
      '/fokus',
      '/program',
      '/vecka',
      '/kansla/abc/dayAfter',
      '/mitt-program',
    ])
      expect(activeFor(loc), loc).toEqual(['/']);
  });
  it('puts the library, an exercise and the workout builder on Övningar', () => {
    for (const loc of ['/ovningar', '/ovning/E01', '/nytt-pass'])
      expect(activeFor(loc), loc).toEqual(['/ovningar']);
  });
  it('keeps exactly one tab active on history and its sub-routes', () => {
    for (const loc of [
      '/historik',
      '/historik/abc',
      '/historik/ovning/E01',
      '/historik/rapport',
    ])
      expect(activeFor(loc), loc).toEqual(['/historik']);
  });
  it('puts settings and its pages under Mer', () => {
    for (const loc of [
      '/installningar',
      '/installningar/utrustning',
      '/installningar/sakerhetskopia',
    ])
      expect(activeFor(loc), loc).toEqual(['/installningar']);
  });
  it('ignores a query string', () => {
    expect(activeFor('/ovningar?muskel=ben')).toEqual(['/ovningar']);
  });
  it('does not match a similarly prefixed path', () => {
    expect(isTabActive('/historik', '/historikx')).toBe(false);
    expect(isTabActive('/ovningar', '/ovningarx')).toBe(false);
  });
});
