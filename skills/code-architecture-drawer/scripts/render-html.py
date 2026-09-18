#!/usr/bin/env python3
"""Render ARCHITECTURE.md as one standalone HTML page with live Mermaid diagrams.

GitHub renders the Markdown on its own. This page is for everywhere else: a local
browser, an email attachment, or a wiki that does not run Mermaid. It needs no install.
The Markdown converter is small on purpose. It covers what the report template uses:
headings, paragraphs, quotes, lists, tables, code fences, inline code, bold, italics,
and links. Mermaid loads from jsDelivr, pinned to major version 11, which keeps the
classic layout the diagrams were written for.

Usage:
    render-html.py ARCHITECTURE.md [-o ARCHITECTURE.html]
    render-html.py --self-test
"""

import html
import re
import sys
import tempfile
from pathlib import Path

MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs"

CSS = """
:root { --bg:#ffffff; --fg:#1f2328; --muted:#59636e; --line:#d1d9e0; --code:#f6f8fa;
        --accent:#0969da; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1;
        --line:#3d444d; --code:#151b23; --accent:#4493f8; }
}
:root[data-theme="dark"] { --bg:#0d1117; --fg:#e6edf3; --muted:#9198a1; --line:#3d444d;
        --code:#151b23; --accent:#4493f8; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg);
       font:16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1080px; margin: 0 auto; padding: 32px 16px 96px; }
nav { border:1px solid var(--line); border-radius:8px; padding:12px 16px; margin:16px 0 32px; }
nav a { display:inline-block; margin:2px 12px 2px 0; }
a { color: var(--accent); }
h1 { font-size: 2rem; margin: 0 0 8px; }
h2 { border-bottom:1px solid var(--line); padding-bottom:6px; margin-top:48px; }
blockquote { margin:0; padding:4px 16px; color:var(--muted); border-left:4px solid var(--line); }
code { background:var(--code); padding:1px 5px; border-radius:4px; font-size:.9em; }
pre { background:var(--code); padding:12px; border-radius:8px; overflow-x:auto; }
pre code { padding:0; background:none; }
pre.mermaid { background:transparent; text-align:center; }
.table-wrap { overflow-x:auto; margin:16px 0; }
table { border-collapse:collapse; min-width:100%; font-size:.92rem; }
th, td { border:1px solid var(--line); padding:6px 10px; text-align:left; vertical-align:top; }
th { background:var(--code); }
"""


def inline(text):
    parts = re.split(r"(`[^`]+`)", text)
    out = []
    for p in parts:
        if p.startswith("`") and p.endswith("`") and len(p) > 1:
            out.append("<code>%s</code>" % html.escape(p[1:-1]))
            continue
        s = html.escape(p, quote=False)
        s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)",
                   lambda m: '<a href="%s">%s</a>' % (html.escape(m.group(2), quote=True)
                                                      if not m.group(2).lower().startswith(
                                                          "javascript:") else "#",
                                                      m.group(1)), s)
        s = re.sub(r"&lt;(https?://[^\s&]+)&gt;", r'<a href="\1">\1</a>', s)
        s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
        s = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", s)
        s = s.replace("&lt;br/&gt;", "<br>")
        out.append(s)
    return "".join(out)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def convert(md):
    lines = md.split("\n")
    out, toc, i, title = [], [], 0, "Architecture"
    para = []

    def flush_para():
        if para:
            out.append("<p>%s</p>" % inline(" ".join(para)))
            para.clear()

    while i < len(lines):
        line = lines[i]
        fence = re.match(r"^```(\w*)\s*$", line)
        if fence:
            flush_para()
            lang = fence.group(1)
            j = i + 1
            body = []
            while j < len(lines) and not lines[j].startswith("```"):
                body.append(lines[j])
                j += 1
            code = html.escape("\n".join(body))
            if lang == "mermaid":
                out.append('<pre class="mermaid">%s</pre>' % code)
            else:
                out.append("<pre><code>%s</code></pre>" % code)
            i = j + 1
            continue
        h = re.match(r"^(#{1,4})\s+(.*)$", line)
        if h:
            flush_para()
            level, text = len(h.group(1)), h.group(2).strip()
            if level == 1:
                title = text
            anchor = slug(text)
            if level == 2:
                toc.append((anchor, text))
            out.append('<h%d id="%s">%s</h%d>' % (level, anchor, inline(text), level))
            i += 1
            continue
        if line.startswith(">"):
            flush_para()
            quote = []
            while i < len(lines) and lines[i].startswith(">"):
                quote.append(lines[i][1:].strip())
                i += 1
            paras = [p for p in "\n".join(quote).split("\n\n")]
            out.append("<blockquote>%s</blockquote>" % "".join(
                "<p>%s</p>" % inline(" ".join(p.split("\n"))) for p in paras if p.strip()))
            continue
        if line.strip().startswith("|"):
            flush_para()
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], [r for r in rows[1:] if not all(
                set(c) <= set("-: ") for c in r)]
            t = ["<div class=\"table-wrap\"><table><thead><tr>"]
            t += ["<th>%s</th>" % inline(c) for c in head]
            t.append("</tr></thead><tbody>")
            for r in body:
                t.append("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r))
            t.append("</tbody></table></div>")
            out.append("".join(t))
            continue
        lm = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
        if lm:
            flush_para()
            ordered = lm.group(2)[0].isdigit()
            items = []
            while i < len(lines):
                m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", lines[i])
                if m:
                    items.append(m.group(3))
                elif lines[i].startswith("  ") and lines[i].strip() and items:
                    items[-1] += " " + lines[i].strip()
                else:
                    break
                i += 1
            tag = "ol" if ordered else "ul"
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(x) for x in items),
                                        tag))
            continue
        if not line.strip():
            flush_para()
        else:
            para.append(line.strip())
        i += 1
    flush_para()
    nav = ('<nav aria-label="Sections">%s</nav>' % "".join(
        '<a href="#%s">%s</a>' % (a, html.escape(t)) for a, t in toc)) if toc else ""
    body = "\n".join(out)
    if nav and "</h1>" in body:
        body = body.replace("</h1>", "</h1>\n" + nav, 1)
    return title, body


def render(md):
    title, body = convert(md)
    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<style>%s</style>
</head>
<body>
<main>
%s
</main>
<script type="module">
  import mermaid from "%s";
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  mermaid.initialize({ startOnLoad: true, securityLevel: "strict",
                       theme: dark ? "dark" : "default" });
</script>
</body>
</html>
""" % (html.escape(title), CSS, body, MERMAID_URL)


SAMPLE = """# Architecture: Shop

> Drawn from code on 2026-09-18.

## 1. Summary

A **shop** with `checkout` and [docs](https://example.com). Script: <script>alert(1)</script>

| Element | Type |
|---|---|
| Stripe | External `system` |

- one
- two

## 2. System Context

```mermaid
flowchart TB
  a["A<br/>Person"] -->|"uses"| b["B"]
```
"""


def self_test():
    page = render(SAMPLE)
    checks = [
        ('<pre class="mermaid">' in page, "mermaid block not emitted"),
        ("&lt;br/&gt;" in page or "<br/>" not in page.split('<pre class="mermaid">')[1]
         .split("</pre>")[0], "mermaid source not escaped"),
        ("<table>" in page and "<th>Element</th>" in page, "table not rendered"),
        ("<strong>shop</strong>" in page and "<code>checkout</code>" in page,
         "inline markup not rendered"),
        ("<script>alert(1)</script>" not in page, "raw HTML from Markdown not escaped"),
        ('href="#2-system-context"' in page, "section navigation missing"),
        ("<title>Architecture: Shop</title>" in page, "page title missing"),
        ("prefers-color-scheme: dark" in page, "dark theme missing"),
    ]
    failed = [msg for ok, msg in checks if not ok]
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "ARCHITECTURE.md"
        src.write_text(SAMPLE, encoding="utf-8")
        if main([str(src)]) != 0 or not (Path(tmp) / "ARCHITECTURE.html").is_file():
            failed.append("CLI did not write ARCHITECTURE.html")
    for f in failed:
        print("FAIL  " + f, file=sys.stderr)
    if failed:
        return 1
    print("render-html self-test: %d checks passed" % (len(checks) + 1))
    return 0


def main(argv):
    if not argv:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    if argv[0] == "--self-test":
        return self_test()
    src = Path(argv[0])
    dest = Path(argv[argv.index("-o") + 1]) if "-o" in argv else src.with_suffix(".html")
    if not src.is_file():
        print("not found: %s" % src, file=sys.stderr)
        return 2
    dest.write_text(render(src.read_text(encoding="utf-8")), encoding="utf-8")
    print("wrote %s" % dest)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
