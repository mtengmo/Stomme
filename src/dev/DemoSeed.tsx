import { useState } from 'react';
import { getDb } from '../db/db';
import { Button } from '../ui/Button';
import { buildDemoData } from './demoData';

/** DEV only (#/dev/demo): fills or clears history with SYNTHETIC data for screenshots. */
export default function DemoSeed() {
  const [done, setDone] = useState('');

  async function fill() {
    const db = getDb();
    const d = buildDemoData(new Date());
    await db.transaction(
      'rw',
      db.sessions,
      db.setLogs,
      db.painLogs,
      async () => {
        await db.sessions.clear();
        await db.setLogs.clear();
        await db.painLogs.clear();
        await db.sessions.bulkAdd(d.sessions);
        await db.setLogs.bulkAdd(d.setLogs);
        await db.painLogs.bulkAdd(d.painLogs);
      },
    );
    setDone(`Fyllde med ${d.sessions.length} syntetiska pass.`);
  }

  async function clear() {
    const db = getDb();
    await db.transaction(
      'rw',
      db.sessions,
      db.setLogs,
      db.painLogs,
      async () => {
        await db.sessions.clear();
        await db.setLogs.clear();
        await db.painLogs.clear();
      },
    );
    setDone('Historiken är tom.');
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-5 pt-6 pb-28">
      <h1 className="m-0 text-4xl font-bold">Demodata (DEV)</h1>
      <p className="m-0 text-base">
        Syntetisk testdata för skärmbilder. Ersätter alla pass och loggar i den
        här webbläsaren. Finns bara i utvecklingsläge.
      </p>
      <Button onClick={fill}>Fyll med syntetisk testdata</Button>
      <Button variant="secondary" onClick={clear}>
        Töm historiken
      </Button>
      <p role="status" className="m-0 text-base">
        {done}
      </p>
    </div>
  );
}
