// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { readTrainingProgram } from '../../db/program';
import { setMeta } from '../../db/repo';
import { programSession, seedProgram } from './programFixtures';

beforeEach(async () => {
  window.localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

const startLink = () =>
  screen.getByRole('link', { name: /^(Starta passet|Fortsätt passet)$/ });

it('shows week 1, pass 1 and the start button on a fresh programme', async () => {
  await seedProgram(3);
  render(<App />);
  expect(
    await screen.findByRole('heading', { level: 1, name: /^Vecka 1 av 4/ }),
  ).toBeTruthy();
  expect(screen.getByText('0 av 12 pass')).toBeTruthy();
  expect(
    screen.getByRole('region', { name: /^Nästa pass: Pass 1,/ }),
  ).toBeTruthy();
  expect(
    screen.getByRole('region', { name: /^Därefter: Pass 2,/ }),
  ).toBeTruthy();
  expect(startLink().getAttribute('href')).toBe('#/traning/A?program=1');
  expect(screen.getByText(/\d × \d+ = \d set /)).toBeTruthy();
  // The old Home furniture is gone.
  expect(screen.queryByText(/Träningsvana/)).toBeNull();
  expect(screen.queryByText(/Har du ont eller en skada/)).toBeNull();
  expect(screen.queryByText(/Dagens fokus/)).toBeNull();
  expect(screen.queryByText('Plan framåt och utveckling')).toBeNull();
  // The "Ändra" drawer is gone: the programme actions live under the week header.
  expect(screen.queryByText('Ändra')).toBeNull();
  expect(
    screen.getByRole('link', { name: /^Vecka 1 av 4/ }).getAttribute('href'),
  ).toBe('#/mitt-program');
  expect(
    screen.getByRole('link', { name: 'Träna något annat idag' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Byt övning' }).getAttribute('href'),
  ).toBe('#/traning/A?program=1&byt=alla');
  expect(screen.queryByText('Se din utveckling')).toBeNull();
  expect(screen.queryByText('Bläddra bland övningar')).toBeNull();
  // No exercise carries an E-code.
  expect(document.body.textContent).not.toMatch(/\bE\d{2}\b/);
});

it('hides Mina pass while no workout is saved and shows it when there is one', async () => {
  await seedProgram(3);
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
  expect(screen.queryByRole('region', { name: 'Mina pass' })).toBeNull();
  expect(screen.queryByText('Inga egna pass än.')).toBeNull();
  cleanup();
  await setMeta(getDb(), 'customWorkouts', [
    { id: 'w1', name: 'Mitt pass', exerciseIds: ['single-leg-rdl'] },
  ]);
  render(<App />);
  expect(await screen.findByRole('region', { name: 'Mina pass' })).toBeTruthy();
});

it('moves to the next pass after a finished one, ignoring an aborted pass', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'completed');
  await programSession(program, 2, 1, 'aborted');
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /^Vecka 1 av 4/ });
  expect(
    screen.getByRole('region', { name: /^Nästa pass: Pass 2,/ }),
  ).toBeTruthy();
  expect(screen.getByText('1 av 12 pass')).toBeTruthy();
  expect(startLink().getAttribute('href')).toBe('#/traning/A?program=2');
});

it('counts a short pass as a finished programme pass', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'completed', 'short');
  render(<App />);
  await screen.findByRole('region', { name: /^Nästa pass: Pass 2,/ });
  expect(screen.getByText('1 av 12 pass')).toBeTruthy();
});

it('advances to week 2 and draws the week tick only once', async () => {
  const program = await seedProgram(2);
  await programSession(program, 1, 1);
  await programSession(program, 2, 1);
  render(<App />);
  expect(
    await screen.findByRole('heading', { level: 1, name: /^Vecka 2 av 4/ }),
  ).toBeTruthy();
  expect(screen.getByText('Vecka 1 klar')).toBeTruthy();
  expect(screen.getByTestId('week-tick').getAttribute('data-animated')).toBe(
    'true',
  );
  cleanup();
  render(<App />);
  await screen.findByText('Vecka 1 klar');
  expect(screen.getByTestId('week-tick').getAttribute('data-animated')).toBe(
    'false',
  );
});

it('offers to continue while a session runs', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'in_progress');
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
  const link = screen.getByRole('link', {
    name: /^(Fortsätt passet|Fortsätt förberedelsen)$/,
  });
  expect(link.getAttribute('href')).toMatch(/^#\/session\//);
});

it('shows the block end and starts block 2 with the same passes', async () => {
  const program = await seedProgram(1);
  for (let week = 1; week <= 4; week++) await programSession(program, 1, week);
  const user = userEvent.setup();
  render(<App />);
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Blocket klart' }),
  ).toBeTruthy();
  expect(screen.getByText('Block 2')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Starta block 2' }));
  await screen.findByRole('heading', { level: 1, name: /^Vecka 1 av 4/ });
  const next = await readTrainingProgram(getDb());
  expect(next?.block).toBe(2);
  expect(next?.id).not.toBe('prog-1');
  expect(next?.passes).toEqual(program.passes);
});

it('says the equipment changed when the next pass keeps fewer than three exercises', async () => {
  const program = await seedProgram(3);
  // Exercises that need a pull-up bar and dip bars, which this kit lacks.
  await getDb().meta.put({
    key: 'trainingProgram',
    value: {
      ...program,
      passes: program.passes.map((pass) => ({
        ...pass,
        exerciseIds: ['chin-up', 'parallel-dip', 'pull-up', 'dumbbell-rdl'],
      })),
    },
  });
  render(<App />);
  expect(
    await screen.findByRole('heading', { name: 'Utrustningen har ändrats' }),
  ).toBeTruthy();
  expect(
    screen.getAllByRole('button', { name: 'Gör om programmet' }).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByRole('link', { name: 'Starta passet' })).toBeNull();
  // "Träna något annat idag" stays reachable, and so does Mitt program.
  expect(
    screen.getByRole('link', { name: 'Träna något annat idag' }),
  ).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Mitt program' })).toBeTruthy();
});

const openMyProgram = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('link', { name: /^Vecka \d av 4/ }));

it('rebuilds the programme only after a confirmation', async () => {
  await seedProgram(3);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
  await openMyProgram(user);
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  await user.click(screen.getByRole('button', { name: /^Gör om programmet/ }));
  expect(
    screen.getByRole('heading', { name: 'Göra om programmet?' }),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Behåll programmet' }));
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  expect((await readTrainingProgram(getDb()))?.id).toBe('prog-1');
  await user.click(screen.getByRole('button', { name: /^Gör om programmet/ }));
  await user.click(
    screen.getByRole('button', { name: 'Gör om programmet nu' }),
  );
  await waitFor(async () =>
    expect((await readTrainingProgram(getDb()))?.id).not.toBe('prog-1'),
  );
  // Back on Idag with the new block.
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
});

it('ends the programme after a confirmation and falls back to the plain Home', async () => {
  await seedProgram(3);
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
  await openMyProgram(user);
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  await user.click(screen.getByRole('button', { name: 'Avsluta programmet' }));
  expect(
    screen.getByRole('heading', { name: 'Avsluta programmet?' }),
  ).toBeTruthy();
  await user.click(
    screen.getByRole('button', { name: 'Avsluta programmet nu' }),
  );
  await screen.findByRole('heading', { level: 1, name: 'Nästa pass' });
  expect(await readTrainingProgram(getDb())).toBeNull();
});

it('offers equipment and change of direction in Mitt program', async () => {
  await seedProgram(3);
  window.location.hash = '#/mitt-program';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  expect(
    screen.getByRole('link', { name: /^Min utrustning/ }).getAttribute('href'),
  ).toBe('#/installningar/utrustning?tillbaka=mitt-program');
  expect(
    screen.getByRole('link', { name: /^Byt inriktning/ }).getAttribute('href'),
  ).toBe('#/?andra=utrustning&tillbaka=mitt-program');
});

it('locks the programme actions while a session runs', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'in_progress');
  // A note means the session is really under way, not just a preparation.
  const [running] = await getDb().sessions.toArray();
  await getDb().sessions.update(running?.id ?? '', { note: 'pågår' });
  window.location.hash = '#/mitt-program';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  for (const name of [/^Gör om programmet/, /^Avsluta programmet/])
    expect(
      (screen.getByRole('button', { name }) as HTMLButtonElement).disabled,
    ).toBe(true);
  expect(
    screen.getByText('Avsluta eller avbryt passet innan du ändrar programmet.'),
  ).toBeTruthy();
});

it('gives each exercise on the lead card a Byt link to the preview editor', async () => {
  await seedProgram(3);
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
  const swaps = screen.getAllByRole('link', { name: /^Byt .+/ });
  const rows = swaps.filter((link) =>
    /#\/traning\/A\?program=1&byt=[\w-]+$/.test(
      link.getAttribute('href') ?? '',
    ),
  );
  expect(rows.length).toBeGreaterThan(2);
});

it('redirects /vecka to Home while a programme is active', async () => {
  await seedProgram(3);
  window.location.hash = '#/vecka';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1 av 4/ });
});

it('labels a programme session in the history as Pass 2 · Vecka 1', async () => {
  const program = await seedProgram(3);
  await programSession(program, 2, 1);
  window.location.hash = '#/historik';
  render(<App />);
  expect(
    (await screen.findAllByText(/Pass 2 · Vecka 1/)).length,
  ).toBeGreaterThan(0);
});

it('keeps "Träna något annat idag" and a Mitt program row on the active Home', async () => {
  await seedProgram(3);
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: /Vecka 1/ });
  expect(
    screen.getByRole('link', { name: 'Träna något annat idag' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Mitt program' }).getAttribute('href'),
  ).toBe('#/mitt-program');
});

it('offers "Träna något annat idag" for a prepared pass but not while a session runs', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'in_progress');
  render(<App />);
  await screen.findByRole('link', { name: 'Fortsätt förberedelsen' });
  expect(
    screen.getByRole('link', { name: 'Träna något annat idag' }),
  ).toBeTruthy();
  cleanup();
  const [session] = await getDb().sessions.toArray();
  await getDb().sessions.update(session?.id ?? '', { note: 'pågår' });
  render(<App />);
  await screen.findByRole('link', { name: 'Fortsätt passet' });
  expect(
    screen.queryByRole('link', { name: 'Träna något annat idag' }),
  ).toBeNull();
});

it('offers "Träna något annat idag" when the block is done', async () => {
  const program = await seedProgram(1);
  for (let week = 1; week <= 4; week++) await programSession(program, 1, week);
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Blocket klart' });
  expect(
    screen.getByRole('link', { name: 'Träna något annat idag' }),
  ).toBeTruthy();
});

it('returns from Min utrustning to Mitt program after saving or cancelling', async () => {
  await seedProgram(3);
  window.location.hash = '#/mitt-program';
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('link', { name: /^Min utrustning/ }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Spara min utrustning' }),
  );
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  await user.click(screen.getByRole('link', { name: /^Min utrustning/ }));
  await user.click(
    await screen.findByRole('link', { name: 'Tillbaka utan att spara' }),
  );
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
});

it('returns from Byt inriktning to Mitt program when cancelled', async () => {
  await seedProgram(3);
  window.location.hash = '#/mitt-program';
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('link', { name: /^Byt inriktning/ }),
  );
  await user.click(
    await screen.findByRole('button', { name: 'Avbryt ändring' }),
  );
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
});

it('shows a locked Byt inriktning as a disabled button', async () => {
  const program = await seedProgram(3);
  await programSession(program, 1, 1, 'in_progress');
  const [running] = await getDb().sessions.toArray();
  await getDb().sessions.update(running?.id ?? '', { note: 'pågår' });
  window.location.hash = '#/mitt-program';
  render(<App />);
  await screen.findByRole('heading', { level: 1, name: 'Mitt program' });
  expect(
    (
      screen.getByRole('button', {
        name: /^Byt inriktning/,
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});
