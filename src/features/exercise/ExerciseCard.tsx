import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  equipmentLabels,
  exerciseMetadata,
  technicalLevelLabels,
} from '../../content/exerciseMetadata';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import { exerciseMuscles, muscleGroups } from '../../content/muscles';
import { templates } from '../../content/templates';
import type { Exercise, ExerciseId } from '../../domain/types';
import type { Equipment } from '../../figures/Figure';
import {
  Figure,
  FigureFrame,
  movementPose,
  usePrefersReducedMotion,
} from '../../figures/Figure';
import { MuscleMap } from '../../figures/MuscleMap';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ExerciseDifficulty } from './ExerciseDifficulty';

const ASK_PHYSIO: Partial<Record<ExerciseId, string>> = {
  'step-up': 'Fråga fysioterapeuten vilken steghöjd som passar dig.',
  'split-squat': 'Fråga fysioterapeuten hur djupt du ska gå ner.',
};
const MUSCLE_OVERLAY_EXERCISES = new Set<ExerciseId>([
  'goblet-chair-squat',
  'single-leg-rdl',
  'dead-bug',
]);

/** One bounded reader that keeps movement, muscle focus and coaching together. */
export function ExerciseCardBody({
  exercise,
  side = 'right',
  loadIndex,
  variantId,
  weightKg,
  review = false,
  showTitle = true,
}: {
  exercise: Exercise;
  side?: 'right' | 'left';
  loadIndex?: number;
  variantId?: string;
  weightKg?: number;
  review?: boolean;
  showTitle?: boolean;
}) {
  const [selectedLoad, setSelectedLoad] = useState(
    loadIndex ?? exercise.week1LoadIndex,
  );
  const [workingSide, setWorkingSide] = useState(side);
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const working = exercise.perSide ? workingSide : null;
  const physio = ASK_PHYSIO[exercise.id];
  const selectedLoadIndex = loadIndex ?? selectedLoad;
  const basePresentation = loadPresentation(
    exercise,
    selectedLoadIndex,
    variantId,
  );
  const metadata = exerciseMetadata[exercise.id];
  const variant = basePresentation.variant;
  const selectedTool = variant.equipment.find(({ type }) =>
    ['dumbbell', 'kettlebell', 'band'].includes(type),
  )?.type;
  const equipment: Equipment =
    selectedTool === 'dumbbell' ||
    selectedTool === 'kettlebell' ||
    selectedTool === 'band'
      ? selectedTool
      : null;
  const cue = basePresentation.cue;
  const loadLabel =
    equipment === 'band'
      ? 'Gummiband · valt motstånd'
      : weightKg === undefined
        ? basePresentation.load.label
        : weightKg === 0
          ? equipment === null
            ? 'Kroppsvikt'
            : '0 kg totalt'
          : `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 }).format(weightKg)} kg totalt`;
  const presentation = {
    ...basePresentation,
    equipment,
    cue,
    load: { ...basePresentation.load, label: loadLabel },
  };
  const equipmentControls = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {loadIndex === undefined &&
      weightKg === undefined &&
      exercise.loadLadder.length > 1 ? (
        <label className="flex min-h-12 flex-wrap items-center gap-2 text-base font-bold">
          Vikt
          <select
            value={selectedLoad}
            onChange={(event) => setSelectedLoad(Number(event.target.value))}
            className="min-h-12 max-w-full rounded-sm border-2 border-edge bg-paper px-2 text-base text-ink"
          >
            {exercise.loadLadder.map((load, index) => (
              <option key={load.kg} value={index}>
                {load.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="m-0 text-base font-bold">{presentation.load.label}</p>
      )}
      {variant.label ? (
        <p className="m-0 text-base" data-testid="selected-exercise-variant">
          Variant: {variant.label}
        </p>
      ) : null}
      {exercise.perSide ? (
        <button
          type="button"
          onClick={() =>
            setWorkingSide((value) => (value === 'right' ? 'left' : 'right'))
          }
          className="min-h-12 text-base font-bold underline"
        >
          {workingSide === 'right' ? 'Höger' : 'Vänster'} sida · Byt sida
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="exercise-guide flex min-h-0 min-w-0 flex-1 flex-col">
      {showTitle ? (
        <header className="shrink-0 pb-2">
          <h1 className="m-0 text-3xl leading-tight font-bold">
            {review ? `${exerciseReferences[exercise.id]} · ` : ''}
            {exercise.name}
          </h1>
          {!review ? (
            <p className="m-0 text-base text-ink-soft">
              Övning {exerciseReferences[exercise.id]}
            </p>
          ) : null}
        </header>
      ) : null}

      <section
        aria-label="Övningsguide"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable scroll region for keyboard readers
        tabIndex={0}
        className="exercise-guide-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-3"
        data-testid="exercise-guide-scroll"
      >
        <div className="exercise-guide-layout flex flex-col gap-4">
          <section
            className="exercise-guide-movement flex min-w-0 flex-col gap-3"
            aria-label="Rörelsen"
          >
            {!review ? equipmentControls : null}
            {review ? (
              <fieldset
                className="m-0 flex gap-2 border-0 p-0"
                aria-label="Välj rörelseläge"
              >
                {['Start', 'Mitt', 'Slut'].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={frame === index}
                    onClick={() => setFrame(index)}
                    className={`min-h-12 flex-1 border-2 border-edge text-base font-bold ${frame === index ? 'bg-ink text-paper' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
            ) : null}
            <div
              className={`exercise-stage rounded-md border-2 border-edge p-2 ${review ? 'review-stage' : ''}`}
            >
              {review ? (
                <figure className="m-0 flex h-full flex-col">
                  <FigureFrame
                    exerciseId={exercise.id}
                    pose={movementPose(exercise.id, frame / 2)}
                    working={working}
                    equipment={presentation.equipment}
                    showMuscles={
                      overlay && MUSCLE_OVERLAY_EXERCISES.has(exercise.id)
                    }
                  />
                  <figcaption className="text-center text-base font-bold">
                    {['Start', 'Mitt', 'Slut'][frame]}
                  </figcaption>
                </figure>
              ) : (
                <Figure
                  exerciseId={exercise.id}
                  working={working}
                  equipment={presentation.equipment}
                  paused={paused || reducedMotion}
                  showMuscles={
                    overlay && MUSCLE_OVERLAY_EXERCISES.has(exercise.id)
                  }
                />
              )}
            </div>
            {review ? equipmentControls : null}
            {!review && !reducedMotion ? (
              <button
                type="button"
                aria-pressed={paused}
                onClick={() => setPaused((value) => !value)}
                className="min-h-12 self-start px-2 text-base font-bold underline"
              >
                {paused ? 'Spela rörelsen' : 'Pausa rörelsen'}
              </button>
            ) : !review ? (
              <p className="sr-only">
                Rörelsen visas stilla med minskad rörelse.
              </p>
            ) : null}
            {working ? (
              <p className="m-0 text-base text-ink-soft">
                {working === 'right'
                  ? 'H: höger sida arbetar.'
                  : 'V: vänster sida arbetar.'}
              </p>
            ) : null}
          </section>

          <div className="exercise-guide-notes flex min-w-0 flex-col gap-4">
            <ExerciseDifficulty
              exerciseId={exercise.id}
              variantId={variant.id}
              loadIndex={selectedLoadIndex}
            />
            <section aria-label="Muskelgrupper" className="flex flex-col gap-1">
              <div>
                <h3 className="m-0 inline text-base font-bold">
                  Tränar främst
                </h3>
                <p className="m-0 text-base">
                  {exerciseMuscles[exercise.id].primary
                    .map((id) => muscleGroups[id].label)
                    .join(', ')}
                </p>
              </div>
              <div>
                <h3 className="m-0 inline text-base font-bold">Hjälper till</h3>
                <p className="m-0 text-base">
                  {exerciseMuscles[exercise.id].secondary
                    .map((id) => muscleGroups[id].label)
                    .join(', ') || 'Inga särskilda muskelgrupper.'}
                </p>
              </div>
            </section>

            <section aria-labelledby="exercise-instructions-heading">
              <h2
                id="exercise-instructions-heading"
                className="m-0 text-2xl font-bold"
              >
                Så gör du
              </h2>
              {!presentation.tips.includes(presentation.cue) ? (
                <p className="my-2 text-base font-bold">{presentation.cue}</p>
              ) : null}
              <ol className="m-0 flex list-decimal flex-col gap-3 pl-6 text-lg">
                {presentation.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ol>
            </section>

            <section>
              <h2 className="m-0 text-2xl font-bold">Vanligt fel</h2>
              <p className="m-0 mt-1 text-lg">{exercise.commonMistake}</p>
            </section>
            <section>
              <h2 className="m-0 text-2xl font-bold">Enklare variant</h2>
              <p className="m-0 mt-1 text-lg">{exercise.easierVariant}</p>
            </section>
            {physio ? (
              <p className="m-0 border-t-2 border-edge pt-3 text-base text-ink-soft">
                {physio}
              </p>
            ) : null}
            {MUSCLE_OVERLAY_EXERCISES.has(exercise.id) ? (
              <>
                <button
                  type="button"
                  aria-pressed={overlay}
                  onClick={() => setOverlay((value) => !value)}
                  className="min-h-12 self-start px-2 text-base font-bold underline"
                >
                  {overlay
                    ? 'Dölj muskler i rörelsen'
                    : 'Visa muskler i rörelsen'}
                </button>
                <p className="m-0 text-base text-ink-soft">
                  Ungefärliga muskelområden: heldragen yta tränar främst,
                  streckad yta hjälper till.
                </p>
              </>
            ) : null}
            <p className="m-0 text-base text-ink-soft">
              Animationen visar rörelsen i förenklat tempo. Följ antalet och
              hålltiderna i texten och passet.
            </p>
            <details className="border-t-2 border-edge pt-3">
              <summary className="flex min-h-12 cursor-pointer items-center text-base font-bold underline underline-offset-4">
                Visa muskelkarta
              </summary>
              <div className="pt-3">
                <MuscleMap exerciseId={exercise.id} />
              </div>
            </details>
            <details className="border-t-2 border-edge pt-3">
              <summary className="flex min-h-12 cursor-pointer items-center text-base font-bold underline underline-offset-4">
                Utrustning, nivå och källor
              </summary>
              <div className="flex flex-col gap-3 pt-3 text-base">
                <section>
                  <h3 className="m-0 text-lg font-bold">Vald variant</h3>
                  <p className="m-0">{variant.label}</p>
                  <p className="m-0">
                    Utrustning:{' '}
                    {variant.equipment
                      .map(
                        ({ type, count }) =>
                          `${count} × ${equipmentLabels[type]}`,
                      )
                      .join(', ')}
                  </p>
                  <p className="m-0">
                    Teknisk svårighetsgrad:{' '}
                    {technicalLevelLabels[variant.technicalLevel]}.{' '}
                    {variant.technicalReason}
                  </p>
                  {!presentation.tips.includes(variant.setup) ? (
                    <p className="m-0">{variant.setup}</p>
                  ) : null}
                  <p className="m-0">
                    Lättare alternativ: {variant.easierOption}
                  </p>
                </section>
                <section>
                  <h3 className="m-0 text-lg font-bold">Källor</h3>
                  <ul className="m-0 flex list-disc flex-col gap-2 pl-6">
                    {metadata.sources.map((source) => (
                      <li key={`${source.url}-${source.title}`}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-12 items-center font-bold underline"
                        >
                          {source.publisher}: {source.title}
                          {source.page ? ` · sida ${source.page}` : ''}
                        </a>
                        <p className="m-0">{source.note}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </details>
            {review ? (
              <p className="m-0 break-words border-t-2 border-edge pt-3 text-base text-ink-soft">
                ID: {exercise.id} ·{' '}
                {Object.values(templates)
                  .filter((template) =>
                    template.items.some(
                      (item) => item.exerciseId === exercise.id,
                    ),
                  )
                  .map((template) => template.name)
                  .join(' / ') || 'Valfri övning'}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

/** #/ovning/:id */
export function ExerciseCardPage({ id }: { id: string }) {
  // hasOwn: ids like "constructor" or "toString" must not resolve to prototype members.
  const exercise = Object.hasOwn(exercises, id)
    ? (exercises as Record<string, Exercise>)[id]
    : undefined;
  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--app-nav-height))] max-w-6xl flex-col gap-3 overflow-hidden px-5 pt-2 pb-3">
      <button
        type="button"
        onClick={() => window.history.back()}
        className="-ml-2 flex min-h-12 items-center gap-1 self-start px-2 text-base font-bold text-ink"
      >
        <Icon name="back" />
        Tillbaka
      </button>
      {exercise ? (
        <ExerciseCardBody exercise={exercise} />
      ) : (
        <>
          <h1 className="m-0 text-4xl font-bold">Övningen finns inte</h1>
          <Link href="/" className={buttonClass('primary')}>
            Till träningen
          </Link>
        </>
      )}
    </div>
  );
}

/** Full-screen overlay over the session; closing keeps all session state. */
export function ExerciseSheet({
  exercise,
  side = 'right',
  onClose,
  loadIndex,
  variantId,
  weightKg,
}: {
  exercise: Exercise;
  side?: 'right' | 'left';
  loadIndex?: number;
  variantId?: string;
  weightKg?: number;
  onClose(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    const oldScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    window.history.pushState({ sheet: true }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    const onKey = (e: KeyboardEvent) => {
      const root = ref.current;
      if (!root) return;
      if (e.key === 'Escape') {
        window.history.back();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
        ),
      ].filter((item) => {
        const closed = item.closest('details:not([open])');
        return (
          (!closed || item === closed.querySelector(':scope > summary')) &&
          item.getClientRects().length > 0 &&
          getComputedStyle(item).visibility !== 'hidden'
        );
      });
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!root.contains(active) || active === root) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = oldOverflow;
      if (window.scrollY !== oldScrollY) window.scrollTo(0, oldScrollY);
      previous?.focus?.();
    };
  }, []);
  const close = () => window.history.back();
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={exercise.name}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-paper outline-none"
    >
      <header className="z-10 shrink-0 border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-1">
          <div className="min-w-0">
            <h1 className="m-0 break-words text-lg leading-tight font-bold sm:text-2xl">
              {exercise.name}
            </h1>
            <p className="m-0 text-base text-ink-soft">
              Övning {exerciseReferences[exercise.id]}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="min-h-12 shrink-0 px-2 text-base font-bold underline decoration-2 underline-offset-4"
          >
            Stäng
          </button>
        </div>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ExerciseCardBody
          exercise={exercise}
          side={side}
          loadIndex={loadIndex}
          variantId={variantId}
          weightKg={weightKg}
          showTitle={false}
        />
      </div>
    </div>
  );
}
