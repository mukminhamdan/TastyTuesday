import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Footage, Voice, faceBox, pieceAt} from './components/Footage';
import {zones} from './components/Captions';
import {CLEAN_GRAPHICS, CleanCaptions, StepProgress} from './components/Clean';
import {Music, SfxTrack} from './components/AudioBed';
import {PreviewBug} from './Short';
import {C, MENUS, Timeline, loadFonts} from './theme';

loadFonts();

const HIDE_CAPS = new Set(['hook', 'cta']);

/** v2 menu shorts: "clean recipe" look (see components/Clean.tsx). */
export const ShortClean: React.FC<{data: Timeline; menuKey: string; preview?: boolean}> = ({data, menuKey, preview}) => {
  const m = MENUS[menuKey];
  const accent = m.accent;
  const kicker = `Menu ${String(m.n).padStart(2, '0')} · ${m.menu}`;
  const steps = data.overlays.filter((o) => o.type === 'cstep' && o.props.n).length;
  const hideRanges = useMemo(
    () => data.overlays.filter((o) => HIDE_CAPS.has(o.type)).map((o) => [o.frm, o.frm + o.dur] as [number, number]),
    [data],
  );
  const hidden = (f: number) => hideRanges.some(([a, b]) => f >= a && f < b);
  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <Footage pieces={data.pieces} look="clean" />
      {/* soft scrims keep type legible without boxes */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 17%, rgba(0,0,0,0) 34%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.34) 70%, rgba(0,0,0,0.34) 80%, rgba(0,0,0,0.1) 100%)'}} />
      <StepProgress overlays={data.overlays} accent={accent} total={data.total} />
      {data.overlays.map((o, i) => {
        const G = CLEAN_GRAPHICS[o.type];
        if (!G) return null;
        const p = pieceAt(data.pieces, o.frm);
        const fb = faceBox(p);
        let pos: React.CSSProperties = {left: 70, right: 140};
        let align: 'left' | 'right' = 'left';
        let narrow = false;
        if (o.type === 'cta') {
          return (
            <Sequence key={i} from={o.frm} durationInFrames={o.dur} layout="none">
              <G props={o.props} dur={o.dur} accent={accent} />
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
          const z = zones(p);
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
              <G props={o.props} dur={o.dur} accent={accent} align={align} extra={{kicker, steps, narrow}} />
            </div>
          </Sequence>
        );
      })}
      <CleanCaptions caps={data.captions} pieces={data.pieces} hidden={hidden} />
      {preview && <PreviewBug />}
      <Voice pieces={data.pieces} />
      <Music src={data.music} speech={data.speech} total={data.total} under={0.12} open={0.32} />
      <SfxTrack sfx={data.sfx} />
    </AbsoluteFill>
  );
};
