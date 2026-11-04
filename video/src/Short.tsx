import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Footage, Voice, faceBox, pieceAt} from './components/Footage';
import {Captions, zones} from './components/Captions';
import {GRAPHICS} from './components/Graphics';
import {Music, SfxTrack} from './components/AudioBed';
import {C, F, MENUS, Timeline, loadFonts} from './theme';

loadFonts();

const BIG = new Set(['hook', 'title', 'cta', 'bloopertitle']);

export const Short: React.FC<{data: Timeline; menuKey: string; preview?: boolean}> = ({data, menuKey, preview}) => {
  const accent = MENUS[menuKey].accent;
  const bigRanges = useMemo(
    () => data.overlays.filter((o) => BIG.has(o.type)).map((o) => [o.frm, o.frm + o.dur] as [number, number]),
    [data],
  );
  const hidden = (f: number) => bigRanges.some(([a, b]) => f >= a && f < b);
  return (
    <AbsoluteFill style={{backgroundColor: C.ink}}>
      <Footage pieces={data.pieces} />
      {data.overlays.map((o, i) => {
        const G = GRAPHICS[o.type];
        if (!G) return null;
        const p = pieceAt(data.pieces, o.frm);
        const fb = faceBox(p);
        let style: React.CSSProperties;
        let top: number | undefined;
        let bottom: number | undefined;
        let bandH = 300;
        if (BIG.has(o.type)) {
          const faceCenter = fb ? (fb.y0 + fb.y1) / 2 : 1300;
          const low = faceCenter < 900;
          bandH = o.type === 'cta' ? 260 : 520;
          if (o.type === 'cta') top = low ? 1180 : 300;
          else if (low) bottom = 1920 - 1480;
          else top = 250;
        } else {
          const z = zones(p);
          top = z.ov === 'top' ? 250 : 1000;
          if (z.cap < 900) top = 1060;
        }
        const y0 = top ?? 1480 - bandH;
        const y1 = y0 + bandH;
        // keep graphics off the face horizontally when the band crosses it
        let align: 'left' | 'right' = 'left';
        let lr: React.CSSProperties = {left: 70, right: 140};
        if (o.props.align) align = o.props.align;
        else if (fb && fb.y1 > y0 && fb.y0 < y1 && o.type !== 'cta') align = fb.cx < 540 ? 'right' : 'left';
        if (align === 'right') lr = {left: fb ? Math.max(70, Math.min(420, fb.x1 + 20)) : 220, right: 140};
        else if (fb && fb.y1 > y0 && fb.y0 < y1 && o.type !== 'cta') lr = {left: 70, right: Math.max(140, Math.min(560, 1080 - fb.x0 + 20))};
        style = {...lr, ...(top !== undefined ? {top} : {bottom}), display: 'flex', flexDirection: 'column', alignItems: o.type === 'cta' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'};
        return (
          <Sequence key={i} from={o.frm} durationInFrames={o.dur} layout="none">
            <div style={{position: 'absolute', ...style}}>
              <G props={o.props} dur={o.dur} accent={accent} align={align} />
            </div>
          </Sequence>
        );
      })}
      <Captions caps={data.captions} pieces={data.pieces} accent={accent} hidden={hidden} />
      {preview && <PreviewBug />}
      <Voice pieces={data.pieces} />
      <Music src={data.music} speech={data.speech} total={data.total} />
      <SfxTrack sfx={data.sfx} />
    </AbsoluteFill>
  );
};

const Progress: React.FC<{total: number; accent: string}> = ({total, accent}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 0, top: 0, height: 7, width: `${(f / total) * 100}%`, background: accent, opacity: 0.9}} />
  );
};

export const PreviewBug: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: 'absolute',
        right: 24,
        top: 24,
        padding: '6px 14px',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.55)',
        color: 'rgba(255,255,255,0.8)',
        fontFamily: F.wide,
        fontWeight: 800,
        fontSize: 20,
        letterSpacing: 3,
        opacity: interpolate(f % 60, [0, 30, 60], [0.9, 0.6, 0.9]),
      }}
    >
      PREVIEW
    </div>
  );
};
