/** Placeholder for the exercise figure (M3). Shows the working-side letter. */
export function FigureSlot({ letter }: { letter: string }) {
  return (
    <div
      aria-hidden="true"
      className="grid size-20 shrink-0 place-items-center rounded-md border-[3px] border-edge"
    >
      {letter ? (
        <span className="count text-5xl leading-none text-blue">{letter}</span>
      ) : null}
    </div>
  );
}
