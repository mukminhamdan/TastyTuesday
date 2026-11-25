import {BRAND, MUSIC} from '../lib/theme';
import type {Episode, Overlay, Shot} from '../lib/types';

/**
 * Ikan bawal stim tofu dalam Food Engine Cooven. No speech in any clip (VAD found none), so all text is
 * on-screen graphics and the audio is music + SFX only.
 *
 * L  i195405 (33 min, tripod, wide bench shot, 1080x1920 proxy; cloth at the bottom y > 0.88):
 *    30-112 sos dari beberapa botol ke mangkuk, 360-392 hiris halia, 396-470 ikan atas pinggan,
 *    462-532 tuang & lumur sos, 540-618 susun tofu keliling ikan, 640-730 pinggan siap (mentah),
 *    870 masuk Cooven, 1946-1970 angkat + tabur topping.
 * A  i200859 (4K, handheld): 0-28 pinggan siap, 106-114 skrin PRE (preheat) -> ADD FOOD (no times shown),
 *    117-126 letak pinggan atas rak, 127-131 tutup.
 * B  i202704 (4K): 10-12 tudung dibuka, 14-17 garfu cubit isi ikan, 24-32 angkat pinggan (penyepit),
 *    36-40 bekas topping, 42-58 tabur topping.
 * C  i201948 (4K): 0-0.6 tudung diangkat (wap), 1-5 ikan siap stim dalam periuk.
 * IMG img202844 / img202847: the cook's photos of the finished dish, rotated 90 deg (fish head at the top).
 */
const L = 'i195405.mp4';
const A = 'i200859.mp4';
const B = 'i202704.mp4';
const C = 'i201948.mp4';
const IMG1 = 'img202844.jpg';
const IMG2 = 'img202847.jpg';

const CTA = 'Nak resipi?\nFollow & komen "RESIPI"';

// framings (source fractions). L: keep the cloth (y > 0.88) out -> bottom edge y + (1 - y) / s < 0.88
const SAUCE = {from: {s: 1.3, x: 0.3, y: 0.45}, to: {s: 1.35, x: 0.3, y: 0.45}};
const GINGER = {from: {s: 1.6, x: 0.15, y: 0.55}, to: {s: 1.65, x: 0.15, y: 0.55}}; // the slicing on the left of the board
const BENCH = {from: {s: 1.25, x: 0.25, y: 0.38}, to: {s: 1.3, x: 0.25, y: 0.4}};
const PLATE_RAW = {from: {s: 1.3, x: 0.35, y: 0.46}, to: {s: 1.36, x: 0.35, y: 0.46}};
const HAND4K = {from: {s: 1.02, x: 0.5, y: 0.5}, to: {s: 1.07, x: 0.5, y: 0.5}};
const DRIFT = {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.05, x: 0.5, y: 0.5}}; // quote videos: barely moving
const PANEL = {from: {s: 1.1, x: 0.5, y: 0.4}, to: {s: 1.2, x: 0.5, y: 0.4}};
const PHOTO_IN = {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.12, x: 0.5, y: 0.42}};
const PHOTO_END = {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.1, x: 0.5, y: 0.5}};

/** smooth tour over the cook's photo: whole dish -> head -> tofu + halia -> tail -> back out */
const PHOTO_TOUR = [
  {s: 1.0, x: 0.5, y: 0.5},
  {s: 1.4, x: 0.5, y: 0.22},
  {s: 1.4, x: 0.35, y: 0.5},
  {s: 1.35, x: 0.55, y: 0.85},
  {s: 1.0, x: 0.5, y: 0.5},
];
const photoTour = (extra: Partial<Shot> = {}): Shot => ({
  src: IMG2,
  from: 0,
  to: 6.5,
  enter: 'zoom',
  zoom: {from: PHOTO_TOUR[0], to: PHOTO_TOUR[PHOTO_TOUR.length - 1], path: PHOTO_TOUR},
  sfx: [{src: 'riser-1s', at: 0.2, vol: 0.25}],
  ...extra,
});

/** recap card (from the cook): kicap cair, sos tiram, sos ikan, minyak bijan; mode steam; bawang putih goreng. No amounts/times. */
const RECAP: Overlay = {
  type: 'recipe',
  title: 'IKAN BAWAL STIM TOFU',
  items: [
    {qty: 'SOS', name: 'kicap cair + sos tiram'},
    {qty: 'SOS', name: 'sos ikan + minyak bijan'},
    {qty: 'TOFU', name: 'susun keliling ikan'},
    {qty: 'STIM', name: 'mode steam Cooven'},
    {qty: 'TABUR', name: 'bawang putih goreng'},
  ],
  cta: CTA,
};

const hookTitle = (lines: {t: string; hl?: boolean; marker?: boolean; size?: number}[]): Overlay => ({
  type: 'title',
  pos: 'bottom',
  at: 0.2,
  lines,
});

const COMMON = {
  series: BRAND,
  musicBed: 0.5,
  clipGain: 0, // no speech; music + SFX only
  asmrDuck: 1,
  look: 'premium' as const,
};

/** 1. Full method, < 1 min */
export const ikanBawal: Episode = {
  ...COMMON,
  id: 'IkanBawal',
  name: 'Ikan bawal stim tofu',
  music: MUSIC.ukuleleSiulan.file,
  musicStart: MUSIC.ukuleleSiulan.start,
  shots: [
    // HOOK: the cook's photo of the finished dish
    {
      src: IMG1,
      from: 0,
      to: 3.2,
      enter: 'cut',
      zoom: PHOTO_IN,
      overlays: [
        hookTitle([{t: 'IKAN BAWAL'}, {t: 'STIM TOFU', hl: true, size: 110}, {t: 'Food Engine Cooven', marker: true, size: 60}]),
        {type: 'sparkles', x: 520, y: 760, at: 0.8, count: 10, spread: 300},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0.2, vol: 0.4},
        {src: 'shimmer', at: 0.8, vol: 0.4},
      ],
    },
    {
      src: L,
      from: 30,
      to: 112,
      rate: 20,
      enter: 'glitch',
      light: 1.08,
      zoom: SAUCE,
      overlays: [
        {type: 'step', n: 1, text: 'Bancuh sos'},
        {type: 'speed', label: '20x'},
        {
          type: 'title',
          pos: 'top',
          at: 0.3,
          lines: [
            {t: 'kicap cair', marker: true, size: 62},
            {t: 'sos tiram', marker: true, size: 62},
            {t: 'sos ikan', marker: true, size: 62},
            {t: 'minyak bijan', marker: true, size: 62},
          ],
        },
      ],
      sfx: [{src: 'pop-bubble', at: 1.2, vol: 0.3}],
    },
    {
      src: L,
      from: 370,
      to: 392,
      rate: 6,
      enter: 'zoom',
      light: 1.08,
      zoom: GINGER,
      overlays: [
        {type: 'step', n: 2, text: 'Hiris halia'},
        {type: 'speed', label: '6x'},
      ],
    },
    {
      src: L,
      from: 462,
      to: 532,
      rate: 16,
      enter: 'zoom',
      light: 1.08,
      zoom: BENCH,
      overlays: [
        {type: 'step', n: 3, text: 'Lumur sos atas ikan'},
        {type: 'speed', label: '16x'},
      ],
    },
    {
      src: L,
      from: 540,
      to: 618,
      rate: 18,
      enter: 'zoom',
      light: 1.08,
      zoom: BENCH,
      overlays: [
        {type: 'step', n: 4, text: 'Susun tofu keliling ikan'},
        {type: 'speed', label: '18x'},
      ],
      sfx: [{src: 'pop-bubble', at: 2.0, vol: 0.3}],
    },
    {
      src: A,
      from: 106,
      to: 114.5,
      rate: 2.2,
      enter: 'zoom',
      light: 1.05,
      zoom: PANEL,
      overlays: [
        {type: 'step', n: 5, text: 'Preheat, mode steam'},
        {type: 'speed', label: '2x'},
      ],
    },
    {
      src: A,
      from: 117,
      to: 131,
      rate: 3.5,
      enter: 'zoom',
      light: 1.05,
      zoom: HAND4K,
      overlays: [
        {type: 'step', n: 6, text: 'Masuk Cooven, stim'},
        {type: 'speed', label: '3.5x'},
      ],
      sfx: [{src: 'whoosh-soft', at: 3.2, vol: 0.35}],
    },
    // the lid lifts: steam
    {
      src: C,
      from: 0,
      to: 3.6,
      enter: 'cut',
      light: 1.05,
      zoom: HAND4K,
      overlays: [{type: 'label', text: 'siap stim!', x: 520, y: 470, rotate: -4, size: 72, at: 0.6}],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'ding-sparkle', at: 0.6, vol: 0.35}],
    },
    {
      src: B,
      from: 42,
      to: 58,
      rate: 3,
      enter: 'zoom',
      light: 1.05,
      zoom: HAND4K,
      overlays: [
        {type: 'step', n: 7, text: 'Tabur bawang putih goreng'},
        {type: 'speed', label: '3x'},
      ],
      sfx: [{src: 'pop-bubble', at: 1.5, vol: 0.3}],
    },
    // PAYOFF: smooth tour over the photo, back out with the title
    photoTour({
      overlays: [
        {type: 'title', pos: 'bottom', at: 4.9, lines: [{t: 'IKAN BAWAL'}, {t: 'SIAP!', hl: true, size: 120}]},
        {type: 'sparkles', x: 520, y: 760, at: 5.1, count: 12, spread: 320},
      ],
      sfx: [{src: 'riser-1s', at: 0.2, vol: 0.25}, {src: 'boom', at: 4.9, vol: 0.45}, {src: 'ding-sparkle', at: 5.1, vol: 0.4}],
    }),
    {
      src: IMG1,
      from: 0,
      to: 4.5,
      enter: 'cut',
      zoom: PHOTO_END,
      overlays: [RECAP],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
    },
  ],
};

const BY = '— MUKMIN MASAK';

/** 2. Quote video: "Tak perlu ke restoran untuk makan ikan stim sedap. Masak je kat rumah." (~18 s) */
export const ikanBawalQuote1: Episode = {
  ...COMMON,
  id: 'IkanBawal-Quote1',
  name: 'Ikan bawal quote restoran',
  music: MUSIC.ukuleleCeria.file,
  musicStart: MUSIC.ukuleleCeria.start,
  shots: [
    {
      src: C,
      from: 0,
      to: 3.6,
      enter: 'cut',
      light: 1.05,
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.5, lines: [{t: 'Tak perlu ke restoran'}]}],
      sfx: [{src: 'whoosh-soft', at: 0, vol: 0.35}],
    },
    {
      src: B,
      from: 42,
      to: 54,
      rate: 2.4,
      enter: 'cut',
      light: 1.05,
      zoom: DRIFT,
      overlays: [
        {type: 'quote', at: 0.2, shown: 1, lines: [{t: 'Tak perlu ke restoran'}, {t: 'untuk makan'}, {t: 'ikan stim sedap.', accent: true}]},
      ],
      sfx: [{src: 'shimmer', at: 1.2, vol: 0.3}],
    },
    {
      src: IMG2,
      from: 0,
      to: 5,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.3, lines: [{t: 'Masak je kat rumah.'}, {t: 'Ikan Bawal Stim Tofu', accent: true}], by: BY}],
      sfx: [{src: 'whoosh-soft', at: 0, vol: 0.3}, {src: 'ding-sparkle', at: 1.2, vol: 0.3}],
    },
    {
      src: IMG1,
      from: 0,
      to: 4,
      enter: 'cut',
      zoom: PHOTO_END,
      overlays: [RECAP],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}],
    },
  ],
};

/** 3. Quote video: "Masakan paling sedap bukan yang paling mahal, tapi yang dimasak dengan sepenuh hati." (~20 s) */
export const ikanBawalQuote2: Episode = {
  ...COMMON,
  id: 'IkanBawal-Quote2',
  name: 'Ikan bawal quote sepenuh hati',
  music: MUSIC.ukuleleIklan.file,
  musicStart: MUSIC.ukuleleIklan.start,
  shots: [
    {
      src: L,
      from: 650,
      to: 666,
      rate: 4,
      enter: 'cut',
      light: 1.08,
      zoom: PLATE_RAW,
      overlays: [{type: 'quote', at: 0.4, lines: [{t: 'Masakan paling sedap'}]}],
      sfx: [{src: 'whoosh-soft', at: 0, vol: 0.35}],
    },
    {
      src: A,
      from: 117,
      to: 131,
      rate: 3.5,
      enter: 'cut',
      light: 1.05,
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.2, shown: 1, lines: [{t: 'Masakan paling sedap'}, {t: 'bukan yang paling mahal,'}]}],
    },
    {
      src: C,
      from: 0,
      to: 3.6,
      enter: 'cut',
      light: 1.05,
      zoom: DRIFT,
      overlays: [
        {
          type: 'quote',
          at: 0.2,
          shown: 2,
          lines: [{t: 'Masakan paling sedap'}, {t: 'bukan yang paling mahal,'}, {t: 'tapi yang dimasak'}, {t: 'dengan sepenuh hati.', accent: true}],
        },
      ],
      sfx: [{src: 'shimmer', at: 1.6, vol: 0.3}],
    },
    {
      src: IMG2,
      from: 0,
      to: 4.5,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [
        {
          type: 'quote',
          at: -1,
          shown: 4,
          lines: [{t: 'Masakan paling sedap'}, {t: 'bukan yang paling mahal,'}, {t: 'tapi yang dimasak'}, {t: 'dengan sepenuh hati.', accent: true}],
          by: BY,
        },
      ],
      sfx: [{src: 'whoosh-soft', at: 0, vol: 0.3}],
    },
    {
      src: IMG1,
      from: 0,
      to: 4,
      enter: 'cut',
      zoom: PHOTO_END,
      overlays: [RECAP],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}],
    },
  ],
};

export const IKAN_BAWAL = [ikanBawal, ikanBawalQuote1, ikanBawalQuote2];
