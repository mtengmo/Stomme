// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import type { ExerciseId } from '../../domain/types';
import type { SetStep } from '../../rules/sessionPlan';
import { RestScreen } from './RestScreen';

const frame = {
  title: 'Pass',
  stepId: 1,
  clock: '0:10',
  tally: { items: [], label: '1 av 4 set klara' },
  onAbort: () => {},
};

function show(
  nextId: ExerciseId,
  currentId: ExerciseId,
  setNumber: number,
  extra: { withPreview?: boolean } = {},
) {
  const nextStep: SetStep = {
    kind: 'set',
    exerciseId: nextId,
    planIndex: 0,
    setNumber,
    side: exercises[nextId].perSide ? 'right' : 'both',
  };
  render(
    <RestScreen
      frame={frame}
      restSec={20}
      nextExercise={exercises[nextId]}
      nextStep={nextStep}
      nextTotalSets={2}
      currentExerciseId={currentId}
      nextPreview={extra.withPreview === false ? undefined : { loadIndex: 0 }}
      onContinue={() => {}}
      afterSet
    />,
  );
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

it('shows the coming exercise with its figure and how-to under "Nästa övning"', () => {
  show('dead-bug', 'step-up', 1);
  const region = screen.getByRole('region', { name: 'Nästa övning' });
  expect(
    within(region).getByRole('heading', { name: 'Nästa övning' }),
  ).toBeTruthy();
  expect(region.querySelector('svg')).not.toBeNull();
  expect(
    within(region).getByRole('heading', { name: 'Så gör du' }),
  ).toBeTruthy();
  const tips = loadPresentation(exercises['dead-bug'], 0).tips;
  expect(tips.length).toBeGreaterThan(0);
  for (const tip of tips) expect(within(region).getByText(tip)).toBeTruthy();
  expect(screen.getByText(/Nästa · Set 1 av 2/)).toBeTruthy();
});

it('labels another set of the same exercise "Nästa set"', () => {
  show('dead-bug', 'dead-bug', 2);
  const region = screen.getByRole('region', { name: 'Nästa set' });
  expect(
    within(region).getByRole('heading', { name: 'Nästa set' }),
  ).toBeTruthy();
  expect(region.querySelector('svg')).not.toBeNull();
});

it('shows no preview without a load to base it on', () => {
  show('dead-bug', 'step-up', 1, { withPreview: false });
  expect(screen.queryByRole('region', { name: 'Nästa övning' })).toBeNull();
});
