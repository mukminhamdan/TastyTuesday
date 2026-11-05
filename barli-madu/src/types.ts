export type Box = [number, number, number, number]; // x, y, w, h (0..1 of frame)

export type Clip = {
  clip: string; // basename without extension
  from: number; // seconds in source
  to: number;
  at: number; // seconds on the timeline
  zoom?: number; // base zoom (1 = none)
  punch?: boolean; // quick punch-in at the start of the clip
  focus?: [number, number]; // transform origin (0..1), usually the face centre
  speed?: number; // playback rate for b-roll speed ramps
  muted?: boolean;
  volume?: number;
};

export type CapWord = {w: string; s: number; e: number; hi?: boolean};
export type CaptionPage = {start: number; end: number; words: CapWord[]; pos: 'low' | 'high' | 'mid'};

export type Overlay = {
  type: 'hook' | 'step' | 'ingredients' | 'timer' | 'tip' | 'sticker' | 'cta' | 'label' | 'flash' | 'benefits';
  at: number;
  dur: number;
  slot?: 'top' | 'bottom' | 'topLeft' | 'topRight' | 'midLeft' | 'midRight' | 'center';
  props?: Record<string, unknown>;
};

export type Sfx = {name: string; at: number; vol?: number};

export type Timeline = {
  duration: number;
  clips: Clip[];
  captions: CaptionPage[];
  overlays: Overlay[];
  sfx: Sfx[];
  speech: [number, number][];
  music: {src: string; vol: number; duck: number};
};
