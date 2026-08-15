#!/usr/bin/env node
"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(fs.readFileSync(path.join(root, "data", "integrations", "lstm.json"), "utf8"));

async function get(url, asJson = false) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return asJson ? response.json() : response.text();
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => !(field in object));
  if (missing.length) throw new Error(`${label} missing fields: ${missing.join(", ")}`);
}

const latestUrl = `${contract.source_root}/${contract.latest_file}`;
const latest = await get(latestUrl, true);
requireFields(latest, contract.required_latest_fields, contract.latest_file);

if (!/^[A-Za-z0-9._-]+$/.test(latest.run_id)) {
  throw new Error(`invalid run_id: ${latest.run_id}`);
}

const runRoot = `${contract.source_root}/${encodeURIComponent(latest.run_id)}`;
const manifest = await get(`${runRoot}/run_manifest.json`, true);
requireFields(manifest, contract.required_manifest_fields, "run_manifest.json");

if (manifest.run_id !== latest.run_id) {
  throw new Error("latest.json and run_manifest.json disagree on run_id");
}
if (manifest.status !== contract.required_status) {
  throw new Error(`latest run status is ${manifest.status}, expected ${contract.required_status}`);
}

for (const file of contract.run_files) {
  const content = await get(`${runRoot}/${file}`, file.endsWith(".json"));
  if (typeof content === "string" && content.trim().length === 0) {
    throw new Error(`${file} is empty`);
  }
}

console.log(`External integration passed: ${contract.name} run ${latest.run_id}.`);
