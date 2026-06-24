// Orchestrator: crawl → load rendered DOM + CWV → run checks → findings.json + report.
//
// URL mode (primary):
//   node run.mjs --url https://site.com [--routes /a,/b] [--max-pages 25] \
//        [--rendered-dir <dir>] [--cwv-file <json>] [--psi-key <key>] [--playwright] \
//        [--out SEO-GEO-AUDIT.md] [--work <dir>]
// Codebase mode (static):
//   node run.mjs --path ./my-app [--out SEO-GEO-AUDIT.md]
//
// Rendered DOM comes from chrome-devtools MCP (Claude drops <slug>.html into
// --rendered-dir) or, as a fallback, Playwright (--playwright). CWV come from a
// --cwv-file (route → {lcp,cls,inp,ttfb,source}) or the PSI API (--psi-key).

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseArgs } from "./lib/args.mjs";
import { slugifyUrl } from "./lib/fetch.mjs";
import { parseHtml } from "./lib/html.mjs";
import { crawl } from "./crawl.mjs";
import { runSiteChecks, runPageChecks } from "./checks/index.mjs";
import { renderReport } from "./report.mjs";
import { analyzeCodebase } from "./static.mjs";

async function loadRenderedDir(dir) {
  const map = new Map();
  if (!dir || !existsSync(dir)) return map;
  for (const name of await readdir(dir)) {
    if (!name.endsWith(".html")) continue;
    const html = await readFile(path.join(dir, name), "utf8");
    map.set(name.replace(/\.html$/, ""), html);
  }
  return map;
}

async function loadCwvFile(file) {
  if (!file || !existsSync(file)) return {};
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }
}

// Best-effort PageSpeed Insights lab+field extraction.
async function psiMetrics(url, key) {
  try {
    const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    api.searchParams.set("url", url);
    api.searchParams.set("strategy", "mobile");
    api.searchParams.set("category", "performance");
    if (key) api.searchParams.set("key", key);
    const res = await fetch(api, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const j = await res.json();
    const field = j.loadingExperience?.metrics || {};
    const lab = j.lighthouseResult?.audits || {};
    const num = (k) => lab[k]?.numericValue;
    return {
      lcp: field.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? num("largest-contentful-paint"),
      cls: (field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
        ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
        : num("cumulative-layout-shift")),
      inp: field.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
      ttfb: field.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile ?? num("server-response-time"),
      source: j.loadingExperience?.metrics ? "PSI field+lab" : "PSI lab",
    };
  } catch {
    return null;
  }
}

async function playwrightRender(url) {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    try {
      const pageObj = await browser.newPage();
      await pageObj.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      return await pageObj.content();
    } finally {
      await browser.close();
    }
  } catch {
    return null;
  }
}

async function runUrlMode(args, work, outPath) {
  const base = args.url;
  const routes = args.routes ? String(args.routes).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const maxPages = Number(args["max-pages"] || 25);

  const crawlData = await crawl({ base, routes, maxPages, out: work });
  const rendered = await loadRenderedDir(args["rendered-dir"]);
  const cwvFile = await loadCwvFile(args["cwv-file"]);
  const usePlaywright = !!args.playwright && rendered.size === 0;

  // Parse every page's raw HTML and build cross-page indexes.
  const parsed = new Map();
  const titleIndex = new Map();
  const descIndex = new Map();
  const linkedRoutes = new Set();
  for (const p of crawlData.pages) {
    let html = "";
    try {
      html = await readFile(path.join(work, p.rawPath), "utf8");
    } catch { /* page had no body */ }
    const dom = html ? parseHtml(html) : null;
    parsed.set(p.url, { html, dom });
    if (dom) {
      if (dom.title) push(titleIndex, dom.title.trim(), p.route);
      const d = (dom.metaByName.description || "").trim();
      if (d) push(descIndex, d, p.route);
      for (const a of dom.anchors) {
        if (!a.href) continue;
        try {
          const u = new URL(a.href, p.finalUrl || p.url);
          if (u.origin === new URL(base).origin) {
            linkedRoutes.add((u.pathname || "/").replace(/\/+$/, "") || "/");
          }
        } catch { /* ignore */ }
      }
    }
  }

  const siteCtx = {
    base,
    robots: crawlData.robots,
    llms: crawlData.llms,
    sitemaps: crawlData.sitemaps,
    pages: crawlData.pages,
    titleIndex,
    descIndex,
    linkedRoutes,
  };

  const findings = [...runSiteChecks(siteCtx)];
  const pageMeta = [];
  let renderedCount = 0;
  let cwvCount = 0;

  for (const p of crawlData.pages) {
    const slug = slugifyUrl(p.finalUrl || p.url);
    const { html: rawHtml, dom: raw } = parsed.get(p.url) || { html: "", dom: null };

    // Rendered DOM: MCP-provided dir → Playwright fallback.
    let renderedHtml = rendered.get(slug) || rendered.get(p.slug) || null;
    if (!renderedHtml && usePlaywright) renderedHtml = await playwrightRender(p.finalUrl || p.url);
    const renderedDom = renderedHtml ? parseHtml(renderedHtml) : null;
    if (renderedDom) renderedCount++;

    // CWV: file entry (by route or url) → PSI.
    let cwv = cwvFile[p.route] || cwvFile[p.url] || null;
    if (!cwv && args["psi-key"]) cwv = await psiMetrics(p.finalUrl || p.url, args["psi-key"]);
    if (cwv) cwvCount++;

    const pageCtx = { page: p, raw, rendered: renderedDom, rawHtml, renderedHtml, cwv };
    findings.push(...runPageChecks(pageCtx, siteCtx));
    pageMeta.push({ route: p.route, label: "", url: p.url, cwv });
  }

  const meta = {
    target: base,
    date: new Date().toISOString().slice(0, 10),
    mode: "Live URL",
    pages: pageMeta,
    measured: {
      rendered: renderedCount ? `${renderedCount}/${crawlData.pages.length} page(s) rendered` : "not measured (no MCP/Playwright)",
      cwv: cwvCount ? `${cwvCount}/${crawlData.pages.length} page(s)` : "not measured (no MCP Lighthouse / PSI key)",
    },
    tooling: `node ${process.version}, crawl+checks engine 1.0`,
  };
  return { findings, meta };
}

async function runCodebaseMode(args, outPath) {
  const root = path.resolve(args.path);
  const { findings, framework } = await analyzeCodebase(root);
  const meta = {
    target: root,
    date: new Date().toISOString().slice(0, 10),
    mode: `Codebase (static, ${framework})`,
    pages: [],
    measured: { rendered: "n/a (static analysis)", cwv: "n/a (static analysis)" },
    tooling: `node ${process.version}, static analyzer 1.0`,
  };
  return { findings, meta };
}

function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  if (!map.get(key).includes(val)) map.get(key).push(val);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url && !args.path) {
    console.error("run.mjs: provide --url <base> (live mode) and/or --path <repo> (codebase mode)");
    process.exit(2);
  }
  const outPath = path.resolve(args.out || "SEO-GEO-AUDIT.md");
  const work = path.resolve(args.work || path.join(os.tmpdir(), "seo-geo-audit-" + slugifyUrl(args.url || args.path)));
  await mkdir(work, { recursive: true });

  const { findings, meta } = args.url
    ? await runUrlMode(args, work, outPath)
    : await runCodebaseMode(args, outPath);

  await writeFile(path.join(work, "findings.json"), JSON.stringify(findings, null, 2), "utf8");
  const report = renderReport({ meta, findings });
  await writeFile(outPath, report, "utf8");

  const counts = findings.reduce((a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a), {});
  console.error(`Wrote ${outPath}`);
  console.error(`Findings: ${JSON.stringify(counts)}  ·  details: ${path.join(work, "findings.json")}`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error("run.mjs failed:", err?.stack || err);
    process.exit(1);
  });
}
