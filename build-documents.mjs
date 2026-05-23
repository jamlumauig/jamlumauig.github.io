import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const entryPoint = path.join(root, 'assets', 'js', 'documents-ui.js');
const outPath = path.join(root, 'assets', 'documents.bundle.js');

fs.mkdirSync(path.dirname(outPath), { recursive: true });

await build({
  entryPoints: [entryPoint],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2019'],
  outfile: outPath,
  logLevel: 'info'
});
