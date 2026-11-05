import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Captions} from './components/Captions';
import {OverlayView} from './components/Graphics';
import {C, SAFE} from './theme';
import type {Clip, Timeline} from './types';

export type MainProps = {proxy: boolean; safeGuides?: boolean; timeline: Timeline};

const ClipView: React.FC<{c: Clip; proxy: boolean}> = ({c, proxy}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const base = c.zoom ?? 1;
  // Punch-in: snap to +8% then settle, gives energy to jump cuts.
  const punch = c.punch ? interpolate(frame, [0, 6], [1.08, 1.0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) : 1;
  // Slow push-in over the clip keeps static shots alive.
  const durF = Math.round(((c.to - c.from) / (c.speed ?? 1)) * fps);
  const drift = interpolate(frame, [0, durF], [1, 1.035]);
  const [fx, fy] = c.focus ?? [0.5, 0.4];
  const src = proxy ? staticFile(`proxy/${c.clip}.mp4`) : staticFile(`raw/${c.clip}.mp4`);
  return (
    <AbsoluteFill style={{transform: `scale(${base * punch * drift})`, transformOrigin: `${fx * 100}% ${fy * 100}%`}}>
      <OffthreadVideo
        src={src}
        startFrom={Math.round(c.from * fps)}
        endAt={Math.round(c.to * fps)}
        playbackRate={c.speed ?? 1}
        muted={c.muted}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </AbsoluteFill>
  );
};

/** Music sits under the voice: full bed between lines, ducked while talking. */
const useDuckedVolume = (speech: [number, number][], vol: number, duck: number) => {
  const {fps} = useVideoConfig();
  const attack = 0.12;
  const release = 0.35;
  return (f: number) => {
    const t = f / fps;
    let g = 0; // 0 = full bed, 1 = fully ducked
    for (const [s, e] of speech) {
      if (t >= s - attack && t <= e + release) {
        const a = interpolate(t, [s - attack, s], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const r = interpolate(t, [e, e + release], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        g = Math.max(g, Math.min(a, r));
      }
    }
    return vol + (duck - vol) * g;
  };
};

const SafeGuides: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: SAFE.top, background: 'rgba(255,0,80,0.25)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: SAFE.bottom, bottom: 0, background: 'rgba(255,0,80,0.25)'}} />
    <div style={{position: 'absolute', left: SAFE.right, width: 1080 - SAFE.right, top: SAFE.top, height: SAFE.bottom - SAFE.top, background: 'rgba(255,0,80,0.25)'}} />
    <div style={{position: 'absolute', left: 0, width: SAFE.left, top: SAFE.top, height: SAFE.bottom - SAFE.top, background: 'rgba(255,0,80,0.18)'}} />
    <div style={{position: 'absolute', left: SAFE.left, top: SAFE.top, width: SAFE.right - SAFE.left, height: SAFE.bottom - SAFE.top, border: '4px dashed #00FFAA'}} />
  </AbsoluteFill>
);

export const Main: React.FC<MainProps> = ({proxy, safeGuides, timeline}) => {
  const {fps} = useVideoConfig();
  const f = (s: number) => Math.round(s * fps);
  const musicVol = useDuckedVolume(timeline.speech, timeline.music.vol, timeline.music.duck);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      {timeline.clips.map((c, i) => (
        <Sequence key={`c${i}`} from={f(c.at)} durationInFrames={Math.max(1, f((c.to - c.from) / (c.speed ?? 1)))} premountFor={15}>
          <ClipView c={c} proxy={proxy} />
        </Sequence>
      ))}

      {/* subtle vignette so white text reads on bright kitchen footage */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)'}} />

      {timeline.overlays.map((o, i) => (
        <Sequence key={`o${i}`} from={f(o.at)} durationInFrames={Math.max(1, f(o.dur))}>
          <OverlayView o={o} />
        </Sequence>
      ))}

      <Captions pages={timeline.captions} />

      <Audio src={staticFile(timeline.music.src)} volume={musicVol} loop />
      {timeline.sfx.map((s, i) => (
        <Sequence key={`s${i}`} from={f(s.at)} durationInFrames={f(3)}>
          <Audio src={staticFile(`sfx/${s.name}.wav`)} volume={s.vol ?? 0.5} />
        </Sequence>
      ))}

      {safeGuides ? <SafeGuides /> : null}
    </AbsoluteFill>
  );
};
