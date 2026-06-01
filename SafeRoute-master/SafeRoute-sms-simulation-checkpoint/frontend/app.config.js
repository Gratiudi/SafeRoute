require("dotenv").config();

const appJson = require("./app.json");

const expoConfig = appJson.expo ?? {};
const androidConfig = expoConfig.android ?? {};
const existingAndroidGoogleMaps = androidConfig.config?.googleMaps ?? {};
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    ...expoConfig,
    android: {
      ...androidConfig,
      config: {
        ...(androidConfig.config ?? {}),
        googleMaps: {
          ...existingAndroidGoogleMaps,
          ...(googleMapsApiKey ? { apiKey: googleMapsApiKey } : {}),
        },
      },
    },
    plugins: [
      ...(expoConfig.plugins ?? []).filter((plugin) => plugin !== "expo-location"),
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow SafeRoute to access your location while sharing it with trusted contacts.",
        },
      ],
    ],
  },
};
