/** Best-effort spoken cues; the first cue is triggered by the user's Start tap. */
export function timerVoice(message: string): void {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'sv-SE';
    window.speechSynthesis.speak(utterance);
  } catch {
    // Visual cues and vibration still work when speech is unavailable.
  }
}

export function stopTimerVoice(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // Speech is optional.
  }
}
