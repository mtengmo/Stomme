import { describe, expect, it } from 'vitest';
import { bodyweightIds } from '../content/bodyweightExercises';
import { movementPose } from './Figure';
import { checkPoseGeometry } from './keyframes';
import type { Pt } from './lerp';
import { figures, POSE_KEYS } from './poses';

const distance = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
describe('bodyweight movement paths', () => {
  it.each(bodyweightIds)(
    '%s stays finite and above the floor throughout the movement',
    (id) => {
      for (let n = 0; n <= 80; n++) {
        const p = movementPose(id, n / 80);
        for (const key of POSE_KEYS) {
          expect(Number.isFinite(p[key][0]) && Number.isFinite(p[key][1])).toBe(
            true,
          );
          expect(p[key][1], `${id} ${key} phase ${n / 80}`).toBeLessThanOrEqual(
            178,
          );
        }
      }
    },
  );
  it('keeps push-up hand/toe contacts and the rigid trunk', () => {
    const start = movementPose('push-up', 0);
    for (let n = 0; n <= 40; n++) {
      const p = movementPose('push-up', n / 40);
      expect(p.hR).toEqual(start.hR);
      expect(p.aR).toEqual(start.aR);
      expect(distance(p.neck, p.hip)).toBeCloseTo(
        distance(start.neck, start.hip),
        8,
      );
    }
    expect(movementPose('push-up', 1).neck[1]).toBeGreaterThan(start.neck[1]);
  });
  it.each(['decline-push-up', 'diamond-push-up'] as const)(
    '%s keeps planted hands, feet and a rigid trunk',
    (id) => {
      const start = movementPose(id, 0);
      for (let n = 0; n <= 40; n++) {
        const p = movementPose(id, n / 40);
        expect(p.hR).toEqual(start.hR);
        expect(p.hL).toEqual(start.hL);
        expect(p.aR).toEqual(start.aR);
        expect(distance(p.neck, p.hip)).toBeCloseTo(
          distance(start.neck, start.hip),
          8,
        );
      }
      expect(movementPose(id, 1).neck[1]).toBeGreaterThan(start.neck[1]);
      if (id === 'decline-push-up') expect(start.aR[1]).toBeLessThan(150);
    },
  );
  it('plank arm lift keeps the trunk still and alternates the lifted arm', () => {
    const start = movementPose('plank-arm-lift', 0);
    const right = movementPose('plank-arm-lift', 0.25);
    const left = movementPose('plank-arm-lift', 0.75);
    expect(right.hL).toEqual(start.hL);
    expect(left.hR).toEqual(start.hR);
    expect(right.hR[1]).toBeLessThan(start.hR[1] - 20);
    expect(left.hL[1]).toBeLessThan(start.hL[1] - 20);
    expect(right.hip).toEqual(start.hip);
    expect(left.neck).toEqual(start.neck);
    expect(figures['plank-arm-lift'].end.hR[1]).toBeLessThan(start.hR[1] - 20);
  });
  it('blast off push-up glides over planted hands and toes with constant segments', () => {
    const start = movementPose('blast-off-push-up', 0);
    const end = movementPose('blast-off-push-up', 1);
    for (let n = 0; n <= 40; n++) {
      const p = movementPose('blast-off-push-up', n / 40);
      expect(p.hR).toEqual(start.hR);
      expect(p.hL).toEqual(start.hL);
      expect(p.aR).toEqual(start.aR);
      expect(p.tR).toEqual(start.tR);
      expect(distance(p.neck, p.hip)).toBeCloseTo(46, 8);
      expect(distance(p.hip, p.kR)).toBeCloseTo(32, 6);
      expect(distance(p.kR, p.aR)).toBeCloseTo(32, 6);
      expect(distance(p.neck, p.eR)).toBeCloseTo(22.5, 6);
      expect(distance(p.eR, p.hR)).toBeCloseTo(22.5, 6);
      expect(p.kR[1]).toBeLessThan(174);
      expect(p.kL[1]).toBeLessThan(174);
      expect(p.head[1] + 9).toBeLessThan(170);
      expect(p.head[0]).toBeGreaterThan(0);
    }
    // Hips back and knees bent, shoulders behind the hands.
    expect(start.neck[0]).toBeGreaterThan(start.hR[0]);
    expect(start.hip[1]).toBeLessThan(end.hip[1] - 25);
    expect(distance(start.hip, start.aR)).toBeLessThan(60);
    // Low plank: legs straight, chest at or in front of the hands.
    expect(end.neck[0]).toBeLessThanOrEqual(end.hR[0]);
    expect(distance(end.hip, end.aR)).toBeCloseTo(64, 6);
    expect(figures['blast-off-push-up'].end).toEqual(end);
    expect(figures['blast-off-push-up'].motion).toBe('controlled');
  });
  it.each(['pull-up', 'chin-up', 'parallel-dip'] as const)(
    '%s retains both apparatus contacts',
    (id) => {
      const start = movementPose(id, 0);
      for (let n = 0; n <= 40; n++) {
        const p = movementPose(id, n / 40);
        expect(p.hR).toEqual(start.hR);
        expect(p.hL).toEqual(start.hL);
        expect(p.aR[1]).toBeLessThan(178);
      }
    },
  );
  it('jumps through continuous, constant-length thighs and shins with alternating front legs', () => {
    // The figure cycle is two counted reps: one switch each (0 -> 0.5 -> 1).
    const first = movementPose('jumping-lunge', 0),
      opposite = movementPose('jumping-lunge', 0.5),
      last = movementPose('jumping-lunge', 1);
    expect(first.aR[0]).toBeGreaterThan(first.aL[0]);
    expect(opposite.aR[0]).toBeLessThan(opposite.aL[0]);
    expect(last).toEqual(first);
    expect(figures['jumping-lunge'].motion).toBe('sequence');
    expect(figures['jumping-lunge'].start).toEqual(first);
    expect(figures['jumping-lunge'].end).toEqual(opposite);
    for (let n = 0; n <= 160; n++) {
      const p = movementPose('jumping-lunge', n / 160);
      expect(distance(p.hip, p.kR)).toBeCloseTo(36, 8);
      expect(distance(p.kR, p.aR)).toBeCloseTo(34, 8);
      if (n > 0)
        expect(
          distance(p.kR, movementPose('jumping-lunge', (n - 1) / 160).kR),
        ).toBeLessThan(5);
    }
  });
  it('burpee has an ordered arm bend and airborne phase then returns to standing', () => {
    expect(figures.burpee.motion).toBe('sequence');
    expect(movementPose('burpee', 0)).toEqual(movementPose('burpee', 1));
    expect(movementPose('burpee', 0.375).neck[1]).toBeGreaterThan(
      movementPose('burpee', 0.25).neck[1],
    );
    expect(movementPose('burpee', 0.875).aR[1]).toBeLessThan(174);
  });
  it('keeps the climber upper body still while each knee travels towards the chest', () => {
    const first = movementPose('mountain-climber', 0);
    const right = movementPose('mountain-climber', 0.25),
      left = movementPose('mountain-climber', 0.75);
    expect(right.neck).toEqual(first.neck);
    expect(left.hR).toEqual(first.hR);
    expect(right.kR[0]).toBeLessThan(first.hip[0]);
    expect(left.kL[0]).toBeLessThan(first.hip[0]);
  });
  it('keeps both climber support arms straight with the hands on the floor', () => {
    for (let n = 0; n <= 40; n++) {
      const p = movementPose('mountain-climber', n / 40);
      for (const [e, h] of [
        [p.eR, p.hR],
        [p.eL, p.hL],
      ] as const) {
        expect(distance(p.neck, e) + distance(e, h)).toBeCloseTo(
          distance(p.neck, h),
          6,
        );
        expect(h[1]).toBeGreaterThan(170);
        expect(h[1]).toBeLessThanOrEqual(174);
      }
    }
  });
  it('knee push-up pivots on the knees as a rigid lever with fixed hands', () => {
    const start = movementPose('knee-push-up', 0);
    for (let n = 0; n <= 40; n++) {
      const p = movementPose('knee-push-up', n / 40);
      expect(p.hR).toEqual(start.hR);
      expect(p.kR).toEqual(start.kR);
      expect(distance(p.neck, p.kR)).toBeCloseTo(82, 8);
      expect(distance(p.hip, p.kR)).toBeCloseTo(36, 8);
    }
    expect(movementPose('knee-push-up', 1).neck[1]).toBeGreaterThan(
      start.neck[1],
    );
  });
  it('wall push-up keeps hands on the wall and feet planted while leaning in', () => {
    const start = movementPose('wall-push-up', 0);
    const wall = figures['wall-push-up'].props.find((p) => p.type === 'wall');
    expect(wall).toBeDefined();
    for (let n = 0; n <= 40; n++) {
      const p = movementPose('wall-push-up', n / 40);
      expect(p.hR).toEqual(start.hR);
      expect(p.aR).toEqual(start.aR);
      expect(distance(p.neck, p.aR)).toBeCloseTo(108, 8);
    }
    expect(movementPose('wall-push-up', 1).neck[0]).toBeGreaterThan(
      start.neck[0],
    );
  });
  it('calf raise lifts the heels about 8 px with the toes fixed', () => {
    const start = movementPose('calf-raise', 0),
      top = movementPose('calf-raise', 1);
    expect(top.tR).toEqual(start.tR);
    expect(top.tL).toEqual(start.tL);
    expect(start.aR[1] - top.aR[1]).toBeCloseTo(16, 8);
    expect(start.hip[1] - top.hip[1]).toBeCloseTo(16, 8);
  });
  it('crunch lifts head and shoulders about 40 degrees while hips and feet stay put', () => {
    const start = movementPose('crunch', 0),
      top = movementPose('crunch', 1);
    expect(top.hip).toEqual(start.hip);
    expect(top.aR).toEqual(start.aR);
    expect(top.neck[1]).toBeLessThan(start.neck[1] - 5);
    expect(top.head[1]).toBeLessThan(start.head[1] - 5);
    // The trunk tilts about the resting pelvis at constant length; the head
    // turns about 0.64 rad further than the trunk (0.7 rad in all).
    expect(distance(top.neck, top.hip)).toBeCloseTo(51, 8);
    expect(
      Math.atan2(top.hip[1] - top.neck[1], top.hip[0] - top.neck[0]),
    ).toBeCloseTo(0.34, 8);
    expect(
      Math.atan2(top.neck[1] - top.head[1], top.neck[0] - top.head[0]),
    ).toBeCloseTo(0.76, 8);
  });
  it('crunch rests the pelvis on the mat and keeps both arms 22 + 22 with the hands at the temples', () => {
    for (let frame = 0; frame <= 20; frame++) {
      const pose = movementPose('crunch', frame / 20);
      // Mat top edge y 175.5, body stroke 6 wide.
      expect(pose.hip[1] + 3).toBeCloseTo(175.5, 8);
      for (const [elbow, hand] of [
        [pose.eR, pose.hR],
        [pose.eL, pose.hL],
      ] as const) {
        expect(distance(pose.neck, elbow)).toBeCloseTo(22, 6);
        expect(distance(elbow, hand)).toBeCloseTo(22, 6);
        expect(distance(hand, pose.head)).toBeLessThan(10);
      }
    }
  });
  it.each(['plank', 'plank-arm-lift', 'push-up'] as const)(
    '%s passes the geometry gate mid-rep',
    (id) => {
      const frame = movementPose(id, 0.5);
      expect(
        checkPoseGeometry([frame], {
          floorY: 178,
          viewBox: [0, 20, 200, 168],
          props: figures[id].props,
          minHeadClearance: 9,
        }),
      ).toEqual([]);
    },
  );
  it('plank: forearms lie on the mat with real 25 and 23 unit arm segments', () => {
    const p = movementPose('plank', 0);
    expect(Math.hypot(p.neck[0] - p.eR[0], p.neck[1] - p.eR[1])).toBeCloseTo(
      25,
    );
    expect(Math.hypot(p.eR[0] - p.hR[0], p.eR[1] - p.hR[1])).toBeCloseTo(23);
    expect(p.neck[0]).toBeCloseTo(57.8, 0);
    expect(p.neck[1]).toBeCloseTo(149, 0);
  });
});
