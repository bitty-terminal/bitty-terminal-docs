---
title: Drawer Presentation Mode Decision
description: Accepted decision record for bitty#2042 keeping the four PresentationMode variants for 0.1.0 and mapping the slide-over drawer need onto Scratchpad and Floating with the deferred gaps named
category: specifications
audience: maintainer
document_type: register
status: accepted
website_publish: true
sidebar_order: 80
---

# Drawer Presentation Mode Decision

## Purpose

This register answers [bitty#2042](https://github.com/bitty-terminal/bitty/issues/2042):
whether 0.1.0 needs a Drawer (a slide-over, edge-docked panel) as a fifth
presentation mode, and if not, which existing mechanism covers each user need.
It records one disposition, the comparison that supports it, the residual gaps
that remain, and the admission path a future drawer proposal must satisfy.

In scope: the drawer-versus-Scratchpad-versus-Floating comparison for 0.1.0;
the identity, lifecycle, focus, input, and ownership questions a drawer would
raise; the affected contracts and integration surfaces. Out of scope and owned
elsewhere: implementation of any presentation mode; plugin policy for when a
docked surface appears; the content contract for panel-hosted GUI surfaces
([Panel GUI Content Presentation (Candidate)](panel-gui-content-presentation-candidate.md));
the future
[Workspace Scene RFC](ui-convergence-roadmap.md#the-five-successor-rfcs)
content; and slide-animation implementation.

This record authorizes no code, adds no mode, closes no open question, and
weakens no normative security control. It records an owner decision; a future
drawer remains a candidate until an accepted presentation-mode artifact admits
it.

## Decision owner

| Field               | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Decision owner      | Bitty product owner (`Xuepoo`), who recorded the deferral on the issue on 2026-10-21                                                  |
| Integration owner   | bitty-core commander (terminal platform)                                                                                              |
| Documentation owner | `bitty-terminal-docs`                                                                                                                 |
| Decision date       | 2026-10-24                                                                                                                            |
| Issue               | [bitty#2042](https://github.com/bitty-terminal/bitty/issues/2042)                                                                     |
| Task                | `CTX-0147` (documentation)                                                                                                            |
| Authority           | Owner decision, recorded here as the canonical disposition; no open question is closed and no accepted contract text is amended by it |

## Decision

**No Drawer mode is added in 0.1.0. `PresentationMode` keeps its four variants
(`Tiled`, `Floating`, `Fullscreen`, `Scratchpad`).** The 0.1.0 user needs that
motivate a drawer are covered by composing Scratchpad and Floating; the
slide-over gaps that composition does not close are named in
[Remaining gaps](#remaining-gaps) and deferred. Issue #2042 closes as
"decision recorded, no new mode", and no implementation issue is created.

"No new mode" is a scope decision, not a claim that a drawer and a scratchpad
are the same surface. Scratchpad covers global summon and dismiss; Floating
covers a layout-preserving overlay; neither alone reproduces a globally
summoned, edge-docked, focus-returning strip. That combination has no 0.1.0
consumer and no demand evidence, so it stays unimplemented and recorded rather
than half-built.

## What a user needs from a slide-over surface

The comparison uses one baseline definition so "drawer" is not an unstated
wish. A drawer would be:

- an edge-docked strip (full-height side or full-width bottom) with a bounded
  share of the window and validated resize bounds;
- painted above the tiling without changing tiled solver output while open;
- summoned and dismissed by one command or binding, without requiring the
  pointer;
- focused on show, with input routed to it, and dismissed back to the focus
  that was active before it appeared;
- owned by a stated scope (one window or one workspace), with defined behavior
  across workspace switches, workspace close, and process exit;
- animated only on the present layer, within the accepted motion budget and
  reduced-motion and safe-mode rules.

## Existing mechanisms

The current corpus and implementation expose four related mechanisms. The
names are distinct and must not be conflated:

| Mechanism               | Storage and scope                                                         | Show behavior                                                                                              | Dismiss behavior                                                                                  |
| ----------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Scratchpad              | Single hidden slot per window; one parked leaf outside the layout tree    | Restores beside the recorded anchor as a `0.5` horizontal split, stamps `Tiled`, focuses the restored leaf | Parks the target leaf, stamps `Scratchpad`, collapses its layout slot, moves focus to a survivor  |
| Floating (in-tree mode) | Leaf stays in the `LayoutTree`; the solver ignores `PresentationMode`     | Paints at a centered ~80% frame above the base; the tiled allocation is unchanged                          | No show/hide state of its own; mode changes only                                                  |
| Detached float          | Workspace-local float store; the leaf leaves the tree and siblings refill | `floating-toggle` detaches the focused leaf and paints it over the workspace                               | Toggling restores it as a fresh balanced split and focuses it; the original slot is not recreated |
| Pinned float            | Window-global pin store; one entry per pinned leaf                        | Presents over the active workspace, including after a workspace switch                                     | Unpinning restores beside the recorded anchor, still `Floating`, and focuses it                   |

Two details matter for the comparison. First, the Scratchpad slot is
window-global and its toggle ignores the target while occupied, so one binding
summons and dismisses the same content from any focus. Second, the shipped
`floating-toggle` is focus-scoped: it detaches the focused leaf, so it is not a
global summon for a surface that is already hidden. The in-tree Floating stamp
preserves the tiled allocation, but no shipped one-binding path combines that
preservation with global recall.

Read-only implementation evidence (`bitty` `origin/main` `15006647`,
2026-10-24):

- `crates/bitty-ui/src/presentation.rs`: the four variants, strict
  `parse`/`as_str`, the transition gate, `overlay_tier`, and the centered
  `float_frame` helper.
- `crates/bitty-ui/src/scratchpad.rs`: the single window slot, anchor capture,
  `remove_leaf`/`insert_beside` restore, and the `Scratchpad`/`Tiled` stamps.
- `crates/bitty-ui/src/floated.rs` and `crates/bitty-ui/src/pinned.rs`: the
  workspace-local detached store and the window-global pin store.
- `crates/bitty-runtime/src/runtime/workspaces.rs`: `scratchpad_hide`/`_show`/
  `_toggle`, `float_detach`/`_restore`, `toggle_floating`, `pin_floating`/
  `unpin_floating`, focus re-homing, the last-leaf guard, and the conditional
  primary-shell hand-back.
- `crates/bitty-terminal/src/chrome_keys.rs`: the `ToggleFloating` and
  `TogglePinned` actions, the core-owned scratchpad command path, and the
  fail-closed mode checks.
- `crates/bitty-config/src/panel_rules.rs`: the closed `tiled|floating|scratchpad`
  presentation set for spawn rules.
- `crates/bitty-lua/src/host.rs`: `panel.get_presentation`/`set_presentation`
  strings, `toggle_floating`, and `set_pinned`.
- `crates/bitty-terminal/src/ctl/apply.rs`: `panel list` covers live layout
  leaves and reports the presentation string as `role`; parked and pinned
  leaves are excluded.
- `crates/bitty-terminal/src/storage_backends.rs`: session mode persistence for
  all four variants.

## Comparison

The rows separate what a user wants from which mechanism supplies it today.
"Floating (mode)" means the in-tree stamp; "Detached float" means the
`floating-toggle` path.

| User need                                      | Drawer (hypothetical) | Scratchpad                                | Floating (mode)                   | Detached float                                                  |
| ---------------------------------------------- | --------------------- | ----------------------------------------- | --------------------------------- | --------------------------------------------------------------- |
| Summon with one binding from any focus         | Yes, global toggle    | Yes; the occupied slot ignores the target | No; requires targeting the leaf   | No; toggles the focused leaf                                    |
| Dismiss with the same binding                  | Yes                   | Yes                                       | Not applicable                    | Yes while the float is focused; otherwise detaches another leaf |
| Dismiss with bare `Esc`                        | Yes                   | No                                        | No                                | No                                                              |
| Keep tiled layout unchanged while visible      | Yes                   | No; show and hide reflow the tree         | Yes; the allocation is retained   | No; the slot collapses and siblings refill                      |
| Edge-docked geometry                           | Yes                   | No; restores as a tiled split             | No; centered ~80%                 | No; centered ~80% with cascade                                  |
| Preserve content identity and pane session     | Yes                   | Yes                                       | Yes                               | Yes                                                             |
| Focus moves in on show                         | Yes                   | Yes, to the restored leaf                 | No; the stamp does not move focus | No on detach; yes on restore                                    |
| Focus returns to the pre-show owner on dismiss | Yes                   | No; focus moves to a survivor             | Not applicable                    | No; focus stays with the survivor or the restored float         |
| Workspace scope                                | Must be decided       | Window-global slot                        | Workspace-local leaf              | Workspace-local store                                           |
| Survives a workspace switch                    | Must be decided       | Yes                                       | No; stays with its workspace      | No                                                              |

Pinned floats add one more data point: they survive workspace switches and
present above the active scene, but they are centered sticky floats, not
edge-docked strips, and their default binding is manual. They therefore do not
cover the drawer's geometry need either.

## Remaining gaps

These gaps are real, recorded, and not 0.1.0 blockers. None requires
implementation before 0.1.0 because no 0.1.0 workflow or consumer depends on
it.

| Gap | Description                                                                                                                                                  | Why the existing mechanisms do not close it                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Edge-docked geometry: side or bottom edge, bounded share, resize, clamp, and minimum size                                                                    | Floating and pinned use centered ~80% frames; Scratchpad restores a tiled split; no edge anchor exists                         |
| G2  | Layout preservation on the summon path: tiled solver output byte-identical while the surface is open                                                         | The in-tree Floating stamp preserves the allocation, but has no global summon; Scratchpad and detached float reflow the tree   |
| G3  | Global summon plus layout preservation in one binding                                                                                                        | Scratchpad is global but reflows; Floating preserves but is focus-scoped                                                       |
| G4  | Focus return: restore the pre-show focus owner on dismiss                                                                                                    | Scratchpad and float paths move focus to a survivor or to the restored leaf; no pre-show focus is recorded                     |
| G5  | Quick dismiss with `Esc`                                                                                                                                     | Bare `Esc` is terminal input; dismissing a non-modal focusable terminal surface with it would require an explicit capture rule |
| G6  | Input and visibility model while open: routing, hit-test order, modal versus non-modal, IME and pointer behavior                                             | Routing is focus-only; the single modal authority belongs to panel overlays; a drawer must not become a fourth overlay owner   |
| G7  | Scope and capacity: per window or per workspace, cross-workspace behavior, workspace close, one drawer or many                                               | Scratchpad and pinned are window-global; the detached float is workspace-local; no shared policy exists                        |
| G8  | Integration surfaces: mode variant, `ChromeAction`, keymap default, `ctl` role or verb, Lua strings, panel-rule spelling, session encoding and compatibility | None exist for a drawer; adding them touches UI, runtime, config, Lua, session, and `ctl` together                             |
| G9  | Motion: slide bounds, reduced motion, safe-mode collapse, present-layer-only work                                                                            | No docked-surface slide policy exists; the quake precedent defers slide-in policy rather than defining Core motion             |

## Rationale

1. **The scoped needs are already served by a composition.** Global recall and
   dismiss come from Scratchpad; a layout-preserving overlay comes from the
   in-tree Floating stamp; workspace-global visibility comes from pinned
   floats; temporary full attention comes from Fullscreen. A 0.1.0 user does
   not need one surface that does all of them at once.
2. **A drawer is a new presentation authority, not a parameter.** It changes
   geometry, focus, input capture, persistence, and workspace ownership
   together. The cost is spread across exhaustive mode matches and every
   consumer surface, while the benefit is an edge position that no 0.1.0
   workflow requires.
3. **Extending Scratchpad is the wrong repair.** The accepted Scratchpad
   contract stores a leaf out of tree, stamps `Scratchpad` on hide, stamps
   `Tiled` on show, and restores beside its anchor. Making show an overlay
   would break that round trip, its order and mode tests, session truth, and
   the user expectation that a scratchpad returns to tiling.
4. **Changing `floating-toggle` is also a contract change.** Its detach and
   fresh-split restore behavior is deliberate: it collapses the vacated slot,
   lets siblings refill, and forgets the original position. The in-tree
   Floating stamp already offers layout preservation without changing that
   toggle.
5. **Bare `Esc` cannot be claimed casually.** In a terminal, `Esc` is ordinary
   shell and editor input. A non-modal drawer that consumes it would need a
   capture rule and a visible ownership signal; a modal drawer would contradict
   the glance-while-working purpose. The toggle binding is the honest dismiss
   path today.
6. **Mechanism and policy stay split.** Core would own mode, geometry, focus,
   input, and persistence; a plugin may own when a docked surface appears and
   which edge it prefers. A plugin-only drawer would still need Core geometry
   and input routing, so it is not a cheaper alternative.
7. **Absence of demand defers rather than refuses.** The quake decision set the
   same precedent for slide-in presentation policy: no Core work without a
   consumer. A future drawer is admitted by evidence, not by reserving a mode
   name now.

## Alternatives considered

| Alternative                                                | Trade-off                                                                                                                | Disposition                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| No new mode; compose Scratchpad and Floating (this record) | Zero implementation cost, preserves all accepted contracts; leaves the combined drawer behavior unimplemented            | Adopted                                                                                        |
| Add `PresentationMode::Drawer` in 0.1.0                    | Would close G1-G9 together, but adds a fifth mode and every integration surface for no 0.1.0 consumer                    | Deferred; requires demand evidence and an accepted presentation-mode artifact                  |
| Extend Scratchpad so show becomes an overlay               | Superficially small diff, but breaks the CW-10 hide/show contract, round-trip tests, session truth, and user expectation | Rejected                                                                                       |
| Change `floating-toggle` to preserve the layout on restore | Would improve restore fidelity, but changes accepted detach/restore semantics and focus behavior                         | Rejected for 0.1.0; the in-tree Floating stamp already covers preservation                     |
| Extend `pinned` with edge docking                          | Reuses a window-global sticky surface, but `pinned` currently means a centered sticky float with a manual binding        | Deferred; the edge-anchor question belongs to the Workspace Scene RFC                          |
| Implement the drawer as a plugin over existing primitives  | Keeps Core small in appearance, but a plugin cannot own Core geometry, focus, input routing, or session encoding         | Rejected as a mode substitute; plugin policy over Core mechanisms remains the admissible split |
| Refuse a drawer permanently                                | Simple and final, but absence of demand is not evidence that the behavior is unwanted                                    | Rejected; defer instead of refuse                                                              |

## Affected contracts

This decision changes no contract text. The table records what remains
authoritative and what a future drawer would have to amend.

| Contract                          | Current state                                                                                                                                 | Effect of this decision                   | Required if a drawer is ever admitted                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `PresentationMode` / PanelRuntime | Four variants; strict parse and display; one transition gate; mode is a runtime property; `RFC-OQ-9` still owns mode grouping and persistence | Unchanged; no fifth variant, no new gate  | New variant or an accepted variant policy; parse/display round trip; session compatibility |
| Scratchpad (CW-10)                | Single window-global slot; hide stamps `Scratchpad` and parks out of tree; show stamps `Tiled` and restores beside the anchor                 | Unchanged; not repurposed as a drawer     | Nothing, unless the drawer claims the same slot (it should not)                            |
| Floating                          | In-tree `Floating` stamp keeps the allocation; `floating-toggle` detaches into a workspace-local store and restores by fresh split            | Unchanged; no geometry or focus change    | An explicit answer for whether a drawer is a new mode or a float/pin variant               |
| Pinned float                      | Window-global store; centered sticky float with cascade; manual binding                                                                       | Unchanged                                 | An edge-anchor decision if pinned is chosen as the host                                    |
| Keymap / `ChromeAction`           | `toggle_floating` default `alt+a`; `toggle_pinned` manual; scratchpad through `command:bitty.workspace:scratchpad-toggle`                     | Unchanged; no new action or default chord | Action, accepted default or explicit no-default decision, and conflict diagnostics         |
| `ctl`                             | `panel list` lists live layout leaves and reports the presentation string as `role`; parked and pinned leaves are excluded                    | Unchanged; no new verb or role            | Role/visibility rule for a drawer leaf and, if exposed, a bounded mutation verb            |
| Lua panel API                     | `panel.get_presentation`/`set_presentation` accept four strings; `toggle_floating`; `set_pinned`                                              | Unchanged; no new string                  | New string only after the mode is accepted; capability behavior stays deny-by-default      |
| Panel rules                       | `panel_rules[].presentation` is the closed set `tiled`, `floating`, `scratchpad`; `fullscreen` is rejected                                    | Unchanged; no drawer spelling             | Rule spelling and precedence, with fail-closed validation                                  |
| Session persistence               | Presentation mode is session truth; all four variants round-trip                                                                              | Unchanged; no new variant or migration    | Encoding, compatibility, and restore behavior for a new mode                               |
| Overlay ownership                 | Three owners: geometry, stacking/modal authority, requested mode; one modal authority per window                                              | Unchanged; no fourth overlay system       | A non-modal focusable surface that does not duplicate the modal authority                  |
| Panel vision and UI convergence   | Seven candidate modes, no drawer; the Workspace Scene RFC owns presentation modes                                                             | Unchanged; no new candidate row           | Admission through the Workspace Scene RFC or an accepted Panel RFC amendment               |

## Admission criteria for a future drawer

A future proposal must be a new tracked issue and must satisfy all of the
following before implementation starts:

1. **Demand evidence.** Name the recurring user workflow or consumer that the
   existing composition cannot serve, with acceptance evidence rather than a
   preference.
2. **Owner and artifact.** The Workspace Scene RFC, or an accepted Panel RFC
   amendment while that RFC does not exist, states the mode, its spelling, and
   its placement in the mode taxonomy.
3. **Identity and lifecycle.** State whether the drawer is a mode of an
   existing `View`/Panel or a new container, whether it survives workspace
   switches and workspace close, and how it interacts with Scratchpad and
   pinned floats.
4. **Geometry.** Define edge, share, minimum and maximum size, resize and clamp
   behavior, and prove tiled solver output is byte-identical while the drawer
   is open.
5. **Focus and input.** Define focus-in on show, return to the pre-show owner
   on dismiss, input routing, hit-test order, modal versus non-modal behavior,
   and how `Esc` is captured without stealing ordinary terminal input.
6. **Capacity and failure.** Define one-drawer or many, per-window or
   per-workspace ownership, and fail-closed behavior for occupied, vacant,
   stale, and last-leaf cases.
7. **Integration.** Cover the mode variant, `ChromeAction`, keymap default or
   explicit no-default, `ctl` role/verb, Lua strings, panel-rule spelling, and
   session round-trip and compatibility.
8. **Motion and budget.** Bound the slide, respect reduced motion, collapse to
   the final state in safe mode, and keep work off the PTY and damage hot
   paths.
9. **Security review.** Confirm no new capability, no ambient authority, no
   input interception beyond the accepted focus or modal authority, and no
   fourth overlay owner.
10. **Documentation sync.** Update the panel vision, Panel Runtime RFC,
    compositor, keymap, `ctl`, and configuration references in the same
    delivery.

## Security review

This decision adds no capability, grants no authority, and changes no trust
boundary. It introduces no input capture, no new render path, no timer, and no
plugin-visible surface. It deliberately keeps the single modal authority and
the three existing overlay owners intact; a drawer would have to fit those
owners rather than add a fourth.

If a drawer is admitted later, the security review must confirm bounded
geometry and capacity, explicit `Esc` capture ownership, no forwarding of keys
to a hidden PTY, no new capability dimension, and no hot-path work. The
terminal-input rule is the load-bearing one: a focusable surface that consumes
bare `Esc` changes what a shell or editor receives, so it needs an explicit
decision rather than an implementation convenience.

## Verification plan

1. `just check` passes with zero formatting, markdownlint, link, metadata,
   language, agent, hygiene, SVG, and actionlint findings.
2. The [Specifications index](README.md) lists this register as accepted.
3. No source change is made: `PresentationMode` still has four variants, and no
   keymap, `ChromeAction`, `ctl`, Lua, panel-rule, or session surface changes.
4. The related candidate note that deferred the drawer question points at this
   record, so the corpus has one authoritative disposition.
5. Issue #2042 is closed with a link to this record, the v0.1.0 milestone is
   removed, and no implementation issue is created.

## Acceptance criteria

- The 0.1.0 decision is explicit: no Drawer mode, four variants unchanged.
- The comparison covers global summon, layout preservation, quick dismiss,
  focus and return semantics, and workspace ownership.
- The residual gaps are named and are not presented as implemented behavior.
- Affected contracts are enumerated, including `PanelRuntime`,
  `PresentationMode`, keymap and `ChromeAction`, `ctl`, Lua, panel rules,
  session persistence, and overlay ownership.
- No implementation issue is created because no 0.1.0 gap requires one.
- The record is English-only, self-contained, free of host paths, and merged
  through the documentation gates.

## Open points

- What counts as sufficient demand to reopen the drawer question: a repeated
  user workflow, a first-party plugin consumer, or a dogfood gap. This record
  names no threshold.
- Whether an edge-docked surface is a new mode or a `pinned`/`floating` variant
  is left to the Workspace Scene RFC.
- Whether a drawer is window-global or workspace-local is left open; the two
  existing scopes disagree by design.
- The `Esc` capture rule and its interaction with terminal input, IME, and
  panel-modal overlays is left open.
- Slide duration, easing, reduced-motion behavior, and safe-mode collapse are
  left to the motion contract if a drawer is ever admitted.

## P0 Review Sign-off

Not required for this record: it changes no security boundary, capability,
resource ceiling, trust decision, or accepted P0 control. It adds no input
capture and no overlay authority. Independent security review becomes required
if a future revision admits a drawer, because that revision would decide `Esc`
capture and focus ownership.

## References

- [bitty#2042](https://github.com/bitty-terminal/bitty/issues/2042) — the
  drawer question, its investigation, and the owner deferral this record
  formalizes.
- [Panel Runtime RFC](panel-runtime-rfc.md) — the accepted presentation-mode
  contract, mode-as-runtime-property rule, and `RFC-OQ-9`.
- [Workspace Compositor Specification](workspace-compositor.md) — the
  `Workspace -> LayoutTree -> View` hierarchy, scratchpad interaction
  semantics, and solver invariants.
- [Panel Extensibility Vision](../product/panel-vision.md) — the candidate
  seven-mode taxonomy, which contains no drawer.
- [Overlay Ownership and Composition Reconciliation](overlay-ownership-reconciliation.md)
  — the three overlay owners and the single modal authority.
- [UI Convergence Roadmap](ui-convergence-roadmap.md) — the Workspace Scene RFC
  that owns future presentation-mode admission.
- [Panel GUI Content Presentation (Candidate)](panel-gui-content-presentation-candidate.md)
  — the panel content contract that is unaffected by drawer placement.
- [Legacy Chrome and Validation Disposition](legacy-chrome-and-validation-disposition.md)
  — the retained Core scratchpad slot and presentation-state mechanism.
- [ADR 0014 - Workspace as Core Mechanism with Plugin-Only Presentation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  — the accepted mechanism/policy split this decision composes with.
- [Quake Hotkey Scope Decision](quake-scope-decision.md) — the precedent that
  defers slide-in presentation policy to plugin policy over Core mechanisms.
- [Configuration options](../reference/configuration-options.md) — the shipped
  `floating-toggle`, scratchpad command, and pin binding behavior.
- [Documentation workflow](../docs/development/documentation-workflow.md) —
  metadata, status, and review rules.
