# Gap catalogue

Every gap in a report has an ID from this catalogue, a severity from the rubric, evidence (a file and a line, or
the exact search that found nothing), the standard it measures against, a fix, and a confidence.

- **Scanner** gaps come from `scan-architecture.py` as candidates. Open the evidence and confirm each one before
  it reaches the report.
- **Reading** gaps cannot be found by the scanner. You find them by tracing flows through the code.

A gap you confirmed by opening the evidence is **Confirmed**. A gap that rests on the scan alone, because the
evidence is too large to read in full or is indirect, is **Likely**. Never report a scanner signal as Confirmed
without opening its evidence.

## Severity rubric

| Severity | Meaning | Examples |
|---|---|---|
| **Critical** | Active security exposure or data-loss risk, exploitable or ongoing now | real credentials committed; unauthenticated admin route |
| **High** | Blocks safe change, or a likely production failure | domain layer imports UI; a cycle across 3+ components; no tests at all; a single point of failure on the main path |
| **Medium** | Raises the cost or risk of change; fix within a few iterations | missing ADRs; no API contract; SDK sprawl; no observability; no architecture rules in CI |
| **Low** | Hygiene; worth doing when you are nearby | no CODEOWNERS; no threat-model doc; config read in many places |
| **Info** | Worth knowing; not a defect | deployment target not in the repo |

Adjust from the default when context demands it, and say why. A cycle between two tiny utility components is Low.
A missing health endpoint on a service behind a Kubernetes rolling deploy is High.

## Scanner gaps

| ID | Default | What the scanner saw | Standard | Fix |
|---|---|---|---|---|
| `STRUCT-CYCLE` | High (3+ components) / Medium | components import each other in a loop | ADP | Invert one edge: move the shared type down, or add an interface the lower component owns. Enforce with dependency-cruiser `no-circular`, import-linter `acyclic_siblings`, ArchUnit `slices().beFreeOfCycles()`. |
| `STRUCT-CYCLE-FILE` | Medium | 3+ files import each other in a loop | ADP | Extract the shared piece into its own module. Note type-only cycles as lower risk. |
| `STRUCT-LAYER` | High (from domain) / Medium | an inner layer imports an outer one | Clean Architecture dependency rule | Move the dependency behind an interface in the inner layer; the outer layer implements it. Confirm the layer names first (see STRUCTURAL_RULES.md). |
| `STRUCT-SDP` | Low | a stable component depends on a less stable one | SDP | Depend on an abstraction, or move the volatile code out of the stable component's path. |
| `STRUCT-MAIN-SEQUENCE` | Low | Dn > 0.7 with 5+ types and 3+ dependents | SAP | Zone of pain: extract interfaces that dependents use. Zone of uselessness: remove unused abstractions. |
| `STRUCT-GRAB-BAG` | Low | a `utils` / `shared` / `common` component with high Ca and high Ce | CRP / CCP | Split by reason to change; move each helper next to its only user. |
| `STRUCT-GOD-FILE` | Medium / High (2× threshold) | files over 800 non-blank lines (a heuristic; no standard sets the number) | Modularity (ISO/IEC 25010) | Split by responsibility. Check first whether the file is generated or data. |
| `STRUCT-GOD-COMPONENT` | Low | one component holds over half the code (heuristic) | Modularity (ISO/IEC 25010) | Often fine for a monorepo's main app. Report it only when that component also has cycles or layer violations. |
| `DEP-SDK-SPRAWL` | Medium | a vendor SDK imported from 3+ components | Ports and Adapters / anti-corruption layer | One adapter module owns the SDK; the rest depend on a port (an interface) the application defines. |
| `CFG-SPRAWL` | Low | env vars read directly in 4+ components | Twelve-Factor III | One typed config module that validates at startup (for example zod, pydantic-settings, envconfig); everything else imports it. |
| `CFG-ENV-EXAMPLE` | Low | env vars read, no `.env.example` | Twelve-Factor III | Commit `.env.example` with every key and a safe placeholder. |
| `SEC-ENV-COMMITTED` | Critical (real-looking secret) / Low (placeholders, or no secret-like keys) | a tracked `.env*` file | Twelve-Factor III; OWASP Secrets Management Cheat Sheet | **Rotate first**, then `git rm --cached`, add to `.gitignore`, and purge history. Never paste the value into the report. |
| `API-CONTRACT` | Medium | HTTP routes, no OpenAPI / AsyncAPI / proto / GraphQL schema | OpenAPI Specification (entry file named `openapi.json` or `openapi.yaml`) | Generate from code (NestJS Swagger, FastAPI, drf-spectacular, Scramble, springdoc, Swashbuckle, zod-openapi) or write it first; check it in CI. |
| `OPS-HEALTH` | Medium | a deployable web service with no health or readiness endpoint | Twelve-Factor IX; Kubernetes liveness, readiness, and startup probes; Azure Health Endpoint Monitoring pattern | Add `/healthz` (process up) and `/readyz` (dependencies reachable); wire them to the platform's probes. |
| `OPS-OBSERVABILITY` | Medium | no error-tracking, tracing, or metrics library | OpenTelemetry (traces, metrics, and logs are stable signals); Twelve-Factor XI | Add OpenTelemetry auto-instrumentation plus an error tracker; propagate trace context across services. |
| `OPS-CI` | Medium | no CI configuration | Twelve-Factor V | Add a pipeline: install, type-check, lint, test, then the architecture rule. |
| `OPS-DEPLOY-UNKNOWN` | Info | no Dockerfile, IaC, or platform config | C4 deployment view; arc42 §7 | Ask where it runs; document it in §7. |
| `DATA-SHARED-DB` | Medium | 2+ Compose services depend on one database | Database per service; AWS REL04-BP02 | Give each service its own schema or database, and reach other services' data through their API or events. In a modular monolith, one database is fine; enforce table ownership per module instead. |
| `GOV-ADR` | Medium | no ADR directory | arc42 §9; Nygard ADRs; MADR 4.0; ISO/IEC/IEEE 42010 rationale | Start `docs/decisions/` with MADR. Record the 3–5 inferred decisions from §9 of the report first. |
| `GOV-ARCH-DOC` | Low | no architecture description | ISO/IEC/IEEE 42010; arc42; C4 | This report is the fix: commit it and keep it current. |
| `GOV-OWNERS` | Low | no CODEOWNERS with 6+ components | Conway's law; GitHub CODEOWNERS (`.github/`, root, or `docs/`; the last matching pattern wins) | Map each component path to its owning team. |
| `SEC-THREAT-MODEL` | Low | an HTTP service with no threat model document | OWASP Threat Modeling Cheat Sheet; STRIDE | A data-flow diagram with trust boundaries, then STRIDE per boundary crossing. |
| `FIT-NONE` | Medium | 6+ components and no architecture rule tool | Fitness functions (*Building Evolutionary Architectures*) | Add the stack's tool from STRUCTURAL_RULES.md with the cycle and layer rules this report found, and run it in CI. |
| `TEST-NONE` | High | no test files found | ISO/IEC 25010 Flexibility: Testability | Start with tests on the most-depended-on component (highest Ca). |

## Reading gaps

Trace the key flows (report §5). While you do, look for these:

| ID | Default | Look for | Standard | Fix |
|---|---|---|---|---|
| `REL-SYNC-CHAIN` | High | a request that synchronously calls 2+ other services or tiers before responding, with no fallback | AWS REL04-BP02 | Make non-essential calls async (queue or outbox); add timeouts and fallbacks to the rest. |
| `REL-NO-TIMEOUT` | Medium | outbound HTTP, DB, or SDK calls with no timeout | Azure RE:03 failure mode analysis | Set explicit timeouts; add bounded retries with jitter, only on idempotent calls. |
| `REL-SPOF` | High | one component or store on every critical path with no redundancy or fallback | Azure RE:03 (blast radius) | Document it. Add redundancy, or a degraded mode. |
| `REL-IDEMPOTENCY` | Medium | a payment, order, or webhook handler that is not safe to retry | AWS Well-Architected Reliability | Idempotency keys; a unique constraint on the external event ID. |
| `ASYNC-NO-DLQ` | Medium | queue consumers with no dead-letter or failed-job handling | Well-Architected Reliability | Configure a DLQ or failed-jobs table, and alert on it. |
| `SEC-AUTH-BOUNDARY` | Critical / High | a route or handler reachable without the auth middleware its neighbors use | OWASP ASVS (access control) | Default-deny routing; auth at the router or group level, not per handler. |
| `SEC-SECRET-IN-CODE` | Critical | credentials hard-coded in source | OWASP Secrets Management Cheat Sheet; Twelve-Factor III | Rotate, move to the environment or a secret manager, and add a secret scanner (for example detect-secrets) to CI. |
| `DATA-OWNERSHIP` | Medium | two modules writing the same table | Bounded contexts (DDD); Spring Modulith API-only access | One owner per table; others go through the owner's API or events. |
| `API-VERSIONING` | Low | a public API with no versioning or deprecation policy | OpenAPI; API design practice | Version in the path or header; document deprecation. |
| `STALE-DOC` | Medium | an existing ARCHITECTURE.md or diagram that contradicts the code | ISO/IEC/IEEE 42010 (correspondence) | Replace it with this report and date it. |

## Writing a gap

Each gap in §10 gets a table row and a short block:

```markdown
### STRUCT-CYCLE: billing and orders import each other

- **Evidence:** `src/billing/invoice.ts:3` imports `src/orders/order.ts`; `src/orders/checkout.ts:7` imports
  `src/billing/invoice.ts`. The loop spans 4 files; 2 of the imports are type-only.
- **Why it matters:** neither module can change, be tested, or be extracted without the other.
- **Standard:** ADP (Acyclic Dependencies Principle), Martin.
- **Fix:** move `InvoiceLine` into `src/billing/types.ts` and have `orders` depend on that only. Add the
  dependency-cruiser `no-circular` rule.
- **Verify:** `npx depcruise src --config` exits 0; `scan-architecture.py` shows no cycle.
```
