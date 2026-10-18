import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { Button } from '../../ui/Button';

export async function acceptOnboarding(): Promise<void> {
  await setMeta(getDb(), 'onboarding', {
    acceptedAt: new Date().toISOString(),
  });
}

const STOP = ['skarp smärta', 'svullnad', 'att knät låser sig'];

export function Onboarding() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-10 pb-8">
      <h1 className="m-0 text-6xl leading-[0.95] font-extrabold text-balance">
        Välkommen till Stomme
      </h1>
      <p className="m-0 text-xl">
        Stomme är ett träningsstöd, inte sjukvård. Appen ger inga medicinska råd
        och ersätter inte en fysioterapeut.
      </p>
      <p className="m-0 text-xl">
        Visa programmet för en fysioterapeut innan du börjar, särskilt{' '}
        <strong>step-up</strong> och <strong>split squat</strong>.
      </p>
      <section
        aria-labelledby="stop-heading"
        className="border-2 border-edge bg-paper"
      >
        <h2
          id="stop-heading"
          className="m-0 border-b border-blue px-4 py-3 text-3xl leading-none font-bold"
        >
          Avbryt direkt vid
        </h2>
        <ul className="m-0 list-none p-0">
          {STOP.map((t) => (
            <li
              key={t}
              className="flex min-h-12 items-center gap-3 border-b border-blue px-4 text-xl last:border-b-0"
            >
              <span aria-hidden="true" className="h-0.5 w-4 shrink-0 bg-red" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-auto pt-2">
        <Button onClick={() => void acceptOnboarding()}>
          Jag förstår, fortsätt
        </Button>
      </div>
    </main>
  );
}
