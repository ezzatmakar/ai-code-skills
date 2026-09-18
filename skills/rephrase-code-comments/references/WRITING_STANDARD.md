# The writing standard

These are the house rules for comment wording. There are four of them, each backed by a published standard. Apply
them with judgment. A rule loses when it would change the meaning, fight the repository's own linter, or break a
documentation generator.

## Why wording matters

A comment is read many more times than it is written, often by someone new to the code, in a hurry, or reading in
a second language. Research on comment quality keeps finding the same problems:

- Rani et al. reviewed a decade of studies on comment quality. Consistency, completeness, and readability were the
  quality attributes studied most often. (*A decade of code comment quality assessment*, JSS vol. 195, 2023,
  <https://doi.org/10.1016/j.jss.2022.111515>)
- Jabrayilzade and Tüzün list 11 inline comment smells, including *vague*, *misleading*, *obvious*, and *too much
  information*. (*Taxonomy of inline code comment smells*, EMSE 2024,
  <https://link.springer.com/article/10.1007/s10664-023-10425-5>)
- Steidl, Hummel, and Juergens measure comments that only repeat the method name. (*Quality analysis of source
  code comments*, ICPC 2013,
  <https://teamscale.com/hubfs/26978363/Publications/2013-quality-analysis-of-source-code-comments.pdf>)

Deleting trivial comments is `comment-cleanup`'s job. This skill fixes the wording of the comments that stay.

## Rule 1: Concise

Every word must carry information. Cut the rest.

- Use the short word: `use`, not `utilize`; `to`, not `in order to`; `before`, not `prior to`; `if`, not `in the
  event that`. The full table is in [WORD_LIST.md](WORD_LIST.md).
- Cut minimizers and filler: `simply`, `just`, `basically`, `actually`, `very`, `obviously`, `note that`,
  `please`.
- One idea per sentence. Keep sentences to **25 words** or fewer. That is the ASD-STE100 limit for descriptive
  writing; its limit for instructions is 20. A comment that needs more is usually two sentences.
- Say it once. Do not open with a sentence that announces what the next sentence will say.

Sources:

- Microsoft Writing Style Guide: "Shorter is always better" and "Prune every excess word."
  <https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice>
- Microsoft, *Use simple words, concise sentences*: `utilize` → `use`, `in order to` → `to`, and drop adverbs such
  as quite, very, easily.
  <https://learn.microsoft.com/en-us/style-guide/word-choice/use-simple-words-concise-sentences>
- ASD-STE100 Simplified Technical English, Issue 9 (January 2025). Rule 5.1 caps procedural sentences at 20 words.
  Rule 6.3 caps descriptive sentences at 25 words. <https://www.asd-ste100.org/>
- US Federal Plain Language Guidelines: short sentences, cut modifiers, hidden verbs. The pages moved to
  <https://digital.gov/guides/plain-language>. The original word tables are archived at
  <https://github.com/GSA/plainlanguage.gov/tree/main/_pages/guidelines>.

## Rule 2: Direct

Say what the code does or why it exists. Do not describe the comment, narrate the code, or hedge.

- **Lead with the verb or the reason.** A doc summary starts with what the symbol does (`Returns the tenant's
  billing owner.`). An inline comment starts with why (`Upstream 502s under load, so retry three times.`).
- **No openers.** Not `This function is used to…`, `The purpose of this method is…`, or `Here we…`. Google's Java
  style guide rejects `This method returns…` as a summary for the same reason.
- **Active voice when the actor matters.** Write `The router calls this once per request`, not `This is called by
  the router once per request`. Passive is fine when the actor is unknown or does not matter.
- **Present tense.** Describe what the code does now: `Returns`, not `Will return`.
- **Positive form.** Write `common`, not `not uncommon`.
- **Hedge only real uncertainty, and name it.** Not `This probably handles retries`. Write `Unverified: retries may
  double-charge; see #412.`

Sources:

- Google developer documentation style guide. Voice: "Use active voice… make clear who's performing the action."
  <https://developers.google.com/style/voice>. Tense: "Use present tense for statements that describe general
  behavior." <https://developers.google.com/style/tense>
- ASD-STE100 rule 3.6: use active voice; use the passive only when the agent is unknown.
- Microsoft Writing Style Guide: start statements with a verb, and avoid `there is` and `there are`.
- Google Java Style Guide §7.2: the summary is a fragment, not `This method returns…`.
  <https://google.github.io/styleguide/javaguide.html>

## Rule 3: Plain English

Write for a reader who is smart, busy, and maybe not a native English speaker.

- **Common words, one meaning each.** ASD-STE100 rule 1.3: each approved word keeps one meaning. Do not call the
  same thing `user`, `account`, and `member` in one file. Microsoft: "Use one term consistently to represent one
  concept."
- **No Latin abbreviations in running text.** Write `for example`, not `e.g.`; `that is`, not `i.e.`. Finish the
  list instead of writing `etc.` Google's word list and the Kubernetes style guide both say this. MDN allows them
  inside parentheses only.
- **No timeless-breaking words.** `currently`, `recently`, `soon`, `the new API`, and `the old way` go stale without
  anyone noticing, because a comment has no publish date. Name the version, date, or issue instead. (Google,
  *Timeless documentation*, <https://developers.google.com/style/timeless-documentation>)
- **Inclusive terms.** `allowlist` and `denylist`, `primary` and `replica`, `placeholder`, `quick check`. See
  [WORD_LIST.md](WORD_LIST.md). If code shares the name (`const master = …`), escalate. Renaming code is a separate
  change.
- **Spell correctly, and keep the file's variant.** Fix `recieve`, but do not switch `colour` to `color`.

Sources:

- ISO 24495-1:2023, *Plain language, Part 1: Governing principles and guidelines*. Its four principles: readers
  get what they need (relevant), can easily find it (findable), can easily understand it (understandable), and
  can use it (usable). <https://www.iso.org/standard/78907.html>
- Google word list (`e.g.`, `i.e.`, `etc.`, `leverage`, `utilize`, `please`, `simple`, `easy`, `just`).
  <https://developers.google.com/style/word-list>
- Kubernetes documentation style guide: present tense, active voice, no Latin phrases, and avoid `just`, `simply`,
  `easy`, `easily`, `simple`. <https://kubernetes.io/docs/contribute/style/style-guide/>
- Google, *Write inclusive documentation*, <https://developers.google.com/style/inclusive-documentation>.
  Microsoft, *Bias-free communication*,
  <https://learn.microsoft.com/en-us/style-guide/bias-free-communication>.

## Rule 4: Human

The comment should sound like a careful colleague, not a brochure, a tutorial, or a chatbot.

- **No sales language.** Not `robust`, `seamless`, `powerful`, `cutting-edge`, or `elegant`. Say what failure it
  survives, or what it makes faster.
- **No machine-writing tells.** Wikipedia's editors list vocabulary that shows up far more often in LLM output than
  in human writing: `delve`, `crucial`, `pivotal`, `robust`, `meticulous`, `intricate`, `showcase`, `underscore`,
  `testament`, `tapestry`, and `serves as` used in place of `is`. They also list patterns: rule-of-three lists,
  chained em dashes, emoji, and chat phrases (`I hope this helps`, `Certainly!`). One such word is not proof. A
  cluster is.
- **No tutorial voice.** Not `Let's`, `Here we`, or `Now we're going to`. The reader is not following a lesson.
- **No shouting.** Not `DO NOT TOUCH!!!`. State the rule and the reason: `Keep this order: the parser reads the
  header before the body.`
- **Specific beats general.** Write `retries 3 times; the p99 needs 2`, not `handles retries robustly`.
- **Contractions and "we" follow the file.** Microsoft and MDN allow contractions. ASD-STE100 forbids them. Google
  prefers `you` over `we` in docs, but `we` is normal in code comments (`we retry because…`). Match what the file
  already does.

Sources:

- Wikipedia, *Signs of AI writing*. <https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing>. Note: that page
  says hedging and phrases like `in order to` are *more* common in human writing. Cutting them is a plain-English
  choice, not a way to hide machine writing.
- Google word list: `leverage` → `use`; `please` → omit.

## Doc-comment grammar

Each language has its own grammar for a doc summary: imperative (`Return the…`) or third person (`Returns the…`),
full sentence or fragment, name-first or not. Those rules outrank the house rules, and the file's existing
convention outranks both when the language allows either. See [LANGUAGE_MOOD.md](LANGUAGE_MOOD.md).

## Conflicts and how they resolve

| Question | Resolution |
|---|---|
| Contractions? | Follow the file. Microsoft and MDN allow them; ASD-STE100 forbids them. |
| "We" in comments? | Allowed if the file uses it. Flag only tutorial voice (`Let's`, `Here we`). |
| Sentence limit? | 25 words (ASD-STE100 descriptive). Up to +10 is `REVIEW`; beyond that, `REWRITE`. |
| Semicolons? | ASD-STE100 rule 8.1 forbids them. The scanner counts `;` as a sentence break. Keep them if the file uses them. |
| Imperative or third person? | The language's authority first, then the file's majority. See LANGUAGE_MOOD.md. |
| House rule vs a configured linter? | The linter wins. Name it in the summary. |

## Readability scores

The scanner reports a Flesch-Kincaid grade (`READ`) only for comments of 30 words or more:

`grade = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59`

The formula was built for long text samples. On a short comment, identifiers and technical terms push the score up
without making the comment harder for its real readers. Eleyan et al. (Information 11(9):430, 2020) applied Flesch
and Fog scores to code comments. Professional programmers' understanding did not change much with the score;
students' did. Treat `READ` as a prompt to look, never as a target. Sentence length (`LONG`) and word choice
(`WORDY`, `FILLER`) are the better signals.
