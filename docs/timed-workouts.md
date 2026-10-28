# Hands-free timed exercises

Timed sets (`unit: seconds`) share one flow: side plank, wall sit, calf stretch, quadriceps stretch and lying hamstring stretch.

- Tap Start once to get five seconds to take position.
- The full prescribed hold then starts. Preparation is not logged as exercise time.
- At zero the set is saved. A second selected side gets another five-second preparation period and starts automatically.
- After both sides, the plan's normal rest runs and then the next set starts after five seconds of preparation. Single-side and bilateral exercises follow their selected plan without adding an extra side.
- At the end of the exercise, automation stops at the effort question. A different timed exercise requires its own Start tap.
- Pause preserves remaining preparation, hold or rest time. Skip, abort, undo, saving errors and reload do not silently arm another exercise. Leaving the app pauses the current timer; return and explicitly resume.
- Spoken Swedish cues are best-effort browser speech, initiated by the Start tap. Existing vibration feedback remains available where supported. The session also requests a screen wake lock.

Repetition-based exercises are counted by the repetition flow described below; they are not treated as continuous timed sets.

Validation covers preparation/work separation, pause/resume, background suspension, unmount cleanup, full right/left pairs with rest, the end-of-exercise effort question, offline session logging, and mobile/desktop layout.

## Hands-free repetition counting

Rep-based exercises (`unit: reps`) with a defined tempo count automatically by default. The tempo lives in `src/rules/repTempo.ts`.

- Tap Start once to get five seconds to take position. A large counter then shows completed repetitions ("7 / 12").
- Tempo is about 2 s up and 2 s down per repetition. Repetitions with a hold use 1.5 s up, the hold, 1.5 s down and the relax time (1 s if none is set). The set screen shows one line, "Takt: ca N s per repetition". The tempo is not adjustable.
- The set is saved at the last repetition with the planned amount. Rest, the next side and the next set follow the same automation as timed sets (five seconds preparation per side or set). Automation stops at the effort question; a different exercise needs its own Start tap.
- Pause with the main button, a tap on the counter, or the Space key (ignored while a button, input, select or summary has focus). Resume has a 3-2-1 lead-in. Leaving the app pauses; resume is always explicit.
- "Avsluta setet" saves the repetitions completed so far (the one in progress does not count) and marks the log `endedEarly`. The next set's prefill returns to the plan target after such a stop.
- Time comes from timestamps minus paused time, never from counting interval ticks.
- Speech says the number at the end of each repetition, and Upp, Håll and Ner for hold exercises (best-effort browser speech, queued speech is cancelled before each cue). Vibration uses the existing haptics. Screen readers are not told every repetition; only start, pause, saved and rest are announced.
- "Räkna själv" (localStorage `stomme.repCount.manual`) switches back to manual "Klar set". Pull-up, chin-up, parallel dip, laps, meters and timed sets stay manual or use the timed flow.
- Ballistic exercises get one suggested beat per rep and no holds: squat jump and jumping lunge 3 s, kettlebell swing 2 s, burpee 6 s.
- Set logs get optional `counting` (`auto` or `manual`) and `endedEarly`; backups accept them and older backups without them still import. Progression rules are unchanged: an early stop logs fewer reps than the target, which already blocks increases.
- The figure follows the same clock as the count and the beep while a set runs (`repProgress`). A rep is counted when the movement is back at the start, before any relax pause.
