export type Transition = 'cut' | 'punch' | 'whip' | 'flash' | 'zoomblur';

export type Segment = {
  /** first output frame */
  from: number;
  /** length in output frames */
  dur: number;
  /** source time (seconds) where this segment starts */
  srcStart: number;
  /** playback speed (1 = real time, >1 = timelapse) */
  speed: number;
  /** base zoom for this segment (1 = full frame) */
  zoom: number;
  /** zoom anchor in output coordinates (0..1) – usually the face */
  origin: [number, number];
  /** vertical crop offset in px of the 1080x2160 plate (0..240) */
  cropY: number;
  /** play the cleaned voice track for this segment */
  voice: boolean;
  /** transition used to ENTER this segment */
  trans: Transition;
};

export type Word = {
  /** output seconds */
  t: number;
  e: number;
  w: string;
  /** render in the serif-italic accent style */
  emph?: boolean;
};

export type Overlay = {
  kind: string;
  from: number;
  dur: number;
  props?: Record<string, unknown>;
};

export type Sfx = {name: string; from: number; vol?: number};

export type ClipData = {
  id: string;
  title: string;
  durationInFrames: number;
  segments: Segment[];
  words: Word[];
  overlays: Overlay[];
  sfx: Sfx[];
  music: {src: string; vol: number; duck: number; offset?: number};
  /** face box per output second: [cx, cy, h] in output coords 0..1 (null = no face) */
  face: ([number, number, number] | null)[];
  captionY: number;
};
