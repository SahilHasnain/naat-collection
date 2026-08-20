#!/usr/bin/env node

/**
 * Instagram Reel Auto-Uploader for Owais Raza Qadri.
 *
 * Generates a Reel (via generate-reels.js logic) then uploads it to
 * Instagram automatically using Playwright with a persistent profile.
 *
 * Usage:
 *   node scripts/youtube-upload/instagram-bot.js                # next unposted reel
 *   node scripts/youtube-upload/instagram-bot.js --youtubeId=xxx
 *   node scripts/youtube-upload/instagram-bot.js --generate-only
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { chromium } = require("playwright");
const reels = require("./generate-reels");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const CONFIG = {
  ...reels.CONFIG,
  profileDir: path.join(__dirname, "instagram-profile"),
};

function log(msg) {
  console.log(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function loadProgress() {
  try {
    const p = JSON.parse(fs.readFileSync(CONFIG.progressFile, "utf-8"));
    if (!p.uploaded) p.uploaded = [];
    return p;
  } catch {
    return { done: [], uploaded: [] };
  }
}

function saveProgress(p) {
  fs.writeFileSync(CONFIG.progressFile, JSON.stringify(p, null, 2));
}

async function screenshot(page, name) {
  fs.mkdirSync(path.join(__dirname, "instagram-debug"), { recursive: true });
  await page.screenshot({ path: path.join(__dirname, "instagram-debug", name) });
}

/**
 * Click an element the way a human would: move mouse to the element,
 * wait, press down, hold, release. Instagram ignores Playwright's
 * synthetic trusted clicks on some elements (e.g. the create button),
 * so a real mouse-down/up sequence is required.
 */
async function humanClick(page, locator, { jitter = 4, holdMs = 120 } = {}) {
  let box = null;
  try {
    box = await locator.boundingBox();
  } catch {}
  if (box) {
    const cx = box.x + box.width / 2 + (Math.random() * jitter * 2 - jitter);
    const cy = box.y + box.height / 2 + (Math.random() * jitter * 2 - jitter);
    await page.mouse.move(cx, cy, { steps: 6 + Math.floor(Math.random() * 4) });
    await sleep(rand(150, 400));
    await page.mouse.down();
    await sleep(rand(holdMs, holdMs + 150));
    await page.mouse.up();
  }
  // Some flows need Playwright's trusted click; try it too
  try {
    await locator.click({ timeout: 4000 });
  } catch {}
}

/**
 * Ensure we're logged in. Handles the security challenge (reCAPTCHA)
 * by pausing and letting the human solve it, and the profile-switcher
 * "Continue" / password re-entry prompts.
 */
async function ensureLogin(page) {
  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
  await sleep(rand(3000, 5000));

  // Profile switcher: "Continue as <user>" — div[role=button]
  const contBtn = page.locator('[role="button"][aria-label^="Continue "]').first();
  if (await contBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    log("  👤 Switching to saved profile...");
    await humanClick(page, contBtn);
    await sleep(rand(3000, 5000));

    // Instagram may re-ask for password after switching
    const pwd = page.locator('input[name="password"]');
    if (await pwd.isVisible({ timeout: 3000 }).catch(() => false)) {
      log("  🔑 Re-entering password...");
      await pwd.fill(process.env.INSTAGRAM_PASSWORD || "");
      await page.locator("button[type=submit]").first().click();
      await sleep(rand(4000, 6000));
    }
  }

  // Security challenge (reCAPTCHA / suspicious login) — wait for human
  if (await handleChallenge(page)) return;
}

async function handleChallenge(page) {
  const challenge = page.getByText(/challenge|suspicious|confirm it's you|verify/i).first();
  if (await challenge.isVisible({ timeout: 4000 }).catch(() => false)) {
    log("  🛡 Security challenge detected — waiting for you to solve it (up to 3 min)...");
    log("    The browser is open. Solve the CAPTCHA, then I'll continue automatically.");
    await screenshot(page, "challenge.png");
    for (let i = 0; i < 36; i++) {
      await sleep(5000);
      const still = await challenge.isVisible({ timeout: 2000 }).catch(() => false);
      if (!still) {
        log("  ✅ Challenge cleared");
        await sleep(rand(2000, 3000));
        return true;
      }
    }
    throw new Error("Challenge not solved within 3 minutes.");
  }
  return false;
}

/**
 * Open the "Create new post" flow and attach the reel video.
 * Desktop web routes videos automatically as Reels.
 */
async function openCreateMenu(page) {
  const createBtn = page
    .locator('a:has(svg[aria-label="New post"]), svg[aria-label="New post"]')
    .first();
  await createBtn.waitFor({ state: "visible", timeout: 30000 });
  const box = await createBtn.boundingBox();
  // Click a few px toward center so we don't hit the svg edge
  await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 5, { steps: 8 });
  await sleep(rand(200, 400));
  await page.mouse.down();
  await sleep(rand(150, 300));
  await page.mouse.up();
  await sleep(rand(2000, 3000));

  // Handle any challenge that appears after opening the menu
  await handleChallenge(page);

  // Retry opening if the menu didn't appear (dialog with "Create new post")
  const menuOpen = await page
    .getByText("Create new post", { exact: true })
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (!menuOpen) {
    await sleep(rand(1500, 2500));
    await page.mouse.move(box.x + box.width / 2 + 3, box.y + box.height / 2 + 5, { steps: 6 });
    await sleep(rand(200, 400));
    await page.mouse.down();
    await sleep(rand(150, 300));
    await page.mouse.up();
    await sleep(rand(2000, 3000));
  }
}

/**
 * Upload a reel video with the given caption.
 * Assumes already logged in on `page`.
 */
async function uploadReel(page, videoPath, caption) {
  log("  📤 Opening create menu...");
  await openCreateMenu(page);

  log("  🎬 Attaching video...");
  const fileInput = page.locator("input[type=file]").first();
  await fileInput.waitFor({ state: "attached", timeout: 20000 }).catch(async () => {
    await screenshot(page, "create-menu.png");
    throw new Error("Create menu did not open — check instagram-debug/create-menu.png");
  });
  await fileInput.setInputFiles(videoPath);

  log("  ⏳ Waiting for upload...");
  const nextBtn = page.getByText("Next", { exact: true }).last();
  await nextBtn.waitFor({ state: "visible", timeout: 60000 });
  await sleep(rand(3000, 5000));
  await humanClick(page, nextBtn);
  await sleep(rand(2500, 4000));

  // Dismiss the one-time "Video posts are now shared as reels" info modal
  const infoOk = page.getByText("OK", { exact: true }).last();
  if (await infoOk.isVisible({ timeout: 5000 }).catch(() => false)) {
    log("  ℹ️  Dismissing reels info dialog...");
    await humanClick(page, infoOk);
    await sleep(rand(1500, 2500));
  }

  // Caption screen
  log("  ✍️ Writing caption...");
  const captionBox = page
    .locator('[role="dialog"] div[contenteditable="true"], div[aria-label*="caption"][contenteditable="true"]')
    .first();
  try {
    if (!(await captionBox.isVisible({ timeout: 10000 }).catch(() => false))) {
      // Maybe the info-dialog dismiss returned us to the editor — click Next again
      const next2 = page.getByText("Next", { exact: true }).last();
      if (await next2.isVisible({ timeout: 3000 }).catch(() => false)) {
        log("  ↪️  Returning to editor — clicking Next again...");
        await humanClick(page, next2);
        await sleep(rand(2500, 3500));
      }
    }
    if (!(await captionBox.isVisible({ timeout: 10000 }).catch(() => false))) throw new Error("no caption box");
    await captionBox.click();
    await captionBox.fill(caption);
    await sleep(rand(800, 1500));
  } catch {
    await screenshot(page, "caption-screen.png");
    const dialogText = await page
      .evaluate(() => document.querySelector("[role=dialog]")?.innerText.slice(0, 200) || "NO DIALOG")
      .catch(() => "?");
    throw new Error(`Could not find caption box (dialog: "${dialogText}") — see instagram-debug/caption-screen.png`);
  }

  log("  🚀 Sharing...");
  const shareBtn = page.getByText("Share", { exact: true }).last();
  await humanClick(page, shareBtn);

  // Wait for share to complete (dialog disappears)
  await sleep(rand(3000, 5000));
  const stillOpen = await page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false);
  if (stillOpen) {
    // Possibly a "share to feed too" or similar — dismiss
    const done = page.getByText(/Done|Close|Share again|OK/, { exact: true }).last();
    await humanClick(page, done);
    await sleep(rand(2000, 3000));
  }
  await screenshot(page, "after-share.png");
  log("  ✅ Reel shared!");
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║     Instagram Reel Auto-Uploader         ║");
  console.log("║     Owais Raza Qadri                     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const args = process.argv.slice(2);
  const specific = args.find((a) => a.startsWith("--youtubeId="))?.split("=")[1];
  const generateOnly = args.includes("--generate-only");
  const skipGenerate = args.includes("--skip-generate");

  // 1. Pick a naat that hasn't been generated yet
  const naats = reels.loadNaats();
  let naat;
  if (specific) {
    naat = naats.find((n) => n.youtubeId === specific);
    if (!naat) throw new Error(`Not found: ${specific}`);
  } else {
    const prog = loadProgress();
    const done = new Set(prog.done);
    const uploaded = new Set(prog.uploaded);
    naat = naats.find((n) => !done.has(n.youtubeId) && !uploaded.has(n.youtubeId));
    if (!naat) {
      // Nothing pending — regenerate/reupload a non-uploaded done one
      naat = naats.find((n) => !uploaded.has(n.youtubeId));
    }
    if (!naat) {
      console.log("All naats uploaded. 🎉");
      return;
    }
  }

  console.log("🎬 Generating Reel...\n");
  if (!skipGenerate) {
    await reels.processNaat(naat);
  } else {
    console.log(`[${naat.youtubeId}] ${naat.title} (skip-generate: using existing files)`);
  }

  const videoPath = path.join(CONFIG.outputDir, `${naat.youtubeId}_reel.mp4`);
  const captionPath = path.join(CONFIG.outputDir, `${naat.youtubeId}_caption.txt`);
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Reel file missing: ${videoPath}`);
  }
  const caption = fs.readFileSync(captionPath, "utf-8");

  // Mark as generated (done)
  const prog = loadProgress();
  if (!prog.done.includes(naat.youtubeId)) prog.done.push(naat.youtubeId);
  saveProgress(prog);

  if (generateOnly) {
    log(`\n✅ Generated (not uploaded): ${videoPath}`);
    return;
  }

  // 2. Upload via Playwright
  log("\n🌐 Launching browser...");
  const context = await chromium.launchPersistentContext(CONFIG.profileDir, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await ensureLogin(page);
    await uploadReel(page, videoPath, caption);
  } catch (err) {
    await screenshot(page, "error.png").catch(() => {});
    throw err;
  } finally {
    await sleep(rand(1500, 2500));
    await context.close();
  }

  // 3. Mark as uploaded
  const p2 = loadProgress();
  if (!p2.uploaded.includes(naat.youtubeId)) p2.uploaded.push(naat.youtubeId);
  saveProgress(p2);

  log(`\n✅ Done! ${naat.youtubeId} uploaded.`);
}

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});