/**
 * Creative layer (v2, cooking-only): step cards, stamps and sound design,
 * anchored to the beats in timeline.json produced by scripts/build.py.
 */
import timeline from "./timeline.json";
import type { CaptionChunk, Graphic, Sfx } from "../types";
import { SAFE } from "../theme";

type Beat = { id: string; s: number; e: number; voice: { s: number; e: number }[] };
const beats = timeline.beats as Beat[];
export const captions = timeline.captions as CaptionChunk[];

const B = (id: string) => {
  const b = beats.find((x) => x.id === id);
  if (!b) throw new Error(`beat ${id} missing`);
  return b;
};
const V = (id: string, i: number) => B(id).voice[i];

const TOP = SAFE.top + 30;
const CX = (SAFE.left + SAFE.right) / 2;

const STEPS: { id: string; title: string; sub?: string }[] = [
  { id: "s1", title: "Goreng ikan talang", sub: "mode Aircrisp • tanpa minyak" },
  { id: "s2", title: "Ketepikan ikan", sub: "tolak tepi je dalam pot" },
  { id: "s3", title: "Masukkan minyak" },
  { id: "s4", title: "Masuk ibu sambal", sub: "masak sampai pecah minyak" },
  { id: "s5", title: "+ Jintan putih", sub: "ni rahsia dia ✨" },
  { id: "s6", title: "+ Kicap sikit", sub: "jadi sambal hitam" },
  { id: "s7", title: "Gaul dengan ikan" },
];

export const graphics: Graphic[] = [
  // ---------- HOOK ----------
  { kind: "hook", s: 0, e: B("hook").e, lines: ["Ikan talang", "sambal hitam", "1 periuk je!"], accent: 2 },

  // ---------- STEPS ----------
  ...STEPS.map((st, i): Graphic => ({ kind: "step", s: B(st.id).s + 2, e: B(st.id).e, n: i + 1, total: STEPS.length, title: st.title, sub: st.sub, y: TOP })),
  { kind: "stamp", s: B("s2").s + 22, e: B("s2").e, text: "X payah bekas lain", x: CX, y: 1000, rotate: -4 },
  { kind: "pill", s: B("s7").s + 40, e: B("s7").s + 75, text: "+ Bawang besar", emoji: "🧅", x: SAFE.left + 20, y: 760 },
  { kind: "pill", s: B("s8").s + 2, e: B("s8").e, text: "Tutup, biar meresap", emoji: "⏳", x: SAFE.left + 20, y: TOP + 20 },

  // ---------- END ----------
  { kind: "stamp", s: V("end", 0).s, e: V("end", 0).s + 50, text: "Siap!", sub: "✅ semua dalam 1 periuk", x: CX, y: TOP + 30, rotate: -5 },
  { kind: "cta", s: V("end", 0).s + 50, e: B("end").e, text: "Save & cuba!", sub: "Follow untuk resepi seterusnya 🍽️", y: TOP + 20 },
];

const whoosh = "sfx/short-video-whoosh-01.mp3";
const pop = "sfx/cartoon-pop-01.mp3";
const stepIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "end"];

export const sfx: Sfx[] = [
  { at: 0, file: "sfx/short-video-impact-01.mp3", vol: 0.55 },
  { at: 4, file: "sfx/sparkle-pop-pickup.mp3", vol: 0.35 },
  { at: 12, file: pop, vol: 0.35 },
  { at: V("hook", 0).s - 1, file: "sfx/reveal-impact-01.mp3", vol: 0.4 },
  // whoosh into every step + a pop when the step badge lands
  ...stepIds.map((id) => ({ at: B(id).s - 5, file: whoosh, vol: 0.42 })),
  ...["s1", "s2", "s3", "s4", "s5", "s6", "s7"].map((id) => ({ at: B(id).s + 5, file: pop, vol: 0.38 })),
  // in-step cuts and textures
  { at: B("s1").s + 30, file: whoosh, vol: 0.3 },
  { at: B("s1").s + 32, file: "sfx/ui-toast-08.mp3", vol: 0.22 },
  { at: B("s1").s + 75, file: whoosh, vol: 0.3 },
  { at: B("s2").s + 22, file: "sfx/short-video-impact-01.mp3", vol: 0.4 },
  { at: B("s3").s + 6, file: "sfx/water-bubble-36.mp3", vol: 0.28 },
  { at: B("s4").s + 10, file: "sfx/cauldron-bubbling-01.mp3", vol: 0.32 },
  { at: B("s4").s + 48, file: whoosh, vol: 0.3 },
  { at: B("s5").s + 8, file: "sfx/short-magic-sparkle.mp3", vol: 0.4 },
  { at: B("s6").s + 8, file: "sfx/water-bubble-36.mp3", vol: 0.22 },
  { at: V("s7", 0).s - 2, file: "sfx/reveal-impact-01.mp3", vol: 0.35 },
  { at: B("s7").s + 39, file: whoosh, vol: 0.3 },
  { at: B("s7").s + 40, file: pop, vol: 0.3 },
  { at: B("s8").s + 33, file: whoosh, vol: 0.3 },
  { at: V("end", 0).s - 1, file: "sfx/tada-04.mp3", vol: 0.45 },
  { at: V("end", 0).s + 48, file: whoosh, vol: 0.35 },
  { at: V("end", 0).s + 52, file: "sfx/sparkle-pop-pickup.mp3", vol: 0.4 },
];

export const voiceWindows = beats.flatMap((b) => b.voice);
/** music-forward stretches (no VO): everything between hook and end */
export const montageBeats = ["s1", "s2", "s3", "s4", "s7", "s8"].map(B);

import type { EditData } from "../Video";
export const mainEdit: EditData = { timeline, captions, graphics, sfx, voiceWindows, montageBeats, voiceFile: "media/voice.wav" };
