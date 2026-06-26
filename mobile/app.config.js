export default {
  expo: {
    name: "ARQuest",
    slug: "ARQuest",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "ARQuest",
    userInterfaceStyle: "automatic",

    ios: {
      icon: "./assets/expo.icon",
    },

    android: {
      package: "com.arquest.app",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow ARQuest to use your location to unlock campus buildings when you're nearby.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow ARQuest to use your camera for AR building views and selfie capture.",
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      eas: {
        projectId: "a93fe083-ea87-495c-b5fc-74424c017742",
      },
    },
  },
};