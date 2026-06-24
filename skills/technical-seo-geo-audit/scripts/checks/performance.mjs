// C. Performance / Core Web Vitals — CWV thresholds, render-blocking resources,
// image and font hygiene. CWV come from pageCtx.cwv (chrome-devtools lighthouse
// or PageSpeed Insights); when absent they are reported as "not measured" (info).
import { finding } from "../lib/findings.mjs";

const CAT = "performance";

// Google "good / needs-improvement / poor" thresholds.
const CWV = {
  lcp: { good: 2500, poor: 4000, unit: "ms", label: "LCP" },
  cls: { good: 0.1, poor: 0.25, unit: "", label: "CLS" },
  inp: { good: 200, poor: 500, unit: "ms", label: "INP" },
  ttfb: { good: 800, poor: 1800, unit: "ms", label: "TTFB" },
};

function cwvSeverity(metric, value) {
  const t = CWV[metric];
  if (value <= t.good) return null;
  return value <= t.poor ? "medium" : "high";
}

export function page(pageCtx) {
  const out = [];
  const { page, raw, cwv } = pageCtx;
  const route = page.route || page.url;

  // --- Core Web Vitals ---
  const id = { lcp: "CWV-LCP", cls: "CWV-CLS", inp: "CWV-INP", ttfb: "CWV-TTFB" };
  if (cwv) {
    for (const metric of ["lcp", "cls", "inp", "ttfb"]) {
      const value = cwv[metric];
      if (value == null) continue;
      const sev = cwvSeverity(metric, value);
      if (sev) {
        out.push(finding({
          id: id[metric], category: CAT, scope: "page", page: route, severity: sev,
          title: `${CWV[metric].label} ${value}${CWV[metric].unit} exceeds the "good" threshold`,
          evidence: `${CWV[metric].label}=${value}${CWV[metric].unit} (good ≤ ${CWV[metric].good}${CWV[metric].unit}, poor > ${CWV[metric].poor}${CWV[metric].unit}) — source: ${cwv.source || "unknown"}`,
          recommendation: cwvFix(metric).text,
          fixLang: cwvFix(metric).lang,
          fixSnippet: cwvFix(metric).snippet,
        }));
      }
    }
  } else if (page.ttfbMs != null) {
    // Fall back to the crawler's own TTFB measurement (network-only, no field data).
    const sev = cwvSeverity("ttfb", page.ttfbMs);
    if (sev) {
      out.push(finding({
        id: "CWV-TTFB", category: CAT, scope: "page", page: route, severity: sev,
        title: `Slow TTFB ${page.ttfbMs}ms (crawler-measured)`,
        evidence: `Time to first byte ≈ ${page.ttfbMs}ms (single fetch, no field data). Good ≤ 800ms.`,
        recommendation: "Cache HTML at the edge / use ISR or SSG so the document streams quickly; slow TTFB also wastes AI-crawler budget.",
        fixLang: "js",
        fixSnippet: "// Next.js: export const revalidate = 3600  // ISR\n// or set Cache-Control: s-maxage at the CDN",
      }));
    }
    out.push(finding({
      id: "CWV-NOT-MEASURED", category: CAT, scope: "page", page: route, severity: "info", status: "info",
      title: "Lab/field Core Web Vitals not measured",
      evidence: "No Lighthouse (chrome-devtools MCP) or PageSpeed Insights data supplied; only network TTFB is available.",
      recommendation: "Re-run with the chrome-devtools MCP server or a --psi-key to capture LCP/CLS/INP.",
    }));
  }

  if (!raw) return out;

  // --- Render-blocking resources ---
  if (raw.blockingScripts > 0 || raw.syncStylesheets > 0) {
    out.push(finding({
      id: "PERF-RENDER-BLOCKING", category: CAT, scope: "page", page: route,
      severity: raw.blockingScripts > 0 ? "medium" : "low",
      title: `Render-blocking resources in <head> (${raw.blockingScripts} script(s), ${raw.syncStylesheets} stylesheet(s))`,
      evidence: `Synchronous <script src> without async/defer: ${raw.blockingScripts}; blocking stylesheets: ${raw.syncStylesheets}.`,
      recommendation: "Defer non-critical JS and inline/critical-path CSS; load third-party tags (GTM) asynchronously.",
      fixLang: "html",
      fixSnippet: '<script src="/app.js" defer></script>\n<!-- third-party: load async -->\n<script src="https://www.googletagmanager.com/gtm.js" async></script>',
    }));
  }

  // --- Images ---
  for (const img of raw.images) {
    if (!img.src) continue;
    const where = shorten(img.src);
    if (!img.width || !img.height) {
      out.push(finding({
        id: "IMG-NO-DIMENSIONS", category: CAT, scope: "page", page: route, severity: "low",
        title: "Image without width/height (CLS risk)",
        evidence: `${img.raw.slice(0, 120)}`,
        recommendation: "Set explicit width and height (or use next/image, which reserves space) to prevent layout shift.",
        fixLang: "jsx",
        fixSnippet: `<Image src="${where}" width={1200} height={630} alt="…" />`,
      }));
    }
    const w = oversizedWidth(img.src);
    if (w && w >= 2000 && !img.srcset) {
      out.push(finding({
        id: "IMG-OVERSIZED", category: CAT, scope: "page", page: route, severity: "medium",
        title: `Oversized image request (~${w}px wide, no srcset)`,
        evidence: `${shorten(img.src)} requested at width ${w} with no responsive srcset/sizes.`,
        recommendation: "Serve responsive sizes with srcset/sizes (or next/image) so mobile clients fetch smaller variants.",
        fixLang: "jsx",
        fixSnippet: `<Image src="/hero.jpg" sizes="(max-width:768px) 100vw, 1200px" width={1200} height={600} alt="…" />`,
      }));
    }
  }

  // --- Fonts ---
  if (/@font-face/i.test(pageCtx.rawHtml || "") && !/font-display\s*:\s*(swap|optional)/i.test(pageCtx.rawHtml || "")) {
    out.push(finding({
      id: "FONT-NO-SWAP", category: CAT, scope: "page", page: route, severity: "low",
      title: "Web font without font-display: swap",
      evidence: "@font-face declared without font-display: swap/optional — text can stay invisible during load (FOIT).",
      recommendation: "Add font-display: swap and preload the LCP font.",
      fixLang: "css",
      fixSnippet: "@font-face { font-family: Inter; src: url(/inter.woff2) format('woff2'); font-display: swap; }",
    }));
  }
  if (raw.images.length && !raw.fontPreload && /@font-face/i.test(pageCtx.rawHtml || "")) {
    // best-effort: encourage preloading the key font
  }

  return out;
}

function cwvFix(metric) {
  switch (metric) {
    case "lcp":
      return { text: "Preload the LCP image/font, serve it from the edge, and avoid render-blocking resources above it.", lang: "html", snippet: '<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">' };
    case "cls":
      return { text: "Reserve space for images, ads, and embeds with explicit dimensions; avoid inserting content above existing content.", lang: "jsx", snippet: '<Image src="/hero.jpg" width={1200} height={600} alt="…" />' };
    case "inp":
      return { text: "Break up long tasks, defer non-critical JS, and avoid heavy work in event handlers.", lang: "js", snippet: "// yield to the main thread\nawait scheduler.yield?.();" };
    case "ttfb":
      return { text: "Cache HTML at the edge (ISR/SSG/CDN) so the document streams quickly.", lang: "js", snippet: "export const revalidate = 3600 // Next.js ISR" };
    default:
      return { text: "", lang: "", snippet: "" };
  }
}

function oversizedWidth(src) {
  const m = String(src).match(/[?&](?:w|width)=(\d{3,5})/i);
  return m ? Number(m[1]) : null;
}
function shorten(s) {
  return String(s).length > 80 ? String(s).slice(0, 77) + "…" : String(s);
}
