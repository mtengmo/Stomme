import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import { timedMovementCue } from '../content/timedMovement';
import { figures } from './poses';

/** Timed exercises that hold a pose but are still allowed to animate. Keep this list short and explained. */
const ANIMATED_HOLD_ALLOWLIST: ReadonlySet<string> = new Set<string>([]);

describe('timed exercises and their figures', () => {
  it('shows every timed exercise that is not a moving cue as a static hold', () => {
    const offenders = Object.values(exercises)
      .filter((e) => e.unit === 'seconds')
      .filter((e) => !(e.id in timedMovementCue))
      .filter((e) => !ANIMATED_HOLD_ALLOWLIST.has(e.id))
      .filter((e) => figures[e.id].motion !== 'hold')
      .map((e) => e.id);
    expect(offenders).toEqual([]);
  });
});
