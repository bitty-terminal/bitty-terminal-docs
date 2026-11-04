---
title: Panel GUI Content Presentation (Candidate)
description: Candidate contract for replacing a panel's terminal content with bounded declarative GUI content while the PTY stays alive and the panel keeps its placement
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 76
---

# Panel GUI Content Presentation (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record is the decision-ready design
> for [bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388). It
> records the owner correction of 2026-10-21: a Panel is already a container,
> so a GUI plugin supplies **panel content** and the panel/user keeps
> **placement**; the transition is a content-kind swap, not a plugin-defined
> presentation mode. `Mod+Q` stays the generic close gesture and no per-plugin
> exit key or plugin-owned placement authority is introduced.
>
> The record accepts nothing, promotes nothing to **Verified** or
> **Compatible**, and changes no accepted text. Capability identifiers, Lua
> spellings, content-variant names, event kinds, and bounds below are candidate
> spellings that a successor acceptance adopts or rejects.
>
> The rendering substrate is no longer the blocker. Two slices are implemented
> on `bitty` main: `bitty.ui.mount("terminal", …)` attaches an admitted scene
> that the present loop paints above a leaf's grid (`bitty` #2785/#2799,
> #2762/#2784), and `bitty.ui.present.show` draws a non-modal presentation-only
> surface above the focused view
> ([bitty#2849](https://github.com/bitty-terminal/bitty/issues/2849)). Those
> slices make the **paint path** and a **draw-only overlay** buildable. They do
> not implement this candidate's content-kind swap, displaced-terminal record,
> panel input routing, or restore path, and no panel-content capability or
> event exists (see "Current state"). The parts that are buildable today are
> therefore the renderer consumption and a bounded above-view surface; the
> panel-replacement contract and its lifecycle remain speculative. This
> document authorizes no implementation.

## Purpose and scope

A plugin that wants to show a dashboard, an inspector, or a structured
management surface has no way to make that surface a panel's durable content:
a scene mounted through `bitty.ui.mount("terminal", …)` paints above the grid,
and an overlay is transient and cannot replace the panel. Both are wrong for a
persistent application surface: the grid cannot express lists, tables, or
hit-testable rows, and an overlay does not become the panel's content. At the
same time, a panel's PTY must not be destroyed to show that surface, because
the shell session is the user's work.

This record answers one question: **how may a plugin present bounded
declarative content inside a focused panel, replacing the terminal's
presentation for as long as it is presented, without gaining placement, PTY,
file, pointer, or lifecycle authority?**

In scope:

- the two-axis model: panel **placement** (panel/user authority) versus panel
  **content kind** (Core transition between `Terminal` and `Gui`);
- the displaced-terminal record and the restore contract;
- a bounded declarative presentation descriptor and the capability gates;
- the recommended Lua surface and typed lifecycle;
- PTY preservation, geometry freeze, output/backpressure, and
  scrollback/cursor fidelity;
- focus and input ownership, the generic close/quit paths, and fail-closed
  crash/reload/disable behavior;
- per-placement semantics, the band exclusion, one-surface-per-panel, and the
  duplicate/nested error taxonomy;
- security analysis, audit evidence, migration of the dashboard, devtools,
  and the unchanged bar;
- the decisions an acceptance wave must take before implementation.

Out of scope and owned elsewhere: panel identity, lifecycle, focus routing, and
the overlay envelope (accepted
[Panel Runtime RFC](panel-runtime-rfc.md)); placement identity and
`ViewId`/`PanelId` encoding (candidate
[Panel Placement Decision](panel-placement-decision.md)); the `SceneNode`
schema and budgets (accepted
[Rich Presentation RFC](rich-presentation-rfc.md)); the non-terminal content
path (candidate
[Panel Content Scene Path Decision](panel-content-scene-path-decision.md));
band geometry and reflow (candidate
[Chrome Band Contract](chrome-band-contract-candidate.md)); the capability
vocabulary and manifest validation (accepted
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md));
the plugin author guide, the manual page, and the mode matrix as user-facing
documents (follow-up tasks).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 2 (no ambient authority), invariant 3 (presentation never Terminal
  Truth), invariant 4 (no hot-path plugin execution), invariant 7 (bounded
  inputs), invariant 8 (updates cannot silently add capabilities), and
  invariant 10 (`bitty --safe`).
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-01 resource exhaustion, T-06/T-07 plugin authority and hot paths, and T-10
  data flows.
- [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  (accepted): Workspace is a Core mechanism, panel/workspace presentation is
  plugin policy over Core primitives, and Core draws no chrome.
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted):
  `PanelId != ViewId != TerminalId`, the
  `Declared -> Created -> Mounted -> Focused -> Suspended -> Disposed`
  lifecycle, suspend without destroying attachment, focus routing, and the
  `4+1` overlay envelope.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  `Instance -> Window -> Workspace -> LayoutTree -> View`, Core-owned
  decoration, no window leak, and interaction atomicity.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  (accepted): `ViewId != TerminalId`, attachment/detachment, and move
  atomicity.
- [Terminal State RFC](terminal-state-rfc.md) (accepted): Terminal Truth is
  grid, cursor, modes, scrollback, and replies, with damage as derived state;
  resize enters through one path; the exact reflow algorithm remains that
  RFC's open point.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): the
  `SceneNode` contract and SCN-1..SCN-5 budgets, and the rule that rich
  presentation never becomes Terminal Truth.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): `bitty.ui.mount`/`update`, the closed slot set, the v1 node
  subset, host-owned layout, and the typed error classes.
- [Overlay and Input-Capture Host Contract](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/overlay-input-capture-contract.md)
  (accepted): the `ui.overlay.focus` precedent for a bounded, Core-owned,
  owner-polled input queue with no plugin callback on the input hot path.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)
  (draft): kind decides exclusivity, tier decides paint order, one modal
  authority per `Window`, and a new overlay-shaped feature must extend one of
  the three owners rather than add a fourth system.
- [Chrome Band Contract](chrome-band-contract-candidate.md) (candidate): bands
  are inset surfaces that reduce the tiling area and never overlap content.

## Terminology

| Term              | Meaning in this document                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel             | The workspace-managed container with a stable `PanelId`; it has a placement and a lifecycle, and it shows exactly one content kind at a time.                                                                                                                                                            |
| Placement         | The panel's mode in the compositor: `tiled`, `floating`, `fullscreen`, or `scratchpad`. Owned by the panel and the user, never by the plugin.                                                                                                                                                            |
| Content kind      | What the panel currently presents: `Terminal` (a PTY-backed grid) or `Gui` (a bounded declarative scene).                                                                                                                                                                                                |
| PTY               | The transport to the child process. It has no placement and no presentation semantics; the terminal content owner (a pane session or the runtime-global primary PTY) owns its reader and terminal state.                                                                                                 |
| Terminal Truth    | Parser state, grid, cursor, modes, replies, and canonical scrollback; mutable only by Core.                                                                                                                                                                                                              |
| GUI content       | Core-validated declarative content presented inside the panel's content rectangle through the Scene path. The accepted scene set is `Text`, `Row`, `Column`, `Block`, `Image`, `CodeBlock`, `Table`, `List`, and `Rule`; the subset this candidate admits is an acceptance decision (see the checklist). |
| GUI surface       | One generation-owned, opaque block handle backing a panel's GUI content.                                                                                                                                                                                                                                 |
| Displaced content | The Core-owned record of the terminal content, attachment, frozen content rectangle, and scroll position that the GUI content replaced.                                                                                                                                                                  |
| Owner             | The plugin identity plus execution generation that requested the GUI surface. The host records it; the caller cannot supply it.                                                                                                                                                                          |
| Generic close     | The existing `close_view` chrome action (default `Mod+q`) that pops the topmost dismissible layer and otherwise closes the focused panel.                                                                                                                                                                |
| Generic quit      | The existing window-close path (`quit` action, last-panel close, or window close request) that tears the application down.                                                                                                                                                                               |
| Band              | An inset edge surface (`top`/`bottom`) that reserves space outside the panel content rectangle. The bar is the existing special case.                                                                                                                                                                    |
| Fail-closed       | A failure leaves the previous valid content (or restores the displaced terminal) and never leaves a blank panel, an orphan PTY, or a keyboard trap.                                                                                                                                                      |
| Scene path        | The path by which bounded declarative content reaches the renderer outside the character grid. The paint half is implemented on `bitty` main; the panel content-kind half is this candidate.                                                                                                             |

## Current state (implementation facts only)

These facts describe `bitty` `origin/main` at `3bcebf91` (2026-11-05) and this
documentation corpus at `96e702e` (same date). "Implemented" here means
`Implemented-only`: the code is on main, but nothing in this record is
promoted, verified, or compatibility-guaranteed.

- `ViewContent` has five variants: `Empty`, `Terminal(u64)`, `Rich(u64)`,
  `Browser(BrowserSurfaceId)`, and `Panel(PanelId)`
  (`crates/bitty-ui/src/panel.rs`). The shipped present loop composes terminal
  cell grids for terminal leaves and, since `bitty` #2785/#2799, scene paint
  lists for leaves bound to a Core-owned scene panel
  (`crates/bitty-runtime/src/runtime/scene_present.rs`,
  `crates/bitty-runtime/src/runtime/present.rs`). `ViewContent::Rich` is not
  constructed by the live app; `Browser` and non-scene `Panel` leaves have no
  presenter. `PanelRuntime::nonterminal_for_leaf` is a present-plan projection
  only (`crates/bitty-runtime/src/cw_present.rs`,
  `crates/bitty-runtime/src/runtime/cw_live.rs`).
- `bitty.ui.mount("terminal", tree)` and `bitty.ui.update(handle, tree)` paint
  an admitted declarative scene today, but not by replacing a panel's content.
  The Lua bridge routes the `terminal` slot through the v2 rich reader
  (`read_rich_component`) and `ui_mount_scene`
  (`crates/bitty-lua/src/host.rs`); `SceneHost` creates a Core-owned `Rich`
  registry panel, binds it to the focused leaf Core publishes, admits the tree
  through `mount_rich_node`, and attaches the `Scene`
  (`crates/bitty-runtime/src/scene_host.rs`,
  `crates/bitty-runtime/src/scene_bridge.rs`). The present loop paints that
  scene after the leaf's grid primitives, clipped to the leaf content rect
  (`crates/bitty-runtime/src/runtime/scene_present.rs`,
  `crates/bitty-runtime/src/runtime/present.rs`). The leaf remains
  terminal-backed: its grid, cursor, focus, and PTY input path are unchanged,
  and the plugin receives no keys. The scene can visually cover the grid; it
  does not displace or restore it. `ui.rich` is the gate. Image nodes are
  admitted and counted as placement references but are not decoded or painted;
  the image-paint gap is [bitty#2875](https://github.com/bitty-terminal/bitty/issues/2875)
  (open; scene placement forwarding remains a separate OQ-051 slice).
- The Lua-visible scene set now has nine kinds (`Text`, `Row`, `Column`,
  `Block`, `Image`, `CodeBlock`, `Table`, `List`, `Rule`) and the core scene
  layer has the additive `Styled` v2 kind (`bitty` #2112/#2827;
  `crates/bitty-lua/src/ui_rich.rs`, `crates/bitty-rich/src/scene.rs`). The
  Lua bridge does not emit `Styled` yet: `UiRichNode` has no style field, so a
  plugin cannot use those primitives through `ui.rich`
  (`crates/bitty-runtime/src/scene_bridge.rs`). The rich reader also rejects
  `on_click`, `on_scroll`, and `on_hover`; those bindings exist only on the
  band `UiNode` surface. The reader's depth cap is 16, stricter than accepted
  SCN-2 (32); admission still enforces SCN-1..SCN-5
  (`crates/bitty-lua/src/ui_rich.rs`, `crates/bitty-rich/src/scene.rs`).
- `bitty.ui.present.show` / `hide` (and the legacy `ui.overlay.show` / `hide`
  spelling) drive a presentation-only overlay session
  (`crates/bitty-lua/src/host.rs`,
  `crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`). It draws
  one non-modal `Popup` surface, from an `overlay`-slot block, centered above
  the focused view; the required grant is `ui.present`, checked by
  `require_presentation_overlay`
  (`crates/bitty-runtime/src/plugin_runtime/services.rs`). It paints above
  chrome bands and below the focusable capture surface
  (`crates/bitty-runtime/src/runtime/present.rs`). It never captures input,
  never changes focus, and is not hit-tested; `Esc` dismisses it without
  consuming the key, a focus switch re-binds it, a closed view drops it with
  one `view-closed` observation, and generation teardown drops it
  (`crates/bitty-terminal/src/chrome_keys.rs`,
  `crates/bitty-terminal/src/terminal_app.rs`). It is paint-only: there is no
  key queue, no `poll`, and the only plugin-visible event is
  `overlay.dismissed` with `{ owner, handle, reason }`. It is not panel content
  and it does not displace a PTY.
- The accepted `ui.mount` slot set is `terminal`, `top`, `bottom`, `left`,
  `right`, `tabline`, and `overlay` (`crates/bitty-lua/src/ui.rs`). `terminal`
  is served by the scene host above; `top`/`bottom` are chrome bands;
  `left`/`right`/`tabline` fail closed with `E_UI_UNAVAILABLE`
  (`crates/bitty-runtime/src/runtime/band_slots.rs`); `statusline` is not in
  the set. The `overlay` slot holds the block used by the focusable capture
  session (`bitty.ui.overlay.*`, `ui.overlay.focus`) and by `ui.present`.
- The focusable overlay is a single global session with a 30-second lease, a
  256-event queue, 4096-byte events, drop-oldest overflow, and Core-owned
  release on submit, cancel, focus switch, unload, crash, and timeout
  (`crates/bitty-runtime/src/plugin_runtime/overlay.rs`). It is modal,
  transient, and counted in the `4+1` envelope; it is not panel content.
- The PTY pipeline already drains the primary session and every pane session on
  each `poll_pty`, under one shared budget: 32 chunks, 256 KiB, and 10 ms per
  call, with a 16-chunk (128 KiB) bounded reader channel per session, 8 KiB
  reads, and kernel PTY backpressure (`crates/bitty-runtime/src/runtime/pty.rs`,
  `crates/bitty-pty/src/reader.rs`). Parsing continues for panes that are not
  painted; no plugin-visible output buffer exists.
- The live app keys pane terminal sessions by `ViewId`; `PanelId` is the
  accepted panel identity and the registry/contract target, not the live
  session key (`crates/bitty-runtime/src/runtime.rs`). This record speaks the
  accepted identity vocabulary and treats the encoding transition as owned by
  the [Panel Placement Decision](panel-placement-decision.md).
- The configuration dashboard is not a Core surface in `bitty`. It is the
  official `bitty-terminal.dashboard` plugin
  (`crates/bitty-plugin-host/src/official.rs`); its current manifest requests
  `runtime.inspect` and `ui.overlay.focus` and presents through the focusable
  overlay, not through this candidate. No dashboard code path is evidence for
  panel content.
- DevTools is notification-only: its manifest requests `debug.inspect`,
  `debug.trace`, and `platform.notify`, and no `ui.*` capability.
- The bar is composed on the `bottom` band by a plugin mount; it is not panel
  content and reserves its own inset space.

What does not exist: a live `Terminal -> Gui` content-kind transition, the
displaced-content record, the restore path, a panel-content input queue and
`poll`, a `panel.content.*` event, a panel-content capability id, bounded
pointer bindings on the rich scene wire, a live accessibility tree for scene
text, and any image-node paint path. Those are the blockers in the acceptance
checklist below.

## The two-axis model

Panel identity, placement, and content are three independent axes. Conflating
them is what the original request did and what the owner correction rejects.

### Placement is not content

1. A panel keeps its `PanelId`, its `LayoutTree` attachment, its float-store
   entry, and its focus identity across a content swap. A content swap is not a
   panel destroy-and-recreate.
2. Placement remains a compositor and user decision. The plugin cannot set it,
   request a transition through an API, provide coordinates, create a surface,
   or resize anything.
3. A plugin may declare one optional **placement hint**. Core records it for
   audit and for future user-facing chrome (tab/tabline/bar), and **does not
   apply it** in v1. The user moves the panel with the existing Core commands;
   the plugin receives no placement verb. This is the narrowest reading of
   "hint, not authority" and it avoids a plugin silently rearranging the user's
   layout.
4. Bands are not a placement. A band is an inset edge surface outside the panel
   content rectangle; the bar remains the existing special case. A GUI plugin
   that wants a band uses the accepted `top`/`bottom` mounts and never this
   content surface.

### Content is a Core-owned kind transition

A terminal-backed panel's durable content is `Terminal(terminal_id)`. On an
accepted presentation request, Core performs exactly one transition:

```text
Terminal(tid) --present--> Gui(surface)     (displaced = Terminal(tid), record written)
Gui(surface)  --release--> Terminal(tid)    (displaced record consumed, record cleared)
```

Rules:

1. **One kind per panel.** A panel is either terminal-backed or GUI-backed. No
   panel presents both, no GUI content is nested inside GUI content, and no
   third content kind is added by this record.
2. **One surface per panel and per generation.** A panel hosts at most one GUI
   surface. A plugin generation holds at most one active GUI surface across all
   panels in v1, so a plugin cannot multiply focusable surfaces or audit rows.
3. **Core performs the transition.** The plugin requests; Core validates the
   capability, the target, the descriptor, and the budgets, writes the
   displaced record, stamps the content kind, and moves input routing. A failed
   request leaves the kind, the record, the focus, and the PTY untouched.
4. **The displaced record is the only restore authority.** It holds the
   terminal content id, the attachment `ViewId`, the frozen content rectangle,
   and the scroll offset at transition time. It is Core-owned presentation
   state; no plugin can read or write it.
5. **Content kind never becomes identity.** `PanelId`, `ViewId`,
   `TerminalId`, and `PersistentId` are unchanged by the transition; no new
   identity is allocated and no `From` bridge is introduced.
6. **Appearance selectors stay on the durable kind.** `views.<selector>` rules
   that match `terminal` keep applying to a panel while its GUI content is
   shown, because decoration belongs to the panel and its durable content, not
   to the transient presentation. Appearance is not re-evaluated per content
   swap. (This is a decision to confirm; see "Decisions needed".)

### Why `Pty` and `Gui` are the right names

"Pty" names the transport, which is the wrong axis: the content kind is the
_terminal surface_ fed by that PTY, and the same surface can exist without a
PTY in a future headless case. This record therefore uses `Terminal` for the
existing kind (matching `ViewContent`'s existing spelling) and `Gui` for the
new one, while recording the owner's `Pty ↔ Gui(surface)` intent. The existing
unused `ViewContent::Rich(u64)` variant is an alternative encoding for the
same kind; D1 decides between `Gui` and `Rich`.

## Bounded presentation descriptor

The descriptor is flat, closed, and optional-field-forward-compatible: unknown
fields are ignored under the accepted v1 rule, and every known field is
bounded.

| Field       | Type   | Required | Accepted values                                                        | Authority granted |
| ----------- | ------ | -------- | ---------------------------------------------------------------------- | ----------------- |
| `placement` | string | no       | `tiled`, `floating`, `fullscreen`, `scratchpad`; `band` is **invalid** | None (hint only)  |
| `restore`   | string | no       | `previous` only; any other value is a validation error                 | None (fixed)      |

The descriptor deliberately has **no** `mode`, no `exit_key`, no `owner`, no
`panel`, no coordinates, no size, no surface handle supplied by the plugin, and
no PTY, signal, or file field:

- **No `mode`.** Placement is a panel/user axis; a field named `mode` would
  grant it to the plugin. `placement` is a hint with no effect in v1.
- **No `exit_key`.** `Mod+Q` is the user's generic `close_view` binding, and
  `quit` is the generic window action. Inventing a per-plugin close key would
  create a second keymap authority and a plugin-owned modal trap.
- **No `owner`.** The host derives the owner from the calling plugin identity
  and generation. A plugin-supplied owner id would be a spoofing surface.
- **No `panel`.** The target is the focused panel only in v1. An explicit
  `PanelId` handle would be a new cross-panel targeting authority; it can be
  added later only with its own decision.
- **No surface handle.** The host allocates the surface and returns an opaque
  generation-owned handle. A caller-supplied handle would let one generation
  name another generation's block.
- **No title, icon, badge, or chrome field.** Panel chrome stays with the
  existing bar/tabline policy; the GUI content cannot rename the panel, set a
  tab label, or add a badge. A future panel-chrome request is a separate
  contract.

### Capability gates

| Authority                                      | Capability                                        | Status                                 | Notes                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Declarative scene rendering and attachment     | `ui.rich`                                         | Implemented gate (v1 id)               | Current `terminal`-slot attach and `ui.update`; it paints above a leaf's grid and does not replace panel content.              |
| Non-modal draw-only surface above focused view | `ui.present`                                      | Implemented gate; identifier candidate | `bitty.ui.present.show`/`hide`; one `Popup` surface, no capture, no panel content. Its identifier remains an OQ-056 candidate. |
| Panel content presentation and input ownership | `ui.panel` (alternative spelling `panel.content`) | **New, candidate v2**                  | One grant couples the surface and the keys; no separate focus grant (see rationale below).                                     |
| Placement, geometry, pointer, PTY, filesystem  | none                                              | —                                      | No identifier exists and none is implied. A plugin holding the panel-content grant gains no other family.                      |
| Safe mode                                      | no third-party plugin loaded                      | Accepted invariant                     | `bitty --safe` never reaches this surface. No Core-owned surface uses the same mechanism.                                      |

The panel-content grant is deliberately **one** grant, not a presentation grant
plus a separate focus grant. For a focusable overlay, presentation and capture
can be separate because the overlay coexists with the terminal: a display-only
overlay leaves keys with the shell. Panel content replaces the terminal, so
separating the grants would create a focused panel whose keys go nowhere — a
keyboard trap. Coupling the grant removes that state.

`ui.rich` and `ui.present` stay separate, and neither is the panel-content
authority. `ui.rich` already means "render and attach a scene"; `ui.present`
already means "draw a non-modal surface above the focused view". Reusing either
would grant panel replacement (and, with it, key ownership) to every plugin
that only asked to render or draw. The final spelling of the new id is an
acceptance decision: this record uses `ui.panel`; `panel.content` is the
alternative that the checklist's first item must resolve. The Lua namespace
must also stay distinct from the existing `bitty.ui.present` table.

## Recommended Lua surface

The surface lives under `bitty.ui`, beside the accepted `mount`/`update` pair
and the accepted `overlay` verbs. It is a new v2 surface; v1 stays frozen.

```lua
-- Present GUI content in the focused panel.
handle, err = bitty.ui.panel.present(scene, spec)
ok, err     = bitty.ui.panel.update(handle, scene)
result, err = bitty.ui.panel.poll(handle, max)
ok, err     = bitty.ui.panel.release(handle, reason)
```

- `present(scene, spec)` validates `scene` against the accepted scene set and
  SCN-1..SCN-5 plus the reader caps, validates `spec` against the closed
  descriptor, checks the panel-content grant and `ui.rich`, resolves the
  focused terminal-backed panel, writes the displaced record, swaps the
  content kind, and returns an opaque handle. It fails with `nil` plus a typed
  error and changes nothing. The existing `bitty.ui.present` table is the
  draw-only overlay and is not this surface.
- `update(handle, scene)` replaces the scene for a handle the caller owns. A
  non-owner, a released handle, or a stale generation fails with
  `E_UI_NOT_OWNER` and keeps the previous scene. An invalid scene keeps the
  last-known-good scene.
- `poll(handle, max)` drains the Core-owned input queue. It is an owner-
  initiated cold-path read, never a callback on the input path. The result
  mirrors the overlay poll shape: `status` (`active`/`released`), `seq`,
  `events`, `overflowed`, and `reason` only when released. `max` is clamped to
  the 256-event bound; a default of 64 keeps one call cheap.
- `release(handle, reason)` ends the presentation and restores the terminal
  content. Release is idempotent for the owning generation; an optional
  `reason` is `dismissed` only, and Core reports every involuntary cause.

The panel is identified by focus at call time; the descriptor has no target.
`present` is valid only when the focused panel is terminal-backed with a live
terminal content owner: a pane session, or the runtime-global primary PTY. An
empty leaf, a browser leaf, a leaf with no live PTY owner, or a panel already
owned by another generation fails typed and changes nothing. The primary case
matters because it is the default single-panel target; the primary PTY is
drained on every poll just like a pane session and is covered by the same
freeze/restore rule.

## Lifecycle and restore paths

The lifecycle has three states per handle, all entered by Core.

| State      | Meaning                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| `idle`     | No GUI surface exists for the panel; the terminal content is presented.                  |
| `active`   | One owner holds the surface; the terminal content is displaced and hidden.               |
| `released` | The handle is unusable, the terminal content is presented, and a new present is allowed. |

| Cause                                        | Transition           | Terminal content                                                                                                                    | Input                                    | Evidence                  |
| -------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------- |
| `present` with grants and a valid target     | `idle -> active`     | displaced, PTY untouched                                                                                                            | routed to the GUI queue                  | return handle             |
| Generic close `close_view` (default `Mod+q`) | `active -> released` | restored in place                                                                                                                   | routed to the PTY                        | `panel.content.released`  |
| `close_view` again, or a close command       | panel close          | normal close path (kill gate)                                                                                                       | normal shutdown routing                  | existing close events     |
| Generic quit / window close                  | `active -> released` | released then normal teardown                                                                                                       | none (shutdown)                          | `panel.content.released`  |
| Focus switch to another panel/workspace      | stays `active`       | still displaced and parsing                                                                                                         | none while unfocused; resumes on refocus | `focus.changed`           |
| Workspace switch                             | stays `active`       | still displaced and parsing                                                                                                         | none while unfocused                     | existing workspace events |
| Panel move across workspaces                 | stays `active`       | still displaced and parsing; a move is not a copy                                                                                   | none while unfocused                     | existing move events      |
| Plugin reload (generation end)               | `active -> released` | restored                                                                                                                            | routed to the PTY                        | reason `reloaded`         |
| Plugin disable                               | `active -> released` | restored                                                                                                                            | routed to the PTY                        | reason `disabled`         |
| Plugin crash                                 | `active -> released` | restored during teardown                                                                                                            | routed to the PTY                        | reason `crashed`          |
| Plugin suspend                               | `active -> released` | restored                                                                                                                            | routed to the PTY                        | reason `suspended`        |
| Config reload without removing the plugin    | stays `active`       | still displaced and parsing                                                                                                         | unchanged                                | `config.reloaded`         |
| Safe mode or no host surface                 | `idle`               | unchanged                                                                                                                           | unchanged                                | `E_UI_UNAVAILABLE`        |
| Missing/invalid displaced record on restore  | `active -> released` | restored by the recorded owner (pane `ViewId` or primary PTY) if it lives; otherwise the panel closes through the normal close path | routed to the PTY                        | diagnostic                |

Rules:

1. **Generic close pops one layer.** The existing `close_view` already pops an
   active overlay capture before closing the panel. Panel GUI content is the
   next layer: one `close_view` releases the GUI content and restores the
   terminal; the panel is not closed. A second `close_view` follows the normal
   panel-close path, including the existing close confirmation. This is not a
   plugin-specific key: it is the existing generic close, and the plugin cannot
   veto it. A **direct panel-close command** (bar/tab close, workspace close,
   `ctl` panel close) is not a layered `close_view` gesture: it releases the
   GUI content and proceeds with the close in one operation, so a programmatic
   close is never trapped behind a content layer.
2. **`Esc` and content keys are content behavior.** The GUI content receives
   `Esc`, `q`, `j`, `k`, and every other key through `poll`; the plugin decides
   whether to release. Core reserves only the generic close and quit paths.
3. **Focus loss never releases.** Unlike overlay capture, panel content does
   not release on focus switch or workspace switch: the panel keeps its content
   and the PTY keeps parsing. Keys go nowhere while another target is focused,
   which is the same rule as any unfocused panel. There is no idle timeout,
   because a dashboard may legitimately sit open for hours.
4. **Suspend and reload never re-present.** A suspended generation cannot poll
   its input queue, so suspend releases the content and restores the terminal;
   a new or resumed generation must call `present` again. Automatic
   re-presentation after a suspend, crash, or reload would resurrect a surface
   the user did not ask for and could strand keys.
5. **Crash containment is teardown-ordered.** Content release is part of
   generation teardown and runs before the generation's block registry is
   dropped. No plugin code runs on the close path: the plugin observes the
   release through the event and cannot block it. A per-tick orphan sweep is a
   defense in depth: if a record's owner generation is no longer active, Core
   restores the terminal with `crashed` or `unloaded`.
6. **Release reasons are a closed vocabulary.** Core reports `dismissed`
   (owner release), `closed` (panel close), `quit` (window quit), `suspended`,
   `reloaded`, `disabled`, `crashed`, and `unloaded`. Only `dismissed` is
   owner-suppliable; every involuntary cause overwrites the reason.
7. **Quit does not paint a restore.** On the quit path Core releases the
   surface and restores the content before the normal shutdown, but does not
   need to present a frame. The existing PTY teardown and close-confirmation
   gate are unchanged.
8. **Fail-closed restoration.** If the displaced terminal content owner (a pane
   session or the primary PTY) still exists, Core restores it even when the
   record looks inconsistent, because the owner is the authority. If the owner
   is gone, Core closes the panel through the normal close path. It never
   leaves a blank panel and never kills an unrelated PTY.

## PTY preservation semantics

### State

A content swap changes only the panel's presented content kind. It does not
detach, suspend, resize, signal, close, or kill the terminal content owner; the
PTY file descriptor, parser, grid, cursor, modes, replies, damage, and
scrollback stay owned and live exactly as before.

### Output and backpressure

1. **No new buffer.** The existing `poll_pty` drains the primary PTY and every
   pane session on every poll, whether or not the pane is painted. A hidden
   terminal therefore continues to parse into its grid and scrollback. No
   plugin-visible output buffer, queue, or stream is introduced; such a buffer
   would be a new data path and a new authority.
2. **The bound is already end-to-end.** Each session's reader channel holds at
   most 16 chunks of 8 KiB (128 KiB); a poll drains at most 32 chunks, 256 KiB,
   and 10 ms across all sessions. When the consumer stalls, the channel fills,
   the kernel PTY buffer fills, and the child's writes block. That is bounded
   backpressure with zero data loss, and it is unchanged by presentation.
3. **No loss and no block added by GUI.** The GUI content suppresses paint, not
   consumption. The child can block only when the whole terminal pipeline is
   slow, never because a panel is hidden; a hidden pane is not starved, because
   the drain rotates its first source each poll.
4. **Damage stays presentation.** A hidden terminal accumulates damage as
   usual. On restore, Core invalidates the whole panel content rectangle and
   presents once, so no stale pixels or partial grid survive. Damage never
   enters Terminal Truth.

### Geometry

1. **Freeze while hidden.** The displaced terminal keeps the content rectangle
   it had at transition. Layout reflow of the panel (window resize, float move,
   workspace split change) while GUI content is shown does **not** enter the
   `LogicalRect -> PTY` path. The child sees no `SIGWINCH` and `TIOCGWINSZ`
   keeps returning the frozen size. This is the documented stale-geometry
   contract, not a bug.
2. **One resize on restore.** On release, Core computes the panel's current
   content rectangle and issues exactly one resize if it differs from the
   frozen one, then presents the restored grid. There are no intermediate
   sizes, no resize animation frames, and no second resize from the same
   gesture.
3. **Reflow is the existing one.** The single restore resize uses the accepted
   resize path and the reflow algorithm the
   [Terminal State RFC](terminal-state-rfc.md) already owns. The exact reflow
   algorithm is that RFC's open point; this record adds no second algorithm and
   makes no new fidelity promise beyond "state is preserved and the visible
   grid reflows per the existing rule".
4. **Scrollback and cursor fidelity.** Scrollback lines, the cursor cell, the
   cursor style, selection, and the scroll offset are untouched while hidden.
   On restore the scroll offset is re-clamped by the existing rule (a shrink
   may reduce the maximum), and the visible viewport follows the existing
   anchor behavior. No truncation, no re-parse, no replay, and no synthetic
   output are performed to reconstruct the view.
5. **Alternate screen and images.** The existing rules are unchanged: the
   alternate screen owns no scrollback, and alternate-screen images stay hidden
   while the alternate screen is active.
6. **Process exit while hidden.** The terminal content owner stays until the
   normal close path. An exit is recorded and observed by the existing
   process/terminal events; on restore the terminal shows the exited state
   exactly as an unfocused pane does today. The GUI content stays presented
   until dismissed.

## Focus and input ownership

The hot path gains one branch and no plugin call:

```text
Platform -> Router -> focused Panel -> content kind?
  Terminal -> keymap/overlay -> encoder -> PTY
  Gui      -> Core-owned bounded queue -> (plugin poll on its cold path)
```

1. **The focused panel's content kind decides.** While `Gui` is presented, no
   key is encoded to the PTY for that panel. While `Terminal` is presented, the
   path is byte-identical to today.
2. **Queue, not callback.** The queue is Core-owned, capped at 256 events, with
   4096-byte events, drop-oldest overflow, and a sticky `overflowed` flag. The
   plugin drains it with `poll`, exactly like the accepted overlay capture and
   under the same no-hot-path rule. There is no plugin callback, no timer, and
   no per-frame Lua.
3. **No pointer authority.** Clicks and wheel over panel-content nodes dispatch
   bounded `on_click`/`on_scroll` command bindings once the content wire carries
   them (the current rich reader rejects those fields; see the checklist). The
   plugin receives no coordinates, no pointer capture, no drag, no cursor
   shape, and no hover stream. Hit-testing stays inside the panel content
   rectangle and uses the frame's own geometry.
4. **No global capture.** Panel content does not acquire the single overlay
   capture and does not count in the `4+1` envelope. Different plugins may hold
   GUI content in different panels; only the focused panel receives keys, and
   one generation owns at most one surface. A modal overlay may still open
   above the focused panel through the accepted overlay path, and the overlay
   capture keeps its existing precedence.
5. **Focus identity is unchanged.** The panel remains the focused target; the
   content swap does not create a second focus owner or a second MRU entry.
   Focus change events keep their existing payload and timing.
6. **Fail-closed input.** If the queue cannot be allocated or the owner is
   stale, keys are swallowed for that panel (never forwarded to the hidden
   PTY) and a bounded diagnostic is recorded. Swallowing is visible and
   recoverable through generic close; forwarding would type into an invisible
   shell, which is worse.

## Per-placement semantics and limits

Placement is applied by the panel/user, not by the plugin. The GUI content
always fills the panel's current content rectangle, inside Core-owned
decoration and insets.

| Placement    | Live today             | GUI content behavior                                                        | PTY while hidden | Hint              |
| ------------ | ---------------------- | --------------------------------------------------------------------------- | ---------------- | ----------------- |
| `tiled`      | Yes                    | Fills the tiled content rectangle.                                          | Frozen, parsing. | Accepted, unused. |
| `floating`   | Yes (detach/restore)   | Fills the floating rectangle; the panel leaves the tiling as it does today. | Frozen, parsing. | Accepted, unused. |
| `fullscreen` | No (mode parse-only)   | When the mode lands, fills the full-bleed rectangle; no new content rule.   | Frozen, parsing. | Accepted, unused. |
| `scratchpad` | Yes (one hidden slot)  | The content persists while hidden and repaints when shown.                  | Frozen, parsing. | Accepted, unused. |
| `band`       | Yes (separate surface) | **Not panel content.** Rejected by the descriptor; use `top`/`bottom`.      | N/A              | **Invalid.**      |

Limits:

1. **One surface per panel.** A second presentation request for the same panel
   by another generation fails with `E_UI_PANEL_BUSY`; the first surface and
   its displaced terminal are unchanged.
2. **One surface per generation.** A second request by the generation that
   already owns a GUI surface (same or another panel) fails with
   `E_UI_PANEL_NESTED`; it must `update` or `release` first. This is the
   "nested open" case: GUI content cannot open GUI content inside itself or
   stack a second surface.
3. **No drawer in this record.** The drawer question is decided for 0.1.0 by
   the [Drawer Presentation Mode Decision](drawer-presentation-mode-decision.md):
   no drawer mode is added. If a drawer is admitted later, it changes
   placement only and this content contract is unaffected.
4. **Band is unchanged.** The bar keeps its `bottom` band mount, its exclusive
   zone, its reflow behavior, and its zero-space-when-absent rule. It never
   becomes panel content, never displaces a PTY, and never appears in the GUI
   content path.
5. **No OS surface.** GUI content is a composed layer inside the panel
   rectangle, not a window, layer-shell surface, GPU surface with its own
   lifetime, or second present queue. The no-window-leak rule holds.

## Typed failure modes

Every failure is a typed bridge error in the accepted classes (`runtime`,
`validation`, `budget`, `resolution`). Denials name the capability or rule,
never the payload.

| Condition                                                                         | Class        | Code                     | Effect                                   |
| --------------------------------------------------------------------------------- | ------------ | ------------------------ | ---------------------------------------- |
| Missing the panel-content grant, or `ui.rich` for scene validation                | `runtime`    | `E_CAPABILITY_DENIED`    | Nothing changes.                         |
| No focused panel, or the focused panel is not a live terminal-backed panel        | `runtime`    | `E_UI_PANEL_UNAVAILABLE` | Nothing changes.                         |
| Host has no panel content path (safe mode, headless, old host)                    | `runtime`    | `E_UI_UNAVAILABLE`       | Nothing appears.                         |
| Target panel already has GUI content from another generation                      | `runtime`    | `E_UI_PANEL_BUSY`        | Existing surface unchanged.              |
| Calling generation already owns a GUI surface                                     | `runtime`    | `E_UI_PANEL_NESTED`      | Existing surface unchanged.              |
| Update, poll, or release by a non-owner, a released handle, or a stale generation | `runtime`    | `E_UI_NOT_OWNER`         | Previous scene kept.                     |
| Invalid scene (node kind, depth, text, serialized size)                           | `validation` | `E_UI_COMPONENT_INVALID` | Previous scene kept, or present refused. |
| Invalid descriptor value, unknown placement, or `band`                            | `validation` | `E_VALUE_*`              | Present refused.                         |
| Per-call budget exceeded                                                          | `budget`     | `E_TIMEOUT`              | Call fails; state unchanged.             |
| Release of an already-released handle by the owner                                | —            | success (idempotent)     | No change.                               |

Placement hints never produce an error: an unavailable placement is recorded
and ignored, because it is not an instruction. Only `band` is a validation
error, because "band as panel content" is a category mistake, not a preference.

## Bounds

| Dimension                          | Bound                                                                                                  | Over-limit behavior                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| GUI scene per block                | Accepted SCN-1..SCN-3: 2048 nodes, depth 32, 256 KiB text; the Lua reader's depth cap is 16 (stricter) | Refused with `E_UI_COMPONENT_INVALID`; previous kept.    |
| Retained blocks per terminal/scene | 64 (accepted SCN-5)                                                                                    | Mount refused; previous state kept.                      |
| GUI surfaces per panel             | 1                                                                                                      | `E_UI_PANEL_BUSY` / `E_UI_PANEL_NESTED`.                 |
| GUI surfaces per plugin generation | 1                                                                                                      | `E_UI_PANEL_NESTED`.                                     |
| Input queue depth                  | 256 events                                                                                             | Oldest dropped; `overflowed` sticky; stays active.       |
| Input event payload                | 4096 bytes serialized                                                                                  | Oversize event rejected before enqueue.                  |
| Present/update call                | 4096 bytes serialized descriptor; scene under SCN-1..SCN-5 and the reader's kind-specific bounds       | Validation error; previous state kept.                   |
| Idle timeout                       | none                                                                                                   | Persistent by design; release only on an explicit cause. |
| Owner call budgets                 | Per-plugin CPU, memory, task, and queue budgets per the accepted isolation contract                    | Core-enforced with owner attribution.                    |

## Security review

| Threat                               | Control                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PTY or file surgery from Lua         | No descriptor field, host verb, or handle exposes a PTY, signal, path, command, URL, or environment value.                                                                     |
| Presentation mutating Terminal Truth | Content kind is presentation state; the swap never resizes, writes, parses, clears, or replays terminal state.                                                                 |
| Reading hidden terminal output       | No read surface, no scrollback API, no snapshot in the descriptor. The plugin is not given a second data path.                                                                 |
| Input interception or keyboard trap  | Keys route only for the focused panel; Core owns the queue; generic close always pops the surface; no plugin veto and no callback.                                             |
| Pointer or window authority          | No coordinates, capture, drag, cursor, hover, OS surface, or window creation. Clicks remain command bindings.                                                                  |
| Spoofing another owner or panel      | Owner comes from the host identity/generation; the target is the focused panel only; handles are generation-checked.                                                           |
| Renaming or re-badging the panel     | No title, icon, tab, or chrome field; panel chrome stays with the existing bar/tabline policy.                                                                                 |
| Crash or wedge pinning the panel     | Teardown-ordered release plus a per-tick orphan sweep; no idle lease is required, and no plugin code runs on the restore path.                                                 |
| Resource exhaustion                  | Accepted scene budgets, one surface per panel and per generation, 256-event queue, 4096-byte events, per-plugin budgets.                                                       |
| Silent capability growth             | New panel-content id only (candidate spelling `ui.panel`; `panel.content` is the alternative), deny by default, manifest-hash-bound grant, no wildcard, no first-party bypass. |
| Audit gaps                           | Two observation-only events and bounded doctor counters; no content payloads.                                                                                                  |
| Safe mode                            | Third-party plugins never load; no Core-owned surface uses the same mechanism.                                                                                                 |

Fail-closed properties:

1. Any failed present leaves the terminal content presented and the PTY
   untouched.
2. Any failed restore restores the recorded terminal owner (pane session or
   primary PTY) when it exists; otherwise it closes the panel through the
   normal path and never blanks or kills an unrelated PTY.
3. Any stale generation, foreign handle, or revoked grant is rejected before a
   state change.
4. No plugin callback is required to complete a close, crash, disable, reload,
   or quit path.
5. The surface, its input queue, and its event are always released before the
   generation's resources are dropped.

This record adds a capability and an input-routing branch, so it requires a
security reviewer before acceptance; the `P0` sign-off below records that
requirement rather than a completed review.

## Verification plan

Implementation is not authorized by this record. Acceptance requires at
minimum:

1. **State preservation.** A headless test swaps a live pane to `Gui`, writes
   output while hidden, restores, and asserts the terminal state hash, cursor,
   scrollback length, and scroll offset match a control pane that was never
   swapped, modulo the single documented restore reflow. Repeat on the
   runtime-global primary PTY, which is the default single-panel target.
2. **No resize while hidden.** Instrument the `LogicalRect -> PTY` path and
   assert zero resize calls between present and release, and exactly one resize
   on a changed restore rectangle.
3. **Backpressure.** Fill the reader channel while the pane is hidden and assert
   the child blocks at the existing bound, no bytes are dropped, and no
   plugin-visible buffer exists.
4. **Input isolation.** Assert that keys pressed while `Gui` is focused never
   reach the PTY encoder, that the queue drops oldest with the sticky flag, and
   that keys reach the PTY again after release.
5. **Generic close precedence.** `close_view` with GUI content releases the
   content and leaves the panel open; a second `close_view` follows the normal
   close path; overlay capture still takes precedence above both.
6. **Crash containment.** Terminate the plugin VM while presented and assert
   the terminal is restored within one tick, the reason is `crashed`, and no
   surface, queue, or capture leaks.
7. **Reload/disable.** Assert no automatic re-presentation, restoration with
   `reloaded`/`disabled`, and a clean next `present` from the new generation.
8. **Duplicate/nested errors.** Assert `E_UI_PANEL_BUSY` for another owner,
   `E_UI_PANEL_NESTED` for the same generation, and no state change in either
   case.
9. **Placement isolation.** Assert the hint is recorded and not applied, float
   and tiled behavior is byte-identical to today, and `band` is rejected.
10. **Scene failure.** Assert an invalid `update` keeps the last-known-good
    scene, and a failed restore never leaves a blank panel.
11. **Audit.** Assert the release event payload is bounded, observation-only,
    and carries no content or key bytes.

Headed verification remains required before any release claim; these tests are
headless acceptance evidence only.

## Alternatives considered

| Alternative                                                                | Trade-off                                                                                                                                     | Disposition                                                                                          |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Plugin-defined presentation modes (`panel`/`floating`/`fullscreen`/`band`) | Smallest conceptual change for a plugin author, but grants placement authority, duplicates panel modes, and needs a per-plugin close key.     | **Rejected** by the owner correction: placement stays with the panel/user.                           |
| Reuse the accepted `overlay` slot and capture                              | No new surface concept, but the overlay is global, modal, transient, `4+1`-counted, and leases for 30 seconds; a dashboard cannot live there. | **Rejected**: it would add a fourth overlay-shaped system, which the reconciliation forbids.         |
| Reuse `ViewContent::Panel(PanelId)` as the GUI content kind                | No new variant, but conflates panel identity with content kind and loses the displaced-terminal linkage.                                      | **Deferred/rejected** for v1; a dedicated `Gui` kind is smaller in semantics.                        |
| Freeze or `SIGSTOP` the hidden process, buffer its output in Lua           | Makes "hidden" literal, but adds a new data path, a plugin-visible buffer, and a liveness hazard.                                             | **Rejected**: the existing drain already preserves output with zero loss and bounded backpressure.   |
| Resize the hidden PTY live to the panel rectangle                          | Keeps `TIOCGWINSZ` fresh, but violates "no resize while hidden" and causes invisible reflow.                                                  | **Rejected**.                                                                                        |
| A per-plugin close key or a plugin-owned modal trap                        | Convenient for the plugin, but creates a second keymap authority and can trap the user.                                                       | **Rejected**: generic `close_view`/`quit` always win and cannot be vetoed.                           |
| Apply the placement hint automatically when the user has no rule           | More "helpful", but still lets a plugin rearrange the user's layout and makes tests user-configuration-dependent.                             | **Deferred**: v1 records the hint only; automatic application needs its own decision and config key. |
| Make `ui.panel` imply `ui.rich`                                            | One grant is simpler, but couples "render a scene" and "occupy a panel" so a band-only plugin cannot be narrowed.                             | **Rejected**: two grants keep the least-privilege split.                                             |

## Affected contracts

| Contract                                                                                                                             | Effect                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                            | Gains the content-kind axis and the GUI lifecycle; identity, focus, and overlay envelope unchanged.                                                                                                      |
| [Workspace Compositor Specification](workspace-compositor.md)                                                                        | Leaf content selection gains the chosen GUI presenter (`Gui` or `Rich`); placement and decoration rules unchanged.                                                                                       |
| [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)                                              | `ViewContent` gains the chosen GUI encoding (or reuses `Rich`); `ViewId != TerminalId`, attachment, and move rules unchanged.                                                                            |
| [Terminal State RFC](terminal-state-rfc.md)                                                                                          | No truth mutation; the geometry freeze and single restore resize are presentation rules; reflow stays its open point.                                                                                    |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                                    | Reused node set and budgets; no new scene node or budget.                                                                                                                                                |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md) | Adds a v2 panel-content surface beside `mount`/`update` and the existing `bitty.ui.present` table; the v1 band/overlay node sets stay frozen.                                                            |
| [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)          | Adds the panel-content capability id (candidate spelling `ui.panel`; `panel.content` alternative) under OQ-056's v2 admission.                                                                           |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)                                                              | Extends the close-layer precedence; adds no overlay owner, tier, or modal gate.                                                                                                                          |
| [Chrome Band Contract](chrome-band-contract-candidate.md)                                                                            | Unchanged; bands remain outside panel content and the bar keeps its model.                                                                                                                               |
| [Configuration Model RFC](configuration-model-rfc.md)                                                                                | Candidate consequence: `views.<selector>` matching must use the durable content kind, not the transient GUI kind.                                                                                        |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)                                                            | The Scene path is consumed by the present loop for `terminal`-slot scenes; this record adds the panel content-kind transition on top.                                                                    |
| [Panel Generation Ownership Decision](panel-generation-ownership-decision.md)                                                        | Candidate: the panel container is workspace-owned while content is generation-owned; this record's release rows must use that split ([bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476)). |
| [Panel Placement Decision](panel-placement-decision.md)                                                                              | Unchanged direction; this record explicitly keeps placement out of plugin authority.                                                                                                                     |
| [Configuration dashboard (Plugin) (Candidate)](../interfaces/configuration-dashboard-candidate.md)                                   | Currently a focusable-overlay plugin; panel content is a migration option under this candidate, not the shipped path.                                                                                    |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)                                | New capability and input-routing branch require the `P0` security review.                                                                                                                                |

## Migration

1. **Dashboard (bitty#2380).** The configuration dashboard is a first-party
   plugin; the Core-panel prototype was withdrawn before merge (`bitty` #2390).
   It currently presents through the focusable overlay (`ui.overlay.focus`);
   moving it to panel content would be a later migration under this candidate,
   using the new panel-content grant, the read-only projection (`bitty` #2396),
   and the `config.manage` capability (`bitty` #2393) for writes. There is no
   Core-internal GUI-content path and no capability-free Core surface to
   preserve; the section set, bounds, and confirmations in the dashboard
   candidate are plugin requirements.
2. **DevTools.** DevTools stays notification-only in 0.0.25. If it later gains
   a UI, panel content would use `bitty.ui.panel.*` with the new panel-content
   grant; no forced change now, and its existing `debug.*` grants are
   unchanged.
3. **Bar and statusline.** Unchanged. The bar keeps the `bottom` band, its
   exclusive zone, and its absent-when-unmounted rule. No panel content, no
   displaced PTY, no placement hint.
4. **File manager, composer, palette, search, copy-mode.** Unchanged. Band
   mounts stay bands; transient input surfaces stay `ui.overlay.focus`; neither
   family migrates to panel content.
5. **Docs.** The plugin author guide, the mode/placement matrix, and the manual
   page are follow-ups owned by the plugin documentation repository and the
   manual, not by this record.

## Decisions needed before implementation

Each item is a concrete acceptance decision, not an open-ended question.

| ID  | Decision                                                                                                                             | Recommended answer                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Content-kind encoding: add `ViewContent::Gui(GuiSurfaceId)`, promote the unused `ViewContent::Rich(u64)`, or reuse `Panel(PanelId)`? | Add `Gui` (or use `Rich` if one wire handle type is preferred); keep `Panel` for panel-provider content. The existing `Rich` variant has no live presenter.                        |
| D2  | Capability set: one new panel-content grant, or a panel-content grant plus a separate focus grant?                                   | One new grant, separate from `ui.rich` and `ui.present`; no separate focus grant (keyboard-trap rationale). The spelling is `ui.panel` or `panel.content`.                         |
| D3  | OQ-056 admission: is a new panel-content id in v2 scope?                                                                             | Yes, via an OQ-056 amendment naming this contract; v1 stays frozen.                                                                                                                |
| D4  | Target selection: focused panel only, or an explicit bounded `PanelId` handle?                                                       | Focused panel only in v1; explicit targeting is a later decision with its own authority analysis.                                                                                  |
| D5  | Placement hint application: record-only, or apply when the user has no rule?                                                         | Record-only in v1; expose it to chrome, never mutate placement.                                                                                                                    |
| D6  | Close precedence: confirm `close_view` pops GUI content before closing the panel.                                                    | Yes; it mirrors the existing overlay-capture precedence and cannot be vetoed.                                                                                                      |
| D7  | Input ownership: panel-scoped queue with no global capture and no idle timeout?                                                      | Yes; release only on explicit causes, never on idle or focus loss.                                                                                                                 |
| D8  | Event kinds: add `panel.content.released` and `panel.content.input-available` to the closed set?                                     | Yes, both observation-only; `released` carries the closed reason vocabulary and `input-available` mirrors the capture pump nudge. Do not reuse `overlay.dismissed`.                |
| D9  | Appearance selectors: evaluate against the durable content kind or the transient one?                                                | Durable kind; a content swap never changes decoration or background.                                                                                                               |
| D10 | Empty/browser/no-PTY targets: refuse `present` unless a live terminal content owner exists?                                          | Yes; a pane session or the runtime-global primary PTY both qualify; leaves without a PTY owner fail `E_UI_PANEL_UNAVAILABLE`.                                                      |
| D11 | Dashboard migration: keep the focusable overlay or move to panel content?                                                            | Keep the current focusable overlay; moving to panel content is a later migration under this candidate. No Core-internal GUI-content path.                                          |
| D12 | Scene-path sequencing: what remains before this contract can ship?                                                                   | The scene paint consumer and a draw-only above-view surface exist; the remaining prerequisites are the content-kind transition, displaced record, input routing, and restore path. |
| D13 | Accessibility: what is the focus announcement and screen-reader description for GUI content?                                         | Follow-up required before acceptance; no accessibility claim in this record.                                                                                                       |
| D14 | Restore reflow: confirm "state preserved, visible reflow per the existing algorithm" is sufficient.                                  | Yes; the exact algorithm remains the Terminal State RFC's open point.                                                                                                              |

## Acceptance checklist for the remaining gap

The renderer and the draw-only overlay are no longer blockers. The following
items are the remaining contract and state work, ordered by dependency. Each
item names the exact text that must change, the code mechanism it needs, and
the test that would prove it. None of these is implemented today, and this
checklist promotes nothing.

1. **Capability spelling and grant boundary.**
   - **Contract text:** `### Capability gates` and the first row of
     `## Typed failure modes` must name one panel-content capability id and
     state that `ui.rich` (scene rendering) and `ui.present` (draw-only
     overlay) do **not** authorize replacing panel content or owning its keys.
     D2/D3 must record the final spelling. This record uses `ui.panel`;
     `panel.content` is the alternative. The `## Recommended Lua surface` must
     also use a namespace distinct from the existing `bitty.ui.present` table.
   - **Code mechanism:** add the head to the activation grant and `UiAccess`
     (`crates/bitty-runtime/src/plugin_runtime/mod.rs`,
     `crates/bitty-runtime/src/plugin_runtime/services.rs`), gate
     `present`/`update`/`poll`/`release` on it at the host boundary, and keep
     the manifest-hash-bound grant rule. No implication from `ui.rich` or
     `ui.present`; no wildcard; no first-party bypass.
   - **Proof test:** a manifest with `ui.rich` and `ui.present` but without the
     panel-content grant gets `E_CAPABILITY_DENIED` and changes no state; the
     same manifest with the grant presents; `ui.present` alone cannot replace
     content; a grant change requires a new manifest hash.

2. **Content variants and bounds.**
   - **Contract text:** the `GUI content` row in `## Terminology`, the
     `## Bounds` rows, and `## Bounded presentation descriptor` must fix which
     scene kinds a panel may present and their limits. The accepted scene set
     is nine Lua-visible kinds; the additive `Styled` kind is not on the
     `ui.rich` wire yet. If panel content uses the Lua reader, its depth cap is
     16 (stricter than SCN-2's 32), and the kind-specific caps apply (256 table
     rows, 4096 cells, border 8, language hint 32 bytes). The rich reader also
     rejects `on_click`, `on_scroll`, and `on_hover`, while the band `UiNode`
     vocabulary carries those bindings; the contract must decide how
     hit-testable rows are expressed before claiming them.
   - **Code mechanism:** reuse `read_rich_component`, `scene_bridge`, and
     `Scene::insert` for the scene shape, or extend the rich wire with bounded
     pointer bindings; add no third node vocabulary and no new renderer handle.
     `Styled` stays a core-scene capability until a wire form is decided.
   - **Proof test:** boundary tests at 2048/2049 nodes, depth 16/17, 256 KiB
     text, 2 MiB aggregate, and 64 blocks; each over-limit case returns
     `E_UI_COMPONENT_INVALID` and keeps the last-good scene; an unknown kind is
     refused; `Styled` is not accepted from Lua in this wave; a clickable
     panel-content row is either refused by the chosen wire or dispatches only
     its bounded command binding.

3. **Replace edge: content kind and displaced record.**
   - **Contract text:** `### Content is a Core-owned kind transition` and the
     `idle -> active` row of `## Lifecycle and restore paths` must specify
     `Terminal(tid) -> Gui(surface)` with a Core-owned displaced record
     (terminal content id, attachment `ViewId`, frozen content rectangle,
     scroll offset, owner generation), one kind per panel, one surface per
     panel and generation, and no state change on refusal. D1 must choose
     `Gui`, the existing unused `Rich(u64)`, or `Panel(PanelId)`.
   - **Code mechanism:** live content-kind state and a Core-owned transition in
     the panel registry/host (`crates/bitty-runtime/src/registry/panel.rs`,
     `crates/bitty-runtime/src/registry/host.rs`), reusing the terminal
     content-owner lookup and `ViewId` attachment. The existing `SceneHost` is
     **not** this mechanism: it mounts a separate Core-owned `Rich` panel and
     paints over the grid; it must not be presented as the content swap.
   - **Proof test:** present a live pane and assert the panel's content kind is
     `Gui`, the terminal fd/pid and state hash are unchanged, focus is
     unchanged, no new `PanelId`/`ViewId` is allocated, and exactly one surface
     exists. A refused present leaves `Terminal` content and an empty displaced
     record. A second generation gets `E_UI_PANEL_BUSY`; a nested request gets
     `E_UI_PANEL_NESTED`.

4. **Restore edge: PTY alive, focus, resize, scrollback.**
   - **Contract text:** `## PTY preservation semantics` and the release rows of
     `## Lifecycle and restore paths` must state that release never detaches,
     suspends, resizes, signals, writes, or kills the terminal owner; the
     displaced rectangle stays frozen while presented; release issues exactly
     one resize when the rectangle changed; scrollback, cursor, selection, and
     scroll offset survive. D6/D14 record the close precedence and reflow
     answer.
   - **Code mechanism:** the release path in the registry/host, the existing
     `LogicalRect -> PTY` resize path and reflow in
     `crates/bitty-runtime/src/runtime/layout_focus.rs` and
     `crates/bitty-runtime/src/runtime/pty.rs`, plus full-content invalidation
     on restore. No second terminal-state path and no replay.
   - **Proof test:** write output while content is presented, then release;
     compare state hash, cursor, scrollback length, and scroll offset with a
     control pane that was never swapped. Instrument the resize path and assert
     zero resize calls while presented and exactly one on a changed restore
     rectangle; assert no `SIGWINCH` while presented. `close_view` releases the
     content and leaves the panel open; a second `close_view` follows the
     normal close path.

5. **Input routing while content is presented.**
   - **Contract text:** `## Focus and input ownership` must say the focused
     panel's content kind decides routing: `Terminal` keeps the byte-identical
     encoder path, `Gui` sends no key to the PTY and drains a Core-owned
     256-event queue with 4096-byte events and drop-oldest overflow through an
     owner-initiated `poll`. Pointer input stays on bounded
     `on_click`/`on_scroll` command bindings once the content wire from item 2
     carries them; there is no global capture, no idle timeout, and generic
     close always pops the content layer first.
   - **Code mechanism:** one branch in the input path
     (`crates/bitty-terminal/src/chrome_keys.rs`,
     `crates/bitty-runtime/src/runtime/input.rs`), a Core-owned queue and
     `poll` verb, and `close_view` layer precedence. No plugin callback and no
     per-frame Lua.
   - **Proof test:** keys pressed while `Gui` is focused never reach the PTY
     encoder; queue overflow drops oldest and sets the sticky flag; keys reach
     the PTY again after release; a focusable overlay still owns `Esc` above
     panel content; a click on a scene node runs only its bounded command
     binding.

6. **Event kinds and payloads.**
   - **Contract text:** the `Evidence` column of
     `## Lifecycle and restore paths` and D8 must add
     `panel.content.released` and `panel.content.input-available` to the closed
     event set (or record the final names), define their payloads, and fix the
     release-reason vocabulary: only `dismissed` is owner-suppliable;
     `closed`, `quit`, `suspended`, `reloaded`, `disabled`, `crashed`, and
     `unloaded` are Core-reported. `overlay.dismissed` stays specific to
     `ui.present` and is not reused.
   - **Code mechanism:** cold-tick delivery following the existing
     `deliver_overlay_released`/`deliver_overlay_dismissed` pattern
     (`crates/bitty-terminal/src/terminal_app.rs`,
     `crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`), with a
     bounded pending buffer and `PluginRuntime::deliver_event`.
   - **Proof test:** one event per cause with exactly the documented fields;
     the pending buffer drops oldest at its bound and reports the drop count;
     the payload contains no key bytes, text, coordinates, or terminal
     content; no VM runs on the input path.

7. **Teardown on generation end.**
   - **Contract text:** the reload/disable/crash/suspend rows of
     `## Lifecycle and restore paths` and the fail-closed properties in
     `## Security review` must state that generation end releases the content
     and restores the terminal before the generation's resources are dropped;
     the panel **container** survives, matching the candidate
     [Panel Generation Ownership Decision](panel-generation-ownership-decision.md)
     and [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476). No
     plugin code runs on the restore path; a per-tick orphan sweep is defense
     in depth.
   - **Code mechanism:** the generation teardown funnel
     (`clear_ui_blocks`/`revoke_plugin` in
     `crates/bitty-runtime/src/plugin_runtime/mod.rs`,
     `crates/bitty-runtime/src/plugin_runtime/services.rs`) must release the
     content before dropping services, without disposing the workspace-owned
     container. The current `SceneHost::release_owner` disposes its own panel;
     that is the wrong lifetime for a persistent panel container.
   - **Proof test:** kill, suspend, disable, and unload a presented generation;
     assert the terminal is restored within one tick with the correct reason,
     no scene/queue/handle remains, the panel container still exists, and no
     stale handle can address the old surface.

8. **Reload semantics.**
   - **Contract text:** the `Plugin reload` row of
     `## Lifecycle and restore paths` and rule 4 must state that reload never
     re-presents automatically: the old generation's content is released, the
     terminal is restored, the new generation starts `idle`, and only an
     explicit `present` creates a new surface.
   - **Code mechanism:** the activation-epoch/generation fence already used by
     the scene and overlay stores, plus teardown-before-activation ordering;
     no activation hook may call `present`, `show`, or `mount` on the plugin's
     behalf.
   - **Proof test:** reload while presented; assert the terminal is restored,
     the old handle fails `E_UI_NOT_OWNER`, no surface is created by the new
     generation until it calls `present`, and a config reload that does not
     remove the plugin leaves an active content surface unchanged.

9. **Accessibility and text fallback.**
   - **Contract text:** D13 must become an acceptance criterion that names the
     focus announcement, the screen-reader description, and the text fallback
     for refused or unsupported content. The per-frame scene projection is
     parity evidence, not a live accessibility tree; the contract must say
     which one it requires.
   - **Code mechanism:** extend the `UiSnapshotHost` scene projection
     (`crates/bitty-runtime/src/runtime/scene_present.rs`,
     `crates/bitty-ui/src/a11y_host.rs`) or add a bounded text fallback node;
     do not treat `SceneFrameReport::a11y` as a published tree.
   - **Proof test:** assert the focus announcement and text description on
     present and on focus return; assert a refused scene still exposes a
     bounded text fallback; assert the recorded parity evidence is not
     published as the live tree; assert accessible text stays within the
     existing host bounds.

10. **Image nodes and the image-paint gap.**
    - **Contract text:** if `Image` is admitted for panel content, the
      terminology/bounds text must say it is a bounded placement reference and
      that it is not decoded or painted until the image plane forwards it.
      Otherwise the descriptor must exclude `Image` from this wave. Link
      [bitty#2875](https://github.com/bitty-terminal/bitty/issues/2875) for the
      image-paint gap.
    - **Code mechanism:** `SceneNode::Image` admission and counting in
      `crates/bitty-runtime/src/runtime/scene_present.rs`; forwarding remains
      the separate image-plane slice, with no plugin-visible data path.
    - **Proof test:** an `Image` node is admitted and counted but produces no
      decode or blit while bitty#2875 is open; once forwarding lands, a
      placement test proves the expected pixels and no plugin read access.

## Open points

- Whether a future explicit panel target is safe once panel rules and stable
  user-facing identities exist.
- Whether a GUI content surface may be persisted across a session restore, and
  how that composes with `PersistentId` rehydration. This record does not
  persist GUI content.
- Whether `views.<selector>` should eventually gain a `gui` member, and how
  that interacts with the durable-kind rule in D9.
- Whether panel content adopts the full rich scene set (including `Styled` and
  bounded pointer bindings) or a narrower subset, and how that relates to the
  band `UiNode` vocabulary.
- Whether the dashboard's internal padding should be preserved exactly or
  normalized to the panel content rectangle.
- Whether a display-only (non-focusable) GUI content is worth a second
  capability once the keyboard-trap problem has a different solution.

## Acceptance criteria

This record is complete when:

1. The two-axis model (placement versus content kind), the displaced-content
   record, and the generic close/quit restore paths are reviewed and either
   accepted through an RFC amendment or retained as a candidate with the
   blocking decisions named.
2. D1-D14 are decided or explicitly deferred with owners.
3. The scene paint path is implemented; the content-kind transition, displaced
   record, input routing, and restore path in the acceptance checklist are
   specified and sequenced before any implementation task.
4. A security reviewer signs the `P0` section for the new capability and the
   input-routing branch.
5. The affected-contracts table matches the edits made in the same wave,
   including the capability and event-kind amendments in the plugin corpus.
6. The dashboard migration note matches the dashboard candidate's current
   focusable-overlay path and does not describe panel content as shipped.
7. The acceptance checklist above is decided or explicitly deferred with
   owners; no item is silently assumed.

## P0 Review Sign-off

- Documentation review: pending.
- Security review: **required**, because this record adds a panel-content
  capability (candidate spelling `ui.panel`; `panel.content` is the
  alternative) and a new input-routing branch for plugin content. The review
  must confirm no PTY, file, pointer, placement, or terminal-read authority is
  reachable, and that the fail-closed close/crash paths cannot be vetoed by
  plugin code.
- Implementation review: not applicable; no implementation is authorized.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — panel identity, lifecycle, focus,
  and the `4+1` overlay envelope.
- [Panel Placement Decision](panel-placement-decision.md) — placement identity
  and the `View`/`Panel` split.
- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md) —
  the non-terminal content path; its paint half is now consumed for
  `terminal`-slot scenes.
- [Panel Generation Ownership Decision](panel-generation-ownership-decision.md)
  — the candidate split between a workspace-owned panel container and
  generation-owned content.
- [Panel/Surface/Process Trichotomy (Candidate)](panel-surface-process-trichotomy-candidate.md)
  — the vocabulary that separates panel, surface, PTY, and process.
- [Workspace Compositor Specification](workspace-compositor.md) — the
  composition hierarchy and Core-owned decoration.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  — `ViewId != TerminalId` and attachment semantics.
- [Terminal State RFC](terminal-state-rfc.md) — Terminal Truth and resize
  invariants.
- [Rich Presentation RFC](rich-presentation-rfc.md) — the scene contract and
  budgets.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — the accepted UI surface and error classes.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  — deny-by-default capabilities and manifest binding.
- [Overlay and Input-Capture Host Contract](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/overlay-input-capture-contract.md)
  — the bounded owner-polled input precedent.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) — the
  three-owner overlay boundary and the no-fourth-system rule.
- [Chrome Band Contract](chrome-band-contract-candidate.md) — inset band
  geometry and reflow.
- [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  — Core mechanism, plugin-only presentation.
- [Configuration dashboard (Plugin) (Candidate)](../interfaces/configuration-dashboard-candidate.md)
  — the plugin surface and its deferred capability.
- [bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388) — the owner
  design request.
- [bitty#2380](https://github.com/bitty-terminal/bitty/issues/2380) — the
  configuration dashboard request.
- [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476) — panel
  lifecycle versus plugin generation ownership; open.
- [bitty#2849](https://github.com/bitty-terminal/bitty/issues/2849) — the
  presentation-only overlay; closed and implemented, identifier still a
  candidate.
- [bitty#2875](https://github.com/bitty-terminal/bitty/issues/2875) — kitty
  graphics parsed but not painted; open, and the terminal-graphics reference
  for the image gap.
- [Drawer Presentation Mode Decision](drawer-presentation-mode-decision.md) —
  the 0.1.0 disposition that keeps the drawer question a placement-only
  concern.
