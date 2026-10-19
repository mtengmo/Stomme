import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** Fills the pain picker and saves: score plus the red flags to switch on. */
export async function answerPain(
  user: UserEvent,
  score: number,
  flags: string[] = [],
) {
  await user.click(
    await screen.findByRole('radio', { name: new RegExp(`^${score}(,|$)`) }),
  );
  for (const f of flags)
    await user.click(screen.getByRole('switch', { name: new RegExp(f) }));
  await user.click(screen.getByRole('button', { name: 'Spara' }));
}
