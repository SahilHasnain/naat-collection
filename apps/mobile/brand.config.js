// Backwards-compatible path for repository scripts that still read the old
// single-brand location. App runtime selection uses config/brand.ts instead.
const { getProject } = require("./brands");
module.exports = getProject(process.env.APP_PROJECT_ID || "naat-collection");
