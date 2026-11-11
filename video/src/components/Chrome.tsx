import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_BOLD, H, SAFE, SAFE_W, W} from '../lib/theme';

/** Soft top/bottom shading so white text always reads, without boxing the food. */
export const Shade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.38) 100%)',
    }}
  />
);

/** Series badge + episode progress bar, both inside the TikTok/IG safe zone. */
export const SeriesChrome: React.FC<{ep: number; of: number; total: number; hideAfter?: number}> = ({
  ep,
  of,
  total,
  hideAfter,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const sp = spring({frame: f - 4, fps, config: {damping: 14, stiffness: 160}});
  const hidden = hideAfter !== undefined && f >= hideAfter;
  const prog = Math.min(1, f / Math.max(1, total - 1));
  return (
    <AbsoluteFill style={{opacity: hidden ? 0 : 1}}>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          top: SAFE.top - 18,
          width: SAFE_W,
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255,255,255,0.28)',
          overflow: 'hidden',
        }}
      >
        <div style={{width: `${prog * 100}%`, height: '100%', backgroundColor: C.mustard}} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          top: SAFE.top,
          display: 'flex',
          height: 60,
          borderRadius: 16,
          overflow: 'hidden',
          border: `4px solid ${C.ink}`,
          transform: `translateX(${(1 - sp) * -500}px)`,
          fontFamily: FONT_BOLD,
          fontWeight: 900,
          fontSize: 30,
          letterSpacing: 1,
        }}
      >
        <div style={{backgroundColor: C.tomato, color: C.white, padding: '0 16px', display: 'flex', alignItems: 'center'}}>
          MASAK MALAS
        </div>
        <div style={{backgroundColor: C.cream, color: C.ink, padding: '0 16px', display: 'flex', alignItems: 'center'}}>
          EP {ep}/{of}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Dev overlay to check TikTok / IG safe zones. Off in renders by default. */
export const SafeZoneGuide: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: SAFE.top, background: 'rgba(255,0,80,0.35)'}} />
    <div style={{position: 'absolute', left: 0, top: SAFE.bottom, width: W, height: H - SAFE.bottom, background: 'rgba(255,0,80,0.35)'}} />
    <div style={{position: 'absolute', left: SAFE.right, top: SAFE.top, width: W - SAFE.right, height: SAFE.bottom - SAFE.top, background: 'rgba(255,0,80,0.35)'}} />
    <div style={{position: 'absolute', left: 0, top: SAFE.top, width: SAFE.left, height: SAFE.bottom - SAFE.top, background: 'rgba(255,0,80,0.2)'}} />
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        top: SAFE.top,
        width: SAFE.right - SAFE.left,
        height: SAFE.bottom - SAFE.top,
        border: '4px dashed #00FFAA',
      }}
    />
  </AbsoluteFill>
);
