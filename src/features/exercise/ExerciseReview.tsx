import { Link, useLocation } from 'wouter';

import {
  exerciseReferences,
  exerciseReviewHref,
} from '../../content/exerciseReferences';

import { exerciseList } from '../../content/exercises';

import { useHashSearch } from '../../lib/hashLocation';

import { ExerciseCardBody } from './ExerciseCard';

const catalogue = [...exerciseList].sort((a, b) =>
  exerciseReferences[a.id].localeCompare(exerciseReferences[b.id]),
);

/** Read-only review with one large pose, fixed navigation and a bounded reader. */

export function ExerciseReview() {
  const [, navigate] = useLocation();

  const reference = new URLSearchParams(useHashSearch()).get('ovning');

  const found = catalogue.findIndex(
    (exercise) => exerciseReferences[exercise.id] === reference,
  );

  const index = Math.max(0, found);

  const exercise = catalogue[index];

  if (!exercise) return null;

  const last = catalogue[index - 1];

  const next = catalogue[index + 1];

  return (
    <div className="mx-auto flex h-[calc(100dvh-var(--app-nav-height))] max-w-6xl flex-col gap-2 overflow-hidden px-5 pt-2 pb-3">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b-[3px] border-ink pb-2">
        <h1 className="m-0 text-2xl font-bold">Granska övningar</h1>
        <Link
          href="/ovningar"
          className="flex min-h-12 items-center text-base font-bold underline"
        >
          Övningar
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 gap-8">
        <nav
          aria-label="Övningar att granska"
          className="hidden w-64 shrink-0 overflow-y-auto overscroll-contain lg:block"
        >
          <ul className="m-0 list-none p-0">
            {catalogue.map((item) => (
              <li key={item.id} className="border-b-2 border-edge">
                <Link
                  href={exerciseReviewHref(item.id)}
                  aria-current={exercise.id === item.id ? 'page' : undefined}
                  className={`flex min-h-12 gap-3 py-3 text-base underline ${exercise.id === item.id ? 'font-bold text-blue' : 'text-ink'}`}
                >
                  <span>{exerciseReferences[item.id]}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <label
            className="flex shrink-0 flex-col text-base font-bold lg:hidden"
            htmlFor="review-exercise"
          >
            <span className="sr-only">Välj övning att granska</span>
            <select
              id="review-exercise"
              value={exerciseReferences[exercise.id]}
              onChange={(event) =>
                navigate(`/granska?ovning=${event.target.value}`)
              }
              className="min-h-12 min-w-0 rounded-sm border-2 border-ink bg-paper px-2 text-base text-ink"
            >
              {catalogue.map((item) => (
                <option key={item.id} value={exerciseReferences[item.id]}>
                  {exerciseReferences[item.id]} · {item.name}
                </option>
              ))}
            </select>
          </label>
          {reference && found < 0 ? (
            <p role="status" className="m-0 text-base">
              Referensen hittades inte. Visar E01.
            </p>
          ) : null}
          <nav
            aria-label="Bläddra mellan övningar"
            className="flex shrink-0 items-center justify-between gap-2 text-base"
          >
            {last ? (
              <Link
                href={exerciseReviewHref(last.id)}
                className="flex min-h-12 min-w-12 items-center justify-center px-2 font-bold underline"
              >
                Föregående
              </Link>
            ) : (
              <span>Första övningen</span>
            )}
            <span>
              {index + 1} av {catalogue.length}
            </span>
            {next ? (
              <Link
                href={exerciseReviewHref(next.id)}
                className="flex min-h-12 min-w-12 items-center justify-center px-2 font-bold underline"
              >
                Nästa
              </Link>
            ) : (
              <span>Sista övningen</span>
            )}
          </nav>
          <ExerciseCardBody key={exercise.id} exercise={exercise} review />
          <Link
            href={`/ovning/${exercise.id}`}
            className="flex min-h-12 shrink-0 items-center text-base font-bold underline"
          >
            Öppna övningskort och animation
          </Link>
        </div>
      </div>
    </div>
  );
}
