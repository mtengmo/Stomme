// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { App } from '../../App';
import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';

const CONFIRM =
  'Jag har jämfört övningar, sida och antal med mitt papper från fysioterapeuten (krävs för att börja).';

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
  // Chair and support are ticked by default; the band is the user's choice.
  expect(
    (
      screen.getByRole('checkbox', {
        name: 'Stabil stol eller bänk',
      }) as HTMLInputElement
    ).checked,
  ).toBe(true);
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
  Array.from(
    screen
      .getByRole('region', { name: /Ditt pass/ })
      .querySelectorAll('ol > li'),
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
  expect(screen.getAllByText('Stegring av övning 4.')).toHaveLength(1);
  expect(screen.getAllByText('Nästa steg på papperet: övning 5.')).toHaveLength(
    1,
  );
  expect(screen.getAllByText(/Hållningen på 5 sekunder/)).toHaveLength(1);
  expect(
    screen.getAllByText(/Förifyllt från fysioterapeutens knäprogram\./),
  ).toHaveLength(1);
  expect(screen.getByText(/^5\. E51/)).toBeTruthy();
  expect(screen.queryByText(/rekommenderad/i)).toBeNull();

  const start = screen.getByRole('button', {
    name: 'Börja passet',
  }) as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  expect(start.getAttribute('aria-describedby')).toBe(
    screen.getByRole('checkbox', { name: CONFIRM }).closest('label')?.id,
  );
  await user.click(screen.getByRole('checkbox', { name: CONFIRM }));
  expect(start.disabled).toBe(false);
});

it('shows added exercises compactly in the collection and no technique level', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  await user.click(screen.getByRole('button', { name: 'Anpassa passet' }));
  expect(screen.queryByText('Kroppsdel')).toBeNull();
  expect(screen.queryByLabelText('Lägg till övning')).toBeNull();
  expect(screen.queryByText(/Tekniknivå/)).toBeNull();
  await user.click(await screen.findByRole('button', { name: /E49 · / }));
  await user.click(await screen.findByRole('button', { name: /^Ta bort / }));
  await user.click(screen.getByText(/Välj övningar från programmet/));
  expect(screen.getAllByText(/Ingår i passet/)).toHaveLength(8);
  expect(
    (screen.getByRole('button', { name: 'Lägg till E49' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
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

async function startOnly(
  user: ReturnType<typeof userEvent.setup>,
  keep: RegExp,
) {
  await openPhysio(user);
  await user.click(screen.getByRole('button', { name: 'Anpassa passet' }));
  for (;;) {
    const open = screen
      .getAllByRole('button', { expanded: false })
      .find(
        (b) =>
          b.hasAttribute('aria-expanded') &&
          !keep.test(b.textContent ?? '') &&
          /^\d+\. E\d+/.test(b.textContent ?? ''),
      );
    if (!open) break;
    await user.click(open);
    await user.click(await screen.findByRole('button', { name: /^Ta bort / }));
  }
  await user.click(screen.getByRole('checkbox', { name: CONFIRM }));
  await user.click(screen.getByRole('button', { name: 'Börja passet' }));
  await user.click(
    await screen.findByRole('radio', { name: 'Redo att träna' }),
  );
  await user.click(screen.getByRole('radio', { name: 'Nej, inga besvär' }));
  await user.click(screen.getByRole('button', { name: 'Spara och fortsätt' }));
  await screen.findByRole('button', { name: 'Klar set' });
}

it('counts laps on the set screen and says which leg stands', async () => {
  const user = userEvent.setup();
  await startOnly(user, /E53/);
  expect(
    screen.getByText('Räkna varven själv. Tryck Klar set när du är klar.'),
  ).toBeTruthy();
  expect(
    screen.getByText(
      'Den valda sidan är foten som nuddar. Du står på det andra benet.',
    ),
  ).toBeTruthy();
});

it('says which leg moves for the band hip extension', async () => {
  const user = userEvent.setup();
  await startOnly(user, /E52/);
  expect(
    screen.getByText('Den valda sidan är det ben som rör sig.'),
  ).toBeTruthy();
});

const box = () =>
  screen.getByRole('checkbox', { name: CONFIRM }) as HTMLInputElement;

it('untick the confirmation on remove, undo, reorder, add and reset', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  await user.click(screen.getByRole('button', { name: 'Anpassa passet' }));
  await user.click(await screen.findByRole('button', { name: /E49 · / }));
  const act = async (run: () => Promise<void>) => {
    if (!box().checked) await user.click(box());
    expect(box().checked).toBe(true);
    await run();
    expect(box().checked).toBe(false);
  };
  await act(() =>
    user.click(screen.getByRole('button', { name: 'Flytta ned' })),
  );
  await act(() =>
    user.click(screen.getByRole('button', { name: /^Ta bort / })),
  );
  await act(() => user.click(screen.getByRole('button', { name: 'Ångra' })));
  await user.click(screen.getByRole('button', { name: /^Ta bort / }));
  await user.click(screen.getByText(/Välj övningar från programmet/));
  await act(() =>
    user.click(screen.getByRole('button', { name: 'Lägg till E49' })),
  );
  await user.click(
    screen.getByText('Återställ till programmets startvärden', {
      selector: 'summary',
    }),
  );
  await act(() =>
    user.click(
      screen.getByRole('button', {
        name: 'Återställ till programmets startvärden',
      }),
    ),
  );
});

it('drops a stale tick when the draft it belonged to is gone', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  await user.click(box());
  cleanup();
  for (const key of Object.keys(sessionStorage))
    if (
      key.startsWith('stomme.training-draft.') &&
      !key.endsWith('.flags') &&
      !key.endsWith('.editing') &&
      !key.endsWith('.open')
    )
      sessionStorage.removeItem(key);
  render(<App />);
  await screen.findByRole('button', { name: 'Börja passet' });
  expect(box().checked).toBe(false);
});

it('shows the prefill note only for the untouched prefill', async () => {
  const user = userEvent.setup();
  await openPhysio(user);
  expect(
    screen.getByText(/Förifyllt från fysioterapeutens knäprogram\./),
  ).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Anpassa passet' }));
  await user.click(await screen.findByRole('button', { name: /E49 · / }));
  const sets = screen.getAllByLabelText('Set', {
    exact: true,
  })[0] as HTMLElement;
  await user.clear(sets);
  await user.type(sets, '3');
  await user.click(screen.getByRole('button', { name: 'Visa passöversikt' }));
  expect(
    screen.queryByText(/Förifyllt från fysioterapeutens knäprogram\./),
  ).toBeNull();
});

it('lists what a missing band left out and lets the user fix it', async () => {
  const user = userEvent.setup();
  await openPhysio(user, false);
  expect(rows()).toHaveLength(7);
  expect(
    screen.getByText(/Saknas: träningsband \(övning 5, 7\)\./),
  ).toBeTruthy();
  expect(
    screen.getByText(
      /Papperets övning 5: Knästräckning med gummiband – kräver träningsband/,
    ),
  ).toBeTruthy();
  expect(
    screen.getByText(
      /Papperets övning 7: Höftextension med gummiband – kräver träningsband/,
    ),
  ).toBeTruthy();
  await user.click(screen.getByRole('link', { name: 'Ändra utrustning' }));
  await user.click(
    await screen.findByRole('checkbox', { name: 'Träningsband' }),
  );
  await user.click(
    screen.getByRole('button', { name: 'Spara träningsinriktning' }),
  );
  await screen.findByRole('button', { name: 'Börja passet' });
  expect(rows()).toHaveLength(9);
  expect(screen.queryByText(/Saknas:/)).toBeNull();
});

it('explains the band at its checkbox and keeps explicit choices', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(
    await screen.findByRole('button', {
      name: 'Jag har fysioterapeutens knäprogram (9 övningar)',
    }),
  );
  expect(
    screen.getByText('Träningsband behövs för övning 5 och 7.'),
  ).toBeTruthy();
  const chair = screen.getByRole('checkbox', {
    name: 'Stabil stol eller bänk',
  }) as HTMLInputElement;
  expect(chair.checked).toBe(true);
  expect(
    (screen.getByRole('checkbox', { name: 'Träningsband' }) as HTMLInputElement)
      .checked,
  ).toBe(false);
  await user.click(chair);
  await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
  await user.click(
    screen.getByRole('button', {
      name: 'Jag har fysioterapeutens knäprogram (9 övningar)',
    }),
  );
  expect(
    (
      screen.getByRole('checkbox', {
        name: 'Stabil stol eller bänk',
      }) as HTMLInputElement
    ).checked,
  ).toBe(false);
});
