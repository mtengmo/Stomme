---
target: Workout timer, movie and mobile scrolling
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\GitRepos\\Stomme\\src\\features\\session\\Runner.tsx"
target_fingerprint: "sha256:098f62b6469f3fcf72317b8fbc25b2608b42a0b68de01b840ba9a45f967113a9"
target_path: "C:\\GitRepos\\Stomme\\src\\features\\session\\Runner.tsx"
timestamp: 2026-10-20T12-47-11Z
slug: src-features-session-runner-tsx
---
Method: dual-agent (A: /root/design_review; B: /root/browser_evidence)

Target: src/features/session/Runner.tsx and its set/rest/guide surfaces.

Design specificity: the squared-paper training diary has a coherent identity. The active workout behaves too much like an editing form for a phone used on the floor.

Design health: 25/40, significant improvements needed.
| Heuristic | Score /4 | Finding |
|---|---:|---|
| System status | 2 | Hold timer below controls; elapsed clock competes |
| Real-world match | 3 | Swedish set/side cues work |
| User control | 3 | Manual completion, skip and undo |
| Consistency | 3 | Shared controls, weak timer hierarchy |
| Error prevention | 3 | Explicit completion and validation |
| Recognition | 2 | Movie and timer separated |
| Efficiency | 2 | Mobile scrolling during exercise |
| Minimalist design | 1 | Repeated instructions and editing controls |
| Recovery | 3 | Undo/retry preserve flow |
| Help | 3 | Useful guide but covers workout |

Strengths: coherent notebook identity; explicit side and set information; manual completion and undo.

Priority issues:
1. P1: active hold timer lacks priority and its start control is obscured. At360x800 Starta halltid is y729.5..785.5 behind the sticky actions y649..800. At390x844 it is partly obscured. Place a distinct solid timer panel above editing controls, with large tabular digits, text phase labels and nearby start/stop. Use blue work/neutral rest plus words, retaining red safety meaning. Suggested commands: layout, colorize.
2. P1: movie too small and expanded guide hides timer. Inline figure128px wide, full guide296x180 on360px screen. Give animation the central area beside/below countdown, with one current-side cue. Keep full technique details optional. Suggested commands: layout, distill.
3. P1: mobile flow exceeds viewport and sticky footer covers content. First set document890px at800px viewport; timed953px; rest840px. Keep normal-size active timer, animation and primary action visible together at360x800; reserve footer space. Allow scrolling at zoom/small landscape rather than clipping content. Suggested commands: adapt, layout.
4. P2: repeated Klar set instructions and setup fields compete with exercise. Show phase, side and one short cue; put weight/repetition changes under Andra set and longer help under Teknik. Preserve prominent symptom reporting. Suggested commands: distill, clarify.

Proposed mobile order: compact exercise/set/side header; prominent labelled timer; larger animation; one coaching cue; stable primary action. Expanded details scroll separately. Preserve current manual advancement and reduced motion behavior. Repetition exercises show reps, never an invented repetition countdown. AAOS per-repetition holds require separate design from whole-set countdown.

Cognitive load: no problematic list of more than four equal alternatives; the issue is stacked simultaneous instructions and secondary controls.
Personas: floor-workout user cannot glance at hidden timer; beginner must leave timer to inspect movement; low-vision user needs phase words and contrast, plus scrolling preserved under zoom.
Emotional journey: clear set/side reassures; timer search interrupts exercise; repeated task-completion copy makes the moment feel uncertain.
Minor: quiet total elapsed time; preserve48px touch targets and accessible timer semantics; do not automatically complete/log a set at0.
Questions: scope top3 or all4? Demonstration always visible or collapsible?
