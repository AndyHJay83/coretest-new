/**
 * Downloads English unigram counts (hermitdave/FrequencyWords en_50k),
 * writes data/en_unigram_zipf.json: { "WORD": log10(count), ... } (A–Z keys only).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../data/en_unigram_zipf.json');
const URL =
 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt';

const res = await fetch(URL);
if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
const text = await res.text();
const out = {};
for (const line of text.split('\n')) {
    const m = line.match(/^([a-z]+)\s+(\d+)\s*$/i);
    if (!m) continue;
    const w = m[1].toUpperCase();
    const c = Number(m[2]);
    if (!w || !Number.isFinite(c) || c <= 0) continue;
    out[w] = Math.log10(c);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out), 'utf8');
console.log('Wrote', OUT, 'entries', Object.keys(out).length);
