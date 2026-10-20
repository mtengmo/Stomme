// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { exercises } from '../../content/exercises';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { answerPain } from '../pain/testHelpers';
import { ExerciseCardBody } from './ExerciseCard';

beforeEach(async () => {
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-01T00:00:00Z' });
});
afterEach(() => cleanup());

describe('ExerciseCardBody', () => {
  it('explains the rack grip with a close-up that follows the selected side', async () => {
    const user = userEvent.setup();
    render(<ExerciseCardBody exercise={exercises['kettlebell-rack-carry']} />);
    expect(
      screen.getByRole('figure', {
        name: 'Kettlebellgrepp vid axeln, höger sida',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Handen runt handtaget.')).toBeTruthy();
    expect(screen.getByText('Kulan mot underarmen.')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: /Höger sida · Byt sida/ }),
    );
    expect(
      screen.getByRole('figure', {
        name: 'Kettlebellgrepp vid axeln, vänster sida',
      }),
    ).toBeTruthy();
  });

  it('shows movement, muscles, and all instructions in one reader', () => {
    const ex = exercises['dead-bug'];
    render(<ExerciseCardBody exercise={ex} />);
    expect(screen.getByRole('heading', { name: ex.name })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Rörelsen' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tränar främst' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Hjälper till' })).toBeTruthy();
    expect(screen.getByText('Bål')).toBeTruthy();
    expect(screen.getByText('Inga särskilda muskelgrupper.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Så gör du' })).toBeTruthy();
    for (const t of ex.tips)
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    expect(screen.getByText('Vanligt fel')).toBeTruthy();
    expect(screen.getByText('Enklare variant')).toBeTruthy();
    expect(screen.getByText('Visa muskelkarta')).toBeTruthy();
    expect(screen.getByText('Visa muskelkarta').closest('details')?.open).toBe(
      false,
    );
    expect(screen.queryByText(/Fråga fysioterapeuten/)).toBeNull();
  });

  it('has the physio footnote only for step-up and split squat', () => {
    for (const id of ['step-up', 'split-squat'] as const) {
      const { unmount } = render(<ExerciseCardBody exercise={exercises[id]} />);
      expect(screen.getByText(/Fråga fysioterapeuten/)).toBeTruthy();
      unmount();
    }
    render(<ExerciseCardBody exercise={exercises['wall-sit']} />);
    expect(screen.queryByText(/Fråga fysioterapeuten/)).toBeNull();
  });

  it('reflects the session weight and variant and exposes attributed sources', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseCardBody
        exercise={exercises['goblet-chair-squat']}
        loadIndex={1}
        variantId="dumbbell"
        weightKg={12}
      />,
    );
    expect(screen.getByText('12 kg totalt')).toBeTruthy();
    expect(screen.getByTestId('selected-exercise-variant').textContent).toMatch(
      /Variant:.*hantel/i,
    );
    expect(
      screen.getAllByText('Håll hanteln med båda händerna nära bröstet.')
        .length,
    ).toBeGreaterThan(0);
    await user.click(screen.getByText('Utrustning, nivå och källor'));
    expect(
      screen.getByRole('link', { name: /American Council on Exercise/ }),
    ).toBeTruthy();
  });
});

describe('inline workout technique', () => {
  it('keeps the edited amount while technique opens and closes', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 0);
    await screen.findByText('Set 1 av 2');
    await user.click(screen.getByText('Ändra set', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Öka antal' }));
    await user.click(screen.getByText('Ändra set', { exact: true }));
    const help = screen.getByText('Hur gör man?', { exact: true });
    await user.click(help);
    expect(screen.getByRole('region', { name: 'Teknik' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('region', { name: 'Rörelsen' })).toBeTruthy();
    await user.click(help);
    expect(screen.getByText(/11 rep/)).toBeTruthy();
  });

  it('has no side marker or legend for two-sided exercises', () => {
    render(<ExerciseCardBody exercise={exercises['wall-sit']} />);
    expect(screen.queryByText(/och blå linje/)).toBeNull();
    cleanup();
    render(<ExerciseCardBody exercise={exercises['step-up']} side="left" />);
    expect(screen.getByText(/vänster sida arbetar/)).toBeTruthy();
  });
});
