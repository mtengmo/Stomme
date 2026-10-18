import { Link } from 'wouter';
import { buttonClass } from '../../ui/Button';

function Stub({ title, children }: { title: string; children?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-28">
      <h1 className="m-0 text-3xl font-bold">{title}</h1>
      <p className="m-0 text-lg text-ink-soft">
        {children ?? 'Kommer i en senare version.'}
      </p>
    </div>
  );
}

export function HistoryStub() {
  return <Stub title="Historik" />;
}

export function SettingsStub() {
  return <Stub title="Inställningar" />;
}

export function ExerciseStub() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-3 pb-28">
      <Link
        href="/"
        className="-ml-2 flex min-h-12 items-center self-start px-2 text-base font-bold text-ink"
      >
        Tillbaka
      </Link>
      <h1 className="m-0 text-4xl font-bold">Övningskort</h1>
      <p className="m-0 text-lg text-ink-soft">Kommer i en senare version.</p>
      <button
        type="button"
        onClick={() => window.history.back()}
        className={buttonClass('secondary')}
      >
        Tillbaka till passet
      </button>
    </div>
  );
}
