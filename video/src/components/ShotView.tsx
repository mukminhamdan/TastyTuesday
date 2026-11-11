import React from 'react';
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {focusAt} from '../lib/timeline';
import {FPS, W, H} from '../lib/theme';
import type {Focus, Shot} from '../lib/types';

/** Plain zoomed / panned video, reused by shots, peeks and finale tiles. */
export const FramedVideo: React.FC<{
  src: string;
  from: number;
  rate?: number;
  focus: Focus;
  volume?: number;
  extraScale?: number;
  style?: React.CSSProperties;
}> = ({src, from, rate = 1, focus, volume = 0, extraScale = 0, style}) => {
  const s = focus.s * (1 + extraScale);
  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      <OffthreadVideo
        src={staticFile(`footage/${src}`)}
        trimBefore={Math.round(from * FPS)}
        playbackRate={rate}
        muted={volume <= 0}
        volume={volume}
        style={{
          width: W,
          height: H,
          objectFit: 'cover',
          transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
          transform: `scale(${s})`,
          filter: 'saturate(1.14) contrast(1.06) brightness(1.02)',
        }}
      />
    </AbsoluteFill>
  );
};

export const ShotView: React.FC<{shot: Shot & {frames: number}}> = ({shot}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = frame / Math.max(1, shot.frames - 1);
  const focus = focusAt(shot.zoom, p);

  // beat punches
  let punch = 0;
  for (const t of shot.punches ?? []) {
    const f0 = Math.round(t * fps);
    if (frame >= f0) {
      const sp = spring({frame: frame - f0, fps, config: {damping: 9, stiffness: 260, mass: 0.5}});
      punch += 0.07 * Math.sin(Math.min(1, sp) * Math.PI);
    }
  }

  const enter = shot.enter ?? 'zoom';
  let extra = punch;
  let tx = 0;
  let blur = 0;
  let filter = '';
  if (enter === 'zoom') {
    const k = interpolate(frame, [0, 7], [1, 0], {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    extra += 0.16 * k;
    blur = 14 * k;
  } else if (enter === 'whip') {
    const k = interpolate(frame, [0, 6], [1, 0], {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    });
    tx = 380 * k;
    blur = 22 * k;
  } else if (enter === 'glitch') {
    if (frame < 8) {
      tx = (random(`g${frame}`) - 0.5) * 90;
      filter = `hue-rotate(${Math.round(random(`h${frame}`) * 160)}deg) contrast(1.5)`;
      blur = frame % 2 ? 3 : 0;
    }
  }

  const flash =
    enter === 'cut' ? 0 : interpolate(frame, [0, 4], [enter === 'glitch' ? 0.55 : 0.28, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill
        style={{
          transform: `translateX(${tx}px)`,
          filter: `${blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : ''} ${filter}`.trim() || undefined,
        }}
      >
        <FramedVideo
          src={shot.src}
          from={shot.from}
          rate={shot.rate}
          focus={focus}
          extraScale={extra}
          volume={shot.audio ?? 0}
        />
      </AbsoluteFill>
      {flash > 0 ? <AbsoluteFill style={{backgroundColor: `rgba(255,246,229,${flash})`}} /> : null}
    </AbsoluteFill>
  );
};
