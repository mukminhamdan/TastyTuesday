export type Word = { t: string; s: number; e: number }; // frames on the output timeline
export type CaptionChunk = { s: number; e: number; words: Word[]; y?: number };

export type Clip = {
  id: string;
  file: string; // relative to public/
  /** output length in frames */
  dur: number;
  /** keep original audio (speech) or mute (b-roll under music) */
  audio: boolean;
  /** audio gain for this clip */
  gain?: number;
  /** subtle push-in, or punch zoom at a frame within the clip */
  kenBurns?: number;
  punch?: { at: number; scale: number }[];
  speedLabel?: string;
};

export type Sfx = { at: number; file: string; vol?: number };

export type Graphic =
  | { kind: "hook"; s: number; e: number; lines: string[]; accent?: number }
  | { kind: "pill"; s: number; e: number; text: string; emoji?: string; x: number; y: number; from?: "left" | "right" }
  | { kind: "stamp"; s: number; e: number; text: string; sub?: string; x: number; y: number; rotate?: number }
  | { kind: "checklist"; s: number; e: number; items: { at: number; text: string }[]; y: number }
  | { kind: "ingredients"; s: number; e: number; items: string[]; y: number }
  | { kind: "flash"; s: number }
  | { kind: "step"; s: number; e: number; n: number; total: number; title: string; sub?: string; y: number }
  | { kind: "cta"; s: number; e: number; text: string; sub: string; y: number };
