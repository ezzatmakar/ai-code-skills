#!/usr/bin/env bash
# Delegate one task to a named model CLI, headlessly, and capture its output.
# This is an EXPLICIT dispatcher: you name the target; it never routes or
# substitutes another model. Defaults to read-only. Use --dry-run to preview the
# exact command before spending the target's credits.
#
# Usage:
#   delegate.sh --to <codex|opencode|claude|cursor|gemini> \
#               [--model M] [--mode read-only|edit] [--timeout SECS] \
#               [--json] [--dry-run] [--cwd DIR] [--] "PROMPT"
#   delegate.sh --to <target> --list-models
#
#   The PROMPT may be given as the final argument OR piped on stdin, e.g.
#     delegate.sh --to codex "explain this file"
#     delegate.sh --to codex --stdin <<'EOF'
#     explain this file, including the `edge` case where token == ""
#     EOF
#
# Options:
#   --to TARGET     Required. Which CLI to delegate to.
#   --model M       Model override passed through to the target.
#   --mode MODE     read-only (default) forbids file writes; edit enables the
#                   target's least-dangerous auto-approve/write mode.
#   --timeout SECS  Wall-clock limit (default 600; 0 disables). Enforced with a
#                   timeout tool when present, else a built-in watchdog.
#   --json          Ask the target for structured JSON output (where supported).
#   --dry-run       Print the resolved command and exit without executing.
#   --cwd DIR       Run the delegate from DIR (default: current directory).
#   --stdin         Read the prompt from stdin (heredoc-friendly, quote-proof).
#   --list-models   List the target's available models and exit.
#
# Binary resolution order per target: $DELEGATE_<TOOL>_BIN, then PATH, then known
# locations (codex ships inside ChatGPT.app on macOS and is often off-PATH).
#
# Exit codes: 2 usage error, 3 target not installed, 124 timeout, else the
# target CLI's own exit code.
set -uo pipefail
export NO_COLOR=1   # neutralise ANSI colour in captured output

die() { printf 'Error: %s\n' "$1" >&2; exit "${2:-2}"; }

TARGET=""; MODEL=""; MODE="read-only"; TIMEOUT="600"; JSON=0; DRYRUN=0
CWD="$PWD"; PROMPT=""; USE_STDIN=0; LIST_MODELS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --to)          TARGET="${2:-}"; shift 2 ;;
    --model|-m)    MODEL="${2:-}"; shift 2 ;;
    --mode)        MODE="${2:-}"; shift 2 ;;
    --timeout)     TIMEOUT="${2:-}"; shift 2 ;;
    --json)        JSON=1; shift ;;
    --dry-run)     DRYRUN=1; shift ;;
    --cwd|--cd)    CWD="${2:-}"; shift 2 ;;
    --stdin)       USE_STDIN=1; shift ;;
    --list-models) LIST_MODELS=1; shift ;;
    -h|--help)     grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --)            shift; PROMPT="${*:-}"; break ;;
    -*)            die "unknown option '$1' (try --help)" ;;
    *)             PROMPT="$1"; shift ;;
  esac
done

[ -n "$TARGET" ] || die "missing --to <target>"
case "$TARGET" in
  codex|opencode|claude|cursor|gemini|aider) ;;
  *) die "unknown target '$TARGET' (codex|opencode|claude|cursor|gemini|aider)" ;;
esac

# --- Resolve the target binary ----------------------------------------------
# Order: $DELEGATE_<TOOL>_BIN override, then PATH, then known install locations.
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
  esac
}

BIN="$(resolve_bin "$TARGET" || true)"
if [ -z "$BIN" ]; then
  printf 'Error: target "%s" is not installed. Run detect-clis.sh to see what is available; do not substitute another model.\n' "$TARGET" >&2
  exit 3
fi

# --- List models and exit ---------------------------------------------------
if [ "$LIST_MODELS" -eq 1 ]; then
  case "$TARGET" in
    opencode) "$BIN" models ;;
    cursor)   "$BIN" --list-models ;;
    gemini)   "$BIN" --list-models 2>/dev/null || printf 'gemini: check `gemini --help` for model options.\n' ;;
    claude)   printf 'claude models are fixed: opus, sonnet, haiku (and dated aliases). Pass one with --model.\n' ;;
    codex)    printf 'codex has no list command. Choose a model with -m, or see ~/.codex/config.toml.\n' ;;
    aider)    "$BIN" --list-models "" ;;
  esac
  exit 0
fi

# --- Validate the rest ------------------------------------------------------
case "$MODE" in read-only|edit) ;; *) die "invalid --mode '$MODE' (use read-only|edit)" ;; esac
case "$TIMEOUT" in ''|*[!0-9]*) die "invalid --timeout '$TIMEOUT' (seconds, or 0 to disable)" ;; esac
[ -d "$CWD" ] || die "--cwd is not a directory: $CWD"

# Prompt from stdin (explicit --stdin, or implicit when none was given on a pipe).
if [ "$USE_STDIN" -eq 1 ] || { [ -z "$PROMPT" ] && [ ! -t 0 ]; }; then
  PROMPT="$(cat)"
fi
[ -n "$PROMPT" ] || die "empty prompt (pass it as the final argument, with --stdin, or on a pipe)"

# --- Build the per-target command as an array (no eval, no shell-escaping) --
cmd=()
LAST_MSG_FILE=""   # codex writes its final answer here in text mode
AIDER_TMP=""       # aider history redirected here to keep the repo clean
AIDER_CWD=""       # where aider ran, for post-run repo-map cache cleanup
AIDER_CACHE_PREEXISTED=0
case "$TARGET" in
  codex)
    sandbox="read-only"; [ "$MODE" = "edit" ] && sandbox="workspace-write"
    cmd=("$BIN" exec -s "$sandbox" --skip-git-repo-check -C "$CWD")
    [ -n "$MODEL" ] && cmd+=(-m "$MODEL")
    if [ "$JSON" -eq 1 ]; then
      cmd+=(--json)
    else
      LAST_MSG_FILE="$(mktemp -t delegate-codex 2>/dev/null || mktemp)"
      cmd+=(--output-last-message "$LAST_MSG_FILE")
    fi
    cmd+=("$PROMPT")
    ;;
  opencode)
    cmd=("$BIN" run)
    [ -n "$MODEL" ] && cmd+=(-m "$MODEL")
    [ "$JSON" -eq 1 ] && cmd+=(--format json)
    [ "$MODE" = "edit" ] && cmd+=(--auto)
    cmd+=("$PROMPT")
    ;;
  claude)
    perm="plan"; [ "$MODE" = "edit" ] && perm="acceptEdits"
    cmd=("$BIN" -p --permission-mode "$perm")
    [ -n "$MODEL" ] && cmd+=(--model "$MODEL")
    [ "$JSON" -eq 1 ] && cmd+=(--output-format json)
    cmd+=("$PROMPT")
    ;;
  cursor)
    cmd=("$BIN" -p)
    [ -n "$MODEL" ] && cmd+=(--model "$MODEL")
    if [ "$MODE" = "edit" ]; then cmd+=(-f); else cmd+=(--mode ask); fi
    [ "$JSON" -eq 1 ] && cmd+=(--output-format json)
    cmd+=("$PROMPT")
    ;;
  gemini)
    [ "$JSON" -eq 1 ] && printf 'Note: gemini has no JSON output mode wired here; returning text.\n' >&2
    [ "$MODE" = "edit" ] && printf 'Note: edit mode is not wired for gemini; running read-only.\n' >&2
    cmd=("$BIN" -p "$PROMPT")
    [ -n "$MODEL" ] && cmd+=(-m "$MODEL")
    ;;
  aider)
    # aider is edit-first and auto-commits by default. read-only -> --dry-run (no
    # file changes); edit -> --no-auto-commits (apply to the working tree but do not
    # commit, matching the other targets). --yes-always keeps it non-interactive.
    # --no-gitignore stops aider mutating the repo's .gitignore, and chat/input
    # history go to a temp dir so a delegation leaves no .aider* files behind.
    [ "$JSON" -eq 1 ] && printf 'Note: aider has no JSON output mode; returning text.\n' >&2
    AIDER_TMP="$(mktemp -d -t delegate-aider 2>/dev/null || mktemp -d)"
    AIDER_CWD="$CWD"
    ls "$CWD"/.aider.tags.cache.* >/dev/null 2>&1 && AIDER_CACHE_PREEXISTED=1
    cmd=("$BIN" --message "$PROMPT" --yes-always --no-pretty --no-gitignore
         --chat-history-file "$AIDER_TMP/chat.md" --input-history-file "$AIDER_TMP/input.txt")
    [ -n "$MODEL" ] && cmd+=(--model "$MODEL")
    if [ "$MODE" = "edit" ]; then cmd+=(--no-auto-commits); else cmd+=(--dry-run); fi
    ;;
esac

# --- Resolve an optional timeout wrapper ------------------------------------
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
TIMEOUT_BIN=""
[ "$TIMEOUT" != "0" ] && TIMEOUT_BIN="$(find_timeout || true)"

# --- Dry-run: show exactly what would execute -------------------------------
if [ "$DRYRUN" -eq 1 ]; then
  printf '# Delegation (dry run)\n'
  printf -- '- Target: %s   Mode: %s   Model: %s   JSON: %s\n' \
    "$TARGET" "$MODE" "${MODEL:-default}" "$([ "$JSON" -eq 1 ] && echo yes || echo no)"
  printf -- '- Binary: %s\n' "$BIN"
  printf -- '- Working dir: %s\n' "$CWD"
  if [ "$TIMEOUT" = "0" ]; then
    printf -- '- Timeout: disabled\n'
  elif [ -n "$TIMEOUT_BIN" ]; then
    printf -- '- Timeout: %ss (via %s)\n' "$TIMEOUT" "$TIMEOUT_BIN"
  else
    printf -- '- Timeout: %ss (via built-in watchdog)\n' "$TIMEOUT"
  fi
  printf -- '- Command:\n    '
  for a in "${cmd[@]}"; do printf '%q ' "$a"; done
  printf '\n'
  [ -n "$LAST_MSG_FILE" ] && rm -f "$LAST_MSG_FILE"
  [ -n "$AIDER_TMP" ] && rm -rf "$AIDER_TMP"
  exit 0
fi

# --- Execute ----------------------------------------------------------------
printf '# Delegated to %s (%s mode, model %s)\n\n' "$TARGET" "$MODE" "${MODEL:-default}" >&2

rc=0
if [ -n "$TIMEOUT_BIN" ]; then
  ( cd "$CWD" && exec "$TIMEOUT_BIN" "$TIMEOUT" "${cmd[@]}" ); rc=$?
elif [ "$TIMEOUT" != "0" ]; then
  # Portable watchdog: run in background, kill on deadline, normalise to 124.
  ( cd "$CWD" && exec "${cmd[@]}" ) &
  pid=$!
  ( sleep "$TIMEOUT"; kill -TERM "$pid" 2>/dev/null; sleep 5; kill -KILL "$pid" 2>/dev/null ) &
  wd=$!
  wait "$pid"; rc=$?
  kill "$wd" 2>/dev/null; wait "$wd" 2>/dev/null || true
  { [ "$rc" -eq 143 ] || [ "$rc" -eq 137 ]; } && rc=124
else
  ( cd "$CWD" && exec "${cmd[@]}" ); rc=$?
fi

[ "$rc" -eq 124 ] && printf '\n[delegate] target "%s" timed out after %ss (partial output above).\n' "$TARGET" "$TIMEOUT" >&2

# codex text mode: the clean final answer is in the last-message file.
if [ -n "$LAST_MSG_FILE" ] && [ -s "$LAST_MSG_FILE" ]; then
  printf '\n--- final message ---\n'
  cat "$LAST_MSG_FILE"
fi
[ -n "$LAST_MSG_FILE" ] && rm -f "$LAST_MSG_FILE"
[ -n "$AIDER_TMP" ] && rm -rf "$AIDER_TMP"
# Remove the repo-map cache only if our aider run created it (never a pre-existing one).
if [ "$TARGET" = "aider" ] && [ "$AIDER_CACHE_PREEXISTED" = "0" ] && [ -n "$AIDER_CWD" ]; then
  rm -rf "$AIDER_CWD"/.aider.tags.cache.* 2>/dev/null || true
fi

exit "$rc"
