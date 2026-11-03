import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame} from 'remotion';
import {Footage, Voice, faceBox, pieceAt} from './components/Footage';
import {Captions, zones} from './components/Captions';
import {GRAPHICS} from './components/Graphics';
import {Music, SfxTrack} from './components/AudioBed';
import {C, F, MENUS, Timeline, loadFonts} from './theme';

loadFonts();

const BIG = new Set(['hook', 'title', 'cta']);

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
        let style: React.CSSProperties;
        if (BIG.has(o.type)) {
          const fb = faceBox(p);
          const faceCenter = fb ? (fb.y0 + fb.y1) / 2 : 1300;
          const bottom = faceCenter < 900;
          style =
            o.type === 'cta'
              ? {left: 70, right: 140, top: bottom ? 1180 : 300}
              : bottom
                ? {left: 70, right: 140, bottom: 1920 - 1480}
                : {left: 70, right: 140, top: 250};
        } else {
          const z = zones(p);
          style = z.ov === 'top' ? {left: 70, right: 140, top: 250} : {left: 70, right: 140, top: 1000};
          if (z.cap < 900) style = {left: 70, right: 140, top: 1060};
        }
        return (
          <Sequence key={i} from={o.frm} durationInFrames={o.dur} layout="none">
            <div style={{position: 'absolute', ...style}}>
              <G props={o.props} dur={o.dur} accent={accent} />
            </div>
          </Sequence>
        );
      })}
      <Captions caps={data.captions} pieces={data.pieces} accent={accent} hidden={hidden} />
      <Progress total={data.total} accent={accent} />
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
