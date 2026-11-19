export type Focus = {
  /** scale (1 = full frame) */
  s: number;
  /** focus point, 0..1 of frame width */
  x: number;
  /** focus point, 0..1 of frame height */
  y: number;
};

export type TitleLine = {
  t: string;
  /** sticker highlight (yellow block, dark text) */
  hl?: boolean;
  /** use the hand-written marker font */
  marker?: boolean;
  size?: number;
  color?: string;
};

export type Overlay =
  | {
      type: 'title';
      lines: TitleLine[];
      pos?: 'top' | 'bottom';
      at?: number;
      dur?: number;
    }
  | {type: 'step'; n: number; text: string; at?: number; dur?: number}
  | {type: 'speed'; label: string}
  | {
      type: 'label';
      text: string;
      /** screen position (px) of the label's centre */
      x: number;
      y: number;
      rotate?: number;
      at?: number;
      dur?: number;
      size?: number;
      /** optional arrow from the label to this point */
      arrowTo?: {x: number; y: number};
    }
  | {type: 'sparkles'; x: number; y: number; at: number; count?: number; spread?: number}
  | {type: 'circle'; x: number; y: number; rx: number; ry: number; at?: number; dur?: number}
  | {
      type: 'timer';
      /** real-world seconds elapsed at the start / end of this shot */
      fromSec: number;
      toSec: number;
      caption?: string;
    }
  | {
      type: 'endNext';
      /** big heading, default "Bersambung" */
      heading?: string;
      /** sticker on the peek card, e.g. "EP 2" or "NEXT" */
      nextEp: number | string;
      nextTitle: string;
      peek: {src: string; from: number; rate?: number; focus?: Focus};
      /** CTA pill text (default "Follow, jangan terlepas!"); \n for two lines */
      cta?: string;
    }
  | {
      /** full-screen ingredient card over a blurred shot */
      type: 'recipe';
      title: string;
      items: {qty: string; name: string}[];
      /** small footnote under the list */
      note?: string;
      /** pulsing call-to-action pill under the card, e.g. "Follow saya!" */
      cta?: string;
    }
  | {
      type: 'finale';
      tiles: {src: string; from: number; rate?: number; label: string; focus?: Focus}[];
    };

export type Sfx = {src: string; at: number; vol?: number};

export type Shot = {
  src: string;
  /** source in / out point (seconds) */
  from: number;
  to: number;
  rate?: number;
  zoom?: {from: Focus; to: Focus};
  /** quick zoom "punches" (seconds within shot) */
  punches?: number[];
  /** original clip audio volume (0 = muted) */
  audio?: number;
  /** ASMR moment: duck music hard so the cooking sound leads */
  asmr?: boolean;
  enter?: 'cut' | 'zoom' | 'whip' | 'glitch';
  /** the person's face is visible on the left: move top badges to the right so nothing covers it */
  faceLeft?: boolean;
  overlays?: Overlay[];
  sfx?: Sfx[];
};

export type Episode = {
  id: string;
  /** badge text, e.g. "SIRI PIZZA FROZEN" or "MUKMIN MASAK" */
  series: string;
  /** episode number inside the series (omit for a standalone video) */
  ep?: number;
  of?: number;
  /** overrides the "EP n/of" chip, e.g. "EP 0" for a prequel */
  epLabel?: string;
  name: string;
  music: string;
  musicStart?: number;
  /** music level when nothing else is going on */
  musicBed?: number;
  /** multiplier on every clip's own audio (default 1). Lower = music leads, kitchen noise stays in the background. */
  clipGain?: number;
  /** how far the music dips under ASMR shots (fraction of the bed, default 0.5) */
  asmrDuck?: number;
  shots: Shot[];
};
