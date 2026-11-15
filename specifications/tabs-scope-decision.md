---
title: Tabs Scope Decision
description: Draft decision record for the M1-31 tabs/tab-bar question - records plugin-owned strip hosting under ADR 0014 the tabline slot disposition the reorder and persistence dispositions and the strip slice owner without reviving the deprecated bitty-terminal.tabs surface
category: specifications
audience: contributor
document_type: register
status: draft
website_publish: false
sidebar_order: 55
---

# Tabs Scope Decision

> Status: **draft decision record** — a recorded recommendation, not an
> accepted contract. It addresses the M1-31 question (backlog item `M1-31`,
> [bitty#1157](https://github.com/bitty-terminal/bitty/issues/1157)) and the
> window-form question `OQ-052`, which stays **Open**. It changes no accepted
> document, closes no open question, and weakens no normative security
> control. The accepted
> [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
> row for `OQ-052`, the candidate
> [Chrome Surface Contract](chrome-surface-contract-candidate.md) `PW-10`
> item, and the
> [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row remain
> authoritative. `OQ-052` closes only through an owner-accepted decision
> artifact, never through this record alone.
>
> Owner decision (2026-10-01): the recommended option 2 is adopted by
> [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md) on
> [bitty#1558](https://github.com/bitty-terminal/bitty/issues/1558).
> Workspace is a Core mechanism; the tab strip, workspace bar, and sidebar are
> plugin-only presentation. That ADR resolves the M1-31 slice of `OQ-052`;
> `PW-10` acceptance and all API spellings stay open.
>
> Implementation note (2026-11-15): the deferral recommendation in
> [Recommended disposition](#recommended-disposition) is **superseded for the
> verb surface** by landed code — three Core tab verbs and a panel-projection
> tab model now exist. The entry in
> [Implementation record: Core tab verbs landed](#implementation-record-core-tab-verbs-landed-2026-11-15)
> states what landed and the residual state of the verbs and the strip.
> `OQ-052` stays **Open**, and this draft stays `draft`.
>
> Hosting disposition (2026-11-16): strip hosting is **no longer deferred**. It
> is decided — plugin-owned — by the accepted
> [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
> ("Workspace presentation is plugin-only", 2026-10-01). The entry in
> [Strip hosting and slot disposition](#strip-hosting-and-slot-disposition-2026-11-16)
> records that authority together with the `tabline`-slot, reorder, persistence,
> and owner dispositions taken inside this register. Only hosting is traceable
> to an accepted decision; the other four are recorded dispositions with their
> open questions named, which is why this document stays `draft`.

## Purpose

This record answers the M1-31 question — Core chrome versus declarative
surface for tabs — at the recommendation level, and states the exact path
that would close the M1-31 slice of `OQ-052`. It exists so the ownership of the
tab experience is a recorded Bitty position rather than an inference from
missing matches. Three positions are recorded side by side and must be read
together: the recommendation below, the
[implementation entry](#implementation-record-core-tab-verbs-landed-2026-11-15)
that supersedes it for the verb surface, and the
[strip hosting and slot disposition](#strip-hosting-and-slot-disposition-2026-11-16)
that settles who owns the strip and what the remaining tab gaps are.

In scope: who owns the tab strip experience and which Core primitives it
consumes. Out of scope: the workspace switcher that already ships; the
`PW-10` tab-strip contract itself (owned by the chrome-surface candidate);
the unified `Mod` contract and remaining `OQ-052` window forms; the
single-window slice contract, cited not redefined. This record must not
revive the deprecated `bitty-terminal.tabs` surface in any form.

## Source identity

| Source                                                                                                                                                                                             | Role                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0014 - Workspace as Core Mechanism with Plugin-Only Presentation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md) | Accepted (2026-10-01): workspaces are Core mechanism, every visible workspace surface is plugin-only; the authority for strip hosting |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)                                                                                  | `OQ-052` owner-pending; the closure authority for this question                                                                       |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                                                                                                  | P1 row "Tabs and tab bar": `missing (workspaces exist)`; registers `PW-10`                                                            |
| [Roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)                                                                                      | P1 row: plugin policy over Core primitives; layout stays with the compositor                                                          |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                                                                                                        | `PW-10` tab-strip candidate: panel projections for one `Window`/`Workspace` (order, active, close)                                    |
| [Workspace Compositor Specification](workspace-compositor.md)                                                                                                                                      | Accepted `Window -> Workspace -> LayoutTree -> View` hierarchy; layout stays with the compositor                                      |
| [Single-Window Vertical Slice](../product/vertical-slice-acceptance.md)                                                                                                                            | Candidate slice: no tabs, no splits, no panes                                                                                         |

Implementation evidence, read-only from `bitty` `972818d`
(2026-09-22), keeps the original reading this recommendation rests on:

- Workspace actions ship (`workspace_new`/`_close`/`_focus` in
  `crates/bitty-config/src/keymap.rs`, runtime
  `crates/bitty-runtime/src/runtime/workspaces.rs`), but there is no tab bar
  and no tab view.
- The deprecated `tabs` module is an alias of `workspace` only
  (`crates/bitty-runtime/src/tabs.rs`: `#[deprecated]` shims delegating to
  the canonical `workspace` names; removal >= v0.2.0; new code must use
  `crate::workspace`).
- Alacritty precedent declines tabs by design; Kitty and WezTerm own
  tab/multiplex surfaces outside any plugin model Bitty accepts.

That reading is now partially stale in one respect: `bitty` at merge commit
`9548f2e1` (2026-11-15) has a tab model and three Core tab verbs, and still no
tab bar and no hosted strip. The
[implementation entry](#implementation-record-core-tab-verbs-landed-2026-11-15)
replaces the stale half; the deprecated alias reading above is unchanged. The
[Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row carries the
same staleness — its "no tab view" clause predates the verbs, while its "no
hosted strip" clause still holds — and needs its own correction; this register
records the divergence rather than editing that row.

## Disposition

### Decision space

1. **Core tab chrome.** Core paints and owns a tab bar over workspaces.
2. **Plugin tab policy over Core workspace primitives (deferred).** A
   plugin owns the tab strip UX and consumes workspace order/focus/close
   primitives plus the `PW-10` shared surface; Core keeps workspace
   primitives and compositor layout only. No M1 work.
3. **Revive `bitty-terminal.tabs`.** Rejected outright below.

### Recommended disposition

**Recommend option 2: defer to plugin tab policy, with no M1 work.**
Workspaces already provide the grouping primitive a tab strip needs; what is
missing is the strip UX and its shared contract (`PW-10`, still candidate),
not Core grouping. Core-owned chrome would hard-code one tab metaphor into
the compositor that `OQ-052` has not settled. Option 3 is rejected: the
`tabs` alias exists only as a compat shim with a dated removal, and any new
surface must go through the `PW-10`/plugin-platform path, never a revival.

**Superseded for the verb surface (2026-11-15).** The landed slice splits this
recommendation rather than confirming it: Core now owns the tab _verbs_ and the
panel projection behind them as mechanism, while the _strip_ stays unhosted and
deferred. The reasoning below still holds for presentation — hosting, reorder,
overflow — and no longer describes the command surface; see
[Implementation record: Core tab verbs landed](#implementation-record-core-tab-verbs-landed-2026-11-15).

### Rationale

1. **The grouping primitive already ships.** `workspace_new`/`_close`/`_focus`
   plus the workspaceline overlay cover grouping and switching; the gap is
   strictly the strip presentation, which is policy, not mechanism.
2. **Layout stays with the compositor.** The roadmap P1 row and the accepted
   Workspace Compositor both keep layout in Core-as-mechanism; a Core tab bar
   would fuse one policy into that mechanism before `OQ-052` settles window
   forms.
3. **The contract slot already exists.** `PW-10` names the tab strip as a
   shared consumption surface; the missing piece is its acceptance, not a
   new Core widget. Deferral points at that slot instead of duplicating it.
4. **No demand evidence for M1 tabs.** The single-window slice explicitly
   excludes tabs; nothing in the M1 gates requires them.
5. **Correction (2026-11-15).** Items 1 and 4 are arguments about the strip, and
   they were read as covering the whole tab question. The landed slice shows the
   tab _mechanism_ — verbs over panel projections — was separable from the strip
   and could land without strip demand. The strip arguments stand as written;
   they no longer bound the command surface.

### What changes if adopted

- **As recommended (deferral):** no change to presentation, and the deprecated
  `tabs` alias continues to its >= v0.2.0 removal untouched. The
  authoritative resolution is an owner-accepted decision artifact that
  records plugin ownership, accepts (or supersedes) the `PW-10` tab-strip
  surface, and closes the M1-31 slice of `OQ-052` per the path below. The
  [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) row would
  move from `missing (workspaces exist)` to `missing; deferred to plugin
policy over workspace primitives`.
- **What actually happened instead (2026-11-15):** the mechanism half of
  option 2 was implemented in Core — three registered tab verbs over panel
  projections, with the strip still unhosted. So the artifact above is still
  owed for presentation and `PW-10`, while the "no M1 work / no runtime change"
  clause no longer describes the command surface. See
  [Implementation record: Core tab verbs landed](#implementation-record-core-tab-verbs-landed-2026-11-15).
- **If instead Core-owned presentation:** the same owner-accepted artifact pins
  the tab model (workspaces? views? terminals?), the strip's place in chrome
  ownership, and keyboard-addressability before any implementation task
  lands code.

### Security and bounds

- A tab strip is presentation over panel projections: order, active, and
  close over `PanelId`. It never reorders terminal state and never crosses the
  plugin isolation boundary beyond the `PW-10` read/projection surface.
- Tab close must not open a parallel teardown path. The landed `core.tab:close`
  satisfies this by construction: it detaches one projection and never destroys
  the panel, whose lifecycle (state, generations, disposal, PTY teardown,
  save-on-close policy) stays with the panel registry and the workspace-close
  lifecycle; closing a stack's last tab is refused with `TabError::LastTab`
  precisely so the verb cannot become a second pane-destruction path.
- The landed verbs open no capability and no plugin surface; this record still
  opens nothing, and it remains a scope statement plus an implementation
  record rather than an accepted contract.
- Workspace pills are not tabs. Under the candidate
  [Chrome Band Contract](chrome-band-contract-candidate.md) the built-in
  `workspace` module renders one pill per workspace on the Bar's edge band;
  panel tabs remain the separate `PW-10` surface on the exclusive `tabline`
  claim, and this recommendation is unchanged by the pills. The candidate
  [Chrome Surface API](chrome-surface-api-candidate.md) moves workspace bar
  rendering to optional plugins and keeps `tabline` reserved for `PW-10`.

## Implementation record: Core tab verbs landed (2026-11-15)

This entry records the tab contract that landed in `bitty` at merge commit
`9548f2e1` ([bitty#3168](https://github.com/bitty-terminal/bitty/pull/3168),
issue [bitty#3166](https://github.com/bitty-terminal/bitty/issues/3166)). Every
claim below was read in the merged tree, not taken from review prose or the
issue text; paths are relative to the `bitty` repository at that commit.

It supersedes the [Recommended disposition](#recommended-disposition) **for the
verb surface only**. Core now owns three tab verbs and the panel projection
behind them as mechanism. The strip — hosting, painting, reorder, drag,
overflow — stays unhosted and deferred, and nothing here accepts `PW-10`, closes
`OQ-052`, revives `bitty-terminal.tabs`, or promotes this document out of
`draft`.

### The verb surface

| Facet        | Landed contract                                                                                                                                                                                                                             | Code path                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verb names   | `core.tab:open`, `core.tab:switch`, `core.tab:close` — ordinary `owner.name:command` qualified names. The issue's shorthand `tab.open` names the first of them; a bare `tab.open` or `tab:open` is not a qualified name and does not parse. | `crates/bitty-ui/src/tabs.rs` (`TAB_CMD_OPEN`, `TAB_CMD_SWITCH`, `TAB_CMD_CLOSE`, `TAB_CMDS`, `register_tab_verbs`)                                                                                  |
| Registry     | Registered through the same per-window `CommandRegistry` the panel command lane uses, once per window when the panel registry is constructed. Core verbs have no panel owner and survive every per-panel teardown.                          | `crates/bitty-ui/src/panel.rs` (`CommandRegistry::register_core`, `is_core`, `owner_of`, `unregister_panel`), `crates/bitty-runtime/src/registry/panel.rs` (`PanelRegistry::new`, `is_core_command`) |
| Discipline   | The `QualifiedCommand` grammar, cross-lane duplicate rejection, and the per-owner cap (`MAX_COMMANDS_PER_PANEL_TYPE`) are unchanged; the Core lane gets its own bucket under the same cap.                                                  | `crates/bitty-ui/src/panel.rs`                                                                                                                                                                       |
| Owner family | The whole `core.` owner family is reserved. A panel lane cannot register **any** `core.*` name — typed `CommandError::CoreDuplicate`, whether or not Core registered that exact name — while the three Core verbs still register normally.  | `crates/bitty-ui/src/panel.rs` (`CORE_OWNER_FAMILY`, `QualifiedCommand::owner_family`, `QualifiedCommand::is_core_namespace`, `CommandRegistry::panel_lane_may_register`)                            |

The reservation is what makes the two authorities separable: a panel lane cannot
mint `core.tab:reorder` or a real control-request id such as `core.view:split`,
so "Core verbs" is a namespace rule rather than a list of names Core happened to
register first.

### The tab model

- **A tab is 1:1 with a `PanelId`; no `TabId` exists.** A `Tab` carries the panel
  identity plus the `View` leaf that paints it. A tab is therefore a
  **projection of a panel**, never an anonymous slot, and closing a tab detaches
  a projection rather than destroying or re-parenting a panel.
- **The committed tab tree is a single `LayoutNode::Leaf`** naming the active
  projection (`TabSet::layout`, `TabSet::projected_views`). `LayoutNode::Stack`
  stays a paint-order stacking container — co-located children, last painted on
  top, no identity, no active child — and its doc comments now say exactly that
  and point at the tab projection instead of claiming tab semantics
  (`crates/bitty-ui/src/layout.rs`, module doc and the `Stack` variant doc). A
  `Stack` interior could not have carried tabs in any case: the layout validator
  refuses `Stack` with `LayoutError::UnsupportedNode`, so the old doc claim was
  never reachable through a validated commit.
- **The active tab is the layout's active leaf**, so session restore needs **no
  new persisted field**: a saved layout already names which tab was active.
  Persisting a multi-tab strip would need a layout-format change and is
  explicitly **not implemented**.
- **Projection invariants** (`TabSet::validate`): at least one tab, at most
  `MAX_TABS_PER_STACK` (32), one tab per `PanelId`, one tab per `ViewId`. The
  last entry in strip order is the active tab.
- **Validate before commit.** Each verb takes `&self` and returns a `TabCommit`;
  a failure returns a typed `TabError` and leaves the caller's set and focus
  untouched, so there is no partial mutation and no orphaned leaf.

### Close ordering and refusal

`tab.close` re-homes focus off the closing id **before** the commit lands.
`TabCommit::commit(focus)` is the gate: it refuses with
`TabError::FocusNotRehomed` unless the caller presents the activated tab as the
focus it has already applied, which is the WS-INV-19 order (re-home first,
persist second), so a dangling focus id cannot reach a saved layout. Closing the
last tab is refused with typed `TabError::LastTab`: a tab stack keeps at least
one tab, and closing the pane itself is a layout/workspace operation, not a tab
verb.

Every verb reports `TabEffect::FOCUS_AND_REDRAW`, asking the host to re-attribute
input-mode caches and to request a full redraw. That is a deliberate safe
over-approximation: closing a background tab does not change the active tab, but
it does change the strip, and no verb produces a partial repaint.

### What did not change

- The `workspaceline` exclusive claim still gates **plugin mounts into the
  `tabline` UI slot** and nothing else. Core verbs mount no UI block and consult
  no plugin claim; the claim cannot turn into a hosted strip either, because the
  slot's placement is still a refusal
  (`crates/bitty-runtime/src/runtime/band_slots.rs`, `UiSlotPlacement::Unsupported`;
  `crates/bitty-runtime/src/plugin_runtime/services.rs`, claim gate before the
  placement gate). Hosting a strip stays a separate slice.
- The seven accepted `UiSlot` names, the deprecated `bitty-terminal.tabs` alias
  and its removal path, and every accepted document cited above are untouched.
- **No plugin-facing tab API exists.** The verbs are Core window commands: there
  is no `bitty.tab.*` Lua binding, no tab capability, and no manifest surface. A
  plugin cannot call, claim, or shadow them.

### Residual: the verbs are reachable; the strip is not

At `9548f2e1` the verbs were defined and registered but reachable from no user
action. Dispatch landed afterwards
([bitty#3169](https://github.com/bitty-terminal/bitty/issues/3169)), so the
statement above is dated and this is its correction:

- **Chords.** `ctrl+shift+t` / `ctrl+alt+tab` / `ctrl+shift+w` bind `tab_open` /
  `tab_next` / `tab_close` (`crates/bitty-config/src/keymap.rs:2249-2251`), and
  the chord path runs the same validated commit
  (`crates/bitty-terminal/src/chrome_keys.rs:1619-1633` →
  `Runtime::tab_apply`, `crates/bitty-runtime/src/runtime/tabs.rs:402`).
- **CLI.** `bitty ctl tab open|switch|close` parses and dispatches into the same
  path (`crates/bitty-terminal/src/ctl/request.rs:545`,
  `crates/bitty-terminal/src/ctl/tab.rs`; wire methods `bitty.debug/tabOpen`
  etc. at `crates/bitty-terminal/src/ctl/request.rs:78-87`).
- **Lua.** Still nothing: no `bitty.tab.*` binding and no tab capability, so a
  plugin can neither read nor drive the tab set.

What remains is exactly the strip: the `tabline` slot placement is still
`UiSlotPlacement::Unsupported`, so nothing paints one, and no plugin-facing tab
read exists for a strip to paint from. Reorder and overflow are untouched by the
dispatch work and stay open.

### Review residuals carried as follow-ups (state at `9548f2e1`)

Two review rounds on [bitty#3168](https://github.com/bitty-terminal/bitty/pull/3168)
closed one blocker — `core.*` was documented as reserved while the code only
matched the three registered names, so a panel lane could still mint
`core.tab:reorder` or `core.view:split` — and left the residuals below. They are
recorded here so a later reader does not re-derive them from the code, and none
of them is a gap this record claims to close.

| Residual                                                                             | What it means                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No host dispatch path (`ctl`, keymap, Lua)                                           | The verbs are inert; the slice is the command surface, not a user feature.                                                                                                  |
| `tabline` slot unhosted                                                              | `UiSlotPlacement::Unsupported`; the `workspaceline` claim gates plugin mounts only and cannot produce a strip.                                                              |
| Multi-tab persistence                                                                | Needs a layout-format change; the active tab already restores through the layout's leaf.                                                                                    |
| Background tabs keep their last grid size                                            | Only the active leaf is laid out; inactive projections are not sized.                                                                                                       |
| `switch` moves the target to the end of the strip                                    | A documented representation choice with no host; a strip host must decide between strip order and an explicit active index.                                                 |
| Reorder, drag, and overflow                                                          | Out of scope for the landed slice and still plugin policy under the deferral above.                                                                                         |
| `TabEffect` over-approximates a background close                                     | Documented in the code: the flags are safe, not an exact prediction.                                                                                                        |
| The two tree validators cannot fail for the single-leaf tree the projection emits    | The projection invariants are the effective gate; the validators are kept as the contract a future multi-leaf projection must satisfy.                                      |
| The reservation is one-directional                                                   | `register_core` accepts any name (Core is the trusted lane), and the exact-match half of `panel_lane_may_register` is unreachable while Core registers only `core.*` names. |
| `PanelRegistry::dispose` rebuilds the registry without re-registering the Core verbs | Unreachable today because the registry is disposed afterwards; a future revive path would silently drop the verbs.                                                          |

Three of those rows are stale at `0f4d64b7`. They are corrected here rather than
dropped, because each was read as a fact and a later reader would otherwise
re-derive the wrong one:

| Residual at `9548f2e1`                            | State at `0f4d64b7`                                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No host dispatch path (`ctl`, keymap, Lua)        | Superseded for `ctl` and keymap: both dispatch into `Runtime::tab_apply` (`crates/bitty-terminal/src/ctl/request.rs:545`, `crates/bitty-terminal/src/chrome_keys.rs:1619`). Lua is still absent. |
| `switch` moves the target to the end of the strip | Superseded: `switch` moves the active index and leaves the order vector alone, so activating a tab never moves it (`crates/bitty-ui/src/tabs.rs:33-42`, `:473`, `:674-686`).                     |
| Reorder, drag, and overflow are plugin policy     | Superseded in part for reorder: reorder is Core mechanism under the [reorder disposition](#reorder-a-named-future-core-verb-recorded) below. Drag and overflow stay plugin policy.               |

One row is narrower than it reads: `TabSet::fit_slot`
(`crates/bitty-ui/src/tabs.rs:529`) closes the background-size residual at
module level only — it has no production caller at `0f4d64b7` — so "only the
active leaf is laid out" still describes shipped behavior.

## Strip hosting and slot disposition (2026-11-16)

This entry answers the four dispositions
[bitty#3178](https://github.com/bitty-terminal/bitty/issues/3178) names —
hosting, the `tabline` slot, reorder, and persistence — and names the repository
that owns the strip slice. It is read against `bitty` at `0f4d64b7`; paths below
are relative to that repository. Only hosting rests on an accepted authority.
The rest are recorded dispositions taken inside this register, each with the
question it leaves open; none of them promotes this document out of `draft`.

### Hosting: the strip is plugin-owned

[ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
decides this, so this record transcribes it rather than choosing it. The ADR is
accepted (2026-10-01, project initiator,
[bitty#1558](https://github.com/bitty-terminal/bitty/issues/1558)), and its
section "Workspace presentation is plugin-only" states:

- Item 1: "Core draws no workspace presentation: no workspace bar, no tab
  strip, no vertical sidebar, and no workspace pills."
- Item 4: "Panel tabs inside one workspace (the `tabline` surface, `PW-10`) are
  the same kind of presentation: plugin policy over Core panel and workspace
  primitives, never Core chrome."

Its consequences section removes the escape hatch: work that adds a Core-drawn
tab strip "contradicts this ADR and must be rescoped as plugin work over the
public surfaces." Core keeps the mechanism the strip consumes — the
`core.tab:*` verbs over panel projections recorded above, the committed layout,
and band geometry.

Two consequences the rest of this section depends on:

1. **No Core strip is owed.** The missing strip is not a `bitty` feature to
   schedule; it is the zero-plugin baseline the ADR requires. A user with no
   strip plugin sees exactly what the ADR asks for.
2. **`PW-10` stays candidate.** The ADR adopts the ownership direction and
   leaves the tab-strip contract to `PW-10`, so a first-party strip ships
   against `PW-10`'s current shape without that candidate becoming accepted.

One divergence is recorded rather than smoothed over. The ADR's "Retire the
conflated bundled workspace plugin" item 1 removes the `workspaceline` claim
because Core no longer has a presentation slot for one plugin to own
exclusively, while the shipped host still enforces it (`WORKSPACELINE_CLAIM`,
`crates/bitty-runtime/src/plugin_runtime/services.rs:227`; the gate runs before
the placement check at `:6612-6618`). That gate guards only a slot whose
placement is a refusal, so it can admit nothing today; removing it is a Core
step under the ADR, not a precondition of the strip slice.

### Slot disposition: `tabline` stays accepted, reserved, and unplaced

`tabline` is one of the seven accepted v1 slot names, and it is deliberately not
hosted. Verified at `0f4d64b7`:

- The slot set is closed at seven names — `terminal`, `top`, `bottom`, `left`,
  `right`, `tabline`, `overlay` — in the Lua bridge's `UiSlot`
  (`crates/bitty-lua/src/ui.rs:113-138`, `ALL: [Self; 7]` at `:142`, `UI_SLOTS`
  at `:182-190`). `bitty.ui.mount` parses exactly those names.
- Its placement is an explicit refusal, and the reason string names the tab
  verbs as the owner of the slot's state
  (`crates/bitty-runtime/src/runtime/band_slots.rs:163-165`):

  ```text
  UiSlot::Tabline => UiSlotPlacement::Unsupported(
      "is Core tab-projection state (issue #3166 `core.tab:*` verbs) and has no host surface yet",
  ),
  ```

- The refusal is enforced at mount, after the capability and claim gates, so
  `bitty.ui.mount("tabline", …)` fails closed with `E_UI_UNAVAILABLE` carrying
  that reason (`crates/bitty-runtime/src/plugin_runtime/services.rs:6647-6650`).
- It is not a band row by design: the placement module's own map lists
  `tabline` as "rejected: a tab strip is Core tab-projection state (issue
  #3166), not a band row" (`crates/bitty-runtime/src/runtime/band_slots.rs:13-21`),
  and `slot_state_rule` keeps it out of the band-visibility rule because "a tab
  strip is a Core tab projection with several entries, so the band rule would be
  wrong even once a host exists" (`:196-203`).

**Disposition (recorded): the slot name is not retired and the slot is not
hosted. A plugin strip composes on an existing band slot — `top`, above the pane
area, or `bottom` if the user prefers the strip there — and `tabline` stays
accepted-but-unplaced.**

Reasoning:

1. **The refusal is honest.** The slot parses, and a mount into it answers with
   a typed code and a reason. Nothing claims a strip is paintable and nothing
   silently drops a block.
2. **A band slot already supplies a strip row.** `top`/`bottom` are one-row,
   full-width bands (`crates/bitty-runtime/src/runtime/band_slots.rs:13-21`),
   and the first-party bar already composes this way —
   `bitty.ui.mount(M.EDGE_SLOTS[opts.edge], …)` in `bitty-plugins`
   `plugins/bar/lua/bar/init.lua`, default edge `bottom`. A tab strip is the
   same composition with a different content tree.
3. **Retiring the name is an accepted-contract change, not a register edit.**
   The seven names are bridge vocabulary — parsed by `bitty.ui.mount` and named
   by the `E_UI_UNAVAILABLE`/`E_UI_CLAIM_REQUIRED` diagnostics — and their
   spellings sit under `OQ-056`, which stays open.
4. **Band composition carries a cost the reserved slot avoided: a shared row.**
   A band edge is not exclusive; several blocks may hold one edge
   (`ChromeBands::from_mounts`, test at
   `crates/bitty-runtime/src/runtime/band_slots.rs:448-465`), so a strip on
   `top` shares that row with any other plugin holding `top`. `tabline` was the
   exclusive home that avoided this, which is the single-owner model ADR 0014
   removed.

Open question this disposition leaves: whether `tabline` stays `PW-10`'s
reserved home for a host-side tab-projection presentation with its own state
rule, or is retired under `OQ-056` once a band-composed strip is the shipped
answer. The strip slice needs no answer to proceed.

### Reorder: a named future Core verb (recorded)

Facts at `0f4d64b7`:

- Strip order is insertion order and no verb reorders it. The tab module states
  it as model contract: "The strip order is insertion order and no verb
  reorders it … [`TabSet::switch`] moves the index and leaves the vector alone,
  so activating a tab never moves it and the strip never reorders behind the
  user's back" (`crates/bitty-ui/src/tabs.rs:33-42`). Active position is
  separate state (`TabSet::active_index`, `:467-475`), and `switch` only sets it
  (`:674-686`).
- `TAB_CMDS` is exactly three verbs — `core.tab:open`, `core.tab:switch`,
  `core.tab:close` (`crates/bitty-ui/src/tabs.rs:114-123`). The whole `core.*`
  owner family is reserved against the panel lane, so no plugin can add a
  fourth (`crates/bitty-ui/src/panel.rs`, `CORE_OWNER_FAMILY`).
- Nothing dispatches a reorder. The `bitty ctl` tab grammar accepts exactly
  `open | switch | close` (`crates/bitty-terminal/src/ctl/request.rs:545`), the
  wire methods are the three `bitty.debug/tab{Open,Switch,Close}`
  (`crates/bitty-terminal/src/ctl/request.rs:78-87`), and
  `verb_for_method("bitty.debug/tabReorder")` is `None`
  (`crates/bitty-terminal/src/ctl/tab.rs:456`).

**Disposition (recorded): reorder is Core mechanism, not plugin policy. If it
lands it lands as `core.tab:reorder` on the same validated `TabSet` →
`TabCommit` path, and its precondition is that a strip renders — a "move this
tab" affordance needs a visible target. Until then it is deliberately and
visibly absent.**

Why Core and not the plugin, given ADR 0014: the ADR hands Core the
order-and-reorder mechanism for workspaces — "Core owns the workspace lifecycle
and state: … order and reorder" ("Workspace is a Core mechanism", item 1) — and
gives plugins the presentation that reads it ("Core publishes workspace state;
it does not present it"). Tab order is the same division. A strip may paint its
entries in any arrangement it likes, but the set's order decides which neighbour
a close activates (`crates/bitty-ui/src/tabs.rs:38-42`), so a strip that permuted
only its own paint order would hold a second, divergent order for one set. Two
orders for one set is a bug with a delay on it; a plugin must not own the
permutation.

What that leaves: the first landing of a plugin strip can be order-read-only —
insertion order, active marked — which is exactly what the model guarantees
today. Reorder is a separate Core verb with its own acceptance, not a
plugin-side workaround.

### Persistence: the drop-on-restore contract stops at the first visible strip (recorded)

The contract in force is explicit and pinned:

- `TabSet::layout()` commits exactly one projection:
  `LayoutNode::leaf(self.active().view().clone())`
  (`crates/bitty-ui/src/tabs.rs:554-558`), so the layout format carries the
  active tab and nothing else.
- `multi_tab_strips_are_not_persisted` (`crates/bitty-ui/src/tabs.rs:1417-1451`)
  asserts the consequence: a three-tab set commits a one-leaf layout, the two
  inactive views never reach the format, and restore rebuilds a single-tab set.
- The module states it as decision 5: inactive tabs "are dropped on restart, by
  contract, and no persisted field records them … a future slice that wants a
  strip back changes the format and that test, and does not add a field here"
  (`crates/bitty-ui/src/tabs.rs:54-63`).

Because dispatch landed, the drop is already reachable: a user can create tabs
today and lose every inactive one on restart. With no strip the tabs are not
visible at all; `bitty ctl tab` reports the count, so the loss is observable
but never shown.

**Disposition (recorded): the contract is a strip-less-build contract and it
does not survive a visible strip. Tab persistence is a prerequisite of shipping
the strip as a user feature, and it is Core work, not plugin work.**

ADR 0014 supplies the split: "Workspace persistence and restore remain Core
concerns under the Restore/Persistence separation in ADR 0013; they are not
presentation." A plugin cannot read or write the layout format, and tab order
lives in Core, so a strip plugin has no honest way to persist a tab set by
itself.

Consequence, stated either way:

- **If persistence lands with the strip:** the layout format grows a tab-set
  representation, with a migration story for saved layouts and a replacement for
  `multi_tab_strips_are_not_persisted`. Restore then rebuilds `n` tabs and the
  strip's promise matches what the user sees.
- **If the strip ships first:** the drop stays the contract, and the strip
  inherits the job of presenting the loss rather than hiding it — a visible
  `n`-tab strip that restores as one tab is silent data loss the UI itself
  advertises. This record does not accept that outcome; it records that shipping
  the strip first moves the honesty requirement into the strip's user-facing
  contract.

Open question this disposition leaves: whether tab persistence is a precondition
of the strip slice or a fast follow. Nothing here schedules it.

### Owning repository and the files the slice needs

The strip is plugin work, so it belongs to **`bitty-terminal/bitty-plugins`**.
This repository records the decision and ships no code, and this record opens no
issue in `bitty-plugins`.

The package is a new first-party presentation plugin beside the shipped ones,
and the shape below follows its siblings (`plugins/bar`, `plugins/dashboard`):

| Artifact       | Path (in `bitty-plugins`)                  | Purpose                                                                                                                                   |
| -------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Manifest       | `plugins/tab-strip/bitty-plugin.toml`      | `id = "bitty-terminal.tab-strip"`, `[capabilities] ui.rich = true`, plus the tab read/control capabilities the Core surface grants        |
| Implementation | `plugins/tab-strip/lua/tab-strip/init.lua` | Mounts one `Row` block on `top` (or `bottom`), paints one entry per tab with the active entry marked, routes a click to activate or close |
| Tests          | `plugins/tab-strip/tests/run.lua`          | Host-mock coverage: unhosted-slot refusal, click routing, active marking, and the zero/one-tab edges                                      |
| Registry       | `registry/official/tab-strip.toml`         | The official listing the plugin manager reads                                                                                             |
| User docs      | `bitty-plugins-docs`                       | Package page: install line, settings, and the persistence limitation until it is lifted                                                   |

The id is `bitty-terminal.tab-strip`, deliberately not `bitty-terminal.tabs`:
that id is the retired deprecated alias (removal at or after v0.2.0), and this
record forbids reviving it.

The only verbs the slice drives are the three that already exist —
`core.tab:open`, `core.tab:switch`, and `core.tab:close` — plus
`core.tab:reorder` if that verb lands. The strip adds no verb of its own: the
`core.*` owner family is reserved, so a plugin cannot mint one.

### Core prerequisites the slice consumes

Named so the slice is not read as plugin-only work:

1. **A plugin-facing tab read.** `Runtime::tab_snapshot()` exists
   (`crates/bitty-runtime/src/runtime/tabs.rs:374-378`) but has no bridge: no
   `bitty.tab.*` binding, no tab capability in
   `crates/bitty-plugin-host/src/capability.rs`, no tab event. The strip needs a
   bounded read of panel identity, display title, strip order, and active index,
   shaped like `bitty.workspace.list` (`crates/bitty-lua/src/host.rs:2928-2945`)
   — ADR 0014's "Core publishes workspace state" applied to tabs, with the
   capability split the workspace domain already uses
   (`workspace.read`/`workspace.control`,
   `crates/bitty-plugin-host/src/capability.rs:226`). Spellings stay under
   `OQ-056`.
2. **A click-to-verb route.** A mounted block's click names a plugin-qualified
   command (`<plugin-id>:<resource>`), and the panel lane cannot register any
   `core.*` name (`crates/bitty-ui/src/panel.rs`, `CORE_OWNER_FAMILY`), so a
   strip click cannot call `core.tab:switch` the way the bar's pills call its
   own commands. The route needs either a sanctioned Core-verb dispatch from a
   plugin command or a tab control binding analogous to
   `bitty.workspace.focus` — a bounded, grant-gated request queue as
   `workspace_request` uses
   (`crates/bitty-lua/src/host.rs:2939-2945`), with read never implying control.
   This is the one genuinely undecided piece of the slice, and it is Core's to
   decide.
3. **`core.tab:reorder`**, if reorder ships — see the reorder disposition above.
4. **Tab persistence**, if the strip promises restore — see the persistence
   disposition above.

With items 1 and 2 landed the strip is renderable. With items 3 and 4 it is a
complete tab experience. Nothing else is needed: no new slot, no Core chrome,
and no change to the three verb names.

### What this entry does not decide

- It does not accept `PW-10`, close `OQ-052` or `OQ-056`, or revive
  `bitty-terminal.tabs`.
- It does not schedule the strip slice, name a milestone, or open an issue in
  `bitty-plugins`.
- It does not decide whether the `tabline` slot name is retired, the spellings
  of the tab read/control surface, whether persistence precedes the strip, or
  whether reorder is pointer-only or also key-bound.
- It amends no accepted document: ADR 0014 is cited as it stands.

## Verification backlog

- The recommended disposition does not close M1-31 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted artifact lands,
  reviewed by the architecture category owner per the
  [documentation workflow](../docs/development/documentation-workflow.md).
  `PW-10` acceptance (or an explicit superseding surface) is part of that
  artifact, not of this record. The landed verb slice narrowed what that
  artifact must decide — presentation, hosting, and reorder — and the
  [strip hosting and slot disposition](#strip-hosting-and-slot-disposition-2026-11-16)
  now settles hosting (plugin-owned, per ADR 0014) while recording — not
  accepting — the slot, reorder, and persistence answers.
- Any future admission starts from a new scoped task citing demonstrated
  demand and the accepted `PW-10` (or successor) surface — never from a
  revival of the deprecated `bitty-terminal.tabs` names, which stay on
  their dated removal path.
- Four questions stay open for the strip slice and are listed here so the next
  task picks them up rather than re-deriving them: whether the `tabline` slot
  name is retired under `OQ-056`; the spellings of a plugin-facing tab read and
  control surface; whether tab persistence (`TabSet::layout`,
  `crates/bitty-ui/src/tabs.rs:556`) precedes the strip or follows it; and
  whether `core.tab:reorder` is pointer-only or also key-bound.
- The residual list in
  [Review residuals carried as follow-ups (state at `9548f2e1`)](#review-residuals-carried-as-follow-ups-state-at-9548f2e1)
  is the queue for the next tab slice; a follow-up that lands should amend this
  record rather than open a second one.
