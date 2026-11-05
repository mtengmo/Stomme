import { Link, useLocation } from 'wouter';
import { Icon, type IconName } from './Icon';
import { PencilStroke } from './PencilTick';

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  /** Routes that belong to the tab: a bare path matches itself and its sub-routes. */
  routes: string[];
}

/**
 * Four index tabs. Idag holds the whole training flow (Home, the prepared
 * workout, focus, the week plan, "Mitt program", check-ins); Övningar holds the
 * library, an exercise's page and the own-workout builder.
 */
export const tabs: Tab[] = [
  {
    href: '/',
    label: 'Idag',
    icon: 'today',
    routes: [
      '/',
      '/traning',
      '/fokus',
      '/program',
      '/vecka',
      '/kansla',
      '/mitt-program',
    ],
  },
  {
    href: '/ovningar',
    label: 'Övningar',
    icon: 'exercises',
    routes: ['/ovningar', '/ovning', '/nytt-pass'],
  },
  {
    href: '/historik',
    label: 'Historik',
    icon: 'history',
    routes: ['/historik'],
  },
  {
    href: '/installningar',
    label: 'Mer',
    icon: 'more',
    routes: ['/installningar', '/granska'],
  },
];

/** The root route matches only itself; every other route also owns its sub-routes. */
export function isTabActive(href: string, location: string): boolean {
  const path = location.split('?')[0] ?? location;
  const tab = tabs.find((t) => t.href === href);
  if (!tab) return false;
  // An unknown route renders the training Home, so Idag owns it.
  if (href === '/' && !tabs.some((t) => ownsPath(t, path))) return true;
  return ownsPath(tab, path);
}

function ownsPath(tab: Tab, path: string): boolean {
  return tab.routes.some((route) =>
    route === '/'
      ? path === '/'
      : path === route || path.startsWith(`${route}/`),
  );
}

/**
 * Paper index tabs along the bottom edge. The active tab is a raised, outlined
 * tab with a pencil stroke under its word, so colour never carries it alone. The
 * bar is lighter than the primary button's sticky bar above it.
 */
export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-edge bg-surface-tint pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="m-0 mx-auto flex max-w-md list-none gap-0 p-0">
        {tabs.map((t) => {
          const active = isTabActive(t.href, location);
          return (
            <li key={t.href} className="min-w-0 flex-auto">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`-mt-0.5 flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-t-md border-2 border-b-0 px-1 font-display text-base leading-none no-underline focus-visible:outline-offset-[-6px] focus-visible:[box-shadow:var(--focus-ring-inset)] ${
                  active
                    ? 'border-ink bg-paper font-extrabold text-ink'
                    : 'border-transparent font-bold text-ink-soft'
                }`}
              >
                <Icon name={t.icon} />
                <span className="min-w-0 text-center tracking-[-0.02em] [overflow-wrap:anywhere]">
                  {t.label}
                </span>
                <span className="block w-[80%]" aria-hidden="true">
                  {active ? <PencilStroke /> : <span className="block h-2" />}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
