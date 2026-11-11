// FINAL 1080x1920 render. Only run after the preview has been approved.
// Usage: node scripts/render-final.mjs [compId ...]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import {normalise} from './loudnorm.mjs';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['Ep1-Pizza', 'Ep2-MeeGoreng', 'Ep3-TelurDadar'];
const browserExecutable = process.env.CHROME_PATH;
const serveUrl = process.env.BUNDLE || (await bundle({entryPoint: path.resolve('src/index.ts')}));
for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const outputLocation = `out/final/${id}.mp4`;
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation, browserExecutable,
    crf: 17, jpegQuality: 95, x264Preset: 'slow', pixelFormat: 'yuv420p',
    concurrency: Number(process.env.CONCURRENCY || 4), audioBitrate: '192k',
    chromiumOptions: {gl: 'swangle'},
    onProgress: ({progress}) => process.stdout.write(`\r${id} ${Math.round(progress * 100)}%   `),
  });
  const m = normalise(outputLocation);
  console.log(`\n${outputLocation}  (loudness ${m.input_i} -> -14 LUFS)`);
}
