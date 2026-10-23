/**
 * Routes where the bottom navigation is hidden: screens where leaving would lose
 * in-progress input or interrupt an active workout, pain/check-in questions and
 * the stop screen. Everything else (first-use setup, the prepared-workout
 * preview /traning/:id, history, settings, ...) shows the nav, so Historik and
 * Inställningar are always one tap away after onboarding.
 */
const HIDDEN_PREFIXES = ['/session/', '/smarta/', '/kansla/', '/stopp/'];

export function navVisible(location: string): boolean {
  const path = location.split('?')[0] ?? location;
  return !HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
}
