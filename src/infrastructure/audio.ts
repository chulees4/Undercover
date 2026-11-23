export function createAudio() {
  let context: AudioContext | undefined;

  function tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ) {
    try {
      const browser = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const Audio = window.AudioContext ?? browser.webkitAudioContext;
      if (!Audio) return;
      context ??= new Audio();
      if (context.state === 'suspended') void context.resume().catch(() => {});
      const now = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      // Audio is optional on devices that block Web Audio.
    }
  }

  return {
    click: () => tone(560, 0.06, 'triangle', 0.08),
    flip: () => {
      tone(340, 0.08, 'sine', 0.1);
      tone(540, 0.12, 'sine', 0.1, 0.06);
    },
    hold: () => tone(440, 0.09, 'sine', 0.09),
    beep: () => tone(880, 0.11, 'square', 0.08),
    alarm: () => {
      tone(620, 0.16, 'sawtooth', 0.1);
      tone(460, 0.25, 'sawtooth', 0.1, 0.18);
    },
    eliminate: () => {
      tone(280, 0.18, 'sawtooth', 0.11);
      tone(190, 0.3, 'sawtooth', 0.11, 0.16);
    },
    win: () =>
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) =>
        tone(frequency, 0.24, 'triangle', 0.13, index * 0.11),
      ),
  };
}
