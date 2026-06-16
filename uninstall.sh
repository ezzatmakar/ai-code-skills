#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: ./uninstall.sh [--user|--project] [--both|--codex|--claude] [--all] [skills...] [--root <project-root>]

Name the skills to remove, or pass --all.
USAGE
}

scope="user"
target_client="both"
project_root=""
remove_all=false
skills=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) scope="user"; shift ;;
    --project) scope="project"; shift ;;
    --both) target_client="both"; shift ;;
    --codex) target_client="codex"; shift ;;
    --claude) target_client="claude"; shift ;;
    --all) remove_all=true; shift ;;
    --root|--dir|--project-root) project_root="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 2 ;;
    *) skills+=("$1"); shift ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skills_root="$script_dir/skills"

available=()
for d in "$skills_root"/*/; do
  [[ -f "${d}SKILL.md" ]] && available+=("$(basename "$d")")
done

selected=()
if $remove_all; then
  selected=("${available[@]}")
elif [[ ${#skills[@]} -gt 0 ]]; then
  selected=("${skills[@]}")
else
  echo "Name the skill(s) to remove, or pass --all." >&2
  echo "Available skills:" >&2
  for s in "${available[@]}"; do echo "  • $s" >&2; done
  exit 2
fi

if [[ "$scope" == "project" ]]; then
  project_root="${project_root:-$PWD}"
  project_root="$(cd "$project_root" && pwd)"
fi

dest_base() {
  local client="$1" sub
  [[ "$client" == "claude" ]] && sub=".claude/skills" || sub=".agents/skills"
  if [[ "$scope" == "user" ]]; then echo "$HOME/$sub"; else echo "$project_root/$sub"; fi
}

remove_one() {
  local name="$1" client="$2"
  local destination; destination="$(dest_base "$client")/$name"
  if [[ -d "$destination" ]]; then
    rm -rf "$destination"
    echo "Removed $name ($client): $destination"
  else
    echo "Not installed $name ($client): $destination"
  fi
}

for name in "${selected[@]}"; do
  if [[ "$target_client" == "both" || "$target_client" == "codex" ]]; then remove_one "$name" codex; fi
  if [[ "$target_client" == "both" || "$target_client" == "claude" ]]; then remove_one "$name" claude; fi
done
