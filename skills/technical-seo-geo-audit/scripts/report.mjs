// Assemble the README-style audit report from findings.
// Mirrors assets/SEO_GEO_AUDIT_REPORT_TEMPLATE.md exactly so validate-report.py
// passes on both this generated baseline and a Claude-finalized version.
import {
  BADGE, bySeverity, countBySeverity, seoScore, geoScore, band, SEVERITIES,
} from "./lib/findings.mjs";

const SEV_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Info" };

function fence(lang, body) {
  // Avoid accidentally closing the fence if the snippet contains ```.
  const safe = String(body).replace(/```/g, "ʼʼʼ");
  return "```" + (lang || "") + "\n" + safe + "\n```";
}

function renderFinding(f) {
  const lines = [];
  lines.push(`**${BADGE[f.severity]} · \`${f.id}\` — ${f.title}**`);
  lines.push("");
  if (f.status === "info") lines.push("> Informational / not measured — does not affect the score.\n");
  const why = whyItMatters(f);
  if (why) lines.push(`**Why it matters:** ${why}`);
  if (f.evidence) {
    lines.push("\n**Evidence:**");
    lines.push(fence("text", f.evidence));
  }
  if (f.recommendation) lines.push(`\n**Recommendation:** ${f.recommendation}`);
  if (f.fixSnippet) lines.push("\n" + fence(f.fixLang || "", f.fixSnippet));
  lines.push("\n---\n");
  return lines.join("\n");
}

function whyItMatters(f) {
  const map = {
    crawlability: "Affects whether search engines can crawl and index the URL.",
    rendering: "Content delivered only after JS is invisible to non-JS search and AI crawlers.",
    performance: "Slow or unstable loading hurts Core Web Vitals, rankings, and crawl budget.",
    metadata: "Metadata and structured data drive how the page is titled, unfurled, and cited.",
    semantics: "Clean semantic structure lets crawlers and LLMs locate and lift the main content.",
    geo: "Determines whether AI assistants can fetch, parse, and cite this page.",
  };
  return map[f.category] || "";
}

function cwvLine(cwv) {
  if (!cwv) return "CWV: not measured";
  const cell = (label, v, unit, good) => (v == null ? `${label} —` : `${label} ${v}${unit}${v <= good ? " ✓" : " ⚠"}`);
  return [
    "CWV:",
    cell("LCP", cwv.lcp, "ms", 2500),
    "/",
    cell("CLS", cwv.cls, "", 0.1),
    "/",
    cell("INP", cwv.inp, "ms", 200),
    "/",
    cell("TTFB", cwv.ttfb, "ms", 800),
  ].join(" ");
}

function countLine(counts) {
  const parts = SEVERITIES.filter((s) => counts[s]).map((s) => `${counts[s]} ${SEV_LABEL[s]}`);
  return parts.length ? parts.join(" · ") : "no findings";
}

export function renderReport({ meta, findings }) {
  const all = findings;
  const site = all.filter((f) => f.scope === "site").sort(bySeverity);
  const pageFindings = all.filter((f) => f.scope === "page");
  const counts = countBySeverity(all);
  const seo = seoScore(all);
  const geo = geoScore(all);

  // group page findings by route, preserving crawl order
  const order = meta.pages.map((p) => p.route);
  const byRoute = new Map();
  for (const p of meta.pages) byRoute.set(p.route, { ...p, findings: [] });
  for (const f of pageFindings) {
    const key = f.page;
    if (!byRoute.has(key)) byRoute.set(key, { route: key, label: "", url: key, cwv: null, findings: [] });
    byRoute.get(key).findings.push(f);
  }

  const out = [];
  out.push(`# Technical SEO & GEO Audit — ${meta.target}`);
  out.push("");
  out.push("| | |");
  out.push("|---|---|");
  out.push(`| **Target** | ${meta.target} |`);
  out.push(`| **Date** | ${meta.date} |`);
  out.push(`| **Mode** | ${meta.mode} |`);
  out.push(`| **Pages audited** | ${meta.pages.length} |`);
  out.push(`| **Rendered DOM** | ${meta.measured.rendered} |`);
  out.push(`| **Core Web Vitals** | ${meta.measured.cwv} |`);
  out.push(`| **Tooling** | ${meta.tooling} |`);
  out.push("");

  // Executive summary
  out.push("## Executive Summary");
  out.push("");
  out.push(`- **SEO score:** ${seo}/100 (${band(seo)})`);
  out.push(`- **GEO score:** ${geo}/100 (${band(geo)})`);
  out.push(`- **Findings:** ${counts.critical} Critical · ${counts.high} High · ${counts.medium} Medium · ${counts.low} Low · ${counts.info} Info`);
  out.push("");
  out.push(verdict(seo, geo, counts));
  out.push("");

  // Site-wide
  out.push("## Site-Wide Findings");
  out.push("");
  if (!site.length) {
    out.push("_No substantiated site-wide findings._");
  } else {
    for (const f of site) out.push(renderFinding(f));
  }
  out.push("");

  // Per-page
  out.push("## Per-Page Findings");
  out.push("");
  const routes = [...byRoute.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (!routes.length) {
    out.push("_No per-page findings. (Codebase/static mode analyzes source files, not live routes — see Site-Wide Findings; run URL mode for per-page rendering, Core Web Vitals, and HTTP checks.)_");
    out.push("");
  }
  for (const route of routes) {
    const p = byRoute.get(route);
    const pc = countBySeverity(p.findings);
    out.push(`### \`${route}\` — ${p.label || routeLabel(route)}`);
    out.push("");
    out.push(`*${cwvLine(p.cwv)} · Findings: ${countLine(pc)}*`);
    out.push("");
    const sorted = [...p.findings].sort(bySeverity);
    if (!sorted.length) {
      out.push("_No substantiated findings on this page._\n");
    } else {
      for (const f of sorted) out.push(renderFinding(f));
    }
  }
  out.push("");

  // Quick wins
  out.push("## Quick-Win Checklist");
  out.push("");
  const wins = all
    .filter((f) => f.status === "fail")
    .sort(bySeverity)
    .slice(0, 12);
  if (!wins.length) {
    out.push("- No blocking fixes — re-run after any content/template changes.");
  } else {
    for (const f of wins) {
      const where = f.scope === "site" ? "site-wide" : `\`${f.page}\``;
      out.push(`- [ ] **${SEV_LABEL[f.severity]}** ${where} · \`${f.id}\` — ${f.title}`);
    }
  }
  out.push("");

  // Methodology
  out.push("## Appendix / Methodology");
  out.push("");
  out.push(`- **What was measured:** raw HTML fetch for every page; rendered DOM: ${meta.measured.rendered}; Core Web Vitals: ${meta.measured.cwv}.`);
  out.push("- **Thresholds:** Core Web Vitals use Google's good/poor cut-offs (LCP 2.5s/4s, CLS 0.1/0.25, INP 200ms/500ms, TTFB 0.8s/1.8s). Scoring: start 100, subtract Critical −20 / High −10 / Medium −4 / Low −1, clamped 0–100. SEO score = crawlability + rendering + performance + metadata + semantics; GEO score = generative-engine + rendering.");
  out.push("- **Not measured items** are reported as `Info`, never asserted as passing.");
  out.push(`- **Re-run:** \`node scripts/run.mjs --url ${meta.target} --max-pages ${meta.pages.length} --rendered-dir <dir>\``);
  out.push("");

  return out.join("\n");
}

function verdict(seo, geo, counts) {
  const parts = [];
  if (counts.critical) parts.push(`${counts.critical} critical issue(s) need fixing first`);
  if (counts.high) parts.push(`${counts.high} high-severity issue(s)`);
  const worst = Math.min(seo, geo);
  const head =
    worst >= 90
      ? "The site is technically strong for both search and AI engines."
      : worst >= 60
        ? "The site has a workable technical foundation with clear gaps to close."
        : "The site has significant technical SEO/GEO defects that limit search and AI visibility.";
  const tail = parts.length ? ` Priorities: ${parts.join("; ")}.` : " No critical or high-severity blockers were found.";
  return `${head}${tail} See the per-page sections for code-level fixes.`;
}

function routeLabel(route) {
  if (route === "/" || route === "") return "Home";
  const seg = String(route).replace(/[?#].*$/, "").replace(/\/+$/, "").split("/").filter(Boolean).pop() || "Home";
  return seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
