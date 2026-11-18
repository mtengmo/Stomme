import type { ReactNode } from 'react';
import {
  Body,
  Frame,
  HandRect,
  Head,
  type Pt,
  path,
} from './PronePlacementDiagrams';

/**
 * Static top-down (plan view) diagrams for the hip-hinge exercises whose
 * profile cannot show the stance width, where the weight sits or that the
 * trunk stays square: kettlebell deadlift, two-handed kettlebell swing and the
 * supported one-arm row. Same style and wiring as `StanceDiagrams.tsx` (160 x
 * 160 viewBox, the person faces up, theme tokens only); registered there.
 */
const MID = 80;
const SHOULDER_HALF = 20;
const PELVIS_HALF = 12;
const FOOT_W = 9;
const FOOT_H = 16;

/** Where each diagram puts its parts; the tests read the same numbers. */
export const DEADLIFT_PLAN = {
  head: [MID, 36] as Pt,
  shoulderY: 60,
  pelvisY: 94,
  footHalf: 18,
  footY: 126,
  weightY: 126,
  handY: 112,
} as const;

export const TWO_HAND_SWING_PLAN = {
  head: [MID, 32] as Pt,
  shoulderY: 58,
  pelvisY: 92,
  footHalf: 22,
  footY: 122,
  toeDeg: 15,
  weightY: 112,
  handY: 78,
} as const;

export const SUPPORTED_ROW_PLAN = {
  head: [MID, 40] as Pt,
  stepY: 8,
  stepH: 16,
  stepHalf: 34,
  shoulderY: 62,
  pelvisY: 96,
  footHalf: 12,
  footY: 128,
  supportHandY: 30,
  rowStartY: 66,
  rowEndY: 90,
} as const;

const Foot = ({ at, deg = 0 }: { at: Pt; deg?: number }) => (
  <rect
    data-foot=""
    x={at[0] - FOOT_W / 2}
    y={at[1] - FOOT_H / 2}
    width={FOOT_W}
    height={FOOT_H}
    rx="3"
    fill="var(--paper)"
    stroke="var(--ink)"
    strokeWidth="3"
    transform={deg ? `rotate(${deg} ${at[0]} ${at[1]})` : undefined}
  />
);

const Bars = ({
  shoulderY,
  pelvisY,
}: {
  shoulderY: number;
  pelvisY: number;
}) => (
  <Body>
    <path
      data-shoulders=""
      d={path([
        [MID - SHOULDER_HALF, shoulderY],
        [MID + SHOULDER_HALF, shoulderY],
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
        [MID - PELVIS_HALF, pelvisY],
        [MID + PELVIS_HALF, pelvisY],
      ])}
    />
  </Body>
);

const Level = ({ y }: { y: number }) => (
  <path
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

const Bell = ({ at }: { at: Pt }) => (
  <circle
    data-weight=""
    cx={at[0]}
    cy={at[1]}
    r="8"
    fill="var(--paper)"
    stroke="var(--equipment)"
    strokeWidth="3"
  />
);

const Arrow = ({ from, to }: { from: Pt; to: Pt }) => {
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
};

const Arms = ({ arms }: { arms: readonly (readonly [Pt, Pt])[] }) => (
  <g
    fill="none"
    stroke="var(--accent)"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {arms.map(([shoulder, hand]) => (
      <path key={shoulder[0]} data-arm="" d={path([shoulder, hand])} />
    ))}
  </g>
);

const shoulders = (y: number): [Pt, Pt] => [
  [MID - SHOULDER_HALF, y],
  [MID + SHOULDER_HALF, y],
];

function Legs({ pelvisY, feet }: { pelvisY: number; feet: readonly [Pt, Pt] }) {
  return (
    <Body>
      <path
        data-leg=""
        d={path([
          [MID - PELVIS_HALF, pelvisY],
          [feet[0][0], feet[0][1] - 8],
        ])}
      />
      <path
        data-leg=""
        d={path([
          [MID + PELVIS_HALF, pelvisY],
          [feet[1][0], feet[1][1] - 8],
        ])}
      />
    </Body>
  );
}

export function KettlebellDeadliftDiagram(): ReactNode {
  const p = DEADLIFT_PLAN;
  const feet: [Pt, Pt] = [
    [MID - p.footHalf, p.footY],
    [MID + p.footHalf, p.footY],
  ];
  const [leftShoulder, rightShoulder] = shoulders(p.shoulderY);
  const leftHand: Pt = [MID - 6, p.handY];
  const rightHand: Pt = [MID + 6, p.handY];
  return (
    <Frame
      testId="placement-diagram-kettlebell-deadlift"
      label="Marklyft med kettlebell, fötter, vikt och grepp sedda uppifrån"
      caption="Sedd uppifrån: fötterna axelbrett isär med kettlebellen mitt emellan dem. Båda händerna griper samma handtag rakt under axlarna; axellinjen och bäckenlinjen är parallella och höften går bakåt, inte åt sidan."
    >
      <Level y={p.shoulderY} />
      <Level y={p.pelvisY} />
      <Head at={p.head} />
      <Bars shoulderY={p.shoulderY} pelvisY={p.pelvisY} />
      <Legs pelvisY={p.pelvisY} feet={feet} />
      <Arms
        arms={[
          [leftShoulder, leftHand],
          [rightShoulder, rightHand],
        ]}
      />
      <Bell at={[MID, p.weightY]} />
      <HandRect at={[leftHand[0], leftHand[1] + 2]} />
      <HandRect at={[rightHand[0], rightHand[1] + 2]} />
      <Foot at={feet[0]} />
      <Foot at={feet[1]} />
    </Frame>
  );
}

export function TwoHandKettlebellSwingDiagram(): ReactNode {
  const p = TWO_HAND_SWING_PLAN;
  const feet: [Pt, Pt] = [
    [MID - p.footHalf, p.footY],
    [MID + p.footHalf, p.footY],
  ];
  const [leftShoulder, rightShoulder] = shoulders(p.shoulderY);
  const leftHand: Pt = [MID - 6, p.handY];
  const rightHand: Pt = [MID + 6, p.handY];
  return (
    <Frame
      testId="placement-diagram-kettlebell-swing"
      label="Kettlebellsving med två händer, fotställning och viktens väg sedda uppifrån"
      caption="Sedd uppifrån: fötterna lite bredare än höftbrett med tårna lätt utåt. Vikten passerar mellan benen bakåt och svänger rakt fram igen; axellinjen och bäckenlinjen är parallella hela svingen."
    >
      <Level y={p.shoulderY} />
      <Level y={p.pelvisY} />
      <Head at={p.head} />
      <Bars shoulderY={p.shoulderY} pelvisY={p.pelvisY} />
      <Legs pelvisY={p.pelvisY} feet={feet} />
      <Arms
        arms={[
          [leftShoulder, leftHand],
          [rightShoulder, rightHand],
        ]}
      />
      <HandRect at={[leftHand[0], leftHand[1] + 2]} />
      <HandRect at={[rightHand[0], rightHand[1] + 2]} />
      <Bell at={[MID, p.weightY]} />
      <Arrow from={[MID, p.weightY + 12]} to={[MID, 148]} />
      <Arrow from={[MID + 14, p.weightY]} to={[MID + 14, 30]} />
      <Foot at={feet[0]} deg={-p.toeDeg} />
      <Foot at={feet[1]} deg={p.toeDeg} />
    </Frame>
  );
}

export function SupportedRowDiagram(): ReactNode {
  const p = SUPPORTED_ROW_PLAN;
  const feet: [Pt, Pt] = [
    [MID - p.footHalf, p.footY],
    [MID + p.footHalf, p.footY],
  ];
  const [leftShoulder, rightShoulder] = shoulders(p.shoulderY);
  const supportHand: Pt = [MID - SHOULDER_HALF, p.supportHandY];
  const rowHand: Pt = [MID + SHOULDER_HALF, p.rowStartY];
  return (
    <Frame
      testId="placement-diagram-supported-row"
      label="Enarmsrodd med stöd, stödhand, axlar och bäcken sedda uppifrån"
      caption="Sedd uppifrån: den fria handen på ett stadigt stöd rakt under axeln, hanteln i den andra handen under axeln. Axellinjen och bäckenlinjen ligger jämnt och parallella, så att bålen inte vrids när vikten dras mot höften."
    >
      <rect
        data-support=""
        x={MID - p.stepHalf}
        y={p.stepY}
        width={2 * p.stepHalf}
        height={p.stepH}
        rx="4"
        fill="var(--edge)"
        fillOpacity="0.18"
        stroke="var(--edge)"
        strokeWidth="2.5"
      />
      <Level y={p.shoulderY} />
      <Level y={p.pelvisY} />
      <Head at={p.head} />
      <Bars shoulderY={p.shoulderY} pelvisY={p.pelvisY} />
      <Legs pelvisY={p.pelvisY} feet={feet} />
      <Arms
        arms={[
          [leftShoulder, supportHand],
          [rightShoulder, rowHand],
        ]}
      />
      <HandRect at={[supportHand[0], supportHand[1] + 2]} />
      <rect
        data-weight=""
        x={rowHand[0] - 4}
        y={rowHand[1] - 10}
        width="8"
        height="20"
        rx="2"
        fill="var(--paper)"
        stroke="var(--equipment)"
        strokeWidth="3"
      />
      <HandRect at={[rowHand[0], rowHand[1] + 2]} />
      <Arrow
        from={[rowHand[0] + 14, rowHand[1]]}
        to={[rowHand[0] + 14, p.rowEndY]}
      />
      <Foot at={feet[0]} />
      <Foot at={feet[1]} />
    </Frame>
  );
}
