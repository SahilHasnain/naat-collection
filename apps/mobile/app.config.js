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
      versionCode: 7,
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#000000",
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
      [
        "@sentry/react-native",
        {
          organization: "sahil-hasnain",
          project: "ubaid-raza-naats",
        },
      ],
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
       "projectId": "2c3222cc-907f-459e-a719-34f65d3045e1"
      },
    },
  },
};
