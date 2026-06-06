// Web Audio API synthesizer for clean sound effects without relying on fragile asset loads
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Plays a simple synthesize beep
 */
export function playClickSound(volume: number) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Unpause context if suspended (browser security autostart block)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Premium popping click sound (sine wave transition for high tactile response)
    osc.type = 'sine';
    
    // Quick, clean pitch drop mimicking physical key spring action
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.05);

    // Dynamic, fast exponential decay envelope so it is crispy and not muddy
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.35, ctx.currentTime + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.052);
  } catch (e) {
    console.warn('Audio click failed', e);
  }
}

/**
 * Plays a triumphant ascending scale for Level Up
 */
export function playLevelUpSound(volume: number) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  try {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Beautiful C Major arpeggio
    const noteDuration = 0.09;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * noteDuration);

      const startTime = ctx.currentTime + idx * noteDuration;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration - 0.01);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);
    });
  } catch (e) {
    console.warn('Audio level-up failed', e);
  }
}
