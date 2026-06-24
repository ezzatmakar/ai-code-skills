# GEO check catalog (category F) — Generative Engine Optimization

GEO is the AI-visibility layer: how well ChatGPT, Claude, Perplexity, and Gemini can
**crawl, parse, and cite** the site. This is purely technical (crawler access, SSR
delivery to non-JS agents, machine-readable structure, clean attribution) — **not**
content tone or keyword targeting.

Key fact that drives most GEO findings: **most AI crawlers do not execute JavaScript.**
Anything that only exists in the rendered DOM is invisible to them. So the rendering/SSR
checks in [seo-checks.md](seo-checks.md#b-rendering--ssr--highest-priority) are also the
backbone of GEO — `RENDER-*` findings count toward the GEO score.

Severities and scoring: see [severity-rubric.md](severity-rubric.md).

---

## `GEO-AIBOT-BLOCKED` — medium/high (site)

**Fail:** `robots.txt` blocks an AI crawler with `Disallow: /`. The engine checks:

| Bot | Operator |
|---|---|
| `GPTBot` | OpenAI (ChatGPT browsing / training) |
| `ClaudeBot`, `anthropic-ai` | Anthropic |
| `PerplexityBot` | Perplexity |
| `Google-Extended` | Google (Gemini / AI training) |
| `CCBot` | Common Crawl (feeds many models) |
| `Bytespider` | ByteDance |

Severity is **high** when a major answer engine (GPTBot/ClaudeBot/PerplexityBot/
Google-Extended) is blocked, otherwise medium. Blocking can be a legitimate business
choice — the finding asks you to **confirm it is intentional**, not accidental.

**Fix — allow the bots you want cited:**
```text
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /
```

---

## `GEO-LLMSTXT-MISSING` — low (site)

**Fail:** no `llms.txt` (or `llms-full.txt`) at the site root. `llms.txt` is an emerging
convention: a Markdown index that points AI assistants at your key pages and
machine-readable docs. Low severity because adoption is still early.

**Fix — `/llms.txt`:**
```markdown
# Acme

> One-line description of the product.

## Docs
- [Getting started](https://acme.com/docs/start): setup guide
- [API reference](https://acme.com/docs/api): endpoints and auth
```

---

## `GEO-SSR-INVISIBLE` — medium (page)

**Fail:** raw HTML visible text < 200 chars **and no rendered DOM was available** to
confirm parity. The primary content is likely invisible to non-JS AI crawlers. (When a
rendered DOM *is* available and confirms the gap, `RENDER-SSR-EMPTY` fires instead and
already counts toward GEO.)

**Fix:** server-render the main content so it ships in the HTML response AI crawlers fetch.
```jsx
export default async function Page() {
  const data = await getData();           // server-side
  return <main><Answer data={data} /></main>;
}
```

---

## `GEO-ANSWER-JS-ONLY` — medium (page)

**Fail:** answer/QA structured data (`FAQPage`, `QAPage`, `HowTo`, `Article`,
`NewsArticle`, `BlogPosting`) exists in the rendered DOM but **not** in the raw HTML —
so the citable answer is invisible to AI crawlers.

**Fix — emit the schema server-side:**
```html
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"FAQPage","mainEntity":[
  { "@type":"Question","name":"…","acceptedAnswer":{ "@type":"Answer","text":"…" } }
] }
</script>
```

---

## Supporting signals (covered by SEO checks, important for GEO)

These are emitted under their SEO IDs but matter just as much for AI citation — call
them out in the GEO narrative when present:

- **SSR delivery** — `RENDER-SSR-EMPTY`, `RENDER-CONTENT-MISSING-PCT`,
  `RENDER-CLIENT-ONLY-DATA` (the content AI engines can actually read).
- **Machine-extractable structure** — `SCHEMA-JSONLD-*` and `SEM-*` (clean semantic DOM
  lets an LLM lift a citable answer).
- **Correct attribution** — `CANONICAL-*` (AI engines should attribute the canonical URL,
  not a duplicate).
- **Crawl budget** — `CWV-TTFB` (slow first byte wastes limited AI-crawler budget).

---

## Reporting bar

- Confirm bot-access intent before treating a block as a defect — surface it, explain the
  trade-off, give the fix.
- Frame SSR findings for AI bots explicitly ("most AI crawlers don't run JS").
- No content/tone advice. GEO here is delivery and structure, not what the copy says.
