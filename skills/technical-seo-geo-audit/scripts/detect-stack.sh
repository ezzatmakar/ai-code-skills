#!/usr/bin/env bash
# Detect the web framework + rendering model so codebase-mode static analysis
# applies the right lens (Next.js App vs Pages Router, Nuxt, Astro, SPA, etc.).
# Prints a short Markdown summary. Always exits 0.
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
{ [[ -f pyproject.toml ]] || [[ -f requirements.txt ]]; } && add_lang "Python"
[[ -f go.mod ]] && add_lang "Go"
[[ -f Gemfile ]] && add_lang "Ruby"
langs="${langs# }"
printf -- '- Languages (by manifest): `%s`\n' "${langs:-none detected}"

# --- Web framework + rendering model ---
hint() { grep -qE "$2" "$1" 2>/dev/null && printf -- '- Framework: `%s`\n' "$3"; return 0; }
if [[ -f package.json ]]; then
  hint package.json '"next"' "Next.js"
  hint package.json '"nuxt"' "Nuxt"
  hint package.json '"@remix-run/' "Remix"
  hint package.json '"astro"' "Astro"
  hint package.json '"@sveltejs/kit"' "SvelteKit"
  hint package.json '"gatsby"' "Gatsby"
  hint package.json '"@angular/core"' "Angular"
  if grep -qE '"react"' package.json 2>/dev/null && ! grep -qE '"next"|"@remix-run/|"gatsby"' package.json 2>/dev/null; then
    printf -- '- Framework: `React (likely SPA — confirm SSR)`\n'
  fi
  if grep -qE '"vue"' package.json 2>/dev/null && ! grep -qE '"nuxt"' package.json 2>/dev/null; then
    printf -- '- Framework: `Vue (likely SPA — confirm SSR)`\n'
  fi
fi

# --- Next.js router + SEO surfaces ---
router=""
{ [[ -d app ]] || [[ -d src/app ]]; } && router="App Router"
{ [[ -d pages ]] || [[ -d src/pages ]]; } && router="${router:+$router + }Pages Router"
[[ -n "$router" ]] && printf -- '- Next.js router: `%s`\n' "$router"

printf -- '- SEO source files:'
found=0
for f in app/robots.ts app/robots.js src/app/robots.ts public/robots.txt \
         app/sitemap.ts app/sitemap.js src/app/sitemap.ts public/sitemap.xml \
         public/llms.txt; do
  [[ -e "$f" ]] && { printf ' `%s`' "$f"; found=1; }
done
[[ "$found" -eq 0 ]] && printf ' none found'
printf '\n'

# --- Config worth reading ---
printf -- '- Config files:'
foundc=0
for f in next.config.js next.config.mjs next.config.ts nuxt.config.ts astro.config.mjs \
         vercel.json netlify.toml; do
  [[ -f "$f" ]] && { printf ' `%s`' "$f"; foundc=1; }
done
[[ "$foundc" -eq 0 ]] && printf ' none'
printf '\n'

printf '\nCodebase mode does static analysis only. For rendering/SSR diffs, Core Web Vitals, and live HTTP/redirect checks, deploy a preview and run the audit in URL mode (`--url`).\n'
