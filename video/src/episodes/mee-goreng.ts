import type {Episode} from '../lib/types';

/**
 * Standalone video - Mee goreng satu periuk.
 * Sources: v202235 (masak mee, 8.5 min), v203156 (hidang).
 */
const MEE = 'v202235.mp4';

export const meeGoreng: Episode = {
  id: 'MeeGoreng',
  series: 'MASAK MALAS',
  name: 'Mee goreng 1 periuk',
  music: 'mee.wav',
  musicStart: 22,
  musicBed: 0.45,
  shots: [
    // HOOK: glossy toss
    {
      src: MEE,
      from: 336,
      to: 341,
      enter: 'cut',
      audio: 0.7,
      zoom: {from: {s: 1.2, x: 0.5, y: 0.5}, to: {s: 1.42, x: 0.55, y: 0.48}},
      overlays: [
        {
          type: 'title',
          pos: 'top',
          at: 0.1,
          lines: [{t: 'MEE GORENG'}, {t: '1 PERIUK JE', hl: true}, {t: 'tak sampai 10 minit', marker: true, size: 64}],
        },
      ],
      punches: [2.6],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'zoom-in', at: 2.5, vol: 0.3},
      ],
    },
    {
      src: MEE,
      from: 39.5,
      to: 45,
      rate: 2,
      enter: 'glitch',
      audio: 0.35,
      zoom: {from: {s: 1.1, x: 0.55, y: 0.6}, to: {s: 1.4, x: 0.6, y: 0.6}},
      overlays: [
        {type: 'step', n: 1, text: 'Tumis perencah'},
        {type: 'speed', label: '2x'},
      ],
    },
    {
      src: MEE,
      from: 73.5,
      to: 78.5,
      rate: 1.25,
      enter: 'zoom',
      audio: 1,
      asmr: true,
      zoom: {from: {s: 1.0, x: 0.5, y: 0.55}, to: {s: 1.22, x: 0.5, y: 0.55}},
      overlays: [{type: 'step', n: 2, text: 'Masuk air'}],
    },
    {
      src: MEE,
      from: 81.5,
      to: 100.5,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.05, x: 0.5, y: 0.55}, to: {s: 1.18, x: 0.5, y: 0.55}},
      overlays: [
        {type: 'step', n: 3, text: 'Masuk mee'},
        {type: 'speed', label: '6x'},
      ],
      sfx: [
        {src: 'pop-bubble', at: 0.15, vol: 0.45},
        {src: 'pop-med-bubble', at: 1.5, vol: 0.45},
        {src: 'pop-bubble', at: 1.78, vol: 0.45},
        {src: 'pop-med-bubble', at: 2.6, vol: 0.45},
        {src: 'pop-bubble', at: 2.92, vol: 0.45},
      ],
    },
    {
      src: MEE,
      from: 140,
      to: 166,
      rate: 8,
      enter: 'zoom',
      zoom: {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.12, x: 0.5, y: 0.55}},
      overlays: [
        {type: 'step', n: 4, text: 'Tutup, biar lembut'},
        {type: 'speed', label: '8x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}],
    },
    {
      src: MEE,
      from: 170,
      to: 186,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.55}, to: {s: 1.2, x: 0.5, y: 0.55}},
      overlays: [
        {type: 'step', n: 5, text: 'Leraikan mee'},
        {type: 'speed', label: '6x'},
      ],
    },
    {
      src: MEE,
      from: 306,
      to: 313,
      rate: 2,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.1, x: 0.5, y: 0.5}, to: {s: 1.35, x: 0.5, y: 0.47}},
      overlays: [
        {type: 'step', n: 6, text: 'Masuk kicap'},
        {type: 'speed', label: '2x'},
      ],
      sfx: [{src: 'marker', at: 0.9, vol: 0.35}],
    },
    {
      src: MEE,
      from: 320,
      to: 350,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.25, x: 0.5, y: 0.5}},
      punches: [1.6, 3.2],
      overlays: [
        {type: 'step', n: 7, text: 'Gaul sampai rata'},
        {type: 'speed', label: '6x'},
        {type: 'label', text: 'warna dia!!', x: 560, y: 520, rotate: 6, at: 3.0},
      ],
      sfx: [{src: 'whoosh-soft', at: 1.6, vol: 0.3}, {src: 'whoosh-soft', at: 3.2, vol: 0.3}],
    },
    // PAYOFF
    {
      src: MEE,
      from: 486,
      to: 490.5,
      rate: 1.1,
      enter: 'zoom',
      audio: 0.9,
      asmr: true,
      zoom: {from: {s: 1.2, x: 0.55, y: 0.45}, to: {s: 1.45, x: 0.6, y: 0.4}},
      overlays: [
        {type: 'title', pos: 'top', at: 0.2, lines: [{t: 'SIAP!', hl: true, size: 130}]},
        {type: 'sparkles', x: 540, y: 520, at: 0.3, count: 12, spread: 330},
      ],
      sfx: [
        {src: 'popper', at: 0.2, vol: 0.4},
        {src: 'ding-sparkle', at: 0.35, vol: 0.4},
      ],
    },
    {
      src: 'v203156.mp4',
      from: 15,
      to: 19,
      rate: 1.3,
      enter: 'whip',
      audio: 0.4,
      zoom: {from: {s: 1.0, x: 0.55, y: 0.5}, to: {s: 1.25, x: 0.6, y: 0.55}},
      overlays: [{type: 'label', text: 'hidang panas-panas', x: 520, y: 1330, rotate: -4, at: 0.3}],
    },
    // END CARD -> EP3
    {
      src: 'v203156.mp4',
      from: 35,
      to: 38,
      rate: 0.75,
      enter: 'cut',
      zoom: {from: {s: 1.2, x: 0.45, y: 0.5}, to: {s: 1.3, x: 0.45, y: 0.5}},
      overlays: [
        {
          type: 'endNext',
          heading: 'Video seterusnya',
          nextEp: 'NEXT',
          nextTitle: 'Telur dadar\nTAK PAYAH terbalik!',
          peek: {src: 'v203532.mp4', from: 346.5, rate: 1, focus: {s: 1.45, x: 0.5, y: 0.32}},
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
