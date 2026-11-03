import { Link } from 'wouter';
import { exercises } from '../../content/exercises';
import { type FocusId, focusLabel } from '../../content/focusPresets';
import type { TrainingProgram } from '../../domain/types';
import { ExerciseThumb } from '../program/ExerciseThumb';

/** "Ditt program": the exercises of the active programme, grouped per pass. */
export function ProgramSection({ program }: { program: TrainingProgram }) {
  return (
    <section aria-labelledby="program-results" className="flex flex-col gap-4">
      <h2 id="program-results" className="m-0 text-3xl font-bold">
        Ditt program
      </h2>
      {program.passes.map((pass, index) => (
        <div key={`${pass.template}-${pass.focus}`}>
          <h3 className="m-0 mb-1 text-xl font-bold">
            Pass {index + 1} · {focusLabel(pass.focus as FocusId)}
          </h3>
          <ul className="m-0 list-none p-0">
            {pass.exerciseIds.map((id) => (
              <li key={id} className="border-t-2 border-edge">
                <Link
                  href={`/ovning/${id}`}
                  className="flex min-h-16 items-center gap-3 py-2 text-base font-bold text-ink"
                >
                  <ExerciseThumb exerciseId={id} animate={false} />
                  <span className="min-w-0 break-words">
                    {exercises[id].name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
