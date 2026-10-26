const fs = require("node:fs");
const path = require("node:path");

const projects = Object.fromEntries(
  fs
    .readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => fs.existsSync(path.join(__dirname, entry.name, "brand.config.js")))
    .map((entry) => [
      entry.name,
      require(path.join(__dirname, entry.name, "brand.config.js")),
    ]),
);

function getProject(projectId) {
  const id = projectId || "naat-collection";
  const project = projects[id];
  if (!project) {
    throw new Error(
      `Unknown APP_PROJECT_ID "${id}". Available projects: ${Object.keys(projects).join(", ")}`,
    );
  }
  return project;
}

module.exports = { getProject, projectIds: Object.keys(projects) };
