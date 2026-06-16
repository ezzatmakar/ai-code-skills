# Performance Review Reference (Laravel / PHP)

Performance guidance must be tied to the installed Laravel/PHP versions and the changed execution path. Never invent query counts or timings.

## Database and Eloquent

- **N+1 queries** are the most common Laravel performance regression. Look for relationship access inside loops or Blade (`@foreach ... $item->relation`). Fix with eager loading: `with()`, `load()`, `loadMissing()`, `withCount()`, `withSum()`. Consider enabling `Model::preventLazyLoading()` in non-production to catch them.
- Queries inside loops that could be a single query (`whereIn`, batched insert/upsert) or a join.
- Over-fetching: `SELECT *` and unbounded `all()`/`get()` on large tables. Prefer `select([...])` of needed columns and pagination (`paginate`, `simplePaginate`, `cursorPaginate`).
- Large datasets processed in memory: prefer `chunk`, `chunkById`, `cursor`, or `lazy()` to bound memory. `cursor()` streams but keeps one query open; `chunkById` is safer when rows are modified.
- **Indexes**: new `where`, `orderBy`, join, and foreign-key columns introduced by the change should be backed by indexes. Flag migrations that add such columns without an index, and queries that filter on unindexed columns.
- Aggregates and existence: use `exists()`/`doesntExist()` instead of `count() > 0`, and database-level aggregates instead of loading collections to count/sum in PHP.
- Duplicate/redundant queries within one request that can be combined or cached.

## Caching

- Cache expensive, repeatable reads with `Cache::remember`/`rememberForever`, but only when staleness is acceptable.
- Cache keys must include the user/tenant identifier when data is personalized; never serve one user's cached data to another.
- Invalidate or tag caches on writes. Prefer cache tags (supported drivers) for grouped invalidation.
- Never cache authorization-sensitive data under a shared key.
- Config/route/event/view caching (`config:cache`, `route:cache`) affects runtime behavior; ensure code does not depend on `env()` outside config files (it returns null when config is cached).

## Queues and async work

- Expensive synchronous work in the request path — email, notifications, external API calls, image/PDF processing, exports, report generation — should be dispatched to a queued Job.
- Jobs should be idempotent where retried; watch for unbounded retries, missing `timeout`/`tries`, and large serialized payloads (serialize IDs, not whole models — `SerializesModels` re-queries).
- Batch and chunk large background workloads; avoid one giant job that holds a worker for a long time.

## PHP runtime and Octane

- Avoid repeated heavy work per request that can be hoisted, memoized, or precomputed.
- Under **Octane** (or any long-lived worker), watch for state leakage: static properties, singletons holding request state, and global mutation persist across requests and can leak data or grow memory. Reset or avoid shared mutable state.
- Be mindful of opcache/JIT assumptions; do not claim a speedup without evidence.

## Serialization and payloads

- API Resources should expose only needed fields; avoid returning entire models with hidden-but-loaded relationships.
- Avoid loading relationships that are not serialized; conversely avoid lazy-loading during serialization (N+1).
- Paginate and bound list responses; stream large file/exports rather than building them fully in memory.

## Validation evidence

Useful evidence includes:

- Laravel Telescope / Debugbar query counts and durations supplied by the project.
- `EXPLAIN` plans or slow-query logs.
- Test output, `php artisan test --profile`, or benchmark scripts in the repo.
- Static analysis hints (Larastan) for obvious issues.

Absence of measurements should reduce confidence, not prevent reporting an obvious N+1, missing index, or algorithmic regression.

## Primary references

- Laravel Eloquent Relationships (eager loading): https://laravel.com/docs/eloquent-relationships#eager-loading
- Laravel Database / Query Builder: https://laravel.com/docs/queries
- Laravel Pagination: https://laravel.com/docs/pagination
- Laravel Cache: https://laravel.com/docs/cache
- Laravel Queues: https://laravel.com/docs/queues
- Laravel Octane: https://laravel.com/docs/octane
- Laravel Eloquent: Collections & chunking: https://laravel.com/docs/eloquent#chunking-results
