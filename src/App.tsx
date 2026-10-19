import { useLiveQuery } from 'dexie-react-hooks';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { getDb } from './db/db';
import { ExerciseCardPage } from './features/exercise/ExerciseCard';
import { FigureDev } from './features/exercise/FigureDev';
import { Onboarding } from './features/onboarding/Onboarding';
import { PassPreview, UnknownPass } from './features/pass/PassPreview';
import { SessionScreen } from './features/session/SessionScreen';
import { HistoryStub, SettingsStub } from './features/stubs/Stubs';
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
      <Shell />
    </Router>
  );
}

function Shell() {
  const [location] = useLocation();
  const inSession = location.startsWith('/session/');
  return (
    <>
      <main>
        <Switch>
          <Route path="/">{() => <WeekView />}</Route>
          <Route path="/pass/:id">
            {(params) =>
              params.id === 'A' || params.id === 'B' ? (
                <PassPreview id={params.id} />
              ) : (
                <UnknownPass />
              )
            }
          </Route>
          <Route path="/session/:id">
            {(params) => <SessionScreen id={params.id} />}
          </Route>
          <Route path="/ovning/:id">
            {(params) => <ExerciseCardPage id={params.id} />}
          </Route>
          {import.meta.env.DEV ? (
            <Route path="/dev/figurer">{() => <FigureDev />}</Route>
          ) : null}
          <Route path="/historik" component={HistoryStub} />
          <Route path="/installningar" component={SettingsStub} />
          <Route>{() => <WeekView />}</Route>
        </Switch>
      </main>
      {inSession ? null : <BottomNav />}
    </>
  );
}
