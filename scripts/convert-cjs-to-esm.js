import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const entries = [
  path.join(__dirname, '../node_modules/.pnpm/jiti@2.4.2/node_modules/jiti/dist/jiti.cjs'),
  path.join(__dirname, '../node_modules/.pnpm/jiti@2.4.2/node_modules/jiti/dist/babel.cjs'),
  path.join(__dirname, '../node_modules/.pnpm/fdir@6.4.4_picomatch@4.0.2/node_modules/fdir/dist/index.js')
];

await Promise.all(entries.map(async (entry) => {
  const filename = path.basename(entry).split('.')[0] + '.mjs';
  await esbuild.build({
    entryPoints: [entry],
    outfile: path.join(path.dirname(entry))+ '/' + filename,
    format: "esm",
    bundle: true,
    platform: 'node',
    target: 'node14',
    external: ['node:*'],
    banner: {
      js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
    }
  });
})).catch(() => process.exit(1));