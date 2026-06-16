#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./install.sh [--user|--project] [--both|--codex|--claude] [--all] [skills...] [--root <project-root>]

You must choose which skills to install: name them, or pass --all.

Examples:
  ./install.sh --user --both nextjs-pr-review
  ./install.sh --user --both --all
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
    --codex) target_client="codex"; shift ;;
    --claude) target_client="claude"; shift ;;
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
  # $1 = claude|codex
  local client="$1" sub
  [[ "$client" == "claude" ]] && sub=".claude/skills" || sub=".agents/skills"
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

for name in "${selected[@]}"; do
  if [[ "$target_client" == "both" || "$target_client" == "codex" ]]; then install_one "$name" codex; fi
  if [[ "$target_client" == "both" || "$target_client" == "claude" ]]; then install_one "$name" claude; fi
done

cat <<'DONE'

Installation complete.
Claude Code: invoke with /<skill-name> (e.g. /nextjs-pr-review).
Codex:       invoke with $<skill-name> (e.g. $laravel-pr-review).
DONE
