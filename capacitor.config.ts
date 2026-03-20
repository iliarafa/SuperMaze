import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quantumlabyrinth.app',
  appName: 'Lovs Maze',
  webDir: 'dist',
  ios: {
    allowsLinkPreview: false,
  },
  server: {
    iosScheme: 'capacitor',
  },
};

export default config;
