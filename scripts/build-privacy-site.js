#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { getProject, projectIds } = require("../apps/mobile/brands");

const repoRoot = path.resolve(__dirname, "..");
const templatePath = path.join(repoRoot, "docs", "privacy-policy.template.html");
const outputRoot = path.join(repoRoot, "privacy-site");
const legacyProjectId = "naat-collection";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPolicy(template, projectId) {
  const brand = getProject(projectId);
  const name = brand.app?.name;
  const contactEmail = brand.privacy?.contactEmail;
  const policyUrl = brand.privacy?.policyUrl;

  if (!name || !contactEmail || !policyUrl) {
    throw new Error(`Brand "${projectId}" must define app.name and privacy contactEmail/policyUrl.`);
  }
  if (!/^[a-z0-9-]+$/.test(projectId)) {
    throw new Error(`Brand ID "${projectId}" is not safe to use as a URL path.`);
  }
  let parsedPolicyUrl;
  try {
    parsedPolicyUrl = new URL(policyUrl);
  } catch {
    throw new Error(`Brand "${projectId}" has an invalid privacy policy URL.`);
  }
  if (parsedPolicyUrl.protocol !== "https:") {
    throw new Error(`Brand "${projectId}" privacy policy URL must use HTTPS.`);
  }
  if (!parsedPolicyUrl.pathname.endsWith(`/privacy/${projectId}/`)) {
    throw new Error(`Brand "${projectId}" policy URL must end with /privacy/${projectId}/.`);
  }

  return template
    .replaceAll("{{APP_NAME}}", escapeHtml(name))
    .replaceAll("{{CONTACT_EMAIL}}", escapeHtml(contactEmail))
    .replaceAll("{{POLICY_URL}}", escapeHtml(policyUrl));
}

function renderIndex(projects) {
  const links = projects
    .map(
      ({ id, name }) =>
        `      <li><a href="./privacy/${encodeURIComponent(id)}/">${escapeHtml(name)}</a></li>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privacy Policies</title>
</head>
<body>
  <main>
    <h1>Privacy Policies</h1>
    <ul>
${links}
    </ul>
  </main>
</body>
</html>
`;
}

function renderLegacyAlias(policyUrl) {
  const relativeUrl = `privacy/${legacyProjectId}/`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="${escapeHtml(policyUrl)}">
  <meta http-equiv="refresh" content="0; url=${relativeUrl}">
  <title>Privacy Policy — Owais Raza Qadri</title>
</head>
<body>
  <p>This privacy policy has moved. <a href="${relativeUrl}">Continue to the Owais Raza Qadri privacy policy</a>.</p>
</body>
</html>
`;
}

function main() {
  const template = fs.readFileSync(templatePath, "utf8");
  const projects = projectIds
    .map((id) => ({ id, brand: getProject(id) }))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (!projectIds.includes(legacyProjectId)) {
    throw new Error(`Legacy policy project "${legacyProjectId}" is not registered.`);
  }

  fs.mkdirSync(outputRoot, { recursive: true });
  const indexProjects = [];
  for (const { id, brand } of projects) {
    const policy = renderPolicy(template, id);
    const projectOutput = path.join(outputRoot, "privacy", id);
    fs.mkdirSync(projectOutput, { recursive: true });
    fs.writeFileSync(path.join(projectOutput, "index.html"), policy);
    indexProjects.push({ id, name: brand.app.name });
    console.log(`Built ${brand.privacy.policyUrl}`);
  }

  const legacyBrand = getProject(legacyProjectId);
  fs.writeFileSync(path.join(outputRoot, "index.html"), renderIndex(indexProjects));
  fs.writeFileSync(
    path.join(outputRoot, "privacy-policy.html"),
    renderLegacyAlias(legacyBrand.privacy.policyUrl),
  );
  console.log(`Built legacy alias: ${path.join(outputRoot, "privacy-policy.html")}`);
}

try {
  main();
} catch (error) {
  console.error(`Privacy site build failed: ${error.message}`);
  process.exit(1);
}
