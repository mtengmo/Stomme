import type { ThemeDef } from './types';

/**
 * Hög kontrast A (Vitt): Svart på rent vitt, gul fokusram, blå bock, mörkröd stopp.
 * Decided palette (owner approval 2026-10-22), not yet registered: phase B adds
 * hog-kontrast.css, the registry entry and the picker row. Source:
 * .impeccable/mocks/themes-palettes.md.
 */
export const hogKontrast: ThemeDef = {
  id: 'hog-kontrast',
  name: 'Hög kontrast',
  variant: 'Vitt',
  strategy: 'Restrained',
  doneStatement: 'Blått: klart är alltid blå bock.',
  textMin: 7,
  grid: false,
  focus: {
    light: { kind: 'double', companion: '#0b0b0b' },
    dark: { kind: 'offset' },
  },
  tokens: {
    light: {
      paper: '#ffffff',
      surface: '#ffffff',
      'surface-tint': '#efefef',
      line: '#c4c4c4',
      ink: '#0b0b0b',
      'ink-soft': '#383838',
      edge: '#595959',
      action: '#0b0b0b',
      'action-ink': '#ffffff',
      done: '#0044cc',
      accent: '#005e66',
      focus: '#ffd500',
      info: '#005e66',
      today: '#ffb000',
      'today-ink': '#0b0b0b',
      upcoming: '#e6e6e6',
      'upcoming-ink': '#0b0b0b',
      care: '#5e0012',
      'care-ink': '#ffffff',
      equipment: '#7a4a00',
    },
    dark: {
      paper: '#000000',
      surface: '#0b0b0b',
      'surface-tint': '#1c1c1c',
      line: '#3d3d3d',
      ink: '#ffffff',
      'ink-soft': '#d9d9d9',
      edge: '#a3a3a3',
      action: '#ffffff',
      'action-ink': '#000000',
      done: '#8fb0ff',
      accent: '#45c08a',
      focus: '#ffd500',
      info: '#45c08a',
      today: '#ffb000',
      'today-ink': '#000000',
      upcoming: '#2a2a2a',
      'upcoming-ink': '#ffffff',
      care: '#ffe6e3',
      'care-ink': '#000000',
      equipment: '#ffb26b',
    },
  },
};
