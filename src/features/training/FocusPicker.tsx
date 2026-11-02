import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { focusPresets, type WorkoutFocus } from '../../content/focusPresets';
import { isTrainingPreferences } from '../../content/programmes';
import { getDb } from '../../db/db';
import { getMeta, listSessions } from '../../db/repo';
import type { Session, TrainingPreferences } from '../../domain/types';
import { focusQuery, parseFocus } from '../../lib/focus';
import { useHashSearch } from '../../lib/hashLocation';
import { focusAvailable } from '../../rules/programRosters';
import { recentMuscles, recoveryNote } from '../../rules/recovery';
import { nextTemplateId } from '../../rules/schedule';
import { Button } from '../../ui/Button';
import { startingFocus } from './focusModel';
import { RegionChecklist } from './RegionChecklist';

export function FocusPicker() {
  const data = useLiveQuery(
    async () => ({
      preferences: await getMeta(getDb(), 'training'),
      sessions: await listSessions(getDb()),
    }),
    [],
  );
  if (!data) return null;
  if (
    !isTrainingPreferences(data.preferences) ||
    data.preferences.programId === 'rehab'
  )
    return <Redirect to="/" />;
  return <Picker preferences={data.preferences} sessions={data.sessions} />;
}
function Picker({
  preferences,
  sessions,
}: {
  preferences: TrainingPreferences;
  sessions: Session[];
}) {
  const [, navigate] = useLocation();
  const requested = parseFocus(useHashSearch());
  const now = new Date();
  const available = focusAvailable(preferences);
  const [focus, setFocus] = useState<WorkoutFocus>(() => {
    if (requested?.id === 'custom') {
      const regions = requested.regions?.filter((id) =>
        available.regions.includes(id),
      );
      if (regions?.length) return { id: 'custom', regions };
    } else if (requested && available.presets.includes(requested.id)) {
      return requested;
    }
    return startingFocus(
      preferences,
      sessions,
      now,
      available.presets,
      available.regions,
    ).focus;
  });
  const recent = recentMuscles(sessions, now);
  const nextId = nextTemplateId(
    sessions.filter(
      (s) =>
        s.programId === preferences.programId && s.status !== 'in_progress',
    ),
    preferences.programId,
  );
  const disabled =
    focus.id === 'custom' &&
    !focus.regions?.some((r) => available.regions.includes(r));
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-5 pb-[var(--app-nav-height)]">
      <div className="flex flex-col gap-4 pb-20">
        <h1 className="m-0 text-4xl font-extrabold">Vad tränar du idag?</h1>
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="sr-only">Dagens fokus</legend>
          {focusPresets.map((preset) => {
            const enabled = available.presets.includes(preset.id);
            const trained =
              preset.id !== 'custom' &&
              recoveryNote(recent, { id: preset.id }, now);
            return (
              <label
                key={preset.id}
                className={`flex min-h-12 items-center gap-3 rounded-sm border-2 px-3 py-2 ${focus.id === preset.id ? 'border-accent' : 'border-edge'} ${enabled ? '' : 'text-ink-soft'}`}
              >
                <input
                  className="size-6 shrink-0"
                  type="radio"
                  name="daily-focus"
                  value={preset.id}
                  checked={focus.id === preset.id}
                  disabled={!enabled}
                  onChange={() =>
                    setFocus({
                      id: preset.id,
                      ...(preset.id === 'custom'
                        ? {
                            regions:
                              focus.regions ?? preferences.bodyParts ?? [],
                          }
                        : {}),
                    })
                  }
                />
                <span className="text-lg font-bold">
                  {preset.label}
                  <span className="block text-base font-normal">
                    {!enabled
                      ? 'Inga övningar med din utrustning'
                      : trained
                        ? 'Tränat senaste 48 timmarna · förslag kan ändras'
                        : preset.id === 'push'
                          ? 'Bröst, axlar, triceps'
                          : preset.id === 'pull'
                            ? 'Rygg, biceps, grepp'
                            : ''}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        {focus.id === 'custom' ? (
          <RegionChecklist
            value={focus.regions ?? []}
            available={available.regions}
            onChange={(regions) => setFocus({ id: 'custom', regions })}
          />
        ) : null}
      </div>
      <div className="fixed inset-x-0 bottom-[var(--app-nav-height)] z-10 border-t-2 border-ink bg-surface-tint px-5 py-2">
        <div className="mx-auto flex max-w-md gap-3">
          <Link
            href="/"
            className="flex min-h-14 items-center px-3 text-base font-bold underline"
          >
            Tillbaka
          </Link>
          <Button
            disabled={disabled}
            onClick={() =>
              navigate(
                `/traning/${nextId}?${focusQuery({ ...focus, ...(focus.id === 'custom' ? { regions: focus.regions?.filter((r) => available.regions.includes(r)) } : {}) })}`,
              )
            }
          >
            Visa passet
          </Button>
        </div>
      </div>
    </div>
  );
}
