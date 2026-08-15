#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "js", "lstm-dashboard.js");
const htmlPath = path.join(root, "en", "projects", "lstm_ftw", "index.html");
const contractPath = path.join(root, "data", "integrations", "lstm.json");
const script = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));

new vm.Script(script, { filename: scriptPath });

const failures = [];
function requireMatch(condition, message) {
  if (!condition) failures.push(message);
}

requireMatch(script.includes(contract.source_root), "dashboard source root must match the integration contract");
requireMatch(script.includes(`/${contract.latest_file}?live=`), "dashboard must resolve latest.json on every load");
for (const file of contract.run_files) {
  requireMatch(script.includes(`/${file}?live=`), `dashboard must fetch ${file}`);
}
requireMatch(!script.includes("evaluation_predictions.csv"), "dashboard must not depend on the removed evaluation_predictions.csv");
requireMatch(script.includes("sentiment_confidence"), "dashboard must use the current prediction confidence schema");
requireMatch(script.includes("linguistic_level"), "dashboard must validate linguistic level metadata");
requireMatch(script.includes("flagprofanity"), "dashboard must validate profanity metadata");
requireMatch(script.includes("goldtest"), "dashboard must validate goldtest metadata");
requireMatch(script.includes("predictions.csv contains duplicate IDs"), "dashboard must validate unique prediction IDs");
requireMatch(script.includes("disagree on the model timestamp"), "dashboard must reconcile CSV and manifest timestamps");
requireMatch(script.includes("cache: \"no-store\""), "live data requests must bypass the browser cache");
requireMatch(script.includes("attempt < 3"), "dashboard must retry short-lived GitHub propagation failures");
requireMatch(!script.includes("dashboard-data.json"), "dashboard must not reference a fixed snapshot");
requireMatch(!html.includes("Synthetic · Test only"), "dashboard HTML must not describe the obsolete test split");
requireMatch(!html.includes("test reviews"), "dashboard HTML must use incoming terminology");
requireMatch(!fs.existsSync(path.join(root, "en", "projects", "lstm_ftw", "dashboard-data.json")), "fixed dashboard snapshot must be removed");

if (failures.length) {
  console.error(`LSTM dashboard validation failed with ${failures.length} error(s):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log("LSTM dashboard validation passed: local structure matches the incoming-data contract.");
