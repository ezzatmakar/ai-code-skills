# Severity, scoring & ID rubric

How findings are rated and how the two scores are computed. The engine
(`scripts/lib/findings.mjs`) and the human review layer apply this identically, so
the same site always yields the same numbers.

## Severity

| Severity | Meaning | Example |
|---|---|---|
| `critical` | The page (or site) cannot be reliably indexed or seen by AI crawlers at all. | Empty SSR shell; `Disallow: /`; canonical → staging host. |
| `high` | A defect that materially blocks indexing, ranking, or AI citation of the page. | `noindex` on a live page; missing `<title>`; major AI crawler blocked. |
| `medium` | A real technical issue that degrades search/AI performance under normal conditions. | Poor LCP; missing description/viewport; invalid JSON-LD; redirect chains. |
| `low` | Localized issue or worthwhile optimization with low urgency. | Missing canonical; no Twitter card; one missing `alt`; orphan page. |
| `info` | Could **not** be measured, or context the developer should confirm. Never penalises the score. | CWV not measured (no Lighthouse/PSI); static-mode notice. |

## Status

Each finding carries a `status`:

- `fail` — a substantiated defect. **Only `fail` findings reduce a score.**
- `info` — not measured or informational. Surfaced for transparency; **zero** score impact.
- `pass` — verified good (rarely emitted; never penalises).

**Never assert a `pass`/`fail` a check did not actually verify.** If Playwright/MCP
or PSI were unavailable, the relevant rendering/CWV checks must be `info`
("not measured"), not a guessed pass.

## Core Web Vitals thresholds (Google)

| Metric | Good (≤) | Poor (>) | Severity if "needs improvement" / "poor" |
|---|---|---|---|
| LCP | 2500 ms | 4000 ms | medium / high |
| CLS | 0.10 | 0.25 | medium / high |
| INP | 200 ms | 500 ms | medium / high |
| TTFB | 800 ms | 1800 ms | medium / high |

## Scoring

Two independent scores, each starting at **100** and reduced by the penalty of every
`fail` finding in its bucket, clamped to `0–100`:

```
penalty:  critical −20   high −10   medium −4   low −1   info 0

SEO score buckets:  crawlability + rendering + performance + metadata + semantics
GEO score buckets:  generative-engine (geo) + rendering
```

Rendering/SSR feeds **both** scores: content that only exists after JS hydration hurts
search indexing and AI citation equally.

### Bands

| Score | Band |
|---|---|
| 90–100 | A — Excellent |
| 75–89 | B — Good |
| 60–74 | C — Needs work |
| 40–59 | D — Poor |
| 0–39 | F — Critical |

The overall verdict headline is keyed off the **lower** of the two scores, plus any
critical/high counts.

## Check-ID scheme

IDs are **stable strings** (not incrementing numbers) so reports diff cleanly across
runs. Prefix groups the category; the suffix names the specific check.

| Prefix | Category | Bucket |
|---|---|---|
| `CRAWL-`, `INDEX-`, `CANONICAL-`, `HTTP-` | Crawlability & indexability | SEO |
| `RENDER-` | Rendering / SSR | SEO + GEO |
| `CWV-`, `PERF-`, `IMG-`, `FONT-` | Performance / Core Web Vitals | SEO |
| `META-`, `SCHEMA-`, `ATTR-` | Metadata & structured data | SEO |
| `SEM-`, `LINK-` | Semantic HTML & linking | SEO |
| `GEO-` | Generative Engine Optimization | GEO |
| `STATIC-` | Codebase-mode static findings | per category |

See [seo-checks.md](seo-checks.md) and [geo-checks.md](geo-checks.md) for the full
catalog with pass/fail criteria and fix snippets.
