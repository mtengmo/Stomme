import { useId, useSyncExternalStore } from 'react';
import {
  appearanceSnapshot,
  type SchemePreference,
  setAppearance,
  subscribe,
} from '../../lib/appearance';
import { type ThemeDef, themes } from '../../styles/themes/registry';
import { PencilTick } from '../../ui/PencilTick';

const SCHEMES: { id: SchemePreference; label: string }[] = [
  { id: 'light', label: 'Ljust' },
  { id: 'dark', label: 'Mörkt' },
  { id: 'system', label: 'Följ telefonen' },
];

const ring =
  'peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-(--focus-outline) peer-focus-visible:[box-shadow:var(--focus-ring)]';

/** Live preview of a theme in the scheme that is on screen: paper, action, Klar, Idag. */
function Swatch({ theme, dark }: { theme: ThemeDef; dark: boolean }) {
  const t = theme.tokens[dark ? 'dark' : 'light'];
  return (
    <span
      aria-hidden="true"
      className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold"
    >
      <span
        className="flex h-8 w-12 items-center justify-center rounded-sm border-2"
        style={{ background: t.paper, borderColor: t.edge }}
      >
        <span className="size-4 rounded-sm" style={{ background: t.action }} />
      </span>
      <span
        className="inline-flex h-8 items-center gap-1 rounded-sm border-2 px-1.5"
        style={{
          background: t['done-fill'] ?? t.surface,
          borderColor: t['done-mark'] ?? t.done,
          color: t['done-fill-ink'] ?? t.done,
        }}
      >
        <PencilTick size={20} fill={t['done-fill-ink'] ?? t.done} />
        Klar
      </span>
      <span
        className="inline-flex h-8 items-center rounded-sm px-2"
        style={{ background: t.today, color: t['today-ink'] }}
      >
        Idag
      </span>
    </span>
  );
}

function useAppearance(): {
  theme: string;
  scheme: SchemePreference;
  dark: boolean;
} {
  const snapshot = useSyncExternalStore(
    subscribe,
    appearanceSnapshot,
    appearanceSnapshot,
  );
  const [theme = '', scheme = 'system', resolved = 'light'] =
    snapshot.split('|');
  return {
    theme,
    scheme: scheme as SchemePreference,
    dark: resolved === 'dark',
  };
}

/** Färgtema and light/dark choice. Applies immediately and is kept on this device. */
export function AppearancePicker() {
  const { theme, scheme, dark } = useAppearance();
  const group = useId();
  return (
    <div className="flex flex-col gap-5">
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-lg font-bold">Färgtema</legend>
        {themes.map((t) => {
          const selected = t.id === theme;
          return (
            <label key={t.id} className="relative block">
              <input
                type="radio"
                name={`${group}-theme`}
                value={t.id}
                checked={selected}
                onChange={() => setAppearance({ theme: t.id })}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-14 items-start gap-3 rounded-md border-[3px] p-3 ${ring} ${
                  selected
                    ? 'border-action bg-surface-tint'
                    : 'border-edge bg-surface'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-[3px] border-ink"
                >
                  {selected ? (
                    <span className="size-2.5 rounded-full bg-action" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-lg leading-tight font-bold">
                    {t.name}
                    {t.variant ? (
                      <span className="font-normal text-ink-soft">
                        {' '}
                        · {t.variant}
                      </span>
                    ) : null}
                  </span>
                  <Swatch theme={t} dark={dark} />
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-lg font-bold">
          Ljust eller mörkt
        </legend>
        {SCHEMES.map((s) => {
          const selected = s.id === scheme;
          return (
            <label key={s.id} className="relative block">
              <input
                type="radio"
                name={`${group}-scheme`}
                value={s.id}
                checked={selected}
                onChange={() => setAppearance({ scheme: s.id })}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-14 items-center gap-3 rounded-md border-[3px] px-3 text-base font-bold ${ring} ${
                  selected
                    ? 'border-action bg-surface-tint'
                    : 'border-edge bg-surface'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="grid size-6 shrink-0 place-items-center rounded-full border-[3px] border-ink"
                >
                  {selected ? (
                    <span className="size-2.5 rounded-full bg-action" />
                  ) : null}
                </span>
                {s.label}
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
