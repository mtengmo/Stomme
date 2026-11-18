import { type ReactNode, useId } from 'react';
import type { ExerciseId } from '../domain/types';
import {
  PUSH_UP_ELBOW_ANGLE_DEG,
  PushUpHandDiagram,
  pushUpArm,
} from './PushUpHandDiagram';

/**
 * Static top-down placement diagrams for the prone exercises whose profile
 * cannot show what the text asks for (hand width, elbow direction, foot width,
 * a level pelvis). The lying body has no oblique model, so these extend the
 * push-up diagram (E54): 160 x 160 viewBox, head up, theme tokens only, shown
 * in the exercise card and the set screen, independent of the figure view.
 */
export const PRONE_DIAGRAM_IDS = [
  'push-up',
  'knee-push-up',
  'decline-push-up',
  'diamond-push-up',
  'plank-arm-lift',
] as const satisfies readonly ExerciseId[];

export type ProneDiagramId = (typeof PRONE_DIAGRAM_IDS)[number];

export const hasPronePlacementDiagram = (
  id: ExerciseId,
): id is ProneDiagramId =>
  (PRONE_DIAGRAM_IDS as readonly ExerciseId[]).includes(id);

export type Pt = [number, number];
const MID = 80;
const SHOULDER_Y = 48;
const SHOULDER_HALF = 20;
const UPPER_ARM = 28;
const FOREARM = 28;

const mirror = ([x, y]: Pt): Pt => [160 - x, y];
export const path = (pts: Pt[]) =>
  `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;

/** Knees of the knee push-up (hip wide, on a folded towel). */
export const KNEE_PUSH_UP_KNEES: readonly [Pt, Pt] = [
  [MID - 9, 128],
  [MID + 9, 128],
];
/** Feet of the decline push-up on the chair seat. */
export const DECLINE_PUSH_UP_FEET: readonly [Pt, Pt] = [
  [MID - 8, 140],
  [MID + 8, 140],
];

/** Diamond push-up: hands together under the chest, elbows close to the sides. */
export const DIAMOND_HAND_HALF = 14;
export const DIAMOND_ELBOW_ANGLE_DEG = 25;

/** Right arm (viewer's right) of the diamond push-up, from the shoulder. */
export function diamondArm(): { shoulder: Pt; elbow: Pt; hand: Pt } {
  const a = (DIAMOND_ELBOW_ANGLE_DEG * Math.PI) / 180;
  const shoulder: Pt = [MID + SHOULDER_HALF, SHOULDER_Y];
  const elbow: Pt = [
    shoulder[0] + UPPER_ARM * Math.sin(a),
    shoulder[1] + UPPER_ARM * Math.cos(a),
  ];
  const handX = MID + DIAMOND_HAND_HALF;
  const hand: Pt = [
    handX,
    elbow[1] - Math.sqrt(FOREARM ** 2 - (elbow[0] - handX) ** 2),
  ];
  return { shoulder, elbow, hand };
}

/** Plank arm lift, top view: forearms parallel, one arm reaches forward. */
export const PLANK_LIFT = {
  head: [MID, 30] as Pt,
  shoulderY: 56,
  shoulderHalf: 18,
  forearm: 24,
  reach: 42,
  pelvisY: 100,
  pelvisHalf: 12,
  footY: 142,
  footHalf: 10,
} as const;

/** The left forearm stays down; the right arm is lifted and carries no weight. */
export function plankArmLiftPoints() {
  const { shoulderY, shoulderHalf, forearm, reach, footY, footHalf } =
    PLANK_LIFT;
  const leftElbow: Pt = [MID - shoulderHalf, shoulderY];
  const rightShoulder: Pt = [MID + shoulderHalf, shoulderY];
  return {
    leftElbow,
    leftHand: [leftElbow[0], shoulderY - forearm] as Pt,
    rightShoulder,
    rightHand: [rightShoulder[0], shoulderY - reach] as Pt,
    leftFoot: [MID - footHalf, footY] as Pt,
    rightFoot: [MID + footHalf, footY] as Pt,
  };
}

export function Frame({
  testId,
  label,
  caption,
  children,
}: {
  testId: string;
  label: string;
  caption: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <figure
      className="m-0 flex flex-col items-center gap-2"
      data-testid={testId}
    >
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label={label}
        aria-describedby={`${id}-desc`}
        className="block h-auto w-[14rem] max-w-full"
      >
        <desc id={`${id}-desc`}>{caption}</desc>
        {children}
      </svg>
      <figcaption className="text-base text-ink-soft">{caption}</figcaption>
    </figure>
  );
}

export const Head = ({ at = [MID, 26] }: { at?: Pt }) => (
  <circle
    cx={at[0]}
    cy={at[1]}
    r="10"
    fill="var(--paper)"
    stroke="var(--ink)"
    strokeWidth="3.5"
  />
);

export const Body = ({ children }: { children: ReactNode }) => (
  <g fill="none" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round">
    {children}
  </g>
);

export const HandRect = ({ at }: { at: Pt }) => (
  <rect
    data-hand=""
    x={at[0] - 6}
    y={at[1] - 9}
    width="12"
    height="14"
    rx="4"
    fill="var(--paper)"
    stroke="var(--accent)"
    strokeWidth="3"
  />
);

const Arms = ({ arms }: { arms: readonly (readonly [Pt, Pt, Pt])[] }) => (
  <>
    <g
      fill="none"
      stroke="var(--accent)"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {arms.map(([shoulder, elbow, hand]) => (
        <path key={shoulder[0]} data-arm="" d={path([shoulder, elbow, hand])} />
      ))}
    </g>
    {arms.map(([, , hand]) => (
      <HandRect key={hand[0]} at={hand} />
    ))}
  </>
);

const Support = ({ rect }: { rect: [number, number, number, number] }) => (
  <rect
    data-support=""
    x={rect[0]}
    y={rect[1]}
    width={rect[2]}
    height={rect[3]}
    rx="4"
    fill="var(--edge)"
    fillOpacity="0.18"
    stroke="var(--edge)"
    strokeWidth="2.5"
  />
);

const Spine = ({ to }: { to: number }) => (
  <>
    <path
      data-shoulders=""
      d={path([
        [MID - SHOULDER_HALF, SHOULDER_Y],
        [MID + SHOULDER_HALF, SHOULDER_Y],
      ])}
    />
    <path
      d={path([
        [MID, SHOULDER_Y],
        [MID, to],
      ])}
    />
  </>
);

const AngleLabel = ({ at, deg }: { at: Pt; deg: number }) => (
  <text
    x={at[0] + 8}
    y={at[1] + 4}
    fontSize="12"
    fontWeight="800"
    fill="var(--ink)"
  >
    {deg}°
  </text>
);

function pushUpArms() {
  const right = pushUpArm();
  return [
    [right.shoulder, right.elbow, right.hand],
    [mirror(right.shoulder), mirror(right.elbow), mirror(right.hand)],
  ] as const;
}

export function KneePushUpDiagram() {
  const caption =
    'Sedd uppifrån: händerna något bredare än axlarna, armbågarna snett bakåt (cirka 45 grader från bålen) och knäna höftbrett på handduken.';
  return (
    <Frame
      testId="placement-diagram-knee-push-up"
      label="Armhävning på knä, handplacering sedd uppifrån"
      caption={caption}
    >
      <Head />
      <Support rect={[MID - 22, 120, 44, 16]} />
      <Body>
        <Spine to={100} />
        <path
          d={path([
            [MID - 10, 100],
            [MID + 10, 100],
          ])}
        />
        {KNEE_PUSH_UP_KNEES.map((knee) => (
          <path
            key={knee[0]}
            data-leg=""
            d={path([[knee[0] > MID ? MID + 10 : MID - 10, 100], knee])}
          />
        ))}
      </Body>
      {KNEE_PUSH_UP_KNEES.map((knee) => (
        <circle
          key={knee[0]}
          data-knee=""
          cx={knee[0]}
          cy={knee[1]}
          r="5"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="3"
        />
      ))}
      <Arms arms={pushUpArms()} />
      <AngleLabel at={pushUpArm().elbow} deg={PUSH_UP_ELBOW_ANGLE_DEG} />
    </Frame>
  );
}

export function DeclinePushUpDiagram() {
  const caption =
    'Sedd uppifrån: händerna i golvet något bredare än axlarna, armbågarna snett bakåt (cirka 45 grader från bålen) och tårna på stolens sits.';
  return (
    <Frame
      testId="placement-diagram-decline-push-up"
      label="Armhävning med fötterna på stol, handplacering sedd uppifrån"
      caption={caption}
    >
      <Head />
      <Support rect={[MID - 28, 130, 56, 26]} />
      <Body>
        <Spine to={124} />
        {DECLINE_PUSH_UP_FEET.map((foot) => (
          <path
            key={foot[0]}
            data-foot=""
            d={path([[MID, 124], [foot[0], foot[1] - 4], foot])}
          />
        ))}
      </Body>
      <Arms arms={pushUpArms()} />
      <AngleLabel at={pushUpArm().elbow} deg={PUSH_UP_ELBOW_ANGLE_DEG} />
    </Frame>
  );
}

export function DiamondPushUpDiagram() {
  const right = diamondArm();
  const arms = [
    [right.shoulder, right.elbow, right.hand],
    [mirror(right.shoulder), mirror(right.elbow), mirror(right.hand)],
  ] as const;
  const [hx, hy] = right.hand;
  // The diamond between the two hands: thumbs meet below, index fingers above.
  const inner = hx - 6;
  const diamond: Pt[] = [
    [MID, hy - 8],
    [inner, hy + 1],
    [MID, hy + 10],
    [160 - inner, hy + 1],
  ];
  const caption =
    'Sedd uppifrån: händerna tätt under bröstet så att tummar och pekfingrar bildar en diamant, armbågarna nära sidorna (cirka 25 grader från bålen).';
  return (
    <Frame
      testId="placement-diagram-diamond-push-up"
      label="Diamantarmhävningens handplacering sedd uppifrån"
      caption={caption}
    >
      <Head />
      <Body>
        <Spine to={132} />
        <path
          d={path([
            [MID - 6, 136],
            [MID + 6, 136],
          ])}
        />
      </Body>
      <Arms arms={arms} />
      <path
        data-diamond=""
        d={`${path(diamond)}Z`}
        fill="none"
        stroke="var(--equipment)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <AngleLabel at={right.elbow} deg={DIAMOND_ELBOW_ANGLE_DEG} />
    </Frame>
  );
}

export function PlankArmLiftDiagram() {
  const c = PLANK_LIFT;
  const p = plankArmLiftPoints();
  const caption =
    'Sedd uppifrån: underarmarna parallella, den ena armen sträckt framåt, bäckenet jämnt (inte vridet) och fötterna med lite avstånd. Stödytan är den andra underarmen och båda fötterna.';
  return (
    <Frame
      testId="placement-diagram-plank-arm-lift"
      label="Planka med armlyft sedd uppifrån"
      caption={caption}
    >
      <Head at={c.head} />
      <path
        data-support-base=""
        d={`${path([p.leftElbow, p.rightFoot, p.leftFoot])}Z`}
        fill="var(--edge)"
        fillOpacity="0.18"
        stroke="var(--edge)"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        strokeLinejoin="round"
      />
      <Body>
        <path
          data-shoulders=""
          d={path([
            [MID - c.shoulderHalf, c.shoulderY],
            [MID + c.shoulderHalf, c.shoulderY],
          ])}
        />
        <path
          d={path([
            [MID, c.shoulderY],
            [MID, c.pelvisY],
          ])}
        />
        <path
          data-pelvis=""
          d={path([
            [MID - c.pelvisHalf, c.pelvisY],
            [MID + c.pelvisHalf, c.pelvisY],
          ])}
        />
        <path d={path([[MID - c.pelvisHalf + 4, c.pelvisY], p.leftFoot])} />
        <path d={path([[MID + c.pelvisHalf - 4, c.pelvisY], p.rightFoot])} />
      </Body>
      <g
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path data-forearm="" d={path([p.leftElbow, p.leftHand])} />
        <path data-lifted-arm="" d={path([p.rightShoulder, p.rightHand])} />
      </g>
      <HandRect at={p.leftHand} />
      <HandRect at={p.rightHand} />
      {[p.leftFoot, p.rightFoot].map((foot) => (
        <rect
          key={foot[0]}
          data-foot=""
          x={foot[0] - 4}
          y={foot[1] - 2}
          width="8"
          height="12"
          rx="3"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="3"
        />
      ))}
    </Frame>
  );
}

/** The placement diagram of a prone exercise (exercise card and set screen). */
export function PronePlacementDiagram({
  exerciseId,
}: {
  exerciseId: ExerciseId;
}) {
  switch (exerciseId) {
    case 'push-up':
      return <PushUpHandDiagram />;
    case 'knee-push-up':
      return <KneePushUpDiagram />;
    case 'decline-push-up':
      return <DeclinePushUpDiagram />;
    case 'diamond-push-up':
      return <DiamondPushUpDiagram />;
    case 'plank-arm-lift':
      return <PlankArmLiftDiagram />;
    default:
      return null;
  }
}
