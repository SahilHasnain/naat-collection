const { spawnSync } = require("node:child_process");
const { projectIds } = require("../brands");

const [command, projectId, ...args] = process.argv.slice(2);

if (!projectIds.includes(projectId)) {
  console.error(`Usage: node scripts/project.js <config|build> <project-id> [options]`);
  console.error(`Projects: ${projectIds.join(", ")}`);
  process.exit(2);
}

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const runner =
  command === "start"
    ? ["expo", "start", ...args]
    : command === "config"
    ? ["expo", "config", "--json", ...args]
    : command === "build"
      ? ["eas", "build", ...args]
      : null;

if (!runner) {
  console.error("Command must be 'start', 'config', or 'build'.");
  process.exit(2);
}

if (command === "build") {
  const project = require("../brands").getProject(projectId);
  if (!project.eas?.projectId) {
    console.error(
      `Project "${projectId}" has no EAS project ID. Set brands/${projectId}/brand.config.js eas.projectId before building.`,
    );
    process.exit(2);
  }
}

const result = spawnSync(executable, runner, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, APP_PROJECT_ID: projectId },
});
process.exit(result.status ?? 1);
