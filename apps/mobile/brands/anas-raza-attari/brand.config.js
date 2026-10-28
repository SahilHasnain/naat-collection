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
    name: "Anas Raza Attari",
    slug: "anas-raza-attari",
    scheme: "anasrazaattari",
    packageId: "com.anasrazaattari", // production package
    packageIdDev: "com.anasrazaattari.dev",
    packageIdPreview: "com.anasrazaattari.preview",
    versionCode: 9,
    // Deep-link host for universal links (used in intent filters + associatedDomains)
    applinksHost: "anasrazaattari.expo.app",
  },

  privacy: {
    policyUrl: "https://sahilhasnain.github.io/naat-collection/privacy/anas-raza-attari/",
    contactEmail: "mdsahil1631@gmail.com",
  },

  // ── Appwrite project ──────────────────────────────────────────────────────
  appwrite: {
    endpoint: "https://sgp.cloud.appwrite.io/v1",
    projectId: "69907afc003b9e3d9152",
    databaseId: "main-db",
    naatsCollectionId: "naats",
    channelsCollectionId: "channels",
    audioCacheCollectionId: "audio-cache",
    liveRadioCollectionId: "live_radio",
    semanticSearchFunctionUrl: "https://69a8e9000021d2eaafd9.sgp.appwrite.run",
  },

  auth: {
    googleWebClientId: "54913434337-226cbfet04pjn52fbgqulf6s83c2pggt.apps.googleusercontent.com",
  },

  // ── Static export fallback (raw GitHub / jsDelivr) ────────────────────────
  static: {
    // Used when Appwrite reads are rate-limited or unavailable.
    naatsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/anas-raza-attari/naats-export.json",
    channelsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/anas-raza-attari/channels-export.json",
    // In-app announcement banner source (served from this repo's static-exports).
    appMessageUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/anas-raza-attari/app-message.json",
  },

  // ── Sentry ────────────────────────────────────────────────────────────────
  sentry: {
    enabled: false, // set false to disable the Sentry plugin (e.g. some family apps)
    org: "sahil-hasnain",
    project: "ubaid-raza-naats",
    dsn: "",
  },

  features: {
    useSemanticSearch: false,
    disableSearchSuggestions: true,
  },

  // ── EAS ───────────────────────────────────────────────────────────────────
  eas: {
    projectId: "34c43ca5-f0b1-43dc-9d29-b8c3fc054151",
  },
};
