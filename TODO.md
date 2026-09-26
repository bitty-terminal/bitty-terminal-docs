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
- [x] Make the terminal corpus research-free (CTX-0039): add the normative
      `docs/development/documentation-workflow.md` self-containment rule,
      convert the record-named distillation pages into the topical
      [Terminal Platform Boundaries (Candidate)](specifications/terminal-platform-boundaries-candidate.md)
      and
      [Event-Sourced Panel Model (Candidate)](specifications/event-sourced-panel-model-candidate.md)
      documents, and strip research citations from the remaining canonical
      pages.
- [x] Record the Phodopus successor-runtime direction and the `bitty-lua`
      Host ABI deferral (CTX-0044): add the
      [Phodopus Host ABI (Candidate)](specifications/phodopus-host-abi-candidate.md)
      page for the runtime boundary, async pending-handle trampoline, and
      `utf8` versus typography split; add a candidate refinement pointer in
      [Core and Plugin Boundaries](architecture/core-boundaries.md); keep the
      accepted mlua/Lua 5.4 contract unchanged and `bitty-lua` implementation
      deferred.
- [x] Record the vertical-slice review-gate evidence (CTX-0047): add the
      [Vertical Slice Review Gates (A1-A9)](product/vertical-slice-review-gates.md)
      register marking each acceptance criterion and review gate `Evidenced` or
      `Open`; link it from the acceptance plan; keep the plan `Draft` with
      architecture, security, performance, and docs-curator gates `Open`.

## Blocked / open

- Website consumption of `website_publish: true` documents remains a later
  phase.
- Independent architecture, security, performance, and docs-curator review of
  the single-window vertical slice (`bitty-terminal/bitty#1155`, M1-29) remains
  open; the slice stays unauthorized as an accepted design constraint until
  those gates are recorded.

## 2026-09-26 update

### Completed

- [x] IME contract specification (#126 -> PR #127, merged)

### Pending (P1)

- [ ] #123: Specify peer/session/rate/network restriction contracts
  - Define debug scope implication
  - Accepted peer proof
  - Per-connection principal/session/consent
  - Endpoint rate ownership
  - Windows commitment
  - Network redirect/transfer/deadline/proxy restrictions
  - Typed failure
  - Requires: Security review

- [ ] #122: Freeze DevTools/IPC/network security contracts
  - Parent issue for #123
  - Consolidate all security contract decisions
  - Requires: Independent review

### Dependencies

- Bitty implementation depends on these contract specifications
- bitty-devtools refactoring requires these contracts
- bitty-network implementation requires these restriction definitions

---

Updated: 2026-09-26
