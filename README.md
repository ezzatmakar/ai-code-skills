# ai-code-skills

A growing collection of **Agent Skills** for **Claude Code**, **Codex**, and **OpenCode**. Review code for **security, performance, and clean code** — pull requests *or* your local changes before you push — **clean up your code comments** to one short, sorted standard, **reword them** into concise, plain, human English, **draw your codebase's architecture** as C4 diagrams with its gaps against published standards, audit a site's **technical SEO + GEO** (Generative Engine Optimization) for search and AI-assistant visibility, audit **web performance and RUM** against real-user field data (Core Web Vitals p75 from CrUX/PageSpeed Insights), and **delegate a task to another model's CLI** (Codex, OpenCode, Claude Code, Cursor, Gemini, Aider). Most skills write their results to one evidence-based Markdown report with a clear verdict.

Each skill is self-contained. You pick which ones to install.

## Skills in this repo

| Skill | Operates on | Highlights |
|---|---|---|
| **`nextjs-pr-review`** | Next.js / React PRs (App + Pages Router, Next.js 13–16) | Server/Client boundaries, fetch waterfalls, bundle size, Core Web Vitals, `'use cache'`/PPR/`dynamicIO`/`after()`, async `cookies`/`headers`/`params`, Server Actions & data-boundary security |
| **`laravel-pr-review`** | Laravel / PHP PRs (Laravel 9–12, PHP 8.0–8.4) | Mass assignment, SQL injection, Policies/Gates, CSRF/XSS in Blade, N+1 queries, missing indexes, queues, caching correctness, PSR-12 / SOLID, migration safety |
| **`pre-push-review`** | Your **local changes before you push**, any language/framework (auto-detected) | Reviews uncommitted (or staged/unpushed) work and scores **Security / Performance / Clean Code** as **Pass/Warn/Fail** with an overall **push-readiness** recommendation; no PR or remote required |
| **`technical-seo-geo-audit`** | A **live URL** or a **codebase** for technical SEO + **GEO** (AI/LLM visibility) | Raw-vs-rendered **SSR diff** (empty-shell detection), Core Web Vitals, structured data, metadata, semantic HTML, redirects, **AI-crawler access** (GPTBot/ClaudeBot/PerplexityBot/…) and `llms.txt`; one **per-page** report with a separate **SEO score** and **GEO score** and a code-level fix per finding |
| **`web-perf-audit`** | A **live URL** or a **codebase**, for web performance + **RUM** (field data) | Measures **before** it recommends: Core Web Vitals **p75 from real field data** (CrUX + PageSpeed Insights), Lighthouse lab analysis, response headers and optional chrome-devtools MCP traces for **INP**, route transitions and memory. Covers LCP/INP/CLS/TTFB root causes, JS bundles & execution, network waterfalls, API latency & N+1, images, fonts, third-party cost, caching, and mobile-vs-desktop. Writes **`PERFORMANCE_AUDIT.md`** (every finding ranked P0–P3) plus **`PERFORMANCE_PLAN.md`** (six delivery phases), and ships **budget** and **per-deploy regression** gates. Never invents a number — anything it could not measure is labelled, never passed |
| **`comment-cleanup`** | Your **code comments**, repo-wide or in the paths you name, any language | Rewrites comments **in place** to one standard — **short** (1-line default, 3-line cap), **sorted** (canonical `@param` → `@return` → `@throws` order), **placed** (attached to the declaration, no detached or trailing essays), **marked** (`TODO(#123):`). Deletes comments that restate the code, banner art, commented-out blocks, changelog-in-comments and assistant filler; adds a docblock only to non-obvious public API. **Comments only — never executable code**, and always previews the plan first |
| **`rephrase-code-comments`** | The **wording** of your code comments, repo-wide, in the paths you name, or only what changed since a branch (`--since origin/main`) | Rewords comments **in place** so they read **concise, direct, plain, human**, measured against the Google developer documentation style guide, Microsoft Writing Style Guide, US Federal Plain Language Guidelines, ASD-STE100 (25-word sentences) and each language's doc-comment grammar (PEP 257 imperative, Javadoc/Go/Rust third person, Go name-first). 18 rule IDs: wordy phrases, filler, hedges, **AI-sounding vocabulary**, "This function is used to…" openers, tutorial voice, passive voice, long sentences, wrong summary mood, time words that rot, non-inclusive terms, shouting, double negatives, misspellings. **Keeps every fact, identifier and number**; never translates; escalates comments that contradict the code. Comments only, preview first |
| **`code-architecture-drawer`** | A **codebase**, whole repo or one container (`--scope apps/api`), any language | Reverse-engineers the architecture from the import graph and **draws it** as C4 diagrams in GitHub-rendered **Mermaid**: system context, containers (from Docker Compose, IaC and detected external systems), components per container, traced runtime flows, data model and deployment. Measures coupling (Ca/Ce/instability/abstractness), **dependency cycles**, **layer violations**, SDK sprawl, god files and shared databases, then reports **architecture gaps** against ISO 42010, arc42, C4, ISO 25010:2023, Clean Architecture, ADP/SDP/SAP, Twelve-Factor, Well-Architected and ADRs, each with evidence, severity, the standard, a fix and a confidence. Writes one validated **`ARCHITECTURE.md`** (optional standalone HTML). Read-only on source |
| **`delegate`** | A **task** you hand to a named model CLI (Codex, OpenCode, Claude Code, Cursor, Gemini, Aider) | Explicit, **headless** delegation — builds the non-interactive command, previews it (`--dry-run`), runs it (**read-only by default**, `edit` on request), captures the result, and summarizes it back; resolves off-PATH `codex`, degrades when a target isn't installed. **Not a router** — you name the target |

More skills will be added over time — `list` always shows what's available.

Most reviews produce **one** Markdown report with evidence, severity, confidence, rationale, recommendations, verification steps, and references. The PR reviewers write `PR_REVIEW.md` with a merge verdict and support PR-number-aware diffs and opt-in inline PR comments; `pre-push-review` writes `PRE_PUSH_REVIEW.md` from your local diff with a Pass/Warn/Fail scorecard and a push-readiness recommendation. `technical-seo-geo-audit` writes `SEO-GEO-AUDIT.md` — findings grouped **per page** with a separate **SEO score** and **GEO score** and a copy-pasteable code fix for each; its rendered-DOM and Core Web Vitals checks prefer the chrome-devtools MCP server and fall back to optional Playwright + PageSpeed Insights. `web-perf-audit` writes **two** documents — `PERFORMANCE_AUDIT.md` and `PERFORMANCE_PLAN.md` — from field data first (CrUX p75, with its p75-only and 28-day-window limits stated in the report rather than papered over), and its `budgets.mjs` / `compare.mjs` exit non-zero so they work as CI gates. Shared features across the review skills: Quick/Standard/Deep modes and automatic stack detection. `code-architecture-drawer` writes `ARCHITECTURE.md` in arc42 section order — C4 diagrams in Mermaid (each with a title, a legend and labelled relationships, checked by `validate-report.py`) plus a gap table and a standards scorecard — and can render it to one HTML page with live diagrams. Three skills are the exception — instead of a report, `delegate` hands a task to another model's CLI headlessly and summarizes the answer, always confirming the exact command before it spends the target's credits, while `comment-cleanup` and `rephrase-code-comments` **edit your comments in place** (the first fixes structure, the second fixes wording), so their deliverable is a reviewable `git diff` rather than a document. All three gate on explicit confirmation before they act.

## Install (npm / npx)

You choose which skills to install — installing is never all-or-nothing unless you ask for `--all`.

```bash
# See what's available
npx ai-code-skills list

# Install specific skills (user scope, both clients)
npx ai-code-skills install nextjs-pr-review
npx ai-code-skills install nextjs-pr-review laravel-pr-review

# Interactive picker (run with no skill names in a terminal)
npx ai-code-skills install

# Everything
npx ai-code-skills install --all

# A single client
npx ai-code-skills install laravel-pr-review --claude
npx ai-code-skills install laravel-pr-review --codex
npx ai-code-skills install laravel-pr-review --opencode

# All three clients at once
npx ai-code-skills install --all --all-clients

# Commit a skill into one repository (project scope)
npx ai-code-skills install nextjs-pr-review --project --root ./my-app

# Inspect or remove
npx ai-code-skills where --all
npx ai-code-skills uninstall laravel-pr-review
```

Install the CLI globally if you prefer:

```bash
npm install -g ai-code-skills
ai-code-skills install nextjs-pr-review
```

### Install destinations

| Scope | Claude Code | Codex | OpenCode |
|---|---|---|---|
| `--user` (default) | `~/.claude/skills/<skill>/` | `~/.agents/skills/<skill>/` | `~/.config/opencode/skills/<skill>/` |
| `--project --root <r>` | `<r>/.claude/skills/<skill>/` | `<r>/.agents/skills/<skill>/` | `<r>/.opencode/skills/<skill>/` |

Project-scope copies can be committed so every contributor gets the same review rules.

**OpenCode note:** OpenCode natively discovers `SKILL.md` skills and also reads `~/.claude/skills/` and `~/.agents/skills/`. So the default `--both` install already works in OpenCode — invoke skills there the same way. Use `--opencode` (or `--all-clients`) only if you also want the copy in OpenCode's native `~/.config/opencode/skills/` path. Client flags combine, e.g. `--claude --opencode`.

### Without Node

Cloned the repo? The shell installer does the same thing and also requires you to choose:

```bash
./install.sh --list
./install.sh --user --both nextjs-pr-review
./install.sh --user --both --all
./uninstall.sh laravel-pr-review
```

## Use

After installing, invoke a skill by name.

### Claude Code

```text
/nextjs-pr-review Review PR #123 and save the report to docs/reviews/PR-123.md
/laravel-pr-review Deep review of the current branch against origin/main.
/pre-push-review Check my local changes before I push.
/technical-seo-geo-audit Audit https://example.com — technical SEO and AI/LLM visibility.
/web-perf-audit Audit https://example.com — Core Web Vitals, RUM and bundle size. Routes: /, /pricing.
/comment-cleanup Clean up the comments across the repo — they're too long and unsorted.
/rephrase-code-comments Our comments sound like AI and ramble. Make them plain and direct — only files changed since origin/main.
/code-architecture-drawer Map this repo's architecture, draw it, and list the gaps. Deep mode, and export HTML.
/delegate --to codex Refactor src/auth.ts and add tests. (edit mode; confirm first)
```

### Codex

```text
$nextjs-pr-review Review PR #123
$laravel-pr-review Review the current branch, focus on the auth changes.
$pre-push-review Score my staged changes before I push.
$technical-seo-geo-audit Audit https://example.com for technical SEO and GEO.
$web-perf-audit Why is our product page slow for real users on mobile?
$comment-cleanup Sort the docblocks and drop the comments that restate the code, in src/.
$rephrase-code-comments Rewrite the docstrings in src/ in plain English; keep PEP 257 imperative mood.
$code-architecture-drawer Draw the C4 container and component diagrams for apps/api and check for dependency cycles.
$delegate --to opencode Explain what this module does. (read-only, the default)
```

Both agents may also activate a skill automatically when asked to review a matching PR, or to check local changes before a push.

### Review modes

Mention a mode to control depth (default is **Standard**):

- **Quick** — fast gate for small/low-risk diffs; High/Critical security + correctness only.
- **Standard** — all phases, all three categories, safe validation, full report.
- **Deep** — security-sensitive or large diffs; end-to-end tracing, build/test/static-analysis runs, expanded checklists, and a self-audit pass.

### Inline PR comments (opt-in)

For the PR reviewers (`nextjs-pr-review`, `laravel-pr-review`), off by default — the report is the deliverable. Ask explicitly to also post findings inline (requires an authenticated `gh`):

```text
/laravel-pr-review Review PR #123, then post the High/Critical findings as inline comments.
```

`pre-push-review` works on local changes with no PR, so it never posts comments — its deliverable is the report plus the Pass/Warn/Fail scorecard and push-readiness recommendation.

The skills never approve, request changes, merge, or push on your behalf unless you say so.

## Repository layout

```text
ai-code-skills/
├── package.json            # npm package + bin
├── bin/
│   └── cli.js              # list / install / uninstall / where (you pick skills)
├── install.sh              # shell installer (alternative to npx)
├── uninstall.sh
├── README.md
├── CHANGELOG.md
├── LICENSE
└── skills/
    ├── nextjs-pr-review/
    │   ├── SKILL.md
    │   ├── assets/PR_REVIEW_REPORT_TEMPLATE.md
    │   ├── references/{SECURITY,PERFORMANCE,CLEAN_CODE}.md
    │   └── scripts/{pr-diff.sh,detect-stack.sh,validate-report.py}
    ├── laravel-pr-review/
    │   ├── SKILL.md
    │   ├── assets/PR_REVIEW_REPORT_TEMPLATE.md
    │   ├── references/{SECURITY,PERFORMANCE,CLEAN_CODE}.md
    │   └── scripts/{pr-diff.sh,detect-stack.sh,validate-report.py}
    ├── pre-push-review/
    │   ├── SKILL.md
    │   ├── assets/PRE_PUSH_REVIEW_REPORT_TEMPLATE.md
    │   ├── references/{SECURITY,PERFORMANCE,CLEAN_CODE,SCORING}.md
    │   └── scripts/{local-diff.sh,detect-stack.sh,validate-report.py}
    ├── technical-seo-geo-audit/
    │   ├── SKILL.md
    │   ├── package.json                 # optional deps: playwright, cheerio
    │   ├── assets/SEO_GEO_AUDIT_REPORT_TEMPLATE.md
    │   ├── references/{seo-checks,geo-checks,severity-rubric}.md
    │   └── scripts/
    │       ├── crawl.mjs report.mjs run.mjs static.mjs
    │       ├── checks/{crawlability,rendering,performance,metadata,semantics,geo}.mjs
    │       ├── lib/{fetch,html,findings,args}.mjs
    │       ├── fixtures/ selftest.mjs
    │       └── detect-stack.sh validate-report.py
    ├── web-perf-audit/
    │   ├── SKILL.md
    │   ├── package.json                 # no required deps (Node 18+ native fetch)
    │   ├── assets/{PERFORMANCE_AUDIT_TEMPLATE,PERFORMANCE_PLAN_TEMPLATE}.md
    │   ├── assets/{rum-collector.js,budgets.example.json}
    │   ├── references/{CORE_WEB_VITALS,RUM_IMPLEMENTATION,FIELD_DATA_SOURCES,DIAGNOSTICS,
    │   │              NEXTJS_REACT,NETWORK_API,BUDGETS_REGRESSION,SEVERITY_RUBRIC,REFERENCES}.md
    │   └── scripts/
    │       ├── run.mjs crux.mjs psi.mjs static.mjs report.mjs
    │       ├── budgets.mjs compare.mjs
    │       ├── checks/{cwv,js,network,api,images,fonts,thirdparty,runtime,static}.mjs
    │       ├── lib/{args,fetch,thresholds,percentiles,findings,measure,budgets,snapshot}.mjs
    │       ├── fixtures/ selftest.mjs
    │       └── detect-stack.sh validate-report.py
    ├── rephrase-code-comments/
    │   ├── SKILL.md
    │   ├── references/{WRITING_STANDARD,REWRITE_RULES,LANGUAGE_MOOD,WORD_LIST}.md
    │   └── scripts/{scan-prose.py,detect-stack.sh}
    ├── code-architecture-drawer/
    │   ├── SKILL.md
    │   ├── assets/ARCHITECTURE_TEMPLATE.md
    │   ├── references/{ARCHITECTURE_STANDARDS,STRUCTURAL_RULES,GAP_CATALOGUE,DIAGRAM_GUIDE}.md
    │   └── scripts/{scan-architecture.py,validate-report.py,render-html.py,detect-stack.sh}
    ├── comment-cleanup/
    │   ├── SKILL.md
    │   ├── references/{COMMENT_STANDARD,LANGUAGE_CONVENTIONS,ANTIPATTERNS}.md
    │   └── scripts/{scan-comments.py,detect-stack.sh}
    └── delegate/
        ├── SKILL.md
        ├── references/TARGETS.md         # per-tool adapter matrix + gotchas
        └── scripts/{detect-clis.sh,delegate.sh}
```

## Adding a new skill

1. Create `skills/<your-skill>/SKILL.md` with YAML frontmatter (`name`, `description`, `license`).
2. Add `references/`, `scripts/`, and `assets/` as needed (the diff/validate scripts are reusable).
3. That's it — the CLI auto-discovers any directory under `skills/` containing a `SKILL.md`, so `list` and `install` pick it up with no code changes.

## Helper scripts (per skill)

```bash
skills/<skill>/scripts/pr-diff.sh origin/main       # structured PR/branch diff (PR reviewers)
skills/<skill>/scripts/pr-diff.sh --pr 123           # needs authenticated gh
skills/pre-push-review/scripts/local-diff.sh         # local uncommitted diff (pre-push reviewer)
skills/pre-push-review/scripts/local-diff.sh --staged   # or --unpushed / --all-local
skills/<skill>/scripts/detect-stack.sh               # summarize the stack
python3 skills/<skill>/scripts/validate-report.py <report>.md

skills/web-perf-audit/scripts/crux.mjs               # CrUX field data (p75 + 25-week history)
skills/web-perf-audit/scripts/psi.mjs                # Lighthouse lab + CrUX field via PageSpeed Insights
skills/web-perf-audit/scripts/budgets.mjs            # budget gate — exits 1 on breach
skills/web-perf-audit/scripts/compare.mjs            # per-deploy regression gate — exits 1 on regression

skills/comment-cleanup/scripts/scan-comments.py      # inventory comments + flag cleanup candidates
skills/comment-cleanup/scripts/scan-comments.py src/ --rules DUP,DEAD --summary-only
skills/comment-cleanup/scripts/scan-comments.py --json   # structured findings

skills/rephrase-code-comments/scripts/scan-prose.py                 # flag wordy / vague / robotic comment wording
skills/rephrase-code-comments/scripts/scan-prose.py --since origin/main --rules WORDY,FILLER,AI
skills/rephrase-code-comments/scripts/scan-prose.py --python-mood imperative --json

skills/code-architecture-drawer/scripts/scan-architecture.py                     # components, metrics, cycles, gap signals
skills/code-architecture-drawer/scripts/scan-architecture.py --mermaid all       # C4-style container + component diagrams
skills/code-architecture-drawer/scripts/scan-architecture.py --scope apps/api --mermaid components
python3 skills/code-architecture-drawer/scripts/validate-report.py ARCHITECTURE.md
python3 skills/code-architecture-drawer/scripts/render-html.py ARCHITECTURE.md   # standalone HTML, live diagrams

skills/delegate/scripts/detect-clis.sh               # which model CLIs are installed + how to call each
skills/delegate/scripts/delegate.sh --to opencode --dry-run "hi"   # preview the resolved command
skills/delegate/scripts/delegate.sh --to codex --mode edit "..."   # run it (read-only is the default)
```

### Delegate — target to CLI

| Target | Headless command |
|---|---|
| codex | `codex exec` |
| opencode | `opencode run` |
| claude | `claude -p` |
| cursor | `cursor-agent -p` |
| gemini | `gemini -p` |
| aider | `aider --message` |

## License

MIT — see [LICENSE](LICENSE).
