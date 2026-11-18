import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises';
import {
  DECLINE_PUSH_UP_FEET,
  DeclinePushUpDiagram,
  DIAMOND_ELBOW_ANGLE_DEG,
  DIAMOND_HAND_HALF,
  DiamondPushUpDiagram,
  diamondArm,
  hasPronePlacementDiagram,
  KNEE_PUSH_UP_KNEES,
  KneePushUpDiagram,
  PLANK_LIFT,
  PlankArmLiftDiagram,
  PRONE_DIAGRAM_IDS,
  PronePlacementDiagram,
  plankArmLiftPoints,
} from './PronePlacementDiagrams';
import {
  PUSH_UP_ELBOW_ANGLE_DEG,
  PUSH_UP_HAND_HALF,
  PUSH_UP_SHOULDER_HALF,
  pushUpArm,
} from './PushUpHandDiagram';

const MID = 80;
const count = (markup: string, attr: string) =>
  markup.match(new RegExp(`${attr}=`, 'g'))?.length ?? 0;
/** The numbers the markup uses for one coordinate attribute. */
const numbers = (markup: string, attr: string) =>
  [...markup.matchAll(new RegExp(` ${attr}="(-?[\\d.]+)"`, 'g'))].map((m) =>
    Number(m[1]),
  );
/** x, y, width and height of the first `data-support` rectangle. */
const supportRect = (markup: string) => {
  const m = markup.match(
    /data-support="" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/,
  );
  const [x = 0, y = 0, w = 0, h = 0] = (m ?? []).slice(1).map(Number);
  return { x, y, w, h };
};
const points = (d: string) =>
  [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as const,
  );
const armAngle = (shoulder: readonly number[], elbow: readonly number[]) =>
  (Math.atan2(
    (elbow[0] ?? 0) - (shoulder[0] ?? 0),
    (elbow[1] ?? 0) - (shoulder[1] ?? 0),
  ) *
    180) /
  Math.PI;

describe('prone placement diagrams', () => {
  it('covers the push-up diagram and the four new ones, only for catalogue ids', () => {
    expect(PRONE_DIAGRAM_IDS).toEqual([
      'push-up',
      'knee-push-up',
      'decline-push-up',
      'diamond-push-up',
      'plank-arm-lift',
    ]);
    for (const id of PRONE_DIAGRAM_IDS) {
      expect(exercises[id]).toBeDefined();
      expect(hasPronePlacementDiagram(id)).toBe(true);
      expect(
        renderToStaticMarkup(<PronePlacementDiagram exerciseId={id} />),
      ).toContain('<svg');
    }
    expect(hasPronePlacementDiagram('plank')).toBe(false);
    expect(
      renderToStaticMarkup(<PronePlacementDiagram exerciseId="plank" />),
    ).toBe('');
  });

  it.each([
    ['knee-push-up', KneePushUpDiagram],
    ['decline-push-up', DeclinePushUpDiagram],
    ['diamond-push-up', DiamondPushUpDiagram],
    ['plank-arm-lift', PlankArmLiftDiagram],
  ] as const)(
    '%s: stays inside the view, with an accessible name and caption',
    (id, Diagram) => {
      const markup = renderToStaticMarkup(<Diagram />);
      expect(markup).toContain(`data-testid="placement-diagram-${id}"`);
      expect(markup).toContain('viewBox="0 0 160 160"');
      expect(markup).toContain('role="img"');
      expect(markup).toContain('aria-label=');
      expect(markup).toContain('<figcaption');
      for (const attr of ['cx', 'cy', 'x', 'y'])
        for (const n of numbers(markup, attr)) {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(160);
        }
    },
  );

  describe('knee-push-up (E65)', () => {
    it('has the push-up hands: a little wider than the shoulders, elbows 45 degrees back', () => {
      const markup = renderToStaticMarkup(<KneePushUpDiagram />);
      const { shoulder, elbow, hand } = pushUpArm();
      expect(hand[0] - MID).toBe(PUSH_UP_HAND_HALF);
      expect(PUSH_UP_HAND_HALF).toBeGreaterThan(PUSH_UP_SHOULDER_HALF);
      expect(armAngle(shoulder, elbow)).toBeCloseTo(PUSH_UP_ELBOW_ANGLE_DEG, 6);
      expect(count(markup, 'data-arm')).toBe(2);
      expect(count(markup, 'data-hand')).toBe(2);
      expect(markup).toContain('något bredare än axlarna');
      expect(markup).toContain('45 grader');
    });

    it('rests the knees hip wide, level and symmetric, on a towel that holds both', () => {
      const markup = renderToStaticMarkup(<KneePushUpDiagram />);
      const [left, right] = KNEE_PUSH_UP_KNEES;
      expect(left[1]).toBe(right[1]);
      expect(left[0] + right[0]).toBe(2 * MID);
      expect(right[0] - left[0]).toBeGreaterThan(8);
      expect(right[0] - left[0]).toBeLessThan(2 * PUSH_UP_SHOULDER_HALF);
      expect(count(markup, 'data-knee')).toBe(2);
      expect(count(markup, 'data-support')).toBe(1);
      expect(markup).toContain('knäna');
      const towel = supportRect(markup);
      for (const knee of KNEE_PUSH_UP_KNEES) {
        expect(knee[0]).toBeGreaterThan(towel.x);
        expect(knee[0]).toBeLessThan(towel.x + towel.w);
        expect(knee[1]).toBeGreaterThan(towel.y);
        expect(knee[1]).toBeLessThan(towel.y + towel.h);
      }
    });
  });

  describe('decline-push-up (E69)', () => {
    it('has the push-up hands and the feet on the chair seat, level and symmetric', () => {
      const markup = renderToStaticMarkup(<DeclinePushUpDiagram />);
      const [left, right] = DECLINE_PUSH_UP_FEET;
      expect(left[1]).toBe(right[1]);
      expect(left[0] + right[0]).toBe(2 * MID);
      expect(count(markup, 'data-arm')).toBe(2);
      expect(count(markup, 'data-hand')).toBe(2);
      expect(count(markup, 'data-foot')).toBe(2);
      expect(markup).toContain('stolens sits');
      expect(markup).toContain('45 grader');
      const seat = supportRect(markup);
      for (const foot of DECLINE_PUSH_UP_FEET) {
        expect(foot[0]).toBeGreaterThan(seat.x);
        expect(foot[0]).toBeLessThan(seat.x + seat.w);
        expect(foot[1]).toBeGreaterThan(seat.y);
        expect(foot[1]).toBeLessThan(seat.y + seat.h);
      }
    });
  });

  describe('diamond-push-up (E70)', () => {
    it('puts the hands together under the chest, narrower than the shoulders and than a push-up', () => {
      const { shoulder, hand } = diamondArm();
      expect(hand[0] - MID).toBe(DIAMOND_HAND_HALF);
      expect(DIAMOND_HAND_HALF).toBeLessThan(PUSH_UP_SHOULDER_HALF);
      expect(DIAMOND_HAND_HALF).toBeLessThan(PUSH_UP_HAND_HALF * 0.6);
      // The hand sits inside the shoulder: the forearm points in towards the midline.
      expect(shoulder[0] - hand[0]).toBeGreaterThan(4);
    });

    it('keeps the elbows close to the sides with constant arm lengths', () => {
      const { shoulder, elbow, hand } = diamondArm();
      expect(armAngle(shoulder, elbow)).toBeCloseTo(DIAMOND_ELBOW_ANGLE_DEG, 6);
      expect(DIAMOND_ELBOW_ANGLE_DEG).toBeLessThanOrEqual(30);
      expect(DIAMOND_ELBOW_ANGLE_DEG).toBeLessThan(PUSH_UP_ELBOW_ANGLE_DEG);
      expect(
        Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]),
      ).toBeCloseTo(28, 6);
      expect(Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1])).toBeCloseTo(
        28,
        6,
      );
      // The elbow is no further out than a push-up's elbow.
      expect(elbow[0] - MID).toBeLessThan(pushUpArm().elbow[0] - MID);
    });

    it('draws the diamond between the two hands, centred on the midline', () => {
      const markup = renderToStaticMarkup(<DiamondPushUpDiagram />);
      expect(count(markup, 'data-diamond')).toBe(1);
      const pts = points(
        markup.match(/data-diamond="" d="([^"]+)"/)?.[1] ?? '',
      );
      expect(pts).toHaveLength(4);
      const xs = pts.map((p) => p[0]);
      const { hand } = diamondArm();
      expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(2 * MID, 6);
      expect(Math.max(...xs)).toBeLessThanOrEqual(hand[0]);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(160 - hand[0]);
      expect(markup).toContain('diamant');
      expect(markup).toContain('nära sidorna');
      expect(count(markup, 'data-arm')).toBe(2);
      expect(count(markup, 'data-hand')).toBe(2);
    });
  });

  describe('plank-arm-lift (E71)', () => {
    it('keeps the pelvis level and centred, narrower than the shoulders', () => {
      const markup = renderToStaticMarkup(<PlankArmLiftDiagram />);
      const pelvis = points(
        markup.match(/data-pelvis="" d="([^"]+)"/)?.[1] ?? '',
      );
      expect(pelvis).toHaveLength(2);
      const [a, b] = pelvis as [
        readonly [number, number],
        readonly [number, number],
      ];
      expect(a[1]).toBe(b[1]);
      expect(a[0] + b[0]).toBe(2 * MID);
      expect((b[0] - a[0]) / 2).toBe(PLANK_LIFT.pelvisHalf);
      expect(PLANK_LIFT.pelvisHalf).toBeLessThan(PLANK_LIFT.shoulderHalf);
      expect(markup).toContain('bäckenet jämnt');
    });

    it('has a symmetric, narrow foot stance with a little space between the feet', () => {
      const { leftFoot, rightFoot } = plankArmLiftPoints();
      expect(leftFoot[1]).toBe(rightFoot[1]);
      expect(leftFoot[0] + rightFoot[0]).toBe(2 * MID);
      const gap = rightFoot[0] - leftFoot[0];
      expect(gap).toBeGreaterThanOrEqual(12);
      expect(gap).toBeLessThanOrEqual(2 * PLANK_LIFT.shoulderHalf);
      expect(
        count(renderToStaticMarkup(<PlankArmLiftDiagram />), 'data-foot'),
      ).toBe(2);
    });

    it('lifts one arm forward past the resting forearm, which stays down under the shoulder', () => {
      const p = plankArmLiftPoints();
      expect(p.leftHand[0]).toBe(p.leftElbow[0]);
      expect(p.leftHand[1]).toBeLessThan(p.leftElbow[1]);
      expect(p.rightHand[1]).toBeLessThan(p.leftHand[1]);
      expect(p.rightHand[0]).toBe(p.rightShoulder[0]);
      const markup = renderToStaticMarkup(<PlankArmLiftDiagram />);
      expect(count(markup, 'data-lifted-arm')).toBe(1);
      expect(count(markup, 'data-forearm')).toBe(1);
      expect(count(markup, 'data-hand')).toBe(2);
    });

    it('shows the support base through the resting elbow and both feet, not the lifted hand', () => {
      const p = plankArmLiftPoints();
      const markup = renderToStaticMarkup(<PlankArmLiftDiagram />);
      const pts = points(
        markup.match(/data-support-base="" d="([^"]+)"/)?.[1] ?? '',
      );
      expect(pts).toEqual([
        [p.leftElbow[0], p.leftElbow[1]],
        [p.rightFoot[0], p.rightFoot[1]],
        [p.leftFoot[0], p.leftFoot[1]],
      ]);
      expect(markup).toContain('Stödytan');
    });
  });
});
