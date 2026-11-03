---
title: Plugin Drawing Capability RFC (Candidate)
description: Draft contract answering bitty#2477 for a bounded declarative plugin drawing instruction set with host-owned frames, host-derived damage, and readback denial, separate from the Panel RFC
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 86
---

# Plugin Drawing Capability RFC (Candidate)

## Document status

> Status: **draft** candidate — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record is the decision-ready draft
> for [bitty#2477](https://github.com/bitty-terminal/bitty/issues/2477)
> ("RFC: plugin drawing capability (separate from the Panel RFC)"; `Refs #2477`,
> this record never closes the issue), written as a dedicated RFC that does not
> amend the accepted [Panel Runtime RFC](panel-runtime-rfc.md), the accepted
> [Rich Presentation RFC](rich-presentation-rfc.md), or the accepted
> [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md).
>
> The record accepts nothing, promotes nothing to **Verified** or
> **Compatible**, and changes no accepted text. Capability identifiers, Lua
> spellings, instruction names, bound values below are candidate spellings
> that a successor acceptance adopts or rejects; every new ceiling follows the
> [Performance Budget RFC](performance-budget-rfc.md) convention that numbers
> are target contracts, not silent drift. The issue footer references
> `Task: CTX-2467`; a record number must be confirmed at review time and this
> document deliberately does not cite one. This document authorizes no
> implementation. A security reviewer is required before acceptance: this
> contract defines capabilities, resource limits, and a trust boundary with
> the render hot path.
>
> Provenance: drafted under the abandoned `CTX-1587` drawing lane and landed
> as a candidate under docs `CTX-1671` after re-verification against
> `origin/main` at `8852836`; the lane bookkeeping changes no content claim.
>
> Revision: this draft was amended after the independent security review in
> `bitty-docs` `docs/security/plugin-drawing-capability-review.md` returned
> **`NEEDS-FIX`** with seven blocking findings. Each blocking finding is closed
> in the body text and indexed in § [Blocking findings closed in this
> revision](#blocking-findings-closed-in-this-revision); the review lineage and
> the non-blocking findings that stay open are recorded in § [Review lineage
> and open items](#review-lineage-and-open-items). The amendment changes no
> verdict, promotes nothing, and is itself subject to re-review by diff.

## Purpose and scope

The issue asks for one decision: does a plugin drawing capability turn plugins
into a "component library or a graphics platform"? The accepted sources already
constrain the answer hard. The
[Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
invariants normatively forbid plugins in the render hot path (invariant 4) and
forbid them from altering Terminal Truth (invariant 3); the Rust surface
sketched in [product/panel-vision.md](../product/panel-vision.md) is annotated
by the owner that `Panel::render(&mut Frame)` is "not a plugin API" — handing a
plugin a Frame means handing it renderer, GPU, and window objects, which is the
sandbox-violating shape the issue calls out. This draft therefore decides the
question in one direction: **plugins may submit bounded, declarative,
host-validated drawing instructions into their own panel content region, but
they never own, address, or observe a frame.** A drawing surface exists as a
data plane behind the host renderer, not as an escape hatch into the
compositor.

In scope (each decision maps to the issue's bullet list):

1. the allowed drawing instruction set and coordinate model (cells, subcell
   raster entries, no vector paths in v1), clipping, and layer rules;
2. the frame/swap model — who presents, when a submission becomes visible, and
   who derives and who attributes damage;
3. buffer ownership and lifetime — host-held buffers, generation-scoped
   leases, `StaleHandle` rejection;
4. compositing and z-order against the chrome surface model;
5. the sandbox boundary: which GRANTS are required (deny-by-default
   capabilities), which accepted budgets charge submission behavior, and the
   mechanism boundary that keeps plugins out of the render hot path;
6. readback denial taxonomy: screenshots, pixel sampling, text extraction, and
   cross-panel capture default to denied (v1) with one explicit future
   capability seam;
7. resource bounds, backpressure, animation, and the rate limiting of
   submissions;
8. accessibility/semantics fallback for plugin-drawn content;
9. migration from the v1 declarative `Text`/`Row`/`Column`/`List` primitives.

Out of scope and owned elsewhere:

- Level 4 protocol registration in any form: no OSC/APC handler registration,
  no structured-output handlers, no route to the accepted `ui.protocol-register`
  grant, and no hook into the VT parser or its replies. The accepted v1 Lua
  surface RFC already refuses Level 4, and this record does not reopen it.
- `register_panel`, `PanelProvider`, `PanelType`, panel lifecycle, `PanelId`,
  and `Panel::render`/`Frame` as a Rust extension trait surface: Panel
  territory under the accepted
  [Panel Runtime RFC](panel-runtime-rfc.md). This contract only defines what
  an authorized plugin may draw **into the content region of an existing
  panel**; how that panel was created is out of scope here.
- The declarative v1 surface itself: `bitty.ui.mount` with the accepted v1 node
  set (`Text`/`Row`/`Column`/`List`) and its slot set stay frozen; this record
  adds no node kind, no slot, and no budget to
  [Rich Presentation RFC](rich-presentation-rfc.md) (see
  [Decoupling from the declarative v1 surface](#decoupling-from-the-declarative-v1-surface)).
- Terminal grid semantics, cursor state, modes, scrollback, and VT parsing
  (accepted, [Terminal State RFC](terminal-state-rfc.md)); drawing never
  writes Terminal Truth, and the child process cannot see drawing bytes at all
  (no echo, no replies).
- Render pipeline internals: three-level damage architecture, panel textures,
  tile damage, and scroll damage stay owned by the
  [Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md);
  this contract only defines the host-derived damage region it hands to that
  pipeline's frame descriptor.
- Per-plugin VM, instruction, memory, task, and queue enforcement ceilings:
  owned by [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  (RC-1, RC-2). This record adds no replacement budget; drawing bounds compose
  inside the accepted envelope.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (plugins may alter presentation but never Terminal Truth),
  invariant 4 (plugins do not execute in the terminal, render, or input hot
  paths), invariant 7 (every untrusted input has size, time, nesting, rate, and
  memory limits),
  and invariant 10 (`bitty --safe` runs with no third-party plugins, therefore
  no drawing surfaces).
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  (accepted): deny-by-default capability grammar, manifest `[capabilities]`
  declaration, consent grant records bound to the manifest hash, and the
  update rule that additions require a permission-diff approval.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the frozen v1 declarative surface and its explicit refusals of
  hot-path events, Level 3 presentation replacement, Level 4 protocol
  registration, and panel providers.
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  (accepted): RC-1 `10^7` VM instructions / `50 ms` wall clock (8 ms warning,
  hard-gated fail-closed suspend) per plugin callback, and RC-2 `32 MiB`
  accounted heap per plugin VM.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): `PanelId != ViewId !=
TerminalId`, generation addressing with `StaleHandle` rejection, and
  focus/overlay envelopes that drawing must not subvert.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  Core-owned layout, decoration, and the no-window-leak rule.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) and
  [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md):
  the fixed ownership tiering (chrome, panel, overlay) that z-order rules must
  reproduce.
- [Terminal State RFC](terminal-state-rfc.md) and
  [Text and Rendering RFC](text-rendering-rfc.md) (draft) for the cell grid
  and cell-geometry vocabulary that the coordinate model references.
- [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) for
  frame-rate and motion budget categories this contract's rate caps feed into.

## Terminology

| Term                  | Meaning                                                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DrawList`            | A bounded, versioned, declarative command sequence a plugin submits for one drawing target; pure data, no callbacks, no handles, no code.                                   |
| `DrawTarget`          | One drawing surface slot bound to a panel the same `(PluginId, Generation)` created; a content-rectangle cell viewport; exactly one active `DrawList` per target.           |
| `DrawCommand`         | One instruction in a `DrawList`; a typed struct with fixed-width or bounded fields only.                                                                                    |
| Cell coordinate space | The coordinate model: `(col, row)` integers relative to the target's viewport, plus bounded subcell offsets; not windows, not absolute pixels.                              |
| Raster entry          | An `Image` command that paints a host-held raster lease inside a clipped subcell rectangle.                                                                                 |
| Image lease           | A host-owned decoded raster the drawing host keeps alive while a `DrawList` references it; bound and attributed to the owning plugin.                                       |
| Frame                 | Core's internal present triangle; never passed to, addressable by, or observable by a plugin.                                                                               |
| Present request       | The single coalesced wake a committed swap arms through the runtime's existing redraw path; no plugin-visible identity, no periodic cadence.                                |
| Host-derived damage   | The cell region the host computes by diffing the previous and next validated `DrawList` at swap, clipped to the target viewport; never plugin-supplied in v1.               |
| `ui.draw`             | Candidate capability: declare and update `DrawList` content into the plugin's own drawing targets (cells, primitives, semantics).                                           |
| `ui.draw.image`       | Candidate capability: additionally create and reference image leases (raster layer).                                                                                        |
| Semantic group        | An accessibility annotation attached to a `DrawCommand` region: role, label, and optional text, mapped into the node shape of the accessibility publication contract (B-5). |

`DrawList` here is the plugin-submitted data plane only. The accepted renderer
pipeline already uses the same spelling for its internal command list
(`Snapshot + Damage -> DrawList -> Surface::present`, per the
[Text and Rendering RFC](text-rendering-rfc.md) and the
[Configuration Model RFC](configuration-model-rfc.md)); the two are different
types with different owners and sources, and no drawing submission reaches or
reuses the renderer-internal list. The collision is recorded as DG-OQ-7 rather
than resolved by this draft.

## Relationship to accepted sources

| Area               | Accepted fact (cite)                                                                                                                                                                             | How this candidate composes (draft)                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sandbox            | Invariants 3 and 4 of the [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)                                                                  | Drawing is presentation-only data submission; the paint conversion runs Core-side in the hot path; plugins receive no renderer, GPU, window, or frame handle at any layer.                                                     |
| Capabilities       | Deny-by-default `[capabilities]` grammar and consent records per the [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) | Two candidate ids (`ui.draw`, `ui.draw.image`) that are in **no** closed set today, so declaring either fails install; acceptance must amend the three closed-set tables and the SDK linter before either is declarable (B-1). |
| Budgets            | RC-1 `10^7`/`50 ms` (hard-gated) and RC-2 `32 MiB` per the [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)            | Every `DrawList` submission is a bridge call charged to the callback like any other host call; RC-2 charges only plugin-side staging inside the VM, and host-retained storage is bounded separately by DC-12 (B-6).            |
| Panel model        | `PanelId`, `StaleHandle`, generation addressing per the accepted [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                       | A `DrawTarget` exists only for a panel the same `(PluginId, Generation)` created; `bitty.draw.open` refuses any other panel with `E_DRAW_NOT_OWNER`, and stale handles are typed rejections, never silent redirection (B-2).   |
| Presentation truth | Presentation never mutates grid semantics or parser state                                                                                                                                        | `DrawList` output is compositor-side decoration over the panel content region; the child process sees nothing and receives no replies generated by drawing.                                                                    |
| Declarative v1     | `bitty.ui.mount` with `Text`/`Row`/`Column`/`List` and closed slot set (accepted v1 surface RFC)                                                                                                 | Untouched; `ui.draw` is a separate grant and a separate data plane. A plugin cannot mix a mounted scene and a `DrawList` in one target; the two are exclusive per target (typed refusal).                                      |
| Language           | English-only canonical documentation policy                                                                                                                                                      | This record adds only English text and links.                                                                                                                                                                                  |

Where this candidate selects a threshold it enumerates the delta locally; it
does not move a requirement between owners, and it creates no bypass.

## Decoupling from the declarative v1 surface

The issue's acceptance clause requires not coupling the drawing contract to the
declarative v1 surface. Decoupling rules:

1. New capability ids only: no amendment to the accepted v1 node set, no
   extension of `SceneNode`, no new slot. Publishing drawing content through
   `bitty.ui.mount` remains available and is the recommended path for content
   an accessibility consumer should read directly.
2. A `DrawTarget` renders only `DrawList` data. Mounted declarative scenes
   belong to their own slots, and a target cannot contain mounted scene
   content — the two surfaces have different buffer owners, so sharing them
   would silently merge two trust boundaries.
3. If both `ui.draw` and `ui.rich` are granted, both may be used, but in
   distinct targets. Crossing them in one target is a validation refusal, not
   a merge.
4. Unknown-surface compatibility is an **install-time** property, not a
   degradation path. The manifest parser refuses any head outside the closed
   set with `unknown capability '{head}' (closed set; forward compat requires
explicit RFC)` (`crates/bitty-package/src/manifest.rs:539`), before a VM
   exists and before `bitty.draw.*` is callable. A package that declares
   `ui.draw` therefore installs only on a host whose closed set contains it;
   there is no detect-then-degrade sequence, because install precedes
   execution and the manifest cannot be chosen at runtime. `E_DRAW_UNAVAILABLE`
   is reserved for the post-install case: a host that admits the head but
   cannot create a drawing surface for this window (headless, no compositor
   surface, or the dormant state B-2 defines) refuses the call and leaves any
   mounted scene untouched.

## Drawing instruction set and coordinate model

Decision: **cell-primary, bounded raster on top, no vector paths in v1.** The
coordinate model is anchored on the accepted cell grid because that is what
reflow, resize routing (`cols = floor(rect.width / cell_width)`), ligature and
shaping contracts already understand; pixel-space geometry would fork the
rendering model and hand plugins DPI-dependent authority.

Coordinate rules:

- Every vertex is a `(col: u16, row: u16)` pair relative to the target's
  viewport origin (the content rectangle of the target), never window-relative
  or screen-absolute.
- Raster entries additionally carry bounded subcell offsets as fixed-point
  cell fractions (`u8` sixteenths: `-8.0 .. 8.0` cells) so images align to
  cell seams without introducing floating-point drift between hosts.
- Fractional and absolute vector machinery (paths, curves, transforms,
  shaders) is refused as a class with `E_DRAW_COMMAND_INVALID` v1 and named a
  v2 open point, because floats-first geometry brings non-determinism that the
  replay guarantee cannot bound.

Closed v1 command set (candidate spellings):

| Command    | Fields (bounded)                                                   | Paints                                                                                                            |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `Cells`    | cell span, color pair, optional style bits                         | a text/cell run (the primary primitive; it can reproduce every v1 node shape)                                     |
| `Rect`     | origin, extent (cells), color, optional border style               | filled rectangle or border box                                                                                    |
| `Line`     | two endpoints (cells), color, style                                | straight horizontal, vertical, or Bresenham-class stepping line                                                   |
| `Image`    | origin (cell + sixteenths), size (cells), lease id, optional blend | raster lease painted with host-side clip and cell-grid alignment; requires `ui.draw.image`                        |
| `Clip`     | origin, extent (cells); stackable, depth DC-3                      | pushes a clip rect every later command inherits at validation time, across both layers; not a paint-order operand |
| `Semantic` | region + role + label + optional text                              | accessibility annotation only: it paints nothing and is not optional for visible content                          |
| `Fence`    | none                                                               | end-of-list marker for deterministic replay hashing; no visual effect                                             |

Refusals by construction: no `Path`, no `Bezier`, no user-defined shaders, no
framebuffer reads, no text-shaping directives, no per-command callbacks,
foreign opcodes, or placeholder-compatible escape bytes. Command encodings are
plain typed data; nothing in a `DrawList` is ever executed, parsed as a
protocol, or reflected into the terminal grid.

Layering within a target is a fixed two-layer model, not user z-ordering:

- layer 0: cell content (`Cells`, `Rect`, `Line`);
- layer 1: raster entries (`Image`), painted above cells, each with alpha
  blending the host implements.

Paint order is a total order on `(layer, command order)`: layer 0 commands
paint in list order, then layer 1 commands paint in list order, so an `Image`
at position 1 paints above a `Cells` at position 9. A `Clip` is not a painting
command and takes no position in that order: it pushes a validated envelope
onto a clip stack, and every later command inherits the intersection of the
stack at validation time, for both layers — an `Image` after a `Clip` is
clipped by it and a `Cells` after the same `Clip` is clipped identically,
whichever layer paints first. A list whose commands cannot be ordered this
way — an unbalanced `Clip`, a depth over DC-3, or a visible command not
covered by a `Semantic` region — is rejected whole with
`E_DRAW_COMMAND_INVALID`; nothing paints.

The colour fields' domain is **not** fixed by this revision: `Cells` colour
pair, `Rect`/`Line` colour, and any image tint may be an RFC-0001
`#RRGGBB[AA]` literal, and no drawing colour resolves through a Core-owned
`content.*` token. Which of literal and plugin-namespace token wins, and the
`AC-1`..`AC-3` contrast and `--safe` forced-pair treatment, remain DG-OQ-8
with an owner; the ambiguity is recorded rather than silently resolved in an
implementation.

This mirrors the accepted compositor vocabulary where one panel already owns
its content and the host decorates it, and it avoids inventing a third
pluggable z-order authority inside a single panel.

## Frame, swap, and damage model

Decision: **the host presents, the plugin only submits.** There is no
plugin-visible frame, no `begin_frame`/`end_frame`, and no failure the plugin
can observe that depends on vsync or GPU state.

### Swap model

1. A `DrawList` submission is validated in host time in the `budget`/`validation`
   classes (bounds, encoding, updates against the previous list, clip depth,
   image-lease liveness). Rejection is all-or-nothing: a rejected list leaves
   the previous list painted; there are no partial applications.
2. A validated list replaces the target's previous list under a host-held
   double buffer in one host step: the host diffs the previous and next
   validated lists first (see [Damage model](#damage-model-allocation-of-responsibility)),
   then the swap commits, then the host marks the target's panel dirty and
   arms exactly one present request through the runtime's existing
   present-only redraw path (`pending_paint_redraw`,
   `crates/bitty-runtime/src/runtime.rs:671-682`; consumed at
   `crates/bitty-runtime/src/runtime/present.rs:2065` and `:2216`; the same
   flag is armed by layout and chrome paint updates at
   `crates/bitty-runtime/src/runtime/layout_focus.rs:732` and
   `crates/bitty-runtime/src/runtime/mouse_chrome.rs:1032`). The request is
   coalesced with every other present source under `min_present_interval`
   (`crates/bitty-runtime/src/runtime.rs:684-694`) and superseded by a later
   commit to the same target (last write wins per target). This is what makes
   a swap visible on an idle window: frame-on-demand with zero periodic
   wakeups (PB-7) is preserved, because the swap supplies the one wake, not a
   cadence.
3. Submission cannot bypass the quantizer: drawing is decoupled from render
   frames and the plugin holds no handle on the scheduler — it cannot force,
   block, delay, or observe a present. "Cannot force a present" therefore
   means no plugin-triggered present loop, not that no present is requested on
   its behalf: the host always requests exactly one per committed swap.
   Plugins cannot learn that it happened, because there is no per-frame event
   and no present identity exposed to Lua (the accepted v1 surface RFC already
   refuses hot-path event names — drawing inherits that refusal).

### Animation and per-frame deltas

Decision: **animation is allowed, paced by the host, and never per-frame.**

- **Pacing is the accepted one-shot timer, re-armed.** A plugin animates by
  calling `bitty.timers.create(delay_ms, callback)` and re-arming one timer
  per tick from inside the callback
  (`bitty-plugins-docs` `sdk/plugin-api-v1-lua-surface-rfc.md:538-556`,
  accepted). There is no `bitty.draw.tick`, no repeating drawing timer, and no
  new pacing primitive: repeating timers remain the `1.x` minor addition the
  accepted surface defers, and a drawing contract is not the place to
  introduce one. The `bitty.draw.tick` spelling is withdrawn from this draft.
- **Every live animation timer is an RC-4 slot.** One armed timer per animated
  target, charged to RC-4's `64` tasks / `32` timers per plugin
  (`bitty-plugins-docs` `runtime/isolation-resource-rfc.md:261`) and refused
  above the cap with the accepted `E_BUDGET_TIMER` (`budget` class,
  `plugin-api-v1-lua-surface-rfc.md:550-552`). `bitty-lua` currently admits
  `REGISTRATION_MAX_TIMERS = 64` (`crates/bitty-lua/src/host.rs:367-374`); the
  acceptance change set includes lowering that admission bound to RC-4's `32`
  (fail closed at the 33rd) so the two tables agree, or amending RC-4 in the
  same acceptance. The mismatch may not survive as drift.
- **DC-7 is per target; DC-10 and DC-11 are per plugin.** DC-7's `30`/s
  applies to one target, so four targets alone would permit `120` callbacks
  per wall second at up to `50 ms` each — a bounded per-callback profile with
  no aggregate bound. DC-10 caps aggregate drawing callbacks at `60` per wall
  second per `(PluginId, Generation)` (burst `120` in `2 s`, one token bucket
  shared by every target) and DC-11 caps drawing CPU at `64 ms` per wall
  second per plugin, measured through the accepted RC-1 accounting. A tick
  that would exceed either ceiling is **dropped, not queued**: the host does
  not invoke the callback, the drop is counted in `bitty.draw.stats`, the last
  good list stays painted, and the plugin sees a counter rather than an error.
- **RFC-0002 composition applies to content animation.** A content animation
  is not a panel transition, so the accepted
  [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
  does not reach it by itself; this contract adopts the same rules: a
  `0..=500` ms duration envelope per animation, collapse to the final
  committed state under reduced motion, collapse to the final state under
  `bitty --safe`, and no interpolation of terminal content — drawn cell text
  is content, not a transitioned surface. An animation declares its duration
  in the submission that starts it; a re-arm past that declared duration is
  dropped by the host and counted, so extending an animation requires a new
  submission with a new declaration rather than an indefinite `30 Hz` loop.
- There is no per-frame Lua entry point tied to actual presents (no `on_frame`,
  no vsync callback, no render-loop hook). A tick is the plugin's own request,
  never the compositor's present count; two presents may show one list and a
  tick may be dropped under DC-10/DC-11.
- Per-frame deltas as a wire format are refused in v1: every submission is a
  full replacement list. Damage already provides the sharing mechanism, and
  a delta codec would add a second truth about what the target paints,
  needing its own replay model. Delta encoding is a v2 open point sized
  against DC-1 if resubmission traffic is measured hot.
- Off-screen surfaces follow [Buffer ownership and lifetime](#buffer-ownership-and-lifetime):
  refused in v1 (DG-OQ-3).

### Damage model (allocation of responsibility)

- **Derived by the host, never declared by the plugin.** There is no `damage`
  field on a `DrawList` in v1, and no `no-damage` shape. At every swap the host
  diffs the previous validated list against the next one, clips the changed
  cell rectangles to the target viewport, and hands that region to the frame
  descriptor. The host already holds both lists, so the diff is exact and
  cannot be under-declared by an untrusted caller; a throttled or dropped
  submission cannot produce a wrong "changed since" reading, because nothing
  on the plugin side is consulted. A declared-damage optimization returns only
  as a v2 open point gated on the damage pipeline landing, with the
  drop/under-declaration case worked through.
- **The damage pipeline is a candidate and the shipped present is full-frame.**
  The owning record is the
  [Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md),
  whose own built-versus-not-built section states that no damage or
  invalidation system exists in `bitty` today. The combined present sets
  `FrameMode::Full` with a full-surface dirty rect, and the source says the
  scene regions "add no paint work here"
  (`crates/bitty-runtime/src/runtime/present.rs:7170-7205`). Host-derived
  damage is therefore **accounting-only** in v1: computed, attributed, and
  available to the partial planner, but it changes no pixel until that
  architecture is accepted and the partial path carries panel content. This
  record claims no paint-saving benefit it cannot deliver.
- **No present-tick counter and no self-healing resubmission.** Presents are
  frame-on-demand behind an `8 ms` PTY settle gate (`PRESENT_SETTLE_MAX`,
  `crates/bitty-runtime/src/runtime.rs:414`), so there is no tick identity to
  index and no cadence that would run a periodic full-damage repair on an idle
  window. The `128` present-tick resubmission is deleted. Staleness cannot
  arise from a missing repair: the host owns the previous list and repaints
  the committed list on every present it is asked for, and a target that is
  never presented is unpresented rather than stale — B-7's present request is
  what ends that state.

## Buffer ownership and lifetime

Decision: **the host owns every byte.** There is no plugin addressable
off-screen surface and no zero-copy handoff in v1.

- The `DrawList` buffer, decoded command storage, and the swap pair are
  host-owned; the plugin sends a serialized list and receives a typed result.
  Fields can be changed by a later submission, but the previous painted
  picture does not race plugin code: it is never mutated in place.
- **Retained bytes are bounded and attributed (DC-12).** Per
  `(PluginId, Generation)` the host retains at most DC-8 targets × two swap
  buffers × DC-1 serialized bytes, plus the decoded form of both buffers
  bounded at twice the serialized size: `2 MiB` serialized, `4 MiB` decoded,
  `6 MiB` retained per generation, with the host-wide total charged to RC-3's
  `512 MiB` aggregate plugin envelope
  (`bitty-plugins-docs` `runtime/isolation-resource-rfc.md:258`). The charge
  is taken at validation, carried by the swap, priced per generation, released
  on generation unwind, and reported through `bitty.draw.stats`. Over-limit
  refuses the new list with `E_DRAW_STORAGE_BUDGET` and leaves the previous
  list painted — the same no-eviction direction as DC-5/DC-6.
- The retained buffer is **not** returned to the allocator while it is the
  painted list; it is released at the swap that replaces it or at generation
  unwind. Only the plugin-side serialized staging buffer, when it is a Lua
  string inside the VM, is charged to RC-2: RC-2 is the per-VM Lua heap
  (`RuntimeBuilder::memory_limit` plus `Lua::total_memory()`,
  `crates/bitty-lua/src/lib.rs:45`, `crates/bitty-lua/src/gate.rs:24`) and has
  no path to debit a host-side `Vec<DrawCommand>` or a swap buffer.
- Image leases are host-owned decoded rasters, refcounted per list; bringing
  a lease online requires `ui.draw.image`; the lease release requires no
  redraw (it ages out only at the next list swap or full-damage resubmission).
- Lifetime is generation-scoped. All target and lease handles are valid only
  for the submitting `(PluginId, Generation)`; a host/plugin generation change
  unwinds leases and targets before the new generation starts, matching the
  accepted panel `StaleHandle` semantics. A drawing target's content dies
  with the generation (no persistence across reloads; a plugin re-submits).
- Handles are non-recyclable newtype ids; no handle value is reissued within
  a generation, and `E_DRAW_HANDLE_STALE` (runtime) is the only stale-handle
  outcome.

Refused in v1: plugin-requested off-screen render-to-texture surfaces, because
they add a second buffer manager, a second trust boundary, and a second
memory attribution path for a use case the image-lease model already covers.
Recorded as open point DG-OQ-3 for v2 with explicit bounds preconditions.

## Compositing and z-order versus the chrome surface model

Decision: **drawing cannot escape its target rectangle and cannot add a
z-order layer.** The compositor's ownership tiers are unchanged, stated as the
direction they are: the [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)
records the ordering as a direction, not as an accepted layer order, and this
record does not convert it into one:

`chrome bands (tabline/statusline/left/right/top/bottom)` — `panel contents` — `overlay`

Concretely:

- A `DrawTarget`'s world is the content rectangle of one panel content
  region. Coordinates are clamped to the target viewport; drawing outside is
  clipped host-side before compositing; the clip is silent because it is a
  safety boundary, and a plugin cannot request an unclipped surface.
- The overlay slot, chrome bands, modal authority, and the `4+1` overlay
  envelope are all owned outside (see
  [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) and
  [Chrome Surface API (Candidate)](chrome-surface-api-candidate.md)); drawing
  adds no owner, tier, or escape into them. Any plugin that wants to draw
  over chrome bands must use the existing declarative chrome-surface APIs,
  not draw commands.
- A target keeps the compositor's accepted decoration, gaps, and inset
  contract (`gaps_in 6`/`gaps_out 6`/`content_inset 6` per the
  [Workspace Compositor Specification](workspace-compositor.md)); a plugin
  drawing surface cannot consume chrome geometry or decoration.
- Multiple drawing targets exist because one plugin can own several panels;
  they are composited per-panel at the accepted panel layer, ordered by the
  compositor's accepted tree, and never by a plugin-declared z value.

## Sandbox boundary, grants, and budgets

Decision: **two deny-by-default capability grants, host-time validation, and
no plugin-side paint work.** The mechanism boundary is a one-way data flow:
`plugin Lua -> serialized DrawList -> host validation -> host-owned renderer`.
No step lets plugin code run, allocate, or obtain a pointer/Frame/GPU/context.

GRANTS required (declared under the accepted `[capabilities]` grammar, denied
by default, consent flow per the
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)):

| Grant           | Unlocks                                                                                                    | Refusal when absent   |
| --------------- | ---------------------------------------------------------------------------------------------------------- | --------------------- |
| `ui.draw`       | `bitty.draw.open/list/close` — cell/primitive submission, semantic groups, and `bitty.draw.stats` counters | `E_CAPABILITY_DENIED` |
| `ui.draw.image` | additionally image leases (`bitty.draw.image`)                                                             | `E_CAPABILITY_DENIED` |

`ui.draw` and `ui.present` divide draw authority in one sentence: `ui.present`
raises an already-mounted declarative block as a non-focusable presentation
surface above the focused view (`crates/bitty-lua/README.md:47-65`), while
`ui.draw` submits cell and raster data into a panel content region. They are
separate heads, neither implies the other, and `ui.draw` does not extend
`ui.present` — which is why accepting it requires the closed-set amendment
rather than a reading of an existing head.

There are exactly two identifiers, and neither is in a closed set today (B-1).
There is no `ui.draw.readback`: reserving an identifier that unlocks nothing is
the phantom authority the plugin ecosystem already treats as a defect, and the
parser cannot represent "declared but inert" in the first place
(`crates/bitty-package/src/manifest.rs:539`). `bitty.draw.stats` sits inside
`ui.draw` rather than behind its own head, returns content-free counters only
(drop counts, retained-byte totals, throttle state — never command text,
labels, or pixels), and is rate-limited like any other bridge call.

Grant placement consequences:

- `[capabilities] ui.draw` is a separate grant from `ui.rich`, mirroring the
  owner-established least-privilege precedent that "render a scene" and
  "occupy a panel" must not imply each other
  ([Panel GUI Content Presentation (Candidate)](panel-gui-content-presentation-candidate.md)).
- Adding `ui.draw` in an update requires the accepted permission-diff
  approval; it is not in the default distribution and `bitty --safe` grants
  nothing.
- Capability coercion is impossible: the host validates grants at the
  submission boundary, never by namespace convention, and the at-most-one
  active-list-per-target rule is enforced by handle identity, not by plugin
  bookkeeping.
- **A target exists only for the panel its creator owns (B-2).**
  `bitty.draw.open` names a panel the requesting `(PluginId, Generation)`
  created; any other panel is refused with `E_DRAW_NOT_OWNER`, defined against
  the panel rather than against a target ordinal. A target over a
  terminal-backed panel is refused unless the same generation owns both the
  panel and the `TerminalId` behind it, so drawn cells can never be read as
  terminal output (invariant 3). No target may name a panel that already hosts
  mounted declarative content.
- **`ui.draw` is dormant under the accepted v1 surface.** The accepted v1 Lua
  surface gives a plugin seven mount slots and explicitly refuses
  `register_panel`, `PanelId`, `PanelProvider`, and panel lifecycle
  (`bitty-plugins-docs` `sdk/plugin-api-v1-lua-surface-rfc.md:31-32`,
  `:403-406`, `:613`). None of the seven slots is a draw target, so the target
  set is empty by construction: `ui.draw` binds to no slot, opens nothing, and
  stays dormant until a panel provider/lifecycle contract is accepted. Binding
  it to a slot instead would create the panel ownership the accepted surface
  refuses, which is the second reading B-2 rejects.

Budgets applied (all accepted ceilings survive unchanged; this contract adds
only throttle values, per the
[Performance Budget RFC](performance-budget-rfc.md) numbers-are-contracts
convention):

- **RC-1** `10^7` VM instructions / `50 ms` wall clock (8 ms warning,
  fail-closed suspend) per plugin callback: every `bitty.draw.*` bridge call
  executes inside a callback in the accepted way and is charged like any other
  host call. The wall-clock credit amendments (store-commit, supervised
  spawn-wait) do not apply; drawing work is plugin CPU work.
- **RC-2** `32 MiB` accounted heap per plugin VM: charges only what lives
  inside the VM — the plugin-side serialized staging string and any Lua-side
  buffer held while building a list. It cannot and does not charge a host-side
  decoded list or swap buffer (`crates/bitty-lua/src/lib.rs:45`,
  `crates/bitty-lua/src/gate.rs:24`); host-retained drawing bytes are bounded
  by DC-12 instead (B-6).
- **New bounded envelopes below** (DC-1..DC-12) cap how much drawing work a
  plugin can enqueue, independent of RC-1/RC-2.

Mechanism boundary (what makes the invariant hold regardless of plugin
behavior):

1. Drawing surfaces live behind generic handles the plugin cannot dereference;
   every host object a plugin ever receives is an opaque index into a
   Core-owned table with a generation stamp.
2. The paint conversion (`DrawList` → pixels) runs Core-side in one
   contiguous host span. Lua never runs there, and the accepted v1 surface
   RFC's refusal of hot-path event names (`byte-received`, `cell-changed`,
   `damage`, `glyph-rendered`, per-frame) is inherited: no such hook exists
   for drawing either.
3. No native code: the candidate instruction grammar has no code path, no
   callback, and no name mangling that could smuggle one. A `DrawCommand`
   carries no callable.
4. Unbounded command streams are refused structurally: a `DrawList` is a
   fixed-shape bounded buffer, its commands are depth-checked, submission rate
   is throttled per target (DC-7) and per plugin (DC-10 rate, DC-11 CPU), and
   its retained storage is capped (DC-12). Backpressure is visible to the
   plugin as typed drop telemetry: `bitty.draw.stats` returns drop counts and
   retained-byte totals with no payload growth.
5. Deterministic replay: `DrawList`s are pure data plus a u64 `Fence` tag, so
   a test can append identical submissions to a target, replay them in host
   order, and expect an identical host-side frame digest, satisfying the
   issue's determinism-in-existence test hook without new tooling.

## Readback rules (readback denial taxonomy)

Decision: **default deny everything, in v1, permanently for cross-panel.**

| Path                                   | v1 status                          | Owner of the alternative                                                                                                  |
| -------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Screenshot of own panel                | refused (`E_DRAW_READBACK_DENIED`) | `[capabilities] debug.trace` + accepted DevTools frame capture with redaction and user-only storage; never `ui.draw`      |
| Pixel sampling out of any target       | refused                            | as above; sampling stays a devtools-scoped host operation                                                                 |
| Text extraction from a drawing surface | refused by design                  | the plugin itself owns the strings it drew; it reads them back from its own plugin state, which the host never re-derives |
| Cross-panel capture                    | refused permanently                | nobody; capture of another plugin's panel content is a trust boundary escalation, no capability unlock exists             |
| Image-lease pixel reads                | refused (write-only leases)        | the plugin encoded the raster; it already holds the pixels it intends to state                                            |

Those denials are scoped to the `bitty.draw.*` surface: no call there returns
pixels, post-composite cells, or another target's content, and there is no
identifier — reserved, inert, or otherwise — that a manifest could declare to
unlock one. A plugin may always read what it submitted or owns in its own
state; only the post-compositing surface is invisible on this surface. A
future readback capability introduces its own identifier in the amendment that
defines its scope and its redaction pipeline, because reserving inert
authority now would teach manifests to declare authority no code enforces.

**Out of scope: the devtools capture path.** `bitty.debug/captureFrame` accepts
`format: "pixels"` and is not part of this contract. It is Implemented-only
under the DevTools RFC's Amendment A1 (`specifications/devtools-rfc.md:470-481`),
gated by `debug.trace` plus a per-session automation bearer for one terminal
plus the per-call `format` opt-in, chunked at `256 KiB` outbound, and audited;
no `ui.draw` grant participates and no drawing grant widens it. Whether a pixel
capture can include compositor-side drawing painted over a terminal-backed
panel is **not settled by this record** and is carried as DG-OQ-9 with the
devtools owner. Until it is settled, the table above must not be read as a
statement about `captureFrame`.

## Bounds

Numbers follow the numbers-are-contracts convention: tests must parameterize
on these values; changing a bound requires an RFC revision, never silent
drift.

| Id    | Dimension                                               | Bound                                                                                        | Over-limit behavior                                                                     |
| ----- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| DC-1  | Serialized `DrawList` size per submission               | `256 KiB`                                                                                    | `E_DRAW_TOO_LARGE` (`budget`); previous list stays painted                              |
| DC-2  | Commands per `DrawList`                                 | `4096`                                                                                       | `E_DRAW_TOO_LARGE` (`budget`)                                                           |
| DC-3  | `Clip` stack depth per list                             | `16`                                                                                         | `E_DRAW_COMMAND_INVALID` (`validation`)                                                 |
| DC-4  | Image lease bytes per image, decoded                    | `1 MiB`                                                                                      | `E_DRAW_IMAGE_TOO_LARGE` (`budget`)                                                     |
| DC-5  | Leased image bytes per plugin generation                | `4 MiB` (floor `256 KiB`)                                                                    | `E_DRAW_IMAGE_BUDGET` (`budget`); no eviction                                           |
| DC-6  | Active leases per plugin generation                     | `32`                                                                                         | `E_DRAW_IMAGE_BUDGET` (`budget`); release first                                         |
| DC-7  | Submissions per wall second per target                  | `30` sustained; burst `60` in `2 s` (token bucket: capacity `60`, refill `30`/s, per target) | throttle-drop with typed counters; the drop never touches the last good list            |
| DC-8  | Drawing targets per plugin generation                   | `4`, each with exactly one active list                                                       | `E_DRAW_TARGET_BUDGET` (`budget`)                                                       |
| DC-9  | Semantic groups plus labels per `DrawList`              | `1024` total                                                                                 | `E_DRAW_SEMANTIC_BUDGET` (`budget`)                                                     |
| DC-10 | Drawing callbacks per wall second per plugin generation | `60` sustained; burst `120` in `2 s` (one bucket across all targets)                         | drop the tick before the callback; counted in `bitty.draw.stats`; last good list intact |
| DC-11 | Drawing CPU per wall second per plugin generation       | `64 ms`, measured through RC-1 accounting                                                    | drop further ticks for the remainder of the window; counted                             |
| DC-12 | Retained drawing bytes per plugin generation            | `6 MiB` (`2 MiB` serialized + `4 MiB` decoded, DC-8 × 2 × DC-1 with a `2×` decoded factor)   | `E_DRAW_STORAGE_BUDGET` (`budget`); previous list stays painted; no eviction            |

DC-1 and DC-2 are jointly satisfiable because the per-command encoding is
budgeted rather than open-ended: a fixed `24`-byte command header (tag, flags,
rect), `Cells` text at most `480` bytes, `Semantic` label at most `256` bytes
and its optional text at most `1024` bytes, and fixed-width rect, colour, and
style fields. A `4096`-command list of headers alone is `96 KiB` and fits
DC-1; a list that reaches `256 KiB` with average-sized commands holds far fewer
than `4096` commands, so DC-2 binds only on header-shaped lists and DC-1 binds
on text-heavy ones. The host checks the running encoded total at encode and
validation time and refuses the crossing command with the DC-1 or DC-2 code
respectively.

Composition with accepted ceilings: DC-1..DC-11 cap enqueueing and pacing;
DC-12 bounds host-retained drawing bytes and composes with RC-3's aggregate
envelope; RC-1 caps each callback; RC-2 caps only plugin-side VM allocations
(staging string, image-attribution staging). No drawing bound relaxes an
accepted ceiling and no accepted ceiling replaces a drawing bound.

## Typed failure taxonomy

Failures are typed bridge errors in the accepted classes (`runtime`,
`validation`, `budget`, `resolution`), always naming the rule — never the
payload — per the accepted failure-semantics precedent.

| Condition                                                                                                            | Class        | Code                               | Effect                                                     |
| -------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------- | ---------------------------------------------------------- |
| Missing `ui.draw` / `ui.draw.image` grant                                                                            | `runtime`    | `E_CAPABILITY_DENIED`              | No side effect.                                            |
| Head admitted but no drawing surface for this window (headless, no compositor surface, or `ui.draw` dormant per B-2) | `runtime`    | `E_DRAW_UNAVAILABLE`               | No surface appears; any mounted scene is untouched.        |
| Visible command not covered by a `Semantic` region                                                                   | `validation` | `E_DRAW_COMMAND_INVALID`           | Whole list rejected; nothing painted.                      |
| Retained drawing bytes over DC-12                                                                                    | `budget`     | `E_DRAW_STORAGE_BUDGET`            | New list refused; previous list stays painted.             |
| Aggregate drawing rate or CPU over DC-10 / DC-11                                                                     | `budget`     | drop (counted, no error)           | Callback not invoked; last good list intact; counter only. |
| Stale target, lease, or generation mismatch                                                                          | `runtime`    | `E_DRAW_HANDLE_STALE`              | Nothing changes.                                           |
| Target already owned by this generation (`open` twice), or not owned by caller                                       | `runtime`    | `E_DRAW_NOT_OWNER` / `E_DRAW_BUSY` | Existing list stays painted.                               |
| Readback attempted                                                                                                   | `runtime`    | `E_DRAW_READBACK_DENIED`           | Denied fully, typed reason, no partial read.               |
| Off-screen surface requested                                                                                         | `runtime`    | `E_DRAW_OFFSCREEN_DENIED`          | v1 refusal (open point DG-OQ-3).                           |
| Malformed list, unknown opcode, command depth overrun, `Clip` overflow or unbalanced                                 | `validation` | `E_DRAW_COMMAND_INVALID`           | Whole list rejected; nothing painted.                      |
| List exceeds DC-1 / DC-2, rate exceeded DC-7 / DC-10 / DC-11, lease DC-4/DC-5/DC-6, or semantic DC-9                 | `budget`     | `E_DRAW_*` per row                 | Rejected or throttled; last good list intact.              |
| Stats or telemetry queries beyond the per-second query cap                                                           | `budget`     | `E_RATE_LIMITED`                   | Backoff; no data.                                          |

An older host that does not admit `ui.draw` never reaches this table: the
manifest is refused at install with `unknown capability '{head}' (closed set;
forward compat requires explicit RFC)` (`crates/bitty-package/src/manifest.rs:539`).
`bitty --safe` runs no plugin VM at all (invariant 10), so there is no drawing
call in existence to fail with `E_DRAW_UNAVAILABLE`.

## Accessibility and semantics fallback

Decision: **a `Semantic` annotation is mandatory for visible content, and
drawn content is not announced until an accepted accessibility contract
publishes it.** Those are two separate facts and are stated separately.

- **What this contract enforces.** Every visible `DrawCommand` region must be
  covered by a `Semantic` region carrying a role; a list whose visible commands
  are not covered is rejected whole with `E_DRAW_COMMAND_INVALID`
  (`validation`). There is no silent `role: image, label: ""` fallback and no
  painted-but-unannotated state: the draft's two rules for one property are
  collapsed into the refusal, the only rule an implementation can make
  deterministic. Decorative content is annotated as `role: image` with
  `decorative: true`; that flag is the only case in which an empty label is
  accepted, and the region is still a node, not an omission.
- **What the shipped code does not do.** The scene path builds a per-frame
  accessibility projection through a scratch `UiSnapshotHost`, one per frame,
  dropped with the frame; its module documentation states that the scene text
  "is not published to the window's accessibility tree"
  (`crates/bitty-runtime/src/runtime/scene_present.rs:1-58`; the
  `SceneA11yRun` docs at `:80-95` repeat that it is parity evidence, not a live
  node). There is no publication path for panel or drawing content into the
  window tree today, and no accepted contract owns one — the
  [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) is
  a candidate.
- **Therefore the claim is narrowed, not asserted.** This contract does not
  promise that drawn content is announced. Live-tree publication is an
  explicit prerequisite owned by an accepted accessibility contract, and
  `ui.draw` acceptance is gated on it; until it lands, drawn content is **not
  announced**. The mapping this contract will hand that contract is fixed
  here so the shapes cannot drift: one node per `Semantic` group, identity
  `(PanelId, target ordinal, semantic group index)`, bounds the group's cell
  region converted to pixels through the live cell metrics, role and label from
  the command, children in list order then spatial fallback, and no node for
  `Clip`, `Fence`, or any command that paints nothing.
- A panel drawing content keeps its focus/keyboard contract unchanged from the
  accepted panel model; drawing adds no input authority. Accessibility
  activation is the interaction label, not cursor math or hit-box registration.
- The per-target coarse summary entry belongs to the same prerequisite
  contract. Until that contract publishes nodes, neither the summary nor the
  semantic groups are visible to assistive technology, and the verification
  plan tests the pre-publication refusal rather than an announcement.

## Migration from the v1 declarative primitives

The drawing contract must be adoptable without a forced cutover:

1. The v1 `Text`/`Row`/`Column`/`List` node shapes have mechanical `Cells`-
   series equivalents, so a plugin can generate a `DrawList` that paints the
   same rectangles when it needs a single-frame static image. Rendering
   visual parity is a test-verified property (see Verification plan), not an
   implementation courtesy.
2. The recommended state machine is: `bitty.ui.mount` (allowed in parallel,
   separate slots) for semantics-facing text, `bitty.draw.*` for
   presentation-only visuals (charts, previews, canvas-like content), and
   never bridging one into the other. A plugin migrating off a v1-only surface
   keeps both grants adopted per target, so the upgrade path is incremental.
3. Freezing: this candidate proposes no deprecation of `bitty.ui.mount` and
   no period where one path is "more correct." The goal is the issue's plain
   ask: a second capability seam, decoupled from v1, that v1 plugins can
   adopt without breaking.

## Security review

| Threat (accepted threat-model vocabulary) | Possible attack via drawing                                                              | Bound maintaining the invariant                                                                                                                                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-06 plugin escape                        | Opaque opcodes, malformed depth, or handle confusion leading to renderer-side code paths | Bounded AST grammar; typed `validation` rejections; every handle is a table index with a generation stamp; no native surface in the grammar; the grant is undeclarable until the closed-set amendment lands (B-1) |
| T-13 Terminal Truth mutation              | Draw commands echoing into the grid or replying                                          | Drawing data plane is compositor-side only; no path into the VT parser; no replies generated                                                                                                                      |
| T-07 starvation                           | Unbounded submission rate starving other panels' damage budgets                          | DC-7 per target plus DC-10 aggregate rate and DC-11 CPU with counted drops; the swap's single present request is coalesced, not paced                                                                             |
| T-01 parser wedge                         | Content smuggled as escape sequences inside text runs                                    | `Cells` text is enclosed in a typed span; no protocol reinterpretation; no panel content reaches the parser                                                                                                       |
| T-11 trace/crash-report credential leak   | Readback of other panels' pixels, or steganographic raster leaks                         | Readback taxonomy deny-all on `bitty.draw.*`; separate image leases; the devtools capture path is out of contract, gated by `debug.trace` + bearer + opt-in, and its drawing coverage is DG-OQ-9                  |
| T-09 IPC takeover                         | Drawing surfaces used as an unscoped command channel between plugins                     | Drawing targets are per-plugin private; no message passing, no inter-plugin effect surface                                                                                                                        |

Invariants 3, 4, 7, and 10 bind this contract; the Security Overview's
release-blocking set stays `1, 5, 6, 7, 8`, so drawing adds no release blocker
and weakens none. Any amendment that adds a readback, per-frame event,
off-screen surface, or cross-panel data flow must repeat the P0
security-review gate.

## Blocking findings closed in this revision

The independent review in `bitty-docs`
`docs/security/plugin-drawing-capability-review.md` returned **`NEEDS-FIX`**
with seven blocking findings. This revision closes each one with a mechanism
stated in the body, in the review's own order. Closing a finding is not a
verdict change: the review reached `NEEDS-FIX` on the previous revision and
this revision requires re-review by diff before any acceptance decision.

| Finding                                                                                       | Mechanism that closes it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Where                                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-1 — grant absent from the closed set, degradation path unreachable                          | The acceptance change set names every closed-set surface (`bitty-package` `CLOSED_CAPABILITY_HEADS` at `manifest.rs:345-366`, `bitty-plugin-host` `CapabilityFamily::Ui::closed_identifiers` at `capability.rs:151-163`, the SDK linter table, the SDK `host-surface` mapping, the accepted identifier table, the surface manifest). Compatibility moves to install time: an undeclaring host refuses the manifest at parse (`manifest.rs:539`), so there is no detect-then-degrade promise; `E_DRAW_UNAVAILABLE` survives only for post-install surface absence. `ui.draw.readback` is deleted. `ui.draw` and `ui.present` divide authority in one sentence. Negative validator fixtures are listed. | [Decoupling rule 4](#decoupling-from-the-declarative-v1-surface), [Grants](#sandbox-boundary-grants-and-budgets), [Taxonomy](#typed-failure-taxonomy) |
| B-2 — no v1 panel to draw into, ownership rule ambiguous                                      | A `DrawTarget` is created only by the `(PluginId, Generation)` that created its panel; `bitty.draw.open` on any other panel is `E_DRAW_NOT_OWNER`; a target over a terminal-backed panel is refused unless the same generation owns the panel and the terminal behind it. `ui.draw` is **dormant**: acceptance is gated on a panel provider/lifecycle contract, it binds to none of the seven v1 slots, and the v1 target set is therefore empty by construction.                                                                                                                                                                                                                                     | [Grants](#sandbox-boundary-grants-and-budgets), [Affected contracts](#affected-contracts), [Open points](#open-points)                                |
| B-3 — repeating pacing primitive contradicts the accepted timer surface; no aggregate ceiling | `bitty.draw.tick` is withdrawn. Animation is `bitty.timers.create(delay_ms, callback)` (one-shot in v1, `plugin-api-v1-lua-surface-rfc.md:555`) re-armed per tick, charged to RC-4 (`isolation-resource-rfc.md:261`) with the `32`/`64` mismatch reconciled in the change set. DC-10 caps aggregate callbacks per plugin (`60`/s, burst `120`/`2 s`) and DC-11 caps drawing CPU at `64 ms` per wall second, both with counted drops. RFC-0002's `0..=500` ms envelope, reduced-motion collapse, `--safe` collapse, and no-interpolation rule apply to content animation.                                                                                                                              | [Animation](#animation-and-per-frame-deltas), [Bounds](#bounds)                                                                                       |
| B-4 — declared damage folds into a draft pipeline and its fallback cannot fire                | Damage is host-derived: at every swap the host diffs the previous and next validated lists, clips to the viewport, and removes the plugin `damage` field entirely. The `128`-present-tick resubmission is deleted (presents are frame-on-demand behind an `8 ms` settle gate). The damage architecture is described as the candidate it is, and host-derived damage is stated to be accounting-only while the shipped present is `FrameMode::Full` (`present.rs:7170-7205`). DG-OQ-1 is no longer a damage dependency.                                                                                                                                                                                | [Damage model](#damage-model-allocation-of-responsibility), [Built versus not built](#built-versus-not-built)                                         |
| B-5 — accessibility claim rests on an unpublished tree                                        | The claim is narrowed: live-tree publication is an explicit prerequisite owned by an accepted accessibility contract, drawn content is **not announced** until it lands, and the shipped projection is described as per-frame parity evidence (`scene_present.rs:1-58`). `Semantic` becomes mandatory with a typed `validation` refusal, and the node identity/bounds mapping is fixed here.                                                                                                                                                                                                                                                                                                          | [Accessibility](#accessibility-and-semantics-fallback)                                                                                                |
| B-6 — "the host owns every byte" had no ceiling and RC-2 cannot debit host storage            | DC-12 bounds retained drawing bytes per `(PluginId, Generation)` at `6 MiB` (serialized + decoded, targets × swap buffers), charges RC-3's aggregate envelope, attributes per generation, releases on unwind, reports through `bitty.draw.stats`, and refuses over-limit with `E_DRAW_STORAGE_BUDGET`. RC-2 is stated to charge only VM-side allocations. The retained painted buffer is stated not to return to the allocator before its replacing swap.                                                                                                                                                                                                                                             | [Buffer ownership](#buffer-ownership-and-lifetime), [Bounds](#bounds)                                                                                 |
| B-7 — visibility promised at a present nothing schedules                                      | The swap commits, marks the panel dirty, and arms exactly one present request through the runtime's existing present-only redraw path (`pending_paint_redraw`, `runtime.rs:671-682`, consumed at `present.rs:2065`/`:2216`), coalesced with other sources under `min_present_interval` and superseded per target. "Cannot force, block, or observe" is defined as no scheduler handle, not as no present on the plugin's behalf. Ordering is stated on that wake path, not on an unnamed tick.                                                                                                                                                                                                        | [Swap model](#swap-model), [Bounds](#bounds)                                                                                                          |

## Verification plan

- **Bounds tests** (headless): DC-1..DC-9 each exercised at the bound (a
  success round-trip) and past the bound (typed rejection class, no partial
  paint side effect). Parameters are the declared constants, never literals.
- **Denial tests** (headless): missing grant, missing feature, stale handle,
  readback, off-screen, non-owner and busy cases produce the exact typed
  code per the taxonomy table and no visible change.
- **Determinism tests** (headless): replay to identical host frame digest —
  same submission sequence, same digest, byte-for-byte; a single-field change
  must not shift unrelated cells (damage locality spot-check).
- **Parity test** (headless; `Implemented`-only evidence, not `Verified`): a
  v1 declarative scene rendered through `Cells`-series mapping must produce
  the
  same accessibility node sequence and cell content as its
  `bitty.ui.mount` equivalent within documented clipping rules.
- **Rate/backpressure tests**: DC-7 bursts converge to sustained rate with
  visible typed counters; the last-good-list guarantee holds under total
  submission flood.
- **RC composition test**: one submission loop inside RC-1's fail-close
  window still suspends correctly at RC-1 and leaves the last good list
  painted, proving the insert order does not let DC values overpower
  accepted ceilings.
- **Install-refusal test (B-1)**: a manifest declaring `ui.draw` on a host whose
  closed set lacks it is refused at parse with the closed-set error, never
  admitted and never failing later with `E_DRAW_UNAVAILABLE`; the negative
  fixtures are `ui.draw.image` without `ui.draw`, an unknown `ui.draw.*` head,
  and any readback id.
- **Ownership tests (B-2)**: `E_DRAW_NOT_OWNER` for a panel the requesting
  generation did not create, for a panel created by another plugin, and for a
  terminal-backed panel whose terminal the same generation does not own; a
  dormant `ui.draw` produces `E_DRAW_UNAVAILABLE` and paints nothing.
- **Aggregate pacing tests (B-3)**: four targets at DC-7 saturation stop at
  DC-10 and DC-11 with counted drops and an intact last good list; the 33rd
  live timer is refused with `E_BUDGET_TIMER`; an animation past its declared
  duration is dropped rather than extended, and the reduced-motion and
  `--safe` cases present the final state immediately.
- **Retained-byte tests (B-6)**: DC-12 at its bound succeeds, one byte past it
  returns `E_DRAW_STORAGE_BUDGET` with the previous list painted, attribution
  appears in `bitty.draw.stats`, and the charge is released on generation
  unwind.
- **Host-diff repaint test (B-4)**: a throttled-then-retried submission paints
  the correct result with no plugin-supplied damage, and a submission that
  changes one cell reports exactly that cell to the frame descriptor.
- **Idle-visibility test (B-7)**: on an idle window a committed swap arms one
  present request, the panel is dirty, a frame presents, and no event, callback,
  or handle reaches Lua.
- **Semantics tests (B-5)**: an un-annotated visible target is refused at
  validation; an annotated target produces the fixed node sequence through the
  accessibility channel the prerequisite contract names, and pre-publication
  asserts that nothing is announced rather than asserting an announcement.

## Alternatives considered

| Alternative                                                                        | Trade-off                                                                                                                                                                        | Disposition                                                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Adopt `Panel::render(&mut Frame)` as a plugin API (the issue's named anti-shape)   | First-class immediacy and full expressiveness; hands plugins renderer/GPU/window objects and executes Lua inside the paint path                                                  | **Rejected**: violates sandbox invariant 4 by construction; anti-requirement                                            |
| Immediate-mode per-frame Lua callbacks (`on_draw(frame)` per vsync)                | Smallest new API set; but Lua executes in the present path and scales CPU with frame rate                                                                                        | **Rejected**: the accepted per-frame event refusal already covers this                                                  |
| Extend `SceneNode` with drawing nodes instead of a separate contract               | One surface, one grant; but it reopens the accepted frozen v1 surface spec, couples "declares semantics" with "draws pixels," and needs a v2 attack surface on every node change | **Rejected**: the issue demands a separate RFC and a separate capability                                                |
| Full pixel surfaces with plugin-requested offscreen buffers                        | Unlimited UI expressiveness and canvas parity; new memory class, async GPU hazards, and pixel-readback temptation                                                                | **Deferred** as v2 open point DG-OQ-3 with preconditions                                                                |
| Vector path command (`Path`) in v1                                                 | Charts and diagrams flow naturally; float geometry hurts determinism, replay, a11y mapping, and clip math                                                                        | **Deferred** to v2; `Cells`- and `Line`-based approximations cover v1                                                   |
| Z-order control inside a target (`bring_to_front` per command)                     | Fine-grained layering; but plugins gain intra-panel layer authority that the compositor would have to arbitrate                                                                  | **Rejected**: fixed two-layer model keeps compositing authority Core-side                                               |
| Capability-gated `bitty.draw` scope split (`ui.draw.text` + `ui.draw.image` + ...) | Smallest grant per plugin; multiplies consent surfaces and grants drift risk                                                                                                     | **Deferred**: two grants cover v1; split later if needed                                                                |
| Readback behind a reserved `ui.draw.readback` identifier                           | Useful dashboards could self-debug screenshots; moves sensitive-data risk into the plugin trust domain, and reserves authority no code enforces                                  | **Rejected** as a reserved id: a future amendment introduces its own id with its scope and redaction pipeline (DG-OQ-3) |

## Built versus not built

None of this contract is implemented. Re-verified for this revision on
2026-11-04 from `bitty` `origin/main` at `11976dd5`, `bitty-plugin-sdk`
`origin/main` at `9d61b1d`, and `bitty-plugins-docs` `origin/main`; the
`bitty` workspace has no `ui.draw` or `bitty.draw` identifier under `crates/`.

- the `ui` capability family and the `bitty.ui.mount` declarative slot
  surface exist (accepted v1 surface RFC); `ui.draw`, `ui.draw.image`, and
  `bitty.draw.*` do not;
- a panel content-region drawing target, `DrawList` validation, image
  leases, swap pairs, and the deterministic frame-digest test hook do not
  exist;
- host-derived damage has a consumer seam — the frame descriptor — but the
  damage pipeline it feeds is itself a candidate architecture
  ([Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md)),
  and the shipped combined present paints `FrameMode::Full`; the damage this
  contract computes is accounting-only until that record is accepted and the
  partial path carries panel content;
- the accessibility publication path this contract maps into does not exist:
  the scene projection is per-frame parity evidence dropped with the frame
  (`crates/bitty-runtime/src/runtime/scene_present.rs:1-58`);
- the present request path exists (`pending_paint_redraw`) but no drawing code
  arms it, and no `ui.draw` head exists in `bitty-package`,
  `bitty-plugin-host`, or the SDK linter.

## Affected contracts

| Contract                                                                                                                                                    | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) and its closed identifier table | Acceptance adds exactly `ui.draw` and `ui.draw.image`. The change set also amends `bitty-package` `CLOSED_CAPABILITY_HEADS` (`crates/bitty-package/src/manifest.rs:345-366`), `bitty-plugin-host` `CapabilityFamily::Ui::closed_identifiers` (`crates/bitty-plugin-host/src/capability.rs:151-163`), the SDK linter `CLOSED_CAPABILITY_HEADS` (`bitty-plugin-sdk` `src/capabilities.ts:45-70`), the SDK `host-surface` mapping, and the surface manifest. No readback identifier. |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)                        | Adds a v2 data-plane surface (`bitty.draw.*`); the accepted v1 surface, node set, slots, and all its refusals stay frozen.                                                                                                                                                                                                                                                                                                                                                        |
| [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)                                  | RC-1/RC-2 unchanged in value but bounded in scope: RC-2 charges VM-side staging only, RC-3 absorbs DC-12, RC-4 charges one timer per animated target and its `32`-timer value is reconciled with `bitty-lua`'s `64`. At acceptance, register DC-1..DC-12 as table entries.                                                                                                                                                                                                        |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                                                   | Unchanged text, but a hard dependency: no v1 plugin owns a panel, so `ui.draw` is dormant until a panel provider/lifecycle contract is accepted. `E_DRAW_NOT_OWNER` binds a target to its creating `(PluginId, Generation)`.                                                                                                                                                                                                                                                      |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                                                           | Unchanged contract; cross-reference only.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md)                                                          | Consumer: host-derived damage enters the frame descriptor; the record remains a candidate and the shipped present is full-frame, so the interface is accounting-only in v1.                                                                                                                                                                                                                                                                                                       |
| [Workspace Compositor Specification](workspace-compositor.md) and [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)                   | Unchanged: tiers, decoration, gaps, and overlay modal authority are reproduced faithfully, not extended.                                                                                                                                                                                                                                                                                                                                                                          |
| [Terminal State RFC](terminal-state-rfc.md)                                                                                                                 | Unchanged: no grid mutation, no reply bytes, no parser involvement.                                                                                                                                                                                                                                                                                                                                                                                                               |
| [Text and Rendering RFC](text-rendering-rfc.md) (draft)                                                                                                     | Consumer: cell-geometry vocabulary, atlas/DPI behavior underneath `Cells`.                                                                                                                                                                                                                                                                                                                                                                                                        |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)                                                                                       | Consumer: motion budget categories and animation pacing. The present itself is the runtime's own request path, not this contract's.                                                                                                                                                                                                                                                                                                                                               |
| [DevTools RFC](devtools-rfc.md) and its Amendment A1 `bitty.debug/captureFrame` scope                                                                       | Out of this contract: the sole capture path, Implemented-only, gated by `debug.trace` + per-session bearer + per-call opt-in; whether it can capture composited drawing is DG-OQ-9.                                                                                                                                                                                                                                                                                               |
| [Performance Budget RFC](performance-budget-rfc.md)                                                                                                         | New bound rows (DC-1..DC-12) follow the numbers-are-contracts convention.                                                                                                                                                                                                                                                                                                                                                                                                         |
| [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) and the extraction contracts                                                      | Prerequisite, not consumer: live-tree publication must be owned by an accepted accessibility contract before drawn content can be announced (B-5).                                                                                                                                                                                                                                                                                                                                |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and the threat model                                  | New capability and data plane require a P0 security review before acceptance; invariants 3, 4, 7, 10 unchanged.                                                                                                                                                                                                                                                                                                                                                                   |

## Open points

| Id       | Question                                                                                                                                                                                                                                                                   | Blocks               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| DG-OQ-1  | Present-loop quantization for motion budgets under [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md): sub-second scheduling and motion-budget categories. Visibility, DC-7's window, and DC-10/DC-11 no longer depend on it.                           | v2 acceptance        |
| DG-OQ-2  | Whether `Line` is axis-aligned only or includes the diagonal class across non-square cells (visual parity risk)                                                                                                                                                            | v1 acceptance        |
| DG-OQ-3  | Off-screen surfaces v2: refcount model, address space, and bounded byte accounting above DC-5/DC-6; also pixel readback with a redaction pipeline                                                                                                                          | v2                   |
| DG-OQ-4  | Whether `ui.draw` ought to split per target-ordinal (frontmost / per-panel granularity for "N > 1" targets), or remain a flat two-grant family                                                                                                                             | v1 acceptance        |
| DG-OQ-5  | Localization: do semantic-group labels participate in a11y localization frameworks? The byte bound is fixed by the per-command budget; the localization question is not.                                                                                                   | v1 acceptance        |
| DG-OQ-6  | SW renderer fallback: behavior when no raster hardware exists — pure-cell degradation versus type refusal of `Image` commands                                                                                                                                              | implementation phase |
| DG-OQ-7  | Naming: the plugin-submitted `DrawList` shares a spelling with the renderer-internal `DrawList` (`crates/bitty-render/src/grid.rs:1898`); keep, qualify, or respell at acceptance. A second plugin-facing `DrawList` is the name SDK docs and error messages will carry.   | v1 acceptance        |
| DG-OQ-8  | Colour domain: RFC-0001 `#RRGGBB[AA]` literal versus a `plugin.<name>.*` theme token, and the `AC-1`..`AC-3` contrast plus `--safe` forced-pair treatment for drawn colour. The text currently states the gap rather than choosing.                                        | v1 acceptance        |
| DG-OQ-9  | Whether `bitty.debug/captureFrame` with `format: "pixels"` can include compositor-side drawing over a terminal-backed panel; owned by the devtools contract, not by this one.                                                                                              | devtools acceptance  |
| DG-OQ-10 | `Fence` is two designs at once: an in-list command with no visual effect and a `u64` tag described as list-level. A plugin-chosen value also makes the replay digest non-canonical. Define one (host-assigned sequence, or a canonical terminator with no plugin payload). | v1 acceptance        |
| DG-OQ-11 | Whether a v1 `DrawTarget` should exist at all before panel ownership is accepted. Keeping `ui.draw` dormant and letting the panel contract land first is the cheaper order and is the default this draft now takes.                                                        | v1 acceptance        |
| DG-OQ-12 | Whether plugin-declared damage ever returns. Once the host diffs two validated lists, a declared field buys nothing but a fail-open; a v2 case would have to show a resubmission cost the host cannot avoid computing.                                                     | v2                   |

## Review lineage and open items

This revision exists because a security review gated it. The record below keeps
the gate visible so a later reader does not mistake an amended draft for a
reviewed one.

| Item              | Value                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gating review     | `bitty-docs` [`docs/security/plugin-drawing-capability-review.md`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/plugin-drawing-capability-review.md), independent reviewer, 2026-11-03 |
| Verdict           | **`NEEDS-FIX`**, seven blocking findings (B-1..B-7) and seven non-blocking (N-1..N-7)                                                                                                                          |
| Reviewed revision | `bitty-terminal-docs` `25aa80f`, RFC text merged at `f8bc04f`; code at `bitty` `7ac871d4`, `bitty-plugins` `55e4a1f`, `bitty-plugins-docs` `1b04a63`                                                           |
| This revision     | Amends the same path, keeps `status: draft`, and closes each blocking finding with a named mechanism. Re-verification pins: `bitty` `11976dd5`, `bitty-plugin-sdk` `9d61b1d`                                   |
| Effect on verdict | None. The review's verdict stands until the reviewer re-reviews this revision by diff; this document does not mark itself accepted, reviewed, or verified, and owner acceptance remains a separate decision.   |
| Effect on scope   | Narrowed, not widened: no readback, no off-screen surface, no per-frame hook, no v1 target binding, no new pacing primitive.                                                                                   |

Non-blocking findings and their disposition after this revision:

| ID  | Status after this revision | Item and owner                                                                                                                                                                                                                      |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-1 | **Closed**                 | Status inflation removed in three places: the damage architecture is called a candidate, the chrome tier ordering is stated as a direction, and `captureFrame` is stated as Implemented-only under Amendment A1. Owner: RFC author. |
| N-2 | **Closed**                 | DC-7 carries its token-bucket parameters (capacity `60`, refill `30`/s, per target) at v1 acceptance; its window no longer depends on DG-OQ-1. Owner: RFC author.                                                                   |
| N-3 | **Closed**                 | The per-command/per-field byte budget that makes DC-1 and DC-2 jointly satisfiable is stated in § Bounds. Owner: RFC author.                                                                                                        |
| N-4 | **Open** — DG-OQ-8         | Colour domain, `AC-1`..`AC-3` contrast, and `--safe` treatment for drawn colour. Owner: theme/appearance contract owner with the accessibility reviewer. The text states the gap and resolves it nowhere.                           |
| N-5 | **Open** — DG-OQ-10        | `Fence` is still two designs (command versus list-level tag) and a plugin-chosen tag still perturbs the replay digest. Owner: RFC author with the renderer owner.                                                                   |
| N-6 | **Closed**                 | `bitty.draw.stats` is declared inside `ui.draw`, returns content-free counters only, and is rate-limited like any other bridge call. Owner: RFC author.                                                                             |
| N-7 | **Open** — DG-OQ-7         | The plugin-facing `DrawList` still collides with the renderer-internal type; the SDK-docs consequence is now recorded with it. Owner: API naming owner at acceptance.                                                               |

Review items that stay open beyond the numbered findings, with owners:

- **Whether a v1 `DrawTarget` should exist before panel ownership (DG-OQ-11).**
  Owner: panel runtime owner. The review's cheaper order — panel contract first,
  `ui.draw` dormant — is the default this revision takes; reversing it reopens
  B-2.
- **The future readback identifier (DG-OQ-3).** Owner: security reviewer and
  RFC author. No identifier is reserved now.
- **Devtools pixel capture over composited drawing (DG-OQ-9).** Owner: devtools
  contract owner. Out of this contract, but it must not be read as covered by
  the `bitty.draw.*` denial.
- **Verification obligations inherited from the review.** Owner: the
  implementing lane, once one exists. They are enumerated in § Verification
  plan as the B-1..B-7 tests; none of them is satisfied by this document.

## Acceptance criteria

Per the issue (and consistent with the repository's spec admission criteria):

1. The contract above is accepted through independent review — including the
   required P0/security review — and not by this draft itself. The review that
   gates this revision returned `NEEDS-FIX`; acceptance requires a re-review of
   the amended revision by diff, and this draft cannot satisfy its own
   criterion.
2. Capability names (`ui.draw`, `ui.draw.image`) and the denial taxonomy
   table land unchanged as accepted spellings, or the amendment that changes
   them is recorded.
3. Reference-implementation scope is bounded: one host-side `DrawList`
   validator, one cell/raster painter, and the `bitty.draw.*` bridge surface;
   the topology is `bitty-lua -> bitty-plugin-host -> bitty-rich -> bitty-ui`
   compatible with the accepted crate DAG without reversing edges.
4. Tests covering bounds (DC-1..DC-9), denials (taxonomy rows), and
   determinism (frame-digest replay) exist as headless tests and would be
   parameterized on the declared values.
5. The declarative v1 surface and the Panel RFC remain un-amended by this
   acceptance; [Level 4 protocol registration](#purpose-and-scope) stays
   refused.
6. The closed-set change set lands in the same acceptance: the accepted
   identifier table, `bitty-package` `CLOSED_CAPABILITY_HEADS`,
   `bitty-plugin-host` `CapabilityFamily::Ui`, the SDK linter table, the SDK
   `host-surface` mapping, and the surface manifest, with the B-1 negative
   fixtures. A capability absent from any one of them is not accepted.
7. `ui.draw` is accepted **dormant**: it binds to no v1 mount slot, and it
   becomes usable only in the acceptance that lands a panel provider/lifecycle
   contract giving a plugin a panel to own (B-2).
8. No claim that drawn content is announced precedes an accepted accessibility
   publication contract; until it lands, `Semantic` is mandatory and the
   contract states that nothing is announced (B-5).
