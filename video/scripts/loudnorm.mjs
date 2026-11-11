// Two-pass EBU R128 loudness normalisation for TikTok / Reels (-14 LUFS, -1.5 dBTP).
// The video stream is copied untouched; only the audio is re-encoded.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';

export const normalise = (file, I = -14, TP = -1.5, LRA = 11) => {
  const probe = spawnSync(
    'ffmpeg',
    ['-nostdin', '-hide_banner', '-i', file, '-af', `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, '-f', 'null', '-'],
    {encoding: 'utf8'},
  ).stderr;
  const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1));
  const tmp = file.replace(/\.mp4$/, '.norm.mp4');
  execFileSync('ffmpeg', [
    '-nostdin', '-v', 'error', '-y', '-i', file, '-c:v', 'copy', '-af',
    `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp,
  ]);
  fs.renameSync(tmp, file);
  return m;
};
