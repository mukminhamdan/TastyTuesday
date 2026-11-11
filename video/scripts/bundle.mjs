import {bundle} from '@remotion/bundler';
import path from 'node:path';
const out = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve('out/bundle')});
console.log(out);
