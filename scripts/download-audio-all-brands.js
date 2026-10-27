#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { projectIds } = require("../apps/mobile/brands");

const ROOT = path.resolve(__dirname, "..");
const downloader = path.join(__dirname, "download-audio-with-cookies.js");
const dryRun = process.argv.includes("--dry-run");
const unexpectedArgs = process.argv.slice(2).filter((arg) => arg !== "--dry-run");

if (unexpectedArgs.length) {
  console.error(`Unknown option(s): ${unexpectedArgs.join(", ")}`);
  console.error("Usage: node scripts/download-audio-all-brands.js [--dry-run]");
  process.exit(2);
}

console.log(`Running audio download sequentially for ${projectIds.length} registered brands:`);
for (const projectId of projectIds) console.log(`  - ${projectId}`);

if (dryRun) process.exit(0);

const childEnv = { ...process.env };
for (const key of Object.keys(childEnv)) {
  if (/^(APPWRITE_|EXPO_PUBLIC_APPWRITE_)/i.test(key) || key === "API_KEY" || key === "APP_PROJECT_ID") {
    delete childEnv[key];
  }
}

const failures = [];
for (const projectId of projectIds) {
  console.log(`\n===== Starting audio download: ${projectId} =====`);
  const result = spawnSync(
    process.execPath,
    [downloader, "--project", projectId, "--gap=15"],
    { cwd: ROOT, env: childEnv, stdio: "inherit", windowsHide: true },
  );

  if (result.error) {
    console.error(`${projectId} failed to start: ${result.error.message}`);
    failures.push(projectId);
  } else if (result.status !== 0) {
    console.error(`${projectId} exited with code ${result.status ?? "unknown"}`);
    failures.push(projectId);
  }
}

if (failures.length) {
  console.error(`\nAudio download failed for: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nAudio download completed for all registered brands.");
}
