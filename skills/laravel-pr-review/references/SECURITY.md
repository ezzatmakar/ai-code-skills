# Security Review Reference (Laravel / PHP)

Use this reference selectively. Review the changed attack surface and verify reachable paths rather than applying every item mechanically. Interpret guidance against the installed Laravel and PHP versions.

## Trust boundaries and entry points

Treat these as externally callable or attacker-influenced unless proven otherwise:

- Routes in `routes/web.php`, `routes/api.php`, and any route file; controllers and invokable controllers.
- Middleware, Form Requests, Gates/Policies, and authorization callbacks.
- Queued Jobs, listeners, scheduled commands, Artisan commands callable in production, and broadcast channel authorization.
- Webhooks, OAuth/social callbacks, signed URLs, and file upload/download endpoints.
- Request input: route params, query string, body, JSON, headers, cookies, uploaded file metadata, and external API responses.

For each privileged operation, verify authentication **and** authorization against the target resource. A logged-in user is not automatically allowed to act on every model ID they can submit. Prefer Policies/Gates checked via `$this->authorize(...)`, the `can` middleware, or Form Request `authorize()` — and confirm `authorize()` does not simply `return true`.

## Mass assignment

- Models should declare `$fillable` (allowlist) or a deliberate `$guarded`. Be wary of `$guarded = []` combined with `$request->all()`.
- Flag `create`/`update`/`fill`/`forceFill` fed directly from `$request->all()` or unvalidated input when sensitive columns (e.g. `is_admin`, `role_id`, `user_id`, `price`) exist.
- `Model::unguard()` and `forceFill()` bypass protection — confirm the input is trusted.

## Input, output, and injection

- Validate on the server with Form Requests or `$request->validate()` using explicit rules and bounds. Use allowlists for enums, sort columns, file types, and redirect destinations.
- SQL injection: review `DB::raw`, `whereRaw`, `havingRaw`, `orderByRaw`, `selectRaw`, `DB::statement`, and any string-interpolated column/table/direction. Bind parameters; never interpolate user input. Dynamic `orderBy($column)` must allowlist the column.
- Blade output is escaped by default with `{{ }}`. Treat `{!! !!}`, `Js::from`, `HtmlString`, and `@php echo` as XSS sinks when fed user data; sanitize rich text/HTML.
- Command injection: review `exec`, `shell_exec`, `system`, `passthru`, `proc_open`, and Symfony `Process` built from user input. Avoid `eval` and `unserialize` on untrusted data (PHP object injection).
- Path traversal: validate/normalize user-controlled file names and paths used with `Storage`, `file_get_contents`, or `response()->download()`.

## Authentication, sessions, and tokens

- Cookies/sessions: appropriate `HttpOnly`, `Secure`, `SameSite`, encryption, and lifetime in `config/session.php`. State-changing routes require CSRF protection; review any `VerifyCsrfToken` `$except` entries.
- API auth: Sanctum/Passport token scopes, abilities, and expiry; revoke on logout/password change. Don't accept long-lived tokens where short-lived are appropriate.
- Passwords hashed with `Hash::make`/bcrypt/argon; never `md5`/`sha1`. Use `Hash::needsRehash` on login when cost changes.
- Signed URLs (`URL::signedRoute`, `hasValidSignature`) for tokenless actions; verify expiry.

## External requests, files, and webhooks

- SSRF: server-side `Http::get`/`file_get_contents`/cURL to user-provided URLs needs protocol/host allowlists, redirect limits, and timeouts.
- Open redirects: validate `redirect()`/`Redirect::to()` targets against an allowlist; do not redirect to raw user input.
- File uploads: validate size, MIME and extension (allowlist), store on the correct disk (private vs `public`), and avoid serving user files from a path that allows execution.
- Webhooks: verify signatures against the raw payload, enforce timestamp/replay windows, and fail closed.

## Configuration and secrets

- `APP_DEBUG` must be false in production; debug pages leak environment, stack traces, and queries.
- No secrets committed to the repo; `.env` not tracked; no API keys/tokens in code, logs, or exception context.
- Remove `dd()`, `dump()`, `var_dump()`, `ray()`, and verbose logging of request bodies/PII.
- Review CORS config, trusted proxies, and security headers.
- Dependency changes: rely on `composer audit` / advisories for reachable vulnerabilities; do not invent CVE status.

## Abuse and operational controls

- Rate limit (`throttle` middleware, `RateLimiter::for`) login, password reset, OTP, search, export, expensive queries, uploads, and webhooks.
- Ensure logs and error responses do not contain secrets, tokens, PII, SQL, or internal infrastructure details.
- Multi-tenancy: confirm queries are scoped (global scopes or explicit `where`) so one tenant cannot read/write another's data.

## Primary references

- Laravel Security / Authorization: https://laravel.com/docs/authorization
- Laravel Authentication: https://laravel.com/docs/authentication
- Laravel Validation: https://laravel.com/docs/validation
- Laravel CSRF Protection: https://laravel.com/docs/csrf
- Laravel Encryption & Hashing: https://laravel.com/docs/hashing
- OWASP Application Security Verification Standard: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- MITRE CWE: https://cwe.mitre.org/
