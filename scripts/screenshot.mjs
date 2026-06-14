// Headless screenshot harness for visual review.
//
// Serves the built `dist/` output with a tiny zero-dependency static server,
// then captures each page at mobile + desktop widths into `screenshots/`.
//
// Usage:
//   node scripts/screenshot.mjs                 # all pages, both viewports
//   node scripts/screenshot.mjs --page=contact  # one page
//   node scripts/screenshot.mjs --viewport=desktop
//   node scripts/screenshot.mjs --port=4321
//
// Requires a prior `npm run build` (use `npm run shots` to build + capture).
// The Netlify adapter rejects `astro preview`, so we serve dist/ ourselves.

import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "screenshots");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const PORT = Number(args.port) || 4321;

const PAGES = [
  { name: "index", path: "/" },
  { name: "portfolio", path: "/portfolio" },
  { name: "reviews", path: "/reviews" },
  { name: "contact", path: "/contact" },
];

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

// Resolve a request URL to a file inside dist/, mapping Astro's
// directory-style routes (e.g. /contact -> /contact/index.html).
async function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p.endsWith("/")) p = p + "index.html";
  let candidate = join(DIST, p);
  try {
    const s = await stat(candidate);
    if (s.isDirectory()) candidate = join(candidate, "index.html");
    else return candidate;
    await stat(candidate);
    return candidate;
  } catch {
    // Try extensionless route -> /route/index.html
    if (!extname(p)) {
      const alt = join(DIST, p, "index.html");
      try {
        await stat(alt);
        return alt;
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function startServer() {
  const server = createServer(async (req, res) => {
    const file = await resolveFile(req.url || "/");
    if (!file) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    try {
      const body = await readFile(file);
      res.setHeader("Content-Type", MIME[extname(file)] || "application/octet-stream");
      res.end(body);
    } catch {
      res.statusCode = 500;
      res.end("Server error");
    }
  });
  return new Promise((res) => server.listen(PORT, () => res(server)));
}

async function main() {
  try {
    await stat(join(DIST, "index.html"));
  } catch {
    console.error("dist/ not built. Run `npm run build` first (or use `npm run shots`).");
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });

  const pages = args.page ? PAGES.filter((p) => p.name === args.page) : PAGES;
  const viewports = args.viewport
    ? VIEWPORTS.filter((v) => v.name === args.viewport)
    : VIEWPORTS;

  if (!pages.length) {
    console.error(`No page named "${args.page}". Options: ${PAGES.map((p) => p.name).join(", ")}`);
    process.exit(1);
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const written = [];

  try {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      for (const pg of pages) {
        const url = `http://localhost:${PORT}${pg.path}`;
        await page.goto(url, { waitUntil: "networkidle" });
        const out = join(OUT, `${pg.name}-${vp.name}.png`);
        await page.screenshot({ path: out, fullPage: true });
        written.push(out);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`Captured ${written.length} screenshot(s):`);
  for (const w of written) console.log("  " + w.replace(ROOT + "/", ""));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
