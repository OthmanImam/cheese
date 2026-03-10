// const withPWA = require("next-pwa")({
//   dest: "public",
//   disable: process.env.NODE_ENV === "development", // Disable PWA in dev to prevent constant recompilation
//   scope: "/wallet",
//   cacheOnFrontEndNav: true,
//   reloadOnOnline: true,
//   skipWaiting: false,
//   disableDevLogs: true,
//   navigateFallback: "/wallet",
//   navigateFallbackAllowlist: [/^\/wallet/],
// });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;
