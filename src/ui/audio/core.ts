/**
 * The audio context and its buses, shared by the sound effects (`audio.ts`) and the music and
 * ambience (`music.ts`). Everything is synthesised: there are no audio files.
 *
 *   sfx ─────────────────────────────┐
 *   music → duck ─┐                   ├→ master → compressor → speakers
 *   amb ──────────┴→ mood (low-pass) ─┘
 *   reverbSend → reverb → master
 */
type Ctx = AudioContext;

export interface Buses {
  ctx: Ctx | null;
  master: GainNode | null;
  sfx: GainNode | null;
  music: GainNode | null;
  amb: GainNode | null;
  /** Dips the music under a big moment. */
  duck: GainNode | null;
  /** Low-passes music and ambience (a muffled mood). */
  mood: BiquadFilterNode | null;
  reverbSend: GainNode | null;
  noise: AudioBuffer | null;
}

export const au: Buses = {
  ctx: null,
  master: null,
  sfx: null,
  music: null,
  amb: null,
  duck: null,
  mood: null,
  reverbSend: null,
  noise: null,
};

let volumes = { sfx: 0.8, music: 0.5, ambience: 0.5 };

/** Counters for tests: how many sounds and notes have been scheduled. */
export const stats = { sounds: 0, notes: 0 };
const onUnlock: (() => void)[] = [];

export function setVolumes(sfx: number, music: number, ambience = music): void {
  volumes = { sfx, music, ambience };
  if (au.sfx) au.sfx.gain.value = sfx;
  if (au.music) au.music.gain.value = music * 0.55;
  if (au.amb) au.amb.gain.value = ambience * 0.8;
}

export function currentVolumes(): { sfx: number; music: number; ambience: number } {
  return volumes;
}

/** Run `f` once the context exists (now, if it already does). */
export function whenUnlocked(f: () => void): void {
  if (au.ctx) f();
  else onUnlock.push(f);
}

/** True while we have paused the sound because the page is hidden. */
let pausedForHidden = false;

/**
 * Silence everything while the game is in a background tab or the app is minimised, and pick up
 * again on return. Every sound checks `ready()`, which is false while the context is suspended,
 * and the music schedules on the context's clock, which stops too, so nothing plays in a burst on
 * return.
 */
function onVisibilityChange(): void {
  const ctx = au.ctx;
  if (!ctx) return;
  if (document.hidden) {
    if (ctx.state === 'running') {
      pausedForHidden = true;
      void ctx.suspend();
    }
  } else if (pausedForHidden) {
    pausedForHidden = false;
    void ctx.resume();
  }
}

/** Create (or resume) the audio context. Must be called from a user gesture. */
export function unlockAudio(): void {
  try {
    if (!au.ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      au.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      au.master = master;
      au.sfx = ctx.createGain();
      au.sfx.connect(master);
      au.mood = ctx.createBiquadFilter();
      au.mood.type = 'lowpass';
      au.mood.frequency.value = 18000;
      au.mood.Q.value = 0.5;
      au.mood.connect(master);
      au.duck = ctx.createGain();
      au.duck.connect(au.mood);
      au.music = ctx.createGain();
      au.music.connect(au.duck);
      au.amb = ctx.createGain();
      au.amb.connect(au.mood);
      const reverb = ctx.createConvolver();
      reverb.buffer = impulse(ctx, 2.8, 2.2);
      au.reverbSend = ctx.createGain();
      au.reverbSend.gain.value = 0.35;
      au.reverbSend.connect(reverb).connect(master);
      au.noise = makeNoise(ctx);
      setVolumes(volumes.sfx, volumes.music, volumes.ambience);
      document.addEventListener('visibilitychange', onVisibilityChange);
      for (const f of onUnlock.splice(0)) f();
    }
    if (au.ctx.state === 'suspended' && !document.hidden) void au.ctx.resume();
  } catch {
    au.ctx = null;
  }
}

export function impulse(c: Ctx, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function makeNoise(c: Ctx): AudioBuffer {
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** The context, if it is running (not before a gesture, and not in a hidden tab). */
export function ready(): Ctx | null {
  const c = au.ctx;
  if (!c || !au.sfx || c.state !== 'running') return null;
  return c;
}

/** A burst of white noise from `when`, `dur` seconds long. */
export function noise(c: Ctx, when: number, dur: number): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = au.noise;
  src.loop = true;
  src.start(when, Math.random() * 1.5, dur + 0.05);
  return src;
}

/** A gain that rises exponentially to `peak` over `attack`, then falls away over `decay`. */
export function env(c: Ctx, when: number, attack: number, peak: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  return g;
}

/** A filter, set up in one call. */
export function filter(c: Ctx, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

// ---------------------------------------------------------------------------
// Plucked strings (Karplus–Strong), rendered once per pitch and cached.

const pluckCache = new Map<string, AudioBuffer>();

/**
 * A plucked string (the guzheng). `bright` is how much of the delay line starts at full noise (the
 * pluck's sharpness); `damp` is the loop's loss (lower dies faster); `buzz` adds a rattle.
 */
export function pluckBuffer(
  c: Ctx,
  freq: number,
  bright: number,
  damp = 0.4985,
  buzz = 0,
): AudioBuffer {
  const key = `${freq.toFixed(2)}:${bright}:${damp}:${buzz}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const sr = c.sampleRate;
  const len = Math.floor(sr * (damp < 0.498 ? 1.2 : 2.2));
  const buf = c.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++)
    line[i] = (Math.random() * 2 - 1) * (i < period * bright ? 1 : 0.4);
  let idx = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = line[idx] as number;
    const next = line[(idx + 1) % period] as number;
    const v = damp * (cur + next) + 0.001 * prev;
    line[idx] = v;
    prev = v;
    const s = buzz > 0 ? Math.tanh(cur * (1 + buzz * 4)) / (1 + buzz) : cur;
    out[i] = s * Math.min(1, i / 40);
    idx = (idx + 1) % period;
  }
  pluckCache.set(key, buf);
  return buf;
}
