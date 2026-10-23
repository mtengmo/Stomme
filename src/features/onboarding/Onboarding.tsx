import { getDb } from '../../db/db';
import { setMeta } from '../../db/repo';
import { Button } from '../../ui/Button';
import { PrivacyNotice } from '../privacy/PrivacyNotice';
import { AppearancePicker } from '../settings/AppearancePicker';

export async function acceptOnboarding(): Promise<void> {
  await setMeta(getDb(), 'onboarding', {
    acceptedAt: new Date().toISOString(),
  });
}

export const STOP = ['skarp smärta', 'svullnad', 'att knät låser sig'];

/** Disclaimer paragraphs, shared with the settings screen. */
export function DisclaimerText({
  className = 'm-0 text-xl',
}: {
  className?: string;
}) {
  return (
    <>
      <p className={className}>
        Stomme är ett träningsstöd, inte sjukvård. Appen ger inga medicinska råd
        och ersätter inte en fysioterapeut.
      </p>
      <p className={className}>
        Visa programmet för en fysioterapeut innan du börjar, särskilt{' '}
        <strong>step-up</strong> och <strong>split squat</strong>.
      </p>
    </>
  );
}

export function Onboarding() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 pt-10 pb-8">
      <h1 className="m-0 text-6xl leading-[0.95] font-extrabold text-balance">
        Välkommen till Stomme
      </h1>
      <p className="m-0 text-xl">
        Färdiga pass för styrka, löpning och knäträning. Välj ett fokus så
        hjälper vi dig att komma igång.
      </p>
      <p className="m-0 text-base">
        Ett set är en omgång. 3 × 10 betyder tre omgångar med tio repetitioner.
        Per sida betyder att du gör antalet för varje vald sida.
      </p>
      <p className="m-0 text-base text-ink-soft">
        Stomme är ett träningsstöd. Vid skada eller efter operation: stäm av
        övningarna med din fysioterapeut.
      </p>
      <p className="m-0 text-lg font-bold">
        Avbryt vid skarp smärta, svullnad eller om knät låser sig.
      </p>
      <details>
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
          Integritet – dina uppgifter
        </summary>
        <PrivacyNotice />
      </details>
      <details>
        <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
          Välj färger (kan ändras senare)
        </summary>
        <div className="pt-2">
          <AppearancePicker />
        </div>
      </details>
      <p className="m-0 text-base text-ink-soft">
        Har du en säkerhetskopia från förut? När du gått vidare importerar du
        den under Inställningar.
      </p>
      <div className="mt-auto pt-2">
        <Button onClick={() => void acceptOnboarding()}>
          Jag förstår, fortsätt
        </Button>
      </div>
    </main>
  );
}
