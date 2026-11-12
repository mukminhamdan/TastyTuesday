import type {Episode} from '../lib/types';

/**
 * SIRI PIZZA FROZEN - EP1: prep base pizza untuk simpan dalam freezer.
 * Source: v132807 (22 min, wide static shot, face visible on the left,
 * bottom ~40% of the frame is a sofa). The prep cycle repeats many times,
 * so we show one cycle properly and compress the repeats into a montage.
 * Zoomed shots focus on the counter (x~0.45, y~0.45), which also keeps the
 * face out of frame; wide shots set faceLeft so badges move to the right.
 */
const PREP = 'v132807.mp4';

export const pizzaEp1: Episode = {
  id: 'Pizza-EP1-PrepBase',
  series: 'SIRI PIZZA FROZEN',
  ep: 1,
  of: 2,
  name: 'Prep base pizza untuk frozen',
  music: 'pizza.wav',
  musicBed: 0.5,
  shots: [
    // HOOK: stack of par-baked bases pushed right up to the camera
    {
      src: PREP,
      from: 1307,
      to: 1311,
      rate: 0.75,
      enter: 'cut',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.62}, to: {s: 1.3, x: 0.5, y: 0.62}},
      overlays: [
        {
          type: 'title',
          pos: 'top',
          at: 0.1,
          lines: [{t: 'BASE PIZZA'}, {t: 'BUAT SENDIRI', hl: true}, {t: 'stok untuk freezer', marker: true, size: 64}],
        },
        {type: 'sparkles', x: 540, y: 1150, at: 0.8, count: 10, spread: 300},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'shimmer', at: 0.8, vol: 0.4},
      ],
    },
    // 01 shape the dough by hand in front of the Cooven (pinch the edge, rotate, let it hang)
    {
      src: PREP,
      from: 281,
      to: 301,
      rate: 5,
      enter: 'glitch',
      audio: 0.3,
      zoom: {from: {s: 1.9, x: 0.02, y: 0.42}, to: {s: 2.0, x: 0.02, y: 0.42}},
      overlays: [
        {type: 'step', n: 1, text: 'Bentuk doh'},
        {type: 'speed', label: '5x'},
      ],
    },
    // ...and the shaped disc is lifted up
    {
      src: PREP,
      from: 303,
      to: 307,
      rate: 1.25,
      enter: 'cut',
      audio: 0.3,
      zoom: {from: {s: 1.7, x: 0.4, y: 0.42}, to: {s: 1.85, x: 0.4, y: 0.42}},
      overlays: [
        {type: 'step', n: 1, text: 'Bentuk doh', at: -2},
        {type: 'label', text: 'bulat dah!', x: 640, y: 560, rotate: 6, at: 0.4},
      ],
      sfx: [{src: 'pop-bubble', at: 0.4, vol: 0.4}],
    },
    // 02 press into the pan
    {
      src: PREP,
      from: 166,
      to: 214,
      rate: 12,
      enter: 'zoom',
      zoom: {from: {s: 1.7, x: 0.4, y: 0.55}, to: {s: 1.9, x: 0.4, y: 0.55}},
      overlays: [
        {type: 'step', n: 2, text: 'Tekan dalam loyang'},
        {type: 'speed', label: '12x'},
      ],
      punches: [1.3, 2.6],
      sfx: [{src: 'tap', at: 1.3, vol: 0.4}, {src: 'tap', at: 2.6, vol: 0.4}],
    },
    // 03 par-bake in the Food Engine Cooven and take it out
    {
      src: PREP,
      from: 1070,
      to: 1078,
      rate: 2,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.6, x: 0.47, y: 0.4}, to: {s: 1.75, x: 0.47, y: 0.42}},
      overlays: [
        {type: 'step', n: 3, text: 'Bakar sekejap'},
        {type: 'speed', label: '2x'},
        {type: 'label', text: 'Food Engine Cooven!', x: 520, y: 560, rotate: 5, size: 58, at: 0.5},
      ],
    },
    // 04 onto the stack
    {
      src: PREP,
      from: 1078,
      to: 1083,
      rate: 1.5,
      enter: 'whip',
      audio: 0.4,
      zoom: {from: {s: 1.6, x: 0.5, y: 0.5}, to: {s: 1.75, x: 0.52, y: 0.5}},
      overlays: [{type: 'step', n: 4, text: 'Keluarkan & susun'}],
    },
    // montage: the cycle repeats, stack grows (step card carries across the cuts)
    {
      src: PREP,
      from: 744,
      to: 768,
      rate: 12,
      enter: 'zoom',
      zoom: {from: {s: 1.55, x: 0.45, y: 0.47}, to: {s: 1.6, x: 0.45, y: 0.47}},
      overlays: [
        {type: 'step', n: 5, text: 'Ulang sampai habis doh'},
        {type: 'speed', label: '12x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.2}],
    },
    {
      src: PREP,
      from: 1236,
      to: 1260,
      rate: 12,
      enter: 'cut',
      zoom: {from: {s: 1.55, x: 0.47, y: 0.5}, to: {s: 1.65, x: 0.5, y: 0.52}},
      overlays: [
        // negative `at` = already on screen, no re-entry animation
        {type: 'step', n: 5, text: 'Ulang sampai habis doh', at: -2},
        {type: 'speed', label: '12x'},
      ],
      sfx: [{src: 'pop-bubble', at: 1.2, vol: 0.4}],
    },
    // PAYOFF: wide shot with the cook, stack held up (face visible on the left)
    {
      src: PREP,
      from: 1300,
      to: 1306,
      enter: 'zoom',
      audio: 0.4,
      faceLeft: true,
      zoom: {from: {s: 1.0, x: 0.5, y: 0.4}, to: {s: 1.08, x: 0.5, y: 0.4}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 1.6, lines: [{t: 'SIAP MASUK'}, {t: 'FREEZER!', hl: true, size: 110}]},
        {type: 'sparkles', x: 560, y: 760, at: 1.8, count: 12, spread: 300},
      ],
      sfx: [
        {src: 'boom', at: 1.6, vol: 0.45},
        {src: 'ding-sparkle', at: 1.8, vol: 0.4},
      ],
    },
    // END CARD -> EP2
    {
      src: PREP,
      from: 1308,
      to: 1311,
      rate: 0.75,
      enter: 'cut',
      zoom: {from: {s: 1.3, x: 0.5, y: 0.62}, to: {s: 1.4, x: 0.5, y: 0.62}},
      overlays: [
        {
          type: 'endNext',
          nextEp: 2,
          nextTitle: 'Dari freezer terus\nFood Engine Cooven!',
          peek: {src: 'v200030.mp4', from: 74.6, rate: 0.7, focus: {s: 1.5, x: 0.58, y: 0.32}},
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
