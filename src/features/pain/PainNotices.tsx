import { Link } from 'wouter';
import { PAIN_COPY } from '../../content/copy';
import { templates } from '../../content/templates';
import { formatWeekday } from '../../lib/dates';
import { Banner } from '../../ui/Banner';
import { buttonClass } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import type { CareState } from './careState';

/** The after-stop banner, shown on the week view and the pass preview. */
export function StopBanner() {
  return <Banner tone="care">{PAIN_COPY.banner}</Banner>;
}

/** Week view: ask for the day-after reading, or show that it was worse. */
export function DayAfterNotices({ care }: { care: CareState }) {
  const due = care.dayAfterDue;
  return (
    <>
      {care.dayAfterWorse ? (
        <Banner tone="care">{PAIN_COPY.dayAfterWarn}</Banner>
      ) : null}
      {due ? (
        <section
          aria-label="Dagen efter"
          className="flex flex-col gap-3 rounded-md border-[3px] border-ink bg-paper p-4"
        >
          <div className="flex items-start gap-3">
            <Icon name="bell" className="mt-1 shrink-0" />
            <div>
              <h2 className="m-0 text-3xl leading-none font-bold">
                {PAIN_COPY.dayAfterCardTitle}
              </h2>
              <p className="m-0 mt-1 text-base text-ink-soft">
                {templates[due.templateId].name} {formatWeekday(due.date)}
              </p>
            </div>
          </div>
          <Link
            href={`/smarta/${due.id}/dayAfter`}
            className={buttonClass('secondary')}
          >
            {PAIN_COPY.dayAfterAnswer}
          </Link>
        </section>
      ) : null}
    </>
  );
}
