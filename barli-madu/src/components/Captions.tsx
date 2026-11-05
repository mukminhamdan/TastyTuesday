import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_BODY, SAFE, SAFE_CX, SAFE_W, textStroke} from '../theme';
import type {CaptionPage} from '../types';

/**
 * Word-by-word "karaoke" captions. One page = 2-4 words. The active word turns
 * honey yellow and pops. Pages sit at the bottom of the safe zone unless the
 * face is there, in which case build_edit.py flags them as 'high'.
 */
export const Captions: React.FC<{pages: CaptionPage[]}> = ({pages}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const page = pages.find((p) => t >= p.start && t < p.end);
  if (!page) return null;

  const enter = spring({frame: frame - Math.round(page.start * fps), fps, config: {damping: 14, stiffness: 220, mass: 0.6}});
  const top = page.pos === 'low' ? SAFE.bottom - 250 : page.pos === 'mid' ? 820 : SAFE.top + 20;

  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE_CX - SAFE_W / 2,
        width: SAFE_W,
        top,
        height: 230,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        gap: '4px 36px',
        transform: `translateY(${interpolate(enter, [0, 1], [14, 0])}px)`,
        opacity: enter,
      }}
    >
      {page.words.map((w, i) => {
        const active = t >= w.s && t < Math.max(w.e, w.s + 0.12);
        const spoken = t >= w.s;
        const pop = spring({frame: frame - Math.round(w.s * fps), fps, config: {damping: 10, stiffness: 300, mass: 0.5}});
        const scale = active ? interpolate(pop, [0, 1], [1, 1.05]) : 1;
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 800,
              fontSize: w.hi ? 88 : 80,
              lineHeight: 1.05,
              letterSpacing: -1,
              textTransform: 'uppercase',
              color: active || w.hi ? C.honey : spoken ? C.white : 'rgba(255,255,255,0.88)',
              ...textStroke(14),
              textShadow: '0 6px 18px rgba(0,0,0,0.45)',
              transform: `scale(${scale})`,
              display: 'inline-block',
              transformOrigin: '50% 60%',
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};
