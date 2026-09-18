# Word list

The scanner's tables come from here. A match is a candidate. It is not an order. Several plain-language entries
are also programming terms (`delete`, `request`, `interface`, `implement`, `type`, `initial`), and those are never
replaced. Code, identifiers, and quoted text are never replaced either.

## Wordy → plain (`WORDY`)

Sources: US Federal Plain Language Guidelines, *Use simple words and phrases* (archived at
<https://github.com/GSA/plainlanguage.gov/tree/main/_pages/guidelines/words>); Microsoft, *Use simple words,
concise sentences*; Google word list.

| Wordy | Plain |
|---|---|
| in order to, so as to | to |
| utilize, utilization, make use of | use (keep `utilization` for resource metrics, e.g. CPU) |
| prior to | before |
| subsequent to / subsequently | after / later, then |
| in the event that, in the event of, in the case that | if |
| due to the fact that, owing to the fact that, for the reason that | because |
| in spite of / despite the fact that | although |
| at this point in time, at the present time | drop it, or name the version |
| for the purpose of, as a means to | to, for |
| with regard to, with respect to, in relation to, regarding | about, for |
| is able to, has the ability to, is capable of | can |
| a number of / a large number of | some, several / many |
| the majority of | most |
| commence | start |
| endeavor to, attempt to | try to |
| ascertain | find out, check |
| facilitate | help, allow |
| approximately | about |
| sufficient | enough |
| numerous | many |
| additional | more, extra |
| in lieu of | instead of |
| possess | have |
| consequently | so |
| whether or not | whether |
| each and every | each, every |
| first and foremost | first |
| until such time as | until |
| with the exception of | except |
| in excess of | more than |
| it is necessary that, it is required that | must |
| perform a validation of, make a decision, give consideration to | validate, decide, consider |
| is dependent on, is indicative of, is in need of | depends on, indicates, needs |
| there is a X that… | start with the subject: `X …` |
| herein, therein, hereby, aforementioned | here, this |

## Filler and minimizers (`FILLER`)

Sources: Google word list (`simple`, `easy`, `just`, `please`); Kubernetes style guide (`just`, `simply`, `easy`,
`easily`, `simple`); Microsoft (quite, very, easily); plain-language guidelines (really, very, totally).

`simply`, `just` (unless it means "only" or "immediately"), `basically`, `actually` (unless it contrasts with an
expectation), `really`, `very`, `obviously`, `clearly`, `of course`, `needless to say`, `easily`, `easy to`,
`trivially`, `quite`, `literally`, `please`, `note that`, `it should be noted that`, `keep in mind that`,
`as you can see`, `in fact`, `totally necessary`.

Words like `obviously` and `easy` do harm: to a reader who is stuck, "obviously" says they are slow.

## Hedges (`HEDGE`)

`I think`, `I believe`, `probably`, `presumably`, `hopefully`, `seems to`, `appears to`, `sort of`, `kind of`,
`somewhat`, `might possibly`, `maybe`, `perhaps`, `should work`, `in theory`.

A hedge is not a machine-writing tell. Wikipedia notes that hedging is *more* common in human writing. It is
flagged because it hides what is known. If the uncertainty is real, name it: `Unverified: …`, or a `TODO` with an
issue.

## Machine-writing vocabulary (`AI`)

Primary source: Wikipedia, *Signs of AI writing* (<https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing>).
Its "AI vocabulary" list includes:

- additionally, align with, boasts, bolstered, crucial, deep dive, delve, emphasizing, enduring, enhance,
  fostering, garner, highlight (verb), interplay, intricate, key (adjective), landscape, meticulous, pivotal,
  robust, showcase, tapestry, testament, underscore, valuable, vibrant.

It also lists these patterns:

- `serves as`, `stands as`, or `functions as` used in place of `is`;
- promotional tone;
- rule-of-three lists;
- chained em dashes;
- emoji;
- chat phrases (`I hope this helps`, `Certainly!`).

Other entries have a different source:

- `leverage`: Google word list, "use", "build on", or "take advantage of".
- `seamless`, `cutting-edge`, `state-of-the-art`, `game-changing`, `empower`, `streamline`, `elevate`: marketing
  tone, which the Microsoft and Google guides both reject in technical text.

A single word is not proof of anything. The scanner flags each one so the writer looks. The fix is always the
specific claim: say what failure it survives, what gets faster, what it returns.

## Openers (`OPENER`) and narration (`NARRATE`)

| Instead of | Write |
|---|---|
| `This function is used to parse the header.` | `Parses the header.` |
| `The purpose of this method is to retry failed jobs.` | `Retries failed jobs.` |
| `Function to get the highest number.` | `Returns the highest number.` |
| `Here we loop over the users and skip admins.` | `Admins are billed separately, so skip them.` |
| `Let's cache this for later.` | `Cached: the lookup costs a network round trip.` |

## Time words (`TIME`)

Source: Google, *Timeless documentation* (<https://developers.google.com/style/timeless-documentation>). It lists
currently, now, new, latest, soon, eventually, existing, "as of this writing", and "does not yet".

In comments: `currently`, `presently`, `nowadays`, `as of now`, `at the moment`, `for now`, `right now`,
`recently`, `lately`, `soon`, `in the future`, `eventually`, `not yet`, `going forward`, `the new API`, `the old
way`, `the latest version`, `legacy code`.

Fix: name the version, date, or issue (`Until #512 ships the batch endpoint, …`), or drop the word.

## Inclusive terms (`TERM`)

| Avoid | Use | Source |
|---|---|---|
| whitelist / blacklist / graylist | allowlist / denylist, blocklist / provisional list | Google word list; MDN; Microsoft |
| master / slave | primary / replica, primary / secondary, leader / follower, controller / worker | Google; Microsoft; MDN |
| sanity check | quick check, confidence check, coherence check | Google |
| sane | valid, sensible | Google |
| dummy | placeholder, stub, sample | Google; MDN |
| native (software) | built-in | Google |
| grandfathered | legacy, exempt | Microsoft bias-free guidance |
| man-hours, manpower | person-hours, staff | Microsoft bias-free guidance |
| crazy, insane, lame, dumb, crippled | unexpected, surprising, slow, limited | Microsoft bias-free guidance |
| he or she, he/she | they | Microsoft bias-free guidance |

Background: the IETF draft *Terminology, Power, and Exclusionary Language in Internet-Drafts and RFCs*
(draft-knodel-terminology) proposes the same pairs. It **expired** and never became an RFC, so cite the style
guides above.

**When code shares the name**, as in `master` the branch, `MasterKey` the class, or `--whitelist` the flag, the
comment must keep matching the code. Escalate: the rename belongs in a separate change.

## Misspellings (`SPELL`)

The scanner carries about a hundred common misspellings seen in code comments (`recieve`, `seperate`, `occured`,
`dependant`, `paramter`, `retreive`, `lenght`, `wether`, …). It never "fixes" a UK spelling into a US one, or the
reverse. If the repository has a `cspell` dictionary, its words are correct by definition.
