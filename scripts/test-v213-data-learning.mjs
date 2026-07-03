// Data Learning smoke test. Run from repo root with:
// node scripts/test-v213-data-learning.mjs
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

globalThis.window = globalThis;

const store = {};
globalThis.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem(key, value) { store[key] = String(value); },
  removeItem(key) { delete store[key]; },
  clear() { Object.keys(store).forEach(key => delete store[key]); }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
await import(pathToFileURL(path.join(root, "assets/js/svt-load-curve-profiles.js")).href);

function fakeFile(name, text) {
  return { name, async text() { return text; } };
}

function sampleCsv(day) {
  const rows = ["Data citire;Valoare masurata"];
  for (let h = 0; h < 24; h++) rows.push(`${day} ${String(h).padStart(2, "0")}:00;${20 + h}`);
  return rows.join("\n");
}

localStorage.clear();

const first = fakeFile("format-contor-special-martie.csv", sampleCsv("2026-03-01"));
const trained = await SVTLoadCurveProfiles.parseFileWithMapping(first, {
  headerRow:0,
  columnMapping:{date:"Data citire", consumption:"Valoare masurata"},
  unit:"kWh"
}, {mode:"electric", fixedPriceRonKwh:0.75});

const modelsAfterTrain = SVTLoadCurveProfiles.getLearnedModels();
if (trained.meta.sourceProfile !== "flexible_energy_table") throw new Error(`Expected manual flexible parse, got ${trained.meta.sourceProfile}`);
if (trained.meta.learningStatus !== "trained") throw new Error(`Expected trained status, got ${trained.meta.learningStatus}`);
if (modelsAfterTrain.length !== 1) throw new Error(`Expected 1 learned model, got ${modelsAfterTrain.length}`);

const second = fakeFile("format-contor-special-aprilie.csv", sampleCsv("2026-04-01"));
const learned = await SVTLoadCurveProfiles.parseFile(second, {mode:"electric", fixedPriceRonKwh:0.75});
const modelsAfterUse = SVTLoadCurveProfiles.getLearnedModels();

if (learned.meta.sourceProfile !== "learned_energy_table") throw new Error(`Expected learned profile, got ${learned.meta.sourceProfile}`);
if (!learned.meta.learningApplied) throw new Error("Expected learningApplied=true");
if (modelsAfterUse[0].usageCount !== 1) throw new Error(`Expected usageCount=1, got ${modelsAfterUse[0].usageCount}`);
if (learned.rows.length !== 24) throw new Error(`Expected 24 rows, got ${learned.rows.length}`);
if (learned.rows.some(row => row.priceRonKwh !== 0.75)) throw new Error("Expected fixed tariff to be applied to parsed rows");

console.log(`PASS data learning: trained=${modelsAfterTrain.length}, applied=${learned.meta.learnedModelId}, rows=${learned.rows.length}`);
