// Renders the cover/thumbnail stills at full size. Usage: node scripts/render-thumbs.mjs [id ...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['Thumb-DohPizza-A', 'Thumb-DohPizza-B'];
const browserExecutable = process.env.CHROME_PATH;
const serveUrl = process.env.BUNDLE || (await bundle({entryPoint: path.resolve('src/index.ts')}));
fs.mkdirSync('out/thumbs', {recursive: true});
for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const output = `out/thumbs/${id}.jpg`;
  await renderStill({serveUrl, composition, output, imageFormat: 'jpeg', jpegQuality: 95, browserExecutable, chromiumOptions: {gl: 'swangle'}});
  console.log(output);
}
