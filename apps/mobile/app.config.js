const fs = require("node:fs");
const path = require("node:path");
const projectId = process.env.APP_PROJECT_ID || "naat-collection";
const { getProject, projectIds } = require("./brands");
const brand = getProject(projectId);
const assetRoot = `./brands/${projectId}/assets`;
const projectAsset = (path) =>
  path?.startsWith("./assets/") ? `${assetRoot}/${path.slice("./assets/".length)}` : path;
const assertAsset = (assetPath, label) => {
  if (!assetPath || !fs.existsSync(path.join(__dirname, assetPath))) {
    throw new Error(
      `Project "${projectId}" is missing ${label} asset: ${assetPath || "<unset>"}`,
    );
  }
  return assetPath;
};
const appIcon = assertAsset(
  `${assetRoot}/images/android-icon-foreground.png`,
  "app icon",
);
const splashIcon = assertAsset(`${assetRoot}/images/splash-icon.png`, "splash");
const adaptiveIcon = projectAsset(
  brand.app.adaptiveIconForegroundImage || appIcon,
);
assertAsset(adaptiveIcon, "adaptive icon");
if (!brand.app.packageId || !brand.app.slug || !brand.app.scheme) {
  throw new Error(`Project "${projectId}" is missing app identity configuration`);
}
if (!brand.appwrite?.endpoint || !brand.appwrite?.projectId || !brand.appwrite?.databaseId) {
  throw new Error(`Project "${projectId}" is missing required Appwrite configuration`);
}
if (!brand.static?.naatsUrl || !brand.static?.channelsUrl || !brand.static?.appMessageUrl) {
  throw new Error(`Project "${projectId}" is missing project-specific static export URLs`);
}
if (!Number.isInteger(brand.app.versionCode) || brand.app.versionCode < 1) {
  throw new Error(`Project "${projectId}" must define a positive Android versionCode`);
}
const faviconPath = `${assetRoot}/images/favicon.png`;
const favicon = fs.existsSync(path.join(__dirname, faviconPath))
  ? faviconPath
  : appIcon;
const notificationIcon = brand.app.notificationIcon
  ? assertAsset(`${assetRoot}/${brand.app.notificationIcon}`, "notification")
  : fs.existsSync(path.join(__dirname, `${assetRoot}/images/status_bar_icon.png`))
    ? `${assetRoot}/images/status_bar_icon.png`
    : undefined;

const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return brand.app.packageIdDev;
  }
  if (IS_PREVIEW) {
    return brand.app.packageIdPreview;
  }
  return brand.app.packageId;
};

const getAppName = () => {
  if (IS_DEV) {
    return `${brand.app.name} (Dev)`;
  }
  if (IS_PREVIEW) {
    return `${brand.app.name} (Preview)`;
  }
  return brand.app.name;
};

export default {
  expo: {
    name: getAppName(),
    slug: brand.app.slug,
    version: "1.0.0",
    orientation: "portrait",
    icon: appIcon,
    scheme: brand.app.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      infoPlist: {
        UIBackgroundModes: ["audio"],
      },
      associatedDomains: [`applinks:${brand.app.applinksHost}`],
    },
    android: {
      versionCode: brand.app.versionCode,
      adaptiveIcon: {
        foregroundImage: projectAsset(
          brand.app.adaptiveIconForegroundImage ||
            `${assetRoot}/images/android-icon-foreground.png`,
        ),
        ...(brand.app.adaptiveIconBackgroundColor
          ? { backgroundColor: brand.app.adaptiveIconBackgroundColor }
          : {}),
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
      notification: {
        ...(notificationIcon ? { icon: notificationIcon } : {}),
        color: "#000000",
      },
      permissions: [
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "WAKE_LOCK",
        "android.permission.WAKE_LOCK",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: brand.app.scheme,
              host: "*",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: brand.app.applinksHost,
              pathPrefix: "/naat",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon,
    },
    plugins: [
      "expo-router",
      "@react-native-google-signin/google-signin",
      [
        "expo-splash-screen",
        {
          image: splashIcon,
          resizeMode: "cover",
          backgroundColor: "#000000",
        }
      ],
      ...(brand.sentry.enabled
        ? [
            [
              "@sentry/react-native",
              {
                organization: brand.sentry.org,
                project: brand.sentry.project,
              },
            ],
          ]
        : []),
      [
        "expo-speech-recognition",
        {
          microphonePermission:
            "Allow $(PRODUCT_NAME) to use the microphone for voice search.",
          speechRecognitionPermission:
            "Allow $(PRODUCT_NAME) to recognize speech for voice search.",
          androidSpeechServicePackages: [
            "com.google.android.googlequicksearchbox",
          ],
        },
      ],
      ...(brand.app.preserveAndroidLauncherIcons
        ? ["./plugins/withAndroidLauncherIcons.js"]
        : []),
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      projectId,
      projectIds,
      brand,
      privacyPolicyUrl: brand.privacy?.policyUrl,
      eas: {
        projectId: brand.eas.projectId,
      },
    },
  },
};
