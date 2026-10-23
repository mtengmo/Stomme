import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exerciseList } from '../content/exercises';
import { BalanceClockDiagram } from './BalanceClockDiagram';
import { bandEndpoints, FigureFrame, movementPose } from './Figure';
import type { Pt } from './lerp';
import {
  BAND_KNEE_ANCHOR,
  balanceClockPose,
  bandHipExtensionPose,
  type PhysioFigureId,
  quadSetPose,
  seatedKneeFlexionPose,
} from './physioPoses';
import { figures, type Pose, type PoseKey } from './poses';

const IDS: PhysioFigureId[] = [
  'quad-set',
  'seated-knee-flexion',
  'band-knee-extension',
  'band-hip-extension',
  'balance-clock',
];
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const d = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const BONES: [PoseKey, PoseKey][] = [
  ['hip', 'kR'],
  ['kR', 'aR'],
  ['aR', 'tR'],
  ['hip', 'kL'],
  ['kL', 'aL'],
  ['aL', 'tL'],
  ['neck', 'hip'],
  ['neck', 'head'],
  ['neck', 'eR'],
  ['eR', 'hR'],
  ['neck', 'eL'],
  ['eL', 'hL'],
];
const cross = (o: Pt, a: Pt, b: Pt) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Proper segment intersection (touching end points do not count). */
const intersects = (a: Pt, b: Pt, c: Pt, e: Pt) =>
  cross(a, b, c) * cross(a, b, e) < 0 && cross(c, e, a) * cross(c, e, b) < 0;
const at = (id: PhysioFigureId, t: number): Pose => movementPose(id, t);

describe('knee programme figures', () => {
  for (const id of IDS)
    it(`${id}: bone lengths stay constant and nothing is NaN`, () => {
      const first = at(id, 0);
      for (const t of STEPS) {
        const pose = at(id, t);
        for (const [a, b] of BONES) {
          expect(Number.isFinite(d(pose[a], pose[b]))).toBe(true);
          expect(d(pose[a], pose[b]), `${id} ${a}-${b} t=${t}`).toBeCloseTo(
            d(first[a], first[b]),
            1,
          );
        }
      }
    });

  for (const id of IDS)
    it(`${id}: has start and end frames for reduced motion`, () => {
      expect(figures[id].start).toBeDefined();
      expect(figures[id].end).toBeDefined();
      expect(figures[id].start).not.toEqual(figures[id].end);
    });

  it('quad set: hip and heel fixed, knee presses 5 px down, toes pull up', () => {
    const a = quadSetPose(0);
    for (const t of STEPS) {
      const p = quadSetPose(t);
      expect(p.hip).toEqual(a.hip);
      expect(p.aR[1]).toBe(a.aR[1]);
      expect(Math.abs(p.aR[0] - a.aR[0])).toBeLessThan(1);
    }
    const b = quadSetPose(1);
    expect(b.kR[1] - a.kR[1]).toBeCloseTo(5, 6);
    expect(b.tR[1]).toBeLessThan(a.tR[1] - 4);
  });

  it('quad set: the floor cue under the knee fades in as the knee presses', () => {
    const cue = (t: number) =>
      renderToStaticMarkup(
        <FigureFrame exerciseId="quad-set" pose={quadSetPose(t)} />,
      ).match(/data-testid="press-cue"[^>]*opacity="([^"]+)"/)?.[1];
    expect(Number(cue(0))).toBe(0);
    expect(Number(cue(1))).toBeCloseTo(1, 6);
  });

  it('seated flexion: hip fixed, foot on the floor, shin from about 10 degrees forward to about 27 back, thigh clear of the seat', () => {
    const start = seatedKneeFlexionPose(0);
    const chair = figures['seated-knee-flexion'].props[0];
    if (chair?.type !== 'chair') throw new Error('chair expected');
    const shin = (p: Pose) =>
      (Math.atan2(p.aR[0] - p.kR[0], p.aR[1] - p.kR[1]) * 180) / Math.PI;
    expect(shin(start)).toBeGreaterThan(8);
    expect(shin(start)).toBeLessThan(14);
    expect(start.aR[0]).toBeGreaterThan(start.kR[0]);
    for (const t of STEPS) {
      const p = seatedKneeFlexionPose(t);
      expect(p.hip).toEqual(start.hip);
      expect(p.aR[1]).toBe(174);
      expect(p.tR[1]).toBe(177);
      expect(p.kR[1] + 3).toBeLessThan(chair.y);
    }
    const end = seatedKneeFlexionPose(1);
    expect(shin(end)).toBeLessThan(-24);
    expect(shin(end)).toBeGreaterThan(-31);
    expect(end.aR[0]).toBeLessThan(chair.x + chair.w);
  });

  it('seated flexion: the chair is drawn behind the figure, so the foot passes in front of its legs', () => {
    const html = renderToStaticMarkup(
      <FigureFrame
        exerciseId="seated-knee-flexion"
        pose={figures['seated-knee-flexion'].end}
      />,
    );
    const chair = html.indexOf('V178');
    expect(chair).toBeGreaterThan(-1);
    expect(html.indexOf('data-body-side="near"')).toBeGreaterThan(chair);
    expect(html.indexOf('data-body-side="far"')).toBeGreaterThan(chair);
  });

  it('band knee extension: same movement as E30, anchored at the front chair leg and the ankle, never crossing a chair leg or the far shin', () => {
    const band = figures['band-knee-extension'].band;
    if (!band) throw new Error('band expected');
    expect(band.from).toEqual(BAND_KNEE_ANCHOR);
    const chair = figures['band-knee-extension'].props[0];
    if (chair?.type !== 'chair') throw new Error('chair expected');
    const rearLeg: [Pt, Pt] = [
      [chair.x + 2, chair.y],
      [chair.x + 2, 178],
    ];
    const frontLeg: [Pt, Pt] = [
      [chair.x + chair.w - 2, chair.y],
      [chair.x + chair.w - 2, 178],
    ];
    // The anchor stands just in front of the front leg, on the floor side.
    expect(BAND_KNEE_ANCHOR[0] - frontLeg[0][0]).toBeGreaterThan(1.5);
    expect(BAND_KNEE_ANCHOR[1]).toBeGreaterThan(chair.y);
    for (const t of STEPS) {
      const p = at('band-knee-extension', t);
      expect(p).toEqual(movementPose('seated-knee-extension', t));
      const [from, to] = bandEndpoints(band, p);
      expect(from).toEqual(BAND_KNEE_ANCHOR);
      expect(to).toEqual(p.aR);
      for (const obstacle of [rearLeg, frontLeg, [p.kL, p.aL] as [Pt, Pt]])
        expect(
          intersects(from, to, obstacle[0], obstacle[1]),
          `band crosses an obstacle at t=${t}`,
        ).toBe(false);
    }
  });

  it('band hip extension: trunk upright, straight knee, 20 degrees back, band joins the ankles', () => {
    const band = figures['band-hip-extension'].band;
    if (!band) throw new Error('band expected');
    for (const t of STEPS) {
      const p = bandHipExtensionPose(t);
      expect(Math.abs(p.neck[0] - p.hip[0])).toBeLessThan(2);
      expect(d(p.hip, p.aR)).toBeCloseTo(d(p.hip, p.kR) + d(p.kR, p.aR), 6);
      const [from, to] = bandEndpoints(band, p);
      expect(from).toEqual(p.aL);
      expect(to).toEqual(p.aR);
      expect(p.aL).toEqual(bandHipExtensionPose(0).aL);
    }
    const end = bandHipExtensionPose(1);
    const angle =
      (Math.atan2(end.hip[0] - end.aR[0], end.aR[1] - end.hip[1]) * 180) /
      Math.PI;
    expect(angle).toBeCloseTo(20, 4);
  });

  it('balance clock: standing leg fixed; free toe taps forward in the middle and back at the end', () => {
    const s = balanceClockPose(0);
    for (const t of STEPS) {
      const p = balanceClockPose(t);
      expect(p.aR).toEqual(s.aR);
      expect(p.tR).toEqual(s.tR);
      expect(p.tL[1]).toBeLessThanOrEqual(177 + 1e-9);
    }
    const mid = balanceClockPose(0.5);
    const end = balanceClockPose(1);
    expect(mid.tL[0]).toBeGreaterThan(mid.hip[0] + 20);
    expect(end.tL[0]).toBeLessThan(end.hip[0] - 15);
    expect(mid.tL[1]).toBeCloseTo(177, 6);
    // The swinging knee never travels far in front of the standing knee.
    for (const t of STEPS)
      expect(balanceClockPose(t).kL[0] - s.kR[0]).toBeLessThan(16);
    expect(end.tL[1]).toBeCloseTo(177, 6);
  });

  it('left sets mirror the scene and keep blue on the working limb', () => {
    for (const id of IDS) {
      const html = (working: 'right' | 'left') =>
        renderToStaticMarkup(
          <FigureFrame
            exerciseId={id}
            pose={figures[id].end}
            working={working}
            equipment={id.startsWith('band') ? 'band' : null}
          />,
        );
      const right = html('right');
      const left = html('left');
      expect(right).toContain('>H<');
      expect(left).toContain('>V<');
      expect(left).toContain('scale(-1 1)');
      expect(right).not.toContain('scale(-1 1)');
      for (const out of [right, left])
        expect(out).toMatch(/data-body-side="near" stroke="var\(--accent\)"/);
      expect(left).toMatch(/data-body-side="far" stroke="var\(--edge\)"/);
    }
  });

  it('draws the band only for the band figures and only with equipment', () => {
    const render = (id: PhysioFigureId, equipment: 'band' | null) =>
      renderToStaticMarkup(
        <FigureFrame
          exerciseId={id}
          pose={figures[id].end}
          equipment={equipment}
        />,
      );
    expect(render('band-knee-extension', 'band')).toContain(
      'data-equipment="band"',
    );
    expect(render('band-hip-extension', 'band')).toContain(
      'data-equipment="band"',
    );
    expect(render('band-hip-extension', null)).not.toContain('data-equipment');
    expect(render('quad-set', null)).not.toContain('data-equipment');
  });

  it('balance clock diagram: text alternative, four dots, theme tokens only', () => {
    const html = renderToStaticMarkup(<BalanceClockDiagram working="left" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-labelledby');
    expect(html).toMatch(/<title[^>]*>Balansklockan sedd uppifrån/);
    for (const hour of [12, 3, 6, 9])
      expect(html).toContain(`data-clock-dot="${hour}"`);
    expect(html).toContain('>V<');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}|rgb\(/);
  });

  it('the catalogue lists all five', () => {
    for (const id of IDS)
      expect(exerciseList.some((e) => e.id === id)).toBe(true);
  });
});
