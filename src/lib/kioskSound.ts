function playTone(notes: { freq: number; duration: number; startDelay: number }[], volume = 0.35) {
  try {
    const ctx = new AudioContext();
    notes.forEach(({ freq, duration, startDelay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
      gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startDelay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
      osc.start(ctx.currentTime + startDelay);
      osc.stop(ctx.currentTime + startDelay + duration);
    });
  } catch {
    // AudioContext недоступен
  }
}

// Обычное сообщение от диспетчера — два мягких тона
export function playMessageBeep() {
  playTone([
    { freq: 880, duration: 0.18, startDelay: 0 },
    { freq: 1100, duration: 0.22, startDelay: 0.22 },
  ], 0.3);
}

// Важное/срочное сообщение — три настойчивых тона
export function playUrgentBeep() {
  playTone([
    { freq: 1046, duration: 0.18, startDelay: 0 },
    { freq: 1046, duration: 0.18, startDelay: 0.25 },
    { freq: 1318, duration: 0.35, startDelay: 0.5 },
  ], 0.5);
}
