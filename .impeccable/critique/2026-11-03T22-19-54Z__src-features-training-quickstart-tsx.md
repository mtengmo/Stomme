---
target: onboarding (QuickStart) and Home for a new user
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\GitRepos\\Stomme\\src\\features\\training\\QuickStart.tsx"
target_fingerprint: "sha256:bc232d7fc42b82458123ce55cb10317bbd9e1790364c0fda8b07c4f80a796c3e"
target_path: "C:\\GitRepos\\Stomme\\src\\features\\training\\QuickStart.tsx"
timestamp: 2026-11-03T22-19-54Z
slug: src-features-training-quickstart-tsx
---
Method: dual-agent (A: design review · B: detector + browser overlay)

## Design Health Score: 23/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Faint step counter, none on goal step; no week/progress on Home |
| 2 | Match System / Real World | 2 | E-codes, "(goblet)" on bodyweight, Träningsvana/AAOS jargon |
| 3 | User Control and Freedom | 3 | Back + saved draft; bottom nav live during onboarding |
| 4 | Consistency and Standards | 2 | Cards vs native checkboxes; mixed link colour; 3 labels for one pass |
| 5 | Error Prevention | 3 | Disabled states explain why |
| 6 | Recognition Rather Than Recall | 2 | Text-only equipment; no figures in pass preview |
| 7 | Flexibility and Efficiency | 3 | Good defaults, Kortpass |
| 8 | Aesthetic and Minimalist Design | 1 | Injury caveat x4; Home = 5 equal sections, 2 empty |
| 9 | Error Recovery | 3 | Clear messages |
| 10 | Help and Documentation | 2 | "Så läser du antal" hidden on welcome only |

## Design Specificity Verdict
Design system is product-specific (lead pass card, tally, pencil tick, week strip) but first-run screens use none of it: native checkboxes, underlined links, <details>. Detector: 0 findings CLI (QuickStart, Onboarding, RegionChecklist, TrainingHome, week, library); browser overlay clean on 7 pages. Problems are hierarchy/emotional arc/absence, not mechanical anti-patterns.

## Priority Issues
- [P0] First reveal undermines confidence: QuickStart.save() -> /traning/A (TrainingPreview.tsx) leads with "Saknas …", E-codes, "goblet", "Antal bygger på sparade resultat" before any figure. Fix: "Ditt program" screen as destination (Vecka 1 av 4, week strip, lead pass card with tally + thumbnails + ≈21 min, "Starta första passet"); curated set covers default equipment so no "Saknas"; strip E-codes. Commands: onboard, shape.
- [P1] Home has no centre (TrainingHome.tsx): equal-weight stack, empty Mina pass, link-only Veckoplan, mid-screen primary that only previews, caveat again. Fix: Home is the program: week strip + 4-week progress, next pass lead card, Starta in thumb reach; hide Mina pass until one exists; Skapa eget pass under Ändra. Commands: layout, bolder.
- [P1] Onboarding asks about equipment, not the person (quickStartModel stepsFor): no days/week, focus step defers itself, 9 flat equipment checkboxes. Fix: days -> emphasis -> equipment -> level, one question per screen, ≤4 cards; days as 1-5 count numerals; emphasis incl. "Ben & bål för löpning"; grouped equipment card toggles, chair/wall "alltid med", weights as sub-step; goal = 2 cards; welcome = one benefit + one stop rule. Commands: onboard, distill.
- [P2] Library: ~10 controls before list, /granska user-facing, unexplained "Passar mig", truncated meta (ExerciseLibrary.tsx). Fix: open with "Ditt program" curated set grouped by pass, "Alla övningar" below, filters behind "Filtrera", move /granska to dev. Commands: distill, clarify.
- [P3] Inconsistent controls/words: native checkboxes vs outlined cards, solid-fill Passlängd selection, three verbs for one action. Fix: one card-toggle component; "Starta passet". Command: polish.

## Persona Red Flags
- Jordan: Skapa eget pass equal to Bli starkare -> 100-exercise picker; no equipment pictures; rehab links like fine print; "Saknas" reads as user error; 3 × 10 unexplained.
- Casey: live bottom nav in onboarding; sticky bar covers "Fler alternativ"; Home primary mid-screen and preview-only; small summary rows.
- Beginner runner: running never mentioned; no run days; no "ben och bål för löpning"; Axlar disabled with bodyweight; no 4-week promise.

## Minor Observations
Focus heading contradicts body; no counter on goal step; redundant "Gäller styrketräning."; "Träningsvana" status line on Home; Veckoplanering disclosure reveals only a link; no active tab on library; welcome opens as liability briefing ("Jag förstår, fortsätt").

## Questions to Consider
- If Home were only the week strip + one lead card + Starta, what would anyone miss?
- Should stop rules arrive just-in-time instead of four warnings up front?
- What makes finishing week 1 of 4 an event (tick across the week strip as the second authored motion)?
