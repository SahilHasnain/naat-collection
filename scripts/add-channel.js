#!/usr/bin/env node

/** Add or update one channel in one or more selected brand projects. */
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const dotenv = require("dotenv");
const { Client, Databases, ID, Query } = require("node-appwrite");
const { getProject, projectIds } = require("../apps/mobile/brands");

const args = process.argv.slice(2);
function getArg(name) {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function usage() {
  console.log(`Usage:
  npm run channel:add                         # interactive prompts
  npm run channel:add -- --interactive        # interactive prompts
  npm run channel:add -- --projects <brand,...> --channel-id <youtube-id> --channel-name <name> --other <true|false> [--max-duration-seconds <n>] [--min-latest-months <n>] [--min-popular-k <n>] [--apply]

Interactive mode previews targets and asks before writing. CLI mode previews
unless --apply is provided. API keys are read from
.env.<brand-id> (APPWRITE_API_KEY) or the matching
APPWRITE_API_KEY_<BRAND_ID> shell environment variable.`);
}

if (args.includes("--help") || args.includes("-h")) {
  usage();
  process.exit(0);
}

function parseBoolean(value, label) {
  const normalized = String(value).trim().toLowerCase();
  if (["true", "yes", "y"].includes(normalized)) return true;
  if (["false", "no", "n"].includes(normalized)) return false;
  throw new Error(`${label} must be true/false or yes/no.`);
}

async function collectInput() {
  const input = {
    projectArg: getArg("projects"),
    channelId: getArg("channel-id"),
    channelName: getArg("channel-name"),
    other: getArg("other"),
    maxDurationSeconds: getArg("max-duration-seconds"),
    minLatestMonths: getArg("min-latest-months"),
    minPopularK: getArg("min-popular-k"),
    apply: args.includes("--apply"),
    interactive: args.includes("--interactive"),
  };
  input.interactive ||= Object.entries(input).some(
    ([key, value]) =>
      !["apply", "interactive", "maxDurationSeconds", "minLatestMonths", "minPopularK"].includes(key) && value === undefined,
  );

  if (!input.interactive) return input;
  if (!stdin.isTTY) throw new Error("Interactive mode needs a terminal. Supply all CLI options instead.");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ask = async (question, current) => {
    const answer = (await rl.question(`${question}${current ? ` [${current}]` : ""}: `)).trim();
    return answer || current || "";
  };
  try {
    console.log("Registered brands:");
    projectIds.forEach((id, index) => console.log(`  ${index + 1}. ${id}`));
    input.projectArg = await ask("Target brand IDs (comma-separated; IDs or numbers)", input.projectArg);
    input.channelId = await ask("YouTube channel ID", input.channelId);
    input.channelName = await ask("Channel name", input.channelName);
    input.other = await ask("Other/non-official channel? (yes/no)", input.other);
    input.maxDurationSeconds = await ask(
      "Maximum duration in seconds (blank for no per-source limit)",
      input.maxDurationSeconds,
    );
    input.minLatestMonths = await ask(
      "Include videos newer than this many months (blank for no age limit)",
      input.minLatestMonths,
    );
    input.minPopularK = await ask(
      "Minimum views in thousands for older videos (blank for no popular override)",
      input.minPopularK,
    );
    return input;
  } finally {
    rl.close();
  }
}

function validateInput(input) {
  const projectList = [...new Set(input.projectArg.split(",").map((value) => {
    const token = value.trim();
    const numericChoice = /^\d+$/.test(token) ? projectIds[Number(token) - 1] : undefined;
    return numericChoice || token;
  }).filter(Boolean))];
  if (!projectList.length) throw new Error("Select at least one target brand.");
  for (const id of projectList) {
    if (!projectIds.includes(id)) throw new Error(`Unknown brand "${id}". Available: ${projectIds.join(", ")}`);
  }
  if (!input.channelId || !/^[A-Za-z0-9_-]{1,36}$/.test(input.channelId)) {
    throw new Error("Channel ID must be 1-36 letters, digits, _ or -.");
  }
  if (!input.channelName?.trim()) throw new Error("Channel name is required.");
  let maxDurationSeconds;
  if (input.maxDurationSeconds?.trim()) {
    maxDurationSeconds = Number(input.maxDurationSeconds);
    if (!Number.isInteger(maxDurationSeconds) || maxDurationSeconds < 1) {
      throw new Error("Maximum duration must be a positive whole number of seconds.");
    }
  }
  let minLatestMonths;
  if (input.minLatestMonths?.trim()) {
    minLatestMonths = Number(input.minLatestMonths);
    if (!Number.isInteger(minLatestMonths) || minLatestMonths < 1) {
      throw new Error("minLatest must be a positive whole number of months.");
    }
  }
  let minPopularK;
  if (input.minPopularK?.trim()) {
    minPopularK = Number(input.minPopularK);
    if (!Number.isInteger(minPopularK) || minPopularK < 1) {
      throw new Error("minPopular must be a positive whole number of thousands of views.");
    }
  }
  return {
    projectList,
    channelId: input.channelId,
    channelName: input.channelName.trim(),
    isOther: parseBoolean(input.other, "Other"),
    maxDurationSeconds,
    minLatestMonths,
    minPopularK,
  };
}

function apiKeyFor(projectId, projectCount) {
  const envName = `APPWRITE_API_KEY_${projectId.replace(/[^A-Za-z0-9]/g, "_").toUpperCase()}`;
  if (process.env[envName]) return process.env[envName];
  if (projectCount === 1 && process.env.APPWRITE_API_KEY) return process.env.APPWRITE_API_KEY;

  for (const envFile of [
    path.resolve(`.env.${projectId}`),
    path.resolve(`apps/mobile/.env.${projectId}`),
  ]) {
    if (!fs.existsSync(envFile)) continue;
    const values = dotenv.parse(fs.readFileSync(envFile));
    if (values.APPWRITE_API_KEY) return values.APPWRITE_API_KEY;
  }
  throw new Error(`No API key found for ${projectId}; set ${envName} or add it to .env.${projectId}.`);
}

async function channelExists(databases, brand, channelId) {
  const response = await databases.listDocuments(
    brand.appwrite.databaseId,
    brand.appwrite.channelsCollectionId,
    [Query.equal("channelId", channelId), Query.limit(1)],
  );
  return response.documents[0] || null;
}

async function upsertChannel(databases, brand, channelData) {
  const existing = await channelExists(databases, brand, channelData.channelId);
  const naatResponse = await databases.listDocuments(
    brand.appwrite.databaseId,
    brand.appwrite.naatsCollectionId,
    [Query.equal("channelId", channelData.channelId), Query.limit(1)],
  );
  const data = { ...channelData, naatCount: naatResponse.total || 0 };

  if (existing) {
    await databases.updateDocument(
      brand.appwrite.databaseId,
      brand.appwrite.channelsCollectionId,
      existing.$id,
      data,
    );
    return "updated";
  }

  await databases.createDocument(
    brand.appwrite.databaseId,
    brand.appwrite.channelsCollectionId,
    ID.unique(),
    data,
  );
  return "created";
}

async function main() {
  const input = await collectInput();
  const { projectList, channelId, channelName, isOther, maxDurationSeconds, minLatestMonths, minPopularK } = validateInput(input);
  const channelData = {
    channelId,
    channelName,
    naatCount: 0,
    lastUpdated: new Date().toISOString(),
    isOther,
    type: "channel",
  };
  if (maxDurationSeconds !== undefined) channelData.maxDuration = maxDurationSeconds;
  if (minLatestMonths !== undefined) channelData.minLatest = minLatestMonths;
  if (minPopularK !== undefined) channelData.minPopular = minPopularK;
  let apply = input.apply;

  console.log(`\n${apply ? "APPLY" : "DRY RUN"} — add channel ${channelId} (${channelName})`);
  if (maxDurationSeconds !== undefined) console.log(`Maximum duration: ${maxDurationSeconds}s`);
  if (minLatestMonths !== undefined) console.log(`minLatest: ${minLatestMonths} month(s)`);
  if (minPopularK !== undefined) console.log(`minPopular: ${minPopularK}k views`);
  for (const id of projectList) {
    const brand = getProject(id);
    console.log(`- ${id}: project ${brand.appwrite.projectId}, database ${brand.appwrite.databaseId}, channels ${brand.appwrite.channelsCollectionId}`);
  }
  if (input.interactive && !apply) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
      apply = parseBoolean(await rl.question("Apply these changes? (yes/no): "), "Confirmation");
    } finally {
      rl.close();
    }
  }
  if (!apply) {
    console.log("No changes made.");
    return;
  }

  // Resolve all credentials before the first write so a later missing key
  // cannot leave only some selected projects updated.
  const targets = projectList.map((id) => ({
    id,
    brand: getProject(id),
    apiKey: apiKeyFor(id, projectList.length),
  }));

  for (const { id, brand, apiKey } of targets) {
    const client = new Client()
      .setEndpoint(brand.appwrite.endpoint)
      .setProject(brand.appwrite.projectId)
      .setKey(apiKey);
    const databases = new Databases(client);
    const action = await upsertChannel(databases, brand, channelData);
    console.log(`${action}: ${id} / ${channelName.trim()}`);
  }
}

main().catch((error) => {
  console.error(`Channel operation failed: ${error.message || error}`);
  process.exit(1);
});
