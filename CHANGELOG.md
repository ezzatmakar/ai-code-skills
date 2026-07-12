# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses semantic versioning.

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
