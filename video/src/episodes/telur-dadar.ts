import type {Episode} from '../lib/types';

/**
 * Standalone video - Telur dadar air fryer, tak payah terbalik (+ menu recap).
 * Source: v203532. Egg goes in at ~218s, comes out puffed at ~345s (~2 min).
 */
const EGG = 'v203532.mp4';
const POUR = 218; // source second the egg hits the pan -> timer zero

export const telurDadar: Episode = {
  id: 'TelurDadar',
  series: 'MASAK MALAS',
  name: 'Telur dadar tak payah terbalik',
  music: 'telur.wav',
  musicBed: 0.5,
  shots: [
    // HOOK: puffed-up omelette, nobody flipped it
    {
      src: EGG,
      from: 346.5,
      to: 351.5,
      enter: 'cut',
      audio: 0.25,
      zoom: {from: {s: 1.15, x: 0.5, y: 0.32}, to: {s: 1.42, x: 0.5, y: 0.3}},
      overlays: [
        {
          type: 'title',
          pos: 'bottom',
          at: 0.1,
          lines: [{t: 'TELUR DADAR', size: 86}, {t: 'TAK PAYAH TERBALIK!', hl: true, size: 62}, {t: 'air fryer buat kerja', marker: true, size: 62}],
        },
        {type: 'sparkles', x: 540, y: 560, at: 0.5, count: 10},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'inflate', at: 0.15, vol: 0.45},
        {src: 'impact', at: 0, vol: 0.4},
      ],
    },
    {
      src: EGG,
      from: 20,
      to: 32,
      rate: 6,
      enter: 'glitch',
      zoom: {from: {s: 1.0, x: 0.5, y: 0.5}, to: {s: 1.15, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'step', n: 1, text: 'Panaskan air fryer'},
        {type: 'speed', label: '6x'},
      ],
    },
    {
      src: EGG,
      from: 147.5,
      to: 152.5,
      rate: 2,
      enter: 'zoom',
      audio: 0.4,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.5}, to: {s: 1.2, x: 0.5, y: 0.5}},
      overlays: [
        {type: 'step', n: 2, text: 'Pukul telur'},
        {type: 'speed', label: '2x'},
      ],
    },
    {
      src: EGG,
      from: 211,
      to: 216,
      rate: 2.5,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.0, x: 0.5, y: 0.6}, to: {s: 1.15, x: 0.5, y: 0.6}},
      overlays: [{type: 'step', n: 3, text: 'Masuk loyang'}],
    },
    {
      src: EGG,
      from: 217.5,
      to: 222.5,
      rate: 1.1,
      enter: 'cut',
      audio: 1,
      asmr: true,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.55}, to: {s: 1.32, x: 0.5, y: 0.6}},
      overlays: [{type: 'step', n: 4, text: 'Tuang telur'}],
    },
    {
      src: EGG,
      from: 226,
      to: 292,
      rate: 16,
      enter: 'zoom',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.6}, to: {s: 1.3, x: 0.5, y: 0.62}},
      overlays: [
        {type: 'step', n: 5, text: 'Tutup & tunggu'},
        {type: 'speed', label: '16x'},
        {type: 'timer', fromSec: 226 - POUR, toSec: 292 - POUR},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.22}, {src: 'clock-fast', at: 2.3, vol: 0.22}],
    },
    {
      src: EGG,
      from: 297,
      to: 327,
      rate: 16,
      enter: 'cut',
      zoom: {from: {s: 1.3, x: 0.5, y: 0.62}, to: {s: 1.4, x: 0.5, y: 0.62}},
      overlays: [
        {type: 'speed', label: '16x'},
        {type: 'timer', fromSec: 297 - POUR, toSec: 327 - POUR},
      ],
    },
    {
      src: EGG,
      from: 338,
      to: 343,
      rate: 2,
      enter: 'zoom',
      zoom: {from: {s: 1.2, x: 0.5, y: 0.58}, to: {s: 1.42, x: 0.5, y: 0.58}},
      overlays: [
        {type: 'timer', fromSec: 338 - POUR, toSec: 343 - POUR, caption: '± 2 minit je'},
        {type: 'label', text: 'dia kembang!!', x: 540, y: 1330, rotate: -5, at: 0.4},
      ],
      sfx: [{src: 'inflate', at: 0.4, vol: 0.45}],
    },
    // PAYOFF: pulled out, puffy, never flipped
    {
      src: EGG,
      from: 343.8,
      to: 349,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.1, x: 0.5, y: 0.4}, to: {s: 1.35, x: 0.5, y: 0.33}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.8, lines: [{t: 'GEBU'}, {t: 'TANPA TERBALIK', hl: true, size: 76}]},
        {type: 'sparkles', x: 540, y: 600, at: 0.9, count: 12, spread: 320},
      ],
      sfx: [
        {src: 'boom', at: 0.8, vol: 0.5},
        {src: 'ding-sparkle', at: 0.9, vol: 0.4},
      ],
    },
    {
      src: EGG,
      from: 387,
      to: 395,
      rate: 2,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.05, x: 0.45, y: 0.6}, to: {s: 1.2, x: 0.45, y: 0.6}},
      overlays: [
        {type: 'step', n: 6, text: 'Pindah ke pinggan'},
        {type: 'speed', label: '2x'},
      ],
    },
    {
      src: EGG,
      from: 415.5,
      to: 420,
      rate: 1.2,
      enter: 'whip',
      audio: 0.7,
      asmr: true,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.55}, to: {s: 1.2, x: 0.55, y: 0.5}},
      sfx: [{src: 'whoosh-soft', at: 0.6, vol: 0.35}],
    },
    // SERIES FINALE
    {
      src: EGG,
      from: 429.5,
      to: 433,
      rate: 0.7,
      enter: 'cut',
      zoom: {from: {s: 1.2, x: 0.5, y: 0.5}, to: {s: 1.3, x: 0.5, y: 0.5}},
      overlays: [
        {
          type: 'finale',
          tiles: [
            {src: 'v200030.mp4', from: 74.6, rate: 0.7, label: 'Pizza', focus: {s: 1.5, x: 0.58, y: 0.32}},
            {src: 'v203156.mp4', from: 15.5, rate: 1, label: 'Mee', focus: {s: 1.5, x: 0.62, y: 0.55}},
            {src: EGG, from: 347, rate: 1, label: 'Telur', focus: {s: 1.7, x: 0.5, y: 0.32}},
          ],
        },
      ],
      sfx: [
        {src: 'whoosh-med', at: 0, vol: 0.4},
        {src: 'popper', at: 0.3, vol: 0.4},
        {src: 'sting-warm', at: 0.4, vol: 0.45},
        {src: 'pop-bubble', at: 1.0, vol: 0.4},
      ],
    },
  ],
};
