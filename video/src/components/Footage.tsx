import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, getInputProps, interpolate, staticFile, useCurrentFrame} from 'remotion';

// `--props='{"lo":true}'` renders previews from the 540px proxy (4x faster)
const PROXY = (getInputProps() as {lo?: boolean}).lo ? 'media/proxy_lo.mp4' : 'media/proxy.mp4';
import {Piece} from '../theme';

export const FW = 1080; // short frame width
export const FH = 1920; // short frame height
const PW = 1080; // proxy width
const PH = 2808; // proxy height
const FACE_TARGET_Y = 0.417;

export const pieceTransform = (p: Piece, local: number) => {
  const prog = p.dur > 1 ? local / (p.dur - 1) : 0;
  const z = p.zoom * (1 + p.push * prog);
  const vw = PW * z;
  const vh = PH * z;
  let left: number;
  let top: number;
  if (p.face) {
    left = Math.min(0, Math.max(FW - vw, FW / 2 - p.face.x * vw));
    top = Math.min(0, Math.max(FH - vh, FH * FACE_TARGET_Y - p.face.y * vh));
  } else {
    left = (FW - vw) / 2;
    top = (FH - vh) / 2 + vh * 0.04;
    top = Math.min(0, Math.max(FH - vh, top));
  }
  return {z, vw, vh, left, top};
};

/** Face box in frame coordinates for a piece (or null). */
export const faceBox = (p: Piece | undefined) => {
  if (!p || !p.face) return null;
  const t = pieceTransform(p, 0);
  const cy = t.top + p.face.y * t.vh;
  const hh = (p.face.h * t.vh) / 2;
  // extend down a little: chin / hands / food in front of the face
  const cx = t.left + p.face.x * t.vw;
  const hw = (p.face.w * t.vw) / 2;
  return {y0: cy - hh * 1.35, y1: cy + hh * 1.6, x0: cx - hw * 1.5, x1: cx + hw * 1.5, cx};
};

export const pieceAt = (pieces: Piece[], f: number) => {
  let lo = 0;
  let hi = pieces.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const p = pieces[m];
    if (f < p.frm) hi = m - 1;
    else if (f >= p.frm + p.dur) lo = m + 1;
    else return p;
  }
  return pieces[Math.max(0, Math.min(pieces.length - 1, lo))];
};

const PieceVideo: React.FC<{p: Piece; enter: boolean}> = ({p, enter}) => {
  const f = useCurrentFrame();
  const t = pieceTransform(p, f);
  const blur = enter ? interpolate(f, [0, 5], [10, 0], {extrapolateRight: 'clamp'}) : 0;
  const kick = enter ? interpolate(f, [0, 6], [1.07, 1], {extrapolateRight: 'clamp'}) : 1;
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <div
        style={{
          position: 'absolute',
          left: t.left,
          top: t.top,
          width: t.vw,
          height: t.vh,
          transform: `scale(${kick})`,
          transformOrigin: '50% 40%',
          filter: `saturate(1.12) contrast(1.06) brightness(1.02)${blur ? ` blur(${blur}px)` : ''}`,
        }}
      >
        <OffthreadVideo
          src={staticFile(PROXY)}
          trimBefore={Math.round((p.vsrc ?? p.src) * 30)}
          muted
          style={{width: '100%', height: '100%'}}
          pauseWhenBuffering
        />
      </div>
    </AbsoluteFill>
  );
};

export const Footage: React.FC<{pieces: Piece[]}> = ({pieces}) => {
  return (
    <AbsoluteFill>
      {pieces.map((p, i) => {
        const prev = pieces[i - 1];
        const enter = !!prev && prev.clip !== p.clip && Math.abs(prev.src + prev.dur / 30 - p.src) > 30;
        return (
          <Sequence key={i} from={p.frm} durationInFrames={p.dur} layout="none">
            <PieceVideo p={p} enter={enter} />
          </Sequence>
        );
      })}
      <Grade />
    </AbsoluteFill>
  );
};

export const Voice: React.FC<{pieces: Piece[]}> = ({pieces}) => (
  <>
    {pieces.map((p, i) => (
      <Sequence key={i} from={p.frm} durationInFrames={p.dur} layout="none">
        <Audio
          src={staticFile('media/voice.wav')}
          trimBefore={Math.round(p.src * 30)}
          volume={(f) => (f < 1 || f > p.dur - 2 ? 0.55 : 1)}
        />
      </Sequence>
    ))}
  </>
);

/** Warm cinematic grade: vignette + film grain. */
export const Grade: React.FC = () => {
  const f = useCurrentFrame();
  const ox = (f * 37) % 256;
  const oy = (f * 91) % 256;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 42%, rgba(0,0,0,0) 55%, rgba(10,6,2,0.42) 100%)',
        }}
      />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(255,170,90,0.05), rgba(0,0,0,0) 40%, rgba(40,20,0,0.08))', mixBlendMode: 'soft-light'}} />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('noise.png')})`,
          backgroundPosition: `${ox}px ${oy}px`,
          opacity: 0.07,
          mixBlendMode: 'overlay',
        }}
      />
      <Img src={staticFile('noise.png')} style={{display: 'none'}} />
    </AbsoluteFill>
  );
};
