---
title: Tabs Scope Decision
description: Draft decision record for the M1-31 tabs/tab-bar question - records the landed Core tab verb projection as an implementation entry and keeps strip hosting reorder and overflow deferred without reviving the deprecated bitty-terminal.tabs surface
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
> states what landed, what the deferral still governs (strip hosting, reorder,
> overflow), and the residual that keeps the verbs unreachable from a user
> action. `OQ-052` stays **Open**, and this draft stays `draft`.

## Purpose

This record answers the M1-31 question — Core chrome versus declarative
surface for tabs — at the recommendation level, and states the exact path
that would close the M1-31 slice of `OQ-052`. It exists so the ownership of the
tab experience is a recorded Bitty position rather than an inference from
missing matches. Two positions are recorded side by side and must be read
together: the recommendation below, and the
[implementation entry](#implementation-record-core-tab-verbs-landed-2026-11-15)
that supersedes it for the verb surface.

In scope: who owns the tab strip experience and which Core primitives it
consumes. Out of scope: the workspace switcher that already ships; the
`PW-10` tab-strip contract itself (owned by the chrome-surface candidate);
the unified `Mod` contract and remaining `OQ-052` window forms; the
single-window slice contract, cited not redefined. This record must not
revive the deprecated `bitty-terminal.tabs` surface in any form.

## Source identity

| Source                                                                                                            | Role                                                                                               |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) | `OQ-052` owner-pending; the closure authority for this question                                    |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                 | P1 row "Tabs and tab bar": `missing (workspaces exist)`; registers `PW-10`                         |
| [Roadmap gap register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/roadmap/now-next-later.md)     | P1 row: plugin policy over Core primitives; layout stays with the compositor                       |
| [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)                                       | `PW-10` tab-strip candidate: panel projections for one `Window`/`Workspace` (order, active, close) |
| [Workspace Compositor Specification](workspace-compositor.md)                                                     | Accepted `Window -> Workspace -> LayoutTree -> View` hierarchy; layout stays with the compositor   |
| [Single-Window Vertical Slice](../product/vertical-slice-acceptance.md)                                           | Candidate slice: no tabs, no splits, no panes                                                      |

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

### Residual: the verbs are not reachable from a user action

The verbs are defined and registered but not reachable from any user action: no
`ctl` request, keymap binding, or Lua surface calls `core.tab:*`, and the
`tabline` slot placement is still `UiSlotPlacement::Unsupported`, so nothing
paints a strip. What landed is the named, validated, registered Core verb
surface and the Stack-free projection behind it; dispatch, strip hosting, and
reorder/overflow UX remain open.

### Review residuals carried as follow-ups

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

## Verification backlog

- The recommended disposition does not close M1-31 on its own: the issue
  stays open (Related, not Closed) until the owner-accepted artifact lands,
  reviewed by the architecture category owner per the
  [documentation workflow](../docs/development/documentation-workflow.md).
  `PW-10` acceptance (or an explicit superseding surface) is part of that
  artifact, not of this record. The landed verb slice narrows what that
  artifact must decide — presentation, hosting, and reorder — and settles
  nothing about it.
- Any future admission starts from a new scoped task citing demonstrated
  demand and the accepted `PW-10` (or successor) surface — never from a
  revival of the deprecated `bitty-terminal.tabs` names, which stay on
  their dated removal path.
- The residual list in
  [Review residuals carried as follow-ups](#review-residuals-carried-as-follow-ups)
  is the queue for the next tab slice; a follow-up that lands should amend this
  record rather than open a second one.
