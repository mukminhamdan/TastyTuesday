import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {focusAt} from '../lib/timeline';
import {FPS, LOOKS, W, H, type Look} from '../lib/theme';
import type {Focus, Shot} from '../lib/types';

/** Plain zoomed / panned video, reused by shots, peeks and finale tiles. */
/** Colour-grade layers over the footage (blend modes, so it costs no extra video decode). */
const CinematicGrade: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {/* lift the blacks towards teal (classic film shadows) */}
    <AbsoluteFill style={{backgroundColor: 'rgb(8, 34, 40)', mixBlendMode: 'lighten', opacity: 0.75}} />
    {/* neutralise the kitchen's orange cast a little (cook: 'too orange') */}
    <AbsoluteFill style={{backgroundColor: 'rgb(100, 145, 210)', mixBlendMode: 'soft-light', opacity: 0.26}} />
    {/* gentle vignette to pull the eye to the food */}
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 55%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)'}} />
  </AbsoluteFill>
);

/** 'premium' look: clean, bright food grade - gentle warm highlights, soft shadows, light vignette */
const PremiumGrade: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {/* soft lift so the blacks are rich but never crushed */}
    <AbsoluteFill style={{backgroundColor: 'rgb(16, 22, 28)', mixBlendMode: 'lighten', opacity: 0.6}} />
    {/* a touch of golden warmth for the food, kept light */}
    <AbsoluteFill style={{backgroundColor: 'rgb(255, 214, 170)', mixBlendMode: 'soft-light', opacity: 0.18}} />
    {/* soft top light, like a window over the bench */}
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 55% at 50% 40%, rgba(255,250,240,0.16) 0%, rgba(255,250,240,0) 70%)', mixBlendMode: 'screen'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 65% at 50% 52%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.42) 100%)'}} />
  </AbsoluteFill>
);

const isImage = (src: string) => /\.(jpe?g|png|webp)$/i.test(src);

export const FramedVideo: React.FC<{
  src: string;
  from: number;
  rate?: number;
  focus: Focus;
  volume?: number;
  extraScale?: number;
  style?: React.CSSProperties;
  look?: Look;
  /** source-fraction rectangle to blur (e.g. other people's picture-in-picture in a screen recording) */
  blurBox?: {x: number; y: number; w: number; h: number};
  /** per-shot lighting fix: brightness multiplier (1 = as graded) */
  light?: number;
}> = ({src, from, rate = 1, focus, volume = 0, extraScale = 0, style, look = 'default', blurBox, light = 1}) => {
  const s = focus.s * (1 + extraScale);
  const videoStyle: React.CSSProperties = {
    width: W,
    height: H,
    objectFit: 'cover',
    transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
    transform: `scale(${s})`,
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden', ...style}}>
      {isImage(src) ? (
        <Img src={staticFile(`footage/${src}`)} style={{...videoStyle, filter: `${LOOKS[look]} brightness(${light})`}} />
      ) : (
        <OffthreadVideo
          src={staticFile(`footage/${src}`)}
          trimBefore={Math.round(from * FPS)}
          playbackRate={rate}
          muted={volume <= 0}
          volume={volume}
          style={{...videoStyle, filter: `${LOOKS[look]}${light !== 1 ? ` brightness(${light})` : ''}`}}
        />
      )}
      {look === 'cinematic' ? <CinematicGrade /> : null}
      {look === 'premium' ? <PremiumGrade /> : null}
      {blurBox ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(`footage/${src}`)}
            trimBefore={Math.round(from * FPS)}
            playbackRate={rate}
            muted
            style={{
              ...videoStyle,
              // clip in the element's own (pre-transform) space, so the box follows the zoom
              clipPath: `inset(${blurBox.y * 100}% ${(1 - blurBox.x - blurBox.w) * 100}% ${(1 - blurBox.y - blurBox.h) * 100}% ${blurBox.x * 100}% round 18px)`,
              filter: `${LOOKS[look]} blur(28px) brightness(1.05)`,
            }}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

export const ShotView: React.FC<{shot: Shot & {frames: number}; clipGain?: number; look?: Look; blurBox?: {x: number; y: number; w: number; h: number}}> = ({shot, clipGain = 1, look, blurBox}) => {
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
          volume={(shot.audio ?? 0) * clipGain}
          look={look}
          blurBox={blurBox}
          light={shot.light}
        />
      </AbsoluteFill>
      {flash > 0 ? <AbsoluteFill style={{backgroundColor: `rgba(255,246,229,${flash})`}} /> : null}
    </AbsoluteFill>
  );
};
