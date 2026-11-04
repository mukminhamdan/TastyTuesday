/**
 * Creative layer: motion graphics + sound design, anchored to the timeline
 * produced by scripts/build.py (beats, voice pieces, caption words), so the
 * edit stays in sync if the cut is rebuilt.
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
/** frame at which a caption word is spoken (first match after `after`) */
const W = (word: string, after = 0) => {
  for (const c of captions) for (const w of c.words) if (w.s >= after && w.t.toLowerCase().replace(/[^\p{L}\d-]/gu, "") === word.toLowerCase()) return w.s;
  throw new Error(`word ${word} not found`);
};

const TOP = SAFE.top + 30; // graphics band above the face line on talking shots
const CX = (SAFE.left + SAFE.right) / 2;

export const graphics: Graphic[] = [
  // ---------- HOOK ----------
  { kind: "hook", s: 0, e: V("hook", 1).s, lines: ["Goreng + masak sambal", "1 periuk je?!"], accent: 1 },
  { kind: "pill", s: V("hook", 1).s, e: V("hook", 2).s + 4, text: "Tanpa minyak", emoji: "🚫🛢️", x: SAFE.left + 20, y: TOP + 40 },
  { kind: "stamp", s: V("hook", 3).s, e: B("hook").e, text: "Tak payah", sub: "tukar bekas / periuk lain", x: CX, y: TOP + 20, rotate: -4 },
  { kind: "flash", s: B("product").s },

  // ---------- PRODUCT ----------
  { kind: "stamp", s: W("cooven") - 2, e: B("product").e, text: "Cooven", sub: "Food Engine • all-in-one", x: 360, y: TOP + 10, rotate: -3 },

  // ---------- RECIPE ----------
  { kind: "ingredients", s: B("recipe").s + 6, e: V("recipe", 3).s, y: TOP, items: ["🐟 Ikan kembung", "🌶️ Sambal", "🟤 Serbuk jintan", "🥢 Kicap", "🧅 Bawang"] },
  { kind: "pill", s: W("jintan", B("recipe").s) - 3, e: V("recipe", 4).s, text: "+ Jintan = rahsia", emoji: "✨", x: SAFE.left + 20, y: TOP + 30 },
  { kind: "pill", s: W("kicap", B("recipe").s) - 3, e: V("recipe", 5).s, text: "+ Kicap sikit", emoji: "🥢", x: SAFE.left + 20, y: TOP + 30, from: "right" },
  { kind: "stamp", s: W("hitam", B("recipe").s) - 4, e: B("recipe").e, text: "Sambal hitam", sub: "versi Tasty Tuesday", x: CX, y: TOP + 20, rotate: 3 },

  // ---------- FRY MONTAGE ----------
  { kind: "pill", s: B("fry").s + 2, e: B("fry").s + 27, text: "Air fry 140°C", emoji: "🔥", x: SAFE.left + 20, y: TOP + 520 },
  { kind: "stamp", s: V("fry", 0).s, e: B("fry").e, text: "Nampak mudah?", sub: "memang mudah 👌", x: CX, y: TOP + 40, rotate: -3 },

  // ---------- FEATURES ----------
  { kind: "stamp", s: W("8", B("features").s) - 3, e: V("features", 1).s, text: "8 liter", sub: "muat satu family", x: 380, y: TOP, rotate: -4 },
  {
    kind: "checklist", s: V("features", 1).s, e: B("features").e, y: TOP,
    items: [
      { at: W("2", B("features").s), text: "🍚 Nasi 2kg+" },
      { at: W("kek", B("features").s), text: "🎂 Bakar kek" },
      { at: W("oven", B("features").s), text: "🚫 Tak perlu oven" },
      { at: W("percik", B("features").s), text: "🍗 Ayam percik" },
    ],
  },
  { kind: "flash", s: B("sauce").s },

  // ---------- SAUCE MONTAGE ----------
  { kind: "pill", s: B("sauce").s + 3, e: B("sauce").s + 50, text: "Masuk bawang", emoji: "🧅", x: SAFE.left + 20, y: TOP + 40 },
  { kind: "pill", s: B("sauce").s + 56, e: V("sauce", 0).s, text: "Tutup, biar meresap", emoji: "⏳", x: SAFE.left + 20, y: TOP + 40, from: "right" },
  { kind: "stamp", s: V("sauce", 1).s, e: B("sauce").e, text: "Siap!", sub: "✅ 1 periuk je", x: CX, y: TOP + 30, rotate: -5 },

  // ---------- END ----------
  { kind: "cta", s: V("end", 2).e + 4, e: B("end").e, text: "Save & cuba!", sub: "Follow untuk #TastyTuesday 🍽️", y: TOP + 20 },
];

const whoosh = "sfx/short-video-whoosh-01.mp3";
const pop = "sfx/cartoon-pop-01.mp3";
const tick = "sfx/ready-pop-01.mp3";

/** sound design — whooshes on cuts, pops on graphics, impacts on stamps */
export const sfx: Sfx[] = [
  { at: 0, file: "sfx/short-video-impact-01.mp3", vol: 0.55 },
  { at: 4, file: "sfx/sparkle-pop-pickup.mp3", vol: 0.35 },
  { at: V("hook", 1).s - 1, file: pop, vol: 0.45 },
  { at: V("hook", 3).s - 1, file: "sfx/reveal-impact-01.mp3", vol: 0.5 },
  { at: B("product").s - 6, file: whoosh, vol: 0.5 },
  { at: W("cooven") - 3, file: "sfx/logo-reveal-01.mp3", vol: 0.3 },
  { at: B("recipe").s - 4, file: whoosh, vol: 0.4 },
  ...[0, 1, 2, 3, 4].map((i) => ({ at: B("recipe").s + 14 + i * 6, file: tick, vol: 0.4 })),
  { at: V("recipe", 3).s - 4, file: whoosh, vol: 0.35 },
  { at: W("jintan", B("recipe").s) - 3, file: "sfx/short-magic-sparkle.mp3", vol: 0.4 },
  { at: W("kicap", B("recipe").s) - 3, file: pop, vol: 0.4 },
  { at: W("hitam", B("recipe").s) - 4, file: "sfx/short-video-impact-01.mp3", vol: 0.45 },
  { at: B("fry").s - 5, file: "sfx/transition-riser-01.mp3", vol: 0.25 },
  { at: B("fry").s + 2, file: "sfx/ui-toast-08.mp3", vol: 0.3 },
  { at: B("fry").s + 26, file: whoosh, vol: 0.4 },
  { at: B("fry").s + 30, file: "sfx/cauldron-bubbling-01.mp3", vol: 0.35 },
  { at: B("fry").s + 66, file: whoosh, vol: 0.35 },
  { at: V("fry", 0).s - 2, file: "sfx/reveal-impact-01.mp3", vol: 0.4 },
  { at: B("features").s - 5, file: whoosh, vol: 0.45 },
  { at: W("8", B("features").s) - 3, file: "sfx/short-video-impact-01.mp3", vol: 0.45 },
  { at: W("2", B("features").s), file: "sfx/ready-coin-04.mp3", vol: 0.3 },
  { at: W("kek", B("features").s), file: "sfx/ready-coin-04.mp3", vol: 0.3 },
  { at: W("oven", B("features").s), file: "sfx/ready-coin-04.mp3", vol: 0.3 },
  { at: W("percik", B("features").s), file: "sfx/feedback-achievement-39.mp3", vol: 0.35 },
  { at: B("sauce").s - 4, file: whoosh, vol: 0.45 },
  { at: B("sauce").s + 4, file: "sfx/water-bubble-36.mp3", vol: 0.3 },
  { at: B("sauce").s + 27, file: whoosh, vol: 0.3 },
  { at: B("sauce").s + 54, file: whoosh, vol: 0.3 },
  { at: V("sauce", 1).s - 1, file: "sfx/tada-04.mp3", vol: 0.45 },
  { at: B("end").s - 4, file: whoosh, vol: 0.45 },
  { at: B("end").s + 2, file: "sfx/glass-clink-01.mp3", vol: 0.3 },
  { at: V("end", 2).e + 4, file: "sfx/sparkle-pop-pickup.mp3", vol: 0.4 },
];

/** voice windows used to duck the music */
export const voiceWindows = beats.flatMap((b) => b.voice);
/** beats that are music-forward montages */
export const montageBeats = ["fry", "sauce"].map(B);
