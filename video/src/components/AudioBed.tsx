import React, {useMemo} from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {Sfx} from '../theme';

/**
 * Music ducking envelope. Under speech the bed sits ~17 dB below the voice,
 * it opens up in gaps (titles, transitions) and at the very start / end.
 */
export const useDuck = (speech: [number, number][], total: number, under = 0.15, open = 0.42) =>
  useMemo(() => {
    const target = new Float32Array(total).fill(open);
    for (const [s, e] of speech) {
      for (let f = Math.max(0, s - 4); f < Math.min(total, e + 6); f++) target[f] = under;
    }
    // attack fast (6 frames), release slow (18 frames)
    const env = new Float32Array(total);
    let v = target[0];
    for (let f = 0; f < total; f++) {
      const t = target[f];
      const k = t < v ? 1 / 6 : 1 / 18;
      v += (t - v) * k;
      env[f] = v;
    }
    // global fade in/out
    for (let f = 0; f < Math.min(15, total); f++) env[f] *= f / 15;
    for (let f = Math.max(0, total - 45); f < total; f++) env[f] *= Math.max(0, (total - f) / 45);
    return env;
  }, [speech, total, under, open]);

export const Music: React.FC<{src: string; speech: [number, number][]; total: number; under?: number; open?: number}> = ({
  src,
  speech,
  total,
  under,
  open,
}) => {
  const env = useDuck(speech, total, under, open);
  return <Audio src={staticFile(src)} volume={(f) => env[Math.min(total - 1, Math.max(0, f))]} />;
};

export const SfxTrack: React.FC<{sfx: Sfx[]; gain?: number}> = ({sfx, gain = 1}) => (
  <>
    {sfx.map((s, i) => (
      <Sequence key={i} from={s.frm} durationInFrames={150} layout="none">
        <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol * gain} />
      </Sequence>
    ))}
  </>
);
