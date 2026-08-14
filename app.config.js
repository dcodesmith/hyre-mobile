const sentryEnvironmentVariables = [
  "EXPO_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
];
const requiresSentry =
  process.env.EAS_BUILD_PROFILE === "preview" ||
  process.env.EAS_BUILD_PROFILE === "production";
const missingSentryEnvironmentVariables = requiresSentry
  ? sentryEnvironmentVariables.filter(
      (name) => !process.env[name]?.trim(),
    )
  : [];

if (missingSentryEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing Sentry environment variables for ${process.env.EAS_BUILD_PROFILE}: ${missingSentryEnvironmentVariables.join(", ")}`,
  );
}

const sentryPlugin =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? [
        "@sentry/react-native",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ]
    : "@sentry/react-native";

/** @type {import('expo/config').ExpoConfig} */
export default {
  expo: {
    name: "Tripdly",
    slug: "hyre-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "hyremobile",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    extra: {
      eas: {
        projectId: "6f6f063d-49ee-40a5-87ca-b60d2f71b795",
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.tripdly.app",
      googleServicesFile: "./GoogleService-Info.plist",
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSAppTransportSecurity: {
          // Only allow local networking in development builds
          NSAllowsLocalNetworking:
            process.env.EAS_BUILD_PROFILE !== "production",
        },
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.tripdly.app",
      googleServicesFile: "./google-services.json",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      sentryPlugin,
      [
        "expo-dev-client",
        {
          addGeneratedScheme: true,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: { backgroundColor: "#000000" },
        },
      ],
      "expo-secure-store",
      "expo-notifications",
      "expo-font",
      "expo-image",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
