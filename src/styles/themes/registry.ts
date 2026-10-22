import { rutat } from './rutat';
import type { ThemeDef } from './types';

export * from './types';

/**
 * Registered themes. Adding a theme = a CSS file under src/styles/themes (both
 * scheme blocks, imported from index.css) plus a ThemeDef here. Palettes that
 * are decided but not yet shipped live beside this file as data
 * (hav.palette.ts, kvallssol.palette.ts, hog-kontrast.palette.ts) and are not
 * registered until their CSS and picker row exist.
 */
export const themes: readonly ThemeDef[] = [rutat];

export const DEFAULT_THEME_ID = 'rutat';

export function getTheme(id: string): ThemeDef | undefined {
  return themes.find((theme) => theme.id === id);
}

export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && getTheme(value) !== undefined;
}
