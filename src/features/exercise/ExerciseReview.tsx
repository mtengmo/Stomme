import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  exerciseReferences,
  exerciseReviewHref,
} from '../../content/exerciseReferences';
import { exerciseList } from '../../content/exercises';
import { templates } from '../../content/templates';
import { FigureFrame, lerpPose } from '../../figures/Figure';
import { MuscleFocus, MuscleMap } from '../../figures/MuscleMap';
import { figures } from '../../figures/poses';
import { useHashSearch } from '../../lib/hashLocation';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

const catalogue = [...exerciseList].sort((a, b) =>
  exerciseReferences[a.id].localeCompare(exerciseReferences[b.id]),
);
const overlays = new Set(['goblet-chair-squat', 'single-leg-rdl', 'dead-bug']);
const units = { reps: 'Repetitioner', seconds: 'Sekunder', meters: 'Meter' };

/** Public, read-only catalogue review. It never reads or writes workout data. */
export function ExerciseReview() {
  const [, navigate] = useLocation();
  const reference = new URLSearchParams(useHashSearch()).get('ovning');
  const index = Math.max(
    0,
    catalogue.findIndex(
      (exercise) => exerciseReferences[exercise.id] === reference,
    ),
  );
  const exercise = catalogue[index];
  const [showMuscles, setShowMuscles] = useState(false);
  const article = useRef<HTMLElement>(null);
  const previous = useRef(exercise?.id);

  useEffect(() => {
    if (previous.current === exercise?.id) return;
    previous.current = exercise?.id;
    article.current?.focus({ preventScroll: true });
    article.current?.scrollIntoView({ block: 'start' });
  }, [exercise?.id]);

  if (!exercise) return null;
  const code = exerciseReferences[exercise.id];
  const membership = Object.values(templates).filter((template) =>
    template.items.some((item) => item.exerciseId === exercise.id),
  );
  const sides = exercise.perSide
    ? (['right', 'left'] as const)
    : ([null] as const);
  const pose = figures[exercise.id];
  const last = catalogue[index - 1];
  const next = catalogue[index + 1];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 pt-3 pb-28">
      <header className="flex max-w-xl flex-col gap-3">
        <Link
          href="/ovningar"
          className="flex min-h-12 items-center gap-1 self-start text-base font-bold underline decoration-2 underline-offset-4"
        >
          <Icon name="back" /> Övningar
        </Link>
        <h1 className="m-0 text-5xl leading-none font-extrabold">
          Granska övningar
        </h1>
        <p className="m-0 text-base text-ink-soft">
          Alla {catalogue.length} övningar med namn, fasta referensnummer och
          rörelsens lägen. Använd till exempel E03 när du ger feedback. Numret
          anger inte ordningen i passet.
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Övningar att granska" className="hidden lg:block">
          <h2 className="m-0 mb-3 text-2xl font-bold">Alla övningar</h2>
          <ul className="m-0 list-none p-0">
            {catalogue.map((item) => (
              <li key={item.id} className="border-b-2 border-edge">
                <Link
                  href={exerciseReviewHref(item.id)}
                  aria-current={exercise.id === item.id ? 'page' : undefined}
                  className={`flex min-h-12 gap-3 py-3 text-base underline decoration-2 underline-offset-4 ${exercise.id === item.id ? 'font-bold text-blue' : 'text-ink'}`}
                >
                  <span className="shrink-0">
                    {exerciseReferences[item.id]}
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-5">
          <label
            className="flex flex-col gap-2 text-base font-bold lg:hidden"
            htmlFor="review-exercise"
          >
            Välj övning att granska
            <select
              id="review-exercise"
              value={code}
              onChange={(event) =>
                navigate(`/granska?ovning=${event.target.value}`)
              }
              className="min-h-12 w-full min-w-0 rounded-sm border-2 border-ink bg-paper px-2 text-base text-ink"
            >
              {catalogue.map((item) => (
                <option key={item.id} value={exerciseReferences[item.id]}>
                  {exerciseReferences[item.id]} · {item.name}
                </option>
              ))}
            </select>
          </label>
          {reference &&
          !catalogue.some(
            (item) => exerciseReferences[item.id] === reference,
          ) ? (
            <p role="status" className="m-0 text-base">
              Referensen hittades inte. Visar E01.
            </p>
          ) : null}
          <nav
            className="flex items-center justify-between gap-3"
            aria-label="Bläddra mellan övningar"
          >
            {last ? (
              <Link
                href={exerciseReviewHref(last.id)}
                className="flex min-h-12 items-center gap-1 text-base font-bold underline"
              >
                <Icon name="back" /> Föregående
              </Link>
            ) : (
              <span className="text-base text-ink-soft">Första övningen</span>
            )}
            <span className="shrink-0 text-base text-ink-soft">
              {index + 1} av {catalogue.length}
            </span>
            {next ? (
              <Link
                href={exerciseReviewHref(next.id)}
                className="flex min-h-12 items-center gap-1 text-base font-bold underline"
              >
                Nästa <Icon name="back" className="rotate-180" />
              </Link>
            ) : (
              <span className="text-base text-ink-soft">Sista övningen</span>
            )}
          </nav>
          <article
            ref={article}
            tabIndex={-1}
            aria-labelledby="review-title"
            className="flex scroll-mt-4 flex-col gap-6 outline-none"
          >
            <header className="flex flex-col gap-2 border-t-[3px] border-ink pt-4">
              <h2
                id="review-title"
                className="m-0 text-4xl leading-tight font-extrabold"
              >
                {code} · {exercise.name}
              </h2>
              <p className="m-0 text-base text-ink-soft">
                {membership.map((template) => template.name).join(' / ') ||
                  'Valfri övning'}{' '}
                · {units[exercise.unit]}
                {exercise.perSide
                  ? ` per ${exercise.sideKind}`
                  : ' · båda sidor samtidigt'}
              </p>
              <p className="m-0 break-words text-base text-ink-soft">
                ID: {exercise.id}
              </p>
            </header>
            <MuscleFocus exerciseId={exercise.id} />
            <section
              aria-labelledby="review-poses"
              className="flex flex-col gap-3"
            >
              <h2 id="review-poses" className="m-0 text-2xl font-bold">
                Rörelsens lägen
              </h2>
              <p className="m-0 text-base text-ink-soft">
                H/V och blå linje anger arbetande sida. Varje rad visar start,
                mitt och slut.
              </p>
              {overlays.has(exercise.id) ? (
                <button
                  type="button"
                  aria-pressed={showMuscles}
                  onClick={() => setShowMuscles((value) => !value)}
                  className="min-h-12 self-start rounded-sm border-2 border-ink px-3 text-base font-bold"
                >
                  {showMuscles
                    ? 'Dölj muskelmarkeringar'
                    : 'Visa muskelmarkeringar'}
                </button>
              ) : null}
              {sides.map((side) => (
                <section
                  key={side ?? 'both'}
                  aria-label={
                    side === 'right'
                      ? 'Höger sida'
                      : side === 'left'
                        ? 'Vänster sida'
                        : 'Båda sidor'
                  }
                >
                  <h3 className="m-0 mb-2 text-lg font-bold">
                    {side === 'right'
                      ? 'Höger sida'
                      : side === 'left'
                        ? 'Vänster sida'
                        : 'Båda sidor'}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['Start', pose.start],
                        ['Mitt', lerpPose(pose.start, pose.end, 0.5)],
                        ['Slut', pose.end],
                      ] as const
                    ).map(([label, frame]) => (
                      <figure
                        key={label}
                        className="m-0 min-w-0 rounded-sm border-2 border-edge p-1"
                      >
                        <FigureFrame
                          exerciseId={exercise.id}
                          pose={frame}
                          working={side}
                          showMuscles={showMuscles && overlays.has(exercise.id)}
                        />
                        <figcaption className="text-center text-base font-bold">
                          {label}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ))}
              {showMuscles && overlays.has(exercise.id) ? (
                <p className="m-0 text-base text-ink-soft">
                  Ytorna visar ungefärliga muskelområden. Heldragen yta tränar
                  främst; streckad yta hjälper till.
                </p>
              ) : null}
              <Link
                href={`/ovning/${exercise.id}`}
                className={buttonClass('secondary')}
              >
                Öppna övningskort och animation
              </Link>
            </section>
            <MuscleMap exerciseId={exercise.id} />
            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-2xl font-bold">Så gör du</h2>
              <ol className="m-0 flex list-decimal flex-col gap-2 pl-6 text-lg">
                {exercise.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ol>
              <h3 className="m-0 mt-2 text-xl font-bold">Vanligt fel</h3>
              <p className="m-0 text-base">{exercise.commonMistake}</p>
              <h3 className="m-0 mt-2 text-xl font-bold">Enklare variant</h3>
              <p className="m-0 text-base">{exercise.easierVariant}</p>
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}
