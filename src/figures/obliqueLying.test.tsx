import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ExerciseId } from '../domain/types';
import {
  FrontFigureFrame,
  obliqueMovementPose,
  supportedViewsFor,
} from './frontViews';
import { movementPose } from './movementPose';
import { obliqueFrame } from './obliqueBody';
import { LYING_OBLIQUE, type LyingObliqueId } from './obliqueSpecs';
import type { Pose } from './poses';

/**
 * Shared checks for the lying oblique views (one describe per id below): the
 * drawn skeleton keeps constant, profile-bounded, symmetric segment lengths
 * on both working sides, and the render carries the overlay and the H/V
 * marker with the camera-near side drawn last.
 */
const PHASES = Array.from({ length: 41 }, (_, i) => i / 40);
const SIDES = ['right', 'left'] as const;

const dist = (a: readonly [number, number], b: readonly [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

const segmentsOf = (p: Pose) => ({
  headNeck: dist(p.head, p.neck),
  trunk: dist(p.neck, p.hip),
  upperArmR: dist(p.neck, p.eR),
  forearmR: dist(p.eR, p.hR),
  upperArmL: dist(p.neck, p.eL),
  forearmL: dist(p.eL, p.hL),
  thighR: dist(p.hip, p.kR),
  shinR: dist(p.kR, p.aR),
  footR: dist(p.aR, p.tR),
  thighL: dist(p.hip, p.kL),
  shinL: dist(p.kL, p.aL),
  footL: dist(p.aL, p.tL),
});
type Seg = keyof ReturnType<typeof segmentsOf>;

const PAIRS: readonly (readonly [Seg, Seg])[] = [
  ['upperArmR', 'upperArmL'],
  ['forearmR', 'forearmL'],
  ['thighR', 'thighL'],
  ['shinR', 'shinL'],
  ['footR', 'footL'],
];

const posesFor = (id: LyingObliqueId, side: 'right' | 'left') =>
  PHASES.map((t) => obliqueMovementPose(id, t, side));

/** Profile lengths, in the view's own R/L labelling (left-working swaps them). */
const profileSegments = (id: ExerciseId, t: number, side: 'right' | 'left') => {
  const s = segmentsOf(movementPose(id, t));
  if (side === 'right') return s;
  const swapped = { ...s };
  for (const [r, l] of PAIRS) {
    swapped[r] = s[l];
    swapped[l] = s[r];
  }
  return swapped;
};

function shared(id: LyingObliqueId, separated = true, minBarAngle = 25) {
  it('offers side and oblique views', () => {
    expect(supportedViewsFor(id)).toEqual(['side', 'oblique']);
  });

  for (const side of SIDES) {
    describe(`${side}-working`, () => {
      const poses = posesFor(id, side);

      it('keeps every segment at constant length (drift < 0.1)', () => {
        const lengths = poses.map(segmentsOf);
        for (const key of Object.keys(lengths[0] as object) as Seg[]) {
          const values = lengths.map((l) => l[key]);
          expect(Math.max(...values) - Math.min(...values)).toBeLessThan(0.1);
        }
      });

      it('never draws a segment longer than the profile', () => {
        PHASES.forEach((t, i) => {
          const drawn = segmentsOf(poses[i] as Pose);
          const profile = profileSegments(id, t, side);
          for (const key of Object.keys(drawn) as Seg[])
            expect(drawn[key]).toBeLessThanOrEqual(profile[key] + 0.05);
        });
      });

      it('keeps right and left limbs the same length (gap < 0.1)', () => {
        for (const pose of poses) {
          const s = segmentsOf(pose);
          for (const [r, l] of PAIRS)
            expect(Math.abs(s[r] - s[l])).toBeLessThan(0.1);
        }
      });

      it('renders the overlay, H/V marker and blue working side', () => {
        const markup = renderToStaticMarkup(
          <FrontFigureFrame
            exerciseId={id}
            working={side}
            phase={0.5}
            angle="oblique"
          />,
        );
        const workingSide = side === 'right' ? 'right' : 'left';
        const supportSide = side === 'right' ? 'left' : 'right';
        expect(markup).toContain('data-view="oblique"');
        expect(markup).toContain('data-pelvis');
        expect(markup).toContain('data-shoulders');
        expect(markup).toContain(
          `data-body-side="${workingSide}" stroke="var(--accent)"`,
        );
        expect(markup).toContain(
          `data-body-side="${supportSide}" stroke="var(--edge)"`,
        );
        expect(markup).toContain(side === 'right' ? '>H</text>' : '>V</text>');
        expect(markup).toContain('data-surface=');
      });

      it('keeps the pelvis and shoulder bars at least 25 degrees off the trunk', () => {
        for (const t of PHASES) {
          const { pose, pelvis, shoulders } = obliqueFrame(
            LYING_OBLIQUE[id],
            t,
            side,
          );
          const angle = (
            a: readonly [number, number],
            b: readonly [number, number],
          ) => Math.atan2(b[1] - a[1], b[0] - a[0]);
          const trunk = angle(pose.hip, pose.neck);
          for (const bar of [pelvis, shoulders]) {
            let diff = Math.abs(angle(bar[1], bar[0]) - trunk) % Math.PI;
            if (diff > Math.PI / 2) diff = Math.PI - diff;
            expect((diff * 180) / Math.PI).toBeGreaterThanOrEqual(minBarAngle);
          }
        }
      });

      // Side-lying legs are stacked by design: separation is only gated for
      // bodies whose legs lie side by side.
      it.runIf(separated)(
        'shows the far leg clear of the near leg at the start',
        () => {
          const { pose, near } = obliqueFrame(LYING_OBLIQUE[id], 0, side);
          const far = near === 'R' ? 'L' : 'R';
          for (const joint of ['k', 'a'] as const) {
            const n = pose[`${joint}${near}`];
            const f = pose[`${joint}${far}`];
            const dx = n[0] - pose.hip[0];
            const dy = n[1] - pose.hip[1];
            const perpendicular =
              Math.abs(dx * (f[1] - pose.hip[1]) - dy * (f[0] - pose.hip[0])) /
              Math.hypot(dx, dy);
            expect(perpendicular).toBeGreaterThanOrEqual(
              joint === 'k' ? 5 : 10,
            );
          }
        },
      );

      it('draws the camera-near side last', () => {
        const markup = renderToStaticMarkup(
          <FrontFigureFrame
            exerciseId={id}
            working={side}
            phase={0.5}
            angle="oblique"
          />,
        );
        const frame = obliqueFrame(LYING_OBLIQUE[id], 0.5, side);
        const nearName = frame.near === 'R' ? 'right' : 'left';
        const farName = frame.near === 'R' ? 'left' : 'right';
        const trunkAt = markup.indexOf('data-pelvis');
        expect(markup.indexOf(`data-body-side="${farName}"`)).toBeLessThan(
          trunkAt,
        );
        expect(markup.indexOf(`data-body-side="${nearName}"`)).toBeGreaterThan(
          trunkAt,
        );
      });
    });
  }
}

describe('prone-leg-raise (E32) oblique view', () => {
  const id = 'prone-leg-raise';
  shared(id);

  const elev = Math.sin((25 * Math.PI) / 180);
  for (const side of SIDES) {
    it(`${side}: far leg lies on the mat, pelvis stays level and the leg rises`, () => {
      const far = side === 'right' ? 'L' : 'R';
      const work = side === 'right' ? 'R' : 'L';
      const frames = PHASES.map((t) =>
        obliqueFrame(LYING_OBLIQUE[id], t, side),
      );
      // De-shear: a joint at depth z is drawn z * sin(elev) lower. The
      // working (near) leg is at z = +15, the far leg at z = -15.
      const near0 = frames[0]?.pose as Pose;
      const rest = (key: 'a' | 't') => near0[`${key}${work}`][1] - 15 * elev;
      for (const { pose, pelvis } of frames) {
        for (const key of ['a', 't'] as const)
          expect(
            Math.abs(pose[`${key}${far}`][1] + 15 * elev - rest(key)),
          ).toBeLessThan(2.5);
        // The pelvis bar spans exactly 2 * 19 * sin(elev) in y, centred on the hip.
        expect(
          Math.abs(pelvis[0][1] - pelvis[1][1] - 2 * 19 * elev),
        ).toBeLessThan(0.5);
        const mid = (pelvis[0][1] + pelvis[1][1]) / 2;
        expect(mid).toBeGreaterThanOrEqual(160);
        expect(mid).toBeLessThanOrEqual(178);
      }
      const ankleY = frames.map((f) => f.pose[`a${work}`][1]);
      expect(
        (ankleY[0] as number) - Math.min(...ankleY),
      ).toBeGreaterThanOrEqual(10);
    });
  }
});

for (const id of [
  'side-lying-hip-abduction',
  'side-lying-hip-adduction',
] as const) {
  describe(`${id} oblique view`, () => {
    shared(id, false);
    for (const side of SIDES) {
      it(`${side}: stacked vertical pelvis bar, pinned support foot, rising leg`, () => {
        const work = side === 'right' ? 'R' : 'L';
        const support = side === 'right' ? 'L' : 'R';
        const frames = PHASES.map((t) =>
          obliqueFrame(LYING_OBLIQUE[id], t, side),
        );
        const a0 = frames[0]?.pose[`a${support}`] as readonly [number, number];
        for (const { pose, pelvis, shoulders } of frames) {
          expect(Math.abs(pelvis[0][0] - pelvis[1][0])).toBeLessThan(0.5);
          expect(Math.abs(shoulders[0][0] - shoulders[1][0])).toBeLessThan(0.5);
          const a = pose[`a${support}`];
          expect(Math.hypot(a[0] - a0[0], a[1] - a0[1])).toBeLessThan(1);
        }
        const ankleY = frames.map((f) => f.pose[`a${work}`][1]);
        expect(
          Math.max(...ankleY) - Math.min(...ankleY),
        ).toBeGreaterThanOrEqual(10);
      });
    }
  });
}

describe('single-leg-floor-bridge (E48) oblique view', () => {
  const id = 'single-leg-floor-bridge';
  // The trunk tilts about 30 degrees in the bridge, which narrows the bar angle to about 18.
  shared(id, false, 15);
  const e = Math.sin((25 * Math.PI) / 180);
  for (const side of SIDES) {
    it(`${side}: stance foot pinned, shoulders on the mat, hip rises, pelvis level`, () => {
      const stance = side === 'right' ? 'R' : 'L';
      const frames = PHASES.map((t) =>
        obliqueFrame(LYING_OBLIQUE[id], t, side),
      );
      const first = frames[0] as ReturnType<typeof obliqueFrame>;
      const a0 = first.pose[`a${stance}`];
      for (const { pose, pelvis } of frames) {
        const a = pose[`a${stance}`];
        expect(Math.hypot(a[0] - a0[0], a[1] - a0[1])).toBeLessThan(1);
        expect(Math.abs(pose.neck[1] - first.pose.neck[1])).toBeLessThan(1);
        expect(Math.abs(pelvis[0][1] - pelvis[1][1] - 2 * 19 * e)).toBeLessThan(
          0.5,
        );
      }
      const hipY = frames.map((f) => f.pose.hip[1]);
      expect((hipY[0] as number) - Math.min(...hipY)).toBeGreaterThanOrEqual(
        20,
      );
    });
  }
});

describe('kettlebell-floor-press (E39) oblique view', () => {
  const id = 'kettlebell-floor-press';
  shared(id, false);
  for (const side of SIDES) {
    it(`${side}: both feet pinned, working hand rises and carries the kettlebell`, () => {
      const work = side === 'right' ? 'R' : 'L';
      const frames = PHASES.map((t) =>
        obliqueFrame(LYING_OBLIQUE[id], t, side),
      );
      const first = frames[0] as ReturnType<typeof obliqueFrame>;
      for (const { pose } of frames)
        for (const key of ['aR', 'aL'] as const)
          expect(
            Math.hypot(
              pose[key][0] - first.pose[key][0],
              pose[key][1] - first.pose[key][1],
            ),
          ).toBeLessThan(1);
      const handY = frames.map((f) => f.pose[`h${work}`][1]);
      expect(Math.max(...handY) - Math.min(...handY)).toBeGreaterThanOrEqual(
        20,
      );
      const markup = renderToStaticMarkup(
        <FrontFigureFrame
          exerciseId={id}
          working={side}
          phase={1}
          angle="oblique"
        />,
      );
      expect(markup).toContain('data-equipment="kettlebell"');
    });
  }
});

describe('quadriceps-stretch (E36) oblique view', () => {
  const id = 'quadriceps-stretch';
  shared(id, false);
  for (const side of SIDES) {
    it(`${side}: stance foot and wall hand stay put, the hand reaches the ankle, the wall is drawn`, () => {
      const stance = side === 'right' ? 'L' : 'R';
      const holder = side === 'right' ? 'R' : 'L';
      const frames = PHASES.map((t) =>
        obliqueFrame(LYING_OBLIQUE[id], t, side),
      );
      const first = frames[0] as ReturnType<typeof obliqueFrame>;
      for (const { pose } of frames)
        for (const key of [`a${stance}`, `h${stance}`] as const)
          expect(
            Math.hypot(
              pose[key][0] - first.pose[key][0],
              pose[key][1] - first.pose[key][1],
            ),
          ).toBeLessThan(1);
      const last = frames[frames.length - 1] as ReturnType<typeof obliqueFrame>;
      const hand = last.pose[`h${holder}`];
      const ankle = last.pose[`a${holder}`];
      expect(Math.hypot(hand[0] - ankle[0], hand[1] - ankle[1])).toBeLessThan(
        1,
      );
      const markup = renderToStaticMarkup(
        <FrontFigureFrame
          exerciseId={id}
          working={side}
          phase={1}
          angle="oblique"
        />,
      );
      expect(markup).toContain('data-surface="wall"');
      expect(markup).toContain('data-surface="floor"');
    });
  }
});

describe('balance-clock (E53) oblique view', () => {
  const id = 'balance-clock';
  shared(id, false);
  const e = Math.sin((25 * Math.PI) / 180);
  for (const side of SIDES) {
    it(`${side}: stance foot and both wall hands stay put, the moving toe taps the floor`, () => {
      const stance = side === 'right' ? 'L' : 'R';
      const mover = side === 'right' ? 'R' : 'L';
      const frames = PHASES.map((t) =>
        obliqueFrame(LYING_OBLIQUE[id], t, side),
      );
      const first = frames[0] as ReturnType<typeof obliqueFrame>;
      for (const { pose } of frames)
        for (const key of [`a${stance}`, 'hR', 'hL'] as const)
          expect(
            Math.hypot(
              pose[key][0] - first.pose[key][0],
              pose[key][1] - first.pose[key][1],
            ),
          ).toBeLessThan(1);
      // De-sheared floor height of the toes: the moving foot (z = +3) and the
      // stance foot (z = -3) rest on the same floor at the taps (t = 0.5, 1).
      const floorY = (
        pose: ReturnType<typeof obliqueFrame>['pose'],
        key: 'tR' | 'tL',
      ) => {
        const z = key === (side === 'right' ? 'tR' : 'tL') ? 3 : -3;
        return pose[key][1] - z * e;
      };
      const stanceFloor = floorY(first.pose, `t${stance}` as 'tR' | 'tL');
      for (const t of [0.5, 1]) {
        const pose = (
          frames[Math.round(t * 40)] as ReturnType<typeof obliqueFrame>
        ).pose;
        expect(
          Math.abs(floorY(pose, `t${mover}` as 'tR' | 'tL') - stanceFloor),
        ).toBeLessThan(1.5);
      }
    });
  }
});

describe('balance-pendulum (E46) oblique view', () => {
  const id = 'balance-pendulum';
  // The trunk sweeps from vertical to nearly horizontal, so at one mid phase it
  // is parallel to the (fixed-slope) bars; the bars must still read at both
  // stills (checked below), so the every-phase bar-angle gate is switched off.
  shared(id, false, 0);
  for (const side of SIDES) {
    it(`${side}: bars clear of the trunk at both stills`, () => {
      for (const t of [0, 1]) {
        const { pose, pelvis, shoulders } = obliqueFrame(
          LYING_OBLIQUE[id],
          t,
          side,
        );
        const angle = (
          a: readonly [number, number],
          b: readonly [number, number],
        ) => Math.atan2(b[1] - a[1], b[0] - a[0]);
        for (const bar of [pelvis, shoulders]) {
          let diff =
            Math.abs(angle(bar[1], bar[0]) - angle(pose.hip, pose.neck)) %
            Math.PI;
          if (diff > Math.PI / 2) diff = Math.PI - diff;
          expect((diff * 180) / Math.PI).toBeGreaterThanOrEqual(25);
        }
      }
    });

    it(`${side}: stance foot pinned, the trunk hinges forward, the swing foot never goes below the floor`, () => {
      const stance = side === 'right' ? 'R' : 'L';
      const swing = side === 'right' ? 'L' : 'R';
      const frames = PHASES.map((t) =>
        obliqueFrame(LYING_OBLIQUE[id], t, side),
      );
      const first = frames[0] as ReturnType<typeof obliqueFrame>;
      const last = frames[frames.length - 1] as ReturnType<typeof obliqueFrame>;
      for (const { pose } of frames) {
        const a = pose[`a${stance}`];
        const a0 = first.pose[`a${stance}`];
        expect(Math.hypot(a[0] - a0[0], a[1] - a0[1])).toBeLessThan(1);
        expect(pose[`a${swing}`][1]).toBeLessThan(a0[1] + 1);
      }
      expect(Math.abs(last.pose.neck[0] - last.pose.hip[0])).toBeGreaterThan(
        30,
      );
      expect(Math.abs(first.pose.neck[0] - first.pose.hip[0])).toBeLessThan(5);
    });
  }
});
