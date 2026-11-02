import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'wouter';
import { getDb } from '../../db/db';
import { StopScreen } from './StopScreen';

/** #/stopp/:sessionId: rehab is told to ask the physiotherapist, others to seek care. */
export function StopRoute({ sessionId }: { sessionId: string }) {
  const [, navigate] = useLocation();
  const session = useLiveQuery(
    async () => ({ s: await getDb().sessions.get(sessionId) }),
    [sessionId],
  );
  if (session === undefined) return null;
  return (
    <StopScreen
      physio={session.s?.programId === 'rehab'}
      onHome={() => navigate('/')}
    />
  );
}
