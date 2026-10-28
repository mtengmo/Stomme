import { useEffect, useState } from 'react';
import type { AdjustableWeightItem } from '../../domain/types';

const fieldClass =
  'min-h-12 w-full rounded-sm border-2 border-edge bg-surface px-3 text-base text-ink';

/** Parses a list of explicit settings. Swedish decimal commas and dots are accepted. */
export function parseAdjustableSettings(value: string): number[] | null {
  const parts = value.split(';').map((part) => part.trim());
  if (
    parts.length < 1 ||
    parts.length > 20 ||
    parts.some((part) => !/^\d+(?:[,.]\d+)?$/.test(part))
  )
    return null;
  const settings = parts.map((part) => Number(part.replace(',', '.')));
  if (
    settings.some((kg) => !Number.isFinite(kg) || kg <= 0 || kg > 100) ||
    new Set(settings).size !== settings.length
  )
    return null;
  return settings;
}

const labels = {
  dumbbell: {
    item: 'hantel',
    plural: 'Justerbara hantlar',
    input: 'Hantelvikter',
  },
  kettlebell: {
    item: 'kettlebell',
    plural: 'Justerbara kettlebells',
    input: 'Kettlebellvikter',
  },
} as const;

export function AdjustableWeightFields({
  value,
  onChange,
  onValidityChange,
}: {
  value: AdjustableWeightItem[];
  onChange(value: AdjustableWeightItem[]): void;
  onValidityChange?(valid: boolean): void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState<string[]>([]);

  const hasInvalidValue = value.some((item) => {
    const serialized = item.settingsKg
      .map((kg) => String(kg).replace('.', ','))
      .join('; ');
    return !parseAdjustableSettings(serialized);
  });
  useEffect(() => {
    onValidityChange?.(invalid.length === 0 && !hasInvalidValue);
  }, [invalid, hasInvalidValue, onValidityChange]);

  function updateText(type: AdjustableWeightItem['type'], text: string) {
    setDrafts((current) => ({ ...current, [type]: text }));
    const settingsKg = parseAdjustableSettings(text);
    if (!settingsKg) {
      setInvalid((current) => [...new Set([...current, type])]);
      return;
    }
    setInvalid((current) => current.filter((item) => item !== type));
    const existing = value.find((item) => item.type === type);
    if (existing)
      onChange(
        value.map((item) =>
          item.type === type ? { ...item, settingsKg } : item,
        ),
      );
  }

  function toggle(type: AdjustableWeightItem['type'], checked: boolean) {
    setDrafts((current) => {
      const next = { ...current };
      delete next[type];
      return next;
    });
    setInvalid((current) => current.filter((item) => item !== type));
    if (!checked) {
      onChange(value.filter((item) => item.type !== type));
      return;
    }
    // Keep the control empty until the user enters real settings.
    onChange([...value, { type, count: 1, settingsKg: [] }]);
    setDrafts((current) => ({ ...current, [type]: '' }));
    setInvalid((current) => [...new Set([...current, type])]);
  }

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="text-lg font-bold">Justerbara vikter</legend>
      <p className="m-0 text-base text-ink-soft">
        Skriv de vikter du faktiskt kan ställa in, i kg, åtskilda med semikolon.
        Inga mellanvikter läggs till.
      </p>
      {(['dumbbell', 'kettlebell'] as const).map((type) => {
        const item = value.find((entry) => entry.type === type);
        const label = labels[type];
        const text =
          drafts[type] ??
          item?.settingsKg
            .map((kg) => String(kg).replace('.', ','))
            .join('; ') ??
          '';
        const errorId = `adjustable-${type}-error`;
        const itemInvalid =
          invalid.includes(type) ||
          Boolean(
            item &&
              !parseAdjustableSettings(item.settingsKg.map(String).join(';')),
          );
        return (
          <div
            key={type}
            className="flex flex-col gap-2 border-t-2 border-edge pt-3"
          >
            <label className="flex min-h-12 items-center gap-3 text-base font-bold">
              <input
                className="size-6"
                type="checkbox"
                checked={Boolean(item)}
                onChange={(event) => toggle(type, event.target.checked)}
              />
              {label.plural}
            </label>
            {item ? (
              <>
                <label className="flex flex-col gap-1 text-base font-bold">
                  Antal {label.item === 'hantel' ? 'hantlar' : `${label.item}s`}
                  <select
                    className={fieldClass}
                    value={item.count}
                    onChange={(event) =>
                      onChange(
                        value.map((entry) =>
                          entry.type === type
                            ? {
                                ...entry,
                                count: Number(event.target.value) as 1 | 2,
                              }
                            : entry,
                        ),
                      )
                    }
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-base font-bold">
                  {label.input} (kg)
                  <input
                    className={fieldClass}
                    type="text"
                    inputMode="decimal"
                    value={text}
                    aria-invalid={itemInvalid}
                    aria-describedby={itemInvalid ? errorId : undefined}
                    placeholder="Till exempel 2,5; 5; 7,5"
                    onChange={(event) => updateText(type, event.target.value)}
                  />
                </label>
                {itemInvalid ? (
                  <p
                    id={errorId}
                    role="alert"
                    className="m-0 text-base font-bold"
                  >
                    Ange 1–20 olika vikter mellan 0 och 100 kg, med semikolon
                    emellan.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
