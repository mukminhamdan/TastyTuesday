// Low-res PREVIEW render (540x960). Not the final export.
// Usage: node scripts/render-preview.mjs [compId ...]
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import {normalise} from './loudnorm.mjs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['Pizza-EP1-PrepBase', 'Pizza-EP2-ToppingBakar', 'MeeGoreng', 'TelurDadar'];
const browserExecutable = process.env.CHROME_PATH;
const serveUrl = process.env.BUNDLE || (await bundle({entryPoint: path.resolve('src/index.ts')}));
for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const outputLocation = `out/preview/${id}-PREVIEW.mp4`;
  const t0 = Date.now();
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation, browserExecutable,
    scale: 0.5, crf: 26, jpegQuality: 75, concurrency: Number(process.env.CONCURRENCY || 4),
    audioBitrate: '128k', chromiumOptions: {gl: 'swangle'},
    onProgress: ({progress}) => { if (Math.round(progress * 100) % 10 === 0) process.stdout.write(`\r${id} ${Math.round(progress * 100)}%   `); },
  });
  const m = normalise(outputLocation);
  console.log(`\nloudness ${m.input_i} LUFS -> -14 LUFS`);
  console.log(`${outputLocation} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
