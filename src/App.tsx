import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { getDb } from './db/db';
import { ExerciseCardPage } from './features/exercise/ExerciseCard';
import { FigureDev } from './features/exercise/FigureDev';
import { History } from './features/history/History';
import { SessionDetail } from './features/history/SessionDetail';
import { Onboarding } from './features/onboarding/Onboarding';
import { isTiming, PainScreen, StopScreen } from './features/pain/PainScreen';
import { PassPreview, UnknownPass } from './features/pass/PassPreview';
import { SessionScreen } from './features/session/SessionScreen';
import { SettingsStub } from './features/stubs/Stubs';
import { WeekView } from './features/week/WeekView';
import { BottomNav } from './ui/BottomNav';

// DEV-only synthetic data helper; absent from the production bundle.
const DemoSeed = import.meta.env.DEV
  ? lazy(() => import('./dev/DemoSeed'))
  : null;

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
  const inSession =
    location.startsWith('/session/') ||
    location.startsWith('/smarta/') ||
    location.startsWith('/stopp/');
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
          <Route path="/smarta/:sessionId/:timing">
            {(params) =>
              isTiming(params.timing) ? (
                <PainScreen
                  sessionId={params.sessionId}
                  timing={params.timing}
                />
              ) : (
                <UnknownPass />
              )
            }
          </Route>
          <Route path="/stopp/:sessionId">{() => <StopRoute />}</Route>
          <Route path="/ovning/:id">
            {(params) => <ExerciseCardPage id={params.id} />}
          </Route>
          {import.meta.env.DEV ? (
            <Route path="/dev/figurer">{() => <FigureDev />}</Route>
          ) : null}
          {DemoSeed ? (
            <Route path="/dev/demo">
              {() => (
                <Suspense fallback={null}>
                  <DemoSeed />
                </Suspense>
              )}
            </Route>
          ) : null}
          <Route path="/historik">{() => <History />}</Route>
          <Route path="/historik/:id">
            {(params) => <SessionDetail id={params.id} />}
          </Route>
          <Route path="/installningar" component={SettingsStub} />
          <Route>{() => <WeekView />}</Route>
        </Switch>
      </main>
      {inSession ? null : <BottomNav />}
    </>
  );
}

function StopRoute() {
  const [, navigate] = useLocation();
  return <StopScreen onHome={() => navigate('/')} />;
}
