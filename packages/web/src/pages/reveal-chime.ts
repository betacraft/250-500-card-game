/**
 * Short partner-reveal chime. Silent when muted, and silent when the browser has no audio.
 * There is no separate reveal sample in the app, so this is the placeholder.
 */
export function playRevealChime(muted: boolean): void {
  if (muted || typeof window === 'undefined') return;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const start = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.05, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.start(start);
    osc.stop(start + 0.2);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* autoplay or a missing device stays quiet */
  }
}
