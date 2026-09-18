# Rewrite rules

Each rule ID from `scan-prose.py`, with how to rewrite it and when to keep the original. The standards behind the
rules are in [WRITING_STANDARD.md](WRITING_STANDARD.md). The word tables are in [WORD_LIST.md](WORD_LIST.md).

Dispositions:

- `REWRITE`: reword it.
- `REVIEW`: read it and decide; keeping it is often right.
- `KEEP`: leave it, and record why.
- `ESCALATE`: needs a person. Report it and do not edit.

## The meaning check (every rewrite)

Before you accept a rewrite, list the facts in the original and find each one in the new text:

- [ ] Every condition (`only when`, `unless`, `before X`) survived.
- [ ] Every number, unit, limit, and default survived, unchanged.
- [ ] Every name (identifier, error, flag, file, issue, URL) survived, byte for byte.
- [ ] Every warning survived, and is no weaker.
- [ ] No new claim appeared, and no guess became a certainty.
- [ ] The comment still sits on the same code, with the same markers and indentation.

If any box fails, restore the original.

---

## WORDY: wordy phrase

Replace it with the plain form from the table.

```js
// Before: In order to avoid a race condition, utilize the lock prior to the write.
// After:  Take the lock before the write to avoid a race.
```

**Keep** when the long form is a quoted spec or error message, or a term of art (`CPU utilization`).

## FILLER: minimizer or throat-clearing

Delete the word, then reread the sentence. It usually improves with no other change.

```py
# Before: Simply call refresh() and it will basically just work.
# After:  Call refresh() to reload the token.
```

**Keep** `just` when it means "only" (`just the header, not the body`) or "immediately" (`just before commit`).
**Keep** `actually` when it marks a real contrast (`the flag is named "sync" but actually runs async`).

## AI: machine-sounding vocabulary or pattern

Replace the vague word with the specific claim.

```ts
// Before: This robust helper seamlessly leverages the cache to deliver optimal performance.
// After:  Reads from the cache first; a miss costs one DB query (~40 ms).
```

- `N em dashes in one sentence`: split into sentences, or use commas or parentheses.
- Emoji: say it in words. `// 🚀 fast path` becomes `// Fast path: skips validation for trusted input.`

**Keep** a flagged word when it is the precise term. `crucial` in `a crucial section (mutex)` is a pun and should
go. `robust` in `robust statistics` is a technical term and should stay.

## OPENER: describes the comment, not the code

Delete the opener and start with the verb.

```java
/** This method is responsible for returning the tenant's owner. */   // before
/** Returns the tenant's billing owner. */                            // after
```

## NARRATE: first person or tutorial voice

Replace narration with the fact or the reason.

```go
// Before: Here we loop over the users. Let's skip the admins.
// After:  Admins are billed per seat elsewhere, so skip them.
```

**Keep** "we" when the file uses it for the team (`we retry because the vendor rate-limits`). Only tutorial voice
is flagged.

## LONG: sentence over the word limit

Split it at the natural joint. The joint is often `and`, `but`, `because`, `which`, `so`, or an em dash.

```py
# Before (39 words): When the upstream service returns a partial page we keep the cursor, wait for the
#   configured backoff, retry the request with the same idempotency key, and only then give up and
#   surface the error to the caller.
# After: On a partial page, keep the cursor and wait for the backoff. Then retry once with the same
#   idempotency key. If that fails too, return the error.
```

`REVIEW` up to 10 words over the limit, `REWRITE` beyond that.

**Keep** a long sentence that encodes one indivisible rule, such as a protocol invariant, where splitting it would
separate a condition from its consequence.

## MOOD: summary mood breaks the convention

Change only the first verb's form. See [LANGUAGE_MOOD.md](LANGUAGE_MOOD.md).

```py
"""Returns the last row."""   # before, in a file where the other docstrings say "Return …"
"""Return the last row."""    # after
```

In Go, start with the symbol's name:

```go
// Before: Copies from src to dst.
// After:  Copy copies from src to dst.
```

**Keep** the minority form when a configured linter requires it, or when the whole file is mixed and no majority
exists. In that case, report it instead of choosing a side.

## FORMAT: doc-summary capitalization or period

Capitalize the first word, or add the closing period where the language requires one (Go, Python, Java, Kotlin,
Rust).

**Keep** a lowercase first word when it is an identifier (`npm`, `iOS`, `fooBar`) or a type-shape note
(`metric key → {…}`). Never change an identifier's case (PEP 8).

## TERM: non-inclusive or ableist term

Replace it using the table in WORD_LIST.md.

**Escalate** when code shares the name: `// the master branch` next to `git checkout master`, or
`// whitelist of hosts` above `const WHITELIST = …`. The comment must match the code. Renaming the code is a
separate, reviewed change.

## SPELL: misspelling

Fix it. **Keep** words in the repository's `cspell` dictionary, and never switch between UK and US spelling.

## SHOUT: all caps or stacked punctuation

State the rule and the reason in sentence case.

```js
// Before: DO NOT TOUCH THIS!!!
// After:  Keep this order: the parser reads the header before the body.
```

**Keep** single labels (`WARNING:`, `NOTE:`, `SAFETY:`) and acronyms. The scanner already ignores them.

## NEG: double negative

Say it positively. `not uncommon` becomes `common`, and `not invalid` becomes `valid`. If the double negative is
deliberately weaker than the positive, keep the nuance another way: `occasionally`.

## HEDGE: hedge that hides what is known

Either state the fact, or name the uncertainty.

```py
# Before: I think this probably handles the retry case.
# After:  Handles the retry case (tested in test_retry_after_timeout).
# Or:     Unverified: retries after a timeout may run twice. See #418.
```

**Keep** a hedge that reports a real, documented uncertainty, such as a vendor's undocumented behavior.

## PASSIVE: passive voice with a named actor

If the actor matters to the reader, make it the subject.

```ts
// Before: The token is refreshed by the middleware before each call.
// After:  The middleware refreshes the token before each call.
```

**Keep** the passive when the thing acted on is the topic and the actor is incidental. For example,
`Cached by key; evicted after 5 minutes` keeps the focus on the cache entry.

## VAGUE: names nothing

Replace it with the specific thing.

```php
// Before: Handle the stuff for some reason.
// After:  Normalize the currency codes: the gateway rejects lowercase.
```

If you cannot find what the comment means from the code, **escalate** it as `UNCLEAR`. Do not guess.

## TIME: time-relative word

Name the version, date, or issue, or drop the word.

```js
// Before: Currently we use the new API until the migration lands soon.
// After:  Uses the v2 API until #512 (batch endpoint) ships.
```

**Keep** `now` when it means "at this point in the code" (`the lock is now held`).

## READ: high reading grade

Look for long words that have short equivalents, and long sentences. This rule is only a prompt. Many technical
terms have no simpler equivalent. If the comment is already as plain as its subject allows, keep it.

## SECRET: possible credential

**Escalate.** Report the file, the line, and the kind of credential, with the value redacted. Do not reword the
comment. That would only move the secret. The value must be rotated and the git history handled.

---

## Found by reading, not by the scanner

| ID | Means | Action |
|---|---|---|
| `STALE` | the comment contradicts the code | Escalate with evidence. Do not polish a false statement. |
| `UNCLEAR` | you cannot tell what it means | Escalate. Do not guess. |
| `DELETE-CANDIDATE` | restates the code, is dead code, or is banner art | Leave it; point to `comment-cleanup`. |

## What "human" sounds like

Read these side by side. The right column is what the skill aims for.

| Machine / tutorial / brochure | Colleague |
|---|---|
| `This comprehensive utility function seamlessly handles the parsing of dates.` | `Parses ISO 8601 dates; rejects offsets without a colon.` |
| `It's important to note that this plays a crucial role in ensuring data integrity.` | `Runs inside the transaction, so a failed write rolls back the audit row too.` |
| `Here we iterate over the items and then we check each one.` | `Skips items already shipped: re-sending triggers a duplicate charge.` |
| `NOTE: DO NOT CHANGE THIS VALUE!!!` | `Keep at 30: the vendor's webhook times out at 31 seconds.` |
| `Currently uses the new endpoint.` | `Uses /v2/orders (the /v1 endpoint drops currency).` |
