# Delegation targets — adapter matrix

Per-tool details `delegate.sh` uses to build a **headless, non-interactive** invocation of each model
CLI. Read this when a delegation errors, when choosing `--model`, or when adding a new target. All flag
names were verified against each tool's live `--help`.

## Quick matrix

| Target | Headless entry | `--model` syntax | Structured output | Read-only mode | Edit / auto-approve | Prompt channel |
|---|---|---|---|---|---|---|
| **codex** | `codex exec` | `-m MODEL` | `--json` (event stream) or `--output-last-message FILE` (final only) | `-s read-only` | `-s workspace-write` | positional arg |
| **opencode** | `opencode run` | `-m provider/model` | `--format json` | default (no `--auto`) | `--auto` | positional arg |
| **claude** | `claude -p` | `--model MODEL` | `--output-format json` (final = `.result`) | `--permission-mode plan` | `--permission-mode acceptEdits` | positional arg |
| **cursor** | `cursor-agent -p` | `--model MODEL` | `--output-format json` (final = `.result`) | `--mode ask` | `-f` / `--force` | positional arg |
| **gemini** | `gemini -p` | `-m MODEL` | (text only) | default | (not wired) | value of `-p` |
| **aider** | `aider --message` | `--model MODEL` | (text only) | `--dry-run` | `--no-auto-commits` | value of `--message` |

`--mode read-only` (default) maps to each tool's non-writing mode; `--mode edit` maps to its
**least-dangerous** auto-approving mode. `delegate.sh` never emits a tool's nuclear bypass flag
(`codex -s danger-full-access`, `codex --dangerously-bypass-approvals-and-sandbox`,
`claude --dangerously-skip-permissions`). "Edit" still cannot prompt mid-run, so a step that needs an
approval the auto mode does not grant may simply be skipped by the target — review the working tree after
an edit-mode run.

## Binary resolution

`delegate.sh` and `detect-clis.sh` resolve each target the same way, in order:

1. `$DELEGATE_<TOOL>_BIN` (e.g. `DELEGATE_CODEX_BIN=/path/to/codex`) — an explicit override.
2. `PATH` (`command -v`).
3. Known install locations (codex only, see below).

### codex is the off-PATH gotcha

On macOS, `codex` usually is **not on `PATH`** — it ships inside the ChatGPT desktop app. Resolution
falls back to:

- `/Applications/ChatGPT.app/Contents/Resources/codex`
- `$HOME/Applications/ChatGPT.app/Contents/Resources/codex`
- `$HOME/.codex/bin/codex`

This is a bundled alpha build tied to the app, so its path/version can change on app updates. If codex
moves, set `DELEGATE_CODEX_BIN`. `delegate.sh` always passes `--skip-git-repo-check` so codex runs
outside a git repo, and `-C <cwd>` to set its working directory.

### gemini may be absent

`gemini` is frequently not installed. When the target is unavailable, `delegate.sh` **stops with exit 3
and an install hint** — it never silently substitutes another model. Install with
`npm i -g @google/gemini-cli`, or pick an installed target from `detect-clis.sh`.

### aider commits to git by default

`aider` is **edit-first**: unlike the others it will apply changes and, by default, **auto-commit them to
git**. `delegate.sh` maps the modes to keep it consistent with every other target:

- **read-only** → `--dry-run` — aider reasons about the change but writes nothing.
- **edit** → `--no-auto-commits` — aider edits the **working tree** but does not create commits, so you
  review and commit yourself (same as codex/claude/cursor/opencode edit mode).

Both modes add `--yes-always` (non-interactive, no confirmation prompts) and `--no-pretty` (cleaner
captured output). aider has **no JSON output** (`--json` returns text). It needs a model + API key
configured for its provider (e.g. `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` or `~/.aider.conf.yml`); a missing
one surfaces as aider's own error, which `delegate.sh` passes through. The prompt is passed as the value
of `--message`.

To keep a delegation non-invasive, `delegate.sh` runs aider with `--no-gitignore` (so it never edits the
repo's tracked `.gitignore`), redirects `--chat-history-file`/`--input-history-file` to a temp dir, and
removes the `.aider.tags.cache.*` repo-map cache **only if our run created it** (a pre-existing aider
cache is left untouched). A read-only aider delegation therefore leaves the working tree clean.

## Output capture

Prefer **text** output; only pass `--json` when you actually want structured events.

- **codex** — in text mode `delegate.sh` captures the clean final answer via `--output-last-message`
  (a temp file it prints under `--- final message ---`, then deletes). In `--json` mode it streams the
  raw JSONL event stream to stdout.
- **claude / cursor** — text mode: stdout is the final answer. `--json` mode: one JSON object whose
  final text is `.result`.
- **opencode** — text mode: the human-readable transcript on stdout. `--json` mode: a verbose raw event
  stream.
- **gemini** — text on stdout.

`jq` is **optional**. `delegate.sh` does not parse JSON itself; when `--json` is used it emits the tool's
raw structured output for the caller to read. Parse it downstream only if needed.

## Timeouts

`--timeout` (default 600s; `0` disables) is enforced with `timeout`/`gtimeout` when present, otherwise a
built-in watchdog (`SIGTERM`, 5s grace, then `SIGKILL`), normalising a timed-out run to exit **124**.
Neither `timeout` nor `gtimeout` is installed by default on macOS — the watchdog covers that case.
Partial output printed before the deadline is preserved.

## Listing models

`delegate.sh --to <target> --list-models`:

- **opencode** → `opencode models`
- **cursor** → `cursor-agent --list-models`
- **claude** → fixed set (opus / sonnet / haiku and dated aliases)
- **codex** → no list command; choose with `-m` or see `~/.codex/config.toml`
- **gemini** → `gemini --list-models` when available
- **aider** → `aider --list-models ""` (lists every known model; pass a substring to filter)

## Cost, auth, and self-delegation

- **Credits.** Each delegation runs on the target's **own auth and billing** (ChatGPT/Codex login,
  OpenCode provider auth, `ANTHROPIC_API_KEY`/Claude login, Cursor login, `GEMINI_API_KEY`). A missing
  login surfaces as the target's own error, which `delegate.sh` passes through. OpenCode exposes several
  `*-free` models (see `--list-models`) useful for zero-cost checks.
- **Secrets.** The prompt is sent verbatim to a third-party CLI. Never put secrets or credentials in it.
- **Self-delegation.** Delegating `--to claude` from inside Claude Code (or `--to codex` from Codex,
  `--to opencode` from OpenCode) spawns a **fresh nested session** — extra cost and loop risk. Confirm
  before doing it, and never chain self-delegations.
