import { useId } from 'react';

/** Top view geometry (160 x 160 viewBox): the person lies with the head up. */
export const PUSH_UP_SHOULDER_HALF = 20;
/** Hands sit a little wider than the shoulders. */
export const PUSH_UP_HAND_HALF = 27;
/** The upper arms point this far back from the trunk. */
export const PUSH_UP_ELBOW_ANGLE_DEG = 45;
const UPPER_ARM = 28;
const FOREARM = 28;
const SHOULDER_Y = 48;

/** Elbow and hand of the right arm (viewer's right), from the shoulder. */
export function pushUpArm(): {
  shoulder: [number, number];
  elbow: [number, number];
  hand: [number, number];
} {
  const a = (PUSH_UP_ELBOW_ANGLE_DEG * Math.PI) / 180;
  const shoulder: [number, number] = [80 + PUSH_UP_SHOULDER_HALF, SHOULDER_Y];
  const elbow: [number, number] = [
    shoulder[0] + UPPER_ARM * Math.sin(a),
    shoulder[1] + UPPER_ARM * Math.cos(a),
  ];
  const handX = 80 + PUSH_UP_HAND_HALF;
  const hand: [number, number] = [
    handX,
    elbow[1] - Math.sqrt(FOREARM ** 2 - (elbow[0] - handX) ** 2),
  ];
  return { shoulder, elbow, hand };
}

const mirror = ([x, y]: [number, number]): [number, number] => [160 - x, y];
const path = (pts: [number, number][]) =>
  `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;

/**
 * Top view of the push-up, the hand placement the side view cannot show:
 * hands a little wider than the shoulders and the elbows about 45 degrees back
 * from the trunk. Static; theme tokens only.
 */
export function PushUpHandDiagram() {
  const id = useId();
  const right = pushUpArm();
  const arms = [
    [right.shoulder, right.elbow, right.hand],
    [mirror(right.shoulder), mirror(right.elbow), mirror(right.hand)],
  ] as const;
  const caption =
    'Sedd uppifrån: händerna något bredare än axlarna, armbågarna snett bakåt (cirka 45 grader från bålen).';
  return (
    <figure
      className="m-0 flex flex-col items-center gap-2"
      data-testid="push-up-hand-diagram"
    >
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label="Armhävningens handplacering sedd uppifrån"
        aria-describedby={`${id}-desc`}
        className="block h-auto w-[14rem] max-w-full"
      >
        <desc id={`${id}-desc`}>{caption}</desc>
        <circle
          cx="80"
          cy="26"
          r="10"
          fill="var(--paper)"
          stroke="var(--ink)"
          strokeWidth="3.5"
        />
        <g
          fill="none"
          stroke="var(--ink)"
          strokeWidth="4"
          strokeLinecap="round"
        >
          <path
            data-shoulders=""
            d={path([
              [80 - PUSH_UP_SHOULDER_HALF, SHOULDER_Y],
              [80 + PUSH_UP_SHOULDER_HALF, SHOULDER_Y],
            ])}
          />
          <path
            d={path([
              [80, SHOULDER_Y],
              [80, 132],
            ])}
          />
          <path
            d={path([
              [74, 136],
              [86, 136],
            ])}
          />
        </g>
        <path
          d={path([
            [80, SHOULDER_Y],
            [80, 90],
          ])}
          fill="none"
          stroke="var(--edge)"
          strokeWidth="2"
          strokeDasharray="3 4"
        />
        <g
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {arms.map(([shoulder, elbow, hand]) => (
            <path
              key={shoulder[0]}
              data-arm=""
              d={path([shoulder, elbow, hand])}
            />
          ))}
        </g>
        {arms.map(([, , hand]) => (
          <rect
            key={hand[0]}
            data-hand=""
            x={hand[0] - 6}
            y={hand[1] - 9}
            width="12"
            height="14"
            rx="4"
            fill="var(--paper)"
            stroke="var(--accent)"
            strokeWidth="3"
          />
        ))}
        <text
          x={right.elbow[0] + 8}
          y={right.elbow[1] + 4}
          fontSize="12"
          fontWeight="800"
          fill="var(--ink)"
        >
          45°
        </text>
      </svg>
      <figcaption className="text-base text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
