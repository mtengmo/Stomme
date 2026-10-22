import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'wouter';
import { getDb } from '../db/db';
import { Icon, type IconName } from './Icon';

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Träning', icon: 'week' },
  { href: '/historik', label: 'Historik', icon: 'history' },
  { href: '/installningar', label: 'Inställningar', icon: 'settings' },
];

/** Exact match for the root tab; sub-routes (/historik/:id) keep their tab active. */
export function isTabActive(href: string, location: string): boolean {
  return href === '/'
    ? location === '/'
    : location === href || location.startsWith(`${href}/`);
}

export function BottomNav() {
  const [location] = useLocation();
  const started = useLiveQuery(async () => {
    if (location !== '/') return true;
    const [meta, count] = await Promise.all([
      getDb().meta.bulkGet(['training', 'program']),
      getDb().sessions.count(),
    ]);
    return meta.some(Boolean) || count > 0;
  }, [location]);
  if (location === '/' && !started) return null;
  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-ink bg-surface-tint pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="m-0 mx-auto flex max-w-md list-none p-0">
        {tabs.map((t) => {
          const active = isTabActive(t.href, location);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 border-b-4 text-base no-underline ${
                  active
                    ? 'border-action font-bold text-ink'
                    : 'border-transparent text-ink-soft'
                }`}
              >
                <Icon name={t.icon} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
