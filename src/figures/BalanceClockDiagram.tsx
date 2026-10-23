import { useId } from 'react';
import type { Working } from './Figure';

const CENTRE = 80;
const REACH = 52;
const CYCLE_SECONDS = 5;

/** Clock positions on the moving foot's own side, clockwise from 12 (right). */
const DOTS = [
  { name: '12', angle: 0, inside: true },
  { name: '1.30', angle: 45, inside: false },
  { name: '3', angle: 90, inside: true },
  { name: '4.30', angle: 135, inside: false },
  { name: '6', angle: 180, inside: true },
] as const;

const MIRROR_NAME: Record<string, string> = {
  '12': '12',
  '1.30': '10.30',
  '3': '9',
  '4.30': '7.30',
  '6': '6',
};

const STYLE = `
@keyframes clock-dot-glow { 0%, 20% { opacity: 1 } 24%, 100% { opacity: 0 } }
.clock-dot-cycle { opacity: 0; animation: clock-dot-glow ${CYCLE_SECONDS}s linear infinite }
`;

/**
 * Top view of the balance clock, the main teaching element: the standing foot
 * in the middle and five dots on the moving foot's own side. The dots light up
 * one after another; `paused` (the pause button or reduced motion) shows a
 * still picture with order numbers instead. Theme tokens only.
 */
export function BalanceClockDiagram({
  working = 'right',
  paused = false,
}: {
  working?: Working | null;
  paused?: boolean;
}) {
  const id = useId();
  const left = working === 'left';
  const sign = left ? -1 : 1;
  const standing = left ? 'höger' : 'vänster';
  const moving = left ? 'vänster' : 'höger';
  const times = left
    ? '12, halv elva, 9, halv åtta och 6'
    : '12, halv två, 3, halv fem och 6';
  const caption = `Sedd uppifrån: håll i ett stöd och stå på ${standing} ben i mitten. Nudda med ${moving} tå klockan ${times}, i den ordningen, och för tillbaka foten till mitten mellan varje. Bilden från sidan visar 12 och 6.${working ? '' : ' Använder du andra foten speglas bilden.'}`;
  const state = paused
    ? 'Punkterna är numrerade i ordning.'
    : 'Punkterna lyses upp i tur och ordning.';
  const points = left
    ? 'Fem punkter ligger på vänster sida: 12 rakt fram, halv elva snett fram, 9 rakt åt vänster, halv åtta snett bak och 6 rakt bakom.'
    : 'Fem punkter ligger på höger sida: 12 rakt fram, halv två snett fram, 3 rakt åt höger, halv fem snett bak och 6 rakt bakom.';
  const description = `Balansklockan sedd uppifrån. Du står på ${standing} ben i mitten med tårna mot 12. ${points} ${caption} ${state}`;
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
        aria-labelledby={`${id}-title`}
        className="block h-auto w-[14rem] max-w-full"
      >
        <title id={`${id}-title`}>{description}</title>
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
          transform={
            left ? `translate(${CENTRE * 2} 0) scale(-1 1)` : undefined
          }
        >
          <path
            d="M80 54C89 54 92 66 90 78C88 90 85 100 80 100C75 100 72 90 70 78C68 66 71 54 80 54Z"
            fill="var(--paper)"
            stroke="var(--edge)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </g>
        {DOTS.map(({ name, angle, inside }, index) => {
          const label = left ? (MIRROR_NAME[name] ?? name) : name;
          const [x, y] = pos(angle, REACH);
          const [lx, ly] = pos(angle, REACH + 24);
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
              {paused ? null : (
                <circle
                  className="clock-dot-cycle"
                  data-cycle-dot={label}
                  cx={x}
                  cy={y}
                  r="15"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="4"
                  style={{ animationDelay: `${index}s` }}
                />
              )}
              <text
                x={inside ? x : lx}
                y={(inside ? y : ly) + 4.5}
                textAnchor="middle"
                fontSize={inside ? 13 : 12}
                fontWeight="800"
                fill="var(--ink)"
              >
                {label}
              </text>
              {paused ? (
                <g data-order={index + 1}>
                  <circle
                    cx={x - sign * 10}
                    cy={y - 10}
                    r="7"
                    fill="var(--accent)"
                  />
                  <text
                    x={x - sign * 10}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="800"
                    fill="var(--paper)"
                  >
                    {index + 1}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-base text-ink-soft">{caption}</figcaption>
    </figure>
  );
}
