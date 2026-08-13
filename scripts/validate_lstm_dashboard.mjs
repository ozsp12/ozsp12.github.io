#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "js", "lstm-dashboard.js");
const htmlPath = path.join(root, "en", "lstm_ftw", "index.html");
const script = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");

new vm.Script(script, { filename: scriptPath });

const failures = [];
function requireMatch(condition, message) {
  if (!condition) failures.push(message);
}

requireMatch(
  script.includes("https://raw.githubusercontent.com/ozsp12/lstm_for_the_win/main/data/output"),
  "dashboard must read versioned output from the model repository"
);
requireMatch(script.includes("/latest.json?live="), "dashboard must resolve latest.json on every load");
requireMatch(script.includes("/predictions.csv?live="), "dashboard must fetch predictions.csv");
requireMatch(script.includes("/evaluation_predictions.csv?live="), "dashboard must fetch evaluation_predictions.csv");
requireMatch(script.includes("/run_manifest.json?live="), "dashboard must fetch run_manifest.json");
requireMatch(script.includes("cache: \"no-store\""), "live data requests must bypass the browser cache");
requireMatch(script.includes("attempt < 3"), "dashboard must retry short-lived GitHub propagation failures");
requireMatch(script.includes("predictions.csv contains duplicate IDs"), "dashboard must validate unique prediction IDs");
requireMatch(script.includes("predictions.csv contains non-test rows"), "dashboard must enforce test-only predictions");
requireMatch(script.includes("Each prediction must have two evaluation rows"), "dashboard must reconcile both classifier outputs");
requireMatch(script.includes("disagree on the model timestamp"), "dashboard must reconcile CSV and manifest timestamps");
requireMatch(!script.includes("dashboard-data.json"), "dashboard must not reference the deleted fixed snapshot");
requireMatch(!html.includes("dashboard-data.json"), "HTML must not reference the deleted fixed snapshot");
requireMatch(!html.includes(">500<"), "HTML must not hard-code the old test-review count");
requireMatch(!html.includes("69.0%"), "HTML must not hard-code the old sentiment accuracy");
requireMatch(!fs.existsSync(path.join(root, "en", "lstm_ftw", "dashboard-data.json")), "fixed dashboard snapshot must be removed");

if (failures.length) {
  console.error(`LSTM dashboard validation failed with ${failures.length} error(s):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log("LSTM dashboard validation passed: live source, cache bypass, schema guards, and fixed-snapshot removal are valid.");
