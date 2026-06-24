// B. Rendering / SSR — the highest-priority defect for both SEO and GEO.
// Diffs the RAW HTML (what a non-JS bot sees) against the fully rendered DOM.
import { finding } from "../lib/findings.mjs";
import { isLikelyClientApp } from "../lib/html.mjs";

const CAT = "rendering";

// A page whose raw HTML carries almost no primary text is an empty SSR shell.
const MIN_RAW_TEXT = 200;        // chars of visible text in raw <main>/<body>
const MISSING_PCT_FAIL = 0.6;    // ≥60% of rendered text missing from raw → fail

export function page(pageCtx) {
  const out = [];
  const { page, raw, rendered, rawHtml } = pageCtx;
  const route = page.route || page.url;
  if (!raw) return out;

  const rawLen = raw.textLength || 0;

  if (!rendered) {
    // No rendered DOM was supplied (no MCP / Playwright). Report what we CAN see, but
    // never assert SSR is fine. Only call something "client-rendered" when the raw HTML
    // actually looks like an app shell — a genuinely short static page is not a defect.
    if (rawLen < MIN_RAW_TEXT && isLikelyClientApp(rawHtml, raw)) {
      out.push(finding({
        id: "RENDER-CLIENT-ONLY-DATA", category: CAT, scope: "page", page: route, severity: "high",
        title: "Raw HTML is an empty app shell (client-rendered)",
        evidence: `Raw <main>/<body> visible text = ${rawLen} chars with an empty mount node / JS bundle and no server-rendered content. No rendered DOM available to confirm the full payload.`,
        recommendation:
          "Server-render or statically generate primary content so non-JS crawlers receive it. In Next.js, keep the page a Server Component / use generateStaticParams; avoid fetching the main content only in a client useEffect.",
        fixLang: "jsx",
        fixSnippet:
          "// Server Component: data is in the HTML response, not fetched on the client\nexport default async function Page() {\n  const items = await getItems();\n  return <main>{items.map((i) => <Article key={i.id} {...i} />)}</main>;\n}",
      }));
    } else {
      out.push(finding({
        id: "RENDER-NOT-MEASURED", category: CAT, scope: "page", page: route, severity: "info", status: "info",
        title: "Rendered-vs-raw diff not measured",
        evidence: `Raw visible text = ${rawLen} chars${rawLen < MIN_RAW_TEXT ? " (short, but structured content is present)" : ""}. No rendered DOM (chrome-devtools MCP / Playwright) was available to confirm SSR parity.`,
        recommendation: "Re-run with the chrome-devtools MCP server or Playwright installed to confirm SSR parity.",
      }));
    }
    return out;
  }

  const renderedLen = rendered.textLength || 0;
  const missing = renderedLen > 0 ? Math.max(0, (renderedLen - rawLen) / renderedLen) : 0;

  if (rawLen < MIN_RAW_TEXT && renderedLen >= MIN_RAW_TEXT) {
    out.push(finding({
      id: "RENDER-SSR-EMPTY", category: CAT, scope: "page", page: route, severity: "critical",
      title: "Empty SSR shell — primary content only appears after JS",
      evidence: `Raw visible text = ${rawLen} chars; rendered = ${renderedLen} chars. The HTML response is an empty shell.`,
      recommendation:
        "Server-render the main content. Non-JS bots and most AI crawlers never execute JS, so this content is invisible to search and AI answers.",
      fixLang: "jsx",
      fixSnippet:
        "// Move data fetching to the server so it ships in the HTML\nexport default async function Page() {\n  const data = await fetchData();   // runs on the server\n  return <main><Content data={data} /></main>;\n}",
    }));
  } else if (missing >= MISSING_PCT_FAIL && renderedLen - rawLen > MIN_RAW_TEXT) {
    out.push(finding({
      id: "RENDER-CONTENT-MISSING-PCT", category: CAT, scope: "page", page: route,
      severity: missing >= 0.8 ? "high" : "medium",
      title: `${Math.round(missing * 100)}% of primary content missing from raw HTML`,
      evidence: `Raw visible text = ${rawLen} chars; rendered = ${renderedLen} chars (${Math.round(missing * 100)}% added by JS).`,
      recommendation:
        "Server-render the sections that currently hydrate on the client so crawlers receive them in the initial HTML.",
      fixLang: "jsx",
      fixSnippet:
        "// Prefer Server Components / SSR for content sections;\n// reserve client components for interactivity only.",
    }));
  }

  return out;
}
