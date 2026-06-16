# Clean Code Review Reference (Laravel / PHP)

Use these principles as context-sensitive heuristics, not rigid laws. Repository conventions, framework idioms, correctness, and clarity take priority over personal style. Follow PSR-12 and the project's tooling (Pint, PHP_CodeSniffer, PHPStan/Larastan) where established.

## Review lenses

### Intent and naming

- Names should reveal domain intent. Follow Laravel conventions: singular `Eloquent` models, plural tables, `PascalCase` classes, `camelCase` methods/variables, `snake_case` config keys.
- Boolean names should make true/false meaning clear (`isActive`, `hasAccess`).
- Avoid misleading names, unexplained abbreviations, and overloaded terms.

### Cohesion and responsibility

- Keep **controllers thin**: validate via Form Requests, delegate business logic to services/actions/jobs, return Resources/views. Flag fat controllers that mix validation, business rules, queries, and presentation.
- Put reusable query logic in model scopes or query objects; put domain rules in services/actions. Use repositories only when they genuinely reduce coupling — not by default.
- Avoid “god” models/services and avoid one-class-per-line fragmentation.
- Prefer explicit data flow over hidden mutation, static state, and action at a distance.

### Functions and classes

- A method/class should have a coherent purpose and a readable level of abstraction.
- Extract code when it creates a meaningful concept, removes risky duplication, or makes testing easier — not merely to reduce line count.
- Use guard clauses to reduce nesting. Keep side effects visible.
- Prefer dependency injection (constructor/method) over reaching for facades inside deep logic when it improves testability — but facades are idiomatic at the edges; don't over-engineer.

### Duplication and abstraction

- Report duplication when repeated logic can drift or encodes the same business rule inconsistently.
- Do not force unrelated code into a shared trait/base class merely because it looks similar today.
- Prefer a small, stable interface over premature generalization and config-heavy helpers. Beware trait overuse that hides state and coupling.

### Types and contracts (PHP 8)

- Use parameter, return, and property type declarations. Prefer `enum` for fixed sets, `readonly` for immutable value objects, and constructor property promotion for clarity.
- Avoid untyped associative arrays passed across boundaries when a DTO/value object would document the contract; validate external data at boundaries (types alone don't validate runtime input).
- Flag unsafe casts, `@` error suppression, broad `mixed`, and silent `null` handling that can hide failures. Use the nullsafe operator deliberately, not to mask missing data.

### Errors and observability

- Handle expected failures with typed exceptions and the framework exception handler; don't swallow exceptions or `catch (\Exception $e) {}` with only a log-and-continue when the operation should fail.
- Wrap multi-step writes in `DB::transaction()` (or explicit begin/commit/rollback) so partial failures don't corrupt state.
- Preserve useful context without leaking secrets/PII. Avoid duplicate user notifications and ambiguous fallbacks.
- Ensure file handles, locks, and external connections are released.

### Eloquent and framework idioms

- Use relationships, scopes, casts, accessors/mutators, and route model binding instead of reimplementing them by hand.
- Keep business logic out of Blade templates; pass prepared data (View Models / Resources) to views.
- Use Form Requests for validation and authorization; use API Resources for response shaping rather than manual array building.
- Migrations should be reversible (`down`) and non-destructive where possible; flag data loss risk and long-locking schema changes on large tables.

### Comments and documentation

- Comments should explain why, constraints, trade-offs, or surprising behavior — not restate code.
- Remove stale comments and dead/commented-out code. PHPDoc adds value mainly where it documents generics/array shapes that native types cannot, or a non-obvious contract.

### Tests

- Test externally meaningful behavior and important failure paths with PHPUnit or Pest; prefer feature tests for HTTP/authorization flows.
- New authorization, validation, pricing, state-transition, and money logic usually needs regression coverage.
- Avoid tests coupled to incidental implementation details when behavior-level assertions are possible.
- A missing test is a finding only when the change creates material regression risk or repository policy requires it.

## Literature and standards

The skill applies concepts inspired by these works without reproducing their copyrighted text:

- Robert C. Martin, *Clean Code* and *Clean Architecture*, Prentice Hall.
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*, 2nd edition, Addison-Wesley.
- Eric Evans, *Domain-Driven Design*, Addison-Wesley, for domain boundaries where applicable.
- Matthias Noback, *Object Design Style Guide* and *Principles of Package Design*, for PHP object/architecture design.
- Andrew Hunt and David Thomas, *The Pragmatic Programmer*, 20th Anniversary Edition, Addison-Wesley.

Supporting official references:

- PSR-12 Coding Style: https://www.php-fig.org/psr/psr-12/
- PSR-1 / PSR-4: https://www.php-fig.org/psr/
- Laravel Documentation: https://laravel.com/docs
- Laravel Eloquent: https://laravel.com/docs/eloquent
- PHP: The Right Way: https://phptherightway.com/
- PHP Language Reference: https://www.php.net/manual/en/langref.php
