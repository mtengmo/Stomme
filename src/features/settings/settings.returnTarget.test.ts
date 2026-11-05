import { expect, it } from 'vitest';
import { returnTarget } from './Settings';

it('maps only known tillbaka values to routes', () => {
  expect(returnTarget('tillbaka=nytt-pass')).toBe('/nytt-pass');
  expect(returnTarget('tillbaka=traning')).toBe('/traning/A');
  expect(returnTarget('tillbaka=mitt-program')).toBe('/mitt-program');
  expect(returnTarget('tillbaka=https://evil.example')).toBeUndefined();
  expect(returnTarget('')).toBeUndefined();
});
