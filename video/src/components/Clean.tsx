/**
 * "Clean recipe" graphic layer for the v2 menu shorts: editorial serif type,
 * sentence-case captions, numbered recipe steps with a slim progress bar and
 * at most two facts per video. No boxes, stickers, punch-ins or whips.
 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Caption, F, Overlay, Piece} from '../theme';
import {pieceAt} from './Footage';
import {zones} from './Captions';

export const CREAM = '#FFF6EA';
const WARM = '#FFE3A3';
const SHADOW = '0 2px 22px rgba(0,0,0,0.62), 0 1px 4px rgba(0,0,0,0.5)';

type CP = {props: Record<string, any>; dur: number; accent: string; align?: 'left' | 'right'; extra?: Record<string, any>};

const fade = (f: number, dur: number, inn = 8, out = 8) =>
  Math.min(
    interpolate(f, [0, inn], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}),
    interpolate(f, [dur - out, dur - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );

const rise = (f: number, delay = 0, px = 22) =>
  interpolate(f - delay, [0, 12], [px, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

const Kicker: React.FC<{text: string; accent: string; align?: 'left' | 'right' | 'center'; line?: boolean}> = ({text, accent, align = 'left', line = true}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
      gap: 16,
      fontFamily: F.wide,
      fontWeight: 800,
      fontSize: 25,
      letterSpacing: 5,
      textTransform: 'uppercase',
      color: CREAM,
      textShadow: SHADOW,
    }}
  >
    {line && <div style={{width: 44, height: 3, borderRadius: 2, background: accent, boxShadow: SHADOW}} />}
    <span>{text}</span>
  </div>
);

/* ------------------------------------------------------------------ HOOK */
export const CleanHook: React.FC<CP> = ({props, dur, accent, align, extra}) => {
  const f = useCurrentFrame();
  const words: string[] = String(props.text).split(' ');
  const len = String(props.text).length;
  const narrow = align === 'right' || extra?.narrow;
  const size = Math.min(len <= 14 ? 136 : len <= 22 ? 108 : len <= 26 ? 118 : 104, narrow ? 104 : 999); // short lines stay on one line
  const ta = align === 'right' ? 'right' : 'left';
  return (
    <div style={{opacity: interpolate(f, [dur - 8, dur - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), textAlign: ta}}>
      <Kicker text={narrow ? extra?.kickerShort ?? '' : extra?.kicker ?? ''} accent={accent} align={ta} />
      <div
        style={{
          marginTop: 18,
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: size,
          lineHeight: 0.98,
          letterSpacing: -1,
          color: CREAM,
          textShadow: SHADOW,
        }}
      >
        {words.map((w, i) => {
          const d = 3 + i * 3;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: i < words.length - 1 ? '0.22em' : 0,
                // readable on frame 0 (feed autoplay / cover); words just settle into place
                transform: `translateY(${rise(f, d - 3, 14)}px)`,
                filter: `blur(${interpolate(f - d, [-3, 6], [1.2, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      {props.sub && !extra?.noSub && (
        <div
          style={{
            marginTop: 16,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 32,
            color: CREAM,
            opacity: 0.9,
            textShadow: SHADOW,
            whiteSpace: 'nowrap',
          }}
        >
          {props.sub}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ MENU TITLE */
export const CleanTitle: React.FC<CP> = ({props, dur, accent}) => {
  const f = useCurrentFrame();
  return (
    <div style={{opacity: fade(f, dur, 8, 8), transform: `translateX(${-rise(f, 0, 18)}px)`}}>
      <Kicker text={`Mode ${props.mode}`} accent={accent} />
      <div style={{marginTop: 10, fontFamily: F.serif, fontStyle: 'italic', fontSize: 84, lineHeight: 1, color: CREAM, textShadow: SHADOW}}>
        {props.menu}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ RECIPE STEP */
export const CleanStep: React.FC<CP> = ({props, dur, accent, extra}) => {
  const f = useCurrentFrame();
  const done = !props.n;
  const total = extra?.steps ?? 3;
  // settle: full size on entry, then shrinks to a quiet label for the rest of the step
  const settle = interpolate(f, [70, 84], [1, 0.74], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return (
    <div style={{opacity: fade(f, dur, 8, 6), transform: `scale(${settle})`, transformOrigin: '0% 0%'}}>
      <Kicker text={done ? '✓  Siap' : `Langkah ${props.n} / ${total}`} accent={accent} />
      <div
        style={{
          marginTop: 10,
          fontFamily: F.serif,
          fontStyle: 'italic',
          fontSize: 66,
          lineHeight: 1.02,
          color: CREAM,
          textShadow: SHADOW,
          maxWidth: 820,
          transform: `translateY(${rise(f, 2, 18)}px)`,
          opacity: interpolate(f, [2, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        {props.text}
      </div>
    </div>
  );
};

/** Slim segmented progress bar for the recipe steps (top of frame, inside the safe area). */
export const StepProgress: React.FC<{overlays: Overlay[]; accent: string; total: number}> = ({overlays, accent, total}) => {
  const f = useCurrentFrame();
  const steps = overlays.filter((o) => o.type === 'cstep');
  const numbered = steps.filter((o) => o.props.n);
  if (!numbered.length) return null;
  const start = steps[0].frm;
  const ctaF = Math.min(total, ...overlays.filter((o) => o.type === 'cta').map((o) => o.frm));
  const op = Math.min(
    interpolate(f, [start - 10, start], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    interpolate(f, [ctaF - 8, ctaF], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  if (op <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top: 244, display: 'flex', gap: 10, opacity: op}}>
      {numbered.map((s, i) => {
        const end = s.frm + s.dur;
        const p = interpolate(f, [s.frm, end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div key={i} style={{flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,246,234,0.28)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.25)'}}>
            <div style={{width: `${p * 100}%`, height: '100%', background: i === numbered.length - 1 && p >= 1 ? CREAM : accent, borderRadius: 3}} />
          </div>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ FACT */
export const CleanNote: React.FC<CP> = ({props, dur, accent, align}) => {
  const f = useCurrentFrame();
  const ta = align === 'right' ? 'right' : 'left';
  return (
    <div style={{opacity: fade(f, dur, 6, 8), textAlign: ta}}>
      <div
        style={{
          fontFamily: F.serif,
          fontSize: 150,
          lineHeight: 0.9,
          color: CREAM,
          textShadow: SHADOW,
          transform: `translateY(${rise(f, 0, 30)}px)`,
          filter: `blur(${interpolate(f, [0, 8], [5, 0], {extrapolateRight: 'clamp'})}px)`,
          whiteSpace: 'nowrap',
        }}
      >
        {props.big}
      </div>
      <div style={{marginTop: 14, opacity: interpolate(f, [6, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        <Kicker text={props.label} accent={accent} align={ta} />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ CTA */
const CtaIcon: React.FC<{kind: 'comment' | 'follow'; color: string}> = ({kind, color}) => (
  <svg viewBox="0 0 24 24" style={{width: 46, height: 46, flexShrink: 0}} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'comment' ? (
      <path d="M4 5h16v11H9l-5 4z" />
    ) : (
      <>
        <circle cx="10" cy="8" r="4" />
        <path d="M3 20c0-3.5 3-6 7-6s7 2.5 7 6M19 8v6M16 11h6" />
      </>
    )}
  </svg>
);

export const CleanCta: React.FC<CP> = ({accent, extra}) => {
  const f = useCurrentFrame();
  const op = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const rows: [('comment' | 'follow'), string, number][] = [
    ['comment', 'Komen menu yang korang nak', 12],
    ['follow', 'Follow untuk resepi seterusnya', 18],
  ];
  return (
    <AbsoluteFill>
      {extra?.card ? (
        <div style={{position: 'absolute', left: extra.card.x, top: extra.card.y, width: extra.card.w, height: extra.card.h, borderRadius: extra.card.r, background: 'rgba(12,8,5,0.45)', opacity: op}} />
      ) : (
        <AbsoluteFill style={{background: 'rgba(12,8,5,0.45)', opacity: op}} />
      )}
      <div style={{position: 'absolute', top: extra?.top ?? 700, left: 70, right: 140, textAlign: 'center', opacity: op}}>
        <Kicker text="Suka resepi ni?" accent={accent} align="center" line={false} />
        <div
          style={{
            marginTop: 18,
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 126,
            lineHeight: 0.98,
            color: CREAM,
            textShadow: SHADOW,
            transform: `translateY(${rise(f, 2, 24)}px)`,
          }}
        >
          Komen & follow
        </div>
        <div style={{margin: '30px auto 0', width: 64, height: 3, borderRadius: 2, background: accent}} />
        <div style={{marginTop: 30, display: 'inline-flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start'}}>
          {rows.map(([kind, text, d]) => (
            <div
              key={kind}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                fontFamily: F.sans,
                fontWeight: 600,
                fontSize: 36,
                color: CREAM,
                textShadow: SHADOW,
                opacity: interpolate(f - d, [0, 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
                transform: `translateY(${rise(f, d, 12)}px)`,
              }}
            >
              <CtaIcon kind={kind} color={CREAM} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CLEAN_GRAPHICS: Record<string, React.FC<CP>> = {
  hook: CleanHook,
  title: CleanTitle,
  cstep: CleanStep,
  cnote: CleanNote,
  cta: CleanCta,
};

/* ------------------------------------------------------------------ CAPTIONS */
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

export const CleanCaptions: React.FC<{caps: Caption[]; pieces: Piece[]; hidden?: (f: number) => boolean; capY?: (p: Piece | undefined) => number}> = ({caps, pieces, hidden, capY}) => {
  const f = useCurrentFrame();
  const c = capAt(caps, f);
  if (!c || (hidden && hidden(f))) return null;
  const local = f - c.frm;
  const z = capY ? {cap: capY(pieceAt(pieces, c.frm))} : zones(pieceAt(pieces, c.frm));
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        right: 150,
        top: z.cap,
        transform: `translateY(calc(-50% + ${interpolate(local, [0, 5], [8, 0], {extrapolateRight: 'clamp'})}px))`,
        opacity: interpolate(local, [0, 4], [0, 1], {extrapolateRight: 'clamp'}),
        textAlign: 'center',
        fontFamily: F.sans,
        fontWeight: 700,
        fontSize: 58,
        lineHeight: 1.12,
        letterSpacing: -0.5,
        color: '#FFFFFF',
        textShadow: SHADOW,
      }}
    >
      {c.words.map((w, i) => (
        <React.Fragment key={i}>
          {w.hl ? (
            <span style={{fontFamily: F.serif, fontStyle: 'italic', fontWeight: 400, fontSize: 70, color: WARM, letterSpacing: 0}}>{w.t}</span>
          ) : (
            <span>{w.t}</span>
          )}
          {i < c.words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </div>
  );
};
