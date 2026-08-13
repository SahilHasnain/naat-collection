/**
 * Brand helpers — exposes values from brand.config.js (the only per-repo file)
 * to the shared app UI.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const brand = require("../brand.config.js");

/** Human-readable app name shown in the header / sidebar. */
export const APP_NAME: string = brand.app.name;
