import {BRAND, MUSIC} from '../lib/theme';
import type {Episode} from '../lib/types';

/**
 * Siri ROTI MANIS (recorded 19 Nov), 3 parts + bonus. No voice in any clip.
 *
 * Sources:
 *  - r173751 (14 min, top-down): 30-75 pour liquid (x2), 105-160 butter, 195-250 small additions,
 *      260-320 mix, 325-410 flour, 440-670 knead, 668-690 covered with the green lid (proof 1).
 *  - r181540 (9.4 min): 11-34 lid off + dough out, 46-300 roll balls into the foil tray,
 *      330-500 leftover balls onto the black pan, 515-519 black-pan close-up, 532-548 tray covered with cloth (proof 2).
 *  - r190709 (27 s, 4K): Cooven panel set to oven mode (display ends on 150 / 20), preheat "PRE".
 *  - r190828 (5.5 min): 0-100 tray proofing, 88-91 risen-tray close-up, 138-146 tray into Cooven, 148-324 baking.
 *      (102-112 the camera swings round: skipped.)
 *  - r192617 (30 s): golden buns in the Cooven.  r193013 (24 s): brushing, glossy close-up.
 *  - r193101 (23 s): pulling a bun apart (fluffy inside).  r191436 (60 s): leftover balls into a box -> freezer.
 *
 * Proofing (from the cook): proof 1 = 15 min or until doubled; proof 2 = 30-45 min, bake once doubled.
 * Baking: Food Engine Cooven, oven mode.
 */
const DOUGH = 'r173751.mp4';
const SHAPE = 'r181540.mp4';
const PANEL = 'r190709.mp4';
const PROOF = 'r190828.mp4';
const GOLD = 'r192617.mp4';
const BRUSH = 'r193013.mp4';
const PULL = 'r193101.mp4';
const FREEZE = 'r191436.mp4';

const PULL_HOOK = (part: string) => ({
  src: PULL,
  from: 5,
  to: 9.5,
  rate: 0.85,
  enter: 'cut' as const,
  audio: 0.5,
  zoom: {from: {s: 1.05, x: 0.5, y: 0.4}, to: {s: 1.25, x: 0.5, y: 0.38}},
  overlays: [
    {
      type: 'title' as const,
      pos: 'bottom' as const,
      at: 0.1,
      lines: [{t: 'ROTI MANIS'}, {t: 'GEBU GILA!', hl: true, size: 104}, {t: part, marker: true, size: 64}],
    },
    {type: 'sparkles' as const, x: 540, y: 700, at: 1.2, count: 10, spread: 300},
  ],
  sfx: [
    {src: 'sting', at: 0, vol: 0.5},
    {src: 'impact', at: 0, vol: 0.45},
    {src: 'shimmer', at: 1.2, vol: 0.4},
  ],
});

/* ------------------------------------------------------------------ */
/* PART 1: buat doh                                                    */
/* ------------------------------------------------------------------ */
export const rotiPart1: Episode = {
  id: 'RotiManis-P1-Doh',
  series: BRAND,
  epLabel: 'ROTI MANIS 1/3',
  name: 'Roti manis part 1: buat doh',
  music: MUSIC.ukuleleCeria.file,
  musicStart: MUSIC.ukuleleCeria.start,
  musicBed: 0.5,
  shots: [
    PULL_HOOK('part 1: buat doh'),
    {
      src: DOUGH,
      from: 30,
      to: 56,
      rate: 6,
      enter: 'glitch',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.9, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 1, text: 'Masuk cecair'},
        {type: 'speed', label: '6x'},
      ],
    },
    {
      src: DOUGH,
      from: 105,
      to: 160,
      rate: 12,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.9, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 2, text: 'Masuk mentega'},
        {type: 'speed', label: '12x'},
      ],
    },
    {
      src: DOUGH,
      from: 195,
      to: 250,
      rate: 12,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.9, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 3, text: 'Masuk bahan lain'},
        {type: 'speed', label: '12x'},
      ],
      sfx: [{src: 'pop-small', at: 0.6, vol: 0.4}, {src: 'pop-small', at: 2.6, vol: 0.4}],
    },
    {
      src: DOUGH,
      from: 260,
      to: 320,
      rate: 15,
      enter: 'zoom',
      zoom: {from: {s: 1.8, x: 0.22, y: 0.47}, to: {s: 1.95, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 4, text: 'Kacau sebati'},
        {type: 'speed', label: '15x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.16}],
    },
    {
      src: DOUGH,
      from: 328,
      to: 410,
      rate: 18,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.22, y: 0.45}, to: {s: 1.85, x: 0.22, y: 0.45}},
      overlays: [
        {type: 'step', n: 5, text: 'Masuk tepung'},
        {type: 'speed', label: '18x'},
      ],
    },
    {
      src: DOUGH,
      from: 450,
      to: 665,
      rate: 45,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.95, x: 0.22, y: 0.47}},
      punches: [1.6, 3.2],
      overlays: [
        {type: 'step', n: 6, text: 'Uli sampai licin'},
        {type: 'speed', label: '45x'},
      ],
      sfx: [{src: 'tap', at: 1.6, vol: 0.4}, {src: 'tap', at: 3.2, vol: 0.4}],
    },
    {
      src: DOUGH,
      from: 668,
      to: 690,
      rate: 5,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.22, y: 0.47}, to: {s: 1.85, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 7, text: 'Tutup & proof'},
        {type: 'speed', label: '5x'},
      ],
    },
    {
      src: DOUGH,
      from: 700,
      to: 706,
      rate: 1.5,
      enter: 'zoom',
      zoom: {from: {s: 1.6, x: 0.22, y: 0.47}, to: {s: 1.7, x: 0.22, y: 0.47}},
      overlays: [
        {
          type: 'recipe',
          title: 'PROOF 1',
          items: [{qty: '15 min', name: 'Proof pertama'}],
          note: 'atau sampai naik double',
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}, {src: 'clock-fast', at: 0.4, vol: 0.2}],
    },
    // PAYOFF: lid off, the dough has risen
    {
      src: SHAPE,
      from: 11,
      to: 17,
      rate: 1.5,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.6, x: 0.25, y: 0.42}, to: {s: 1.8, x: 0.25, y: 0.42}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.5, lines: [{t: 'DOH DAH'}, {t: 'NAIK!', hl: true, size: 120}]},
        {type: 'sparkles', x: 540, y: 820, at: 0.7, count: 12, spread: 300},
      ],
      sfx: [{src: 'boom', at: 0.5, vol: 0.45}, {src: 'ding-sparkle', at: 0.7, vol: 0.4}],
    },
    {
      src: SHAPE,
      from: 0,
      to: 3,
      rate: 0.75,
      enter: 'cut',
      zoom: {from: {s: 1.5, x: 0.25, y: 0.45}, to: {s: 1.6, x: 0.25, y: 0.45}},
      overlays: [
        {
          type: 'endNext',
          nextEp: 'PART 2',
          nextTitle: 'Bentukkan\nroti manis',
          peek: {src: SHAPE, from: 60, rate: 6, focus: {s: 1.8, x: 0.25, y: 0.42}},
        },
      ],
      sfx: [
        {src: 'whoosh-med', at: 0, vol: 0.4},
        {src: 'sting-warm', at: 0.25, vol: 0.45},
        {src: 'pop-bubble', at: 0.75, vol: 0.4},
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* PART 2: bentukkan + proof 2                                         */
/* ------------------------------------------------------------------ */
const RISEN = {
  src: PROOF,
  from: 88,
  to: 91.4,
  rate: 0.8,
};

export const rotiPart2: Episode = {
  id: 'RotiManis-P2-Bentuk',
  series: BRAND,
  epLabel: 'ROTI MANIS 2/3',
  name: 'Roti manis part 2: bentukkan',
  music: MUSIC.ukuleleIklan.file,
  musicStart: MUSIC.ukuleleIklan.start,
  musicBed: 0.5,
  shots: [
    {
      ...RISEN,
      enter: 'cut',
      audio: 0.2,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.3}, to: {s: 1.25, x: 0.5, y: 0.3}},
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.1,
          lines: [{t: 'DARI DOH'}, {t: 'JADI MACAM NI!', hl: true, size: 84}, {t: 'part 2: bentukkan', marker: true, size: 64}],
        },
        {type: 'sparkles', x: 540, y: 600, at: 1, count: 10, spread: 300},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'shimmer', at: 1, vol: 0.4},
      ],
    },
    {
      src: SHAPE,
      from: 16,
      to: 34,
      rate: 4,
      enter: 'glitch',
      audio: 0.3,
      zoom: {from: {s: 1.65, x: 0.25, y: 0.42}, to: {s: 1.8, x: 0.25, y: 0.42}},
      overlays: [
        {type: 'step', n: 1, text: 'Keluarkan doh'},
        {type: 'speed', label: '4x'},
      ],
    },
    {
      src: SHAPE,
      from: 46,
      to: 88,
      rate: 10,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.25, y: 0.4}, to: {s: 1.9, x: 0.25, y: 0.4}},
      overlays: [
        {type: 'step', n: 2, text: 'Bulat-bulatkan'},
        {type: 'speed', label: '10x'},
      ],
    },
    {
      src: SHAPE,
      from: 120,
      to: 300,
      rate: 40,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.2, y: 0.58}, to: {s: 1.85, x: 0.2, y: 0.58}},
      overlays: [
        {type: 'step', n: 3, text: 'Susun dalam loyang'},
        {type: 'speed', label: '40x'},
      ],
      sfx: [
        {src: 'pop-bubble', at: 0.8, vol: 0.4},
        {src: 'pop-med-bubble', at: 1.8, vol: 0.4},
        {src: 'pop-bubble', at: 2.8, vol: 0.4},
        {src: 'pop-med-bubble', at: 3.8, vol: 0.4},
      ],
    },
    {
      src: SHAPE,
      from: 515.5,
      to: 518.5,
      rate: 0.75,
      enter: 'whip',
      audio: 0.2,
      zoom: {from: {s: 1.05, x: 0.3, y: 0.6}, to: {s: 1.2, x: 0.3, y: 0.6}},
      overlays: [{type: 'label', text: 'lebihan doh? tunggu bonus!', x: 540, y: 470, rotate: -4, size: 62, at: 0.3}],
      sfx: [{src: 'pop-bubble', at: 0.3, vol: 0.4}],
    },
    {
      src: SHAPE,
      from: 532,
      to: 548,
      rate: 4,
      enter: 'zoom',
      zoom: {from: {s: 1.5, x: 0.25, y: 0.5}, to: {s: 1.65, x: 0.25, y: 0.5}},
      overlays: [
        {type: 'step', n: 4, text: 'Tutup & proof'},
        {type: 'speed', label: '4x'},
      ],
    },
    {
      src: PROOF,
      from: 0,
      to: 6,
      rate: 1.5,
      enter: 'zoom',
      zoom: {from: {s: 1.3, x: 0.3, y: 0.5}, to: {s: 1.4, x: 0.3, y: 0.5}},
      overlays: [
        {
          type: 'recipe',
          title: 'PROOF 2',
          items: [{qty: '30–45 min', name: 'Proof kedua'}],
          note: 'naik double, boleh bakar!',
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}, {src: 'clock-fast', at: 0.4, vol: 0.2}],
    },
    {
      src: PROOF,
      from: 8,
      to: 86,
      rate: 20,
      enter: 'zoom',
      zoom: {from: {s: 1.5, x: 0.3, y: 0.55}, to: {s: 1.7, x: 0.3, y: 0.55}},
      overlays: [
        {type: 'speed', label: '20x'},
        {type: 'label', text: 'tengok dia naik...', x: 540, y: 470, rotate: -4, at: 0.5},
      ],
    },
    // PAYOFF
    {
      ...RISEN,
      enter: 'zoom',
      audio: 0.2,
      zoom: {from: {s: 1.1, x: 0.5, y: 0.3}, to: {s: 1.3, x: 0.5, y: 0.3}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.3, lines: [{t: 'DAH NAIK'}, {t: 'DOUBLE!', hl: true, size: 120}]},
        {type: 'sparkles', x: 540, y: 600, at: 0.5, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 0.3, vol: 0.45}, {src: 'ding-sparkle', at: 0.5, vol: 0.4}],
    },
    {
      src: PROOF,
      from: 92,
      to: 95,
      rate: 0.75,
      enter: 'cut',
      zoom: {from: {s: 1.3, x: 0.3, y: 0.55}, to: {s: 1.4, x: 0.3, y: 0.55}},
      overlays: [
        {
          type: 'endNext',
          nextEp: 'PART 3',
          nextTitle: 'Bakar dalam\nFood Engine Cooven!',
          peek: {src: GOLD, from: 3, rate: 1, focus: {s: 1.25, x: 0.5, y: 0.4}},
        },
      ],
      sfx: [
        {src: 'whoosh-med', at: 0, vol: 0.4},
        {src: 'sting-warm', at: 0.25, vol: 0.45},
        {src: 'pop-bubble', at: 0.75, vol: 0.4},
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* PART 3: bakar dalam Food Engine Cooven (mode oven)                  */
/* ------------------------------------------------------------------ */
export const rotiPart3: Episode = {
  id: 'RotiManis-P3-Bakar',
  series: BRAND,
  epLabel: 'ROTI MANIS 3/3',
  name: 'Roti manis part 3: bakar',
  music: MUSIC.ukuleleCeria.file,
  musicStart: 30,
  musicBed: 0.5,
  shots: [
    PULL_HOOK('part 3: bakar'),
    {
      src: PANEL,
      from: 9,
      to: 18,
      rate: 2,
      enter: 'glitch',
      zoom: {from: {s: 1.15, x: 0.5, y: 0.45}, to: {s: 1.3, x: 0.5, y: 0.45}},
      overlays: [
        {type: 'step', n: 1, text: 'Set mode oven'},
        {type: 'speed', label: '2x'},
        {type: 'label', text: 'Food Engine Cooven', x: 540, y: 470, rotate: -4, size: 62, at: 0.4},
      ],
      sfx: [{src: 'tap', at: 0.5, vol: 0.45}, {src: 'tap', at: 1.6, vol: 0.45}, {src: 'tap', at: 2.8, vol: 0.45}],
    },
    {
      src: PANEL,
      from: 19,
      to: 26,
      rate: 1.75,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.2, x: 0.5, y: 0.5}},
      overlays: [{type: 'step', n: 2, text: 'Panaskan dulu'}],
    },
    {
      src: PROOF,
      from: 138,
      to: 146,
      rate: 2,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.2, x: 0.5, y: 0.5}},
      overlays: [{type: 'step', n: 3, text: 'Masuk Cooven'}],
    },
    {
      src: PROOF,
      from: 148,
      to: 324,
      rate: 40,
      enter: 'zoom',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.6}, to: {s: 1.3, x: 0.5, y: 0.6}},
      overlays: [
        {type: 'step', n: 4, text: 'Bakar'},
        {type: 'speed', label: '40x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}, {src: 'clock-fast', at: 2.4, vol: 0.2}],
    },
    {
      src: GOLD,
      from: 3,
      to: 16,
      rate: 3,
      enter: 'zoom',
      audio: 0.2,
      zoom: {from: {s: 1.1, x: 0.5, y: 0.4}, to: {s: 1.3, x: 0.5, y: 0.4}},
      overlays: [
        {type: 'label', text: 'keemasan!', x: 540, y: 1330, rotate: -5, at: 0.4},
        {type: 'sparkles', x: 540, y: 700, at: 0.5, count: 10, spread: 300},
      ],
      sfx: [{src: 'ding-sparkle', at: 0.5, vol: 0.4}],
    },
    {
      src: BRUSH,
      from: 0,
      to: 17,
      rate: 3,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.45}, to: {s: 1.2, x: 0.5, y: 0.45}},
      overlays: [
        {type: 'step', n: 5, text: 'Sapu mentega'},
        {type: 'speed', label: '3x'},
      ],
    },
    {
      src: BRUSH,
      from: 18,
      to: 22,
      rate: 1,
      enter: 'cut',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.45}, to: {s: 1.3, x: 0.5, y: 0.45}},
      overlays: [
        {type: 'label', text: 'berkilat!', x: 540, y: 1330, rotate: -5, at: 0.3},
        {type: 'sparkles', x: 540, y: 760, at: 0.4, count: 12, spread: 320},
      ],
      sfx: [{src: 'shimmer-long', at: 0.3, vol: 0.4}],
    },
    // PAYOFF: pull it apart
    {
      src: PULL,
      from: 4,
      to: 14,
      rate: 1.4,
      enter: 'zoom',
      audio: 1,
      asmr: true,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.4}, to: {s: 1.3, x: 0.5, y: 0.38}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 1.6, lines: [{t: 'GEBUUU!', hl: true, size: 124}]},
        {type: 'sparkles', x: 540, y: 700, at: 1.8, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 1.6, vol: 0.45}, {src: 'ding-sparkle', at: 1.8, vol: 0.4}],
    },
    {
      src: PULL,
      from: 19,
      to: 22,
      rate: 0.75,
      enter: 'cut',
      zoom: {from: {s: 1.2, x: 0.5, y: 0.5}, to: {s: 1.3, x: 0.5, y: 0.5}},
      overlays: [
        {
          type: 'endNext',
          heading: 'Bonus',
          nextEp: 'BONUS',
          nextTitle: 'Lebihan doh?\nJangan buang!',
          peek: {src: FREEZE, from: 40, rate: 1, focus: {s: 1.2, x: 0.5, y: 0.5}},
        },
      ],
      sfx: [
        {src: 'whoosh-med', at: 0, vol: 0.4},
        {src: 'sting-warm', at: 0.25, vol: 0.45},
        {src: 'pop-bubble', at: 0.75, vol: 0.4},
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* BONUS: lebihan doh dibekukan                                        */
/* ------------------------------------------------------------------ */
export const rotiBonus: Episode = {
  id: 'RotiManis-Bonus-Freezer',
  series: BRAND,
  epLabel: 'ROTI MANIS · BONUS',
  name: 'Roti manis bonus: lebihan doh',
  music: MUSIC.ukuleleIklan.file,
  musicStart: 40,
  musicBed: 0.5,
  shots: [
    {
      src: FREEZE,
      from: 44,
      to: 48,
      rate: 0.8,
      enter: 'cut',
      audio: 0.2,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.25, x: 0.5, y: 0.5}},
      overlays: [
        {
          type: 'title',
          pos: 'top',
          at: 0.1,
          lines: [{t: 'LEBIHAN DOH?'}, {t: 'JANGAN BUANG!', hl: true, size: 84}],
        },
      ],
      sfx: [{src: 'sting', at: 0, vol: 0.5}, {src: 'impact', at: 0, vol: 0.45}],
    },
    {
      src: SHAPE,
      from: 330,
      to: 500,
      rate: 40,
      enter: 'glitch',
      zoom: {from: {s: 1.7, x: 0.15, y: 0.62}, to: {s: 1.85, x: 0.15, y: 0.62}},
      overlays: [
        {type: 'step', n: 1, text: 'Bulatkan atas pan'},
        {type: 'speed', label: '40x'},
      ],
    },
    {
      src: FREEZE,
      from: 2,
      to: 16,
      rate: 3.5,
      enter: 'cut',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.15, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'step', n: 1, text: 'Bulatkan atas pan', at: -2},
        {type: 'speed', label: '3.5x'},
      ],
    },
    {
      src: FREEZE,
      from: 24,
      to: 46,
      rate: 5.5,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.15, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'step', n: 2, text: 'Masuk bekas'},
        {type: 'speed', label: '5.5x'},
      ],
      sfx: [{src: 'pop-small', at: 1.5, vol: 0.4}, {src: 'pop-small', at: 2.5, vol: 0.4}],
    },
    {
      src: FREEZE,
      from: 48,
      to: 55,
      rate: 1.75,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.2, x: 0.5, y: 0.5}},
      overlays: [{type: 'step', n: 3, text: 'Tutup & bekukan'}],
      sfx: [{src: 'shutter', at: 2.2, vol: 0.4}],
    },
    {
      src: FREEZE,
      from: 55,
      to: 58,
      rate: 0.6,
      enter: 'cut',
      zoom: {from: {s: 1.2, x: 0.5, y: 0.5}, to: {s: 1.3, x: 0.5, y: 0.5}},
      overlays: [
        {
          type: 'recipe',
          title: 'TIP',
          items: [
            {qty: '1', name: 'Bekukan lebihan doh'},
            {qty: '2', name: 'Bakar bila nak'},
          ],
          cta: 'Follow saya untuk resipi lagi!',
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
    },
  ],
};

export const ROTI_MANIS = [rotiPart1, rotiPart2, rotiPart3, rotiBonus];
