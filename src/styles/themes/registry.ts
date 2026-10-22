import { hav } from './hav';
import { hogKontrast } from './hog-kontrast';
import { kvallssol } from './kvallssol';
import { rutat } from './rutat';
import type { ThemeDef } from './types';

export * from './types';

/**
 * Registered themes. Adding a theme = a CSS file under src/styles/themes (both
 * scheme blocks, imported from index.css) plus a ThemeDef here, and the id in
 * THEMES of public/theme-boot.js. The picker lists this array in order.
 */
export const themes: readonly ThemeDef[] = [rutat, hav, kvallssol, hogKontrast];

export const DEFAULT_THEME_ID = 'rutat';

export function getTheme(id: string): ThemeDef | undefined {
  return themes.find((theme) => theme.id === id);
}

export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && getTheme(value) !== undefined;
}
