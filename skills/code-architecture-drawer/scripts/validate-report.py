#!/usr/bin/env python3
"""Validate the structure of an ARCHITECTURE.md written by code-architecture-drawer.

Usage:
  validate-report.py <ARCHITECTURE.md>
  validate-report.py --self-test    Validate built-in samples (CI smoke test).

It checks structure and evidence discipline, not prose quality:
- the required sections, in order;
- no template tokens left behind;
- Mermaid blocks that GitHub can render. Each needs a known diagram type and a title.
  C4-style flowcharts also need a legend and labelled relationships, and no block may
  use syntax newer than GitHub is known to render;
- every gap row carries a severity, evidence, a standard, a fix, and a confidence;
- no scorecard "Pass" without evidence.
"""

from __future__ import annotations

import re
import sys
import tempfile
from pathlib import Path

TITLE = r"^#\s+Architecture\b"

HEADINGS = [
    "## 1. Summary",
    "## 2. System Context",
    "## 3. Containers",
    "## 4. Components",
    "## 5. Runtime Flows",
    "## 6. Data",
    "## 7. Deployment",
    "## 8. Crosscutting Concepts",
    "## 9. Architecture Decisions",
    "## 10. Architecture Gaps",
    "## 11. Standards Scorecard",
    "## 12. Method and Limits",
]

PLACEHOLDERS = [r"\{\{", r"Replace every placeholder"]
SEVERITIES = {"critical", "high", "medium", "low", "info"}
CONFIDENCE = {"confirmed", "likely"}
SCORE_STATUS = {"pass", "partial", "gap", "not assessed", "n/a"}
DIAGRAM_TYPES = (
    "flowchart", "graph", "sequenceDiagram", "erDiagram", "classDiagram", "stateDiagram",
    "stateDiagram-v2", "C4Context", "C4Container", "C4Component", "C4Dynamic",
    "C4Deployment", "architecture-beta", "block-beta", "journey", "gantt", "mindmap",
    "timeline", "requirementDiagram", "gitGraph", "pie", "quadrantChart",
)
# Sections whose flowcharts are C4 views: they need a legend and labelled edges.
C4_SECTIONS = {"## 2. System Context", "## 3. Containers", "## 7. Deployment"}
MAX_TEXT = 50_000              # Mermaid maxTextSize default
MAX_EDGES = 500                # Mermaid maxEdges default
EDGE_RE = re.compile(r"(-->|-\.->|==>|---|-\.-|===)")
LABELLED_EDGE_RE = re.compile(r"(-->|-\.->|==>)\s*\|[^|]+\||--\s+[^->]+\s+-->|-\.\s+[^.]+\s+\.->")


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def _sections(text: str) -> dict[str, str]:
    out, current, buf = {}, None, []
    for line in text.splitlines():
        if line.startswith("## "):
            if current:
                out[current] = "\n".join(buf)
            current, buf = line.strip(), []
            continue
        buf.append(line)
    if current:
        out[current] = "\n".join(buf)
    return out


def _mermaid_blocks(section: str) -> list[str]:
    return re.findall(r"^```mermaid\s*\n(.*?)^```", section, re.S | re.M)


def check_mermaid(block: str, where: str, c4_view: bool) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    body = block
    title = None
    fm = re.match(r"^---\s*\n(.*?)\n---\s*\n", body, re.S)
    if fm:
        m = re.search(r"^title:\s*(.+)$", fm.group(1), re.M)
        title = m.group(1).strip() if m else None
        body = body[fm.end():]
    first = next((ln.strip() for ln in body.splitlines() if ln.strip()
                  and not ln.strip().startswith("%%")), "")
    kind = first.split()[0] if first else ""
    if kind not in DIAGRAM_TYPES:
        errors.append("%s: Mermaid block does not start with a known diagram type (got %r)"
                      % (where, kind))
        return errors, warnings
    if not title and not re.search(r"^\s*title\s+\S", body, re.M):
        errors.append("%s: %s diagram has no title (C4 notation: every diagram states its "
                      "type and scope)" % (where, kind))
    if len(block) > MAX_TEXT:
        errors.append("%s: diagram is %d characters, over Mermaid's %d default — split it"
                      % (where, len(block), MAX_TEXT))
    edges = [ln for ln in body.splitlines() if EDGE_RE.search(ln)
             and not ln.strip().startswith(("classDef", "class ", "linkStyle", "style "))]
    if len(edges) > MAX_EDGES:
        errors.append("%s: %d edges, over Mermaid's %d default — split the diagram"
                      % (where, len(edges), MAX_EDGES))
    if "<small>" in block or re.search(r"@\{\s*shape", block):
        errors.append("%s: uses <small> or @{ shape } syntax that GitHub may not render" % where)
    if kind.startswith("C4") or kind == "architecture-beta":
        warnings.append("%s: %s is experimental in Mermaid and cannot draw a legend; prefer a "
                        "flowchart" % (where, kind))
    if c4_view and kind in ("flowchart", "graph"):
        if not re.search(r"subgraph\s+\w*\s*\[?\"?Legend|subgraph\s+Legend", block):
            errors.append("%s: C4 view has no Legend subgraph (C4 notation: every diagram has a key)"
                          % where)
        unlabelled = [e.strip() for e in edges if not LABELLED_EDGE_RE.search(e)]
        if unlabelled:
            errors.append("%s: %d relationship(s) without an intent label, e.g. %r"
                          % (where, len(unlabelled), unlabelled[0][:60]))
    return errors, warnings


def validate(text: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    if not re.search(TITLE, text, re.M):
        errors.append("missing '# Architecture: <system>' title")
    for pat in PLACEHOLDERS:
        if re.search(pat, text):
            errors.append("unresolved template token matching %r" % pat)
    pos = -1
    for h in HEADINGS:
        i = text.find("\n" + h)
        if i == -1:
            errors.append("missing section %r" % h)
        elif i < pos:
            errors.append("section %r is out of order" % h)
        else:
            pos = i
    secs = _sections(text)

    for name in ("## 2. System Context", "## 3. Containers", "## 4. Components"):
        if name in secs and not _mermaid_blocks(secs[name]):
            errors.append("%s has no Mermaid diagram" % name)
    for name, body in secs.items():
        for n, block in enumerate(_mermaid_blocks(body), 1):
            e, w = check_mermaid(block, "%s, diagram %d" % (name, n), name in C4_SECTIONS)
            errors += e
            warnings += w

    gaps = secs.get("## 10. Architecture Gaps", "")
    rows = [ln for ln in gaps.splitlines() if ln.strip().startswith("|")]
    header = None
    gap_rows = 0
    for ln in rows:
        cells = _cells(ln)
        low = [c.lower() for c in cells]
        if "severity" in low and "evidence" in low:
            header = low
            continue
        if header is None or set(ln.replace("|", "").strip()) <= set("-: "):
            continue
        gap_rows += 1
        row = dict(zip(header, cells))
        gid = row.get("id", "?")
        if row.get("severity", "").strip("* ").lower() not in SEVERITIES:
            errors.append("gap %s: severity %r is not Critical/High/Medium/Low/Info"
                          % (gid, row.get("severity")))
        for col in ("evidence", "standard", "fix"):
            if not row.get(col, "").strip(" `—-"):
                errors.append("gap %s: empty %s" % (gid, col))
        if "confidence" in header and row.get("confidence", "").strip("* ").lower() \
                not in CONFIDENCE:
            errors.append("gap %s: confidence %r is not Confirmed/Likely"
                          % (gid, row.get("confidence")))
    if "## 10. Architecture Gaps" in secs and gap_rows == 0 and \
            "no gaps" not in gaps.lower():
        errors.append("Architecture Gaps has no gap table rows (write 'No gaps found' if so)")

    score = secs.get("## 11. Standards Scorecard", "")
    header = None
    for ln in score.splitlines():
        if not ln.strip().startswith("|"):
            continue
        cells = _cells(ln)
        low = [c.lower() for c in cells]
        if "status" in low and "evidence" in low:
            header = low
            continue
        if header is None or set(ln.replace("|", "").strip()) <= set("-: "):
            continue
        row = dict(zip(header, cells))
        status = row.get("status", "").strip("* ").lower()
        if status not in SCORE_STATUS:
            errors.append("scorecard: status %r is not Pass/Partial/Gap/Not assessed"
                          % row.get("status"))
        if status == "pass" and not row.get("evidence", "").strip(" `—-"):
            errors.append("scorecard: %r is Pass with no evidence" % row.get("standard", "?"))
    return errors, warnings


# ---------------------------------------------------------------------------

GOOD = """# Architecture: Shop

> Drawn from code.

## 1. Summary

A shop.

## 2. System Context

```mermaid
---
title: System Context - Shop
---
flowchart TB
  user(["Shopper<br/>Person"])
  sys["Shop<br/>Software system"]
  pay["Stripe<br/>External system"]
  user -->|"browses and buys (HTTPS)"| sys
  sys -->|"charges cards (HTTPS/JSON)"| pay
  subgraph Legend["Legend"]
    lg0(["Person"])
  end
```

## 3. Containers

```mermaid
---
title: Containers - Shop
---
flowchart TB
  web["Web<br/>Container: Next.js"]
  db[("Postgres")]
  web -->|"reads and writes (SQL/TLS)"| db
  subgraph Legend["Legend"]
    lg0["Container"]
  end
```

## 4. Components

```mermaid
---
title: Component dependencies - web
---
flowchart LR
  a["api"] -->|imports x3| b["domain"]
```

## 5. Runtime Flows

```mermaid
sequenceDiagram
  title Checkout
  A->>B: pay
```

## 6. Data

No schema in the repository.

## 7. Deployment

Not determinable from code.

## 8. Crosscutting Concepts

Text.

## 9. Architecture Decisions

None recorded.

## 10. Architecture Gaps

| ID | Severity | Gap | Evidence | Standard | Fix | Confidence |
|---|---|---|---|---|---|---|
| GOV-ADR | Medium | No ADRs | no docs/adr | arc42 §9 | Add docs/adr/0001.md | Confirmed |

## 11. Standards Scorecard

| Standard | Status | Evidence |
|---|---|---|
| ADP | Pass | 0 cycles in scan |
| Observability | Not assessed | |

## 12. Method and Limits

Scanned.
"""

BAD_CASES = [
    ("placeholder", GOOD.replace("A shop.", "{{System name}}"), "unresolved template token"),
    ("no legend", GOOD.replace('  subgraph Legend["Legend"]\n    lg0(["Person"])\n  end\n', ""),
     "no Legend"),
    ("unlabelled edge", GOOD.replace('user -->|"browses and buys (HTTPS)"| sys', "user --> sys"),
     "without an intent label"),
    ("no title", GOOD.replace("---\ntitle: Containers - Shop\n---\n", ""), "has no title"),
    ("bad severity", GOOD.replace("| GOV-ADR | Medium |", "| GOV-ADR | Urgent |"),
     "severity"),
    ("empty evidence", GOOD.replace("| no docs/adr |", "| |"), "empty evidence"),
    ("pass without evidence", GOOD.replace("| ADP | Pass | 0 cycles in scan |", "| ADP | Pass | |"),
     "Pass with no evidence"),
    ("missing section", GOOD.replace("## 6. Data", "## Six"), "missing section"),
    ("small tag", GOOD.replace("Shop<br/>Software", "Shop<small>x</small>Software"), "<small>"),
    ("unknown diagram", GOOD.replace("sequenceDiagram", "sequence"), "known diagram type"),
]


def self_test() -> int:
    failures = []
    errs, _ = validate(GOOD)
    if errs:
        failures.append("good sample rejected: %s" % errs)
    for name, text, expect in BAD_CASES:
        errs, _ = validate(text)
        if not any(expect in e for e in errs):
            failures.append("%s: expected an error containing %r, got %s" % (name, expect, errs))
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "ARCHITECTURE.md"
        p.write_text(GOOD, encoding="utf-8")
        if main([str(p)]) != 0:
            failures.append("CLI rejected the good sample")
    for f in failures:
        print("FAIL  " + f, file=sys.stderr)
    if failures:
        return 1
    print("validate-report self-test: %d cases passed" % (len(BAD_CASES) + 2))
    return 0


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    if argv[0] == "--self-test":
        return self_test()
    path = Path(argv[0])
    if not path.is_file():
        print("not found: %s" % path, file=sys.stderr)
        return 2
    errors, warnings = validate(path.read_text(encoding="utf-8"))
    for w in warnings:
        print("WARN  " + w)
    for e in errors:
        print("FAIL  " + e)
    if errors:
        print("\n%d problem(s) in %s" % (len(errors), path))
        return 1
    print("OK  %s passes structure and evidence checks" % path)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
