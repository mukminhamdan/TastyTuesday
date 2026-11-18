import type {Episode} from '../lib/types';

/**
 * SIRI PIZZA FROZEN - EP 0 (prequel): cara buat doh pizza.
 * Sources (recorded 18 Nov):
 *  - v192604 (14.5 min, top-down on the counter, hands only):
 *      8-56 weigh 300g bread flour, 90-116 pour 180g water, 122-140 1 tsp salt + 1 tsp yeast,
 *      176-576 mix + knead (449-470 / 503-548 kneading in the hands), 616-634 dough on the scale,
 *      692-764 divide into pieces, 770-857 roll into balls, 864-870 close-up of the balls.
 *  - v194042 (60 s): 4 balls on trays, covered with a container (18-40), stack close-up (42).
 * Proofing (from the cook): 12-18 h in the chiller, or 1-2 h at room temperature to bake straight away.
 * No voice in either clip.
 */
const D = 'v192604.mp4';
const T = 'v194042.mp4';

export const pizzaEp0: Episode = {
  id: 'Pizza-EP0-Doh',
  series: 'SIRI PIZZA FROZEN',
  epLabel: 'EP 0',
  name: 'Cara buat doh pizza',
  music: 'alt-funk.wav',
  musicStart: 20,
  musicBed: 0.5,
  shots: [
    // HOOK: close-up of the finished dough balls
    {
      src: D,
      from: 864,
      to: 867.6,
      rate: 0.8,
      enter: 'cut',
      audio: 0.2,
      zoom: {from: {s: 1.05, x: 0.5, y: 0.55}, to: {s: 1.3, x: 0.5, y: 0.55}},
      overlays: [
        {
          type: 'title',
          pos: 'top',
          at: 0.1,
          lines: [{t: 'DOH PIZZA'}, {t: 'BUAT SENDIRI', hl: true}, {t: 'senang je!', marker: true, size: 68}],
        },
        {type: 'sparkles', x: 540, y: 1000, at: 0.9, count: 10, spread: 300},
      ],
      sfx: [
        {src: 'sting', at: 0, vol: 0.5},
        {src: 'impact', at: 0, vol: 0.45},
        {src: 'shimmer', at: 0.9, vol: 0.4},
      ],
    },
    // ingredient card (recipe from the cook)
    {
      src: D,
      from: 1,
      to: 8,
      rate: 2,
      enter: 'glitch',
      overlays: [
        {
          type: 'recipe',
          title: 'BAHAN',
          items: [
            {qty: '300g', name: 'Tepung roti'},
            {qty: '180g', name: 'Air'},
            {qty: '1 tsp', name: 'Garam'},
            {qty: '1 tsp', name: 'Yis'},
          ],
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}],
    },
    // 01 weigh the flour
    {
      src: D,
      from: 10,
      to: 50,
      rate: 10,
      enter: 'zoom',
      zoom: {from: {s: 1.45, x: 0.4, y: 0.8}, to: {s: 1.55, x: 0.4, y: 0.8}},
      overlays: [
        {type: 'step', n: 1, text: '300g tepung roti'},
        {type: 'speed', label: '10x'},
      ],
    },
    // 02 pour the liquid
    {
      src: D,
      from: 92,
      to: 112,
      rate: 5,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.45, x: 0.4, y: 0.8}, to: {s: 1.55, x: 0.4, y: 0.8}},
      overlays: [
        {type: 'step', n: 2, text: '180g air'},
        {type: 'speed', label: '5x'},
      ],
    },
    // 03 salt + yeast (spoon + bottle)
    {
      src: D,
      from: 122,
      to: 140,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.45, x: 0.4, y: 0.8}, to: {s: 1.55, x: 0.4, y: 0.8}},
      overlays: [
        {type: 'step', n: 3, text: '1 tsp garam + 1 tsp yis'},
        {type: 'speed', label: '6x'},
      ],
      sfx: [{src: 'pop-small', at: 0.7, vol: 0.4}, {src: 'pop-small', at: 2.3, vol: 0.4}],
    },
    // 04 mix in the bowl
    {
      src: D,
      from: 176,
      to: 240,
      rate: 16,
      enter: 'zoom',
      zoom: {from: {s: 1.5, x: 0.4, y: 0.5}, to: {s: 1.65, x: 0.4, y: 0.5}},
      overlays: [
        {type: 'step', n: 4, text: 'Gaul sebati'},
        {type: 'speed', label: '16x'},
      ],
      sfx: [{src: 'clock-fast', at: 0, vol: 0.18}],
    },
    // 05 knead in the hands (two cuts, card carries across)
    {
      src: D,
      from: 449,
      to: 470,
      rate: 5,
      enter: 'zoom',
      audio: 0.3,
      zoom: {from: {s: 1.5, x: 0.4, y: 0.45}, to: {s: 1.65, x: 0.4, y: 0.45}},
      overlays: [
        {type: 'step', n: 5, text: 'Uli sampai licin'},
        {type: 'speed', label: '5x'},
      ],
      punches: [1.5, 3],
      sfx: [{src: 'tap', at: 1.5, vol: 0.4}, {src: 'tap', at: 3, vol: 0.4}],
    },
    {
      src: D,
      from: 503,
      to: 548,
      rate: 12,
      enter: 'cut',
      zoom: {from: {s: 1.55, x: 0.4, y: 0.45}, to: {s: 1.7, x: 0.4, y: 0.45}},
      overlays: [
        {type: 'step', n: 5, text: 'Uli sampai licin', at: -2},
        {type: 'speed', label: '12x'},
        {type: 'label', text: 'licin dah!', x: 640, y: 560, rotate: 6, at: 2.4},
      ],
      sfx: [{src: 'shimmer', at: 2.4, vol: 0.35}],
    },
    // 06 weigh the dough
    {
      src: D,
      from: 616,
      to: 634,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.5, x: 0.45, y: 0.48}, to: {s: 1.65, x: 0.45, y: 0.48}},
      overlays: [
        {type: 'step', n: 6, text: 'Timbang doh'},
        {type: 'speed', label: '6x'},
      ],
    },
    // 07 divide into pieces
    {
      src: D,
      from: 692,
      to: 722,
      rate: 8,
      enter: 'zoom',
      zoom: {from: {s: 1.45, x: 0.4, y: 0.42}, to: {s: 1.6, x: 0.4, y: 0.42}},
      overlays: [
        {type: 'step', n: 7, text: 'Bahagi doh'},
        {type: 'speed', label: '8x'},
      ],
      sfx: [
        {src: 'pop-bubble', at: 0.6, vol: 0.4},
        {src: 'pop-med-bubble', at: 1.5, vol: 0.4},
        {src: 'pop-bubble', at: 2.4, vol: 0.4},
        {src: 'pop-med-bubble', at: 3.2, vol: 0.4},
      ],
    },
    // 08 roll into balls
    {
      src: D,
      from: 770,
      to: 830,
      rate: 15,
      enter: 'zoom',
      zoom: {from: {s: 1.45, x: 0.4, y: 0.42}, to: {s: 1.6, x: 0.4, y: 0.42}},
      overlays: [
        {type: 'step', n: 8, text: 'Bulat-bulatkan'},
        {type: 'speed', label: '15x'},
      ],
    },
    // 09 cover and rest
    {
      src: T,
      from: 18,
      to: 40,
      rate: 6,
      enter: 'zoom',
      zoom: {from: {s: 1.35, x: 0.45, y: 0.5}, to: {s: 1.5, x: 0.45, y: 0.5}},
      overlays: [
        {type: 'step', n: 9, text: 'Tutup & proof'},
        {type: 'speed', label: '6x'},
      ],
    },
    // proofing times (from the cook), over the covered container stack
    {
      src: T,
      from: 41.5,
      to: 44,
      rate: 0.6,
      enter: 'zoom',
      zoom: {from: {s: 1.1, x: 0.5, y: 0.45}, to: {s: 1.25, x: 0.5, y: 0.45}},
      overlays: [
        {
          type: 'recipe',
          title: 'MASA PROOF',
          items: [
            {qty: '12–18 jam', name: 'Dalam chiller'},
            {qty: '1–2 jam', name: 'Nak bakar terus*'},
          ],
          note: '*ikut suhu bilik',
        },
      ],
      sfx: [{src: 'whoosh-med', at: 0, vol: 0.35}, {src: 'clock-fast', at: 0.4, vol: 0.2}],
    },
    // PAYOFF: balls lined up on the trays
    {
      src: D,
      from: 852,
      to: 860,
      rate: 2,
      enter: 'zoom',
      zoom: {from: {s: 1.4, x: 0.45, y: 0.45}, to: {s: 1.6, x: 0.45, y: 0.45}},
      overlays: [
        {type: 'title', pos: 'bottom', at: 0.4, lines: [{t: 'SIAP UNTUK'}, {t: 'JADI BASE!', hl: true, size: 110}]},
        {type: 'sparkles', x: 540, y: 820, at: 0.6, count: 12, spread: 300},
      ],
      sfx: [
        {src: 'boom', at: 0.4, vol: 0.45},
        {src: 'ding-sparkle', at: 0.6, vol: 0.4},
      ],
    },
    // END CARD -> EP1
    {
      src: T,
      from: 2,
      to: 5,
      rate: 0.75,
      enter: 'cut',
      zoom: {from: {s: 1.3, x: 0.5, y: 0.45}, to: {s: 1.4, x: 0.5, y: 0.45}},
      overlays: [
        {
          type: 'endNext',
          nextEp: 1,
          nextTitle: 'Bentuk base\nuntuk freezer!',
          peek: {src: 'v132807.mp4', from: 1307, rate: 0.75, focus: {s: 1.3, x: 0.5, y: 0.62}},
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
