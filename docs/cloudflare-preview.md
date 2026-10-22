# Dev site and pull-request previews (Cloudflare Workers static assets)

One repository, three kinds of branch:

| Branch | Where it runs | Hosting |
|---|---|---|
| `main` | https://stomme.tengmo.com (real training data) | GitHub Pages, via `.github/workflows/deploy.yml` |
| `dev` | https://stomme.magnus-c5d.workers.dev, later https://dev.stomme.tengmo.com (sandbox, separate data) | Cloudflare Worker `stomme` with static assets, the "production branch" of the Cloudflare build |
| any other branch / pull request | a preview URL per version that Cloudflare shows in the build log / PR comment | Worker preview versions |

Browser storage (IndexedDB, localStorage) is tied to the web address. Each of these addresses is its own origin, so the dev and preview sites never see the logs saved on stomme.tengmo.com.

Cloudflare now builds sites like this one as a Worker that serves a folder of static files (Workers static assets). It replaces the older "Pages" project type for new projects; the free plan covers it. The Worker is configured by `wrangler.jsonc` at the repository root: it serves `./dist` and falls back to `index.html` for unknown paths.

## One-time setup

1. The `dev` branch exists on GitHub (created from `main`; keep it in sync, see below).
2. In the Cloudflare dashboard open **Workers & Pages**, the Worker named `stomme` (its name must equal `name` in `wrangler.jsonc`), then **Settings → Builds → Connect** and authorise the GitHub app for the `Stomme` repository only.
3. Build settings:
   - **Production branch: `dev`** (Cloudflare's "production" is your dev site; `main` stays on GitHub Pages)
   - Build command: `git fetch --unshallow || true; npm run build`
     (the app version is `major.minor.<commit count>`, so the build needs full history, not a shallow clone)
   - Deploy command: `npx wrangler deploy`
   - Non-production branch deploy command (previews): `npx wrangler versions upload`
   - Root directory: `/` ; build variable `NODE_VERSION` = `24` (the repository also has a `.node-version` file)
4. Push to `dev` (or re-run the build). The default "Hello world" Worker is replaced by the app once a build with `wrangler.jsonc` succeeds.
5. Custom domain (optional): Worker → **Settings → Domains & Routes → Add → Custom domain** → `dev.stomme.tengmo.com`. This only works when the `tengmo.com` DNS zone is on Cloudflare; otherwise keep using the `workers.dev` address.
6. Optional but recommended: turn on "Build comments on pull requests" and restrict the dev site with Cloudflare Access (free) if you do not want it public.

## Keeping `dev` in sync

`dev` is the integration branch. Feature branches open pull requests into `dev`; a release pull request merges `dev` into `main`. If `main` moves ahead (for example after a fix merged directly), bring `dev` up to date with `git switch dev && git pull && git merge origin/main` (or a pull request from `main` into `dev`).

## How the pieces fit

- `public/_headers` sets `X-Robots-Tag: noindex` so search engines do not index the dev and preview sites. GitHub Pages ignores this file; Cloudflare Workers static assets honour it.
- CI on GitHub (`.github/workflows/deploy.yml`) runs checks, tests and build for pushes to `main` and `dev` and for every pull request. Only pushes to `main` deploy to GitHub Pages.
- The service worker and manifest use the site root, so each origin installs and updates independently.
- Installing the dev site as an app on your phone gives you a second icon with separate data. That is intended, but name it clearly when you install it.

## GitHub settings to turn on (click-ops, once)

1. **Settings → Rules → Rulesets → New branch ruleset** for `main`: require a pull request, require the status checks `verify`, `build` and `smoke` (jobs from CI and deploy; not `deploy`, `a11y` or `upgrade`), require approval from Code Owners, block force pushes and deletions.
2. A lighter ruleset for `dev`: require a pull request and the same status checks; maintainer approval optional.
3. **Settings → Environments → github-pages → Deployment branches**: only `main`.
4. **Settings → Code security**: enable Dependabot alerts and security updates, secret scanning, and private vulnerability reporting.
5. **Settings → General → Pull Requests**: allow squash merging, enable "Automatically delete head branches".
6. **Settings → Collaborators**: add only people you trust to push branches. Everyone else uses forks.
