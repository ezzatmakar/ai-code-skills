// Sanity tests for the check engine against fixture HTML. No network, no deps.
// Run: node scripts/selftest.mjs   (exit 0 = pass, 1 = fail)
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHtml } from "./lib/html.mjs";
import { runPageChecks, runSiteChecks } from "./checks/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixt = (n) => readFile(path.join(here, "fixtures", n), "utf8");

const errors = [];
const assert = (cond, msg) => { if (!cond) errors.push(msg); };

function siteCtx(extra = {}) {
  return {
    base: "https://example.com",
    robots: { present: true, status: 200, text: "User-agent: *\nAllow: /\n", url: "https://example.com/robots.txt" },
    llms: { "llms.txt": { present: false, status: 404 }, "llms-full.txt": { present: false, status: 404 } },
    sitemaps: [{ url: "https://example.com/sitemap.xml", status: 200, urlCount: 2, ok: true, kind: "urlset" }],
    pages: [],
    titleIndex: new Map(),
    descIndex: new Map(),
    linkedRoutes: new Set(["/", "/pricing"]),
    ...extra,
  };
}

function pageObj(url, over = {}) {
  return { url, route: new URL(url).pathname, finalUrl: url, status: 200, redirects: [], headers: {}, ttfbMs: null, slug: "x", ...over };
}

const ids = (fs) => new Set(fs.map((f) => f.id));

// --- Test 1: a healthy page produces no critical/high findings ---
{
  const html = await fixt("good-page.html");
  const raw = parseHtml(html);
  const ctx = { page: pageObj("https://example.com/pricing"), raw, rendered: raw, rawHtml: html, renderedHtml: html, cwv: null };
  const fs = runPageChecks(ctx, siteCtx());
  const got = ids(fs);
  assert(!got.has("RENDER-SSR-EMPTY"), "good-page should NOT fire RENDER-SSR-EMPTY");
  assert(!got.has("META-TITLE-MISSING"), "good-page should NOT fire META-TITLE-MISSING");
  assert(!got.has("SEM-H1-MISSING"), "good-page should NOT fire SEM-H1-MISSING");
  const blocking = fs.filter((f) => f.status === "fail" && (f.severity === "critical" || f.severity === "high"));
  assert(blocking.length === 0, `good-page should have no critical/high findings, got: ${blocking.map((f) => f.id).join(", ")}`);
}

// --- Test 2: empty SSR shell (raw) vs populated rendered DOM ---
{
  const rawHtml = await fixt("bad-ssr-page.html");
  const renderedHtml = await fixt("good-page.html");
  const raw = parseHtml(rawHtml);
  const rendered = parseHtml(renderedHtml);
  const ctx = { page: pageObj("https://example.com/app"), raw, rendered, rawHtml, renderedHtml, cwv: null };
  const fs = runPageChecks(ctx, siteCtx());
  const got = ids(fs);
  assert(got.has("RENDER-SSR-EMPTY"), "bad-ssr-page should fire RENDER-SSR-EMPTY");
  assert(got.has("META-TITLE-MISSING"), "bad-ssr-page should fire META-TITLE-MISSING");
  assert(got.has("SEM-H1-MISSING"), "bad-ssr-page should fire SEM-H1-MISSING");
}

// --- Test 3: empty raw with NO rendered DOM → client-only + GEO invisibility ---
{
  const rawHtml = await fixt("bad-ssr-page.html");
  const raw = parseHtml(rawHtml);
  const ctx = { page: pageObj("https://example.com/app"), raw, rendered: null, rawHtml, renderedHtml: null, cwv: null };
  const fs = runPageChecks(ctx, siteCtx());
  const got = ids(fs);
  assert(got.has("RENDER-CLIENT-ONLY-DATA"), "empty raw w/o rendered should fire RENDER-CLIENT-ONLY-DATA");
  assert(got.has("GEO-SSR-INVISIBLE"), "empty raw w/o rendered should fire GEO-SSR-INVISIBLE");
}

// --- Test 4: site checks — robots Disallow: / and blocked AI bots ---
{
  const robotsText = "User-agent: *\nDisallow: /\n\nUser-agent: GPTBot\nDisallow: /\n";
  const ctx = siteCtx({ robots: { present: true, status: 200, text: robotsText, url: "https://example.com/robots.txt" } });
  const fs = runSiteChecks(ctx);
  const got = ids(fs);
  assert(got.has("CRAWL-ROBOTS-DISALLOW-ALL"), "Disallow:/ should fire CRAWL-ROBOTS-DISALLOW-ALL");
  assert(got.has("GEO-AIBOT-BLOCKED"), "GPTBot Disallow:/ should fire GEO-AIBOT-BLOCKED");
  assert(got.has("GEO-LLMSTXT-MISSING"), "absent llms.txt should fire GEO-LLMSTXT-MISSING");
}

// --- Report renders and contains required headings ---
{
  const { renderReport } = await import("./report.mjs");
  const md = renderReport({
    meta: {
      target: "https://example.com", date: "2026-01-01", mode: "Live URL",
      pages: [{ route: "/pricing", label: "Pricing", url: "https://example.com/pricing", cwv: null }],
      measured: { rendered: "1/1", cwv: "not measured" }, tooling: "test",
    },
    findings: [],
  });
  for (const h of ["# Technical SEO & GEO Audit", "## Executive Summary", "## Site-Wide Findings", "## Per-Page Findings", "## Quick-Win Checklist", "## Appendix / Methodology"]) {
    assert(md.includes(h), `report missing section: ${h}`);
  }
  assert(md.includes("### `/pricing`"), "report missing per-page route heading");
}

if (errors.length) {
  console.error("SELFTEST FAILED:");
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("selftest passed: all check-engine assertions hold.");
