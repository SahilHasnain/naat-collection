/**
 * Simple Clipboard Sync - No Termux Required!
 * Uses Android's native clipboard via ADB
 */

const { exec, execSync } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

// Windows clipboard helpers
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
    throw new Error(`Failed to write clipboard: ${error.message}`);
  }
}

async function getPhoneClipboard() {
  try {
    // Method 1: Try Termux API (if installed)
    try {
      const { stdout: termuxClip } = await execAsync(
        'adb shell "run-as com.termux /data/data/com.termux/files/usr/bin/termux-clipboard-get 2>/dev/null"'
      );
      if (termuxClip && termuxClip.trim()) {
        return termuxClip.trim();
      }
    } catch {}

    // Method 2: Try dumpsys clipboard
    const { stdout } = await execAsync('adb shell "dumpsys clipboard"');

    // Parse different clipboard formats
    // Look for "text=" pattern
    let match = stdout.match(/text=([^\n]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Look for ClipData pattern
    match = stdout.match(/ClipData.*?text="([^"]+)"/);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Look for mText pattern
    match = stdout.match(/mText=([^\n]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }

    return "";
  } catch {
    return "";
  }
}

async function setPhoneClipboard(text) {
  try {
    const escaped = text.replace(/'/g, "'\\''").replace(/\n/g, " ");
    await execAsync(`adb shell "input text '${escaped}'"`);
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
  console.log("� WatchiLng... (Ctrl+C to stop)\n");
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

async function main() {
  const cmd = process.argv[2];

  try {
    await execAsync("adb version");
  } catch {
    console.error("❌ ADB not found!");
    return;
  }

  const { stdout } = await execAsync("adb devices");
  if (!stdout.includes("\tdevice")) {
    console.error("❌ No device connected!");
    return;
  }

  console.log("📋 Simple Clipboard Sync\n");

  if (cmd === "push") await push();
  else if (cmd === "pull") await pull();
  else if (cmd === "watch") await watch();
  else {
    console.log("Usage:");
    console.log("  node scripts/utilities/clipboard-sync-simple.js push");
    console.log("  node scripts/utilities/clipboard-sync-simple.js pull");
    console.log("  node scripts/utilities/clipboard-sync-simple.js watch");
  }
}

main().catch(console.error);
