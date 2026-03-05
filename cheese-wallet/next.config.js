const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Only cache/intercept requests that originate from /wallet
  // The service worker registration script is only injected on pages
  // that include the manifest link — i.e. the /wallet layout.
  // Setting scope to /wallet ensures the SW doesn't intercept the landing page.
  scope: "/wallet",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // Only precache wallet route assets
    navigateFallback: "/wallet",
    navigateFallbackAllowlist: [/^\/wallet/],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
