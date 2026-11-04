/**
 * Routes where the bottom navigation is hidden: screens where leaving would lose
 * in-progress input or interrupt an active workout, check-in questions and
 * the stop screen, and the first-use setup /kom-igang (one question per
 * screen; its importing link and Back replace the nav). Everything else (the
 * prepared-workout preview /traning/:id, history, settings, ...) shows the nav,
 * so Historik and Inställningar are always one tap away after the setup.
 */
const HIDDEN_PREFIXES = ['/session/', '/kansla/', '/stopp/', '/kom-igang'];

export function navVisible(location: string): boolean {
  const path = location.split('?')[0] ?? location;
  return !HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
}
