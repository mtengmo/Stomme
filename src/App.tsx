import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { getDb } from './db/db';
import { ExerciseCardPage } from './features/exercise/ExerciseCard';
import { FigureDev } from './features/exercise/FigureDev';
import { SessionDetail } from './features/history/SessionDetail';
import { Onboarding } from './features/onboarding/Onboarding';
import { isTiming, PainScreen, StopScreen } from './features/pain/PainScreen';
import { PassPreview, UnknownPass } from './features/pass/PassPreview';
import { SessionScreen } from './features/session/SessionScreen';
import { UpdateContext, useUpdate } from './features/settings/updateContext';
import { WeekView } from './features/week/WeekView';
import { useAppUpdate } from './lib/update';
import { Banner } from './ui/Banner';
import { BottomNav } from './ui/BottomNav';
import { Button } from './ui/Button';

// Heavier routes load on demand to keep the first load small.
const History = lazy(() =>
  import('./features/history/History').then((m) => ({ default: m.History })),
);
const Settings = lazy(() =>
  import('./features/settings/Settings').then((m) => ({
    default: m.Settings,
  })),
);

// DEV-only synthetic data helper; absent from the production bundle.
const DemoSeed = import.meta.env.DEV
  ? lazy(() => import('./dev/DemoSeed'))
  : null;

export function App() {
  // Mounted once for the whole app (also during onboarding) so the service
  // worker registers on first load; the shell decides where the banner shows.
  const update = useAppUpdate();
  // undefined while loading, then true/false.
  const accepted = useLiveQuery(
    async () => (await getDb().meta.get('onboarding')) !== undefined,
    [],
  );

  if (accepted === undefined) return null;
  if (!accepted) return <Onboarding />;

  return (
    <UpdateContext.Provider value={update}>
      <Router hook={useHashLocation}>
        <Shell />
      </Router>
    </UpdateContext.Provider>
  );
}

function Shell() {
  const [location] = useLocation();
  const inSession =
    location.startsWith('/session/') ||
    location.startsWith('/smarta/') ||
    location.startsWith('/stopp/');
  const { needRefresh, updateNow } = useUpdate();
  const showBanner = needRefresh && !inSession;
  // The banner shows on the calm screens only, never on session routes or
  // cards that can be opened mid-session.
  const calm =
    location === '/' ||
    location.startsWith('/historik') ||
    location === '/installningar';
  return (
    <>
      {showBanner && calm ? (
        <div className="mx-auto max-w-md px-5 pt-3">
          <Banner>
            <p className="m-0 font-bold">Ny version finns</p>
            <p className="m-0 text-ink-soft">
              Appen laddas om. Din data påverkas inte.
            </p>
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => void updateNow()}
            >
              Uppdatera
            </Button>
          </Banner>
        </div>
      ) : null}
      <main>
        <Suspense fallback={null}>
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
            <Route path="/installningar">{() => <Settings />}</Route>
            <Route>{() => <WeekView />}</Route>
          </Switch>
        </Suspense>
      </main>
      {inSession ? null : <BottomNav />}
    </>
  );
}

function StopRoute() {
  const [, navigate] = useLocation();
  return <StopScreen onHome={() => navigate('/')} />;
}
