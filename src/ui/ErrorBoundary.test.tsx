// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

afterEach(() => cleanup());

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('shows the Swedish fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: 'Något gick fel' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ladda om' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Inställningar' }).getAttribute('href'),
    ).toBe('/#/installningar');
  });

  it('renders children normally', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeTruthy();
  });
});
