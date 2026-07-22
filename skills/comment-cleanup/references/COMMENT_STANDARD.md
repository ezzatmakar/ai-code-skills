# The comment standard

The house rules this skill enforces. They are deliberately few. Apply them with judgment: a rule that would
destroy information, fight the repository's own linter, or break a documentation generator loses.

## The premise

Most comments should not exist. A comment is a **cost** — it is unverified prose that drifts out of sync with the
code beside it, and a wrong comment is worse than no comment. Write one only when the code cannot carry the
information itself.

> Comments should describe things that are not obvious from the code.
> — John Ousterhout, *A Philosophy of Software Design*

> If the code requires comments to explain itself, the code should be simplified instead.
> — Google, *What to look for in a code review*

The second quote is a boundary, not a licence: when a comment is bad **because the code is unclear**, this skill
reports it and stops. Rewriting the code is a different task with a different review.

## Rule 1 — Short

- **One line is the default.** A comment that needs a paragraph is usually documenting a *declaration*, so it
  belongs in that declaration's docblock, not floating mid-function.
- **Inline comments are capped at 3 lines.** Over the cap, either compress to the single load-bearing sentence or
  move the explanation into the docblock above the enclosing function/class.
- Compress by deleting what the code already says, not by truncating mid-thought. `// Inactive users are excluded:
  billing re-runs on reactivation.` beats six lines narrating the function body.
- A long comment is legitimate when it encodes something genuinely large: a protocol, an algorithm's invariants, a
  state machine, a security argument, a hard-won bug post-mortem. Keep those — put them in the docblock and say why
  they are long.

## Rule 2 — Sorted

Every docblock uses one canonical order:

```text
summary (one line)
blank
description / remarks (optional, only if non-obvious)
blank
@param      — one per parameter, in signature order
@return
@throws
@deprecated
@see / @link / @example
modifier tags (@public, @internal, …) — last, on one line
```

- `@param` order **must** match the parameter order in the signature. A mismatch is a defect, not a nit — readers
  use the docblock to map arguments.
- `@throws` always comes **after** `@param` and `@return`. This is explicit in the php-fig PHPDoc proposal and is
  the Javadoc convention.
- Never mix tag lines and prose lines. Once the first block tag appears, the prose section is over.
- Do not add a tag that carries no information beyond the signature. `@param int $id The id.` is noise; delete the
  tag or say what the id *is* (`the tenant that owns the invoice`) and what it must satisfy.

Per-language spellings (`@returns` vs `@return`, `# Panics`, Google/NumPy Python docstring sections) are in
[LANGUAGE_CONVENTIONS.md](LANGUAGE_CONVENTIONS.md). The **order** is the same everywhere.

## Rule 3 — Placed

- A docblock sits **immediately above its declaration, with no blank line between them.** In Go this is load-bearing
  — a blank line detaches the comment and `go doc` drops it. Every other doc tool expects the same adjacency.
- An inline comment goes **above the line it explains**, at that line's indentation. Not trailing, not below.
- A trailing end-of-line comment is fine only when it is a short label on a value: `retries = 3  // observed p99`.
  Never an explanation.
- No floating comments — a comment separated from its subject by blank lines or unrelated statements. Attach it or
  delete it.
- File headers (licence, copyright, purpose, shebang) stay at the top, above imports. Never relocate or reword them.

## Rule 4 — Marked

Every unfinished-work marker uses one grammar:

```text
// TODO(#1234): switch to the batched endpoint once v2 ships.
// FIXME(#1290): two workers can claim the same job under load.
```

- `TODO` / `FIXME` / `HACK` in caps, then the tracked issue in parentheses, then a colon, then an **action** — what
  should happen, not what is wrong.
- A marker with no issue reference is **flagged, never invented.** This skill cannot create an issue number. Report
  it and let the user decide.
- `TODO(username)` is the older Google convention and is now deprecated in favour of an issue reference. Do not
  rewrite an existing `TODO(alice)` into `TODO(#?)` — flag it.
- A `TODO` describing work that is already done is dead. Flag it for deletion with the evidence.

## What is always kept

Never delete a comment carrying information that cannot be recovered from the code:

- Licence, copyright, and attribution headers.
- **Pragmas and tool directives** — `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`, `//nolint`,
  `# pylint: disable`, `@SuppressWarnings`, `//go:build`, `#pragma`, `# shellcheck disable`. These are **code**. They
  change compiler, linter, or build behavior. Deleting one is a functional change.
- Links to a bug, PR, RFC, spec section, CVE, or vendor doc.
- The rationale for a workaround, a magic constant, or an unidiomatic construction — especially "why not the obvious
  thing", which is the single highest-value comment in any codebase.
- Anything explaining a browser/runtime/hardware quirk or a compatibility shim.
- Non-English comments. Preserve the repository's language; do not translate.

## What is deleted on sight

- **Restates the code.** `// increment i` above `i++`. Ousterhout's *Comment Repeats Code*.
- **Banner and divider art.** `// ==========`, `//////////`, boxed ASCII section headers. If a file needs visual
  dividers to be navigable, the file is too big — that is a code finding, not a comment fix.
- **Changelog in comments.** `// Modified by X on 2024-03-11`, `// v2: added caching`. Git already stores this, more
  accurately.
- **Commented-out code.** Git stores this too. Delete it. (Distinguish real code from prose by token density, and
  never delete a commented-out block that a nearby comment explicitly references as an example.)
- **Empty or placeholder docblocks.** `/** */`, `/** TODO */`, `@param $x` with no description and no added meaning.
- **Attribution to the generator.** `// Generated by Claude`, `// AI-generated`, `// Copilot suggested`. Noise.
- **Section labels that duplicate structure.** `// --- imports ---` above the imports.

## Interface vs. implementation

Keep them separate — Ousterhout's *Implementation Documentation Contaminates Interface*.

- **Interface comment** (the docblock): what a caller needs to use this thing. Contract, units, nullability, side
  effects, thrown errors, concurrency safety. A caller must never need to read the body.
- **Implementation comment** (inside the body): why the internals work the way they do. Algorithm choice,
  invariants, the non-obvious trade-off.

Implementation detail leaking into a docblock is a defect: it over-promises, and it breaks callers when the
internals change. Move it into the body.

## When a docblock is added

Only for **public / exported** API, and only where absence actually hurts. Add one when the declaration has any of:

- a non-obvious contract, precondition, or invariant;
- units, ranges, or a format that the type does not express (`timeoutMs`, `0` meaning "disabled");
- nullability or an empty-vs-missing distinction the signature cannot state;
- side effects — writes, network calls, mutation of an argument, global state;
- errors thrown and when;
- concurrency or ordering guarantees;
- a surprising default or a deprecation.

Do **not** add one to a trivial getter, setter, or pass-through wrapper whose name already says everything. A
docblock that restates the signature is the exact noise this skill exists to remove — generating it is a regression,
not progress.

## Primary references

- Google, *What to look for in a code review* — comments must be necessary and explain reasoning; documentation is a
  separate artifact from an inline comment. <https://google.github.io/eng-practices/review/reviewer/looking-for.html>
- John Ousterhout, *A Philosophy of Software Design* — comments describe what is not obvious; *Comment Repeats Code*;
  *Implementation Documentation Contaminates Interface*.
- Stack Overflow, *Best practices for writing code comments* — nine rules; comments must not duplicate the code, good
  comments do not excuse unclear code, explain unidiomatic code, link copied source, comment when fixing a bug.
  <https://stackoverflow.blog/2021/12/23/best-practices-for-writing-code-comments/>
- Google style guides — the `TODO` grammar and its issue-reference form. <https://google.github.io/styleguide/>
- Robert C. Martin, *Clean Code*, ch. 4 — the taxonomy of good comments (legal, intent, clarification, warning of
  consequences, amplification) and of bad ones (redundant, misleading, journal, noise).
