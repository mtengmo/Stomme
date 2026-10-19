import { Link } from 'wouter';
import { exercises } from '../../content/exercises';
import type { Exercise, ExerciseId } from '../../domain/types';
import { Figure } from '../../figures/Figure';
import { Button, buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

const ASK_PHYSIO: Partial<Record<ExerciseId, string>> = {
  'step-up': 'Fråga fysioterapeuten vilken steghöjd som passar dig.',
  'split-squat': 'Fråga fysioterapeuten hur djupt du ska gå ner.',
};

/** The card content: name, muscles, figure, tips, mistake, easier variant. */
export function ExerciseCardBody({ exercise }: { exercise: Exercise }) {
  const physio = ASK_PHYSIO[exercise.id];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 text-4xl leading-tight font-bold">{exercise.name}</h1>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {exercise.muscles.map((m) => (
          <li
            key={m}
            className="rounded-md border-2 border-edge px-3 py-1 text-base font-bold"
          >
            {m}
          </li>
        ))}
      </ul>
      <div className="border-[3px] border-edge rounded-md p-2">
        <Figure exerciseId={exercise.id} />
      </div>
      <p className="m-0 text-base text-ink-soft">
        <span className="font-bold text-blue">H</span> och blå linje = höger
        sida arbetar.
      </p>
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
  const exercise = (exercises as Record<string, Exercise | undefined>)[id];
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

/** Full-screen overlay over the session; closing keeps all session state. */
export function ExerciseSheet({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose(): void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={exercise.name}
      className="fixed inset-0 z-50 overflow-y-auto bg-paper"
    >
      <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-4 pb-8">
        <ExerciseCardBody exercise={exercise} />
        <Button onClick={onClose}>Stäng</Button>
      </div>
    </div>
  );
}
