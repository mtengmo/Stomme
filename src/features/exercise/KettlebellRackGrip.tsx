import { FigureFrame, movementPose } from '../../figures/Figure';

/** The same rack geometry as the animation, enlarged to explain the contact. */
export function KettlebellRackGrip({
  side = 'right',
}: {
  side?: 'right' | 'left';
}) {
  return (
    <figure
      className="m-0 flex flex-col gap-2 border-t-2 border-edge pt-3"
      aria-label={`Kettlebellgrepp vid axeln, ${side === 'right' ? 'höger' : 'vänster'} sida`}
    >
      <h3 className="m-0 text-xl font-bold">Så håller du kettlebellen</h3>
      <div
        className="h-40 w-full max-w-64 self-center [&_svg]:h-full"
        aria-hidden="true"
      >
        <FigureFrame
          exerciseId="kettlebell-rack-carry"
          pose={movementPose('kettlebell-rack-carry', 0)}
          working={side}
          equipment="kettlebell"
          viewBox={side === 'right' ? '94 73 43 42' : '55 73 43 42'}
        />
      </div>
      <figcaption className="flex flex-col gap-2 text-base">
        <p className="m-0">
          <strong>Handen runt handtaget.</strong> Håll handen nära övre bröstet
          och handleden i linje med underarmen.
        </p>
        <p className="m-0">
          <strong>Kulan mot underarmen.</strong> Den runda delen vilar på
          utsidan av underarmen, nära axeln.
        </p>
        <p className="m-0">
          <strong>Armbågen nedåt.</strong> Håll den nära revbenen medan du går.
        </p>
        <p className="m-0 text-ink-soft">
          Öva först utan vikt. Ta hjälp av den fria handen när du placerar
          kettlebellen. Välj en lättare vikt om du inte kan hålla läget bekvämt.
        </p>
        <a
          href="https://www.strongfirst.com/wordpress/wp-content/uploads/2018/01/Travis-Front-Rack.jpg"
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center font-bold underline"
        >
          Se foto av greppet hos StrongFirst
        </a>
      </figcaption>
    </figure>
  );
}
