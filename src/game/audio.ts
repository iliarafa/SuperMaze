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

let waveExpandNodes: { oscs: OscillatorNode[]; gains: GainNode[] } | null = null;

export function startWaveExpand(): void {
  if (!getSettings().soundEnabled) return;
  if (waveExpandNodes) return;

  const ac = getAudioContext();
  const master = ac.createGain();
  master.gain.setValueAtTime(0.06, ac.currentTime);
  master.connect(ac.destination);

  // Base hum
  const base = ac.createOscillator();
  base.type = 'sine';
  base.frequency.setValueAtTime(80, ac.currentTime);
  const baseGain = ac.createGain();
  baseGain.gain.setValueAtTime(0.5, ac.currentTime);
  base.connect(baseGain);
  baseGain.connect(master);
  base.start();

  // Sweep tone with frequency LFO (200-400 Hz over ~8s cycle)
  const sweep = ac.createOscillator();
  sweep.type = 'sine';
  sweep.frequency.setValueAtTime(300, ac.currentTime);
  const freqLfo = ac.createOscillator();
  freqLfo.type = 'triangle';
  freqLfo.frequency.setValueAtTime(0.125, ac.currentTime);
  const freqLfoGain = ac.createGain();
  freqLfoGain.gain.setValueAtTime(100, ac.currentTime);
  freqLfo.connect(freqLfoGain);
  freqLfoGain.connect(sweep.frequency);
  freqLfo.start();

  // Tremolo on sweep volume
  const tremolo = ac.createOscillator();
  tremolo.type = 'sine';
  tremolo.frequency.setValueAtTime(2.5, ac.currentTime);
  const tremoloGain = ac.createGain();
  tremoloGain.gain.setValueAtTime(0.3, ac.currentTime);
  const sweepGain = ac.createGain();
  sweepGain.gain.setValueAtTime(0.5, ac.currentTime);
  tremolo.connect(tremoloGain);
  tremoloGain.connect(sweepGain.gain);
  tremolo.start();

  sweep.connect(sweepGain);
  sweepGain.connect(master);
  sweep.start();

  waveExpandNodes = {
    oscs: [base, sweep, freqLfo, tremolo],
    gains: [baseGain, sweepGain, master],
  };
}

export function stopWaveExpand(): void {
  if (!waveExpandNodes) return;
  const ac = getAudioContext();
  for (const g of waveExpandNodes.gains) {
    g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
  }
  const nodes = waveExpandNodes;
  waveExpandNodes = null;
  setTimeout(() => {
    for (const o of nodes.oscs) {
      try { o.stop(); } catch (_) { /* already stopped */ }
    }
  }, 350);
}
