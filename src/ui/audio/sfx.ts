import { au, env, filter, noise, ready, stats } from './core';

/**
 * Sound effects, all synthesised: bone tiles clacking on a wooden table, and the percussion of
 * Chinese opera (the ban clapper, gong and cymbal) for plays and the score count.
 */

type Ctx = AudioContext;

function out(c: Ctx, node: AudioNode, reverb = 0): void {
  if (!au.sfx) return;
  node.connect(au.sfx);
  if (reverb > 0 && au.reverbSend) {
    const g = c.createGain();
    g.gain.value = reverb;
    node.connect(g).connect(au.reverbSend);
  }
}

/** One bone tile on wood: a short click and a woody knock. */
function clack(c: Ctx, when: number, pitch = 1, gain = 0.5): void {
  const click = noise(c, when, 0.02);
  const hp = filter(c, 'highpass', 2800 * pitch, 0.7);
  const cg = env(c, when, 0.001, gain * 0.7, 0.014);
  click.connect(hp).connect(cg);
  out(c, cg);
  const knock = c.createOscillator();
  knock.type = 'triangle';
  knock.frequency.setValueAtTime(1500 * pitch, when);
  knock.frequency.exponentialRampToValueAtTime(620 * pitch, when + 0.05);
  const kg = env(c, when, 0.002, gain, 0.07);
  knock.connect(kg);
  out(c, kg, 0.04);
  knock.start(when);
  knock.stop(when + 0.12);
  click.stop(when + 0.04);
}

/** The ban: two hard wooden slaps. */
function ban(c: Ctx, when: number, gain = 0.6): void {
  for (const [i, d] of [0, 0.09].entries()) {
    const t = when + d;
    const n = noise(c, t, 0.04);
    const bp = filter(c, 'bandpass', 2400, 1.4);
    const g = env(c, t, 0.001, gain * (i ? 0.7 : 1), 0.03);
    n.connect(bp).connect(g);
    out(c, g, 0.06);
    n.stop(t + 0.06);
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(190, t + 0.04);
    const og = env(c, t, 0.001, gain * 0.35, 0.04);
    o.connect(og);
    out(c, og);
    o.start(t);
    o.stop(t + 0.08);
  }
}

/** The opera gong: inharmonic partials that swell and sink. */
function gong(c: Ctx, when: number, base = 190, gain = 0.5, long = 2.6): void {
  for (const [i, ratio] of [1, 1.47, 2.09, 2.56, 3.18, 4.1].entries()) {
    const o = c.createOscillator();
    o.type = 'sine';
    const f = base * ratio;
    o.frequency.setValueAtTime(f * 1.04, when);
    o.frequency.exponentialRampToValueAtTime(f, when + 0.5);
    const g = env(c, when, 0.004 + i * 0.01, (gain / (1 + i * 0.7)) * 0.6, long / (1 + i * 0.35));
    o.connect(g);
    out(c, g, 0.25);
    o.start(when);
    o.stop(when + long + 0.2);
  }
  const n = noise(c, when, 0.5);
  const bp = filter(c, 'bandpass', 3200, 0.8);
  const ng = env(c, when, 0.002, gain * 0.25, 0.4);
  n.connect(bp).connect(ng);
  out(c, ng, 0.3);
  n.stop(when + 0.6);
}

/** A crash of the small cymbal. */
function cymbal(c: Ctx, when: number, gain = 0.4, dur = 0.9): void {
  const n = noise(c, when, dur);
  const hp = filter(c, 'highpass', 5200, 0.6);
  const g = env(c, when, 0.003, gain, dur);
  n.connect(hp).connect(g);
  out(c, g, 0.2);
  n.stop(when + dur + 0.1);
}

function bell(c: Ctx, when: number, freq: number, gain = 0.3, dur = 0.5): void {
  for (const [ratio, amp] of [
    [1, 1],
    [2.76, 0.35],
  ] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * ratio;
    const g = env(c, when, 0.002, gain * amp, dur / ratio);
    o.connect(g);
    out(c, g, 0.3);
    o.start(when);
    o.stop(when + dur + 0.1);
  }
}

function woodblock(c: Ctx, when: number, freq: number, gain = 0.4): void {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.3, when);
  o.frequency.exponentialRampToValueAtTime(freq, when + 0.03);
  const g = env(c, when, 0.001, gain, 0.09);
  o.connect(g);
  out(c, g, 0.1);
  o.start(when);
  o.stop(when + 0.15);
}

/** Run `f` with the context and the current time, if sound is available. */
function now(f: (c: Ctx, t: number) => void): void {
  const c = ready();
  if (!c) return;
  stats.sounds++;
  f(c, c.currentTime + 0.005);
}

export const sfx = {
  /** Tiles drawn from the pile. */
  take: () => now((c, t) => clack(c, t, 1.05, 0.45)),
  /** A tile picked in your hand. */
  pick: () => now((c, t) => clack(c, t, 1.4, 0.22)),
  /** A set played: a run of clacks and the clapper. */
  play: (tiles: number) =>
    now((c, t) => {
      for (let i = 0; i < tiles; i++) clack(c, t + i * 0.055, 0.9 + i * 0.04, 0.5);
      ban(c, t + tiles * 0.055 + 0.04, 0.5);
    }),
  /** Tiles discarded: a soft scatter. */
  discard: (tiles: number) =>
    now((c, t) => {
      for (let i = 0; i < Math.min(tiles, 5); i++) clack(c, t + i * 0.04, 0.7 - i * 0.03, 0.3);
    }),
  /** A pong upgraded to a kong, or a wind blowing: a gong. */
  kong: () =>
    now((c, t) => {
      clack(c, t, 0.8, 0.5);
      gong(c, t + 0.06, 150, 0.5, 2.2);
    }),
  /** One step of the score count. */
  tick: (i: number) => now((c, t) => woodblock(c, t, 520 + Math.min(i, 14) * 38, 0.35)),
  /** The count ends: you beat the target. */
  win: () =>
    now((c, t) => {
      gong(c, t, 210, 0.55, 2.6);
      cymbal(c, t + 0.02, 0.35, 1.1);
      for (const [i, f] of [660, 880, 990, 1320].entries())
        bell(c, t + 0.25 + i * 0.11, f, 0.22, 0.7);
    }),
  /** The count ends: you did not. */
  lose: () =>
    now((c, t) => {
      gong(c, t, 120, 0.5, 3.2);
    }),
  /** Money. */
  coin: () =>
    now((c, t) => {
      bell(c, t, 1760, 0.2, 0.25);
      bell(c, t + 0.07, 2640, 0.18, 0.3);
    }),
  /** A button, a bank, a card taken. */
  tock: () => now((c, t) => woodblock(c, t, 420, 0.3)),
  /** The banker's gong when you bank the table. */
  bank: () =>
    now((c, t) => {
      ban(c, t, 0.5);
      gong(c, t + 0.1, 230, 0.4, 1.6);
    }),
  /** A tile swapped, a tile burning, a tide: small rustles. */
  swap: () =>
    now((c, t) => {
      clack(c, t, 1.2, 0.3);
      clack(c, t + 0.07, 1.0, 0.3);
    }),
  burn: () => now((c, t) => cymbal(c, t, 0.18, 0.5)),
};

export type Sfx = typeof sfx;
