/**
 * Builds data/en_subtlex_zipf.json from SUBTLEX-US (subtitle / spoken-dialogue norms).
 *
 * Source (CC-BY-SA): mirrored text version used in teaching repos; original:
 * Brysbaert, M., & New, B. (2009). Behavior Research Methods, 41(4), 977–990.
 * Prefer downloading from https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus
 * if this mirror moves.
 *
 * Output: { "WORD": Lg10WF, ... } — log10 corpus frequency (same use as book zipf in app).
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../data/en_subtlex_zipf.json');
const DEFAULT_URL =
    'https://raw.githubusercontent.com/cltl/python-for-text-analysis/master/Data/SUBTLEX-US/SUBTLEXus74286wordstextversion.txt';

const url = process.env.SUBTLEX_US_URL || DEFAULT_URL;
let text;
if (process.env.SUBTLEX_US_PATH) {
    const p = resolve(process.cwd(), process.env.SUBTLEX_US_PATH);
    if (!existsSync(p)) throw new Error(`SUBTLEX_US_PATH not found: ${p}`);
    text = readFileSync(p, 'utf8');
} else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
    text = await res.text();
}

const lines = text.split(/\r?\n/);
const header = lines[0].split('\t').map((s) => s.trim().toLowerCase());
const iWord = header.indexOf('word');
const iLg = header.indexOf('lg10wf');
if (iWord < 0 || iLg < 0) {
    throw new Error(`Unexpected SUBTLEX header: ${lines[0]}`);
}

const out = {};
for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim()) continue;
    const cols = line.split('\t');
    const rawW = (cols[iWord] || '').trim();
    if (!/^[a-zA-Z]+$/.test(rawW)) continue;
    const lg = parseFloat((cols[iLg] || '').replace(',', '.'));
    if (!Number.isFinite(lg)) continue;
    out[rawW.toUpperCase()] = lg;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out), 'utf8');
console.log('Wrote', OUT, 'entries', Object.keys(out).length, 'from', url);
