import type { ThemeDef } from './types';

/**
 * Hav A (Lagun): Sjöglas: blågrönt rutpapper, djup teal-knapp, korallröd bock.
 * Decided palette (owner approval 2026-10-22), registered in registry.ts. Source:
 * .impeccable/mocks/themes-palettes.md (local, gitignored).
 */
export const hav: ThemeDef = {
  id: 'hav',
  name: 'Hav',
  variant: 'Lagun',
  strategy: 'Committed',
  doneStatement: 'Korallrött: klart är alltid korallröd bock.',
  textMin: 4.5,
  grid: true,
  focus: {
    light: { kind: 'offset' },
    dark: { kind: 'offset' },
  },
  tokens: {
    light: {
      paper: '#dfeeed',
      surface: '#f3f9f8',
      'surface-tint': '#c6e3e0',
      line: '#cde3e0',
      ink: '#0e2a2d',
      'ink-soft': '#35555a',
      edge: '#557a7d',
      action: '#0b5c61',
      'action-ink': '#f3f9f8',
      done: '#a83020',
      accent: '#1d5b94',
      focus: '#1d5b94',
      info: '#1d5b94',
      today: '#f2bb4f',
      'today-ink': '#0e2a2d',
      upcoming: '#d0e4e1',
      'upcoming-ink': '#2c4a4e',
      care: '#4b1d48',
      'care-ink': '#f3f9f8',
      equipment: '#7a5410',
    },
    dark: {
      paper: '#0f2224',
      surface: '#142d30',
      'surface-tint': '#1b3b3e',
      line: '#183336',
      ink: '#e2f1ef',
      'ink-soft': '#a3c0bd',
      edge: '#6f9693',
      action: '#5fc4bd',
      'action-ink': '#0b1f21',
      done: '#ff8f7a',
      accent: '#8cc2ff',
      focus: '#8cc2ff',
      info: '#8cc2ff',
      today: '#f0b54c',
      'today-ink': '#0f2224',
      upcoming: '#1f3b3e',
      'upcoming-ink': '#c0d9d6',
      care: '#f6e1f0',
      'care-ink': '#0f2224',
      equipment: '#e2c070',
    },
  },
};
