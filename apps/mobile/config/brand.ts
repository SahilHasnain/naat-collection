import Constants from "expo-constants";

type BrandConfig = {
  app: { name: string; packageId: string };
  appwrite: {
    endpoint: string;
    projectId: string;
    databaseId: string;
    naatsCollectionId: string;
    channelsCollectionId: string;
    audioCacheCollectionId: string;
    semanticSearchFunctionUrl: string;
  };
  auth: { googleWebClientId: string };
  static: { naatsUrl: string; channelsUrl: string; appMessageUrl: string };
  sentry: { dsn?: string };
  features: { useSemanticSearch: boolean; disableSearchSuggestions: boolean };
};

export const PROJECT_ID = Constants.expoConfig?.extra?.projectId as string | undefined;
const configuredBrand = Constants.expoConfig?.extra?.brand as BrandConfig | undefined;

if (!configuredBrand) {
  throw new Error(
    `No brand config was embedded in the Expo manifest for project "${PROJECT_ID ?? "unknown"}"`,
  );
}

const brand: BrandConfig = configuredBrand;
export default brand;
export const APP_NAME: string = brand.app.name;
export const GOOGLE_WEB_CLIENT_ID: string = brand.auth.googleWebClientId;
export const NATIVE_APP_URL = `https://play.google.com/store/apps/details?id=${brand.app.packageId}`;
export const APP_MESSAGE_URL: string = brand.static.appMessageUrl;
