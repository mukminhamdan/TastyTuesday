import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Footage, Grade} from './components/Footage';
import {Captions} from './components/Captions';
import {OVERLAYS, Progress} from './components/Overlays';
import type {ClipData} from './lib/types';
import {FPS, loadFonts} from './lib/theme';

loadFonts();

/** Music bed that ducks under the voice (sidechain-style, smoothed). */
const MusicBed: React.FC<{data: ClipData}> = ({data}) => {
  const {durationInFrames, words, segments} = data;
  const music = data.music!;
  const gain = useMemo(() => {
    const speak = new Float32Array(durationInFrames);
    for (const w of words) {
      const a = Math.max(0, Math.floor((w.t - 0.15) * FPS));
      const b = Math.min(durationInFrames, Math.ceil((w.e + 0.3) * FPS));
      for (let i = a; i < b; i++) speak[i] = 1;
    }
    // voiced segments also duck a little even between words (room tone)
    const voiced = new Float32Array(durationInFrames);
    for (const s of segments) if (s.voice) for (let i = s.from; i < s.from + s.dur && i < durationInFrames; i++) voiced[i] = 1;
    const g = new Float32Array(durationInFrames);
    let cur = music.vol;
    for (let i = 0; i < durationInFrames; i++) {
      const target = speak[i] ? music.duck : voiced[i] ? (music.vol + music.duck) / 2 : music.vol;
      const coef = target < cur ? 0.45 : 0.08; // fast attack, slow release
      cur += (target - cur) * coef;
      g[i] = cur;
    }
    return g;
  }, [durationInFrames, words, segments, music]);
  return (
    <Audio
      src={staticFile(music.src)}
      startFrom={Math.round((music.offset ?? 0) * FPS)}
      volume={(f) => {
        const fadeIn = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
        const fadeOut = interpolate(f, [durationInFrames - 36, durationInFrames - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (gain[Math.min(f, durationInFrames - 1)] ?? music.vol) * fadeIn * fadeOut;
      }}
    />
  );
};

/** Subtle camera shake for impacts */
const useShake = (data: ClipData) => {
  const f = useCurrentFrame();
  let x = 0;
  let y = 0;
  for (const o of data.overlays) {
    if (o.kind !== 'word' && o.kind !== 'shake') continue;
    const d = f - o.from;
    if (d >= 0 && d < 10) {
      const amp = 14 * (1 - d / 10);
      x += Math.sin(d * 2.7) * amp;
      y += Math.cos(d * 3.3) * amp * 0.6;
    }
  }
  return {x, y};
};

export const Clip: React.FC<{data: ClipData}> = ({data}) => {
  const shake = useShake(data);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `translate(${shake.x}px, ${shake.y}px) scale(${shake.x || shake.y ? 1.02 : 1})`}}>
        <Footage segments={data.segments} />
      </AbsoluteFill>
      <Grade />
      {data.progress === false ? null : <Progress total={data.durationInFrames} />}
      {data.overlays.map((o, i) => {
        const Comp = OVERLAYS[o.kind];
        if (!Comp) return null;
        return (
          <Sequence key={i} from={o.from} durationInFrames={o.dur} name={`${o.kind} ${i}`}>
            <Comp dur={o.dur} {...(o.props ?? {})} />
          </Sequence>
        );
      })}
      <Captions words={data.words} y={data.captionY} />
      {data.music ? <MusicBed data={data} /> : null}
      {data.sfx.map((s, i) => (
        <Sequence key={`sfx${i}`} from={Math.max(0, s.from)} name={`sfx ${s.name}`}>
          <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
