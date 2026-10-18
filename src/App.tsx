import { useLiveQuery } from 'dexie-react-hooks';
import { Route, Router, Switch } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { getDb } from './db/db';
import { Onboarding } from './features/onboarding/Onboarding';
import { HistoryStub, SessionStub, SettingsStub } from './features/stubs/Stubs';
import { WeekView } from './features/week/WeekView';
import { BottomNav } from './ui/BottomNav';

export function App() {
  // undefined while loading, then true/false.
  const accepted = useLiveQuery(
    async () => (await getDb().meta.get('onboarding')) !== undefined,
    [],
  );

  if (accepted === undefined) return null;
  if (!accepted) return <Onboarding />;

  return (
    <Router hook={useHashLocation}>
      <main>
        <Switch>
          <Route path="/">{() => <WeekView />}</Route>
          <Route path="/pass/:id">
            {(params) => <SessionStub id={params.id} />}
          </Route>
          <Route path="/historik" component={HistoryStub} />
          <Route path="/installningar" component={SettingsStub} />
          <Route>{() => <WeekView />}</Route>
        </Switch>
      </main>
      <BottomNav />
    </Router>
  );
}
