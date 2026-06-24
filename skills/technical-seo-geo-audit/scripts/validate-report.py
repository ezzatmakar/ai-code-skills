#!/usr/bin/env python3
"""Validate the required structure of a Technical SEO & GEO Audit Markdown report.

Usage:
  validate-report.py <report.md>   Validate a report file.
  validate-report.py --self-test   Validate a built-in sample (CI smoke test).
"""

from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

TITLE_PATTERN = r"^#\s+.*SEO\s*&?\s*GEO.*Audit"

REQUIRED_HEADINGS = [
    "## Executive Summary",
    "## Site-Wide Findings",
    "## Per-Page Findings",
    "## Quick-Win Checklist",
    "## Appendix / Methodology",
]

# Distinctive {{token}} placeholders must be removed from the final report. We do
# NOT scan for <...> because the report legitimately contains HTML in code blocks.
PLACEHOLDER_PATTERNS = [
    r"\{\{",
    r"Replace every placeholder",
]


def fail(messages: list[str]) -> int:
    for message in messages:
        print(f"ERROR: {message}", file=sys.stderr)
    return 1


def validate_text(text: str) -> list[str]:
    errors: list[str] = []

    if not re.search(TITLE_PATTERN, text, flags=re.MULTILINE | re.IGNORECASE):
        errors.append('Missing H1 title matching "# … SEO & GEO Audit".')

    positions: list[int] = []
    for heading in REQUIRED_HEADINGS:
        index = text.find(heading)
        if index < 0:
            errors.append(f"Missing required heading: {heading}")
        else:
            positions.append(index)

    if positions and positions != sorted(positions):
        errors.append("Required headings are not in the expected order.")

    for pattern in PLACEHOLDER_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE):
            errors.append(f"Unresolved template content matches: {pattern}")

    if not re.search(r"SEO score", text, flags=re.IGNORECASE):
        errors.append("Executive summary is missing an SEO score.")
    if not re.search(r"GEO score", text, flags=re.IGNORECASE):
        errors.append("Executive summary is missing a GEO score.")

    # The per-page section must group findings under route headings: ### `<route>`
    per_page = _section_for_heading(text, "## Per-Page Findings")
    if per_page is not None and "_No " not in per_page:
        if not re.search(r"^###\s+`", per_page, flags=re.MULTILINE):
            errors.append("Per-Page Findings has no `### \\`<route>\\`` page headings.")

    return errors


def _section_for_heading(text: str, heading: str) -> str | None:
    index = text.find(heading)
    if index < 0:
        return None
    rest = text[index + len(heading):]
    nxt = re.search(r"^##\s", rest, flags=re.MULTILINE)
    end = index + len(heading) + (nxt.start() if nxt else len(rest))
    return text[index:end]


SAMPLE_REPORT = """# Technical SEO & GEO Audit — https://example.com

| | |
|---|---|
| **Target** | https://example.com |
| **Date** | 2026-01-01 |

## Executive Summary

- **SEO score:** 82/100 (B — Good)
- **GEO score:** 67/100 (C — Needs work)
- **Findings:** 0 Critical · 1 High · 1 Medium · 2 Low · 1 Info

The site has a workable technical foundation with clear gaps to close.

## Site-Wide Findings

**\U0001f7e0 High · `GEO-AIBOT-BLOCKED` — AI crawlers blocked**

**Evidence:**
```text
User-agent: GPTBot -> Disallow: /
```

**Recommendation:** Allow the bots you want cited.

---

## Per-Page Findings

### `/pricing` — Pricing

*CWV: LCP 2100ms ✓ / CLS 0.02 ✓ / INP — / TTFB 320ms ✓ · Findings: 1 Medium*

**\U0001f7e1 Medium · `META-DESC-MISSING` — Missing meta description**

**Evidence:**
```text
No <meta name="description"> found.
```

**Recommendation:** Add a concise description.

```jsx
export const metadata = { description: 'Pricing for teams.' };
```

---

## Quick-Win Checklist

- [ ] **High** site-wide · `GEO-AIBOT-BLOCKED` — AI crawlers blocked

## Appendix / Methodology

- **What was measured:** raw HTML for every page; rendered DOM: 1/1; Core Web Vitals: 1/1.
- **Re-run:** `node scripts/run.mjs --url https://example.com`
"""


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2

    arg = sys.argv[1]

    if arg == "--self-test":
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=True) as tmp:
            tmp.write(SAMPLE_REPORT)
            tmp.flush()
            errors = validate_text(Path(tmp.name).read_text(encoding="utf-8"))
        if errors:
            return fail(["self-test failed:"] + errors)
        print("Self-test passed: built-in sample report is valid.")
        return 0

    path = Path(arg)
    if not path.is_file():
        return fail([f"Report not found: {path}"])

    errors = validate_text(path.read_text(encoding="utf-8"))
    if errors:
        return fail(errors)

    print(f"Report structure is valid: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
