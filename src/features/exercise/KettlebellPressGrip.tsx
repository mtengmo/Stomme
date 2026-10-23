import { FigureFrame, movementPose } from '../../figures/Figure';

/** Magnifies the actual press geometry, rather than reusing the carry pose. */
export function KettlebellPressGrip({
  exerciseId,
  side,
}: {
  exerciseId: 'kettlebell-press' | 'kettlebell-floor-press';
  side: 'right' | 'left';
}) {
  const pose = movementPose(exerciseId, 0);
  const x = side === 'left' ? 192 - pose.hR[0] : pose.hR[0];
  return (
    <figure
      className="m-0 flex flex-col gap-2 border-t-2 border-edge pt-3"
      aria-label={`Kettlebellgrepp vid press, ${side === 'right' ? 'höger' : 'vänster'} sida`}
    >
      <h3 className="m-0 text-xl font-bold">Greppet under pressen</h3>
      <div
        className="h-40 w-full max-w-64 self-center [&_svg]:h-full"
        aria-hidden="true"
      >
        <FigureFrame
          exerciseId={exerciseId}
          pose={pose}
          working={side}
          equipment="kettlebell"
          viewBox={`${x - 22} ${pose.hR[1] - 14} 48 48`}
        />
      </div>
      <figcaption className="text-base">
        För handen genom handtaget. Låt kulan vila mot underarmens utsida och
        håll handleden rak genom hela pressen. Hjälp till med den fria handen
        när du placerar och sätter ned vikten.
      </figcaption>
    </figure>
  );
}
