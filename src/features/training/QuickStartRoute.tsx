import { useLiveQuery } from 'dexie-react-hooks';
import { useRef } from 'react';
import { Redirect } from 'wouter';
import { isTrainingPreferences } from '../../content/programmes';
import { getDb } from '../../db/db';
import { readTrainingProgram } from '../../db/program';
import { getMeta } from '../../db/repo';
import { useHashSearch } from '../../lib/hashLocation';
import { QuickStart, type RedoStart } from './QuickStart';

type Mode =
  | { kind: 'new' }
  | { kind: 'leave' }
  | { kind: 'redo'; start: RedoStart };

/**
 * `/kom-igang`: the first-use setup. With saved preferences it only opens for
 * `?steg=days` (change the programme, keeping the preferences); otherwise it
 * leads back home. The mode is decided once, so saving the setup does not bounce
 * the user home before the move to the new programme.
 */
export function QuickStartRoute() {
  const wantsDays = new URLSearchParams(useHashSearch()).get('steg') === 'days';
  const data = useLiveQuery(
    async () => ({
      preferences: await getMeta(getDb(), 'training'),
      program: await readTrainingProgram(getDb()),
    }),
    [],
  );
  const mode = useRef<Mode | null>(null);
  if (!data) return null;
  if (!mode.current) {
    const { preferences, program } = data;
    mode.current = !isTrainingPreferences(preferences)
      ? { kind: 'new' }
      : wantsDays && preferences.programId === 'general'
        ? { kind: 'redo', start: { preferences, program } }
        : { kind: 'leave' };
  }
  if (mode.current.kind === 'leave') return <Redirect to="/" />;
  return (
    <QuickStart
      {...(mode.current.kind === 'redo' ? { redo: mode.current.start } : {})}
    />
  );
}
