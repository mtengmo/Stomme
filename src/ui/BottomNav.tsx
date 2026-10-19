import { Link, useLocation } from 'wouter';
import { Icon, type IconName } from './Icon';

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Vecka', icon: 'week' },
  { href: '/historik', label: 'Historik', icon: 'history' },
  { href: '/installningar', label: 'Inställningar', icon: 'settings' },
];

export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav
      aria-label="Huvudmeny"
      className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-ink bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="m-0 mx-auto flex max-w-md list-none p-0">
        {tabs.map((t) => {
          const active =
            location === t.href || (t.href !== '/' && location.startsWith(`/`));
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 border-b-4 text-base no-underline ${
                  active
                    ? 'border-red font-bold text-ink'
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
