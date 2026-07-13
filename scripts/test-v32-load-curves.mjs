// v32 real parser smoke tests. Run from repo root with: node scripts/test-v32-load-curves.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {}
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
await import(pathToFileURL(path.join(root, "assets/js/svt-load-curve-profiles.js")).href);
await import(pathToFileURL(path.join(root, "assets/js/svt-analysis-engine.js")).href);

const samples = [
  "test-data/01.2022.csv",
  "test-data/01.Marquardt - Curba de sarcina - ianuarie 2021.csv",
  "test-data/IBD (Curba de sarcina la nivel orar) IAN 2024.csv",
  "test-data/Raport curba de sarcina - Salina_Dej_1 01.07.2013.csv"
];

let ok = 0;
for (const rel of samples) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const text = fs.readFileSync(p, "utf8");
  const aoa = SVTLoadCurveProfiles.parseCsvText(text);
  const dataset = SVTLoadCurveProfiles.parseAoa(aoa, { fileName:path.basename(p), fixedPriceRonKwh:0.75, contractPowerKw:100 });
  const analysis = SVTAnalysisEngine.analyze(dataset);
  console.log(`${path.basename(p)} | ${dataset.meta.sourceProfile} | rows=${dataset.rows.length} | interval=${dataset.meta.intervalMinutes} | kWh=${analysis.totals.consumptionKwh}`);
  if (dataset.rows.length > 1 && analysis.totals.consumptionKwh > 0) ok++;
}
if (ok === 0) throw new Error("No real files parsed.");
console.log(`PASS v32 real parser smoke: ${ok}/${samples.length} parsed.`);
