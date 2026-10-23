import { describe, expect, it } from 'vitest';
import { exerciseMetadata } from './exerciseMetadata';
import { exercises } from './exercises';
import { physioSwapNote } from './physioKneeProgramme';

describe('balance clock copy', () => {
  const ex = exercises['balance-clock'];
  const meta = exerciseMetadata['balance-clock'];
  it('requires holding on in every text and keeps the support variant', () => {
    expect(ex.tips[0]).toBe(
      'Håll i en vägg eller stol hela tiden.'.length ? ex.tips[0] : '',
    );
    expect(ex.tips[0]).toMatch(/^Håll i en vägg eller stol hela tiden\./);
    expect(ex.easierVariant).toMatch(/Håll i/);
    for (const variant of meta.variants) {
      expect(variant.cue).toMatch(/håll i/i);
      expect(variant.equipment.map((e) => e.type)).toContain('support');
    }
    const all = [...ex.tips, ex.easierVariant, ex.commonMistake].join(' ');
    expect(all).not.toMatch(/vid behov|lätt i|så långt du når/);
    expect(ex.tips[1]).toContain('en kort bit, utan smärta');
  });
});

describe('band knee extension copy', () => {
  it('anchors the band low at the front chair leg', () => {
    expect(exercises['band-knee-extension'].tips[0]).toContain(
      'stolens främre ben',
    );
    expect(exerciseMetadata['band-knee-extension'].variants[0]?.cue).toContain(
      'främre ben',
    );
  });
});

describe('progression note', () => {
  it('tells the user to do 5 and 7 only when on the paper', () => {
    expect(physioSwapNote).toBe(
      'Övning 5 och 7 är stegringar av 4 och 6. Gör dem bara om de står på ditt papper; ta annars bort dem.',
    );
  });
});
