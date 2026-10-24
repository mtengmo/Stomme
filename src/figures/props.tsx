import type { Prop } from './poses';

export const FLOOR_Y = 178;

/** Supported press grip: bell body beside and below the hand, along the forearm. */
export function pressGripAngle(
  elbow: readonly [number, number],
  hand: readonly [number, number],
): number {
  return (
    (Math.atan2(elbow[1] - hand[1], elbow[0] - hand[0]) * 180) / Math.PI -
    90 -
    55
  );
}
const PROP = {
  stroke: 'var(--edge)',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

export function FloorLine() {
  return <line x1="8" y1={FLOOR_Y} x2="192" y2={FLOOR_Y} {...PROP} />;
}

export function PropShape({ prop }: { prop: Prop }) {
  switch (prop.type) {
    case 'pull-up-bar':
      return (
        <path
          d={`M${prop.x1} ${prop.y + 12}V${prop.y}H${prop.x2}V${prop.y + 12}`}
          {...PROP}
          stroke="var(--equipment)"
        />
      );
    case 'dip-bars':
      return (
        <g {...PROP} stroke="var(--equipment)">
          <path
            d={`M${prop.x} ${FLOOR_Y}V${prop.y}h${prop.w}v${FLOOR_Y - prop.y}M${prop.x - 10} ${FLOOR_Y}V${prop.y - 3}h${prop.w}`}
          />
        </g>
      );
    case 'chair': {
      const { x, y, w } = prop;
      return (
        <g {...PROP}>
          <path d={`M${x} ${y - 46}V${y}H${x + w}`} />
          <path d={`M${x + 2} ${y}V${FLOOR_Y}M${x + w - 2} ${y}V${FLOOR_Y}`} />
        </g>
      );
    }
    case 'step': {
      const { x, y, w } = prop;
      return (
        <rect
          x={x}
          y={y}
          width={w}
          height={FLOOR_Y - y}
          {...PROP}
          fill="var(--paper)"
        />
      );
    }
    case 'wall':
      return <line x1={prop.x} y1="16" x2={prop.x} y2={FLOOR_Y} {...PROP} />;
    case 'mat':
      return (
        <rect
          x={prop.x1}
          y={FLOOR_Y - 1}
          width={prop.x2 - prop.x1}
          height="5"
          rx="2.5"
          {...PROP}
        />
      );
  }
}

export function Held({
  kind,
  at,
  vertical = false,
  rack = false,
  angle,
}: {
  kind: 'dumbbell' | 'kettlebell';
  at: readonly [number, number];
  vertical?: boolean;
  rack?: boolean;
  angle?: number;
}) {
  const [x, y] = at;
  if (kind === 'dumbbell') {
    return (
      <g
        {...PROP}
        stroke="var(--equipment)"
        strokeWidth={4}
        transform={vertical ? `rotate(90 ${x} ${y})` : undefined}
      >
        <path
          d={`M${x - 8} ${y}H${x + 8}M${x - 8} ${y - 5}V${y + 5}M${x + 8} ${y - 5}V${y + 5}`}
        />
      </g>
    );
  }
  return (
    <g
      {...PROP}
      stroke="var(--equipment)"
      strokeWidth={4}
      transform={
        angle !== undefined
          ? `rotate(${angle} ${x} ${y})`
          : rack
            ? `rotate(-55 ${x} ${y})`
            : undefined
      }
    >
      <path d={`M${x - 5} ${y + 2}A5 6 0 0 1 ${x + 5} ${y + 2}`} />
      <circle
        cx={x}
        cy={y + 12}
        r="9"
        fill={rack ? 'var(--equipment)' : 'var(--paper)'}
      />
    </g>
  );
}
