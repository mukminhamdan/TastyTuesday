import {BRAND, MUSIC} from '../lib/theme';
import type {Episode} from '../lib/types';

/**
 * Standalone video: Ayam percik dalam Food Engine Cooven (Smart Cook).
 * Source: a123324 (64 min live call, 720x1280). Only the ayam percik shots are used:
 *   711-718 lifting the halved chicken into the Cooven, 721-729 chicken in the pot, 744-770 pour kuah percik,
 *   771-814 spread the kuah, 912-930 lid on, 2899-2930 mid-cook close-up + spoon kuah over,
 *   2935-2951 swap to the air fryer lid -> broil, 3599-3614 / 3725-3731 finished close-ups.
 * Other participants' picture-in-picture windows sit at the right edge (x > 0.8, y 0.6-0.92):
 * that box is blurred on every shot (blurBox), so pot shots can stay wide and show the whole pot.
 * Method, from the cook in the live: 1 ayam belah tengah + kuah percik (blend), daun kunyit, asam keping;
 * Smart Cook = braise + broil in one pot. Cook's request: do NOT show cooking times in these videos.
 */
const L = 'a123324.mp4';
/** other participants' picture-in-picture (screen recording of a live call): blurred on every shot */
const PIP = {x: 0.785, y: 0.57, w: 0.215, h: 0.37};
/** whole pot, finished (3608-3616.5 is the steady wide view after the lid opens) */
const POT_DONE = {from: {s: 1.06, x: 0.5, y: 0.62}, to: {s: 1.14, x: 0.5, y: 0.62}};
const CTA = 'Nak resipi?\nFollow & komen "RESIPI"';
/** End card used by every ayam percik video: the Smart Cook message, no cooking times (cook's request). */
const SMART_CARD = {
  type: 'recipe' as const,
  title: 'SMART COOK',
  items: [
    {qty: 'BRAISE', name: 'reneh dengan kuah'},
    {qty: 'BROIL', name: 'bakar dari atas'},
  ],
  note: '2 fungsi dalam 1 periuk\ntak perlu alat memasak lain',
  cta: CTA,
};

/** cook's request: no face, only the cooking. These keep the visible source to x >= 0.32, y >= 0.4. */
const HANDS = {from: {s: 1.85, x: 0.68, y: 0.85}, to: {s: 1.95, x: 0.68, y: 0.85}};
const BROIL_ON = {from: {s: 1.85, x: 0.6, y: 0.9}, to: {s: 1.95, x: 0.6, y: 0.9}};
const CHAR = POT_DONE;
const BRAISE = {from: {s: 1.18, x: 0.55, y: 1.0}, to: {s: 1.25, x: 0.55, y: 1.0}};
const GLOW = {from: {s: 1.5, x: 0.35, y: 0.6}, to: {s: 1.6, x: 0.35, y: 0.6}};
const POT = {from: {s: 1.3, x: 0.45, y: 0.62}, to: {s: 1.4, x: 0.45, y: 0.62}};
const POT_SIDE = {from: {s: 1.25, x: 0.45, y: 0.62}, to: {s: 1.32, x: 0.45, y: 0.62}}; // 3725-3731, whole pot + Cooven
// 3725+ starts with the cook's face in frame -> end cards sit on the face-free wide pot view instead
const END_SHOT = {src: L, from: 3612, to: 3616, rate: 0.8, enter: 'cut' as const, zoom: POT_DONE};


export const ayamPercik: Episode = {
  id: 'AyamPercik',
  series: BRAND,
  name: 'Ayam percik Smart Cook',
  music: MUSIC.ukuleleRiang.file,
  musicStart: MUSIC.ukuleleRiang.start,
  musicBed: 0.5,
  clipGain: 0.3,
  asmrDuck: 0.85,
  look: 'cinematic',
  blurBox: PIP,
  shots: [
    // HOOK: finished, charred ayam percik
    {
      src: L,
      from: 3608,
      to: 3613,
      enter: 'cut',
      audio: 0.3,
      zoom: POT_DONE,
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.1,
          lines: [{t: 'AYAM PERCIK'}, {t: 'TAK PAYAH ARANG!', hl: true, size: 74}, {t: 'Food Engine Cooven', marker: true, size: 60}],
        },
        {type: 'sparkles', x: 520, y: 700, at: 1.0, count: 10, spread: 300},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'shimmer', at: 1.0, vol: 0.4},
      ],
    },
    {
      src: L,
      from: 723,
      to: 729,
      rate: 1.5,
      enter: 'glitch',
      zoom: POT,
      overlays: [{type: 'step', n: 1, text: 'Ayam belah tengah, masuk Cooven'}],
    },
    {
      src: L,
      from: 744,
      to: 770,
      rate: 5,
      enter: 'zoom',
      zoom: HANDS,
      overlays: [
        {type: 'step', n: 2, text: 'Tuang kuah percik'},
        {type: 'speed', label: '5x'},
      ],
      sfx: [{src: 'pop-bubble', at: 1.5, vol: 0.35}],
    },
    {
      src: L,
      from: 771,
      to: 813,
      rate: 10,
      enter: 'zoom',
      zoom: HANDS,
      overlays: [
        {type: 'step', n: 3, text: 'Ratakan kuah'},
        {type: 'speed', label: '10x'},
        {type: 'label', text: 'Smart Cook', x: 520, y: 470, rotate: -4, size: 66, at: 0.6},
      ],
    },
    {
      src: L,
      from: 912,
      to: 930,
      rate: 4.5,
      enter: 'zoom',
      zoom: HANDS,
      overlays: [
        {type: 'step', n: 4, text: 'Tutup & biar masak'},
        {type: 'speed', label: '4.5x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}],
    },
    // half way: spoon kuah over the chicken
    {
      src: L,
      from: 2901,
      to: 2929,
      rate: 5,
      enter: 'zoom',
      audio: 0.3,
      zoom: BRAISE,
      overlays: [
        {type: 'step', n: 5, text: 'Siram kuah atas ayam'},
        {type: 'speed', label: '5x'},
      ],
    },
    {
      src: L,
      from: 2936,
      to: 2945,
      rate: 2,
      enter: 'zoom',
      zoom: BROIL_ON,
      overlays: [
        {type: 'step', n: 6, text: 'Tukar tudung, broil'},
        {type: 'label', text: 'auto broil', x: 520, y: 470, rotate: -4, size: 64, at: 1.2},
      ],
      sfx: [{src: 'whoosh-soft', at: 0.8, vol: 0.35}],
    },
    // PAYOFF
    {
      src: L,
      from: 3610,
      to: 3616.5,
      enter: 'zoom',
      audio: 0.3,
      zoom: POT_DONE,
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.4, lines: [{t: 'AYAM PERCIK'}, {t: 'SIAP!', hl: true, size: 120}]},
        {type: 'sparkles', x: 520, y: 700, at: 0.6, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 0.4, vol: 0.45}, {src: 'ding-sparkle', at: 0.6, vol: 0.4}],
    },
    {
      src: L,
      from: 3612,
      to: 3616.5,
      rate: 0.9,
      enter: 'cut',
      zoom: POT_DONE,
      overlays: [
        SMART_CARD,
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Short videos cut from the same live (each under 1 minute)           */
/* ------------------------------------------------------------------ */
const FACE = {s: 1.45, x: 0.15, y: 0.35}; // talking shots: whole face + Cooven, PiP (x > 0.8) out of frame
const FACE2 = {s: 1.55, x: 0.15, y: 0.35};
const VOICE = {clipGain: 1, musicBed: 0.35, asmrDuck: 0.22, look: 'warm' as const, blurBox: PIP};

/** 2. Before -> after transformation (music only, <= 37 s for track 5) */
export const ayamBeforeAfter: Episode = {
  id: 'AyamPercik-BeforeAfter',
  series: BRAND,
  name: 'Ayam percik before after',
  music: MUSIC.ukuleleSiulTepuk.file,
  musicStart: MUSIC.ukuleleSiulTepuk.start,
  musicBed: 0.5,
  clipGain: 0.3,
  asmrDuck: 0.85,
  look: 'cinematic',
  blurBox: PIP,
  shots: [
    {
      src: L,
      from: 721,
      to: 727,
      rate: 1.5,
      enter: 'cut',
      zoom: POT,
      overlays: [{type: 'title', pos: 'bottom', at: 0.1, lines: [{t: 'DARI NI…', size: 110}]}],
      sfx: [{src: 'sting', at: 0, vol: 0.45}],
    },
    {
      src: L,
      from: 744,
      to: 770,
      rate: 10,
      enter: 'zoom',
      zoom: HANDS,
      overlays: [
        {type: 'speed', label: '10x'},
        {type: 'label', text: 'kuah percik', x: 520, y: 470, rotate: -4, at: 0.2},
      ],
    },
    {
      src: L,
      from: 2901,
      to: 2916,
      rate: 3,
      enter: 'zoom',
      zoom: BRAISE,
      overlays: [
        {type: 'speed', label: '3x'},
        {type: 'label', text: 'braise', x: 520, y: 470, rotate: -4, size: 72, at: 0.2},
      ],
    },
    {
      src: L,
      from: 2938,
      to: 2945,
      rate: 1.5,
      enter: 'zoom',
      zoom: BROIL_ON,
      overlays: [{type: 'label', text: 'broil', x: 520, y: 470, rotate: -4, size: 72, at: 0.2}],
      sfx: [{src: 'riser-1s', at: 3.4, vol: 0.35}],
    },
    {
      src: L,
      from: 3608,
      to: 3616.5,
      rate: 0.85,
      enter: 'zoom',
      zoom: CHAR,
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.1, lines: [{t: 'JADI NI!', hl: true, size: 120}, {t: 'tak payah arang', marker: true, size: 64}]},
        {type: 'sparkles', x: 520, y: 700, at: 0.3, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 0.1, vol: 0.45}, {src: 'ding-sparkle', at: 0.3, vol: 0.4}],
    },
    {
      ...END_SHOT,
      rate: 0.75,
      to: 3615,
      overlays: [
        SMART_CARD,
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}],
    },
  ],
};

/** 3. "Apa itu Smart Cook?" - the cook explaining, with subtitles */
export const ayamSmartCook: Episode = {
  id: 'AyamPercik-SmartCook',
  series: BRAND,
  name: 'Apa itu Smart Cook',
  music: MUSIC.ukuleleFolk.file,
  musicStart: MUSIC.ukuleleFolk.start,
  ...VOICE,
  shots: [
    {
      src: L,
      from: 3608,
      to: 3611,
      enter: 'cut',
      zoom: CHAR,
      overlays: [{type: 'title', pos: 'bottom', at: 0.1, lines: [{t: 'APA ITU'}, {t: 'SMART COOK?', hl: true, size: 96}, {t: 'Food Engine Cooven', marker: true, size: 60}]}],
      sfx: [{src: 'sting', at: 0, vol: 0.45}, {src: 'impact', at: 0, vol: 0.4}],
    },
    {
      src: L,
      from: 669.3,
      to: 691.0,
      enter: 'glitch',
      audio: 1,
      asmr: true,
      faceLeft: true,
      zoom: {from: FACE, to: FACE2},
      overlays: [
        {
          type: 'subs',
          items: [
            {t: 'Tapi dengan Cooven Food Engine…', s: 669.3, e: 672.4},
            {t: 'ada satu function: Smart Cook', s: 672.5, e: 676.0},
            {t: 'Smart Cook ni gabungkan dua mode', s: 676.6, e: 683.2},
            {t: 'BRAISE + BROIL', s: 683.4, e: 685.2},
            {t: 'Tak perlu lagi asing-asing bekas', s: 685.4, e: 688.5},
            {t: 'tukar-tukar tempat', s: 688.6, e: 691.0},
          ],
        },
      ],
      sfx: [{src: 'pop', at: 683.4 - 669.3, vol: 0.4}],
    },
    {
      src: L,
      from: 723,
      to: 727.3,
      enter: 'zoom',
      zoom: POT,
      asmr: true,
      vo: {from: 691.1},
      overlays: [{type: 'subs', items: [{t: 'Masak ayam dengan kuah dalam ni', s: 691.1, e: 693.5}, {t: 'terus bakar dalam ni juga', s: 693.5, e: 695.4}]}],
    },
    {
      src: L,
      from: 2901,
      to: 2909,
      rate: 2,
      enter: 'zoom',
      zoom: BRAISE,
      overlays: [{type: 'title', pos: 'bottom', at: 0.1, lines: [{t: 'BRAISE', hl: true, size: 110}, {t: 'reneh dengan kuah', marker: true, size: 62}]}],
      sfx: [{src: 'pop-large', at: 0.1, vol: 0.4}],
    },
    {
      src: L,
      from: 2945,
      to: 2951,
      rate: 1.5,
      enter: 'whip',
      faceLeft: true,
      zoom: GLOW,
      overlays: [{type: 'title', pos: 'bottom', at: 0.1, lines: [{t: '+ BROIL', hl: true, size: 110}, {t: 'bakar dari atas', marker: true, size: 62}]}],
      sfx: [{src: 'pop-large', at: 0.1, vol: 0.4}],
    },
    {
      src: L,
      from: 3610,
      to: 3615,
      rate: 1.1,
      enter: 'zoom',
      zoom: CHAR,
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.2, lines: [{t: '2 FUNGSI'}, {t: '1 PERIUK!', hl: true, size: 104}]},
        {type: 'sparkles', x: 520, y: 700, at: 0.4, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 0.2, vol: 0.45}, {src: 'ding-sparkle', at: 0.4, vol: 0.4}],
    },
    {
      ...END_SHOT,
      overlays: [
        SMART_CARD,
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.4}],
    },
  ],
};

/** 4. "Broil tu apa?" - explanation over the broil + char shots */
export const ayamBroil: Episode = {
  id: 'AyamPercik-Broil',
  series: BRAND,
  name: 'Broil tu apa',
  music: MUSIC.ukuleleSiulan.file,
  musicStart: MUSIC.ukuleleSiulan.start,
  ...VOICE,
  shots: [
    {
      src: L,
      from: 3612,
      to: 3615,
      enter: 'cut',
      zoom: CHAR,
      overlays: [{type: 'title', pos: 'bottom', at: 0.1, lines: [{t: 'BROIL', size: 110}, {t: 'TU APA?', hl: true, size: 96}]}],
      sfx: [{src: 'sting', at: 0, vol: 0.45}, {src: 'impact', at: 0, vol: 0.4}],
    },
    {
      src: L,
      from: 953.2,
      to: 964.1,
      enter: 'glitch',
      audio: 1,
      asmr: true,
      faceLeft: true,
      zoom: {from: FACE, to: FACE2},
      overlays: [
        {
          type: 'subs',
          items: [
            {t: 'Broil = pembakaran dari atas', s: 953.2, e: 956.8},
            {t: 'Selain Smart Cook,', s: 957.2, e: 960.3},
            {t: 'Food Engine ada function broil juga', s: 960.4, e: 964.1},
          ],
        },
      ],
    },
    {
      src: L,
      from: 2945,
      to: 2951.4,
      enter: 'zoom',
      faceLeft: true,
      zoom: GLOW,
      asmr: true,
      vo: {from: 964.6},
      overlays: [{type: 'subs', items: [{t: 'Pembakaran dari atas', s: 964.6, e: 965.4}, {t: 'macam lasagna, bakar layer atas je', s: 965.4, e: 971.0}]}],
    },
    {
      src: L,
      from: 974.3,
      to: 981.1,
      enter: 'zoom',
      audio: 1,
      asmr: true,
      faceLeft: true,
      zoom: {from: FACE, to: FACE2},
      overlays: [{type: 'subs', items: [{t: 'Smart Cook = gabungan dua function', s: 974.3, e: 977.9}, {t: 'broil pun ada berasingan', s: 978.0, e: 981.1}]}],
    },
    {
      src: L,
      from: 3608,
      to: 3614,
      enter: 'zoom',
      zoom: CHAR,
      asmr: true,
      vo: {from: 981.4},
      overlays: [
        {type: 'subs', items: [{t: 'Nak bakar roti?', s: 981.4, e: 984.9}, {t: 'roti, letak cheese atas', s: 984.9, e: 989.3}]},
        {type: 'sparkles', x: 520, y: 700, at: 0.5, count: 10, spread: 300},
      ],
      sfx: [{src: 'shimmer', at: 0.5, vol: 0.3}],
    },
    {
      src: L,
      from: 3726,
      to: 3729.8,
      enter: 'cut',
      zoom: POT_SIDE,
      asmr: true,
      vo: {from: 987.4},
      overlays: [{type: 'subs', items: [{t: 'roti, letak cheese atas', s: 984.9, e: 989.3}, {t: 'pembakaran di atas sahaja', s: 989.5, e: 991.2}]}],
    },
    {
      ...END_SHOT,
      overlays: [
        SMART_CARD,
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.4}],
    },
  ],
};

/** 5. Questions from the live: perap? + bahan blend */
export const ayamSoalan: Episode = {
  id: 'AyamPercik-SoalanLive',
  series: BRAND,
  name: 'Soalan live ayam percik',
  music: MUSIC.ukuleleCeria.file,
  musicStart: MUSIC.ukuleleCeria.start,
  ...VOICE,
  shots: [
    {
      src: L,
      from: 3725,
      to: 3728,
      enter: 'cut',
      zoom: POT_SIDE,
      overlays: [{type: 'title', pos: 'bottom', at: 0.1, lines: [{t: 'SOALAN LIVE'}, {t: 'AYAM PERCIK', hl: true, size: 92}]}],
      sfx: [{src: 'sting', at: 0, vol: 0.45}],
    },
    {
      src: L,
      from: 795.2,
      to: 800.0,
      enter: 'glitch',
      audio: 1,
      asmr: true,
      faceLeft: true,
      zoom: {from: FACE, to: FACE2},
      overlays: [
        {type: 'subs', items: [{t: '"Ayam kena perap dulu tak?"', s: 795.2, e: 796.8}, {t: 'Tak perlu.', s: 797.3, e: 798.3}, {t: 'Nak perap dulu pun boleh', s: 798.4, e: 800.0}]},
      ],
      sfx: [{src: 'pop', at: 0.1, vol: 0.4}],
    },
    {
      src: L,
      from: 807.5,
      to: 813.5,
      enter: 'cut',
      audio: 1,
      asmr: true,
      faceLeft: true,
      zoom: {from: FACE2, to: FACE},
      overlays: [{type: 'subs', items: [{t: 'bahan perapan meresap dalam ayam', s: 807.5, e: 811.3}, {t: 'perap siap-siap pun tak apa', s: 811.4, e: 813.5}]}],
    },
    {
      src: L,
      from: 822.0,
      to: 839.0,
      enter: 'zoom',
      audio: 1,
      asmr: true,
      faceLeft: true,
      zoom: {from: FACE, to: FACE2},
      overlays: [
        {
          type: 'subs',
          items: [
            {t: '"Apa bahan blend tu?"', s: 822.0, e: 824.9},
            {t: 'Bahan blend saya:', s: 825.2, e: 826.2},
            {t: 'cili kering, halia', s: 826.3, e: 829.2},
            {t: 'lengkuas, serai', s: 829.2, e: 831.3},
            {t: 'buah keras, santan', s: 831.3, e: 833.9},
            {t: 'gula melaka', s: 833.9, e: 835.8},
            {t: 'garam, minyak', s: 835.8, e: 838.0},
            {t: 'itu sahaja!', s: 838.1, e: 839.0},
          ],
        },
      ],
      sfx: [{src: 'pop', at: 0.1, vol: 0.4}],
    },
    {
      src: L,
      from: 3608,
      to: 3612,
      rate: 0.8,
      enter: 'cut',
      zoom: CHAR,
      overlays: [
        {
          type: 'recipe',
          title: 'BAHAN BLEND',
          items: [
            {qty: '•', name: 'Cili kering, halia'},
            {qty: '•', name: 'Lengkuas, serai'},
            {qty: '•', name: 'Buah keras, santan'},
            {qty: '•', name: 'Gula melaka'},
            {qty: '•', name: 'Garam, minyak'},
          ],
          note: '+ daun kunyit & asam keping',
          cta: CTA,
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.4}],
    },
  ],
};

/** Cook's request: cooking method only, no face -> the talking videos (SmartCook, Broil, SoalanLive) are not used. */
export const AYAM_PERCIK = [ayamPercik, ayamBeforeAfter];
export const AYAM_PERCIK_TALKING = [ayamSmartCook, ayamBroil, ayamSoalan];
