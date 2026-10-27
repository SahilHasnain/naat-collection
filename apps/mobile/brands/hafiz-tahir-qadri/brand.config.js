/**
 * Brand configuration for Hafiz Tahir Qadri.
 * Artwork is temporarily copied from naat-production; replace it with the
 * brand's approved artwork before publishing.
 */

module.exports = {
  app: {
    name: "Hafiz Tahir Qadri",
    slug: "hafiz-tahir-qadri",
    scheme: "hafiztahirqadri",
    packageId: "com.hafiztahirqadri",
    packageIdDev: "com.hafiztahirqadri.dev",
    packageIdPreview: "com.hafiztahirqadri.preview",
    versionCode: 1,
    applinksHost: "hafiztahirqadri.appwrite.network",
  },

  privacy: {
    policyUrl: "https://sahilhasnain.github.io/naat-collection/privacy/hafiz-tahir-qadri/",
    contactEmail: "mdsahil1631@gmail.com",
  },

  appwrite: {
    endpoint: "https://sgp.cloud.appwrite.io/v1",
    projectId: "69c60b0e001c5ec5e031",
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

  static: {
    naatsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/hafiz-tahir-qadri/naats-export.json",
    channelsUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/hafiz-tahir-qadri/channels-export.json",
    appMessageUrl: "https://raw.githubusercontent.com/sahilhasnain/naat-collection/main/static-exports/hafiz-tahir-qadri/app-message.json",
  },

  sentry: {
    enabled: false,
    org: "sahil-hasnain",
    project: "hafiz-tahir-qadri",
    dsn: "",
  },

  features: {
    useSemanticSearch: false,
    disableSearchSuggestions: true,
  },

  eas: {
    projectId: "",
  },
};
