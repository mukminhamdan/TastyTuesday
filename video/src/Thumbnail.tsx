import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {C, FONT_BOLD, FONT_MARKER, H, SAFE, SAFE_W, W, outline} from './lib/theme';

/**
 * Cover / thumbnail (1080x1920). Key text sits inside the centre 1:1 area
 * (y 420-1500) so it survives the TikTok / IG profile-grid crop (3:4 and 1:1),
 * and inside the TikTok/IG safe zone for the full-screen view.
 */
export type ThumbProps = {
  bg: string;
  kicker: string;
  title: string;
  sticker: string;
  brand: string;
  chips?: string[];
  /** background zoom + focus */
  zoom?: {s: number; x: number; y: number};
  /** y of the kicker/title block (default 440) and of the chips row (default 1250) */
  titleTop?: number;
  chipsTop?: number;
  /** CSS filter on the background photo */
  filter?: string;
  /** title font size (default 150; lower it for long titles) */
  titleSize?: number;
};

export const Thumbnail: React.FC<ThumbProps> = ({bg, kicker, title, sticker, brand, chips, zoom = {s: 1.08, x: 0.5, y: 0.5}, titleTop = 440, chipsTop = 1250, filter = 'saturate(1.15) contrast(1.08) brightness(1.03)', titleSize = 150}) => (
  <AbsoluteFill style={{backgroundColor: C.ink}}>
    <Img
      src={staticFile(bg)}
      style={{
        width: W,
        height: H,
        objectFit: 'cover',
        transformOrigin: `${zoom.x * 100}% ${zoom.y * 100}%`,
        transform: `scale(${zoom.s})`,
        filter,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 22%, rgba(0,0,0,0.05) 48%, rgba(0,0,0,0.05) 62%, rgba(0,0,0,0.55) 100%)',
      }}
    />

    {/* brand badge */}
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        top: SAFE.top,
        height: 64,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        borderRadius: 16,
        border: `4px solid ${C.ink}`,
        backgroundColor: C.tomato,
        fontFamily: FONT_BOLD,
        fontWeight: 900,
        fontSize: 32,
        letterSpacing: 1,
        color: C.white,
      }}
    >
      {brand}
    </div>

    {/* title block, centred in the grid-safe band */}
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        width: SAFE_W,
        top: titleTop,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_MARKER,
          fontSize: 110,
          color: C.mustard,
          textShadow: outline(7),
          transform: 'rotate(-5deg)',
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: FONT_BOLD,
          fontWeight: 900,
          fontSize: titleSize,
          lineHeight: 0.98,
          letterSpacing: -3,
          color: C.white,
          textAlign: 'center',
          textShadow: outline(9, C.ink, 0.7),
          whiteSpace: 'pre-line',
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 26,
          padding: '8px 40px 14px',
          backgroundColor: C.mustard,
          border: `7px solid ${C.ink}`,
          borderRadius: 22,
          boxShadow: `0 12px 0 ${C.ink}`,
          transform: 'rotate(-3deg)',
          fontFamily: FONT_BOLD,
          fontWeight: 900,
          fontSize: 84,
          color: C.ink,
          whiteSpace: 'nowrap',
        }}
      >
        {sticker}
      </div>
    </div>

    {/* optional ingredient chips, lower band (still inside the 1:1 crop) */}
    {chips && chips.length ? (
      <div
        style={{
          position: 'absolute',
          left: SAFE.left,
          width: SAFE_W,
          top: chipsTop,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        {chips.map((c, i) => (
          <div
            key={i}
            style={{
              padding: '10px 24px',
              backgroundColor: C.cream,
              border: `5px solid ${C.ink}`,
              borderRadius: 18,
              boxShadow: `0 7px 0 ${C.ink}`,
              fontFamily: FONT_BOLD,
              fontWeight: 800,
              fontSize: 44,
              color: C.ink,
              whiteSpace: 'nowrap',
              transform: `rotate(${(i % 2 ? 1.5 : -1.5)}deg)`,
            }}
          >
            {c}
          </div>
        ))}
      </div>
    ) : null}
  </AbsoluteFill>
);
