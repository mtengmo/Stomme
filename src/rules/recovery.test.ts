import { describe, expect, it } from 'vitest';
import type { Session } from '../domain/types';
import { recentMuscles, recoveryNote, suggestFocus } from './recovery';

const now = new Date('2026-11-04T12:00:00Z');
function session(overrides: Partial<Session> = {}): Session {
  return {
    id: '1',
    templateId: 'A',
    programId: 'general',
    status: 'completed',
    date: '2026-11-03',
    startedAt: '2026-11-03T11:00:00Z',
    finishedAt: '2026-11-03T12:00:00Z',
    plan: [{ exerciseId: 'floor-press' } as Session['plan'][number]],
    feedback: {},
    programWeek: 1,
    ...overrides,
  };
}
describe('muscle recovery advice', () => {
  it('counts completed and aborted sessions in all programs, uses finish or start and only primaries', () => {
    expect(
      recentMuscles(
        [
          session(),
          session({
            programId: 'rehab',
            status: 'aborted',
            finishedAt: undefined,
            plan: [{ exerciseId: 'glute-bridge' } as Session['plan'][number]],
          }),
        ],
        now,
      ),
    ).toEqual({
      chest: Date.parse('2026-11-03T12:00:00Z'),
      glutes: Date.parse('2026-11-03T11:00:00Z'),
    });
  });
  it('includes exact window edge, omits older, future, active and skipped work, retains latest', () => {
    const edge = session({ finishedAt: '2026-11-02T12:00:00Z' });
    expect(recentMuscles([edge], now)).toHaveProperty('chest');
    expect(
      recentMuscles(
        [
          session({ finishedAt: '2026-11-02T11:59:59Z' }),
          session({ finishedAt: '2026-11-04T12:00:01Z' }),
          session({ status: 'in_progress' }),
          session({ feedback: { 'floor-press': { skipped: true } } }),
        ],
        now,
      ),
    ).toEqual({});
    expect(recentMuscles([session(), edge], now)).toEqual(
      recentMuscles([edge, session()], now),
    );
    expect(recentMuscles([edge], now, 24)).toEqual({});
  });
  it('prefers rested available presets and falls back to full', () => {
    expect(suggestFocus({}, ['push', 'pull'])).toBe('push');
    expect(suggestFocus({ chest: 1 }, ['push', 'pull'])).toBe('pull');
    expect(suggestFocus({ chest: 1, back: 1 }, ['push', 'pull', 'legs'])).toBe(
      'legs',
    );
    expect(suggestFocus({}, ['upper'])).toBe('upper');
    expect(suggestFocus({}, ['lower'])).toBe('lower');
    expect(
      suggestFocus({ chest: 1, back: 1, quads: 1 }, [
        'push',
        'pull',
        'legs',
        'upper',
        'lower',
        'full',
      ]),
    ).toBe('full');
    expect(suggestFocus({}, [])).toBe('full');
  });
  it('only describes overlapping muscles and their latest training day', () => {
    const recent = recentMuscles([session()], now);
    expect(recoveryNote(recent, { id: 'pull' }, now)).toBe('');
    expect(recoveryNote(recent, { id: 'push' }, now)).toContain(
      'Bröst tränades för 1 dag sedan',
    );
    expect(
      recoveryNote(
        { chest: now.getTime(), shoulders: now.getTime() },
        { id: 'push' },
        now,
      ),
    ).toContain('Bröst och axlar tränades idag');
    expect(
      recoveryNote(
        { chest: now.getTime() - 2 * 86_400_000 },
        { id: 'push' },
        now,
      ),
    ).toContain('för 2 dagar sedan');
  });
});
