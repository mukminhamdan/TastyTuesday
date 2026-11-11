// Usage: node scripts/stills.mjs <compId> <frame,frame,...> [safe]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const [comp, framesArg, safe] = process.argv.slice(2);
const browserExecutable = process.env.CHROME_PATH;
const serveUrl = process.env.BUNDLE || (await bundle({entryPoint: path.resolve('src/index.ts')}));
const inputProps = safe ? {showSafeZone: true} : {};
const composition = await selectComposition({serveUrl, id: comp, inputProps, browserExecutable});
fs.mkdirSync('out/stills', {recursive: true});
for (const f of framesArg.split(',').map(Number)) {
  const output = `out/stills/${comp}-${String(f).padStart(4, '0')}${safe ? '-safe' : ''}.jpg`;
  await renderStill({serveUrl, composition, frame: f, output, imageFormat: 'jpeg', scale: 0.5, inputProps, browserExecutable, chromiumOptions: {gl: 'swangle'}});
  console.log(output);
}
console.log('frames', composition.durationInFrames);
