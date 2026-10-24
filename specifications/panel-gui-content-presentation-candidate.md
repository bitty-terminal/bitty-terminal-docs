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
> spellings that a successor acceptance adopts or rejects. The mechanism does
> not exist: the Scene-consumption path this design depends on is accepted in
> direction but is not consumed by the app present path (see "Current state").
> This document authorizes no implementation.

## Purpose and scope

A plugin that wants to show a dashboard, an inspector, or a structured
management surface has no way to occupy a panel except by degrading into a
character grid or by opening a transient overlay. Both are wrong for a
persistent application surface: the grid cannot express lists, tables, or
hit-testable rows, and an overlay is global, modal, and transient by contract.
At the same time, a panel's PTY must not be destroyed to show that surface,
because the shell session is the user's work.

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

| Term              | Meaning in this document                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel             | The workspace-managed container with a stable `PanelId`; it has a placement and a lifecycle, and it shows exactly one content kind at a time.                                                            |
| Placement         | The panel's mode in the compositor: `tiled`, `floating`, `fullscreen`, or `scratchpad`. Owned by the panel and the user, never by the plugin.                                                            |
| Content kind      | What the panel currently presents: `Terminal` (a PTY-backed grid) or `Gui` (a bounded declarative scene).                                                                                                |
| PTY               | The transport to the child process. It has no placement and no presentation semantics; the terminal content owner (a pane session or the runtime-global primary PTY) owns its reader and terminal state. |
| Terminal Truth    | Parser state, grid, cursor, modes, replies, and canonical scrollback; mutable only by Core.                                                                                                              |
| GUI content       | Core-validated declarative content (`Text`, `Row`, `Column`, `List` in v1) presented inside the panel's content rectangle through the Scene path.                                                        |
| GUI surface       | One generation-owned, opaque block handle backing a panel's GUI content.                                                                                                                                 |
| Displaced content | The Core-owned record of the terminal content, attachment, frozen content rectangle, and scroll position that the GUI content replaced.                                                                  |
| Owner             | The plugin identity plus execution generation that requested the GUI surface. The host records it; the caller cannot supply it.                                                                          |
| Generic close     | The existing `close_view` chrome action (default `Mod+q`) that pops the topmost dismissible layer and otherwise closes the focused panel.                                                                |
| Generic quit      | The existing window-close path (`quit` action, last-panel close, or window close request) that tears the application down.                                                                               |
| Band              | An inset edge surface (`top`/`bottom`) that reserves space outside the panel content rectangle. The bar is the existing special case.                                                                    |
| Fail-closed       | A failure leaves the previous valid content (or restores the displaced terminal) and never leaves a blank panel, an orphan PTY, or a keyboard trap.                                                      |
| Scene path        | The accepted direction by which bounded declarative content reaches the renderer outside the character grid.                                                                                             |

## Current state (implementation facts only)

These facts describe `bitty` `origin/main` at `aceb327e` (2026-10-21) and this
documentation corpus at the same date. Nothing else in this record is
implemented.

- `ViewContent` has five variants: `Empty`, `Terminal(u64)`, `Rich(u64)`,
  `Browser(BrowserSurfaceId)`, and `Panel(PanelId)`
  (`crates/bitty-ui/src/panel.rs`). Only terminal-backed content is composed
  by the app today.
- `PresentationMode` has four values (`Tiled`, `Floating`, `Fullscreen`,
  `Scratchpad`). Every type-level transition is currently permitted, the layout
  solver ignores the field, and the app wires only the tiled/floating toggle
  (`toggle_floating`, default `Alt+a`) through the workspace-local float store.
  `Fullscreen` and `Scratchpad` parse but the toggle paths reject them; the
  `PRESENTATION_CMD_*` names exist in `bitty-ui` but are not dispatched by the
  app.
- `bitty.ui.mount` accepts the closed slot set `terminal`, `top`, `bottom`,
  `left`, `right`, `tabline`, `overlay`. `left`, `right`, `terminal`, and
  `tabline` fail closed with `E_UI_UNAVAILABLE`; `statusline` was removed;
  `overlay` is the focusable transient surface behind `ui.overlay.focus`.
- The focusable overlay is a single global session with a 30-second lease, a
  256-event queue, 4096-byte events, drop-oldest overflow, and Core-owned
  release on submit, cancel, focus switch, unload, crash, and timeout. It is
  modal, transient, and counted in the `4+1` envelope; it is not panel content.
- The Scene-consumption path is not wired to the app paint path:
  `cw_present` derives `ScenePresent` and `NonTerminalPresent`, but no
  `bitty-render`, `bitty-runtime`, or `bitty-terminal` consumer paints a
  panel's scene. Non-terminal panel content still degrades to the per-leaf grid
  snapshot. This is the dependency recorded by
  [OQ-051](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  and the [Panel Content Scene Path Decision](panel-content-scene-path-decision.md).
- The PTY pipeline already drains the primary session and every pane session on
  each `poll_pty`, under one shared budget: 32 chunks, 256 KiB, and 10 ms per
  call, with a 16-chunk (128 KiB) bounded reader channel per session, 8 KiB
  reads, and kernel PTY backpressure. Parsing continues for panes that are not
  painted; no plugin-visible output buffer exists.
- The live app keys pane terminal sessions by `ViewId`; `PanelId` is the
  accepted panel identity and the registry/contract target, not yet the live
  session key. This record speaks the accepted identity vocabulary and treats
  the encoding transition as owned by the
  [Panel Placement Decision](panel-placement-decision.md).
- The configuration dashboard is **plugin-owned and not shipped**: the
  Core-panel prototype was withdrawn before merge (`bitty` #2390, 2026-10-21;
  `bitty` #2380 re-scoped to a `0.1.0` plugin). No dashboard code exists in
  `bitty` `main`, and this record assumes no Core-owned dashboard precedent
  (`interfaces/configuration-dashboard-candidate.md`).
- DevTools is notification-only: its manifest requests `debug.inspect`,
  `debug.trace`, and `platform.notify`, and no `ui.*` capability.
- The bar is composed on the `bottom` band by a plugin mount; it is not panel
  content and reserves its own inset space.

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
   apply it** in v1. The user moves the panel with the existing commands
   (`toggle_floating`, and the presentation commands when they are wired).
   This is the narrowest reading of "hint, not authority" and it avoids a
   plugin silently rearranging the user's layout.
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
existing kind and `Gui` for the new one, matching `ViewContent`'s existing
vocabulary while recording the owner's `Pty ↔ Gui(surface)` intent.

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

| Authority                                      | Capability                   | Status                | Notes                                                                                        |
| ---------------------------------------------- | ---------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| Declarative scene rendering                    | `ui.rich`                    | Accepted v1           | Same node set and budgets as `ui.mount`/`ui.update`.                                         |
| Panel content presentation and input ownership | `ui.panel`                   | **New, candidate v2** | One grant couples the surface and the keys; no separate focus grant (see rationale below).   |
| Placement, geometry, pointer, PTY, filesystem  | none                         | —                     | No identifier exists and none is implied. A plugin holding `ui.panel` gains no other family. |
| Safe mode                                      | no third-party plugin loaded | Accepted invariant    | `bitty --safe` never reaches this surface. No Core-owned surface uses the same mechanism.    |

`ui.panel` is deliberately **one** grant, not `ui.panel` plus `ui.panel.focus`.
For a focusable overlay, presentation and capture can be separate because the
overlay coexists with the terminal: a display-only overlay leaves keys with the
shell. Panel content replaces the terminal, so separating the grants would
create a focused panel whose keys go nowhere — a keyboard trap. Coupling the
grant removes that state. `ui.rich` stays separate because "may render a
scene" and "may occupy a panel and own its keys" are different authorities.

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

- `present(scene, spec)` validates `scene` against the v1 node set and budgets,
  validates `spec` against the closed descriptor, checks `ui.rich` and
  `ui.panel`, resolves the focused terminal-backed panel, writes the displaced
  record, swaps the content kind, and returns an opaque handle. It fails with
  `nil` plus a typed error and changes nothing.
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
3. **No pointer authority.** Clicks and wheel over declarative nodes continue
   to dispatch the already-accepted `on_click`/`on_scroll` command bindings with
   bounded arguments. The plugin receives no coordinates, no pointer capture,
   no drag, no cursor shape, and no hover stream. Hit-testing stays inside the
   panel content rectangle and uses the frame's own geometry.
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
| `fullscreen` | No (parse only)        | When it lands, fills the full-bleed rectangle; no new content rule.         | Frozen, parsing. | Accepted, unused. |
| `scratchpad` | No (parse only)        | When it lands, the content persists while hidden and repaints when shown.   | Frozen, parsing. | Accepted, unused. |
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
| Missing `ui.rich` or `ui.panel` grant                                             | `runtime`    | `E_CAPABILITY_DENIED`    | Nothing changes.                         |
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

| Dimension                          | Bound                                                                               | Over-limit behavior                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| GUI scene per block                | Accepted v1 budgets: depth 16, 2048 nodes, 256 KiB text                             | Refused with `E_UI_COMPONENT_INVALID`; previous kept.    |
| Retained blocks per plugin         | 64 (accepted v1)                                                                    | Mount refused; previous state kept.                      |
| GUI surfaces per panel             | 1                                                                                   | `E_UI_PANEL_BUSY` / `E_UI_PANEL_NESTED`.                 |
| GUI surfaces per plugin generation | 1                                                                                   | `E_UI_PANEL_NESTED`.                                     |
| Input queue depth                  | 256 events                                                                          | Oldest dropped; `overflowed` sticky; stays active.       |
| Input event payload                | 4096 bytes serialized                                                               | Oversize event rejected before enqueue.                  |
| Present/update call                | 4096 bytes serialized descriptor; scene under the v1 block budgets                  | Validation error; previous state kept.                   |
| Idle timeout                       | none                                                                                | Persistent by design; release only on an explicit cause. |
| Owner call budgets                 | Per-plugin CPU, memory, task, and queue budgets per the accepted isolation contract | Core-enforced with owner attribution.                    |

## Security review

| Threat                               | Control                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| PTY or file surgery from Lua         | No descriptor field, host verb, or handle exposes a PTY, signal, path, command, URL, or environment value.                         |
| Presentation mutating Terminal Truth | Content kind is presentation state; the swap never resizes, writes, parses, clears, or replays terminal state.                     |
| Reading hidden terminal output       | No read surface, no scrollback API, no snapshot in the descriptor. The plugin is not given a second data path.                     |
| Input interception or keyboard trap  | Keys route only for the focused panel; Core owns the queue; generic close always pops the surface; no plugin veto and no callback. |
| Pointer or window authority          | No coordinates, capture, drag, cursor, hover, OS surface, or window creation. Clicks remain command bindings.                      |
| Spoofing another owner or panel      | Owner comes from the host identity/generation; the target is the focused panel only; handles are generation-checked.               |
| Renaming or re-badging the panel     | No title, icon, tab, or chrome field; panel chrome stays with the existing bar/tabline policy.                                     |
| Crash or wedge pinning the panel     | Teardown-ordered release plus a per-tick orphan sweep; no idle lease is required, and no plugin code runs on the restore path.     |
| Resource exhaustion                  | v1 scene budgets, one surface per panel and per generation, 256-event queue, 4096-byte events, per-plugin budgets.                 |
| Silent capability growth             | New `ui.panel` id only, deny by default, manifest-hash-bound grant, no wildcard, no first-party bypass.                            |
| Audit gaps                           | Two observation-only events and bounded doctor counters; no content payloads.                                                      |
| Safe mode                            | Third-party plugins never load; no Core-owned surface uses the same mechanism.                                                     |

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

| Contract                                                                                                                             | Effect                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                            | Gains the content-kind axis and the GUI lifecycle; identity, focus, and overlay envelope unchanged.                   |
| [Workspace Compositor Specification](workspace-compositor.md)                                                                        | Leaf content selection gains the `Gui` presenter; placement and decoration rules unchanged.                           |
| [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)                                              | `ViewContent` gains a variant; `ViewId != TerminalId`, attachment, and move rules unchanged.                          |
| [Terminal State RFC](terminal-state-rfc.md)                                                                                          | No truth mutation; the geometry freeze and single restore resize are presentation rules; reflow stays its open point. |
| [Rich Presentation RFC](rich-presentation-rfc.md)                                                                                    | Reused node set and budgets; no new scene node or budget.                                                             |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md) | Adds a v2 `bitty.ui.panel.*` surface; the v1 slot set and node set stay frozen.                                       |
| [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)          | Adds the `ui.panel` capability id under OQ-056's v2 admission.                                                        |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)                                                              | Extends the close-layer precedence; adds no overlay owner, tier, or modal gate.                                       |
| [Chrome Band Contract](chrome-band-contract-candidate.md)                                                                            | Unchanged; bands remain outside panel content and the bar keeps its model.                                            |
| [Configuration Model RFC](configuration-model-rfc.md)                                                                                | Candidate consequence: `views.<selector>` matching must use the durable content kind, not the transient GUI kind.     |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)                                                            | Hard dependency: the Scene path must be consumed by the present path before this contract can be implemented.         |
| [Panel Placement Decision](panel-placement-decision.md)                                                                              | Unchanged direction; this record explicitly keeps placement out of plugin authority.                                  |
| [Configuration dashboard (Plugin) (Candidate)](../interfaces/configuration-dashboard-candidate.md)                                   | Plugin-owned migration target; it uses this mechanism through `ui.rich`/`ui.panel`, not a Core-internal path.         |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)                                | New capability and input-routing branch require the `P0` security review.                                             |

## Migration

1. **Dashboard (bitty#2380).** The configuration dashboard is a `0.1.0`
   first-party plugin; the Core-panel prototype was withdrawn before merge
   (`bitty` #2390). It uses this mechanism like any other plugin: `ui.rich`
   plus `ui.panel`, the read-only projection (`bitty` #2396), and the
   `config.manage` capability (`bitty` #2393) for writes. There is no
   Core-internal GUI-content path and no capability-free Core surface to
   preserve; the section set, bounds, and confirmations in the dashboard
   candidate are plugin requirements.
2. **DevTools.** DevTools stays notification-only in 0.0.25. When it gains a
   UI, it uses `bitty.ui.panel.*` with `ui.rich` and `ui.panel`; no forced
   change now, and its existing `debug.*` grants are unchanged.
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

| ID  | Decision                                                                                            | Recommended answer                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| D1  | Content-kind encoding: add `ViewContent::Gui(GuiSurfaceId)` or reuse `Panel(PanelId)`?              | Add `Gui`; keep `Panel` for panel-provider content.                                                                           |
| D2  | Capability set: one `ui.panel` or `ui.panel` + `ui.panel.focus`?                                    | One `ui.panel`, coupled with `ui.rich`; no separate focus grant (keyboard-trap rationale).                                    |
| D3  | OQ-056 admission: is a new `ui.panel` id in v2 scope?                                               | Yes, via an OQ-056 amendment naming this contract; v1 stays frozen.                                                           |
| D4  | Target selection: focused panel only, or an explicit bounded `PanelId` handle?                      | Focused panel only in v1; explicit targeting is a later decision with its own authority analysis.                             |
| D5  | Placement hint application: record-only, or apply when the user has no rule?                        | Record-only in v1; expose it to chrome, never mutate placement.                                                               |
| D6  | Close precedence: confirm `close_view` pops GUI content before closing the panel.                   | Yes; it mirrors the existing overlay-capture precedence and cannot be vetoed.                                                 |
| D7  | Input ownership: panel-scoped queue with no global capture and no idle timeout?                     | Yes; release only on explicit causes, never on idle or focus loss.                                                            |
| D8  | Event kinds: add `panel.content.released` and `panel.content.input-available` to the closed set?    | Yes, both observation-only, mirroring `overlay.released`/`overlay.input.available`.                                           |
| D9  | Appearance selectors: evaluate against the durable content kind or the transient one?               | Durable kind; a content swap never changes decoration or background.                                                          |
| D10 | Empty/browser/no-PTY targets: refuse `present` unless a live terminal content owner exists?         | Yes; a pane session or the runtime-global primary PTY both qualify; leaves without a PTY owner fail `E_UI_PANEL_UNAVAILABLE`. |
| D11 | Dashboard migration: Core-internal mechanism or plugin over `ui.panel`?                             | Plugin over `ui.panel`; no Core-internal GUI-content path. The Core prototype was withdrawn (`bitty` #2390).                  |
| D12 | Scene-path sequencing: is the present-path consumer a hard prerequisite?                            | Yes; the contract cannot ship before the Scene path paints panel content (OQ-051 direction).                                  |
| D13 | Accessibility: what is the focus announcement and screen-reader description for GUI content?        | Follow-up required before acceptance; no accessibility claim in this record.                                                  |
| D14 | Restore reflow: confirm "state preserved, visible reflow per the existing algorithm" is sufficient. | Yes; the exact algorithm remains the Terminal State RFC's open point.                                                         |

## Open points

- Whether a future explicit panel target is safe once panel rules and stable
  user-facing identities exist.
- Whether a GUI content surface may be persisted across a session restore, and
  how that composes with `PersistentId` rehydration. This record does not
  persist GUI content.
- Whether `views.<selector>` should eventually gain a `gui` member, and how
  that interacts with the durable-kind rule in D9.
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
3. The Scene-path dependency is sequenced before any implementation task.
4. A security reviewer signs the `P0` section for the new capability and the
   input-routing branch.
5. The affected-contracts table matches the edits made in the same wave,
   including the capability and event-kind amendments in the plugin corpus.
6. The dashboard migration note matches the plugin-owned placement and the
   dashboard candidate's re-scope, not a withdrawn Core surface.

## P0 Review Sign-off

- Documentation review: pending.
- Security review: **required**, because this record adds a capability
  (`ui.panel`) and a new input-routing branch for plugin content. The review
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
  the non-terminal content path this contract depends on.
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
- [Drawer Presentation Mode Decision](drawer-presentation-mode-decision.md) —
  the 0.1.0 disposition that keeps the drawer question a placement-only
  concern.
