# Technical SEO check catalog (categories A–E)

Developer-scope technical SEO only — crawlability, indexability, rendering,
performance, structured data, metadata, semantic HTML. **No content, keyword, or
editorial guidance.** Every check has a stable ID, a fail criterion, a severity, and
a code-level fix. The engine emits these automatically; use this catalog to interpret
results and to extend coverage by hand.

Severities and scoring: see [severity-rubric.md](severity-rubric.md).

---

## A. Crawlability & indexability

### `CRAWL-ROBOTS-MISSING` — medium (site)
**Fail:** `GET /robots.txt` is missing or empty.
**Fix:**
```text
User-agent: *
Allow: /

Sitemap: https://www.example.com/sitemap.xml
```

### `CRAWL-ROBOTS-DISALLOW-ALL` — critical (site)
**Fail:** the `User-agent: *` group contains `Disallow: /` — the whole site is blocked.
**Fix:** scope the disallow to private paths only; never block the whole site in prod.
```text
User-agent: *
Disallow: /admin/
Allow: /
```

### `CRAWL-ROBOTS-NO-SITEMAP` — low (site)
**Fail:** robots.txt has no `Sitemap:` directive. Add one so crawlers find every URL.

### `CRAWL-SITEMAP-INVALID` — medium (site)
**Fail:** no sitemap discovered (robots `Sitemap:` or `/sitemap.xml`), or it returns
non-200 / contains zero `<loc>` URLs. Ensure every `<loc>` is 200 and uses the
canonical host. Do not leak staging/preview URLs into the sitemap.

### `HTTP-4XX` / `HTTP-5XX` — high (page)
**Fail:** a crawled URL returns 4xx/5xx. Return 200 for live pages, `301` for moved,
`410` for permanently gone.

### `HTTP-REDIRECT-CHAIN` — medium (page)
**Fail:** ≥2 redirect hops to reach the final URL. Collapse to a single 301.
```nginx
location = /old-path { return 301 /final-path; }
```

### `HTTP-MIXED-CONTENT` — medium (page)
**Fail:** an `https` page references `http://` subresources. Load everything over https.

### `INDEX-NOINDEX` / `INDEX-XROBOTS-NOINDEX` — high (page)
**Fail:** a live page is `noindex` via `<meta name="robots">` or the `X-Robots-Tag`
header. Remove it for pages that should rank / be cited.
```html
<meta name="robots" content="index, follow">
```

### `CANONICAL-*` — low → critical (page)
- `CANONICAL-MISSING` (low): no `<link rel="canonical">`.
- `CANONICAL-MULTIPLE` (medium): more than one canonical.
- `CANONICAL-RELATIVE` (low): canonical is not an absolute https URL.
- `CANONICAL-MISMATCH` (high): canonical host ≠ page host.
- `CANONICAL-CROSSENV` (critical): production page canonicalises to localhost/staging/preview — this de-indexes prod.
```jsx
// Next.js: derive canonical from a production base URL
export const metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'https://www.example.com'),
  alternates: { canonical: '/pricing' },
};
```

### hreflang (when i18n)
If alternate-language pages exist, ensure `hreflang` links are reciprocal, use valid
language codes, and include `x-default`. (Surface as a manual finding when relevant.)

---

## B. Rendering / SSR — highest priority

The single most important defect for both SEO and GEO. The engine fetches each page
**raw** (plain HTTP, no JS) and compares against the **rendered DOM** (chrome-devtools
MCP or Playwright).

### `RENDER-SSR-EMPTY` — critical (page)
**Fail:** raw `<main>`/`<body>` visible text < 200 chars while the rendered DOM is
populated — an empty shell. Non-JS bots and most AI crawlers never see the content.
```jsx
// Move data fetching to the server so it ships in the HTML
export default async function Page() {
  const data = await fetchData(); // runs on the server
  return <main><Content data={data} /></main>;
}
```

### `RENDER-CONTENT-MISSING-PCT` — medium/high (page)
**Fail:** ≥60% (high at ≥80%) of rendered text is absent from raw HTML. Server-render
the sections that currently hydrate on the client.

### `RENDER-CLIENT-ONLY-DATA` — high (page)
**Fail:** raw HTML is near-empty and **no** rendered DOM was available to confirm —
a strong client-rendering signal. Server-render primary content.

### `RENDER-NOT-MEASURED` — info (page)
Raw HTML had content but no rendered DOM was captured, so SSR parity could not be
confirmed. Re-run with chrome-devtools MCP or Playwright.

---

## C. Performance / Core Web Vitals

### `CWV-LCP` / `CWV-CLS` / `CWV-INP` / `CWV-TTFB` — medium/high (page)
**Fail:** the metric exceeds Google's "good" threshold (see rubric). Source is
chrome-devtools Lighthouse, PSI field/lab, or (TTFB only) the crawler's own fetch.
```html
<!-- LCP: preload the hero, high priority -->
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
```
`CWV-NOT-MEASURED` (info) is emitted when no Lighthouse/PSI source is available.

### `PERF-RENDER-BLOCKING` — low/medium (page)
**Fail:** synchronous `<script src>` (no async/defer) or blocking stylesheets in
`<head>`. Defer non-critical JS; load third-party tags (GTM) async.
```html
<script src="/app.js" defer></script>
<script src="https://www.googletagmanager.com/gtm.js" async></script>
```

### `IMG-NO-DIMENSIONS` — low (page)
**Fail:** an `<img>` lacks `width`/`height` (CLS risk). Set explicit dimensions or use
`next/image`.

### `IMG-OVERSIZED` — medium (page)
**Fail:** an image is requested at ≥2000px wide with no `srcset`. Serve responsive sizes.
```jsx
<Image src="/hero.jpg" sizes="(max-width:768px) 100vw, 1200px" width={1200} height={600} alt="…" />
```

### `FONT-NO-SWAP` — low (page)
**Fail:** `@font-face` without `font-display: swap|optional` (FOIT risk).
```css
@font-face { font-family: Inter; src: url(/inter.woff2) format('woff2'); font-display: swap; }
```

---

## D. Metadata & structured data

### `META-TITLE-MISSING` — high · `META-TITLE-DUPLICATE` — medium (page)
**Fail:** missing/empty `<title>`, or the same title on multiple pages.
```jsx
export const metadata = { title: 'Pricing — Acme' };
```

### `META-DESC-MISSING` — medium · `META-DESC-DUPLICATE` — low (page)
**Fail:** missing or duplicated `<meta name="description">`.

### `META-VIEWPORT-MISSING` — medium (page)
**Fail:** no responsive viewport meta.
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### `META-OG-MISSING` — low · `META-TWITTER-MISSING` — low (page)
**Fail:** incomplete Open Graph (`og:title`/`og:image`) or missing `twitter:card`.
```html
<meta property="og:title" content="Pricing — Acme">
<meta property="og:image" content="https://acme.com/og/pricing.png">
<meta name="twitter:card" content="summary_large_image">
```

### `SCHEMA-JSONLD-INVALID` — medium · `SCHEMA-JSONLD-NOTYPE` — low · `SCHEMA-JSONLD-MISSING` — info (page)
**Fail:** JSON-LD that doesn't parse, has no recognized `@type`, or is absent. Recommend
the right type per route (Organization on home, BreadcrumbList, Article, Product,
FAQPage…). This is schema *plumbing*, never copy.
```html
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"Organization","name":"Acme","url":"https://acme.com" }
</script>
```

### `ATTR-BROKEN` — low · `ATTR-IMG-ALT` — low (page)
**Fail:** `href="tel:undefined"`, empty `href`/`src`, `javascript:void(0)` links, or
meaningful images with no `alt`. Render real URLs or omit the attribute; add alt to
meaningful images (`alt=""` only for decorative).

---

## E. Semantic HTML & internal linking

### `SEM-H1-MISSING` — medium · `SEM-H1-COUNT` — low (page)
**Fail:** zero `<h1>`, or more than one. Use exactly one descriptive `<h1>`.

### `SEM-HEADING-ORDER` — low (page)
**Fail:** heading levels skip (e.g. `h2 → h4`). Don't skip levels; style with CSS.

### `SEM-LANDMARK-MISSING` — low (page)
**Fail:** no `<main>` landmark. Wrap primary content in `<main>`.

### `LINK-ORPHAN-PAGE` — low (site)
**Fail:** a crawled/sitemap page that no other crawled page links to. Add at least one
internal link so crawlers and users can reach it.

---

## Reporting bar

- Report only what the checks actually verified. If rendering or CWV couldn't be
  measured, mark `info` ("not measured") — never a guessed pass.
- Every recommendation must ship a concrete code/config snippet.
- No content, tone, or keyword advice. If a check drifts into copywriting, drop it.
