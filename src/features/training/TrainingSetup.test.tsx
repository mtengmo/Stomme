// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { TrainingSetup } from './TrainingHome';

afterEach(cleanup);

const NOTE =
  'För balansklockan är det foten som rör sig; benet du står på tränar balansen.';

it('explains the moving foot under the side picker for the knee programme only', () => {
  const base = {
    programId: 'rehab' as const,
    equipment: [],
    experience: 'new' as const,
  };
  render(
    <TrainingSetup
      current={{ ...base, rehabFocus: 'knee-physio', rehabSide: 'both' }}
      onSaved={() => {}}
    />,
  );
  expect(screen.getByText(NOTE)).toBeTruthy();
  cleanup();
  render(
    <TrainingSetup
      current={{ ...base, rehabFocus: 'knee', rehabSide: 'both' }}
      onSaved={() => {}}
    />,
  );
  expect(screen.queryByText(NOTE)).toBeNull();
});
