// A. Crawlability & indexability — robots, sitemap, host/redirects (site),
// and per-page noindex, canonical, redirect chains, status, mixed content.
import { finding } from "../lib/findings.mjs";

const CAT = "crawlability";

export function site(siteCtx) {
  const out = [];
  const { robots, sitemaps = [], base } = siteCtx;

  if (!robots.present) {
    out.push(finding({
      id: "CRAWL-ROBOTS-MISSING", category: CAT, scope: "site", severity: "medium",
      title: "robots.txt is missing or empty",
      evidence: `GET ${robots.url} → ${robots.status || "no response"}`,
      recommendation: "Serve a robots.txt at the site root that allows crawling and points to your sitemap.",
      fixLang: "text",
      fixSnippet: "User-agent: *\nAllow: /\n\nSitemap: " + new URL("/sitemap.xml", base).toString(),
    }));
  } else {
    // Accidental global block.
    const blocksAll = /^\s*user-agent:\s*\*\s*$([\s\S]*?)(?=^\s*user-agent:|\Z)/im;
    const m = robots.text.match(blocksAll);
    if (m && /^\s*disallow:\s*\/\s*$/im.test(m[1])) {
      out.push(finding({
        id: "CRAWL-ROBOTS-DISALLOW-ALL", category: CAT, scope: "site", severity: "critical",
        title: "robots.txt blocks all crawlers (Disallow: /)",
        evidence: "User-agent: * has `Disallow: /` — the entire site is blocked from indexing.",
        recommendation: "Remove the global Disallow, or scope it to truly private paths only.",
        fixLang: "text",
        fixSnippet: "User-agent: *\nDisallow: /admin/\nAllow: /\n\nSitemap: " + new URL("/sitemap.xml", base).toString(),
      }));
    }
    if (!/^\s*sitemap:/im.test(robots.text)) {
      out.push(finding({
        id: "CRAWL-ROBOTS-NO-SITEMAP", category: CAT, scope: "site", severity: "low",
        title: "robots.txt does not reference a sitemap",
        evidence: "No `Sitemap:` directive found in robots.txt.",
        recommendation: "Add a Sitemap directive so crawlers discover all canonical URLs.",
        fixLang: "text",
        fixSnippet: "Sitemap: " + new URL("/sitemap.xml", base).toString(),
      }));
    }
  }

  const okSitemap = sitemaps.find((s) => s.ok && s.urlCount > 0);
  if (sitemaps.length === 0 || !okSitemap) {
    out.push(finding({
      id: "CRAWL-SITEMAP-INVALID", category: CAT, scope: "site", severity: "medium",
      title: "No valid XML sitemap found",
      evidence: sitemaps.length
        ? sitemaps.map((s) => `${s.url} → ${s.status} (${s.urlCount} urls)`).join("; ")
        : "No sitemap discovered via robots.txt or /sitemap.xml.",
      recommendation: "Publish a valid sitemap.xml whose <loc> URLs all return 200 and use the canonical host.",
      fixLang: "xml",
      fixSnippet:
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' +
        base +
        "/</loc></url>\n</urlset>",
    }));
  }

  return out;
}

export function page(pageCtx, siteCtx) {
  const out = [];
  const { page, raw } = pageCtx;
  const route = page.route || page.url;

  // HTTP status.
  if (page.status >= 500) {
    out.push(mk("HTTP-5XX", "high", `Server error ${page.status}`, route,
      `GET ${page.url} → ${page.status}`,
      "Fix the server error; 5xx responses drop the page from the index.", ""));
  } else if (page.status >= 400) {
    out.push(mk("HTTP-4XX", "high", `Client error ${page.status}`, route,
      `GET ${page.url} → ${page.status}`,
      "Return 200 for live pages or 410/301 for retired ones; 4xx pages are not indexed.", ""));
  }

  // Redirect chains.
  if (page.redirects && page.redirects.length >= 2) {
    out.push(mk("HTTP-REDIRECT-CHAIN", "medium", `Redirect chain of ${page.redirects.length} hops`, route,
      page.redirects.map((r) => `${r.status} ${r.from} → ${r.to}`).join("\n"),
      "Collapse to a single 301 from the original URL to the final destination.",
      "nginx",
      "location = /old-path { return 301 /final-path; }"));
  }

  // X-Robots-Tag header noindex.
  const xr = (page.headers && page.headers["x-robots-tag"]) || "";
  if (/noindex/i.test(xr)) {
    out.push(mk("INDEX-XROBOTS-NOINDEX", "high", "X-Robots-Tag: noindex on a live page", route,
      `Response header: X-Robots-Tag: ${xr}`,
      "Remove noindex from the header for pages that should be indexed.", "nginx",
      "# delete this line for indexable routes\n# add_header X-Robots-Tag \"noindex\";"));
  }

  if (!raw) return out;

  // Meta robots noindex / nofollow.
  const robotsMeta = (raw.metaByName.robots || "").toLowerCase();
  if (/\bnoindex\b/.test(robotsMeta)) {
    out.push(mk("INDEX-NOINDEX", "high", "Page is marked noindex", route,
      `<meta name="robots" content="${raw.metaByName.robots}">`,
      "Remove `noindex` if this page should appear in search and AI answers.", "html",
      '<meta name="robots" content="index, follow">'));
  }

  // Canonical correctness.
  if (raw.canonical.length === 0) {
    out.push(mk("CANONICAL-MISSING", "low", "No canonical link", route,
      "No <link rel=\"canonical\"> found.",
      "Add a self-referencing absolute canonical to consolidate signals.", "html",
      `<link rel="canonical" href="${page.finalUrl || page.url}">`));
  } else if (raw.canonical.length > 1) {
    out.push(mk("CANONICAL-MULTIPLE", "medium", "Multiple canonical links", route,
      raw.canonical.map((c) => `<link rel="canonical" href="${c}">`).join("\n"),
      "Keep exactly one canonical per page; multiples are ignored or conflict.", "html",
      `<link rel="canonical" href="${page.finalUrl || page.url}">`));
  } else {
    const c = raw.canonical[0];
    let abs = false, mismatch = false, crossEnv = false;
    try {
      const cu = new URL(c, page.finalUrl || page.url);
      abs = /^https?:$/.test(cu.protocol) && /^https?:\/\//i.test(c);
      const pu = new URL(page.finalUrl || page.url);
      mismatch = cu.host !== pu.host;
      crossEnv = /staging|preview|localhost|\.local|vercel\.app|127\.0\.0\.1/i.test(cu.host) &&
        !/staging|preview|localhost|\.local|vercel\.app|127\.0\.0\.1/i.test(pu.host);
    } catch { /* ignore */ }
    if (!abs) {
      out.push(mk("CANONICAL-RELATIVE", "low", "Canonical URL is not absolute", route,
        `<link rel="canonical" href="${c}">`,
        "Use an absolute https URL so crawlers resolve it unambiguously.", "html",
        `<link rel="canonical" href="${page.finalUrl || page.url}">`));
    }
    if (crossEnv) {
      out.push(mk("CANONICAL-CROSSENV", "critical", "Canonical points to a non-production host", route,
        `Page ${page.finalUrl || page.url} canonicalises to ${c}`,
        "Generate canonicals from the production origin; a staging canonical de-indexes prod.", "js",
        "export const metadata = {\n  alternates: { canonical: 'https://www.example.com' + pathname },\n};"));
    } else if (mismatch) {
      out.push(mk("CANONICAL-MISMATCH", "high", "Canonical host differs from the page host", route,
        `Page host ${safeHost(page.finalUrl || page.url)} ≠ canonical host ${safeHost(c)}`,
        "Point the canonical at the same host the page is served from (or 301 to the canonical host).", "html",
        `<link rel="canonical" href="${page.finalUrl || page.url}">`));
    }
  }

  // Mixed content on an https page.
  if (/^https:/i.test(page.finalUrl || page.url)) {
    const httpRefs = (pageCtx.rawHtml || "").match(/\b(?:src|href)\s*=\s*["']http:\/\/[^"']+/gi) || [];
    if (httpRefs.length) {
      out.push(mk("HTTP-MIXED-CONTENT", "medium", `Mixed content: ${httpRefs.length} insecure resource(s)`, route,
        httpRefs.slice(0, 3).join("\n"),
        "Load all subresources over https; browsers block mixed active content.", "html",
        "<!-- change http:// references to https:// (or protocol-relative //host) -->"));
    }
  }

  return out;

  function mk(id, severity, title, page, evidence, recommendation, fixLang, fixSnippet = "") {
    return finding({ id, category: CAT, scope: "page", page, severity, title, evidence, recommendation, fixLang, fixSnippet });
  }
}

function safeHost(u) {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
}
