import { exerciseList } from '../../content/exercises';
import { FigureFrame, lerpPose } from '../../figures/Figure';
import { figures } from '../../figures/poses';

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
                          ? lerpPose(
                              figures[ex.id].start,
                              figures[ex.id].end,
                              0.5,
                            )
                          : figures[ex.id][k]
                      }
                      working={w}
                      showMuscles={[
                        'goblet-chair-squat',
                        'single-leg-rdl',
                        'dead-bug',
                      ].includes(ex.id)}
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
          </section>
        );
      })}
    </div>
  );
}
