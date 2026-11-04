import React from 'react';
import {AbsoluteFill, Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, Easing} from 'remotion';
import type {Segment} from '../lib/types';
import {FPS, H, W} from '../lib/theme';

const PLATE_H = 2160; // 720x1440 source scaled x1.5

const SegmentView: React.FC<{seg: Segment; next?: Segment}> = ({seg, next}) => {
  const f = useCurrentFrame();
  const p = f / Math.max(1, seg.dur);

  // slow push-in keeps static shots alive
  let scale = seg.zoom * (1 + 0.035 * p);
  let tx = 0;
  let ty = 0;
  let blur = 0;
  let rot = 0;

  const IN = 7;
  if (seg.trans === 'whip' && f < IN) {
    const k = Easing.out(Easing.cubic)(f / IN);
    tx = interpolate(k, [0, 1], [260, 0]);
    blur = interpolate(k, [0, 1], [26, 0]);
  }
  if (seg.trans === 'zoomblur' && f < IN + 2) {
    const k = Easing.out(Easing.cubic)(f / (IN + 2));
    scale *= interpolate(k, [0, 1], [1.35, 1]);
    blur = interpolate(k, [0, 1], [18, 0]);
    rot = interpolate(k, [0, 1], [-2.5, 0]);
  }
  if (seg.trans === 'punch' && f < 4) {
    scale *= interpolate(f, [0, 4], [1.06, 1], {extrapolateRight: 'clamp'});
  }
  // outgoing half of a whip
  const OUT = 5;
  if (next && next.trans === 'whip' && f > seg.dur - OUT) {
    const k = Easing.in(Easing.cubic)((f - (seg.dur - OUT)) / OUT);
    tx = interpolate(k, [0, 1], [0, -260]);
    blur = interpolate(k, [0, 1], [0, 26]);
  }
  if (next && next.trans === 'zoomblur' && f > seg.dur - OUT) {
    const k = Easing.in(Easing.cubic)((f - (seg.dur - OUT)) / OUT);
    scale *= interpolate(k, [0, 1], [1, 1.25]);
    blur = interpolate(k, [0, 1], [0, 14]);
  }

  const [ox, oy] = seg.origin;
  const startFrom = Math.round(seg.srcStart * FPS);
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <div
        style={{
          position: 'absolute',
          width: W,
          height: H,
          transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale})`,
          transformOrigin: `${ox * 100}% ${oy * 100}%`,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        <OffthreadVideo
          src={staticFile('source.mp4')}
          startFrom={startFrom}
          playbackRate={seg.speed}
          muted
          style={{
            position: 'absolute',
            left: 0,
            top: -seg.cropY,
            width: W,
            height: PLATE_H,
            objectFit: 'cover',
            filter: 'contrast(1.07) saturate(1.16) brightness(1.03)',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const VoiceView: React.FC<{seg: Segment}> = ({seg}) => {
  const startFrom = Math.round(seg.srcStart * FPS);
  return (
    <Audio
      src={staticFile('voice_clean.wav')}
      startFrom={startFrom}
      endAt={startFrom + seg.dur}
      volume={(f) =>
        interpolate(f, [0, 2, seg.dur - 2, seg.dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
      }
    />
  );
};

export const Footage: React.FC<{segments: Segment[]}> = ({segments}) => {
  return (
    <AbsoluteFill>
      {segments.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur} name={`seg ${i} @${s.srcStart.toFixed(1)}s x${s.speed}`}>
          <SegmentView seg={s} next={segments[i + 1]} />
          {s.voice ? <VoiceView seg={s} /> : null}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Warm teal-orange grade, vignette and moving film grain. */
export const Grade: React.FC = () => {
  const f = useCurrentFrame();
  const gx = (f * 73) % 256;
  const gy = (f * 151) % 256;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(40,90,110,0.16) 0%, rgba(0,0,0,0) 40%, rgba(255,150,60,0.14) 100%)',
          mixBlendMode: 'soft-light',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse 85% 70% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundPosition: `${gx}px ${gy}px`,
          opacity: 0.07,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};
