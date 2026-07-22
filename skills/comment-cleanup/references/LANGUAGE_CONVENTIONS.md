# Per-language conventions

The four house rules in [COMMENT_STANDARD.md](COMMENT_STANDARD.md) are the same everywhere. What changes per
language is the **spelling** of a docblock and which tool consumes it. Match the language's own authority — a
docblock that a documentation generator cannot parse is worse than none.

**The repository always wins.** If the project already configures a comment rule (`eslint` `jsdoc/*`, `phpcs`
`Squiz.Commenting`, `ruff` `D`/`pydocstyle`, `golangci-lint` `godot`/`revive`, `rustfmt`, `.editorconfig`), follow
that configuration and do not impose the house spelling over it.

## JavaScript / TypeScript — JSDoc, TSDoc

```js
/**
 * Charges the tenant's default payment method.
 *
 * @param tenantId - Tenant that owns the invoice.
 * @param amountCents - Positive integer; fractional currency is rejected upstream.
 * @returns The settled charge, or null when the tenant has no payment method.
 * @throws {PaymentDeclined} When the processor declines and no retry is possible.
 * @see https://stripe.com/docs/api/charges
 */
```

- Tag order: summary → `@remarks` → `@param` → `@returns` → `@throws` → `@deprecated` → `@see`/`@example` →
  modifier tags (`@public`, `@internal`, `@sealed`) last, on one line. TSDoc normalizes modifier tags to the bottom.
- TSDoc spells it `@returns`. JSDoc accepts `@return` and `@returns` — follow whichever the file already uses;
  do not churn a whole file to switch.
- In TypeScript, **do not repeat types the signature already declares.** `@param {string} name` in a `.ts` file is
  redundant — the type annotation is the source of truth. Strip the brace types, keep the description.
- Inline tags use braces: `{@link Other}`, `{@inheritDoc}`. Text before the first block tag is the summary.
- JSX comments are `{/* … */}` inside markup and `//` in the script body. Never leave a bare `/* */` in JSX — it
  renders as text.
- **Never touch** `// @ts-ignore`, `// @ts-expect-error`, `/* eslint-disable */`, `// eslint-disable-next-line`,
  `// prettier-ignore`, `// @jsx`, `/* webpackChunkName */`, `'use client'`/`'use server'` neighbours. These are
  directives.

## PHP — PHPDoc

```php
/**
 * Loads the billing owner for a tenant.
 *
 * @param  int    $tenantId
 * @param  string $email    Normalized to lowercase before lookup.
 * @return User
 * @throws AuthException When the caller cannot read the tenant.
 * @see    Billing
 */
```

- `@param` **must** be in the same order as the method arguments; every `@throws` comes after all `@param` and
  `@return`. Both are explicit in the php-fig PHPDoc tag proposal.
- Aligning tag columns is conventional in PHP (PEAR/Joomla/Magento house styles) — preserve the file's existing
  alignment rather than reflowing it.
- With PHP 8 native types on every parameter, a `@param` that only restates the type is noise. Keep the tag only
  when it adds a description or a narrowed generic (`@param array<int, User> $users`).
- **Never touch** `/** @var */` hints used by static analysers, `@phpstan-*`, `@psalm-*`, `@template`, or attribute
  syntax `#[…]` (that is code, not a comment).

## Python — PEP 257

```python
def charge(tenant_id: int, amount_cents: int) -> Charge | None:
    """Charge the tenant's default payment method.

    Args:
        tenant_id: Tenant that owns the invoice.
        amount_cents: Positive integer; fractional currency is rejected upstream.

    Returns:
        The settled charge, or None when the tenant has no payment method.

    Raises:
        PaymentDeclined: The processor declined and no retry is possible.
    """
```

- One-line docstring for the obvious case, closing quotes on the same line. Multi-line = summary line, **blank
  line**, then detail, closing quotes on their own line.
- PEP 257 asks for an imperative command phrase — `"""Charge the card."""`, not `"""Charges the card."""`.
- Do not repeat the signature in the docstring. With type annotations present, `Args:` entries carry descriptions,
  not types.
- Section order in the Google style used above: `Args` → `Returns`/`Yields` → `Raises` → `Examples`. NumPy style
  (`Parameters` / `Returns` / `Raises`, underlined) is equally valid — detect which the repo uses and stay in it.
- Always `"""` triple double quotes, even for one line.
- **Never touch** `# noqa`, `# type: ignore`, `# pylint: disable`, `# fmt: off`/`# fmt: on`, `# pragma: no cover`,
  `# -*- coding: -*-`, or the shebang.

## Go — go doc

```go
// Copy copies from src to dst until either EOF is reached on src or an
// error occurs. It returns the total number of bytes written and the first
// error encountered while copying, if any.
func Copy(dst Writer, src Reader) (n int64, err error)
```

- **No blank line between the comment and the declaration** — a blank line detaches it and the comment disappears
  from `go doc` and pkg.go.dev. This is the strictest placement rule in any mainstream language.
- Start with a complete sentence naming the symbol: `// Copy copies …`, `// Package path implements …`,
  `// A Reader serves …`.
- Boolean functions use "reports whether", never "returns true if" or "or not".
- Go has no `@param`/`@return` tags — prose only, referencing parameter names bare (no backquotes).
- `Deprecated:` as its own paragraph is a recognized marker; tools warn on it. Preserve the exact spelling.
- Package comment goes in exactly one file of the package.
- **Never touch** `//go:build`, `// +build`, `//go:generate`, `//go:embed`, `//nolint`, `//lint:ignore`. The absence
  of a space after `//` is required for build constraints — do not "fix" it.

## Rust — rustdoc

```rust
/// Returns the settled charge for a tenant.
///
/// # Examples
///
/// ```
/// let c = charge(7, 500)?;
/// ```
///
/// # Errors
///
/// Returns [`PaymentError::Declined`] when the processor declines.
///
/// # Panics
///
/// Panics if `amount_cents` is negative.
pub fn charge(tenant_id: u64, amount_cents: i64) -> Result<Charge, PaymentError> {
```

- `///` documents the item that follows. `//!` is for crate/module-level docs only, at the top of the file.
- Summary is one short sentence, third-person present indicative — "Returns", not "Return". Properly punctuated.
- Section headings in order: `# Examples` (always plural, even for one) → `# Errors` → `# Panics` → `# Safety`
  (required for `unsafe`) → `# Aborts`.
- Doc-test code fences are **executable**. Never edit code inside a rustdoc fence while "cleaning comments" — it is
  a test.
- **Never touch** `#[doc(hidden)]`, `#![allow(…)]`, `// SAFETY:` blocks above `unsafe` (clippy requires them).

## Java — Javadoc

- Order: description → `@param` (argument order) → `@return` → `@throws` → `@deprecated` → `@see`.
- First sentence ends at the first period + space; it becomes the summary in generated docs. Keep it a real sentence.
- `{@link}`, `{@code}` are inline. `@SuppressWarnings` is an annotation — code, not a comment.

## C# — XML doc comments

- `///` with `<summary>` → `<param name="…">` (signature order) → `<returns>` → `<exception cref="…">` →
  `<remarks>` → `<example>` → `<see cref="…"/>`.
- Malformed XML breaks the build under `GenerateDocumentationFile`. Validate tag nesting after any edit.

## Ruby — YARD / RDoc

- `#` comment block immediately above the definition. YARD order: summary → `@param` → `@return` → `@raise` →
  `@example` → `@deprecated`.
- **Never touch** `# frozen_string_literal: true` (a magic comment that changes runtime behavior), `# rubocop:disable`,
  or `# :nodoc:`.

## Kotlin — KDoc

- `/** … */` with `@param` → `@return` → `@throws`/`@exception` → `@sample` → `@see`. Markdown body, `[Ref]` links.

## Swift

- `///` with markdown: summary → `- Parameters:` (nested, signature order) → `- Returns:` → `- Throws:` → `- Note:`.

## C / C++ — Doxygen

- `/** … */` or `///` with `@brief` → `@param[in,out]` (signature order) → `@return` → `@throws` → `@note`/`@warning`.
- **Never touch** `#pragma`, `// NOLINT`, `// clang-format off`/`on`, or `// namespace X` closing markers — the last
  is a required Google C++ convention, not a redundant comment.

## Shell

- `#!` shebang first, always. Then the file-purpose block, then `set -euo pipefail`.
- Function comment directly above the function; document globals read/written, arguments, and exit status.
- **Never touch** `# shellcheck disable=SCxxxx`, `# shellcheck source=…`.

## SQL

- `--` for line comments, `/* */` for blocks. Comment the *why* of an index hint, a lock level, or a denormalized
  join — never the SELECT list.
- Some drivers and query planners read `/*+ hints */`. Treat any `/*+ … */` as code.

## HTML / Markup / CSS

- `<!-- -->` in HTML is **shipped to the browser** — it is public. Never leave internal notes, ticket numbers, or
  credentials in one; flag them for deletion rather than silently rewriting.
- Conditional comments (`<!--[if IE]>`) are code.
- CSS: `/* */` only. `/*! */` is a preserved bang comment (survives minification) — usually a licence header. Keep it.

## YAML / TOML / config

- `#` only. Config comments are often the **only** documentation of an option — bias hard toward keeping them.
- Never strip a commented-out config key that documents an available option; that is a documented default, not dead
  code.
