import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT_BOLD, FONT_MARKER, SAFE, SAFE_W, W, H, outline} from '../lib/theme';
import type {Focus} from '../lib/types';
import {FramedVideo} from './ShotView';

const Backdrop: React.FC<{k: number}> = ({k}) => (
  <AbsoluteFill
    style={{
      backdropFilter: `blur(${(16 * k).toFixed(1)}px)`,
      backgroundColor: `rgba(26,20,16,${(0.55 * k).toFixed(2)})`,
    }}
  />
);

const Card: React.FC<{
  src: string;
  from: number;
  rate?: number;
  focus?: Focus;
  w: number;
  h: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({src, from, rate, focus, w, h, children, style}) => {
  const scale = w / W;
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        borderRadius: 34,
        border: `8px solid ${C.cream}`,
        boxShadow: `0 0 0 6px ${C.ink}, 0 24px 40px rgba(0,0,0,0.5)`,
        overflow: 'hidden',
        backgroundColor: '#000',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: (h - H * scale) / 2,
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <FramedVideo src={src} from={from} rate={rate} focus={focus ?? {s: 1.25, x: 0.5, y: 0.5}} />
      </div>
      {children}
    </div>
  );
};

export const EndNext: React.FC<{
  nextEp: number;
  nextTitle: string;
  peek: {src: string; from: number; rate?: number; focus?: Focus};
  durFrames: number;
}> = ({nextEp, nextTitle, peek, durFrames}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const t1 = spring({frame: f - 2, fps, config: {damping: 11, stiffness: 160}});
  const card = spring({frame: f - 8, fps, config: {damping: 13, stiffness: 120}});
  const cta = spring({frame: f - 22, fps, config: {damping: 12, stiffness: 160}});
  const pulse = 1 + 0.04 * Math.sin((f / fps) * Math.PI * 3);
  const dots = '.'.repeat(1 + (Math.floor(f / 6) % 3));
  const cardW = 560;
  const cardH = 700;
  return (
    <AbsoluteFill>
      <Backdrop k={k} />
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          width: SAFE_W,
          top: SAFE.top + 40,
          textAlign: 'center',
          fontFamily: FONT_MARKER,
          fontSize: 104,
          color: C.mustard,
          textShadow: outline(7),
          transform: `scale(${t1}) rotate(${-4 + (1 - t1) * -10}deg)`,
        }}
      >
        Bersambung{dots}
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left + (SAFE_W - cardW) / 2,
          top: SAFE.top + 230,
          transform: `translateY(${(1 - card) * 900}px) rotate(${3 - card * 1}deg)`,
        }}
      >
        <Card src={peek.src} from={peek.from} rate={peek.rate} focus={peek.focus} w={cardW} h={cardH}>
          <div
            style={{
              position: 'absolute',
              left: 22,
              top: 22,
              padding: '8px 22px',
              borderRadius: 16,
              backgroundColor: C.tomato,
              border: `5px solid ${C.ink}`,
              fontFamily: FONT_BOLD,
              fontWeight: 900,
              fontSize: 46,
              color: C.white,
            }}
          >
            EP {nextEp}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '70px 26px 24px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              fontFamily: FONT_BOLD,
              fontWeight: 900,
              fontSize: 50,
              lineHeight: 1.1,
              color: C.white,
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}
          >
            {nextTitle}
          </div>
        </Card>
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          width: SAFE_W,
          top: SAFE.bottom - 120,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${cta * pulse})`,
        }}
      >
        <div
          style={{
            padding: '18px 38px',
            borderRadius: 60,
            backgroundColor: C.mustard,
            border: `6px solid ${C.ink}`,
            boxShadow: `0 8px 0 ${C.ink}`,
            fontFamily: FONT_BOLD,
            fontWeight: 900,
            fontSize: 48,
            color: C.ink,
            whiteSpace: 'nowrap',
          }}
        >
          Follow, jangan terlepas!
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Finale: React.FC<{
  tiles: {src: string; from: number; rate?: number; label: string; focus?: Focus}[];
  durFrames: number;
}> = ({tiles}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const k = interpolate(f, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const t1 = spring({frame: f - 2, fps, config: {damping: 11, stiffness: 160}});
  const cta = spring({frame: f - 30, fps, config: {damping: 12, stiffness: 160}});
  const pulse = 1 + 0.04 * Math.sin((f / fps) * Math.PI * 3);
  const tw = 262;
  const th = 520;
  return (
    <AbsoluteFill>
      <Backdrop k={k} />
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          width: SAFE_W,
          top: SAFE.top + 20,
          textAlign: 'center',
          transform: `scale(${t1})`,
        }}
      >
        <div style={{fontFamily: FONT_BOLD, fontWeight: 900, fontSize: 84, color: C.white, textShadow: outline(7), lineHeight: 1.05}}>
          1 MALAM
        </div>
        <div
          style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '4px 28px 10px',
            backgroundColor: C.mustard,
            border: `6px solid ${C.ink}`,
            borderRadius: 18,
            boxShadow: `0 10px 0 ${C.ink}`,
            transform: 'rotate(-2deg)',
            fontFamily: FONT_BOLD,
            fontWeight: 900,
            fontSize: 84,
            color: C.ink,
          }}
        >
          3 MENU SIAP!
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          width: SAFE_W,
          top: SAFE.top + 330,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {tiles.map((t, i) => {
          const sp = spring({frame: f - 8 - i * 5, fps, config: {damping: 12, stiffness: 140}});
          return (
            <div key={i} style={{transform: `translateY(${(1 - sp) * 1000}px) rotate(${(i - 1) * 3}deg)`}}>
              <Card src={t.src} from={t.from} rate={t.rate} focus={t.focus} w={tw} h={th}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '50px 8px 16px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                    fontFamily: FONT_BOLD,
                    fontWeight: 900,
                    fontSize: 34,
                    color: C.white,
                    textAlign: 'center',
                  }}
                >
                  <span style={{color: C.mustard}}>EP{i + 1}</span> {t.label}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          width: SAFE_W,
          top: SAFE.bottom - 140,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${cta * pulse})`,
        }}
      >
        <div
          style={{
            padding: '16px 34px',
            borderRadius: 60,
            backgroundColor: C.tomato,
            border: `6px solid ${C.ink}`,
            boxShadow: `0 8px 0 ${C.ink}`,
            fontFamily: FONT_BOLD,
            fontWeight: 900,
            fontSize: 44,
            color: C.white,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Komen “NAK” untuk siri baru!
        </div>
      </div>
    </AbsoluteFill>
  );
};
