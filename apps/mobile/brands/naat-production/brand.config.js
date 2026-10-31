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
    name: "Voice of IDS",
    slug: "naat-production-app",
    scheme: "naatproduction",
    packageId: "com.naatproduction", // production package
    packageIdDev: "com.naatproduction.dev",
    packageIdPreview: "com.naatproduction.preview",
    versionCode: 26,
    // Deep-link host for universal links (used in intent filters + associatedDomains)
    applinksHost: "naatproduction.appwrite.network",
  },

  privacy: {
    policyUrl: "https://sahilhasnain.github.io/naat-collection/privacy/naat-production/",
    contactEmail: "mdsahil1631@gmail.com",
  },

  // ── Appwrite project ──────────────────────────────────────────────────────
  appwrite: {
    endpoint: "https://sgp.cloud.appwrite.io/v1",
    projectId: "69cdf520001137b0e951",
    databaseId: "69cdf9f4000f8532e829",
    naatsCollectionId: "69cdf9f4003a2c23b94a",
    channelsCollectionId: "channels",
    audioCacheCollectionId: "695e43b700281bb0cc99",
    liveRadioCollectionId: "live_radio",
    semanticSearchFunctionUrl: "https://69a8e9000021d2eaafd9.sgp.appwrite.run",
  },

  auth: {
    googleWebClientId: "54913434337-226cbfet04pjn52fbgqulf6s83c2pggt.apps.googleusercontent.com",
  },

  // ── Static export fallback (raw GitHub / jsDelivr) ────────────────────────
  static: {
    // Used when Appwrite reads are rate-limited or unavailable.
    naatsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/naat-production/naats-export.json",
    channelsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/naat-production/channels-export.json",
    // In-app announcement banner source (served from this repo's static-exports).
    appMessageUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/naat-production/app-message.json",
  },

  // ── Sentry ────────────────────────────────────────────────────────────────
  sentry: {
    enabled: false, // Sentry is enabled only for naat-collection
    org: "sahil-hasnain",
    project: "naat-production",
    dsn: "",
  },

  features: {
    useSemanticSearch: false,
    disableSearchSuggestions: true,
    showPureFilter: true,
    showTeenageFilter: true,
    showVoiceTransform: true,
    showAudioFilter: true,
    showProfileTab: true,
  },

  // ── EAS ───────────────────────────────────────────────────────────────────
  eas: {
    projectId: "",
  },
};
