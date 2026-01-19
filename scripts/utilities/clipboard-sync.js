/**
 * Clipboard Sync Script - Laptop <-> Termux (Android)
 *
 * This script syncs clipboard content between your laptop and Android phone via ADB.
 *
 * Prerequisites:
 *   - ADB installed on laptop (Android Debug Bridge)
 *   - USB debugging enabled on phone OR WiFi ADB connection
 *   - Termux installed on phone with termux-api package
 *
 * Termux Setup:
 *   pkg install termux-api
 *   (Also install Termux:API app from F-Droid or Play Store)
 *
 * Laptop Setup (Windows):
 *   scoop install adb
 *   OR download from: https://developer.android.com/tools/releases/platform-tools
 *
 * Usage:
 *   node scripts/utilities/clipboard-sync.js push    # Laptop -> Phone
 *   node scripts/utilities/clipboard-sync.js pull    # Phone -> Laptop
 *   node scripts/utilities/clipboard-sync.js watch   # Auto-sync both ways (every 2s)
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const clipboardy = require("clipboardy");

const execAsync = promisify(exec);

// Configuration
const SYNC_INTERVAL = 2000; // 2 seconds for watch mode
let lastClipboardContent = "";
let isWatching = false;

/**
 * Check if ADB is available
 */
async function checkAdb() {
  try {
    await execAsync("adb version");
    return true;
  } catch {
    console.error("❌ ADB not found!");
    console.log("\nInstall ADB:");
    console.log("  Windows: scoop install adb");
    console.log(
      "  Or download: https://developer.android.com/tools/releases/platform-tools\n"
    );
    return false;
  }
}

/**
 * Check if device is connected
 */
async function checkDevice() {
  try {
    const { stdout } = await execAsync("adb devices");
    const lines = stdout.split("\n").filter((line) => line.includes("\t"));

    if (lines.length === 0) {
      console.error("❌ No device connected!");
      console.log("\nConnect your device:");
      console.log("  1. Enable USB debugging on phone");
      console.log("  2. Connect via USB");
      console.log("  3. Accept debugging prompt on phone");
      console.log("\nOr use WiFi ADB:");
      console.log("  1. Connect phone and laptop to same WiFi");
      console.log("  2. Run on phone: adb tcpip 5555");
      console.log("  3. Run on laptop: adb connect <phone-ip>:5555\n");
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to check devices:", error.message);
    return false;
  }
}

/**
 * Get clipboard content from phone via Termux
 */
async function getPhoneClipboard() {
  try {
    // Run termux-clipboard-get through am (Activity Manager) to execute in Termux context
    const { stdout } = await execAsync(
      'adb shell "am broadcast --user 0 -a com.termux.RUN_COMMAND --es command termux-clipboard-get 2>/dev/null || termux-clipboard-get 2>/dev/null"'
    );
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get phone clipboard: ${error.message}`);
  }
}

/**
 * Set clipboard content on phone via Termux
 */
async function setPhoneClipboard(content) {
  try {
    // Escape content for shell
    const escaped = content
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");
    // Use am broadcast to run in Termux context
    await execAsync(
      `adb shell "am broadcast --user 0 -a com.termux.RUN_COMMAND --es command 'echo \\"${escaped}\\" | termux-clipboard-set' 2>/dev/null || echo \\"${escaped}\\" | termux-clipboard-set 2>/dev/null"`
    );
  } catch (error) {
    throw new Error(`Failed to set phone clipboard: ${error.message}`);
  }
}

/**
 * Push clipboard from laptop to phone
 */
async function pushClipboard() {
  try {
    const laptopClipboard = await clipboardy.read();

    if (!laptopClipboard) {
      console.log("📋 Laptop clipboard is empty");
      return;
    }

    await setPhoneClipboard(laptopClipboard);
    console.log(
      "✅ Pushed to phone:",
      laptopClipboard.substring(0, 50) +
        (laptopClipboard.length > 50 ? "..." : "")
    );
  } catch (error) {
    console.error("❌ Push failed:", error.message);
  }
}

/**
 * Pull clipboard from phone to laptop
 */
async function pullClipboard() {
  try {
    const phoneClipboard = await getPhoneClipboard();

    if (!phoneClipboard) {
      console.log("📋 Phone clipboard is empty");
      return;
    }

    await clipboardy.write(phoneClipboard);
    console.log(
      "✅ Pulled from phone:",
      phoneClipboard.substring(0, 50) +
        (phoneClipboard.length > 50 ? "..." : "")
    );
  } catch (error) {
    console.error("❌ Pull failed:", error.message);
  }
}

/**
 * Watch mode - bidirectional sync
 */
async function watchClipboard() {
  console.log("👀 Watching clipboard... (Press Ctrl+C to stop)\n");
  isWatching = true;

  while (isWatching) {
    try {
      // Get both clipboards
      const laptopClipboard = await clipboardy.read();
      const phoneClipboard = await getPhoneClipboard();

      // If laptop clipboard changed, push to phone
      if (
        laptopClipboard &&
        laptopClipboard !== lastClipboardContent &&
        laptopClipboard !== phoneClipboard
      ) {
        await setPhoneClipboard(laptopClipboard);
        console.log(
          "📤 Laptop → Phone:",
          laptopClipboard.substring(0, 50) +
            (laptopClipboard.length > 50 ? "..." : "")
        );
        lastClipboardContent = laptopClipboard;
      }
      // If phone clipboard changed, pull to laptop
      else if (
        phoneClipboard &&
        phoneClipboard !== lastClipboardContent &&
        phoneClipboard !== laptopClipboard
      ) {
        await clipboardy.write(phoneClipboard);
        console.log(
          "📥 Phone → Laptop:",
          phoneClipboard.substring(0, 50) +
            (phoneClipboard.length > 50 ? "..." : "")
        );
        lastClipboardContent = phoneClipboard;
      }
    } catch (error) {
      console.error("⚠️  Sync error:", error.message);
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL));
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];

  console.log("📋 Clipboard Sync Tool\n");

  // Check prerequisites
  if (!(await checkAdb())) return;
  if (!(await checkDevice())) return;

  // Execute command
  switch (command) {
    case "push":
      await pushClipboard();
      break;

    case "pull":
      await pullClipboard();
      break;

    case "watch":
      // Handle Ctrl+C gracefully
      process.on("SIGINT", () => {
        console.log("\n\n👋 Stopping clipboard sync...");
        isWatching = false;
        process.exit(0);
      });

      await watchClipboard();
      break;

    default:
      console.log("Usage:");
      console.log(
        "  node scripts/utilities/clipboard-sync.js push    # Laptop → Phone"
      );
      console.log(
        "  node scripts/utilities/clipboard-sync.js pull    # Phone → Laptop"
      );
      console.log(
        "  node scripts/utilities/clipboard-sync.js watch   # Auto-sync both ways\n"
      );
      process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
