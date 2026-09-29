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
> claim. Implementation is **planned** under separate `bitty` tasks; every type
> name, configuration key, and constant below is a candidate spelling.

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
  (accepted): `bitty.ui.mount(slot, component)`, the closed slot set
  (`terminal | top | bottom | left | right | tabline | statusline | overlay`),
  the v1 node subset (`Text | Row | Column | List`), the exclusive `tabline`
  claim, and "host layout owns placement and decoration".
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
   Each edge holds at most one band. The v0.1 implementation is **planned** to
   ship `top` and `bottom` only; `left` and `right` are defined here so later
   work adds edges without changing the geometry rules.
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
3. On `left` and `right` bands (future), regions map to start, middle, and end
   along the vertical axis.

### Built-in `workspace` module

1. The `workspace` module renders **one pill per workspace**, in workspace
   order. Each pill shows the workspace name and its content state (active,
   has panels, attention), resolved through theme tokens.
2. A pill shows no auto-incrementing display number. The planned rendering
   replaces the current `1:ws2*` form; any index shown is the workspace's
   stable name or an explicit user-assigned label, never a derived counter
   that changes when other workspaces close.
3. The module reads workspace identity, name, order, and focus only; it never
   reads panel content (Chrome Surface Contract rule 3).
4. In `bitty --safe`, the minimal bar (`workspace` + `clock`) of the Status
   System applies on the configured edge, falling back to `bottom` if the edge
   value is invalid.

### Lua-mounted chrome

1. Lua plugins keep `bitty.ui.mount("statusline" | "top" | "bottom" | ...)`
   with `Text`, `Row`, `Column`, and `List` nodes. `statusline` subtrees render
   inside the band carrying the Status Module Registry; `top`/`bottom` subtrees
   render inside the band on that edge. The planned v0.1 host does not create a
   `left`/`right` band for a mount alone.
2. Core renders mounted subtrees within the existing per-component budgets
   (`UI_MAX_NODES`, `UI_MAX_TEXT_BYTES`, matching `SCN-1` and `SCN-3`) plus a
   **per-band per-frame render cap** (candidate named constant
   `BAND_MAX_NODES_PER_FRAME`). Nodes beyond the cap are not laid out for that
   frame, the band renders a truncation marker, and a diagnostic is recorded;
   the frame still presents.
3. `tabline` stays an exclusive claim reserved for future panel tabs (PW-10).
   It is not a band region and does not host workspace pills.
4. A mount never supplies coordinates, thickness, or edge; host layout owns
   placement exactly as the Lua Surface RFC states.

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

## Candidate configuration keys

| Key                    | Values                                                    | Default (candidate)                             |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `workspace.show_bar`   | Boolean (existing key, retained)                          | `true`                                          |
| `workspace.bar.edge`   | `top` or `bottom`                                         | `bottom`                                        |
| `workspace.bar.size`   | Thickness in logical px or rows                           | One row of the chrome font                      |
| `workspace.bar.colors` | `active` and `inactive` pill colors, as theme token names | `chrome.bar.active` and `chrome.bar.foreground` |

1. The keys are candidate spellings validated through `ConfigPlan`; unknown
   edges and out-of-range sizes fail validation with source-attributed
   diagnostics.
2. `workspace.bar.edge` accepts `left` and `right` only once a later revision
   ships vertical bands; until then those values are rejected, not silently
   mapped.
3. `workspace.bar.colors` accepts theme token names from the
   [Theme Token Contract](theme-token-contract-candidate.md), never raw
   plugin-supplied colors.
4. Changes to `edge`, `size`, and `show_bar` are live-reconcilable and take
   effect through the reflow above.

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
8. `just check` passes for this document and every linked update.

## Alternatives considered

| Alternative                                                  | Trade-off                                                                        | Disposition                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Keep the bar as an overlay and reserve rows inside each pane | No layout change; every pane loses rows and the overlay still hides content      | Rejected — occlusion remains               |
| Treat the bar as a tiling leaf in `LayoutTree`               | Reuses split geometry; breaks the accepted hierarchy and lets layout move chrome | Rejected — chrome is not a panel           |
| Let plugins size and place bands                             | Flexible; violates Core-owned geometry and the Lua Surface placement rule        | Rejected                                   |
| Define only `top`/`bottom` geometry                          | Smaller contract; forces a rewrite when vertical bands or the rail arrive        | Rejected — four edges defined, two shipped |
| Keep the numbered `1:ws2*` label                             | Familiar; numbers shift as workspaces close and conflict with stable identity    | Rejected — pills show name and state only  |

## Affected contracts

| Contract                                                                                                                                        | Effect                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md) (candidate)                                                                     | Rule 2 clarified: band geometry is a layout input; rendering never resizes a PTY    |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) (candidate)                                                         | PW-4 geometry and recomputation items resolved here; PW-8 horizontal edges resolved |
| [Status System Specification](status-system.md) (draft)                                                                                         | Bottom-only v1 placement extends to `top`/`bottom` bands through this record        |
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
