// Focused, dependency-free HTML parsing for the specific things the checks need.
//
// Regex/string scanning is imperfect for arbitrary HTML, so every value here is
// treated as a heuristic by the checks (never as ground truth for a "pass").
// If `cheerio` is installed it is used only to improve visible-text extraction.

let cheerio = null;
try {
  ({ load: cheerio } = await import("cheerio"));
} catch {
  cheerio = null;
}

/** Parse a single attribute value out of an opening tag string. */
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s">]+))`, "i"));
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}

/** All opening tags of a given name, returned as their raw tag strings. */
function tags(html, name) {
  const re = new RegExp(`<${name}\\b[^>]*>`, "gi");
  return html.match(re) || [];
}

/** Strip <script>/<style>/comments and all tags, collapse whitespace → visible text. */
export function stripTags(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  s = s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return s.replace(/\s+/g, " ").trim();
}

function sectionInner(html, name) {
  const m = html.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? m[1] : null;
}

/** Visible text of <body> (or whole doc), using cheerio when available. */
export function visibleText(html) {
  if (cheerio) {
    try {
      const $ = cheerio(html);
      $("script,style,noscript,template").remove();
      const body = $("body");
      return (body.length ? body.text() : $.root().text()).replace(/\s+/g, " ").trim();
    } catch {
      /* fall through to regex */
    }
  }
  const body = sectionInner(html, "body");
  return stripTags(body ?? html);
}

/** Parse everything the checks need from one HTML document. */
export function parseHtml(html) {
  html = html || "";

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : null;

  const htmlTag = (html.match(/<html\b[^>]*>/i) || [""])[0];
  const htmlLang = attr(htmlTag, "lang");

  const metas = tags(html, "meta").map((t) => ({
    raw: t,
    name: (attr(t, "name") || "").toLowerCase(),
    property: (attr(t, "property") || "").toLowerCase(),
    httpEquiv: (attr(t, "http-equiv") || "").toLowerCase(),
    content: attr(t, "content"),
  }));
  const metaByName = {};
  const og = {};
  const twitter = {};
  for (const m of metas) {
    if (m.name) metaByName[m.name] = m.content;
    if (m.property.startsWith("og:")) og[m.property] = m.content;
    if (m.name.startsWith("twitter:")) twitter[m.name] = m.content;
  }

  const links = tags(html, "link").map((t) => ({
    raw: t,
    rel: (attr(t, "rel") || "").toLowerCase(),
    href: attr(t, "href"),
    hreflang: attr(t, "hreflang"),
    as: attr(t, "as"),
  }));
  const canonical = links.filter((l) => l.rel === "canonical").map((l) => l.href).filter(Boolean);
  const hreflang = links.filter((l) => l.rel === "alternate" && l.hreflang).map((l) => ({ hreflang: l.hreflang, href: l.href }));

  const headings = [];
  const hRe = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let hm;
  while ((hm = hRe.exec(html))) headings.push({ level: Number(hm[1]), text: stripTags(hm[2]) });
  const h1Count = headings.filter((h) => h.level === 1).length;

  const landmarks = {
    main: tags(html, "main").length,
    nav: tags(html, "nav").length,
    header: tags(html, "header").length,
    footer: tags(html, "footer").length,
    article: tags(html, "article").length,
  };

  const jsonLd = [];
  const ldRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let lm;
  while ((lm = ldRe.exec(html))) {
    const raw = lm[1].trim();
    let parsed = null;
    let error = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      error = String(e.message || e);
    }
    jsonLd.push({ raw, parsed, error });
  }

  const images = tags(html, "img").map((t) => ({
    raw: t,
    src: attr(t, "src"),
    alt: /\balt\s*=/i.test(t) ? attr(t, "alt") ?? "" : null, // null = attribute absent
    width: attr(t, "width"),
    height: attr(t, "height"),
    loading: (attr(t, "loading") || "").toLowerCase() || null,
    srcset: attr(t, "srcset"),
    sizes: attr(t, "sizes"),
  }));

  const anchors = [];
  const aRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = aRe.exec(html))) {
    anchors.push({ href: attr(`<a ${am[1]}>`, "href"), text: stripTags(am[2]) });
  }

  // Render-blocking heuristics from <head>.
  const head = sectionInner(html, "head") || "";
  const blockingScripts = (head.match(/<script\b(?![^>]*\b(async|defer|type\s*=\s*["']module["'])\b)[^>]*\bsrc=/gi) || []).length;
  const syncStylesheets = links.filter((l) => l.rel === "stylesheet" && !/\bmedia\s*=\s*["']?print/i.test(l.raw)).length;
  const fontPreload = links.some((l) => l.rel === "preload" && l.as === "font");

  const mainInner = sectionInner(html, "main");
  const bodyText = visibleText(html);
  const mainText = mainInner != null ? stripTags(mainInner) : bodyText;

  return {
    title,
    htmlLang,
    metas,
    metaByName,
    og,
    twitter,
    links,
    canonical,
    hreflang,
    headings,
    h1Count,
    landmarks,
    jsonLd,
    images,
    anchors,
    head,
    blockingScripts,
    syncStylesheets,
    fontPreload,
    hasMain: mainInner != null,
    bodyText,
    mainText,
    textLength: (mainText || "").length,
  };
}

/**
 * Heuristic: does the RAW HTML look like a client-rendered app shell rather than a
 * genuinely short static page? True when there's an empty mount node, or when there
 * is essentially no content but a JS bundle is present. Used to avoid false-positive
 * "client-rendered" findings on small static pages when no rendered DOM is available.
 */
export function isLikelyClientApp(rawHtml, parsed) {
  rawHtml = rawHtml || "";
  const appShell = /<div[^>]*\bid=["'](?:root|app|__next|__nuxt|q-app|svelte|application)["'][^>]*>\s*<\/div>/i.test(rawHtml);
  const contentEls = (parsed?.headings?.length || 0) + ((rawHtml.match(/<p\b[^>]*>\s*\S/gi) || []).length);
  const hasBundle = /<script\b[^>]*\bsrc=/i.test(rawHtml);
  return appShell || (contentEls <= 1 && hasBundle);
}

/** JSON-LD @type values present (flattened, handles @graph and arrays). */
export function jsonLdTypes(parsed) {
  const out = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node["@type"]) [].concat(node["@type"]).forEach((t) => out.add(String(t)));
    if (node["@graph"]) visit(node["@graph"]);
  };
  visit(parsed);
  return [...out];
}
