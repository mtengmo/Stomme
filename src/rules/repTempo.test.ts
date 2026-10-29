import { describe, expect, it } from 'vitest';
import {
  prefillAmount,
  type RepTempo,
  repPosition,
  repProgress,
  repSeconds,
  repTempo,
  scaleTempo,
} from './repTempo';

describe('repTempo', () => {
  it('counts plain reps at 2 s up and 2 s down', () => {
    const t = repTempo('goblet-squat');
    expect(t).toMatchObject({ upMs: 2000, downMs: 2000, repMs: 4000 });
    expect(t && repSeconds(t)).toBe(4);
  });
  it('adds the hold and a default one second relax for hold exercises', () => {
    const t = repTempo('half-squat');
    expect(t).toMatchObject({ upMs: 1500, holdMs: 5000, relaxMs: 1000 });
    expect(t?.repMs).toBe(9000);
    expect(t?.hasHold).toBe(true);
  });
  it('uses explicit relax seconds', () => {
    expect(repTempo('prone-leg-raise')?.relaxMs).toBe(2000);
  });
  it('keeps ballistic, laps, meters and seconds manual', () => {
    for (const id of [
      'mountain-climber',
      'plank-arm-lift',
      'walking-lunge',
      'russian-twist',
      'pull-up',
      'chin-up',
      'parallel-dip',
      'balance-clock',
      'farmer-carry',
      'side-plank',
    ] as const)
      expect(repTempo(id)).toBeNull();
  });
  it('finds the rep and phase from elapsed time', () => {
    const t = repTempo('half-squat');
    if (!t) throw new Error('tempo');
    expect(repPosition(t, 0)).toEqual({ completed: 0, phase: 'up' });
    expect(repPosition(t, 2000)).toEqual({ completed: 0, phase: 'hold' });
    expect(repPosition(t, 7000)).toEqual({ completed: 0, phase: 'down' });
    expect(repPosition(t, 7999)).toEqual({ completed: 0, phase: 'down' });
    expect(repPosition(t, 8000)).toEqual({ completed: 1, phase: 'relax' });
    expect(repPosition(t, 8500)).toEqual({ completed: 1, phase: 'relax' });
    expect(repPosition(t, 9000)).toEqual({ completed: 1, phase: 'up' });
    expect(repPosition(t, 17000)).toEqual({ completed: 2, phase: 'relax' });
    expect(repPosition(t, -5)).toEqual({ completed: 0, phase: 'up' });
  });
  it('has no hold or relax phase for plain reps', () => {
    const t = repTempo('goblet-squat');
    if (!t) throw new Error('tempo');
    expect(repPosition(t, 2500).phase).toBe('down');
    expect(repPosition(t, 4000)).toEqual({ completed: 1, phase: 'up' });
  });
});

describe('prefillAmount', () => {
  it('carries over what the user logged', () => {
    expect(prefillAmount({ amount: 10 }, 12)).toBe(10);
    expect(prefillAmount({ amount: 12, counting: 'auto' }, 12)).toBe(12);
  });
  it('returns to the plan target after an auto-counted early stop', () => {
    expect(
      prefillAmount({ amount: 5, counting: 'auto', endedEarly: true }, 12),
    ).toBe(12);
  });
  it('uses the target when nothing is logged', () => {
    expect(prefillAmount(undefined, 12)).toBe(12);
  });
});

describe('repProgress', () => {
  const t = repTempo('half-squat');
  if (!t) throw new Error('tempo');
  it('rises during up, holds at 1, falls during down and rests at 0', () => {
    expect(repProgress(t, 0)).toBe(0);
    expect(repProgress(t, 750)).toBeCloseTo(0.5, 5);
    expect(repProgress(t, 1500)).toBe(1);
    expect(repProgress(t, 4000)).toBe(1);
    expect(repProgress(t, 6500)).toBe(1);
    expect(repProgress(t, 7250)).toBeCloseTo(0.5, 5);
    expect(repProgress(t, 8000)).toBe(0);
    expect(repProgress(t, 8500)).toBe(0);
    expect(repProgress(t, 9000)).toBe(0);
    expect(repProgress(t, -10)).toBe(0);
  });
  it('is back at the start exactly when a rep is counted', () => {
    expect(repPosition(t, 8000).completed).toBe(1);
    expect(repProgress(t, 8000)).toBe(0);
    expect(repProgress(t, 7999)).toBeGreaterThan(0);
  });
  it('quad-set keeps its hold and one second relax', () => {
    expect(repTempo('quad-set')).toMatchObject({ holdMs: 3000, relaxMs: 1000 });
  });
});

describe('ballistic beats', () => {
  it.each([
    ['squat-jump', 3000],
    ['jumping-lunge', 3000],
    ['kettlebell-swing', 2000],
    ['one-arm-kettlebell-swing', 2000],
    ['burpee', 6000],
  ] as const)('%s has a fixed %i ms beat without holds', (id, ms) => {
    expect(repTempo(id)).toMatchObject({
      repMs: ms,
      upMs: ms / 2,
      downMs: ms / 2,
      holdMs: 0,
      relaxMs: 0,
      hasHold: false,
    });
  });
  it('sequence figures progress linearly through the whole rep', () => {
    const t = repTempo('burpee');
    if (!t) throw new Error('tempo');
    expect(t.sequence).toBe(true);
    expect(repProgress(t, 1500)).toBeCloseTo(0.25, 5);
    expect(repProgress(t, 6000)).toBe(0);
    expect(repProgress(t, 4500)).toBeCloseTo(0.75, 5);
  });
  it('swing and lunge use the up and down ping-pong', () => {
    const t = repTempo('kettlebell-swing');
    if (!t) throw new Error('tempo');
    expect(t.sequence).toBe(false);
    expect(repProgress(t, 1000)).toBe(1);
  });
});

describe('scaleTempo', () => {
  it('scales movement and relax but keeps prescribed holds', () => {
    const base = repTempo('wall-sit') ?? repTempo('goblet-squat');
    expect(base).not.toBeNull();
    const slow = scaleTempo(base as RepTempo, 1.5);
    expect(slow.upMs).toBe(Math.round((base as RepTempo).upMs * 1.5));
    expect(slow.holdMs).toBe((base as RepTempo).holdMs);
    expect(slow.repMs).toBe(
      slow.upMs + slow.holdMs + slow.downMs + slow.relaxMs,
    );
    expect(scaleTempo(base as RepTempo, 1)).toBe(base);
  });
});
