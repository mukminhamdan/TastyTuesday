import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {Word} from '../lib/types';
import {C, F, SAFE} from '../lib/theme';

type Page = {words: Word[]; t: number; e: number};

const MAX_CHARS = 16;
const MAX_WORDS = 3;

export const paginate = (words: Word[]): Page[] => {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) pages.push({words: cur, t: cur[0].t, e: cur[cur.length - 1].e});
    cur = [];
  };
  for (const w of words) {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    const gap = prev ? w.t - prev.e : 0;
    if (cur.length && (cur.length >= MAX_WORDS || chars > MAX_CHARS || gap > 0.35 || w.emph || prev?.emph || /[.?!,]$/.test(prev.w))) flush();
    cur.push(w);
  }
  flush();
  // keep pages on screen until the next one starts (max +0.6s)
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].e = Math.min(next ? next.t : pages[i].e + 0.6, pages[i].e + 0.6);
  }
  return pages;
};

const clean = (s: string) => s.replace(/[.,!?]+$/g, '');

const PageView: React.FC<{page: Page}> = ({page}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const now = page.t + f / fps;
  const life = page.e - page.t;
  const outK = interpolate(now, [page.e - 0.08, page.e], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const single = page.words.length === 1 && page.words[0].emph;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'baseline',
        gap: '0 30px',
        maxWidth: SAFE.right - SAFE.left - 40,
        opacity: outK,
        transform: `translateY(${(1 - outK) * -12}px)`,
      }}
    >
      {page.words.map((w, i) => {
        const appear = (w.t - page.t) * fps;
        const s = spring({frame: f - appear + 3, fps, config: {damping: 14, mass: 0.5, stiffness: 220}});
        const active = now >= w.t && now < w.e + 0.05;
        const pastOrActive = now >= w.t - 0.02;
        const blur = interpolate(s, [0, 1], [8, 0]);
        const base: React.CSSProperties = {
          display: 'inline-block',
          opacity: pastOrActive || life < 0.6 ? interpolate(s, [0, 1], [0, 1]) : 0.0,
          transform: `translateY(${interpolate(s, [0, 1], [26, 0])}px) scale(${active ? 1.04 : 1})`,
          filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
          textShadow: '0 2px 3px rgba(0,0,0,0.65), 0 4px 0 rgba(0,0,0,0.25), 0 8px 28px rgba(0,0,0,0.55)',
          WebkitTextStroke: '1.5px rgba(0,0,0,0.35)',
          paintOrder: 'stroke fill',
          willChange: 'transform',
        };
        if (w.emph) {
          return (
            <span
              key={i}
              style={{
                ...base,
                fontFamily: F.serif,
                fontStyle: 'italic',
                fontSize: single ? 150 : 104,
                lineHeight: 0.95,
                letterSpacing: '-0.01em',
                color: C.butter,
              }}
            >
              {clean(w.w).toLowerCase()}
            </span>
          );
        }
        return (
          <span
            key={i}
            style={{
              ...base,
              fontFamily: F.display,
              fontWeight: 800,
              fontStretch: '112%',
              fontSize: 76,
              lineHeight: 1.04,
              letterSpacing: '-0.015em',
              textTransform: 'uppercase',
              color: active ? C.butter : C.paper,
            }}
          >
            {clean(w.w)}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC<{words: Word[]; y: number}> = ({words, y}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pages = useMemo(() => paginate(words), [words]);
  const t = f / fps;
  const page = pages.find((p) => t >= p.t - 0.02 && t < p.e);
  if (!page) return null;
  const from = Math.round(page.t * fps);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: SAFE.left, width: SAFE.right - SAFE.left, top: y, display: 'flex', justifyContent: 'center'}}>
        <Sequence from={from} layout="none" key={from}>
          <PageView page={page} />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

export const easeOut = Easing.out(Easing.cubic);
