# Antipattern catalogue

Each entry: what it looks like, why it costs, and the **disposition** to apply. Rule IDs match
`scripts/scan-comments.py` output, so a scan line maps directly to an entry here.

## Dispositions

| Disposition | Meaning |
|---|---|
| `DELETE` | Remove the comment entirely. |
| `SHORTEN` | Keep the load-bearing sentence, drop the rest. |
| `REORDER` | Same content, canonical tag order. |
| `REPOSITION` | Same content, moved to the correct place (usually: attach to its declaration). |
| `ADD` | Write a docblock that does not exist. Public API only, and only where absence hurts. |
| `KEEP` | Flagged by the scanner, correct on inspection. Record why, so the next run does not re-flag it. |
| `ESCALATE` | The comment is a symptom; the **code** is the problem. Report it. Change nothing. |

`ESCALATE` is the safety valve. This skill edits comments, never code. When the honest fix is "rename this
variable" or "split this function", say so and move on.

---

## `DUP` — Comment repeats the code

```js
// increment the counter
counter++;

// loop over users
for (const user of users) {
```

The comment adds nothing a reader of the line does not already have, and it now has to be maintained. Ousterhout
names this *Comment Repeats Code*.

**Disposition:** `DELETE`.

**Exception:** the comment restates the *what* but adds a *why* clause — `// increment the counter; the gauge
resets nightly so drift is bounded`. That is `SHORTEN` to the why, not `DELETE`.

---

## `LEN` — Oversized inline comment

```py
# This function takes the user id and then it goes to the database
# and gets the user, and after that it checks if the user is active,
# and if the user is not active we return None because we don't want
# inactive users to be returned to the caller since that would break
# the billing screen which assumes an active user.
```

Five lines of narration for one fact. The narration decays; the fact is the only durable part.

**Disposition:** `SHORTEN` to the fact — `# Inactive users are excluded: the billing screen assumes an active user.`
If the explanation is genuinely large and describes the whole function, `REPOSITION` it into the docblock.

**Exception:** an algorithm's invariants, a protocol description, a state-machine table, a security argument, or a
bug post-mortem. These earn their length. `KEEP`, and prefer the docblock over mid-body.

---

## `ORD` — Docblock tags out of order

```php
/**
 * @throws AuthException
 * @return User
 * Loads the billing owner.
 * @param string $email
 * @see Billing
 * @param int $tenantId
 */
```

Prose stranded between tags, `@throws` before `@param`, and `@param` order not matching the signature — so the
docblock cannot be used to map arguments, which is its main job.

**Disposition:** `REORDER` to summary → description → `@param` (signature order) → `@return` → `@throws` →
`@deprecated` → `@see`.

**Watch for:** a `@param` for an argument that no longer exists, or a missing one for an argument that does. That is
a `STALE` finding hiding inside an `ORD` finding — fix both.

---

## `POS` — Wrong placement

```go
// Copy copies from src to dst.

func Copy(dst Writer, src Reader) (int64, error) {
```

The blank line detaches the doc comment; `go doc` and pkg.go.dev drop it silently. Same class of bug: a comment
floating three statements above what it describes, or a multi-line explanation trailing off the end of a line.

**Disposition:** `REPOSITION` — attach directly above the declaration or the line it explains, at matching
indentation. Remove the separating blank line.

**Exception:** a file-header block separated from the first declaration by design. `KEEP`.

---

## `TODO` — Unstructured marker

```js
// TODO fix this later
// FIXME???
// HACK - temporary
// XXX
```

No owner, no tracking, no stated action. These accumulate for years and stop being read.

**Disposition:** `ESCALATE` — report each one with its location and a suggested rewrite. **Never invent an issue
number.** If the user supplies one, rewrite to `// TODO(#1234): <action>`.

**Delete only** when the referenced work is provably already done, and say what the evidence was.

---

## `DEAD` — Commented-out code

```py
# old_total = sum(x.price for x in items)
# if old_total > threshold:
#     notify(user)
total = compute_total(items)
```

Git already has this, with an author, a date, and a message. Left in place it misleads readers into thinking it is
a live alternative.

**Disposition:** `DELETE`.

**Exception:** a commented-out block that a neighbouring comment explicitly presents as an example, a config option,
or a documented alternative (`# Uncomment to enable verbose logging`). That is documentation. `KEEP`.

**Detection note:** match by language-token density, not by prose. `# TODO: handle the (a, b) case` is prose that
contains punctuation, not code.

---

## `BANNER` — Divider and section art

```js
// ============================================
//              USER HELPERS
// ============================================
/////////////////// END ///////////////////
```

Visual scaffolding that exists because the file is too long to navigate. It carries no information and it rots when
sections move.

**Disposition:** `DELETE`. If the file genuinely needs dividers to be readable, add an `ESCALATE` note that the file
should be split — but do not split it here.

**Exception:** `// namespace mynamespace` closing markers in C++ (required by the Google style guide), `#region`
markers in C# where the project uses them, and `// MARK: -` in Swift/Obj-C where the IDE consumes them. `KEEP`.

---

## `CHANGELOG` — History in comments

```php
// Modified by A. Dev on 2024-03-11 to add caching
// v2: added retry
// 2023-08-01: fixed the null case (ticket 88)
```

Version control does this better. The comment is unverifiable and always incomplete.

**Disposition:** `DELETE` — **except** the ticket reference. `// 2023-08-01: fixed the null case (ticket 88)` above
a null guard is carrying a bug link. Keep the link, drop the date and the narration:
`// Null guard for the empty-cart case (ticket 88).`

---

## `STALE` — Comment contradicts the code

Not regex-detectable. Found by reading the comment against the code beside it.

```ts
// Retries 3 times with exponential backoff.
await fetchOnce(url);
```

A wrong comment is strictly worse than no comment — readers trust it and act on it.

**Disposition:** `DELETE` when the fact is obsolete, or rewrite to the truth when you can verify the truth from the
code. When you **cannot** tell which of the comment and the code is wrong, `ESCALATE` — that is a possible bug, and
silently deleting the comment would erase the only evidence of it.

---

## `CONTAMINATE` — Implementation detail in an interface comment

```java
/**
 * Returns the user. Uses a HashMap cache keyed by tenant, evicted every 60s,
 * falling back to the read replica when the primary is lagging.
 */
public User find(long id)
```

Ousterhout's *Implementation Documentation Contaminates Interface*. It over-promises: callers now depend on internals
that will change, and the docblock breaks every time the body is refactored.

**Disposition:** `REPOSITION` — keep the contract in the docblock, move the internals to a comment inside the body.
Anything that is a genuine caller-visible guarantee (staleness bound, consistency model) stays in the docblock,
stated as a guarantee rather than a mechanism.

---

## `GENERATED` — Assistant attribution and filler

```py
# Generated by an AI assistant
# This code was written with Copilot
# Here's the implementation:
# Note: this is a simple example
```

Artifacts of the generation process, not of the program. Common in machine-written diffs alongside placeholder
docblocks and comments describing intent the code does not implement.

**Disposition:** `DELETE`.

---

## `EMPTY` — Hollow docblock

```ts
/** */
/**
 * @param id
 * @returns
 */
/**
 * Gets the user.
 */
getUser(id: string): User
```

A docblock that restates the signature is the noise this skill removes. Generating one is a regression.

**Disposition:** `DELETE` the hollow block. Only `ADD` a real one if the declaration meets the bar in
[COMMENT_STANDARD.md](COMMENT_STANDARD.md#when-a-docblock-is-added) — non-obvious contract, units, nullability, side
effects, errors, concurrency, or a surprising default.

---

## `MISSING` — Undocumented non-obvious public API

Not scanner-detectable in any reliable way; found by reading the public surface.

```ts
export function schedule(job: Job, delay: number): string
```

`delay` in what unit? Does `0` mean immediate or disabled? What is the returned string? Does this throw? Every caller
has to read the body — which is exactly what an interface is supposed to prevent.

**Disposition:** `ADD`, minimally — the units, the sentinel values, the return meaning, the throws. Nothing else.

**Do not add** to trivial getters, setters, or pass-through wrappers whose name already says everything.

---

## `SECRET` — Sensitive content in a comment

```js
// prod key: sk_live_51H8xQ2… (rotate before launch)
<!-- internal: admin bypass at /_ops?debug=1 -->
```

HTML and CSS comments ship to the browser. Source comments ship to anyone with repository access, and stay in git
history after deletion.

**Disposition:** `ESCALATE` immediately, redacted. Report the file, the line, and the class of secret — **never
reproduce the value**. Deleting the comment does not remediate it; the credential must be rotated and the history
handled. Say so.
