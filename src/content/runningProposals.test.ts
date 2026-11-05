import { describe, expect, it } from 'vitest';
import type { TrainingPreferences } from '../domain/types';
import { equipmentFits } from '../rules/equipment';
import { readAuditLog } from './exerciseAudit';
import { exerciseMetadata } from './exerciseMetadata';
import { exercises } from './exercises';
import { programExcludedIds } from './programExclusions';
import { readyWorkouts } from './readyWorkouts';
import {
  neighbour,
  plyometricIds,
  proposals,
  runningSlots,
  shuffle,
} from './runningProposals';

const bodyweight: TrainingPreferences = {
  programId: 'general',
  experience: 'some',
  equipment: ['bodyweight'],
};
const full: TrainingPreferences = {
  programId: 'general',
  experience: 'regular',
  equipment: ['bodyweight', 'chair', 'support', 'step', 'bench'],
  weights: [
    { type: 'dumbbell', kg: 8, count: 2 },
    { type: 'kettlebell', kg: 12, count: 1 },
  ],
};
const setups = [bodyweight, full];
const runningGroup = new Set<string>([
  ...(readyWorkouts[0]?.exerciseIds ?? []),
  'plate-pogos',
]);

function fits(id: keyof typeof exerciseMetadata, setup: TrainingPreferences) {
  return exerciseMetadata[id].variants.some((v) =>
    equipmentFits(v.equipment, setup),
  );
}

describe('slot catalogue', () => {
  const all = runningSlots.flatMap((slot) => slot.options);

  it('uses existing exercises only, once each', () => {
    for (const id of all) expect(exercises[id]).toBeDefined();
    expect(new Set(all).size).toBe(all.length);
  });

  it('has no needs-fix exercise and no rehab-excluded one outside the running group', () => {
    const needsFix = new Set(
      readAuditLog()
        .filter((e) => e.status === 'needs-fix')
        .map((e) => e.id),
    );
    for (const id of all) {
      expect(needsFix.has(id)).toBe(false);
      if (programExcludedIds.has(id)) expect(runningGroup.has(id)).toBe(true);
    }
  });
});

describe('proposals', () => {
  it('returns Grund, Medel and Stark deterministically', () => {
    for (const setup of setups) {
      const a = proposals(setup);
      expect(a.map((p) => p.label)).toEqual(['Grund', 'Medel', 'Stark']);
      expect(proposals(setup)).toEqual(a);
    }
  });

  it('has 6 to 8 distinct exercises each, all doable with the equipment', () => {
    for (const setup of setups)
      for (const p of proposals(setup)) {
        expect(p.exerciseIds.length).toBeGreaterThanOrEqual(6);
        expect(p.exerciseIds.length).toBeLessThanOrEqual(8);
        expect(new Set(p.exerciseIds).size).toBe(p.exerciseIds.length);
        for (const id of p.exerciseIds) expect(fits(id, setup)).toBe(true);
      }
  });

  it('keeps pogo hops out of Grund and Medel, and last in Stark', () => {
    for (const setup of setups) {
      const [grund, medel, stark] = proposals(setup);
      expect(grund?.exerciseIds).not.toContain('plate-pogos');
      expect(medel?.exerciseIds).not.toContain('plate-pogos');
      expect(stark?.exerciseIds.at(-1)).toBe('plate-pogos');
    }
  });

  it('gets harder: later slot options with more equipment', () => {
    const [grund, medel, stark] = proposals(full);
    expect(grund?.exerciseIds).toContain('goblet-chair-squat');
    expect(medel?.exerciseIds).toContain('step-up');
    expect(stark?.exerciseIds).toContain('rear-foot-split-squat');
    expect(stark?.exerciseIds).toContain('single-leg-hip-thrust');
    expect(stark?.exerciseIds).toContain('copenhagen-hold');
    const [bwGrund, , bwStark] = proposals(bodyweight);
    expect(bwGrund?.exerciseIds).not.toEqual(bwStark?.exerciseIds);
    expect(bwStark?.exerciseIds).not.toContain('copenhagen-hold');
  });
});

describe('shuffle', () => {
  it('is deterministic per seed and varies between seeds', () => {
    expect(shuffle(full, 42)).toEqual(shuffle(full, 42));
    const lists = new Set(
      Array.from({ length: 40 }, (_, seed) =>
        shuffle(full, seed).exerciseIds.join(),
      ),
    );
    expect(lists.size).toBeGreaterThan(5);
  });

  it('respects size, duplicates, plyo limit, equipment and exclusions for many seeds', () => {
    for (const setup of setups)
      for (let seed = 0; seed < 300; seed += 1) {
        const { exerciseIds: ids } = shuffle(setup, seed);
        expect(ids.length).toBeGreaterThanOrEqual(6);
        expect(ids.length).toBeLessThanOrEqual(8);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.filter((id) => plyometricIds.has(id)).length).toBeLessThan(
          2,
        );
        for (const id of ids) {
          expect(fits(id, setup)).toBe(true);
          if (programExcludedIds.has(id))
            expect(runningGroup.has(id)).toBe(true);
        }
        const slotIds = ids.map(
          (id) => runningSlots.find((s) => s.options.includes(id))?.id,
        );
        expect(new Set(slotIds).size).toBe(slotIds.length);
      }
  });

  it('never draws pogo hops for a beginner', () => {
    for (let seed = 0; seed < 300; seed += 1)
      expect(
        shuffle({ ...full, experience: 'new' }, seed).exerciseIds,
      ).not.toContain('plate-pogos');
  });

  it('avoids repeating the shown list', () => {
    const first = shuffle(full, 1);
    for (let seed = 0; seed < 40; seed += 1)
      expect(shuffle(full, seed, first.exerciseIds).exerciseIds).not.toEqual(
        first.exerciseIds,
      );
  });
});

describe('neighbour', () => {
  it('moves along the slot and respects equipment and present exercises', () => {
    expect(neighbour('step-up', 'harder', full, [])).toBe('step-down');
    expect(neighbour('step-up', 'easier', full, [])).toBe('reverse-lunge');
    expect(neighbour('calf-raise', 'easier', full, [])).toBeUndefined();
    expect(neighbour('side-plank', 'harder', bodyweight, [])).toBeUndefined();
    expect(neighbour('step-up', 'harder', full, ['step-down'])).toBe(
      'rear-foot-split-squat',
    );
  });

  it('falls back to the catalogue link outside the slots', () => {
    expect(neighbour('box-jump', 'easier', full, [])).toBe('step-up');
    expect(neighbour('plank', 'harder', full, [])).toBeUndefined();
  });
});
