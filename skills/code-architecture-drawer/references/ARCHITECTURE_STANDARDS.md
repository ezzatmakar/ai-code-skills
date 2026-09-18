# Architecture standards

The report's shape, its diagrams, and its gap analysis are measured against these published standards. Cite the
standard by name and section in every gap. The ISO texts are paywalled, so their concepts below are confirmed
through the secondary sources linked.

## ISO/IEC/IEEE 42010:2022: what an architecture description must contain

*Software, systems and enterprise — Architecture description*, 2nd edition (replaces the 2011 edition).
<https://www.iso.org/standard/74393.html>. Summary: <https://quality.arc42.org/standards/iso-42010>

Concepts the report must reflect:

- **Stakeholders** and their **concerns**, addressed explicitly.
- **Viewpoints** (conventions for a kind of view) and the **views** that apply them.
- **Model kinds**, and the **correspondences** between elements in different views.
- **Architecture decisions and their rationale**, with explicit links from concern to decision to architecture.
- New in 2022: **stakeholder perspectives**, which group concerns, and **architecture aspects**.

How the report applies it: every view states its scope. Every element traces to a file. Decisions (§9) carry
their rationale, or are marked *Inferred* when the code shows a choice but no record of why.

## arc42: the section structure

<https://arc42.org/overview>. Twelve sections:

1. Introduction and Goals
2. Constraints
3. Context and Scope
4. Solution Strategy
5. Building Block View
6. Runtime View
7. Deployment View
8. Crosscutting Concepts
9. Architecture Decisions
10. Quality Requirements
11. Risks and Technical Debt
12. Glossary

The report template keeps arc42's order and maps onto it (template §12 lists the mapping). §2 Constraints, §4
Solution Strategy, and §12 Glossary are rarely provable from code. Fill them only when the repository documents
them.

## C4 model: the diagrams

<https://c4model.com/diagrams>

- **Core diagrams:** System Context (level 1), Container (level 2), Component (level 3), Code (level 4).
- **Supplementary diagrams:** System Landscape, Dynamic, Deployment.
- Draw "only those that add value". Component diagrams are optional per container. Code diagrams are generally
  not recommended: the IDE already shows the code.

**Notation rules** (<https://c4model.com/diagrams/notation>). The validator enforces the ones marked ✔:

- ✔ Every diagram has a title stating its type and scope.
- ✔ Every diagram has a key or legend explaining shapes, colors, borders, and line styles.
- Every element states its type (Person, Software System, Container, Component) and a short description of its
  responsibility.
- Every container and component states its technology.
- ✔ Every relationship is one-directional and labelled with a specific intent. Avoid a bare "Uses".
- Every relationship between containers states the protocol (HTTPS, SQL/TLS, AMQP, gRPC).

**Review checklist** (<https://c4model.com/diagrams/checklist>). Run it on every diagram before publishing:

- General: title, diagram type, scope, legend.
- Elements: name, abstraction level, responsibility, technology. Acronyms, colors, shapes, icons, borders, and
  sizes are all explained.
- Relationships: every arrow has a label that matches its direction and states its technology. Arrowheads and
  line styles are explained.

## Kruchten's 4+1 view model

Philippe Kruchten, IEEE Software 12(6), 1995. <https://en.wikipedia.org/wiki/4%2B1_architectural_view_model>

The views are Logical, Process, Development, and Physical, plus Scenarios, which validate the other four. The
report covers all of them:

- Logical and Development: Components (§4).
- Process: Runtime Flows (§5).
- Physical: Deployment (§7).
- Scenarios: the traced flows.

## SEI Views and Beyond

<https://www.sei.cmu.edu/documents/2546/2018_010_001_513864.pdf>. Document the relevant views, then add what
applies across views: how the documentation is organized, what the architecture is, and **why** (rationale). The
SEI states that Views and Beyond complies with ISO/IEC 42010.

## ISO/IEC 25010:2023: the quality model

*Product quality model*. <https://www.iso.org/standard/78176.html>. Summaries:
<https://quality.arc42.org/standards/iso-25010>, <https://iso25000.com/en/iso-25000-standards/iso-25010>

The nine characteristics of the 2023 edition:

1. Functional Suitability
2. Performance Efficiency
3. Compatibility
4. **Interaction Capability** (was Usability)
5. Reliability (Faultlessness replaces Maturity)
6. Security (adds Resistance)
7. **Maintainability**: Modularity, Reusability, Analysability, Modifiability
8. **Flexibility** (was Portability): Testability, Adaptability, Scalability, Installability, Replaceability
9. **Safety** (new)

Static analysis speaks mostly to Maintainability and Flexibility, and partly to Security and Reliability. Mark
the others *Not assessed* in the scorecard unless the repository contains evidence.

## SEI ATAM: how to judge trade-offs

Architecture Tradeoff Analysis Method.
<https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/>

ATAM builds a quality-attribute **utility tree** from business drivers and scenarios. Its outputs are **risks,
non-risks, sensitivity points, tradeoff points**, and **risk themes**. A code scan cannot run ATAM, which needs
stakeholders in the room. Borrow its vocabulary: a gap is a *risk*, and a single point that many quality
attributes depend on is a *sensitivity point*.

## Well-Architected frameworks: what operational gaps look like

- **AWS, 6 pillars:** Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization,
  Sustainability. <https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html>
  - REL04-BP02 names these anti-patterns: "directly invoking APIs between workload tiers with no capability of
    failover or asynchronous processing", and tight coupling through "shared databases".
    <https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_prevent_interaction_failure_loosely_coupled_system.html>
- **Azure, 5 pillars:** Reliability, Security, Cost Optimization, Operational Excellence, Performance Efficiency.
  <https://learn.microsoft.com/en-us/azure/well-architected/pillars>
  - RE:03, failure mode analysis: map internal and external dependencies, classify them as strong or weak, and
    assess the blast radius.
    <https://learn.microsoft.com/en-us/azure/well-architected/reliability/failure-mode-analysis>
- **Google Cloud, 6 pillars:** Operational Excellence; Security, Privacy, and Compliance; Reliability; Cost
  Optimization; Performance Optimization; Sustainability. <https://docs.cloud.google.com/architecture/framework>

## The Twelve-Factor App

<https://12factor.net/>. The twelve factors:

1. Codebase
2. Dependencies
3. Config
4. Backing services
5. Build, release, run
6. Processes
7. Port binding
8. Concurrency
9. Disposability
10. Dev/prod parity
11. Logs
12. Admin processes

Heroku open-sourced the methodology on 2024-11-12 (<https://12factor.net/blog/open-source-announcement>). A
revision is under way at <https://github.com/twelve-factor/twelve-factor>. The factor names are unchanged.

The factors a code scan can check:

- III: config in the environment, and no secrets in the repo.
- IV: backing services as attached resources.
- V: a CI build.
- IX: fast startup and graceful shutdown; health endpoints.
- XI: logs as event streams.
