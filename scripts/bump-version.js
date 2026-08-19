#!/usr/bin/env node
/**
 * bump-version.js — Increment versionCode in apps/mobile/brand.config.js,
 *                    commit, and push. Drop-in replacement for `expo-deploy`
 *                    when versionCode lives in brand.config.js.
 *
 * Usage:  node scripts/bump-version.js          # bump + commit + push
 *         node scripts/bump-version.js --dry    # bump only (no commit/push)
 */

const fs   = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dryRun = process.argv.includes("--dry");
const brandPath = path.join(__dirname, "..", "apps", "mobile", "brand.config.js");

// --- read & increment -----------------------------------------------------------
let content = fs.readFileSync(brandPath, "utf8");
const match = content.match(/versionCode:\s*(\d+)/);
if (!match) {
  console.error("Could not find versionCode in", brandPath);
  process.exit(1);
}

const current = parseInt(match[1], 10);
const next    = current + 1;
content = content.replace(/(versionCode:\s*)(\d+)/, `$1${next}`);
fs.writeFileSync(brandPath, content);

console.log(`versionCode: ${current} → ${next}`);

if (dryRun) {
  console.log("(dry run — nothing committed or pushed)");
  process.exit(0);
}

// --- commit & push ---------------------------------------------------------------
const repoRoot = path.join(__dirname, "..");
const exec = (cmd) => execSync(cmd, { cwd: repoRoot, stdio: "inherit" });

exec("git add apps/mobile/brand.config.js");
exec(`git commit -m "Bump versionCode to ${next}"`);
exec("git push origin main");
console.log("Pushed.");
