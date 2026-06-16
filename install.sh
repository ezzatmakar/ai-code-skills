#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./install.sh [--user|--project] [--both|--all-clients|--codex|--claude|--opencode] [--all] [skills...] [--root <project-root>]

You must choose which skills to install: name them, or pass --all.
Client targets: --both (Claude+Codex, default), --all-clients (adds OpenCode),
or a single --claude / --codex / --opencode. OpenCode also reads ~/.claude/skills,
so --both already works there; use --opencode for its native path too.

Examples:
  ./install.sh --user --both nextjs-pr-review
  ./install.sh --user --all-clients --all
  ./install.sh --user --opencode laravel-pr-review
  ./install.sh --project --both --root /path/to/app laravel-pr-review
  ./install.sh --list
USAGE
}

scope="user"
target_client="both"
project_root=""
install_all=false
list_only=false
skills=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) scope="user"; shift ;;
    --project) scope="project"; shift ;;
    --both) target_client="both"; shift ;;
    --all-clients) target_client="all"; shift ;;
    --codex) target_client="codex"; shift ;;
    --claude) target_client="claude"; shift ;;
    --opencode) target_client="opencode"; shift ;;
    --all) install_all=true; shift ;;
    --list) list_only=true; shift ;;
    --root|--dir|--project-root) project_root="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 2 ;;
    *) skills+=("$1"); shift ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skills_root="$script_dir/skills"

if [[ ! -d "$skills_root" ]]; then
  echo "Error: skills directory not found at $skills_root" >&2
  exit 1
fi

available=()
for d in "$skills_root"/*/; do
  [[ -f "${d}SKILL.md" ]] && available+=("$(basename "$d")")
done

if $list_only; then
  echo "Available skills:"
  for s in "${available[@]}"; do echo "  • $s"; done
  exit 0
fi

# Resolve which skills to install.
selected=()
if $install_all; then
  selected=("${available[@]}")
elif [[ ${#skills[@]} -gt 0 ]]; then
  for s in "${skills[@]}"; do
    found=false
    for a in "${available[@]}"; do [[ "$a" == "$s" ]] && found=true; done
    if ! $found; then echo "Unknown skill: $s" >&2; exit 1; fi
    selected+=("$s")
  done
else
  echo "Choose which skill(s) to install by name, or pass --all." >&2
  echo "Available skills:" >&2
  for s in "${available[@]}"; do echo "  • $s" >&2; done
  exit 2
fi

if [[ "$scope" == "project" ]]; then
  project_root="${project_root:-$PWD}"
  project_root="$(cd "$project_root" && pwd)"
fi

dest_base() {
  # $1 = claude|codex|opencode  (OpenCode differs by scope)
  local client="$1" sub
  case "$client" in
    claude) sub=".claude/skills" ;;
    codex)  sub=".agents/skills" ;;
    opencode)
      if [[ "$scope" == "user" ]]; then sub=".config/opencode/skills"; else sub=".opencode/skills"; fi
      ;;
  esac
  if [[ "$scope" == "user" ]]; then echo "$HOME/$sub"; else echo "$project_root/$sub"; fi
}

install_one() {
  local name="$1" client="$2"
  local destination; destination="$(dest_base "$client")/$name"
  mkdir -p "$(dirname "$destination")"
  rm -rf "$destination"
  cp -R "$skills_root/$name" "$destination"
  echo "Installed $name ($client): $destination"
}

clients_for_target() {
  case "$target_client" in
    both) echo "codex claude" ;;
    all)  echo "codex claude opencode" ;;
    *)    echo "$target_client" ;;
  esac
}

for name in "${selected[@]}"; do
  for client in $(clients_for_target); do install_one "$name" "$client"; done
done

cat <<'DONE'

Installation complete.
Claude Code: invoke with /<skill-name> (e.g. /nextjs-pr-review).
Codex:       invoke with $<skill-name> (e.g. $laravel-pr-review).
OpenCode:    available automatically (it also reads ~/.claude/skills).
DONE
