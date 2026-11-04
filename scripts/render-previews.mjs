// Low-res PREVIEW renders (540x960) of every clip -> out/preview/<id>.mp4
// Final: npx remotion render src/index.ts <id> out/final/<id>.mp4 --crf=16
import {execFileSync} from 'node:child_process';
import {readdirSync, mkdirSync} from 'node:fs';

const only = process.argv.slice(2);
const ids = readdirSync('src/clips')
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((id) => !only.length || only.some((o) => id.startsWith(o)));
mkdirSync('out/preview', {recursive: true});
for (const id of ids) {
  console.log(`\n=== preview ${id}`);
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', id, `out/preview/${id}.mp4`, '--scale=0.5', '--crf=26', '--x264-preset=veryfast', '--audio-bitrate=128k'], {stdio: 'inherit'});
}
