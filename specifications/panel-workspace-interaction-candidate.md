---
title: Panel and Workspace Interaction (Candidate)
description: Draft candidate record of Mod-drag Panel movement floating mode Bar configurability stable identity never-empty Workspaces drag-to-Bar semantics and a capability-gated Lua surface
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 37
---

# Panel and Workspace Interaction (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a design record for the
> recorded Panel/Workspace interaction direction: the part the Bitty terminal
> platform would own if the direction were ever reviewed and accepted. It
> authorizes no shipped, stable, or compatibility-guaranteed behavior, weakens
> no accepted source it cites, and makes no implementation claim. Gesture
> spellings, geometry bounds, Bar placement values, and Lua shapes repeated here
> are direction, not contract.

## Purpose and scope

This document freezes the recorded Panel/Workspace interaction direction so
future design work starts from a stable input instead of reconstructing the
discussion. It refines, by reference only, the accepted
[Workspace Compositor Specification](workspace-compositor.md) interactions and
identity hierarchy, the accepted [Panel Runtime RFC](panel-runtime-rfc.md)
presentation modes and focus routing, the draft
[Status System Specification](status-system.md) bar model, and the candidate
[Workspace Panel Invariants](workspace-panel-invariants.md) identity and
lifecycle set. It changes none of them.

In scope (all **Candidate** unless cited otherwise):

- PW-1: `Mod`+left-drag Panel repositioning and free validated resizing inside
  one Workspace.
- PW-2: `Mod`+V tiled/floating toggle confined to the Bitty surface.
- PW-3: animated open, close, move, resize, workspace switch, and float-toggle
  transitions.
- PW-4: Bar edge placement, height, colors, indicator color, animations,
  active-workspace color, and hiding.
- PW-5: stable Panel and Workspace identity independent of display order and
  `Mod`+Number.
- PW-6: the never-empty Workspace invariant and its lifecycle consequences.
- PW-7: cross-Workspace moves by chord and by manual drag, including onto the
  Bar.
- PW-8: drag-to-Bar tiling-WM semantics over the Workspace indicator.
- PW-9: the capability-gated Lua command, query, and event surface.

Out of scope and owned elsewhere (pointers, not content):

- panel lifecycle, overlays, focus routing, and the Event Bus contract
  (accepted, [Panel Runtime RFC](panel-runtime-rfc.md));
- VT parser, grid, cursor, mode, damage, reply, and scrollback truth (accepted,
  [Terminal State RFC](terminal-state-rfc.md));
- the StatusBar module registry, `SystemMetricsService`, and Provider
  composition (draft, [Status System Specification](status-system.md); PW-4
  records only the placement and chrome direction);
- plugin manifest, capability grammar, and resource budgets (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/isolation-resource-rfc.md));
- unified `Mod` scope (open,
  [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
  Lua capability dimensions and API version (open,
  [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
- shared governance, decision, and security corpora (linked, never copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

Hyprland is a **read-only philosophy reference** for this document, exactly as
in the accepted
[Workspace Compositor Specification](workspace-compositor.md#hyprland-workspace-tiling-philosophy-import):
no Hyprland or Waybar source, configuration syntax, file-concatenation
semantics, or wire format is copied, supported, or executed. Every direction
below is re-expressed as a typed, validated Bitty contract candidate, and the
accepted no-window-leak rule stays in force — inside `Workspace` tiling the
unit is a `View`/Panel, `Window` names only the native OS window owned by
`bitty-platform`, and no geometry, command, or Lua value exposes a window
handle, native surface, or OS window identifier
([No window leak](workspace-compositor.md#no-window-leak)).

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the recorded design direction only; no review has accepted it.           |
| Owner-pending     | Belongs to an owner decision or another document owner; recorded as a pointer.       |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## PW-1 Panel movement and sizing (Candidate)

**Candidate.** `Mod`+left-drag repositions a Panel within the current Workspace,
and a Panel resizes freely between very small and very large through validated
geometry. Every gesture stays inside the Bitty terminal.

Terminal-side conclusions, composed with the accepted
[interactions](workspace-compositor.md#interactions-drag-resize-move-scratchpad):

- The reposition gesture extends the accepted drag interaction (pointer drag on
  `View` border or decoration re-parents the leaf through the command registry
  as a validated `LayoutTree` update) with an explicit modifier; it is not a
  direct pointer write into layout.
- Free resizing maps to the accepted split-`ratio` mechanics: a resize adjusts
  the targeted `H` or `V` `ratio`, never reorders leaves, and out-of-range
  values are rejected rather than clamped. Very small and very large are
  expressed as validated geometry bounds, not as unbounded coordinates; the
  accepted `ratio` range `[0.1, 0.9]`, the zero-area rule (a zero-area
  rectangle never reaches a PTY,
  [WS-INV-21](workspace-panel-invariants.md#geometry-and-damage)), and the
  `[1,1024]` grid clamp remain the floor and ceiling until a reviewed amendment
  says otherwise.
- Drag and resize are presentation interactions: they never run inside the VT
  parser or the damage-to-snapshot path, and they never mutate terminal grid,
  cursor, modes, or scrollback.
- The gesture cannot create, reference, or expose an OS window; the accepted
  no-window-leak rule is not weakened.

**Open.** The modifier spelling, remapping surface, and conflict diagnostics
belong to the unified `Mod` contract (owner-pending, [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md));
this document names no default. Exact minimum and maximum Panel sizes (cells or
logical px), the resize handle hit area, and whether free resize is direct
manipulation or a command-driven resize are undecided.

## PW-2 Floating mode (Candidate)

**Candidate.** `Mod`+V toggles the focused Panel between tiled and floating. A
floating Panel overlays other Panels but cannot leave the Bitty surface.

Terminal-side conclusions:

- The toggle maps to the accepted `PresentationMode` field on `View` (`Tiled`
  live today; `Floating` parses but every cross-mode transition is gated in the
  shipped slice) and to the accepted overlay tier order
  `Editor < Float < Popup < Messages`, whose `Float` tier the `bitty-ui`
  presentation layer already reuses for overlay-like modes
  ([Workspace Compositor shipped slice](workspace-compositor.md#shipped-slice-implementation-evidence),
  [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md#native-tiling-window-form-directions)).
- Floating is not overlay: the accepted
  [presentation modes](panel-runtime-rfc.md#presentation-modes) keep `floating`
  as a real panel with lifecycle, focus, move, and resize, and reserve `overlay`
  for instantaneous interaction layers; the two are never conflated even though
  both draw above tiles.
- A floating Panel stays inside the Bitty surface: its geometry derives from the
  `Window` logical area and is clipped there; it never becomes an OS window and
  never re-enters the `LogicalRect -> PTY` resize path as a side effect of float
  geometry.
- Mode transitions route through the command registry as validated compositor
  updates and never mutate terminal state.

**Open.** Which transition gate lifts `Floating` to live, whether a floating
Panel remembers its tiled slot and restores it on toggle-off, how focus and
input routing prioritize overlapping floating Panels, and whether floating
geometry is free or anchored are undecided; the accepted mode-transition
contract stays
[`RFC-OQ-9`](panel-runtime-rfc.md#open-questions) territory.

## PW-3 Animations (Candidate)

**Candidate.** Panel open, close, move, resize, workspace switch, and
float-toggle transitions animate.

Terminal-side conclusions:

- The accepted animation contract
  ([Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md),
  OQ-040) already covers open, close, focus, and workspace-switch transitions as
  renderer-side presentation chrome: durations are integers in `0..=500` ms,
  easing is a closed enum, `enabled = false`, reduced motion, and `bitty --safe`
  collapse to the final committed state instantly, and terminal content, cursor,
  selection, and scrollback are never interpolated.
- The move, resize, and float-toggle transitions are **Candidate additions** to
  that accepted set; they must obey the same rules and stay presentation-only.
- Animation ownership and limits are explicit: animations must not enter the VT
  parser or the damage-to-snapshot hot path, must never block input routing, PTY
  reads, or the damage-to-present path, and must never animate grid content. A
  transition is an overlay on already-computed geometry, cancelled to the latest
  committed state when its end snapshot is invalidated.

**Open.** Which owning document defines the move, resize, and float-toggle
leaves (an RFC-0002 revision or a successor animation contract), their duration
and easing defaults, whether float-toggle reuses the accepted open/close curves,
and how the candidate per-Panel animation overrides (OQ-043, candidate and
narrowed) compose with Bar and Panel transitions are undecided. No new leaf or
key is defined here.

## PW-4 Bar configurability (Candidate)

**Candidate.** The Bar (the StatusBar of the
[Status System Specification](status-system.md)) can be placed on any edge (top,
bottom, left, right), change height, colors, slider/indicator color, animations,
active-workspace color, and be hidden. A Bar edge change changes the Workspace
area the Bar occupies.

Terminal-side conclusions:

- This direction **refines the draft Status System Specification; it does not
  change it.** That draft fixes placement to one bottom-anchored bar for v1 and
  states that layer and position are not user-configurable beyond module enabled
  state and ordering
  ([Waybar module philosophy import](status-system.md#waybar-module-philosophy-import)).
  The extended configurability is Candidate and would enter through that
  document's own open items or a successor Bar RFC; until then the draft's
  bottom-anchored placement remains the only drafted position.
- The Bar is presentation, never Terminal Truth: it composes declarative status
  segments and never reads or mutates grid, cursor, modes, scrollback, or IPC
  policy; its modules keep their own cadence and failure posture.
- The Workspace area composition maps to accepted Core-owned decoration:
  `gaps_out` insets the Workspace tiling area within the `Window`, so a Bar edge
  necessarily reduces the area available to the compositor. Bar geometry is
  Core-owned presentation; no plugin or `LayoutProvider` sets it.
- Colors, indicator color, and active-workspace color compose with the accepted
  appearance surface (`appearance.theme`, `decoration.border_color*`,
  `appearance.animations.*` in the
  [Lua and XDG configuration](../configuration/lua-and-xdg.md#appearance-knobs-supported-reference));
  they are new Candidate keys and are not defined here.

**Open.** Whether edge placement, height, colors, indicator color, animations,
active-workspace color, and hiding land in the Status System draft, a Bar RFC,
or the appearance/configuration model; how the Workspace area, decoration
insets, and PTY geometry are recomputed for each edge; whether the Bar is
per-`Window` or per-`Workspace`; and how a hidden or relocated Bar behaves in
`bitty --safe` are undecided.

## PW-5 Stable identity (Candidate)

**Candidate.** Panels and Workspaces carry unique stable identifiers, never the
display ordinals `0, 1, 2, 3`. `Mod`+Number changes only the physical display
position. Identity persists across moves, Workspace switches, and restart — with
restart persistence explicitly Open below.

Terminal-side conclusions:

- The identity hierarchy is **Accepted**: `InstanceId`, `WindowId`,
  `WorkspaceId`, `ViewId`, and `TerminalId` are distinct newtypes with
  generation retirement rules
  ([Identity hierarchy](workspace-compositor.md#identity-hierarchy-and-viewid-distinct-from-terminalid)),
  and `PanelId` is a distinct newtype with `(id, generation)` stale-handle
  rejection
  ([Panel Runtime RFC](panel-runtime-rfc.md#identity-panelid-distinct),
  [WS-INV-2](workspace-panel-invariants.md#identity-and-uniqueness)). This
  document adds no identifier type and no bridge between families.
- `Mod`+Number is a display action: the number selects a physical presentation
  slot and never allocates, renames, or reorders an identity. A user-facing
  ordinal may exist as presentation, but no handle, command value, or Lua value
  is the ordinal; the identifier stays opaque.
- Moves and Workspace switches preserve identity: a moved Panel keeps its
  `PanelId` under the accepted move contract, and a switch never recreates
  content.
- Restart persistence is where the accepted corpus is not yet complete:
  workspace save and restore, serialization, versioning, and reattachment rules
  remain [`RFC-OQ-9`](panel-runtime-rfc.md#open-questions), and the terminal
  rule says rehydration creates a fresh `TerminalId` and `RuntimeId` under a
  stable `PersistentId` rather than resurrecting a live handle.

**Open.** Whether Panel and Workspace identity persists across restart as a
stable logical identity (and through which persistence contract, identifier
shape, and rehydration rules), and how that composes with the accepted registry
generation and `PersistentId` rules, is undecided; persists-across-restart is
recorded here as the design intent, not a contract. The `ViewId` retirement gap
(WS-INV-4, follow-up F-1) stays tracked in the candidate invariant set and is
not resolved here.

## PW-6 Never-empty Workspace invariant (Candidate)

**Candidate.** Every Workspace has at least one Panel; an empty Workspace does
not exist.

Terminal-side conclusions:

- The invariant aligns with the tested, implementation-level rule that a
  Workspace never strands empty: the last-leaf close is refused and closing the
  last Workspace resets to a fresh idle leaf
  ([WS-INV-13](workspace-panel-invariants.md#lifecycle)). The recorded direction
  is to make this invariant part of the compositor contract rather than only
  shipped behavior.
- Lifecycle consequence: closing the last Panel of a Workspace must reassign,
  merge, or move a Panel before the Workspace itself disappears, so the
  invariant holds at every commit boundary. The three outcomes are Candidate;
  the choice is not made here.
- The invariant must hold atomically: a cross-Workspace move validates source
  and destination before either commits, and a refused operation leaves layout,
  focus, and sessions unchanged, per the accepted interaction rules.

**Open.** The reconciliation with the accepted
[focus routing](panel-runtime-rfc.md#focus-routing) rule, which allows zero
focused targets when the active Workspace is empty, is undecided (a strict
never-empty invariant constrains when that state may arise). Also open: which of
reassign, merge, or move is the default last-Panel-close behavior, whether the
user is prompted, how a merge picks its target, and how workspace capacity
bounds interact.

## PW-7 Cross-Workspace moves (Candidate)

**Candidate.** `Mod`+Shift+Number moves the focused Panel to the numbered
Workspace. Manual drag can also move a Panel across Workspaces, including onto
the Bar.

Terminal-side conclusions:

- The chord maps to the accepted `move` interaction: a command or drag moves a
  `View` to another `Workspace` in the same `Window`, source and destination
  trees are validated atomically, and the moved content preserves identity and
  session
  ([Interactions](workspace-compositor.md#interactions-drag-resize-move-scratchpad)).
  The shipped implementation reference already carries the workspace-move chord
  under the current `Alt` default
  ([Lua and XDG](../configuration/lua-and-xdg.md#shipped-keymaps-and-mod-key));
  the unified `Mod` spelling stays owner-pending.
- A moved Panel keeps its identity: the move changes only the binding, and
  `TerminalId`/`PanelId` semantics survive; a single-leaf source Workspace is
  replaced by a fresh leaf so the never-empty invariant (PW-6) holds.
- Dragging a Panel across Workspace boundaries extends the accepted drag
  direction to a `Workspace` drop target; dragging it onto the Bar is the PW-8
  gesture and is a **new drop-target class** not present in the accepted
  interaction set.

**Open.** Whether drag-across-Workspace requires a dwell or a dedicated target
surface, how it previews the destination, and whether it is a direct
manipulation or an explicit command round-trip are undecided. The unified `Mod`
naming and conflict diagnostics remain with OQ-052.

## PW-8 Drag-to-Bar semantics (Candidate, tiling-WM semantics)

**Candidate tiling-WM semantics.** Dragging a Panel over a Bar slider (the
Workspace indicator) targets a Workspace:

- dropping on the slider **center** moves the Panel into that Workspace and
  switches the active Workspace to it;
- dropping near the slider's **left or right edge** creates a new Workspace
  containing only that Panel at that position.

Terminal-side conclusions:

- This is **candidate tiling-window-manager semantics, not an accepted
  contract.** No accepted document defines Bar drops, center/edge hit zones, or
  Workspace creation by drop; the accepted drag rules know only `View`-edge and
  `Workspace` drop targets, so PW-8 extends beyond them and is recorded as a
  direction for review.
- The gesture routes through the command registry as a validated compositor
  update and reuses the accepted atomicity rule; it never mutates terminal state
  and never creates an OS window.
- The indicator is the Bar's `workspace` module under the draft Status System
  registry; the gesture adds no new module and changes no module contract.
- A drop that creates a Workspace must respect the accepted capacity bound and
  the never-empty invariant (PW-6) at commit time.

**Open.** Hit-test thresholds (the width of the center zone versus each edge
zone, in cells or logical px), the preview affordance (slider highlight, drag
ghost, target outline), undo (the accepted rule requires every interaction to be
undoable through the same command surface), the exact meaning of position
(insertion index versus left/right ordering) and its composition with the
existing MRU workspace order, behavior at the workspace capacity bound, behavior
on top and bottom Bar edges where a horizontal slider has no left/right edge,
and the reconciliation with the accepted drag-target rules are undecided.

## PW-9 Lua API surface (Candidate)

**Candidate.** Every behavior above is intended to be exposed to Lua as
commands, queries, and events under the capability model, so Lua UI can drive
and observe Panel and Workspace interaction.

Terminal-side conclusions:

- The accepted security posture bounds the surface: Lua stays off performance
  hot paths, panel UI stays declarative and host-mediated, plugins receive no
  ambient authority, command dispatch is the only invocable path, and bus topics
  are manifest-declared, typed, bounded, and immutable
  ([Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Core and Plugin Boundaries](../architecture/core-boundaries.md),
  [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)).
- Every capability dimension the surface needs (workspace policies,
  presentation projection, semantic UI slots, event/action classes) and the API
  version it lands in are **owner-pending** under
  [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  no capability name is fixed here.
- The surface shape is commands (move, resize, toggle float, move to Workspace,
  create Workspace by drop outcome), queries (layout, identity, Bar state), and
  events (moved, workspace-changed, float-changed). Spellings and payload
  bounds are Illustrative-only.

```lua
-- Illustrative-only candidate shape; not an implemented API.
-- Command, query, and event spellings, capability names, and bounds are
-- undecided (owner-pending, OQ-056).
bitty.commands.invoke("bitty.panel:move", { panel = panel_id, workspace = workspace_id })
bitty.commands.invoke("bitty.panel:toggle_float", { panel = panel_id })

local layout = bitty.workspace.query("bitty.workspace:layout")

bitty.events.on("bitty.panel:moved", function(event) ... end)
```

**Open.** The command, query, and event names; the capability family and
per-action scopes; the payload schemas and bounds; whether the surface is a
dedicated `panel.*`/`workspace.*` family or an extension of existing
`ui.*`/`view.*` surfaces; the API version; and the relationship to the accepted
IPC verbs are undecided. Implementation-level workspace operations exist in the
shipped slice
([Workspace Compositor](workspace-compositor.md#shipped-slice-implementation-evidence))
and are shipped reference, not the contract proposed here.

## Owner-pending pointers

- Unified `Mod` — the modifier spelling, remapping surface, and conflict
  diagnostics for every `Mod` gesture above:
  [OQ-052](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (native window-form scope; also covers panel rules, semantic workspaces, and
  the niri ribbon direction).
- Lua capability API — the capability dimensions, scopes, and API version for
  PW-9:
  [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  the accepted manifest and capability surface stays authoritative until it is
  extended.
- Workspace/Panel lifecycle coupling — tracked with the candidate invariant set
  and
  [OQ-058](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  this document does not answer it.
- Animation transition ownership beyond the accepted RFC-0002 set is listed
  under PW-3 and is not assigned to an owner here.

## Relation to existing systems

| Direction                  | Status                                                                                                          | Owning document                                                                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PW-1 movement and sizing   | Candidate refining accepted drag/resize mechanics; `Mod` spelling Open (OQ-052)                                 | [Workspace Compositor](workspace-compositor.md) (Accepted)                                                                                                                                                                                        |
| PW-2 floating mode         | Candidate mapping onto the accepted `PresentationMode` and `Float` overlay tier; transition gate Open           | [Workspace Compositor](workspace-compositor.md) shipped slice, [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted)                                                                                                                               |
| PW-3 animations            | Move/resize/float-toggle leaves Candidate; open/close/focus/workspace already Accepted; ownership Open          | [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) (Accepted, `bitty-docs` owner)                                                                        |
| PW-4 Bar configurability   | Candidate refining the draft Status System placement contract; not a change to it                               | [Status System Specification](status-system.md) (Draft)                                                                                                                                                                                           |
| PW-5 stable identity       | Hierarchy Accepted; restart persistence Open (`RFC-OQ-9`); `ViewId` retirement gap tracked in the invariant set | [Workspace Compositor](workspace-compositor.md), [Panel Runtime RFC](panel-runtime-rfc.md), [Workspace Panel Invariants](workspace-panel-invariants.md) (Candidate)                                                                               |
| PW-6 never-empty Workspace | Candidate; aligns with tested Implementation-only WS-INV-13; empty-Workspace focus reconciliation Open          | [Workspace Panel Invariants](workspace-panel-invariants.md) (Candidate), [Panel Runtime RFC](panel-runtime-rfc.md) (Accepted)                                                                                                                     |
| PW-7 cross-Workspace moves | Accepted `move` atomicity; unified `Mod` naming Open (OQ-052); Bar drop target Candidate                        | [Workspace Compositor](workspace-compositor.md) (Accepted)                                                                                                                                                                                        |
| PW-8 drag-to-Bar semantics | Candidate tiling-WM semantics; conflicts with the accepted drag-target set remain Open                          | this document, composed with [Status System Specification](status-system.md) (Draft)                                                                                                                                                              |
| PW-9 Lua surface           | Candidate; capability dimensions and API version Owner-pending (OQ-056)                                         | [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md) (Accepted posture), [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) |

## Open items (not global open questions)

None of these is a global `OQ`: this document proposes no new contract boundary
and blocks no current-milestone gate, so under the
[open-question admission rule](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/documentation-workflow.md#open-question-admission)
they stay parked here until one qualifies. A future compositor or Bar
amendment, an RFC-0002 revision, or a persistence RFC settles them:

- owner review of each Candidate slice (PW-1 through PW-9), reconciled against
  the accepted compositor, panel-runtime, status, and identity contracts rather
  than copied as normative APIs;
- free-resize bounds and the resize handle model (PW-1), and the floating
  transition, restore, and focus rules (PW-2);
- the move, resize, and float-toggle animation leaves and their duration/easing
  ownership (PW-3);
- the Bar configurability owner and the Workspace-area recomputation for each
  edge (PW-4);
- Panel and Workspace identity persistence across restart and its composition
  with `PersistentId` rehydration and the WS-INV-4 retirement gap (PW-5);
- the last-Panel-close policy (reassign, merge, or move) and the
  zero-focus-on-empty-Workspace reconciliation (PW-6);
- drag-across-Workspace and drag-to-Bar hit zones, preview, undo, ordering,
  capacity, and vertical-edge behavior (PW-7, PW-8);
- the Lua command/query/event spellings, capability scopes, payload bounds, and
  API version (PW-9, OQ-056);
- the unified `Mod` spelling and conflict behavior (PW-1, PW-7, PW-8, OQ-052).

## References

- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  tiling, identity, decoration, and interaction contract.
- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted panel lifecycle,
  presentation modes, focus routing, and `PanelId` contract.
- [Workspace Panel Invariants (Candidate)](workspace-panel-invariants.md) —
  candidate identity, ownership, lifecycle, and focus invariant set.
- [Status System Specification](status-system.md) — draft StatusBar, module
  registry, and placement contract.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — point-in-time
  native window-form directions and the unified `Mod` question.
- [Input and Pointer Contract](input-pointer-rfc.md) — candidate default `Mod`,
  chord consumption, and dispatch priority.
- [Lua and XDG configuration](../configuration/lua-and-xdg.md) — shipped
  keymap, appearance, and animation reference.
- [Panel Extensibility Vision](../product/panel-vision.md) — candidate panel
  interaction directions recorded earlier.
- [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md) —
  accepted animation transition set and bounds.
- [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md) —
  accepted appearance and per-View override contracts.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) —
  mechanism-versus-policy, declarative UI, and capability split.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) —
  untrusted-by-default posture and hot-path invariants.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  and [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/isolation-resource-rfc.md) —
  capability grammar and resource ceilings.
- [Open questions register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) —
  OQ-052 and OQ-056 owner-pending decisions.
