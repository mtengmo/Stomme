import { bodyRegions } from '../../content/muscles';
import type { BodyRegionId } from '../../domain/types';

export function RegionChecklist({
  value,
  available,
  onChange,
}: {
  value: BodyRegionId[];
  available: readonly BodyRegionId[];
  onChange(value: BodyRegionId[]): void;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 text-base font-bold">Kroppsdelar</legend>
      {bodyRegions.map((region) => {
        const enabled = available.includes(region.id);
        return (
          <div key={region.id}>
            <label
              className={`flex min-h-12 items-center gap-3 text-lg ${enabled ? '' : 'text-ink-soft'}`}
            >
              <input
                className="size-6"
                type="checkbox"
                disabled={!enabled}
                aria-describedby={enabled ? undefined : `region-${region.id}`}
                checked={enabled && value.includes(region.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...new Set([...value, region.id])]
                      : value.filter((part) => part !== region.id),
                  )
                }
              />
              {region.label}
            </label>
            {enabled ? null : (
              <p
                id={`region-${region.id}`}
                className="m-0 pl-9 text-base text-ink-soft"
              >
                Inga övningar med din utrustning och vana.
              </p>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
