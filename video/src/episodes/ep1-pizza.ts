import type {Episode} from '../lib/types';

/**
 * EP1 - Pizza frozen dalam air fryer.
 * Sources: v195943 (pizza dalam air fryer), v200030 (potong + tarikan keju).
 * No voice in any clip -> story is told with on-screen text + kitchen ASMR.
 */
export const ep1: Episode = {
  id: 'Ep1-Pizza',
  ep: 1,
  of: 3,
  name: 'Pizza frozen air fryer',
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
          lines: [{t: 'PIZZA FROZEN'}, {t: 'BOLEH MELELEH', hl: true}, {t: 'macam ni?!', marker: true}],
        },
        {type: 'sparkles', x: 600, y: 520, at: 1.9},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'shimmer', at: 1.8, vol: 0.4},
      ],
    },
    // rewind to the start
    {
      src: 'v195943.mp4',
      from: 2,
      to: 8,
      rate: 3,
      enter: 'glitch',
      zoom: {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.15, x: 0.5, y: 0.45}},
      overlays: [
        {type: 'step', n: 1, text: 'Terus masuk air fryer'},
        {type: 'speed', label: '3x'},
      ],
    },
    {
      src: 'v195943.mp4',
      from: 15,
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
      asmr: true,
      zoom: {from: {s: 1.0, x: 0.5, y: 0.45}, to: {s: 1.12, x: 0.45, y: 0.45}},
      overlays: [{type: 'step', n: 2, text: 'Keluarkan & potong'}],
    },
    {
      src: 'v200030.mp4',
      from: 14,
      to: 17,
      rate: 1.25,
      enter: 'whip',
      audio: 1,
      asmr: true,
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
    {
      src: 'v200030.mp4',
      from: 44,
      to: 50,
      rate: 2.5,
      enter: 'zoom',
      audio: 0.4,
      zoom: {from: {s: 1.1, x: 0.5, y: 0.45}, to: {s: 1.22, x: 0.5, y: 0.45}},
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
          nextEp: 2,
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
