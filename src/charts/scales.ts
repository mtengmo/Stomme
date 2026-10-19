/** Small scale helpers for hand-written SVG charts. Pure. */

export interface LinearScale {
  (v: number): number;
  domain: [number, number];
  range: [number, number];
}

/** Maps domain to range linearly; a zero-width domain maps to the range middle. */
export function linearScale(
  domain: [number, number],
  range: [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const fn = (v: number) =>
    d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
  return Object.assign(fn, { domain, range });
}

export interface BandScale {
  /** Left edge of band i. */
  (i: number): number;
  bandwidth: number;
  /** Centre of band i. */
  center: (i: number) => number;
}

/** `count` equal bands across range with `padding` (0-1) of each step as gap. */
export function bandScale(
  count: number,
  range: [number, number],
  padding = 0.2,
): BandScale {
  const step = count > 0 ? (range[1] - range[0]) / count : 0;
  const bandwidth = step * (1 - padding);
  const offset = (step - bandwidth) / 2;
  const fn = (i: number) => range[0] + step * i + offset;
  return Object.assign(fn, {
    bandwidth,
    center: (i: number) => fn(i) + bandwidth / 2,
  });
}

function niceStep(raw: number): number {
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export interface NiceTicks {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/** Round ticks covering [min, max], roughly `count` of them. */
export function niceTicks(min: number, max: number, count = 5): NiceTicks {
  if (!(max > min)) {
    const lo = Math.floor(min);
    return { min: lo, max: lo + 1, step: 1, ticks: [lo, lo + 1] };
  }
  const step = niceStep((max - min) / Math.max(1, count - 1));
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) ticks.push(Number((lo + i * step).toFixed(10)));
  return { min: lo, max: hi, step, ticks };
}
