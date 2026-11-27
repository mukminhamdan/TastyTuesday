// FINAL 1080x1920 render. Only run after the preview has been approved.
// Usage: node scripts/render-final.mjs [compId ...]
//   SHARPEN=1  -> extra pass: light unsharp mask + x264 slow/CRF16 (crisper zoomed shots, survives re-compression)
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {normalise} from './loudnorm.mjs';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['PesGulai', 'PesGulai-Quote1', 'PesGulai-Quote2'];
const browserExecutable = process.env.CHROME_PATH;
const serveUrl = process.env.BUNDLE || (await bundle({entryPoint: path.resolve('src/index.ts')}));
const sharpen = process.env.SHARPEN === '1';
fs.mkdirSync('out/final', {recursive: true});

for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const outputLocation = `out/final/${id}.mp4`;
  const t0 = Date.now();
  await renderMedia({
    serveUrl, composition, codec: 'h264', outputLocation, browserExecutable,
    crf: sharpen ? 14 : 17, jpegQuality: 100, x264Preset: 'medium', pixelFormat: 'yuv420p',
    concurrency: Number(process.env.CONCURRENCY || 4), audioBitrate: '192k',
    // 4K phone clips + the long live recording: frame extraction can take longer than the 28 s default
    timeoutInMilliseconds: Number(process.env.TIMEOUT || 120000),
    chromiumOptions: {gl: 'swangle'},
    onProgress: ({progress}) => process.stdout.write(`\r${id} ${Math.round(progress * 100)}%   `),
  });
  if (sharpen) {
    const tmp = outputLocation.replace(/\.mp4$/, '.sharp.mp4');
    execFileSync('ffmpeg', [
      '-nostdin', '-v', 'error', '-y', '-i', outputLocation,
      '-vf', 'unsharp=5:5:0.55:5:5:0.0',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-c:a', 'copy', '-movflags', '+faststart', tmp,
    ]);
    fs.renameSync(tmp, outputLocation);
  }
  const m = normalise(outputLocation);
  console.log(`\n${outputLocation}  (loudness ${m.input_i} -> -14 LUFS) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
