import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from '../theme';

export type GProps = {props: Record<string, any>; dur: number; accent: string; align?: 'left' | 'right'};

const useAnim = (dur: number) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inn = spring({frame: f, fps, config: {damping: 15, stiffness: 180, mass: 0.7}});
  const out = interpolate(f, [dur - 9, dur - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  return {f, fps, inn, out};
};

const Icon: React.FC<{name?: string; color: string; size?: number}> = ({name, color, size = 44}) => {
  const s = {width: size, height: size};
  if (name === 'flame')
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <path fill={color} d="M12 2c1 3.5-1.5 5-1.5 7.5 0 1.4 1 2.5 2.3 2.5 1.6 0 2.4-1.4 2.2-3.2C17.4 10.6 19 13 19 15.5 19 19.1 15.9 22 12 22s-7-2.9-7-6.5C5 10.8 9.6 8 12 2z" />
      </svg>
    );
  if (name === 'grill')
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
        <path d="M3 10h18M5 10a7 7 0 0 0 14 0M8 17l-2 5M16 17l2 5M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4M16 3c-1 1.5 1 2.5 0 4" />
      </svg>
    );
  if (name === 'oven')
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth={2.2}>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <rect x="6" y="10" width="12" height="7" rx="1.5" />
        <path d="M7 7h1M11 7h1" strokeLinecap="round" />
      </svg>
    );
  if (name === 'pizza')
    return (
      <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round">
        <path d="M12 21 3 6a15 15 0 0 1 18 0z" />
        <circle cx="10" cy="10" r="1.3" fill={color} />
        <circle cx="14" cy="13" r="1.3" fill={color} />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth={2.2}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" strokeLinecap="round" />
    </svg>
  );
};

const glass: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(20,15,11,0.86), rgba(20,15,11,0.7))',
  border: '1.5px solid rgba(255,243,226,0.14)',
  boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
};

/* ------------------------------------------------------------------ HOOK */
export const Hook: React.FC<GProps> = ({props, dur, accent, align}) => {
  const {f, fps, out} = useAnim(dur);
  const words = String(props.text).split(' ');
  return (
    <div style={{width: '100%', textAlign: align ?? 'left', opacity: 1 - out, transform: `translateY(${-30 * out}px)`}}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 20px',
          borderRadius: 100,
          background: accent,
          color: C.ink,
          fontFamily: F.wide,
          fontWeight: 900,
          fontStretch: '125%',
          fontSize: 26,
          letterSpacing: 3,
          textTransform: 'uppercase',
          transform: `scale(${interpolate(spring({frame: f, fps, config: {damping: 12}}), [0, 1], [1.2, 1])})`,
          transformOrigin: align === 'right' ? 'right center' : 'left center',
        }}
      >
        <span style={{width: 12, height: 12, borderRadius: 6, background: C.ink}} />
        {props.kicker ?? 'Tasty Tuesday'}
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: F.display,
          fontWeight: 800,
          // longest word must fit the column (Unbounded caps ≈ 0.8 em per glyph)
          fontSize: Math.min(words.join(' ').length > 22 ? 74 : 86, Math.floor((align === 'right' ? 540 : 860) / (Math.max(...words.map((w) => w.length)) * 0.8))),
          lineHeight: 1.02,
          letterSpacing: -2,
          color: C.white,
          textTransform: 'uppercase',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: '0 22px',
          // readable on frame 0 (thumbnail), then a quick settle — scaled as one block so words never overlap
          transform: `scale(${interpolate(spring({frame: f, fps, config: {damping: 14, stiffness: 260, mass: 0.5}}), [0, 1], [1.08, 1])})`,
          transformOrigin: align === 'right' ? 'right top' : 'left top',
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              WebkitTextStroke: '12px rgba(10,6,2,0.9)',
              paintOrder: 'stroke fill',
              textShadow: '0 12px 30px rgba(0,0,0,0.5)',
            }}
          >
            {w}
          </span>
        ))}
      </div>
      {props.sub && (
        <div
          style={{
            marginTop: 10,
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: String(props.sub).length > 17 ? 46 : 52,
            whiteSpace: 'nowrap',
            color: C.cream,
            opacity: interpolate(f, [4, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            textShadow: '0 4px 18px rgba(0,0,0,0.8)',
          }}
        >
          {props.sub}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ TITLE */
export const Title: React.FC<GProps> = ({props, dur, accent, align}) => {
  const {f, fps, out} = useAnim(dur);
  const wipe = interpolate(f, [0, 10], [0, 100], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const words = String(props.menu).toUpperCase().split(' ');
  return (
    <div style={{opacity: 1 - out, textAlign: align ?? 'left', transform: `translateX(${(align === 'right' ? 80 : -80) * out}px)`}}>
      <div style={{display: 'flex', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 16, fontFamily: F.wide, fontWeight: 800, fontStretch: '125%', fontSize: 24, letterSpacing: 4, color: accent}}>
        <span style={{height: 3, width: interpolate(f, [0, 12], [0, 70], {extrapolateRight: 'clamp'}), background: accent}} />
        {String(props.role).toUpperCase()} · MODE {String(props.mode).toUpperCase()}
      </div>
      <div style={{clipPath: align === 'right' ? `inset(0 0 0 ${100 - wipe}%)` : `inset(0 ${100 - wipe}% 0 0)`, marginTop: 10}}>
        {words.map((w, i) => (
          <div
            key={i}
            style={{
              fontFamily: F.display,
              fontWeight: 900,
              fontSize: words.length > 2 ? 96 : 122,
              lineHeight: 0.98,
              letterSpacing: -3,
              color: i === words.length - 1 ? accent : C.white,
              WebkitTextStroke: '12px rgba(10,6,2,0.88)',
              paintOrder: 'stroke fill',
              textShadow: '0 14px 34px rgba(0,0,0,0.45)',
              transform: `translateY(${interpolate(spring({frame: f - i * 3, fps, config: {damping: 14}}), [0, 1], [40, 0])}px)`,
            }}
          >
            {w}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 58,
          color: C.cream,
          textShadow: '0 4px 18px rgba(0,0,0,0.85)',
          opacity: interpolate(f, [8, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        oleh {props.chef}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ CHIP */
export const Chip: React.FC<GProps> = ({props, dur, accent}) => {
  const {f, inn, out} = useAnim(dur);
  const on = Math.min(1, f / 8);
  return (
    <div
      style={{
        ...glass,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 18,
        padding: '16px 30px 16px 18px',
        borderRadius: 100,
        transform: `translateX(${interpolate(inn, [0, 1], [-60, 0]) - out * 60}px) scale(${interpolate(inn, [0, 1], [0.8, 1])})`,
        opacity: inn * (1 - out),
      }}
    >
      <div style={{width: 64, height: 64, borderRadius: 32, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Icon name={props.icon} color={C.ink} size={38} />
      </div>
      <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '115%', fontSize: 38, color: C.white, letterSpacing: 1, textTransform: 'uppercase'}}>
        {props.text}
      </div>
      <div style={{width: 46, height: 26, borderRadius: 13, background: on > 0.99 ? accent : 'rgba(255,255,255,0.25)', position: 'relative', marginLeft: 6}}>
        <div style={{position: 'absolute', top: 3, left: 3 + 20 * on, width: 20, height: 20, borderRadius: 10, background: C.white}} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ STEP */
export const Step: React.FC<GProps> = ({props, dur, accent}) => {
  const {f, fps, inn, out} = useAnim(dur);
  const n = spring({frame: f - 2, fps, config: {damping: 9, stiffness: 260}});
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 20, opacity: 1 - out, transform: `translateY(${-24 * out}px)`}}>
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          background: accent,
          color: C.ink,
          fontFamily: F.display,
          fontWeight: 900,
          fontSize: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${n}) rotate(${interpolate(n, [0, 1], [-25, -4])}deg)`,
          boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
        }}
      >
        {props.n}
      </div>
      <div style={{...glass, padding: '18px 28px', borderRadius: 24, clipPath: `inset(0 ${100 - inn * 100}% 0 0 round 24px)`}}>
        <div style={{fontFamily: F.wide, fontWeight: 800, fontStretch: '125%', fontSize: 20, letterSpacing: 4, color: accent}}>LANGKAH {props.n}</div>
        <div style={{fontFamily: F.sans, fontWeight: 800, fontSize: 44, color: C.white, marginTop: 2}}>{props.text}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ TIP */
export const Tip: React.FC<GProps> = ({props, dur, accent}) => {
  const {inn, out} = useAnim(dur);
  return (
    <div
      style={{
        ...glass,
        display: 'inline-block',
        padding: '22px 34px 24px',
        borderRadius: 30,
        borderLeft: `10px solid ${accent}`,
        transform: `translateY(${interpolate(inn, [0, 1], [50, 0]) - out * 30}px) rotate(${interpolate(inn, [0, 1], [-3, -1])}deg)`,
        opacity: inn * (1 - out),
        maxWidth: 840,
      }}
    >
      <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 22, letterSpacing: 5, color: accent}}>PRO TIP</div>
      <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 50, color: C.white, lineHeight: 1.05, marginTop: 6, letterSpacing: -1}}>{props.text}</div>
      {props.sub && <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 42, color: C.cream, marginTop: 6}}>{props.sub}</div>}
    </div>
  );
};

/* ------------------------------------------------------------------ STAT */
export const Stat: React.FC<GProps> = ({props, dur, accent}) => {
  const {f, fps, out} = useAnim(dur);
  const s = spring({frame: f, fps, config: {damping: 10, stiffness: 170, mass: 0.8}});
  const strike = props.strike ? interpolate(f, [22, 32], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <div style={{display: 'inline-block', opacity: 1 - out, transform: `scale(${interpolate(s, [0, 1], [0.4, 1]) * (1 - 0.15 * out)}) rotate(${interpolate(s, [0, 1], [-8, -2])}deg)`, transformOrigin: 'left center'}}>
      <div style={{position: 'relative', display: 'inline-block'}}>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 150,
            lineHeight: 0.95,
            letterSpacing: -6,
            color: props.strike ? C.cream : accent,
            WebkitTextStroke: '14px rgba(10,6,2,0.9)',
            paintOrder: 'stroke fill',
            textShadow: '0 18px 40px rgba(0,0,0,0.45)',
          }}
        >
          {props.big}
        </div>
        {props.strike && (
          <div style={{position: 'absolute', left: -10, top: '48%', height: 16, width: `${strike + 4}%`, background: '#FF3B30', borderRadius: 8, transform: 'rotate(-6deg)', boxShadow: '0 0 0 6px rgba(10,6,2,0.85)'}} />
        )}
      </div>
      <div style={{marginTop: 4, display: 'inline-block', marginLeft: 8, padding: '8px 18px', background: C.cream, color: C.ink, borderRadius: 12, fontFamily: F.sans, fontWeight: 800, fontSize: 36, textTransform: 'uppercase', letterSpacing: 0.5}}>
        {props.label}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ REVEAL */
export const Reveal: React.FC<GProps> = ({props, dur, accent}) => {
  const {f, fps, out} = useAnim(dur);
  const s = spring({frame: f, fps, config: {damping: 12}});
  const rays = Array.from({length: 10});
  return (
    <div style={{position: 'relative', display: 'inline-block', opacity: 1 - out}}>
      <svg width={180} height={180} viewBox="-90 -90 180 180" style={{position: 'absolute', left: -70, top: -70}}>
        {rays.map((_, i) => {
          const a = (i / rays.length) * Math.PI * 2;
          const r0 = interpolate(f, [0, 14], [10, 50], {extrapolateRight: 'clamp'});
          const r1 = interpolate(f, [0, 10], [20, 80], {extrapolateRight: 'clamp'});
          return (
            <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * r1} y2={Math.sin(a) * r1} stroke={C.gold} strokeWidth={6} strokeLinecap="round" opacity={interpolate(f, [8, 18], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
          );
        })}
      </svg>
      <div
        style={{
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 104,
          lineHeight: 1,
          color: C.white,
          textShadow: `0 6px 0 ${accent}, 0 18px 40px rgba(0,0,0,0.65)`,
          transform: `scale(${interpolate(s, [0, 1], [0.6, 1])}) rotate(-3deg)`,
          transformOrigin: 'left center',
        }}
      >
        {props.text}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ QUOTE */
export const Quote: React.FC<GProps> = ({props, dur, accent}) => {
  const {inn, out} = useAnim(dur);
  return (
    <div style={{display: 'inline-block', opacity: inn * (1 - out), transform: `translateY(${interpolate(inn, [0, 1], [40, 0])}px)`}}>
      <div style={{...glass, padding: '18px 34px', borderRadius: 34, borderBottomLeftRadius: 6}}>
        <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 84, color: C.white}}>{props.text}</div>
      </div>
      <div style={{fontFamily: F.wide, fontWeight: 800, fontStretch: '125%', fontSize: 22, letterSpacing: 4, color: accent, marginTop: 10}}>— ANAK KAK PIAH</div>
    </div>
  );
};

/* ------------------------------------------------------------------ CTA */
export const Cta: React.FC<GProps> = (p) => (p.props?.part2 ? <Part2Card {...p} /> : <FollowCta {...p} />);

/** Teaser end card: points viewers to the full cooking video (Part 2). */
const Part2Card: React.FC<GProps> = ({dur, accent}) => {
  const {f, fps, out} = useAnim(dur + 20);
  const s = spring({frame: f, fps, config: {damping: 11, stiffness: 180}});
  const arrow = interpolate(Math.sin(f / 4), [-1, 1], [0, 14]);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 1 - out, transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`}}>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 60, color: C.cream, textShadow: '0 4px 18px rgba(0,0,0,0.85)'}}>Nak tahu cara buat?</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '18px 40px', borderRadius: 26, background: accent, color: C.ink, boxShadow: '0 12px 0 rgba(10,6,2,0.9), 0 24px 50px rgba(0,0,0,0.4)'}}>
        <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 92, letterSpacing: -3, lineHeight: 1}}>PART 2</div>
        <svg width={70} height={70} viewBox="0 0 24 24" style={{transform: `translateX(${arrow}px)`}}>
          <path d="M5 4l14 8-14 8z" fill={C.ink} />
        </svg>
      </div>
      <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 30, letterSpacing: 4, color: C.white, textShadow: '0 4px 16px rgba(0,0,0,0.9)', marginTop: 8}}>CARA MASAK PENUH · FOLLOW</div>
    </div>
  );
};

const FollowCta: React.FC<GProps> = ({dur, accent}) => {
  const {f, fps, out} = useAnim(dur + 20);
  const s = spring({frame: f, fps, config: {damping: 12}});
  const press = f > 24 && f < 32 ? 0.92 : 1;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, opacity: 1 - out, transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)`}}>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 58, color: C.cream, textShadow: '0 4px 18px rgba(0,0,0,0.8)'}}>Nak resipi penuh?</div>
      <div style={{display: 'flex', gap: 16, transform: `scale(${press})`}}>
        <div style={{padding: '22px 44px', borderRadius: 100, background: accent, color: C.ink, fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 38, letterSpacing: 2, boxShadow: '0 16px 40px rgba(0,0,0,0.4)'}}>
          + FOLLOW
        </div>
        <div style={{...glass, padding: '22px 34px', borderRadius: 100, color: C.white, fontFamily: F.wide, fontWeight: 900, fontStretch: '115%', fontSize: 34, letterSpacing: 1}}>
          KOMEN “RESIPI”
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ MENU TAG (reel) */
const TAG_MENUS: Record<string, {n: number; menu: string; chef: string; mode: string; accent: string}> = {
  roll: {n: 1, menu: 'Sardin Roll', chef: 'Mukmin', mode: 'Deep Fry', accent: '#FF7A1A'},
  wrap: {n: 2, menu: 'Tortilla Spicy Tuna', chef: 'Kak Hani', mode: 'Grill', accent: '#FF5436'},
  puff: {n: 3, menu: 'Sardin Puff', chef: 'Kak Salmah', mode: 'Oven', accent: '#F2A93B'},
  sambal: {n: 4, menu: 'Sambal Sardin', chef: 'Mak Ida', mode: 'Cooker', accent: '#E8344E'},
  pizza: {n: 5, menu: 'Pizza Tuna', chef: 'Kak Piah', mode: 'Pizza', accent: '#FFB000'},
};
export const MenuTag: React.FC<GProps> = ({props, dur}) => {
  const {f, fps, out} = useAnim(dur);
  const m = TAG_MENUS[props.key];
  const s = spring({frame: f, fps, config: {damping: 15, stiffness: 200}});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 22, opacity: 1 - out, transform: `translateX(${interpolate(s, [0, 1], [-50, 0])}px)`}}>
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 120, lineHeight: 0.9, color: m.accent, WebkitTextStroke: '10px rgba(10,6,2,0.85)', paintOrder: 'stroke fill', letterSpacing: -6}}>0{m.n}</div>
      <div>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 54, color: C.white, lineHeight: 1, letterSpacing: -1, textTransform: 'uppercase', WebkitTextStroke: '9px rgba(10,6,2,0.85)', paintOrder: 'stroke fill'}}>{m.menu}</div>
        <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 40, color: C.cream, marginTop: 4, textShadow: '0 3px 14px rgba(0,0,0,0.8)'}}>
          {m.chef} · Mode {m.mode}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ STICKER (bloopers) */
export const Sticker: React.FC<GProps> = ({props, dur, accent}) => {
  const {f, fps, out} = useAnim(dur);
  const s = spring({frame: f, fps, config: {damping: 8, stiffness: 260, mass: 0.6}});
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '14px 28px',
        borderRadius: 18,
        background: accent,
        color: C.ink,
        fontFamily: F.display,
        fontWeight: 900,
        fontSize: 52,
        letterSpacing: -1,
        textTransform: 'uppercase',
        boxShadow: '0 10px 0 rgba(10,6,2,0.9), 0 20px 40px rgba(0,0,0,0.35)',
        transform: `scale(${s * (1 - out)}) rotate(${interpolate(s, [0, 1], [-14, -4])}deg)`,
      }}
    >
      {props.text}
    </div>
  );
};

export const BlooperTitle: React.FC<GProps> = ({dur, accent}) => {
  const {f, fps, out} = useAnim(dur);
  const s = spring({frame: f, fps, config: {damping: 9, stiffness: 220}});
  return (
    <div style={{opacity: 1 - out, transform: `scale(${interpolate(s, [0, 1], [1.6, 1])}) rotate(-3deg)`, transformOrigin: 'left center'}}>
      <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 26, letterSpacing: 6, color: accent}}>TASTY TUESDAY</div>
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 132, lineHeight: 0.95, letterSpacing: -5, color: C.white, WebkitTextStroke: '12px rgba(10,6,2,0.9)', paintOrder: 'stroke fill'}}>BLOOPERS</div>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 54, color: C.cream, textShadow: '0 4px 18px rgba(0,0,0,0.85)'}}>di sebalik live</div>
    </div>
  );
};

export const GRAPHICS: Record<string, React.FC<GProps>> = {
  menutag: MenuTag,
  sticker: Sticker,
  bloopertitle: BlooperTitle,
  hook: Hook,
  title: Title,
  chip: Chip,
  step: Step,
  tip: Tip,
  stat: Stat,
  reveal: Reveal,
  quote: Quote,
  cta: Cta,
};
