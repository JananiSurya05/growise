import type { CapacitorConfig } from "@capacitor/cli";

// REQUIRED BEFORE BUILDING APK:
// Set CAPACITOR_SERVER_URL to the hosted Next.js deployment URL.
// Without this, all /api/* routes (weather, AI advisor, disease scanner,
// insights, market-intelligence) will be unreachable and return 404.
//
// Example: CAPACITOR_SERVER_URL=https://growise.vercel.app npx cap sync android
//
// If CAPACITOR_SERVER_URL is not set, the build proceeds with webDir="out"
// (static assets only) — API routes will NOT work.
const SERVER_URL = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.growise.app",
  appName: "GroWise",
  // webDir is only used as fallback when server.url is not set.
  // Next.js is a server-rendered app — local static export has no API routes.
  webDir: "out",
  server: {
    // Point to the hosted Next.js deployment so API routes work on Android.
    // ⚠️ Without this, /api/* endpoints return 404 in the native app.
    ...(SERVER_URL ? { url: SERVER_URL } : {}),
    androidScheme: "https",
    cleartext: false,
    allowNavigation: [
      "*.supabase.co",
      "*.groq.com",
      "api.openweathermap.org",
      "accounts.google.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#014D4E",
      showSpinner: false,
    },
  },
  android: {
    // Override user agent to prevent Google OAuth WebView block.
    // Chrome Custom Tabs user agent — avoids "wv" flag that Google rejects.
    overrideUserAgent:
      "Mozilla/5.0 (Linux; Android 10; GroWise) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    allowMixedContent: false,
    // Disable remote debugging in production builds.
    webContentsDebuggingEnabled: false,
    captureInput: true,
    useLegacyBridge: false,
  },
};

export default config;
