import { getSettings } from './settings';

type SoundType = 'move' | 'backtrack' | 'win' | 'quantum';

let ctx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainValue: number,
  onSetup?: (osc: OscillatorNode, gain: GainNode, ac: AudioContext) => void
): void {
  const ac = getAudioContext();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ac.currentTime);
  gain.gain.setValueAtTime(gainValue, ac.currentTime);
  osc.connect(gain);
  gain.connect(ac.destination);

  if (onSetup) onSetup(osc, gain, ac);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + duration);
}

function playMove(): void {
  playTone(440, 0.05, 'square', 0.08, (_osc, gain, ac) => {
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.05);
  });
}

function playBacktrack(): void {
  playTone(300, 0.1, 'square', 0.08, (osc, gain, ac) => {
    osc.frequency.linearRampToValueAtTime(180, ac.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  });
}

function playWin(): void {
  const notes = [440, 554, 659, 880];
  const ac = getAudioContext();
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(0.08, ac.currentTime + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.1 + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(ac.currentTime + i * 0.1);
    osc.stop(ac.currentTime + i * 0.1 + 0.12);
  });
}

function playQuantum(): void {
  const ac = getAudioContext();
  const osc = ac.createOscillator();
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(600, ac.currentTime + 0.5);

  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(12, ac.currentTime);
  lfoGain.gain.setValueAtTime(40, ac.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);

  gain.gain.setValueAtTime(0.1, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.5);
  lfo.start(ac.currentTime);
  lfo.stop(ac.currentTime + 0.5);
}

const sounds: Record<SoundType, () => void> = {
  move: playMove,
  backtrack: playBacktrack,
  win: playWin,
  quantum: playQuantum,
};

export function playSound(type: SoundType): void {
  if (!getSettings().soundEnabled) return;
  sounds[type]();
}
