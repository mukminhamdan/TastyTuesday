/** Bloopers edit: graphics + sound design anchored to timeline_bloopers.json */
import timeline from "./timeline_bloopers.json";
import type { CaptionChunk, Graphic, Sfx } from "../types";
import type { EditData } from "../Video";
import { SAFE } from "../theme";

type Beat = { id: string; s: number; e: number; voice: { s: number; e: number }[] };
const beats = timeline.beats as Beat[];
const captions = timeline.captions as CaptionChunk[];
const B = (id: string) => {
  const b = beats.find((x) => x.id === id);
  if (!b) throw new Error(`beat ${id} missing`);
  return b;
};
const V = (id: string, i: number) => B(id).voice[i];
/** frame at which a caption word is spoken */
const W = (word: string) => {
  for (const c of captions) for (const w of c.words) if (w.t.toLowerCase().replace(/[^\p{L}\d-]/gu, "") === word) return w.s;
  throw new Error(`word ${word} not found`);
};
const TOP = SAFE.top + 30;
const CX = (SAFE.left + SAFE.right) / 2;
const L = SAFE.left + 20;

const graphics: Graphic[] = [
  { kind: "hook", s: 0, e: B("hook").e, lines: ["Video masak je…", "muka mana?"], accent: 1 },
  { kind: "flash", s: B("reveal").s },
  { kind: "stamp", s: B("reveal").s, e: B("cam").s, text: "Bloopers 😂", sub: "yang tak masuk video", x: CX, y: TOP, rotate: -4 },
  { kind: "pill", s: B("cam").s + 3, e: V("cam", 0).s, text: "Kamera: terbang", emoji: "📱💨", x: L, y: TOP + 20 },
  { kind: "pill", s: V("tv", 1).s, e: B("tv").e, text: "Live + TV on", emoji: "📺", x: L, y: TOP + 20 },
  { kind: "pill", s: B("komen").s + 2, e: B("komen").e, text: "Baca komen live", emoji: "💬", x: L, y: TOP + 20 },
  { kind: "pill", s: V("take", 0).s, e: V("take", 1).s, text: "Take 1", emoji: "🎬", x: L, y: TOP + 20 },
  { kind: "pill", s: V("take", 1).s, e: B("take").e, text: "Take 2", emoji: "🎬", x: L, y: TOP + 20, from: "right" },
  { kind: "stamp", s: W("food") - 2, e: B("take").e, text: "Food Engine", sub: "Cooven", x: CX, y: TOP + 130, rotate: -3 },
  { kind: "stamp", s: V("ulang", 1).s, e: B("ulang").e, text: "Ulang lagi 🔁", x: CX, y: TOP, rotate: 4 },
  { kind: "pill", s: B("salam").s + 2, e: B("salam").e, text: "Orang rumah sampai", emoji: "👋", x: L, y: TOP + 20 },
  { kind: "pill", s: B("hello").s + 2, e: B("hello").e, text: "Rupanya tengah live", emoji: "🔴", x: L, y: TOP + 20 },
  { kind: "cta", s: V("outro", 0).e + 2, e: B("outro").e, text: "Jumpa lagi! 👋", sub: "Resepi penuh ada kat video lain 🍳", y: TOP + 10 },
];

const whoosh = "sfx/short-video-whoosh-01.mp3";
const pop = "sfx/cartoon-pop-01.mp3";

const sfx: Sfx[] = [
  { at: 0, file: "sfx/short-video-impact-01.mp3", vol: 0.45 },
  { at: 6, file: pop, vol: 0.35 },
  { at: B("reveal").s - 2, file: "sfx/cinematic-boom-01.mp3", vol: 0.45 },
  { at: B("reveal").s + 2, file: "sfx/crowd-laughter-22.mp3", vol: 0.16 },
  { at: B("cam").s - 4, file: whoosh, vol: 0.4 },
  { at: B("cam").s + 3, file: "sfx/cartoon-slide-whistle-01.mp3", vol: 0.35 },
  { at: B("cam").s + 39, file: "sfx/cartoon-boing-01.mp3", vol: 0.4 },
  { at: V("cam", 0).s - 3, file: whoosh, vol: 0.3 },
  ...["tv", "komen", "take", "ulang", "salam", "hello", "outro"].map((id) => ({ at: B(id).s - 4, file: whoosh, vol: 0.38 })),
  { at: V("tv", 1).s, file: pop, vol: 0.35 },
  { at: B("komen").s + 2, file: "sfx/ui-toast-08.mp3", vol: 0.3 },
  { at: V("take", 0).s, file: "sfx/office-camera-08.mp3", vol: 0.3 },
  { at: V("take", 1).s, file: "sfx/office-camera-08.mp3", vol: 0.3 },
  { at: W("food") - 3, file: "sfx/logo-reveal-01.mp3", vol: 0.3 },
  { at: V("ulang", 1).s, file: "sfx/crowd-ooh-01.mp3", vol: 0.22 },
  { at: V("ulang", 1).s, file: "sfx/short-video-impact-01.mp3", vol: 0.35 },
  { at: B("salam").s + 2, file: pop, vol: 0.32 },
  { at: B("hello").s + 2, file: "sfx/ui-send-08.mp3", vol: 0.3 },
  { at: V("outro", 0).e + 2, file: "sfx/sparkle-pop-pickup.mp3", vol: 0.4 },
  { at: V("outro", 0).e + 10, file: "sfx/crowd-laughter-22.mp3", vol: 0.12 },
];

export const bloopersEdit: EditData = {
  timeline,
  captions,
  graphics,
  sfx,
  voiceWindows: beats.flatMap((b) => b.voice),
  montageBeats: ["reveal", "cam"].map(B),
  voiceFile: "media/voice_bloopers.wav",
  musicFile: "music/bed_bloopers.mp3",
};
