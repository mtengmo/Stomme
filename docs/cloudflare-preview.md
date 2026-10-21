# Dev site and pull-request previews (Cloudflare Pages)

One repository, three kinds of branch:

| Branch | Where it runs | Hosting |
|---|---|---|
| `main` | https://stomme.tengmo.com (real training data) | GitHub Pages, via `.github/workflows/deploy.yml` |
| `dev` | https://dev.stomme.tengmo.com (sandbox, separate data) | Cloudflare Pages, "production branch" of the Cloudflare project |
| any other branch / pull request | `https://<branch>.stomme.pages.dev` | Cloudflare Pages preview deployments |

Browser storage (IndexedDB) is tied to the web address. Each of these addresses is its own origin, so the dev and preview sites never see the logs saved on stomme.tengmo.com.

## One-time setup (about 10 minutes)

1. Create the `dev` branch from `main` and push it:
   `git switch main && git pull && git switch -c dev && git push -u origin dev`
2. In the Cloudflare dashboard open **Workers & Pages → Create → Pages → Connect to Git** and authorise the GitHub app for the `Stomme` repository only.
3. Project settings:
   - Project name: `stomme` (gives `stomme.pages.dev`)
   - **Production branch: `dev`** (this is the trick: Cloudflare's "production" is your dev site; `main` stays on GitHub Pages)
   - Framework preset: Vite (or None)
   - Build command: `git fetch --unshallow || true; npm run build`
     (the app version is `major.minor.<commit count>`, so Cloudflare needs the full history, not a shallow clone)
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `24`
4. Under **Branch control** keep "Preview deployments: all non-production branches". Cloudflare then comments a preview link on every pull request.
5. Add the custom domain: project → **Custom domains → Set up a domain** → `dev.stomme.tengmo.com`. If `tengmo.com` DNS is not on Cloudflare, add the CNAME record Cloudflare shows (`dev` → `stomme.pages.dev`) at your DNS provider.
6. Optional but recommended: **Settings → Builds** turn on "Build comments on pull requests", and restrict access to preview deployments with Cloudflare Access (free) if you do not want the dev site public.

## How the pieces fit

- `public/_headers` sets `X-Robots-Tag: noindex` so search engines do not index the dev and preview sites. GitHub Pages ignores this file.
- CI on GitHub (`.github/workflows/deploy.yml`) runs checks, tests and build for pushes to `main` and `dev` and for every pull request. Only pushes to `main` deploy to GitHub Pages.
- The service worker and manifest use the site root, so each origin installs and updates independently.
- Installing the dev site as an app on your phone gives you a second icon with separate data. That is intended, but name it clearly when you install it.

## GitHub settings to turn on (click-ops, once)

1. **Settings → Rules → Rulesets → New branch ruleset** for `main`: require a pull request, require status check "build" (job from CI and deploy), require approval from Code Owners, block force pushes and deletions.
2. A lighter ruleset for `dev`: require a pull request and the "build" status check; maintainer approval optional.
3. **Settings → Environments → github-pages → Deployment branches**: only `main`.
4. **Settings → Code security**: enable Dependabot alerts and security updates, secret scanning, and private vulnerability reporting.
5. **Settings → General → Pull Requests**: allow squash merging, enable "Automatically delete head branches".
6. **Settings → Collaborators**: add only people you trust to push branches. Everyone else uses forks.
