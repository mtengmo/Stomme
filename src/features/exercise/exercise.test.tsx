// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
  it('shows name, three tips, mistake and easier variant', () => {
    const ex = exercises['dead-bug'];
    render(<ExerciseCardBody exercise={ex} />);
    expect(screen.getByRole('heading', { name: ex.name })).toBeTruthy();
    for (const t of ex.tips) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByText('Vanligt fel')).toBeTruthy();
    expect(screen.getByText('Enklare variant')).toBeTruthy();
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
});

describe('"Hur gör man?" sheet', () => {
  it('keeps the stepper value when opened and closed', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 0);
    await screen.findByText('Set 1 av 2');
    await user.click(screen.getByRole('button', { name: 'Öka antal' }));
    const before = screen.getByText('11');
    expect(before).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Hur gör man?' }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Så gör du' }),
    ).toBeTruthy();
    expect(
      within(dialog).getByRole('heading', { name: 'Tränar främst' }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Stäng' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('11')).toBeTruthy();
  });

  it('closes on Escape and on the back gesture, restoring focus', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/pass/A';
    render(<App />);
    await user.click(
      await screen.findByRole('button', { name: 'Starta pass' }),
    );
    await answerPain(user, 0);
    await screen.findByText('Set 1 av 2');
    const opener = screen.getByRole('button', { name: 'Hur gör man?' });

    await user.click(opener);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);

    await user.click(opener);
    window.history.back();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Set 1 av 2')).toBeTruthy();
  });

  it('has no side marker or legend for two-sided exercises', () => {
    render(<ExerciseCardBody exercise={exercises['wall-sit']} />);
    expect(screen.queryByText(/och blå linje/)).toBeNull();
    cleanup();
    render(<ExerciseCardBody exercise={exercises['step-up']} side="left" />);
    expect(screen.getByText(/vänster sida arbetar/)).toBeTruthy();
  });
});
