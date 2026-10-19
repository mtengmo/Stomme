// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exercises } from '../../content/exercises';
import { templates } from '../../content/templates';
import { getDb } from '../../db/db';
import { addWallSit, startSession } from '../../db/repo';
import type { ExerciseId } from '../../domain/types';
import { PassPreview } from './PassPreview';
import { readChoiceDraft, writeChoiceDraft } from './selectionDraft';

const chosen: ExerciseId[] = [
  'split-squat',
  'step-up',
  'single-leg-rdl',
  'bird-dog',
  'side-plank',
];

beforeEach(async () => {
  sessionStorage.clear();
  await getDb().delete();
  await getDb().open();
});
afterEach(cleanup);

describe('pass preview choices', () => {
  it('disables duplicates, retains a draft on remount and resets to the original pass', async () => {
    const user = userEvent.setup();
    const view = render(<PassPreview id="A" />);
    const change = (
      await screen.findAllByRole('button', { name: 'Byt övning' })
    )[0];
    if (!change) throw new Error('Missing exercise choice');
    await user.click(change);
    const select = screen.getByLabelText('Övning i moment 1');
    expect(
      (
        within(select).getByRole('option', {
          name: `${exercises['step-up'].name} – finns redan i passet`,
        }) as HTMLOptionElement
      ).disabled,
    ).toBe(true);
    await user.selectOptions(select, 'split-squat');
    expect(readChoiceDraft('A')?.[0]).toBe('split-squat');
    expect(
      screen.getByRole('link', { name: exercises['split-squat'].name }),
    ).toBeTruthy();
    view.unmount();
    render(<PassPreview id="A" />);
    expect(
      await screen.findByRole('link', { name: exercises['split-squat'].name }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', {
        name: exercises['goblet-chair-squat'].name,
      }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Återställ passet' }));
    expect(
      screen.getByRole('link', { name: exercises['goblet-chair-squat'].name }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: exercises['split-squat'].name }),
    ).toBeNull();
    expect(readChoiceDraft('A')).toBeUndefined();
  });

  it('renders the complete active snapshot including replacements and optional wall sit', async () => {
    const session = await startSession(getDb(), 'A', new Date(), chosen);
    await addWallSit(getDb(), session.id);
    render(<PassPreview id="A" />);
    await screen.findByRole('button', { name: 'Fortsätt passet' });
    const links = screen
      .getAllByRole('listitem')
      .map((item) => within(item).getByRole('link').getAttribute('href'));
    expect(links).toEqual([...chosen, 'wall-sit'].map((id) => `/ovning/${id}`));
    expect(screen.queryByRole('button', { name: 'Byt övning' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Återställ passet' }),
    ).toBeNull();
    expect(screen.getAllByText(/Tränar främst:/)).toHaveLength(6);
  });

  it('validates drafts and keeps A/B drafts independent', () => {
    writeChoiceDraft('A', chosen);
    expect(readChoiceDraft('B')).toBeUndefined();
    expect(readChoiceDraft('A')).toEqual(chosen);
    for (const raw of [
      'null',
      '{}',
      '["unknown"]',
      JSON.stringify(['step-up', ...chosen.slice(1)]),
    ]) {
      sessionStorage.setItem('stomme.pass-choice.v1.A', raw);
      expect(readChoiceDraft('A')).toBeUndefined();
      expect(sessionStorage.getItem('stomme.pass-choice.v1.A')).toBeNull();
    }
    writeChoiceDraft(
      'B',
      templates.B.items.map((item) => item.exerciseId),
    );
    expect(readChoiceDraft('B')).toEqual(
      templates.B.items.map((item) => item.exerciseId),
    );
  });
});
