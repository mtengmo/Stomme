function swedishVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis
    .getVoices()
    .find((voice) =>
      voice.lang.toLowerCase().replace('_', '-').startsWith('sv'),
    );
}

/** True when the phone has a Swedish voice; otherwise cues stay silent instead of being read in English. */
export function canSpeakSwedish(): boolean {
  try {
    return 'speechSynthesis' in window && swedishVoice() !== undefined;
  } catch {
    return false;
  }
}

/** Best-effort spoken cues; the first cue is triggered by the user's Start tap. */
export function timerVoice(message: string): void {
  try {
    if (!('speechSynthesis' in window)) return;
    const voice = swedishVoice();
    if (!voice) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'sv-SE';
    utterance.voice = voice;
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
