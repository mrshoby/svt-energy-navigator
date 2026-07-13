#!/usr/bin/env node
/**
 * SVT OPCOM PZU GitHub cache importer
 *
 * Reads the official OPCOM DAM PIP CSV export and stores normalized JSON:
 *   data/opcom/pzu/YYYY-MM-DD.json
 *   data/opcom/pzu/latest.json
 *   data/opcom/pzu/status.json
 *
 * Official CSV URL pattern announced by OPCOM:
 *   https://www.opcom.ro/rapoarte-pzu-raportPIP-export-csv/(day)/(month)/(year)/(language)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'data', 'opcom', 'pzu');
const SOURCE_LABEL = 'OPCOM PZU / ROPEX_DAM_15min';

function nowIso() { return new Date().toISOString(); }
function ymdUTC(d = new Date()) { return d.toISOString().slice(0, 10); }
function deliveryDateFromEnv() {
  const v = process.env.OPCOM_DELIVERY_DAY || process.env.DELIVERY_DAY || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return ymdUTC();
}
function dateParts(ymd) {
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
}
function labelForInterval(i) {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
function parseRoNumber(value) {
  let s = String(value ?? '').trim();
  if (!s) return NaN;
  s = s.replace(/\u00a0/g, ' ').replace(/\s+/g, '');
  // Romanian format: 1.234,56 -> 1234.56
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
  // English/euro format: 1,234.56 -> 1234.56
  if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(s)) return Number(s.replace(/,/g, ''));
  // Decimal comma
  if (/^-?\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
  return Number(s);
}
function splitCsvLine(line) {
  const cells = [];
  let cell = '';
  let quote = false;
  // OPCOM RO CSV is semicolon-separated and uses decimal comma. Do not split decimal commas.
  const delimiter = String(line || '').includes(';') ? ';' : ',';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quote && line[i + 1] === '"') { cell += '"'; i++; }
      else quote = !quote;
    } else if (ch === delimiter && !quote) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}
function normalizeRecord(interval, priceLeiMwh, extra = {}) {
  const i = interval - 1;
  return {
    interval,
    i,
    hour: i / 4,
    label: labelForInterval(i),
    price: Math.round(priceLeiMwh),
    priceLeiMwh: Math.round(priceLeiMwh),
    rawPriceLeiMwh: Number(priceLeiMwh.toFixed(4)),
    source: SOURCE_LABEL,
    ...extra,
  };
}
function parseOpcomCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r/g, '');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
  const recordsByInterval = new Map();

  // Strategy 1: table-like CSV rows: Romania;1;695,47;...
  for (const line of lines) {
    if (!/Romania/i.test(line)) continue;
    const cells = splitCsvLine(line).map(c => c.replace(/^"|"$/g, '').trim());
    const zoneIdx = cells.findIndex(c => /^Romania$/i.test(c));
    if (zoneIdx < 0) continue;
    const numsAfter = cells.slice(zoneIdx + 1).map(parseRoNumber).filter(Number.isFinite);
    if (numsAfter.length >= 2) {
      const interval = Math.round(numsAfter[0]);
      const price = numsAfter[1];
      if (interval >= 1 && interval <= 96 && Number.isFinite(price)) {
        recordsByInterval.set(interval, normalizeRecord(interval, price));
      }
    }
  }

  // Strategy 2: flattened text pattern from rendered page.
  if (recordsByInterval.size < 90) {
    const flat = clean.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const rx = /Romania\s+(\d{1,2})\s+(-?\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d+)?|-?\d+(?:[\.,]\d+)?)/gi;
    for (const m of flat.matchAll(rx)) {
      const interval = Number(m[1]);
      const price = parseRoNumber(m[2]);
      if (interval >= 1 && interval <= 96 && Number.isFinite(price)) {
        recordsByInterval.set(interval, normalizeRecord(interval, price));
      }
    }
  }

  if (recordsByInterval.size < 90) {
    throw new Error(`OPCOM parser found only ${recordsByInterval.size}/96 intervals`);
  }

  const records = Array.from({ length: 96 }, (_, i) => recordsByInterval.get(i + 1));
  const missing = records.map((r, i) => r ? null : i + 1).filter(Boolean);
  if (missing.length) {
    throw new Error(`OPCOM CSV has missing intervals: ${missing.join(', ')}`);
  }
  return records;
}
async function fetchTextWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(timer);
  }
}
async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}
async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const deliveryDay = deliveryDateFromEnv();
  const { day, month, year } = dateParts(deliveryDay);
  const csvUrl = `https://www.opcom.ro/rapoarte-pzu-raportPIP-export-csv/${day}/${month}/${year}/ro`;
  const pageUrl = 'https://www.opcom.ro/grafice-ip-raportPIP-si-volumTranzactionat/ro';
  const latestFile = path.join(OUT_DIR, 'latest.json');
  const dayFile = path.join(OUT_DIR, `${deliveryDay}.json`);
  const statusFile = path.join(OUT_DIR, 'status.json');

  const headers = {
    'User-Agent': 'SVT OPCOM GitHub cache importer (GitHub Actions; contact: repository owner)',
    'Accept': 'text/csv,text/plain,application/octet-stream,*/*',
    'Referer': pageUrl,
    'Cache-Control': 'no-cache',
  };

  const status = {
    ok: false,
    source: SOURCE_LABEL,
    sourceMode: 'github-actions-ingest',
    deliveryDay,
    sourceUrl: csvUrl,
    generatedAtUtc: nowIso(),
  };

  try {
    const { res, text } = await fetchTextWithTimeout(csvUrl, { headers });
    status.httpStatus = res.status;
    if (!res.ok) throw new Error(`OPCOM HTTP ${res.status}`);
    const records = parseOpcomCsv(text);
    const vals = records.map(r => r.priceLeiMwh);
    const payload = {
      ok: true,
      source: SOURCE_LABEL,
      sourceMode: 'external-cache-github',
      currency: 'Lei/MWh',
      granularity: '15m',
      intervals: records.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      records,
      deliveryDay,
      sourceUrl: csvUrl,
      pageUrl,
      updatedAtUtc: nowIso(),
      generatedBy: 'GitHub Actions / scripts/fetch-opcom-pzu-cache.mjs',
    };
    await writeFile(dayFile, JSON.stringify(payload, null, 2) + '\n');
    await writeFile(latestFile, JSON.stringify(payload, null, 2) + '\n');
    await writeFile(statusFile, JSON.stringify({ ...status, ok: true, intervals: records.length, latestFile: 'data/opcom/pzu/latest.json' }, null, 2) + '\n');
    console.log(`OPCOM cache updated: ${deliveryDay}, ${records.length}/96 intervals`);
  } catch (err) {
    const prev = await readJsonIfExists(latestFile);
    const errorMessage = err?.message || String(err);
    const failed = {
      ...status,
      ok: false,
      status: 'opcom-unavailable-preserve-last-cache',
      stale: true,
      error: errorMessage,
      lastGoodDeliveryDay: prev?.deliveryDay || null,
      lastGoodUpdatedAtUtc: prev?.updatedAtUtc || null,
      lastGoodIntervals: Array.isArray(prev?.records) ? prev.records.length : null,
      latestFilePreserved: Boolean(prev && prev.ok !== false),
      fallbackStrategy: 'SVT Worker should use ENTSO-E A44 live price when OPCOM cache is missing/stale/unavailable.',
      note: 'OPCOM fetch failed. latest.json was not overwritten and the workflow exits successfully so scheduled GitHub Actions do not stay red.',
    };
    await writeFile(statusFile, JSON.stringify(failed, null, 2) + '\n');
    console.warn('OPCOM cache unavailable:', errorMessage);
    console.warn('Preserved previous latest.json:', failed.latestFilePreserved ? `${failed.lastGoodDeliveryDay} (${failed.lastGoodIntervals}/96)` : 'none');
    // Important: do not fail scheduled runs when OPCOM blocks GitHub Actions (HTTP 403).
    // The app has ENTSO-E A44 fallback and status.json records the outage.
    process.exitCode = 0;
  }
}

main();
