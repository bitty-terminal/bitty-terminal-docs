---
title: Lua UI Composition Reconciliation
description: Item-by-item reconciliation of the Chrome Surface API and Chrome Band candidates against the implemented Plugin API v1 bitty.ui.mount bridge covering slots node kinds style fields bindings capabilities and budgets
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 66
---

# Lua UI Composition Reconciliation

> Status: **draft**. This record accepts nothing and promotes nothing. It states,
> item by item, what the current `bitty` host implements from the
> [Chrome Surface API (Candidate)](chrome-surface-api-candidate.md) and the
> [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md), what is
> accepted by the
> [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
> but has no host surface in this build, what is still candidate spelling, and
> what is deferred. Both candidates remain drafts; this record changes no
> accepted text and authorizes no shipped behavior of its own beyond the
> implementation facts it cites.

## Purpose and scope

The two chrome candidates were written before the Plugin API v1
`bitty.ui.mount` / `bitty.ui.update` bridge was implemented, then annotated in
place as parts of the host landed. Annotations accumulated in prose, so a
reviewer can no longer tell from either document which rules are backed by code,
which are accepted-but-unhosted, and which are design direction. That ambiguity
is the reason the reconciliation work exists.

This record is the single reconciliation table for both candidates. It covers:

- the seven accepted `bitty.ui.mount` slot names and what the host does with
  each one;
- the `SceneNode` variants reachable from Lua and the v1 node subset;
- the node fields the bridge accepts (`fg`, `bg`, `bold`, `anchor`, `on_click`,
  `on_scroll`, `on_hover`, `region`);
- the capabilities that gate the surface, the budgets that bound it, and the
  interaction paths that consume it;
- the places where the candidates' rules and the host disagree, named so a
  later revision can decide rather than re-derive them.

Out of scope and owned elsewhere: band geometry, reflow, and degradation rules
as contracts ([Chrome Band Contract](chrome-band-contract-candidate.md)); the
chrome inventory and read-only rules
([Chrome Surface Contract](chrome-surface-contract-candidate.md)); token
resolution ([Theme Token Contract](theme-token-contract-candidate.md)); panel
tabs (PW-10,
[Panel and Workspace Interaction](panel-workspace-interaction-candidate.md));
the accepted scene vocabulary and its budgets
([Rich Presentation RFC](rich-presentation-rfc.md)); the plugin-side bar and
status implementations (plugin repositories).

## Status vocabulary and evidence rules

Every row in the tables below carries exactly one of four labels.

| Label                      | Meaning                                                                                                     | Required evidence                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| implemented                | The current `bitty` host performs this behavior.                                                            | A repository-relative code path read at the pinned revision, plus its headless test. |
| accepted-but-unimplemented | An accepted contract (or an accepted slot name) requires it; this build has no host surface for it.         | The accepted source plus the code path that refuses or omits it.                     |
| candidate                  | Design direction in a candidate record. No accepted contract requires it and no host path performs it.      | Absence of a host path; the candidate rule named.                                    |
| deferred                   | Explicitly postponed by an accepted record or by an implemented boundary, with the blocking contract named. | The deferring statement plus the boundary that enforces it.                          |

Nothing is labeled implemented because a candidate says so, because a comment
describes it, or because a test fixture exists. Where a label would be
contested, the row names the specific host symbol a reviewer can read.

## Implementation evidence

The implementation facts below were read from the `bitty` repository at
`0b92e27d` (main). `origin/main` had advanced two commits at read time; none of
them touch the paths cited here. The evidence is static reading plus the
headless test files named per row; **no headed run was performed for this
record**, so it makes no usability, performance, or accessibility claim.

| Area                | Primary code path                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slot names and set  | `crates/bitty-lua/src/ui.rs` (`UiSlot`, `UI_SLOTS`, `UiSlot::parse`)                                                                                                                      |
| Slot host policy    | `crates/bitty-runtime/src/runtime/band_slots.rs` (`ui_slot_placement`, `unsupported_slot_error`)                                                                                          |
| Mount/update gates  | `crates/bitty-runtime/src/plugin_runtime/services.rs` (`ui_mount`, `ui_mount_scene`)                                                                                                      |
| Lua bindings        | `crates/bitty-lua/src/host.rs` (`bitty.ui.mount`, `update`, `unmount`, `state` bindings)                                                                                                  |
| v1 node validation  | `crates/bitty-lua/src/ui.rs` (`UI_V1_NODE_KINDS`, `read_component`)                                                                                                                       |
| v2 rich validation  | `crates/bitty-lua/src/ui_rich.rs` (`read_rich_component`, `UI_RICH_NODE_KINDS`)                                                                                                           |
| Band paint/hit-test | `crates/bitty-runtime/src/runtime/band_host.rs`, `crates/bitty-runtime/src/runtime/present.rs`                                                                                            |
| Terminal scene host | `crates/bitty-runtime/src/scene_host.rs`, `crates/bitty-runtime/src/runtime/scene_present.rs`                                                                                             |
| Overlay surfaces    | `crates/bitty-runtime/src/plugin_runtime/overlay.rs`, `crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`                                                                   |
| Headless tests      | `crates/bitty-runtime/tests/lua_ui_parity.rs`, `crates/bitty-runtime/tests/host_chrome_gaps.rs`, `crates/bitty-runtime/tests/band_groups_hover.rs`, `crates/bitty-lua/tests/ui_bridge.rs` |

## Slot reconciliation

The accepted closed set is seven names. The bridge owns the names; the host owns
one placement decision per name, and the mount gate and the band routing both
call the same function, so a slot cannot be admitted and then dropped.

| Slot       | Status                     | Host behavior in this build                                                                                                                                                                                                                                                                                                                                                                                                | Code path                                                                                                                                                                                                                     |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal` | implemented                | Read with the v2 rich reader (the accepted `SceneNode` gallery) and attached to the focused leaf by the Core scene host. A v1 `Text`/`Row`/`Column`/`List` tree mounted on `terminal` is rejected `E_UI_UNAVAILABLE`; a build without a scene backend also fails closed.                                                                                                                                                   | `crates/bitty-lua/src/host.rs` (`mount` binding), `crates/bitty-runtime/src/plugin_runtime/services.rs` (`ui_mount_scene`), `crates/bitty-runtime/src/scene_host.rs`                                                          |
| `top`      | implemented                | Edge band: one window row per visible mount, stacked from the window edge inward, painted by the band host, and carved out of the layout container as an exclusive zone.                                                                                                                                                                                                                                                   | `crates/bitty-runtime/src/runtime/band_slots.rs`, `crates/bitty-runtime/src/runtime/band_host.rs` (`band_exclusive_container`, `visible_band_count`)                                                                          |
| `bottom`   | implemented                | Same band path as `top`, stacked upward from the last window row.                                                                                                                                                                                                                                                                                                                                                          | Same paths.                                                                                                                                                                                                                   |
| `left`     | accepted-but-unimplemented | Accepted name with no vertical band host. The mount fails closed with the typed `E_UI_UNAVAILABLE` after the capability and claim gates; no handle is returned and nothing is stored, placed, or reserved.                                                                                                                                                                                                                 | `crates/bitty-runtime/src/runtime/band_slots.rs` (`Unsupported` branch)                                                                                                                                                       |
| `right`    | accepted-but-unimplemented | Identical to `left`.                                                                                                                                                                                                                                                                                                                                                                                                       | Same path.                                                                                                                                                                                                                    |
| `tabline`  | accepted-but-unimplemented | Requires the `workspaceline` exclusive claim (`E_UI_CLAIM_REQUIRED` without it), then fails closed with `E_UI_UNAVAILABLE`: reserved for panel tabs, no band host.                                                                                                                                                                                                                                                         | `crates/bitty-runtime/src/plugin_runtime/services.rs` (`ui_mount` claim gate), `crates/bitty-runtime/src/runtime/band_slots.rs`                                                                                               |
| `overlay`  | implemented                | Requires `ui.rich` plus `ui.overlay`. The block is retained by the Core focusable-overlay surface and can own a transient input capture through `bitty.ui.overlay.*` (`ui.overlay.focus`), and can be presented non-modally through `bitty.ui.present.show` (`ui.present`). It is never a band and reserves no rows. Declared `on_click`/`on_scroll`/`on_hover`/`region` data on overlay nodes is retained but not routed. | `crates/bitty-runtime/src/plugin_runtime/services.rs`, `crates/bitty-runtime/src/plugin_runtime/overlay.rs`, `crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`, `crates/bitty-runtime/src/runtime/present.rs` |

Two candidate statements need correcting on this table. The Chrome Band
Contract's `Lua-mounted chrome` item 1 lists `top`/`bottom`/`left`/`right` and
`statusline` but never names `terminal` or its rich reader. The Chrome Surface
API describes the `terminal` rich read but not that a v1
`Text`/`Row`/`Column`/`List` tree on that slot is refused. Both are host facts
recorded here so the next revision of each candidate can state them once.

## Node and field reconciliation

### Node kinds

The v1 bridge accepts four kinds; the `terminal` scene path accepts the accepted
nine-kind gallery. The v1 rejection is typed (`E_UI_COMPONENT_INVALID`) and
happens before any host call.

| Kind        | Status      | Reachable from Lua                               | Notes                                                                                              |
| ----------- | ----------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `Text`      | implemented | v1 band/overlay bridge and `terminal` scene path | Only kind that carries `bold` on the rich path; v1 also takes `fg`/`bg`.                           |
| `Row`       | implemented | v1 band/overlay bridge and `terminal` scene path | A band scene's root `Row` is the only place `anchor` resolves.                                     |
| `Column`    | implemented | v1 band/overlay bridge and `terminal` scene path | Band flattening concatenates `Column` children horizontally; the overlay paints them as rows.      |
| `List`      | implemented | v1 band/overlay bridge and `terminal` scene path | v1 `List` composes vertically; the rich reader maps it to a column.                                |
| `Block`     | implemented | `terminal` scene path only                       | Optional `border = { width = 0..=8 }`. Excluded from the v1 bridge with a typed rejection.         |
| `Image`     | implemented | `terminal` scene path only                       | Positive integer `placement` id; the host paints it through the image protocol, no bytes from Lua. |
| `CodeBlock` | implemented | `terminal` scene path only                       | Optional `lang` hint, bounded to 32 bytes.                                                         |
| `Table`     | implemented | `terminal` scene path only                       | Bounded to 256 rows and 4096 cells per node; rows and cells count against `SCN-1`.                 |
| `Rule`      | implemented | `terminal` scene path only                       | No fields.                                                                                         |

The honest reading is that "implemented" here means _implemented on one bridge_.
A band or overlay node kind is still exactly `Text | Row | Column | List`; the
five richer kinds belong to the terminal scene gallery and are rejected on the
band/overlay path, never silently ignored. Any later "composable chrome" work
that wants a bordered card in a band needs an accepted extension of the v1
subset, not a reuse of the scene gallery.

### Node fields

| Field                                    | Status      | Applies to                                 | Notes                                                                                                                                                                                                                                    |
| ---------------------------------------- | ----------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fg`, `bg`                               | implemented | v1 band and overlay nodes                  | Resolved against a closed five-token table (`foreground`, `background`, `cursor`, `selection`, `accent`). A well-formed but unknown token falls back to the span default and increments a host diagnostic count; raw colors are refused. |
| `bold`                                   | implemented | v1 band and overlay nodes, rich `Text`     | Painted with the host's synthetic double-strike; the rich path accepts it only on `Text`.                                                                                                                                                |
| `anchor`                                 | implemented | band scene root `Row` direct children only | `left`/`center`/`right` resolved against the presented band width. Declared anywhere else it fails closed (`E_UI_COMPONENT_INVALID`) rather than being ignored.                                                                          |
| `on_click`                               | implemented | v1 band nodes                              | `{ command, args }` with scalar bounded args; dispatches a registered command through the runtime command path. Overlay declarations are retained, not routed.                                                                           |
| `on_scroll`                              | implemented | every v1 node kind, band nodes             | Same shape as `on_click`; the host injects a signed `delta` as the last argument and reserves its arg slot so dispatch cannot exceed the argument cap.                                                                                   |
| `on_hover`                               | implemented | band nodes, requires `region`              | Dispatches the declared command with the region id and `phase = "enter" \| "leave"`; at most one pending transition per region, queue bounded. Hover never captures input.                                                               |
| `region`                                 | implemented | band nodes carrying a binding              | `{ id, kind = "module" \| "item" }`; the host derives the display-cell rectangle from painted spans, merges adjacent runs with one id, and refuses a band above the region cap as a whole.                                               |
| spacing, size, alignment beyond `anchor` | candidate   | —                                          | No spacing, padding, size-constraint, or cross-axis alignment field exists on either bridge.                                                                                                                                             |
| interaction-state styling                | candidate   | —                                          | No `hover`/`active`/`pressed` style state exists; a plugin re-mounts a tree to change appearance.                                                                                                                                        |
| raw colors, coordinates, thickness       | candidate   | —                                          | Refused by construction: the bridge has no field for them and Core owns band geometry.                                                                                                                                                   |

`anchor` and `on_hover` are the clearest example of why this record exists:
both are implemented, tested
(`crates/bitty-runtime/tests/band_groups_hover.rs`), attributed to bitty#2411,
and named by neither candidate.

## Retired names

These names are not slots and therefore carry no status row above; they are
listed here so a reader does not mistake their absence for an omission.

| Name         | Disposition                                                                                                                        | Evidence                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `statusline` | Retired. Rejected as an unknown slot with `E_UI_COMPONENT_INVALID` before any host call; status presentation composes on `bottom`. | `crates/bitty-lua/src/ui.rs` (`UiSlot::parse`), `crates/bitty-lua/src/host.rs` (mount binding) |

The Chrome Surface API still describes this removal as a live divergence from
accepted text. It is not: the accepted Lua Surface RFC was amended on
2026-10-26 and now states the same seven-name set, the same rejection code, and
the same `bottom`-band migration, so the corpus and the host agree. That
paragraph is stale and is corrected in this delivery.

## Capabilities

| Capability             | Status      | Gate                                                                                              | Code path                                                                                                                                  |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ui.rich`              | implemented | Every `bitty.ui.mount`/`update` on every slot, band and terminal scene alike.                     | `crates/bitty-runtime/src/plugin_runtime/services.rs` (`ui_mount`, `ui_mount_scene`)                                                       |
| `ui.overlay`           | implemented | The `overlay` slot specifically; not implied by `ui.rich`.                                        | Same, `ui_slot == UiSlot::Overlay` branch                                                                                                  |
| `ui.overlay.focus`     | implemented | Transient input capture through `bitty.ui.overlay.*`; never implied by `ui.overlay`.              | `crates/bitty-runtime/src/plugin_runtime/services.rs` (capture calls)                                                                      |
| `ui.present`           | implemented | Non-modal presentation of a mounted overlay block; `hide` stays ungated so teardown cannot wedge. | `crates/bitty-runtime/src/plugin_runtime/services.rs` (`ui.present` gate)                                                                  |
| `workspace.read`       | implemented | `bitty.workspace.list()` plus declaring, subscribing to, or receiving `workspace.*` topics.       | `crates/bitty-lua/src/host.rs` (`workspace_list`), `crates/bitty-runtime/src/plugin_runtime/mod.rs` (`WORKSPACE_EVENT_PREFIX`, event gate) |
| `workspace.control`    | implemented | `bitty.workspace.focus\|new\|next\|close\|rename\|move_panel`; separate from read, never implied. | `crates/bitty-lua/src/host.rs` (`workspace_request`), `crates/bitty-runtime/src/plugin_runtime/services.rs`                                |
| `panel.read`           | candidate   | Proposed for `bitty.panel.list()`; no such capability or list verb exists.                        | Absent; `bitty.panel.*` today is presentation and lifecycle control, not a domain read.                                                    |
| `terminal.status.read` | candidate   | Proposed identity-level terminal status read; absent.                                             | Absent.                                                                                                                                    |
| `plugins.read`         | candidate   | Proposed plugin-state read; absent.                                                               | Absent.                                                                                                                                    |

## Budgets

The candidates describe limits in two vocabularies: the accepted scene budgets
(`SCN-1..5`) and candidate band constants. The host enforces a per-generation
subset of the former and none of the latter.

| Bound                                                | Value             | Status                                 | Code path                                                                                       |
| ---------------------------------------------------- | ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Nodes per mounted component (`SCN-1`)                | 2048              | implemented                            | `crates/bitty-lua/src/ui.rs` (`UI_MAX_NODES`), `crates/bitty-lua/src/ui_rich.rs`                |
| Text bytes per component (`SCN-3`)                   | 256 KiB           | implemented                            | `UI_MAX_TEXT_BYTES` in both readers                                                             |
| Tree depth from Lua                                  | 16                | implemented                            | `UI_MAX_DEPTH`; deliberately stricter than accepted `SCN-2 = 32`                                |
| Blocks per plugin generation (`SCN-5` shape)         | 64                | implemented                            | `UI_MAX_BLOCKS`                                                                                 |
| Retained string bytes per generation (`SCN-4` shape) | 2 MiB             | implemented                            | `UI_MAX_AGGREGATED_TEXT_BYTES`; charges every host-retained string, not just `Text`             |
| Terminal-wide `SCN-4`/`SCN-5` aggregation            | —                 | deferred                               | Per-generation accounting only; host-composer aggregation is a separate slice                   |
| Per-band per-frame node cap                          | —                 | candidate (`BAND_MAX_NODES_PER_FRAME`) | No such constant or render gate in the runtime                                                  |
| Truncation marker at overflow                        | —                 | candidate                              | No overflow rendering path; a mount above the node cap is refused, not truncated                |
| Band thickness clamp                                 | —                 | candidate (`BAND_MAX_THICKNESS_PX`)    | Band height is one window row per visible mount; no px/row thickness resolution                 |
| Click args per binding                               | 16                | implemented                            | `UI_CLICK_MAX_ARGS`                                                                             |
| Click arg bytes / command id bytes                   | 256 / 64          | implemented                            | `UI_CLICK_MAX_ARG_BYTES`, `UI_CLICK_MAX_COMMAND_BYTES`                                          |
| Region id bytes / regions per band                   | 64 / 64           | implemented                            | `UI_MAX_REGION_ID_BYTES`, `BAND_MAX_REGIONS` in `crates/bitty-runtime/src/runtime/band_host.rs` |
| Scroll drain queue                                   | 8                 | implemented                            | `BAND_SCROLL_QUEUE_MAX`                                                                         |
| Coalesced scroll delta                               | 4096.0 saturating | implemented                            | `UI_SCROLL_DELTA_SATURATE`                                                                      |
| Pending hover transitions per frame                  | 8                 | implemented                            | `UI_HOVER_QUEUE_MAX` in `crates/bitty-lua/src/ui.rs`                                            |
| Workspace rows per `bitty.workspace.list()`          | 16                | implemented                            | `WORKSPACE_LIST_MAX_ITEMS`, asserted equal to the Core workspace capacity                       |
| One surface per plugin per edge                      | —                 | candidate                              | Several mounts from one plugin on one edge are all kept and stacked                             |

The per-generation reading of `SCN-4`/`SCN-5` is a strict subset of the accepted
terminal-wide numbers, so it cannot exceed the accepted ceiling; it also does not
deliver it. Two plugins each holding 2 MiB are not bounded by any implemented
aggregate today.

## Interaction reconciliation

| Path                                   | Status      | Behavior                                                                                                                                                                              | Code path                                                                                       |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Band click / scroll / hover            | implemented | Band-only. Resolved against the presented-frame spans, queued as declared command plus host args, dispatched through the command registry. No plugin VM is entered on the input path. | `crates/bitty-runtime/src/runtime/band_host.rs` (`band_item_regions`, `plugin_band_hit`)        |
| Band button parity (left/right/middle) | implemented | Region-aware clicks carry `button`; a legacy span without a region keeps primary-button-only dispatch and its original payload.                                                       | Same; `crates/bitty-runtime/src/runtime/present.rs`                                             |
| Overlay scene-node pointer routing     | deferred    | Declared bindings on overlay nodes are retained as data and route nothing; overlay interaction is the `ui.overlay.focus` capture path.                                                | `crates/bitty-runtime/src/runtime/present.rs` (retained-not-routed comment and paint path)      |
| Overlay style paint parity             | implemented | Overlay rows resolve the same five-token table and paint `fg`/`bg`/`bold` through the same flattened-run path as bands; an unstyled row keeps the pre-parity single-pill paint.       | `crates/bitty-runtime/src/runtime/present.rs`; `crates/bitty-runtime/tests/lua_ui_parity.rs`    |
| Focus                                  | implemented | Chrome is never a focus target: band presses consume the row, and a pointer event inside a band never reaches the grid.                                                               | `crates/bitty-runtime/tests/host_chrome_gaps.rs`, `crates/bitty-runtime/tests/lua_ui_parity.rs` |
| Drag-onto-item (PW-8)                  | candidate   | No drop-target binding or drag routing exists on either bridge.                                                                                                                       | Absent.                                                                                         |
| Stacking order key                     | candidate   | Host stacks by plugin id byte order only; `chrome.<edge>.order` is not wired into the runtime.                                                                                        | `crates/bitty-runtime/src/runtime/band_slots.rs` (`from_mounts` sort, module note)              |
| Degradation order                      | candidate   | Host hides every visible band together when they do not fit above the content floor, rather than hiding innermost-first by priority.                                                  | `crates/bitty-runtime/src/runtime/band_host.rs` (`plugin_band_budget`)                          |

## Divergences between the candidates and the host

Each row is a statement still present in a candidate that the host contradicts,
or a host behavior at least as strong as the candidate's that the candidate does
not record.

| #   | Candidate statement                                                                                             | Host fact                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Chrome Surface API: "No Lua workspace read API and no workspace events exist."                                  | `bitty.workspace.list()` returns bounded identity rows, `workspace.*` topics are published and gated by `workspace.read`, and mutation functions are gated by `workspace.control`.  |
| 2   | Chrome Surface API: the accepted Lua Surface RFC "still lists `statusline` … diverge until the RFC is revised". | The RFC amendment landed on 2026-10-26 and states the seven-name set; there is no outstanding divergence.                                                                           |
| 3   | Both: band thickness resolves from px/rows configuration and clamps to a named bound.                           | Height is exactly one window row per visible mount; there is no thickness configuration on the band path.                                                                           |
| 4   | Both: a second mount on the same edge from one plugin fails with a diagnostic.                                  | Every mount is kept. Bands order by plugin id, and the sort is stable, so one plugin's own mounts keep mount order while plugin ids never do.                                       |
| 5   | Both: a per-band per-frame cap truncates with a marker and a diagnostic.                                        | No per-frame cap and no truncation path; the mount-time node cap refuses the tree instead.                                                                                          |
| 6   | Both: unknown theme tokens reject the mount (fail closed).                                                      | Unknown but well-formed tokens resolve to the span default and increment a host diagnostic count; only wrong types, unknown attributes, and malformed shapes reject.                |
| 7   | Both: degradation hides surfaces innermost-first by priority.                                                   | Degradation is all-or-nothing per window: if the visible bands plus the content floor do not fit, no band reserves a row.                                                           |
| 8   | Both: the workspace mutation surface is a set of Core commands invoked by `on_click`.                           | Mutations are `bitty.workspace.*` functions gated by `workspace.control` that enqueue bounded Core workspace requests; `on_click` still names registered commands, not these verbs. |
| 9   | Neither candidate mentions `anchor`, `on_hover`, `bitty.ui.unmount`, or `bitty.ui.state`.                       | All four are implemented (`crates/bitty-lua/src/ui.rs`, `crates/bitty-lua/src/host.rs`) and covered by headless tests.                                                              |

## Residual gaps

These are the concrete blockers for the remaining scope of
[bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191). The
reconciliation item is answered by this record; the additive-vocabulary,
backward-compatibility, bounds/fail-closed, and dogfood items are blocked as
follows. Each gap names what would have to land, not merely that it is missing.

1. **No additive composition vocabulary.** `anchor` is the only placement
   control; there is no spacing, padding, size constraint, capsule/badge
   primitive, or interaction-state styling. Any bar that wants grouped capsules
   today composes them out of `Row`/`Text` and accepts default spacing. The
   issue's additive-vocabulary item has no accepted contract and no
   implementation, so it stays open.
2. **No accepted extension of the v1 node subset.** `Block`, `Table`, `Rule`,
   `CodeBlock`, and `Image` exist only on the terminal scene path. A band cannot
   draw a bordered card, so any contract that promises bordered chrome has to
   extend the v1 subset deliberately rather than borrow the scene gallery.
3. **Layout and style work remain unbounded as quantities.** Node count, depth,
   text bytes, retained strings, and per-binding argument bytes are bounded;
   layout work per frame, style-resolution work, and update cadence are not.
   "Bound layout work and style resolution" from the issue has no implemented
   counter.
4. **Terminal-wide budget aggregation is deferred.** Per-generation `SCN-4`/
   `SCN-5` accounting cannot bound the sum across plugins.
5. **Overlay pointer routing has no accepted contract.** Both candidates record
   the deferral; nothing can consume overlay `region`/`on_click` data until an
   overlay hit-test and geometry contract is accepted.
6. **Vertical bands are unhosted.** `left`/`right` fail closed, so the four-edge
   geometry in the Chrome Band Contract stays half-implemented and the
   workspace-rail question stays open.
7. **Stacking and multiplicity are undecided.** `chrome.<edge>.order` is not
   wired and the one-surface-per-edge rule is not enforced; both are composition
   semantics a plugin author would rely on.
8. **Token namespaces are unpromoted.** The five-token table is the whole style
   vocabulary; capsule and state theming need the Theme Token Contract, which
   also gates fail-closed rejection of unknown tokens.
9. **The bar capsule dogfood is gated, not scheduled.** The issue's headed
   validation ("one plugin-owned capsule/pill composition") has no counterpart
   in the `bitty` test tree, whose band coverage is entirely headless, and it
   cannot happen before the additive vocabulary exists. This record adds no
   headed evidence of its own.
10. **Accessibility roles for chrome regions are unrecorded.** Regions are
    derived paint geometry with no announced role, so a bar remains opaque to
    assistive tooling.

## Open points

- Whether the additive vocabulary (spacing, size, state styling) extends the v1
  node fields or introduces a new composition layer above them.
- Whether band scenes ever accept the richer scene kinds, and under which
  bounds.
- Whether `chrome.<edge>.order` or plugin id order is the contract, and whether
  one plugin may hold several surfaces on one edge.
- Whether degradation stays all-or-nothing or adopts the candidate priority
  order.
- Whether workspace mutation verbs are exposed as commands (bindable by
  `on_click`) in addition to Lua functions.
- Attention flag sources: the row shape and per-flag names exist, but every flag
  is currently reported `false` because Core has no per-workspace source.

## References

- [Chrome Surface API (Candidate)](chrome-surface-api-candidate.md) — surfaces,
  domain data, and composition.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) — band
  geometry, reflow, degradation, and interaction.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome inventory and read-only rules.
- [Rich Presentation RFC](rich-presentation-rfc.md) — `SCN-1..5` and the
  `SceneNode` gallery.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) — token
  namespaces behind `fg`/`bg`.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — the accepted slot set, node subset, and `ui.overlay`/`ui.present` split.
- [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191) — the
  reconciliation issue this record answers for its first item.
- [bitty#2411](https://github.com/bitty-terminal/bitty/issues/2411) — band group
  anchors, hover dispatch, and button routing.
- [bitty#2785](https://github.com/bitty-terminal/bitty/issues/2785) — the
  `terminal`-slot scene host.
