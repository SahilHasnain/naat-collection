/**
 * Clipboard Sync using Termux (REQUIRED for phone → laptop)
 *
 * This is the ONLY reliable way to read Android clipboard.
 *
 * Setup on phone:
 *   1. Install Termux from F-Droid
 *   2. Run: pkg install termux-api
 *   3. Install Termux:API app from F-Droid
 *
 * Usage:
 *   npm run clipboard:push
 *   npm run clipboard:pull
 *   npm run clipboard:watch
 */

const { exec, execSync } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

function readLaptopClipboard() {
  try {
    return execSync('powershell -command "Get-Clipboard"', {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function writeLaptopClipboard(text) {
  try {
    execSync(
      `powershell -command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`
    );
  } catch (error) {
    throw new Error(`Failed: ${error.message}`);
  }
}

async function getPhoneClipboard() {
  try {
    // Use Termux API
    const { stdout } = await execAsync(
      'adb shell "su -c /data/data/com.termux/files/usr/bin/termux-clipboard-get 2>/dev/null || /data/data/com.termux/files/usr/bin/termux-clipboard-get 2>/dev/null"'
    );
    return stdout.trim();
  } catch (error) {
    throw new Error(
      `Failed to get phone clipboard. Make sure Termux API is installed: ${error.message}`
    );
  }
}

async function setPhoneClipboard(text) {
  try {
    // Escape for shell
    const escaped = text
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$");

    // Use Termux API
    await execAsync(
      `adb shell "echo '${escaped}' | /data/data/com.termux/files/usr/bin/termux-clipboard-set 2>/dev/null"`
    );
  } catch (error) {
    throw new Error(`Failed: ${error.message}`);
  }
}

async function push() {
  const text = readLaptopClipboard();
  if (!text) {
    console.log("📋 Laptop clipboard is empty");
    return;
  }
  await setPhoneClipboard(text);
  console.log(
    "✅ Pushed:",
    text.substring(0, 50) + (text.length > 50 ? "..." : "")
  );
}

async function pull() {
  const text = await getPhoneClipboard();
  if (!text) {
    console.log("📋 Phone clipboard is empty");
    return;
  }
  writeLaptopClipboard(text);
  console.log(
    "✅ Pulled:",
    text.substring(0, 50) + (text.length > 50 ? "..." : "")
  );
}

async function watch() {
  console.log("👀 Watching... (Ctrl+C to stop)\n");
  let last = "";

  setInterval(async () => {
    try {
      const laptop = readLaptopClipboard();
      const phone = await getPhoneClipboard();

      if (laptop && laptop !== last && laptop !== phone) {
        await setPhoneClipboard(laptop);
        console.log("📤 Laptop → Phone:", laptop.substring(0, 40));
        last = laptop;
      } else if (phone && phone !== last && phone !== laptop) {
        writeLaptopClipboard(phone);
        console.log("📥 Phone → Laptop:", phone.substring(0, 40));
        last = phone;
      }
    } catch (err) {
      console.error("⚠️ ", err.message);
    }
  }, 2000);
}

async function checkSetup() {
  console.log("🔍 Checking Termux API setup...\n");

  // Check ADB
  try {
    await execAsync("adb version");
    console.log("✅ ADB is installed");
  } catch {
    console.error("❌ ADB not found!");
    return false;
  }

  // Check device
  const { stdout } = await execAsync("adb devices");
  if (!stdout.includes("\tdevice")) {
    console.error("❌ No device connected!");
    return false;
  }
  console.log("✅ Device connected");

  // Check Termux API
  try {
    const { stdout: termuxCheck } = await execAsync(
      'adb shell "ls /data/data/com.termux/files/usr/bin/termux-clipboard-get 2>/dev/null"'
    );
    if (termuxCheck.includes("termux-clipboard-get")) {
      console.log("✅ Termux API is installed\n");
      return true;
    }
  } catch {}

  console.error("❌ Termux API not found!\n");
  console.log("Setup instructions:");
  console.log("  1. Install Termux from F-Droid (not Play Store!)");
  console.log("  2. Open Termux and run: pkg install termux-api");
  console.log("  3. Install Termux:API app from F-Droid");
  console.log("  4. Run this script again\n");
  return false;
}

async function main() {
  const cmd = process.argv[2];

  if (cmd === "check") {
    await checkSetup();
    return;
  }

  console.log("📋 Clipboard Sync (Termux)\n");

  if (!(await checkSetup())) {
    return;
  }

  if (cmd === "push") await push();
  else if (cmd === "pull") await pull();
  else if (cmd === "watch") await watch();
  else {
    console.log("Usage:");
    console.log("  node scripts/utilities/clipboard-sync-termux.js check");
    console.log("  node scripts/utilities/clipboard-sync-termux.js push");
    console.log("  node scripts/utilities/clipboard-sync-termux.js pull");
    console.log("  node scripts/utilities/clipboard-sync-termux.js watch");
  }
}

main().catch(console.error);
