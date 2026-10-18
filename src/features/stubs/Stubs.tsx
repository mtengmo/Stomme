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

export function SessionStub({ id }: { id: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-28">
      <h1 className="m-0 text-3xl font-bold">Pass {id}</h1>
      <p className="m-0 text-lg text-ink-soft">
        Passläget kommer i nästa steg.
      </p>
      <Link href="/" className={buttonClass('secondary')}>
        Tillbaka till veckan
      </Link>
    </div>
  );
}
