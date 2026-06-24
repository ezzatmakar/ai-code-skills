// Redirect-aware fetch helpers built on native fetch (Node 18+). No deps.
//
// Captures the full redirect chain, final status, headers, body, and an
// approximate TTFB so checks can reason about HTTP behaviour and crawl budget.

const UA =
  "Mozilla/5.0 (compatible; technical-seo-geo-audit/1.0; +https://github.com/ezzatmakar/ai-code-skills)";

/** Bot user-agents we test for crawler-access checks. */
export const BOT_AGENTS = {
  GPTBot: "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)",
  ClaudeBot: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://www.anthropic.com)",
};

/**
 * Fetch a URL following redirects manually so we can record each hop.
 * Returns { url, finalUrl, status, ok, headers, body, redirects[], ttfbMs, error }.
 */
export async function fetchPage(url, { timeoutMs = 20000, maxHops = 10, method = "GET", userAgent = UA } = {}) {
  const redirects = [];
  let current = url;
  const started = Date.now();

  for (let hop = 0; hop <= maxHops; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(current, {
        method,
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
      });
    } catch (err) {
      clearTimeout(timer);
      return {
        url,
        finalUrl: current,
        status: 0,
        ok: false,
        headers: {},
        body: "",
        redirects,
        ttfbMs: null,
        error: String(err?.message || err),
      };
    }
    clearTimeout(timer);

    const status = res.status;
    if (status >= 300 && status < 400 && res.headers.get("location")) {
      const location = new URL(res.headers.get("location"), current).toString();
      redirects.push({ from: current, to: location, status });
      current = location;
      continue;
    }

    const headers = headersToObject(res.headers);
    let body = "";
    try {
      body = method === "HEAD" ? "" : await res.text();
    } catch {
      body = "";
    }
    return {
      url,
      finalUrl: current,
      status,
      ok: res.ok,
      headers,
      body,
      redirects,
      ttfbMs: Date.now() - started,
      error: null,
    };
  }

  return {
    url,
    finalUrl: current,
    status: 310,
    ok: false,
    headers: {},
    body: "",
    redirects,
    ttfbMs: Date.now() - started,
    error: `too many redirects (>${maxHops})`,
  };
}

/** Fetch raw text (robots.txt, sitemap.xml, llms.txt). Returns { status, ok, text } or null on network error. */
export async function fetchText(url, opts = {}) {
  try {
    const r = await fetchPage(url, { ...opts });
    return { status: r.status, ok: r.ok, text: r.body, finalUrl: r.finalUrl, headers: r.headers };
  } catch {
    return null;
  }
}

function headersToObject(h) {
  const out = {};
  for (const [k, v] of h.entries()) out[k.toLowerCase()] = v;
  return out;
}

/** Slug a URL/route into a filesystem-safe name (matches rendered-DOM filenames). */
export function slugifyUrl(u) {
  try {
    const { pathname } = new URL(u);
    const p = pathname.replace(/\/+$/, "") || "/";
    return p === "/" ? "home" : p.replace(/^\/+/, "").replace(/[^a-z0-9._-]+/gi, "-");
  } catch {
    return String(u).replace(/[^a-z0-9._-]+/gi, "-") || "page";
  }
}
