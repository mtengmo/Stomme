import { describe, expect, it } from 'vitest';
import { pickableInProgramme } from '../rules/pickerPolicy';
import { repTempo } from '../rules/repTempo';
import { exerciseAliases } from './exerciseAliases';
import { readAuditLog } from './exerciseAudit';
import { exerciseMetadata } from './exerciseMetadata';
import { exerciseReferences } from './exerciseReferences';
import { exerciseSideCue } from './exerciseSideCues';
import { exercises } from './exercises';
import { exerciseMuscles } from './muscles';
import { programExcludedIds } from './programExclusions';
import { readyWorkouts } from './readyWorkouts';
import { focusSlots, generalSlots, rehabImpactExercises } from './rosterSlots';
import { timedMovementCue } from './timedMovement';

const NEW = ['isometric-lunge-hold', 'plate-pogos'] as const;

describe('isometric lunge hold and plate pogos', () => {
  it('have permanent references and Swedish names', () => {
    expect(exerciseReferences['isometric-lunge-hold']).toBe('E105');
    expect(exerciseReferences['plate-pogos']).toBe('E106');
    expect(exercises['isometric-lunge-hold'].name).toBe(
      'Isometrisk utfallshållning',
    );
    expect(exercises['plate-pogos'].name).toBe('Pogohopp');
  });

  it('are timed bodyweight exercises with the right doses', () => {
    const hold = exercises['isometric-lunge-hold'];
    expect(hold.unit).toBe('seconds');
    expect(hold.perSide).toBe(true);
    expect(hold.sideKind).toBe('ben');
    expect(hold.range.start).toBe(30);
    expect(exerciseMetadata['isometric-lunge-hold'].sidePolicy).toBe(
      'choose-side',
    );
    const pogo = exercises['plate-pogos'];
    expect(pogo.unit).toBe('seconds');
    expect(pogo.perSide).toBe(false);
    expect(pogo.range).toEqual({ start: 20, max: 45, step: 5 });
    for (const id of NEW) {
      expect(exercises[id].loadLadder).toEqual([
        { kg: 0, label: 'Kroppsvikt' },
      ]);
      expect(repTempo(id)).toBeNull();
      expect(exerciseMetadata[id].variants[0]?.equipment).toEqual([
        { type: 'bodyweight', count: 1 },
      ]);
    }
  });

  it('carry the running purpose with a reason, and no knee purpose', () => {
    for (const id of NEW) {
      expect(exerciseMetadata[id].purposes.running).toBeTruthy();
      expect(exerciseMetadata[id].purposes.knee).toBeUndefined();
      expect(exerciseMuscles[id].primary.length).toBeGreaterThan(0);
      expect(exerciseAliases[id].length).toBeGreaterThan(0);
    }
  });

  it('are editorial with a pain warning', () => {
    for (const id of NEW) {
      const [source] = exerciseMetadata[id].sources;
      expect(source?.publisher).toBe('Stomme');
      expect(source?.url).toBeUndefined();
      expect(source?.note).toContain('Avbryt vid smärta');
      expect(source?.note).toContain('Knärehab');
      expect(exercises[id].kneeLoaded).toBe(true);
    }
  });

  it('treats the pogo hops as ballistic and keeps them out of rehab and programmes', () => {
    expect(rehabImpactExercises.has('plate-pogos')).toBe(true);
    expect(programExcludedIds.has('plate-pogos')).toBe(true);
    expect(pickableInProgramme('plate-pogos', { programId: 'rehab' })).toBe(
      false,
    );
    expect(timedMovementCue['plate-pogos']).toBeDefined();
    expect(timedMovementCue['isometric-lunge-hold']).toBeUndefined();
    const everyRoster = [
      ...Object.values(generalSlots).flat(),
      ...focusSlots,
    ].flatMap((slot) => slot.candidates);
    for (const id of NEW) expect(everyRoster).not.toContain(id);
  });

  it('has a side cue for the lunge hold', () => {
    expect(exerciseSideCue('isometric-lunge-hold', 'right')?.label).toBe(
      'höger ben fram',
    );
  });

  it('is logged as high risk, awaiting review, never approved', () => {
    const log = readAuditLog();
    for (const id of NEW) {
      const entry = log.find((e) => e.id === id);
      expect(entry?.risk).toBe('high');
      expect(entry?.status).toBe('fixed-awaiting-review');
      expect(entry?.fixes.at(-1)?.fixer).toBe('claude-sonnet');
      // Astra may have reviewed it since; the fixer never reviews its own fix.
      expect(entry?.reviews.map((r) => r.reviewer)).not.toContain(
        'claude-sonnet',
      );
      expect(JSON.stringify(entry?.notes)).toContain('codex:gpt6astra');
    }
  });
});

describe('ready-made workout Löpstyrka', () => {
  const workout = readyWorkouts.find((w) => w.id === 'running-strength');

  it('has the eight exercises in order', () => {
    expect(workout?.name).toBe('Löpstyrka');
    expect(workout?.exerciseIds).toEqual([
      'step-down',
      'rear-foot-split-squat',
      'single-leg-rdl',
      'single-leg-hip-thrust',
      'single-leg-calf-raise',
      'copenhagen-hold',
      'isometric-lunge-hold',
      'plate-pogos',
    ]);
    for (const id of workout?.exerciseIds ?? [])
      expect(exercises[id]).toBeDefined();
  });

  it('warns about the hop', () => {
    expect(workout?.caution).toContain('Pogohopp');
    expect(workout?.caution).toContain('avbryt vid smärta');
  });
});
