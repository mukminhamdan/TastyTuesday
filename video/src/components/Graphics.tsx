import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_BOLD, FONT_MARKER, H, SAFE, SAFE_W, W, outline} from '../lib/theme';
import type {TitleLine} from '../lib/types';

const useLocal = (at = 0) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {f: frame - Math.round(at * fps), fps};
};

const exitK = (f: number, end: number) =>
  interpolate(f, [end - 6, end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/* ------------------------------------------------------------------ */
/* Kinetic headline: words pop in one by one, sticker-style highlight */
/* ------------------------------------------------------------------ */
export const KineticTitle: React.FC<{
  lines: TitleLine[];
  pos?: 'top' | 'bottom';
  at?: number;
  durFrames: number;
}> = ({lines, pos = 'top', at = 0, durFrames}) => {
  const {f, fps} = useLocal(at);
  if (f < 0) return null;
  const out = exitK(f, durFrames);
  let wordIndex = 0;
  const top = pos === 'top' ? SAFE.top + 90 : undefined;
  const bottom = pos === 'bottom' ? H - SAFE.bottom + 30 : undefined;
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: SAFE_W,
        top,
        bottom,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        opacity: out,
        transform: `scale(${0.9 + 0.1 * out})`,
      }}
    >
      {lines.map((line, li) => {
        const size = line.size ?? (line.marker ? 70 : 92);
        const words = line.t.split(' ');
        const lineStart = wordIndex;
        wordIndex += words.length;
        const hlIn = spring({frame: f - lineStart * 3, fps, config: {damping: 14, stiffness: 180}});
        return (
          <div
            key={li}
            style={{
              position: 'relative',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              columnGap: size * 0.24,
              padding: line.hl ? '4px 30px 10px' : 0,
              transform: line.hl ? `rotate(${-2.5 + li}deg)` : undefined,
            }}
          >
            {line.hl ? (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: C.mustard,
                  borderRadius: 18,
                  border: `6px solid ${C.ink}`,
                  boxShadow: `0 10px 0 ${C.ink}`,
                  transform: `scaleX(${hlIn})`,
                  transformOrigin: 'left center',
                }}
              />
            ) : null}
            {words.map((w, wi) => {
              const idx = lineStart + wi;
              const sp = spring({frame: f - idx * 3, fps, config: {damping: 11, stiffness: 210, mass: 0.7}});
              const rot = (random(`r${li}${wi}${w}`) - 0.5) * 6;
              return (
                <span
                  key={wi}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    fontFamily: line.marker ? FONT_MARKER : FONT_BOLD,
                    fontWeight: line.marker ? 400 : 900,
                    fontSize: size,
                    lineHeight: 1.08,
                    letterSpacing: line.marker ? 1 : -1,
                    color: line.hl ? C.ink : line.color ?? C.white,
                    textShadow: line.hl ? 'none' : outline(line.marker ? 5 : 7),
                    opacity: Math.min(1, sp * 1.4),
                    transform: `translateY(${(1 - sp) * 50}px) scale(${0.45 + 0.55 * sp}) rotate(${rot * (1 - sp) + (line.marker ? -3 : 0)}deg)`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step card: numbered chip sliding in, lower third (inside safe zone) */
/* ------------------------------------------------------------------ */
export const StepCard: React.FC<{n: number; text: string; at?: number; durFrames: number}> = ({
  n,
  text,
  at = 0,
  durFrames,
}) => {
  const {f, fps} = useLocal(at);
  if (f < 0) return null;
  const sp = spring({frame: f, fps, config: {damping: 13, stiffness: 170}});
  const sp2 = spring({frame: f - 4, fps, config: {damping: 13, stiffness: 170}});
  const out = exitK(f, durFrames);
  return (
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        top: SAFE.bottom - 150,
        display: 'flex',
        alignItems: 'center',
        opacity: out,
        transform: `translateX(${(1 - sp) * -700 + (1 - out) * -120}px)`,
      }}
    >
      <div
        style={{
          width: 118,
          height: 118,
          borderRadius: 59,
          backgroundColor: C.tomato,
          border: `6px solid ${C.ink}`,
          boxShadow: `0 8px 0 ${C.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_BOLD,
          fontWeight: 900,
          fontSize: 58,
          color: C.white,
          zIndex: 2,
          transform: `rotate(${(1 - sp) * -180}deg)`,
        }}
      >
        {String(n).padStart(2, '0')}
      </div>
      <div
        style={{
          marginLeft: -26,
          padding: '18px 34px 18px 50px',
          backgroundColor: C.cream,
          border: `6px solid ${C.ink}`,
          borderRadius: 22,
          boxShadow: `0 8px 0 ${C.ink}`,
          fontFamily: FONT_BOLD,
          fontWeight: 800,
          fontSize: 52,
          color: C.ink,
          maxWidth: SAFE_W - 120,
          whiteSpace: 'nowrap',
          transform: `scaleX(${sp2})`,
          transformOrigin: 'left center',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ---------------------------------------- */
/* Fast-forward badge for time-lapse shots  */
/* ---------------------------------------- */
export const SpeedBadge: React.FC<{label: string}> = ({label}) => {
  const {f, fps} = useLocal(0);
  const sp = spring({frame: f - 3, fps, config: {damping: 12, stiffness: 220}});
  const blink = 0.75 + 0.25 * Math.sin(f / 3);
  return (
    <div
      style={{
        position: 'absolute',
        right: W - SAFE.right,
        top: SAFE.top,
        height: 60,
        padding: '0 22px',
        borderRadius: 30,
        backgroundColor: 'rgba(26,20,16,0.82)',
        border: `3px solid ${C.mustard}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transform: `scale(${sp})`,
        transformOrigin: 'right center',
      }}
    >
      <svg width="40" height="26" viewBox="0 0 40 26" style={{opacity: blink}}>
        <path d="M2 2 L18 13 L2 24 Z M20 2 L36 13 L20 24 Z" fill={C.mustard} />
      </svg>
      <span style={{fontFamily: FONT_BOLD, fontWeight: 900, fontSize: 36, color: C.mustard}}>{label}</span>
    </div>
  );
};

/* ------------------------------- */
/* Hand-written label (+ arrow)    */
/* ------------------------------- */
export const MarkerLabel: React.FC<{
  text: string;
  x: number;
  y: number;
  rotate?: number;
  size?: number;
  at?: number;
  durFrames: number;
  arrowTo?: {x: number; y: number};
}> = ({text, x, y, rotate = -4, size = 74, at = 0, durFrames, arrowTo}) => {
  const {f, fps} = useLocal(at);
  if (f < 0) return null;
  const sp = spring({frame: f, fps, config: {damping: 10, stiffness: 200}});
  const out = exitK(f, durFrames);
  const draw = interpolate(f, [4, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let arrow: React.ReactNode = null;
  if (arrowTo) {
    const sx = x;
    const sy = y + (arrowTo.y > y ? size * 0.7 : -size * 0.7);
    const mx = (sx + arrowTo.x) / 2 + (arrowTo.y > y ? 80 : -80);
    const my = (sy + arrowTo.y) / 2;
    const d = `M ${sx} ${sy} Q ${mx} ${my} ${arrowTo.x} ${arrowTo.y}`;
    const ang = Math.atan2(arrowTo.y - my, arrowTo.x - mx);
    const h1 = `${arrowTo.x - 56 * Math.cos(ang - 0.55)},${arrowTo.y - 56 * Math.sin(ang - 0.55)}`;
    const h2 = `${arrowTo.x - 56 * Math.cos(ang + 0.55)},${arrowTo.y - 56 * Math.sin(ang + 0.55)}`;
    arrow = (
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: out}}>
        <g stroke={C.ink} strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.6}>
          <path d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
          {draw > 0.95 ? <polyline points={`${h1} ${arrowTo.x},${arrowTo.y} ${h2}`} /> : null}
        </g>
        <g stroke={C.mustard} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
          {draw > 0.95 ? <polyline points={`${h1} ${arrowTo.x},${arrowTo.y} ${h2}`} /> : null}
        </g>
      </svg>
    );
  }
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {arrow}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%,-50%) rotate(${rotate}deg) scale(${sp * (0.85 + 0.15 * out)})`,
          opacity: out,
          fontFamily: FONT_MARKER,
          fontSize: size,
          color: C.mustard,
          whiteSpace: 'nowrap',
          textShadow: outline(6),
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------- */
/* Sparkle burst             */
/* ------------------------- */
const Star: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20">
    <path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z" fill={color} stroke={C.ink} strokeWidth={0.9} />
  </svg>
);

export const Sparkles: React.FC<{x: number; y: number; at: number; count?: number; spread?: number}> = ({
  x,
  y,
  at,
  count = 9,
  spread = 260,
}) => {
  const {f} = useLocal(at);
  if (f < 0 || f > 26) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {new Array(count).fill(0).map((_, i) => {
        const a = (i / count) * Math.PI * 2 + random(`a${i}${x}`) * 0.6;
        const d = spread * (0.55 + random(`d${i}${y}`) * 0.6);
        const k = Easing.out(Easing.cubic)(Math.min(1, f / 18));
        const sc = interpolate(f, [0, 6, 26], [0, 1, 0], {extrapolateRight: 'clamp'});
        const sz = 34 + random(`s${i}`) * 46;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.cos(a) * d * k - sz / 2,
              top: y + Math.sin(a) * d * k - sz / 2,
              transform: `scale(${sc}) rotate(${f * 8}deg)`,
            }}
          >
            <Star size={sz} color={i % 3 === 0 ? C.white : C.mustard} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ------------------------------- */
/* Hand-drawn highlight circle     */
/* ------------------------------- */
export const MarkerCircle: React.FC<{x: number; y: number; rx: number; ry: number; at?: number; durFrames: number}> = ({
  x,
  y,
  rx,
  ry,
  at = 0,
  durFrames,
}) => {
  const {f} = useLocal(at);
  if (f < 0) return null;
  const draw = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const out = exitK(f, durFrames);
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = -0.6 + (i / 60) * Math.PI * 2.15;
    const wob = 1 + 0.045 * Math.sin(t * 3 + 1);
    pts.push(`${(x + Math.cos(t) * rx * wob).toFixed(1)},${(y + Math.sin(t) * ry * wob).toFixed(1)}`);
  }
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: out}}>
      <polyline points={pts.join(' ')} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} fill="none" stroke={C.ink} strokeOpacity={0.5} strokeWidth={18} strokeLinecap="round" />
      <polyline points={pts.join(' ')} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} fill="none" stroke={C.mustard} strokeWidth={10} strokeLinecap="round" />
    </svg>
  );
};

/* ------------------------------------------- */
/* Cooking timer (real elapsed time of footage) */
/* ------------------------------------------- */
export const CookTimer: React.FC<{fromSec: number; toSec: number; durFrames: number; caption?: string}> = ({
  fromSec,
  toSec,
  durFrames,
  caption,
}) => {
  const {f, fps} = useLocal(0);
  const sp = spring({frame: f, fps, config: {damping: 12, stiffness: 190}});
  const t = interpolate(f, [0, durFrames - 1], [fromSec, toSec], {extrapolateRight: 'clamp'});
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60);
  const R = 74;
  const circ = 2 * Math.PI * R;
  const prog = (t % 60) / 60;
  return (
    <div
      style={{
        position: 'absolute',
        left: W / 2 - 150,
        top: SAFE.top + 90,
        width: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${sp})`,
      }}
    >
      <div style={{position: 'relative', width: 190, height: 190}}>
        <svg width={190} height={190} style={{position: 'absolute', inset: 0}}>
          <circle cx={95} cy={95} r={R + 10} fill={C.cream} stroke={C.ink} strokeWidth={6} />
          <circle cx={95} cy={95} r={R} fill="none" stroke="#E9DCC3" strokeWidth={14} />
          <circle
            cx={95}
            cy={95}
            r={R}
            fill="none"
            stroke={C.tomato}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - prog)}
            transform="rotate(-90 95 95)"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_BOLD,
            fontWeight: 900,
            fontSize: 50,
            color: C.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {mm}:{String(ss).padStart(2, '0')}
        </div>
      </div>
      {caption ? (
        <div style={{marginTop: 10, fontFamily: FONT_MARKER, fontSize: 46, color: C.white, textShadow: outline(5)}}>{caption}</div>
      ) : null}
    </div>
  );
};
