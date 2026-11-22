/** Channel brand shown on the badge of every new standalone video. */
export const BRAND = 'MUKMIN MASAK';

/**
 * Saved music library for new videos (CC0, instrumental). Chosen by the cook.
 * `start` skips the quiet intro so the hook lands on an energetic part.
 */
/**
 * Saved music library for new videos (CC0, instrumental, chosen by the cook).
 * `start` skips a quiet intro; keep `start + video length <= safeUntil` (quiet break / ending after that).
 * Rotate between videos: A -> D -> 3 -> 4 -> 5 -> 6 (5 only fits videos up to ~37 s).
 */
export const MUSIC = {
  /** A: ukulele + gitar ceria, ~99 BPM, steady. Quiet break at 96-115 s. */
  ukuleleCeria: {file: 'ukulele-ceria.wav', start: 1, safeUntil: 95},
  /** D: ukulele pop-folk gaya iklan, ~89 BPM, builds up */
  ukuleleIklan: {file: 'ukulele-iklan.wav', start: 25, safeUntil: 138},
  /** 3: ukulele + gitar + perkusi, riang, steady to the end */
  ukuleleRiang: {file: 'ukulele-riang.wav', start: 1, safeUntil: 165},
  /** 4 (W): ukulele + gitar akustik, gaya folk. Quiet 0-6 s and 131-147 s. */
  ukuleleFolk: {file: 'ukulele-folk.wav', start: 8, safeUntil: 130},
  /** 5 (X): ukulele + siulan + tepukan, very upbeat but short: energetic 2-39 s only */
  ukuleleSiulTepuk: {file: 'ukulele-siul-tepuk.wav', start: 2, safeUntil: 39},
  /** 6 (Z): ukulele + siulan (also used in the old telur dadar video). Small dips 7-14 s. */
  ukuleleSiulan: {file: 'ukulele-siulan.wav', start: 15, safeUntil: 118},
} as const;

/** Colour looks applied to footage (CSS filter). `warm` = food-friendly, a bit punchier and golden. */
export const LOOKS = {
  default: 'saturate(1.14) contrast(1.06) brightness(1.02)',
  warm: 'saturate(1.24) contrast(1.1) brightness(1.04) sepia(0.08)',
} as const;
export type Look = keyof typeof LOOKS;

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
