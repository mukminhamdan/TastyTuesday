export const FPS = 30;
export const W = 1080;
export const H = 1920;

/**
 * Safe zone that works for both TikTok and Instagram Reels (1080x1920).
 * - top 250px: status bar, "Following | For You" tabs, Reels camera icon
 * - bottom 440px: caption, username, music ticker, nav bar
 * - right 160px: like / comment / share / profile column
 * - left 80px: breathing room
 */
export const SAFE = {
  left: 80,
  right: W - 160,
  top: 250,
  bottom: H - 440,
} as const;
export const SAFE_W = SAFE.right - SAFE.left;

export const C = {
  tomato: '#FF4D2E',
  mustard: '#FFC93C',
  cream: '#FFF6E5',
  ink: '#1A1410',
  basil: '#3FAE5A',
  white: '#FFFFFF',
};

export const FONT_BOLD = 'Poppins';
export const FONT_MARKER = 'PermanentMarker';

/** Text outline made from stacked shadows (works on any text in Chromium). */
export const outline = (w: number, color = C.ink, drop = 0.6) => {
  const s: string[] = [];
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    s.push(`${(Math.cos(t) * w).toFixed(1)}px ${(Math.sin(t) * w).toFixed(1)}px 0 ${color}`);
  }
  s.push(`0 ${w + 4}px ${w * 2}px rgba(0,0,0,${drop})`);
  return s.join(',');
};
