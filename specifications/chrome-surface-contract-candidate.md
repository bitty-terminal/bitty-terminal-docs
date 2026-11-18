---
title: Chrome Surface Contract (Candidate)
description: Candidate contract for the window chrome surfaces Bar rail tab strip notification area and command surface their ownership read-only rules and chrome slot admission
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 42
---

# Chrome Surface Contract (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record states the chrome-surface
> contract the candidate
> [Workspace-Native UI Runtime](ui-runtime-candidate.md) assumes (U-4) and the
> owner-pending Window Chrome RFC (U-9, item 5) would own. It authorizes no
> shipped behavior, weakens no accepted source it cites, and makes no
> implementation claim; every type name, key spelling, and slot name below is a
> candidate spelling.

## Purpose and scope

The compositor defines where panel content is tiled. Chrome is everything the
window draws that is not tiled panel content: the Bar (the StatusBar of the
draft [Status System Specification](status-system.md)), the WorkspaceRail, the
tab strip, the notification area, the command surface, and the overlay root.
Those surfaces exist today as separate directions — the Bar in a draft
specification, the rail and tab strip in candidate PW items, the overlay root in
the accepted Panel Runtime contract — and no single document states what they
share and what they must never do.

In scope: the chrome surface inventory, their common read-only rules, the
authority split between Core, user, and plugin, chrome-slot admission, the
relationship between the Bar and the rail, and the chrome-side consumption of
overlay tiers.

Out of scope and owned elsewhere: the Bar's module budget and metrics (draft
Status System); PW-4 Bar configurability and PW-8 drag-to-Bar semantics
(candidate, [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md));
overlay tier composition (draft,
[Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md));
presentation-mode gating (accepted, [Workspace Compositor](workspace-compositor.md));
appearance keys (accepted,
[Lua and XDG configuration](../configuration/lua-and-xdg.md#appearance-knobs-supported-reference));
plugin chrome-slot grants (accepted v1 surface,
[Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), invariant 7 (bounded inputs).
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): panel identity,
  focus routing, the `4+1` overlay envelope, and the rule that chrome reads
  identity and declarative state and never mutates grid.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  the hierarchy, `gaps_out` insetting the tiling area, Core-owned decoration,
  and the no-window-leak rule.
- [Status System Specification](status-system.md) (draft): the single
  bottom-anchored Bar, the closed set of built-in module identifiers, the
  bounded per-module text, icon, and tooltip lengths, the capped total bar
  segment count, and the module cadence and failure posture.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the closed v1 slot set (`terminal | top | bottom | left | right |
tabline | overlay`), the exclusive tabline declaration, and the `SceneNode`
  subset (`Text | Row | Column | List`).

## Terminology

| Term                | Meaning in this document                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome surface      | A non-tiled host surface owned by Core (edge band, tab claim, notification, command, overlay root) that plugins present into.         |
| Chrome slot         | A bounded region of a chrome surface into which a declarative subtree may be mounted under a capability grant.                        |
| Read-only rule      | Chrome reads identity, title, focus, and order and renders declarative segments; it never mutates grid, cursor, modes, or scrollback. |
| Core-owned geometry | Chrome placement, thickness, and the decoration insets that follow from it; never set by a plugin or `LayoutProvider`.                |
| Chrome authority    | Window and shell chrome are Core plus user final, with plugin requests only; panel content is plugin-controlled within budget.        |

## Chrome surface inventory

Core owns host mechanisms; named bars are plugin presentations on them, per the
draft [Chrome Surface API](chrome-surface-api-candidate.md). With no plugin
enabled, no presentation below is drawn. The ownership split
is accepted by [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md).

| Core host surface      | Owns (mechanism only)                                                                   | Status of its contract                                       |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Edge surfaces (bands)  | Band reservation for mounted trees, per-edge stacking, budgeted render, shared hit-test | Candidate (Chrome Band Contract, Chrome Surface API)         |
| Tab strip claim        | Exclusive `tabline` claim reserved for panel projections                                | Candidate (PW-10)                                            |
| Notification primitive | Transient notifications and banners on the `Messages` tier                              | Candidate; consumes the accepted overlay envelope            |
| Command surface        | Command Registry entry on the `Palette` kind                                            | Candidate; consumes the accepted overlay envelope            |
| Overlay root           | The composition point where overlay layers attach                                       | Accepted behavior (Panel Runtime `4+1`); naming is candidate |

| Plugin presentation | Composes                                                             | Status of its contract                              |
| ------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| Bar / StatusBar     | Module segments, a workspace indicator via workspace L1 data         | Draft (Status System); PW-4 extends to any edge     |
| WorkspaceRail       | Workspace list, active-workspace indication, `+` creation command    | Candidate (PW-8 drop target; U-4 direction)         |
| Tab strip content   | Panel projections for one `Window`/`Workspace`: order, active, close | Candidate (PW-10)                                   |
| Palette             | Command palette and query UI on the command surface                  | Independent first-party package; contract candidate |

## Rules

1. **Chrome is presentation, never Terminal Truth.** No chrome surface mutates
   grid, cursor, modes, scrollback, attachment, or IPC policy. This is the
   accepted invariant restated for the full chrome inventory.
2. **Chrome geometry is Core-owned.** Placement, thickness, and the resulting
   `gaps_out` inset are decided by Core; an edge change recomputes the Workspace
   tiling area before the next present. Rendering chrome never resizes a PTY as
   a side effect: a chrome geometry change is a layout input whose normal
   reflow drives any PTY resize through the ordinary resize path, as defined by
   the candidate [Chrome Band Contract](chrome-band-contract-candidate.md).
3. **Chrome reads identity, not content.** A chrome surface may read
   `PanelId`, title, focus, and presentation order. It may not read terminal
   grid contents, scrollback, or another panel's buffer except through the
   bounded Event Bus or snapshot path.
4. **Chrome authority split.** Window and shell chrome are Core plus user
   final, with plugin requests only; panel chrome is Core or user final, with
   plugin requests; panel content is plugin-controlled within the host budget.
   A plugin never takes authority from the user or the safety policy.
5. **Chrome slots are admitted, bounded, and closed.** v1 admits the closed slot
   set of the accepted Lua Surface RFC. The tabline slot is an exclusive
   declaration (one declarant). A host may reject an admitted slot it does not
   present; rejection is fail-closed at `ui.mount` with `E_UI_UNAVAILABLE`,
   never a stored-but-unpainted mount. No slot admits arbitrary rendering,
   native handles, or global coordinates.
6. **No chrome surface is a focus target.** Focus belongs to a panel, a view, or
   an overlay; a chrome surface may show the focused item but never receives
   keyboard or IME input itself. A pointer interaction on chrome routes through
   the command registry as a validated update.
7. **Chrome never enters the hot path.** No chrome segment is recomputed per
   keystroke or per PTY read; segments update on their own cadence and
   invalidation, and a revision or an active animation is the only wakeup
   source.
8. **Chrome composes with the overlay envelope.** Notifications use the
   `Messages` tier, the command surface uses `Palette`, and the overlay root
   never acquires its own modal gate; the single modal authority of the
   [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)
   applies unchanged.
9. **Chrome animation composes with the accepted animation contract.**
   Durations stay in `0..=500` ms with the closed easing set; reduced motion and
   `bitty --safe` collapse to the final committed state.
10. **The Bar and the rail are two presentations, not one.** Both are plugin
    compositions on edge surfaces: the rail projects workspaces; the Bar
    projects status modules and may include the active-workspace indicator.
    Whether a rail plugin replaces or composes beside a bar plugin remains
    open (U-4); sharing configuration keys does not merge the contracts.

## Slot envelopes and fragment composition (candidate, CTX-0429)

The per-slot envelopes and fragment rules below are candidate, except where
a shipped or accepted basis is cited. They consolidate the `bitty` CTX-0429
design record (issue #688) so the candidate text has one canonical home;
`OQ-056` owns which dimensions get contracts and in which API version, and
`OQ-082` owns streaming. Host support is asymmetric in the `bitty` build at
`bitty@da63e42e`: `top`/`bottom` bands and the `overlay` host are implemented,
`terminal` is served by the Core terminal-attached scene host (`bitty.ui.mount`
reads the v2 rich vocabulary and attaches a `Scene` to the focused leaf,
`bitty` #2799, CTX-1641). `left` and `right` are served by the column band host
on the same four-edge geometry (see
[Landed surface of the vertical bands](#landed-surface-of-the-vertical-bands-verified-2026-11-16-at-a8abf31c));
`tabline` still has no host and fails closed at mount. The envelopes below
remain candidate. _Corrected 2026-11-16 at `bitty@a8abf31c`: this paragraph
said `left`, `right`, and `tabline` all had no host and failed closed. The
vertical band host landed in `bitty#3167` (`1994f6e6`) with input routing in
`bitty#3172` (`76485e80`), and `ui.state` reporting for a painted column band
in `bitty#3181` (`a8abf31c`); the `tabline` half of the sentence still holds._

| Slot                                 | Envelope                                                                                                                                                                                                                                                                             | Conflict resolution                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `top`, `bottom`                      | Scene bounds only (bridge depth 16, `UI_MAX_DEPTH`, deliberately stricter than the accepted `SCN-2 = 32`); no plugin-set geometry; band is painted while a surface is mounted                                                                                                        | Host layout owns placement and decoration; geometry conflicts are impossible by construction                                                                                                           |
| `left`, `right`                      | Column band: the mount is admitted, the block is stored, the granted columns are reserved out of the layout container, and the band paints and routes input. A `Column`/`List` root stacks one content row per direct child, `Text` is one row, and a `Row` root is refused at mount | Core owns the granted column range, so two column bands never overlap and a band is clipped to its share; a `Row` root fails closed with the typed `E_UI_COMPONENT_INVALID` before any block is stored |
| `terminal`                           | Core scene host: one attached `Scene` on the focused leaf, bounded by `SCN-1..5` and composited inside the leaf content rect; the grid path stays authoritative                                                                                                                      | A second plugin generation cannot displace an attached scene (`E_UI_UNAVAILABLE`); suspend, dispose, and reload release the scene, the bind, and the Core panel                                        |
| `overlay`                            | Shipped: text truncated at char boundary to 128; at most 4 non-modal plus 1 modal per window (`4+1`)                                                                                                                                                                                 | Shipped fail-closed typed errors (`OverlayBusy`, `TooManyOverlays`); no silent eviction, no last-wins replacement                                                                                      |
| `tabline`                            | Shipped claim semantics: the canonical workspace claim is `workspaceline`; `tabline` survives only as a deprecated alias (removal at or after v0.2.0)                                                                                                                                | A second claimant is rejected fail-closed with a diagnostic; the incumbent keeps the slot; a `tabline` mount itself fails closed with `E_UI_UNAVAILABLE`                                               |
| `palette` (effective, via `overlay`) | Candidate (formerly shipped; now in the Lua `palette` plugin): per-panel command bound 32, query and entry text within the 128-char overlay bound, duplicates rejected; at most one effective picker per invocation                                                                  | A second concurrent picker invocation is rejected or queued behind the active one; overlay exhaustion still fails closed per the `4+1` rule                                                            |

`statusline` is not a v1 slot in the current Core build: it was removed as a
breaking change in CTX-1140 (`bitty#1962`) and the name now fails as an unknown
slot with `E_UI_COMPONENT_INVALID`. The former status-fragment envelope belongs
to the separate `statusline` plugin, which composes on the `bottom` band (bar
replacement); it creates no slot of its own.

Fragment composition (candidate): one mount per fragment; render order is
ascending mount sequence (`update` preserves position, remount appends at
the tail); separators and decoration are host-owned; overflow truncates
from the tail at fragment boundaries; failure is isolated per fragment
(one misbehaving contributor never blanks the bar); fragments update on
committed-state observations only, never on hot-path signals; continuous
high-frequency updates are excluded (`OQ-082` stays open); mounted fragments
never claim focus, never receive input routing, and never graduate into
panels (accepted `LUA-OQ-11` boundary restated).

A future `StatusProvider` compiles to one `bottom`-slot mount per fragment
under the rules above; a `left` / `center` / `right` vocabulary, if ever
adopted, describes host-owned intra-bar regions, never additional mount
slots. The provider interface name, version, metadata, and filtering protocol
stay open behind a capability-gated host surface when defined.

## Landed surface of the vertical bands (verified 2026-11-16 at `a8abf31c`)

`left` and `right` are hosted column bands. This section records the reading so
the envelopes above are not re-derived from the historical pin they quote.

> Correction: the slot table above said `left` and `right` are "not hosted: this
> Core build has no vertical band host, so no vertical band geometry is
> reserved" and that a mount "fails closed with the typed runtime error
> `E_UI_UNAVAILABLE`". That was accurate for the pin the sentence named. The
> vertical band host landed in `bitty#3167` (`1994f6e6`), its input routing in
> `bitty#3172` (`76485e80`), and `ui.state` reporting for a painted column band
> in `bitty#3181` (`a8abf31c`). The superseded row is replaced, not deleted, and
> the record's candidate status is unchanged.

- **All four edges are band edges, on two axes.** `BandEdge` enumerates `Top`,
  `Bottom`, `Left`, and `Right`, and `BAND_EDGES` holds all four in
  construction order; `BandEdge::axis` maps the first two to `BandAxis::Row`
  and the last two to `BandAxis::Column`
  (`crates/bitty-runtime/src/runtime/band_slots.rs:86`, `:121`, `:130`).
- **One placement decision covers all four.** `ui_slot_placement` returns
  `Band(BandEdge::Left)` and `Band(BandEdge::Right)` for the vertical slots,
  the same variant the row bands get (`band_slots.rs:154`, `:161`-`:162`).
- **Column bands are admitted, planned, painted, and routed.** `column_band_plan`
  turns the granted per-side budget into one `ColumnBandRect` per visible band
  inside a disjoint column range, and `plugin_band_column_budget` reports the
  two shares (`crates/bitty-runtime/src/runtime/band_host.rs:2007`, `:1983`);
  `column_band_width` and `column_band_rows` hold the measure and the
  one-row-per-child stack (`:624`, `:645`); `paint_chrome_bands` paints each
  granted rect and `paint_band_column_rule` draws its content-edge rule
  (`crates/bitty-runtime/src/runtime/present.rs:6260`, `:6556`); clicks resolve
  through `plugin_band_cell_hit` and `band_line_at` (`band_host.rs:2236`,
  `:2306`).
- **`ui.state` agrees with the paint walk.** `slot_state_rule` returns
  `BandVisibility` for `Left`/`Right` as well as `Top`/`Bottom`, so a painted
  column band reports `presented = true` (`band_slots.rs:220`-`:223`, consumed
  at `crates/bitty-runtime/src/plugin_runtime/services.rs:3360`
  `ui_block_state`, `:3384`); `crates/bitty-runtime/tests/band_column_presented.rs`
  and `band_four_edge_geometry.rs` drive it end to end.
- **The scene axis is checked per edge.** A `Row` root on a column band is
  refused at mount with `E_UI_COMPONENT_INVALID` (`band_scene_matches`
  `band_slots.rs:241`, `band_scene_direction_error` `:257`), so the refusal is a
  direction mismatch, never an unhosted slot.

Limits that still hold at this pin — none of them a hosting gap:

- `workspace.bar.edge` is not a four-edge setting. The config type carries
  `Top` and `Bottom` only (`crates/bitty-config/src/types.rs:3225`), so a Bar or
  rail that follows that key cannot yet be placed on a vertical edge even
  though the band host serves both.
- A group `anchor` resolves on row bands only: `anchored_slots` splits a root
  `Row`'s direct children across the band width
  (`crates/bitty-runtime/src/runtime/band_host.rs:505`), and a column band
  stacks its children top-down instead.
- A row band is still exactly one window row per mounted band
  (`visible_band_count`, `band_host.rs:1907`). Only a column band stacks one
  content row per root child.
- A column band is clipped to its granted share: `column_band_plan` grants
  `min(want, remaining)` per side and the band that crosses the cap takes the
  remainder rather than vanishing (`band_host.rs:2047`-`:2065`).

Geometry stays owned by the [Chrome Band Contract](chrome-band-contract-candidate.md),
the placement table and the surface facts by the
[Chrome Surface API](chrome-surface-api-candidate.md).

## Clause status against the shipped bridge (read 2026-11-18 at `bitty@af348588`)

Every rule, slot envelope, and consequence above is labelled here against the
shipped `bitty.ui` bridge at `bitty@af348588` (`origin/main`). The five labels
are defined in this record so the table reads without a second document:

| Label           | Meaning                                                                                                                      | Evidence this record accepts                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| NORMATIVE       | Accepted and shipped: the host performs the clause and refuses the alternative.                                              | A symbol at the pin plus the gate, refusal, or test that enforces it. |
| ACCEPTED        | Decided by an accepted source; no host path performs it in this build.                                                       | The accepted source plus the path that omits or refuses it.           |
| CANDIDATE       | Direction only: nothing accepted requires it and no host path performs it.                                                   | The absence of a host path, named as an absence.                      |
| DEFERRED        | Postponed by an accepted record or by an implemented boundary, with the blocking contract or slice named.                    | The deferring statement plus the boundary that enforces it.           |
| NOT-IMPLEMENTED | This record states the clause as a rule, and the shipped host omits or contradicts it, with no decision behind the omission. | The clause plus the symbol that omits or contradicts it.              |

A label describes one clause, never the record. Sixteen of these thirty-four
clauses are `ACCEPTED` (5), `CANDIDATE` (6), `DEFERRED` (3), or
`NOT-IMPLEMENTED` (2), so the record's own promotion gate is unmet: it keeps
`status: draft`, and no label here promotes it or authorizes behavior.

| #    | Clause                                                                                                                    | Label           | Evidence at `af348588`                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1  | Rule 1 — chrome mutates no grid, cursor, mode, scrollback, attachment, or IPC policy                                      | NORMATIVE       | `crates/bitty-lua/src/ui.rs:553` (`enum UiNode` is the whole accepted vocabulary), `:209` (`UI_V1_NODE_KINDS: [&str; 4]`), `:212` (`UI_V1_EXCLUDED_NODE_KINDS`)                                                   |
| S-2  | Rule 2 — placement, thickness, and the resulting `gaps_out` inset are Core-owned, and a mount supplies no geometry        | NORMATIVE       | `crates/bitty-runtime/src/runtime/band_slots.rs:154` (`ui_slot_placement`), `crates/bitty-runtime/src/runtime/band_host.rs:2317` (`band_exclusive_container`); no node field is a coordinate (`ui.rs:553`-`:660`) |
| S-3  | Rule 2 — a band geometry change reflows, and the reflow resizes the PTY rather than rendering                             | NORMATIVE       | `crates/bitty-runtime/tests/host_chrome_gaps.rs:651` (`band_reservation_resizes_the_primary_pty_winsize`)                                                                                                         |
| S-4  | Rule 3 — chrome reads identity, title, focus, and order, never grid contents or scrollback                                | NORMATIVE       | the node vocabulary has no content-read field (`ui.rs:553`); colour is a closed theme-token set (`crates/bitty-lua/src/ui_style.rs:357` `UiBorderToken`, six tokens)                                              |
| S-5  | Rule 4 — window and shell chrome are Core plus user final, with plugin requests only                                      | ACCEPTED        | no grant flows from presentation data (`ui_style.rs:245` "Presentation only" boundary); the final-authority half has no host check in this build                                                                  |
| S-6  | Rule 5 — the slot set is closed at seven names                                                                            | NORMATIVE       | `ui.rs:183` (`UI_SLOTS: [&str; 7]`), `:156` (`UiSlot::parse`, exact and case-sensitive, no aliases)                                                                                                               |
| S-7  | Rule 5 — `statusline` is not a slot                                                                                       | NORMATIVE       | `ui.rs:1554`-`:1565` (closed-set test rejects `statusline` and `Statusline`)                                                                                                                                      |
| S-8  | Rule 5 — an admitted slot the host does not present fails closed at mount, never stored-but-unpainted                     | NORMATIVE       | `crates/bitty-runtime/src/plugin_runtime/services.rs:6692` (`ui_slot_placement` match), `band_slots.rs:163` (`Unsupported`), `:268` (`unsupported_slot_error`)                                                    |
| S-9  | Rule 5 — the tabline slot is an exclusive declaration (one declarant)                                                     | ACCEPTED        | the claim gate is shipped (`services.rs:6674`-`:6684`, `E_UI_CLAIM_REQUIRED`, test at `:10460`); no reservation refuses a second claimant across plugins                                                          |
| S-10 | Rule 5 — no slot admits arbitrary rendering, native handles, or global coordinates                                        | NORMATIVE       | `ui.rs:236`-`:263` (command, argument, token, and region-id caps), `ui_style.rs:279` (`UI_STYLE_FIELDS: [&str; 10]`, closed)                                                                                      |
| S-11 | Rule 6 — no chrome surface is a keyboard or IME focus target                                                              | NORMATIVE       | a band block has no capture path (`band_slots.rs:220` `slot_state_rule`, band arm is visibility only); the only input capture is gated by `ui.overlay.focus` (`services.rs:2890`)                                 |
| S-12 | Rule 6 — a pointer interaction on chrome routes through the command registry as a validated update                        | NORMATIVE       | `band_host.rs:2388` (`plugin_band_cell_hit`), `:2530` (`band_item_regions`), `crates/bitty-runtime/tests/host_chrome_gaps.rs:139` (`band_click_routes_own_claim_to_the_drain_queue`)                              |
| S-13 | Rule 7 — chrome never enters the hot path                                                                                 | ACCEPTED        | the band snapshot is flattened from retained blocks at present (`band_host.rs:335` `flatten_band_runs`); no cadence or invalidation host path exists to cite                                                      |
| S-14 | Rule 8 — notifications use `Messages`, the command surface uses `Palette`, and the overlay root takes no modal gate       | ACCEPTED        | the `4+1` envelope is shipped (`crates/bitty-ui/src/panel.rs:224` `MAX_OVERLAYS_PER_WINDOW`); the tier-to-surface mapping is contract text with no host route                                                     |
| S-15 | Rule 9 — chrome animation stays in `0..=500` ms and collapses under reduced motion and `bitty --safe`                     | ACCEPTED        | no duration, easing, or animation symbol exists in the band host or the present path (`band_host.rs`, `present.rs`)                                                                                               |
| S-16 | Rule 10 — the Bar and the rail are two presentations, not one                                                             | CANDIDATE       | `left`/`right` bands are shipped (`band_slots.rs:154`), but no rail presentation and no rail plugin path exists                                                                                                   |
| S-17 | Envelope `top`, `bottom` — one-row band, no plugin-set geometry, bridge depth 16                                          | NORMATIVE       | `band_slots.rs:121` (`BandEdge::axis`), `band_host.rs:2116` (`plugin_band_budget`), `ui.rs:215` (`UI_MAX_DEPTH = 16`)                                                                                             |
| S-18 | Envelope `left`, `right` — column band, one content row per direct child, `Row` root refused                              | NORMATIVE       | `band_slots.rs:241` (`band_scene_matches`), `:257` (`band_scene_direction_error`), `band_host.rs:744` (`column_band_rows`), `tests/band_column_input.rs:137`                                                      |
| S-19 | Envelope `terminal` — one attached `Scene` on the focused leaf, bounded by `SCN-1..5`                                     | NORMATIVE       | `crates/bitty-lua/src/ui_rich.rs:538` (`read_rich_component`), `:151` (`UI_RICH_NODE_KINDS: [&str; 9]`), `services.rs:6715` (`ui_mount_scene`)                                                                    |
| S-20 | Envelope `overlay` — text truncated at a char boundary to 128, at most four non-modal plus one modal per window           | NORMATIVE       | `crates/bitty-ui/src/panel.rs:225` (`MAX_OVERLAY_TEXT_LEN = 128`), `:224` (`MAX_OVERLAYS_PER_WINDOW = 4`), `present.rs:6762` (`paint_overlay_surface`)                                                            |
| S-21 | Envelope `tabline` — the canonical claim is `workspaceline`, and a `tabline` mount itself fails closed                    | NORMATIVE       | `services.rs:227` (`WORKSPACELINE_CLAIM`), `:6674`-`:6684` (claim gate), `band_slots.rs:163` (placement refusal)                                                                                                  |
| S-22 | Envelope `palette` — per-panel command bound 32, one effective picker per invocation                                      | CANDIDATE       | the palette is a Lua plugin composition on `overlay`; no host picker surface exists                                                                                                                               |
| S-23 | Fragment composition — several fragments per slot are retained, and `update` keeps a block's position                     | NORMATIVE       | `services.rs:1256` (`UiBlocks::mount` appends under the 64-block cap), `:6810` (`ui_update` replaces in place)                                                                                                    |
| S-24 | Fragment composition — render order is ascending mount sequence                                                           | NOT-IMPLEMENTED | `band_slots.rs:341`-`:346` sorts every edge by plugin id byte order, so mount sequence never reaches the paint walk                                                                                               |
| S-25 | Fragment composition — overflow truncates from the tail at fragment boundaries; one failing fragment never blanks the bar | CANDIDATE       | no truncation-at-boundary path exists: a band that does not fit is simply not painted (`band_slots.rs:337` `band_row` returns `None`)                                                                             |
| S-26 | Fragment composition — fragments never claim focus, never receive input routing, never graduate into panels               | NORMATIVE       | `band_slots.rs:220` (`slot_state_rule`: bands are visibility-only), `services.rs:3403` (`ui_block_state`)                                                                                                         |
| S-27 | A future `StatusProvider` compiles to one `bottom`-slot mount per fragment                                                | CANDIDATE       | no provider interface name, version, metadata, or filtering protocol exists in the host                                                                                                                           |
| S-28 | Consequence — U-4 chrome keys, Panel Rule grammar, cascade, and safety-policy rank                                        | CANDIDATE       | no host path parses a chrome key or a panel rule                                                                                                                                                                  |
| S-29 | Consequence — `WorkspaceScene` layers chrome above tiled content and below modal overlays                                 | CANDIDATE       | no `WorkspaceScene` symbol; per-edge stacking is by plugin id (`band_slots.rs:341`), not a global layer order                                                                                                     |
| S-30 | Verification items 1 and 4                                                                                                | NORMATIVE       | `tests/host_chrome_gaps.rs:651` (item 1), `services.rs:10460` (`tabline_slot_requires_exclusive_claim`, item 4)                                                                                                   |
| S-31 | Verification items 2, 3, and 5                                                                                            | NOT-IMPLEMENTED | no test in `crates/bitty-runtime/tests` asserts keyboard fall-through from chrome, a source-level identity-only assertion, or a documentation-lint assertion                                                      |
| S-32 | Open point — whether the notification area is a chrome surface or an overlay-tier consumer only                           | DEFERRED        | owner-pending; `platform.notify` pushes bounded notifications with no chrome-surface route                                                                                                                        |
| S-33 | Open point — whether the tab strip and the rail are per-`Window` or per-`Workspace`                                       | DEFERRED        | PW-10 keeps it open; the band host resolves per window (`band_host.rs:2116`)                                                                                                                                      |
| S-34 | Open point — accessibility semantics for chrome surfaces (roles, focus-order exclusion, announcements)                    | DEFERRED        | owned by the accessibility baseline record; no chrome accessibility path exists in the host                                                                                                                       |

### Demotions and corrections in this revision

- **Fragment render order (S-24).** The record said fragments render in
  ascending mount sequence. The shipped host sorts every edge by plugin id byte
  order (`band_slots.rs:341`), and its own module note says mount order never
  affects placement. The clause is `NOT-IMPLEMENTED`; the follow-up is FU-S1.
- **Tabline exclusivity (S-9).** "One declarant" is the accepted direction, but
  the host only checks that the mounting plugin's own `[lazy].claims` names
  `workspaceline`. Nothing refuses a second claimant, so the clause is
  `ACCEPTED`, not shipped. Follow-up FU-S2.
- **Verification items 2, 3, and 5 (S-31).** Three of the record's five planned
  assertions have no test at this pin. They stay unclaimed; follow-up FU-S3.
- **Rule 7, rule 8's tier mapping, and rule 9 (S-13, S-14, S-15).** Each is
  recorded as `ACCEPTED`: the shipped host has no cadence, tier route, or
  animation symbol to point at, so none may be described as implemented.
- **No widget family is claimed here, so none is demoted.** This record never
  names a capsule, button, or badge, and the bridge parses no such kind:
  `Text`, `Row`, `Column`, and `List` are the whole v1 vocabulary (`ui.rs:209`)
  and the nine accepted `SceneNode` kinds are the rich one (`ui_rich.rs:151`).
  The component argument lives in the candidate
  [Chrome Surface API](chrome-surface-api-candidate.md), which this pass does
  not rewrite.

### Named follow-ups (bitty#2191 residual half)

1. **FU-S1 — fragment ordering.** Either record plugin-id byte order as the
   contract or add a mount-sequence key; today the two disagree
   (`band_slots.rs:341`).
2. **FU-S2 — tabline single-claimant reservation.** Enforce "one declarant" or
   demote the exclusivity sentence in rule 5 to a claim requirement.
3. **FU-S3 — verification items 2, 3, and 5.** Keyboard fall-through from
   chrome, an identity-only source assertion, and the documentation-lint
   assertion are all unimplemented.
4. **FU-S4 — notification-area ownership.** Rule 8 and open point S-32 need the
   owner decision that separates a chrome surface from an overlay-tier consumer.
5. **FU-S5 — chrome animation contract.** Rule 9 cites an accepted animation
   contract that no chrome path consumes; it needs an owner and a host slice, or
   removal from this record.
6. **FU-S6 — `palette` envelope.** The `palette` row is the last shipped-named
   surface with no host path; it needs either a plugin-side record or removal
   from the slot table.

## Chrome-side consequences of the candidate UI runtime

- U-4's chrome keys, Panel Rule grammar, cascade, and safety-policy rank are
  **new candidate spellings** and are not defined here; this record fixes the
  surface contract they would consume.
- The candidate `WorkspaceScene` layering keeps chrome above the tiled content
  and below modal overlays; the ordering is a direction, not an accepted layer
  order.
- A panel rule may express a request about chrome (for example, hiding the
  strip); only Core plus user final applies it, and the request is auditable.

## Reconciliation (2026-11-14)

This record was re-read against `bitty` at `26360f15` (`origin/main`). Corrected
in this revision, because the corpus contradicted the code:

- the normative-source list quoted the accepted slot set with eight names,
  including `statusline`. The set is closed at seven names and `statusline` is
  rejected as an unknown slot (`crates/bitty-lua/src/ui.rs`, `UI_SLOTS`), so the
  list quotes the seven names;
- the `top`/`bottom` slot envelope quoted the accepted `SCN-2` depth of 32 as the
  bound on a mounted plugin tree. The Lua bridge enforces `UI_MAX_DEPTH = 16`, a
  deliberate stricter bridge budget than `SCN-2` (`crates/bitty-lua/src/ui.rs`,
  `ui_rich.rs`), and the envelope cites that bound.

Per-clause status for every rule, envelope, and open point in this record is the
clause-status table above, read at `bitty@af348588`; the
[Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md)
carries the same reconciliation at its own pin. This record keeps its candidate
rules and its `status: draft`; both sections record evidence, not acceptance.

## Security review

Chrome is a presentation surface with no authority. This record adds no
capability and no host surface; it restates the accepted read-only rule for a
wider inventory and keeps chrome slots inside the accepted closed set and
budget. Two properties matter for review: a plugin gains no ability to read
another panel's content through chrome, and chrome geometry reaches a PTY only
through the ordinary reflow and resize path, never from rendering. No `P0` criterion is affected; a security reviewer is required if a
future revision admits a new chrome slot family or grants chrome a modal
surface.

## Verification plan

1. A headless test asserting an edge change of the Bar recomputes the tiling
   area and resizes the PTY only through the reflow's ordinary resize path,
   while a Bar content update issues no PTY resize.
2. A test asserting a chrome surface receiving keyboard input routes it to the
   focused panel or overlay and never consumes it itself.
3. A source-level assertion that chrome segment producers read identity or
   declarative state only, with no path to grid or scrollback.
4. A test asserting the tabline slot admits exactly one declarant and rejects a
   second with a typed error.
5. A documentation-lint assertion that no chrome surface is described as a
   tiling leaf or a panel after this record lands.

## Alternatives considered

| Alternative                                                   | Trade-off                                                                       | Disposition                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Fold chrome into the Panel Runtime RFC as a section           | One document to read; widens an accepted RFC with candidate material            | Rejected — accepted text stays stable                 |
| Leave chrome to PW-4/PW-8/PW-10 and define no shared contract | No new document; keeps three candidate items each restating the read-only rule  | Rejected — the shared rules are the gap               |
| Treat chrome as a fourth tiling primitive                     | Uniform mental model; breaks the accepted hierarchy and the no-window-leak rule | Rejected                                              |
| Make the rail the only chrome surface and drop the Bar        | Fewer surfaces; contradicts the draft Status System and PW-4                    | Rejected — replacement remains open, not decided here |

## Affected contracts

| Contract                                                                                | Effect                                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Status System Specification](status-system.md) (draft)                                 | Unchanged; its Bar becomes one instance of the chrome inventory               |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) (candidate) | PW-4, PW-8, PW-10 gain a shared consumption surface; their items stay open    |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md) (candidate)                      | U-4 chrome runtime gains the contract it consumes; U-9 item 5 owns acceptance |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) (draft)         | Supplies the overlay-side owner chrome consumes                               |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                    | Unchanged; chrome consumes its identity and overlay contracts                 |

## Open points

- Whether the rail replaces or composes beside the Bar, and whether a hidden or
  relocated Bar behaves differently under `bitty --safe` (PW-4 Open, U-4 Open).
- The chrome key spellings, Panel Rule grammar, specificity algorithm, conflict
  diagnostics, and whether the cascade is user-visible as a resolution trace.
- Whether the notification area is a chrome surface or an overlay-tier
  consumer only; the naming and ownership are owner-pending.
- How a plugin chrome-slot grant is scoped and revoked per window versus per
  workspace (composes with `RFC-OQ-5`).
- Whether chrome surfaces are per-`Window` or per-`Workspace` for the tab strip
  and rail; PW-10 leaves it open.
- Accessibility semantics for chrome surfaces (roles, focus order exclusion,
  screen-reader announcement) are owned by the accessibility baseline record.

## Acceptance criteria

1. A reviewer confirms every rule restates or composes with an accepted source
   and adds no accepted behavior.
2. The inventory matches the documents it cites; no surface is silently added or
   dropped.
3. The record is linked from U-4, PW-4, PW-8, and PW-10 as their shared
   consumption surface.
4. Acceptance (if ever) happens through the owner-pending Window Chrome RFC,
   not by flipping this record's status.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or trust
decision changes. The security review above records that disposition.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted identity, focus, and
  overlay contracts chrome consumes.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy, decoration ownership, and no-window-leak.
- [Status System Specification](status-system.md) — draft Bar contract.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
  — PW-4, PW-8, PW-10 candidate chrome directions.
- [Workspace-Native UI Runtime (Candidate)](ui-runtime-candidate.md) — U-4
  chrome runtime direction and U-9 convergence roadmap.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) —
  overlay tiers and modal authority.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) —
  edge band geometry, content regions, and interaction for the Bar.
