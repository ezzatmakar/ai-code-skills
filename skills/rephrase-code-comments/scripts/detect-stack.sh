#!/usr/bin/env bash
# Detect the project's languages, tooling, and prose rules before rewording comments.
# Stack-agnostic: prints a short Markdown summary. Read source to confirm anything
# that affects findings. Always exits 0.
#
# Usage: detect-stack.sh [project-root]
set -euo pipefail

root="${1:-$PWD}"
if git -C "$root" rev-parse --show-toplevel >/dev/null 2>&1; then
  root="$(git -C "$root" rev-parse --show-toplevel)"
fi
cd "$root"

printf '## Detected stack\n\n'
printf -- '- Root: `%s`\n' "$root"

# --- Languages by manifest ---
langs=""
add_lang() { case " $langs " in *" $1 "*) ;; *) langs="$langs $1" ;; esac; }

[[ -f package.json ]] && add_lang "JavaScript/TypeScript"
[[ -f composer.json ]] && add_lang "PHP"
{ [[ -f pyproject.toml ]] || [[ -f requirements.txt ]] || [[ -f setup.py ]] || [[ -f Pipfile ]]; } && add_lang "Python"
[[ -f go.mod ]] && add_lang "Go"
[[ -f Gemfile ]] && add_lang "Ruby"
[[ -f Cargo.toml ]] && add_lang "Rust"
{ [[ -f pom.xml ]] || [[ -f build.gradle ]] || [[ -f build.gradle.kts ]]; } && add_lang "Java/Kotlin"
[[ -f Package.swift ]] && add_lang "Swift"
[[ -f pubspec.yaml ]] && add_lang "Dart/Flutter"
find . -maxdepth 2 -name '*.csproj' 2>/dev/null | grep -q . && add_lang ".NET/C#"

langs="${langs# }"
printf -- '- Languages (by manifest): `%s`\n' "${langs:-none detected}"

# --- Lockfiles / package managers ---
locks=""
[[ -f pnpm-lock.yaml ]] && locks="$locks pnpm"
[[ -f yarn.lock ]] && locks="$locks yarn"
{ [[ -f bun.lockb ]] || [[ -f bun.lock ]]; } && locks="$locks bun"
[[ -f package-lock.json ]] && locks="$locks npm"
[[ -f composer.lock ]] && locks="$locks composer"
[[ -f poetry.lock ]] && locks="$locks poetry"
[[ -f Pipfile.lock ]] && locks="$locks pipenv"
[[ -f go.sum ]] && locks="$locks go-modules"
[[ -f Gemfile.lock ]] && locks="$locks bundler"
[[ -f Cargo.lock ]] && locks="$locks cargo"
locks="${locks# }"
printf -- '- Lockfiles: `%s`\n' "${locks:-none}"

# --- Lightweight framework hints (grep on manifests; no runtime needed) ---
hint() {
  # $1 = file, $2 = pattern, $3 = label
  grep -qE "$2" "$1" 2>/dev/null && printf -- '- Framework hint: `%s`\n' "$3"
  return 0
}
if [[ -f package.json ]]; then
  hint package.json '"next"' "Next.js"
  hint package.json '"react"' "React"
  hint package.json '"vue"' "Vue"
  hint package.json '"@angular/core"' "Angular"
  hint package.json '"svelte"' "Svelte"
  hint package.json '"express"' "Express"
  hint package.json '"@nestjs/core"' "NestJS"
fi
if [[ -f composer.json ]]; then
  hint composer.json 'laravel/framework' "Laravel"
  hint composer.json 'symfony/' "Symfony"
fi
if [[ -f requirements.txt || -f pyproject.toml ]]; then
  grep -qiE 'django' requirements.txt pyproject.toml 2>/dev/null && printf -- '- Framework hint: `Django`\n'
  grep -qiE 'flask' requirements.txt pyproject.toml 2>/dev/null && printf -- '- Framework hint: `Flask`\n'
  grep -qiE 'fastapi' requirements.txt pyproject.toml 2>/dev/null && printf -- '- Framework hint: `FastAPI`\n'
fi

# --- Prose and doc-comment rules the project already enforces (these win) ---
rules=""
for f in .vale.ini _vale.ini .alexrc .alexrc.json .alexrc.yml .alexignore .textlintrc .textlintrc.json \
         .textlintrc.yml cspell.json .cspell.json cspell.config.yaml cspell.config.js \
         .markdownlint.json .writegood.json; do
  [[ -f "$f" ]] && rules="$rules $f"
done
if [[ -f package.json ]]; then
  grep -qE '"eslint-plugin-jsdoc"' package.json && rules="$rules eslint-plugin-jsdoc"
  grep -qE '"write-good"' package.json && rules="$rules write-good"
  grep -qE '"alex"' package.json && rules="$rules alex"
  grep -qE '"cspell"' package.json && rules="$rules cspell"
fi
for f in pyproject.toml setup.cfg tox.ini .pydocstyle .pydocstyle.ini ruff.toml .ruff.toml; do
  [[ -f "$f" ]] || continue
  conv="$(grep -oE 'convention\s*=\s*"?(pep257|numpy|google)' "$f" 2>/dev/null | head -1 | grep -oE 'pep257|numpy|google')"
  [[ -n "$conv" ]] && rules="$rules pydocstyle:$conv($f)"
  grep -qE '"D"|D401|select.*\bD\b' "$f" 2>/dev/null && rules="$rules ruff-D($f)"
done
for f in .golangci.yml .golangci.yaml .golangci.toml; do
  [[ -f "$f" ]] && grep -qE 'godot|revive' "$f" && rules="$rules golangci:godot/revive"
done
find . -maxdepth 3 -name 'stylecop.json' -not -path './node_modules/*' 2>/dev/null | grep -q . \
  && rules="$rules StyleCop"
rules="${rules# }"
printf -- '- Prose / doc-comment rules configured: `%s`\n' "${rules:-none — house rules apply}"

# --- House voice hints: spelling variant in existing source (identifiers count too) ---
count_words() {
  git ls-files 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|mjs|py|go|php|rb|rs|java|kt|cs|swift)$' \
    | head -400 | tr '\n' '\0' | xargs -0 grep -hoiE "$1" 2>/dev/null | wc -l | tr -d ' '
}
if git rev-parse --git-dir >/dev/null 2>&1; then
  uk="$(count_words '\b(colour|behaviour|initialis|normalis|serialis|optimis|licence|favour|analys(e|ing))')"
  us="$(count_words '\b(color|behavior|initializ|normaliz|serializ|optimiz|license|favor|analyz(e|ing))')"
  printf -- '- Spelling signal (a hint only; identifiers count too): UK %s / US %s\n' "$uk" "$us"
fi

# --- Test / lint command surfaces (so Phase 3 can run the repo's own checks) ---
runners=""
[[ -f package.json ]] && runners="$runners package.json:scripts"
[[ -f composer.json ]] && runners="$runners composer.json:scripts"
[[ -f Makefile ]] && runners="$runners Makefile"
[[ -f justfile || -f Justfile ]] && runners="$runners justfile"
[[ -f tox.ini ]] && runners="$runners tox"
[[ -f noxfile.py ]] && runners="$runners nox"
runners="${runners# }"
printf -- '- Command surfaces: `%s`\n' "${runners:-none obvious}"

# --- Repo guidance worth reading before reviewing ---
printf -- '- Guidance files:'
found_guidance=0
for f in AGENTS.md CLAUDE.md CONTRIBUTING.md README.md; do
  [[ -f "$f" ]] && { printf ' `%s`' "$f"; found_guidance=1; }
done
[[ "$found_guidance" -eq 0 ]] && printf ' none'
printf '\n'

printf '\nFollow any configured prose or doc-comment rule above over the house rules, and name it in the summary.\n'
