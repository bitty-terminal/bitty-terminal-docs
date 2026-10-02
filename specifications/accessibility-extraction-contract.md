---
title: Accessibility Extraction Contract
description: Terminal-side contract for the accepted platform-accessibility boundary covering the derived semantic snapshot focus synchronization the controlled action interface retained Core mechanisms and capability-gated platform adapters
category: specifications
audience: maintainer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 69
---

# Accessibility Extraction Contract

## Document status

This document is `Accepted` (`W-134`) as the terminal-side contract that
elaborates [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
Boundary 3 (platform accessibility: accepted). It fixes the interface between
the Core-retained accessibility mechanism and the platform accessibility
adapter that may move to the reserved independent `bitty-a11y` repository: the
semantic snapshot model, focus synchronization, the controlled action
interface, the "projection is never authority" rule, the retained Core
mechanism, and the capability-gated platform adapters.

It authorizes no code and no extraction. Extraction (`W-142`) remains gated on
this document, and the adapter implementation (`CTX-0003`) and Core integration
(`W-142` / `CTX-0935`) are named downstream owners only; their content is not
decided here. The document does not describe implemented behavior, does not
authorize shipped, stable, normative, or compatibility-guaranteed behavior, and
does not weaken any normative security control. The one class of source-level
evidence this document records is the existing `bitty-ui` accessibility
artifacts reviewed read-only against the workspace `bitty` checkout; they are
`Implemented-only`, never `Verified`, and are not the accepted host adapter.
Frontmatter `status` is `accepted` per the repository metadata schema;
document status is Accepted.

- Owning task: `W-134` (bitty-terminal-docs), CarryCtx `CTX-0090`, Issue
  [bitty-terminal-docs#169](https://github.com/bitty-terminal/bitty-terminal-docs/issues/169).
- Predecessor boundary: ADR 0016 Boundary 3, accepted 2026-10-02 under
  `bitty-docs` `W-130` (`CTX-0266`).
- Related decisions: [ADR 0013 - Core Ontology and Identity Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md)
  (`PanelId != ViewId != TerminalId`, projection versus authority) and
  [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  (the bootstrap fence this contract inherits).
- Cross-session map: [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

## Purpose and scope

ADR 0016 Boundary 3 accepted that the platform accessibility adapter -
semantic snapshots, focus synchronization, and a controlled action interface -
may move to the reserved `bitty-a11y` repository under focused contract `W-134`,
while Core retains the accessibility baseline and the correctness of focus and
terminal-state association. This document is that focused contract: it defines
the exact surface the adapter consumes, the bounds and failure behavior every
implementation must preserve, and the retained Core mechanism that survives
extraction.

In scope:

- the derived semantic snapshot model: what a snapshot contains, its bounds,
  stable element identity, and update and coalescing rules;
- focus synchronization: focus association with terminal and panel state, focus
  order, cursor and screen-reader synchronization, and fail-closed behavior on
  mismatch;
- the controlled action interface: the action dispatch an adapter may invoke,
  its bounds, the prohibition on direct terminal mutation, and the prohibition
  on Event-Bus publication of the projection;
- the "projection is never authority" rule;
- the accessibility baseline and mechanism Core retains;
- platform adapters (AT-SPI/D-Bus, Windows UI Automation, macOS Accessibility)
  as capability-gated adapter responsibilities with no privileged bypass;
- the security and lifecycle failure cases, the verification plan with
  negative-path evidence, and the honest implementation status.

Out of scope and owned elsewhere:

- the `bitty-a11y` repository, its packaging, and its platform backends
  (`CTX-0003`);
- the Core extraction and integration (`W-142` / `CTX-0935`);
- the broader UI accessibility baseline that the draft
  [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md)
  tracks for non-terminal scene content, contrast floors, and motion tiers;
  this contract consumes the baseline rules it needs and does not flip that
  record's status;
- the scene node schema and its bounds (accepted,
  [Rich Presentation RFC](rich-presentation-rfc.md));
- panel identity, focus routing, and overlay semantics (accepted,
  [Panel Runtime RFC](panel-runtime-rfc.md));
- theme tokens and the exact contrast floor (candidate,
  [Theme Token Contract (Candidate)](theme-token-contract-candidate.md));
- motion tiers and budgets (candidate,
  [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)).

This document does not reopen the accepted Terminal Truth, focus-routing,
permission, capability, or safe-mode controls. It preserves them and records
residual questions under "Open points".

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- ADR 0016 Boundary 3 and its binding constraints, especially constraint 6 (the
  accessibility baseline is preserved), constraint 7 (no private first-party
  bypass), and the rule that a separate repository is not process isolation.
- The bitty-docs security corpus:
  [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
  The binding controls include capability-checked host APIs and official-plugin
  parity (`P0-AC-012`), exclusion from the input, parser, and render hot paths
  (`P0-AC-015`), Core-owned Terminal Truth (`P0-AC-016`), safe mode
  (`P0-AC-019`), and trace minimization with user-only files (`P0-AC-026`).
- The accepted [Terminal State RFC](terminal-state-rfc.md): what Terminal Truth
  is, and the rule that presentation is never truth.
- The accepted [Panel Runtime RFC](panel-runtime-rfc.md): panel identity, the
  [command registry](panel-runtime-rfc.md#command-registry), the
  [overlay envelope](panel-runtime-rfc.md#overlay-41), focus routing, and
  capability isolation.
- The accepted [Workspace Compositor Specification](workspace-compositor.md):
  the identity hierarchy (`PanelId != ViewId != TerminalId`) and interaction
  atomicity.
- The accepted [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md):
  the lifecycle and focus model the association rule reuses.
- The accepted [Performance Budget RFC](performance-budget-rfc.md): no periodic
  timers and bounded per-frame work.
- The draft [Rich Presentation RFC](rich-presentation-rfc.md): the declarative
  scene model and its node kinds whose roles the projection maps.
- The draft [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md):
  the projection, fidelity-boundary, tab-order, announcement, and settings rules
  this contract elaborates for the extraction boundary.

## Terminology

| Term                       | Meaning in this document                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projection                 | The read-only semantic description (roles, names, states, readable text) derived for assistive technology from Terminal Truth, the accepted scene model, and chrome.                   |
| Semantic snapshot          | One immutable, bounded projection of one accessibility root, produced per generation and never persisted.                                                                              |
| Accessibility root         | The window-scoped root of one snapshot; the unit the adapter exposes to the platform.                                                                                                  |
| Terminal Truth             | Parser state, grid semantics, cursor state, modes, and canonical scrollback, as defined by the security corpus and the Terminal State RFC; mutable only by Core.                       |
| Element identity           | The stable, opaque identity a snapshot assigns to a node; scoped to the snapshot's projection generation, never a raw UI node, compositor handle, or memory pointer.                   |
| Projection generation      | The monotonic revision of the derived snapshot; it advances only on a structural change and never on an identical rebuild.                                                             |
| Focus association          | The rule that the projection's recorded focus owner must equal the surface Core reports as focused.                                                                                    |
| Focus order                | The order assistive traversal visits exposed elements; chrome surfaces are excluded by default.                                                                                        |
| Controlled action          | A typed, bounded request from an adapter that resolves through Core's accepted command registry under the target owner's capability grants.                                            |
| Platform adapter           | The capability-gated `bitty-a11y` side that materializes the projection in a platform accessibility model and routes platform-initiated actions back through the controlled interface. |
| Fidelity boundary          | The stated limit of accessibility exposure for terminal content (readable text runs and cursor position only).                                                                         |
| Announcement               | A one-shot assistive notification for a focus or async state transition, bounded and coalesced.                                                                                        |
| Safe mode                  | `bitty --safe`, which starts with zero third-party plugins and no optional adapter; the Core mechanism is unaffected.                                                                  |
| Private first-party bypass | Any non-public path, raw handle, or hot-path callback a first-party component could use but a third-party component could not; forbidden.                                              |

## Core mechanism and adapter ownership

The table states the accepted split from ADR 0016 Boundary 3 and who owns each
side. The **Status** column is authoritative for whether a row is accepted
contract, decided direction, implemented-only evidence, or open.

| Side                                        | Owns                                                                                                                                                                                         | Status                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Core mechanism                              | Accessibility baseline as a normative obligation; projection derivation; scene, terminal, and chrome mapping; focus-order rule; announcements; reduced-motion and contrast respect; privacy. | Accepted (ADR 0016)               |
| Core mechanism                              | Correct focus and terminal-state association: a focus move reports the destination that actually holds focus.                                                                                | Accepted (ADR 0016)               |
| `bitty-a11y` platform adapter               | Assistive-technology backends (AT-SPI/D-Bus, Windows UI Automation, macOS Accessibility), exposure mechanics, snapshot serialization, and the controlled action-dispatch adapter.            | Accepted boundary (ADR 0016)      |
| `bitty-a11y` platform adapter               | Element-handle mapping to platform objects, platform permission handling, and the platform event stream.                                                                                     | Decided direction (this contract) |
| Existing `bitty-ui` accessibility artifacts | The projection, tree, announcements, settings, and invalidation primitives listed under "Implementation status".                                                                             | Implemented-only evidence         |
| Forbidden                                   | Private first-party bypass, raw PTY, GPU, or window handle, input hot-path callback, Event-Bus publication of the projection, persisted projection.                                          | Accepted (ADR 0016, ADR 0015)     |

Consequences of the split:

- Core keeps the mechanism for the 0.1.0 scope. Extraction is deferred behind
  `W-142` and changes no trust decision: a separate repository is not process
  isolation, so the adapter's submissions are revalidated by Core before any
  action, focus assertion, or exposure takes effect.
- The adapter is an ordinary capability-gated component. Its absence removes
  platform exposure only; the Core projection mechanism and the accessibility
  baseline work with zero adapters and in `bitty --safe`.
- There is no second state and no second execution path. The projection reads
  Terminal Truth, the accepted scene model, and chrome state; a selected
  element resolves to a typed command in the accepted registry, never a direct
  call into the compositor or terminal.

## Semantic snapshot model

The projection is a bounded, immutable, read-only description of one
accessibility root. It is derived, never authored: it is computed from the
surface's own truth, and a snapshot that cannot be derived completely fails
closed rather than presenting a partial result.

### Snapshot contents

A snapshot exposes, for one accessibility root:

| Element          | Required exposure                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root             | Role `group`; accessible name from the window or icon title.                                                                                          |
| Terminal leaf    | Role `text` named by the title; readable text runs in row order; live cursor position and cursor visibility.                                          |
| Terminal row     | Row content as text content, not an accessible name.                                                                                                  |
| Chrome surface   | Read-only structure identified by kind (bar, rail, tab strip, notification, overlay); accessible name and announced state; never a tab stop, no role. |
| Scene node       | Role from its declared kind (`text`, `group`, `code`, `table`, `list`, `separator`, `image`).                                                         |
| Interactive node | Role from its declared purpose (`button`, `input`) with accessible name, enabled state, and activation only while enabled.                            |
| Notification     | Announcement on transition; no focus capture.                                                                                                         |
| Modal overlay    | Focus confined to the overlay; underlying content excluded while the modal is active.                                                                 |

The terminal fidelity boundary is stated, not implied: exposure covers readable
text runs and cursor position only. Absolute cursor addressing, full SGR
styling as a semantic structure, graphics protocols, and images are not
represented as structure. A scene kind with no mapped role is non-conformant:
the whole snapshot fails closed rather than omitting the node silently.

### Bounds

Every bound below is finite and fail-closed; silent truncation is
non-conforming because it would misname or misrepresent a surface to assistive
technology. The numeric values marked **Implemented-only** are the values the
existing `bitty-ui` artifacts observe; they are evidence, not a frozen accepted
ceiling. The accepted numeric ceilings are fixed by the adapter implementation
contract (`CTX-0003`), which must not exceed a bound that would let untrusted
input (window titles, grid text, chrome labels) drive an unbounded allocation.

| Bound                            | Value          | Status           | Applies to                                                        |
| -------------------------------- | -------------- | ---------------- | ----------------------------------------------------------------- |
| Accessible name or label length  | 256 characters | Implemented-only | Root, terminal, chrome, interactive names and states.             |
| Tree node count                  | 4096 nodes     | Implemented-only | One snapshot; terminal row content is bounded by the grid itself. |
| Announcement text length         | 256 characters | Implemented-only | One queued announcement.                                          |
| Pending announcements            | 8 notices      | Implemented-only | One announcement queue; overflow drops the oldest.                |
| Render tree node count and depth | 1024 nodes, 16 | Implemented-only | The retained scene tree the projection may consume.               |

A grid contributes at most its row count plus structural nodes, so a real grid
lands far below the node cap; only adversarial or programming-error input trips
it. Row content is content, not an accessible name, so it is not subject to the
name cap; it remains bounded by the grid dimensions and the retained-tree
bounds.

### Stable element identity

Element identity must be stable and forgery-resistant, and it must never alias
a `PanelId`, `ViewId`, or `TerminalId` or expose a raw UI, compositor, or
memory handle.

- **Snapshot-scoped handles.** Within one snapshot, each node carries an opaque
  handle issued by the builder that created it. A handle from another builder
  or out of range is rejected; handles cannot be forged.
- **Anchored across snapshots.** Cross-snapshot identity is anchored to the
  source, not to position: terminal rows key on the terminal leaf plus row
  ordinal, chrome nodes key on their kind, scene nodes key on their
  producer-assigned identity, and interactive nodes key on declared purpose
  plus accessible name. Reconciliation is by identity, never by position.
- **Generation-paired.** Every handle an adapter holds is paired with the
  projection generation it was derived from. A structural change advances the
  generation and invalidates prior-generation handles by construction.
- **Ephemeral and non-transferable.** Handles are collected for a session or
  snapshot, are not persisted, and are not transferable between windows,
  sessions, or adapter generations.

### Update, coalescing, and refresh

- **Invalidation-driven only.** The projection rebuilds only when the caller
  names an invalidation source: a focus change, an async state transition, a
  scene update, a terminal update (grid, title, or cursor), or a chrome update.
  Nothing invalidated never rebuilds. A render, paint, or damage tick that
  carries no content change does not rebuild the projection.
- **No timer, no hot path.** Rebuilds create no periodic timer and execute no
  plugin code per keystroke or per PTY read. The rebuild is excluded from the
  input, parser, and render hot paths (`P0-AC-015`).
- **Atomic swap.** A snapshot is immutable once built. The adapter swaps to a
  new generation atomically and never presents a partially built tree; a build
  that violates a bound or an unmapped scene kind fails before anything is
  exposed.
- **Announcement coalescing.** Consecutive duplicate announcements (same kind
  and text) collapse to one notice. The queue is bounded and, when full, drops
  the oldest notice so the newest state always wins.
- **Once per transition.** A focus move and an async state change each produce
  exactly one announcement per transition; no surface announces on a render or
  on a repeating cadence.
- **Identity-set diffs.** Between two generations, the invalidation set is the
  identity-set diff of added, removed, and payload-changed nodes, ordered by
  identity. An identical resubmission produces no diff and does not advance
  the generation.

## Focus synchronization

### Focus association

Focus is Core-owned and authoritative. Exactly zero or one `ViewId` or
`PanelId` per active workspace is focused; zero occurs only when the window is
unfocused, the workspace is empty, or the focused surface was just hidden or
detached. The projection records the focused surface's accessible name for
announcement; it never defines focus. Keyboard, IME preedit, and wheel routing
read the same focused identifier, and mouse hit testing reads `View`
rectangles.

### Focus order

Assistive traversal over exposed elements excludes chrome surfaces by default:
chrome announces state and exposes read-only structure but is never a focus
target, matching the rule that chrome never receives keyboard or IME input. The
exclusion is enforced in one place so that if a future chrome kind ever becomes
focusable, only that predicate changes. A modal overlay confines focus to the
overlay and excludes underlying content while the modal is active.

### Cursor and screen-reader synchronization

The terminal exposure carries the live cursor position and visibility
(`DECTCEM`). A cursor move inside a focused terminal updates the exposed cursor
state under a terminal-update invalidation and produces at most one bounded
announcement per transition; there is no second cursor, and the announced
cursor summary is derived from the same snapshot. Terminal focus reporting
(`CSI I`/`CSI O` for mode `1004`) is emitted only when the hosting panel newly
gains focus, and no focus change mutates the grid.

### Fail-closed on mismatch

If the projection's recorded focus owner disagrees with Core's live focus -
stale, cleared, or reassigned - the adapter must not assert focus. It must
either re-synchronize to the current projection generation or report no focused
element. A focus mismatch never transfers focus, never routes input, and never
mutates any state. When acceptance returns `None` focus (an empty or
just-detached workspace), the projection reports no focused element rather than
retaining a stale owner. The association and its failure behavior are part of
the retained Core mechanism and may not be dropped during extraction.

## Controlled action interface

The adapter may interact with the terminal only through a controlled action
interface. It never receives a callback into the compositor, renderer, or
terminal.

- **Typed and closed.** An action request names a controlled action identifier
  bound to an element identity and its projection generation. The v1 action
  class is activation of a declared interactive node; any other class requires
  its own reviewed extension and is not authorized here.
- **Registry authority.** A controlled action resolves through the accepted
  [command registry](panel-runtime-rfc.md#command-registry) under the target
  owner's capability grants. The registry validates its own arguments and
  enforces its own resource budgets; the adapter forwards no authority.
- **Revalidate before dispatch.** The host revalidates the element identity and
  generation against the live projection and registry before executing. An
  unknown, expired, or stale element fails closed with a typed error; it never
  falls back to a default action or a silent dispatch.
- **Bounded and authorized.** Action requests are bounded and authorized per
  principal; a platform adapter is not trusted by location. An extracted
  adapter's requests are revalidated by Core before effect.
- **No direct terminal mutation.** The adapter has no raw PTY, GPU, or window
  handle and cannot write input or mutate grid, cursor, modes, scrollback,
  attachment, focus, or policy. Input still reaches the terminal only through
  the public, capability-gated host path.
- **No Event-Bus publication.** The snapshot, element identities, focus
  associations, and action outcomes are host-side. They are never published on
  the Event Bus: exposing one surface's content to assistive technology must
  not become a cross-panel read path for plugins.

## Projection is never authority

1. **Derived, never a second state.** The projection is computed from Terminal
   Truth, the accepted scene model, and chrome state. It is never an authority.
2. **Read-only.** Building or updating a snapshot cannot mutate grid, cursor,
   modes, scrollback, attachment, focus, or policy.
3. **Never persisted.** No snapshot, element handle, or projection generation is
   written to disk or carried across sessions.
4. **Never consulted for routing or dispatch.** Focus routing, key routing, hit
   testing, and command execution read Core state, never the projection. The
   projection cannot be asked what should happen next.
5. **Regenerable and source-wins.** The projection can be regenerated from its
   sources at any generation; on any conflict, the source is authoritative and
   the projection is discarded.
6. **Removal removes exposure only.** Disabling or removing the adapter removes
   platform exposure; terminal behavior and the Core baseline are unchanged.

## What Core retains

Core retains the accessibility baseline and the mechanism extraction cannot
remove:

- **The accessibility baseline** as a normative obligation, not a disposable
  optional feature.
- **The projection mechanism:** derivation of semantics from Terminal Truth,
  the accepted scene model, and chrome state, with the required mapping of
  scene, terminal, and chrome content.
- **The fidelity boundary** for terminal exposure: readable text runs and
  cursor position only, stated explicitly.
- **Focus association correctness:** assistive focus and terminal state stay
  correctly associated, and a focus move reports the destination that actually
  holds focus.
- **The focus-order rule** that excludes chrome from the tab order by default
  and confines a modal overlay.
- **Bounded announcements:** one coalesced, rate-limited announcement per focus
  or async state transition, never on render and never on a repeating cadence.
- **Reduced-motion and contrast respect:** `reduced_motion` collapses animation
  to its final committed state, and the high-contrast posture selects the
  compliant theme pair; neither setting is plugin-overridable.
- **Privacy:** the projection is host-side and is never published on the Event
  Bus, so exposing one surface's content creates no cross-panel read path.
- **Bounds and fail-closed behavior:** name, node, and announcement caps;
  unmapped-kind, forged-handle, stale-generation, and partial-snapshot failures
  are all fail-closed.
- **The capability gate** for the platform accessibility capability that
  authorizes an adapter.

## Platform adapters

The platform adapter is the `bitty-a11y` side. It is a consumer of the
projection, never a producer of terminal state.

### Adapter responsibilities

- Materialize the projection in the platform accessibility model: AT-SPI over
  D-Bus on Linux, Windows UI Automation on Windows, and the macOS Accessibility
  (AX) bridge on macOS, or another platform model admitted by the focused
  implementation contract.
- Map platform-side element objects to projection element identity and
  generation, and reconcile by identity across generations.
- Deliver bounded announcements through the platform's announcement mechanism.
- Receive platform-initiated actions (for example, activating an exposed
  control) and route them through the controlled action interface.
- Surface the platform's own accessibility permission state and refuse to
  expose or act when the platform permission is not granted.

### Capability and permission gate

Exposing terminal or scene content to the platform is a capability: it is
granted by Core, and the platform's own accessibility permission is surfaced
and consent-gated. An absent, denied, or crashed adapter removes platform
exposure only; it must not disable the Core baseline, drop focus
synchronization, or force the terminal into a degraded state. Safe mode starts
with zero adapters and the mechanism still functions.

### No privileged bypass

The adapter uses the same public, capability-gated interface any extension
uses. There is no private first-party channel and no raw PTY, GPU, or window
handle. It places no callback on the input hot path. Because a separate
repository is not process isolation, the adapter's submissions are untrusted
input at the Core boundary and are revalidated before any action, focus
assertion, or exposure takes effect.

## Security and lifecycle failure cases

| Failure case                                                   | Required control                                                                                             | Status         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------- |
| Adapter presents a stale snapshot                              | The snapshot is rejected against the live projection generation; the adapter re-synchronizes.                | Required fence |
| Focus mismatch (projection versus live)                        | The adapter asserts no focus, re-synchronizes or reports no focus; no transfer, no routing, no mutation.     | Required fence |
| Unauthorized action                                            | The request fails closed with a typed capability-denied error; no default action and no silent execution.    | Required fence |
| Action from a stale generation                                 | The element identity/generation check fails closed; the action is not executed against a recycled identity.  | Required fence |
| Event-Bus publication request                                  | Refused; the projection is host-side and never a bus topic.                                                  | Required fence |
| Unmapped scene kind                                            | The whole snapshot fails closed before anything is exposed; no partial snapshot.                             | Required fence |
| Overlong name, oversized snapshot, or over-count announcements | Fail closed at the bound with a typed error; no silent truncation.                                           | Required fence |
| Forged or foreign element handle                               | Rejected; handles are snapshot-scoped and cannot be forged.                                                  | Required fence |
| Adapter crash or unavailability                                | Platform exposure is lost while the Core baseline stays correct; no dangling focus or action survives.       | Required fence |
| Safe-mode startup                                              | The mechanism works with zero adapters and in `bitty --safe`; removing the adapter removes exposure only.    | Required fence |
| Private bypass or raw handle request                           | Refused; only the public, capability-gated interface is available; no raw PTY, GPU, or window handle exists. | Required fence |

No failure case may fall back to a default action, a stale focus owner, a
partial snapshot, a truncated name, or a privileged path.

## Implementation status

- **Accepted**: ADR 0016 Boundary 3 ownership split; this contract as its
  terminal-side elaboration. This authorizes no implementation and no
  extraction.
- **Implemented-only evidence** (`bitty` revision `5670d9ae42a0`, crates
  `bitty-ui`): `crates/bitty-ui/src/a11y.rs` (scene-to-role mapping with
  fail-closed unmapped kinds; terminal exposure with the stated fidelity
  boundary; chrome exposure excluded from the tab order; the read-only,
  builder-scoped accessibility tree with node bounds; the coalescing,
  rate-limited announcement queue; reduced-motion and high-contrast settings
  composed without plugin input; invalidation-driven refresh with no timer),
  `crates/bitty-ui/src/uitree.rs` (stable `UiNodeId`, monotonic revision,
  identity-set diff of added, removed, and updated nodes, no bump on identical
  resubmission), `crates/bitty-ui/src/focus.rs` (deterministic `ViewId`-keyed
  focus routing), and `crates/bitty-ui/tests/a11y_baseline.rs` (pinned baseline
  tests). These are not `Accepted`, not `Verified`, and not wired to an
  accepted adapter.
- **Decided direction, not in code**: the platform adapter backends and
  exposure mechanics, the controlled action interface and activation dispatch,
  cross-generation element identity/fencing as a host contract, and
  adapter-facing snapshot serialization.
- **Not started**: the `bitty-a11y` repository and adapter (`CTX-0003`), and
  the Core extraction and integration (`W-142` / `CTX-0935`).
- **Open**: the exact role vocabulary and whether it follows a platform
  convention by name or by mapping table, whether terminal text runs carry
  styling attributes, the announcement coalescing time window, the contrast
  floor owner, and the accepted numeric ceilings.

## Security review

This contract crosses the plugin and platform trust boundaries, the capability
model, focus routing, dispatch, and safe mode. Independent security review is
required before extraction is authorized. The reviewer must confirm:

- the projection mechanism stays Core-owned and always available, so no
  security enforcement point moves into the optional adapter;
- the projection is derived and read-only, is never persisted, is never
  consulted for routing or dispatch, and cannot mutate Terminal Truth;
- the adapter is capability- and permission-gated, and its absence or failure
  removes exposure only;
- the controlled action interface routes through the accepted command registry
  and the public host API, with no private first-party bypass and no raw PTY,
  GPU, or window handle;
- stale-snapshot, stale-generation, forged-handle, focus-mismatch, and
  unauthorized-action paths all fail closed;
- the projection is never published on the Event Bus, so no cross-panel read
  path appears;
- no P0 control is weakened, and safe-mode startup keeps zero third-party
  plugins with the mechanism still functional.

No P0 control is changed by this document.

## Verification plan

Any later implementation that cites this contract must prove, at minimum, the
following. Items marked **pinned** are already covered by the implemented-only
baseline tests as source-level evidence; the remaining items are required when
the adapter and controlled action interface land and are the negative-path
evidence this contract obligates.

1. **Derived and read-only.** Building a snapshot borrows its sources and
   mutates no grid, cursor, mode, or scrollback. **Pinned** for the baseline
   tree and terminal exposure; required for the adapter path.
2. **Stale snapshot.** An adapter acting on generation `N` while the live
   projection is generation `M > N` is rejected and re-synchronizes; no focus
   assertion and no action is applied.
3. **Focus mismatch.** When the projection's focus owner disagrees with Core's
   live focus, the adapter asserts no focus, transfers nothing, routes nothing,
   and mutates nothing.
4. **Unauthorized action.** An action without the required capability or
   platform permission fails closed with a typed denial and executes nothing.
5. **Projection from a stale generation.** An element handle from an earlier
   generation cannot drive an action or a focus assertion against a recycled
   identity.
6. **No Event-Bus leak.** No snapshot, element identity, or focus association
   is published on the Event Bus.
7. **Safe mode.** The mechanism works with zero adapters and in `bitty --safe`,
   and removing the adapter removes exposure only.
8. **Fail-closed bounds.** An unmapped scene kind, an overlong name, an
   oversized snapshot, and an over-count announcement queue all fail closed
   with no partial result. **Pinned** for scene mapping, name length, node cap,
   and announcement bounds.
9. **Coalescing.** Consecutive duplicate announcements collapse to one, and a
   full queue drops the oldest notice. **Pinned**.
10. **Chrome tab-order exclusion.** Chrome surfaces are absent from the tab
    order while their name and state stay exposed. **Pinned**.
11. **Invalidation-driven refresh.** The projection rebuilds only for a named
    invalidation and creates no periodic timer. **Pinned**.
12. **Documentation gates.** The repository-local `just check` passes with zero
    issues.

## Alternatives considered

| Alternative                                                       | Trade-off                                                                                      | Disposition                                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Keep the whole accessibility behavior inside Core                 | Fewer moving parts, but leaves optional platform policy in the small core and ignores DIR-001. | Rejected by ADR 0016 Boundary 3; Core keeps the mechanism, the adapter may extract.             |
| Make accessibility an optional plugin feature or post-1.0 concern | Less scope now, but the baseline is a preserved obligation that must exist before scene paths. | Rejected; the baseline is not disposable and the projection may never become authority.         |
| Let the adapter own focus or the semantic model                   | Simpler adapter, but makes presentation authority and risks a second state.                    | Rejected; Core retains focus association and the projection mechanism.                          |
| Persist or cache the projection across sessions                   | Faster reattach on paper, but creates a second, staleable state.                               | Rejected; the projection is derived, ephemeral, and regenerable.                                |
| Publish the projection on the Event Bus for plugins               | Rich plugin possibilities, but creates a cross-panel read path.                                | Rejected; the projection stays host-side and is never a bus topic.                              |
| Treat the extracted adapter as process isolation                  | Assumes trust by location, but a separate repository is not a trust boundary.                  | Rejected; adapter submissions are revalidated by Core before effect.                            |
| Let the adapter define its own semantics vocabulary               | Platform freedom, but splits the semantic contract and risks divergent exposure.               | Rejected; Core owns the role mapping and the adapter maps it to the platform model.             |
| Decide nothing in `W-134` and park tree-versus-stream to later    | Defers a decision the boundary assigned here, leaving the adapter without a consumed shape.    | Rejected; this contract decides the projection is a bounded snapshot tree the adapter consumes. |

## Affected contracts

| Contract                                                                                                                                                        | Effect                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md) | Consumed as the accepted boundary; this contract records its terminal-side consequences and decides the projection shape.                         |
| [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) (draft)                                                                               | Its projection, fidelity, tab-order, announcement, and settings rules are elaborated here for the extraction boundary; its status is not flipped. |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                                                                                          | Unchanged; Terminal Truth is the projection source and is never mutated.                                                                          |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                                                                                            | Unchanged; focus routing, the command registry, and capability isolation are consumed.                                                            |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                        | Unchanged; the identity hierarchy and interaction atomicity are consumed.                                                                         |
| [Performance Budget RFC](performance-budget-rfc.md) (accepted)                                                                                                  | Unchanged; hot-path exclusion and the no-periodic-timer rule are consumed.                                                                        |
| [Rich Presentation RFC](rich-presentation-rfc.md) (accepted)                                                                                                    | Unchanged; its scene node kinds gain the required role mapping the projection consumes.                                                           |
| [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) (draft)                                                                                   | Holds the contrast floor and compliant token pair the settings rule selects.                                                                      |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) (draft)                                                                                   | Shares the reduced-motion and no-hot-path rules.                                                                                                  |

## Open points

None of these is a new global open question; each is parked with its named
owner.

- **Role vocabulary** parked to `CTX-0003`: whether the role names follow an
  existing platform convention by name or through an explicit mapping table.
- **Terminal text attributes** parked to `CTX-0003`: whether terminal text runs
  expose styling as an attribute or text only, without weakening the fidelity
  boundary.
- **Announcement coalescing window** parked to `CTX-0003`: whether the count cap
  and duplicate coalescing are supplemented by a time window, or whether the
  no-timer rule forbids one.
- **Contrast floor** parked with the theme-token contract: whether the floor is
  a theme-token contract or a validation rule, and its exact value.
- **Accepted numeric ceilings** parked to `CTX-0003`: the values above are
  implemented-only evidence; the accepted ceilings must be fixed without
  admitting an unbounded allocation.
- **Adapter exposure mechanics** parked to `CTX-0003`: the per-platform tree
  materialization, event-stream, and serialization shapes below the projection.
- **Activation dispatch and live events** parked post-1.0: the action taxonomy
  beyond node activation and any live event stream require their own reviewed
  extension.
- **Screen-reader traversal mode** parked to `CTX-0003`: whether a text-first
  focus traversal inside a terminal leaf enters scope, and at which milestone.

## Acceptance criteria

1. The contract elaborates the ADR 0016 Boundary 3 ownership split and states
   the retained Core mechanism explicitly.
2. The semantic snapshot model, focus synchronization, controlled action
   interface, "projection is never authority" rule, and platform adapters are
   each defined with bounds and fail-closed behavior.
3. The negative paths (stale snapshot, focus mismatch, unauthorized action,
   stale generation, Event-Bus leak, safe mode, forged handle, and bound
   failures) are stated with their required controls.
4. Stable element identity and projection generations are defined, and no
   element identity aliases a `PanelId`, `ViewId`, or `TerminalId`.
5. Nothing is described as implemented beyond the `Implemented-only` evidence,
   and extraction is explicitly not authorized.
6. The downstream owners (`bitty-a11y` `CTX-0003`, Core integration `W-142` /
   `CTX-0935`) are named without deciding their content.
7. The page is self-contained with no external research reference and links the
   ADR and handoff.
8. `just check` passes with zero issues.

## P0 Review Sign-off

Independent security review is required before extraction is authorized. This
document changes no P0 control.

| Role                     | Scope                                                                     | Requirement                                                                    |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `architecture-owner`     | Boundary split, retained mechanism, and snapshot/focus/action correctness | Approve; confirms the split, the retained Core list, and the projection shape. |
| `security-reviewer`      | Capability gate, focus and dispatch paths, privacy, and safe mode         | Independent security sign-off required before extraction authorization.        |
| `accessibility-reviewer` | Baseline coverage, fidelity boundary, focus order, and announcements      | Approve; confirms the baseline is preserved and no requirement is weakened.    |
| `docs-curator`           | Metadata, links, terminology, and status honesty                          | Approve; confirms schema, discoverability, and evidence marking.               |

## References

- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  - the accepted Boundary 3 and its binding constraints.
- [ADR 0013 - Core Ontology and Identity
  Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md)
  - the identity separation and projection-versus-authority relations.
- [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  - the bootstrap fence inherited here.
- [Small-core refactor execution
  handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md)
  - the `W-134` focused contract and the `W-142` extraction disposition.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and [P0 security acceptance
  criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  - the normative posture and abuse cases.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) -
  the draft baseline the boundary elaborates.
- [Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [Workspace Compositor Specification](workspace-compositor.md),
  [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md), and
  [Rich Presentation RFC](rich-presentation-rfc.md) - the accepted contracts
  consumed by the projection and its focus and bounds rules.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) and
  [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) -
  candidate contracts for the contrast floor and motion rules.
