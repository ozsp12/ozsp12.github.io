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
requireMatch(script.includes('"force-cache"'), "immutable run artifacts should be cacheable");
requireMatch(script.includes("contract.run_file"), "dashboard must prefer run.json");
requireMatch(script.includes("contract.legacy_analysis_file"), "dashboard must retain temporary legacy-read compatibility");
for (const obsolete of ["predictions.csv", "metrics.json", "results.json", "run_manifest.json", "dashboard-data.json", "article_analysis.csv"]) {
  requireMatch(!script.includes(obsolete), `dashboard must not reference obsolete ${obsolete}`);
}
requireMatch(script.includes('runDocument.artifact_type === "experiment_run"'), "dashboard must validate the canonical artifact type");
requireMatch(script.includes("duplicate review IDs"), "dashboard must validate unique IDs");
requireMatch(script.includes("accuracy disagrees with"), "dashboard must reconcile review-derived accuracy");
requireMatch(script.includes("accuracy_ci95"), "dashboard must validate and display 95% accuracy intervals");
requireMatch(script.includes("external validation"), "dashboard must communicate the synthetic benchmark limitation");
requireMatch(script.includes("attempt < 3"), "dashboard must retry short-lived propagation failures");
requireMatch(contract.run_file === "run.json", "integration contract must declare run.json");
requireMatch(contract.schema_version === "2.0.0", "integration contract must declare run schema 2.0.0");
requireMatch(contract.legacy_analysis_file === "analysis.json", "migration contract must identify the legacy analysis filename");
requireMatch(contract.legacy_schema_version === "1.0.0", "migration contract must identify legacy schema 1.0.0");
requireMatch(contract.analysis_file === undefined, "integration contract must not present analysis.json as the canonical file");
requireMatch(contract.paper_file === undefined, "integration contract must not expose a redundant paper-specific artifact");
requireMatch(!html.includes("Pipeline 0.5.0"), "dashboard must not contain stale pipeline metadata");
requireMatch(html.includes("Open run JSON"), "dashboard must expose the canonical run artifact");
requireMatch(html.includes("No real external dataset is evaluated here"), "dashboard must state the absence of external validation");
requireMatch(html.includes("any later CSV or Parquet views are derived directly"), "dashboard must describe tabular outputs as derived views");

if (failures.length) {
  console.error(`LSTM dashboard validation failed with ${failures.length} error(s):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log("LSTM dashboard validation passed: run.json contract, legacy migration, caching, uncertainty, and limitations are wired correctly.");
