import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import {
  BackupError,
  type BackupFile,
  backupToFile,
  exportAndShare,
  importAll,
  MAX_IMPORT_BYTES,
  parseBackup,
} from '../../db/backup';
import { getDb } from '../../db/db';
import { deleteAllData } from '../../db/wipe';
import { formatShortDate, toLocalDate } from '../../lib/dates';
import { useInstall } from '../../lib/install';
import { shareOrDownload } from '../../lib/share';
import { type StorageStatus, storageStatus } from '../../lib/storage';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { DisclaimerText, STOP } from '../onboarding/Onboarding';
import { readBackupMeta } from '../week/BackupReminder';
import { useUpdate } from './updateContext';

type View =
  | { name: 'main' }
  | {
      name: 'confirmImport';
      text: string;
      backup: BackupFile;
      current: { sessions: number; setLogs: number };
    }
  | { name: 'confirmDelete' };

export const IMPORT_ERRORS: Record<BackupError['code'], string> = {
  too_large:
    'Filen är för stor (högst 5 MB). Välj en säkerhetskopia som Stomme har skapat. Inget har ändrats.',
  not_json:
    'Filen kunde inte läsas som en säkerhetskopia. Välj en .json-fil som Stomme har skapat. Inget har ändrats.',
  schema_version:
    'Filen kommer från en annan version av Stomme. Uppdatera appen och försök igen. Inget har ändrats.',
  invalid:
    'Filens innehåll stämmer inte med en säkerhetskopia från Stomme. Välj en säkerhetskopia som Stomme har skapat. Inget har ändrats.',
};

const GENERIC_IMPORT_ERROR = 'Filen kunde inte läsas. Inget har ändrats.';

function megabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 border-t-[3px] border-ink pt-4"
    >
      <h2 id={id} className="m-0 text-3xl leading-none font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const note = 'm-0 text-base text-ink-soft';

export function Settings() {
  const [view, setView] = useState<View>({ name: 'main' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const lastExportAt = useLiveQuery(async () => {
    return (await readBackupMeta()).lastExportAt ?? null;
  }, []);

  // Move focus to the screen's heading whenever the view changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: view.name is the trigger
  useEffect(() => {
    heading.current?.focus();
  }, [view.name]);

  // Confirmation views are history entries: Android Back (popstate) returns
  // to the main view, exactly like "Behåll min data".
  useEffect(() => {
    const onPop = () => setView({ name: 'main' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openConfirm = (next: View) => {
    window.history.pushState({ settingsConfirm: true }, '');
    setView(next);
  };
  // Leaves a confirmation through history so the pushed entry is consumed.
  const leave = () => {
    if (view.name === 'main') return;
    window.history.back();
  };

  // Escape leaves a confirmation without changing anything.
  useEffect(() => {
    if (view.name === 'main') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) window.history.back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.name, busy]);

  async function onExport() {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const r = await exportAndShare(getDb());
      setStatus(
        r === 'shared'
          ? 'Delad. Spara filen på ett ställe utanför telefonen, till exempel i din e-post eller molnlagring.'
          : r === 'downloaded'
            ? 'Filen laddades ner. Flytta den till ett ställe utanför telefonen.'
            : 'Avbrutet. Ingen säkerhetskopia sparades.',
      );
    } catch {
      setError('Det gick inte att skapa säkerhetskopian. Försök igen.');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setStatus(null);
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        throw new BackupError('too_large', 'Backup file is larger than 5 MB');
      }
      const text = await file.text();
      const backup = parseBackup(text);
      const db = getDb();
      openConfirm({
        name: 'confirmImport',
        text,
        backup,
        current: {
          sessions: await db.sessions.count(),
          setLogs: await db.setLogs.count(),
        },
      });
    } catch (e) {
      setError(
        e instanceof BackupError ? IMPORT_ERRORS[e.code] : GENERIC_IMPORT_ERROR,
      );
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onConfirmImport(text: string) {
    setBusy(true);
    setError(null);
    try {
      const now = new Date();
      const { counts } = await importAll(getDb(), text, {
        now,
        beforeReplace: async (safety) => {
          const r = await shareOrDownload(backupToFile(safety, now));
          if (r === 'cancelled') {
            throw new Error('safety-cancelled');
          }
        },
      });
      leave();
      setStatus(
        `Importerat: ${counts.sessions} pass, ${counts.setLogs} set och ${counts.painLogs} smärtvärden. Din tidigare data sparades först som en säkerhetskopia.`,
      );
    } catch (e) {
      leave();
      setError(
        e instanceof BackupError
          ? IMPORT_ERRORS[e.code]
          : e instanceof Error && e.message === 'safety-cancelled'
            ? 'Importen avbröts eftersom säkerhetskopian av din nuvarande data inte sparades. Inget har ändrats.'
            : 'Importen misslyckades. Inget har ändrats.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmDelete() {
    setBusy(true);
    try {
      window.location.hash = '#/';
      await deleteAllData(getDb());
    } catch {
      leave();
      setError('Det gick inte att radera datan. Försök igen.');
      setBusy(false);
    }
  }

  const shell = 'mx-auto flex max-w-md flex-col gap-5 px-5 pt-5 pb-28';
  const h1 = 'm-0 text-5xl leading-none font-extrabold outline-offset-4';

  if (view.name === 'confirmImport') {
    const c = view.backup;
    return (
      <div className={shell}>
        <h1 ref={heading} tabIndex={-1} className={h1}>
          Ersätta din data?
        </h1>
        <p className="m-0 text-xl">
          Filen innehåller {c.sessions.length} pass, {c.setLogs.length} set och{' '}
          {c.painLogs.length} smärtvärden. Filen skapades{' '}
          {formatShortDate(toLocalDate(new Date(c.exportedAt))).replace(
            ' ',
            '\u00a0',
          )}
        </p>
        <p className="m-0 text-xl">
          Du har nu {view.current.sessions} pass, {view.current.setLogs} set.
          All data i appen ersätts.
        </p>
        <p className="m-0 text-xl">
          Först öppnas en delnings- eller nedladdningsruta med en säkerhetskopia
          av det du har nu. Du får välja var den sparas.
        </p>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" disabled={busy} onClick={leave}>
            Behåll min data
          </Button>
          <Button
            disabled={busy}
            onClick={() => void onConfirmImport(view.text)}
          >
            Ersätt med filens data
          </Button>
        </div>
      </div>
    );
  }

  if (view.name === 'confirmDelete') {
    return (
      <div className={shell}>
        <h1 ref={heading} tabIndex={-1} className={h1}>
          Radera allt?
        </h1>
        <p className="m-0 text-xl">
          Alla pass, set och smärtvärden tas bort från den här telefonen och
          appen börjar om från början. Det går inte att ångra.
        </p>
        <p className="m-0 text-xl">Vill du ha en kopia? Exportera först.</p>
        <div className="flex flex-col gap-3">
          <Button variant="secondary" disabled={busy} onClick={leave}>
            Behåll mina data
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void onExport()}
          >
            Exportera först
          </Button>
          {status ? (
            <p
              role="status"
              className="m-0 flex items-start gap-2 text-base font-bold"
            >
              <Icon name="check" className="mt-0.5 shrink-0" />
              {status}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="m-0 flex items-start gap-2 text-base font-bold"
            >
              <Icon name="warning" className="mt-0.5 shrink-0" />
              {error}
            </p>
          ) : null}
          <Button disabled={busy} onClick={() => void onConfirmDelete()}>
            Radera all data nu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <h1 ref={heading} tabIndex={-1} className={h1}>
        Inställningar
      </h1>

      <Section id="set-backup" title="Säkerhetskopia">
        <p className={note}>
          Senast sparad:{' '}
          {lastExportAt
            ? formatShortDate(toLocalDate(new Date(lastExportAt)))
            : 'aldrig'}
        </p>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void onExport()}
        >
          Exportera
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          Importera
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label="Välj säkerhetskopia att importera"
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {status ? (
          <p
            role="status"
            className="m-0 flex items-start gap-2 text-base font-bold"
          >
            <Icon name="check" className="mt-0.5 shrink-0" />
            {status}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="m-0 flex items-start gap-2 text-base font-bold"
          >
            <Icon name="warning" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </Section>

      <StorageSection />
      <InstallSection />
      <VersionSection />

      <Section id="set-about" title="Om och säkerhet">
        <DisclaimerText className="m-0 text-base" />
        <p className="m-0 text-base">
          Avbryt direkt vid {STOP.slice(0, -1).join(', ')} eller{' '}
          {STOP[STOP.length - 1]}.
        </p>
      </Section>

      <Section id="set-delete" title="Radera all data">
        <p className={note}>
          Tar bort allt som är sparat i appen på den här telefonen.
        </p>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setStatus(null);
            setError(null);
            openConfirm({ name: 'confirmDelete' });
          }}
        >
          Radera all data
        </Button>
      </Section>
    </div>
  );
}

function StorageSection() {
  const [s, setS] = useState<StorageStatus | null>(null);
  useEffect(() => {
    let alive = true;
    void storageStatus().then((r) => alive && setS(r));
    return () => {
      alive = false;
    };
  }, []);
  const label =
    s === null
      ? 'Lagring: kontrollerar …'
      : s.state === 'persisted'
        ? 'Lagring: skyddad'
        : s.state === 'evictable'
          ? 'Lagring: kan rensas av webbläsaren'
          : 'Lagring: går inte att kontrollera i den här webbläsaren';
  return (
    <Section id="set-storage" title="Lagring">
      <p className="m-0 flex items-start gap-2 text-base font-bold">
        <Icon
          name={s?.state === 'persisted' ? 'check' : 'info'}
          className="mt-0.5 shrink-0"
        />
        {label}
      </p>
      {s?.usageBytes !== undefined ? (
        <p className={note}>
          Använt ungefär {megabytes(s.usageBytes)}
          {s.quotaBytes ? ` av ${megabytes(s.quotaBytes)}` : ''}.
        </p>
      ) : null}
      <p className="m-0 text-base">
        Din data finns bara på den här telefonen, så en säkerhetskopia är det
        enda skyddet om webbläsaren rensar den eller telefonen byts.
      </p>
    </Section>
  );
}

function InstallSection() {
  const { canInstall, installed, prompt } = useInstall();
  return (
    <Section id="set-install" title="Installera">
      {installed ? (
        <p className="m-0 flex items-start gap-2 text-base font-bold">
          <Icon name="check" className="mt-0.5 shrink-0" />
          Installerad
        </p>
      ) : canInstall ? (
        <Button variant="secondary" onClick={() => void prompt()}>
          Installera appen
        </Button>
      ) : (
        <p className={note}>
          Öppna webbläsarens meny (tre punkter uppe till höger i Chrome på
          Android) och välj Lägg till på startskärmen.
        </p>
      )}
    </Section>
  );
}

function VersionSection() {
  const { needRefresh, updateNow } = useUpdate();
  // The shell banner already offers the update on this screen.
  if (needRefresh) return null;
  return (
    <Section id="set-version" title="Version">
      {needRefresh ? (
        <>
          <p className="m-0 text-base font-bold">Ny version finns.</p>
          <Button variant="secondary" onClick={() => void updateNow()}>
            Uppdatera
          </Button>
        </>
      ) : (
        <p className={note}>Du har den senaste versionen.</p>
      )}
    </Section>
  );
}
