/**
 * Test Mobile Connection
 *
 * Quick diagnostic script to check if your phone is properly connected
 * and all tools are installed correctly.
 */

const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function checkCommand(command, name) {
  try {
    await execAsync(`${command} --version 2>nul || ${command} version 2>nul`);
    console.log(`✅ ${name} is installed`);
    return true;
  } catch {
    console.log(`❌ ${name} is NOT installed`);
    return false;
  }
}

async function checkAdbDevices() {
  try {
    const { stdout } = await execAsync("adb devices");
    const lines = stdout.split("\n").filter((line) => line.includes("\t"));

    if (lines.length === 0) {
      console.log("❌ No devices connected");
      return false;
    }

    console.log(`✅ ${lines.length} device(s) connected:`);
    lines.forEach((line) => {
      const [device, status] = line.split("\t");
      console.log(`   - ${device} (${status})`);
    });
    return true;
  } catch {
    return false;
  }
}

async function checkTermuxApi() {
  try {
    // Try to get clipboard content - if it works, Termux API is installed
    const { stdout, stderr } = await execAsync(
      'adb shell "am broadcast --user 0 -a com.termux.RUN_COMMAND --es command termux-clipboard-get 2>&1"'
    );

    // Check if command executed (even if clipboard is empty)
    if (!stderr || !stderr.includes("not found")) {
      console.log("✅ Termux API is installed on phone");
      return true;
    }
  } catch {
    // Ignore errors, will show message below
  }

  console.log("❌ Termux API is NOT installed on phone");
  console.log("   Install in Termux: pkg install termux-api");
  console.log("   Also install Termux:API app from store");
  return false;
}

async function testClipboard() {
  try {
    const testText = "Test from laptop - " + Date.now();
    await execAsync(
      `adb shell "am broadcast --user 0 -a com.termux.RUN_COMMAND --es command 'echo ${testText} | termux-clipboard-set' 2>/dev/null"`
    );
    const { stdout } = await execAsync(
      'adb shell "am broadcast --user 0 -a com.termux.RUN_COMMAND --es command termux-clipboard-get 2>/dev/null"'
    );

    if (stdout.includes(testText)) {
      console.log("✅ Clipboard sync is working!");
      return true;
    } else {
      console.log("⚠️  Clipboard sync may have issues");
      return false;
    }
  } catch (error) {
    console.log("❌ Clipboard test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("🔍 Mobile Connection Diagnostic\n");
  console.log("=".repeat(50));

  // Check tools
  console.log("\n📦 Checking installed tools...\n");
  const hasScrcpy = await checkCommand("scrcpy", "scrcpy");
  const hasAdb = await checkCommand("adb", "ADB");
  const hasNode = await checkCommand("node", "Node.js");

  if (!hasAdb) {
    console.log("\n💡 Install ADB: scoop install adb");
  }
  if (!hasScrcpy) {
    console.log("💡 Install scrcpy: scoop install scrcpy");
  }

  // Check device connection
  console.log("\n📱 Checking device connection...\n");
  const hasDevice = await checkAdbDevices();

  if (!hasDevice) {
    console.log("\n💡 Connect your phone:");
    console.log("   1. Enable USB debugging on phone");
    console.log("   2. Connect via USB cable");
    console.log("   3. Accept debugging prompt on phone");
    console.log("   4. Run this script again");
    console.log("\n=".repeat(50));
    return;
  }

  // Check Termux API
  console.log("\n🔧 Checking Termux setup...\n");
  const hasTermuxApi = await checkTermuxApi();

  if (!hasTermuxApi) {
    console.log("\n💡 Install Termux API:");
    console.log("   1. Install Termux from F-Droid or Play Store");
    console.log("   2. Open Termux and run: pkg install termux-api");
    console.log("   3. Install Termux:API app from same store");
    console.log("   4. Run this script again");
    console.log("\n=".repeat(50));
    return;
  }

  // Test clipboard
  console.log("\n📋 Testing clipboard sync...\n");
  await testClipboard();

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("\n✨ Setup Status:");
  console.log(`   Tools: ${hasScrcpy && hasAdb && hasNode ? "✅" : "⚠️"}`);
  console.log(`   Device: ${hasDevice ? "✅" : "❌"}`);
  console.log(`   Termux: ${hasTermuxApi ? "✅" : "❌"}`);

  if (hasScrcpy && hasAdb && hasDevice && hasTermuxApi) {
    console.log("\n🎉 Everything is ready!");
    console.log("\nYou can now use:");
    console.log("   npm run mobile:control     - Control phone");
    console.log("   npm run clipboard:watch    - Sync clipboard");
  } else {
    console.log("\n⚠️  Some setup steps are missing. See messages above.");
  }

  console.log("\n" + "=".repeat(50));
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
