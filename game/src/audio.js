// All sound is synthesized with WebAudio: no audio files, no network. Each effect is a
// short oscillator phrase; the context starts on the first user gesture (browsers block
// audio before one) and every call is guarded, so a silent browser never breaks the game.

export function createAudio() {
  let ctx = null;
  let enabled = true;

  function ensure() {
    if (ctx !== null) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        enabled = false;
        return null;
      }
      ctx = new AC();
    } catch {
      enabled = false;
      return null;
    }
    return ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = 0) {
    if (!enabled) return;
    const ac = ensure();
    if (ac === null) return;
    try {
      if (ac.state === 'suspended') void ac.resume();
      const t0 = ac.currentTime + when;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // A blocked or missing audio device is not a game error.
    }
  }

  return {
    unlock() {
      ensure();
    },
    orb() {
      tone(880, 0.12, 'sine', 0.08, 0, 1320);
    },
    trap() {
      tone(523, 0.1, 'triangle', 0.09);
      tone(659, 0.1, 'triangle', 0.09, 0.07);
      tone(784, 0.16, 'triangle', 0.1, 0.14);
    },
    lantern() {
      tone(392, 0.22, 'sine', 0.1);
      tone(587, 0.3, 'sine', 0.09, 0.1);
      tone(880, 0.34, 'sine', 0.06, 0.2);
    },
    hit() {
      tone(140, 0.25, 'sawtooth', 0.12, 0, 60);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.12));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sine', 0.08, i * 0.14));
    },
  };
}
