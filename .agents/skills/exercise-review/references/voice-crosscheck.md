# Voice: sources, tests and playback

Read when a spoken string, timer label or status line is in doubt, or to test or play the audio.
`inspect.ts` already prints the exercise's voice lines, timer label, status, hint and tempo. The
checks are in `checklist.md` (VOICE); verdicts and recording are in `SKILL.md`.

## Where the strings come from

The app speaks only through `timerVoice(message)` in `src/lib/timerVoice.ts` (search for
`timerVoice(` to list call sites). Speech is `sv-SE`; without a Swedish voice
(`canSpeakSwedish()`) the app beeps or ticks instead.

| Situation | Spoken string | Source |
|---|---|---|
| Timed set prepares | `"<Side>. Gör dig redo. Fem sekunder."` (`<Side>.` only when `perSide`) | `src/lib/useTimedHold.ts` |
| Hold starts / ends | `"Börja hålla."` / `"Klart. Släpp positionen."` | `useTimedHold.ts` (not `moving`) |
| Moving timed starts / ends | `startVoice` from `src/content/timedMovement.ts`, else `"Börja rörelsen."` / `"Klart. Vila."` | `useTimedHold.ts` (`moving`) |
| Timed resume | `"Fortsätt hålla."` / `"Fortsätt rörelsen."` / `"Gör dig redo."` | `useTimedHold.ts` |
| Rep set prepares | `"<Side>. Gör dig redo. Fem sekunder."` | `src/lib/useRepCounter.ts` |
| Rep set starts | `"Börja."`, or `"Börja. Upp."` when `repTempo(id).hasHold` | `useRepCounter.ts` |
| Each rep | the number (`"3"`); with a hold `"3. Håll"` and the phase words `Upp` / `Håll` / `Ner` (`CUE`) | `useRepCounter.ts` |
| Rep resume / end | `"Fortsätt om tre. Två. Ett."` / `"Klart."` | `useRepCounter.ts` |
| Rest (auto-continue only) | `"Vila. N sekunder."` | `src/features/session/RestScreen.tsx` |

- `<Side>` is `sideLabel()` in `src/content/copy.ts`: the capitalised side-cue label from
  `exerciseSideCues.ts`, so a wrong side cue is also spoken.
- Moving or holding: `SetScreen.tsx` treats an exercise as moving when `timedMovementCue[id]`
  exists (`movingTimed`). That also switches the timer label "Hålltid" / "Övningstid" and the
  status line: "Håll tills signalen. ..." for a hold, `timedMovementCue[id].status` for movement;
  at the end "Hålltiden är klar. Släpp positionen. ..." or "Övningstiden är klar. ...".
- `repTempo(id)` (`src/rules/repTempo.ts`) gives up, hold, down and relax in ms; it returns `null`
  for `MANUAL_REPS` and non-rep units, which have no spoken count.
- `meters` and `laps` have no timer and no count voice; if such an exercise is really done for a
  time, the unit is wrong.

## Tests and playback

- Tests mock `timerVoice`, so they show exactly what would be spoken. They cover the generic rules,
  not whether one exercise's text fits its voice (that is your job):
  `src/lib/useTimedHold.test.tsx` (hold vs moving voice);
  `src/features/session/timedMovementCopy.test.tsx` (`MOVING` is exactly the keys of
  `timedMovementCue`, all unit seconds; `plank`, `wall-sit`, `side-plank` keep the hold copy);
  `src/features/session/repCounting.test.tsx`; `src/figures/timedHolds.test.ts`. Run (Node 24,
  PowerShell): `npx vitest run src/lib/useTimedHold.test.tsx src/features/session/timedMovementCopy.test.tsx src/features/session/repCounting.test.tsx src/figures/timedHolds.test.ts`.
- Live: `npm run dev`, start a session or quick start with the exercise, and listen to prepare,
  start, count, end and rest. On Windows this needs an installed Swedish speech voice; without one
  you only hear ticks.
- No audio: read the strings from `inspect.ts` or the sources and write "Röst kontrollerad i
  källa, ej uppspelad" in `notes`.

## Consistency row (one per exercise, in the report)

```
| Ref | id | Voice (said) | Animation (shown) | How-to (written) | Verdict |
|---|---|---|---|---|---|
| <ref> | <static hold> | "Börja hålla." / "Klart. Släpp positionen.", Hålltid | motion hold, identical frames, stills Start/Håll | tips: håll läget; unit seconds; easier: kortare tid | consistent |
| <ref> | <timed carry> | "Börja gå." / "Klart. Vila.", Övningstid, "per hand" | sequence: walking, feet must lift | tips: gå under hela tiden; unit seconds; easier: kortare tid | consistent (foot lift checked separately) |
```

Mention a mismatch in the notes of every scope it touches.
