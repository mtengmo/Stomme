import { expect, it } from 'vitest';
import { coverageAreas, coverageLabels, missingCoverage } from './coverage';

it('names every area and its muscles', () => {
  expect(Object.keys(coverageLabels)).toEqual(Object.keys(coverageAreas));
  expect(coverageAreas.back).toEqual(['back']);
});

it('reports nothing missing for a balanced pass', () => {
  expect(
    missingCoverage(['goblet-chair-squat', 'knee-push-up', 'bird-dog']),
  ).toEqual([]);
  expect(
    missingCoverage([
      'goblet-chair-squat',
      'knee-push-up',
      'back-extension',
      'dead-bug',
    ]),
  ).toEqual([]);
});

it('lists the areas no primary muscle reaches', () => {
  expect(missingCoverage([])).toEqual(['legs', 'press', 'back', 'core']);
  expect(missingCoverage(['knee-push-up', 'calf-raise'])).toEqual([
    'back',
    'core',
  ]);
});
