import { useLiveQuery } from 'dexie-react-hooks';
import { lazy, Suspense } from 'react';
import { Route, Router, Switch, useLocation } from 'wouter';
import { getDb } from './db/db';
import { Onboarding } from './features/onboarding/Onboarding';
import { UpdateContext, useUpdate } from './features/settings/updateContext';
import { useAppHashLocation } from './lib/hashLocation';
import { useAppUpdate } from './lib/update';
import { useSessionExpiry } from './lib/useSessionExpiry';
import { Banner } from './ui/Banner';
import { BottomNav } from './ui/BottomNav';
import { Button } from './ui/Button';
import { navVisible } from './ui/navVisibility';

// Heavier routes load on demand to keep the first load small.
const ExerciseCardPage = lazy(() =>
  import('./features/exercise/ExerciseCard').then((m) => ({
    default: m.ExerciseCardPage,
  })),
);
const SessionScreen = lazy(() =>
  import('./features/session/SessionScreen').then((m) => ({
    default: m.SessionScreen,
  })),
);
const ExerciseHistory = lazy(() =>
  import('./features/history/ExerciseHistory').then((m) => ({
    default: m.ExerciseHistory,
  })),
);
const SessionDetail = lazy(() =>
  import('./features/history/SessionDetail').then((m) => ({
    default: m.SessionDetail,
  })),
);
const PassPreview = lazy(() =>
  import('./features/pass/PassPreview').then((m) => ({
    default: m.PassPreview,
  })),
);
const UnknownPass = lazy(() =>
  import('./features/pass/PassPreview').then((m) => ({
    default: m.UnknownPass,
  })),
);
const PainScreen = lazy(() =>
  import('./features/pain/PainScreen').then((m) => ({ default: m.PainScreen })),
);
const StopScreen = lazy(() =>
  import('./features/pain/PainScreen').then((m) => ({ default: m.StopScreen })),
);
const FigureDev = import.meta.env.DEV
  ? lazy(() =>
      import('./features/exercise/FigureDev').then((m) => ({
        default: m.FigureDev,
      })),
    )
  : null;
const isTiming = (value: string): value is 'before' | 'after' | 'dayAfter' =>
  ['before', 'after', 'dayAfter'].includes(value);
const PhysioReport = lazy(() =>
  import('./features/history/PhysioReport').then((m) => ({
    default: m.PhysioReport,
  })),
);
const History = lazy(() =>
  import('./features/history/History').then((m) => ({ default: m.History })),
);
const Settings = lazy(() =>
  import('./features/settings/Settings').then((m) => ({
    default: m.Settings,
  })),
);
const NewWorkout = lazy(() =>
  import('./features/training/NewWorkout').then((m) => ({
    default: m.NewWorkout,
  })),
);
const ExerciseLibrary = lazy(() =>
  import('./features/library/ExerciseLibrary').then((m) => ({
    default: m.ExerciseLibrary,
  })),
);
const ExerciseReview = lazy(() =>
  import('./features/exercise/ExerciseReview').then((m) => ({
    default: m.ExerciseReview,
  })),
);

// DEV-only synthetic data helper; absent from the production bundle.
const TrainingHome = lazy(() =>
  import('./features/training/TrainingHome').then((m) => ({
    default: m.TrainingHome,
  })),
);
const TrainingPreview = lazy(() =>
  import('./features/training/TrainingPreview').then((m) => ({
    default: m.TrainingPreview,
  })),
);
const Checkin = lazy(() =>
  import('./features/training/Checkin').then((m) => ({ default: m.Checkin })),
);

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
      <Router hook={useAppHashLocation}>
        <Shell />
      </Router>
    </UpdateContext.Provider>
  );
}

function Shell() {
  useSessionExpiry();
  const [location] = useLocation();
  const inSession =
    location.startsWith('/session/') ||
    location.startsWith('/smarta/') ||
    location.startsWith('/kansla/') ||
    location.startsWith('/traning/') ||
    location.startsWith('/stopp/');
  const { needRefresh, status, reloadPending, updateNow } = useUpdate();
  const showBanner =
    needRefresh &&
    !inSession &&
    !location.startsWith('/ovning/') &&
    location !== '/granska';
  return (
    <>
      {showBanner ? (
        <div className="mx-auto max-w-md px-5 pt-3">
          <Banner>
            <p className="m-0 font-bold">Ny version finns</p>
            <p className="m-0 text-ink-soft">
              {reloadPending
                ? 'Uppdateringen är klar. Ladda om när det passar.'
                : 'Appen laddas om. Sparade pass finns kvar.'}
            </p>
            <Button
              variant="secondary"
              className="mt-2"
              disabled={status === 'applying'}
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
            <Route path="/">{() => <TrainingHome />}</Route>
            <Route path="/traning/:id">
              {(params) => <TrainingPreview id={params.id} />}
            </Route>
            <Route path="/kansla/:id/:timing">
              {(params) => (
                <Checkin
                  key={`${params.id}-${params.timing}`}
                  id={params.id}
                  timing={params.timing}
                />
              )}
            </Route>
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
            <Route path="/nytt-pass">{() => <NewWorkout />}</Route>
            <Route path="/ovningar">{() => <ExerciseLibrary />}</Route>
            {FigureDev ? (
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
            <Route path="/granska">{() => <ExerciseReview />}</Route>
            <Route path="/historik">{() => <History />}</Route>
            <Route path="/historik/ovning/:id">
              {(params) => <ExerciseHistory key={params.id} id={params.id} />}
            </Route>
            <Route path="/historik/rapport">{() => <PhysioReport />}</Route>
            <Route path="/historik/:id">
              {(params) => <SessionDetail id={params.id} />}
            </Route>
            <Route path="/installningar">{() => <Settings />}</Route>
            <Route>{() => <TrainingHome />}</Route>
          </Switch>
        </Suspense>
      </main>
      {navVisible(location) ? <BottomNav /> : null}
    </>
  );
}

function StopRoute() {
  const [, navigate] = useLocation();
  return <StopScreen onHome={() => navigate('/')} />;
}
