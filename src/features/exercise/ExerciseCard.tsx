import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { exercises } from '../../content/exercises';
import type { Exercise, ExerciseId } from '../../domain/types';
import { Figure, usePrefersReducedMotion } from '../../figures/Figure';
import { MuscleFocus, MuscleMap } from '../../figures/MuscleMap';
import { Button, buttonClass } from '../../ui/Button';
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

/** The card content: name, muscles, figure, tips, mistake, easier variant. */
export function ExerciseCardBody({
  exercise,
  side = 'right',
}: {
  exercise: Exercise;
  side?: 'right' | 'left';
}) {
  const [view, setView] = useState<'movement' | 'muscles'>('movement');
  const [paused, setPaused] = useState(false);
  const [overlay, setOverlay] = useState(true);
  const reducedMotion = usePrefersReducedMotion();
  const working = exercise.perSide ? side : null;
  const physio = ASK_PHYSIO[exercise.id];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-4xl leading-tight font-bold">{exercise.name}</h1>
      <MuscleFocus exerciseId={exercise.id} />
      <fieldset className="m-0 flex gap-2 border-0 p-0">
        <legend className="sr-only">Visning</legend>
        <button
          type="button"
          aria-pressed={view === 'movement'}
          onClick={() => setView('movement')}
          className={`min-h-12 flex-1 rounded-md border-[3px] px-3 text-base font-bold ${view === 'movement' ? 'border-ink bg-ink text-paper' : 'border-edge text-ink'}`}
        >
          Rörelse
        </button>
        <button
          type="button"
          aria-pressed={view === 'muscles'}
          onClick={() => setView('muscles')}
          className={`min-h-12 flex-1 rounded-md border-[3px] px-3 text-base font-bold ${view === 'muscles' ? 'border-ink bg-ink text-paper' : 'border-edge text-ink'}`}
        >
          Muskler
        </button>
      </fieldset>
      {view === 'movement' ? (
        <>
          <div className="border-[3px] border-edge rounded-md p-2">
            <Figure
              exerciseId={exercise.id}
              working={working}
              paused={paused || reducedMotion}
              showMuscles={overlay && MUSCLE_OVERLAY_EXERCISES.has(exercise.id)}
            />
          </div>
          {!reducedMotion ? (
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
              className="min-h-12 self-start rounded-md border-[3px] border-edge px-4 text-base font-bold"
            >
              {paused ? 'Spela rörelsen' : 'Pausa rörelsen'}
            </button>
          ) : (
            <p className="m-0 text-base text-ink-soft">
              Rörelsen visas stilla med start- och slutläge eftersom du har valt
              minskad rörelse.
            </p>
          )}
          {MUSCLE_OVERLAY_EXERCISES.has(exercise.id) ? (
            <>
              <button
                type="button"
                aria-pressed={overlay}
                onClick={() => setOverlay((value) => !value)}
                className="min-h-12 self-start rounded-md border-[3px] border-edge px-4 text-base font-bold"
              >
                {overlay
                  ? 'Dölj muskler i rörelsen'
                  : 'Visa muskler i rörelsen'}
              </button>
              <p className="m-0 text-base text-ink-soft">
                H/V visar arbetande sida. Markeringarna visar ungefärliga
                muskelområden; heldragen yta tränar främst och streckad yta
                hjälper till.
              </p>
            </>
          ) : (
            <p className="m-0 text-base text-ink-soft">
              Se ungefärliga muskelområden under Muskler.
            </p>
          )}
        </>
      ) : (
        <div className="border-[3px] border-edge rounded-md p-3">
          <MuscleMap exerciseId={exercise.id} />
        </div>
      )}
      {working ? (
        <p className="m-0 text-base text-ink-soft">
          <span className="font-bold text-blue">
            {working === 'right' ? 'H' : 'V'}
          </span>{' '}
          {working === 'right' ? 'höger' : 'vänster'} sida arbetar.
          {view === 'movement' && MUSCLE_OVERLAY_EXERCISES.has(exercise.id)
            ? ' Markeringarna visar ungefärliga muskelområden.'
            : ''}
        </p>
      ) : null}
      <section>
        <h2 className="m-0 text-2xl font-bold">Så gör du</h2>
        <ol className="m-0 mt-2 flex list-decimal flex-col gap-2 pl-6 text-xl">
          {exercise.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="m-0 text-2xl font-bold">Vanligt fel</h2>
        <p className="m-0 mt-1 text-xl">{exercise.commonMistake}</p>
      </section>
      <section>
        <h2 className="m-0 text-2xl font-bold">Enklare variant</h2>
        <p className="m-0 mt-1 text-xl">{exercise.easierVariant}</p>
      </section>
      {physio ? (
        <p className="m-0 border-t-2 border-edge pt-3 text-base text-ink-soft">
          {physio}
        </p>
      ) : null}
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
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-3 pb-28">
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
}: {
  exercise: Exercise;
  side?: 'right' | 'left';
  onClose(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
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
          'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])',
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
      className="fixed inset-0 z-50 overflow-y-auto bg-paper outline-none"
    >
      <div className="sticky top-0 z-10 border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex max-w-md justify-end px-5 py-1">
          <button
            type="button"
            onClick={close}
            className="min-h-12 px-2 text-base font-bold underline decoration-2 underline-offset-4"
          >
            Stäng
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-4 pb-8">
        <ExerciseCardBody exercise={exercise} side={side} />
        <Button onClick={close}>Tillbaka till passet</Button>
      </div>
    </div>
  );
}
