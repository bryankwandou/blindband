/**
 * Static export for GitHub Pages.
 *
 * Runs the export build, then supplies the two files a static host needs that
 * a Next server would have handled itself:
 *
 *   index.html — the `/` → `/en` redirect, as markup rather than a 308.
 *   .nojekyll  — without it Pages runs Jekyll, which silently drops every
 *                path beginning with an underscore. Next puts its entire
 *                asset graph under `_next`, so the site would load as
 *                unstyled HTML and the omission would look like a CSS bug.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const basePath = process.env.BB_BASE_PATH ?? "";
const target = `${basePath}/en/`;

execFileSync(process.execPath, [join("node_modules", "next", "dist", "bin", "next"), "build"], {
  stdio: "inherit",
  env: { ...process.env, BB_STATIC_EXPORT: "1" },
});

writeFileSync(
  join("out", "index.html"),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Blindband</title>
    <meta http-equiv="refresh" content="0; url=${target}" />
    <link rel="canonical" href="${target}" />
    <script>location.replace(${JSON.stringify(target)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${target}">${target}</a>.</p>
  </body>
</html>
`,
  "utf8",
);

writeFileSync(join("out", ".nojekyll"), "", "utf8");

console.log(`\nStatic export ready in web/out — root redirects to ${target}`);
