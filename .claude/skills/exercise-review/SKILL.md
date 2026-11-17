---
name: exercise-review
description: Review, audit or approve a Stomme exercise - its stick-figure animation and views, Swedish instructions (tips, easier variant, units), spoken voice and timer cues, or safety - and record the result or a fix in docs/exercise-audit-log.json. Use when asked to review, re-review, approve, audit, check or fix an exercise figure, animation, pose, instruction text or voice cue, or to work the exercise audit queue.
---

# Exercise review (pointer)

This file exists so that Claude Code can find the skill. The skill itself is shared with Codex
and lives in one place:

**Open and follow `.agents/skills/exercise-review/SKILL.md`** (from the repo root), and
`references/checklist.md` (always). Read the other references only when its "read when"
pointers say so (`references/fixing.md` when you fix rather than review). Use the helpers in `.agents/skills/exercise-review/scripts/` (`inspect.ts`, `capture.ts`, `check-entry.ts`).

Do not review from this file alone. Do not copy rules into it: edit the canonical file
instead, and keep the `description` above identical to the one there.
