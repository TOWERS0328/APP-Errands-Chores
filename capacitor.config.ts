import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.errandschores.app',
  appName: 'Errands & Chores',
  webDir: 'www',
  plugins: {
    GoogleAuth: {
      scopes: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/calendar'
      ],
      serverClientId: '1091663877007-lf0h2ifnri2sumnprb43nmptog03aful.apps.googleusercontent.com', // ← Web Client ID
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
