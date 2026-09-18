# Doc-comment grammar by language

A doc summary's grammar is set by the language's own authority. Match it. When the language allows either form,
match the file's majority. Never churn a whole file to switch mood. The scanner's `MOOD` rule flags only:

- third-person languages that use an imperative summary;
- Go summaries that do not start with the symbol's name;
- summaries that disagree with the rest of their file.

**The repository always wins.** A configured `pydocstyle` convention, `eslint-plugin-jsdoc` rule, `godot`, or
StyleCop rule outranks this table.

| Language | Summary mood | Form | Authority |
|---|---|---|---|
| Python | **Imperative** (`Return the path.`), or either if consistent within the file | Phrase ending in a period | PEP 257; Google Python Style Guide §3.8.3 |
| Java | **Third person** (`Returns the label.`) | Fragment is fine; verb phrase first | Oracle *How to Write Doc Comments*; Google Java Style §7.2 |
| Kotlin, Scala, Groovy | **Third person** | Follows the Javadoc convention | Javadoc conventions |
| C / C++ | **Third person** (`Opens the file.`) | Implied subject "This function" | Google C++ Style Guide |
| JavaScript / TypeScript | **Third person** per Google; JSDoc and TSDoc set no rule | Brief summary | Google JavaScript Style Guide §7.8; TSDoc |
| Go | **Third person, starting with the name** (`Copy copies…`) | Complete sentences | *Go Doc Comments* |
| Rust | **Third person** (`Returns…`) | Summary sentence | RFC 1574 |
| Swift | **Third person** (`Returns…`, `Inserts…`) | **Fragment**, ending in a period | Swift API Design Guidelines |
| C# | Third person by convention (`Gets or sets…`) | Complete sentences ending in a period | Microsoft XML doc recommendations; StyleCop SA1623 |
| PHP | None set; match the file | Short summary, 1–2 lines | PSR-5 (draft) |

## Python

- PEP 257: the docstring "prescribes the function or method's effect as a command ('Do this', 'Return that'), not
  as a description; e.g. don't write 'Returns the pathname …'". It is a phrase ending in a period.
  <https://peps.python.org/pep-0257/>
- Google Python Style Guide §3.8.3 accepts either "Fetches rows…" or "Fetch rows…", but asks you to be
  consistent within a file. A `@property` docstring is a noun phrase (`The Bigtable path.`), not `Returns…`.
  <https://google.github.io/styleguide/pyguide.html>
- PEP 8: capitalize the first word of a comment unless it is an identifier. Never change an identifier's case.
  <https://peps.python.org/pep-0008/#comments>
- `pydocstyle` with `convention = pep257` enforces imperative mood through `D401`. The `google` convention does
  not. When `D401` is on, run the scanner with `--python-mood imperative`.

## Java, Kotlin, Scala

- Oracle: use the third person. "Gets the label. (preferred)" versus "Get the label. (avoid)". Begin with a verb
  phrase, and write "this" rather than "the" for the current object. Avoid Latin.
  <https://www.oracle.com/technical-resources/articles/java/javadoc-tool.html>
- Google Java Style §7.2: the summary is a noun or verb phrase. It is not `A Foo is a…`, not `This method
  returns…`, and not an imperative (`Save the record.`). <https://google.github.io/styleguide/javaguide.html>

## C and C++

- Google C++ Style Guide: function comments are descriptive, with an implied subject of "This function". Write
  `Opens the file`, not `Open the file`. Do not state the obvious; explain why.
  <https://google.github.io/styleguide/cppguide.html>
- Linux kernel coding style §8: "tell WHAT your code does, not HOW". kernel-doc summaries use the form
  `function_name() - Brief description of function.` <https://www.kernel.org/doc/html/latest/process/coding-style.html>

## JavaScript and TypeScript

- Google JavaScript Style Guide §7.8: a method description is "not an imperative sentence", written as if it
  follows an implied "This method …". <https://google.github.io/styleguide/jsguide.html>
- TSDoc: "The summary section should be brief." It sets no mood. <https://tsdoc.org/>
- JSDoc sets no wording rule. Match the file.

## Go

- *Go Doc Comments*: the comment is complete sentences that begin with the declared name: `// Quote returns…`,
  `// Package path implements…`. A boolean function "reports whether", and "or not" is unnecessary. A type comment
  says what each instance represents or provides. <https://go.dev/doc/comment>
- `Deprecated:` as its own paragraph is recognized by tools. Keep its exact spelling.
- A `godot` linter requires the period at the end.

## Rust

- RFC 1574: write the summary in the "third person singular present indicative": `Returns`, not `Return`. It also
  specifies American English. <https://rust-lang.github.io/rfcs/1574-more-api-documentation-conventions.html>

## Swift

- Swift API Design Guidelines: "Use a single sentence fragment… ending with a period. Do not use a complete
  sentence." Functions say what they do and return (`Inserts…`, `Returns…`). Initializers say "Creates…", and
  subscripts say "Accesses…". Other declarations say what the entity *is*.
  <https://www.swift.org/documentation/api-design-guidelines/>

## C#

- Microsoft's recommended XML doc tags: complete sentences that end with a period.
  <https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags>
- The property rule "Gets", "Gets or sets", or "Gets a value indicating whether" comes from StyleCop SA1623, not
  from Microsoft Learn. Apply it only when StyleCop is configured.
  <https://github.com/DotNetAnalyzers/StyleCopAnalyzers/blob/master/documentation/SA1623.md>

## PHP

- PSR-5 (PHPDoc) and PSR-19 (PHPDoc tags) are both still **drafts**. PSR-5 describes the summary as a short
  abstract of the element's purpose, one or two lines. Neither sets a mood. Match the file.
  <https://www.php-fig.org/psr/>

## Google API reference comments (any language)

For a public API, Google's guide gives a consistent pattern: <https://developers.google.com/style/api-reference-comments>

- Methods: `Returns…`, `Gets…`, `Checks whether…`.
- Parameters start with `The` or `A`.
- Booleans: `True if …; false otherwise.`
- Deprecation: `Deprecated. Use X instead.`
