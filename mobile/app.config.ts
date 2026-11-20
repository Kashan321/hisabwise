import type { ExpoConfig } from 'expo/config';

const defaultApiUrl = 'https://hisabwise.com/api/v1';

const config: ExpoConfig = {
  name: 'HisabWise POS',
  slug: 'hisabwise-pos',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'hisabwise',
  userInterfaceStyle: 'automatic',
  owner: 'kashan3241',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.hisabwise.pos',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0f766e',
    },
    package: 'com.hisabwise.pos',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0f766e',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;