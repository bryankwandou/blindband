import type { NextConfig } from "next";

/**
 * Two build shapes from one tree.
 *
 * The default build is the Vercel one: a Node server that can answer a redirect
 * for `/`. `BB_STATIC_EXPORT=1` produces a folder of files instead, for GitHub
 * Pages or any other static host — which is what the site actually needs, since
 * every page is prerendered and nothing here runs at request time.
 *
 * The export drops `redirects()` because a static host has no one to run it;
 * `scripts/pages-build.mjs` writes an equivalent HTML shim at the root instead.
 * `basePath` is required because Pages serves a project repo from a subpath.
 */

const exporting = process.env.BB_STATIC_EXPORT === "1";
const basePath = process.env.BB_BASE_PATH ?? "";

const config: NextConfig = {
  reactStrictMode: true,

  ...(exporting
    ? {
        output: "export" as const,
        // Pages has no image optimiser, and there is nothing to optimise: the
        // only raster assets are the screenshots, already sized at capture.
        images: { unoptimized: true },
        // Directory-style URLs, so `/en` resolves without relying on the host
        // guessing an `.html` extension.
        trailingSlash: true,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {
        // Every page lives under a locale segment, so `/` has nothing to
        // render. English is the default, and the redirect is permanent
        // because that is the real address of the page — not a temporary
        // detour.
        async redirects() {
          return [{ source: "/", destination: "/en", permanent: true }];
        },
      }),
};

export default config;
