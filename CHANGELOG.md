# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses semantic versioning.

## [2.7.0]

### Added
- **`rephrase-code-comments` skill** — rewords existing code comments **in place** so they read concise,
  direct, plain English, and human. It is the wording counterpart of `comment-cleanup`: that skill decides
  whether a comment should exist and where it sits; this one fixes the sentences of the comments that stay.
  Rules are grounded in the Google developer documentation style guide (voice, tense, word list, timeless
  documentation), the Microsoft Writing Style Guide, the US Federal Plain Language Guidelines, ASD-STE100
  Issue 9 (25-word descriptive sentences), ISO 24495-1:2023, and Wikipedia's *Signs of AI writing* — with
  each source attributed per rule, including where a rule is a plain-English choice rather than an AI tell.
- **Per-language doc-comment grammar** (`references/LANGUAGE_MOOD.md`): PEP 257 imperative vs. Google
  Python "consistent within a file", third person for Javadoc, Google C++/JS, Rust RFC 1574 and Swift,
  name-first for Go, StyleCop SA1623 only when configured. The scanner flags a summary that breaks its
  language's authority or its file's majority, and never churns a whole file to switch mood.
- **`scripts/scan-prose.py`** — dependency-free, string- and regex-literal-aware (it reuses
  `comment-cleanup`'s extractor). Flags 18 rule IDs — `WORDY`, `FILLER`, `HEDGE`, `AI`, `OPENER`, `NARRATE`,
  `PASSIVE`, `LONG`, `READ`, `MOOD`, `FORMAT`, `TERM`, `SPELL`, `SHOUT`, `VAGUE`, `NEG`, `TIME`, `SECRET` —
  each with a suggested replacement. Masks code spans, identifiers, URLs, tag names, doctests, fenced
  examples and aligned table rows so it never judges code as prose; skips non-English comments (never
  translates), pragmas, licence headers, generated and vendored files; escalates a non-inclusive term when
  code shares the name. `--since REF` limits the pass to files changed on a branch. 36 fixtures in `npm test`.
- **`code-architecture-drawer` skill** — reverse-engineers a codebase's architecture and **draws** it as C4
  diagrams in GitHub-rendered Mermaid (system context, containers, components per container, traced runtime
  flows, data model, deployment), then reports **architecture gaps** against ISO/IEC/IEEE 42010:2022, arc42,
  the C4 notation checklist, ISO/IEC 25010:2023, Clean Architecture's dependency rule, Martin's ADP/SDP/SAP,
  Ports and Adapters, Twelve-Factor, AWS/Azure Well-Architected reliability anti-patterns, and ADRs (Nygard,
  MADR 4.0). Writes one `ARCHITECTURE.md` in arc42 order; every gap carries evidence, a severity, the
  standard it breaks, a concrete fix and a Confirmed/Likely confidence.
- **`scripts/scan-architecture.py`** — dependency-free import-graph scanner for JS/TS (tsconfig `paths`,
  workspaces, `.js`→`.ts` ESM specifiers), Python, Go (`go.mod`), PHP (composer PSR-4), Java/Kotlin/Scala,
  C#, Ruby, Rust, Dart and Swift. Groups files into components (source roots are free, monorepo groups count
  once, loose composition-root files get their own node so they never fake a cycle), computes Ca/Ce/
  instability/abstractness/distance, finds component and file cycles (Tarjan), layer violations, SDP
  breaks, SDK sprawl, god files, config sprawl and shared databases; detects entry points, frameworks,
  external systems (by manifest and import), Docker Compose services, IaC, CI, ADRs, CODEOWNERS, API
  contracts, health endpoints and fitness-function tools. Committed `.env` files are classified by secret-like
  key **names** only — values never leave the file. `--scope PATH` draws one container's components;
  `--mermaid` emits titled, legended diagrams with cycles in red.
- **`scripts/validate-report.py`** (sections in order, no placeholders, Mermaid blocks with a known type, a
  title, a legend and labelled relationships on C4 views, size limits, GitHub-safe syntax, complete gap rows,
  no scorecard Pass without evidence) and **`scripts/render-html.py`** (one standalone page with live
  diagrams, light/dark, escaped content). All three scripts self-test in `npm test`.

### Changed
- `comment-cleanup` description now routes rewording requests to `rephrase-code-comments`.
- CLI help aligns skill names of any length.

## [2.6.0]

### Added
- **`web-perf-audit` skill** — an evidence-based **web performance + RUM** audit that measures before it
  recommends. It leads with **field data**: Core Web Vitals **p75** from the Chrome UX Report (via the CrUX
  API, or PageSpeed Insights when no CrUX key is available), per route and per device, with the
  good/needs-improvement/poor distribution and 25 weeks of history for trend detection.
- **Two deliverables**, not one: `PERFORMANCE_AUDIT.md` — every substantiated finding with evidence, root
  cause, user/business impact, a code-level fix and an expected improvement, ranked **P0–P3** — and
  `PERFORMANCE_PLAN.md`, the same findings organized into six delivery phases with files, risk, complexity
  and a verification method per task.
- **Nine deterministic check modules** (`scripts/checks/`) covering Core Web Vitals attribution, JavaScript
  weight and execution, network waterfalls and caching, API latency (slow endpoints, duplicates, N+1,
  oversized payloads), images, fonts, third-party cost, post-load runtime (long tasks, INP attribution, route
  transitions, memory) and codebase-mode causes (`"use client"` spread, `useEffect` data fetching, unmanaged
  script tags, heavy dependencies, built chunk sizes, missing RUM instrumentation).
- **Honest about what it cannot measure.** CrUX publishes **p75 only** — p50/p90 are interpolated from the
  three-bin histogram and labelled `approx`, and p95/p99 fall in the open-ended tail bin and are reported as
  `not available`, never estimated. Targets with no CrUX record (staging, authenticated, low-traffic) are
  reported as `Info — not measured` in the executive summary, and a `fail` finding without evidence throws at
  construction. `validate-report.py` fails any report that renders an unmeasured metric as a pass.
- **CI gates**: `budgets.mjs` (measured vs budgets, exit 1 on breach, `not measured` never counts as a pass)
  and `compare.mjs` (per-deploy regression across field p75, lab metrics and byte weights, exit 1 beyond
  tolerance) — with the 28-day CrUX window called out so a same-day "field unchanged" is not read as a pass.
- **Runtime diagnosis via chrome-devtools MCP** — Lighthouse measures a load; INP, route transitions,
  animation cost and memory leaks live after it. `references/DIAGNOSTICS.md` is the capture playbook
  (4× CPU + Slow 4G throttling, interaction traces, network log, heap snapshots) with the exact JSON shapes
  `run.mjs --mcp <dir>` consumes.
- Ships `assets/rum-collector.js` — a working `web-vitals` **attribution** beacon (LCP subparts, INP phases,
  CLS sources, TTFB breakdown, Long Animation Frames) with route-pattern/device/connection/deploy dimensions
  and explicit PII rules. It is an asset the audit recommends, never something it installs.
- Ships nine references — `CORE_WEB_VITALS` (LCP four-subpart and INP three-phase decision trees),
  `RUM_IMPLEMENTATION`, `FIELD_DATA_SOURCES`, `DIAGNOSTICS`, `NEXTJS_REACT`, `NETWORK_API`,
  `BUDGETS_REGRESSION`, `SEVERITY_RUBRIC` and `REFERENCES` (citations to web.dev, CrUX/PSI API docs,
  `web-vitals`, LoAF, MDN timing APIs, Lighthouse CI and the Next.js optimization docs).
- Priority is **computed**, not guessed: `impact × frequency × user exposure × fix confidence`, with a
  Critical finding never below P1 — so mobile findings outrank their identical desktop twins on exposure.
- `npm test` now also runs the skill's `validate-report.py --self-test`, its fixture-driven `selftest.mjs`
  (percentiles, thresholds, finding model, API normalizers, all nine check modules, report rendering and both
  gates) and a syntax check of `detect-stack.sh`.

## [2.5.0]

### Added
- **`comment-cleanup` skill** — sweeps a codebase and **rewrites its comments in place** to one
  standard: **short** (1-line default, 3-line inline cap), **sorted** (canonical docblock order —
  summary → `@param` in signature order → `@return` → `@throws` → `@deprecated` → `@see`),
  **placed** (docblock attached to its declaration with no blank line between; no detached or
  trailing essays), and **marked** (`TODO(#1234): <action>`). Deletes comments that restate the
  code, banner/divider art, commented-out blocks, changelog-in-comments, and assistant filler;
  adds a docblock only to **non-obvious public API**, never to trivial getters.
- **Edits comments only — never executable code.** When a comment is bad because the *code* is
  unclear, the skill escalates instead of "fixing" it. It refuses to start on a dirty working tree,
  gates every run behind a preview the user approves, and works in revertible batches, so the whole
  sweep is one reviewable `git diff`.
- **`scripts/scan-comments.py`** — a dependency-free (stdlib only) comment inventory that is
  string- and regex-literal-aware, so `"// not a comment"` and `/https:\/\//` are never mistaken
  for comments. Uses `tokenize` for Python and a per-language state machine elsewhere (C-style,
  hash, SQL, HTML, CSS, Lua, JSX, Vue/Svelte). Flags 11 rule IDs — `DUP`, `LEN`, `ORD`, `POS`,
  `TODO`, `DEAD`, `BANNER`, `CHANGELOG`, `GENERATED`, `EMPTY`, `SECRET` — each with a disposition,
  as a table or `--json`. Always exits 0: it reports, it never gates.
- **Protected by construction**: pragmas and tool directives (`@ts-ignore`, `eslint-disable`,
  `# noqa`, `//nolint`, `//go:build`, `# frozen_string_literal`, …) are treated as **code** and are
  exempt from every rule, as are licence headers and file-purpose headers. Suspected credentials are
  reported **redacted** — the value is never echoed — with a note that deletion does not remediate.
- Ships `references/{COMMENT_STANDARD,LANGUAGE_CONVENTIONS,ANTIPATTERNS}.md`, citing Google
  eng-practices, Ousterhout's *A Philosophy of Software Design*, the Stack Overflow comment rules,
  Google's `TODO` grammar, Go doc comments, PEP 257, TSDoc, php-fig PHPDoc, Javadoc, and Rust RFC
  0505/1574. Adds 29 scanner fixtures to `npm test`, including false-positive guards for prose in
  docblocks, shell parameter docs, value enumerations, and strings that look like comments.

## [2.4.0]

### Added
- **`delegate`: `aider` as a sixth target.** Delegate to Aider headlessly via
  `aider --message … --yes-always`. Read-only maps to `--dry-run` (no file changes); edit maps
  to `--no-auto-commits` (applies to the working tree without committing, matching the other
  targets). `--list-models` runs `aider --list-models ""`.
- Aider runs are **non-invasive**: `--no-gitignore` (never edits the repo's tracked `.gitignore`),
  chat/input history redirected to a temp dir, and the `.aider.tags.cache.*` repo-map cache removed
  **only when our run created it** — so a read-only aider delegation leaves the working tree clean.
- `detect-clis.sh` now probes all six targets; `references/TARGETS.md` documents aider's flags,
  the auto-commit gotcha, and the footprint handling.

## [2.3.1]

### Added
- README: a **"Delegate — target to CLI"** quick-reference table mapping each target to its
  one-line headless command. Produced by **dogfooding the `delegate` skill** — the edit was
  delegated to OpenCode in edit mode.

### Changed
- `delegate` SKILL (Phase 4): note to run long delegations in the **background** and bound them
  with `delegate.sh --timeout`, so a caller's short foreground shell timeout can't kill a
  multi-minute delegate mid-task.

## [2.3.0]

### Added
- **`delegate` skill** — an explicit dispatcher that hands a single task to a **named**
  model CLI (**Codex, OpenCode, Claude Code, Cursor, Gemini**), runs it **headlessly**, and
  captures the result. It is not a router: you name the target and it never substitutes a
  model. Defaults to **read-only** (`--mode edit` opts into changes) and always previews the
  exact command (`--dry-run`) so the agent can confirm before spending the target's credits.
  Honors `--model`, `--timeout`, `--json`, `--cwd`, stdin/heredoc prompts, and `--list-models`.
- **Two helper scripts**: `scripts/detect-clis.sh` reports which targets are installed, their
  versions, and resolved binary paths (always exits 0); `scripts/delegate.sh` builds and runs
  the per-target headless command. Binary resolution is `$DELEGATE_<TOOL>_BIN` → `PATH` →
  known locations, so it finds **codex inside ChatGPT.app** when it is off-`PATH`, and stops
  with an install hint (never a silent fallback) when a target such as **gemini** is absent.
- **Portable by design**: enforces `--timeout` via `timeout`/`gtimeout` when present or a
  built-in watchdog otherwise (neither ships on macOS by default), keeps `jq` optional, and
  maps read-only vs edit to each tool's own safe flags — never a dangerous bypass flag.
- Ships `references/TARGETS.md` (per-tool adapter matrix, the codex off-PATH and
  gemini-absent gotchas, cost/self-delegation notes) and adds delegate smoke checks to `npm test`.

## [2.2.0]

### Added
- **`technical-seo-geo-audit` skill** — a developer-focused **technical SEO + GEO
  (Generative Engine Optimization)** auditor for a **live URL** or a **codebase**. It
  discovers pages (sitemap/robots, then a link crawl), fetches each page **raw** and diffs
  it against the **rendered DOM** to catch empty SSR shells and JS-only content (the top
  defect for both search and AI crawlers), and checks crawlability/indexability,
  Core Web Vitals, render-blocking, images/fonts, metadata, Open Graph, JSON-LD,
  semantic HTML, redirects/HTTP, AI-crawler access (GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, CCBot, Bytespider), and `llms.txt`. Writes **one per-page Markdown
  report** (`SEO-GEO-AUDIT.md`) with a separate **SEO score** and **GEO score**, findings
  grouped by route, and a copy-pasteable **code-level fix** for every finding. Technical
  only — no content/keyword/editorial advice.
- **Hybrid architecture**: a dependency-free Node engine (`scripts/crawl.mjs`,
  `scripts/checks/*`, `scripts/report.mjs`, `scripts/run.mjs`) does the deterministic
  checks and emits `findings.json` + a baseline report; the skill orchestrates rendered-DOM
  capture and finalizes the report. Rendered DOM and Core Web Vitals **prefer the
  chrome-devtools MCP server** and **fall back to optional Playwright + PageSpeed Insights**;
  raw-HTML, robots/sitemap, metadata, structured-data, and semantic checks run with no
  dependencies. Missing optional tools reduce coverage with a clear "not measured" warning
  rather than guessing or crashing.
- Ships `seo-checks`/`geo-checks`/`severity-rubric` references, a report template, a
  Next.js/Nuxt/Astro-aware `detect-stack.sh`, fixture-based `selftest.mjs`, and a
  `validate-report.py` that checks the per-page structure and both scores.
- `npm test` now also runs the `technical-seo-geo-audit` report validator self-test and the
  check-engine self-test.

## [2.1.1]

### Changed
- Rewrote the package description to cover all three skills and supported clients
  (Claude Code, Codex, OpenCode), including the `pre-push-review` Pass/Warn/Fail
  scorecard and push-readiness verdict.
- Generalized the README so the collection is no longer described as PR-only:
  updated tagline, added Codex usage example, and clarified that inline comments
  apply to the PR reviewers while `pre-push-review` delivers the scorecard report.

## [2.1.0]

### Added
- **`pre-push-review` skill** — a stack-agnostic reviewer for your **local changes
  before you push**. It auto-detects the language/framework from project manifests,
  reviews the working-tree diff (default), or staged/unpushed/all-local scopes, and
  scores **Security**, **Performance**, and **Clean Code** as **PASS/WARN/FAIL** with
  an overall push-readiness recommendation (Do not push / Fix before push / Push with
  follow-ups / Ready to push). Writes one Markdown report (`PRE_PUSH_REVIEW.md`) with a
  Scorecard, evidence-based findings, validation results, and references. Supports
  Quick/Standard/Deep modes. Ships generic `SECURITY`/`PERFORMANCE`/`CLEAN_CODE`
  references, a `SCORING` rubric, a report template, a generic multi-language
  `detect-stack.sh`, a `local-diff.sh` (uncommitted/staged/unpushed/all-local), and a
  `validate-report.py` that checks the Scorecard and push verdict. No PR, remote, or
  GitHub CLI required.
- `npm test` now also runs the `pre-push-review` report validator self-test.

## [2.0.0]

Repository restructured into **ai-code-skills**, a multi-skill collection. Users
choose which skills to install.

### Added
- **`laravel-pr-review` skill** — security/performance/clean-code review for
  Laravel 9–12 and PHP 8.0–8.4: mass assignment, SQL injection, Policies/Gates,
  CSRF/XSS in Blade, validation, file uploads, N+1 queries, missing indexes,
  queues, caching correctness, Octane state leakage, PSR-12/SOLID, and migration
  safety. Ships its own references, report template, and `detect-stack.sh`.
- **Multi-skill npm CLI** (`bin/cli.js`, package renamed to `ai-code-skills`):
  `list`, `install [skills...]`, `uninstall`, `where`, with `--all`,
  `--user`/`--project --root`, and `--claude`/`--codex`/`--opencode`/`--both`/
  `--all-clients`. Installing requires choosing skills by name, `--all`, or the
  interactive picker. New skills are auto-discovered from `skills/*/SKILL.md` —
  no code changes needed.
- **OpenCode support.** `--opencode` installs to OpenCode's native skills path
  (`~/.config/opencode/skills/` for user scope, `.opencode/skills/` for project
  scope); `--all-clients` targets Claude Code + Codex + OpenCode. OpenCode also
  reads `~/.claude/skills` and `~/.agents/skills`, so the default `--both`
  install already works there.
- **`nextjs-pr-review` 2.0**: Quick/Standard/Deep review modes; Next.js 15/16
  coverage (`'use cache'`, PPR, `dynamicIO`, `after()`, async
  `cookies`/`headers`/`params`/`searchParams`, uncached-by-default `fetch`);
  opt-in inline PR comments; `detect-stack.sh`; self-audit step.

### Changed
- Skills now live under `skills/` (`skills/nextjs-pr-review/`,
  `skills/laravel-pr-review/`).
- `pr-diff.sh` accepts `--pr <number>`, reports per-file stats, and flags large
  diffs (threshold via `PR_REVIEW_LARGE_DIFF`). Shared by all skills.
- `validate-report.py` accepts any `# <name> PR Code Review` H1, adds
  `--self-test` (used by `npm test`) and per-finding Severity/Confidence checks.
- `install.sh`/`uninstall.sh` rewritten for skill selection and the `skills/`
  layout.

## [1.0.0]

- Initial release as `nextjs-pr-review-skill`: security, performance, and
  clean-code PR review for Next.js/React, one Markdown report with a merge
  verdict, reference checklists, `pr-diff.sh`, `validate-report.py`, and shell
  `install.sh`/`uninstall.sh`.
