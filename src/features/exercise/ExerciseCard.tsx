import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { exerciseReferences } from '../../content/exerciseReferences';
import { exercises } from '../../content/exercises';
import { loadPresentation } from '../../content/loadPresentation';
import { primaryMuscleLabel } from '../../content/muscles';
import { templates } from '../../content/templates';
import type { Exercise, ExerciseId } from '../../domain/types';
import {
  Figure,
  FigureFrame,
  lerpPose,
  usePrefersReducedMotion,
} from '../../figures/Figure';
import { MuscleFocus, MuscleMap } from '../../figures/MuscleMap';
import { figures } from '../../figures/poses';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

const ASK_PHYSIO: Partial<Record<ExerciseId, string>> = {
  'step-up': 'Fråga fysioterapeuten vilken steghöjd som passar dig.',
  'split-squat': 'Fråga fysioterapeuten hur djupt du ska gå ner.',
};
const MUSCLE_OVERLAY_EXERCISES = new Set<ExerciseId>([
  'goblet-chair-squat',
  'single-leg-rdl',
  'dead-bug',
]);
/** Bounded reader: controls stay in place; each view scrolls independently. */
export function ExerciseCardBody({
  exercise,
  side = 'right',
  loadIndex,
  review = false,
}: {
  exercise: Exercise;
  side?: 'right' | 'left';
  loadIndex?: number;
  review?: boolean;
}) {
  const [view, setView] = useState<'movement' | 'muscles' | 'instructions'>(
    'movement',
  );
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
  const presentation = loadPresentation(exercise, loadIndex ?? selectedLoad);
  const spec = figures[exercise.id];
  const equipmentControls = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {loadIndex === undefined && exercise.loadLadder.length > 1 ? (
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="shrink-0">
        <h1 className="m-0 text-3xl leading-tight font-bold">
          {review ? `${exerciseReferences[exercise.id]} · ` : ''}
          {exercise.name}
        </h1>
        {!review ? (
          <p className="m-0 text-base text-ink-soft">
            Övning {exerciseReferences[exercise.id]}
          </p>
        ) : null}
        <p className="m-0 text-base">
          Tränar främst: {primaryMuscleLabel(exercise.id)}
        </p>
      </header>
      <fieldset className="m-0 flex shrink-0 gap-2 border-0 p-0">
        <legend className="sr-only">Visning</legend>
        {(
          [
            ['movement', 'Rörelse'],
            ['muscles', 'Muskler'],
            ['instructions', 'Så gör du'],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={`min-h-12 min-w-0 flex-1 rounded-md border-2 px-2 text-base font-bold ${view === id ? 'border-ink bg-ink text-paper' : 'border-edge text-ink'}`}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <section
        key={view}
        aria-label={
          view === 'movement'
            ? 'Rörelsens lägen'
            : view === 'muscles'
              ? 'Muskelområden'
              : 'Instruktioner'
        }
        // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable scroll region for keyboard readers
        tabIndex={0}
        className="guide-panel min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 pb-3"
      >
        {view === 'movement' ? (
          <div className="flex flex-col gap-3">
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
                    pose={lerpPose(spec.start, spec.end, frame / 2)}
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
              <p className="m-0 text-base text-ink-soft">
                Start och slut visas stilla med minskad rörelse.
              </p>
            ) : null}
            <p className="m-0 text-base font-bold">{presentation.cue}</p>
            {working ? (
              <p className="m-0 text-base text-ink-soft">
                {working === 'right'
                  ? 'H: höger sida arbetar.'
                  : 'V: vänster sida arbetar.'}
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
            ) : (
              <p className="m-0 text-base text-ink-soft">
                Se muskelområden under Muskler.
              </p>
            )}
            <p className="m-0 text-base text-ink-soft">
              Animationen visar tekniken. Följ antalet eller hålltiden i passet.
            </p>
          </div>
        ) : view === 'muscles' ? (
          <>
            <MuscleFocus exerciseId={exercise.id} />
            <MuscleMap exerciseId={exercise.id} />
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {review ? (
              <p className="m-0 break-words text-base text-ink-soft">
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
            <section>
              <h2 className="m-0 text-2xl font-bold">Så gör du</h2>
              <p className="my-2 text-base font-bold">
                {presentation.load.label} · {presentation.cue}
              </p>
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
          </div>
        )}
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
    <div className="mx-auto flex h-[calc(100dvh-var(--app-nav-height))] max-w-2xl flex-col gap-3 overflow-hidden px-5 pt-2 pb-3">
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
            Till veckan
          </Link>
        </>
      )}
    </div>
  );
}
/**
 * Full-screen overlay over the session; closing keeps all session state.
 * Opening pushes a history entry so the back gesture closes the sheet.
 */
export function ExerciseSheet({
  exercise,
  side = 'right',
  onClose,
  loadIndex,
}: {
  exercise: Exercise;
  side?: 'right' | 'left';
  loadIndex?: number;
  onClose(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    window.history.pushState({ sheet: true }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    // Modal keyboard behaviour even if focus has left the sheet: Escape
    // closes, Tab cycles inside it.
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
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ];
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
      previous?.focus?.();
    };
  }, []);
  // Closing goes through history so the pushed entry is consumed.
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
      <div className="sticky top-0 z-10 border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-2xl justify-end px-5 py-1">
          <button
            type="button"
            onClick={close}
            className="min-h-12 px-2 text-base font-bold underline decoration-2 underline-offset-4"
          >
            Stäng
          </button>
        </div>
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ExerciseCardBody
          exercise={exercise}
          side={side}
          loadIndex={loadIndex}
        />
      </div>
    </div>
  );
}
