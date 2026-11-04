import { bodyRegions } from '../../content/muscles';
import type { BodyRegionId } from '../../domain/types';
import { ChoiceCard } from '../../ui/ChoiceCard';

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
          <ChoiceCard
            key={region.id}
            type="checkbox"
            label={region.label}
            hint={
              enabled ? undefined : 'Inga övningar med din utrustning och vana.'
            }
            disabled={!enabled}
            checked={enabled && value.includes(region.id)}
            onChange={(checked) =>
              onChange(
                checked
                  ? [...new Set([...value, region.id])]
                  : value.filter((part) => part !== region.id),
              )
            }
          />
        );
      })}
    </fieldset>
  );
}
