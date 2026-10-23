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
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

const CONFIRM =
  'Jag har jämfört övningar, sida och antal med mitt papper från fysioterapeuten.';

beforeEach(async () => {
  sessionStorage.clear();
  window.location.hash = '#/';
  await getDb().delete();
  await getDb().open();
  await setMeta(getDb(), 'onboarding', { acceptedAt: '2026-10-20T08:00:00Z' });
});
afterEach(cleanup);

async function openPhysio(
  user: ReturnType<typeof userEvent.setup>,
  band = true,
) {
  render(<App />);
  await user.click(
    await screen.findByRole('button', {
      name: 'Jag har fysioterapeutens knäprogram (9 övningar)',
    }),
  );
  await user.click(
    screen.getByRole('checkbox', { name: 'Stabil stol eller bänk' }),
  );
  await user.click(
    screen.getByRole('checkbox', { name: 'Vägg eller stabilt stöd' }),
  );
  if (band)
    await user.click(screen.getByRole('checkbox', { name: 'Träningsband' }));
  await user.selectOptions(
    screen.getByRole('combobox', { name: /Arbetande sida/ }),
    'left',
  );
  await user.click(screen.getByRole('button', { name: 'Visa mitt program' }));
  await screen.findByRole('button', { name: 'Börja passet' });
}

const rows = () =>
  within(screen.getByRole('region', { name: /Ditt pass/ })).getAllByRole(
    'listitem',
  );

it('routes from the QuickStart link to a prefilled overview that needs confirmation', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  expect(await getDb().meta.get('training')).toMatchObject({
    value: { programId: 'rehab', rehabFocus: 'knee-physio', rehabSide: 'left' },
  });
  expect(screen.getByText('Knärehab · Fysioterapeutens program')).toBeTruthy();
  expect(screen.getByText(/Gäller bara om ditt papper/)).toBeTruthy();
  expect(
    screen.getByText(/9 av 9 övningar passar din utrustning/),
  ).toBeTruthy();
  expect(rows()).toHaveLength(9);
  expect(screen.getByRole('navigation', { name: 'Huvudmeny' })).toBeTruthy();
  expect(screen.getAllByText(/1 × 5 varv/).length).toBeGreaterThan(0);
  expect(
    screen.getAllByText(/Stegring av övning 4 \(E30 Sittande knästräckning\)/),
  ).toHaveLength(1);
  expect(screen.getByText(/Nästa steg på papperet: övning 5/)).toBeTruthy();
  expect(screen.queryByText(/rekommenderad/i)).toBeNull();

  const start = screen.getByRole('button', {
    name: 'Börja passet',
  }) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  await user.click(screen.getByRole('checkbox', { name: CONFIRM }));
  expect(start.disabled).toBe(false);
});

it('offers 7 of 9 without a band', async () => {
  const user = userEvent.setup();
  await openPhysio(user, false);
  expect(rows()).toHaveLength(7);
  expect(
    screen.getByText(/7 av 9 övningar passar din utrustning/),
  ).toBeTruthy();
});

it('clears the confirmation on any edit and keeps it across a reload', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  await user.click(screen.getByRole('checkbox', { name: CONFIRM }));
  cleanup();
  render(<App />);
  await screen.findByRole('button', { name: 'Börja passet' });
  expect(
    (screen.getByRole('checkbox', { name: CONFIRM }) as HTMLInputElement)
      .checked,
  ).toBe(true);

  await user.click(
    screen.getAllByRole('button', { name: /^Ändra / })[0] as HTMLElement,
  );
  const sets = (await screen.findAllByLabelText('Set', { exact: true }))[0];
  await user.clear(sets as HTMLElement);
  await user.type(sets as HTMLElement, '3');
  expect(
    (screen.getByRole('checkbox', { name: CONFIRM }) as HTMLInputElement)
      .checked,
  ).toBe(false);
  expect(
    (screen.getByRole('button', { name: 'Börja passet' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});

it('lets a saved plan win over the prefill and resets to the start values', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  await user.click(screen.getByRole('button', { name: 'Anpassa passet' }));
  await user.click(await screen.findByRole('button', { name: /E49 · / }));
  await user.click(await screen.findByRole('button', { name: /^Ta bort / }));
  await user.click(screen.getByRole('checkbox', { name: CONFIRM }));
  await user.click(screen.getByRole('button', { name: 'Spara rehabprogram' }));
  await waitFor(async () => {
    const saved = (await getDb().meta.get('rehabPlans'))?.value as Record<
      string,
      unknown[]
    >;
    expect(saved['knee-physio']).toHaveLength(8);
  });
  cleanup();
  sessionStorage.clear();
  render(<App />);
  await screen.findByRole('button', { name: 'Börja passet' });
  expect(rows()).toHaveLength(8);

  await user.click(screen.getByRole('button', { name: 'Anpassa passet' }));
  await user.click(
    await screen.findByText('Återställ till programmets startvärden', {
      selector: 'summary',
    }),
  );
  await user.click(
    screen.getByRole('button', {
      name: 'Återställ till programmets startvärden',
    }),
  );
  await user.click(screen.getByRole('button', { name: 'Visa passöversikt' }));
  expect(rows()).toHaveLength(9);
});
