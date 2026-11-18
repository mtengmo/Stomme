import type { ReactNode } from 'react';
import type { ExerciseId } from '../domain/types';
import {
  Body,
  Frame,
  HandRect,
  Head,
  type Pt,
  path,
} from './PronePlacementDiagrams';
import {
  KettlebellDeadliftDiagram,
  SupportedRowDiagram,
  TwoHandKettlebellSwingDiagram,
} from './StanceDiagramsHinge';

/**
 * Static top-down (plan view) diagrams for standing exercises whose profile
 * cannot show the foot, knee or arm placement the text asks for. Same style
 * and wiring as the prone diagrams (160 x 160 viewBox, the person faces up,
 * theme tokens only, shown in the exercise card and the set screen). The plan
 * view is schematic: bars are the shoulder and pelvis lines, rectangles the
 * feet with the toes up.
 */
export const STANCE_DIAGRAM_IDS = [
  'squat-jump',
  'jumping-lunge',
  'wall-push-up',
  'calf-raise',
  'squat-curl',
  'thruster',
  'single-arm-thruster',
  'bent-over-row',
  'overhead-triceps-extension',
  'walking-lunge',
  'one-arm-kettlebell-swing',
  'kettlebell-halo',
  'single-leg-hip-thrust',
  'renegade-row',
  'kettlebell-deadlift',
  'kettlebell-swing',
  'supported-row',
] as const satisfies readonly ExerciseId[];

export type StanceDiagramId = (typeof STANCE_DIAGRAM_IDS)[number];

export const hasStanceDiagram = (id: ExerciseId): id is StanceDiagramId =>
  (STANCE_DIAGRAM_IDS as readonly ExerciseId[]).includes(id);

const MID = 80;
/** Half widths of the shoulder and pelvis lines; feet are placed against them. */
export const SHOULDER_HALF = 20;
export const PELVIS_HALF = 12;
const FOOT_W = 9;
const FOOT_H = 16;

/** Foot centre half distance (x from the midline) per exercise. */
export const FOOT_HALF = {
  shoulderWide: 20,
  hipWide: 12,
  widerThanHip: 17,
} as const;

/** Standing plan: head, shoulder line, pelvis line, feet and knees. */
export const STAND = {
  head: [MID, 30] as Pt,
  shoulderY: 54,
  pelvisY: 88,
  kneeY: 100,
  footY: 128,
} as const;

/** Lunge plan: two parallel hip-wide tracks, front foot on one, rear foot on the other. */
export const LUNGE = {
  head: [MID, 74] as Pt,
  shoulderY: 92,
  pelvisY: 120,
  trackHalf: 12,
  frontFootY: 32,
  rearFootY: 146,
  kneeY: 52,
} as const;

export const CALF = { footY: 112, half: FOOT_HALF.hipWide } as const;

/** Wall push-up plan: wall at the top, hands a little wider than the shoulders. */
export const WALL_PUSH_UP = {
  wallY: 14,
  handY: 24,
  handHalf: 27,
  shoulderY: 70,
  shoulderHalf: SHOULDER_HALF,
  pelvisY: 102,
  footY: 136,
  footHalf: FOOT_HALF.hipWide,
} as const;

/** Overhead triceps plan: head from above, upper arms near it (solid) or flared (dashed). */
export const TRICEPS = {
  head: [MID, 78] as Pt,
  headR: 12,
  shoulderY: 114,
  elbowY: 80,
  elbowHalf: 22,
  flaredElbowHalf: 46,
  handY: 100,
  handHalf: 5,
} as const;

/** Halo plan: the weight circles the head at a fixed distance. */
export const HALO = {
  head: [MID, 66] as Pt,
  headR: 12,
  pathR: 30,
  weightR: 6,
  shoulderY: 114,
} as const;

/**
 * Single-leg hip thrust plan (lying on the back, head up): upper back on the
 * bench, pelvis lifted and level, one foot on the floor, the other leg lifted.
 */
export const HIP_THRUST = {
  head: [MID, 20] as Pt,
  benchY: 30,
  benchH: 24,
  benchHalf: 32,
  shoulderY: 42,
  pelvisY: 92,
  pelvisHalf: PELVIS_HALF,
  kneeY: 112,
  footY: 134,
  freeKneeY: 108,
  freeFootY: 124,
} as const;

/** Renegade row plan (plank, head up): two handles under the shoulders, wide feet. */
export const RENEGADE = {
  head: [MID, 20] as Pt,
  shoulderY: 54,
  shoulderHalf: SHOULDER_HALF,
  handY: 46,
  pelvisY: 100,
  pelvisHalf: PELVIS_HALF,
  footY: 140,
  footHalf: 26,
} as const;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** The two foot centres of a stance `half` either side of the midline. */
export const feetAt = (half: number, y: number): [Pt, Pt] => [
  [MID - half, y],
  [MID + half, y],
];

function Bars({
  shoulderY,
  shoulderHalf = SHOULDER_HALF,
  pelvisY,
  pelvisHalf = PELVIS_HALF,
}: {
  shoulderY: number;
  shoulderHalf?: number;
  pelvisY: number;
  pelvisHalf?: number;
}) {
  return (
    <Body>
      <path
        data-shoulders=""
        d={path([
          [MID - shoulderHalf, shoulderY],
          [MID + shoulderHalf, shoulderY],
        ])}
      />
      <path
        d={path([
          [MID, shoulderY],
          [MID, pelvisY],
        ])}
      />
      <path
        data-pelvis=""
        d={path([
          [MID - pelvisHalf, pelvisY],
          [MID + pelvisHalf, pelvisY],
        ])}
      />
    </Body>
  );
}

function Foot({
  at,
  deg = 0,
  ghost = false,
}: {
  at: Pt;
  deg?: number;
  ghost?: boolean;
}) {
  return (
    <rect
      data-foot={ghost ? 'next' : ''}
      x={at[0] - FOOT_W / 2}
      y={at[1] - FOOT_H / 2}
      width={FOOT_W}
      height={FOOT_H}
      rx="3"
      fill={ghost ? 'none' : 'var(--paper)'}
      stroke="var(--ink)"
      strokeWidth="3"
      strokeDasharray={ghost ? '3 3' : undefined}
      transform={deg ? `rotate(${deg} ${at[0]} ${at[1]})` : undefined}
    />
  );
}

/** A knee circle straight above its foot, with a dashed line through the toes. */
function KneeOverFoot({ knee, foot }: { knee: Pt; foot: Pt }) {
  return (
    <>
      <path
        data-knee-line=""
        d={path([knee, [foot[0], foot[1] - FOOT_H / 2 - 6]])}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeDasharray="3 3"
      />
      <circle
        data-knee=""
        cx={knee[0]}
        cy={knee[1]}
        r="5"
        fill="var(--paper)"
        stroke="var(--accent)"
        strokeWidth="3"
      />
    </>
  );
}

function Dumbbell({ at }: { at: Pt }) {
  return (
    <rect
      data-weight=""
      x={at[0] - 8}
      y={at[1] - 3.5}
      width="16"
      height="7"
      rx="2"
      fill="var(--paper)"
      stroke="var(--equipment)"
      strokeWidth="3"
    />
  );
}

function Arrow({ from, to }: { from: Pt; to: Pt }) {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  const head = (da: number): Pt => [
    to[0] - 7 * Math.cos(a + da),
    to[1] - 7 * Math.sin(a + da),
  ];
  return (
    <path
      data-arrow=""
      d={`${path([from, to])}${path([head(0.5), to, head(-0.5)])}`}
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const standKnee = (foot: Pt): Pt => [foot[0], STAND.kneeY];

/** Standing stance with both feet turned out by `toeDeg` and knees over the feet. */
function StandingScene({
  half,
  toeDeg = 8,
  extras,
}: {
  half: number;
  toeDeg?: number;
  extras?: ReactNode;
}) {
  const [left, right] = feetAt(half, STAND.footY);
  return (
    <>
      <Head at={STAND.head} />
      <Bars shoulderY={STAND.shoulderY} pelvisY={STAND.pelvisY} />
      <KneeOverFoot knee={standKnee(left)} foot={left} />
      <KneeOverFoot knee={standKnee(right)} foot={right} />
      <Foot at={left} deg={-toeDeg} />
      <Foot at={right} deg={toeDeg} />
      {extras}
    </>
  );
}

const SHOULDER_WIDE_CAPTION = 'knäna i linje med tårna, inte inåt';

const shoulderWide = (
  testId: string,
  label: string,
  caption: string,
  extras?: ReactNode,
) => (
  <Frame testId={testId} label={label} caption={caption}>
    <StandingScene half={FOOT_HALF.shoulderWide} extras={extras} />
  </Frame>
);

export function SquatJumpDiagram() {
  return shoulderWide(
    'placement-diagram-squat-jump',
    'Knäböj med hopp, fotställning sedd uppifrån',
    `Sedd uppifrån: fötterna axelbrett, ${SHOULDER_WIDE_CAPTION}, vid nedgången och vid landningen.`,
  );
}

export function SquatCurlDiagram() {
  return shoulderWide(
    'placement-diagram-squat-curl',
    'Knäböj med armböjning, fotställning sedd uppifrån',
    `Sedd uppifrån: fötterna axelbrett, ${SHOULDER_WIDE_CAPTION}. En hantel i varje hand hänger vid sidorna.`,
    <>
      <Dumbbell at={[MID - 32, STAND.pelvisY]} />
      <Dumbbell at={[MID + 32, STAND.pelvisY]} />
    </>,
  );
}

export function ThrusterDiagram() {
  return shoulderWide(
    'placement-diagram-thruster',
    'Thruster, fotställning sedd uppifrån',
    `Sedd uppifrån: fötterna axelbrett, ${SHOULDER_WIDE_CAPTION}. Hantlarna vilar vid axlarna.`,
    <>
      <Dumbbell at={[MID - 28, STAND.shoulderY]} />
      <Dumbbell at={[MID + 28, STAND.shoulderY]} />
    </>,
  );
}

export function SingleArmThrusterDiagram() {
  return shoulderWide(
    'placement-diagram-single-arm-thruster',
    'Thruster med en hantel, fotställning sedd uppifrån',
    `Sedd uppifrån: fötterna axelbrett, ${SHOULDER_WIDE_CAPTION}. Axellinjen och bäckenlinjen hålls parallella mot mittlinjen, så att bålen står rak i stället för att luta mot hantelsidan.`,
    <>
      <Dumbbell at={[MID + 28, STAND.shoulderY]} />
      <path
        data-midline=""
        d={path([
          [MID, 18],
          [MID, 144],
        ])}
        fill="none"
        stroke="var(--edge)"
        strokeWidth="2"
        strokeDasharray="3 4"
      />
    </>,
  );
}

export function BentOverRowDiagram() {
  const [left, right] = feetAt(FOOT_HALF.hipWide, 126);
  return (
    <Frame
      testId="placement-diagram-bent-over-row"
      label="Rodd framåtlutad, fotställning sedd uppifrån"
      caption="Sedd uppifrån: fötterna höftbrett med tårna framåt, bålen lutad framåt med axellinjen parallell med bäckenlinjen. En hantel hänger under varje axel."
    >
      <Head at={[MID, 38]} />
      <Bars shoulderY={62} pelvisY={96} />
      <Dumbbell at={[MID - 26, 66]} />
      <Dumbbell at={[MID + 26, 66]} />
      <Foot at={left} />
      <Foot at={right} />
    </Frame>
  );
}

export function KettlebellSwingDiagram() {
  const [left, right] = feetAt(FOOT_HALF.widerThanHip, 122);
  return (
    <Frame
      testId="placement-diagram-one-arm-kettlebell-swing"
      label="Kettlebellsving med en hand, fotställning sedd uppifrån"
      caption="Sedd uppifrån: fötterna bredare än höftbrett med tårna lätt utåt. Axellinjen och bäckenlinjen är parallella hela svingen, så att bålen inte vrids; kettlebellen svänger rakt fram."
    >
      <Head at={[MID, 32]} />
      <Bars shoulderY={58} pelvisY={92} />
      <circle
        data-weight=""
        cx={MID + 8}
        cy={108}
        r="7"
        fill="var(--paper)"
        stroke="var(--equipment)"
        strokeWidth="3"
      />
      <Arrow from={[MID + 8, 98]} to={[MID + 8, 36]} />
      <Foot at={left} deg={-12} />
      <Foot at={right} deg={12} />
    </Frame>
  );
}

function LungeScene({
  next,
  swap,
  dumbbells,
}: {
  next?: boolean;
  swap?: boolean;
  dumbbells?: boolean;
}) {
  const l = LUNGE;
  const frontX = MID - l.trackHalf;
  const rearX = MID + l.trackHalf;
  const front: Pt = [frontX, l.frontFootY];
  const rear: Pt = [rearX, l.rearFootY];
  const track = (x: number) => (
    <path
      key={x}
      data-track=""
      d={path([
        [x, 16],
        [x, 154],
      ])}
      fill="none"
      stroke="var(--edge)"
      strokeWidth="2"
      strokeDasharray="3 4"
    />
  );
  return (
    <>
      <Head at={l.head} />
      {track(frontX)}
      {track(rearX)}
      <Bars shoulderY={l.shoulderY} pelvisY={l.pelvisY} />
      <KneeOverFoot knee={[frontX, l.kneeY]} foot={front} />
      <Foot at={front} />
      <Foot at={rear} />
      {dumbbells ? (
        <>
          <Dumbbell at={[MID - 34, l.pelvisY]} />
          <Dumbbell at={[MID + 34, l.pelvisY]} />
        </>
      ) : null}
      {next ? (
        <Arrow from={[rearX, l.rearFootY - 12]} to={[rearX, 130]} />
      ) : null}
      {swap ? (
        <>
          <Arrow from={[rearX, l.rearFootY - 12]} to={[rearX, 132]} />
          <Arrow from={[frontX, 80]} to={[frontX, 100]} />
        </>
      ) : null}
    </>
  );
}

export function JumpingLungeDiagram() {
  return (
    <Frame
      testId="placement-diagram-jumping-lunge"
      label="Hoppande utfall, fotställning sedd uppifrån"
      caption="Sedd uppifrån: fötterna på två parallella höftbreda linjer, inte på en lina, och det främre knät rakt över foten vid landningen. Benen byter plats i hoppet."
    >
      <LungeScene swap />
    </Frame>
  );
}

export function WalkingLungeDiagram() {
  return (
    <Frame
      testId="placement-diagram-walking-lunge"
      label="Gående utfall, fotställning sedd uppifrån"
      caption="Sedd uppifrån: fötterna på två parallella höftbreda linjer och det främre knät rakt över foten vid varje landning. Bakre foten kliver fram på sin egen linje."
    >
      <LungeScene next dumbbells />
    </Frame>
  );
}

export function WallPushUpDiagram() {
  const w = WALL_PUSH_UP;
  const arms = [-1, 1].map((s) => ({
    shoulder: [MID + s * w.shoulderHalf, w.shoulderY] as Pt,
    hand: [MID + s * w.handHalf, w.handY] as Pt,
  }));
  const [left, right] = feetAt(w.footHalf, w.footY);
  return (
    <Frame
      testId="placement-diagram-wall-push-up"
      label="Armhävning mot vägg, hand- och fotställning sedd uppifrån"
      caption="Sedd uppifrån: händerna på väggen något bredare än axlarna, fötterna höftbrett."
    >
      <rect
        data-support=""
        x="18"
        y={w.wallY - 8}
        width="124"
        height="9"
        rx="3"
        fill="var(--edge)"
        fillOpacity="0.18"
        stroke="var(--edge)"
        strokeWidth="2.5"
      />
      <Head at={[MID, 48]} />
      <Bars shoulderY={w.shoulderY} pelvisY={w.pelvisY} />
      <g
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
      >
        {arms.map((a) => (
          <path key={a.hand[0]} data-arm="" d={path([a.shoulder, a.hand])} />
        ))}
      </g>
      {arms.map((a) => (
        <HandRect key={a.hand[0]} at={[a.hand[0], a.hand[1] + 3]} />
      ))}
      <Foot at={left} />
      <Foot at={right} />
    </Frame>
  );
}

export function CalfRaiseDiagram() {
  const [left, right] = feetAt(CALF.half, CALF.footY);
  const axis = (x: number) => (
    <path
      key={x}
      data-foot-axis=""
      d={path([
        [x, 40],
        [x, 140],
      ])}
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2.5"
      strokeDasharray="3 3"
    />
  );
  return (
    <Frame
      testId="placement-diagram-calf-raise"
      label="Tåhävning, fotställning sedd uppifrån"
      caption="Sedd uppifrån: fötterna parallella och rakt framåt, höftbrett. Hälen lyfts rakt upp utan att fötterna vickar inåt eller utåt, och tyngden ligger jämnt över båda."
    >
      <Head at={STAND.head} />
      <Bars shoulderY={STAND.shoulderY} pelvisY={STAND.pelvisY} />
      {axis(left[0])}
      {axis(right[0])}
      <Foot at={left} />
      <Foot at={right} />
      {[left, right].map((f) => (
        <circle
          key={f[0]}
          data-ball=""
          cx={f[0]}
          cy={f[1] - 3}
          r="2.5"
          fill="var(--accent)"
        />
      ))}
    </Frame>
  );
}

export function OverheadTricepsDiagram() {
  const t = TRICEPS;
  const side = (s: -1 | 1, elbowHalf: number, flared: boolean) => {
    const shoulder: Pt = [MID + s * SHOULDER_HALF, t.shoulderY];
    const elbow: Pt = [MID + s * elbowHalf, t.elbowY];
    const hand: Pt = [MID + s * t.handHalf, t.handY];
    return (
      <path
        key={`${s}${flared}`}
        data-arm={flared ? 'flared' : ''}
        d={path([shoulder, elbow, hand])}
        fill="none"
        stroke={flared ? 'var(--edge)' : 'var(--accent)'}
        strokeWidth={flared ? 3 : 5}
        strokeDasharray={flared ? '4 4' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };
  return (
    <Frame
      testId="placement-diagram-overhead-triceps-extension"
      label="Triceps över huvudet, armbågar sedda uppifrån"
      caption="Sedd uppifrån: upparmarna hålls nära huvudet (heldragna), de faller inte ut åt sidorna (streckade). Vikten hålls med båda händerna bakom huvudet."
    >
      <Body>
        <path
          data-shoulders=""
          d={path([
            [MID - SHOULDER_HALF, t.shoulderY],
            [MID + SHOULDER_HALF, t.shoulderY],
          ])}
        />
      </Body>
      {[-1, 1].map((s) => side(s as -1 | 1, t.flaredElbowHalf, true))}
      <Head at={t.head} />
      {[-1, 1].map((s) => side(s as -1 | 1, t.elbowHalf, false))}
      <Dumbbell at={[MID, t.handY]} />
    </Frame>
  );
}

/** A point on the halo path, `deg` clockwise from straight ahead. */
export const haloPoint = (deg: number): Pt => [
  HALO.head[0] + HALO.pathR * Math.sin(rad(deg)),
  HALO.head[1] - HALO.pathR * Math.cos(rad(deg)),
];

export function KettlebellHaloDiagram() {
  const h = HALO;
  const stops = [0, 90, 180, 270];
  // Direction arrowheads on the path, clockwise, between the stops.
  const heads = [45, 135, 225, 315].map((deg) => {
    const [x, y] = haloPoint(deg);
    const tangent = rad(deg + 90) - Math.PI / 2;
    const tip: Pt = [x + 5 * Math.cos(tangent), y + 5 * Math.sin(tangent)];
    const back = (da: number): Pt => [
      x - 5 * Math.cos(tangent) + 5 * Math.cos(tangent + da),
      y - 5 * Math.sin(tangent) + 5 * Math.sin(tangent + da),
    ];
    return { deg, tip, a: back(Math.PI / 2), b: back(-Math.PI / 2) };
  });
  return (
    <Frame
      testId="placement-diagram-kettlebell-halo"
      label="Kettlebell halo, vikten runt huvudet sedd uppifrån"
      caption="Sedd uppifrån: vikten går ett helt varv runt huvudet, framför, vid sidorna och bakom, på jämnt avstånd utan att nudda huvudet. Pilarna visar riktningen; byt håll efter halva antalet."
    >
      <Body>
        <path
          data-shoulders=""
          d={path([
            [MID - SHOULDER_HALF, h.shoulderY],
            [MID + SHOULDER_HALF, h.shoulderY],
          ])}
        />
      </Body>
      <circle
        data-halo-path=""
        cx={h.head[0]}
        cy={h.head[1]}
        r={h.pathR}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeDasharray="4 4"
      />
      {heads.map((a) => (
        <path
          key={a.deg}
          data-arrow=""
          d={`${path([a.a, a.tip, a.b])}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <Head at={h.head} />
      {stops.map((deg) => {
        const [x, y] = haloPoint(deg);
        return (
          <circle
            key={deg}
            data-weight={deg === 0 ? 'now' : 'stop'}
            cx={x}
            cy={y}
            r={h.weightR}
            fill={deg === 0 ? 'var(--equipment)' : 'var(--paper)'}
            stroke="var(--equipment)"
            strokeWidth="3"
          />
        );
      })}
    </Frame>
  );
}

const levelLine = (y: number) => (
  <path
    key={y}
    data-level=""
    d={path([
      [26, y],
      [134, y],
    ])}
    fill="none"
    stroke="var(--accent)"
    strokeWidth="2"
    strokeDasharray="3 4"
  />
);

const supportBase = (pts: Pt[]) => (
  <path
    data-support-base=""
    d={`${path(pts)}Z`}
    fill="var(--edge)"
    fillOpacity="0.18"
    stroke="var(--edge)"
    strokeWidth="2.5"
    strokeDasharray="4 4"
    strokeLinejoin="round"
  />
);

export function SingleLegHipThrustDiagram() {
  const h = HIP_THRUST;
  const supportHip: Pt = [MID - h.pelvisHalf, h.pelvisY];
  const freeHip: Pt = [MID + h.pelvisHalf, h.pelvisY];
  const supportKnee: Pt = [supportHip[0], h.kneeY];
  const supportFoot: Pt = [supportHip[0], h.footY];
  const freeKnee: Pt = [freeHip[0], h.freeKneeY];
  const freeFoot: Pt = [freeHip[0], h.freeFootY];
  const benchEdge = h.benchY + h.benchH;
  return (
    <Frame
      testId="placement-diagram-single-leg-hip-thrust"
      label="Enbens bäckenlyft, bäcken och stödfot sedda uppifrån"
      caption="Sedd uppifrån: axlarna vilar på stödet, bäckenlinjen är jämn och mitt under bålen, inte tippad åt den lyfta sidan. Den valda foten står i golvet rakt under höften; det andra benet är lyft och bär ingen vikt."
    >
      {supportBase([
        [MID - h.benchHalf, benchEdge],
        [MID + h.benchHalf, benchEdge],
        supportFoot,
      ])}
      <rect
        data-support=""
        x={MID - h.benchHalf}
        y={h.benchY}
        width={2 * h.benchHalf}
        height={h.benchH}
        rx="4"
        fill="var(--edge)"
        fillOpacity="0.18"
        stroke="var(--edge)"
        strokeWidth="2.5"
      />
      {levelLine(h.pelvisY)}
      <Head at={h.head} />
      <Bars
        shoulderY={h.shoulderY}
        pelvisY={h.pelvisY}
        pelvisHalf={h.pelvisHalf}
      />
      <Body>
        <path
          data-leg="support"
          d={path([supportHip, supportKnee, supportFoot])}
        />
        <path
          data-leg="free"
          d={path([freeHip, freeKnee, freeFoot])}
          strokeDasharray="4 4"
        />
      </Body>
      <Foot at={supportFoot} />
      <Foot at={freeFoot} ghost />
    </Frame>
  );
}

export function RenegadeRowDiagram() {
  const r = RENEGADE;
  const handles = [-1, 1].map((s) => ({
    shoulder: [MID + s * r.shoulderHalf, r.shoulderY] as Pt,
    hand: [MID + s * r.shoulderHalf, r.handY] as Pt,
  }));
  const [left, right] = feetAt(r.footHalf, r.footY);
  const row = handles[1]?.hand ?? [MID, r.handY];
  return (
    <Frame
      testId="placement-diagram-renegade-row"
      label="Renegaderodd, handtag, fötter och bäcken sedda uppifrån"
      caption="Sedd uppifrån: handtagen axelbrett isär med händerna rakt under axlarna, fötterna brett isär. Axel- och bäckenlinjen ligger jämnt och parallella hela rodden, utan rotation. Den ena hanteln dras mot höften, den andra stödjer."
    >
      {supportBase([
        [MID - r.shoulderHalf, r.handY],
        [MID + r.shoulderHalf, r.handY],
        right,
        left,
      ])}
      {levelLine(r.shoulderY)}
      {levelLine(r.pelvisY)}
      <Head at={r.head} />
      <Bars
        shoulderY={r.shoulderY}
        pelvisY={r.pelvisY}
        shoulderHalf={r.shoulderHalf}
        pelvisHalf={r.pelvisHalf}
      />
      <Body>
        <path
          data-leg=""
          d={path([
            [MID - r.pelvisHalf, r.pelvisY],
            [left[0], r.footY - 8],
          ])}
        />
        <path
          data-leg=""
          d={path([
            [MID + r.pelvisHalf, r.pelvisY],
            [right[0], r.footY - 8],
          ])}
        />
      </Body>
      <g
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
      >
        {handles.map((a) => (
          <path key={a.hand[0]} data-arm="" d={path([a.shoulder, a.hand])} />
        ))}
      </g>
      {handles.map((a) => (
        <rect
          key={a.hand[0]}
          data-weight=""
          x={a.hand[0] - 4}
          y={a.hand[1] - 10}
          width="8"
          height="20"
          rx="2"
          fill="var(--paper)"
          stroke="var(--equipment)"
          strokeWidth="3"
        />
      ))}
      {handles.map((a) => (
        <HandRect key={a.hand[0]} at={[a.hand[0], a.hand[1] + 2]} />
      ))}
      <Arrow
        from={[row[0] + 14, row[1] + 4]}
        to={[row[0] + 14, r.pelvisY - 6]}
      />
      <Foot at={left} />
      <Foot at={right} />
    </Frame>
  );
}

export function StanceDiagram({ exerciseId }: { exerciseId: ExerciseId }) {
  switch (exerciseId) {
    case 'squat-jump':
      return <SquatJumpDiagram />;
    case 'jumping-lunge':
      return <JumpingLungeDiagram />;
    case 'wall-push-up':
      return <WallPushUpDiagram />;
    case 'calf-raise':
      return <CalfRaiseDiagram />;
    case 'squat-curl':
      return <SquatCurlDiagram />;
    case 'thruster':
      return <ThrusterDiagram />;
    case 'single-arm-thruster':
      return <SingleArmThrusterDiagram />;
    case 'bent-over-row':
      return <BentOverRowDiagram />;
    case 'overhead-triceps-extension':
      return <OverheadTricepsDiagram />;
    case 'walking-lunge':
      return <WalkingLungeDiagram />;
    case 'one-arm-kettlebell-swing':
      return <KettlebellSwingDiagram />;
    case 'kettlebell-halo':
      return <KettlebellHaloDiagram />;
    case 'single-leg-hip-thrust':
      return <SingleLegHipThrustDiagram />;
    case 'renegade-row':
      return <RenegadeRowDiagram />;
    case 'kettlebell-deadlift':
      return <KettlebellDeadliftDiagram />;
    case 'kettlebell-swing':
      return <TwoHandKettlebellSwingDiagram />;
    case 'supported-row':
      return <SupportedRowDiagram />;
    default:
      return null;
  }
}
