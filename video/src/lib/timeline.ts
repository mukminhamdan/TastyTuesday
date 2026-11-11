import {Easing, interpolate} from 'remotion';
import {FPS} from './theme';
import type {Episode, Focus, Shot} from './types';

export const shotFrames = (s: Shot) =>
  Math.max(1, Math.round(((s.to - s.from) / (s.rate ?? 1)) * FPS));

export type PlacedShot = Shot & {start: number; frames: number; index: number};

export const layout = (ep: Episode) => {
  let t = 0;
  const shots: PlacedShot[] = ep.shots.map((s, index) => {
    const frames = shotFrames(s);
    const p = {...s, start: t, frames, index};
    t += frames;
    return p;
  });
  return {shots, total: t};
};

export const sec = (s: number) => Math.round(s * FPS);

const ease = Easing.bezier(0.45, 0, 0.25, 1);

export const focusAt = (z: {from: Focus; to: Focus} | undefined, p: number): Focus => {
  if (!z) return {s: 1, x: 0.5, y: 0.5};
  const k = ease(Math.min(1, Math.max(0, p)));
  return {
    s: interpolate(k, [0, 1], [z.from.s, z.to.s]),
    x: interpolate(k, [0, 1], [z.from.x, z.to.x]),
    y: interpolate(k, [0, 1], [z.from.y, z.to.y]),
  };
};

/**
 * Per-frame music volume. Music sits at `bed` level, ducks under ASMR
 * shots (and under clips whose own audio is loud), fades in/out, and every
 * change is smoothed so there are no audible steps.
 */
export const musicCurve = (ep: Episode) => {
  const {shots, total} = layout(ep);
  const bed = ep.musicBed ?? 0.5;
  const target = new Float32Array(total);
  for (const s of shots) {
    const a = s.audio ?? 0;
    const v = s.asmr ? bed * 0.5 : a >= 0.5 ? bed * 0.75 : bed;
    for (let f = s.start; f < s.start + s.frames; f++) target[f] = v;
  }
  // smooth with a 12-frame moving average
  const out = new Float32Array(total);
  const R = 6;
  for (let f = 0; f < total; f++) {
    let sum = 0;
    let n = 0;
    for (let k = -R; k <= R; k++) {
      const i = f + k;
      if (i >= 0 && i < total) {
        sum += target[i];
        n++;
      }
    }
    out[f] = sum / n;
  }
  for (let f = 0; f < total; f++) {
    const fadeIn = interpolate(f, [0, 6], [0.4, 1], {extrapolateRight: 'clamp'});
    const fadeOut = interpolate(f, [total - 40, total - 1], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    out[f] *= fadeIn * fadeOut;
  }
  return out;
};
