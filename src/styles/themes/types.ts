/** Shared theme types. Pure: no DOM, no React. */

export const TOKEN_NAMES = [
  'paper',
  'surface',
  'surface-tint',
  'line',
  'ink',
  'ink-soft',
  'edge',
  'action',
  'action-ink',
  'done',
  'accent',
  'focus',
  'info',
  'today',
  'today-ink',
  'upcoming',
  'upcoming-ink',
  'care',
  'care-ink',
  'equipment',
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];
export type TokenSet = Record<TokenName, string>;
export type Scheme = 'light' | 'dark';
export const SCHEMES: readonly Scheme[] = ['light', 'dark'];

/**
 * Focus ring. 'offset': one 3 px ring drawn 3 px outside the element, measured
 * against paper and surfaces. 'double': a pale focus colour on a pale page gets
 * an outer ring in `companion` (the focus colour sits between element and ring).
 */
export type FocusStyle =
  | { kind: 'offset' }
  | { kind: 'double'; companion: string };

export type Strategy = 'Restrained' | 'Committed' | 'Full palette';

export interface ThemeDef {
  /** Value of data-theme and of the stored appearance. */
  id: string;
  /** Swedish name shown in the picker. */
  name: string;
  /** Optional Swedish variant name, e.g. 'Lagun'. */
  variant?: string;
  strategy: Strategy;
  /** The one-done-colour rule: what the theme's --done colour is. */
  doneStatement: string;
  /** Minimum text contrast (4.5, or 7 for Hög kontrast). */
  textMin: 4.5 | 7;
  /** Whether the squared-paper grid (--line) is drawn. */
  grid: boolean;
  focus: Record<Scheme, FocusStyle>;
  tokens: Record<Scheme, TokenSet>;
}
