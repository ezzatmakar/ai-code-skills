// Codebase mode — static analysis of framework files for SEO/GEO defects that
// are visible without a running server. Best-effort; URL mode is more complete.
// Every finding here is explicitly a "static" finding.
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { finding } from "./lib/findings.mjs";

const IGNORE = new Set(["node_modules", ".next", ".nuxt", "dist", "build", ".git", "out", "coverage", ".vercel"]);
const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".mjs"]);

async function walk(root, cap = 4000) {
  const files = [];
  const stack = [root];
  while (stack.length && files.length < cap) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".") {
        if (IGNORE.has(e.name)) continue;
      }
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE.has(e.name)) stack.push(full);
      } else if (SRC_EXT.has(path.extname(e.name))) {
        files.push(full);
      }
    }
  }
  return files;
}

async function detectFramework(root) {
  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) return "Next.js";
    if (deps.nuxt || deps["nuxt3"]) return "Nuxt";
    if (deps["@remix-run/react"]) return "Remix";
    if (deps.astro) return "Astro";
    if (deps.react) return "React (SPA)";
    if (deps.vue) return "Vue (SPA)";
  } catch { /* no package.json */ }
  return "generic";
}

export async function analyzeCodebase(root) {
  const framework = await detectFramework(root);
  const findings = [];
  const rel = (f) => path.relative(root, f) || f;

  // --- Site-level: robots / sitemap presence ---
  const hasRobots =
    existsSync(path.join(root, "public/robots.txt")) ||
    findGlob(root, ["app/robots.ts", "app/robots.js", "src/app/robots.ts", "src/app/robots.js"]);
  const hasSitemap =
    existsSync(path.join(root, "public/sitemap.xml")) ||
    findGlob(root, ["app/sitemap.ts", "app/sitemap.js", "src/app/sitemap.ts", "src/app/sitemap.js"]);

  if (!hasRobots) {
    findings.push(finding({
      id: "STATIC-ROBOTS-MISSING", category: "crawlability", scope: "site", severity: "medium",
      title: "No robots source found (static)",
      evidence: "Neither public/robots.txt nor an app/robots.ts route was found.",
      recommendation: "Add a robots route or static file that allows crawling and references the sitemap.",
      fixLang: "ts",
      fixSnippet: "// app/robots.ts\nexport default function robots() {\n  return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://example.com/sitemap.xml' };\n}",
    }));
  }
  if (!hasSitemap) {
    findings.push(finding({
      id: "STATIC-SITEMAP-MISSING", category: "crawlability", scope: "site", severity: "medium",
      title: "No sitemap source found (static)",
      evidence: "Neither public/sitemap.xml nor an app/sitemap.ts route was found.",
      recommendation: "Add a sitemap route enumerating canonical URLs.",
      fixLang: "ts",
      fixSnippet: "// app/sitemap.ts\nexport default async function sitemap() {\n  return [{ url: 'https://example.com', lastModified: new Date() }];\n}",
    }));
  }

  // --- File-level scans ---
  const files = await walk(root);
  let hasRootMetadata = false;

  for (const f of files) {
    let src = "";
    try {
      src = await readFile(f, "utf8");
    } catch {
      continue;
    }
    const name = rel(f);

    if (/\bexport\s+(const\s+metadata|async\s+function\s+generateMetadata)\b/.test(src)) hasRootMetadata = true;

    // next/image (or <Image) without width/height
    const imgTags = src.match(/<Image\b[^>]*>/g) || [];
    for (const tag of imgTags) {
      if (!/\bwidth\b/.test(tag) || !/\bheight\b/.test(tag)) {
        if (!/\bfill\b/.test(tag)) {
          findings.push(finding({
            id: "STATIC-IMG-NO-DIMENSIONS", category: "performance", scope: "page", page: name, severity: "low",
            title: "next/image without width/height (CLS risk, static)",
            evidence: trunc(tag),
            recommendation: "Pass width and height (or use `fill` with a sized container) to reserve layout space.",
            fixLang: "jsx",
            fixSnippet: '<Image src={src} width={1200} height={630} alt="…" />',
          }));
          break; // one per file is enough signal
        }
      }
    }

    // Hard-coded non-prod canonical / metadataBase
    if (/metadataBase\s*:\s*new URL\(\s*["'](http:\/\/localhost|https?:\/\/[^"']*(staging|preview|vercel\.app))/i.test(src)) {
      findings.push(finding({
        id: "STATIC-CANONICAL-ENV", category: "crawlability", scope: "page", page: name, severity: "high",
        title: "metadataBase points at a non-production host (static)",
        evidence: trunc((src.match(/metadataBase\s*:\s*new URL\([^)]*\)/) || [""])[0]),
        recommendation: "Derive metadataBase from an env var so prod canonicals never point at localhost/staging.",
        fixLang: "ts",
        fixSnippet: "export const metadata = {\n  metadataBase: new URL(process.env.SITE_URL ?? 'https://www.example.com'),\n};",
      }));
    }

    // Client page that fetches its primary data on the client
    const isPage = /(^|\/)(page|index)\.(t|j)sx?$/.test(name) || /(^|\/)pages\//.test(name);
    if (isPage && /^["']use client["']/m.test(src) && /\buseEffect\([^)]*\)\s*=>\s*{[\s\S]*?\bfetch\(/.test(src)) {
      findings.push(finding({
        id: "STATIC-CLIENT-PAGE", category: "rendering", scope: "page", page: name, severity: "high",
        title: "Page fetches primary data on the client (static)",
        evidence: "'use client' page fetches data inside useEffect — that content is not in the SSR HTML.",
        recommendation: "Fetch primary content in a Server Component (or getServerSideProps/getStaticProps) so crawlers receive it.",
        fixLang: "jsx",
        fixSnippet: "// Server Component\nexport default async function Page() {\n  const data = await getData();\n  return <main><Content data={data} /></main>;\n}",
      }));
    }
  }

  if ((framework === "Next.js") && !hasRootMetadata) {
    findings.push(finding({
      id: "STATIC-META-MISSING", category: "metadata", scope: "site", severity: "medium",
      title: "No metadata/generateMetadata export found (static)",
      evidence: "No `export const metadata` or `generateMetadata` was found in the scanned files.",
      recommendation: "Export metadata (title/description/openGraph) from the root layout and per-route segments.",
      fixLang: "ts",
      fixSnippet: "// app/layout.tsx\nexport const metadata = {\n  title: { default: 'Acme', template: '%s — Acme' },\n  description: 'What Acme does.',\n  metadataBase: new URL('https://www.acme.com'),\n};",
    }));
  }

  findings.push(finding({
    id: "STATIC-MODE-NOTE", category: "rendering", scope: "site", severity: "info", status: "info",
    title: "Static analysis only — run URL mode for rendering, CWV, and live HTTP checks",
    evidence: `Framework detected: ${framework}. Codebase mode cannot measure rendered DOM, Core Web Vitals, or live HTTP/redirect behaviour.`,
    recommendation: "Deploy a preview and re-run with --url to capture the rendering diff and Core Web Vitals.",
  }));

  return { findings, framework };
}

function findGlob(root, candidates) {
  return candidates.some((c) => existsSync(path.join(root, c)));
}
function trunc(s) {
  s = String(s).replace(/\s+/g, " ");
  return s.length > 140 ? s.slice(0, 137) + "…" : s;
}
