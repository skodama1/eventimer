// Web資産を Capacitor 用の www/ にコピーする
import { cpSync, rmSync, mkdirSync } from 'node:fs';

const FILES = ['index.html', 'style.css', 'app.js', 'sw.js', 'manifest.webmanifest'];
const DIRS = ['icons'];

rmSync('www', { recursive: true, force: true });
mkdirSync('www');

for (const f of FILES) cpSync(f, `www/${f}`);
for (const d of DIRS) cpSync(d, `www/${d}`, { recursive: true });

console.log('www/ built');
