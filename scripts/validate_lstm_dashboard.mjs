#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "js", "lstm-dashboard.js");
const contractPath = path.join(root, "data", "integrations", "lstm.json");
const htmlPath = path.join(root, "en", "projects", "lstm_ftw", "index.html");
const script = fs.readFileSync(scriptPath, "utf8");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const html = fs.readFileSync(htmlPath, "utf8");

new vm.Script(script, { filename: scriptPath });

const failures = [];
const requireMatch = (condition, message) => { if (!condition) failures.push(message); };

requireMatch(script.includes('const CONTRACT_URL = "/data/integrations/lstm.json"'), "dashboard must load the integration contract");
requireMatch(!script.includes("raw.githubusercontent.com/ozsp12/lstm_for_the_win"), "dashboard JS must not duplicate the source root");
requireMatch(script.includes("contract.source_root"), "dashboard must derive source URLs from the contract");
requireMatch(script.includes("latest_file}?live="), "dashboard must resolve latest.json on every load");
requireMatch(script.includes('"no-store"'), "latest.json must bypass browser cache");
requireMatch(script.includes('"force-cache"'), "immutable analysis.json should be cacheable");
requireMatch(script.includes("contract.analysis_file"), "dashboard must fetch analysis.json");
for (const obsolete of ["predictions.csv", "metrics.json", "results.json", "run_manifest.json", "dashboard-data.json"]) {
  requireMatch(!script.includes(obsolete), `dashboard must not reference obsolete ${obsolete}`);
}
requireMatch(script.includes("analysis.schema_version === contract.schema_version"), "dashboard must validate the analysis schema");
requireMatch(script.includes("duplicate review IDs"), "dashboard must validate unique IDs");
requireMatch(script.includes("accuracy disagrees with analysis.json"), "dashboard must reconcile review-derived accuracy");
requireMatch(script.includes("accuracy_ci95"), "dashboard must validate and display 95% accuracy intervals");
requireMatch(script.includes("external validation"), "dashboard must communicate the synthetic benchmark limitation");
requireMatch(script.includes("attempt < 3"), "dashboard must retry short-lived propagation failures");
requireMatch(contract.run_files === undefined, "integration contract must not retain the old multi-file run contract");
requireMatch(contract.analysis_file === "analysis.json", "integration contract must declare analysis.json");
requireMatch(!html.includes("Pipeline 0.5.0"), "dashboard must not contain stale pipeline metadata");
requireMatch(html.includes("No real external dataset is evaluated here"), "dashboard must state the absence of external validation");

if (failures.length) {
  console.error(`LSTM dashboard validation failed with ${failures.length} error(s):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log("LSTM dashboard validation passed: canonical analysis.json contract, caching, uncertainty, and limitations are wired correctly.");
