# Technical SEO & GEO Audit — {{target}}

> Canonical report skeleton. `scripts/report.mjs` fills this automatically; the
> guidance layer refines the prose. Replace every `{{token}}` and delete this line.

| | |
|---|---|
| **Target** | {{target}} |
| **Date** | {{YYYY-MM-DD}} |
| **Mode** | {{Live URL | Codebase (static)}} |
| **Pages audited** | {{n}} |
| **Rendered DOM** | {{n/n rendered, via chrome-devtools MCP / Playwright | not measured}} |
| **Core Web Vitals** | {{n/n, via Lighthouse / PSI | not measured}} |
| **Tooling** | {{node version, engine version}} |

## Executive Summary

- **SEO score:** {{0-100}}/100 ({{band}})
- **GEO score:** {{0-100}}/100 ({{band}})
- **Findings:** {{c}} Critical · {{h}} High · {{m}} Medium · {{l}} Low · {{i}} Info

{{5–8 line plain-English verdict: overall health for search and AI engines, the
biggest risks, and what to fix first. Keep it technical and specific.}}

## Site-Wide Findings

> Issues that are not page-specific: robots, sitemap, host/redirect policy, AI-bot
> access, llms.txt. Sorted by severity. Use `_No substantiated site-wide findings._`
> when empty.

**{{badge}} · `{{CHECK-ID}}` — {{title}}**

**Why it matters:** {{technical reason}}

**Evidence:**
```text
{{the actual directive / header / value found}}
```

**Recommendation:** {{what to change}}

```{{lang}}
{{copy-pasteable fix}}
```

---

## Per-Page Findings

> One subsection per route — **labeled by route** (hard requirement). Each starts with
> a scorecard line (CWV verdict + finding counts), then findings sorted by severity.

### `{{/route}}` — {{Page label}}

*CWV: LCP {{v}} / CLS {{v}} / INP {{v}} / TTFB {{v}} · Findings: {{counts}}*

**{{badge}} · `{{CHECK-ID}}` — {{title}}**

**Why it matters:** {{what's wrong + why it matters technically}}

**Evidence:**
```text
{{the selector / attribute / measurement found}}
```

**Recommendation:** {{the fix}}

```{{lang}}
{{framework-appropriate code fix — Next.js metadata, next/image, JSON-LD, nginx/CF header, robots directive, …}}
```

---

## Quick-Win Checklist

> Top fixes ordered by impact / effort.

- [ ] **{{Severity}}** {{site-wide | `/route`}} · `{{CHECK-ID}}` — {{title}}

## Appendix / Methodology

- **What was measured:** raw HTML fetch for every page; rendered DOM: {{status}};
  Core Web Vitals: {{status}}.
- **Thresholds:** Core Web Vitals use Google good/poor cut-offs (LCP 2.5s/4s, CLS
  0.1/0.25, INP 200ms/500ms, TTFB 0.8s/1.8s). Scoring: start 100, subtract Critical −20
  / High −10 / Medium −4 / Low −1, clamped 0–100. SEO = crawlability + rendering +
  performance + metadata + semantics; GEO = generative-engine + rendering.
- **Not measured items** are reported as `Info`, never asserted as passing.
- **Re-run:** `node scripts/run.mjs --url {{target}} --max-pages {{n}} --rendered-dir <dir>`
