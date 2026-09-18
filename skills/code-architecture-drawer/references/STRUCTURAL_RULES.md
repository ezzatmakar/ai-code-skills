# Structural rules

The code-level rules `scan-architecture.py` measures, what each one means, and the tools that enforce them in CI.
The skill recommends one of these tools as the fix for `FIT-NONE`.

## Robert C. Martin's package metrics

Primary source: *OO Design Quality Metrics* (1994).
<https://linux.ime.usp.br/~joaomm/mac499/arquivos/referencias/oodmetrics.pdf>

| Metric | Definition | The scanner counts |
|---|---|---|
| **Ca**, afferent coupling | classes outside the category that depend on classes inside it | components that import this one |
| **Ce**, efferent coupling | classes inside the category that depend on classes outside it | components this one imports |
| **I**, instability | `Ce / (Ca + Ce)`, 0 to 1; 0 is maximally stable | same |
| **A**, abstractness | abstract classes ÷ total classes | interfaces, abstract classes, traits, protocols, ABCs ÷ all type declarations |
| **Dn**, normalized distance | `|A + I − 1|`, 0 to 1 | same |

- **Zone of pain:** A≈0, I≈0. Concrete and heavily depended on, so every change ripples outward.
- **Zone of uselessness:** A≈1, I≈1. Abstract, and nothing depends on it.
- **JavaScript and TypeScript are left out of A and Dn.** Most TS interfaces describe data shapes, not
  abstractions that callers depend on, so A would read near 1.0 and mean nothing.
- **The scanner counts at component level, not class level.** It counts distinct components, not classes, so
  treat its numbers as a map of coupling, not Martin's exact measure.
- Martin's own caveat: "a metric is not a god". Report the metrics. Never gate on a threshold alone.

## Component principles

- **ADP, Acyclic Dependencies Principle:** "the dependency graph of packages or components should have no
  cycles." <https://en.wikipedia.org/wiki/Acyclic_dependencies_principle>. Checked: `STRUCT-CYCLE` (components)
  and `STRUCT-CYCLE-FILE` (files, three or more).
- **SDP, Stable Dependencies Principle:** depend in the direction of stability. Checked: `STRUCT-SDP` flags an
  edge from a component to one whose instability is more than 0.25 higher.
- **SAP, Stable Abstractions Principle:** a stable package should be abstract. Checked: `STRUCT-MAIN-SEQUENCE`
  flags Dn above 0.7 on a component with five or more types and three or more dependents.
- **CRP and CCP, Common Reuse and Common Closure:** things that change together belong together. Checked:
  `STRUCT-GRAB-BAG` flags a `utils`, `shared`, or `common` component that is both widely used and widely
  dependent.

Secondary source for SDP and SAP: <http://agileinaflash.blogspot.com/2009/04/principles-of-package-coupling.html>.
Martin's original page was unreachable when this was written.

**Type-only imports count.** `import type` is a compile-time dependency. dependency-cruiser also counts it by
default. When a cycle exists only through type imports, say so in the gap: it is lower risk, but it is still
coupling.

## Clean Architecture: the dependency rule

<https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html>

"Source code dependencies can only point inwards." The layers, from the inside out: Entities, then Use Cases, then
Interface Adapters, then Frameworks and Drivers. Only simple data structures cross a boundary, never database
rows.

`STRUCT-LAYER` infers layers from directory names and flags imports that break these rules:

| Layer (inferred from path) | Must not import |
|---|---|
| domain (`domain`, `entities`, `models`, `core`) | application, presentation, infrastructure |
| application (`services`, `use-cases`, `actions`, `jobs`) | presentation |
| infrastructure (`db`, `repositories`, `adapters`, `clients`) | presentation |
| shared (`utils`, `lib`, `common`, `helpers`, `config`) | any product layer |

Inference by name is a heuristic. A folder called `models` in an MVC app may be the persistence layer rather than
a pure domain. Confirm the layer by reading the code before you report a violation, and say so when the codebase
uses names differently.

## Hexagonal architecture (Ports and Adapters)

Alistair Cockburn, 2005. <https://alistair.cockburn.us/hexagonal-architecture/>

The application is driven equally by users, tests, and scripts. **Driving adapters** call in through ports.
**Driven adapters**, such as databases, payment providers, and email, sit behind ports the application defines.

`DEP-SDK-SPRAWL` flags a vendor SDK (payments, database, queue, storage, email, AI, CMS, search, auth) imported
directly from three or more components. That means there is no port: changing the vendor, or faking it in a test,
touches every one of those components.

## Layering, bounded contexts, and modular monoliths

- **Presentation, domain, data:** once layers grow, the top-level split should be by domain module, with each
  module layered inside. <https://martinfowler.com/bliki/PresentationDomainDataLayering.html>
- **Bounded contexts (DDD):** one model per context, with the relationships shown on a context map.
  <https://martinfowler.com/bliki/BoundedContext.html>
- **Modular monolith checks** (Spring Modulith, <https://docs.spring.io/spring-modulith/reference/verification.html>):
  - no cycles between modules;
  - other modules are reached only through their API packages;
  - optionally, only the dependencies a module declares.
- **Database per service:** a service's data is "private to that service and accessible only via its API".
  <https://microservices.io/patterns/data/database-per-service.html>. `DATA-SHARED-DB` flags two or more
  deployables in Docker Compose that depend on the same database.
- **Conway's law:** the system's structure copies the organization's communication structure.
  <https://martinfowler.com/bliki/ConwaysLaw.html>. `GOV-OWNERS` flags missing ownership when there are six or
  more components.

## Fitness functions and the tools that enforce them

"An architectural fitness function provides an objective integrity assessment of some architectural
characteristic(s)." <https://evolutionaryarchitecture.com/ffkatas/>

| Tool | Stack | Checks | Config |
|---|---|---|---|
| dependency-cruiser | JS/TS | `forbidden` / `allowed` / `required` rules; `circular`, `orphan`, `reachable`; `moreUnstable` enforces SDP; mermaid, dot, and html reporters | `.dependency-cruiser.js` / `.cjs` / `.json` (`npx depcruise --init`) |
| eslint-plugin-boundaries, Nx `enforce-module-boundaries` | JS/TS | element types and allowed imports, inside ESLint | ESLint config, `nx.json` |
| madge | JS/TS | `--circular`, `--orphans`, graph image | `.madgerc` or `"madge"` in package.json |
| import-linter | Python | contracts: forbidden, protected, layers, independence, acyclic siblings; run `lint-imports` | `.importlinter`, `setup.cfg`, or `[tool.importlinter]` in pyproject.toml |
| deptrac | PHP 8.2+ | layers, collectors, ruleset, baseline | `deptrac.php` (default) or `deptrac.yaml` |
| ArchUnit | Java/Kotlin | `layeredArchitecture()`, `onionArchitecture()`, `slices()…beFreeOfCycles()`; `FreezingArchRule` baselines existing violations | test code; `archunit.properties` |
| Spring Modulith | Java | module cycles, API-only access | `ApplicationModules.of(App.class).verify()` in a test |
| go-arch-lint | Go | components, `mayDependOn`, vendors; `check` and `graph` | `.go-arch-lint.yml` |
| NetArchTest | .NET | fluent dependency rules in tests (last release 2021) | test code |
| jQAssistant | JVM and others | Cypher rules over a Neo4j graph of the code | `.jqassistant.yml` |

### Starter configs to put in a `FIT-NONE` fix

dependency-cruiser: forbid cycles and domain → UI:

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    { name: "domain-not-to-ui", severity: "error",
      from: { path: "^src/domain" }, to: { path: "^src/(ui|components|app)" } },
  ],
  options: { tsConfig: { fileName: "tsconfig.json" }, doNotFollow: { path: "node_modules" } },
};
```

import-linter: layers, top to bottom:

```toml
# pyproject.toml
[tool.importlinter]
root_package = "myapp"

[[tool.importlinter.contracts]]
name = "Layers"
type = "layers"
layers = ["myapp.api", "myapp.services", "myapp.domain"]
```

deptrac: domain depends on nothing. Run `vendor/bin/deptrac init`, then define `Domain`, `Application`, and `Infrastructure` layers with
directory collectors and a ruleset where `Domain: []`. The skill should generate the file with the project's real
paths rather than paste this stub.

ArchUnit: no cycles between top-level packages:

```java
@AnalyzeClasses(packages = "com.example")
class ArchitectureTest {
  @ArchTest
  static final ArchRule noCycles = slices().matching("com.example.(*)..").should().beFreeOfCycles();
}
```

Wire whichever tool fits into CI next to the tests, so the rule fails a pull request instead of a review.
