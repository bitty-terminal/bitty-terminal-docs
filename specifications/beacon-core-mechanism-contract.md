---
title: Beacon Core Mechanism Contract
description: Terminal-side contract for the Beacon mechanism and policy split the accepted TargetEngine and AnnotationEngine names generation and handle validity provider registration and composition label allocation annotation layer transient input capture command-dispatch bridge budgets scene ownership and cross-plugin metadata rules
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 36
---

# Beacon Core Mechanism Contract

> Status: **draft** terminal-side contract. The Beacon mechanism/policy split,
> the Core mechanism names `TargetEngine` and `AnnotationEngine`, and the
> terminal-side extraction scope are accepted by bitty-docs
> [ADR 0018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md)
> (owner decision, 2026-10-03). Beyond the ADR-accepted split, mechanism names,
> extraction scope, and retained fences, everything else this page records about
> the mechanism is **candidate direction** for the `W-29` Beacon host API and the
> `W-30` policy retirement, not an accepted contract. This page accepts no
> implementation, claims no Rust type named `TargetEngine` or
> `AnnotationEngine` exists, describes no shipped behavior, and weakens no
> normative security control.

## Document status

This is the terminal-side contract that Core and plugin tasks cite for the
Beacon split decided by
[ADR 0018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md).
It states what Core retains, what the optional `beacon` plugin owns, and the
mechanism fences a downstream implementation must preserve. It does not start,
schedule, or authorize implementation; the host API (`W-29`), the policy
retirement (`W-30`), and the plugin page set (`W-12`) remain their own tasks.

It composes with the accepted split in
[ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
(Boundary 3) and the execution map in the
[small-core refactor handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).
The mechanism/policy table below is marked row by row: rows marked
**Accepted** restate the owner decision, and rows marked **Candidate** are
direction for the downstream tasks, not contract.

## Purpose and scope

The candidate `B-8` split in the plugin-side
[Beacon Targeting Framework](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/beacon-targeting-framework-candidate.md)
proposed that Core retain the target and annotation _mechanism_ while the
`beacon` plugin carries _policy_. ADR 0018 accepted that split, accepted the
Core mechanism names, and resolved the `OQ-089` extraction scope. This page
turns that decision into the explicit terminal-side contract so that a Core
task and a plugin task can cite one definition of the boundary.

In scope:

- the Core mechanism versus plugin policy split for the 0.1.0 scope;
- the accepted mechanism names `TargetEngine` and `AnnotationEngine`, with
  generation and handle validity, provider registration and composition, label
  allocation, the annotation layer, transient input capture, the
  command-dispatch bridge, budgets, scene ownership, and cross-plugin metadata
  visibility rules;
- the security and lifecycle failure cases the mechanism must fail closed on;
- an honest statement of current implementation status and its limits.

Out of scope and owned elsewhere:

- the `W-29` Beacon host API names, capability dimensions, and version
  (related to `OQ-056`);
- the `W-30` concrete removal of candidate Beacon policy from Core;
- the plugin package, page set, and onboarding
  ([bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs));
- the remaining candidate `B-8` open points: the six primitives and the
  `Action x Target` model, the `TargetRef` wire shape, the provider
  registration surface and its API version, the semantic UI property contract,
  scope defaults, label overflow and handedness, and session invalidation
  behavior (`OQ-088`);
- the terminal-side UI runtime and scene contracts that own annotation
  z-order, animation, and hit testing.

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- The [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and [P0 security acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md),
  authoritative for Terminal Truth, plugin capability checking, hot-path
  exclusion, and the no-third-party-plugin safe startup path.
- [ADR 0018 - Beacon Mechanism/Policy Split and Core Targeting-Mechanism
  Naming](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md):
  the accepted split, the accepted mechanism names, the `OQ-089` extraction
  scope, and the retained fences (target safety, stale-handle and generation
  fail-closed behavior, no Event-Bus exposure, no private first-party bypass).
- [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md):
  Boundary 3 and the bootstrap fence, including the prohibition on a private
  first-party bypass, no raw PTY, GPU, or window handle, and no input hot-path
  callback.
- [ADR 0013 - Core Ontology and Identity Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md)
  and [ADR 0014 - Workspace as Core Mechanism with Plugin-Only
  Presentation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md):
  the identity and generation relations and the mechanism-versus-policy
  separation this contract applies.
- The accepted
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md),
  and [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md):
  the manifest, capability, grant, command-registry, and host-surface rules the
  optional plugin obeys with no special privilege.
- The accepted [Panel Runtime RFC](panel-runtime-rfc.md): the
  [command registry](panel-runtime-rfc.md#command-registry), the
  [overlay envelope](panel-runtime-rfc.md#overlay-41), focus routing, and
  capability isolation.
- The accepted [Workspace Compositor Specification](workspace-compositor.md):
  the identity hierarchy (`PanelId != ViewId != TerminalId`), decoration and
  interaction atomicity, and the no-window-leak rule.
- The accepted [Performance Budget RFC](performance-budget-rfc.md): hot-path
  exclusion and frame-budget rules that forbid a provider callback or an
  annotation pass on the input, parse, layout, or render hot paths.
- The draft [Input and Pointer Contract](input-pointer-rfc.md): the Leader and
  chord namespace, capture behavior, and fail-open rules any capture consumes.
- The draft [Semantic Terminal RFC](semantic-terminal-rfc.md) and draft
  [Workspace-Native UI Runtime](ui-runtime-candidate.md): the terminal-side
  candidate text this contract supersedes for the mechanism boundary while
  their implemented-only slices remain evidence only.

## Terminology

| Term                       | Meaning in this document                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanism                  | A Core-owned, always-available primitive that works with zero plugins and in `bitty --safe`.                                                             |
| Policy                     | Optional behavior or presentation the optional `beacon` plugin supplies using only the public, capability-gated API.                                     |
| `TargetEngine`             | Accepted Core mechanism name for the target registry, semantic target snapshots, provider registration and composition, and the command-dispatch bridge. |
| `AnnotationEngine`         | Accepted Core mechanism name for the annotation layer plus the `LabelAllocator`.                                                                         |
| Handle                     | A lightweight semantic reference carrying an identity plus a generation; never a raw UI node, compositor handle, or memory pointer.                      |
| Snapshot                   | The ephemeral, cold-path target set collected when a session enters; nothing is retained across sessions.                                                |
| Provider                   | A source that offers targets to the engine at collection time only, in the Core, Plugin, or Derived tier.                                                |
| Target safety              | The Core rules that keep a registered target from becoming an unmediated action, including `StaleTarget` validation and generation fencing.              |
| Transient input capture    | The capability-gated Core host mechanism that takes exclusive keyboard and overlay focus for a UI interaction, transiently and revocably.                |
| Command-dispatch bridge    | The Core path that routes a selected target's typed command into the accepted command registry under the target owner's authority.                       |
| Private first-party bypass | Any non-public path, raw handle, or hot-path callback a first-party plugin could use but a third-party plugin could not; forbidden.                      |
| Safe mode                  | `bitty --safe`, which starts with zero third-party plugins and no optional policy; the mechanism is unaffected.                                          |

## The mechanism and policy split

The table states the accepted split and the ownership of each side. The
**Status** column is authoritative for whether a row is accepted contract or
candidate direction.

| Side                                                             | Owns                                                                                                                   | Status                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Core mechanism `TargetEngine`                                    | Target registry, semantic target snapshots, provider registration and composition, command-dispatch bridge.            | Accepted name (ADR 0018)      |
| Core mechanism `AnnotationEngine`                                | Annotation layer and the `LabelAllocator`.                                                                             | Accepted name (ADR 0018)      |
| Existing Core host mechanisms (not Beacon-named)                 | Transient input capture and the command-dispatch bridge, reached through the public host API.                          | Accepted (ADR 0018)           |
| Optional `beacon` Lua plugin (official, `bitty-terminal/beacon`) | Key-language bindings, which-key integration, scopes, filters, theme badges, provider composition, target-first menus. | Candidate (plugin-side)       |
| Forbidden                                                        | Private first-party bypass, raw PTY, GPU, or window handle, input hot-path callback.                                   | Accepted (ADR 0015, ADR 0018) |

### Consequences of the split

- The Core mechanism stays in Core for the 0.1.0 scope. Any separate Rust
  component extraction is deferred behind `W-29`/`W-30` and requires a future
  decision; this contract creates no repository and fixes no crate boundary.
- The optional plugin is an ordinary capability-gated package. It has no
  private privilege, and its absence removes policy only. The mechanism works
  with zero plugins, and `bitty --safe` is unaffected without the plugin.
- There is no second execution path: a selected target becomes a typed command
  in the accepted registry, never a direct call into the compositor or
  terminal.

## Core mechanism names and implementation status

The Core mechanism names are **accepted**:

- `TargetEngine` owns the target registry, semantic target snapshots, provider
  registration and composition, and the command-dispatch bridge.
- `AnnotationEngine` owns the annotation layer and the `LabelAllocator`.

These names are decided direction, not existing Rust types. The `bitty`
workspace contains no type named `TargetEngine` or `AnnotationEngine`. The
`LabelAllocator` name does exist in code as
`bitty-ui::beacon_label::LabelAllocator`, and the following artifacts exist as
**Implemented-only** evidence for parts of the mechanism (present in
`crates/bitty-ui/src/beacon_*.rs` and exported from `crates/bitty-ui/src/lib.rs`):

| Code artifact                                                                                             | Maps to the accepted mechanism                                   | Status           |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------- |
| `TargetRegistry`, `TargetRef` with `PanelRef`/`WorkspaceRef`/`CommandBlockRef`/`UiNodeRef`/`LinkRef`      | `TargetEngine` target registry and handles                       | Implemented-only |
| `TargetError::UnknownTarget`, `TargetError::StaleTarget`, `TargetError::TooManyTargets`                   | `TargetEngine` fail-closed target safety                         | Implemented-only |
| `TargetProvider`, `ProviderMediator`, `ProviderTier`, `TargetSnapshot`, `SnapshotEntry`, `ProviderTarget` | `TargetEngine` provider registration and composition             | Implemented-only |
| `BeaconDispatcher`, `DispatchError`                                                                       | Command-dispatch bridge (returns a typed command, executes none) | Implemented-only |
| `LabelAllocator`, `LabelPolicy`, `LabelError`                                                             | `AnnotationEngine` label allocation                              | Implemented-only |
| `BeaconAnnotationLayer`, `BeaconAnnotation`, `AnnotationLayerError`                                       | `AnnotationEngine` annotation layer                              | Implemented-only |

No accepted host API reaches these artifacts yet, and this contract does not
claim one. `W-29` owns the public host surface, `W-30` owns the retirement of
candidate policy from Core, and the semantic-property and wire shapes remain
candidate. The artifacts are evidence that a mechanism shape exists, not that
the contract is implemented or verified.

## Generation handles and validity

The mechanism represents targets as semantic handles, never as raw UI nodes,
compositor objects, or memory addresses.

- **Handle kinds.** The addressable surfaces are panels, workspaces, command
  blocks, UI nodes, and links. The compositor-internal `ViewId` is excluded
  from user-facing targets; the `PanelId != ViewId != TerminalId` separation
  stays accepted and unchanged.
- **Identity plus generation.** Each handle carries an identity and the
  generation captured at enumeration.
- **Monotonic issuance.** Every registration, fresh or re-register, takes the
  next generation from a monotonic issuer, so a generation is not reused within
  a registry lifetime and a stale handle cannot false-accept after its identity
  is re-registered.
- **Retirement is fail-closed.** Retiring an identity removes it and records a
  bounded tombstone, so outstanding handles resolve as `StaleTarget` rather
  than falling through to `UnknownTarget`; beyond the tombstone bound, new
  retirements fall back to `UnknownTarget`, which is still fail-closed.
- **Resolution requires an exact generation match.** If the underlying entity
  disappeared, was replaced, or re-rendered under a new generation between
  collection and dispatch, validation fails with `StaleTarget` and the session
  cancels or recollects cleanly. A stale handle never dispatches against a
  recycled identity.
- **Ephemeral and non-transferable.** Handles are collected as ephemeral
  snapshots on session entry, are not retained across sessions, and are not
  transferable between sessions or plugin generations.
- **Opaque to Lua.** A handle exposes nothing that lets a plugin reach another
  plugin's VM, configuration, or internal state.

The exact wire shape of the handles, derived-provider handle composition, and
how a moved panel keeps its handle valid across a workspace change remain Open
in the provider and identity contracts.

## Provider registration and composition

The mechanism collects targets through providers in three tiers: Core
(host-owned), Plugin (third-party, capability-gated), and Derived
(snapshot-composed). Collection priority is Core, then Plugin, then Derived,
with registration order inside a tier.

- **Registration is capability-gated.** Provider registration requires the
  dedicated target-provider capability; Core trust is not self-claimable, and
  the compiled-in Core provider enters through an internal grant path. The
  capability identifier, its dimensions, and its API version remain Open
  (`OQ-056`).
- **Registration grants no authority.** Registering a target or a provider adds
  addressability only. A target's declared actions are metadata, and a command
  still executes under its own owner's grants.
- **Names are validated.** Provider names follow a bounded grammar, a reserved
  Core name is Core-only, duplicate names are rejected rather than shadowed,
  and the provider count is bounded.
- **Collection is cold-path and staged.** Providers collect on session entry
  only. The engine stages every offer first so an oversized collection fails
  before any registry insert, producing no partial snapshot; it then inserts in
  tier priority and freezes the issued handles and their provenance into the
  snapshot. Replays bump generations, so handles from an earlier snapshot go
  stale by construction.
- **Provider faults are isolated.** A provider that fails during collection has
  its targets absent while the session continues with the remaining providers.
  This isolation is a candidate requirement for `W-29`; the current evidence
  covers only size and name validation, not panic or timeout isolation.
- **No hot-path collection.** No provider runs a per-frame or per-event poll
  loop, and no provider callback runs inside the parser, layout, render, or
  input hot paths.

## Label allocation

Label allocation is a Core mechanism with Lua-configurable policy:

- **Deterministic mapping.** For a fixed scoped target set, the mapping from
  targets to labels is stable, so muscle memory survives session repetition.
- **Home-row priority.** Single-character labels come from the home-row pool
  before any two-character label appears. Two-character codes are an overflow
  grammar, not the default.
- **Spatial handedness.** Targets left of the surface center take the left
  pool and targets right of center take the right pool, so the keystroke
  correlates with the object's position instead of allocation order. Within a
  side, targets are served in a stable spatial order.
- **Strategy split.** The allocation algorithm lives in Core. The label
  character set and the strategy selection are policy the plugin or user
  configuration supplies through Lua. The configuration key surface, overflow
  threshold, handedness pools, two-character grammar, and RTL or non-Latin
  pools remain Open.
- **Fail-closed capacity.** Allocation rejects a request that exceeds the
  target bound or the policy's generable label space, rather than truncating
  silently. Character sets are validated at construction, and an invalid
  charset is rejected before any session runs.

## Annotation layer

`AnnotationEngine` renders every label for a session through one batched layer:

- **One layer, not one overlay per target.** The layer is the batch; a session
  of N targets is one layer, never N panels, OS overlays, or native windows.
- **Bounded and length-checked.** The layer enforces a maximum annotation count
  and fails closed on a target, label, and anchor length mismatch.
- **Deterministic.** Input order is preserved, so the batch is reproducible for
  a fixed input.
- **Presentation-only.** The layer mutates no grid, cursor, mode, scrollback,
  or layout, and changes no content geometry.
- **Transient.** It exists only while the session is active and is removed
  atomically on dispatch, cancel, or timeout.
- **No plugin drawing.** Plugins contribute target metadata; Core renders the
  annotation. No plugin draws into the layer directly.

Scene-layer ownership, z-order relative to the selection and IME layers, and
animation policy remain Open with the terminal-side scene contract.

## Transient input capture

Transient input capture is an existing Core host mechanism, not a Beacon-named
component. A Beacon session reaches it through the public host API.

- **Capability-gated and transient.** Capture is granted for one bounded
  interaction and released on dispatch, cancel, or timeout.
- **Revocable and fail-open.** Keys that are not labels or valid prefixes fall
  back to normal input behavior; `Esc` and the idle timeout cancel the session
  instead of holding input hostage. The session fails open rather than trapping
  keystrokes.
- **No plugin callback on the hot path.** Capture never places a plugin
  callback on the input hot path; the session is a command namespace consumed
  by the keymap router, not a parallel input path.
- **Core-owned.** The mechanism is unaffected by the absence of the plugin, and
  the plugin cannot reimplement capture or obtain a raw keyboard, PTY, GPU, or
  window handle.

The exact host names, capture bounds, and the interaction with pointer capture
remain Open in the input and host contracts (`OQ-052`, `W-01`).

## Command-dispatch bridge

The command-dispatch bridge is Core-owned and reached only through the public
host API:

- **Typed command, not a callback.** Selecting a target resolves to a typed
  command id; the engine binds labels to typed command ids and returns the id
  to the workspace router. The engine executes nothing.
- **Registry authority.** The command executes through the accepted
  [command registry](panel-runtime-rfc.md#command-registry) under the target
  owner's capability grants; it validates its own arguments and enforces its own
  resource budgets. Beacon forwards no authority.
- **Revalidate before dispatch.** The bridge revalidates the bound target
  against the live registry before returning a command, so a target invalidated
  after labeling fails closed and cannot become an action.
- **Fail-closed labels.** An unknown or expired label fails closed; it never
  falls back to a default target or a silent dispatch.
- **No private bypass.** The bridge is the same public path a third-party
  plugin uses. There is no private first-party channel and no direct hook into
  the compositor or terminal.

## Budgets

The following bounds are observed in the `bitty-ui` beacon artifacts today.
They are **Implemented-only** values, not accepted ceilings; `W-29` owns the
accepted budget contract, and this page does not freeze them.

| Bound                   | Observed value | Applies to                      |
| ----------------------- | -------------- | ------------------------------- |
| Targets per kind        | 1024           | Registry kind table             |
| Targets per snapshot    | 1024           | One cold-path collection        |
| Providers per mediator  | 64             | Registered providers            |
| Provider name length    | 32             | Provider name grammar           |
| Annotations per session | 1024           | Single batched annotation layer |
| Labels per allocation   | 1024           | Label allocator input           |
| Label charset length    | 64             | Home and overflow pools         |
| Bindings per dispatcher | 1024           | Label-to-command bindings       |

The mechanism must fail closed at a bound: an oversized collection fails before
any insert, an over-capacity allocation is rejected, and an over-count layer is
rejected. Silent truncation is non-conforming.

## Scene ownership

The annotation layer is presented inside the workspace scene as one ephemeral
layer composed alongside the selection and IME underline layers.

- The scene composes one batch for the whole session; the engine owns the batch
  data (target, label, viewport-local anchor) and the renderer owns
  rasterization.
- The layer is presentation-only and never changes content geometry, and it
  does not multiply the bounded overlay envelope: it is one layer, not a
  per-label overlay.
- A new annotation feature extends this one layer rather than adding a second
  annotation system.

## Cross-plugin metadata rules

- **Public metadata only.** The mechanism observes only the public target
  metadata a provider supplies. It never inspects private plugin state such as
  prompts, secrets, credentials, memory, or internal tables.
- **Provenance is engine-internal.** A snapshot may record which provider and
  tier contributed a target so the engine can compose and resolve tiers. That
  provenance is emitted by the engine, not as public host metadata.
- **No cross-plugin observation by default.** One plugin does not observe
  another plugin's target metadata within a session. Whether any cross-plugin
  observation is ever permitted is Open and defaults to no; this contract does
  not grant it.
- **No Event-Bus exposure.** Target and annotation internals are not published
  through the Event Bus. No plugin receives another's target metadata through a
  bus topic.
- **No new capability.** This contract defines no capability identifier;
  provider registration and observation dimensions and their API version stay
  Open (`OQ-056`).

## Security and lifecycle failure cases

| Failure case                         | Required control                                                                                                    | Status             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Stale handle after labeling          | Generation check fails closed with `StaleTarget`; no dispatch against a recycled identity.                          | Accepted fence     |
| Unknown or expired label             | Dispatch fails closed; no default target and no silent action.                                                      | Accepted fence     |
| Handle reused across sessions        | Handles are ephemeral and non-transferable; a cross-session handle is invalid.                                      | Accepted fence     |
| Oversized snapshot                   | Collection fails before any registry insert; no partial snapshot and no partial epoch.                              | Accepted fence     |
| Provider fault during collection     | The faulty provider's targets are absent and the session continues with the remaining providers.                    | Candidate (`W-29`) |
| Plugin crash or cancel mid-session   | The session ends, capture is revoked, and labels are cleared; the mechanism remains intact.                         | Candidate (`W-29`) |
| Plugin unload during a session       | The session ends and releases capture and labels; no dangling handle or orphaned layer survives.                    | Candidate (`W-29`) |
| Event-Bus exposure request           | Target and annotation internals are never published; the request is refused.                                        | Accepted fence     |
| Private bypass or raw handle request | Refused; the plugin uses only the public, capability-gated API, and no raw PTY, GPU, or window handle is available. | Accepted fence     |
| Input hot-path callback              | Refused; capture is transient and revocable and never runs a plugin callback on the input hot path.                 | Accepted fence     |
| Safe-mode startup                    | The mechanism works with zero plugins and in `bitty --safe`; removing the plugin removes policy only.               | Accepted fence     |
| Missing capability at registration   | Registration fails closed with a capability-denied error; no provider is registered.                                | Accepted fence     |

No failure case may fall back to a default target, a truncated snapshot, a
silent dispatch, or a privileged path.

## Implementation status

- **Accepted**: the mechanism/policy split, the `TargetEngine` and
  `AnnotationEngine` names, and the retained fences, by ADR 0018.
- **Implemented-only**: the `bitty-ui` beacon artifacts listed under
  [Core mechanism names and implementation status](#core-mechanism-names-and-implementation-status).
  They are not `Accepted`, not `Verified`, and not wired to an accepted host
  API.
- **Decided direction, not in code**: the `TargetEngine` and `AnnotationEngine`
  type names, the public host API (`W-29`), and the policy retirement (`W-30`).
- **Not started**: the `beacon` plugin package, its page set, and its
  onboarding.
- **Open**: the `TargetRef` wire shape, the provider registration surface and
  version, the semantic UI property contract, scope defaults, label overflow
  and handedness, session invalidation, scene z-order and animation, and
  cross-plugin metadata visibility.

## Security review

This contract crosses the plugin trust boundary, the capability model, safe
mode, and the input and dispatch paths. Independent security review is required
before it is promoted beyond draft. The security reviewer must confirm:

- the mechanism stays capability-independent and always available, so no
  security enforcement point moves into the optional plugin;
- transient input capture stays capability-gated, transient, bounded,
  revocable, and Core-owned, and never places a plugin callback on the input
  hot path;
- the command-dispatch bridge routes through the accepted command registry and
  the public host API, with no private first-party bypass and no raw PTY, GPU,
  or window handle;
- stale-handle and generation checks fail closed, so a target invalidated
  between labeling and dispatch cannot become an action;
- target and annotation internals are not exposed through the Event Bus, and no
  plugin receives another's target metadata beyond the accepted scope;
- no P0 control is weakened, and safe-mode startup keeps zero third-party
  plugins with the mechanism still functional.

## Verification plan

Any later implementation that cites this contract must prove, at minimum:

1. **Mechanism without the plugin.** Target discovery, labeling, and dispatch
   work with zero plugins enabled and in `bitty --safe`.
2. **No private bypass.** The plugin uses only the public capability-gated API,
   and a third-party plugin can reach the same surfaces.
3. **Fail-closed handles.** A target invalidated after labeling cannot
   dispatch; a re-registered identity stales prior handles; a retired identity
   reports `StaleTarget`.
4. **Provider composition.** Collection is cold-path and staged, an oversized
   collection fails before any insert, and tier priority and registration order
   are deterministic.
5. **Allocation.** Labels are unique and deterministic for a fixed target set,
   home-row first, spatially mapped, and fail closed at capacity.
6. **Annotation.** One layer per session, bounded, input-order preserving,
   length-checked, and removed atomically on dispatch, cancel, and timeout.
7. **No Event-Bus exposure.** No target or annotation internals are published
   on the Event Bus.
8. **Documentation gates.** The repository-local `just check` passes with zero
   issues.

## Alternatives considered

| Alternative                                                     | Trade-off                                                                                                 | Disposition                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Keep the Core mechanism unnamed and the split informal          | Fewer documents, but leaves Core and plugin tasks without a citation point and keeps `B-8` open.          | Rejected by ADR 0018; this contract names the accepted mechanism.             |
| One Beacon-branded Core type instead of two mechanisms          | One name, but conflates targeting and dispatch with annotation and label allocation.                      | Rejected by ADR 0018; the two responsibilities have distinct ownership.       |
| Move mechanism and policy together into the plugin              | Fewer Core pieces, but makes a fundamental capability depend on an optional plugin and weakens safe mode. | Rejected by ADR 0015 and ADR 0018; the mechanism must work with zero plugins. |
| Extract the mechanism into a separate Rust repository now       | A separate repo, but a repository is not a trust boundary and the owner scoped the mechanism to Core.     | Rejected by ADR 0018; deferred behind `W-29`/`W-30`.                          |
| Expose target internals or a cross-plugin metadata view         | Easier provider composition, but widens the plugin trust boundary.                                        | Rejected; public metadata only and no cross-plugin observation by default.    |
| Let the first-party plugin draw its own labels or capture input | Flexible presentation, but creates a private privileged path.                                             | Rejected; one Core-rendered layer and Core-owned capture.                     |

## Affected contracts

| Contract                                                                                                                                                        | Effect                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [ADR 0018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md)                                | Consumed as the accepted decision; this page records its terminal-side consequences only.                |
| [Semantic Terminal RFC](semantic-terminal-rfc.md) (draft)                                                                                                       | P1-P5 stay implemented-only; P7 points to this contract for the mechanism boundary.                      |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (draft)                                                                                                  | U-8 points to this contract for the Core mechanism and records that the naming open point is decided.    |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                                                                                            | Unchanged; the command registry and overlay envelope are consumed, not redefined.                        |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                        | Unchanged; the identity hierarchy and interaction atomicity are consumed.                                |
| [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                      | Gains the capture behavior this contract consumes for a Beacon session.                                  |
| [Beacon Targeting Framework](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/beacon-targeting-framework-candidate.md) (candidate) | The plugin-side page cites this contract for the split and names; the plugin policy stays its direction. |

## Open points

None of these is a new global open question; each is parked with its named
owner or in the plugin-side candidate page.

- **Host API** parked to `W-29`: public host names, capability dimensions, and
  version that expose the mechanism (related to `OQ-056`).
- **Policy retirement** parked to `W-30`: concrete removal of candidate Beacon
  policy from Core while retaining the mechanism.
- **Wire shape** parked with the identity contracts: the `TargetRef` wire
  shape, derived-provider handle composition, and handle validity across panel
  moves and workspace changes.
- **Registration surface** parked in the plugin-side candidate page: the
  provider registration API and its capability dimensions and API version.
- **Budgets** parked to `W-29`: the accepted target, provider, annotation, and
  binding ceilings; the values above are implemented-only evidence.
- **Scopes, defaults, and session behavior**: scope defaults per operator,
  label overflow and handedness, session timeout, invalidation behavior, and
  cross-workspace session behavior (`OQ-088`).
- **Scene policy**: annotation-layer ownership, z-order, and animation policy.
- **Cross-plugin metadata visibility**: whether one plugin may observe
  another's target metadata within a session; the default is no.

## Acceptance criteria

1. The mechanism/policy table marks each row normative or candidate and matches
   the accepted ADR 0018 split.
2. The Core mechanism names are stated as accepted, and no Rust type is claimed
   to exist that does not; the implemented-only artifacts are listed as
   evidence, not as contract.
3. Generation and handle validity, provider registration and composition,
   label allocation, the annotation layer, transient input capture, the
   command-dispatch bridge, budgets, scene ownership, and cross-plugin metadata
   rules are each defined.
4. Security and lifecycle failure cases are defined and fail closed, with no
   fallback to a default target, a truncated snapshot, or a privileged path.
5. The page links the handoff and ADR 0018 and is self-contained, with no
   research-archive reference.
6. `just check` passes with zero issues.

## P0 Review Sign-off

Not signed. This document is a **draft** terminal-side contract. Independent
category-owner, docs-curator, and security review are required before it is
promoted beyond draft; the security review above records the required controls
and no P0 control is changed by this page.

| Role                 | Scope                                                                      | Requirement                                                           |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `architecture-owner` | Split, mechanism names, extraction scope, and boundary correctness         | Approve; confirms the split, both names, and the Core-retained scope. |
| `security-architect` | Capability boundary, input capture, dispatch, safe mode, and target safety | Independent security sign-off required before promotion.              |
| `docs-curator`       | Metadata, links, terminology, and status honesty                           | Approve; confirms schema, discoverability, and candidate marking.     |

## References

- [ADR 0018 - Beacon Mechanism/Policy Split and Core Targeting-Mechanism
  Naming](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md)
  — the accepted split, names, and extraction scope.
- [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  (Boundary 3) — the accepted direction and bootstrap fence.
- [Small-core refactor execution
  handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md)
  — the observed Beacon execution map (`W-90`/`W-91` page set, `W-102` policy
  extraction, `W-121` repository creation).
- [ADR 0018 - Beacon Mechanism and Policy
  Split](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md)
  — the `W-29`, `W-30`, `W-12`, and `W-53` downstream routing.
- [Beacon Targeting Framework
  (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/beacon-targeting-framework-candidate.md)
  — the plugin-side direction and the `B-8` open points.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted command registry,
  overlay envelope, focus routing, and capability isolation.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  identity hierarchy and interaction atomicity.
- [Performance Budget RFC](performance-budget-rfc.md) — accepted hot-path
  exclusion and frame budgets.
- [Input and Pointer Contract](input-pointer-rfc.md) — draft Leader, capture,
  and fail-open behavior.
- [Semantic Terminal RFC](semantic-terminal-rfc.md) — draft P1-P5
  implemented-only slices and the candidate P7 subsection.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — draft
  U-8 Beacon core engine direction.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  and [P0 security acceptance
  criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  — the normative posture and abuse cases.
