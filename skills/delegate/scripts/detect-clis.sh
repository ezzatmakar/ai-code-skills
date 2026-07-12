#!/usr/bin/env bash
# Detect which model CLIs are available to delegate to, and how to invoke each
# one headlessly. Prints a Markdown summary the skill reads before delegating.
# Stack-agnostic and side-effect free: probes versions only, never runs a task.
# Always exits 0 so a missing tool never aborts the caller.
#
# Usage: detect-clis.sh [target]
#   target  Optional single target to probe (codex|opencode|claude|cursor|gemini).
#           With no argument, probes all five.
set -uo pipefail

# --- Locate a bounded-run helper (may be absent on macOS) -------------------
# timeout / gtimeout are not installed by default on macOS; fall back to running
# the probe directly. Version flags return fast, so unbounded is acceptable here.
find_timeout() {
  local c
  for c in timeout gtimeout; do
    command -v "$c" >/dev/null 2>&1 && { printf '%s' "$c"; return 0; }
  done
  if command -v brew >/dev/null 2>&1; then
    local pfx; pfx="$(brew --prefix coreutils 2>/dev/null || true)"
    [ -n "$pfx" ] && [ -x "$pfx/libexec/gnubin/timeout" ] && { printf '%s' "$pfx/libexec/gnubin/timeout"; return 0; }
  fi
  return 1
}
TIMEOUT_BIN="$(find_timeout || true)"

bounded() {
  # bounded <seconds> <cmd...> — run with a timeout when one is available.
  local secs="$1"; shift
  if [ -n "$TIMEOUT_BIN" ]; then "$TIMEOUT_BIN" "$secs" "$@"; else "$@"; fi
}

# --- Resolve a target's binary path -----------------------------------------
# Returns the resolved path on stdout, or empty + non-zero if not installed.
# Order: $DELEGATE_<TOOL>_BIN override, then PATH, then known install locations.
# codex ships inside the ChatGPT desktop app on macOS and is often NOT on PATH.
# Kept identical to delegate.sh so both scripts agree on what "installed" means.
resolve_bin() {
  local tool="$1" envvar val
  envvar="DELEGATE_$(printf '%s' "$tool" | tr '[:lower:]-' '[:upper:]_')_BIN"
  eval "val=\${$envvar:-}"
  if [ -n "$val" ] && [ -x "$val" ]; then printf '%s' "$val"; return 0; fi
  case "$tool" in
    codex)
      if command -v codex >/dev/null 2>&1; then command -v codex; return 0; fi
      for p in \
        "/Applications/ChatGPT.app/Contents/Resources/codex" \
        "$HOME/Applications/ChatGPT.app/Contents/Resources/codex" \
        "$HOME/.codex/bin/codex"; do
        [ -x "$p" ] && { printf '%s' "$p"; return 0; }
      done
      return 1 ;;
    cursor)   command -v cursor-agent 2>/dev/null ;;
    opencode) command -v opencode 2>/dev/null ;;
    claude)   command -v claude 2>/dev/null ;;
    gemini)   command -v gemini 2>/dev/null ;;
    aider)    command -v aider 2>/dev/null ;;
    *) return 1 ;;
  esac
}

version_of() {
  # Best-effort short version string; never blocks for long, never fails.
  local bin="$1"
  bounded 8 "$bin" --version 2>/dev/null | head -n1 || true
}

invocation_of() {
  case "$1" in
    codex)    printf 'codex exec [-m MODEL] [-s read-only|workspace-write] --skip-git-repo-check "PROMPT"' ;;
    opencode) printf 'opencode run [-m provider/model] [--format json] [--auto] "PROMPT"' ;;
    claude)   printf 'claude -p [--model MODEL] [--permission-mode plan|acceptEdits] [--output-format json] "PROMPT"' ;;
    cursor)   printf 'cursor-agent -p [--model MODEL] [--mode ask | -f] [--output-format json] "PROMPT"' ;;
    gemini)   printf 'gemini -p "PROMPT" [-m MODEL]' ;;
    aider)    printf 'aider --message "PROMPT" --yes-always [--model M] [--dry-run(read-only) | --no-auto-commits(edit)]' ;;
  esac
}

install_hint() {
  case "$1" in
    codex)    printf 'Install the ChatGPT desktop app, or the Codex CLI (npm i -g @openai/codex).' ;;
    opencode) printf 'Install OpenCode: https://opencode.ai (brew install sst/tap/opencode).' ;;
    claude)   printf 'Install Claude Code: https://claude.com/claude-code.' ;;
    cursor)   printf 'Install the Cursor agent CLI: https://cursor.com (cursor-agent).' ;;
    gemini)   printf 'Install the Gemini CLI: npm i -g @google/gemini-cli.' ;;
    aider)    printf 'Install aider: python -m pip install aider-chat (or pipx install aider-chat).' ;;
  esac
}

ALL_TARGETS="codex opencode claude cursor gemini aider"
targets="$ALL_TARGETS"
if [ $# -gt 0 ]; then
  case "$1" in
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  esac
  case " $ALL_TARGETS " in
    *" $1 "*) targets="$1" ;;
    *) printf 'Unknown target: %s (expected one of: %s)\n' "$1" "$ALL_TARGETS" >&2; exit 0 ;;
  esac
fi

printf '## Delegation targets\n\n'
[ -z "$TIMEOUT_BIN" ] && printf -- '- Note: no `timeout`/`gtimeout` found; probes run unbounded.\n\n'
printf '| Target | Installed | Version | Resolved path | Headless invocation |\n'
printf '|---|---|---|---|---|\n'

available=""
for t in $targets; do
  if bin="$(resolve_bin "$t")" && [ -n "$bin" ]; then
    ver="$(version_of "$bin")"; [ -n "$ver" ] || ver="(unknown)"
    printf '| `%s` | yes | %s | `%s` | `%s` |\n' "$t" "$ver" "$bin" "$(invocation_of "$t")"
    available="$available $t"
  else
    printf '| `%s` | **no** | — | — | %s |\n' "$t" "$(install_hint "$t")"
  fi
done

available="${available# }"
printf '\n- Available now: `%s`\n' "${available:-none}"
printf -- '- Delegate with: `delegate.sh --to <target> [--model M] [--mode read-only|edit] "PROMPT"`\n'
exit 0
