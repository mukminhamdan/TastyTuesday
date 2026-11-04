import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, Caption, F, Piece} from '../theme';
import {faceBox, pieceAt} from './Footage';

const capAt = (caps: Caption[], f: number) => {
  let lo = 0;
  let hi = caps.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (caps[m].frm <= f) {
      ans = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  if (ans < 0) return null;
  const c = caps[ans];
  return f < c.end ? c : null;
};

/** Where captions & overlays live for the current shot (short layout). */
export const zones = (p: Piece | undefined) => {
  const fb = faceBox(p);
  // TikTok / Reels safe area: x 70..940, y 230..1490
  let cap = 1320;
  let ov: 'top' | 'low' = 'top';
  if (fb) {
    if (fb.y1 > 1230 && fb.y0 > 700) cap = 470; // face low in frame -> captions on top
    else cap = Math.min(1420, Math.max(1320, fb.y1 + 70));
    if (fb.y0 < 470 && cap > 900) ov = 'low';
  }
  return {cap, ov};
};

export const Captions: React.FC<{caps: Caption[]; pieces: Piece[]; accent: string; hidden?: (f: number) => boolean}> = ({
  caps,
  pieces,
  accent,
  hidden,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = capAt(caps, f);
  if (!c || (hidden && hidden(f))) return null;
  const local = f - c.frm;
  const z = zones(pieceAt(pieces, c.frm));
  const enter = spring({frame: local, fps, config: {damping: 14, stiffness: 220, mass: 0.6}});
  const len = c.words.reduce((a, w) => a + w.t.length + 1, 0);
  const size = len > 15 ? 70 : len > 11 ? 78 : 86;
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 140,
        top: z.cap,
        transform: `translateY(-50%) scale(${interpolate(enter, [0, 1], [0.86, 1])})`,
        opacity: interpolate(local, [0, 2], [0, 1], {extrapolateRight: 'clamp'}),
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 18px',
        fontFamily: F.sans,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: -1,
        textTransform: 'uppercase',
        textAlign: 'center',
      }}
    >
      {c.words.map((w, i) => {
        const on = local >= w.f;
        const active = on && (i === c.words.length - 1 || local < c.words[i + 1].f);
        const pop = spring({frame: local - w.f, fps, config: {damping: 12, stiffness: 300, mass: 0.5}});
        return (
          <span
            key={i}
            style={{
              position: 'relative',
              display: 'inline-block',
              color: active || w.hl ? C.gold : C.white,
              opacity: on ? 1 : 0.8,
              transform: `translateY(${on ? interpolate(pop, [0, 1], [6, 0]) : 6}px)`,
              WebkitTextStroke: '10px rgba(10,6,2,0.92)',
              paintOrder: 'stroke fill',
              textShadow: '0 8px 22px rgba(0,0,0,0.45)',
              padding: '0 6px',
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/** Caption block used in the YouTube side panel. */
export const PanelCaptions: React.FC<{caps: Caption[]; accent: string; color?: string; hl?: string}> = ({caps, color = C.cream, hl = C.gold}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = capAt(caps, f);
  if (!c) return null;
  const local = f - c.frm;
  const enter = spring({frame: local, fps, config: {damping: 16, stiffness: 200}});
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0 16px',
        fontFamily: F.sans,
        fontWeight: 800,
        fontSize: 64,
        lineHeight: 1.1,
        letterSpacing: -1,
        textTransform: 'uppercase',
        transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
        opacity: interpolate(local, [0, 3], [0, 1], {extrapolateRight: 'clamp'}),
      }}
    >
      {c.words.map((w, i) => {
        const on = local >= w.f;
        const active = on && (i === c.words.length - 1 || local < c.words[i + 1].f);
        return (
          <span
            key={i}
            style={{
              color: active || w.hl ? hl : color,
              borderRadius: 12,
              padding: '0 10px',
              opacity: on ? 1 : 0.3,
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};
