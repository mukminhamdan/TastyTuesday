import type {Episode} from '../lib/types';

/**
 * SIRI PIZZA FROZEN - EP2: base dari freezer -> topping -> air fryer -> potong.
 * Sources: v195221 (sos, ham, keju, masuk air fryer), v195943 (keju menggelegak),
 * v200030 (potong + tarikan keju). No voice in any clip.
 */
const TOP = 'v195221.mp4';

export const pizzaEp2: Episode = {
  id: 'Pizza-EP2-ToppingBakar',
  series: 'SIRI PIZZA FROZEN',
  ep: 2,
  of: 2,
  name: 'Topping & bakar pizza frozen',
  music: 'pizza.wav',
  musicBed: 0.5,
  shots: [
    // HOOK: payoff first - slow-mo cheese pull
    {
      src: 'v200030.mp4',
      from: 74.6,
      to: 77.6,
      rate: 0.7,
      enter: 'cut',
      audio: 0.6,
      zoom: {from: {s: 1.15, x: 0.55, y: 0.35}, to: {s: 1.45, x: 0.6, y: 0.27}},
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.1,
          lines: [{t: 'PIZZA FROZEN'}, {t: 'BUATAN SENDIRI', hl: true}, {t: 'meleleh macam ni!', marker: true}],
        },
        {type: 'sparkles', x: 600, y: 520, at: 1.9},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'shimmer', at: 1.8, vol: 0.4},
      ],
    },
    // rewind: base straight out of the freezer (made in EP1)
    {
      src: TOP,
      from: 0,
      to: 5,
      rate: 1.5,
      enter: 'glitch',
      audio: 0.3,
      zoom: {from: {s: 1.1, x: 0.4, y: 0.62}, to: {s: 1.3, x: 0.4, y: 0.62}},
      overlays: [
        {type: 'step', n: 1, text: 'Base dari freezer'},
        {type: 'label', text: 'dari EP1!', x: 640, y: 560, rotate: 6, at: 0.6},
      ],
    },
    {
      src: TOP,
      from: 8,
      to: 32,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.3, x: 0.42, y: 0.7}, to: {s: 1.45, x: 0.42, y: 0.7}},
      overlays: [
        {type: 'step', n: 2, text: 'Sapu sos'},
        {type: 'speed', label: '6x'},
      ],
    },
    {
      src: TOP,
      from: 229,
      to: 257,
      rate: 7,
      enter: 'zoom',
      zoom: {from: {s: 1.25, x: 0.42, y: 0.72}, to: {s: 1.4, x: 0.42, y: 0.72}},
      overlays: [
        {type: 'step', n: 3, text: 'Susun ham'},
        {type: 'speed', label: '7x'},
      ],
      sfx: [
        {src: 'pop-small', at: 0.8, vol: 0.45},
        {src: 'pop-small', at: 1.4, vol: 0.45},
        {src: 'pop-small', at: 2.0, vol: 0.45},
        {src: 'pop-small', at: 2.6, vol: 0.45},
        {src: 'pop-small', at: 3.2, vol: 0.45},
      ],
    },
    {
      src: TOP,
      from: 259,
      to: 283,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.25, x: 0.42, y: 0.72}, to: {s: 1.45, x: 0.42, y: 0.72}},
      overlays: [
        {type: 'step', n: 4, text: 'Tabur keju'},
        {type: 'speed', label: '6x'},
      ],
      sfx: [{src: 'shimmer', at: 2.5, vol: 0.3}],
    },
    {
      src: TOP,
      from: 289,
      to: 302,
      rate: 3,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.55, y: 0.6}, to: {s: 1.2, x: 0.6, y: 0.62}},
      overlays: [
        {type: 'step', n: 5, text: 'Masuk air fryer'},
        {type: 'speed', label: '3x'},
      ],
    },
    {
      src: TOP,
      from: 306,
      to: 362,
      rate: 16,
      enter: 'zoom',
      zoom: {from: {s: 1.15, x: 0.5, y: 0.62}, to: {s: 1.4, x: 0.5, y: 0.62}},
      overlays: [{type: 'speed', label: '16x'}],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}],
    },
    {
      src: 'v195943.mp4',
      from: 16,
      to: 27,
      rate: 4,
      enter: 'cut',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.5}, to: {s: 1.55, x: 0.45, y: 0.45}},
      overlays: [
        {type: 'speed', label: '3x'},
        {type: 'label', text: 'keju mula menggelegak!', x: 540, y: 1330, rotate: -5, at: 0.4, arrowTo: {x: 500, y: 930}},
      ],
      sfx: [
        {src: 'clock-fast', at: 0, vol: 0.18},
        {src: 'shimmer-long', at: 0.4, vol: 0.32},
      ],
    },
    {
      src: 'v200030.mp4',
      from: 8.3,
      to: 11.3,
      enter: 'zoom',
      audio: 1,
      zoom: {from: {s: 1.0, x: 0.5, y: 0.45}, to: {s: 1.12, x: 0.45, y: 0.45}},
      overlays: [{type: 'step', n: 6, text: 'Keluarkan & potong'}],
    },
    {
      src: 'v200030.mp4',
      from: 14,
      to: 17,
      rate: 1.25,
      enter: 'whip',
      audio: 1,
      zoom: {from: {s: 1.25, x: 0.45, y: 0.42}, to: {s: 1.35, x: 0.45, y: 0.42}},
    },
    {
      src: 'v200030.mp4',
      from: 30,
      to: 36,
      rate: 2.5,
      enter: 'zoom',
      audio: 0.4,
      zoom: {from: {s: 1.1, x: 0.4, y: 0.45}, to: {s: 1.2, x: 0.4, y: 0.45}},
      overlays: [{type: 'speed', label: '2.5x'}],
    },
    // PAYOFF: full cheese pull, zoom follows the slice up
    {
      src: 'v200030.mp4',
      from: 73.4,
      to: 79.4,
      rate: 0.85,
      enter: 'zoom',
      audio: 0.7,
      asmr: true,
      zoom: {from: {s: 1.1, x: 0.5, y: 0.45}, to: {s: 1.45, x: 0.6, y: 0.3}},
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.4,
          dur: 4.2,
          lines: [{t: 'TENGOK'}, {t: 'TARIKAN KEJU', hl: true}, {t: 'dia!!', marker: true}],
        },
        {type: 'sparkles', x: 620, y: 560, at: 1.6, count: 11},
        {type: 'sparkles', x: 480, y: 760, at: 3.4},
      ],
      sfx: [
        {src: 'riser-1s', at: 0, vol: 0.35},
        {src: 'ding-sparkle', at: 1.5, vol: 0.45},
        {src: 'shimmer', at: 3.3, vol: 0.35},
      ],
    },
    // END CARD -> EP2
    {
      src: 'v200030.mp4',
      from: 79,
      to: 81.5,
      rate: 0.6,
      enter: 'cut',
      audio: 0,
      zoom: {from: {s: 1.2, x: 0.5, y: 0.45}, to: {s: 1.3, x: 0.5, y: 0.45}},
      overlays: [
        {
          type: 'endNext',
          heading: 'Video seterusnya',
          nextEp: 'NEXT',
          nextTitle: 'Mee goreng\n1 periuk!',
          peek: {src: 'v202235.mp4', from: 336, rate: 1, focus: {s: 1.35, x: 0.55, y: 0.5}},
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
