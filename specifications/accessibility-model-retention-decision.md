---
title: Accessibility Model Retention and Platform Backend Decision
description: Records Core retention of the accessibility baseline and projection, the published and tested bitty-a11y snapshot seam, and the deferred platform backend binding with its owner and revisit conditions
category: specifications
audience: maintainer
document_type: register
status: accepted
website_publish: true
sidebar_order: 80
---

# Accessibility Model Retention and Platform Backend Decision

> Status: **accepted decision record**. It resolves the ownership and binding
> question in
> [bitty#2257](https://github.com/bitty-terminal/bitty/issues/2257) by
> recording retention: Core keeps the accessibility baseline and projection
> mechanism, the accepted `W-134` snapshot seam stays published and tested, and
> the platform backend binding is deferred to
> [bitty#1768](https://github.com/bitty-terminal/bitty/issues/1768). It
> authorizes no new code, changes no accepted ownership table, closes no open
> question, and weakens no normative security control. No screen reader sees a
> Bitty accessibility tree today.

## Purpose and scope

[bitty#2257](https://github.com/bitty-terminal/bitty/issues/2257) asked for one
owner for the accessibility model, one seam, and a real platform backend, or an
explicit recorded decision that Core retains the model and the extension is
retired. The implementation has since moved past the issue's original premise:
Core retired its parallel `crates/bitty-ui/src/a11y.rs` model and bound the
accepted `bitty-a11y` `SnapshotHost` seam in
[bitty#2342](https://github.com/bitty-terminal/bitty/pull/2342), then added the
default-off component host client in
[bitty#2547](https://github.com/bitty-terminal/bitty/pull/2547). What remains
unbound is platform exposure: no AT-SPI/D-Bus, Windows UI Automation, or macOS
AX backend ships, and no runtime `Adapter` construction/refresh call site
drives the projection.

This record therefore records the current form of the retention alternative:
Core retains the accessibility baseline and projection mechanism, the snapshot
seam and the extension's published contract stay in place and tested, and the
platform backend binding is explicitly deferred rather than adopted by
accident. It also names the owner and the conditions that reopen the decision.

In scope: Core model ownership, the status of the accepted `W-134` seam, the
platform-binding deferral, the accountable owner, and the revisit conditions.
Out of scope and owned elsewhere: platform backend design and screen-reader
conformance (bitty#1768); component packaging, installer, digest verification,
and process lifecycle; the draft
[Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) and
its open role, styling, coalescing-window, and numeric-ceiling questions; the
accepted [Accessibility Extraction Contract](accessibility-extraction-contract.md)
that remains authoritative for the boundary.

## Source identity

| Source                                                                                                                                                          | Role                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [bitty#2257](https://github.com/bitty-terminal/bitty/issues/2257)                                                                                               | The ownership and binding question this record answers                                                            |
| [Accessibility Extraction Contract](accessibility-extraction-contract.md) (`W-134`, accepted)                                                                   | The accepted Core-mechanism/adapter split and the fidelity, bounds, focus, and projection rules this record keeps |
| [bitty#2342](https://github.com/bitty-terminal/bitty/pull/2342) (`d2eabc34`)                                                                                    | The merged Core `SnapshotHost` binding that retired the parallel Core model                                       |
| [bitty#2547](https://github.com/bitty-terminal/bitty/pull/2547) (`e8fc4d10`)                                                                                    | The merged default-off, transport-neutral component host client                                                   |
| [bitty-a11y](https://github.com/bitty-terminal/bitty-a11y) README and `repo.toml`                                                                               | The extension's published snapshot model, `HeadlessBackend`, component protocol, and current status               |
| [bitty-a11y#2](https://github.com/bitty-terminal/bitty-a11y/issues/2)                                                                                           | Closed and rewritten to its implemented state; no longer claims "metadata-only; implementation pending"           |
| [bitty#1768](https://github.com/bitty-terminal/bitty/issues/1768)                                                                                               | The live follow-up for a real platform accessibility backend and runtime exposure                                 |
| [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md) | The accepted Boundary 3 ownership split this record preserves                                                     |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                                                                                | The accepted retained-Core-mechanism rule the disposition follows                                                 |

Implementation evidence is read-only from `bitty` `15006647` (2026-10-24) and
the extension pins named by that revision:

- `crates/bitty-ui/src/a11y_host.rs` implements `bitty_a11y::SnapshotHost` over
  the live terminal projection and adds the default-off
  `ComponentSnapshotHost`. It retains no snapshot, handle map, element handle,
  or focus owner beyond one ingest.
- `crates/bitty-ui/src/uitree.rs` consumes the extension `Role` vocabulary
  through the `a11y_host` re-export; the parallel Core role table and the
  1,238-line `a11y.rs` model are gone.
- `crates/bitty-ui/Cargo.toml` pins `bitty-a11y` at `8e02ab5` and the component
  protocol alias at `99486ee`; both edges are deliberate and reviewed.
- The `W-147` small-core graph fence records `bitty-a11y` as a snapshot-model
  and component-protocol seam consumed only by `bitty-ui`; its
  `SOURCE_SEAM_FILES` table permits the crate identifiers only in
  `crates/bitty-ui/src/a11y_host.rs`, and
  `a11y_source_naming_is_restricted_to_host_seam` proves another Core source is
  rejected.
- No `accesskit`, AT-SPI/D-Bus, Windows UIA, or macOS AX dependency or source
  exists in Core, and the extension ships only `HeadlessBackend`. There is no
  runtime `Adapter` construction or refresh call site in the application.
- `bitty-a11y#2` is closed and its body records the implemented component and
  host-client state instead of a pending implementation.

## Disposition

### Decision

**Core retains the accessibility model and the platform backend binding is
deferred.**

The disposition has three parts:

1. **Core retains the accessibility baseline and projection mechanism.** The
   baseline remains a normative obligation. Core owns projection derivation
   from Terminal Truth, the accepted scene model, and chrome; the fidelity
   boundary (readable text runs and cursor position only); focus association
   and focus-order rules; bounded announcements; reduced-motion and
   high-contrast settings; privacy; bounds and fail-closed behavior; and the
   capability gate.
2. **The accepted `W-134` snapshot seam stays published and tested.** The
   extension keeps `SnapshotBuilder`, `Adapter::ingest_host`,
   `Adapter::expose_to`, the bounded snapshot vocabulary, the component
   protocol, and its fence, headless, host-conformance, and component suites.
   Core keeps implementing `SnapshotHost` in `a11y_host.rs`. The seam is not
   retired, removed, or made private.
3. **Platform exposure is deferred.** No platform accessibility backend and no
   runtime adapter call site are bound in this cycle. The linked model and the
   component client remain contract seams: available, tested, default-off, and
   not a user-visible accessibility path. Only `HeadlessBackend` exists, so no
   assistive technology, including a screen reader, receives a Bitty tree.

The issue's alternative of **retiring the extension entirely is not the
disposed path**. The extension is already bound at the model seam, published,
and tested; retiring it now would remove a tested contract without replacing
it and would contradict the merged binding and component-client work. The
deferred half is platform exposure, not the model seam.

### What Core retains

- The accessibility baseline as a normative obligation, including safe-mode and
  zero-adapter behavior.
- Projection derivation, the stated terminal fidelity boundary, and the single
  primitive-to-role mapping.
- Focus association correctness, the chrome tab-order exclusion, and modal
  focus confinement.
- Bounded announcements, their coalescing and drop behavior, and the
  no-hot-path and no-periodic-timer rules.
- Core-owned reduced-motion and high-contrast composition; neither is
  plugin-overridable.
- Privacy: the projection stays host-side and is never an Event Bus topic.
- Bounds, fail-closed behavior, and the accessibility capability gate.

### What the extension retains

- The bounded snapshot vocabulary, bounds constants, `SnapshotBuilder`,
  `Adapter`, and the stable-identity rules.
- The published `SnapshotHost` contract and its conformance tests.
- The stdio component protocol, its descriptor, and the `HeadlessBackend`.
- The extension-side fence, round-trip, host-conformance, and component suites.
- The right to change its own contract only through its own reviewed decision;
  Core's fence pins the revision it consumes.

### What is deferred

- AT-SPI/D-Bus, Windows UI Automation, and macOS AX backend selection and
  implementation.
- Runtime construction, invalidation, refresh, and teardown of the `Adapter`
  from the running application.
- Platform permission and consent handling, and the platform event stream.
- Controlled action dispatch back into the command registry, including
  activation and stale-generation revalidation on the platform path.
- Component installer, digest verification, distribution, process-group
  lifecycle, and crash containment in the composition root.
- Headed evidence that a screen reader reads terminal text and chrome nodes.

### Ownership

The accountable owner is **Core UI/accessibility under the `bitty-core`
commander** (`area:ui` and `area:architecture`). Core UI/accessibility owns the
projection, the baseline, the platform backend decision, and the follow-up
tracker. The `bitty-a11y` maintainers own the published snapshot model and
component protocol and are consulted on any seam change. The follow-up for the
deferred work is [bitty#1768](https://github.com/bitty-terminal/bitty/issues/1768);
closing this record does not close that issue.

### Why this disposition

1. **The `W-147` small-core fence stays meaningful.** `bitty-a11y` is a
   model/protocol edge consumed by one `bitty-ui` file, not a platform
   authority. A real backend adds OS-specific dependencies, a refresh path,
   permission state, and lifecycle code. Widening the fence for those without a
   designed backend would turn a narrow, reviewed exception into an open
   platform dependency. The current fence comment already records the
   snapshot-model exception as deliberate, and the negative source test pins
   it; this decision requires no fence edit. A future platform binding must add
   its own reviewed fence entry instead of widening the existing one.
2. **No platform backend exists on either side.** The extension ships only
   `HeadlessBackend`; Core has no `accesskit`, AT-SPI, UIA, or AX binding. A
   binding now would materialize a tree that no assistive technology consumes,
   and the issue's own headed AT-SPI evidence could not be produced.
3. **The accessibility criteria are still candidate.** `W-134` accepted the
   boundary. The baseline remains draft, the numeric ceilings are recorded as
   implemented-only evidence, and the role-convention mapping and announcement
   coalescing window remain open. Binding a platform mapping before those
   criteria are accepted would freeze a shape without an acceptance target.
4. **The cost of binding without a backend exceeds the benefit.** The cost is
   new OS and AT dependencies, cross-platform CI, permission and consent
   handling, crash and lifecycle behavior, a security review of exposure and
   action dispatch, and a permanent maintenance surface. The benefit is zero
   user-visible accessibility until a backend exists. Deferral keeps the tested
   seam and avoids platform lock-in; the component protocol and host client
   already de-risk later adoption.
5. **The honest status is no screen-reader support.** Binding the model, or
   merging a component client, is not evidence that Orca, Narrator, or
   VoiceOver can read a Bitty surface. This record makes no such claim.

### Conditions that reopen the decision

Any one of the following triggers a new review; none binds the backend
automatically:

1. **A real platform backend is selected.** A backend implementation is
   proposed for AT-SPI/D-Bus, Windows UIA, macOS AX, or AccessKit, with a headed
   tree read showing terminal text, cursor state, and chrome nodes.
2. **Accessibility acceptance criteria are accepted.** The baseline or an
   equivalent accessibility contract is promoted with role mapping, fidelity
   boundary, focus order, announcement behavior, and numeric ceilings fixed.
3. **The runtime exposure path exists.** The composition root constructs,
   invalidates, refreshes, and tears down the `Adapter`, with safe-mode denial,
   capability gating, crash containment, and no UI-thread blocking.
4. **The extension is adopted.** The component enters a distribution or
   default-enable decision, or the linked model becomes a required build
   feature rather than an optional seam.
5. **A user-facing accessibility commitment is made.** A release milestone
   promises screen-reader support or platform conformance.
6. **Security review requires it.** A review of platform exposure, consent, or
   action dispatch identifies a control that cannot wait for backend work.

## Alternatives considered

| Alternative                                                         | Trade-off                                                                                                                                                     | Disposition                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Core retains the model; platform backend deferred (this record)     | Keeps one tested seam, no new OS dependency, no unsupported screen-reader claim; leaves platform exposure absent                                              | Adopted                                                                                        |
| Retire `bitty-a11y` and restore a parallel Core model               | Would avoid an external edge, but reintroduces two models, reverses merged #2342/#2547, deletes tested contract coverage, and still delivers no screen reader | Rejected; the extension is bound and published, and retirement removes no user-visible cost    |
| Bind AccessKit or a native backend now                              | Could reach a real AT sooner, but adds platform dependencies, permission and lifecycle code, and a security review before any accepted accessibility criteria | Rejected for this cycle; it is the subject of bitty#1768                                       |
| Mark the extension "not adopted" and stop at the published contract | Simpler status, but misstates the merged `SnapshotHost` binding and discards a tested seam without a replacement                                              | Rejected; the record distinguishes the bound model seam from the deferred platform binding     |
| Defer the model seam as well                                        | Waits for the backend before any contract work, but reopens settled code and loses the fail-closed bounds and tests that already protect the projection       | Rejected; the model seam is already bound, reviewed, and fenced                                |
| Make the component client the default exposure path                 | Exercises the installable shape, but ships a default-off capability as if it were an accepted platform path and still has no backend                          | Rejected; the component stays default-off and fail-closed until the revisit conditions are met |

## Security review

This record changes no capability, trust boundary, resource ceiling, or P0
control. It adds no platform exposure and no plugin read surface. The existing
projection remains derived and read-only, is never persisted, is never consulted
for routing or dispatch, and is never published on the Event Bus. Safe mode and
the zero-adapter baseline continue to work because no adapter is constructed.

The deferral is the conservative security posture: a platform backend would
introduce OS accessibility permissions, a cross-process or in-process exposure
path, platform event handling, and action dispatch back into Core. Those
surfaces require an independent security review before any exposure claim, and
that review belongs to the follow-up, not to this record. No P0 criterion is
weakened here.

## Verification backlog

The existing evidence remains the acceptance baseline for the bound model seam:

1. `crates/bitty-ui/tests/a11y_baseline.rs` pins the Core `SnapshotHost`
   projection, byte-exact text round-trip, focus association, bounds,
   stale-generation rejection, and no-backend fallback.
2. The `W-147` graph test pins the single-consumer and single-source-file fence,
   including the negative test that rejects `bitty_a11y` outside
   `a11y_host.rs`.
3. The extension's fence, headless round-trip, host-conformance, and component
   suites pin the published `SnapshotHost` contract and the stdio protocol.
4. This decision's own gate is the repository `just check`; it adds no code and
   no runtime behavior.

The missing evidence is deliberate and belongs to
[bitty#1768](https://github.com/bitty-terminal/bitty/issues/1768): a headed
AT-SPI/UIA/AX tree read, platform permission denial, component crash and
lifecycle containment, stale-generation behavior on the platform path, and
revalidated action dispatch.

## Open points

- Which backend enters first (AccessKit/AT-SPI on Linux, or native
  per-platform APIs) and whether one backend or three land together.
- Whether the linked model or the installable component becomes the default
  exposure path, and what installer, digest, and process-group lifecycle it
  needs.
- The accepted numeric ceilings, role-convention mapping, and announcement
  coalescing window currently recorded as implemented-only or parked in
  `W-134`.
- The action taxonomy beyond node activation and any live event stream; both
  remain post-1.0 unless a reviewed extension says otherwise.
- Whether a screen-reader traversal mode inside a terminal leaf enters scope,
  and at which milestone.

## P0 Review Sign-off

Not required for this record: it changes no security boundary, capability,
resource ceiling, trust decision, or accepted P0 control, and it adds no
platform exposure. Independent security review becomes required before any
platform backend, permission gate, event stream, or action-dispatch path is
bound.

## References

- [bitty#2257](https://github.com/bitty-terminal/bitty/issues/2257) - the
  ownership and binding question this record answers.
- [bitty#1768](https://github.com/bitty-terminal/bitty/issues/1768) - the live
  follow-up for a real platform accessibility backend and runtime exposure.
- [Accessibility Extraction Contract](accessibility-extraction-contract.md) -
  the accepted `W-134` boundary, retained mechanism, bounds, and failure cases.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) -
  the draft baseline whose acceptance is a revisit condition.
- [bitty#2342](https://github.com/bitty-terminal/bitty/pull/2342) and
  [bitty#2547](https://github.com/bitty-terminal/bitty/pull/2547) - the merged
  model-seam and component-host bindings.
- [bitty-a11y](https://github.com/bitty-terminal/bitty-a11y) - the extension's
  published snapshot model, component protocol, and current status.
- [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  - the accepted execution, graphics, accessibility, storage, and
    platform-service boundary.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) - the
  retained-Core-mechanism rule and accepted ownership tables.
- [Documentation workflow](../docs/development/documentation-workflow.md) -
  metadata, status, self-containment, and review rules.
