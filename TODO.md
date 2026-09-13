# TODO

Repository work register for `bitty-terminal-docs`. This file stays under 300
lines (enforced by `just agents`); completed items move to git history rather
than accumulating here.

## Current

- [x] Bootstrap repository scaffold (CTX-0187 Phase 1): docs-quality toolchain,
      docs-quality workflow, CarryCtx baseline, documentation skeleton, labels, and
      repository metadata.
- [x] Terminal-platform content migration (CTX-0001): import bitty-docs
      `docs/projects/bitty/` at `c664214` with history preserved; split AI-core
      and plugin-ecosystem documents to the sibling repositories; retarget
      cross-repository links to absolute URLs.
- [ ] Later phase: wire this repository into `bitty` as the `docs/` submodule
      and complete cross-repository link and CI notes.

## Blocked / open

- Website consumption of `website_publish: true` documents remains a later
  phase.
