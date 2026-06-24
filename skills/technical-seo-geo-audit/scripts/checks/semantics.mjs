// E. Semantic HTML & internal linking (machine readability).
// One <h1>, logical heading order, landmark elements, orphan pages.
import { finding } from "../lib/findings.mjs";

const CAT = "semantics";

export function page(pageCtx) {
  const out = [];
  const { page, raw } = pageCtx;
  if (!raw) return out;
  const route = page.route || page.url;
  const mk = (id, severity, title, evidence, recommendation, fixLang, fixSnippet = "") =>
    out.push(finding({ id, category: CAT, scope: "page", page: route, severity, title, evidence, recommendation, fixLang, fixSnippet }));

  // Exactly one <h1>.
  if (raw.h1Count === 0) {
    mk("SEM-H1-MISSING", "medium", "No <h1> on the page",
      "0 <h1> elements found.",
      "Add a single descriptive <h1>; it anchors the page topic for crawlers and AI extraction.", "html",
      "<h1>Pricing</h1>");
  } else if (raw.h1Count > 1) {
    mk("SEM-H1-COUNT", "low", `Multiple <h1> elements (${raw.h1Count})`,
      `${raw.h1Count} <h1> elements: ${raw.headings.filter((h) => h.level === 1).map((h) => `"${h.text.slice(0, 30)}"`).join(", ")}`,
      "Use one <h1> per page; demote the others to <h2>/<h3>.", "html",
      "<h1>Primary topic</h1>\n<h2>Subsection</h2>");
  }

  // Heading order (no skipped levels going down the tree).
  let prev = 0, skip = null;
  for (const h of raw.headings) {
    if (prev && h.level > prev + 1) {
      skip = `h${prev} → h${h.level} ("${h.text.slice(0, 30)}")`;
      break;
    }
    prev = h.level;
  }
  if (skip) {
    mk("SEM-HEADING-ORDER", "low", "Skipped heading level",
      `Heading jumps ${skip} — outline is not sequential.`,
      "Don't skip levels; style with CSS instead of choosing heading tags by size.", "html",
      "<h2>Section</h2>\n<h3>Subsection</h3>");
  }

  // Landmark <main>.
  if (raw.landmarks.main === 0) {
    mk("SEM-LANDMARK-MISSING", "low", "No <main> landmark",
      `Landmarks — main:${raw.landmarks.main} nav:${raw.landmarks.nav} header:${raw.landmarks.header} footer:${raw.landmarks.footer}`,
      "Wrap primary content in <main> so parsers and assistive tech locate the core content.", "html",
      "<body>\n  <header>…</header>\n  <main>…primary content…</main>\n  <footer>…</footer>\n</body>");
  }

  return out;
}

// Orphan detection needs the whole crawl: pages discovered (sitemap/crawl) but
// not linked from any other crawled page.
export function site(siteCtx) {
  const out = [];
  const linked = siteCtx.linkedRoutes || new Set();
  for (const p of siteCtx.pages || []) {
    if (!p.ok) continue;
    const route = p.route || p.url;
    if (route === "/" ) continue; // home is the entry point
    if (!linked.has(normalize(route)) && !linked.has(normalize(p.url))) {
      out.push(finding({
        id: "LINK-ORPHAN-PAGE", category: CAT, scope: "site", severity: "low",
        title: `Orphan page: ${route}`,
        evidence: `${p.url} is in the crawl/sitemap but no crawled page links to it.`,
        recommendation: "Add at least one internal link from a relevant page so crawlers and users can reach it.",
        fixLang: "html",
        fixSnippet: `<a href="${route}">…</a>`,
      }));
    }
  }
  return out;
}

function normalize(r) {
  try {
    const u = new URL(r, "http://x");
    return (u.pathname || "/").replace(/\/+$/, "") || "/";
  } catch {
    return String(r).replace(/\/+$/, "") || "/";
  }
}
