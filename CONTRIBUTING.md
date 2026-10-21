# Contributing to Stomme

Thanks for wanting to help. Stomme is a small offline-first strength-training app (PWA) whose UI is in Swedish. Please read this first: it is short.

## Important: this is not a medical app

Stomme gives no medical advice. Its pain and progression rules are deliberately conservative. Please do not add treatment claims, diagnoses or "this will heal your knee" wording. Anything touching these areas gets extra review from the maintainer:

- `src/rules/` (pain and progression logic)
- `src/content/` (exercise text, copy, programmes)
- pain screens, onboarding and settings text

If you suggest a new exercise, include a reliable source (physiotherapy guideline or clinical paper) and say whether it loads the knee.

## Branches

```
feature/your-change ──PR──▶ dev ──release PR──▶ main
                             │                    │
                       dev site (Cloudflare)   live site (GitHub Pages)
```

- `main` is what runs at https://stomme.tengmo.com. Only the maintainer merges into it, through a release pull request from `dev`.
- `dev` is the integration branch. It has its own site on Cloudflare Pages with its own data storage, so trying things there never touches real training logs.
- Your work goes on a branch from `dev` (for example `feature/seated-calf-raise` or `fix/rest-timer`) and you open a pull request **into `dev`**.
- Every pull request gets its own preview link from Cloudflare. Use it to try the change on a phone.

First time with GitHub? The short version:
1. Click **Fork** on the repository page (you work on your own copy).
2. `git clone` your fork, then `git checkout -b feature/my-change origin/dev` after adding the main repo as `upstream`.
3. Commit, push to your fork, then click **Compare & pull request** and choose `dev` as the base branch.

## Running it locally

Requires Node 24 and npm.

```
npm ci
npm run dev        # development server
npm run check      # lint, format and type check
npm test           # unit tests
npm run e2e        # build and run browser tests
```

Run `npm run check`, `npm test` and `npm run build` before you push. CI runs the same and a pull request cannot be merged while it fails.

## Style

- UI text is Swedish. Code, identifiers and comments are English.
- Follow the visual system in [DESIGN.md](DESIGN.md): red is reserved for "done", colour is never the only signal, touch targets are at least 48 px, text at least 16 px, and light and dark themes both work. Attach 360 px screenshots (light and dark) to UI pull requests.
- Keep pull requests small and focused. One idea per PR.
- Add or update tests for logic changes. The rules in `src/rules/` keep 100% branch coverage.
- Do not commit personal data: no exported backups, real training logs or private screenshots.

## Reviews

The maintainer reviews all pull requests. Safety-relevant changes may take longer and may be sent to a physiotherapist for a look before merging.

## Reporting problems

Use the issue templates. For security problems use the private report link on the Issues tab, not a public issue.
