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
const run = await getJson(`${runRoot}/${contract.run_file}`, "default");
if (run.schema_version !== contract.schema_version) throw new Error(`unexpected schema: ${run.schema_version}`);
if (run.artifact_type !== "experiment_run") throw new Error(`unexpected artifact type: ${run.artifact_type}`);
requireFields(run.run, contract.required_run_fields, "run.run");
if (run.run.run_id !== latest.run_id) throw new Error(`latest.json and run.json disagree on run_id`);
if (run.run.status !== contract.required_status) throw new Error(`latest run status is ${run.run.status}`);
for (const [field, value] of Object.entries(contract.required_scope)) {
  if (run.scope?.[field] !== value) throw new Error(`unexpected scope ${field}: ${run.scope?.[field]}`);
}
for (const task of ["sentiment", "topic"]) {
  requireFields(run.tasks[task], contract.required_task_fields, `run.tasks.${task}`);
}
if (!Array.isArray(run.reviews) || run.reviews.length === 0) throw new Error("run.json contains no reviews");
if (!run.benchmark?.immutable || !Array.isArray(run.benchmark.reviews) || run.benchmark.reviews.length === 0) {
  throw new Error("run.json does not contain the immutable benchmark evaluation");
}

console.log(`External integration passed: ${contract.name} run ${latest.run_id}, run.json, schema ${run.schema_version}.`);
