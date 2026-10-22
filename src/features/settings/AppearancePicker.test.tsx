// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APPEARANCE_KEY } from '../../lib/appearance';
import { themes } from '../../styles/themes/registry';
import { AppearancePicker } from './AppearancePicker';

const isChecked = (el: HTMLElement) => (el as HTMLInputElement).checked;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-scheme');
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AppearancePicker', () => {
  it('lists every registered theme as a radio, Rutat selected by default', () => {
    render(<AppearancePicker />);
    const group = screen.getByRole('group', { name: 'Färgtema' });
    const radios = group.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(themes.length);
    expect(isChecked(screen.getByRole('radio', { name: /Rutat/ }))).toBe(true);
    expect(isChecked(screen.getByRole('radio', { name: /Lagun/ }))).toBe(false);
  });

  it('applies a theme immediately and stores it', async () => {
    const user = userEvent.setup();
    render(<AppearancePicker />);
    await user.click(screen.getByRole('radio', { name: /Skymning/ }));
    expect(document.documentElement.dataset.theme).toBe('kvallssol');
    expect(
      JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? ''),
    ).toMatchObject({ theme: 'kvallssol' });
    expect(isChecked(screen.getByRole('radio', { name: /Skymning/ }))).toBe(
      true,
    );
  });

  it('defaults the scheme to "Följ telefonen" and switches on choice', async () => {
    const user = userEvent.setup();
    render(<AppearancePicker />);
    expect(
      isChecked(screen.getByRole('radio', { name: 'Följ telefonen' })),
    ).toBe(true);
    await user.click(screen.getByRole('radio', { name: 'Mörkt' }));
    expect(document.documentElement.dataset.scheme).toBe('dark');
    await user.click(screen.getByRole('radio', { name: 'Ljust' }));
    expect(document.documentElement.dataset.scheme).toBe('light');
  });

  it('shows the live swatch words Klar and Idag for each theme', () => {
    render(<AppearancePicker />);
    expect(screen.getAllByText('Klar')).toHaveLength(themes.length);
    expect(screen.getAllByText('Idag')).toHaveLength(themes.length);
  });

  it('puts the selected theme in the tab order', async () => {
    const user = userEvent.setup();
    render(<AppearancePicker />);
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: /Rutat/ }),
    );
  });
});
