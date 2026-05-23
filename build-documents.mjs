import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const htmlPath = path.join(root, 'documents.html');
const outPath = path.join(root, 'assets', 'documents.bundle.js');

const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script type="text\/plain" id="documents-app-source">([\s\S]*?)<\/script>\s*<script type="module" src="assets\/documents\.bundle\.js"><\/script>/);

if (!match) {
  throw new Error('Could not find the documents app source block in documents.html.');
}

const source = match[1]
  .replaceAll('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js', 'firebase/app')
  .replaceAll('https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js', 'firebase/analytics')
  .replaceAll('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js', 'firebase/auth')
  .replaceAll('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js', 'firebase/firestore')
  .replaceAll('https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js', 'firebase/storage');

fs.mkdirSync(path.dirname(outPath), { recursive: true });

await build({
  stdin: {
    contents: source,
    resolveDir: root,
    sourcefile: 'documents-app.source.js',
    loader: 'js'
  },
  bundle: true,
  format: 'esm',
  target: ['es2019'],
  outfile: outPath,
  platform: 'browser',
  logLevel: 'info'
});
