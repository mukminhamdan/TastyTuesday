import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F, SAFE, W} from '../lib/theme';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const eo = Easing.out(Easing.cubic);
const eio = Easing.inOut(Easing.cubic);

/** opacity/translate envelope shared by most overlays */
const useEnvelope = (dur: number, inF = 10, outF = 8) => {
  const f = useCurrentFrame();
  const kIn = eo(interpolate(f, [0, inF], [0, 1], clamp));
  const kOut = eio(interpolate(f, [dur - outF, dur], [1, 0], clamp));
  return {f, k: Math.min(kIn, kOut), kIn, kOut};
};

/** Line of text revealed through a mask, line by line. */
const MaskLine: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties; dur: number}> = ({delay, children, style, dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 200, stiffness: 140}});
  const out = eio(interpolate(f, [dur - 9, dur - 1], [0, 1], clamp));
  return (
    <div style={{overflow: 'hidden', paddingBottom: 6}}>
      <div style={{transform: `translateY(${(1 - s) * 105 + out * -105}%)`, ...style}}>{children}</div>
    </div>
  );
};

export const HookTitle: React.FC<{dur: number; kicker?: string; line1: string; line2?: string; y?: number; align?: 'left' | 'center' | 'right'; maxW?: number}> = ({
  dur,
  kicker,
  line1,
  line2,
  y = SAFE.top + 10,
  align = 'left',
  maxW,
}) => {
  const width = maxW ?? SAFE.right - SAFE.left;
  // shrink display type when squeezed beside the face
  const k = Math.min(1, Math.max(0.62, width / 700));
  const f = useCurrentFrame();
  const barW = interpolate(f, [2, 16], [0, 1], {...clamp, easing: eo}) * interpolate(f, [dur - 8, dur], [1, 0], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: align === 'right' ? SAFE.right - width + 70 : SAFE.left,
          width,
          top: y,
          textAlign: align,
          display: 'flex',
          flexDirection: 'column',
          alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.45))',
        }}
      >
        {kicker ? (
          <MaskLine delay={0} dur={dur}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.mono, fontSize: 30 * Math.max(k, 0.8), letterSpacing: '0.16em', color: C.paper, textTransform: 'uppercase', flexWrap: 'wrap'}}>
              <span style={{width: 14, height: 14, borderRadius: 7, background: C.chili, boxShadow: `0 0 18px ${C.chili}`}} />
              {kicker}
            </div>
          </MaskLine>
        ) : null}
        <MaskLine delay={4} dur={dur}>
          <div style={{fontFamily: F.display, fontWeight: 900, fontStretch: '118%', fontSize: 112 * k, lineHeight: 0.92, letterSpacing: '-0.035em', color: C.paper, textTransform: 'uppercase'}}>
            {line1}
          </div>
        </MaskLine>
        {line2 ? (
          <MaskLine delay={9} dur={dur}>
            <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 104 * k, lineHeight: 1.0, color: C.butter, letterSpacing: '-0.01em'}}>{line2}</div>
          </MaskLine>
        ) : null}
        <div style={{height: 6, marginTop: 16, width: 220 * barW, background: C.butter, borderRadius: 3}} />
      </div>
    </AbsoluteFill>
  );
};

/** Glass chip: "01 — Leperkan roti" */
export const StepChip: React.FC<{dur: number; n: string; label: string; y?: number; side?: 'left' | 'right'}> = ({dur, n, label, y = SAFE.top + 20, side = 'left'}) => {
  const {f, k} = useEnvelope(dur, 12, 8);
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 15, stiffness: 160}});
  const x = side === 'left' ? SAFE.left : undefined;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: y,
          left: x,
          right: side === 'right' ? W - SAFE.right : undefined,
          opacity: k,
          transform: `translateX(${(1 - s) * (side === 'left' ? -60 : 60)}px)`,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '16px 28px 16px 16px',
          borderRadius: 999,
          background: 'rgba(18,14,10,0.42)',
          border: '1.5px solid rgba(255,248,238,0.22)',
          backdropFilter: 'blur(18px) saturate(1.4)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            background: C.butter,
            color: C.ink,
            fontFamily: F.mono,
            fontSize: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {n}
        </div>
        <div style={{fontFamily: F.display, fontWeight: 700, fontStretch: '108%', fontSize: 42, color: C.paper, letterSpacing: '-0.01em'}}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Timelapse indicator: "▶▶ 8×" */
export const SpeedTag: React.FC<{dur: number; speed: number; y?: number}> = ({dur, speed, y = SAFE.top + 120}) => {
  const {f, k} = useEnvelope(dur, 8, 6);
  const blink = 0.55 + 0.45 * Math.abs(Math.sin(f / 6));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          top: y,
          left: SAFE.left + 4,
          opacity: k,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontFamily: F.mono,
          fontSize: 30,
          color: C.paper,
          letterSpacing: '0.12em',
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        <svg width="40" height="26" viewBox="0 0 40 26" style={{opacity: blink}}>
          <path d="M0 0 L18 13 L0 26 Z M20 0 L38 13 L20 26 Z" fill={C.butter} />
        </svg>
        {speed}× TIMELAPSE
      </div>
    </AbsoluteFill>
  );
};

/** Big kinetic word slam – placed away from the face. */
export const KineticWord: React.FC<{dur: number; text: string; sub?: string; x?: number; y?: number; serif?: boolean; color?: string; rotate?: number; size?: number}> = ({
  dur,
  text,
  sub,
  x = SAFE.left,
  y = 420,
  serif = false,
  color = C.paper,
  rotate = -4,
  size = 150,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 9, mass: 0.6, stiffness: 260}});
  const out = interpolate(f, [dur - 7, dur], [1, 0], clamp);
  const scale = interpolate(s, [0, 1], [2.2, 1]) * interpolate(out, [0, 1], [0.85, 1]);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `rotate(${rotate}deg) scale(${scale})`,
          transformOrigin: 'left center',
          opacity: Math.min(interpolate(f, [0, 3], [0, 1], clamp), out),
          filter: 'drop-shadow(0 14px 30px rgba(0,0,0,0.5))',
        }}
      >
        <div
          style={
            serif
              ? {fontFamily: F.serif, fontStyle: 'italic', fontSize: size * 1.1, lineHeight: 0.9, color}
              : {fontFamily: F.display, fontWeight: 900, fontStretch: '122%', fontSize: size, lineHeight: 0.86, letterSpacing: '-0.04em', textTransform: 'uppercase', color}
          }
        >
          {text}
        </div>
        {sub ? (
          <div style={{marginTop: 10, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.16em', color: C.paper, textTransform: 'uppercase'}}>{sub}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Counting number badge e.g. 12 bekas nasi */
export const Counter: React.FC<{dur: number; to: number; label: string; x?: number; y?: number; suffix?: string}> = ({dur, to, label, x = SAFE.left, y = 300, suffix = ''}) => {
  const {f, k} = useEnvelope(dur, 10, 8);
  const n = Math.round(interpolate(f, [4, Math.min(dur - 12, 40)], [0, to], {...clamp, easing: eo}));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: x, top: y, opacity: k, transform: `translateY(${(1 - k) * 30}px)`, filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))'}}>
        <div style={{fontFamily: F.display, fontWeight: 900, fontStretch: '125%', fontSize: 210, lineHeight: 0.8, letterSpacing: '-0.05em', color: C.butter, fontVariantNumeric: 'tabular-nums'}}>
          {n}
          {suffix}
        </div>
        <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 70, color: C.paper, marginTop: 4}}>{label}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Hand-drawn arrow + label pointing at something (food), drawn on. */
export const Arrow: React.FC<{dur: number; x: number; y: number; label: string; flip?: boolean}> = ({dur, x, y, label, flip = false}) => {
  const {f, k} = useEnvelope(dur, 6, 8);
  const draw = interpolate(f, [2, 16], [0, 1], {...clamp, easing: eo});
  const len = 340;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: x, top: y, opacity: k, transform: flip ? 'scaleX(-1)' : undefined, transformOrigin: '0 0'}}>
        <svg width="260" height="200" viewBox="0 0 260 200" style={{overflow: 'visible', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'}}>
          <path
            d="M10 20 C 90 0, 190 40, 200 150"
            fill="none"
            stroke={C.butter}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={len}
            strokeDashoffset={len * (1 - draw)}
          />
          <path d="M168 128 L201 160 L226 120" fill="none" stroke={C.butter} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0.95 ? 1 : 0} />
        </svg>
      </div>
      <div
        style={{
          position: 'absolute',
          left: flip ? x - 260 - 20 : x - 20,
          top: y - 78,
          width: 520,
          textAlign: flip ? 'right' : 'left',
          opacity: k,
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 68,
          color: C.paper,
          textShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

export const Flash: React.FC<{dur: number; color?: string}> = ({dur, color = '#fff'}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 1, dur], [0, 0.85, 0], clamp);
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};

/** Photo "snap": white flash + inset frame border + REC-style label */
export const Snap: React.FC<{dur: number; label?: string}> = ({dur, label = 'SIAP.'}) => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [0, 1, 8], [0, 1, 0], clamp);
  const k = interpolate(f, [2, 12], [0, 1], {...clamp, easing: eo}) * interpolate(f, [dur - 8, dur], [1, 0], clamp);
  const inset = 28 * k;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{boxShadow: `inset 0 0 0 ${inset}px ${C.paper}`}} />
      <div style={{position: 'absolute', left: SAFE.left, bottom: 1920 - SAFE.bottom + 10, opacity: k, fontFamily: F.mono, fontSize: 30, letterSpacing: '0.2em', color: C.paper, textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>
        ● {label}
      </div>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};

/** Outro CTA */
export const EndCard: React.FC<{dur: number; line1: string; line2: string; y?: number}> = ({dur, line1, line2, y = SAFE.top + 20}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - 6, fps, config: {damping: 14, stiffness: 140}});
  const dim = interpolate(f, [0, 12], [0, 0.35], clamp);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,${dim + 0.15}) 0%, rgba(0,0,0,0) 45%)`}} />
      <div style={{position: 'absolute', left: SAFE.left, width: SAFE.right - SAFE.left, top: y}}>
        <MaskLine delay={0} dur={dur + 20}>
          <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 92, color: C.butter, lineHeight: 1}}>{line1}</div>
        </MaskLine>
        <MaskLine delay={5} dur={dur + 20}>
          <div style={{fontFamily: F.display, fontWeight: 900, fontStretch: '118%', fontSize: 96, color: C.paper, textTransform: 'uppercase', letterSpacing: '-0.035em', lineHeight: 0.95}}>{line2}</div>
        </MaskLine>
        <div
          style={{
            marginTop: 26,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 26px',
            borderRadius: 999,
            background: C.paper,
            color: C.ink,
            fontFamily: F.display,
            fontWeight: 800,
            fontStretch: '110%',
            fontSize: 36,
            transform: `scale(${s})`,
            transformOrigin: 'left center',
          }}
        >
          <svg width="30" height="34" viewBox="0 0 30 34">
            <path d="M3 2 h24 v30 l-12 -9 l-12 9 z" fill={C.ink} />
          </svg>
          SAVE + FOLLOW
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Thin progress line in the top safe band */
export const Progress: React.FC<{total: number}> = ({total}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: SAFE.top - 34, left: SAFE.left, width: SAFE.right - SAFE.left, height: 5, borderRadius: 3, background: 'rgba(255,248,238,0.18)'}}>
        <div style={{width: `${(f / total) * 100}%`, height: '100%', borderRadius: 3, background: C.butter}} />
      </div>
    </AbsoluteFill>
  );
};

export const OVERLAYS: Record<string, React.FC<any>> = {
  hook: HookTitle,
  step: StepChip,
  speed: SpeedTag,
  word: KineticWord,
  counter: Counter,
  arrow: Arrow,
  flash: Flash,
  snap: Snap,
  end: EndCard,
};
