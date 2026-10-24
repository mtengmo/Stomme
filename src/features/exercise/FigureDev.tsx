import { exerciseList } from '../../content/exercises';
import { FigureFrame, movementPose } from '../../figures/Figure';
import { figures } from '../../figures/poses';

const SEQUENCE_IDS: ReadonlySet<string> = new Set([
  'push-up',
  'pull-up',
  'chin-up',
  'back-extension',
  'parallel-dip',
  'lying-leg-raise',
  'burpee',
  'plank',
  'squat-jump',
  'jumping-lunge',
  'mountain-climber',
  'quad-set',
  'seated-knee-flexion',
  'band-knee-extension',
  'band-hip-extension',
  'balance-clock',
]);

/** DEV only: every start/mid/end pose, right then left, static, for review. */
export function FigureDev() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-3 pb-28">
      <h1 className="m-0 text-3xl font-bold">Figurer</h1>
      {exerciseList.map((ex) => {
        const sides = ex.perSide
          ? (['right', 'left'] as const)
          : ([null] as const);
        return (
          <section key={ex.id} className="border-t-2 border-edge pt-2">
            <h2 className="m-0 text-lg font-bold">{ex.name}</h2>
            <div className="grid grid-cols-2 gap-2">
              {sides.flatMap((w) =>
                (['start', 'middle', 'end'] as const).map((k) => (
                  <div
                    key={`${w}-${k}`}
                    className="rounded-md border-2 border-edge p-1"
                  >
                    <FigureFrame
                      exerciseId={ex.id}
                      pose={
                        k === 'middle'
                          ? movementPose(ex.id, 0.5)
                          : figures[ex.id][k]
                      }
                      working={w}
                      showMuscles={false}
                    />
                    <p className="m-0 text-center text-base">
                      {k === 'start'
                        ? 'Start'
                        : k === 'middle'
                          ? 'Mitt'
                          : 'Slut'}
                    </p>
                  </div>
                )),
              )}
            </div>
            {SEQUENCE_IDS.has(ex.id) ? (
              <div
                className="mt-2 grid grid-cols-3 gap-1"
                data-testid="figure-sequence"
              >
                {Array.from({ length: 9 }, (_, i) => i / 8).map((t) => (
                  <div key={t} className="rounded-md border-2 border-edge p-1">
                    <FigureFrame
                      exerciseId={ex.id}
                      pose={movementPose(ex.id, t)}
                      working={ex.perSide ? 'right' : null}
                      showMuscles={ex.id === 'quad-set'}
                    />
                    <p className="m-0 text-center text-base">t = {t}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
