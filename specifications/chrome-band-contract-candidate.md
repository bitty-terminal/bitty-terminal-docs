---
title: Chrome Band Contract (Candidate)
description: Candidate contract for chrome bands that reserve window edges so the workspace bar and plugin chrome never occlude terminal content including geometry content regions and interaction
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 64
---

# Chrome Band Contract (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record states the chrome-band
> contract for the owner-approved design answering
> [bitty#1431](https://github.com/bitty-terminal/bitty/issues/1431) (the
> workspace bar painted over terminal content). It authorizes no shipped
> behavior, weakens no accepted source it cites, and makes no implementation
> claim beyond its `Landed surface` section, which records what the host does
> today at a named pin without promoting any rule here. The rest of the
> implementation is **planned** under separate `bitty` tasks; every type name,
> configuration key, and constant below that is not marked landed is a
> candidate spelling.
>
> Partly superseded: the owner direction moves bar content to optional Lua
> plugins. The Core-rendered `workspace` pills and the `workspace.bar.colors`
> and `workspace.bar.pill_align` keys are superseded by the candidate
> [Chrome Surface API](chrome-surface-api-candidate.md); band geometry, reflow,
> degradation, and hit-test geometry here remain in force.
>
> Per-item implementation status for every rule below — including which slot
> names have a host surface, which node kinds the bridge accepts, and which
> bounds are enforced — is recorded in the
> [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md).
> This record keeps the contract text; the reconciliation record carries the
> evidence.

## Purpose and scope

Today the workspace bar (`1:ws2* 2:ws3 (2)`) is drawn inside the window area
that the compositor also hands to panels, so the bar occludes the last terminal
rows. The [Chrome Surface Contract](chrome-surface-contract-candidate.md)
already says chrome geometry is Core-owned and that a Bar edge change
recomputes the tiling area; it does not say how that area is derived, how a
narrow window degrades, what a band contains, or how a pointer reaches it. This
record fills that gap with one concept: the **chrome band**.

In scope:

- band geometry: edges, thickness, the layout container, the usable content
  extent, the content floor, and narrow-window degradation;
- the reflow and PTY-size rule when a band appears, disappears, resizes, or
  changes edge;
- band content: `left`/`center`/`right` regions, the built-in `workspace`
  module, and Lua-mounted chrome within the accepted budgets;
- band interaction: pill click, hit-testing, and drag-onto-pill;
- the candidate configuration keys for the workspace bar.

Out of scope and owned elsewhere: the Status Module Registry, module cadence,
and module budgets (draft, [Status System Specification](status-system.md));
the chrome surface inventory and read-only rules (candidate,
[Chrome Surface Contract](chrome-surface-contract-candidate.md)); panel tabs and
the tab strip (candidate PW-10,
[Panel and Workspace Interaction](panel-workspace-interaction-candidate.md));
the Lua event surface and capability dimensions (owner-pending,
[OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
theme token resolution (candidate,
[Theme Token Contract](theme-token-contract-candidate.md)); decoration px
values (accepted, [Workspace Compositor](workspace-compositor.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), invariant 7 (bounded inputs).
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  the `Window -> Workspace -> LayoutTree -> View` hierarchy, Core-owned
  `gaps_out` and decoration insets, the no-window-leak rule, command-registry
  interactions, and the rule that every interaction is undoable through the
  same command surface.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): panel identity, focus
  routing, and the `4+1` overlay envelope.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): the scene
  limits `SCN-1` (2048 nodes per block) and `SCN-3` (256 KiB text per block).
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): `bitty.ui.mount(slot, component)`, the closed seven-name slot set
  (`terminal | top | bottom | left | right | tabline | overlay`), the v1 node
  subset (`Text | Row | Column | List`), the exclusive `tabline` claim, and
  "host layout owns placement and decoration".
- [Chrome Surface Contract](chrome-surface-contract-candidate.md) (candidate):
  rules 1 to 10; this record refines rule 2 and composes with the rest.
- [Status System Specification](status-system.md) (draft): the registry
  `left`/`center`/`right` model, the closed built-in module set, bounded
  segment output, and the `bitty --safe` minimal bar.

## Terminology

| Term                  | Meaning in this document                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Chrome band           | A Core-owned strip reserved along one window edge (`top`, `bottom`, `left`, `right`) that hosts chrome, never grid cells. |
| Band thickness        | The band's extent perpendicular to its edge, in logical px after resolution; zero when the band is hidden.                |
| Layout container      | The window content rectangle minus every visible band; the compositor tiles only inside it.                               |
| Usable content extent | `max(container - decoration insets, 0)` per axis; the area `LayoutTree` distributes among panels.                         |
| Content floor         | The minimum usable content extent that keeps every tiled panel at or above the compositor's per-pane minimum.             |
| Region                | One of `left`, `center`, `right` inside a band, mirroring the Status Module Registry slots.                               |
| Workspace pill        | One rendered segment of the built-in `workspace` module, representing exactly one workspace.                              |
| Band frame            | One present cycle of a band; the unit the per-band render cap counts against.                                             |

## Band geometry (Core-owned)

### Edges and thickness

1. The contract defines four band edges: `top`, `bottom`, `left`, `right`.
   Each edge holds at most one band. The host serves all four: `top` and
   `bottom` as one-row bands, `left` and `right` as column bands that stack one
   content row per root child, both carving their edge out of the layout
   container. _Corrected 2026-11-16 at `bitty@0f4d64b7`: this item said the
   v0.1 host shipped `top` and `bottom` only and that `left`/`right` were
   defined ahead of a later revision. The vertical band host landed in
   `bitty#3167` (`1994f6e6`) with input routing in `bitty#3172` (`76485e80`),
   so the deferral clause is spent and only the geometry rules below still
   apply unchanged to both axes._
2. Band thickness is resolved to logical px by Core. A configuration value in
   rows resolves as `rows x cell height` of the chrome font at the current
   scale; a value in px is used as-is. Resolution is clamped to a Core-owned
   bound (candidate named constant `BAND_MAX_THICKNESS_PX`) so a band can never
   consume the window.
3. No plugin, `LayoutProvider`, or Lua mount sets band edge or thickness. A
   Lua `top`/`bottom`/`left`/`right` mount contributes content to a band; the
   host decides whether and where that band exists.

### Layout container and usable content extent

For a window content rectangle `W` and visible band thicknesses
`t_top`, `t_bottom`, `t_left`, `t_right`:

```text
container.x      = W.x + t_left
container.y      = W.y + t_top
container.width  = max(W.width  - t_left - t_right,  0)
container.height = max(W.height - t_top  - t_bottom, 0)

usable = container inset by gaps_out and the accepted decoration insets,
         each axis clamped at 0
```

1. The compositor receives `usable`, never `W`. Bands therefore reduce the
   tiling area; they never overlap it.
2. **Grid content is never painted under a band.** No terminal cell, cursor,
   selection, or scrollback row is rasterized inside a band rectangle. The
   pre-contract behavior of drawing the workspace bar over the last grid rows is
   the defect this record removes.
3. Band rectangles are disjoint from each other. Corner ownership (which band
   owns the `top`-`left` corner when both exist) is resolved by a fixed Core
   order: horizontal bands (`top`, `bottom`) span the full window width;
   vertical bands (`left`, `right`) span the height between them.

### Content floor and narrow-window degradation

1. The content floor is derived from the compositor's per-pane minimum for the
   current `LayoutTree`; it is a Core-owned value defined in exactly one place,
   not a configuration key.
2. When the window is too small for all visible bands plus the content floor,
   bands hide before content drops below the floor. Hiding follows a fixed
   Core priority: plugin-only bands first, then the band carrying the
   `workspace` module last. A hidden-by-degradation band reappears when space
   returns, through the same reflow.
3. When even zero bands leave less than the floor, the usable extent is still
   `max(..., 0)` and the compositor's existing too-small behavior applies; no
   band is ever painted over content to compensate.
4. Degradation is presentation state, not configuration: it never rewrites
   `workspace.show_bar` or any other key.

### Reflow and PTY size

1. Showing, hiding, resizing, or moving a band to another edge is a layout
   change: Core recomputes the layout container and usable extent and runs the
   normal compositor reflow before the next present.
2. PTY size follows the resulting panel content area through the ordinary
   resize path (the same path a window resize uses, including its debounce and
   bounds). A band change **causes** a reflow, and the reflow is what resizes
   the PTY; rendering a band never resizes a PTY on its own.
3. This clarifies Chrome Surface Contract rule 2: "never resizes a PTY as a
   side effect" means that painting, updating, or animating band content has no
   PTY effect. A geometry change of a band is not a side effect; it is a layout
   input.
4. Band content updates that do not change thickness (a pill label changes, a
   plugin updates its subtree) cause band damage only and never reflow.
5. Band thickness transitions, if animated, commit geometry once at the final
   value; intermediate animation frames do not issue PTY resizes. Reduced
   motion and `bitty --safe` collapse to the final state.

## Band content

### Regions

1. Every band has three regions, `left`, `center`, and `right`, with the same
   semantics as the Status Module Registry slots: ordered identifier lists,
   render order equals declaration order, `left` then `center` then `right`.
2. Overflow follows the Status System rule: lower-priority segments truncate,
   then hide; nothing is drawn outside the band rectangle.
3. On `left` and `right` bands the vertical axis is live, and it is a stack of
   lines rather than a `left`/`center`/`right` split: the band stacks one line
   per direct child of its root and the region table emits one line of regions
   per line, top-down, from the same bounded walk the row table uses. A
   module's position on a column band is therefore its child index, not a
   region name. _Corrected 2026-11-16 at `bitty@0f4d64b7`: this item described
   the vertical mapping as future work; it shipped in `bitty#3172`
   (`76485e80`) as `collect_band_regions` over root children._

### Built-in `workspace` module

> Superseded by the candidate
> [Chrome Surface API](chrome-surface-api-candidate.md): Core renders no
> workspace pills. Workspace content comes from optional plugins through the
> L0 surface and L1 workspace domain; the rules below survive only as
> guidance for those plugins (stable identity, no derived counters, no content
> reads).

1. The `workspace` module renders **one pill per workspace**, in workspace
   order. Each pill shows the workspace name and its content state (active,
   has panels, attention), resolved through theme tokens.
2. A pill shows no auto-incrementing display number. The planned rendering
   replaces the current `1:ws2*` form; any index shown is the workspace's
   stable name or an explicit user-assigned label, never a derived counter
   that changes when other workspaces close.
3. The module reads workspace identity, name, order, and focus only; it never
   reads panel content (Chrome Surface Contract rule 3).
4. Superseded by [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md): `bitty --safe` has no built-in minimal
   bar. With no plugin mounted, no band is reserved, and workspace switching
   stays reachable through key bindings and commands.

### Lua-mounted chrome

1. Lua plugins keep `bitty.ui.mount("top" | "bottom" | ...)` with `Text`,
   `Row`, `Column`, and `List` nodes. `top`/`bottom` subtrees render inside the
   band on that edge. `left` and `right` are served by a column band: the
   subtree stacks one content row per direct child of a `Column`/`List` root,
   a `Text` root is one row, and a `Row` root is refused at mount with
   `E_UI_COMPONENT_INVALID` because a horizontal composition cannot stack down
   a column (corrected 2026-11-16 at `bitty@0f4d64b7`; this sentence said the
   slots fail closed with `E_UI_UNAVAILABLE`, which was true before
   `bitty#3167` `1994f6e6`). `statusline` is not a slot: Core
   removed it in CTX-1140 (`bitty#1962`), the name fails as an unknown slot
   with `E_UI_COMPONENT_INVALID`, and a bar plugin composes status presentation
   on `bottom` instead.
2. Core renders mounted subtrees within the existing per-component budgets
   (`UI_MAX_NODES`, `UI_MAX_TEXT_BYTES`, matching `SCN-1` and `SCN-3`) plus a
   **per-band per-frame render cap** (candidate named constant
   `BAND_MAX_NODES_PER_FRAME`). Nodes beyond the cap are not laid out for that
   frame, the band renders a truncation marker, and a diagnostic is recorded;
   the frame still presents.
   _Current host note (CTX-1419, bitty PRs #2385 `cd6b0724` and #2392
   `c816b00e`, `bitty@26360f15`):_ the per-frame cap is not implemented. The
   host enforces the accepted scene budgets per plugin generation instead —
   64 retained blocks and a 2 MiB retained-string aggregate per generation
   (the `SCN-4`/`SCN-5` numbers, with the aggregate charging every
   host-retained string); terminal-wide aggregation stays deferred, and this
   record does not promote it.
3. `tabline` stays an exclusive claim reserved for future panel tabs (PW-10).
   It is not a band region and does not host workspace pills.
4. A mount never supplies coordinates, thickness, or edge; host layout owns
   placement exactly as the Lua Surface RFC states.
5. **Band style is flat.** A band node may declare the rich `style` table
   (`padding`, `radius`, `border`, `border_token`), because the v1 surface
   tolerates an unknown optional field on an additive minor. The host drops it
   and reports once per generation — a diagnostic, not a refusal, because the
   tree is already mounted. A band paints `fg`/`bg`/`bold` only: `padding`, a
   rounded ring, and a border width are not painted in a band. The four
   primitives host on the `terminal` rich path
   (`bitty#3175` `a64c283c`, tightened by `bitty#3176` `0f4d64b7`); hosting them
   on a band is a separate accepted-extension decision and is not done here.
   _Added 2026-11-16 at `bitty@0f4d64b7`; the earlier text said nothing about a
   band `style` key, which was correct before it existed._

## Band interaction

1. **Click.** A primary click on a workspace pill dispatches the workspace
   focus command through the command registry. Bands never take keyboard or
   IME focus (Chrome Surface Contract rule 6).
2. **Hit-testing shares band geometry.** Pointer hit-testing uses the same
   band and pill rectangles the renderer used for the presented frame; there is
   no second geometry source. A pointer event inside a band never reaches the
   grid, and a pointer event in the usable extent never reaches a band.
3. **Drag onto a pill.** Dropping a dragged panel on a pill's center zone moves
   the panel into that workspace and switches to it; dropping on a pill's edge
   zone creates a new workspace containing the panel at that position. This
   reuses the PW-8 drag-to-Bar semantics, runs as one validated compositor
   update, respects the workspace capacity bound and the never-empty invariant
   (PW-6), and is undoable through the same command surface.
4. On horizontal bands, edge zones are the pill's leading and trailing ends
   along the band axis, which resolves the PW-8 question of horizontal-edge
   behavior for `top` and `bottom`.
5. Lua event names for band clicks and drops remain owner-pending
   ([OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
   this record defines the command-registry path only.
6. **Per-item regions.** One band block may declare several hit regions, one
   per module or item, by adding
   `region = { id = "<bounded id>", kind = "module" | "item" }` beside an
   `on_click`/`on_scroll` binding. Core derives each region's one-row
   display-cell rectangle from the same flattened spans the renderer paints,
   clips it to the band rectangle, and merges adjacent spans with one
   identity. A plugin never supplies coordinates, and the region grants no
   new capability; dispatch still runs a registered command with its usual
   grants.
7. **Buttons and ownership parity.** Left, right, and middle presses and
   releases on a band row are Core chrome: the matching release dispatches
   the region's command with `button = "left" | "right" | "middle"`, and a
   non-matching release is consumed without disturbing the armed gesture.
   A legacy span without a region keeps its primary-button-only dispatch
   and its original args payload. Right and middle presses therefore never
   paste the clipboard behind a band. Back and forward buttons fall through
   unchanged.
8. **Deterministic resolution and bounds.** A pointer column resolves to
   exactly one region; where regions overlap, the last-registered (topmost)
   region wins. A band may emit at most `BAND_MAX_REGIONS` (`64`) distinct
   regions; above the cap the whole band's region table is refused
   fail-closed (no click or scroll routes, the frame still presents, and the
   overflow is counted). Regions are rebuilt from the current tree on every
   hit-test, and every queued action carries the presented band origin
   (generation, mount handle, slot, version, edge, row), so a reflow,
   remount, or replacement version refuses a stale region before dispatch.
   Neither emission nor hit-testing enters a plugin VM.
9. **Overlay scene nodes are not band interactions** (kept deferred by
   CTX-1419, bitty PRs #2385 `cd6b0724` and #2392 `c816b00e`,
   `bitty@26360f15`): bindings mounted in the focusable `overlay` slot are
   accepted and retained but route no pointer events, because no accepted
   overlay hit-test/geometry contract exists. Overlay interaction is the
   separately gated `ui.overlay.focus` capture path; band click/scroll/region
   routing stays band-only, and this record does not promote overlay
   routing.

### Wheel scroll routing

1. **Scroll.** A wheel tick over a band row whose flattened span binds
   `on_scroll` queues a `BandScrollRequest` (owner, command verb, declared
   args, host-computed `delta`) and consumes the tick: Core chrome wins,
   mirroring band presses. Resolution is `Hit` (queue the owner's command),
   `NoClaim` (route nothing), or `Denied` (foreign qualifier or empty verb,
   denied loudly). Unbound rows fall through to the viewport, capture, and
   alternate-screen paths unchanged.
2. **Coalescing.** Consecutive ticks for one target coalesce with saturating
   `i32` math into the trailing queued request, so a burst drains as one
   dispatch through the normal `PluginRuntime::dispatch_command` path with
   its registration and capability gates.
3. **Drain contract.** The scroll drain queue holds at most
   `BAND_SCROLL_QUEUE_MAX` (`8`) requests; overflow drops the newest request
   fail-closed. Counters: `scrolls_routed`, `scrolls_coalesced`,
   `scrolls_denied`, `scrolls_unclaimed`, and `scroll_queue_drops`.
4. **Overlay-capture parity.** Wheel capture merges trailing ticks by
   saturating sum bounded by `UI_SCROLL_DELTA_SATURATE` (`4096.0`), counted
   in `wheel_coalesced`. Malformed payloads fail closed to an opaque append:
   kept, never merged.

## Candidate configuration keys

| Key                    | Values                                                               | Default (candidate)                             |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `workspace.show_bar`   | Boolean (bar-plugin key; Core runtime mapping deleted, `bitty#1721`) | `true` (bar-plugin default)                     |
| `workspace.bar.edge`   | `top` or `bottom` (bar-plugin key; Core runtime mapping deleted)     | `bottom` (bar-plugin default)                   |
| `workspace.bar.size`   | Thickness in logical px or rows                                      | One row of the chrome font                      |
| `workspace.bar.colors` | `active` and `inactive` pill colors, as theme token names            | `chrome.bar.active` and `chrome.bar.foreground` |

1. The keys are candidate spellings validated through `ConfigPlan`; unknown
   edges and out-of-range sizes fail validation with source-attributed
   diagnostics.
2. `workspace.bar.edge` accepts `left` and `right` only once a later revision
   ships vertical bands; until then those values are rejected, not silently
   mapped. _2026-11-16 at `bitty@0f4d64b7`: the host half of that condition is
   now met (all four edges are served), but the key is still a bar-plugin key
   with no Core runtime mapping, and the config type it parses into carries
   only `Top` and `Bottom` — `WorkspaceBarEdge::parse` is exact and
   fail-closed. Widening the value set is a bar-plugin or later-revision
   decision, not something this record or the host has done._
3. `workspace.bar.colors` (and the unmerged `workspace.bar.pill_align`) is
   superseded and will not be introduced; plugin surfaces use theme token
   style attributes under the
   [Chrome Surface API](chrome-surface-api-candidate.md). `workspace.show_bar`
   and `workspace.bar.edge` are bar-plugin keys: `bitty-config` still parses
   them for the bar plugin while the Core runtime mapping was deleted
   (`bitty#1721` `819f286`); the candidate defaults above carry over.
4. Changes to `edge`, `size`, and `show_bar` are live-reconcilable and take
   effect through the reflow above.

## Landed surface (verified 2026-11-16 at `0f4d64b7`)

Re-derived symbol by symbol from the `bitty` code repository at `0f4d64b7`
(`origin/main` has since advanced to `631f1f9c`, a test-only commit that adds
`crates/bitty-runtime/tests/band_four_edge_geometry.rs` and changes no source
symbol). Paths are relative to that repository. This section states what the
band host does today; it promotes nothing and leaves the contract text above
unchanged. The `ui.state` row was read at `a8abf31c` ([bitty#3181](https://github.com/bitty-terminal/bitty/pull/3181)),
which is later than `0f4d64b7` and touches only that rule, its consumer, and its
new test.

| Band aspect     | What the host does today                                                                                                                                                                                                                                                                                                                             | Evidence                                                                                                                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Edges           | All four are real band edges, enumerated in construction order `top`, `bottom`, `left`, `right`.                                                                                                                                                                                                                                                     | `crates/bitty-runtime/src/runtime/band_slots.rs:86` (`enum BandEdge`), `:130` (`BAND_EDGES: [BandEdge; 4]`)                                                                                                                          |
| Axis            | Each edge declares its stacking axis: `top`/`bottom` are `Row`, `left`/`right` are `Column`.                                                                                                                                                                                                                                                         | `band_slots.rs:99` (`enum BandAxis`), `:121` (`BandEdge::axis`)                                                                                                                                                                      |
| Slot placement  | One placement decision per accepted slot: `top`/`bottom`/`left`/`right` → `Band`; `overlay` → `Overlay`; `tabline` and a v1 `terminal` tree → `Unsupported` (`E_UI_UNAVAILABLE`).                                                                                                                                                                    | `band_slots.rs:154` (`ui_slot_placement`), `:156`-`:175`                                                                                                                                                                             |
| Scene direction | A row band admits every v1 root. A column band stacks one line per direct child of a `Column`/`List` root, admits `Text` as one line, and refuses a `Row` root typed.                                                                                                                                                                                | `band_slots.rs:226` (`band_scene_matches`), `:242` (`band_scene_direction_error`, `E_UI_COMPONENT_INVALID`)                                                                                                                          |
| Row geometry    | One window row per visible mount; the container loses exactly those rows. Degradation is all-or-nothing: when the visible rows plus the content floor do not fit, the budget is `(0, 0)`.                                                                                                                                                            | `crates/bitty-runtime/src/runtime/band_host.rs:1947`-`:1969` (`plugin_band_budget`), `:2140` (`band_row_container`)                                                                                                                  |
| Column geometry | One column range per visible mount, width measured from the root, one line per root child, top-down.                                                                                                                                                                                                                                                 | `band_host.rs:624` (`column_band_width`), `:645` (`column_band_rows`), `:2121` (`visible_band_column`)                                                                                                                               |
| Exclusive zone  | Horizontal bands reserve rows and vertical bands reserve columns from that rect, so no terminal cell paints under a band on either axis; the no-mount frame is byte-identical to before.                                                                                                                                                             | `band_host.rs:2165` (`band_exclusive_container`)                                                                                                                                                                                     |
| Content floor   | One Core-owned floor per axis, derived from the compositor content floor plus gaps and the live decoration ring: `chrome_min_rows`, `chrome_min_cols`.                                                                                                                                                                                               | `crates/bitty-runtime/src/runtime/layout_focus.rs:3836`, `:3859`                                                                                                                                                                     |
| Unfittable band | Each vertical side is capped at an equal part of the window's spare columns above the content floor and above a half-window content share (`BAND_COLUMN_CONTENT_SHARE_DIVISOR = 2`); the band that crosses the cap is granted the remainder and clipped to it, so a 79-column line in an 80-column window leaves 40 content columns rather than one. | `band_host.rs:148`, `:2007`-`:2040` (`column_band_plan`), `:1983` (`plugin_band_column_budget`)                                                                                                                                      |
| Paint           | Column bands plan separately and paint through the same clipped span renderer as row bands. The shared chrome rule is one muted strip on the content-facing edge either way: horizontal across a row band, one vertical strip for the whole column band (never one per content line).                                                                | `crates/bitty-runtime/src/runtime/present.rs:6260` (`paint_chrome_bands`), `:6411` (`paint_band_row` rule), `:6556` (`paint_band_column_rule`)                                                                                       |
| Hit-testing     | One axis-parameterized hit test resolves either axis through the granted band rect, then narrows onto the band's own content line. Click, wheel, hover, and release share that one mapping.                                                                                                                                                          | `band_host.rs:2236` (`plugin_band_cell_hit`), `:2306` (`band_line_at`)                                                                                                                                                               |
| Gesture origin  | A queued action carries the presented band origin — row **and** granted column — so a reflow on either axis refuses a stale gesture before dispatch.                                                                                                                                                                                                 | `band_host.rs:987` (`struct BandOrigin`)                                                                                                                                                                                             |
| Regions         | One line of regions per column-band root child from the same bounded walk the row table uses; 64 distinct regions per band, fail-closed above the cap.                                                                                                                                                                                               | `band_host.rs:2378` (`band_item_regions`), `:768` (`collect_band_regions`), `:131` (`BAND_MAX_REGIONS`)                                                                                                                              |
| Input queues    | Click queue 8 and scroll queue 8, newest dropped and counted past the cap; wheel capture saturation `4096.0`.                                                                                                                                                                                                                                        | `band_host.rs:90`, `:99`; `crates/bitty-lua/src/ui.rs:298`                                                                                                                                                                           |
| `ui.state`      | A painted band reports `presented = true` on both axes. `slot_state_rule` keys on the band content gate for all four band edges and returns `NeverPresented` only for `tabline` and `terminal`; a contentless band and a direction-mismatch refusal stay `false`.                                                                                    | `bitty` at `a8abf31c`: `band_slots.rs:220` (`slot_state_rule`), `:226` (`NeverPresented` arms), `crates/bitty-runtime/src/plugin_runtime/services.rs:3377` (`ui_block_state`), `crates/bitty-runtime/tests/band_column_presented.rs` |
| Tests           | Band coverage at this pin: `band_column_input.rs` (left/right click, hover, wheel, origins, regions, clipping), `band_groups_hover.rs`, `chrome_bands_render.rs`. The four-edge acceptance test (`band_four_edge_geometry.rs`: extents, disjoint rects, routing on all four edges, degrade without underflow) is at `631f1f9c`.                      | `crates/bitty-runtime/tests/`                                                                                                                                                                                                        |

### Deferred

- **`BAND_MAX_THICKNESS_PX`, px/row thickness resolution, and the clamp.** No
  such symbol exists. A row band is one window row; a column band is the width
  of its widest root child clipped to its granted share. A mount still supplies
  no coordinates, thickness, or edge.
- **`BAND_MAX_NODES_PER_FRAME`, the truncation marker, and its diagnostic.**
  None exists; the per-generation block and retained-string budgets do the
  bounding instead.
- **Priority-ordered degradation.** Neither axis implements "plugin-only bands
  first, then the band carrying the `workspace` module": rows are all-or-nothing
  and columns clip to an equal share. A hidden-by-degradation band reappears
  when space returns, because both budgets are recomputed per frame.
- **One band per edge.** The host serves every visible band on an edge and
  stacks them by plugin id; a second mount neither replaces nor fails.
- **Animated thickness transitions.** There is no thickness value to animate.
- **`workspace.bar.edge` accepting `left`/`right`.** The config type still
  carries `Top` and `Bottom` only (`crates/bitty-config/src/types.rs:3225`,
  `:3236`), even though the host serves both vertical edges.
- **Excluded APIs.** `register_panel` has no host path. `PanelId` and
  `PanelProvider` are Core-internal types (the provider is capability-gated in
  the registry host; a `PanelId` is the handle `bitty.panel.create` yields),
  absent from the `bitty.ui.*` composition surface, as are Level 3/4
  presentation and protocol registration.

### Residuals for bitty#2191

1. **Corpus sweep over the same claim class: closed (2026-11-16).** When this
   residual was written, [Chrome Surface Contract](chrome-surface-contract-candidate.md),
   [UI Runtime](ui-runtime-candidate.md), and
   [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md)
   still described the vertical slots as unhosted. All three now state the
   landed surface at `bitty@a8abf31c`, and a re-grep of the corpus finds no
   remaining record that calls `left`/`right` unhosted or fail-closed. The item
   stays in the list, marked closed, so the sweep is not mistaken for an open
   gap.
2. **Acceptance criterion 1 of bitty#2191 needs an independent review.** This
   record plus [Chrome Surface API](chrome-surface-api-candidate.md) now state
   the shipped surface at a named pin; whether that is a sufficient contract for
   the reviewer is the open question, and neither record is `Accepted`.
3. **Two verification-plan items cannot pass.** The per-band frame budget has
   no host counterpart (item 7, and the truncation marker it asserts), and
   degradation is not priority-ordered (item 4), so neither may be claimed.
4. **Column-band `ui.state` (fixed 2026-11-16).** `slot_state_rule` used to
   return `NeverPresented` for `left`/`right`, so a painted column band reported
   `presented = false`. That is fixed at `bitty#3181` (`a8abf31c`): the rule now
   returns `BandVisibility` for all four band edges and `NeverPresented` only
   for `tabline` and `terminal`, and `PluginServices::ui_block_state` consumes
   that one placement decision (`band_slots.rs:220`-`:226`,
   `crates/bitty-runtime/src/plugin_runtime/services.rs:3377`;
   `crates/bitty-runtime/tests/band_column_presented.rs` drives it end to end).
   Contentless bands and the direction-mismatch refusal still report `false`,
   so the closed cases did not widen. Not a host defect any more.
5. **`anchor` does not resolve on a column band**, so the three-region
   `left`/`center`/`right` reading above is row-band only in practice
   (`services.rs:6737`-`:6746`).

## Reconciliation (2026-11-14)

> Superseded in part on 2026-11-16 by the
> [Landed surface](#landed-surface-verified-2026-11-16-at-0f4d64b7) section
> above. This one is kept as what the earlier re-read found at `26360f15`, and
> its `left`/`right` sentence is information about that pin only.

This record was re-read against `bitty` at `26360f15` (`origin/main`). The band
host behind the `top` and `bottom` slots is implemented and unchanged in shape:
one window row per visible mount, an exclusive zone carved out of the layout
container, stacking by plugin id with a stable sort, and all-or-nothing
degradation when the visible bands plus the content floor do not fit the window.
No band row is ever painted inside the container, so the occlusion defect this
record answers is closed in the host. `left` and `right` have no vertical band
host and fail closed `E_UI_UNAVAILABLE`; `tabline` needs the `workspaceline`
exclusive claim and then fails closed as reserved for panel tabs.
_That `left`/`right` sentence is now stale: the vertical band host landed after
this pin (`bitty#3167` `1994f6e6`, routing `bitty#3172` `76485e80`) and both
slots are served; the [Landed surface](#landed-surface-verified-2026-11-16-at-0f4d64b7)
table above is the current reading, including the `ui.state` rule fixed at
`bitty#3181` (`a8abf31c`). The `tabline` sentence still holds._

Still candidate here, with no host path performing it: px/row thickness
resolution and its clamp, the per-band per-frame node cap and its truncation
marker, priority-ordered degradation, and one-surface-per-edge multiplicity.

Corrected in this revision, because the corpus contradicted the code: the
normative-source list quoted the accepted slot set with eight names, including
`statusline`, which is not a slot and is rejected as unknown; it now quotes the
seven-name set. The current-host notes pin `26360f15` instead of `7d98f53a`.

Per-clause status — `implemented`, `accepted-but-unimplemented`, `candidate`,
`deferred`, or `contradicted-by-code` — is in the
[Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md). This
record keeps its `status: draft` and its contract text; this section records
evidence, not acceptance.

## Security review

Bands are presentation surfaces with no new authority. The contract adds no
capability, host API, or slot: Lua mounts use the accepted closed slot set and
the accepted per-component budgets, and the new per-band per-frame cap only
tightens resource use. Two properties matter for review: a band can never
occlude or read grid content, which removes a spoofing vector where chrome
text overlays terminal output; and band geometry reaches the PTY only through
the ordinary resize path with its existing bounds. Click and drop interactions
route through the command registry as validated updates. No `P0` criterion is
affected; a security reviewer is required if a later revision lets a plugin
influence band thickness or edge.

## Verification plan

1. A headless geometry test asserting `usable` equals window minus visible
   band thicknesses and decoration insets, clamped at zero, for each edge
   combination.
2. A render test asserting no grid cell is rasterized inside any band
   rectangle, reproducing the bitty#1431 layout as a regression case.
3. A test asserting that toggling `workspace.show_bar` or changing
   `workspace.bar.edge` issues exactly one PTY resize through the ordinary path
   with the new content size, and that a band content update issues none.
4. A degradation test shrinking the window until bands hide in the documented
   priority order before the content floor is crossed, and reappear on growth.
5. A hit-test test asserting clicks inside a band dispatch the workspace focus
   command for the pill under the pointer and never reach the grid.
6. A drop test covering pill center (move and switch), pill edge (new
   workspace), capacity bound, and undo.
7. A budget test asserting a mounted subtree above `BAND_MAX_NODES_PER_FRAME`
   truncates with a diagnostic and the frame still presents.
8. A scroll test asserting a wheel over a bound row queues one
   `BandScrollRequest` with the host `delta`, a burst coalesces into one
   dispatch, overflow past `BAND_SCROLL_QUEUE_MAX` drops the newest and
   counts it, and unbound rows fall through to the viewport path.
9. A region test asserting the id/kind/rect round trip, adjacent-span
   merge, overlapping last-registered tie-break, click and scroll routing to
   the correct item, right/middle no-clipboard behavior, a `65`-region band
   routing nothing, and a version bump refusing an armed region gesture.
10. `just check` passes for this document and every linked update.

## Alternatives considered

| Alternative                                                  | Trade-off                                                                        | Disposition                                                                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the bar as an overlay and reserve rows inside each pane | No layout change; every pane loses rows and the overlay still hides content      | Rejected — occlusion remains                                                                                                            |
| Treat the bar as a tiling leaf in `LayoutTree`               | Reuses split geometry; breaks the accepted hierarchy and lets layout move chrome | Rejected — chrome is not a panel                                                                                                        |
| Let plugins size and place bands                             | Flexible; violates Core-owned geometry and the Lua Surface placement rule        | Rejected                                                                                                                                |
| Define only `top`/`bottom` geometry                          | Smaller contract; forces a rewrite when vertical bands or the rail arrive        | Rejected — four edges defined; the host shipped the row axis first and the column axis later (`bitty#3167`), so the rewrite was avoided |
| Keep the numbered `1:ws2*` label                             | Familiar; numbers shift as workspaces close and conflict with stable identity    | Rejected — pills show name and state only                                                                                               |

## Affected contracts

| Contract                                                                                                                                        | Effect                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md) (candidate)                                                                     | Rule 2 clarified: band geometry is a layout input; rendering never resizes a PTY    |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) (candidate)                                                         | PW-4 geometry and recomputation items resolved here; PW-8 horizontal edges resolved |
| [Status System Specification](status-system.md) (draft)                                                                                         | Bottom-only v1 placement extends to `top`/`bottom` bands through this record        |
| [Chrome Surface API](chrome-surface-api-candidate.md) (candidate)                                                                               | Supersedes Core pills and `workspace.bar.colors`; bands hold plugin surfaces        |
| [Tabs Scope Decision](tabs-scope-decision.md) (draft)                                                                                           | Workspace pills live on the band; panel tabs stay PW-10 on `tabline`                |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                        | Unchanged; the compositor receives the usable extent as its tiling area             |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md) (accepted) | Unchanged; mounts gain a documented band host and a per-band per-frame cap          |

## Open points

- Numeric values for `BAND_MAX_THICKNESS_PX`, `BAND_MAX_NODES_PER_FRAME`, and
  the pill center/edge zone widths.
- Whether a band is per-`Window` or per-`Workspace` when multiple windows
  arrive (composes with the Multi-Window Scope Decision).
- Whether the WorkspaceRail becomes a `left`/`right` band or a separate surface
  (Chrome Surface Contract rule 10, U-4).
- Lua event names and payloads for band click and drop (OQ-056).
- Pill attention-state sources and their bound (bell, activity, exit status).
- Accessibility roles and announcements for pills (accessibility baseline).
- Overlay scene-node pointer routing for declared bindings (kept deferred;
  the implemented boundary is band-only routing, bitty#2191 PRs #2385/#2392,
  CTX-1419).

## Acceptance criteria

1. A reviewer confirms each rule composes with the normative sources above and
   weakens none of them.
2. PW-4, the Status System, the Chrome Surface Contract, and the Tabs Scope
   Decision link this record and agree with it.
3. The verification plan maps to planned `bitty` tests before any
   implementation claim is recorded here.
4. Acceptance happens through the owner-pending Window Chrome RFC or an
   owner-accepted amendment, not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling increase, or
trust decision changes. The security review above records that disposition.

## References

- [Chrome Surface API (Candidate)](chrome-surface-api-candidate.md) — plugin
  surfaces, domain data, and composition that supersede the Core pills.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome inventory and read-only rules.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
  — PW-4 Bar configurability, PW-8 drag-to-Bar, PW-10 panel tabs.
- [Status System Specification](status-system.md) — registry regions and
  built-in modules.
- [Tabs Scope Decision](tabs-scope-decision.md) — tab strip ownership.
- [Workspace Compositor Specification](workspace-compositor.md) — hierarchy,
  decoration insets, and interaction undo.
- [Rich Presentation RFC](rich-presentation-rfc.md) — `SCN-1` and `SCN-3`
  scene limits.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) —
  `chrome.bar.*` tokens.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — `bitty.ui.mount` and the closed slot set.
- [bitty#1431](https://github.com/bitty-terminal/bitty/issues/1431) — workspace
  bar occludes terminal content.
