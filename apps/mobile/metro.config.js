const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const fs = require("node:fs");
const path = require("node:path");

const projectId = process.env.APP_PROJECT_ID || "naat-collection";
const projectAssets = path.join(__dirname, "brands", projectId, "assets", "images");
const assetAliases = {
  "@brand-assets/logo": "android-icon-foreground.png",
  "@brand-assets/google": "google.png",
  "@brand-assets/headphone": "headphone-v1.png",
  "@brand-assets/gumbad": "gumbad.png",
};

if (!fs.existsSync(path.join(__dirname, "brands", projectId, "brand.config.js"))) {
  throw new Error(`Unknown APP_PROJECT_ID "${projectId}" while configuring Metro`);
}

for (const [alias, filename] of Object.entries(assetAliases)) {
  if (!fs.existsSync(path.join(projectAssets, filename))) {
    throw new Error(`Project "${projectId}" is missing required asset ${filename}`);
  }
}

const config = withNativeWind(getDefaultConfig(__dirname), { input: "./global.css" });
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const filename = assetAliases[moduleName];
  if (filename) {
    return context.resolveRequest(
      context,
      path.join(projectAssets, filename),
      platform,
    );
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
