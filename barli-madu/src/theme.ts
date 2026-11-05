import '@fontsource/montserrat/800.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/800.css';

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/**
 * Combined TikTok + Instagram Reels safe zone for 1080x1920.
 * Top: IG/TikTok header tabs. Bottom: caption, music, CTA bar.
 * Right: like/comment/share rail. Anything important stays inside.
 */
export const SAFE = {
  top: 220,
  bottom: 1440, // 480 px reserved at the bottom
  left: 64,
  right: 900, // 180 px reserved for the action rail
};
export const SAFE_CX = (SAFE.left + SAFE.right) / 2; // 482
export const SAFE_W = SAFE.right - SAFE.left; // 836

export const C = {
  honey: '#FFB800',
  honeyDeep: '#E08A00',
  amber: '#C8650A',
  cream: '#FFF6DE',
  barley: '#E9D3A1',
  brown: '#3A220E',
  ink: '#140B04',
  green: '#5BBF6A',
  white: '#FFFFFF',
};

export const FONT_TITLE = "'Montserrat', sans-serif";
export const FONT_BODY = "'Poppins', sans-serif";

export const textStroke = (px: number, color = C.ink) => ({
  WebkitTextStroke: `${px}px ${color}`,
  paintOrder: 'stroke fill' as const,
});
