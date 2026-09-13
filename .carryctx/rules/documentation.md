# Documentation rules

1. This repository is the canonical source for its documented scope; shared
   cross-project governance (decisions, security, development, sources,
   findings, reviews, handoff, project, roadmap, releases) stays in
   `bitty-docs` and is linked, never copied.
2. English is the only canonical documentation language. Do not add CJK text,
   translation trees, locale directories, or multilingual routing until a
   reviewed cross-repository decision activates i18n.
3. Every `docs/**/*.md` file uses exactly the flat metadata schema defined in
   `docs/development/documentation-workflow.md`; `title` must match the H1.
4. Label statements as normative, accepted, proposed, experimental, implemented,
   or unverified. Never turn a design intention into a shipped-behavior claim.
5. Keep one authoritative definition and link to it from dependent documents.
   Update all affected contracts together when a shared term or boundary changes.
6. Preserve provenance: distinguish direct conversation decisions, local source
   evidence, external references, and inference.
7. Record unresolved choices and risks explicitly. A document may be complete
   while the feature remains unimplemented, but it must say so.
8. Formal Bitty repositories belong under <https://github.com/bitty-terminal>.
   Do not invent repository boundaries or ownership that has not been verified.
9. `bitty-website` consumes a pinned docs revision, publishes only eligible
   documents, and never owns a copied specification.
10. Documentation synchronization is part of definition of done. Acceptance
    requires scope, metadata, language, link, status, formatting, and relevant
    domain checks plus a CarryCtx checkpoint naming evidence and remaining gaps.
