import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_BODY, FONT_TITLE, SAFE, SAFE_CX, SAFE_W, textStroke} from '../theme';
import type {Overlay} from '../types';

const useLocal = (dur: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const durF = Math.round(dur * fps);
  const inS = spring({frame, fps, config: {damping: 13, stiffness: 180, mass: 0.7}});
  const outS = interpolate(frame, [durF - 8, durF], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  return {frame, fps, durF, inS, outS, vis: Math.min(inS, outS)};
};

/** Position helper: slots are always inside the TikTok/IG safe zone. */
const slotStyle = (slot: Overlay['slot'] = 'top', w = SAFE_W): React.CSSProperties => {
  switch (slot) {
    case 'bottom':
      return {left: SAFE_CX - w / 2, width: w, top: SAFE.bottom - 300};
    case 'topLeft':
      return {left: SAFE.left, top: SAFE.top + 10};
    case 'topRight':
      return {right: 1080 - SAFE.right, top: SAFE.top + 10};
    case 'midLeft':
      return {left: SAFE.left, top: 760};
    case 'midRight':
      return {right: 1080 - SAFE.right, top: 760};
    case 'center':
      return {left: SAFE_CX - w / 2, width: w, top: 760};
    case 'top':
    default:
      return {left: SAFE_CX - w / 2, width: w, top: SAFE.top + 10};
  }
};

/* --------------------------------------------------------------- HOOK */
export const HookTitle: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, fps, vis} = useLocal(o.dur);
  const lines = (o.props?.lines as string[]) ?? ['HOOK'];
  const accent = (o.props?.accent as number) ?? 1;
  return (
    <div style={{position: 'absolute', ...slotStyle(o.slot ?? 'top'), display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: vis}}>
      {lines.map((l, i) => {
        const s = spring({frame: frame - i * 4, fps, config: {damping: 16, stiffness: 180, mass: 0.6}});
        const isAccent = i === accent;
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT_TITLE,
              fontWeight: 900,
              fontSize: isAccent ? 118 : 78,
              lineHeight: 1.0,
              textAlign: 'center',
              color: isAccent ? C.ink : C.white,
              background: isAccent ? `linear-gradient(180deg, ${C.honey}, ${C.honeyDeep})` : 'transparent',
              padding: isAccent ? '6px 26px 12px' : '0 10px',
              borderRadius: 22,
              margin: '6px 0',
              transform: `scale(${interpolate(s, [0, 1], [1.25, 1])}) rotate(${isAccent ? -1.5 : 0}deg)`,
              opacity: s,
              boxShadow: isAccent ? '0 14px 0 rgba(58,34,14,0.85), 0 22px 40px rgba(0,0,0,0.35)' : undefined,
              ...(isAccent ? {} : textStroke(14)),
              textShadow: isAccent ? undefined : '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

/* --------------------------------------------------------------- STEP BADGE */
export const StepBadge: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, fps, vis, inS} = useLocal(o.dur);
  const n = o.props?.n as number;
  const label = o.props?.label as string;
  const slide = interpolate(inS, [0, 1], [-520, 0]);
  const numPop = spring({frame: frame - 6, fps, config: {damping: 8, stiffness: 300}});
  return (
    <div style={{position: 'absolute', ...slotStyle(o.slot ?? 'topLeft'), transform: `translateX(${slide}px)`, opacity: vis, display: 'flex', alignItems: 'center'}}>
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: 64,
          background: C.honey,
          border: `7px solid ${C.ink}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 74,
          color: C.ink,
          transform: `scale(${numPop}) rotate(${interpolate(numPop, [0, 1], [-90, 0])}deg)`,
          zIndex: 2,
          boxShadow: '0 10px 0 rgba(0,0,0,0.25)',
        }}
      >
        {n}
      </div>
      <div
        style={{
          marginLeft: -30,
          padding: '18px 34px 18px 52px',
          background: C.cream,
          border: `6px solid ${C.ink}`,
          borderRadius: 26,
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 50,
          color: C.brown,
          textTransform: 'uppercase',
          maxWidth: 560,
          lineHeight: 1.05,
          boxShadow: '0 10px 0 rgba(0,0,0,0.25)',
        }}
      >
        <div style={{fontSize: 24, letterSpacing: 4, color: C.amber}}>LANGKAH {n}</div>
        {label}
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- INGREDIENTS */
export const Ingredients: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, fps, vis, inS} = useLocal(o.dur);
  const items = (o.props?.items as {emoji: string; name: string; qty?: string; at?: number}[]) ?? [];
  return (
    <div
      style={{
        position: 'absolute',
        ...slotStyle(o.slot ?? 'topLeft'),
        width: 470,
        padding: '26px 28px',
        background: 'rgba(255,246,222,0.96)',
        border: `6px solid ${C.ink}`,
        borderRadius: 34,
        boxShadow: '0 14px 0 rgba(0,0,0,0.25)',
        transform: `scale(${interpolate(inS, [0, 1], [0.6, 1])})`,
        transformOrigin: 'top left',
        opacity: vis,
      }}
    >
      <div style={{fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 40, color: C.amber, letterSpacing: 2, marginBottom: 10}}>BAHAN-BAHAN</div>
      {items.map((it, i) => {
        const appear = (it.at ?? i * 0.35) * fps;
        const s = spring({frame: frame - appear, fps, config: {damping: 12, stiffness: 220}});
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 16, margin: '10px 0', opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`}}>
            <div style={{fontSize: 54, width: 66, textAlign: 'center'}}>{it.emoji}</div>
            <div style={{flex: 1}}>
              <div style={{fontFamily: FONT_BODY, fontWeight: 800, fontSize: 38, color: C.brown, lineHeight: 1}}>{it.name}</div>
              {it.qty ? <div style={{fontFamily: FONT_BODY, fontWeight: 600, fontSize: 28, color: C.amber}}>{it.qty}</div> : null}
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: C.green,
                color: 'white',
                fontSize: 32,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `scale(${spring({frame: frame - appear - 8, fps, config: {damping: 8}})})`,
              }}
            >
              ✓
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* --------------------------------------------------------------- TIMER */
export const Timer: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, durF, vis, inS} = useLocal(o.dur);
  const minutes = (o.props?.minutes as number) ?? 30;
  const label = (o.props?.label as string) ?? 'MINIT';
  const prog = interpolate(frame, [6, durF - 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
  const shown = Math.round(prog * minutes);
  const R = 92;
  const circ = 2 * Math.PI * R;
  return (
    <div style={{position: 'absolute', ...slotStyle(o.slot ?? 'topRight'), opacity: vis, transform: `scale(${inS})`, transformOrigin: 'top right'}}>
      <div style={{position: 'relative', width: 240, height: 240}}>
        <svg width={240} height={240} style={{position: 'absolute'}}>
          <circle cx={120} cy={120} r={R + 14} fill={C.cream} stroke={C.ink} strokeWidth={7} />
          <circle cx={120} cy={120} r={R} fill="none" stroke="rgba(58,34,14,0.15)" strokeWidth={18} />
          <circle
            cx={120}
            cy={120}
            r={R}
            fill="none"
            stroke={C.honey}
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - prog)}
            transform="rotate(-90 120 120)"
          />
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          {minutes > 0 ? (
            <>
              <div style={{fontSize: 34}}>⏱️</div>
              <div style={{fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 64, color: C.brown, lineHeight: 0.95}}>{shown}</div>
            </>
          ) : (
            <div style={{fontSize: 84, transform: `rotate(${Math.floor(frame / 12) * 180}deg)`}}>⏳</div>
          )}
          <div style={{fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 24, color: C.amber, letterSpacing: 3}}>{label}</div>
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- TIP / LABEL */
export const Tip: React.FC<{o: Overlay}> = ({o}) => {
  const {vis, inS, frame} = useLocal(o.dur);
  const title = (o.props?.title as string) ?? 'TIPS';
  const text = o.props?.text as string;
  const emoji = (o.props?.emoji as string) ?? '💡';
  const wob = Math.sin(frame / 6) * 1.2;
  return (
    <div
      style={{
        position: 'absolute',
        ...slotStyle(o.slot ?? 'top', 720),
        opacity: vis,
        transform: `translateY(${interpolate(inS, [0, 1], [-40, 0])}px) rotate(${wob - 1.5}deg)`,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{background: C.ink, borderRadius: 30, padding: '20px 30px', display: 'flex', gap: 18, alignItems: 'center', boxShadow: `0 0 0 6px ${C.honey}, 0 16px 34px rgba(0,0,0,0.4)`}}>
        <div style={{fontSize: 62}}>{emoji}</div>
        <div>
          <div style={{fontFamily: FONT_TITLE, fontWeight: 900, fontSize: 28, color: C.honey, letterSpacing: 3}}>{title}</div>
          <div style={{fontFamily: FONT_BODY, fontWeight: 800, fontSize: 42, color: C.white, lineHeight: 1.1}}>{text}</div>
        </div>
      </div>
    </div>
  );
};

export const Label: React.FC<{o: Overlay}> = ({o}) => {
  const {vis, inS} = useLocal(o.dur);
  const text = o.props?.text as string;
  return (
    <div style={{position: 'absolute', ...slotStyle(o.slot ?? 'top'), display: 'flex', justifyContent: 'center', opacity: vis}}>
      <div
        style={{
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: (o.props?.size as number) ?? 72,
          color: C.white,
          textAlign: 'center',
          lineHeight: 1.05,
          ...textStroke(14),
          textShadow: '0 8px 24px rgba(0,0,0,0.5)',
          transform: `scale(${interpolate(inS, [0, 1], [1.6, 1])})`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* --------------------------------------------------------------- BENEFITS (chips) */
export const Benefits: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, fps, vis} = useLocal(o.dur);
  const items = (o.props?.items as string[]) ?? [];
  return (
    <div style={{position: 'absolute', ...slotStyle(o.slot ?? 'top'), display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, opacity: vis}}>
      {items.map((t, i) => {
        const s = spring({frame: frame - i * 6, fps, config: {damping: 10, stiffness: 240}});
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 800,
              fontSize: 40,
              color: C.ink,
              background: i % 2 ? C.cream : C.honey,
              border: `5px solid ${C.ink}`,
              borderRadius: 999,
              padding: '10px 26px',
              transform: `scale(${s}) rotate(${(i % 2 ? 2 : -2) * s}deg)`,
              boxShadow: '0 8px 0 rgba(0,0,0,0.25)',
            }}
          >
            {t}
          </div>
        );
      })}
    </div>
  );
};

/* --------------------------------------------------------------- STICKER (emoji) */
export const Sticker: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, fps, vis} = useLocal(o.dur);
  const emoji = (o.props?.emoji as string) ?? '🍯';
  const x = (o.props?.x as number) ?? 760;
  const y = (o.props?.y as number) ?? 600;
  const size = (o.props?.size as number) ?? 130;
  const s = spring({frame, fps, config: {damping: 7, stiffness: 200}});
  const bob = Math.sin(frame / 7) * 10;
  return (
    <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2 + bob, fontSize: size, opacity: vis, transform: `scale(${s}) rotate(${Math.sin(frame / 9) * 8}deg)`, filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.35))'}}>
      {emoji}
    </div>
  );
};

/* --------------------------------------------------------------- FLASH (cut accent) */
export const Flash: React.FC<{o: Overlay}> = ({o}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 2, 7], [0, 0.55, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: (o.props?.color as string) ?? C.cream, opacity: op}} />;
};

/* --------------------------------------------------------------- CTA end card */
export const CTA: React.FC<{o: Overlay}> = ({o}) => {
  const {frame, fps, vis} = useLocal(o.dur);
  const line1 = (o.props?.line1 as string) ?? 'SAVE RESEPI NI';
  const line2 = (o.props?.line2 as string) ?? 'Follow untuk resepi seterusnya!';
  const s1 = spring({frame, fps, config: {damping: 10, stiffness: 200}});
  const s2 = spring({frame: frame - 8, fps, config: {damping: 12}});
  const pulse = 1;
  return (
    <div style={{position: 'absolute', ...slotStyle(o.slot ?? 'top'), display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: vis}}>
      <div
        style={{
          fontFamily: FONT_TITLE,
          fontWeight: 900,
          fontSize: 70,
          whiteSpace: 'nowrap',
          color: C.ink,
          background: `linear-gradient(180deg, ${C.honey}, ${C.honeyDeep})`,
          padding: '10px 30px 16px',
          borderRadius: 26,
          border: `6px solid ${C.ink}`,
          transform: `scale(${s1 * pulse}) rotate(-2deg)`,
          boxShadow: '0 12px 0 rgba(0,0,0,0.3)',
        }}
      >
        📌 {line1}
      </div>
      <div style={{fontFamily: FONT_BODY, fontWeight: 800, fontSize: 44, color: C.white, textAlign: 'center', ...textStroke(10), opacity: s2, transform: `translateY(${(1 - s2) * 30}px)`}}>{line2}</div>
    </div>
  );
};

/* --------------------------------------------------------------- dispatcher */
export const OverlayView: React.FC<{o: Overlay}> = ({o}) => {
  switch (o.type) {
    case 'hook':
      return <HookTitle o={o} />;
    case 'step':
      return <StepBadge o={o} />;
    case 'ingredients':
      return <Ingredients o={o} />;
    case 'timer':
      return <Timer o={o} />;
    case 'tip':
      return <Tip o={o} />;
    case 'label':
      return <Label o={o} />;
    case 'benefits':
      return <Benefits o={o} />;
    case 'sticker':
      return <Sticker o={o} />;
    case 'flash':
      return <Flash o={o} />;
    case 'cta':
      return <CTA o={o} />;
    default:
      return null;
  }
};
