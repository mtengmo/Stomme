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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 px-5 pt-5">
      <h1 className="m-0 text-5xl leading-[0.95] font-extrabold text-balance">
        Välkommen till Stomme
      </h1>
      <p className="m-0 text-xl">
        Färdiga pass för styrka, löpning och knäträning. Välj ett fokus så
        hjälper vi dig att komma igång.
      </p>
      <p className="m-0 text-base text-ink-soft">
        Stomme är ett träningsstöd. Vid skada eller efter operation: stäm av
        övningarna med din fysioterapeut.
      </p>
      <p className="m-0 text-lg font-bold">
        Avbryt vid skarp smärta, svullnad eller om knät låser sig.
      </p>
      <div className="flex flex-col">
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
            Så läser du antal
          </summary>
          <p className="m-0 pb-2 text-base">
            Ett set är en omgång. 3 × 10 betyder tre omgångar med tio
            repetitioner. Per sida betyder att du gör antalet för varje vald
            sida.
          </p>
        </details>
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
            Integritet – dina uppgifter
          </summary>
          <PrivacyNotice />
          <p className="mt-3 mb-0 text-base">
            Har du en säkerhetskopia från förut? När du gått vidare importerar
            du den under Inställningar.
          </p>
        </details>
        <details>
          <summary className="min-h-12 cursor-pointer py-3 text-base font-bold">
            Välj färger (kan ändras senare)
          </summary>
          <div className="pt-2">
            <AppearancePicker />
          </div>
        </details>
      </div>
      <div className="sticky bottom-0 z-10 -mx-5 mt-auto border-t-[3px] border-ink bg-surface-tint px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button onClick={() => void acceptOnboarding()}>
          Jag förstår, fortsätt
        </Button>
      </div>
    </main>
  );
}
