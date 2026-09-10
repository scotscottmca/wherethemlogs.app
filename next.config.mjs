/** @type {import('next').NextConfig} */
export default {
  /**
   * Static export. The site is a CDN-served bundle on Azure Static Web Apps and
   * every byte of data comes from the linked Function App at /api/*.
   *
   * This is what buys independent deploys: SWA's Next.js hybrid mode owns /api
   * itself and ignores staticwebapp.config.json's routing and role rules, which
   * would break both the separate backend and the admin gating.
   */
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};
