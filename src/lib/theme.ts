import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

/**
 * Safe zone shared by TikTok + IG Reels (1080x1920):
 * top ~220px (status/tabs), bottom ~420px (caption, music ticker, CTA),
 * right ~140px (like/comment/share rail), left ~60px.
 */
export const SAFE = {top: 230, bottom: 1500, left: 70, right: 930};

export const C = {
  ink: '#0E0C0A',
  paper: '#FFF8EE',
  butter: '#FFC94A',
  chili: '#FF5A36',
  leaf: '#9BE37C',
  smoke: 'rgba(14,12,10,0.55)',
};

export const F = {
  display: 'Archivo',
  serif: 'Instrument Serif',
  mono: 'JetBrains Mono',
};

let loaded = false;
export const loadFonts = () => {
  if (loaded) return;
  loaded = true;
  loadFont({family: F.display, url: staticFile('fonts/Archivo-wdth.woff2'), weight: '100 900', stretch: '62% 125%'});
  loadFont({family: F.display, url: staticFile('fonts/Archivo-wdth-italic.woff2'), weight: '100 900', stretch: '62% 125%', style: 'italic'});
  loadFont({family: F.serif, url: staticFile('fonts/InstrumentSerif.woff2'), weight: '400'});
  loadFont({family: F.serif, url: staticFile('fonts/InstrumentSerif-Italic.woff2'), weight: '400', style: 'italic'});
  loadFont({family: F.mono, url: staticFile('fonts/JetBrainsMono-500.woff2'), weight: '500'});
};
