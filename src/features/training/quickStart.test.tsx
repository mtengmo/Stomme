// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { createSession, setMeta } from '../../db/repo';
import { toLocalDate } from '../../lib/dates';

beforeEach(async () => {
  window.localStorage.setItem('stomme.repCount.manual', '1');
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);
type User = ReturnType<typeof userEvent.setup>;
const next = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Nästa' }));
const checkbox = (name: string) =>
  screen.getByRole('checkbox', { name }) as HTMLInputElement;
const radio = (name: string | RegExp) =>
  screen.getByRole('radio', { name }) as HTMLInputElement;

/** Goal -> days -> emphasis (defaults) and on to the equipment step. */
async function toEquipment(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  await next(user);
  await next(user);
  await screen.findByRole('heading', { name: 'Vad tränar du med?' });
}
/** Ticks dumbbells, goes to the weights step and registers one pair. */
async function addDumbbell(user: User, kg = '5') {
  await user.click(checkbox('Hantlar'));
  await next(user);
  await screen.findByRole('heading', { name: 'Vilka vikter har du?' });
  await user.click(screen.getByRole('button', { name: 'Annan vikt, hantel' }));
  await user.type(screen.getByLabelText('Vikt (kg)'), kg);
  await user.click(screen.getByRole('button', { name: /^Lägg till .* kg/ }));
}

it('Nästa cannot drop an unsaved weight: the fixed button adds it first', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toEquipment(user);
  await user.click(checkbox('Hantlar'));
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Annan vikt, hantel' }));
  expect(screen.queryByRole('button', { name: 'Nästa' })).toBeNull();
  const fixed = screen.getByRole('button', { name: 'Lägg till vikt' });
  expect((fixed as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('Skriv en vikt')).toBeTruthy();
  await user.type(screen.getByLabelText('Vikt (kg)'), '5');
  await user.click(
    screen.getByRole('button', { name: 'Lägg till 5 kg (par)' }),
  );
  expect(screen.getByText('Hantel 5 kg · par')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Nästa' })).toBeTruthy();
});

it('asks one question per screen, hides the nav and keeps answers through Back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad vill du träna?' });
  expect(window.location.hash).toBe('#/kom-igang');
  expect(screen.queryByRole('navigation', { name: 'Huvudmeny' })).toBeNull();
  expect(screen.queryByRole('checkbox')).toBeNull();
  // Two cards, with "Skapa eget pass" and the import as text links.
  expect(screen.getByRole('button', { name: 'Bli starkare' })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Knä- eller rehabprogram' }),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Knärehab' })).toBeNull();
  expect(
    screen
      .getByRole('link', { name: 'Har du en säkerhetskopia? Importera' })
      .getAttribute('href'),
  ).toBe('#/installningar/sakerhetskopia');
  await user.click(screen.getByRole('button', { name: 'Bli starkare' }));
  const days = screen.getByRole('heading', {
    name: 'Hur många dagar i veckan?',
  });
  expect(document.activeElement).toBe(days);
  await user.click(radio('4 dagar'));
  await next(user);
  await user.click(radio('Mer överkropp'));
  await next(user);
  expect(
    screen.getByRole('heading', { name: 'Vad tränar du med?' }),
  ).toBeTruthy();
  expect(screen.getByText(/Alltid med:/)).toBeTruthy();
  expect(screen.queryByRole('checkbox', { name: 'Stabil stol' })).toBeNull();
  await addDumbbell(user);
  expect(screen.getByText('Hantel 5 kg · par')).toBeTruthy();
  await next(user);
  expect(screen.getByRole('group', { name: 'Träningsvana' })).toBeTruthy();
  expect(screen.queryByText(/rekommenderad/i)).toBeNull();
  await user.click(radio(/Viss vana/));
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  expect(checkbox('Hantlar').checked).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  expect(radio('Mer överkropp').checked).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  expect(radio('4 dagar').checked).toBe(true);
  await next(user);
  await next(user);
  await next(user);
  expect(screen.getByText('Hantel 5 kg · par')).toBeTruthy();
  await next(user);
  expect(radio(/Viss vana/).checked).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  // The programme is saved with the answers and the reveal opens.
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Ditt program' }),
  ).toBeTruthy();
  expect(window.location.hash).toBe('#/program?ny=1');
  expect(
    screen.getByRole('link', { name: 'Starta första passet' }),
  ).toBeTruthy();
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'general',
    equipment: ['bodyweight', 'chair', 'support'],
    weights: [{ type: 'dumbbell', kg: 5, count: 2 }],
    experience: 'some',
  });
  const program = (await getDb().meta.get('trainingProgram'))?.value as {
    daysPerWeek: number;
    emphasis: string;
    block: number;
    curated: boolean;
    passes: unknown[];
  };
  expect(program).toMatchObject({
    daysPerWeek: 4,
    emphasis: 'upper',
    block: 1,
    curated: true,
  });
  expect(program.passes).toHaveLength(4);
  expect(await getDb().sessions.count()).toBe(0);
  expect(sessionStorage.getItem('stomme.quickstart.draft')).toBeNull();
});

it('shows days as one radiogroup of five counts with an advisory hint', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  const group = screen.getByRole('radiogroup', { name: 'Dagar i veckan' });
  expect(group.querySelectorAll('input[type=radio]')).toHaveLength(5);
  expect(radio('2 dagar').checked).toBe(true);
  expect(
    screen.getByText(
      'Två pass med minst två dagars mellanrum. Passar bra bredvid löpning.',
    ),
  ).toBeTruthy();
  await user.click(radio('1 dag'));
  expect(screen.getByText(/Ett pass i veckan/)).toBeTruthy();
});

it('offers four emphasis cards where "Vet inte" means the whole body', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  await next(user);
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  expect(radio('Hela kroppen').checked).toBe(true);
  expect(radio('Ben & bål för löpning')).toBeTruthy();
  await user.click(radio('Mer överkropp'));
  await user.click(radio('Vet inte – välj åt mig'));
  expect(radio('Vet inte – välj åt mig').checked).toBe(true);
  expect(radio('Hela kroppen').checked).toBe(false);
  await next(user);
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  const saved = (await getDb().meta.get('trainingProgram'))?.value as {
    emphasis: string;
  };
  expect(saved.emphasis).toBe('full');
});

it('saves bodyweight as body, chair and wall without a weights step', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toEquipment(user);
  expect(screen.getByText('Steg 4 av 5')).toBeTruthy();
  // No focus step any more: the emphasis replaces it.
  expect(screen.queryByRole('radio', { name: 'Välj kroppsdelar' })).toBeNull();
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  const saved = (await getDb().meta.get('training'))?.value as Record<
    string,
    unknown
  >;
  expect(saved).toMatchObject({
    programId: 'general',
    equipment: ['bodyweight', 'chair', 'support'],
    experience: 'new',
  });
  expect(saved.bodyParts).toBeUndefined();
});

it('groups the equipment cards and always includes chair and wall', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toEquipment(user);
  for (const group of ['Vikter', 'Möbler', 'Fast monterat'])
    expect(screen.getByRole('group', { name: group })).toBeTruthy();
  expect(screen.getByRole('group', { name: 'Vikter' }).textContent).toMatch(
    /Hantlar.*Kettlebell.*Träningsband/,
  );
  await user.click(checkbox('Träningssteg'));
  await user.click(checkbox('Fast monterad chinsstång'));
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  const saved = (await getDb().meta.get('training'))?.value as {
    equipment: string[];
  };
  expect(saved.equipment).toEqual([
    'bodyweight',
    'chair',
    'support',
    'step',
    'pull-up-bar',
  ]);
});

it('reaches rehab through its own step with the disclaimer and saves new', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Knä- eller rehabprogram' }),
  );
  await screen.findByRole('heading', { name: 'Vilket knäprogram följer du?' });
  for (const name of [
    'Knärehab',
    'Fysioterapeutens knäprogram',
    'Eget rehabprogram',
  ])
    expect(screen.getByRole('button', { name })).toBeTruthy();
  expect(screen.getByText(/träningsstöd, inte sjukvård/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Knärehab' }));
  expect(screen.queryByRole('button', { name: 'Nästa' })).toBeNull();
  await user.selectOptions(
    screen.getByRole('combobox', { name: /Arbetande sida/ }),
    'right',
  );
  await user.click(screen.getByRole('button', { name: 'Visa mitt pass' }));
  await screen.findByRole('button', { name: 'Starta passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'rehab',
    experience: 'new',
    rehabFocus: 'knee',
    rehabSide: 'right',
  });
  // Rehab never gets a programme.
  expect(await getDb().meta.get('trainingProgram')).toBeUndefined();
});

it('falls back to defaults for an old or damaged draft', async () => {
  sessionStorage.setItem(
    'stomme.quickstart.draft',
    JSON.stringify({
      goal: 'general',
      equipment: ['laser'],
      experience: 7,
      days: 9,
      emphasis: 'x',
    }),
  );
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad tränar du med?' });
  expect(screen.getByText(/Alltid med:/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  expect(radio('2 dagar').checked).toBe(true);
  await next(user);
  expect(radio('Hela kroppen').checked).toBe(true);
});

it('preserves a returning user’s active session and makes resuming the primary action', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'general',
    equipment: ['bodyweight'],
    experience: 'new',
  });
  const session = await createSession(getDb(), {
    templateId: 'A',
    programId: 'general',
    date: toLocalDate(new Date()),
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    programWeek: 1,
    plan: [],
    feedback: {},
    checkins: {
      before: {
        recordedAt: new Date().toISOString(),
        feeling: 'ready',
        symptoms: null,
      },
    },
  });
  const user = userEvent.setup();
  render(<App />);
  const resume = await screen.findByRole('link', {
    name: 'Fortsätt passet',
  });
  expect(resume.getAttribute('href')).toBe(`#/session/${session.id}`);
  expect(
    screen.queryByRole('heading', { name: 'Vad vill du träna?' }),
  ).toBeNull();
  expect(screen.queryByText('Ändra', { exact: true })).toBeNull();
  await user.click(screen.getByRole('link', { name: /^Mitt program/ }));
  // Locked: change of direction is shown but is not a link.
  expect((await screen.findByText('Byt inriktning')).closest('a')).toBeNull();
  expect(
    screen.getByText('Avsluta eller avbryt passet innan du byter inriktning.'),
  ).toBeTruthy();
  expect(await getDb().sessions.get(session.id)).toMatchObject({
    status: 'in_progress',
    programId: 'general',
  });
});

it('starts ordinary strength without a mandatory before questionnaire', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'general',
    equipment: ['bodyweight'],
    experience: 'some',
  });
  window.location.hash = '#/traning/A';
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Starta passet' }),
  );
  await screen.findByRole('button', { name: 'Klar set' });
  expect(
    screen.queryByRole('heading', { name: 'Hur känns kroppen?' }),
  ).toBeNull();
  expect(await getDb().sessions.count()).toBe(1);
});

it('keeps first-use answers when leaving through the import link and coming back', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toEquipment(user);
  await addDumbbell(user);
  window.location.hash = '#/installningar/sakerhetskopia';
  await screen.findByRole('heading', { name: 'Säkerhetskopia' });
  expect(screen.queryByText('Hantel 5 kg · par')).toBeNull();
  await user.click(screen.getByRole('link', { name: 'Idag' }));
  await screen.findByText('Hantel 5 kg · par');
  expect(window.location.hash).toBe('#/kom-igang');
});

it('builds your own first workout: nothing is saved until Skapa pass', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', { name: 'Skapa eget pass' }),
  );
  await next(user);
  await user.click(screen.getByRole('radio', { name: /Viss vana/ }));
  expect(screen.getByText('Steg 3 av 4')).toBeTruthy();
  await next(user);
  const heading = screen.getByRole('heading', { name: 'Välj dina övningar' });
  expect(document.activeElement).toBe(heading);
  expect(screen.getByText('Steg 4 av 4')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Nästa' })).toBeNull();
  const create = screen.getByRole('button', {
    name: 'Skapa pass',
  }) as HTMLButtonElement;
  expect(create.disabled).toBe(true);
  expect(screen.getByText('Välj minst en övning.')).toBeTruthy();
  expect(screen.getByText('Inga övningar valda än.')).toBeTruthy();

  const rows = screen.getAllByRole('button', { name: /^Välj: / });
  await user.click(rows[0] as HTMLElement);
  await user.click(rows[1] as HTMLElement);
  expect(screen.getByText(/2 av 12 övningar/)).toBeTruthy();
  expect(screen.getByText(/ca \d+ min/)).toBeTruthy();
  expect(create.disabled).toBe(false);
  expect(await getDb().meta.get('training')).toBeUndefined();
  expect(await getDb().meta.get('customWorkouts')).toBeUndefined();

  // Back keeps the picks.
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await next(user);
  expect(screen.getByText(/2 av 12 övningar/)).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Skapa pass' }));
  await screen.findByRole('button', { name: 'Starta passet' });
  expect((await getDb().meta.get('training'))?.value).toMatchObject({
    programId: 'general',
    experience: 'some',
    equipment: ['bodyweight', 'chair', 'support'],
  });
  const workouts = (await getDb().meta.get('customWorkouts'))?.value as {
    name: string;
    exerciseIds: string[];
  }[];
  expect(workouts).toHaveLength(1);
  expect(workouts[0]?.exerciseIds).toHaveLength(2);
  expect(workouts[0]?.name).toMatch(/^Eget pass /);
  expect(await getDb().sessions.count()).toBe(0);
  expect(sessionStorage.getItem('stomme.quickstart.draft')).toBeNull();
  expect(sessionStorage.getItem('stomme.quickstart.selection')).toBeNull();
  expect(screen.getByLabelText('Namn på passet')).toBeTruthy();
});

it('forgets the picks when another goal is chosen', async () => {
  sessionStorage.setItem('stomme.quickstart.selection', JSON.stringify(['E1']));
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  expect(sessionStorage.getItem('stomme.quickstart.selection')).toBeNull();
});

it('never reaches the pick step for knee rehab', async () => {
  sessionStorage.setItem(
    'stomme.quickstart.draft',
    JSON.stringify({ goal: 'knee', step: 'pick' }),
  );
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad har du hemma?' });
  expect(
    screen.queryByRole('heading', { name: 'Välj dina övningar' }),
  ).toBeNull();
});

it('shows the pain guidance on the rehab card on first run', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'Vad vill du träna?' });
  expect(
    screen.getByText('Har du ont eller en skada? Följ din vårdgivare.'),
  ).toBeTruthy();
});

it('sends a user with saved preferences from /kom-igang to home', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'general',
    equipment: ['bodyweight'],
    experience: 'new',
  });
  window.location.hash = '#/kom-igang';
  render(<App />);
  await screen.findByRole('link', { name: 'Starta passet' });
  expect(window.location.hash).toBe('#/');
  expect(screen.getByRole('navigation', { name: 'Huvudmeny' })).toBeTruthy();
});

it('opens the days step for an existing user and remakes the programme, keeping the preferences', async () => {
  const { seedProgram } = await import('../program/programFixtures');
  const old = await seedProgram(3);
  const before = (await getDb().meta.get('training'))?.value;
  window.location.hash = '#/kom-igang?steg=days';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Hur många dagar i veckan?' });
  expect(radio('3 dagar').checked).toBe(true);
  expect(screen.getByText('Steg 1 av 3')).toBeTruthy();
  await user.click(radio('4 dagar'));
  await next(user);
  await user.click(radio('Ben & bål för löpning'));
  await next(user);
  await screen.findByRole('heading', { name: 'Hur vill du lägga upp passen?' });
  expect(screen.getByText('Steg 3 av 4')).toBeTruthy();
  await next(user);
  // The level step starts on the saved level.
  await screen.findByRole('heading', {
    name: 'Hur van är du vid styrketräning?',
  });
  expect(radio('Ny eller på väg tillbaka').checked).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Gör om programmet' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  expect(window.location.hash).toBe('#/program?ny=1');
  const program = (await getDb().meta.get('trainingProgram'))?.value as {
    id: string;
    daysPerWeek: number;
    emphasis: string;
    seed?: number;
  };
  expect(program).toMatchObject({
    daysPerWeek: 4,
    emphasis: 'run',
    level: 'new',
    curated: true,
  });
  expect(typeof program.seed).toBe('number');
  expect(program.id).not.toBe(old.id);
  expect((await getDb().meta.get('training'))?.value).toEqual(before);
});

it('lets the programme change pick a level and saves it with the preferences', async () => {
  const { seedProgram } = await import('../program/programFixtures');
  await seedProgram(3);
  window.location.hash = '#/kom-igang?steg=days';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Hur många dagar i veckan?' });
  await next(user);
  await next(user);
  await user.click(radio('Viss vana'));
  await user.click(screen.getByRole('button', { name: 'Gör om programmet' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  const program = (await getDb().meta.get('trainingProgram'))?.value as {
    level: string;
    curated: boolean;
  };
  expect(program).toMatchObject({ level: 'some', curated: false });
  expect(
    (await getDb().meta.get('training'))?.value as { experience: string },
  ).toMatchObject({ experience: 'some' });
  expect(screen.getByText(/^Nivå: Viss vana/)).toBeTruthy();
});

it('does not open the programme change for rehab', async () => {
  await setMeta(getDb(), 'training', {
    programId: 'rehab',
    rehabFocus: 'knee',
    equipment: ['bodyweight'],
    experience: 'new',
  });
  window.location.hash = '#/kom-igang?steg=days';
  render(<App />);
  await screen.findByRole('link', { name: 'Visa nästa pass' });
  expect(window.location.hash).toBe('#/');
});

/** Goal -> 1 day -> running emphasis, stopping on the plan step. */
async function toPlan(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Bli starkare' }));
  await user.click(radio('1 dag'));
  await next(user);
  await user.click(radio('Ben & bål för löpning'));
  await next(user);
  await screen.findByRole('heading', { name: 'Hur vill du lägga upp passen?' });
}

it('offers the plan step only for running emphasis, with automatic as default', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toPlan(user);
  expect(screen.getByText('Steg 4 av 6')).toBeTruthy();
  expect(screen.queryByRole('navigation', { name: 'Huvudmeny' })).toBeNull();
  expect(radio('Automatiskt program').checked).toBe(true);
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  for (const name of ['Löpstyrka', 'Löparens tio', 'Hemmapass för löpare'])
    expect(radio(name).checked).toBe(false);
  expect(screen.queryByRole('radio', { name: /helkroppspass/ })).toBeNull();
  // Back keeps the emphasis, forward keeps the plan.
  await user.click(radio('Löpstyrka'));
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  expect(radio('Ben & bål för löpning').checked).toBe(true);
  await next(user);
  expect(radio('Löpstyrka').checked).toBe(true);
  // Another emphasis drops the step.
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(radio('Hela kroppen'));
  await next(user);
  expect(
    screen.getByRole('heading', { name: 'Vad tränar du med?' }),
  ).toBeTruthy();
  expect(screen.getByText('Steg 4 av 5')).toBeTruthy();
});

it('saves a ready workout as the only pass of a one day programme', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toPlan(user);
  await user.click(radio('Löpstyrka'));
  await next(user);
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  expect(window.location.hash).toBe('#/program?ny=1');
  const program = (await getDb().meta.get('trainingProgram'))?.value as {
    emphasis: string;
    passes: { ready?: { id: string; name: string } }[];
  };
  expect(program.emphasis).toBe('run');
  expect(program.passes).toHaveLength(1);
  expect(program.passes[0]?.ready).toEqual({
    id: 'running-strength',
    name: 'Löpstyrka',
  });
  expect(
    screen.getByRole('region', { name: 'Nästa pass: Pass 1, Löpstyrka' }),
  ).toBeTruthy();
  expect(screen.queryByText('Armhävning på knä')).toBeNull();
});

it('keeps the generated programme with the automatic plan', async () => {
  const user = userEvent.setup();
  render(<App />);
  await toPlan(user);
  await next(user);
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  const program = (await getDb().meta.get('trainingProgram'))?.value as {
    passes: { ready?: unknown }[];
  };
  expect(program.passes.every((pass) => pass.ready === undefined)).toBe(true);
});

it('offers the plan step when changing the planning and saves the ready pass', async () => {
  const { seedProgram } = await import('../program/programFixtures');
  await seedProgram(3);
  window.location.hash = '#/kom-igang?steg=days';
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Hur många dagar i veckan?' });
  expect(screen.getByText('Steg 1 av 3')).toBeTruthy();
  await next(user);
  await user.click(radio('Ben & bål för löpning'));
  await next(user);
  await screen.findByRole('heading', { name: 'Hur vill du lägga upp passen?' });
  expect(screen.getByText('Steg 3 av 4')).toBeTruthy();
  await user.click(radio('Löparens tio'));
  await next(user);
  await user.click(screen.getByRole('button', { name: 'Gör om programmet' }));
  await screen.findByRole('heading', { level: 1, name: 'Ditt program' });
  expect(window.location.hash).toBe('#/program?ny=1');
  const program = (await getDb().meta.get('trainingProgram'))?.value as {
    daysPerWeek: number;
    passes: { ready?: { id: string } }[];
  };
  expect(program.daysPerWeek).toBe(3);
  expect(program.passes).toHaveLength(3);
  expect(program.passes[0]?.ready?.id).toBe('runner-ten');
  expect(program.passes[1]?.ready).toBeUndefined();
});
