// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FigureComparison } from './FigureComparison';

afterEach(() => cleanup());

const svgs = () =>
  [...screen.getByTestId('comparison').querySelectorAll('svg')].map(
    (s) => s.innerHTML,
  );

describe('FigureComparison', () => {
  it('shows both versions, labelled, and their gate results', () => {
    render(<FigureComparison />);
    expect(
      screen.getByRole('heading', { name: 'Figurjämförelse' }),
    ).toBeTruthy();
    expect(screen.getAllByText('Nuvarande').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nyckelrutor + IK').length).toBeGreaterThan(0);
    expect(svgs()).toHaveLength(2);
    // The keyframe version passes; the catalogue one reports violations.
    expect(screen.getAllByTestId('gate-pass')).toHaveLength(1);
    expect(screen.getAllByTestId('gate-fail')).toHaveLength(1);
  });
  it('toggles side and drives both figures from the scrubber', () => {
    render(<FigureComparison />);
    const before = svgs();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.5' } });
    const after = svgs();
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).not.toBe(before[1]);
    const left = screen.getByRole('button', { name: 'Vänster' });
    fireEvent.click(left);
    expect(left.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('comparison').textContent).toContain('V');
    expect(screen.getAllByTestId('gate-pass')).toHaveLength(1);
  });
  it('plays and pauses', () => {
    render(<FigureComparison />);
    fireEvent.click(screen.getByRole('button', { name: 'Spela' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pausa' }));
    expect(screen.getByRole('button', { name: 'Spela' })).toBeTruthy();
  });
  it('disables autoplay and explains it under reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    try {
      render(<FigureComparison />);
      expect(
        (screen.getByRole('button', { name: 'Spela' }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(screen.getByText(/minskad rörelse/)).toBeTruthy();
    } finally {
      window.matchMedia = original;
    }
  });
});
