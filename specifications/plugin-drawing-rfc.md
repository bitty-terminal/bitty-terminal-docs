---
title: Plugin Drawing Capability RFC (Candidate)
description: Draft contract answering bitty#2477 for a bounded declarative plugin drawing instruction set with host-owned frames, damage declaration, and readback denial, separate from the Panel RFC
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
   who declares and who validates damage;
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
  this contract only defines the plugin-visible damage declaration interface
  into it.
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

| Term                  | Meaning                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DrawList`            | A bounded, versioned, declarative command sequence a plugin submits for one drawing target; pure data, no callbacks, no handles, no code.      |
| `DrawTarget`          | One plugin-authorized drawing surface slot with a content-rectangle cell viewport; exactly one active `DrawList` per target.                   |
| `DrawCommand`         | One instruction in a `DrawList`; a typed struct with fixed-width or bounded fields only.                                                       |
| Cell coordinate space | The coordinate model: `(col, row)` integers relative to the target's viewport, plus bounded subcell offsets; not windows, not absolute pixels. |
| Raster entry          | An `Image` command that paints a host-held raster lease inside a clipped subcell rectangle.                                                    |
| Image lease           | A host-owned decoded raster the drawing host keeps alive while a `DrawList` references it; bound and attributed to the owning plugin.          |
| Frame                 | Core's internal present triangle; never passed to, addressable by, or observable by a plugin.                                                  |
| Present tick          | The compositor's frame scheduler step at which a validated `DrawList` swap becomes visible; host-quantized, plugin-paced only indirectly.      |
| Declared damage       | The cell region a plugin claims changed since its previous `DrawList`; host-validated and intersected, never honored raw.                      |
| `ui.draw`             | Candidate capability: declare and update `DrawList` content into the plugin's own drawing targets (cells, primitives, semantics).              |
| `ui.draw.image`       | Candidate capability: additionally create and reference image leases (raster layer).                                                           |
| `ui.draw.readback`    | Optionally-declared capability family (v1: declared but refused; see [Readback rules](#readback-rules-readback-denial-taxonomy)).              |
| Semantic group        | An accessibility annotation attached to a `DrawCommand` region: role, label, and optional text content, converted into the accessibility tree. |

`DrawList` here is the plugin-submitted data plane only. The accepted renderer
pipeline already uses the same spelling for its internal command list
(`Snapshot + Damage -> DrawList -> Surface::present`, per the
[Text and Rendering RFC](text-rendering-rfc.md) and the
[Configuration Model RFC](configuration-model-rfc.md)); the two are different
types with different owners and sources, and no drawing submission reaches or
reuses the renderer-internal list. The collision is recorded as DG-OQ-7 rather
than resolved by this draft.

## Relationship to accepted sources

| Area               | Accepted fact (cite)                                                                                                                                                                             | How this candidate composes (draft)                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sandbox            | Invariants 3 and 4 of the [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)                                                                  | Drawing is presentation-only data submission; the paint conversion runs Core-side in the hot path; plugins receive no renderer, GPU, window, or frame handle at any layer.                |
| Capabilities       | Deny-by-default `[capabilities]` grammar and consent records per the [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) | Two new ids under the accepted `ui` family (`ui.draw`, `ui.draw.image`), declared in the manifest, granted by consent, subject to permission-diff approval on update.                     |
| Budgets            | RC-1 `10^7`/`50 ms` (hard-gated) and RC-2 `32 MiB` per the [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)            | Every `DrawList` submission is a bridge call charged to the callback like any other host call; the list itself is accounted against RC-2; no new CPU or memory ceiling is introduced.     |
| Panel model        | `PanelId`, `StaleHandle`, generation addressing per the accepted [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                       | A `DrawTarget` is addressed by `(PanelId, Generation)` plus the plugin's own target ordinal; stale handles are typed rejections, never silent redirection to another panel.               |
| Presentation truth | Presentation never mutates grid semantics or parser state                                                                                                                                        | `DrawList` output is compositor-side decoration over the panel content region; the child process sees nothing and receives no replies generated by drawing.                               |
| Declarative v1     | `bitty.ui.mount` with `Text`/`Row`/`Column`/`List` and closed slot set (accepted v1 surface RFC)                                                                                                 | Untouched; `ui.draw` is a separate grant and a separate data plane. A plugin cannot mix a mounted scene and a `DrawList` in one target; the two are exclusive per target (typed refusal). |
| Language           | English-only canonical documentation policy                                                                                                                                                      | This record adds only English text and links.                                                                                                                                             |

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
4. Unknown-surface compatibility: a host without the drawing feature rejects
   `bitty.draw.*` calls with the typed `E_DRAW_UNAVAILABLE`; it silently keeps
   any mounted scene. Feature detection precedes grant inference, so plugins
   degrade to v1 primitives instead of failing to start.

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

| Command    | Fields (bounded)                                                   | Paints                                                                                     |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `Cells`    | cell span, color pair, optional style bits                         | a text/cell run (the primary primitive; it can reproduce every v1 node shape)              |
| `Rect`     | origin, extent (cells), color, optional border style               | filled rectangle or border box                                                             |
| `Line`     | two endpoints (cells), color, style                                | straight horizontal, vertical, or Bresenham-class stepping line                            |
| `Image`    | origin (cell + sixteenths), size (cells), lease id, optional blend | raster lease painted with host-side clip and cell-grid alignment; requires `ui.draw.image` |
| `Clip`     | origin, extent (cells)                                             | clip rect for subsequent commands (stackable, bounded depth)                               |
| `Semantic` | region + role + label + optional text                              | accessibility annotation only: it paints nothing and is not optional for visible content   |
| `Fence`    | none                                                               | end-of-list marker for deterministic replay hashing; no visual effect                      |

Refusals by construction: no `Path`, no `Bezier`, no user-defined shaders, no
framebuffer reads, no text-shaping directives, no per-command callbacks,
foreign opcodes, or placeholder-compatible escape bytes. Command encodings are
plain typed data; nothing in a `DrawList` is ever executed, parsed as a
protocol, or reflected into the terminal grid.

Layering within a target is a fixed two-layer model, not user z-ordering:

- layer 0: cell content (`Cells`, `Rect`, `Line`);
- layer 1: raster entries (`Image`), painted above cells, each with alpha
  blending the host implements.

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
   double buffer, and is visible at the next host present tick. The exact tick
   quantization belongs to the frame scheduler under
   [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md);
   the plugin-visible contract is only "next host present, monotonic,
   never skipped ahead of validation."
3. Submission cannot bypass the quantizer: drawing is decoupled from render
   frames and the plugin cannot force, block, or observe a present. Plugins
   cannot even learn that a present happened, because there is no per-frame
   event (the accepted v1 surface RFC already refuses hot-path event names —
   drawing inherits that refusal).

### Animation and per-frame deltas

Decision: **animation is allowed, paced by the host, and never per-frame.**

- A plugin arms a host-quantized timer per target — candidate spelling
  `bitty.draw.tick(rate)` — with the effective rate `min(requested, DC-7
sustained)`. Each tick invokes the plugin's registered callback once; each
  invocation is a plugin callback charged under RC-1, exactly like any other
  bridge-driven callback, and the callback returns a new `DrawList`
  submission.
- There is no per-frame Lua entry point tied to actual presents
  (no `on_frame`, no vsync callback, no render-loop hook). The tick count is
  the plugin's requested pace, not the compositor's present count; two
  presents may show one list, and a tick may be skipped entirely under load —
  only the total submission rate is guaranteed to stay inside DC-7.
- Per-frame deltas as a wire format are refused in v1: every submission is a
  full replacement list. Damage already provides the sharing mechanism, and
  a delta codec would add a second truth about what the target paints,
  needing its own replay model. Delta encoding is a v2 open point sized
  against DC-1 if resubmission traffic is measured hot.
- Off-screen surfaces follow [Buffer ownership and lifetime](#buffer-ownership-and-lifetime):
  refused in v1 (DG-OQ-3).

### Damage model (allocation of responsibility)

- **Declared by the plugin.** Every `DrawList` other than the first for a
  target carries `damage: list of cell rectangles` describing which cells it
  claims changed since its previous list. An update that intentionally
  declares no damage is an explicit `no-damage` shape that the host still
  bounds.
- **Validated and intersected by the host.** The host intersects the declared
  region with the target's viewport, then may expand (never silently shrink it
  below correctness: a conservative over-damage by the host is safe, so any
  disagreement about "did this change?" resolves toward more damage). The host
  folds declared damage into its accepted three-level damage model
  (panel-level damage under the
  [Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md));
  plugins access that pipeline through this declaration only.
- **Under-declared damage is a bounds refinery, not a mutable frame.** If a
  plugin under-declares and stale cells remain painted, the artifact appears
  only in that target until the next full-list resubmission; the host never
  tracks state the plugin forgot to claim, because that would imply a plugin
  rollback API. A scheduled `full damage` resubmission (host-driven, one per
  `128` present ticks) bounds worst-case staleness.

## Buffer ownership and lifetime

Decision: **the host owns every byte.** There is no plugin addressable
off-screen surface and no zero-copy handoff in v1.

- The `DrawList` buffer, decoded command storage, and the swap pair are
  host-owned; the plugin sends a serialized list and receives a typed result.
  Fields can be changed by a later submission, but the previous painted
  picture does not race plugin code: it is never mutated in place.
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
z-order layer.** The compositor's accepted ownership tiers stay exactly as
they are:

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

| Grant              | Unlocks                                                                                               | Refusal when absent   |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------- |
| `ui.draw`          | `bitty.draw.open/list/semantics/...` — cell/primitive submission, semantic groups, damage declaration | `E_CAPABILITY_DENIED` |
| `ui.draw.image`    | additionally image leases (`bitty.draw.image`)                                                        | `E_CAPABILITY_DENIED` |
| `ui.draw.readback` | v1: no usable readback exists; declared grants are inert (denial taxonomy below)                      | always refused        |

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

Budgets applied (all accepted ceilings survive unchanged; this contract adds
only throttle values, per the
[Performance Budget RFC](performance-budget-rfc.md) numbers-are-contracts
convention):

- **RC-1** `10^7` VM instructions / `50 ms` wall clock (8 ms warning,
  fail-closed suspend) per plugin callback: every `bitty.draw.*` bridge call
  executes inside a callback in the accepted way and is charged like any other
  host call. The wall-clock credit amendments (store-commit, supervised
  spawn-wait) do not apply; drawing work is plugin CPU work.
- **RC-2** `32 MiB` accounted heap per plugin VM: decoded `DrawList`
  internals taxed against the plugin's accounted allocations. A plugin cannot
  park the host's buffers to bypass RC-2 because host storage is released back
  to the host allocator at validation time, and the plugin-side serialized
  staging list is RC-2-accounted.
- **New bounded envelopes below** (DC-1..DC-9) cap how much drawing work a
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
   fixed-shape bounded buffer, its commands are depth-checked, and submission
   rate is throttled (DC-7). Backpressure is visible to the plugin as typed
   drop telemetry
   (`bitty.draw.stats` returns dropped-count with no payload growth).
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

`ui.draw.readback` remains declared-but-inert so a future amendment can
narrow it to one explicit scope (self-panel, bounded raster, redaction
pipeline) without inventing a new manifest key. The denial table pins the
rule the issue asks for: readback is a devtools-domain grant, never part of
`ui.draw` itself, and a plugin may always read what it submitted or owns in
its own state — only the post-compositing surface is invisible.

## Bounds

Numbers follow the numbers-are-contracts convention: tests must parameterize
on these values; changing a bound requires an RFC revision, never silent
drift.

| Id   | Dimension                                  | Bound                                             | Over-limit behavior                                                          |
| ---- | ------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| DC-1 | Serialized `DrawList` size per submission  | `256 KiB`                                         | `E_DRAW_TOO_LARGE` (`budget`); previous list stays painted                   |
| DC-2 | Commands per `DrawList`                    | `4096`                                            | `E_DRAW_TOO_LARGE` (`budget`)                                                |
| DC-3 | `Clip` stack depth per list                | `16`                                              | `E_DRAW_COMMAND_INVALID` (`validation`)                                      |
| DC-4 | Image lease bytes per image, decoded       | `1 MiB`                                           | `E_DRAW_IMAGE_TOO_LARGE` (`budget`)                                          |
| DC-5 | Leased image bytes per plugin generation   | `4 MiB` (floor `256 KiB`)                         | `E_DRAW_IMAGE_BUDGET` (`budget`); no eviction                                |
| DC-6 | Active leases per plugin generation        | `32`                                              | `E_DRAW_IMAGE_BUDGET` (`budget`); release first                              |
| DC-7 | Submissions per wall second per target     | `30` sustained (window-judged); burst `60` in 2 s | throttle-drop with typed counters; the drop never touches the last good list |
| DC-8 | Drawing targets per plugin generation      | `4`, each with exactly one active list            | `E_DRAW_TARGET_BUDGET` (`budget`)                                            |
| DC-9 | Semantic groups plus labels per `DrawList` | `1024` total                                      | `E_DRAW_SEMANTIC_BUDGET` (`budget`)                                          |

Composition with accepted ceilings: DC-1..DC-9 cap enqueueing; RC-1 caps the
callback that does the enqueueing; RC-2 caps the plugin's retained buffers
(plugin-side serialized staging, image-attribution staging); no drawing bound
relaxes an accepted ceiling, and no accepted ceiling replaces drawing bounds.

## Typed failure taxonomy

Failures are typed bridge errors in the accepted classes (`runtime`,
`validation`, `budget`, `resolution`), always naming the rule — never the
payload — per the accepted failure-semantics precedent.

| Condition                                                                            | Class        | Code                               | Effect                                        |
| ------------------------------------------------------------------------------------ | ------------ | ---------------------------------- | --------------------------------------------- |
| Missing `ui.draw` / `ui.draw.image` grant                                            | `runtime`    | `E_CAPABILITY_DENIED`              | No side effect.                               |
| Host has no drawing feature (safe mode, headless, old host)                          | `runtime`    | `E_DRAW_UNAVAILABLE`               | No surface appears; v1 targeting still works. |
| Stale target, lease, or generation mismatch                                          | `runtime`    | `E_DRAW_HANDLE_STALE`              | Nothing changes.                              |
| Target already owned by this generation (`open` twice), or not owned by caller       | `runtime`    | `E_DRAW_NOT_OWNER` / `E_DRAW_BUSY` | Existing list stays painted.                  |
| Readback attempted                                                                   | `runtime`    | `E_DRAW_READBACK_DENIED`           | Denied fully, typed reason, no partial read.  |
| Off-screen surface requested                                                         | `runtime`    | `E_DRAW_OFFSCREEN_DENIED`          | v1 refusal (open point DG-OQ-3).              |
| Malformed list, unknown opcode, command depth overrun, `Clip` overflow or unbalanced | `validation` | `E_DRAW_COMMAND_INVALID`           | Whole list rejected; nothing painted.         |
| List exceeds DC-1 / DC-2, rate exceeded DC-7, lease DC-4/DC-5/DC-6, or semantic DC-9 | `budget`     | `E_DRAW_*` per row                 | Rejected or throttled; last good list intact. |
| Stats or telemetry queries beyond the per-second query cap                           | `budget`     | `E_RATE_LIMITED`                   | Backoff; no data.                             |

## Accessibility and semantics fallback

Decision: **the semantics channel is a first-class command, and unannotated
visible content is still announced — never silent.** The accepted a11y
vocabulary
(extraction contracts, the declarative zone model, and the compositor's
focus semantics) survives without weakening:

- Every visible `DrawCommand` region must be covered by at least one
  `Semantic` region annotation (role + label). Un-annotated content is still
  painted, but reported as `role: image, label: ""` at the host level, so
  assistive technology notices the region without inventing a denial gate
  for pixels.
- `Semantic` regions compose into the accessibility node tree of the owning
  panel in tree-stable order (list order, then spatial fallback), so reading
  order does not depend on raster internals or paint order.
- A panel drawing content keeps its focus/keyboard contract unchanged from
  the accepted panel model; drawing adds no input authority. Accessibility
  activation is the interaction label, not cursor math or hit-box registration.
- Every `DrawTarget` owns one host-derived coarse summary entry (`panel-name`
  label + bounded first-line text or empty), so a screen reader can summarize
  a drawing panel without semantic annotations present.
- Decorative rasters are marked by label omission under `role: image` plus
  an explicit `decorative` flag, not by hiding them from the a11y tree.

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

| Threat (accepted threat-model vocabulary) | Possible attack via drawing                                                              | Bound maintaining the invariant                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| T-06 plugin escape                        | Opaque opcodes, malformed depth, or handle confusion leading to renderer-side code paths | Bounded AST grammar; typed `validation` rejections; every handle is a table index with a generation stamp; no native surface in the grammar |
| T-13 Terminal Truth mutation              | Draw commands echoing into the grid or replying                                          | Drawing data plane is compositor-side only; no path into the VT parser; no replies generated                                                |
| T-07 starvation                           | Unbounded submission rate starving other panels' damage budgets                          | DC-7 throttling plus the accepted present-tick scheduler that resets per target                                                             |
| T-01 parser wedge                         | Content smuggled as escape sequences inside text runs                                    | `Cells` text is enclosed in a typed span; no protocol reinterpretation; no panel content reaches the parser                                 |
| T-11 trace/crash-report credential leak   | Readback of other panels' pixels, or steganographic raster leaks                         | Readback taxonomy deny-all; separate image leases; no capture path is in this contract                                                      |
| T-09 IPC takeover                         | Drawing surfaces used as an unscoped command channel between plugins                     | Drawing targets are per-plugin private; no message passing, no inter-plugin effect surface                                                  |

Invariants 3, 4, 7, and 10 bind this contract; the Security Overview's
release-blocking set stays `1, 5, 6, 7, 8`, so drawing adds no release blocker
and weakens none. Any amendment that adds a readback, per-frame event,
off-screen surface, or cross-panel data flow must repeat the P0
security-review gate.

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

## Alternatives considered

| Alternative                                                                        | Trade-off                                                                                                                                                                        | Disposition                                                                  |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Adopt `Panel::render(&mut Frame)` as a plugin API (the issue's named anti-shape)   | First-class immediacy and full expressiveness; hands plugins renderer/GPU/window objects and executes Lua inside the paint path                                                  | **Rejected**: violates sandbox invariant 4 by construction; anti-requirement |
| Immediate-mode per-frame Lua callbacks (`on_draw(frame)` per vsync)                | Smallest new API set; but Lua executes in the present path and scales CPU with frame rate                                                                                        | **Rejected**: the accepted per-frame event refusal already covers this       |
| Extend `SceneNode` with drawing nodes instead of a separate contract               | One surface, one grant; but it reopens the accepted frozen v1 surface spec, couples "declares semantics" with "draws pixels," and needs a v2 attack surface on every node change | **Rejected**: the issue demands a separate RFC and a separate capability     |
| Full pixel surfaces with plugin-requested offscreen buffers                        | Unlimited UI expressiveness and canvas parity; new memory class, async GPU hazards, and pixel-readback temptation                                                                | **Deferred** as v2 open point DG-OQ-3 with preconditions                     |
| Vector path command (`Path`) in v1                                                 | Charts and diagrams flow naturally; float geometry hurts determinism, replay, a11y mapping, and clip math                                                                        | **Deferred** to v2; `Cells`- and `Line`-based approximations cover v1        |
| Z-order control inside a target (`bring_to_front` per command)                     | Fine-grained layering; but plugins gain intra-panel layer authority that the compositor would have to arbitrate                                                                  | **Rejected**: fixed two-layer model keeps compositing authority Core-side    |
| Capability-gated `bitty.draw` scope split (`ui.draw.text` + `ui.draw.image` + ...) | Smallest grant per plugin; multiplies consent surfaces and grants drift risk                                                                                                     | **Deferred**: two grants cover v1; split later if needed                     |
| Readback behind an `ui.draw.readback` user-notification flow                       | Useful dashboards could self-debug screenshots; moves sensitive-data risk into the plugin trust domain                                                                           | **Deferred** as a v2 open point with devtools-domain re-review               |

## Built versus not built

None of this contract is implemented. Verified against the workspace today
(2026-11-02, from `origin/main` at `8852836`; the `bitty` workspace at
`a168b197` has no `ui.draw` or `bitty.draw` identifier under `crates/`):

- the `ui` capability family and the `bitty.ui.mount` declarative slot
  surface exist (accepted v1 surface RFC); `ui.draw`, `ui.draw.image`, and
  `bitty.draw.*` do not;
- a panel content-region drawing target, `DrawList` validation, image
  leases, swap pairs, and the deterministic frame-digest test hook do not
  exist;
- the three-level damage pipeline that accepted damage would fold into is
  itself a candidate architecture
  ([Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md)):
  its current accepted state is a terminal-snapshot grid pipeline, so the
  damage-declaration interface defined here depends on that candidate
  landing before implementation.

## Affected contracts

| Contract                                                                                                                                  | Effect                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)               | Adds candidate capability ids `ui.draw`, `ui.draw.image`, and the inert `ui.draw.readback` family under the accepted `ui` family. |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)      | Adds a v2 data-plane surface (`bitty.draw.*`); the accepted v1 surface, node set, slots, and all its refusals stay frozen.        |
| [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)                | No ceiling change; drawing is RC-1/RC-2 charged. Follow-up at acceptance: register the drawing contract bounds as a table entry.  |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                                 | Unchanged: panel creation, `PanelProvider`, and lifecycle are not touched by this record; `DrawTarget` addresses existing panels. |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                                         | Unchanged contract; cross-reference only.                                                                                         |
| [Render Damage and Invalidation Architecture (Candidate)](render-damage-invalidation-candidate.md)                                        | Consumer: the three-level damage model folds declared damage; acceptance sequencing recorded.                                     |
| [Workspace Compositor Specification](workspace-compositor.md) and [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) | Unchanged: tiers, decoration, gaps, and overlay modal authority are reproduced faithfully, not extended.                          |
| [Terminal State RFC](terminal-state-rfc.md)                                                                                               | Unchanged: no grid mutation, no reply bytes, no parser involvement.                                                               |
| [Text and Rendering RFC](text-rendering-rfc.md) (draft)                                                                                   | Consumer: cell-geometry vocabulary, atlas/DPI behavior underneath `Cells`.                                                        |
| [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)                                                                     | Consumer: present-tick quantization and motion budget categories.                                                                 |
| [DevTools RFC](devtools-rfc.md) and its amended `bitty.debug/captureFrame` scope                                                          | Sole capture path for screenshots; the drawing surface readback stays devtools-domain only.                                       |
| [Performance Budget RFC](performance-budget-rfc.md)                                                                                       | New bound rows follow the numbers-are-contracts convention.                                                                       |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and the threat model                | New capability and data plane require a P0 security review before acceptance; invariants 3, 4, 7, 10 unchanged.                   |

## Open points

| Id      | Question                                                                                                                                                                                                      | Blocks               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| DG-OQ-1 | Exact present-tick scheduling under [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md): sub-second quantization, motion budgets, and the math behind DC-7's rate window                    | v2 acceptance        |
| DG-OQ-2 | Whether `Line` is axis-aligned only or includes the diagonal class across non-square cells (visual parity risk)                                                                                               | v1 acceptance        |
| DG-OQ-3 | Off-screen surfaces v2: refcount model, address space, and bounded byte accounting above DC-5/DC-6; also pixel readback with a redaction pipeline                                                             | v2                   |
| DG-OQ-4 | Whether `ui.draw` ought to split per target-ordinal (frontmost / per-panel granularity for "N > 1" targets), or remain a flat two-grant family                                                                | v1 acceptance        |
| DG-OQ-5 | Localization: do semantic-group labels participate in a11y localization frameworks, and does label length bound follow DC-9 or a text bound                                                                   | v1 acceptance        |
| DG-OQ-6 | SW renderer fallback: behavior when no raster hardware exists — pure-cell degradation versus type refusal of `Image` commands                                                                                 | implementation phase |
| DG-OQ-7 | Naming: the plugin-submitted `DrawList` shares a spelling with the renderer-internal `DrawList` in the accepted renderer seam; keep, qualify, or respell at acceptance (different types, no shared ownership) | v1 acceptance        |

## Acceptance criteria

Per the issue (and consistent with the repository's spec admission criteria):

1. The contract above is accepted through independent review — including the
   required P0/security review — and not by this draft itself.
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
