import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Box, Footage, Voice, faceBox, pieceAt} from './components/Footage';
import {Piece} from './theme';
import {CLEAN_GRAPHICS, CleanCaptions, StepProgress} from './components/Clean';
import {Music, SfxTrack} from './components/AudioBed';
import {PreviewBug} from './Short';
import {C, MENUS, Timeline, loadFonts} from './theme';

loadFonts();

const HIDE_CAPS = new Set(['hook', 'cta']);

// every short gets its own background colour (scrims, tint, closing card): [r, g, b]
const TINT: Record<string, [number, number, number]> = {
  roll: [122, 46, 18], // terracotta
  wrap: [14, 77, 74], // teal
  puff: [107, 74, 18], // gold
  sambal: [94, 16, 35], // wine
  pizza: [18, 48, 90], // navy
};
const rgba = ([r, g, b]: [number, number, number], a: number) => `rgba(${r},${g},${b},${a})`;

// full frame, but framed higher on the chef so the food and the Cooven stay in shot
export const CARD: Box = {x: 0, y: 0, w: 1080, h: 1920, r: 0, ty: 0.3};

/** caption line for a shot: low in the card, or high when the face sits low */
const capY = (p: Piece | undefined) => {
  const fb = faceBox(p, CARD);
  if (fb && fb.y1 > 1290 && fb.y0 > 700) return 470;
  return 1385;
};

/** v2 menu shorts: "clean recipe" look (see components/Clean.tsx). */
export const ShortClean: React.FC<{data: Timeline; menuKey: string; preview?: boolean}> = ({data, menuKey, preview}) => {
  const m = MENUS[menuKey];
  const tint = TINT[menuKey] ?? [0, 0, 0];
  const accent = m.accent;
  // no show branding or chef names on the v2 shorts: just the menu and its mode
  const kicker = `${m.menu} · Mode ${m.mode}`;
  const kickerShort = m.menu;
  const steps = data.overlays.filter((o) => o.type === 'cstep' && o.props.n).length;
  const hideRanges = useMemo(
    () => data.overlays.filter((o) => HIDE_CAPS.has(o.type)).map((o) => [o.frm, o.frm + o.dur] as [number, number]),
    [data],
  );
  const hidden = (f: number) => hideRanges.some(([a, b]) => f >= a && f < b);
  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <Footage pieces={data.pieces} look="clean" box={CARD} />
      {/* soft scrims inside the card keep type legible without boxes */}
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          borderRadius: CARD.r,
          background: `linear-gradient(180deg, ${rgba(tint, 0.62)} 0%, ${rgba(tint, 0.34)} 17%, ${rgba(tint, 0)} 34%, ${rgba(tint, 0)} 56%, ${rgba(tint, 0.42)} 70%, ${rgba(tint, 0.42)} 80%, ${rgba(tint, 0.16)} 100%)`,
        }}
      />
      {/* light colour grade in the same hue, so each video reads as its own */}
      <AbsoluteFill style={{background: rgba(tint, 0.5), mixBlendMode: 'soft-light', opacity: 0.35}} />
      <StepProgress overlays={data.overlays} accent={accent} total={data.total} />
      {data.overlays.map((o, i) => {
        const G = CLEAN_GRAPHICS[o.type];
        if (!G) return null;
        const p = pieceAt(data.pieces, o.frm);
        const fb = faceBox(p, CARD);
        let pos: React.CSSProperties = {left: 70, right: 140};
        let align: 'left' | 'right' = 'left';
        let narrow = false;
        if (o.type === 'cta') {
          // block is ~400px tall: sit under the face, or above it when the face is low
          let top = 700;
          for (const q of data.pieces.filter((q) => q.frm + q.dur > o.frm && q.frm < o.frm + o.dur)) {
            const b = faceBox(q, CARD);
            if (!b) continue;
            top = (b.y0 + b.y1) / 2 < 1000 ? Math.max(top, Math.min(1090, b.y1 + 40)) : Math.min(top, Math.max(300, b.y0 - 440));
          }
          return (
            <Sequence key={i} from={o.frm} durationInFrames={o.dur} layout="none">
              <G props={o.props} dur={o.dur} accent={accent} extra={{top, card: CARD, tint: rgba(tint, 0.58)}} />
            </Sequence>
          );
        }
        let y0 = 280;
        let y1 = 480;
        if (o.type === 'hook') {
          const low = o.props.pos === 'low' || (fb ? (fb.y0 + fb.y1) / 2 < 900 : false);
          if (low) {
            pos = {...pos, bottom: 1920 - 1460};
            y0 = 1000;
            y1 = 1460;
          } else {
            pos = {...pos, top: 300};
            y0 = 300;
            y1 = 760;
          }
        } else if (o.type === 'cnote') {
          const z = {cap: capY(p)};
          if (z.cap < 900) {
            pos = {...pos, top: 1060};
            y0 = 1060;
            y1 = 1300;
          } else {
            pos = {...pos, bottom: 1920 - (z.cap - 110)};
            y0 = z.cap - 350;
            y1 = z.cap - 110;
          }
        } else {
          pos = {...pos, top: 282}; // title / recipe step, under the progress bar
        }
        if (o.type === 'hook' && o.props.align === 'right') {
          align = 'right';
          pos = {...pos, left: fb ? Math.max(70, Math.min(480, fb.x1 + 20)) : 440, right: 140};
          narrow = true;
        }
        // keep type off the face horizontally when its band crosses it
        else if (fb && fb.y1 > y0 && fb.y0 < y1 && o.type !== 'title' && o.type !== 'cstep') {
          if (fb.cx < 540) {
            align = 'right';
            pos = {...pos, left: Math.max(70, Math.min(480, fb.x1 + 20)), right: 140};
          } else {
            pos = {...pos, left: 70, right: Math.max(140, Math.min(560, 1080 - fb.x0 + 20))};
          }
          narrow = true;
        }
        return (
          <Sequence key={i} from={o.frm} durationInFrames={o.dur} layout="none">
            <div style={{position: 'absolute', ...pos}}>
              <G props={o.props} dur={o.dur} accent={accent} align={align} extra={{kicker, kickerShort, steps, narrow, noSub: true}} />
            </div>
          </Sequence>
        );
      })}
      <CleanCaptions caps={data.captions} pieces={data.pieces} hidden={hidden} capY={capY} />
      {preview && <PreviewBug />}
      <Voice pieces={data.pieces} />
      <Music src={data.music} speech={data.speech} total={data.total} under={0.1} open={0.3} />
      <SfxTrack sfx={data.sfx} />
    </AbsoluteFill>
  );
};
