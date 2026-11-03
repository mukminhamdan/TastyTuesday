// Usage: node scripts/stills.mjs <compId> <frame,frame,...> [scale]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
const [id, frames, scale = '0.4'] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const composition = await selectComposition({serveUrl, id, browserExecutable});
for (const f of frames.split(',').map(Number)) {
  await renderStill({composition, serveUrl, frame: f, output: `out/stills/${id}_${f}.png`, scale: Number(scale), browserExecutable, timeoutInMilliseconds: 120000});
  console.log('ok', id, f);
}
