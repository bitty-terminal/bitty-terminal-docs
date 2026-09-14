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
- [x] Recover bitty PR #663 documents with no docs-repository destination
      (CTX-0002): import the 20 evidence/operations documents into `product/`,
      `development/`, `security/audits/`, and `specifications/`; migrate the
      crate publish ladder to `development/release-mechanics.md`; wire the new
      trees into the docs map and metadata gates.
- [x] Wire this repository into `bitty` as the `docs/` submodule (CTX-0007):
      `bitty/.gitmodules` carries `[submodule "docs"] path = docs`; the
      implementation pin trails `main` by design. Remaining cross-repository
      link and CI notes continue as ordinary documentation sync.

## Blocked / open

- Website consumption of `website_publish: true` documents remains a later
  phase.
