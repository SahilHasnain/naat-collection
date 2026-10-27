#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const dotenv = require("dotenv");
const { projectIds } = require("../apps/mobile/brands");

const ROOT = path.resolve(__dirname, "..");
const REQUIRED_ANDROID_KEYS = [
  "ANDROID_KEYSTORE_PASSWORD",
  "ANDROID_KEY_ALIAS",
  "ANDROID_KEY_PASSWORD",
];

function usage() {
  console.log(
    "Usage: npm run provision:github-brand -- [brand-id] [--keystore path] [--dry-run] [--yes]\n" +
      "If brand-id or keystore path is omitted, the command prompts interactively.\n" +
      "Default keystore: secrets/android/<brand-id>.jks",
  );
}

function parseArgs(args) {
  const result = { dryRun: false, yes: false };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (arg === "--yes" || arg === "-y") {
      result.yes = true;
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--keystore") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a file path`);
      result.keystorePath = value;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length > 1) throw new Error("Provide no more than one brand ID");
  result.brandId = positional[0];
  return result;
}

function resolvePath(value) {
  return path.resolve(ROOT, value);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    input: options.input,
    stdio: options.input === undefined ? "pipe" : ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = options.sensitive
      ? `exit code ${result.status}`
      : (result.stderr || result.stdout || `exit code ${result.status}`).trim();
    throw new Error(`${command} failed: ${detail}`);
  }
  return result.stdout.trim();
}

function isSecretKey(key) {
  if (key === "ANDROID_KEYSTORE_BASE64" || key === "PLAY_STORE_JSON_BASE64") return false;
  if (key === "ANDROID_KEY_ALIAS") return true;
  return /(?:_API_KEY|_SECRET(?:_KEY)?|_TOKEN(?:_[A-Z0-9]+)?|_PASSWORD)$/i.test(key);
}

function setSecret(args, value) {
  run("gh", args, { input: value, sensitive: true });
}

function listEnvironmentSecrets(repository, environment) {
  const result = spawnSync(
    "gh",
    ["secret", "list", "--repo", repository, "--env", environment],
    { cwd: ROOT, encoding: "utf8", windowsHide: true },
  );
  if (result.error) throw new Error(`gh failed to start: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || "";
    if (/HTTP 404/.test(detail)) return [];
    throw new Error(`gh secret list failed: ${detail.trim() || `exit code ${result.status}`}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

async function promptForBrand() {
  if (!stdin.isTTY) throw new Error("Provide a brand ID when running non-interactively.");
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log("Registered brands:");
    projectIds.forEach((id, index) => console.log(`  ${index + 1}. ${id}`));
    const answer = await rl.question("Select a brand number or enter its ID: ");
    const selected = /^\d+$/.test(answer.trim()) ? projectIds[Number(answer.trim()) - 1] : answer.trim();
    if (!selected || !projectIds.includes(selected)) throw new Error(`Unknown brand selection: ${answer}`);
    return selected;
  } finally {
    rl.close();
  }
}

async function promptForKeystore(defaultPath) {
  if (!stdin.isTTY) return defaultPath;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`Path to this brand's .jks file [${defaultPath}]: `);
    return answer.trim() || defaultPath;
  } finally {
    rl.close();
  }
}

async function confirmProvision(
  options,
  environment,
  repository,
  secretNames,
  keystorePath,
  removePlayStoreDuplicate,
) {
  if (options.dryRun) return true;
  if (options.yes) return true;
  if (!stdin.isTTY) throw new Error("Use --yes to confirm provisioning in a non-interactive terminal.");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log(`\nRepository: ${repository}`);
    console.log(`Environment: ${environment}`);
    console.log(`Keystore file: ${path.relative(ROOT, keystorePath)}`);
    console.log(`Environment secrets to set: ${secretNames.join(", ")}`);
    console.log("Shared repository secret PLAY_STORE_JSON_BASE64: already present; leaving unchanged.");
    if (removePlayStoreDuplicate) {
      console.log("An environment-level PLAY_STORE_JSON_BASE64 exists and will be removed so the shared repo secret is used.");
    }
    return /^(y|yes)$/i.test((await rl.question("Proceed? [y/N] ")).trim());
  } finally {
    rl.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  if (!options.brandId) options.brandId = await promptForBrand();
  if (!projectIds.includes(options.brandId)) {
    throw new Error(`Unknown brand "${options.brandId}". Registered brands: ${projectIds.join(", ")}`);
  }

  const envPath = resolvePath(`.env.${options.brandId}`);
  if (!fs.existsSync(envPath)) throw new Error(`Missing brand env file: ${path.relative(ROOT, envPath)}`);
  const envValues = dotenv.parse(fs.readFileSync(envPath));
  const secrets = Object.entries(envValues).filter(([key, value]) => isSecretKey(key) && value.trim());
  const missingAndroidKeys = REQUIRED_ANDROID_KEYS.filter((key) => !envValues[key]?.trim());
  if (missingAndroidKeys.length) {
    throw new Error(`Missing required values in ${path.relative(ROOT, envPath)}: ${missingAndroidKeys.join(", ")}`);
  }

  const defaultKeystorePath = path.join("secrets", "android", `${options.brandId}.jks`);
  const keystoreInput = options.keystorePath || await promptForKeystore(defaultKeystorePath);
  const keystorePath = resolvePath(keystoreInput);
  if (!fs.existsSync(keystorePath) || !fs.statSync(keystorePath).isFile()) {
    throw new Error(`Keystore file not found: ${path.relative(ROOT, keystorePath)}`);
  }

  const environment = `android-${options.brandId}`;
  const repository = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  const repositorySecrets = run("gh", ["secret", "list", "--repo", repository]);
  const hasSharedPlaySecret = repositorySecrets
    .split(/\r?\n/)
    .some((line) => line.trim().split(/\s+/)[0] === "PLAY_STORE_JSON_BASE64");
  if (!hasSharedPlaySecret) {
    throw new Error(
      `Repository secret PLAY_STORE_JSON_BASE64 is missing from ${repository}. Add it once with gh secret set; brand setup will not create or overwrite it.`,
    );
  }
  const removePlayStoreDuplicate = listEnvironmentSecrets(repository, environment).includes(
    "PLAY_STORE_JSON_BASE64",
  );

  const environmentSecrets = [
    ...secrets,
    ["ANDROID_KEYSTORE_BASE64", fs.readFileSync(keystorePath).toString("base64")],
  ];
  const secretNames = environmentSecrets.map(([key]) => key);

  if (options.dryRun) {
    console.log(`Dry run: would prepare GitHub environment ${environment} in ${repository}`);
    console.log(`Would set environment secrets: ${secretNames.join(", ")}`);
    console.log("Verified shared repository secret PLAY_STORE_JSON_BASE64 exists; it will not be changed.");
    if (removePlayStoreDuplicate) {
      console.log("Would remove the same-named environment secret so the repo-level value takes effect.");
    }
    return;
  }

  if (!(await confirmProvision(
    options,
    environment,
    repository,
    secretNames,
    keystorePath,
    removePlayStoreDuplicate,
  ))) {
    console.log("Cancelled; no GitHub changes were made.");
    return;
  }

  run("gh", [
    "api",
    "--method",
    "PUT",
    `repos/${repository}/environments/${encodeURIComponent(environment)}`,
  ]);

  if (removePlayStoreDuplicate) {
    run("gh", [
      "secret",
      "delete",
      "PLAY_STORE_JSON_BASE64",
      "--repo",
      repository,
      "--env",
      environment,
    ]);
    console.log(`Removed environment-level PLAY_STORE_JSON_BASE64 from ${environment}; repo secret will be used.`);
  }

  for (const [key, value] of environmentSecrets) {
    setSecret(["secret", "set", key, "--repo", repository, "--env", environment], value);
    console.log(`Set ${key} in ${environment}`);
  }

  console.log(`Provisioned ${environment} from ${path.relative(ROOT, envPath)}`);
}

main().catch((error) => {
  console.error(`GitHub brand provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
