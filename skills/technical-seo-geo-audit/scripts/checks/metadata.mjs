// D. Metadata & structured data — title/description, Open Graph + Twitter,
// viewport, JSON-LD validity, broken attributes, and image alt.
import { finding } from "../lib/findings.mjs";
import { jsonLdTypes } from "../lib/html.mjs";

const CAT = "metadata";

export function page(pageCtx, siteCtx) {
  const out = [];
  const { page, raw, rawHtml } = pageCtx;
  const route = page.route || page.url;
  if (!raw) return out;

  const mk = (id, severity, title, evidence, recommendation, fixLang, fixSnippet = "", status = "fail") =>
    out.push(finding({ id, category: CAT, scope: "page", page: route, severity, title, evidence, recommendation, fixLang, fixSnippet, status }));

  // --- Title ---
  if (!raw.title || !raw.title.trim()) {
    mk("META-TITLE-MISSING", "high", "Missing or empty <title>",
      "No non-empty <title> element found.",
      "Set a unique, descriptive title per route.", "jsx",
      "export const metadata = { title: 'Pricing — Acme' };");
  } else if (siteCtx?.titleIndex?.get(raw.title.trim())?.length > 1) {
    mk("META-TITLE-DUPLICATE", "medium", "Duplicate <title> across pages",
      `"${raw.title.trim()}" is used by: ${siteCtx.titleIndex.get(raw.title.trim()).join(", ")}`,
      "Give each page a distinct title; duplicates confuse ranking and AI attribution.", "jsx",
      "export const metadata = { title: `${pageName} — Acme` };");
  }

  // --- Description ---
  const desc = (raw.metaByName.description || "").trim();
  if (!desc) {
    mk("META-DESC-MISSING", "medium", "Missing meta description",
      "No <meta name=\"description\"> found.",
      "Add a concise, page-specific description (~150 chars).", "jsx",
      "export const metadata = { description: 'Simple, transparent pricing for teams of any size.' };");
  } else if (siteCtx?.descIndex?.get(desc)?.length > 1) {
    mk("META-DESC-DUPLICATE", "low", "Duplicate meta description across pages",
      `Shared by: ${siteCtx.descIndex.get(desc).join(", ")}`,
      "Write a distinct description per page.", "jsx",
      "export const metadata = { description: pageSpecificSummary };");
  }

  // --- Viewport ---
  if (!raw.metaByName.viewport) {
    mk("META-VIEWPORT-MISSING", "medium", "Missing viewport meta",
      "No <meta name=\"viewport\"> — mobile rendering and mobile-first indexing suffer.",
      "Add the standard responsive viewport meta.", "html",
      '<meta name="viewport" content="width=device-width, initial-scale=1">');
  }

  // --- Open Graph / Twitter (link unfurls) ---
  if (!raw.og["og:title"] || !raw.og["og:image"]) {
    mk("META-OG-MISSING", "low", "Incomplete Open Graph tags",
      `og:title=${raw.og["og:title"] ? "present" : "missing"}, og:image=${raw.og["og:image"] ? "present" : "missing"}`,
      "Add Open Graph tags so shared links unfurl with a title and image.", "html",
      '<meta property="og:title" content="Pricing — Acme">\n<meta property="og:image" content="https://acme.com/og/pricing.png">');
  }
  if (!raw.twitter["twitter:card"]) {
    mk("META-TWITTER-MISSING", "low", "Missing Twitter card",
      "No <meta name=\"twitter:card\"> found.",
      "Add a Twitter card type for richer link previews.", "html",
      '<meta name="twitter:card" content="summary_large_image">');
  }

  // --- JSON-LD ---
  for (const block of raw.jsonLd) {
    if (block.error) {
      mk("SCHEMA-JSONLD-INVALID", "medium", "Invalid JSON-LD (does not parse)",
        `JSON parse error: ${block.error}`,
        "Fix the JSON syntax; invalid structured data is ignored entirely.", "json",
        '{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Acme"\n}');
    } else {
      const types = jsonLdTypes(block.parsed);
      if (types.length === 0) {
        mk("SCHEMA-JSONLD-NOTYPE", "low", "JSON-LD block has no recognized @type",
          `Parsed JSON-LD without an @type: ${truncate(block.raw)}`,
          "Add an @type (Organization, Article, Product, FAQPage, BreadcrumbList…) appropriate to the route.", "json",
          '{ "@context": "https://schema.org", "@type": "WebPage", "name": "…" }');
      }
    }
  }
  if (raw.jsonLd.length === 0) {
    mk("SCHEMA-JSONLD-MISSING", "low", "No JSON-LD structured data",
      "No <script type=\"application/ld+json\"> on the page.",
      "Add structured data so search and AI engines can extract entities. Pick the type per route (Organization on home, BreadcrumbList on deep pages, Article/Product/FAQPage where relevant).", "html",
      '<script type="application/ld+json">\n{ "@context":"https://schema.org","@type":"Organization","name":"Acme","url":"https://acme.com" }\n</script>', "info");
  }

  // --- Broken attributes ---
  const broken = (rawHtml || "").match(/\b(?:href|src)\s*=\s*["'](?:tel:undefined|tel:null|javascript:void\(0\)|undefined|null|#)["']/gi) || [];
  const emptyAttr = (rawHtml || "").match(/\b(?:href|src)\s*=\s*["']\s*["']/gi) || [];
  if (broken.length || emptyAttr.length) {
    mk("ATTR-BROKEN", "low", `Broken/empty href or src (${broken.length + emptyAttr.length})`,
      [...broken.slice(0, 3), ...emptyAttr.slice(0, 2)].join("\n"),
      "Render real URLs or omit the attribute; placeholders like tel:undefined break links and crawls.", "jsx",
      "{phone ? <a href={`tel:${phone}`}>Call</a> : null}");
  }

  // --- Image alt (meaningful images) ---
  const missingAlt = raw.images.filter((i) => i.src && i.alt === null);
  if (missingAlt.length) {
    mk("ATTR-IMG-ALT", "low", `Images missing alt attribute (${missingAlt.length})`,
      missingAlt.slice(0, 3).map((i) => truncate(i.raw)).join("\n"),
      "Add alt text to meaningful images (empty alt=\"\" only for decorative ones).", "jsx",
      '<Image src="/chart.png" alt="Revenue grew 40% in Q3" width={800} height={400} />');
  }

  return out;
}

function truncate(s) {
  s = String(s).replace(/\s+/g, " ");
  return s.length > 120 ? s.slice(0, 117) + "…" : s;
}
