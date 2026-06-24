// Page discovery + raw HTML capture.
//
// Discovers pages via sitemap.xml (and robots.txt Sitemap: directives), falls
// back to a bounded same-origin link crawl, and saves each page's RAW HTML (what
// a non-JS bot / AI crawler sees) plus status, redirect chain, and headers.
//
// Output: <out>/crawl.json + <out>/raw/<slug>.html files.
//
// CLI: node crawl.mjs --url https://site.com [--routes /a,/b] [--max-pages 25] [--out <dir>]

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchPage, fetchText, slugifyUrl } from "./lib/fetch.mjs";
import { parseArgs } from "./lib/args.mjs";

function sameOrigin(a, b) {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function routeOf(url) {
  try {
    const u = new URL(url);
    return (u.pathname || "/") + (u.search || "");
  } catch {
    return url;
  }
}

/** Extract <loc> URLs from a sitemap or sitemap-index document. */
function extractLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

async function discoverSitemaps(base, robotsText) {
  const found = new Set();
  // Sitemaps declared in robots.txt take priority.
  for (const line of (robotsText || "").split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap:\s*(\S+)/i);
    if (m) found.add(new URL(m[1], base).toString());
  }
  if (found.size === 0) found.add(new URL("/sitemap.xml", base).toString());
  return [...found];
}

async function collectSitemapUrls(sitemapUrls, base, cap) {
  const results = [];
  const seen = new Set();
  const queue = [...sitemapUrls];
  while (queue.length && results.length < cap * 4) {
    const sm = queue.shift();
    if (seen.has(sm)) continue;
    seen.add(sm);
    const res = await fetchText(sm);
    if (!res || !res.ok || !res.text) {
      results.push({ url: sm, status: res?.status ?? 0, urlCount: 0, ok: false });
      continue;
    }
    const locs = extractLocs(res.text);
    // Sitemap index → nested sitemaps; otherwise page URLs.
    if (/<sitemapindex/i.test(res.text)) {
      for (const l of locs) queue.push(l);
      results.push({ url: sm, status: res.status, urlCount: locs.length, ok: true, kind: "index" });
    } else {
      results.push({ url: sm, status: res.status, urlCount: locs.length, ok: true, kind: "urlset", locs });
    }
  }
  return results;
}

export async function crawl({ base, routes = [], maxPages = 25, out }) {
  const rawDir = path.join(out, "raw");
  await mkdir(rawDir, { recursive: true });

  // robots.txt (kept verbatim for crawler-access checks).
  const robotsUrl = new URL("/robots.txt", base).toString();
  const robotsRes = await fetchText(robotsUrl);
  const robots = {
    url: robotsUrl,
    status: robotsRes?.status ?? 0,
    present: !!(robotsRes && robotsRes.ok && robotsRes.text && robotsRes.text.trim()),
    text: robotsRes?.text ?? "",
  };

  // llms.txt / llms-full.txt (GEO).
  const llms = {};
  for (const name of ["llms.txt", "llms-full.txt"]) {
    const u = new URL("/" + name, base).toString();
    const r = await fetchText(u);
    llms[name] = { url: u, status: r?.status ?? 0, present: !!(r && r.ok && r.text && r.text.trim()) };
  }

  // Build the candidate URL list.
  let candidates = [];
  let sitemaps = [];
  if (routes.length) {
    candidates = routes.map((r) => new URL(r, base).toString());
  } else {
    const smUrls = await discoverSitemaps(base, robots.text);
    sitemaps = await collectSitemapUrls(smUrls, base, maxPages);
    for (const s of sitemaps) if (s.locs) candidates.push(...s.locs);
  }
  // Always include the base URL; keep same-origin; dedupe; preserve order.
  const ordered = [];
  const seen = new Set();
  for (const u of [base, ...candidates]) {
    const norm = (() => {
      try {
        return new URL(u).toString();
      } catch {
        return null;
      }
    })();
    if (!norm || seen.has(norm) || !sameOrigin(norm, base)) continue;
    seen.add(norm);
    ordered.push(norm);
  }

  // Fetch pages; BFS-fill from anchors when we have room and no explicit routes/sitemap.
  const pages = [];
  const queue = [...ordered];
  const allowCrawl = routes.length === 0;
  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    const res = await fetchPage(url);
    const slug = slugifyUrl(res.finalUrl || url);
    const rawName = `${slug || "page"}.html`;
    const rawPath = path.join(rawDir, rawName);
    if (res.body) await writeFile(rawPath, res.body, "utf8");
    pages.push({
      url,
      route: routeOf(url),
      slug,
      status: res.status,
      ok: res.ok,
      finalUrl: res.finalUrl,
      redirects: res.redirects,
      headers: res.headers,
      ttfbMs: res.ttfbMs,
      contentType: res.headers["content-type"] || "",
      htmlBytes: res.body ? Buffer.byteLength(res.body) : 0,
      rawPath: path.relative(out, rawPath),
      error: res.error,
    });

    if (allowCrawl && pages.length < maxPages && /text\/html/i.test(res.headers["content-type"] || "")) {
      // enqueue same-origin anchors we haven't queued yet
      const hrefs = [...res.body.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1]);
      for (const h of hrefs) {
        let abs;
        try {
          abs = new URL(h, res.finalUrl || url).toString();
        } catch {
          continue;
        }
        if (!sameOrigin(abs, base) || seen.has(abs)) continue;
        if (/\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|pdf|zip|mp4|woff2?)(\?|$)/i.test(abs)) continue;
        seen.add(abs);
        queue.push(abs);
      }
    }
  }

  const data = {
    base,
    mode: "url",
    robots,
    llms,
    sitemaps: sitemaps.map(({ locs, ...rest }) => rest), // drop bulky loc arrays from manifest
    pageCount: pages.length,
    pages,
  };
  await writeFile(path.join(out, "crawl.json"), JSON.stringify(data, null, 2), "utf8");
  return data;
}

// --- CLI ---
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error("crawl.mjs: --url <base> is required");
    process.exit(2);
  }
  const out = args.out || path.join(process.cwd(), ".seo-geo-audit");
  const routes = args.routes ? String(args.routes).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const maxPages = Number(args["max-pages"] || 25);
  const data = await crawl({ base: args.url, routes, maxPages, out });
  console.error(`Crawled ${data.pageCount} page(s). Manifest: ${path.join(out, "crawl.json")}`);
}
