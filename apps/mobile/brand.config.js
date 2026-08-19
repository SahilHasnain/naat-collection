/**
 * brand.config.js — the ONLY file that differs between family naat repos.
 *
 * Every value here is brand-specific (app identity, Appwrite project, Sentry,
 * EAS project, static export repo). All other source files must be identical
 * across the family and are kept in sync by scripts/sync-family.sh.
 *
 * Everything in this file is consumed by:
 *   - apps/mobile/app.config.js        (app name, slug, package, scheme)
 *   - apps/mobile/config/appwrite.ts   (Appwrite project + static fallback)
 */

module.exports = {
  // ── App identity ──────────────────────────────────────────────────────────
  app: {
    name: "Owais Raza Qadri",
    slug: "owais-raza-qadri",
    scheme: "ubaidraza",
    packageId: "com.owaisrazaqadri", // production package
    packageIdDev: "com.owaisrazaqadri.dev",
    packageIdPreview: "com.owaisrazaqadri.preview",
    versionCode: 26,
    // Deep-link host for universal links (used in intent filters + associatedDomains)
    applinksHost: "owaisrazaqadri.appwrite.network",
  },

  // ── Appwrite project ──────────────────────────────────────────────────────
  appwrite: {
    endpoint: "https://sgp.cloud.appwrite.io/v1",
    projectId: "695bb97700213f4ef5dd",
    databaseId: "695bba86001b50478ed4",
    naatsCollectionId: "695bc8e70038db72df5b",
    channelsCollectionId: "channels",
    audioCacheCollectionId: "695e43b700281bb0cc99",
    liveRadioCollectionId: "live_radio",
    semanticSearchFunctionUrl: "https://69a8e9000021d2eaafd9.sgp.appwrite.run",
  },

  // ── Static export fallback (raw GitHub / jsDelivr) ────────────────────────
  static: {
    // Used when Appwrite reads are rate-limited or unavailable.
    naatsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/naats-export.json",
    channelsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/channels-export.json",
    // In-app announcement banner source (served from this repo's static-exports).
    appMessageUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/app-message.json",
  },

  // ── Sentry ────────────────────────────────────────────────────────────────
  sentry: {
    enabled: true, // set false to disable the Sentry plugin (e.g. some family apps)
    org: "sahil-hasnain",
    project: "ubaid-raza-naats",
  },

  // ── EAS ───────────────────────────────────────────────────────────────────
  eas: {
    projectId: "f5025967-41a5-4d6d-b430-c89bada9c40b",
  },
};
