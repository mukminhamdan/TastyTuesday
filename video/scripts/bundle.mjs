// Bundles the project. PUBLIC_DIR=public-xyz bundles a slimmer public folder
// (see scripts/make-public.sh) so we don't copy every clip into each bundle.
import {bundle} from '@remotion/bundler';
import path from 'node:path';
const publicDir = process.env.PUBLIC_DIR ? path.resolve(process.env.PUBLIC_DIR) : undefined;
const out = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve(process.env.OUT || 'out/bundle'), publicDir});
console.log(out);
