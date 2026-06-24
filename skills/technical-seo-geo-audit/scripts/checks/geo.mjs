// F. GEO — Generative Engine Optimization (AI / LLM visibility layer).
// AI-crawler access, llms.txt, SSR delivery to non-JS agents, machine-extractable
// answers, and clean attribution. Technical only — no content/tone advice.
import { finding } from "../lib/findings.mjs";
import { jsonLdTypes, isLikelyClientApp } from "../lib/html.mjs";

const CAT = "geo";

// AI/LLM crawlers worth knowing the access posture for.
const AI_BOTS = ["GPTBot", "ClaudeBot", "anthropic-ai", "PerplexityBot", "Google-Extended", "CCBot", "Bytespider"];
// Schema types that expose a directly citable answer.
const ANSWER_TYPES = ["FAQPage", "QAPage", "HowTo", "Article", "NewsArticle", "BlogPosting"];

/** Parse robots.txt into { agent(lowercased) -> { disallow:[], allow:[] } }, with '*' for the default group. */
function parseRobots(text) {
  const groups = {};
  let current = [];
  for (const line of (text || "").split(/\r?\n/)) {
    const l = line.replace(/#.*$/, "").trim();
    if (!l) continue;
    const ua = l.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      const agent = ua[1].trim().toLowerCase();
      if (!groups[agent]) groups[agent] = { disallow: [], allow: [] };
      current = [groups[agent]];
      continue;
    }
    const dis = l.match(/^disallow:\s*(.*)$/i);
    if (dis && current.length) current.forEach((g) => g.disallow.push(dis[1].trim()));
    const al = l.match(/^allow:\s*(.*)$/i);
    if (al && current.length) current.forEach((g) => g.allow.push(al[1].trim()));
  }
  return groups;
}

export function site(siteCtx) {
  const out = [];
  const { robots, llms } = siteCtx;
  const groups = parseRobots(robots.text);

  const blocked = [];
  for (const bot of AI_BOTS) {
    const g = groups[bot.toLowerCase()];
    if (g && g.disallow.includes("/")) blocked.push(bot);
  }
  if (blocked.length) {
    out.push(finding({
      id: "GEO-AIBOT-BLOCKED", category: CAT, scope: "site",
      severity: blocked.some((b) => /gptbot|claudebot|perplexitybot|google-extended/i.test(b)) ? "high" : "medium",
      title: `AI crawlers blocked in robots.txt: ${blocked.join(", ")}`,
      evidence: blocked.map((b) => `User-agent: ${b} → Disallow: /`).join("\n"),
      recommendation:
        "If you want these pages cited in AI answers, allow the relevant bots. Blocking is a legitimate choice — confirm it is intentional, not an accidental Disallow.",
      fixLang: "text",
      fixSnippet: "User-agent: GPTBot\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /",
    }));
  }

  if (!llms?.["llms.txt"]?.present && !llms?.["llms-full.txt"]?.present) {
    out.push(finding({
      id: "GEO-LLMSTXT-MISSING", category: CAT, scope: "site", severity: "low",
      title: "No llms.txt at the site root",
      evidence: `GET /llms.txt → ${llms?.["llms.txt"]?.status ?? "n/a"}; /llms-full.txt → ${llms?.["llms-full.txt"]?.status ?? "n/a"}`,
      recommendation:
        "Publish an llms.txt index pointing AI assistants to your key pages and machine-readable docs. It is an emerging convention, hence low severity.",
      fixLang: "markdown",
      fixSnippet: "# Acme\n\n> One-line description of the product.\n\n## Docs\n- [Getting started](https://acme.com/docs/start): setup guide\n- [API reference](https://acme.com/docs/api): endpoints",
    }));
  }

  return out;
}

export function page(pageCtx) {
  const out = [];
  const { page, raw, rendered, rawHtml } = pageCtx;
  if (!raw) return out;
  const route = page.route || page.url;

  // SSR delivery to non-JS agents. RENDER-SSR-EMPTY already covers the case where
  // a rendered DOM confirmed the gap (it counts toward the GEO score via the
  // rendering category). Here we cover the case where NO rendered DOM was available
  // and the raw HTML looks like an empty client-app shell — an AI-visibility risk.
  if (!rendered && (raw.textLength || 0) < 200 && isLikelyClientApp(rawHtml, raw)) {
    out.push(finding({
      id: "GEO-SSR-INVISIBLE", category: CAT, scope: "page", page: route, severity: "medium",
      title: "Primary content likely invisible to non-JS AI crawlers",
      evidence: `Raw HTML visible text = ${raw.textLength || 0} chars. Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do not execute JavaScript.`,
      recommendation: "Server-render the main content so it ships in the HTML response that AI crawlers fetch.",
      fixLang: "jsx",
      fixSnippet: "// Server-render content; reserve client components for interactivity\nexport default async function Page() {\n  const data = await getData();\n  return <main><Answer data={data} /></main>;\n}",
    }));
  }

  // Machine-extractable answer present only after JS.
  if (rendered) {
    const rawTypes = new Set(raw.jsonLd.flatMap((b) => (b.parsed ? jsonLdTypes(b.parsed) : [])));
    const renderedTypes = new Set(rendered.jsonLd.flatMap((b) => (b.parsed ? jsonLdTypes(b.parsed) : [])));
    const jsOnlyAnswer = ANSWER_TYPES.filter((t) => renderedTypes.has(t) && !rawTypes.has(t));
    if (jsOnlyAnswer.length) {
      out.push(finding({
        id: "GEO-ANSWER-JS-ONLY", category: CAT, scope: "page", page: route, severity: "medium",
        title: `Answer schema only in rendered DOM: ${jsOnlyAnswer.join(", ")}`,
        evidence: `${jsOnlyAnswer.join(", ")} JSON-LD exists after JS but not in raw HTML — AI crawlers won't see it.`,
        recommendation: "Emit answer/FAQ structured data server-side so it is present in the initial HTML.",
        fixLang: "html",
        fixSnippet: '<script type="application/ld+json">{ "@context":"https://schema.org","@type":"FAQPage","mainEntity":[…] }</script>',
      }));
    }
  }

  return out;
}
