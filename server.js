import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Allow cross-origin calls (e.g. GitHub Pages -> Render API).
// For production, you may want to restrict Access-Control-Allow-Origin.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

function readFirstExistingFile(paths) {
  for (const p of paths) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf8');
    }
  }
  throw new Error(`No existing file found in paths: ${paths.join(', ')}`);
}

function extractJsonObjectBlock(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
}

// Specs used by /api/claude (support repo-root file OR ~/ file)
const ASSOCIATION_ENGINE_SPEC = extractJsonObjectBlock(readFirstExistingFile([
  resolve(process.cwd(), 'UniversalAssociationEngine.txt'),
  resolve(homedir(), 'UniversalAssociationEngine.txt')
]));
const FILMOGRAPHY_PROMPT_SPEC = extractJsonObjectBlock(readFirstExistingFile([
  resolve(process.cwd(), 'prompt.txt'),
  resolve(homedir(), 'prompt.txt')
]));
/** Plain-English WORD ENGINE instructions (repo or ~); used when association mode bypasses Datamuse. */
const ASSOCIATION_ENGINE_PROMPT_PLAIN = readFirstExistingFile([
  resolve(process.cwd(), 'UniversalAssociationEngine-Noncode.txt'),
  resolve(homedir(), 'UniversalAssociationEngine-Noncode.txt')
]);

app.use(express.json({ limit: '1mb' }));

function requireString(v, name) {
  if (typeof v !== 'string' || v.trim().length === 0) {
    const err = new Error(`Invalid ${name}`);
    err.status = 400;
    throw err;
  }
  return v.trim();
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseEntityId(entityId) {
  const parts = String(entityId || '').split(':');
  if (parts.length !== 3) return null;
  const [provider, kind, id] = parts;
  return { provider, kind, id };
}

async function fetchJson(url, { headers } = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Upstream error ${res.status} for ${url}${text ? `: ${text.slice(0, 200)}` : ''}`);
    err.status = 502;
    throw err;
  }
  return await res.json();
}

// --- TMDB ---
function tmdbKey(apiKeyOverride) {
  const key = apiKeyOverride || process.env.TMDB_API_KEY;
  if (!key) {
    const err = new Error('TMDB_API_KEY is not set');
    err.status = 500;
    throw err;
  }
  return key;
}

function tmdbPersonSearchUrl(query, limit, apiKeyOverride) {
  const key = tmdbKey(apiKeyOverride);
  const q = encodeURIComponent(query);
  return `https://api.themoviedb.org/3/search/person?api_key=${encodeURIComponent(key)}&query=${q}&include_adult=false&page=1`;
}

function tmdbCombinedCreditsUrl(personId, apiKeyOverride) {
  const key = tmdbKey(apiKeyOverride);
  return `https://api.themoviedb.org/3/person/${encodeURIComponent(personId)}/combined_credits?api_key=${encodeURIComponent(key)}&language=en-US`;
}

function tmdbPersonDetailUrl(personId, apiKeyOverride) {
  const key = tmdbKey(apiKeyOverride);
  return `https://api.themoviedb.org/3/person/${encodeURIComponent(personId)}?api_key=${encodeURIComponent(key)}&language=en-US`;
}

function tmdbImageUrl(path) {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

function normalizeNameForMatch(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isCloseNameMatch(query, candidate) {
  const q = normalizeNameForMatch(query);
  const c = normalizeNameForMatch(candidate);
  if (!q || !c) return false;
  if (q === c) return true;

  const qTokens = q.split(' ').filter(Boolean);
  const cTokens = c.split(' ').filter(Boolean);
  if (qTokens.length === 0 || cTokens.length === 0) return false;

  // Require each query token to match the start of some candidate token,
  // or be contained within the candidate string (handles middle names, etc.).
  for (const qt of qTokens) {
    let ok = false;
    for (const ct of cTokens) {
      if (ct.startsWith(qt) || qt.startsWith(ct) || tokenSimilarityScore(qt, ct) >= 0.7) { ok = true; break; }
    }
    if (!ok && !c.includes(qt)) return false;
  }

  return true;
}

function levenshteinDistance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function tokenSimilarityScore(inputToken, candidateToken) {
  const a = normalizeNameForMatch(inputToken);
  const b = normalizeNameForMatch(candidateToken);
  if (!a || !b) return 0;
  if (a === b) return 1.0;
  if (b.startsWith(a) || a.startsWith(b)) return 0.92;
  if (b.includes(a) || a.includes(b)) return 0.82;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b);
  if (maxLen >= 8 && dist <= 2) return 0.76;
  if (maxLen >= 5 && dist <= 1) return 0.72;
  if (maxLen >= 4 && dist <= 1) return 0.7; // handles short misspellings like hanz->hans
  return 0;
}

function entityNameFitScore(inputName, personName) {
  const inputNorm = normalizeNameForMatch(inputName);
  const personNorm = normalizeNameForMatch(personName);
  if (!inputNorm || !personNorm) return 0;

  const inputTokens = inputNorm.split(' ').filter(Boolean);
  const personTokens = personNorm.split(' ').filter(Boolean);
  if (inputTokens.length === 0 || personTokens.length === 0) return 0;

  let tokenScoreSum = 0;
  for (const it of inputTokens) {
    let bestForToken = 0;
    for (const ct of personTokens) {
      const sim = tokenSimilarityScore(it, ct);
      if (sim > bestForToken) bestForToken = sim;
    }
    tokenScoreSum += bestForToken;
  }

  return tokenScoreSum / inputTokens.length;
}

function chooseEntityAwareTmdbCandidate(inputName, tmdbResults) {
  const pool = Array.isArray(tmdbResults) ? tmdbResults : [];
  if (pool.length === 0) return null;
  const inputNorm = normalizeNameForMatch(inputName);
  const inputTokens = inputNorm.split(' ').filter(Boolean);
  if (inputTokens.length === 0) return null;

  const scored = pool
    .map((p) => {
      const candName = String(p?.name || '').trim();
      const candNorm = normalizeNameForMatch(candName);
      const candTokens = candNorm.split(' ').filter(Boolean);
      if (!candName || candTokens.length === 0) return null;

      let tokenScoreSum = 0;
      let firstTokenScore = 0;
      for (let i = 0; i < inputTokens.length; i += 1) {
        const it = inputTokens[i];
        let bestForToken = 0;
        for (const ct of candTokens) {
          const sim = tokenSimilarityScore(it, ct);
          if (sim > bestForToken) bestForToken = sim;
        }
        if (i === 0) firstTokenScore = bestForToken;
        tokenScoreSum += bestForToken;
      }

      const tokenAvg = tokenScoreSum / inputTokens.length;
      const sameTokenCountBonus = candTokens.length === inputTokens.length ? 0.12 : 0;
      const exactNameBonus = inputNorm === candNorm ? 0.2 : 0;
      const deptBonus = ['Acting', 'Directing'].includes(String(p?.known_for_department || '')) ? 0.1 : 0;
      const popularity = Number(p?.popularity || 0);
      const popularityBonus = Math.min(0.18, Math.log10(popularity + 1) * 0.07);
      const score = tokenAvg + sameTokenCountBonus + exactNameBonus + deptBonus + popularityBonus;

      return { person: p, score, tokenAvg, firstTokenScore };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  const best = scored[0];
  const runnerUp = scored[1];
  const gap = runnerUp ? (best.score - runnerUp.score) : best.score;

  // Guardrails: avoid over-correcting ambiguous names.
  if (best.tokenAvg < 0.6) return null;
  if (best.firstTokenScore < 0.68) return null;
  const veryStrongBest = best.tokenAvg >= 0.82 && best.firstTokenScore >= 0.9;
  if (runnerUp && gap < 0.12 && !veryStrongBest) return null;

  return {
    person: best.person,
    correctedInput: String(best.person?.name || inputName).trim() || inputName,
    confidence: Math.min(0.98, Math.max(0.72, best.score)),
    gap
  };
}

function computeTmdbScore(item) {
  const popularity = Number(item.popularity || 0);
  const voteCount = Number(item.vote_count || 0);
  const voteBoost = Math.log10(voteCount + 1) * 10;
  const dateStr = item.release_date || item.first_air_date || '';
  const year = Number((dateStr || '').slice(0, 4));
  const nowYear = new Date().getFullYear();
  const recency = Number.isFinite(year) ? Math.max(0, 1 - Math.min(30, Math.max(0, nowYear - year)) / 30) : 0;
  const recencyBoost = recency * 10;
  return 0.65 * popularity + 0.25 * voteBoost + 0.10 * recencyBoost;
}

/**
 * TMDB combined_credits usually sets media_type; infer when missing so TV isn't dropped.
 */
function inferCreditMediaType(x) {
  const mt = x?.media_type;
  if (mt === 'movie' || mt === 'tv') return mt;
  const hasTvSignals = (x?.first_air_date != null && String(x.first_air_date).trim() !== '') ||
    (x?.name || x?.original_name);
  const hasMovieSignals = (x?.release_date != null && String(x.release_date).trim() !== '') ||
    (x?.title || x?.original_title);
  if (hasTvSignals && !hasMovieSignals) return 'tv';
  if (hasMovieSignals && !hasTvSignals) return 'movie';
  if (hasTvSignals && hasMovieSignals) {
    return (x?.name || x?.original_name) ? 'tv' : 'movie';
  }
  return null;
}

// TMDB TV genre IDs (see https://developer.themoviedb.org/reference/genre-tv-list)
const TMDB_TV_GENRE_NEWS = 10763;
const TMDB_TV_GENRE_TALK = 10767;

/** Drop TV credits tagged as News or Talk; keep Reality (10764) and everything else. */
function isTvNewsOrTalkShow(credit) {
  const ids = credit?.genre_ids;
  if (!Array.isArray(ids) || ids.length === 0) return false;
  return ids.includes(TMDB_TV_GENRE_NEWS) || ids.includes(TMDB_TV_GENRE_TALK);
}

/** Movies + TV from TMDB combined_credits (cast + crew). */
function readFilmAndTvCredits(credits) {
  const titleOf = (x) => {
    const mt = inferCreditMediaType(x);
    if (mt === 'tv') {
      return String(x.name || x.original_name || x.title || x.original_title || '').trim();
    }
    if (mt === 'movie') {
      return String(x.title || x.original_title || x.name || '').trim();
    }
    return '';
  };
  const tagKind = (media) => (media === 'tv' ? 'tv' : 'film');

  const mapRow = (x, role) => {
    const mt = inferCreditMediaType(x);
    if (!mt) return null;
    if (mt === 'tv' && isTvNewsOrTalkShow(x)) return null;
    const display = titleOf(x);
    if (!display) return null;
    return {
      display,
      score: Math.round(computeTmdbScore(x) * 10) / 10,
      tags: [tagKind(mt), 'tmdb', role]
    };
  };

  const cast = (credits.cast || [])
    .map(x => mapRow(x, 'cast'))
    .filter(Boolean);

  const crew = (credits.crew || [])
    .map(x => mapRow(x, 'crew'))
    .filter(Boolean);

  return cast.concat(crew);
}

function tmdbPersonSubtitle(person) {
  const dept = String(person?.known_for_department || '').trim();
  const kf = Array.isArray(person?.known_for) ? person.known_for : [];
  const bits = kf.slice(0, 3).map(k => k.title || k.name).filter(Boolean);
  const known = bits.length ? bits.join(', ') : '';
  const parts = [];
  if (dept) parts.push(dept);
  if (known) parts.push(`e.g. ${known}`);
  return parts.join(' · ') || 'TMDB profile';
}

// --- MusicBrainz ---
const MB_BASE = 'https://musicbrainz.org/ws/2';
const MB_UA = process.env.MUSICBRAINZ_USER_AGENT || 'coretest-engine/0.1 (local dev)';

function mbHeaders() {
  return {
    'User-Agent': MB_UA,
    'Accept': 'application/json'
  };
}

function mbTypeRank(primaryType) {
  const t = String(primaryType || '').toLowerCase();
  if (t === 'album') return 0;
  if (t === 'ep') return 1;
  if (t === 'single') return 2;
  return 3;
}

// --- Open Library ---
const OL_BASE = 'https://openlibrary.org';
const DATAMUSE_BASE = 'https://api.datamuse.com/words';

async function fetchDatamuseWords(params) {
  const query = new URLSearchParams(params).toString();
  const url = `${DATAMUSE_BASE}?${query}`;
  try {
    const data = await fetchJson(url);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// --- Unified API ---
app.post('/api/engine/search', async (req, res, next) => {
  try {
    const profession = requireString(req.body?.profession, 'profession').toLowerCase();
    const query = requireString(req.body?.query, 'query');
    const limit = clampInt(req.body?.limit, 1, 20, 10);

    if (profession === 'actor' || profession === 'director' || profession === 'composer') {
      // Fetch more than we display, then tighten results to close name matches.
      const data = await fetchJson(tmdbPersonSearchUrl(query, Math.max(20, limit)));
      const tightened = (data.results || []).filter(p => isCloseNameMatch(query, p.name));
      const pool = tightened.length > 0 ? tightened : (data.results || []);
      const results = pool
        .slice(0, limit)
        .map(p => ({
          entity_id: `tmdb:person:${p.id}`,
          display_name: p.name,
          subtitle: p.known_for_department ? `Known for ${p.known_for_department}` : 'Person',
          image_url: tmdbImageUrl(p.profile_path),
          provider: 'tmdb',
          confidence: null
        }));
      return res.json({ profession, query, results });
    }

    if (profession === 'musician') {
      const q = encodeURIComponent(query);
      const url = `${MB_BASE}/artist/?query=${q}&fmt=json&limit=${limit}`;
      const data = await fetchJson(url, { headers: mbHeaders() });
      const results = (data.artists || []).slice(0, limit).map(a => ({
        entity_id: `mb:artist:${a.id}`,
        display_name: a.name,
        subtitle: [a.type, a.country].filter(Boolean).join(' · ') || 'Artist',
        image_url: null,
        provider: 'musicbrainz',
        confidence: null
      }));
      return res.json({ profession, query, results });
    }

    if (profession === 'author') {
      const q = encodeURIComponent(query);
      const url = `${OL_BASE}/search/authors.json?q=${q}&limit=${limit}`;
      const data = await fetchJson(url);
      const results = (data.docs || []).slice(0, limit).map(a => ({
        entity_id: `ol:author:${String(a.key || '').replace('/authors/', '')}`,
        display_name: a.name,
        subtitle: typeof a.work_count === 'number' ? `${a.work_count} works` : 'Author',
        image_url: null,
        provider: 'openlibrary',
        confidence: null
      }));
      return res.json({ profession, query, results });
    }

    const err = new Error('Unsupported profession. Use actor, director, composer, musician, or author.');
    err.status = 400;
    throw err;
  } catch (e) {
    next(e);
  }
});

app.post('/api/engine/generate', async (req, res, next) => {
  try {
    const profession = requireString(req.body?.profession, 'profession').toLowerCase();
    const entityId = requireString(req.body?.entity_id, 'entity_id');
    const limit = clampInt(req.body?.limit, 1, 200, 200);

    const parsed = parseEntityId(entityId);
    if (!parsed) {
      const err = new Error('Invalid entity_id');
      err.status = 400;
      throw err;
    }

    if ((profession === 'actor' || profession === 'director' || profession === 'composer') && parsed.provider === 'tmdb' && parsed.kind === 'person') {
      const credits = await fetchJson(tmdbCombinedCreditsUrl(parsed.id));

      let items = [];
      if (profession === 'actor') {
        items = (credits.cast || []).filter(x => x.media_type === 'movie');
        items = items.map(x => ({
          tmdb_id: x.id,
          title: x.title || x.original_title || x.name,
          date: x.release_date || '',
          popularity: x.popularity || 0,
          vote_count: x.vote_count || 0,
          score: computeTmdbScore(x),
          tags: ['film', 'acting']
        }));
      } else if (profession === 'director') {
        items = (credits.crew || []).filter(x => x.media_type === 'movie' && x.job === 'Director');
        items = items.map(x => ({
          tmdb_id: x.id,
          title: x.title || x.original_title || x.name,
          date: x.release_date || '',
          popularity: x.popularity || 0,
          vote_count: x.vote_count || 0,
          score: computeTmdbScore(x),
          tags: ['film', 'directing']
        }));
      } else {
        items = (credits.crew || []).filter((x) => {
          if (x.media_type !== 'movie') return false;
          const job = String(x.job || '').toLowerCase();
          return job.includes('composer') || job === 'music' || job === 'original music composer' || job === 'music director';
        });
        items = items.map(x => ({
          tmdb_id: x.id,
          title: x.title || x.original_title || x.name,
          date: x.release_date || '',
          popularity: x.popularity || 0,
          vote_count: x.vote_count || 0,
          score: computeTmdbScore(x),
          tags: ['film', 'composer', 'soundtrack']
        }));
      }

      // de-dupe by TMDB id
      const byId = new Map();
      for (const it of items) {
        if (!it.tmdb_id || !it.title) continue;
        if (!byId.has(it.tmdb_id)) byId.set(it.tmdb_id, it);
        else if (it.score > byId.get(it.tmdb_id).score) byId.set(it.tmdb_id, it);
      }
      const deduped = Array.from(byId.values());
      deduped.sort((a, b) => (b.score - a.score) || (String(b.date).localeCompare(String(a.date))) || a.title.localeCompare(b.title));

      const results = deduped.slice(0, limit).map((it, idx) => ({
        word: it.title,
        rank: idx + 1,
        score: Math.round(it.score * 10) / 10,
        tags: it.tags
      }));

      return res.json({
        input_word: null,
        engine_version: 'engine-v1',
        mode: `tmdb_${profession}_to_films_popularity`,
        total_candidates: results.length,
        results
      });
    }

    if (profession === 'musician' && parsed.provider === 'mb' && parsed.kind === 'artist') {
      const pageSize = 100;
      const pages = [];
      for (let offset = 0; offset < limit; offset += pageSize) {
        const url = `${MB_BASE}/release-group?artist=${encodeURIComponent(parsed.id)}&fmt=json&limit=${Math.min(pageSize, limit - offset)}&offset=${offset}`;
        pages.push(fetchJson(url, { headers: mbHeaders() }));
      }
      const dataPages = await Promise.all(pages);
      const all = dataPages.flatMap(d => d['release-groups'] || []);

      const byId = new Map();
      for (const rg of all) {
        if (!rg.id || !rg.title) continue;
        const type = rg['primary-type'] || '';
        const date = rg['first-release-date'] || '';
        const existing = byId.get(rg.id);
        if (!existing) byId.set(rg.id, { id: rg.id, title: rg.title, type, date });
      }
      const items = Array.from(byId.values());
      items.sort((a, b) => {
        const ta = mbTypeRank(a.type);
        const tb = mbTypeRank(b.type);
        if (ta !== tb) return ta - tb;
        // latest first
        const da = String(a.date || '');
        const db = String(b.date || '');
        if (da !== db) return db.localeCompare(da);
        return a.title.localeCompare(b.title);
      });

      const results = items.slice(0, limit).map((it, idx) => ({
        word: it.title,
        rank: idx + 1,
        score: null,
        tags: ['music', it.type || 'ReleaseGroup']
      }));

      return res.json({
        input_word: null,
        engine_version: 'engine-v1',
        mode: 'musicbrainz_musician_to_releases_latest',
        total_candidates: results.length,
        results
      });
    }

    if (profession === 'author' && parsed.provider === 'ol' && parsed.kind === 'author') {
      const url = `${OL_BASE}/authors/${encodeURIComponent(parsed.id)}/works.json?limit=${limit}`;
      const data = await fetchJson(url);
      const entries = (data.entries || []).filter(e => e && e.title);

      const byKey = new Map();
      for (const w of entries) {
        const key = w.key || w.title;
        if (!key) continue;
        if (!byKey.has(key)) {
          const year = Array.isArray(w.first_publish_date) ? null : w.first_publish_date;
          byKey.set(key, {
            title: w.title,
            year: w.first_publish_year || null,
            date: w.created?.value || '',
            edition_count: w.edition_count || null
          });
        }
      }

      const items = Array.from(byKey.values());
      items.sort((a, b) => {
        // latest first: first_publish_year desc if present, else created date desc
        const ya = Number(a.year || -1);
        const yb = Number(b.year || -1);
        if (ya !== yb) return yb - ya;
        const da = String(a.date || '');
        const db = String(b.date || '');
        if (da !== db) return db.localeCompare(da);
        return a.title.localeCompare(b.title);
      });

      const results = items.slice(0, limit).map((it, idx) => ({
        word: it.title,
        rank: idx + 1,
        score: it.edition_count ?? null,
        tags: ['book']
      }));

      return res.json({
        input_word: null,
        engine_version: 'engine-v1',
        mode: 'openlibrary_author_to_works_latest',
        total_candidates: results.length,
        results
      });
    }

    const err = new Error('Unsupported profession/entity_id combination');
    err.status = 400;
    throw err;
  } catch (e) {
    next(e);
  }
});

function normalizeForWorkflowWord(raw) {
  const digitMap = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
  };
  const withWords = String(raw || '').replace(/\d/g, d => digitMap[d] || '');
  return withWords
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '');
}

// --- Claude route (auto: name->filmography prompt, word->association engine) ---
app.post('/api/claude', async (req, res, next) => {
  try {
    let inputWord = requireString(req.body?.input_word, 'input_word');
    const limit = clampInt(req.body?.limit, 1, 500, 500);
    const requestedModeRaw = (req.body?.mode || 'auto').toString().toLowerCase();
    const requestedMode = ['auto', 'name', 'association'].includes(requestedModeRaw) ? requestedModeRaw : 'auto';

    const apiKey = req.body?.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
    const tmdbApiKeyOverride = req.body?.tmdb_api_key || req.body?.tmdbApiKey;

    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
    const callClaudeStructured = async (systemPrompt, userMessage, schema, useStructuredOutput = true, maxTokens = 12000) => {
      if (!apiKey) {
        const err = new Error('ANTHROPIC_API_KEY is not set');
        err.status = 500;
        throw err;
      }
      const requestBody = {
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      };
      if (useStructuredOutput) {
        requestBody.output_config = {
          format: {
            type: 'json_schema',
            schema
          }
        };
      }
      const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });
      const data = await anthropicResp.json();
      if (!anthropicResp.ok) {
        const err = new Error(data?.error?.message || 'Anthropic request failed');
        err.status = anthropicResp.status || 502;
        throw err;
      }
      const text = data?.content?.[0]?.text ?? '';
      if (!text) {
        const err = new Error('Anthropic returned no content');
        err.status = 502;
        throw err;
      }
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        // Fallback: try to parse extracted object block if extra wrapper text exists.
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
          return JSON.parse(text.slice(start, end + 1));
        }
        throw parseErr;
      }
    };

    const callWithStructuredFallback = async (systemPrompt, userMessage, schema, maxTokens = 12000) => {
      try {
        return await callClaudeStructured(systemPrompt, userMessage, schema, true, maxTokens);
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('does not support output format')) {
          return await callClaudeStructured(systemPrompt, userMessage, schema, false, maxTokens);
        }
        throw e;
      }
    };

    let resolvedMode = requestedMode;
    let detectedMeta = null;
    if (resolvedMode === 'auto') {
      const rawTokens = String(inputWord || '').trim().split(/\s+/).filter(Boolean);
      const tokenLooksWordlike = (t) => /[a-zA-Z]/.test(t);
      const hasNameSuffix = rawTokens.some(t => /^(jr|sr|ii|iii|iv|v)\.?$/i.test(t));
      const looksLikeFullName = rawTokens.length >= 2 && rawTokens.every(tokenLooksWordlike);

      // Deterministic pre-gate: obvious multi-token names should prefer NAME mode.
      // This prevents cases like "Tom Holland" dropping into association mode.
      if (looksLikeFullName || hasNameSuffix) {
        resolvedMode = 'name';
        detectedMeta = {
          mode_candidate: 'name',
          confidence: 0.95,
          corrected_input: inputWord,
          final_mode: 'name',
          reason: 'deterministic_full_name_gate'
        };
      }

      // Deterministic pre-gate: likely single-token celebrity names should prefer NAME mode.
      // Examples: "zendaya", "beyonce", "oprah".
      if (resolvedMode === 'auto' && rawTokens.length === 1 && /^[a-zA-Z][a-zA-Z'.-]{2,}$/.test(rawTokens[0])) {
        try {
          const tmdbProbe = await fetchJson(tmdbPersonSearchUrl(inputWord, 5));
          const probeResults = Array.isArray(tmdbProbe?.results) ? tmdbProbe.results : [];
          const entityAware = chooseEntityAwareTmdbCandidate(inputWord, probeResults);
          const top = entityAware?.person || probeResults[0] || null;
          if (top && (entityAware || isCloseNameMatch(inputWord, top.name))) {
            const normalizedInput = normalizeNameForMatch(inputWord);
            const normalizedTop = normalizeNameForMatch(top.name);
            const strongExactish = normalizedInput === normalizedTop || normalizedTop.startsWith(normalizedInput);
            const strongPopularity = Number(top.popularity || 0) >= 10;
            const knownPersonDept = ['Acting', 'Directing'].includes(String(top.known_for_department || ''));
            if ((strongExactish && knownPersonDept) || (strongPopularity && knownPersonDept)) {
              resolvedMode = 'name';
              detectedMeta = {
                mode_candidate: 'name',
                confidence: entityAware?.confidence || 0.9,
                corrected_input: String(top.name || inputWord).trim() || inputWord,
                final_mode: 'name',
                reason: entityAware ? 'deterministic_single_token_tmdb_entity_correction' : 'deterministic_single_token_tmdb_gate'
              };
              inputWord = String(top.name || inputWord).trim() || inputWord;
            }
          }
        } catch {
          // If TMDB probe fails, keep auto mode and continue to classifier.
        }
      }

      if (resolvedMode === 'auto') {
      const modeSchema = {
        type: 'object',
        additionalProperties: false,
        required: ['mode_candidate', 'confidence', 'corrected_input'],
        properties: {
          mode_candidate: { type: 'string', enum: ['name', 'association'] },
          confidence: { type: 'number' },
          corrected_input: { type: 'string' },
          reason: { type: 'string' }
        }
      };
      const modePrompt = 'Classify input as likely notable person/band name or general word/concept. Correct obvious spelling mistakes. Return JSON only.';
      const modeParsed = await callWithStructuredFallback(modePrompt, inputWord, modeSchema);

      const modeCandidate = modeParsed?.mode_candidate === 'name' ? 'name' : 'association';
      const baseConfidence = Number.isFinite(Number(modeParsed?.confidence))
        ? Number(modeParsed.confidence)
        : 0;
      let correctedInput = String(modeParsed?.corrected_input || inputWord).trim() || inputWord;
      let finalConfidence = baseConfidence;

      // Confidence gate with a second-pass verifier for borderline inputs.
      if (modeCandidate === 'name' && baseConfidence >= 0.75) {
        resolvedMode = 'name';
      } else if (modeCandidate === 'association' && baseConfidence >= 0.75) {
        resolvedMode = 'association';
      } else {
        const verifySchema = {
          type: 'object',
          additionalProperties: false,
          required: ['is_name', 'confidence', 'corrected_input'],
          properties: {
            is_name: { type: 'boolean' },
            confidence: { type: 'number' },
            corrected_input: { type: 'string' },
            top_candidate: { type: 'string' },
            runner_up: { type: 'string' },
            confidence_gap: { type: 'number' }
          }
        };
        const verifyPrompt = 'Given an input, decide if it most likely refers to a notable person/band name. If yes, provide best corrected name and confidence. Return JSON only.';
        const verifyParsed = await callWithStructuredFallback(verifyPrompt, correctedInput, verifySchema);
        const verifyConfidence = Number.isFinite(Number(verifyParsed?.confidence))
          ? Number(verifyParsed.confidence)
          : 0;
        finalConfidence = verifyConfidence;
        correctedInput = String(verifyParsed?.corrected_input || correctedInput).trim() || correctedInput;
        resolvedMode = verifyParsed?.is_name && verifyConfidence >= 0.72 ? 'name' : 'association';
      }

      inputWord = correctedInput;
      detectedMeta = {
        mode_candidate: modeCandidate,
        confidence: finalConfidence,
        corrected_input: correctedInput,
        final_mode: resolvedMode
      };
      }
    }

    const dedupeWorksToRankedResults = (movies, maxResults) => {
      const byNorm = new Map();
      for (const m of movies) {
        const normalized = normalizeForWorkflowWord(m.display);
        if (!normalized) continue;
        const prev = byNorm.get(normalized);
        if (!prev || (m.score || 0) > (prev.score || 0)) {
          byNorm.set(normalized, { word: normalized, display: m.display, score: m.score, tags: m.tags || ['film', 'tmdb'] });
        }
      }
      return Array.from(byNorm.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0) || a.display.localeCompare(b.display))
        .slice(0, maxResults)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    };

    const buildTmdbNameResultsForPersonId = async (personId, maxResults) => {
      try {
        const person = await fetchJson(tmdbPersonDetailUrl(personId, tmdbApiKeyOverride));
        const credits = await fetchJson(tmdbCombinedCreditsUrl(personId, tmdbApiKeyOverride));
        const works = readFilmAndTvCredits(credits);
        if (!detectedMeta) detectedMeta = {};
        detectedMeta.selected_tmdb_person = {
          id: personId,
          name: String(person?.name || '').trim() || `Person ${personId}`
        };
        detectedMeta.name_engine_includes_tv = true;
        detectedMeta.tmdb_person_picked = true;
        return dedupeWorksToRankedResults(works, maxResults);
      } catch {
        return [];
      }
    };

    const resolveNameEngineOnce = async (nameInputForFit, searchQuery, maxResults) => {
      const PICKER_SCORE_GAP = 0.16;
      const MIN_RUNNER_NAME_FIT = 0.68;
      const MIN_RUNNER_WORKS = 1;

      const searchData = await fetchJson(tmdbPersonSearchUrl(searchQuery, Math.max(25, maxResults), tmdbApiKeyOverride));
      const pool = Array.isArray(searchData?.results) ? searchData.results : [];
      if (pool.length === 0) {
        return { needsPicker: false, pickerCandidates: [], results: [] };
      }

      const heuristicRanked = pool
        .filter(p => p?.id && p?.name)
        .map((p) => {
          const nameFit = entityNameFitScore(nameInputForFit, p.name);
          const popularity = Number(p.popularity || 0);
          const popularityBoost = Math.min(1.2, Math.log10(popularity + 1));
          return { person: p, nameFit, popularityBoost };
        })
        .sort((a, b) => ((b.nameFit * 2.0) + b.popularityBoost) - ((a.nameFit * 2.0) + a.popularityBoost));

      const creditCandidates = heuristicRanked.slice(0, 12);
      const scoredList = [];

      for (const cand of creditCandidates) {
        const person = cand.person;
        try {
          const credits = await fetchJson(tmdbCombinedCreditsUrl(person.id, tmdbApiKeyOverride));
          const works = readFilmAndTvCredits(credits);
          const creditVolumeBoost = Math.min(1.5, Math.log10((works.length || 0) + 1));
          const finalScore = (cand.nameFit * 2.0) + cand.popularityBoost + creditVolumeBoost;
          scoredList.push({
            person,
            nameFit: cand.nameFit,
            popularityBoost: cand.popularityBoost,
            creditVolumeBoost,
            finalScore,
            works
          });
        } catch {
          // Ignore bad candidate and continue.
        }
      }

      scoredList.sort((a, b) => b.finalScore - a.finalScore);

      if (scoredList.length === 0) {
        return { needsPicker: false, pickerCandidates: [], results: [] };
      }

      const top = scoredList[0];
      const second = scoredList[1];

      const ambiguousByGap = second &&
        (second.works || []).length >= MIN_RUNNER_WORKS &&
        second.nameFit >= MIN_RUNNER_NAME_FIT &&
        (top.finalScore - second.finalScore) < PICKER_SCORE_GAP;

      const ambiguousByCloseFit = second &&
        (second.works || []).length >= MIN_RUNNER_WORKS &&
        top.nameFit >= 0.84 &&
        second.nameFit >= 0.84 &&
        Math.abs(top.nameFit - second.nameFit) < 0.1 &&
        (top.finalScore - second.finalScore) < 0.32;

      const needsPicker = !!(ambiguousByGap || ambiguousByCloseFit);

      if (needsPicker) {
        const pickerCandidates = scoredList
          .filter(s => (s.works || []).length > 0)
          .slice(0, 5)
          .map(s => ({
            id: s.person.id,
            name: String(s.person.name || '').trim(),
            subtitle: tmdbPersonSubtitle(s.person),
            final_score: Math.round(s.finalScore * 1000) / 1000
          }));
        if (pickerCandidates.length >= 2) {
          return { needsPicker: true, pickerCandidates, results: [] };
        }
      }

      const winner = top;
      if (!winner.person?.id) return { needsPicker: false, pickerCandidates: [], results: [] };

      if (!detectedMeta) detectedMeta = {};
      detectedMeta.selected_tmdb_person = {
        id: winner.person.id,
        name: winner.person.name
      };

      const movies = winner.works || [];
      if (movies.length === 0) {
        return { needsPicker: false, pickerCandidates: [], results: [] };
      }

      return {
        needsPicker: false,
        pickerCandidates: [],
        results: dedupeWorksToRankedResults(movies, maxResults)
      };
    };

    const resolveNameEngine = async (nameInputForFit, maxResults) => {
      let queryUsed = nameInputForFit;
      let out = await resolveNameEngineOnce(nameInputForFit, nameInputForFit, maxResults);
      if (out.needsPicker) return { ...out, queryUsed };
      if (out.results.length > 0) {
        if (!detectedMeta) detectedMeta = {};
        detectedMeta.selected_tmdb_query_used = queryUsed;
        detectedMeta.name_engine_includes_tv = true;
        return { ...out, queryUsed };
      }
      const tokens = normalizeNameForMatch(nameInputForFit).split(' ').filter(Boolean);
      if (tokens.length >= 2) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken.length >= 3) {
          queryUsed = lastToken;
          out = await resolveNameEngineOnce(nameInputForFit, lastToken, maxResults);
          if (!detectedMeta) detectedMeta = {};
          detectedMeta.selected_tmdb_query_used = queryUsed;
          detectedMeta.name_engine_includes_tv = true;
          return { ...out, queryUsed };
        }
      }
      if (!detectedMeta) detectedMeta = {};
      detectedMeta.selected_tmdb_query_used = queryUsed;
      detectedMeta.name_engine_includes_tv = true;
      return { ...out, queryUsed };
    };

    // NAME mode: use TMDB directly (deterministic, faster, cheaper than LLM)
    // NOTE: we run an additional spelling-correction pass ONLY when the caller explicitly requested mode='name'
    // (i.e. NAME ENGINE), to avoid associative misrouting.
    if (resolvedMode === 'name') {
      const maxResults = Math.min(limit, 500);
      if (!detectedMeta) detectedMeta = {};

      const selectedTmdbPersonId = Number(req.body?.tmdb_person_id);
      const hasSelectedPerson = Number.isFinite(selectedTmdbPersonId) && selectedTmdbPersonId > 0;

      let nameQueryToUse = inputWord;
      let spellingCorrection = null;

      if (requestedMode === 'name' && !hasSelectedPerson) {
        const correctionSchema = {
          type: 'object',
          additionalProperties: false,
          required: ['corrected_name', 'confidence'],
          properties: {
            corrected_name: { type: 'string' },
            confidence: { type: 'number' },
            reason: { type: 'string' }
          }
        };

        const correctionSystemPrompt =
          'You correct spelling of a notable person name for TMDB lookup. ' +
          'Only fix spelling/capitalization/spacing mistakes. Do not change identity (do not swap people). ' +
          'If the input does not look like a person name or you are unsure, return the original name with low confidence.';

        const correctionUserMessage = `original_name: "${inputWord}"`;

        try {
          const correction = await callWithStructuredFallback(
            correctionSystemPrompt,
            correctionUserMessage,
            correctionSchema
          );

          const corrected = String(correction?.corrected_name ?? '').trim();
          const confidence = Number.isFinite(Number(correction?.confidence)) ? Number(correction.confidence) : 0;
          const originalNorm = normalizeNameForMatch(inputWord);
          const correctedNorm = normalizeNameForMatch(corrected);

          const applied = corrected &&
            correctedNorm &&
            correctedNorm !== originalNorm &&
            confidence >= 0.65;

          spellingCorrection = {
            original_input: inputWord,
            corrected_input: applied ? corrected : inputWord,
            confidence,
            reason: correction?.reason
          };

          detectedMeta.spelling_correction = spellingCorrection;
          detectedMeta.spelling_correction_applied = applied;

          if (applied) nameQueryToUse = corrected;
        } catch {
          detectedMeta.spelling_correction_error = true;
        }
      }

      const respondPicker = (pickerCandidates) => res.json({
        input_word: inputWord,
        engine_version: 'engine-v2.8',
        mode: 'filmography_name_tmdb',
        needs_person_picker: true,
        picker_candidates: pickerCandidates,
        total_candidates: 0,
        results: [],
        detected: { ...detectedMeta, name_engine_includes_tv: true }
      });

      let cleanedResults;
      if (hasSelectedPerson) {
        cleanedResults = await buildTmdbNameResultsForPersonId(selectedTmdbPersonId, maxResults);
      } else {
        let resolved = await resolveNameEngine(nameQueryToUse, maxResults);
        if (resolved.needsPicker) {
          return respondPicker(resolved.pickerCandidates || []);
        }
        cleanedResults = resolved.results;

        // Safety: if correction was applied and it produced no usable credits, retry original input.
        if (requestedMode === 'name' && cleanedResults.length === 0 && nameQueryToUse !== inputWord) {
          detectedMeta.spelling_correction_retry_original = true;
          const resolvedOrig = await resolveNameEngine(inputWord, maxResults);
          if (resolvedOrig.needsPicker) {
            return respondPicker(resolvedOrig.pickerCandidates || []);
          }
          cleanedResults = resolvedOrig.results;
        }
      }

      if (!detectedMeta.name_engine_includes_tv) detectedMeta.name_engine_includes_tv = true;

      return res.json({
        input_word: inputWord,
        engine_version: 'engine-v2.8',
        mode: 'filmography_name_tmdb',
        total_candidates: cleanedResults.length,
        results: cleanedResults,
        detected: detectedMeta
      });
    }

    // ASSOCIATION mode (WORD ENGINE): Anthropic only — UniversalAssociationEngine-Noncode.txt; no Datamuse.
    const associationLimit = Math.min(limit, 100);
    const assocTok = Number(process.env.ASSOCIATION_MAX_OUTPUT_TOKENS);
    const associationMaxTokens = Number.isFinite(assocTok) && assocTok > 0 ? assocTok : 64000;

    if (!detectedMeta) detectedMeta = {};
    detectedMeta.association_limit = associationLimit;
    detectedMeta.association_source = 'llm_plain';
    detectedMeta.datamuse_bypass = true;
    detectedMeta.word_engine_llm = 'anthropic';
    detectedMeta.association_max_output_tokens = associationMaxTokens;

    if (!apiKey) {
      const err = new Error('ANTHROPIC_API_KEY is not set (required for WORD ENGINE)');
      err.status = 500;
      throw err;
    }

    const associationGenerateSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['results'],
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['word', 'rank', 'score'],
            properties: {
              word: { type: 'string' },
              rank: { type: 'integer' },
              score: { type: 'number' },
              tags: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    };

    const apiContract = `

## Mandatory API contract (overrides numeric targets in the document above)

The document describes thoroughness in the abstract. **For this HTTP request you must obey all of the following:**

1. Return **only** structured JSON matching the schema the API provides (no markdown fences, no plain-text list).
2. Return **at most ${associationLimit}** entries in \`results\`. You cannot output tens of thousands of words in one response—return the **best ${associationLimit}** associations by human recall probability.
3. Each \`word\` should be one **lexical item** for a word-list workflow: prefer a **single token** (letters A–Z; avoid sentences and punctuation-only entries).
4. \`rank\`: 1 = strongest association, then 2, 3, … with no gaps or duplicate ranks in your array.
5. \`score\`: descending (e.g. 0–100); higher = stronger association to the input word.
6. Apply **inclusion** and **exclusion** rules from the document when choosing and ordering words.
7. **No duplicate** words (case-insensitive). Do not repeat the input word as an association unless unavoidable (prefer to omit it).
`;

    const systemPrompt = `${ASSOCIATION_ENGINE_PROMPT_PLAIN}${apiContract}`;
    const userMessage =
      `input_word: "${inputWord}"\n` +
      `max_associations: ${associationLimit}\n` +
      'Generate the associations as JSON matching the schema now.';

    let cleanedResults = [];
    const parsed = await callWithStructuredFallback(
      systemPrompt,
      userMessage,
      associationGenerateSchema,
      associationMaxTokens
    );
    const rows = Array.isArray(parsed?.results)
      ? [...parsed.results].sort((a, b) => (Number(a?.rank) || 0) - (Number(b?.rank) || 0))
      : [];
    const seenNorm = new Set();
    const inputNorm = normalizeForWorkflowWord(inputWord);
    for (const row of rows) {
      const display = String(row?.word ?? '').trim();
      if (!display) continue;
      const normalized = normalizeForWorkflowWord(display);
      if (!normalized || normalized.length < 2) continue;
      if (inputNorm && normalized === inputNorm) continue;
      if (seenNorm.has(normalized)) continue;
      seenNorm.add(normalized);
      const tagList = Array.isArray(row?.tags) ? row.tags.filter(t => typeof t === 'string') : [];
      if (!tagList.includes('llm_plain')) tagList.push('llm_plain');
      cleanedResults.push({
        word: normalized,
        display,
        rank: cleanedResults.length + 1,
        score: Number.isFinite(Number(row?.score)) ? Math.round(Number(row.score) * 100) / 100 : Math.max(0, 100 - cleanedResults.length),
        tags: tagList
      });
      if (cleanedResults.length >= associationLimit) break;
    }

    detectedMeta.llm_association_generate_count = cleanedResults.length;

    return res.json({
      input_word: inputWord,
      engine_version: 'engine-v3.0',
      mode: 'word_association_llm_plain',
      total_candidates: cleanedResults.length,
      results: cleanedResults,
      detected: detectedMeta
    });
  } catch (e) {
    next(e);
  }
});

/** Drop filler tokens when the model echoes instructions or common English function words. */
const LOCATION_WORD_STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'we', 'they', 'he', 'she', 'my', 'your', 'our', 'their',
  'here', 'there', 'some', 'many', 'few', 'all', 'each', 'every', 'such', 'only', 'just', 'also', 'not', 'no', 'yes', 'so',
  'if', 'when', 'where', 'how', 'what', 'who', 'which', 'why', 'with', 'from', 'into', 'by', 'about', 'than', 'then',
  'list', 'lists', 'item', 'items', 'thing', 'things', 'object', 'objects', 'word', 'words', 'name', 'names',
  'include', 'includes', 'including', 'following', 'follow', 'sure', 'like', 'eg', 'e', 'g', 'inside', 'within', 'outside',
  'please', 'can', 'could', 'would', 'should', 'may', 'might', 'must', 'will', 'shall', 'other', 'any', 'both', 'either'
]);

/**
 * Extract unique lowercase a-z words from model output.
 * Accepts comma / newline / semicolon separated lists, bullets, and simple numbering.
 */
function parseLocationEngineObjectWords(rawContent) {
  const seen = new Set();
  const raw = String(rawContent || '').trim();
  if (!raw) return [];

  let text = raw.replace(/\r\n/g, '\n');
  text = text.replace(/[,;]+/g, '\n');

  const stripLineLeader = (line) => {
    let t = line.trim();
    t = t.replace(/^["'`[\(]+/, '');
    t = t.replace(/["'`)\]]+$/, '');
    t = t.trim();
    t = t.replace(/^[-*•·]\s*/, '');
    t = t.replace(/^\d{1,3}[\.\):\]]\s*/, '');
    t = t.replace(/^\[\d{1,3}\]\s*/, '');
    t = t.trim();
    t = t.replace(/\.+$/, '');
    return t.trim();
  };

  const pushWord = (w) => {
    if (!w || w.length < 2 || w.length > 32) return;
    if (!/^[a-z]+$/.test(w)) return;
    if (LOCATION_WORD_STOP.has(w)) return;
    seen.add(w);
  };

  const lines = text.split('\n');
  for (const line of lines) {
    const cleaned = stripLineLeader(line);
    if (!cleaned) continue;
    const wc = cleaned.split(/\s+/).filter(Boolean).length;
    if (cleaned.length > 160 && wc > 12) continue;

    const chunks = cleaned.split(/\s*\/\s*/);
    for (const chunk of chunks) {
      const c = stripLineLeader(chunk);
      if (!c) continue;
      for (const rawTok of c.split(/\s+/)) {
        const tok = rawTok.replace(/^[^a-z]+/i, '').replace(/[^a-z]+$/i, '').toLowerCase();
        if (tok) pushWord(tok);
      }
    }
  }

  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

// --- LOCATION ENGINE route (Groq: location -> physical objects) ---
app.post('/api/location', async (req, res, next) => {
  try {
    const location = requireString(req.body?.input_word, 'input_word');
    const limit = clampInt(req.body?.limit, 1, 500, 200);
    const groqFromBody = typeof req.body?.groq_api_key === 'string'
      ? req.body.groq_api_key.trim()
      : '';
    const groqApiKey = groqFromBody || process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      const err = new Error(
        'GROQ_API_KEY is not set (required for LOCATION ENGINE). ' +
        'Set it on the API host (e.g. Render) or pass groq_api_key from the app Settings → ENGINE API keys.'
      );
      err.status = 500;
      throw err;
    }

    const prompt = `List approximately 200 physical objects you would find inside a ${location}.
Rules:
- Only include tangible, physical things you could literally see or touch
- Include items like furniture, equipment, tools, clothing worn by staff, signage, containers, machines, decorations
- DO NOT include too abstract concepts, procedures, conditions, or job roles
- DO NOT include multi-word phrases — single words only (use "clipboard" not "clip board")
- Use singular nouns only, not plurals (e.g. "candle" not "candles", "syringe" not "syringes"). Exception: words that are normally plural in English for one thing or place (e.g. "stairs", "pants", "scissors") may stay as usual.
- Bad examples: "physical therapy", "pathology", "temperature", "treatment", "service"
- Good examples: "syringe", "bed", "clipboard", "gown", "trolley", "curtain", "monitor"
- Include things people may think of when they think of objects inside a ${location}. A hospital may have a reception, or a microphone. A school may have a whiteboard or a pencil, a corridor, or a playground. A car may have a seatbelt, a dashboard, a gearstick, an indicator, a pedal. Be specific and accurate.
Output format (important):
- Return ONLY words, separated by commas OR one word per line. Either format is fine.
- Do not number the list, do not add bullets, do not add titles or sentences before or after the list.`;

    const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        // Keep modest: Groq on_demand TPM caps reject large prompt+max_tokens (e.g. 6000).
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await groqResp.json().catch(() => ({}));
    if (!groqResp.ok) {
      const err = new Error(data?.error?.message || 'Groq request failed');
      err.status = groqResp.status || 502;
      throw err;
    }

    const rawContent = String(data?.choices?.[0]?.message?.content || '').trim();
    if (!rawContent) {
      const err = new Error('Groq returned no content for LOCATION ENGINE');
      err.status = 502;
      throw err;
    }

    const dedupedSorted = parseLocationEngineObjectWords(rawContent);

    const results = dedupedSorted.slice(0, limit).map((w, idx) => ({
      word: w,
      display: w,
      rank: idx + 1,
      score: Math.max(0, 100 - idx),
      tags: ['location', 'physical', 'groq']
    }));

    return res.json({
      input_word: location,
      engine_version: 'engine-v3.2',
      mode: 'location_objects_groq',
      total_candidates: results.length,
      results,
      detected: {
        location_engine_llm: 'groq',
        location_engine_model: 'llama-3.1-8b-instant',
        location_engine_limit: limit,
        location_engine_parsed_count: dedupedSorted.length
      }
    });
  } catch (e) {
    next(e);
  }
});

// Static app
app.use(express.static(process.cwd(), { extensions: ['html'] }));

// Basic error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`ENGINE server running on http://localhost:${PORT}`);
});

