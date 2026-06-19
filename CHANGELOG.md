# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/) and the project uses semantic versioning.

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
