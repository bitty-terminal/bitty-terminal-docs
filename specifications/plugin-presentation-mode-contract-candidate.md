---
title: Plugin Presentation Mode Contract (Candidate)
description: Candidate contract mapping a plugin-chosen presentation mode panel floating fullscreen or band onto one existing owner with PTY retention restore and input ownership
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: false
sidebar_order: 91
---

# Plugin Presentation Mode Contract (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record is the presentation-mode half
> of [bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388); the
> content-kind half is the separate candidate
> [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md).
> It decides nothing on behalf of an owner, it adds no `PresentationMode`
> variant, no capability id, no overlay kind, and no tier, and it authorizes no
> implementation. Every spelling below that is not marked **shipped** or
> **accepted** is a candidate spelling that a successor acceptance adopts or
> rejects.
>
> The record exists because four words — `panel`, `floating`, `fullscreen`,
> `band` — are used by plugin authors, issues, and code comments as if they
> were one taxonomy, while the corpus assigns each of them to a different
> owner. Conflating them is the failure mode: a `band` treated as a panel
> replacement displaces a PTY that should never have been touched, and a
> `floating` treated as a new overlay adds a fourth overlay-shaped system that
> the [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)
> forbids. This record states one row per mode, one owner per row, and what a
> replacing surface owes the PTY it covers.
>
> Nothing here is implemented. The mechanisms it composes are shipped; the
> contract that composes them is not.

## Purpose and scope

A GUI plugin today can mount band content, draw a non-modal surface above the
focused view, take a transient focusable capture, and ask for a panel
presentation-mode change. It cannot present **in place of its PTY** while the
PTY stays alive, and no document says which of those four surfaces a plugin
that "wants a mode" is actually asking for, who owns its geometry, or what
happens to the hidden terminal. Authors therefore reach for whatever mechanism
renders, and reviewers cannot say which choice was wrong.

This record answers one question: **given a plugin-chosen presentation mode
among `panel`, `floating`, `fullscreen`, and `band`, which existing owner hosts
it, what may that owner do while the plugin presents, and what does the surface
owe the panel and the PTY on exit?**

In scope:

- the four-row mode matrix: permitted behavior, prohibited behavior,
  multiplicity, and the owning mechanism for each mode;
- the explicit statement that `band` is **not** a panel replacement and maps
  onto the existing bar and band model;
- the declarative, manifest-level mode declaration and what it does not grant;
- the PTY retention contract for the replacing mode: no resize, no kill,
  exact restore, bounded buffering and backpressure while hidden, and stale
  geometry;
- the typed lifecycle `Open -> Focused -> Hidden -> Restored / Refused /
Crashed`, one GUI surface per panel, the duplicate and nested refusals, and
  fail-closed restore on crash, disable, and reload;
- input ownership and the restore gesture as a configurable, spelling-resolved
  command rather than a hardcoded chord;
- the capability and ceiling boundary;
- the questions an owner must answer before any slice ships here;
- the evidence that would promote this candidate.

Out of scope and owned elsewhere: the content-kind transition, the displaced
record, the scene node set, and the scene budgets (candidate,
[Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md));
placement identity and the `View`/`Panel` split (draft,
[Panel Placement Decision](panel-placement-decision.md), `RFC-OQ-3`); overlay
tier composition, the three overlay owners, and single modal authority (draft,
[Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)); band
geometry, reflow, and per-edge stacking (candidate,
[Chrome Band Contract](chrome-band-contract-candidate.md)); the chrome surface
inventory and read-only rules (candidate,
[Chrome Surface Contract](chrome-surface-contract-candidate.md)); motion keys,
durations, and reduced-motion collapse (candidate,
[UI Motion and Budget](ui-motion-and-budget-candidate.md) over the accepted
animation contract); the persisted restore record (candidate,
[Panel Restore Record Contract](panel-restore-record-contract-candidate.md));
and the plugin author guide, mode matrix as user-facing documentation, and
manual page, which are follow-up deliverables rather than this record.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 2 (no ambient authority), invariant 3 (presentation never Terminal
  Truth), invariant 4 (no hot-path plugin execution), invariant 7 (bounded
  inputs), invariant 8 (updates cannot silently add capabilities), and
  invariant 10 (`bitty --safe`).
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): `PanelId != ViewId !=
TerminalId`, the `Declared -> Created -> Mounted -> Focused -> Suspended ->
Disposed` lifecycle, the `4+1` overlay envelope, the closed `panel.*`
  capability family, mode as a runtime property of a panel, the
  `preferred_mode` suggestion rule, and the command registry.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  `Instance -> Window -> Workspace -> LayoutTree -> View`, Core-owned
  decoration, the no-window-leak rule, the `OverlayTier` paint-order contract,
  and the recorded state that only `Tiled` is a live `PresentationMode` while
  `Floating`, `Fullscreen`, and `Scratchpad` parse behind a gated transition.
- [Terminal State RFC](terminal-state-rfc.md) (accepted): Terminal Truth is
  grid, cursor, modes, scrollback, and replies; resize enters through one path;
  the exact reflow algorithm remains that RFC's open point.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): `SCN-1..SCN-5`
  and the rule that rich presentation never becomes Terminal Truth.
- [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md)
  (accepted): `ViewId != TerminalId`, attachment and detachment, and move
  atomicity.
- [Drawer Presentation Mode Decision](drawer-presentation-mode-decision.md)
  (accepted): the four `PresentationMode` variants stay, no fifth mode is
  admitted for 0.1.0, and the mechanism table that separates the in-tree
  `Floating` stamp, the detached float, and the pinned float.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)
  (draft): kind decides exclusivity, tier decides paint order, one modal
  authority per `Window`, and a new overlay-shaped feature must extend one of
  the three owners instead of adding a fourth system.
- [Chrome Band Contract](chrome-band-contract-candidate.md) (candidate): bands
  are inset edge surfaces that reduce the tiling area and never overlap
  content.
- [Chrome Surface Contract](chrome-surface-contract-candidate.md) (candidate):
  chrome geometry is Core-owned, chrome is not a focus target, and chrome slots
  are admitted, bounded, and closed.
- [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md)
  (draft): the per-slot host behavior and the grant each slot requires.
- [Plugin manifest keys](../reference/configuration-options.md) (shipped
  reference): the flat `[capabilities] <id>` boolean form, deny-by-default,
  no wildcards, unknown identifiers rejected, and manifest-hash-bound grants.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the closed slot set and the typed bridge error classes.

## Claim status map

Each claim in this record is either a citation of an accepted or shipped
mechanism, or it is labelled a candidate. No third kind of claim is made.

| Claim area                                                  | Status                                            | Basis                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mode vocabulary (`panel`, `floating`, `fullscreen`, `band`) | Candidate grouping of shipped and candidate names | Names come from [bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388)            |
| Per-mode owner assignment                                   | Candidate                                         | Composes the accepted RFCs and the reconciliation above                                      |
| `PresentationMode` four variants                            | Accepted                                          | [Drawer Presentation Mode Decision](drawer-presentation-mode-decision.md)                    |
| Only `Tiled` live today                                     | Accepted, recorded                                | [Workspace Compositor Specification](workspace-compositor.md)                                |
| Band geometry and reflow                                    | Candidate                                         | [Chrome Band Contract](chrome-band-contract-candidate.md)                                    |
| Panel content replacement                                   | Candidate                                         | [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)                |
| Declaration spelling `[presentation] surface`               | Candidate                                         | This record                                                                                  |
| Lifecycle state names                                       | Candidate                                         | This record; mapped onto the content record's `idle`/`active`/`released`                     |
| Refusal codes                                               | Candidate spellings of accepted error classes     | [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)                |
| Restore gesture                                             | Shipped action, candidate framing                 | [`close_view` in the shipped action catalog](../reference/configuration-options.md)          |
| Ceilings (`SCN-*`, `4+1`, queue bounds)                     | Accepted and shipped, consumed not redefined      | [Rich Presentation RFC](rich-presentation-rfc.md), [Panel Runtime RFC](panel-runtime-rfc.md) |
| Plugin-owned placement authority                            | Vision only, not shipped                          | [Panel Vision](../product/panel-vision.md)                                                   |

## Terminology

| Term                  | Meaning in this document                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation mode     | One of `panel`, `floating`, `fullscreen`, `band`: the surface class a plugin declares and asks the host to present its GUI content on.                               |
| Replacing surface     | A surface that stands in for a panel's terminal presentation while the PTY stays alive. Only `panel` mode produces one.                                              |
| Non-replacing surface | A surface that coexists with the panel and its terminal: `floating`, `fullscreen`, and `band`.                                                                       |
| Owning mechanism      | The single existing mechanism a mode resolves to: the panel content kind on a tiling leaf, the per-leaf presentation mode, the overlay envelope, or the chrome band. |
| Presentation session  | One admission of one presentation surface for one panel and one plugin generation, from `Open` to `Restored`, `Refused`, or `Crashed`.                               |
| Hidden                | A presentation session that is admitted and unfocused: the surface persists, no key reaches it, and the panel's terminal keeps parsing.                              |
| Restore               | The terminal content is presented again after a replacing surface ends, and its grid, cursor, scrollback, and mode are intact.                                       |
| Restore gesture       | The user action that ends a presentation session: the shipped `close_view` action, resolved by spelling through the keymap registry, never a hardcoded chord.        |
| Stale geometry        | A content rectangle recorded at replacement time that no longer matches the panel's current rectangle because layout reflowed while the surface was presented.       |
| Buffer owner          | The component that bounds hidden output: the PTY session's terminal state plus the PTY pipeline's bounded reader channel and per-poll drain budget.                  |
| Band                  | An inset edge surface (`top`, `bottom`, `left`, `right`) that reserves space outside the panel content rectangle. The bar is the existing special case.              |
| Refused               | An admission that changed nothing: no surface, no content kind change, no focus change, no key rerouting.                                                            |

## The four owners a mode can resolve to

Four presentation owners already exist. They are not interchangeable, and no
fifth is introduced here.

1. **Panel content kind on a tiling leaf.** The panel's content is terminal
   content or declarative GUI content, and the presentation never changes the
   panel's placement, identity, or attachment. Candidate, owned by
   [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md).
2. **Per-leaf presentation mode.** `PresentationMode` on a `View` is the
   requested display mode of one leaf (`Tiled`, `Floating`, `Fullscreen`,
   `Scratchpad`); `Floating` and `Scratchpad` map to `OverlayTier::Float` as a
   presentation annotation only, and the mapping is not a stacking decision.
   Accepted as vocabulary, gated in transitions, owned by the
   [Workspace Compositor Specification](workspace-compositor.md) and the
   [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md).
3. **Overlay envelope.** `OverlayManager` owns `OverlayKind`, the `4+1`
   envelope, and the single modal authority bit per `Window`. Accepted, per the
   [Panel Runtime RFC](panel-runtime-rfc.md) and the reconciliation above.
4. **Chrome band.** A Core-owned inset edge surface that reserves space out of
   the layout container and hosts mounted chrome. Candidate, owned by the
   [Chrome Band Contract](chrome-band-contract-candidate.md).

The extension rule is the reconciliation's, restated as a constraint on this
record: a presentation feature extends exactly one of these owners. A mode that
needs two of them, or a fifth one, is out of scope here and needs its own
contract.

## Mode matrix

One row per mode. The `owner` column names the mechanism in the list above; the
`multiplicity` column names the bound that already exists where one does, and
labels a candidate bound where none does.

| Mode         | What it may do                                                                                                                                                                                                                                    | What it may not do                                                                                                                                                                               | Multiplicity                                                                                                                            | Owning mechanism                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `panel`      | Present bounded declarative content in place of the focused panel's terminal presentation, while the PTY stays alive, the panel keeps its placement, and exit restores the terminal exactly.                                                      | Change placement, geometry, or identity; resize, signal, detach, write to, or kill the PTY; allocate a second surface; take pointer authority or modal authority; create a window or OS surface. | One GUI surface per panel, and one per plugin generation (candidate, from the content record).                                          | Panel content kind on a tiling leaf (candidate content-kind transition).                           |
| `floating`   | Present the panel above the workspace in a bounded, centered frame, either as the in-tree `Floating` stamp that keeps its tiled allocation or through the shipped detached-float and pinned-float paths; focus, move, and resize as a panel does. | Invent edge-docked geometry; claim a tier other than the `Float` annotation; set the modal bit; stack a second float for the same leaf; persist as a second presentation of the same panel.      | One `PresentationMode` value per leaf; the pinned store holds at most one entry per pinned leaf; the detached store is workspace-local. | Per-leaf `PresentationMode::Floating` (parseable, transition gated) plus the shipped float stores. |
| `fullscreen` | Temporarily maximize one surface within its workspace so it fills the whole available area, and return to the previous layout on exit.                                                                                                            | Become an OS fullscreen or borderless window; bypass the gated mode transition; claim the `Messages` tier or the modal bit; survive a workspace switch as a second visible copy.                 | At most one maximized surface at a time per workspace (candidate reading of the accepted one-surface phrasing).                         | Per-leaf `PresentationMode::Fullscreen` (parseable, transition gated).                             |
| `band`       | Mount bounded declarative content in one edge band (`top`, `bottom`, `left`, `right`), reserving that edge out of the tiling area.                                                                                                                | Replace a panel or its content; displace, freeze, or resize a PTY as a band; overlap panel content; take keyboard or IME focus; become a focus target.                                           | At most one band per edge; `tabline` remains an exclusive single-declarant claim that still fails closed.                               | Chrome band (candidate band contract, Core-owned geometry).                                        |

Rules that apply to every row:

1. **One owner, no composition.** A mode resolves to exactly one owner. A
   plugin that needs a band **and** a replacing surface asks for two things
   through two mechanisms; it does not get a hybrid surface.
2. **Only `panel` touches a PTY.** A replacing surface is the only mode that
   can strand a terminal, so it is the only mode that carries the retention
   contract below. `floating` and `fullscreen` are placements: the PTY follows
   the rectangle through the ordinary `LogicalRect -> PTY` path, with the
   ordinary resize, and nothing is frozen because nothing is replaced.
3. **No mode allocates an OS surface.** None of the four creates a window,
   layer-shell surface, or second present queue. The no-window-leak rule holds
   for every row.
4. **One mode per panel at a time.** Mode is a runtime property of a panel, not
   a stack of modes; a panel moves between modes instead of wearing several.
5. **Mode is not input ownership.** `floating`, `fullscreen`, and `panel`
   presenting terminal content all route keys to the PTY exactly as today. What
   changes key routing is the content kind of a replacing surface, not the
   mode.
6. **No plugin-owned geometry.** No row grants coordinates, size, edge choice,
   anchor, or a resize verb. Geometry stays with the compositor and the band
   contract; a plugin's preference is a request the host and the user's rules
   may refuse.

### `band` is not a panel replacement

This is stated separately because it is the row most likely to be misread.

1. A band is an inset edge surface. It reserves space out of the layout
   container and never overlaps panel content, so it cannot stand in for a
   panel and has nothing to restore.
2. The bar is the existing special case of this model: it is a plugin
   presentation composed on the `bottom` band, it keeps its exclusive zone, its
   reflow behavior, and its absent-when-unmounted rule. `band` mode does not
   change the bar, and the bar does not become panel content.
3. Band geometry, thickness, per-edge stacking, narrow-window degradation, and
   the resulting PTY reflow are owned by the
   [Chrome Band Contract](chrome-band-contract-candidate.md). A band appearing
   or disappearing is a layout input whose normal reflow drives any PTY resize
   through the accepted resize path; it is not a presentation side effect.
4. A band is not a focus target and holds no input capture. Pointer interaction
   on band content routes through the command registry as a validated update.
5. Consequently `band` is the only mode that needs no panel target, and the
   only mode whose refusal vocabulary is the mount gate's (`E_UI_UNAVAILABLE`,
   `E_UI_COMPONENT_INVALID`), not the presentation session's.

## The declaration surface

The issue asks for a declarative, manifest- or plugin-API-level mode choice
rather than plugin-local surgery. This record's candidate form is a manifest
declaration, because the manifest is where a plugin's bounded, hash-bound
claims already live.

```toml
[presentation]
surface = "panel"
```

1. **Closed set, one value.** `surface` accepts exactly `panel`, `floating`,
   `fullscreen`, or `band`. Any other value rejects the manifest, matching the
   shipped manifest posture where unknown sections and out-of-range values fail
   closed. At most one value, so a plugin cannot declare four surfaces.
2. **The declaration grants nothing.** It is an intent fact, recorded for audit
   and for first-use admission. Every runtime request still passes its own
   capability gate, and every presentation still resolves its target through
   the host. A declaration is not a verb, not a transition, and not consent.
3. **No geometry, no chord, no target, no duration.** The declaration carries
   no coordinates, size, edge, anchor, panel id, view id, key, or timing. Those
   absences are the contract.
4. **It does not add a `mode` field to the panel-content descriptor.** That
   descriptor stays as the content record states it: a record-only `placement`
   hint and a fixed `restore` value, with no `mode`, no `exit_key`, and no
   owner field. The declaration is a different surface, at manifest level,
   naming a surface class rather than requesting a transition.
5. **Providers and the declaration are separate manifest facts.** A
   `PanelProvider` contributes `PanelType` values under `panel.provider`; the
   presentation declaration says which surface class that provider's surface
   prefers. Both are manifest facts, both are bound to the manifest hash, and
   neither is authority over the other.
6. **A declaration that the host cannot serve is refused per use, not
   silently.** A declared `fullscreen` on a host whose transition is still
   gated is admitted as a declaration and refused as a request with a typed
   error; the plugin does not get a degraded substitute surface.

Whether the declaration should be a manifest section at all, or derived from
the requested capability ids, is an open question below. The manifest-section
shape is the recommended one because it is auditable before any request and
because it cannot be re-read as a capability.

## PTY retention contract

This contract binds only the `panel` mode. It is the reason the mode exists and
the reason it is the most dangerous row in the matrix.

### No resize, no kill, no interference while replaced

1. **The terminal owner is untouched.** Replacement changes the panel's
   presented content kind only. It does not detach, suspend, signal, resize,
   close, or kill the terminal content owner; the PTY descriptor, parser, grid,
   cursor, modes, replies, damage, and scrollback stay owned and live exactly
   as before.
2. **Geometry is frozen.** The recorded content rectangle is the size the child
   keeps. Layout reflow while the surface is presented does not enter the
   `LogicalRect -> PTY` path, so the child sees no `SIGWINCH` and `TIOCGWINSZ`
   keeps returning the frozen size. This is the documented stale-geometry
   contract, not a bug.
3. **Consumption is not suppressed.** Paint is suppressed; the drain is not. A
   hidden terminal continues to parse into its grid and scrollback, so a
   replacing surface never turns into a data-loss surface.
4. **No plugin-visible output path.** The hidden terminal's output is not
   exposed to the plugin, in any form: no read verb, no snapshot, no stream, no
   scrollback API. A presentation grant is not a terminal-read grant.

### Restore is exact

On exit, and before the panel paints again:

- the grid, scrollback, cursor cell and style, modes, selection, and scroll
  offset are the same state they were at replacement, plus whatever the child
  wrote while hidden;
- exactly one resize is issued if the panel's current rectangle differs from
  the frozen one, through the accepted `LogicalRect -> PTY` path; there are no
  intermediate sizes and no second resize from the same gesture;
- scrollback is not truncated and the scroll offset is re-clamped by the
  existing rule, because a shrink can reduce the maximum;
- nothing is re-parsed, replayed, or synthesized to reconstruct the view, and
  the whole content rectangle is invalidated once so no stale cell survives;
- the reflow used by that single resize is the accepted one; the exact
  algorithm remains the [Terminal State RFC](terminal-state-rfc.md)'s open
  point and this record adds no second algorithm and no new fidelity promise.

### Bounded buffering and backpressure while hidden

The buffer owner is named, not invented:

1. **Terminal state owner.** The session that owns the terminal keeps the
   parser, grid, cursor, modes, and scrollback. This is where hidden output
   lands; it is not a new buffer and not a plugin-visible one.
2. **Channel owner.** The PTY pipeline's per-session bounded reader channel is
   the only queue on the output path, and the per-poll drain budget across all
   sessions is the only rate control. Both are recorded shipped mechanisms in
   the [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)
   current-state section at its pin, together with the kernel PTY buffer as the
   final backstop. This record re-uses those bounds and mints no constant; a
   future slice that wants a different bound states it as a candidate constant
   with its own row and its own justification.
3. **Overflow behavior.** When the consumer stalls, the channel fills, the
   kernel PTY buffer fills, and the child's writes block. That is the intended
   overflow behavior: bounded backpressure with zero data loss. There is no
   oldest-dropped policy on the output path, because a drop would silently
   corrupt a session the user cannot see.
4. **The input path is the opposite case, deliberately.** The Core-owned input
   queue for a focused surface is bounded and drops oldest with a sticky
   `overflowed` flag, following the shipped overlay-capture precedent. Dropping
   a key press is recoverable and visible; dropping a byte the child wrote is
   neither.
5. **No block is added by presentation.** A child can block only when the whole
   terminal pipeline is slow, never because its panel is hidden.

### Stale geometry and the edge cases

| Case                                                    | Rule                                                                                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window resize, float move, or split change while hidden | The frozen rectangle stands; no `SIGWINCH`; one resize on restore if the rectangle changed.                                                                 |
| Restore into a smaller rectangle                        | One resize; reflow per the accepted algorithm; the scroll offset is re-clamped; no truncation.                                                              |
| Process exit while hidden                               | Recorded and observed by the existing process events; on restore the panel shows the exited state as an unfocused pane does. The surface stays until ended. |
| Terminal owner gone on restore                          | Restore through the recorded owner if it lives; otherwise close the panel through the normal close path. Never a blank panel, never an unrelated PTY kill.  |
| Replacement record inconsistent                         | Fail closed to the owner: the owner is the authority, not the record.                                                                                       |
| Session save while replaced                             | Presentation is not persisted; a restored session does not resurrect a plugin surface, and the restore-record field list is unchanged.                      |
| Alt-screen, images, or a full-screen child program      | The accepted alternate-screen and image rules are unchanged; presentation never reinterprets them.                                                          |

## Typed lifecycle and refusal vocabulary

A presentation session has six states. Five of them map onto the three handle
states the content record already defines, so no second state machine is
minted.

| Session state | Content-record handle state | Meaning                                                                                             |
| ------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| `Open`        | `active` (entering)         | Admitted; one surface exists; the terminal content is displaced but the surface is not yet focused. |
| `Focused`     | `active`                    | The surface owns the focused panel's keys; the PTY receives none.                                   |
| `Hidden`      | `active` (unfocused)        | The panel lost focus; the surface persists, keys go nowhere, the terminal keeps parsing.            |
| `Restored`    | `released`                  | The terminal content is presented again; the handle is unusable; a new open is allowed.             |
| `Refused`     | `idle` (no change)          | Admission failed typed; kind, record, focus, keys, and PTY are unchanged.                           |
| `Crashed`     | `released` with `crashed`   | The owning generation ended; restore ran during teardown.                                           |

| Cause                                            | From                  | To         | Terminal content                             | Input                       |
| ------------------------------------------------ | --------------------- | ---------- | -------------------------------------------- | --------------------------- |
| Open with grants and a valid target              | `idle`                | `Open`     | displaced, PTY untouched                     | queued for the surface      |
| Focus arrives on the presented panel             | `Open` or `Hidden`    | `Focused`  | still displaced and parsing                  | routed to the surface queue |
| Focus leaves the panel                           | `Focused`             | `Hidden`   | still displaced and parsing                  | nowhere while unfocused     |
| Restore gesture (`close_view`)                   | `Focused` or `Hidden` | `Restored` | restored in place                            | routed to the PTY           |
| Direct panel close, workspace close, quit        | any active state      | `Restored` | released, then the normal close or quit path | none (shutdown)             |
| Plugin reload, disable, suspend, crash           | any active state      | `Crashed`  | restored during teardown                     | routed to the PTY           |
| Missing grant, bad target, band as panel content | `idle`                | `Refused`  | unchanged                                    | unchanged                   |

Rules:

1. **One GUI surface per panel.** A second open for the same panel by a
   different generation fails with `E_UI_PANEL_BUSY` and changes nothing; the
   first surface and its displaced record stay as they were. This is the
   duplicate case.
2. **Nested open is a typed error, not a stack.** A generation that already
   owns a surface and opens another — the same panel or a different one — fails
   with `E_UI_PANEL_NESTED` and must update or release first. GUI content never
   nests inside GUI content, and a plugin never multiplies focusable surfaces.
   These two codes are the content record's candidate spellings, reused here
   rather than re-minted.
3. **`Hidden` is not `Restored`.** Focus loss never releases a presentation
   session: the panel keeps its content, the terminal keeps parsing, and keys
   go nowhere while another target is focused. There is no idle timeout; a
   dashboard may legitimately sit open for hours.
4. **Crash, disable, and reload restore fail-closed.** Release is part of
   generation teardown and runs before the generation's resources are dropped;
   no plugin code runs on the restore path, so the plugin cannot veto it. A
   per-tick orphan sweep is defense in depth. Nothing re-presents automatically:
   a new generation starts in `idle` and must open again.
5. **`Refused` is a state, not an error message.** A refusal leaves the kind,
   the displaced record, the focus, the key routing, and the PTY untouched, and
   is observable. Nothing is admitted-then-dropped.
6. **Refusal spellings are the corpus's existing ones.** This record adds no
   reason vocabulary of its own:

   | Situation                                           | Spelling                                       | Source                                                                        |
   | --------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
   | Content ended by the owner, by close, or by quit    | `dismissed`, `closed`, `quit`                  | [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md) |
   | Content ended by suspend, reload, disable, or crash | `suspended`, `reloaded`, `disabled`, `crashed` | Same record; the placeholder vocabulary shares these                          |
   | Panel left without a controller                     | `unloaded`                                     | [Panel Generation Ownership Decision](panel-generation-ownership-decision.md) |
   | Capability denial or safe-mode exclusion            | `denied`                                       | Same record                                                                   |
   | Schema or contract skew                             | `incompatible`                                 | Same record                                                                   |
   | Host cannot serve the surface or the declared mode  | `E_UI_UNAVAILABLE`                             | Shipped bridge error class                                                    |
   | Missing grant                                       | `E_CAPABILITY_DENIED`                          | Shipped bridge error class                                                    |
   | Invalid declaration value                           | `E_VALUE_*`                                    | Shipped bridge error class                                                    |
   | Second owner, second surface                        | `E_UI_PANEL_BUSY`, `E_UI_PANEL_NESTED`         | [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md) |

   A presentation refusal is therefore reported with the placeholder and
   release vocabulary that already exists, not with a parallel
   `presentation_*_refused` family.

7. **A band has no session.** A band mount is admitted and withdrawn with the
   mount, not with a presentation session; it never enters `Hidden` or
   `Restored`, and its failure posture is the mount gate's.

## Input ownership

```text
Platform -> Router -> focused Panel -> content kind?
  Terminal -> keymap/overlay -> encoder -> PTY
  Gui      -> Core-owned bounded queue -> (plugin poll on its cold path)
```

1. **While the replacing surface is focused, the PTY receives no keys.** Not
   "few" keys and not "unclaimed" keys: none. The focused panel's content kind
   decides routing, and the hot path gains one branch with no plugin call.
2. **Queue, not callback.** The queue is Core-owned and bounded, with
   drop-oldest overflow and a sticky flag, drained by an owner-initiated cold
   path `poll`. There is no plugin callback on the input path, no per-frame Lua,
   and no timer.
3. **Mode does not own input; content kind does.** A `floating` or
   `fullscreen` panel presenting terminal content sends keys to its PTY as
   today. Only a panel presenting a replacing surface reroutes them. This is
   why the matrix's input column is a consequence of `panel` mode's content,
   not of the mode name.
4. **The restore gesture is the shipped generic close, spelled, not chorded.**
   It is the `close_view` action — aliases `close_surface`, `close_panel`,
   `exit_panel`, `close_focused_panel` — resolved by spelling through the
   shipped keymap registry, whose default binding is a Mod-aware `alt+q` and
   whose precedence is user, then workspace, then first-party, then plugin
   suggestion. The gesture is configurable precisely because it is an action
   spelling rather than a literal chord: any user binding of `close_view` ends
   the session, and a config that unbinds it does not create a session that
   cannot end, because a direct panel close and the command path also end it.
5. **Never a hardcoded modifier combination, and never an ambient platform
   shortcut.** A plugin cannot declare, override, or veto the exit chord, and
   no part of this contract depends on an OS-level or compositor-level binding.
   An ambient shortcut would bypass the keymap registry, its conflict
   diagnostics, and the visible ownership signal, and would end a session the
   application never saw end.
6. **Layer precedence is unchanged.** A focusable overlay capture above the
   panel keeps its precedence; one `close_view` ends the overlay capture, the
   next ends the presentation session, and a further one follows the normal
   panel-close path. Direct close commands are not layered: they end the
   session and proceed with the close in one operation, so a programmatic close
   is never trapped behind a content layer.
7. **Fail-closed input.** If the queue cannot be allocated or the owner is
   stale, keys for that panel are swallowed rather than forwarded to the hidden
   PTY, and a bounded diagnostic is recorded. Swallowing is visible and
   recoverable through the restore gesture; typing into an invisible shell is
   worse.

## Capability and budget boundary

The manifest grammar is the shipped one: a flat `[capabilities] <id>` boolean
per id, deny-by-default, absent means denied, no wildcards, unknown identifiers
rejected, and grants bound to the manifest hash. Parameterised authority uses
the shipped scoped forms (`fs.read` with a path glob, `network.connect` with a
host); panel-scoped grants are keyed by `(PanelId, Generation)` in the
registry, which is a grant-scope key and not a manifest field.

| Authority                                       | Capability                                                     | Status                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Replace a panel's content and own its keys      | one panel-content grant, candidate spelling `ui.panel`         | Candidate; content record's decision `D2`/`D3`                         |
| Validate and render the declarative scene       | `ui.rich`                                                      | Shipped gate                                                           |
| Draw a non-modal surface above the focused view | `ui.present`                                                   | Shipped gate                                                           |
| Take a transient focusable capture              | `ui.overlay.focus`                                             | Shipped gate; never implied by `ui.overlay`                            |
| Mount band content                              | `ui.mount` on `top`, `bottom`, `left`, `right`                 | Shipped; `tabline` still requires its exclusive claim and fails closed |
| Contribute a panel type                         | `panel.provider`                                               | Shipped; closed `panel.*` family                                       |
| Create, focus, or attach a panel overlay        | `panel.create`, `panel.focus`, `panel.overlay`                 | Shipped; closed family, no implication between heads                   |
| Request a presentation-mode change              | `panel.focus` gates the shipped `bitty.panel.set_presentation` | Shipped verb; see `PPM-OQ-6`                                           |

Explicitly denied, for every mode in the matrix:

- renderer handles, GPU objects, textures, draw calls, or a second present
  queue;
- arbitrary windows, layer-shell surfaces, or any object with its own lifetime
  outside the window;
- pointer authority: no coordinates, no capture, no drag, no cursor shape, no
  hover stream, no hit-test outside the surface's own rectangle;
- PTY descriptors, signals, process control, environment values, or paths;
- placement geometry: no coordinates, size, edge, anchor, or resize verb;
- modal authority: the single modal bit per `Window` stays with the overlay
  manager and is not reachable from a presentation surface;
- per-plugin exit chords, wildcard grants, implied grants, and any first-party
  bypass.

Ceilings are consumed, not redefined. Each row cites its owner; this record
adds no number.

| Ceiling                            | Value                                                      | Owner                                                |
| ---------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Nodes per presented block          | `SCN-1` 2048                                               | [Rich Presentation RFC](rich-presentation-rfc.md)    |
| Tree depth per block               | `SCN-2` 32, with a stricter reader cap                     | Same RFC; the reader cap is the shipped one          |
| Text bytes per block               | `SCN-3` 256 KiB                                            | Same RFC                                             |
| Aggregated bytes per terminal      | `SCN-4` 2 MiB                                              | Same RFC                                             |
| Retained blocks per terminal       | `SCN-5` 64                                                 | Same RFC                                             |
| Overlays per window                | `4+1` envelope                                             | [Panel Runtime RFC](panel-runtime-rfc.md)            |
| Input queue depth and event size   | Bounded, drop-oldest, sticky overflow flag                 | Shipped overlay-capture host contract, consumed here |
| Hidden output                      | Reader channel plus per-poll drain budget, kernel backstop | PTY pipeline, consumed here                          |
| Frame budget and no periodic timer | Frame-on-demand                                            | [Performance Budget RFC](performance-budget-rfc.md)  |

## Open questions

Each item is a decision for the owner of the cited contract, not a preference
of this record. The recommendation is the smallest answer that keeps one owner
per mode.

| ID         | Question                                                                                                                                                                                                                                    | Recommended answer                                                                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PPM-OQ-1` | Which modes ship in the first slice? `panel` needs a content-kind transition that does not exist; `floating` and `fullscreen` parse behind a gated transition; `band` already mounts.                                                       | Ship `band` first (it is a mounting story, not a session), then `panel` once the content record is accepted; leave `floating` and `fullscreen` to the gated transition work rather than inventing a second path for them. |
| `PPM-OQ-2` | Does `floating` reuse `PresentationMode` or become an `OverlayKind` and tier entry?                                                                                                                                                         | Reuse `PresentationMode`. A new overlay kind would be a fourth overlay-shaped system, which the reconciliation forbids, and the accepted drawer decision already rejected a fifth mode.                                   |
| `PPM-OQ-3` | Who owns band geometry when a plugin declares `band`: does the plugin pick an edge, or does it request a band and Core choose?                                                                                                              | The plugin requests; Core and the user's rules choose the edge. Geometry stays Core-owned per the chrome contract, and `tabline` stays an exclusive claim.                                                                |
| `PPM-OQ-4` | Is the declaration a manifest section, or is it derived from the requested capability ids?                                                                                                                                                  | A manifest section, because it is auditable before any request and cannot be re-read as authority. Deriving it from grants would couple a declaration to a grant the plugin may hold for other reasons.                   |
| `PPM-OQ-5` | Does a replacing surface restore on focus loss, or persist while hidden?                                                                                                                                                                    | Persist. Release on focus loss would turn an alt-tab into data churn and force every dashboard to re-open; the content record's rule 3 already says focus loss never releases.                                            |
| `PPM-OQ-6` | The shipped `bitty.panel.set_presentation` verb is gated on `panel.focus` and already lets a plugin request a placement change, while the content record states placement is panel and user authority. Which is the contract going forward? | Keep the verb as the placement request, add no new one, and amend whichever text is wrong in the accepting wave. Two authorities for one transition is the defect; this record does not resolve it.                       |
| `PPM-OQ-7` | Is `fullscreen` a panel presentation or a window-level state, and what does "full-window surface layer" mean with more than one window?                                                                                                     | A per-workspace maximized surface, not a window state, until a multi-window contract says otherwise. The multi-window scope decision is not extended here.                                                                |
| `PPM-OQ-8` | Where do the author guide, the user-facing mode matrix, and the manual page live, and which corpus owns them?                                                                                                                               | The plugin corpus owns the author guide; this corpus owns the mode matrix as specification text and links it; the manual owns the user-facing page.                                                                       |

## Acceptance and gates

Nothing in this record is implemented, and nothing here promotes a mechanism.
The shipped facts it composes are: the four `PresentationMode` variants with
only `Tiled` live, the four band edges, the `ui.mount` slot set, the
`ui.present` draw-only surface, the `ui.overlay.focus` capture, the
`bitty.panel.set_presentation` verb, and the `close_view` action. The things
that do not exist are: the `[presentation]` declaration, any panel content-kind
replacement, the displaced record and restore path, one-surface-per-panel
enforcement, the session state names, and any test that a hidden PTY survives a
replacing surface.

Promotion to **accepted** requires all of the following evidence:

1. **Owner decision on `PPM-OQ-1` through `PPM-OQ-8`**, each recorded with the
   document that will carry the change. An undecided row stays open rather than
   defaulting.
2. **One acceptance artifact, not four.** The mode matrix lands as an amendment
   to the presentation-modes section of the
   [Panel Runtime RFC](panel-runtime-rfc.md), or as a successor contract that
   the RFC links; the affected-contracts table below matches the edits made in
   the same wave.
3. **Content-kind prerequisite.** `panel` mode cannot be accepted before the
   [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)
   content-kind transition, displaced record, and restore path are accepted,
   because `panel` mode is that mechanism's lifecycle, not a second one.
4. **Capability decision, with security review.** If `panel` mode needs the
   candidate panel-content grant, the reviewer signs the new capability, the
   input-routing branch, and the rule that no other mode gains input authority.
   If the declaration is adopted as a manifest section, the reviewer confirms
   that it grants nothing by itself and that its absence is denial.
5. **Named tests before implementation, not after.** At minimum: zero resize
   calls and no `SIGWINCH` between open and restore; exactly one resize on a
   changed restore rectangle; state-hash, cursor, scrollback, and offset parity
   against a control pane that was never replaced; the child blocks at the
   existing bound with no byte loss and no plugin-visible buffer; keys never
   reach the PTY encoder while the surface is focused and do reach it after
   restore; `E_UI_PANEL_BUSY` and `E_UI_PANEL_NESTED` leave state unchanged;
   crash, disable, and reload restore within one tick with the right reason and
   no leaked surface; a declared `band` never replaces a panel and never
   displaces a PTY.
6. **Documentation deliverable.** The author guide, the user-facing mode
   matrix, and the manual page exist or are scheduled with owners, because the
   issue's deliverable is documentation and a contract without it is a
   maintainer-only artifact.
7. **No contradiction left standing.** `PPM-OQ-6` is resolved in text, so the
   corpus does not state two placement authorities at once.

## Affected contracts

| Contract                                                                                  | Effect                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                      | Gains the mode matrix and the session state names on acceptance; identity, lifecycle, `4+1`, and capability family unchanged |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                  | Unchanged; `PresentationMode` gating and one-surface-at-a-time are consumed, not amended                                     |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                    | Unchanged; the freeze and single restore resize are presentation rules over its resize path                                  |
| [Rich Presentation RFC](rich-presentation-rfc.md) (accepted)                              | Unchanged; `SCN-1..SCN-5` are consumed                                                                                       |
| [Chrome Band Contract](chrome-band-contract-candidate.md) (candidate)                     | Unchanged; `band` mode is its mounting path, and the bar keeps its model                                                     |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md) (candidate)               | Gains the statement that `band` mode is a chrome mount and never a panel replacement                                         |
| [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md) (candidate) | Unchanged text; this record adds no descriptor field and reuses its state and refusal vocabulary                             |
| [Panel Placement Decision](panel-placement-decision.md) (draft)                           | Unchanged; `floating` and `fullscreen` are placement rows it already owns                                                    |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) (draft)           | Unchanged; `PPM-OQ-2` cites its extension rule, and no fourth owner or tier is added                                         |
| [UI Motion and Budget](ui-motion-and-budget-candidate.md) (candidate)                     | Unchanged; a mode transition animates only after the state is committed, per its rule 3                                      |
| [Panel Generation Ownership Decision](panel-generation-ownership-decision.md) (draft)     | Unchanged; the placeholder vocabulary (`unloaded`, `denied`, `incompatible`) is reused for refusals                          |
| [Panel Restore Record Contract](panel-restore-record-contract-candidate.md) (candidate)   | Unchanged; presentation is not persisted, so the record's field list is untouched                                            |
| [Plugin manifest keys](../reference/configuration-options.md) (shipped reference)         | Would gain the `[presentation]` section on acceptance, on the same reject-manifest posture                                   |

## Security review

The record introduces one capability question and one input-routing rule, and
it adds no surface by itself. The threats below are the ones the design must
answer; the dispositions are candidate rules, not a completed review.

| Threat                               | Control                                                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| PTY or file surgery from Lua         | No mode, declaration field, or verb exposes a PTY, signal, path, command, URL, or environment value.                         |
| Reading a hidden terminal            | No read surface, snapshot, or stream; a presentation grant is not a terminal-read grant.                                     |
| Presentation mutating Terminal Truth | Mode and content kind are presentation state; the swap never resizes, writes, parses, clears, or replays terminal state.     |
| Input interception or keyboard trap  | Keys route only for the focused panel; Core owns the queue; the generic close always ends the session and cannot be vetoed.  |
| Ambiguous or ambient exit            | One action spelling, resolved by the keymap registry; no plugin chord, no OS-level shortcut, no session without an end path. |
| Pointer or window authority          | No coordinates, capture, drag, cursor, or window; pointer interaction stays a bounded command binding.                       |
| Adding a fourth overlay system       | Every mode resolves to one of the four owners; a fifth is out of scope by the reconciliation's extension rule.               |
| Silent capability growth             | Deny by default, manifest-hash-bound grants, no wildcard, no first-party bypass; a declaration alone grants nothing.         |
| Crash pinning a panel or a PTY       | Teardown-ordered release plus a per-tick orphan sweep; no plugin code on the restore path; restore is owner-first.           |
| Safe mode                            | A third-party plugin never loads, so no presentation session exists; no Core surface uses this mechanism.                    |

A security reviewer is required before acceptance if `panel` mode is accepted
with a new capability id, or if the declaration is adopted as a manifest
section, because both change what a manifest can cause the host to consider.

## P0 Review Sign-off

- Documentation review: pending.
- Security review: **required** for the capability and manifest-declaration
  questions above; not performed by this record.
- Implementation review: not applicable; no implementation is authorized.

## References

- [Panel GUI Content Presentation (Candidate)](panel-gui-content-presentation-candidate.md)
  — the content-kind transition, displaced record, and restore path that
  `panel` mode presents through.
- [Panel Placement Decision](panel-placement-decision.md) — `RFC-OQ-3`,
  placement identity, and the `View`/`Panel` split.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) —
  the three overlay owners, tier and kind composition, and single modal
  authority.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) — band
  geometry, reflow, per-edge stacking, and degradation.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  the chrome surface inventory and read-only rules.
- [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md) — the
  motion tree and the rule that content is committed before motion.
- [Panel Generation Ownership Decision](panel-generation-ownership-decision.md)
  — generation ownership, placeholder reasons, and the container lifespan.
- [Panel Restore Record Contract (Candidate)](panel-restore-record-contract-candidate.md)
  — what a restored session persists, and why presentation is not in it.
- [Drawer Presentation Mode Decision](drawer-presentation-mode-decision.md) —
  the accepted four-variant disposition and the float mechanism table.
- [Panel Runtime RFC](panel-runtime-rfc.md) — panel identity, lifecycle, mode
  as a runtime property, the `4+1` envelope, and the command registry.
- [Workspace Compositor Specification](workspace-compositor.md) —
  `PresentationMode` gating, `OverlayTier`, and Core-owned decoration.
- [Terminal State RFC](terminal-state-rfc.md) — Terminal Truth and the resize
  path.
- [Rich Presentation RFC](rich-presentation-rfc.md) — `SCN-1..SCN-5`.
- [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md) —
  per-slot host behavior and the grant each slot requires.
- [Plugin manifest keys](../reference/configuration-options.md) — the shipped
  capability families, keymap actions, and their defaults.
- [Panel Vision](../product/panel-vision.md) — product direction only; a mode a
  panel owns is vision, not shipped behavior, and nothing here is claimed on
  its authority.
- [bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388) — the owner
  design request this candidate answers.
