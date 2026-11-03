# Agent notes

- Exercise text, animation and safety are tracked in `docs/exercise-audit-log.json`; the process is in `docs/exercise-audit-log.md` (Swedish). Read it before touching an exercise figure or its instructions.
- No self-approval: an exercise fixed under one reviewer id may not be approved under the same id. Prefer cross-vendor review (Claude fix -> Codex model or `human`, and vice versa). Never mark `approved` without a review entry that says so; never invent reviewers (allowed ids are listed in the doc).
- Update the log in the same commit as any animation, figure or exercise-text change (add a `fixes` entry, set the status, run `npm run audit:fingerprints -- --write`).
- `npm run audit:summary` shows the queue; `npm run audit:fingerprints` lists approved exercises whose figure changed (stale).
