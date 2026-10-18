import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';

export async function acceptOnboarding(): Promise<void> {
  await setMeta(getDb(), 'onboarding', {
    acceptedAt: new Date().toISOString(),
  });
}

export function Onboarding() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-8 pb-8">
      <h1 className="m-0 text-3xl leading-tight font-bold text-balance">
        Välkommen till Stomme
      </h1>
      <p className="m-0 text-lg">
        Stomme är ett träningsstöd, inte sjukvård. Appen ger inga medicinska råd
        och ersätter inte en fysioterapeut.
      </p>
      <p className="m-0 text-lg">
        Visa programmet för en fysioterapeut innan du börjar, särskilt{' '}
        <strong>step-up</strong> och <strong>split squat</strong>.
      </p>
      <Banner tone="warn">
        <p className="m-0 font-bold">Avbryt direkt vid</p>
        <ul className="m-0 mt-1 list-disc pl-5">
          <li>skarp smärta</li>
          <li>svullnad</li>
          <li>att knät låser sig</li>
        </ul>
      </Banner>
      <div className="mt-auto pt-4">
        <Button onClick={() => void acceptOnboarding()}>
          Jag förstår, fortsätt
        </Button>
      </div>
    </main>
  );
}
