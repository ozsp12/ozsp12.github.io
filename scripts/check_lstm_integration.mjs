#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(fs.readFileSync(path.join(root, "data", "integrations", "lstm.json"), "utf8"));

async function getJson(url, cache = "no-store") {
  const response = await fetch(url, { cache });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => !(field in object));
  if (missing.length) throw new Error(`${label} missing fields: ${missing.join(", ")}`);
}

const latest = await getJson(`${contract.source_root}/${contract.latest_file}`);
requireFields(latest, contract.required_latest_fields, contract.latest_file);
if (!/^[A-Za-z0-9._-]+$/.test(latest.run_id)) throw new Error(`invalid run_id: ${latest.run_id}`);

const runRoot = `${contract.source_root}/${encodeURIComponent(latest.run_id)}`;
const analysis = await getJson(`${runRoot}/${contract.analysis_file}`, "default");
if (analysis.schema_version !== contract.schema_version) throw new Error(`unexpected schema: ${analysis.schema_version}`);
requireFields(analysis.run, contract.required_run_fields, "analysis.run");
if (analysis.run.run_id !== latest.run_id) throw new Error("latest.json and analysis.json disagree on run_id");
if (analysis.run.status !== contract.required_status) throw new Error(`latest run status is ${analysis.run.status}`);
for (const [field, value] of Object.entries(contract.required_scope)) {
  if (analysis.scope?.[field] !== value) throw new Error(`unexpected scope ${field}: ${analysis.scope?.[field]}`);
}
for (const task of ["sentiment", "topic"]) requireFields(analysis.tasks[task], contract.required_task_fields, `analysis.tasks.${task}`);
if (!Array.isArray(analysis.reviews) || analysis.reviews.length === 0) throw new Error("analysis.json contains no reviews");

console.log(`External integration passed: ${contract.name} run ${latest.run_id}, schema ${analysis.schema_version}.`);
