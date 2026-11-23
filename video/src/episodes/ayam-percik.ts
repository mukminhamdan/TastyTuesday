import {BRAND, MUSIC} from '../lib/theme';
import type {Episode} from '../lib/types';

/**
 * Standalone video: Ayam percik dalam Food Engine Cooven (Smart Cook).
 * Source: a123324 (64 min live call, 720x1280). Only the ayam percik shots are used:
 *   711-718 lifting the halved chicken into the Cooven, 721-729 chicken in the pot, 744-770 pour kuah percik,
 *   771-814 spread the kuah, 912-930 lid on, 2899-2930 mid-cook close-up + spoon kuah over,
 *   2935-2951 swap to the air fryer lid -> broil, 3599-3614 / 3725-3731 finished close-ups.
 * Other participants' picture-in-picture windows sit at the right edge (x > 0.8, y 0.6-0.92):
 * every zoom keeps the visible source x below ~0.78 so they never show.
 * Method, from the cook in the live: 1 ayam belah tengah + kuah percik (blend), daun kunyit, asam keping;
 * Smart Cook 30 min (braise, last 5 min broil); then spoon kuah on top, air fryer lid, broil 10 min.
 */
const L = 'a123324.mp4';
const CTA = 'Nak resipi?\nFollow & komen "RESIPI"';

export const ayamPercik: Episode = {
  id: 'AyamPercik',
  series: BRAND,
  name: 'Ayam percik Smart Cook',
  music: MUSIC.ukuleleRiang.file,
  musicStart: MUSIC.ukuleleRiang.start,
  musicBed: 0.5,
  clipGain: 0.3,
  asmrDuck: 0.85,
  look: 'warm',
  shots: [
    // HOOK: finished, charred ayam percik
    {
      src: L,
      from: 3600,
      to: 3605,
      enter: 'cut',
      audio: 0.3,
      zoom: {from: {s: 1.4, x: 0.25, y: 0.45}, to: {s: 1.6, x: 0.25, y: 0.42}},
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
      from: 711,
      to: 718,
      rate: 1.75,
      enter: 'glitch',
      faceLeft: true,
      zoom: {from: {s: 1.55, x: 0.3, y: 0.55}, to: {s: 1.7, x: 0.3, y: 0.55}},
      overlays: [{type: 'step', n: 1, text: '1 ekor ayam, belah tengah'}],
    },
    {
      src: L,
      from: 721,
      to: 729,
      rate: 2,
      enter: 'zoom',
      zoom: {from: {s: 1.6, x: 0.35, y: 0.62}, to: {s: 1.8, x: 0.35, y: 0.62}},
      overlays: [
        {type: 'step', n: 2, text: 'Masuk Food Engine Cooven'},
        {type: 'speed', label: '2x'},
      ],
    },
    {
      src: L,
      from: 744,
      to: 770,
      rate: 5,
      enter: 'zoom',
      faceLeft: true,
      zoom: {from: {s: 1.55, x: 0.35, y: 0.6}, to: {s: 1.7, x: 0.35, y: 0.62}},
      overlays: [
        {type: 'step', n: 3, text: 'Tuang kuah percik'},
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
      faceLeft: true,
      zoom: {from: {s: 1.6, x: 0.35, y: 0.62}, to: {s: 1.75, x: 0.35, y: 0.62}},
      overlays: [
        {type: 'step', n: 4, text: 'Ratakan kuah'},
        {type: 'speed', label: '10x'},
        {type: 'label', text: 'Smart Cook · 30 minit', x: 520, y: 470, rotate: -4, size: 60, at: 0.6},
      ],
    },
    {
      src: L,
      from: 912,
      to: 930,
      rate: 4.5,
      enter: 'zoom',
      faceLeft: true,
      zoom: {from: {s: 1.55, x: 0.35, y: 0.6}, to: {s: 1.7, x: 0.35, y: 0.6}},
      overlays: [
        {type: 'step', n: 5, text: 'Tutup & biar masak'},
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
      zoom: {from: {s: 1.45, x: 0.3, y: 1.0}, to: {s: 1.6, x: 0.3, y: 1.0}},
      overlays: [
        {type: 'step', n: 6, text: 'Siram kuah atas ayam'},
        {type: 'speed', label: '5x'},
      ],
    },
    {
      src: L,
      from: 2935,
      to: 2951,
      rate: 3,
      enter: 'zoom',
      faceLeft: true,
      zoom: {from: {s: 1.5, x: 0.35, y: 0.6}, to: {s: 1.6, x: 0.35, y: 0.6}},
      overlays: [
        {type: 'step', n: 7, text: 'Tukar tudung, broil'},
        {type: 'label', text: 'broil 10 minit', x: 520, y: 470, rotate: -4, size: 64, at: 1.2},
      ],
      sfx: [{src: 'whoosh-soft', at: 0.8, vol: 0.35}],
    },
    // PAYOFF
    {
      src: L,
      from: 3603,
      to: 3611,
      rate: 1.2,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.4, x: 0.25, y: 0.45}, to: {s: 1.6, x: 0.25, y: 0.4}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.4, lines: [{t: 'AYAM PERCIK'}, {t: 'SIAP!', hl: true, size: 120}]},
        {type: 'sparkles', x: 520, y: 700, at: 0.6, count: 12, spread: 320},
      ],
      sfx: [{src: 'boom', at: 0.4, vol: 0.45}, {src: 'ding-sparkle', at: 0.6, vol: 0.4}],
    },
    {
      src: L,
      from: 3725,
      to: 3731,
      rate: 1.2,
      enter: 'cut',
      zoom: {from: {s: 1.4, x: 0.3, y: 0.55}, to: {s: 1.5, x: 0.3, y: 0.55}},
      overlays: [
        {
          type: 'recipe',
          title: 'CARA',
          items: [
            {qty: '30 min', name: 'Smart Cook'},
            {qty: '10 min', name: 'Broil'},
          ],
          note: 'semua dalam 1 periuk\ntak payah bakar atas arang',
          cta: CTA,
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.4}, {src: 'sting-warm', at: 0.2, vol: 0.45}],
    },
  ],
};
