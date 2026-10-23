import { useId } from 'react';
import type { Working } from './Figure';

const CENTRE = 60;
const REACH = 46;
/** Clock positions around the standing foot, as degrees clockwise from 12. */
const DOTS = [
  { hour: 12, angle: 0 },
  { hour: 3, angle: 90 },
  { hour: 6, angle: 180 },
  { hour: 9, angle: 270 },
] as const;

const at = (angle: number): [number, number] => [
  CENTRE + REACH * Math.sin((angle * Math.PI) / 180),
  CENTRE - REACH * Math.cos((angle * Math.PI) / 180),
];

/**
 * Static top view of the balance clock: the standing foot in the middle (toes
 * towards 12) and a dot at 12, 3, 6 and 9 for the free toe to touch. Theme
 * tokens only; the text alternative describes the same layout.
 */
export function BalanceClockDiagram({
  working = 'right',
}: {
  working?: Working | null;
}) {
  const id = useId();
  const side =
    working === 'left'
      ? 'vänster'
      : working === 'right'
        ? 'höger'
        : 'det stående';
  const instruction =
    'Sedd uppifrån: stå på foten i mitten och håll i ett stöd. Nudda golvet med den andra tån på 12, 3, 6 och 9 och tillbaka till mitten mellan varje.';
  const animation = 'Rörelsen ovan visar 12 och 6.';
  const description = `Balansklockan sedd uppifrån. Du står på ${side} ben i mitten med tårna mot 12. Fyra punkter ligger runt foten: 12 rakt fram, 3 åt höger, 6 rakt bakom och 9 åt vänster. ${instruction.replace('Sedd uppifrån: ', '')} ${animation}`;
  return (
    <figure
      className="m-0 flex items-center gap-3"
      data-testid="balance-clock-diagram"
    >
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-labelledby={`${id}-title`}
        className="block h-auto w-32 shrink-0"
      >
        <title id={`${id}-title`}>{description}</title>
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={REACH}
          fill="none"
          stroke="var(--edge)"
          strokeWidth="3"
          strokeDasharray="2 6"
          strokeLinecap="round"
        />
        <g transform={working === 'left' ? 'translate(120 0) scale(-1 1)' : ''}>
          <path
            d="M60 42C67 42 69 52 68 62C67 72 65 79 60 79C55 79 53 72 52 62C51 52 53 42 60 42Z"
            fill="var(--paper)"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </g>
        {DOTS.map(({ hour, angle }) => {
          const [x, y] = at(angle);
          return (
            <g key={hour} data-clock-dot={hour}>
              <circle
                cx={x}
                cy={y}
                r="10"
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth="3"
              />
              <text
                x={x}
                y={y + 4.5}
                textAnchor="middle"
                fontSize="13"
                fontWeight="800"
                fill="var(--ink)"
              >
                {hour}
              </text>
            </g>
          );
        })}
        {working ? (
          <text
            x={CENTRE}
            y={CENTRE + 5.5}
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="var(--accent)"
          >
            {working === 'right' ? 'H' : 'V'}
          </text>
        ) : null}
      </svg>
      <figcaption className="text-base text-ink-soft">
        {instruction} {animation}
      </figcaption>
    </figure>
  );
}
