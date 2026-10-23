import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exerciseList } from '../content/exercises';
import { BalanceClockDiagram } from './BalanceClockDiagram';
import { bandEndpoints, bandShape, FigureFrame, movementPose } from './Figure';
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
      const { points } = bandShape(band, p);
      expect(points[0]).toEqual(from);
      expect(points.at(-1)).toEqual(to);
      for (const obstacle of [rearLeg, frontLeg, [p.kL, p.aL] as [Pt, Pt]])
        for (let i = 1; i < points.length; i++)
          expect(
            intersects(
              points[i - 1] as Pt,
              points[i] as Pt,
              obstacle[0],
              obstacle[1],
            ),
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
      expect(from).toEqual([p.aL[0], p.aL[1] - 7]);
      expect(to).toEqual([p.aR[0], p.aR[1] - 7]);
      expect(p.aL).toEqual(bandHipExtensionPose(0).aL);
      // The stance leg is straight and never moves.
      expect(d(p.hip, p.aL)).toBeCloseTo(d(p.hip, p.kL) + d(p.kL, p.aL), 6);
      expect(p.kL).toEqual(bandHipExtensionPose(0).kL);
    }
    const end = bandHipExtensionPose(1);
    const angle =
      (Math.atan2(end.hip[0] - end.aR[0], end.aR[1] - end.hip[1]) * 180) /
      Math.PI;
    expect(angle).toBeCloseTo(20, 4);
  });

  it('balance clock: the far leg stands fixed; the near (working) toe taps forward in the middle and back at the end', () => {
    const s = balanceClockPose(0);
    for (const t of STEPS) {
      const p = balanceClockPose(t);
      expect(p.kL).toEqual(s.kL);
      expect(p.aL).toEqual(s.aL);
      expect(p.tL).toEqual(s.tL);
      expect(p.tR[1]).toBeLessThanOrEqual(177 + 1e-9);
      // Bone lengths stay constant.
      expect(Math.hypot(p.hip[0] - p.kR[0], p.hip[1] - p.kR[1])).toBeCloseTo(
        30,
        4,
      );
      expect(Math.hypot(p.kR[0] - p.aR[0], p.kR[1] - p.aR[1])).toBeCloseTo(
        27,
        4,
      );
    }
    const mid = balanceClockPose(0.5);
    const end = balanceClockPose(1);
    expect(mid.tR[0]).toBeGreaterThan(mid.hip[0] + 20);
    expect(end.tR[0]).toBeLessThan(end.hip[0] - 15);
    expect(mid.tR[1]).toBeCloseTo(177, 6);
    expect(end.tR[1]).toBeCloseTo(177, 6);
    // The moving knee never travels far in front of the standing knee.
    for (const t of STEPS)
      expect(balanceClockPose(t).kR[0] - s.kL[0]).toBeLessThan(13);
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

  const dotsOf = (html: string) =>
    [...html.matchAll(/data-clock-dot="([^"]+)"/g)].map((m) => m[1]);

  it('balance clock diagram right: dots 12, 1.30, 3, 4.30, 6 and no 9', () => {
    const html = renderToStaticMarkup(<BalanceClockDiagram working="right" />);
    expect(html).toContain('role="img"');
    expect(html).toMatch(/<title[^>]*>Balansklockan sedd uppifrån/);
    expect(dotsOf(html)).toEqual(['12', '1.30', '3', '4.30', '6']);
    expect(html).toContain('stå på vänster ben');
    expect(html).toContain('halv två');
    expect(html).toContain('Punkterna lyses upp i tur och ordning.');
    expect(html).toContain('clock-dot-cycle');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,6}|rgb\(/);
  });

  it('balance clock diagram left mirrors: 12, 10.30, 9, 7.30, 6 and no 3', () => {
    const html = renderToStaticMarkup(<BalanceClockDiagram working="left" />);
    expect(dotsOf(html)).toEqual(['12', '10.30', '9', '7.30', '6']);
    expect(html).toContain('stå på höger ben');
    expect(html).toContain('halv elva');
    expect(html).not.toContain('data-clock-dot="3"');
  });

  it('balance clock diagram without a side shows the right half and mentions the mirror', () => {
    const html = renderToStaticMarkup(<BalanceClockDiagram working={null} />);
    expect(dotsOf(html)).toEqual(['12', '1.30', '3', '4.30', '6']);
    expect(html).toContain('speglas');
  });

  it('balance clock diagram paused: no animation and numbers 1-5', () => {
    const html = renderToStaticMarkup(
      <BalanceClockDiagram working="right" paused />,
    );
    expect(html).not.toContain('clock-dot-cycle');
    for (const n of [1, 2, 3, 4, 5])
      expect(html).toContain(`data-order="${n}"`);
    expect(html).toContain('Punkterna är numrerade i ordning.');
    const running = renderToStaticMarkup(
      <BalanceClockDiagram working="right" />,
    );
    expect(running).not.toContain('data-order=');
  });

  it('the bands stay visible in every phase, slack at the start and straight when taut', () => {
    for (const id of ['band-knee-extension', 'band-hip-extension'] as const) {
      const band = figures[id].band;
      if (!band) throw new Error('band expected');
      const start = bandShape(band, at(id, 0));
      expect(start.d).toContain('C');
      const origin = start.points[0] ?? [0, 0];
      const bbox = start.points.reduce(
        (m, p) => Math.max(m, Math.hypot(p[0] - origin[0], p[1] - origin[1])),
        0,
      );
      expect(bbox).toBeGreaterThan(4);
      expect(bandShape(band, at(id, 1)).points).toHaveLength(2);
    }
  });

  it('quad set: framed to fill the card and keeps a blue working leg in overlay mode', () => {
    const html = renderToStaticMarkup(
      <FigureFrame exerciseId="quad-set" pose={quadSetPose(1)} showMuscles />,
    );
    expect(html).toContain('viewBox="24 128 160 52"');
    expect(html).toMatch(/data-body-side="near" stroke="var\(--accent\)"/);
  });

  it('the side marker moves away from a mirrored wall', () => {
    const marker = (
      id: 'band-hip-extension' | 'wall-sit',
      w: 'left' | 'right',
    ) =>
      renderToStaticMarkup(
        <FigureFrame exerciseId={id} pose={figures[id].end} working={w} />,
      ).match(/<text x="(\d+)"/)?.[1];
    expect(marker('band-hip-extension', 'right')).toBe('20');
    expect(marker('band-hip-extension', 'left')).toBe('172');
    expect(marker('wall-sit', 'left')).toBe('20');
    expect(marker('wall-sit', 'right')).toBe('20');
  });

  it('balance clock: a wall support is drawn and a hand rests on it in every phase', () => {
    const props = figures['balance-clock'].props;
    const wall = props.find((pr) => pr.type === 'wall');
    expect(wall).toBeDefined();
    for (const t of STEPS) {
      const p = balanceClockPose(t);
      expect(p.hR[0]).toBeCloseTo(wall?.type === 'wall' ? wall.x - 2 : 0, 6);
    }
  });

  it('the catalogue lists all five', () => {
    for (const id of IDS)
      expect(exerciseList.some((e) => e.id === id)).toBe(true);
  });
});
