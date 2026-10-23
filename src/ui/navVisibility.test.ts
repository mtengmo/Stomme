import { describe, expect, it } from 'vitest';
import { navVisible } from './navVisibility';

describe('navVisible', () => {
  it.each([
    '/',
    '/traning/A',
    '/traning/B?workout=x',
    '/pass/A',
    '/historik',
    '/historik/abc',
    '/installningar',
    '/ovningar',
    '/ovning/e12',
    '/granska',
    '/okand-sida',
  ])('shows the nav on %s', (location) => {
    expect(navVisible(location)).toBe(true);
  });
  it.each([
    '/session/abc',
    '/smarta/abc/before',
    '/kansla/abc/dayAfter',
    '/stopp/abc',
    '/session/abc?x=1',
  ])('hides the nav on %s', (location) => {
    expect(navVisible(location)).toBe(false);
  });
});
