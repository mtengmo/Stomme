import { type ReactNode, useId } from 'react';
import type { Working } from './Figure';

const CENTRE = 80;
const REACH = 52;

/** Clock positions on the moving foot's own side, clockwise from 12 (right). */
const DOTS = [
  { name: '12', angle: 0, inside: true },
  { name: '1.30', angle: 45, inside: false },
  { name: '3', angle: 90, inside: true },
  { name: '4.30', angle: 135, inside: false },
  { name: '6', angle: 180, inside: true },
] as const;

/** Outline of a left foot seen from above, toes towards 12. */
const FOOT =
  'M79 101C73 101 70 95 70 88C70 78 68 70 69 64C70 56 76 52 84 51C90 50 92 56 91 64C90 74 89 82 88 90C87 97 85 101 79 101Z';

const MIRROR_NAME: Record<string, string> = {
  '12': '12',
  '1.30': '10.30',
  '3': '9',
  '4.30': '7.30',
  '6': '6',
};

/** Offset of each order badge from its dot (right side), clear of rings and labels. */
const BADGE_OFFSET: [number, number][] = [
  [17.7, -17.7],
  [26, 0],
  [17.7, 17.7],
  [26, 0],
  [17.7, 17.7],
];

// Two seconds per dot (ten for the lap): lit for the first 1.2 s, then a dim
// beat on the standing foot while the moving foot returns to the middle.
const SLOT_SECONDS = 2;
const CYCLE_SECONDS = SLOT_SECONDS * DOTS.length;
const STYLE = `
@keyframes clock-dot-glow { 0%, 12% { opacity: 1 } 14%, 100% { opacity: 0 } }
@keyframes clock-foot-beat { 0%, 68% { opacity: 0 } 74%, 96% { opacity: 1 } 100% { opacity: 0 } }
.clock-dot-cycle { opacity: 0; animation: clock-dot-glow ${CYCLE_SECONDS}s linear infinite }
.clock-foot-beat { opacity: 0; animation: clock-foot-beat ${SLOT_SECONDS}s linear infinite }
`;

/**
 * Top view of the balance clock, the main teaching element: the standing foot
 * in the middle and five dots on the moving foot's own side. The dots fill in
 * one after another; `paused` (the pause button or reduced motion) stops the
 * animation. Order numbers show in both states. Theme tokens only.
 */
export function BalanceClockDiagram({
  working = 'right',
  paused = false,
  children,
}: {
  working?: Working | null;
  paused?: boolean;
  /** Controls shown directly under the picture, above the caption. */
  children?: ReactNode;
}) {
  const id = useId();
  const left = working === 'left';
  const sign = left ? -1 : 1;
  const standing = left ? 'höger' : 'vänster';
  const moving = left ? 'vänster' : 'höger';
  const times = left
    ? '12, halv elva (10.30), 9, halv åtta (7.30), 6'
    : '12, halv två (1.30), 3, halv fem (4.30), 6';
  const caption = `Håll i ett stöd. Nudda med ${moving} tå: ${times}. För tillbaka foten till mitten mellan varje.${working ? '' : ' Använder du andra foten speglas bilden.'}`;
  const points = left
    ? 'Fem punkter ligger på vänster sida: 12 rakt fram, halv elva snett fram, 9 rakt åt vänster, halv åtta snett bak och 6 rakt bakom.'
    : 'Fem punkter ligger på höger sida: 12 rakt fram, halv två snett fram, 3 rakt åt höger, halv fem snett bak och 6 rakt bakom.';
  const state = paused
    ? 'Rörelsen står still.'
    : 'Punkterna fylls i tur och ordning.';
  const description = `Du står på ${standing} ben i mitten med tårna mot 12. ${points} Punkterna är numrerade 1 till 5 i ordning. ${state}`;
  const pos = (angle: number, r: number): [number, number] => [
    CENTRE + sign * r * Math.sin((angle * Math.PI) / 180),
    CENTRE - r * Math.cos((angle * Math.PI) / 180),
  ];
  const arcEnd = pos(180, REACH);
  const arcStart = pos(0, REACH);
  return (
    <figure
      className="m-0 flex flex-col items-center gap-2"
      data-testid="balance-clock-diagram"
    >
      <svg
        viewBox="0 0 160 160"
        role="img"
        aria-label="Balansklockan sedd uppifrån"
        aria-describedby={`${id}-desc`}
        className="block h-auto w-[14rem] max-w-full"
      >
        <desc id={`${id}-desc`}>{description}</desc>
        {paused ? null : <style>{STYLE}</style>}
        <path
          d={`M${arcStart[0]} ${arcStart[1]}A${REACH} ${REACH} 0 0 ${left ? 0 : 1} ${arcEnd[0]} ${arcEnd[1]}`}
          fill="none"
          stroke="var(--edge)"
          strokeWidth="3"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        <g
          data-standing-foot={standing}
          transform={
            left ? `translate(${CENTRE * 2} 0) scale(-1 1)` : undefined
          }
        >
          {/* A left foot seen from above: big toe on the inner (right) side. */}
          <path
            d={FOOT}
            fill="var(--paper)"
            stroke="var(--ink-soft)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M72 63Q80 57 90 59"
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {paused ? null : (
            <path
              className="clock-foot-beat"
              d={FOOT}
              fill="var(--accent)"
              fillOpacity="0.35"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          )}
        </g>
        {DOTS.map(({ name, angle, inside }, index) => {
          const label = left ? (MIRROR_NAME[name] ?? name) : name;
          const [x, y] = pos(angle, REACH);
          const [lx, ly] = pos(angle, REACH + 24);
          const [ox, oy] = BADGE_OFFSET[index] ?? [0, 0];
          const labelX = inside ? x : lx;
          const labelY = (inside ? y : ly) + 4.5;
          const delay = `${index * SLOT_SECONDS}s`;
          return (
            <g key={name} data-clock-dot={label}>
              <circle
                cx={x}
                cy={y}
                r="11"
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth="3"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fontSize={inside ? 13 : 12}
                fontWeight="800"
                fill="var(--ink)"
              >
                {label}
              </text>
              {paused ? null : (
                <g
                  className="clock-dot-cycle"
                  data-cycle-dot={label}
                  style={{ animationDelay: delay }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="11"
                    fill="var(--accent)"
                    stroke="var(--accent)"
                    strokeWidth="3"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="15.5"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                  />
                  {inside ? (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight="800"
                      fill="var(--paper)"
                    >
                      {label}
                    </text>
                  ) : null}
                </g>
              )}
              <g data-order={index + 1}>
                <circle
                  cx={x + sign * ox}
                  cy={y + oy}
                  r="8.5"
                  fill="var(--accent)"
                />
                <text
                  x={x + sign * ox}
                  y={y + oy + 4.3}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  fill="var(--paper)"
                >
                  {index + 1}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      {children}
      <figcaption className="text-base text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
