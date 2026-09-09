import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const html = await fs.readFile('app.html', 'utf8');
if (html.includes('vocal-duet-chunk-')) throw new Error('chunk dependency found');
if ((html.match(/data:image\/webp;base64,/g) || []).length !== 10) throw new Error('expected 10 WebP images');
if (!html.includes('Vocalink')) throw new Error('Vocalink marker missing');
await fs.mkdir('dist', { recursive: true });
await fs.writeFile('dist/index.html', html);
console.log('Standalone Vocalink:', html.length, 'chars, sha256', createHash('sha256').update(html).digest('hex'));
