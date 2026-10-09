const fs = require("node:fs/promises");
const path = require("node:path");
const { withDangerousMod } = require("expo/config-plugins");

const DENSITIES = ["ldpi", "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
const PRESERVED_FILES = ["ic_launcher.png", "ic_launcher_round.png"];
const GENERATED_FILES_TO_REPLACE = ["ic_launcher.webp", "ic_launcher_round.webp"];

module.exports = function withAndroidLauncherIcons(config) {
  return withDangerousMod(config, ["android", async (modConfig) => {
    const sourceRoot = path.join(
      modConfig.modRequest.projectRoot,
      "assets/android-launcher-icons/android",
    );
    const resourceRoot = path.join(
      modConfig.modRequest.platformProjectRoot,
      "app/src/main/res",
    );

    for (const density of DENSITIES) {
      const sourceDirectory = path.join(sourceRoot, `mipmap-${density}`);
      const outputDirectory = path.join(resourceRoot, `mipmap-${density}`);
      await fs.mkdir(outputDirectory, { recursive: true });

      for (const fileName of GENERATED_FILES_TO_REPLACE) {
        await fs.rm(path.join(outputDirectory, fileName), { force: true });
      }
      // Adaptive foreground is generated from the app config's high-resolution
      // foreground image. Remove the smaller density-specific archive copy.
      await fs.rm(path.join(outputDirectory, "ic_launcher_foreground.png"), { force: true });

      for (const fileName of PRESERVED_FILES) {
        await fs.copyFile(
          path.join(sourceDirectory, fileName),
          path.join(outputDirectory, fileName),
        );
      }
    }

    return modConfig;
  }]);
};
