import {BRAND, MUSIC} from '../lib/theme';
import type {Episode, Overlay, Shot} from '../lib/types';

/**
 * Ikan bakar, simple: pes ikan bakar saja (cook's request), dalam Food Engine Cooven.
 * No speech in any clip: text + music (cook's "Kampung Malam" uploads) + SFX only.
 *
 * L  b201816 (7.8 min, 4K, fixed camera: Cooven at the top, bench below):
 *    16-64 Cooven panas (tudung menyala), 72-116 alas foil + daun pisang, 136-224 sapu pes ikan bakar,
 *    224-268 terbalikkan + sapu sebelah lagi, 296-336 balut foil, 388-445 atas rak + masuk Cooven.
 * B  b201910 (38 s, through the lid): bungkusan atas rak, the heater lights up at 24 s.
 * A  b203529 (49 s): 4-12 angkat bungkusan, 18-30 buka foil, 32-48 ikan bakar + daun pisang terbuka.
 * C  b203646 (8 s): close-up ikan bakar siap.
 * IMG img203623: the cook's photo of the finished fish (9:16).
 */
const L = 'b201816.mp4';
const A = 'b203529.mp4';
const B = 'b201910.mp4';
const C = 'b203646.mp4';
const IMG = 'img203623.jpg';

const CTA = 'Nak resipi?\nFollow & komen "RESIPI"';

// gentle framings
const WIDE = {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.05, x: 0.5, y: 0.45}};
const BENCH = {from: {s: 1.35, x: 0.15, y: 0.62}, to: {s: 1.4, x: 0.15, y: 0.62}}; // the fish sits on the left of the bench
const COOVEN = {from: {s: 1.3, x: 0.5, y: 0.0}, to: {s: 1.36, x: 0.5, y: 0.0}}; // glowing lid at the top
const HAND = {from: {s: 1.03, x: 0.5, y: 0.5}, to: {s: 1.08, x: 0.5, y: 0.5}};
const DRIFT = {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.05, x: 0.5, y: 0.5}};

/** slow tour over the cook's photo: whole fish -> head -> pes + daun pisang -> tail -> back out */
const PHOTO_TOUR = [
  {s: 1.0, x: 0.5, y: 0.5},
  {s: 1.4, x: 0.5, y: 0.25},
  {s: 1.4, x: 0.45, y: 0.5},
  {s: 1.35, x: 0.5, y: 0.78},
  {s: 1.0, x: 0.5, y: 0.5},
];

/** recap card (from the cook): pes ikan bakar only */
const RECAP: Overlay = {
  type: 'recipe',
  title: 'IKAN BAKAR',
  items: [
    {qty: 'ALAS', name: 'foil + daun pisang'},
    {qty: 'SAPU', name: 'pes ikan bakar'},
    {qty: 'BALUT', name: 'dengan foil'},
    {qty: 'BAKAR', name: 'Food Engine Cooven'},
  ],
  note: 'pes ikan bakar je!',
  cta: CTA,
};

const COMMON = {
  series: BRAND,
  musicBed: 0.5,
  clipGain: 0, // no speech; music + SFX only
  asmrDuck: 1,
  look: 'premium' as const,
};

const step = (n: number, text: string, speed?: string, at?: number): Overlay[] => [
  {type: 'step', n, text, at},
  ...(speed ? [{type: 'speed' as const, label: speed}] : []),
];

/** 1. Cooking video, < 1 min */
export const ikanBakar: Episode = {
  ...COMMON,
  id: 'IkanBakar',
  name: 'Ikan bakar pes ikan bakar',
  music: MUSIC.kampungMalam.file, // cook's song
  musicStart: MUSIC.kampungMalam.start,
  shots: [
    // HOOK: close-up of the finished fish
    {
      src: C,
      from: 0.2,
      to: 4.7,
      enter: 'cut',
      zoom: {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.08, x: 0.5, y: 0.45}},
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.2,
          lines: [{t: 'IKAN BAKAR'}, {t: 'PES IKAN BAKAR JE!', hl: true, size: 70}, {t: 'Food Engine Cooven', marker: true, size: 60}],
        },
        {type: 'sparkles', x: 520, y: 760, at: 0.8, count: 10, spread: 300},
      ],
      sfx: [{src: 'sting', at: 0, vol: 0.5}, {src: 'impact', at: 0.2, vol: 0.4}, {src: 'shimmer', at: 0.8, vol: 0.4}],
    },
    {
      src: L,
      from: 16,
      to: 61,
      rate: 15,
      enter: 'glitch',
      zoom: COOVEN,
      overlays: step(1, 'Panaskan Cooven', '15x'),
    },
    {
      src: L,
      from: 72,
      to: 116,
      rate: 11,
      enter: 'zoom',
      zoom: BENCH,
      overlays: step(2, 'Alas foil & daun pisang', '11x'),
    },
    {
      src: L,
      from: 136,
      to: 224,
      rate: 22,
      enter: 'zoom',
      zoom: BENCH,
      overlays: step(3, 'Sapu pes ikan bakar', '22x'),
      sfx: [{src: 'pop-bubble', at: 1.0, vol: 0.3}],
    },
    {
      src: L,
      from: 224,
      to: 268,
      rate: 11,
      enter: 'zoom',
      zoom: BENCH,
      overlays: step(4, 'Terbalikkan, sapu lagi', '11x'),
    },
    {
      src: L,
      from: 296,
      to: 336,
      rate: 10,
      enter: 'zoom',
      zoom: BENCH,
      overlays: step(5, 'Balut dengan foil', '10x'),
      sfx: [{src: 'swish', at: 1.5, vol: 0.3}],
    },
    {
      src: L,
      from: 388,
      to: 445,
      rate: 14,
      enter: 'zoom',
      zoom: WIDE,
      overlays: step(6, 'Masuk Cooven, bakar', '14x'),
    },
    {
      src: B,
      from: 22,
      to: 30,
      rate: 2,
      enter: 'cut',
      zoom: HAND,
      overlays: [...step(6, 'Masuk Cooven, bakar', '2x', -2), {type: 'label', text: 'bakar', x: 520, y: 470, rotate: -4, size: 72, at: 0.8}],
      sfx: [{src: 'whoosh-soft', at: 0.8, vol: 0.35}],
    },
    {
      src: A,
      from: 30,
      to: 48,
      rate: 3,
      enter: 'zoom',
      zoom: HAND,
      overlays: [...step(7, 'Buka foil', '3x'), {type: 'label', text: 'siap!', x: 520, y: 470, rotate: -4, size: 76, at: 3.6}],
      sfx: [{src: 'ding-sparkle', at: 3.6, vol: 0.35}],
    },
    // PAYOFF: slow tour over the cook's photo
    {
      src: IMG,
      from: 0,
      to: 6,
      enter: 'zoom',
      zoom: {from: PHOTO_TOUR[0], to: PHOTO_TOUR[PHOTO_TOUR.length - 1], path: PHOTO_TOUR},
      overlays: [
        {type: 'title', pos: 'bottom', at: 4.4, lines: [{t: 'IKAN BAKAR'}, {t: 'SIAP!', hl: true, size: 120}]},
        {type: 'sparkles', x: 520, y: 760, at: 4.6, count: 12, spread: 320},
      ],
      sfx: [{src: 'riser-1s', at: 0.2, vol: 0.25}, {src: 'boom', at: 4.4, vol: 0.45}, {src: 'ding-sparkle', at: 4.6, vol: 0.4}],
    },
    {
      src: C,
      from: 3.5,
      to: 7.8,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [RECAP],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
    },
  ],
};

const BY = '— MUKMIN MASAK';
const QUOTE = [{t: 'Resipi paling simple,'}, {t: 'kadang-kadang'}, {t: 'paling sedap.', accent: true}];

/** 2. Quote (no recipe card): "Resipi paling simple, kadang-kadang paling sedap." (~16 s) */
export const ikanBakarQuote: Episode = {
  ...COMMON,
  id: 'IkanBakar-Quote',
  name: 'Ikan bakar quote',
  music: MUSIC.kampungMalam2.file, // cook's second upload, a different part from the cooking video
  musicStart: 84,
  shots: [
    {
      src: L,
      from: 150,
      to: 166,
      rate: 4,
      enter: 'cut',
      zoom: BENCH,
      overlays: [{type: 'quote', at: 0.5, lines: QUOTE.slice(0, 1)}],
      sfx: [{src: 'whoosh-soft', at: 0, vol: 0.35}],
    },
    {
      src: B,
      from: 23,
      to: 27,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.2, shown: 1, lines: QUOTE.slice(0, 2)}],
    },
    {
      src: A,
      from: 34,
      to: 46,
      rate: 3,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.2, shown: 2, lines: QUOTE}],
      sfx: [{src: 'shimmer', at: 1.0, vol: 0.3}],
    },
    {
      src: C,
      from: 1,
      to: 5,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [{type: 'quote', at: -1, shown: 3, lines: QUOTE, by: BY}],
      sfx: [{src: 'sting-warm', at: 0.3, vol: 0.35}],
    },
  ],
};

export const IKAN_BAKAR = [ikanBakar, ikanBakarQuote];
