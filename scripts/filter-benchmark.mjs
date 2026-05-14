#!/usr/bin/env node
/**
 * Rank filters by how much they can remove from a wordlist in one "run" of their
 * analyzeFunction (from features-config.json), plus an explicit E21 path tree.
 *
 * Usage:
 *   node scripts/filter-benchmark.mjs
 *   node scripts/filter-benchmark.mjs --wordlist words/134K.txt
 *   node scripts/filter-benchmark.mjs --id e21,o,consonant
 *   node scripts/filter-benchmark.mjs --include-heavy
 *   node scripts/filter-benchmark.mjs --json
 *
 * Default skips very slow analyzers (nested T9 lie/truth scans). Use --include-heavy to run them.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/** Skipped unless --include-heavy (each can take minutes on ~130k words). */
const HEAVY_IDS = new Set(['t9OneLie', 't9OneTruth', 'pianoForte']);

function parseArgs(argv) {
  const out = {
    wordlist: path.join(repoRoot, 'words', '134K.txt'),
    json: false,
    ids: null,
    includeHeavy: false,
    e21Anywhere: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--include-heavy') out.includeHeavy = true;
    else if (a === '--e21-anywhere') out.e21Anywhere = true;
    else if (a === '--wordlist') out.wordlist = path.resolve(repoRoot, argv[++i] || '');
    else if (a === '--id' || a === '--ids') out.ids = new Set((argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean));
  }
  return out;
}

function loadWordlist(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

function filterWordsByEee(words, mode) {
  return words.filter((word) => {
    if (word.length < 2) return false;
    const secondChar = word[1].toUpperCase();
    switch (mode) {
      case 'E':
        return secondChar === 'E';
      case 'YES': {
        const yesLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
        return yesLetters.has(secondChar);
      }
      case 'NO': {
        const noLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
        return !noLetters.has(secondChar);
      }
      default:
        return false;
    }
  });
}

function filterWordsByEeeFirst(words, mode) {
  return words.filter((word) => {
    if (word.length < 1) return false;
    const firstChar = word[0].toUpperCase();
    switch (mode) {
      case 'E':
        return firstChar === 'E';
      case 'YES': {
        const yesLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
        return yesLetters.has(firstChar);
      }
      case 'NO': {
        const noLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
        return !noLetters.has(firstChar);
      }
      default:
        return false;
    }
  });
}

function analyzeE21(wordlist, totalWords, e21CheckAnywhere) {
  const modes = ['E', 'YES', 'NO'];
  const results = [];
  for (const p1 of modes) {
    const w1 = filterWordsByEee(wordlist, p1);
    for (const p2 of modes) {
      const w2 = filterWordsByEeeFirst(w1, p2);
      const answeredEInPosition = p1 === 'E' || p2 === 'E';
      if (e21CheckAnywhere && !answeredEInPosition) {
        for (const hasE of [true, false]) {
          const w3 = w2.filter((word) => {
            const has = word.toUpperCase().includes('E');
            return hasE ? has : !has;
          });
          results.push({
            param: `EEE? ${p1} → EEEFIRST ${p2} → E anywhere ${hasE ? 'YES' : 'NO'}`,
            wordsLeft: w3.length,
            percentFiltered: 100 * (1 - w3.length / totalWords),
          });
        }
      } else {
        results.push({
          param: `EEE? ${p1} → EEEFIRST ${p2}`,
          wordsLeft: w2.length,
          percentFiltered: 100 * (1 - w2.length / totalWords),
        });
      }
    }
  }
  return results;
}

function summarizeRows(rows, totalWords) {
  if (!rows || rows.length === 0) {
    return {
      branches: 0,
      maxPct: 0,
      minPct: 0,
      avgPct: 0,
      maxPctNonEmpty: 0,
      maxWordsLeft: totalWords,
      minWordsLeft: totalWords,
    };
  }
  const pcts = rows.map((r) => Number(r.percentFiltered) || 0);
  const lefts = rows.map((r) => Number(r.wordsLeft) || 0);
  const nonempty = rows.filter((r) => Number(r.wordsLeft) > 0);
  const pctsNonEmpty = nonempty.map((r) => Number(r.percentFiltered) || 0);
  return {
    branches: rows.length,
    maxPct: Math.max(...pcts),
    minPct: Math.min(...pcts),
    avgPct: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    maxPctNonEmpty: pctsNonEmpty.length ? Math.max(...pctsNonEmpty) : 0,
    maxWordsLeft: Math.max(...lefts),
    minWordsLeft: Math.min(...lefts),
  };
}

function isPlaceholder(rows, totalWords) {
  if (!rows || rows.length === 0) return true;
  return rows.every(
    (r) =>
      (Number(r.percentFiltered) === 0 || Number.isNaN(Number(r.percentFiltered))) &&
      Number(r.wordsLeft) === totalWords
  );
}

function printHelp() {
  console.log(`filter-benchmark.mjs — compare filter strength on a static wordlist

Options:
  --wordlist <path>   Default: words/134K.txt
  --id a,b,c          Only these feature ids
  --e21-anywhere      Model E21 with Settings "E anywhere" step (default: off, matches app default)
  --include-heavy     Also run pianoForte, t9OneLie, t9OneTruth (very slow on large lists)
  --json              Machine-readable output
  --help              This message
`);
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const configPath = path.join(repoRoot, 'features-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const features = config.features || [];

  if (!fs.existsSync(opts.wordlist)) {
    console.error(`Wordlist not found: ${opts.wordlist}`);
    process.exit(1);
  }

  const wordlist = loadWordlist(opts.wordlist);
  const totalWords = wordlist.length;
  if (totalWords === 0) {
    console.error('Wordlist is empty.');
    process.exit(1);
  }

  const rows = [];

  for (const feat of features) {
    if (opts.ids && !opts.ids.has(feat.id)) continue;
    if (!opts.includeHeavy && HEAVY_IDS.has(feat.id)) continue;

    if (feat.id === 'e21') {
      const detail = analyzeE21(wordlist, totalWords, opts.e21Anywhere);
      const s = summarizeRows(detail, totalWords);
      rows.push({
        id: feat.id,
        displayName: feat.displayName || feat.name,
        ...s,
        placeholder: false,
        note: opts.e21Anywhere ? 'E21 full tree with E-anywhere when no E at pos 1/2' : 'E21 full tree (no E-anywhere step)',
        sampleParams: detail.sort((a, b) => b.percentFiltered - a.percentFiltered).slice(0, 3).map((r) => r.param),
      });
      continue;
    }

    const src = feat.analyzeFunction;
    if (typeof src !== 'string' || !src.trim()) continue;

    let detail;
    try {
      const fn = new Function('wordlist', 'totalWords', src);
      detail = fn(wordlist, totalWords);
    } catch (e) {
      rows.push({
        id: feat.id,
        displayName: feat.displayName || feat.name,
        branches: 0,
        maxPct: 0,
        minPct: 0,
        avgPct: 0,
        maxPctNonEmpty: 0,
        maxWordsLeft: totalWords,
        minWordsLeft: totalWords,
        placeholder: true,
        error: e.message,
      });
      continue;
    }

    if (!Array.isArray(detail)) {
      rows.push({
        id: feat.id,
        displayName: feat.displayName || feat.name,
        branches: 0,
        maxPct: 0,
        minPct: 0,
        avgPct: 0,
        maxPctNonEmpty: 0,
        placeholder: true,
        error: 'analyzeFunction did not return an array',
      });
      continue;
    }

    const s = summarizeRows(detail, totalWords);
    const placeholder = isPlaceholder(detail, totalWords);
    const top = [...detail].sort((a, b) => (b.percentFiltered || 0) - (a.percentFiltered || 0)).slice(0, 2);
    rows.push({
      id: feat.id,
      displayName: feat.displayName || feat.name,
      ...s,
      placeholder,
      sampleParams: top.map((r) => r.param),
    });
  }

  const ranked = [...rows].sort((a, b) => {
    if (a.placeholder !== b.placeholder) return a.placeholder ? 1 : -1;
    const score = (r) => (r.maxPctNonEmpty > 0 ? r.maxPctNonEmpty : r.maxPct);
    return score(b) - score(a);
  });

  if (opts.json) {
    console.log(JSON.stringify({ totalWords, wordlist: opts.wordlist, features: ranked }, null, 2));
    return;
  }

  console.log(`Wordlist: ${opts.wordlist}`);
  console.log(`Words: ${totalWords.toLocaleString()}\n`);
  console.log(
    'Ranked by max % removed (uses max among branches that still leave ≥1 word when possible; else raw max).'
  );
  console.log('"avg" = mean of all branches. Skip = placeholder or 0% on all branches.\n');

  const wId = 14;
  const wName = 28;
  const wBr = 6;
  const wMax = 8;
  const wMx2 = 8;
  const wAvg = 8;
  const wMin = 8;
  const head = `${'id'.padEnd(wId)} ${'displayName'.padEnd(wName)} ${'br'.padStart(wBr)} ${'max%'.padStart(wMax)} ${'max*'.padStart(wMx2)} ${'avg%'.padStart(wAvg)} ${'min%'.padStart(wMin)}  note`;
  console.log(head);
  console.log('-'.repeat(head.length + 24));
  console.log('max* = best branch with at least one word left (avoids ranking on "0 words left" paths).\n');

  for (const r of ranked) {
    const tag = r.placeholder ? '[skip]' : '';
    const note = r.error || r.note || (r.sampleParams && r.sampleParams[0]) || '';
    const shortNote = note.length > 36 ? note.slice(0, 33) + '...' : note;
    const maxStar = (r.maxPctNonEmpty || 0) > 0 ? r.maxPctNonEmpty.toFixed(1) : '—';
    console.log(
      `${r.id.padEnd(wId)} ${(r.displayName || '').slice(0, wName).padEnd(wName)} ${String(r.branches).padStart(wBr)} ${r.maxPct.toFixed(1).padStart(wMax)} ${String(maxStar).padStart(wMx2)} ${r.avgPct.toFixed(1).padStart(wAvg)} ${r.minPct.toFixed(1).padStart(wMin)}  ${tag} ${shortNote}`
    );
  }

  const e21 = ranked.find((x) => x.id === 'e21');
  if (e21 && !e21.placeholder) {
    console.log('\n--- E21 (worth keeping?) ---');
    const bestUseful = e21.maxPctNonEmpty > 0 ? e21.maxPctNonEmpty : e21.maxPct;
    console.log(
      `Strongest path that still leaves ≥1 word: ~${bestUseful.toFixed(1)}% removed; raw max (can be 100% if a path leaves 0 words) ${e21.maxPct.toFixed(1)}%. Weakest path ${e21.minPct.toFixed(1)}%; mean over paths ${e21.avgPct.toFixed(1)}%.`
    );
    console.log(
      'E21 stacks EEE? then EEEFIRST (and optionally "E anywhere"). Compare: npm run bench:filters -- --id e21,eee,eeeFirst'
    );
  }
}

main();
