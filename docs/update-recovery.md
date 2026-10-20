# App updates and preserving local data

The app checks its registered service worker at startup, when returning to a
visible tab, when reconnecting, and every five minutes while visible and online.
Automatic checks share a one-minute throttle. Settings → **Sök efter uppdatering**
bypasses that throttle and shares a check already in progress.

Downloading and ready-to-apply are separate states. Applying an update reloads
only the tab where the person explicitly accepts it. Other open tabs keep their
current screen and unsaved values; they offer a reload at a safe browsing screen.
Workout and exercise-help screens defer the prompt. IndexedDB is preserved.

## An older installed app that does not discover this release

The foreground-check fix cannot run in an old client until that client loads the
new build. Finish the active workout first. Open Settings and export a backup if
you want an additional copy of the local records.

For an old desktop Chrome client, open DevTools → Application → Service Workers
and select **Update** for the registration belonging to the app's origin. Keep
the tab open while the new worker installs, then accept **Uppdatera** in the app.
This asks the existing registration to check for its successor. It does not
unregister the worker or remove local data. Chrome's remote inspection can reach
the same registration on an attached Android phone.

The automated upgrade suite exercises this bootstrap from the unchanged
`96f2913` app code and checks the sessions, set logs and pain logs after reload.
Do not use **Clear site data**, delete IndexedDB, or unregister every worker as
an update repair. An incognito window uses separate storage and cannot repair
the installed client's registration.

## Verification

Run `npm run test:upgrade` (three production builds and Chromium). The isolated
server switches builds on the same origin, retains old hashed assets, and keeps
each scenario's browser context and database. It covers foreground discovery,
offline and server-failure retry, deferred workout updates, already-waiting
workers, two tabs with unsaved workout inputs, and the old-client bootstrap.
Builds and diagnostic artifacts remain under `test-results/pwa-upgrade`.

The deployment inspected on 2026-10-20 served `/sw.js` with HTTP 200,
`Content-Type: application/javascript; charset=utf-8` and
`Cache-Control: max-age=600` from GitHub Pages. This observation does not establish
why a particular existing browser stayed on an old version. The app uses
`ServiceWorkerRegistration.update()` to request a browser-managed worker check.
An existing user's registration, controller and waiting worker must be inspected
in that user's browser to diagnose its specific state.
