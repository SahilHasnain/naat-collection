const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return "com.owaisrazaqadri.dev";
  }
  if (IS_PREVIEW) {
    return "com.owaisrazaqadri.preview";
  }
  return "com.owaisrazaqadri";
};

const getAppName = () => {
  if (IS_DEV) {
    return "Owais Raza Qadri (Dev)";
  }
  if (IS_PREVIEW) {
    return "Owais Raza Qadri (Preview)";
  }
  return "Owais Raza Qadri";
};

export default {
  expo: {
    name: getAppName(),
    slug: "owais-raza-qadri",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/android-icon-foreground.png",
    scheme: "ubaidraza",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      infoPlist: {
        UIBackgroundModes: ["audio"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getUniqueIdentifier(),
      permissions: [
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "WAKE_LOCK",
        "android.permission.WAKE_LOCK",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/icon.png",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/android-icon-foreground.png",
          resizeMode: "cover",
          backgroundColor: "#000000",
        },
      ],
      [
        "@sentry/react-native",
        {
          organization: "sahil-hasnain",
          project: "ubaid-raza-naats",
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
        projectId: "f5025967-41a5-4d6d-b430-c89bada9c40b",
      },
    },
  },
};
