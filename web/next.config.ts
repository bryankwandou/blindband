import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,

  // Every page lives under a locale segment, so `/` has nothing to render.
  // English is the default, and the redirect is permanent because that is the
  // real address of the page — not a temporary detour.
  async redirects() {
    return [{ source: "/", destination: "/en", permanent: true }];
  },
};

export default config;
