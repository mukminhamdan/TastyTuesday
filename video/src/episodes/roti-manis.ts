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
 *  - r193101 (23 s): pulling a bun apart (fluffy inside).
 *  - r191436 (60 s): leftover balls already frozen on the black pan; 6.5-8.5 two balls knocked together (hard),
 *      9-22 lifted off the pan, 24-46 into a box, 48-55 lid on.
 *
 * Proofing (from the cook): proof 1 = 15 min or until doubled; proof 2 = 30-45 min, bake once doubled.
 * Baking (confirmed by the cook): Food Engine Cooven oven mode, 150°C, 15-20 min. Butter brushed on after baking.
 * Conventional oven (for the later recipe video, not shown here): 170°C, 15-20 min.
 */
const DOUGH = 'r173751.mp4';
const SHAPE = 'r181540.mp4';
const PANEL = 'r190709.mp4';
const PROOF = 'r190828.mp4';
const GOLD = 'r192617.mp4';
const BRUSH = 'r193013.mp4';
const PULL = 'r193101.mp4';
const FREEZE = 'r191436.mp4';

/** Cook's preference: keep the kitchen sound low so it doesn't fight the music. */
const CLIP_GAIN = 0.3;
const ASMR_DUCK = 0.85;

/** End-of-video CTA for the whole series (the recipe gets its own video later). */
const CTA = 'Nak resipi?\nFollow & komen "RESIPI"';

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
  clipGain: CLIP_GAIN,
  look: 'warm',
  asmrDuck: ASMR_DUCK,
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
          cta: CTA,
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
  clipGain: CLIP_GAIN,
  look: 'warm',
  asmrDuck: ASMR_DUCK,
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
      zoom: {from: {s: 1.7, x: 0.2, y: 0.9}, to: {s: 1.85, x: 0.2, y: 0.9}},
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
      overlays: [{type: 'label', text: 'lebihan doh? tunggu bonus!', x: 500, y: 470, rotate: -4, size: 52, at: 0.3}],
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
          cta: CTA,
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
  clipGain: CLIP_GAIN,
  look: 'warm',
  asmrDuck: ASMR_DUCK,
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
        {type: 'label', text: 'Food Engine Cooven', x: 540, y: 430, rotate: -4, size: 58, at: 0.4},
        {type: 'label', text: '150°C · 15–20 minit', x: 530, y: 1180, rotate: 3, size: 62, at: 1.2},
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
        {type: 'step', n: 5, text: 'Sapu butter'},
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
          cta: CTA,
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
  clipGain: CLIP_GAIN,
  look: 'warm',
  asmrDuck: ASMR_DUCK,
  // Process (from the cook): shape on the black pan -> freeze on the pan first -> once frozen
  // (tapped together at r191436 ~7-8.3 s to show they are hard) -> move into a box -> back in the freezer.
  shots: [
    // HOOK: knocking two frozen dough balls together
    {
      src: FREEZE,
      from: 6.4,
      to: 8.6,
      rate: 0.6,
      enter: 'cut',
      audio: 0.6,
      zoom: {from: {s: 1.15, x: 0.5, y: 0.3}, to: {s: 1.35, x: 0.5, y: 0.3}},
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.1,
          lines: [{t: 'LEBIHAN DOH?'}, {t: 'JANGAN BUANG!', hl: true, size: 84}, {t: 'bekukan je', marker: true, size: 64}],
        },
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: (7.1 - 6.4) / 0.6, vol: 0.4},
        {src: 'impact', at: (7.7 - 6.4) / 0.6, vol: 0.4},
        {src: 'impact', at: (8.2 - 6.4) / 0.6, vol: 0.4},
      ],
    },
    // 01 arrange the leftover balls on the black pan
    {
      src: SHAPE,
      from: 330,
      to: 500,
      rate: 40,
      enter: 'glitch',
      zoom: {from: {s: 1.7, x: 0.15, y: 1.0}, to: {s: 1.85, x: 0.15, y: 1.0}},
      overlays: [
        {type: 'step', n: 1, text: 'Susun atas pan'},
        {type: 'speed', label: '40x'},
      ],
    },
    // 02 freeze on the pan first
    {
      src: SHAPE,
      from: 515.5,
      to: 518.5,
      rate: 0.75,
      enter: 'zoom',
      audio: 0.2,
      zoom: {from: {s: 1.05, x: 0.3, y: 0.6}, to: {s: 1.2, x: 0.3, y: 0.6}},
      overlays: [
        {type: 'step', n: 2, text: 'Bekukan atas pan dulu'},
        {type: 'label', text: 'masuk freezer!', x: 520, y: 470, rotate: -4, at: 0.5},
      ],
      sfx: [{src: 'whoosh-soft', at: 0.5, vol: 0.35}],
    },
    // 03 once frozen: knock them together, hard!
    {
      src: FREEZE,
      from: 6.4,
      to: 8.6,
      rate: 0.8,
      enter: 'zoom',
      audio: 0.8,
      asmr: true,
      zoom: {from: {s: 1.15, x: 0.5, y: 0.3}, to: {s: 1.3, x: 0.5, y: 0.3}},
      overlays: [
        {type: 'step', n: 3, text: 'Dah beku? Ketuk!'},
        {type: 'label', text: 'keras!', x: 640, y: 1150, rotate: 6, size: 84, at: (7.1 - 6.4) / 0.8},
      ],
      sfx: [
        {src: 'impact', at: (7.1 - 6.4) / 0.8, vol: 0.45},
        {src: 'impact', at: (7.7 - 6.4) / 0.8, vol: 0.45},
        {src: 'impact', at: (8.2 - 6.4) / 0.8, vol: 0.45},
      ],
    },
    // 04 lift them off the pan
    {
      src: FREEZE,
      from: 9,
      to: 22,
      rate: 3.5,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.15, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'step', n: 4, text: 'Keluarkan dari pan'},
        {type: 'speed', label: '3.5x'},
      ],
    },
    // 05 into the box
    {
      src: FREEZE,
      from: 24,
      to: 46,
      rate: 5.5,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.15, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'step', n: 5, text: 'Susun dalam bekas'},
        {type: 'speed', label: '5.5x'},
      ],
      sfx: [{src: 'pop-small', at: 1.5, vol: 0.4}, {src: 'pop-small', at: 2.5, vol: 0.4}],
    },
    // 06 lid on, back in the freezer
    {
      src: FREEZE,
      from: 48,
      to: 55,
      rate: 1.75,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.2, x: 0.5, y: 0.5}},
      overlays: [{type: 'step', n: 6, text: 'Tutup & simpan freezer'}],
      sfx: [{src: 'shutter', at: 2.2, vol: 0.4}],
    },
    {
      src: FREEZE,
      from: 55,
      to: 58,
      rate: 0.55,
      enter: 'cut',
      zoom: {from: {s: 1.2, x: 0.5, y: 0.5}, to: {s: 1.3, x: 0.5, y: 0.5}},
      overlays: [
        {
          type: 'recipe',
          title: 'TIP',
          items: [
            {qty: '1', name: 'Bekukan atas pan dulu'},
            {qty: '2', name: 'Dah keras, masuk bekas'},
            {qty: '3', name: 'Bakar bila nak'},
          ],
          cta: CTA,
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* RESIPI (separate video, recipe from the cook)                       */
/* ------------------------------------------------------------------ */
export const rotiResipi: Episode = {
  id: 'RotiManis-Resipi',
  series: BRAND,
  name: 'Resipi roti manis',
  music: MUSIC.ukuleleCeria.file,
  musicStart: 20, // track A has a quiet break at 96-115 s; 20-92 s is steady
  musicBed: 0.5,
  clipGain: CLIP_GAIN,
  look: 'warm',
  asmrDuck: ASMR_DUCK,
  shots: [
    {
      ...PULL_HOOK(''),
      rate: 1,
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.1,
          lines: [{t: 'RESIPI ROTI MANIS', size: 80}, {t: 'YANG KORANG MINTA!', hl: true, size: 58}, {t: 'gebu gila!', marker: true, size: 64}],
        },
        {type: 'sparkles', x: 540, y: 700, at: 1.2, count: 10, spread: 300},
      ],
    },
    {
      src: DOUGH,
      from: 1,
      to: 8,
      rate: 1.3,
      enter: 'glitch',
      overlays: [
        {
          type: 'recipe',
          title: 'BAHAN',
          items: [
            {qty: '400g', name: 'Tepung roti*'},
            {qty: '100g', name: 'Tepung gandum'},
            {qty: '300g', name: 'Air'},
            {qty: '60g', name: 'Gula kastor'},
            {qty: '60g', name: 'Mentega masin**'},
            {qty: '10g', name: 'Yis kering'},
            {qty: '1 s/k', name: 'Garam'},
          ],
          note: '*protein tinggi\n**kiub 2 cm · s/k = sudu kecil',
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}],
    },
    {
      src: DOUGH,
      from: 30,
      to: 56,
      rate: 9.3,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.9, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 1, text: '300g air'},
        {type: 'speed', label: '9x'},
      ],
    },
    {
      src: DOUGH,
      from: 105,
      to: 160,
      rate: 19.6,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.9, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 2, text: '60g mentega masin'},
        {type: 'speed', label: '20x'},
      ],
    },
    {
      src: DOUGH,
      from: 195,
      to: 250,
      rate: 19.6,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.9, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 3, text: 'Gula, yis & garam'},
        {type: 'speed', label: '20x'},
      ],
      sfx: [{src: 'pop-small', at: 0.6, vol: 0.4}, {src: 'pop-small', at: 2.4, vol: 0.4}],
    },
    {
      src: DOUGH,
      from: 328,
      to: 410,
      rate: 27.3,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.22, y: 0.45}, to: {s: 1.85, x: 0.22, y: 0.45}},
      overlays: [
        {type: 'step', n: 4, text: '400g tepung roti + 100g gandum'},
        {type: 'speed', label: '27x'},
      ],
    },
    {
      src: DOUGH,
      from: 450,
      to: 665,
      rate: 72,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.22, y: 0.47}, to: {s: 1.95, x: 0.22, y: 0.47}},
      punches: [1.0, 2.0],
      overlays: [
        {type: 'step', n: 5, text: 'Uli sampai licin'},
        {type: 'speed', label: '72x'},
      ],
      sfx: [{src: 'tap', at: 1.0, vol: 0.4}, {src: 'tap', at: 2.0, vol: 0.4}],
    },
    {
      src: DOUGH,
      from: 668,
      to: 690,
      rate: 7.9,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.22, y: 0.47}, to: {s: 1.85, x: 0.22, y: 0.47}},
      overlays: [
        {type: 'step', n: 6, text: 'Proof 15 min / naik double'},
        {type: 'speed', label: '8x'},
      ],
    },
    {
      src: SHAPE,
      from: 46,
      to: 88,
      rate: 15,
      enter: 'zoom',
      zoom: {from: {s: 1.75, x: 0.25, y: 0.4}, to: {s: 1.9, x: 0.25, y: 0.4}},
      overlays: [
        {type: 'step', n: 7, text: 'Bulat-bulatkan'},
        {type: 'speed', label: '15x'},
      ],
    },
    {
      src: SHAPE,
      from: 120,
      to: 300,
      rate: 64,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.2, y: 0.9}, to: {s: 1.85, x: 0.2, y: 0.9}},
      overlays: [
        {type: 'step', n: 8, text: 'Susun & proof 30–45 min'},
        {type: 'speed', label: '64x'},
      ],
    },
    {
      src: PANEL,
      from: 9,
      to: 18,
      rate: 3,
      enter: 'zoom',
      zoom: {from: {s: 1.15, x: 0.5, y: 0.45}, to: {s: 1.3, x: 0.5, y: 0.45}},
      overlays: [
        {type: 'step', n: 9, text: 'Cooven mode oven'},
        {type: 'label', text: '150°C · 15–20 minit', x: 530, y: 1180, rotate: 3, size: 62, at: 0.6},
      ],
      sfx: [{src: 'tap', at: 0.5, vol: 0.45}, {src: 'tap', at: 1.6, vol: 0.45}],
    },
    {
      src: PROOF,
      from: 148,
      to: 324,
      rate: 63,
      enter: 'zoom',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.6}, to: {s: 1.3, x: 0.5, y: 0.6}},
      overlays: [
        {type: 'step', n: 9, text: 'Cooven mode oven', at: -2},
        {type: 'speed', label: '63x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}],
    },
    {
      src: BRUSH,
      from: 0,
      to: 17,
      rate: 5.7,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.45}, to: {s: 1.2, x: 0.5, y: 0.45}},
      overlays: [
        {type: 'step', n: 10, text: 'Sapu butter'},
        {type: 'speed', label: '5.7x'},
      ],
    },
    {
      src: PULL,
      from: 4,
      to: 14,
      rate: 2.2,
      enter: 'zoom',
      audio: 1,
      asmr: true,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.4}, to: {s: 1.3, x: 0.5, y: 0.38}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.9, lines: [{t: 'GEBUUU!', hl: true, size: 124}]},
        {type: 'sparkles', x: 540, y: 700, at: 1.1, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 0.9, vol: 0.45}, {src: 'ding-sparkle', at: 1.1, vol: 0.4}],
    },
    {
      src: PULL,
      from: 19,
      to: 22,
      rate: 0.55,
      enter: 'cut',
      zoom: {from: {s: 1.2, x: 0.5, y: 0.5}, to: {s: 1.3, x: 0.5, y: 0.5}},
      overlays: [
        {
          type: 'recipe',
          title: 'SAVE RESIPI NI!',
          items: [
            {qty: '15 min', name: 'Proof 1'},
            {qty: '30–45 min', name: 'Proof 2'},
            {qty: '150°C', name: 'Cooven 15–20 min'},
            {qty: '170°C', name: 'Oven 15–20 min'},
          ],
          note: 'proof sampai naik double\nsapu butter lepas bakar',
          cta: 'Follow saya untuk resipi lagi!',
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}, {src: 'ding-sparkle', at: 2.0, vol: 0.4}],
    },
  ],
};

export const ROTI_MANIS = [rotiPart1, rotiPart2, rotiPart3, rotiBonus, rotiResipi];
