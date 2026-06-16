# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses semantic versioning.

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
  `--user`/`--project --root`, and `--claude`/`--codex`/`--both`. Installing
  requires choosing skills by name, `--all`, or the interactive picker. New
  skills are auto-discovered from `skills/*/SKILL.md` — no code changes needed.
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
