import { Rng, hashSeed } from '@/engine/rng';
import { type Scene, type Note, modeFor, notesAt } from './compose';
import { au, env, filter, noise, pluckBuffer, stats } from './core';

/**
 * The music: a guzheng and a dizi, a different mode for each wind and a calm one for the
 * teahouse. It is scheduled a little ahead on the audio clock, so it stops when the context is
 * suspended (a hidden tab) and picks up again without a burst on return.
 */
let scene: Scene | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextStep = 0;
let nextTime = 0;
let rng = new Rng(hashSeed('music'));
const melody = { degree: 2 };

function playNote(c: AudioContext, when: number, n: Note, beat: number): void {
  if (!au.music) return;
  stats.notes++;
  if (n.inst === 'guzheng') {
    const src = c.createBufferSource();
    src.buffer = pluckBuffer(c, n.freq, 0.55);
    const g = c.createGain();
    g.gain.value = 0.5 * n.vel;
    src.connect(g).connect(au.music);
    if (au.reverbSend) {
      const r = c.createGain();
      r.gain.value = 0.45;
      g.connect(r).connect(au.reverbSend);
    }
    src.start(when);
    src.stop(when + Math.min(2.2, n.beats * beat + 0.5));
    return;
  }
  // dizi: a breathy sine with vibrato that comes and goes
  const dur = n.beats * beat;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.value = n.freq;
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.2;
  const lg = c.createGain();
  lg.gain.value = n.freq * 0.006;
  lfo.connect(lg).connect(o.frequency);
  const g = env(c, when, 0.12, 0.18 * n.vel, dur);
  const breath = noise(c, when, dur + 0.2);
  const bp = filter(c, 'bandpass', n.freq * 2, 2.5);
  const bg = env(c, when, 0.1, 0.04, dur);
  breath.connect(bp).connect(bg).connect(au.music);
  o.connect(g).connect(au.music);
  if (au.reverbSend) {
    const r = c.createGain();
    r.gain.value = 0.5;
    g.connect(r).connect(au.reverbSend);
  }
  o.start(when);
  lfo.start(when);
  o.stop(when + dur + 0.3);
  lfo.stop(when + dur + 0.3);
  breath.stop(when + dur + 0.3);
}

/** The ambience: a bed of wind, its pitch following the season. Stopped and restarted per scene. */
let bed: { src: AudioBufferSourceNode; stop: () => void; key: string } | null = null;

function bedKey(sc: Scene): string {
  return sc.kind === 'round' ? `round${sc.wind ?? 0}` : sc.kind;
}

function startBed(c: AudioContext, sc: Scene): void {
  if (!au.amb || !au.noise) return;
  const key = bedKey(sc);
  if (bed?.key === key) return;
  bed?.stop();
  const cutoff = sc.kind === 'round' ? ([900, 1500, 700, 420][sc.wind ?? 0] ?? 800) : 600;
  const src = c.createBufferSource();
  src.buffer = au.noise;
  src.loop = true;
  const lp = filter(c, 'lowpass', cutoff, 0.7);
  const g = c.createGain();
  g.gain.value = 0.0001;
  g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 2);
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lg = c.createGain();
  lg.gain.value = cutoff * 0.3;
  lfo.connect(lg).connect(lp.frequency);
  src.connect(lp).connect(g).connect(au.amb);
  src.start();
  lfo.start();
  bed = {
    src,
    key,
    stop: () => {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1);
      src.stop(c.currentTime + 1.1);
      lfo.stop(c.currentTime + 1.1);
    },
  };
}

function tick(): void {
  const c = au.ctx;
  if (!c || c.state !== 'running' || !scene || !au.music) return;
  startBed(c, scene);
  const mode = modeFor(scene);
  const beat = 60 / mode.bpm;
  if (nextTime < c.currentTime) nextTime = c.currentTime + 0.1;
  while (nextTime < c.currentTime + 1.2) {
    for (const n of notesAt(mode, nextStep, melody, rng)) playNote(c, nextTime, n, beat);
    nextStep++;
    nextTime += beat / 2;
  }
}

/** Change what is playing. The same scene again does nothing. */
export function setScene(next: Scene | null): void {
  if (scene && next && scene.kind === next.kind && scene.wind === next.wind) return;
  scene = next;
  nextStep = 0;
  nextTime = 0;
  melody.degree = 2;
  rng = new Rng(hashSeed(`music:${next?.kind}:${next?.wind ?? 0}`));
  if (timer === null) timer = setInterval(tick, 250);
}

export function currentScene(): Scene | null {
  return scene;
}
