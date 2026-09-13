# TODO

Repository work register for `bitty-terminal-docs`. This file stays under 300
lines (enforced by `just agents`); completed items move to git history rather
than accumulating here.

## Current

- [x] Bootstrap repository scaffold (CTX-0187 Phase 1): docs-quality toolchain,
      docs-quality workflow, CarryCtx baseline, documentation skeleton, labels, and
      repository metadata.
- [ ] Phase 2 (separately tracked): migrate the terminal-platform documents from
      bitty-docs `docs/projects/bitty/` with history preserved, rewriting links and
      preserving each document's status and `website_publish` flag.
- [ ] Later phase: wire this repository into `bitty` as the `docs/` submodule
      and complete cross-repository link and CI notes.

## Blocked / open

- Content migration is not part of Phase 1. Until migration lands, the tree
  intentionally contains only the documentation map and development workflow.
