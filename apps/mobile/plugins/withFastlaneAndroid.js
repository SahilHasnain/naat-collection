const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");
const dotenv = require("dotenv");

const REQUIRED_FASTLANE_FILES = ["Fastfile", "Appfile"];
const OPTIONAL_FASTLANE_FILES = ["README.md", "Pluginfile"];

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileIfExists(sourcePath, destinationPath) {
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destinationPath);
    }
}

function copyDirectoryContents(sourceDir, destinationDir) {
    if (!fs.existsSync(sourceDir)) {
        return;
    }

    ensureDir(destinationDir);

    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destinationPath = path.join(destinationDir, entry.name);

        if (entry.isDirectory()) {
            copyDirectoryContents(sourcePath, destinationPath);
        } else {
            fs.copyFileSync(sourcePath, destinationPath);
        }
    }
}

function loadProjectEnv(projectRoot) {
    const env = {};
    const envFiles = [
        path.join(projectRoot, ".env.local"),
        path.join(projectRoot, ".env"),
    ];

    for (const envFile of envFiles) {
        if (!fs.existsSync(envFile)) {
            continue;
        }

        const parsed = dotenv.parse(fs.readFileSync(envFile, "utf8"));
        for (const [key, value] of Object.entries(parsed)) {
            if (env[key] === undefined) {
                env[key] = value;
            }
        }
    }

    return env;
}

function writeFastlaneEnvLocal(targetDir, projectEnv) {
    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || projectEnv.SENTRY_AUTH_TOKEN;
    const sentryOrg = process.env.SENTRY_ORG || projectEnv.SENTRY_ORG || "sahil-hasnain";
    const sentryProject = process.env.SENTRY_PROJECT || projectEnv.SENTRY_PROJECT || "ubaid-raza-naats";

    if (!sentryAuthToken) {
        return;
    }

    const content = [
        `SENTRY_AUTH_TOKEN=${sentryAuthToken}`,
        `SENTRY_ORG=${sentryOrg}`,
        `SENTRY_PROJECT=${sentryProject}`,
        "",
    ].join("\n");

    fs.writeFileSync(path.join(targetDir, ".env.local"), content, "utf8");
}

module.exports = function withFastlaneAndroid(config) {
    return withDangerousMod(config, ["android", async (configWithMod) => {
        const projectRoot = configWithMod.modRequest.projectRoot;
        const androidRoot = configWithMod.modRequest.platformProjectRoot;

        const fastlaneTemplateDir = path.join(projectRoot, "fastlane");
        const androidFastlaneDir = path.join(androidRoot, "fastlane");

        if (fs.existsSync(androidFastlaneDir)) {
            fs.rmSync(androidFastlaneDir, { recursive: true, force: true });
        }

        ensureDir(androidFastlaneDir);

        for (const fileName of REQUIRED_FASTLANE_FILES) {
            const sourcePath = path.join(fastlaneTemplateDir, fileName);
            if (!fs.existsSync(sourcePath)) {
                throw new Error(
                    `Missing ${fileName} in ${fastlaneTemplateDir}. Keep fastlane templates in apps/mobile/fastlane.`
                );
            }
            fs.copyFileSync(sourcePath, path.join(androidFastlaneDir, fileName));
        }

        for (const fileName of OPTIONAL_FASTLANE_FILES) {
            copyFileIfExists(
                path.join(fastlaneTemplateDir, fileName),
                path.join(androidFastlaneDir, fileName)
            );
        }

        copyDirectoryContents(
            path.join(fastlaneTemplateDir, "metadata"),
            path.join(androidFastlaneDir, "metadata")
        );

        const env = loadProjectEnv(projectRoot);
        writeFastlaneEnvLocal(androidFastlaneDir, env);

        return configWithMod;
    }]);
};
