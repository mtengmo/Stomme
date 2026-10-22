import type { ThemeDef } from './types';

/**
 * Kvällssol B (Skymning): Mörkare aprikos, mullbärsknapp, ringblomsgul idag, tallgrön bock, indigo.
 * Decided palette (owner approval 2026-10-22), not yet registered: phase B adds
 * kvallssol.css, the registry entry and the picker row. Source:
 * .impeccable/mocks/themes-palettes.md.
 */
export const kvallssol: ThemeDef = {
  id: 'kvallssol',
  name: 'Kvällssol',
  variant: 'Skymning',
  strategy: 'Full palette',
  doneStatement: 'Tallgrönt: klart är alltid grön bock.',
  textMin: 4.5,
  grid: true,
  focus: {
    light: { kind: 'offset' },
    dark: { kind: 'offset' },
  },
  tokens: {
    light: {
      paper: '#f8d9bf',
      surface: '#fdeee0',
      'surface-tint': '#f0c49c',
      line: '#efcfb2',
      ink: '#2a1520',
      'ink-soft': '#57394a',
      edge: '#84606c',
      action: '#7a2453',
      'action-ink': '#fdeee0',
      done: '#135c43',
      accent: '#3a3f9c',
      focus: '#3a3f9c',
      info: '#3a3f9c',
      today: '#f6b13a',
      'today-ink': '#2a1520',
      upcoming: '#efcdb0',
      'upcoming-ink': '#4a2e3d',
      care: '#1b1630',
      'care-ink': '#fdeee0',
      equipment: '#8a4a0e',
    },
    dark: {
      paper: '#21141c',
      surface: '#2c1a25',
      'surface-tint': '#3e2032',
      line: '#2d1b26',
      ink: '#fbe9dc',
      'ink-soft': '#d6b6bf',
      edge: '#a07f8b',
      action: '#f2a0c8',
      'action-ink': '#21141c',
      done: '#4fbf8f',
      accent: '#b4b8ff',
      focus: '#b4b8ff',
      info: '#b4b8ff',
      today: '#f6b13a',
      'today-ink': '#21141c',
      upcoming: '#3a2833',
      'upcoming-ink': '#e6cbd3',
      care: '#fff4e6',
      'care-ink': '#21141c',
      equipment: '#ff9f50',
    },
  },
};
