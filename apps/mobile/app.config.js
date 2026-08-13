const brand = require("./brand.config.js");

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
    icon: "./assets/images/android-icon-foreground.png",
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
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#000000",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
      notification: {
        icon: "./assets/images/status_bar_icon.png",
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
      output: "static",
      favicon: "./assets/images/favicon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
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
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: brand.eas.projectId,
      },
    },
  },
};
