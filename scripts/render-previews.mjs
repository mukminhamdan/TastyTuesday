// Low-res PREVIEW renders (540x960) of every clip -> out/preview/<id>.mp4
// Final: npx remotion render src/index.ts <id> out/final/<id>.mp4 --crf=16
import {execFileSync} from 'node:child_process';
import {readdirSync, mkdirSync, readFileSync} from 'node:fs';

const only = process.argv.slice(2);
const ids = readdirSync('src/clips')
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((id) => !only.length || only.some((o) => id.startsWith(o)));
mkdirSync('out/preview', {recursive: true});
for (const id of ids) {
  console.log(`\n=== preview ${id}`);
  const silent = JSON.parse(readFileSync(`src/clips/${id}.json`, 'utf8')).music === null;
  const args = ['remotion', 'render', 'src/index.ts', id, `out/preview/${id}.mp4`, `--scale=${process.env.PREVIEW_SCALE ?? '0.5'}`, '--crf=22', '--x264-preset=veryfast'];
  args.push(...(silent ? ['--muted'] : ['--audio-bitrate=128k']));
  execFileSync('npx', args, {stdio: 'inherit'});
}
