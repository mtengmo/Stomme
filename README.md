# Stomme

A small, offline-first personal strength programme for knee rehabilitation, built as a
installable PWA (Android Chrome first). The UI is in Swedish; code, identifiers and comments
are in English.

The app is not medical advice. Stop on sharp pain, swelling or locking, and show the
programme to a physiotherapist.

## Stack

Vite, React 19, TypeScript (strict), Tailwind CSS v4, Biome, Vitest. See `docs/plan.md`
for the full build plan and `docs/spec.md` for the specification.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build the production bundle into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Biome lint/format check and `tsc --noEmit` |
| `npm test` | Run the Vitest test suite once |
| `npm run e2e` | Build and run the production Playwright browser tests |
| `npm run audit:a11y` | Check contrast and audit mobile screens in light and dark themes |
| `npm run shots` | Build and capture mobile screenshots in light and dark themes |
| `npm run shots:muscles` | Capture muscle-library, exercise-choice and anatomy review screens |

Requires Node 24 and npm. Install with `npm ci`.

## Exercise review

Open [Granska övningar](https://stomme.tengmo.com/#/granska) from Settings or the exercise library. All eleven exercises have fixed references E01–E11, independent of workout order. The read-only view includes names, IDs, muscles, instructions and static start/mid/end frames for each side, plus links to the normal animated exercise cards. A particular exercise can be linked directly, for example `#/granska?ovning=E03`.

## Deployment

Deployed by `.github/workflows/deploy.yml` to GitHub Pages at `https://stomme.tengmo.com`.

- Pushes and pull requests run check, test and build.
- Pushes to `main` also upload the build and deploy it to Pages.
- `VITE_BASE` sets the base path. It defaults to `/`. Set `VITE_BASE=/Stomme/` only if the
  `github.io` URL is needed before the custom domain works.
- Do not add a `CNAME` file. With a GitHub Actions deploy it is ignored; the custom domain is
  set in the repository settings instead.

### One-time setup (manual)

1. DNS for `tengmo.com`: add `stomme  CNAME  mtengmo.github.io.`
2. Repository Settings, Pages: set Source to "GitHub Actions" and Custom domain to
   `stomme.tengmo.com`.
3. After the certificate is issued, tick "Enforce HTTPS". The service worker, install and
   wake lock all require HTTPS.
4. Recommended: verify the `tengmo.com` domain under the account's Settings, Pages (TXT record)
   to prevent subdomain takeover.

Browser storage is per origin. Data entered on `github.io` does not appear on
`stomme.tengmo.com`, so use the app for real data only on the final domain.
