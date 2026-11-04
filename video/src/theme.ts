import {continueRender, delayRender, staticFile} from 'remotion';

export const C = {
  ink: '#0E0C0A',
  ink2: '#1A1511',
  cream: '#FFF3E2',
  gold: '#FFC94D',
  white: '#FFFFFF',
  muted: 'rgba(255,243,226,0.66)',
};

export const F = {
  display: "'Unbounded', sans-serif",
  serif: "'Instrument Serif', serif",
  sans: "'Bricolage Grotesque', sans-serif",
  wide: "'Archivo', sans-serif",
};

const faces: [string, string, string, string, string?][] = [
  ['Unbounded', 'fonts/Unbounded-600-900-normal.woff2', '600 900', 'normal'],
  ['Instrument Serif', 'fonts/InstrumentSerif-400-normal.woff2', '400', 'normal'],
  ['Instrument Serif', 'fonts/InstrumentSerif-400-italic.woff2', '400', 'italic'],
  ['Bricolage Grotesque', 'fonts/Bricolage-500-800-normal.woff2', '500 800', 'normal'],
  ['Archivo', 'fonts/Archivo-700-900-normal.woff2', '700 900', 'normal', '62% 125%'],
];

let loaded = false;
export const loadFonts = () => {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  const handle = delayRender('fonts');
  Promise.all(
    faces.map(([family, file, weight, style, stretch]) => {
      const ff = new FontFace(family, `url(${staticFile(file)}) format('woff2')`, {
        weight,
        style,
        ...(stretch ? {stretch} : {}),
      });
      return ff.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};

export type Face = {x: number; y: number; w: number; h: number} | null;
export type Piece = {src: number; vsrc?: number; cy?: number; dur: number; frm: number; zoom: number; push: number; face: Face; clip: number; tag: string};
export type CapWord = {t: string; f: number; hl: boolean};
export type Caption = {frm: number; end: number; words: CapWord[]};
export type Overlay = {type: string; frm: number; dur: number; props: Record<string, any>; clip: number};
export type Sfx = {name: string; frm: number; vol: number};
export type Timeline = {
  id: string;
  fps: number;
  layout: 'short' | 'wide';
  style?: 'snappy' | 'cinema';
  punch?: number[];
  whips?: number[];
  total: number;
  pieces: Piece[];
  captions: Caption[];
  overlays: Overlay[];
  sfx: Sfx[];
  speech: [number, number][];
  music: string;
  chapters: {key: string; frm: number; menu: string}[];
};

export const MENUS: Record<string, {menu: string; chef: string; mode: string; accent: string; n: number}> = {
  roll: {menu: 'Sardin Roll', chef: 'Mukmin', mode: 'Deep Fry', accent: '#FF7A1A', n: 1},
  wrap: {menu: 'Tortilla Spicy Tuna', chef: 'Kak Hani', mode: 'Grill', accent: '#FF5436', n: 2},
  puff: {menu: 'Sardin Puff', chef: 'Kak Salmah', mode: 'Oven', accent: '#F2A93B', n: 3},
  sambal: {menu: 'Sambal Sardin', chef: 'Mak Ida', mode: 'Cooker', accent: '#E8344E', n: 4},
  pizza: {menu: 'Pizza Tuna', chef: 'Kak Piah', mode: 'Pizza', accent: '#FFB000', n: 5},
  reel: {menu: '5 Menu', chef: '', mode: '', accent: '#FF8A2A', n: 0},
  bloopers: {menu: 'Bloopers', chef: '', mode: '', accent: '#FFC94D', n: 0},
};
