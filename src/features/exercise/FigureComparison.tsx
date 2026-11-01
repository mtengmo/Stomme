import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FigureFrame,
  usePrefersReducedMotion,
  type Working,
} from '../../figures/Figure';
import {
  checkPoseGeometry,
  type Violation,
  type ViolationType,
} from '../../figures/keyframes';
import { legacyStepDownPose } from '../../figures/kneeStrengthPoses';
import { cycleProgress } from '../../figures/lerp';
import type { Pose, Prop } from '../../figures/poses';
import {
  mirrorProp,
  STEP_DOWN_PILOT_PROPS,
  stepDownFrames,
  stepDownGateOptions,
  stepDownKeyframePose,
} from '../../figures/stepDownKeyframes';

/** The pre-keyframe E96 scene, frozen for comparison. */
const LEGACY_PROPS: Prop[] = [
  { type: 'step', x: 91, y: 146, w: 36 },
  { type: 'wall', x: 62 },
];

/** One full repetition, in milliseconds, for both versions. */
const CYCLE_MS = 6000;
const HOLD_MS = 800;
const TWEEN_MS = (CYCLE_MS - 2 * HOLD_MS) / 2;
const FRAME_COUNT = 60;

const currentPhase = (u: number) =>
  cycleProgress(u * CYCLE_MS, HOLD_MS, HOLD_MS, TWEEN_MS);

const TYPE_LABEL: Record<ViolationType, string> = {
  'below-floor': 'under golvet',
  'outside-viewbox': 'utanför bilden',
  'foot-in-prop': 'fot inne i steg/vägg',
  'head-clearance': 'huvudet för nära',
  'segment-drift': 'lemmar ändrar längd',
  'limb-asymmetry': 'höger och vänster olika långa',
  'loop-mismatch': 'loopen sluter inte',
  'support-gap': 'stödkontakt saknas',
};

const mirrorPt = ([x, y]: readonly [number, number]): [number, number] => [
  192 - x,
  y,
];

function mirrorPose(p: Pose): Pose {
  return {
    head: mirrorPt(p.head),
    neck: mirrorPt(p.neck),
    hip: mirrorPt(p.hip),
    eR: mirrorPt(p.eR),
    hR: mirrorPt(p.hR),
    eL: mirrorPt(p.eL),
    hL: mirrorPt(p.hL),
    kR: mirrorPt(p.kR),
    aR: mirrorPt(p.aR),
    tR: mirrorPt(p.tR),
    kL: mirrorPt(p.kL),
    aL: mirrorPt(p.aL),
    tL: mirrorPt(p.tL),
  };
}

function currentFrames(side: Working): Pose[] {
  return Array.from({ length: FRAME_COUNT + 1 }, (_, i) => {
    const pose = legacyStepDownPose(currentPhase(i / FRAME_COUNT));
    return side === 'right' ? pose : mirrorPose(pose);
  });
}

function GateSummary({
  title,
  violations,
}: {
  title: string;
  violations: Violation[];
}) {
  const byType = new Map<ViolationType, Violation[]>();
  for (const v of violations)
    byType.set(v.type, [...(byType.get(v.type) ?? []), v]);
  return (
    <div className="rounded-md border-2 border-edge p-3">
      <h3 className="m-0 text-lg font-bold">{title}</h3>
      {violations.length === 0 ? (
        <p className="m-0 text-base" data-testid="gate-pass">
          Godkänd: inga avvikelser.
        </p>
      ) : (
        <>
          <p className="m-0 text-base" data-testid="gate-fail">
            {violations.length} avvikelser:
          </p>
          <ul className="m-0 pl-5 text-base">
            {[...byType.entries()].map(([type, list]) => (
              <li key={type}>
                {TYPE_LABEL[type]} ({list.length}), t.ex.{' '}
                {(list[0] as Violation).detail}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Pilot: the frozen pre-keyframe E96 step-down next to the keyframe + IK version (now the catalogue figure). */
export function FigureComparison() {
  const reduced = usePrefersReducedMotion();
  const [side, setSide] = useState<Working>('right');
  const [u, setU] = useState(0);
  const [playing, setPlaying] = useState(false);
  const uRef = useRef(0);
  uRef.current = u;

  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = (uRef.current + (now - last) / CYCLE_MS) % 1;
      last = now;
      uRef.current = next;
      setU(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const gates = useMemo(() => {
    const catalogueProps = LEGACY_PROPS;
    return {
      current: checkPoseGeometry(
        currentFrames(side),
        stepDownGateOptions(
          side,
          side === 'right' ? catalogueProps : catalogueProps.map(mirrorProp),
        ),
      ),
      keyframes: checkPoseGeometry(
        stepDownFrames(side, FRAME_COUNT),
        stepDownGateOptions(side),
      ),
    };
  }, [side]);

  const cardClass = 'min-w-0 rounded-md border-2 border-edge p-1';
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 pt-3 pb-[var(--app-nav-clear)]">
      <h1 className="m-0 text-3xl font-bold">Figurjämförelse</h1>
      <p className="m-0 text-base text-ink-soft">
        Nedsteg (E96): den tidigare handritade figuren mot den nya med
        nyckelrutor och IK, som nu är katalogfiguren. Bara för granskning.
      </p>
      <div className="grid grid-cols-2 gap-2" data-testid="comparison">
        <div className={cardClass}>
          <FigureFrame
            exerciseId="step-down"
            pose={legacyStepDownPose(currentPhase(u))}
            props={LEGACY_PROPS}
            working={side}
            phase={currentPhase(u)}
            showMuscles={false}
          />
          <p className="m-0 text-center text-base font-bold">Tidigare</p>
        </div>
        <div className={cardClass}>
          <FigureFrame
            exerciseId="step-down"
            pose={stepDownKeyframePose(u)}
            props={STEP_DOWN_PILOT_PROPS}
            working={side}
            phase={u}
            showMuscles={false}
          />
          <p className="m-0 text-center text-base font-bold">
            Nyckelrutor + IK
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="min-h-14 flex-1 rounded-md bg-action px-4 text-lg font-bold text-action-ink disabled:opacity-50"
          disabled={reduced}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing && !reduced ? 'Pausa' : 'Spela'}
        </button>
        <fieldset className="m-0 flex min-w-0 flex-1 gap-1 border-0 p-0">
          <legend className="sr-only">Arbetande sida</legend>
          {(['right', 'left'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={side === s}
              className={`min-h-14 flex-1 rounded-md border-[3px] border-ink px-2 text-lg font-bold ${
                side === s ? 'bg-ink text-paper' : 'bg-surface text-ink'
              }`}
              onClick={() => setSide(s)}
            >
              {s === 'right' ? 'Höger' : 'Vänster'}
            </button>
          ))}
        </fieldset>
      </div>
      <label className="flex flex-col gap-1 text-base font-bold">
        Tid i rörelsen
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={u}
          className="h-12 w-full accent-action"
          onChange={(e) => {
            setPlaying(false);
            setU(Number(e.target.value));
          }}
        />
      </label>
      {reduced ? (
        <p className="m-0 text-base text-ink-soft">
          Din enhet är inställd på minskad rörelse, så ingen automatisk
          uppspelning. Dra i reglaget för att se rutorna.
        </p>
      ) : null}
      <section className="flex flex-col gap-2" aria-label="Geometrikontroll">
        <h2 className="m-0 text-xl font-bold">Geometrikontroll</h2>
        <GateSummary title="Tidigare" violations={gates.current} />
        <GateSummary title="Nyckelrutor + IK" violations={gates.keyframes} />
        <p className="m-0 text-base text-ink-soft">
          Kontrollen prövar {FRAME_COUNT + 1} rutor per version: fötter under
          golvet, utanför bilden eller inne i steget, huvudets avstånd,
          lemlängder som ändras eller skiljer mellan sidorna, och att sista
          rutan är lika med första. Piloten använder ett steg i trapphöjd (cirka
          19 cm) och hälen stannar 5 till 8 cm under steget, utan att nå golvet.
          Tidigare E96 hade ett steg på cirka 43 cm och går cirka 20 cm under
          det, vilket är djupare än källan säger.
        </p>
      </section>
    </div>
  );
}
