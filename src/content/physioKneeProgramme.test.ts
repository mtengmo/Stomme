import { describe, expect, it } from 'vitest';
import { validateTrainingPlan } from '../db/training';
import type { EquipmentChoice, TrainingPreferences } from '../domain/types';
import { exerciseMetadata } from './exerciseMetadata';
import {
  physioKneeFitCount,
  physioKneeItems,
  physioKneePlan,
  physioProgressionNotes,
} from './physioKneeProgramme';

const full: EquipmentChoice[] = ['bodyweight', 'chair', 'support', 'band'];
const prefs = (
  equipment: EquipmentChoice[] = full,
  rehabSide?: 'right' | 'left' | 'both',
): TrainingPreferences => ({
  programId: 'rehab',
  experience: 'new',
  equipment,
  rehabFocus: 'knee-physio',
  ...(rehabSide ? { rehabSide } : {}),
});

describe('physio knee programme', () => {
  it('lists nine items in paper order with the prefilled doses', () => {
    expect(physioKneeItems.map((i) => i.sheetNo)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(
      physioKneeItems.map((i) => [i.exerciseId, i.sets, i.target]),
    ).toEqual([
      ['quad-set', 1, 10],
      ['glute-bridge', 2, 10],
      ['seated-knee-flexion', 1, 10],
      ['seated-knee-extension', 2, 10],
      ['band-knee-extension', 2, 10],
      ['hamstring-curl', 2, 10],
      ['band-hip-extension', 2, 10],
      ['goblet-chair-squat', 2, 10],
      ['balance-clock', 1, 5],
    ]);
  });

  it('points every progression to an earlier item', () => {
    const pointing = physioKneeItems.filter((i) => i.progressionOf);
    expect(pointing.map((i) => [i.sheetNo, i.progressionOf])).toEqual([
      [5, 4],
      [7, 6],
    ]);
    for (const item of pointing)
      expect(item.progressionOf).toBeLessThan(item.sheetNo);
  });

  it('builds valid plans for every side setting, with and without band', () => {
    for (const side of ['right', 'left', 'both', undefined] as const) {
      for (const equipment of [full, full.filter((e) => e !== 'band')]) {
        const plan = physioKneePlan(prefs(equipment, side));
        expect(plan).toHaveLength(equipment.includes('band') ? 9 : 7);
        expect(validateTrainingPlan(plan)).toBe(true);
        expect(plan.every((p) => p.restSec === 60 && p.weightKg === 0)).toBe(
          true,
        );
        for (const row of plan) {
          if (row.sides?.[0] !== 'both')
            expect(row.sides).toEqual(
              side === 'right' || side === 'left' ? [side] : ['right', 'left'],
            );
        }
      }
    }
  });

  it('counts how many items fit the equipment', () => {
    expect(physioKneeFitCount(prefs())).toBe(9);
    expect(physioKneeFitCount(prefs(['bodyweight', 'chair', 'support']))).toBe(
      7,
    );
    expect(physioKneeFitCount(prefs(['bodyweight']))).toBe(2);
  });

  it('drops items 5 and 7 without band and uses the chair variant for item 8', () => {
    const ids = physioKneePlan(prefs(['bodyweight', 'chair'])).map(
      (p) => p.exerciseId,
    );
    expect(ids).not.toContain('band-knee-extension');
    expect(ids).not.toContain('band-hip-extension');
    const squat = physioKneePlan(prefs()).find(
      (p) => p.exerciseId === 'goblet-chair-squat',
    );
    expect(
      exerciseMetadata['goblet-chair-squat'].variants
        .find((v) => v.id === squat?.variantId)
        ?.equipment.map((e) => e.type),
    ).toContain('chair');
  });

  it('explains each row and words the balance clock in laps', () => {
    const plan = physioKneePlan(prefs());
    expect(plan[3]?.explanation).toBe(
      'Förifyllt från fysioterapeutens knäprogram: 2 × 10 per vald sida. Kontrollera mot ditt papper och ändra vid behov.',
    );
    expect(plan[8]?.explanation).toContain('1 × 5 varv');
    for (const p of plan) expect(p.explanation).not.toMatch(/rekommenderad/i);
  });

  it('derives progression notes at draw time', () => {
    expect(physioProgressionNotes('band-knee-extension')).toEqual([
      'Stegring av övning 4 (E30 Sittande knästräckning).',
    ]);
    expect(physioProgressionNotes('band-hip-extension')[0]).toMatch(
      /^Stegring av övning 6 \(E29 /,
    );
    const four = physioProgressionNotes('seated-knee-extension');
    expect(four[0]).toMatch(
      /^Nästa steg på papperet: övning 5 \(E51 .+\)\. Byt när du och din fysioterapeut kommit överens\.$/,
    );
    expect(four).toContain(
      'Hållningen på 5 sekunder kommer från AAOS: följ ditt papper om det skiljer sig.',
    );
    expect(physioProgressionNotes('hamstring-curl')).toHaveLength(2);
    expect(physioProgressionNotes('quad-set')).toEqual([]);
  });
});
