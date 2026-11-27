import {BRAND, MUSIC} from '../lib/theme';
import type {Episode, Overlay, Shot} from '../lib/types';

/**
 * Pes gulai kawah dalam Food Engine Cooven. No speech in any clip (VAD found none): text + music + SFX only.
 *
 * L  g110453 (42 min, fixed camera looking into the Cooven pot; pot y 0.17-0.82, counter below):
 *    70-118 minyak + rempah 4 sekawan, 132-140 tuang bawang kisar, 144-330 tumis (wap),
 *    338-380 tuang rempah gulai kawah (serbuk) + kacau, 384-396 air asam dari mangkuk hijau, 528-582 tudung, 584-596 picit cili dari bungkus,
 *    600-684 kacau (616-619 baki cili boh dari plastik), 690-2166 tudung tertutup (masak lama), 2166-2184 tudung dibuka: pecah minyak,
 *    2182-2195 tabur garam & perasa (sudu), 2201-2203 tuang gula nisan, 2210-2224 kacau, 2228-2500 tudung tertutup (percikan minyak), 2504-2517 hasil akhir.
 * M  g104831 (6 min): 0-56 bawang ke dalam pengisar kecil + kisar, 174-198 tambah bahan, 336-360 tuang ke mangkuk.
 * S  g114659 (12 s): close-up pes menggelegak, pecah minyak (0-10.5), then the lid at 11 s.
 */
const L = 'g110453.mp4';
const M = 'g104831.mp4';
const S = 'g114659.mp4';

const CTA = 'Nak resipi?\nFollow & komen "RESIPI"';

// gentle framings (cook: no need to zoom much)
const POT = {from: {s: 1.25, x: 0.5, y: 0.5}, to: {s: 1.3, x: 0.5, y: 0.5}};
const LID = {from: {s: 1.2, x: 0.5, y: 0.45}, to: {s: 1.24, x: 0.5, y: 0.45}};
const CHOP = {from: {s: 1.3, x: 0.35, y: 0.42}, to: {s: 1.36, x: 0.35, y: 0.42}};
const MACRO = {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.06, x: 0.5, y: 0.5}};
const DRIFT = {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.04, x: 0.5, y: 0.5}};

/** recap card (from the cook): bawang merah, bawang putih, halia, lengkuas (kisar); rempah 4 sekawan; rempah gulai kawah; cili boh. No mode/times. */
const RECAP: Overlay = {
  type: 'recipe',
  title: 'PES GULAI KAWAH',
  items: [
    {qty: 'KISAR', name: 'bawang merah & putih'},
    {qty: 'KISAR', name: 'halia & lengkuas'},
    {qty: 'TUMIS', name: 'rempah 4 sekawan'},
    {qty: 'MASUK', name: 'rempah gulai kawah'},
    {qty: 'MASUK', name: 'cili boh & air asam'},
    {qty: 'MASUK', name: 'gula nisan & garam'},
    {qty: 'MASUK', name: 'perasa'},
  ],
  note: 'masak sampai pecah minyak',
  cta: CTA,
};

const COMMON = {
  series: BRAND,
  musicBed: 0.5,
  clipGain: 0, // no speech; music + SFX only
  asmrDuck: 1,
  look: 'premium' as const,
};

const endCard = (extra: Partial<Shot> = {}): Shot => ({
  src: S,
  from: 6,
  to: 10,
  enter: 'cut',
  zoom: MACRO,
  overlays: [RECAP],
  sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
  ...extra,
});

/** 1. Cooking video, < 1 min */
export const pesGulai: Episode = {
  ...COMMON,
  id: 'PesGulai',
  name: 'Pes gulai kawah',
  music: MUSIC.kampungMalam.file, // cook's choice
  musicStart: MUSIC.kampungMalam.start,
  shots: [
    // HOOK: bubbling paste, oil separating
    {
      src: S,
      from: 0.5,
      to: 4.5,
      enter: 'cut',
      zoom: MACRO,
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.2,
          lines: [{t: 'PES GULAI KAWAH', size: 80}, {t: 'PECAH MINYAK!', hl: true, size: 78}, {t: 'Food Engine Cooven', marker: true, size: 60}],
        },
        {type: 'sparkles', x: 520, y: 760, at: 0.8, count: 10, spread: 300},
      ],
      sfx: [{src: 'sting', at: 0, vol: 0.5}, {src: 'impact', at: 0.2, vol: 0.4}, {src: 'shimmer', at: 0.8, vol: 0.4}],
    },
    {
      src: M,
      from: 20,
      to: 56,
      rate: 9,
      enter: 'glitch',
      light: 1.05,
      zoom: CHOP,
      overlays: [
        {type: 'step', n: 1, text: 'Kisar bahan'},
        {type: 'speed', label: '9x'},
        {
          type: 'title',
          pos: 'top',
          at: 0.3,
          lines: [
            {t: 'bawang merah', marker: true, size: 62},
            {t: 'bawang putih', marker: true, size: 62},
            {t: 'halia', marker: true, size: 62},
            {t: 'lengkuas', marker: true, size: 62},
          ],
        },
      ],
    },
    {
      src: L,
      from: 70,
      to: 118,
      rate: 16,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 2, text: 'Tumis rempah 4 sekawan'},
        {type: 'speed', label: '16x'},
      ],
    },
    {
      src: L,
      from: 130,
      to: 146,
      rate: 5,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 3, text: 'Tumis bahan kisar'},
        {type: 'speed', label: '5x'},
      ],
      sfx: [{src: 'pop-bubble', at: 0.8, vol: 0.3}],
    },
    {
      src: L,
      from: 230,
      to: 330,
      rate: 33,
      enter: 'cut',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 3, text: 'Tumis bahan kisar', at: -2},
        {type: 'speed', label: '33x'},
      ],
    },
    {
      src: L,
      from: 338,
      to: 380,
      rate: 10,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 4, text: 'Masuk rempah gulai kawah'},
        {type: 'speed', label: '10x'},
      ],
    },
    {
      src: L,
      from: 384,
      to: 396,
      rate: 3,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 5, text: 'Masuk air asam'},
        {type: 'speed', label: '3x'},
      ],
      sfx: [{src: 'pop-bubble', at: 0.8, vol: 0.3}],
    },
    {
      src: L,
      from: 584,
      to: 604,
      rate: 5,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 6, text: 'Masuk cili boh'},
        {type: 'speed', label: '5x'},
      ],
      sfx: [{src: 'pop-bubble', at: 0.6, vol: 0.3}],
    },
    {
      src: L,
      from: 690,
      to: 2160,
      rate: 300,
      enter: 'zoom',
      light: 1.06,
      zoom: LID,
      overlays: [
        {type: 'step', n: 7, text: 'Tutup, masak perlahan'},
        {type: 'speed', label: '300x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}],
    },
    // lid off: the oil has separated
    {
      src: L,
      from: 2166,
      to: 2180,
      rate: 4.7,
      enter: 'cut',
      light: 1.06,
      zoom: POT,
      overlays: [{type: 'label', text: 'pecah minyak!', x: 520, y: 470, rotate: -4, size: 72, at: 0.8}],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'ding-sparkle', at: 0.8, vol: 0.35}],
    },
    {
      src: L,
      from: 2180,
      to: 2205,
      rate: 6.25,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 8, text: 'Gula nisan, garam & perasa'},
        {type: 'speed', label: '6x'},
      ],
      sfx: [{src: 'pop-bubble', at: 0.4, vol: 0.3}, {src: 'pop-bubble', at: 2.3, vol: 0.3}],
    },
    {
      src: L,
      from: 2210,
      to: 2224,
      rate: 4.7,
      enter: 'zoom',
      light: 1.06,
      zoom: POT,
      overlays: [
        {type: 'step', n: 9, text: 'Kacau, masak lagi'},
        {type: 'speed', label: '5x'},
      ],
    },
    {
      src: L,
      from: 2230,
      to: 2500,
      rate: 135,
      enter: 'cut',
      light: 1.06,
      zoom: LID,
      overlays: [
        {type: 'step', n: 9, text: 'Kacau, masak lagi', at: -2},
        {type: 'speed', label: '135x'},
      ],
    },
    // PAYOFF
    {
      src: S,
      from: 4.8,
      to: 10.3,
      enter: 'zoom',
      zoom: {from: {s: 1.12, x: 0.5, y: 0.5}, to: {s: 1.0, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 1.2, lines: [{t: 'PES GULAI KAWAH', size: 80}, {t: 'SIAP!', hl: true, size: 120}]},
        {type: 'sparkles', x: 520, y: 760, at: 1.4, count: 12, spread: 320},
      ],
      sfx: [{src: 'riser-1s', at: 0.2, vol: 0.25}, {src: 'boom', at: 1.2, vol: 0.45}, {src: 'ding-sparkle', at: 1.4, vol: 0.4}],
    },
    endCard({from: 0, to: 4}),
  ],
};

const BY = '— MUKMIN MASAK';

/** 2. Quote (no recipe card, cook's request): "Jangan tergesa-gesa. Masak sampai pecah minyak." (~17 s) */
export const pesGulaiQuote: Episode = {
  ...COMMON,
  id: 'PesGulai-Quote',
  name: 'Pes gulai quote pecah minyak',
  music: MUSIC.kampungMalam.file, // cook's choice; a later part of the song than the cooking video
  musicStart: 60,
  shots: [
    {
      src: L,
      from: 230,
      to: 246,
      rate: 4,
      enter: 'cut',
      light: 1.06,
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.5, lines: [{t: 'Jangan tergesa-gesa.'}]}],
      sfx: [{src: 'whoosh-soft', at: 0, vol: 0.35}],
    },
    {
      src: L,
      from: 700,
      to: 2100,
      rate: 350,
      enter: 'cut',
      light: 1.06,
      zoom: DRIFT,
      overlays: [{type: 'quote', at: 0.2, shown: 1, lines: [{t: 'Jangan tergesa-gesa.'}, {t: 'Masak sampai'}]}],
    },
    {
      src: S,
      from: 2,
      to: 6.5,
      enter: 'cut',
      zoom: DRIFT,
      overlays: [
        {type: 'quote', at: 0.2, shown: 2, lines: [{t: 'Jangan tergesa-gesa.'}, {t: 'Masak sampai'}, {t: 'pecah minyak.', accent: true}]},
      ],
      sfx: [{src: 'shimmer', at: 1.2, vol: 0.3}],
    },
    {
      src: L,
      from: 2196,
      to: 2222,
      rate: 6.5,
      enter: 'cut',
      light: 1.06,
      zoom: DRIFT,
      overlays: [
        {type: 'quote', at: -1, shown: 3, lines: [{t: 'Jangan tergesa-gesa.'}, {t: 'Masak sampai'}, {t: 'pecah minyak.', accent: true}], by: BY},
      ],
      sfx: [{src: 'sting-warm', at: 0.3, vol: 0.35}],
    },
  ],
};

export const PES_GULAI = [pesGulai, pesGulaiQuote];
