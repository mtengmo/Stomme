import type { Prop } from './poses';

export const FLOOR_Y = 178;
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
    case 'chair': {
      const { x, y, w, legInset = 0 } = prop;
      return (
        <g {...PROP}>
          <path d={`M${x} ${y - 46}V${y}H${x + w}`} />
          <path
            d={`M${x + 2} ${y}V${FLOOR_Y}M${x + w - 2 - legInset} ${y}V${FLOOR_Y}`}
          />
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
}: {
  kind: 'dumbbell' | 'kettlebell';
  at: readonly [number, number];
  vertical?: boolean;
  rack?: boolean;
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
      transform={rack ? `rotate(-55 ${x} ${y})` : undefined}
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
