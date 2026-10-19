import type { Exercise } from '../domain/types';

/** The selected ladder entry drives both coaching and equipment in the diagram. */
export function loadPresentation(exercise: Exercise, index: number) {
  const load = exercise.loadLadder[index] ??
    exercise.loadLadder[0] ?? { kg: 0, label: 'Kroppsvikt' };
  const kind: 'dumbbell' | 'kettlebell' = load.label.includes('kettlebell')
    ? 'kettlebell'
    : 'dumbbell';
  const equipment = load.kg === 0 ? null : kind;
  let cue = 'Utan extra vikt.';
  if (equipment) {
    const tool = kind === 'kettlebell' ? 'kettlebellen' : 'hanteln';
    switch (exercise.id) {
      case 'goblet-chair-squat':
        cue = `Håll ${tool} med båda händerna tätt mot bröstet.`;
        break;
      case 'step-up':
      case 'split-squat':
        cue = 'Håll en hantel i varje hand, med armarna längs kroppen.';
        break;
      case 'single-leg-hip-thrust':
        cue = `Placera ${tool} på höften och håll den stadigt med händerna.`;
        break;
      case 'single-leg-calf-raise':
        cue = 'Håll hanteln i en hand och ta stöd med den andra.';
        break;
      default:
        cue = `Håll ${tool} i en hand nära kroppen.`;
    }
  }
  const tips = [...exercise.tips];
  if (exercise.id === 'goblet-chair-squat') tips[1] = cue;
  if (exercise.id === 'single-leg-rdl' && !equipment)
    tips[2] = 'Låt armarna följa kroppen utan extra vikt.';
  if (exercise.id === 'split-squat' && equipment)
    tips[2] = 'Upprätt överkropp. Välj kroppsvikt om du behöver handstöd.';
  return { load, equipment, cue, tips };
}
