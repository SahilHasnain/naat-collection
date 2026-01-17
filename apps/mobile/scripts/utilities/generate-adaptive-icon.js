const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function generateAdaptiveIcon() {
  const inputIcon = "./assets/images/icon.jpg";
  const outputDir = "./assets/images";

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("🎨 Generating adaptive icon assets from icon.jpg...\n");

  try {
    // 1. Create foreground image (PNG with transparency)
    // Resize to 1024x1024 and add padding for safe zone
    console.log("📱 Creating foreground image...");
    await sharp(inputIcon)
      .resize(1024, 1024, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(path.join(outputDir, "android-icon-foreground.png"));
    console.log("✅ Foreground image created: android-icon-foreground.png");

    // 2. Create background image (solid color or blurred version)
    console.log("📱 Creating background image...");
    await sharp(inputIcon)
      .resize(1024, 1024, { fit: "cover" })
      .blur(20) // Blur for a nice background effect
      .png()
      .toFile(path.join(outputDir, "android-icon-background.png"));
    console.log("✅ Background image created: android-icon-background.png");

    // Monochrome image skipped (optional for Android 13+ themed icons)

    console.log("\n🎉 Adaptive icon assets generated successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Check the generated images in assets/images/");
    console.log("2. Update your app.json with the adaptive icon configuration");
    console.log("3. Rebuild your app to see the new icons");
  } catch (error) {
    console.error("❌ Error generating adaptive icons:", error.message);
    process.exit(1);
  }
}

generateAdaptiveIcon();
