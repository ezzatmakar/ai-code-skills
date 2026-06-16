#!/usr/bin/env bash
# Detect the Laravel / PHP stack so the review applies version-correct guidance.
# Prints a short Markdown summary. Read source to confirm anything that affects findings.
#
# Usage: detect-stack.sh [project-root]
set -euo pipefail

root="${1:-$PWD}"
if git -C "$root" rev-parse --show-toplevel >/dev/null 2>&1; then
  root="$(git -C "$root" rev-parse --show-toplevel)"
fi
cd "$root"

# Extract a value from composer.json's require / require-dev for a given package.
# Portable: prefers php, falls back to grep/sed.
composer_dep() {
  local name="$1"
  [[ -f composer.json ]] || return 0
  if command -v php >/dev/null 2>&1; then
    php -r '
      $name=$argv[1];
      $j=json_decode(file_get_contents("composer.json"), true);
      foreach(["require","require-dev"] as $k){
        if(isset($j[$k][$name])){ echo $j[$k][$name]; return; }
      }
    ' "$name" 2>/dev/null || true
  else
    # Match "name": "version"
    grep -oE "\"${name//\//\\/}\"[[:space:]]*:[[:space:]]*\"[^\"]+\"" composer.json 2>/dev/null \
      | head -1 | sed -E 's/.*:[[:space:]]*"([^"]+)".*/\1/' || true
  fi
}

has_dep() {
  local name="$1"
  [[ -f composer.json ]] || return 1
  grep -qE "\"${name//\//\\/}\"[[:space:]]*:" composer.json 2>/dev/null
}

printf '## Detected stack\n\n'
printf -- '- Root: `%s`\n' "$root"

if [[ ! -f composer.json ]]; then
  printf -- '- No `composer.json` found at this root. Confirm the project location.\n'
  exit 0
fi

printf -- '- PHP constraint: `%s`\n' "$(composer_dep php || echo unspecified)"
printf -- '- Laravel framework: `%s`\n' "$(composer_dep laravel/framework || echo 'not found')"
if command -v php >/dev/null 2>&1; then
  printf -- '- Local PHP CLI: `%s`\n' "$(php -r 'echo PHP_VERSION;' 2>/dev/null || echo unknown)"
fi

# App vs package.
[[ -f artisan ]] && printf -- '- Type: `Laravel application (artisan present)`\n' \
                  || printf -- '- Type: `library/package or non-standard layout`\n'

# Skeleton generation.
if [[ -f bootstrap/app.php ]] && [[ ! -f app/Http/Kernel.php ]]; then
  printf -- '- Skeleton: `Laravel 11+ slimmed (bootstrap/app.php, no Http/Kernel.php)`\n'
elif [[ -f app/Http/Kernel.php ]]; then
  printf -- '- Skeleton: `pre-11 (app/Http/Kernel.php present)`\n'
fi

# Notable packages.
pkgs=""
for p in laravel/sanctum laravel/passport laravel/fortify laravel/octane laravel/horizon \
         laravel/telescope livewire/livewire inertiajs/inertia-laravel filament/filament \
         pestphp/pest phpunit/phpunit larastan/larastan nunomaduro/larastan vimeo/psalm laravel/pint; do
  has_dep "$p" && pkgs="$pkgs $p"
done
[[ -n "$pkgs" ]] && printf -- '- Notable packages:%s\n' "$pkgs"

# Composer scripts (test/analyse/lint hooks).
if command -v php >/dev/null 2>&1; then
  scripts="$(php -r '$j=json_decode(file_get_contents("composer.json"),true); if(!empty($j["scripts"])) echo implode(", ", array_keys($j["scripts"]));' 2>/dev/null || true)"
  [[ -n "$scripts" ]] && printf -- '- Composer scripts: `%s`\n' "$scripts"
fi

# Frontend present alongside (Inertia/Livewire/Vite).
[[ -f package.json ]] && printf -- '- Frontend: `package.json present (JS build alongside PHP)`\n'

# Tooling config files.
tools=""
[[ -f phpstan.neon || -f phpstan.neon.dist ]] && tools="$tools phpstan"
[[ -f psalm.xml || -f psalm.xml.dist ]] && tools="$tools psalm"
[[ -f pint.json ]] && tools="$tools pint"
[[ -f phpunit.xml || -f phpunit.xml.dist ]] && tools="$tools phpunit"
[[ -n "$tools" ]] && printf -- '- Tooling config:%s\n' "$tools"

printf '\nApply Laravel/PHP guidance for the versions above. Validate with `php artisan test`, `vendor/bin/pest`, `vendor/bin/phpstan`, or `vendor/bin/pint --test` only if already configured; never run destructive Artisan commands.\n'
