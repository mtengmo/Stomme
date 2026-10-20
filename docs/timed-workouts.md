# Hands-free timed exercises

Timed sets (`unit: seconds`) share one flow: side plank, wall sit, calf stretch, quadriceps stretch and lying hamstring stretch.

- Tap Start once to get five seconds to take position.
- The full prescribed hold then starts. Preparation is not logged as exercise time.
- At zero the set is saved. A second selected side gets another five-second preparation period and starts automatically.
- After both sides, the plan's normal rest runs and then the next set starts after five seconds of preparation. Single-side and bilateral exercises follow their selected plan without adding an extra side.
- At the end of the exercise, automation stops at the effort question. A different timed exercise requires its own Start tap.
- Pause preserves remaining preparation, hold or rest time. Skip, abort, undo, saving errors and reload do not silently arm another exercise. Leaving the app pauses the current timer; return and explicitly resume.
- Spoken Swedish cues are best-effort browser speech, initiated by the Start tap. Existing vibration feedback remains available where supported. The session also requests a screen wake lock.

Repetition-based knee exercises with a prescribed hold inside each repetition still use manual repetition counting; they are not treated as continuous timed sets.

Validation covers preparation/work separation, pause/resume, background suspension, unmount cleanup, full right/left pairs with rest, the end-of-exercise effort question, offline session logging, and mobile/desktop layout.
