---
title: Panel Generation Ownership Decision
description: Draft decision record for panel ownership across plugin generations, covering identity survival, the lifecycle mapping, rebind authority, bounded recovery, and the required test matrix
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 87
---

# Panel Generation Ownership Decision

## Document status

> Status: **draft, re-reviewed against the current tree; blocking gaps
> remain.** The accepted
> [Panel Runtime RFC](panel-runtime-rfc.md) fixes the panel lifecycle, panel
> identity, generation addressing, and the panel capability families, but it
> states nothing about what happens to a panel when the plugin generation that
> created, drives, or presents into it ends. The accepted
> [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md)
> fixes per-plugin generation ownership and reload ordering but never mentions
> panels. This document records the direction that closes that seam, states
> which parts it decides and which stay open, and names the successor
> acceptance that would make it binding.
>
> An independent security review recorded in `bitty-docs`
> (`docs/security/panel-generation-ownership-review.md`) withheld acceptance
> with eight blocking gaps. The revision that answered it addressed all eight
> against `bitty` at `7ac871d4` and, where the record was wrong about the code,
> recorded the code as it is rather than restating the earlier claim: the
> scene path already carries a controller binding with a generation fence, the
> component-request teardown is plugin-scoped rather than generation-scoped,
> plugin-created panels allocate without a workspace, and the restore key has
> no persisted encoding. It accepts nothing, promotes nothing to **Verified**
> or **Compatible**, changes no accepted text, and does not describe shipped
> behavior.
>
> A second independent re-review
> (`docs/security/panel-generation-ownership-rereview.md`) confirmed seven of
> the eight and recorded three blocking findings in the new bind and derivation
> text: the derivation read a predecessor set that the same section deleted
> first and never installed its result (`B-1`), workspace membership resolved
> from a source with no referent (`B-2`), and the release list for generation
> disposal was carried out only at the next bind (`B-3`). That revision
> answered `B-1` to `B-3` in place, without weakening a rule either review
> accepted.
>
> A third independent re-review
> (`docs/security/panel-generation-ownership-third-review.md`) closed `B-1`
> and `B-3`, kept `B-2` open because the identity step named accessors and an
> id the tree does not contain, and recorded one new blocking finding, `B-4`:
> the unbind release deleted the grant ceiling that the bind's phase 0 must
> read before a successor binds. That revision answered both in place. `A.7`
> states the workspace identity step as a bounded, fail-closed prerequisite
> with its own acceptance test instead of claiming the id already exists, and
> the generation edge now writes a bounded retired-ceiling tombstone before it
> deletes the live grant row, which phase 0 reads across a reload. It accepts
> nothing, promotes nothing to **Verified** or **Compatible**, changes no
> accepted text, and does not describe shipped behaviour. Owner acceptance and
> a fourth security review were still required.
>
> A fourth independent review
> (`docs/security/panel-generation-ownership-fourth-review.md`) closed `B-4` in
> text, kept `B-2` open because `A.7` was stale against current `bitty`, and
> added `B-6` because `PGO-7` and `PGO-18` could pass with the ceiling ignored.
> That revision rewrote `A.7` against `bitty` `cec83552` and made the two rows
> discriminating. Two merges now move the implementation facts without
> settling the record:
> [bitty#2889](https://github.com/bitty-terminal/bitty/pull/2889) merged as
> `b0d86eee` wires the `bitty.panel.create` backend to the Core-published
> workspace id and returns `E_UI_UNAVAILABLE` when no workspace resolves, and
> [bitty#2890](https://github.com/bitty-terminal/bitty/pull/2890) merged as
> `6bc0c5fa` implements the retired-ceiling tombstone, the `CeilingLost`
> refusal, the empty-versus-missing distinction, live-row precedence, the
> live-panel capacity bound with fail-closed insertion, and tombstone disposal.
> The production `N -> N+1` `rebind_panel` two-phase boundary and a
> workspace-close entry point still do not exist, and the fix is enforced at
> the existing release/bind seam. A fifth independent review and a code-side
> conformance audit on [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476)
> confirmed `B-2` closed on the mechanism and `B-5` implemented at the
> release/bind seam, while noting remaining stale prose in `A.2`, `D.1`, and
> `D.2`, the narrow `B-6` split in `PGO-22` (explicit empty-ceiling and
> missing-source refusal sub-cases), and the thirteen then-unimplemented
> code-side items that still block issue closure. This revision synchronizes
> those specification passages and splits `PGO-22` into four sub-cases. It accepts
> nothing, promotes nothing to **Verified** or **Compatible**, changes no
> accepted text, and does not describe shipped behaviour. Owner acceptance,
> the remaining code-side implementations, and a subsequent security sign-off
> are still required.
>
> The 2026-11-10 re-review re-derived every mechanism claim in this record
> read-only against `bitty` `origin/main` `23ff0f6c` and judged the six
> acceptance bullets on [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476)
> against it. Four of the thirteen code-side items the 2026-11-05 audit listed
> had landed at `7dd0a8ec` (the four-family unbind release with
> `GenerationReleaseRecord`/`unbind_release_count`, the two disposal edges in
> `PanelLifecycle::can_transition`, and the `(WorkspaceId, PersistentId)`
> restore key with the `StableIdentity` refusal), and the rows and decision
> text that still described the pre-`7dd0a8ec` tree are corrected in this
> revision. The verdict does not move: no ownership field, no production
> `rebind_panel`, no placeholder or reason vocabulary, no workspace-close
> disposal path, and no `PGO` row exists, so four of the six acceptance bullets
> have no landed artifact and two have a tested mechanism with no production
> caller. The record stays `status: draft`.

## Purpose and scope

Two accepted contracts each own one half of a panel's life, and neither owns
the join. The Panel Runtime RFC owns the panel
(`Declared -> Created -> Mounted -> Focused -> Suspended -> Disposed`,
`(PanelId, Generation)` addressing, `StaleHandle` rejection, the closed
`panel.*` capability family). The Plugin Host Runtime RFC owns the plugin
generation (one VM per `(PluginId, generation)`, teardown of generation `N`
before `N+1` activates per FS-6, `Suspended` retaining grants and disposed
generations releasing memory, handles, tasks, and timers).

Nothing states:

- whether a panel survives the disposal of the generation that created it;
- what identity a successor generation may use to find the panel it used to
  drive, and what a stale `PanelId` still means;
- which panel state a panel holds while its driver is `Suspended`, `Disposed`,
  crashed, disabled, or mid-reload;
- what authority a rebound panel carries, given that panel grants are keyed
  `(PanelId, generation)` and today cleared only on disposal;
- what the user sees when the driver is gone — a placeholder, an unavailable
  surface, or nothing at all;
- which tests would prove any of the above.

In scope: the ownership split between the workspace and the plugin generation,
identity survival and the restore key, the panel-state to generation-state
mapping including crash, disable, and reload-mid-mount, rebind authority,
bounded recovery for a missing, denied, or older driver, and the required test
matrix.

Out of scope and owned elsewhere: panel placement and the `View` versus
`PanelId` encoding (draft, [Panel Placement Decision](panel-placement-decision.md));
the non-terminal content path and Core scene ownership (draft,
[Panel Content Scene Path Decision](panel-content-scene-path-decision.md));
panel lifecycle, focus routing, the Event Bus, and the bounded panel resources
(accepted, [Panel Runtime RFC](panel-runtime-rfc.md)); the `Workspace ->
LayoutTree -> View` hierarchy, decoration, and interaction atomicity
(accepted, [Workspace Compositor Specification](workspace-compositor.md));
per-plugin VM lifecycle, reload triggers, and queue drain (accepted,
[Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md));
per-plugin instruction, memory, task, and queue ceilings (accepted,
[Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md));
restart persistence, whose contract stays open (`RFC-OQ-9`).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture, invariant 2 (no ambient file, network, or
  process authority for Lua), invariant 3 (presentation never Terminal Truth),
  invariant 4 (no plugin execution on the terminal, render, or input hot
  paths), invariant 7 (bounded inputs).
- [Core Ontology and Identity Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md)
  (accepted): `WorkspaceId` **owns** panels, `PanelId` is scoped under a
  workspace, `GenerationId` is "a fencing generation for reloads, leases, and
  handoffs" whose old generations "are rejected after handoff", panel
  presentation "never confers authority", and the Restore/Persistence
  separation (restore re-derives volatile structure from explicit, consented
  persistence).
- [Panel Runtime RFC](panel-runtime-rfc.md) (accepted): the lifecycle, the
  `PanelId != ViewId != TerminalId` identity split, generation addressing with
  `StaleHandle`, `panel.provider`/`panel.create`/`panel.focus`/`panel.overlay`,
  focus routing rules, PR-1 through PR-12, and failure semantics FS-P1
  through FS-P5.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted): the
  `Instance -> Window -> Workspace -> LayoutTree -> View` hierarchy, Core-owned
  decoration, and validate-then-commit interaction atomicity.
- [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md)
  (accepted): one VM per `(PluginId, generation)`, A.5 generation ownership,
  and the FS-6 rule that generation `N` is disposed before `N+1` activates.
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  (accepted): RC-1, RC-2, RC-4, RC-5, RC-11, and FS-2/FS-4/FS-6, which this
  record reuses and does not extend.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  (governance): row `T-25` names authority carry-over across a panel generation
  boundary as the abuse case this record's fence exists to prevent. The row is
  a requirement, not evidence, and it claims no implemented defense.

## Terminology

| Term                        | Meaning in this document                                                                                                                                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel container             | The workspace-owned slot and its panel identity: placement, attachment, title, presentation mode, and the visible surface. Outlives any one plugin generation. Only panels addressed by `bitty.panel.*` verbs are containers (see [Decision A](#decision-a-ownership)).                              |
| Panel content               | What the container currently presents: a terminal grid, a declarative scene, a browser surface, or a helper handle. Owned by the generation that produced it.                                                                                                                                        |
| Controller                  | The plugin generation currently bound to a panel, at most one per panel. A panel may have no controller.                                                                                                                                                                                             |
| Panel allocation generation | The `Generation` inside `(PanelId, Generation)`. Monotonic, stamps the allocation epoch, and makes a superseded handle fail with `StaleHandle`.                                                                                                                                                      |
| Controller generation       | The plugin activation generation that drives a panel — the counter the runtime already sets as `ui_epoch` on plugin services at activation. Never the panel allocation generation, and never compared with it.                                                                                       |
| Plugin generation           | The `(PluginId, generation)` pair that owns one VM, its grants, tasks, timers, and queues, per the Plugin Host Runtime RFC A.5.                                                                                                                                                                      |
| Controller binding          | The recorded link from a panel container to the controller generation that currently drives it. Exists today only for the `terminal`-slot scene panel (`HostPanel { owner, epoch }`); absent on `bitty.panel.create` panels.                                                                         |
| Rebind                      | Binding a new controller generation to an existing panel container without disposing the container or re-minting `PanelId`.                                                                                                                                                                          |
| Placeholder                 | The explicit, non-interactive panel presentation that names a missing or unavailable controller. Never an empty surface and never a silent orphan.                                                                                                                                                   |
| Restore key                 | The persisted identity pair a restart uses to re-attach a panel container: `(WorkspaceId, PersistentId)`, never a `PanelId`. The tuple is decided and is carried by `PanelRestoreKey`; the owner field, the encoding's index-to-`WorkspaceId` resolution, and a production restore caller stay open. |
| Retired-ceiling tombstone   | The bounded per-panel record the edge release writes before deleting a departed controller generation's grant row: `(owner, PanelId, ended controller generation) -> captured grant set`. Bind phase 0 reads it across a reload; at most one entry exists per `(owner, panel)`.                      |

## The gap this record addresses

The direction is not a preference; the corpus already assumes both halves
without joining them:

- [Workspace-Native UI Runtime](ui-runtime-candidate.md) records that "plugin
  generation reload and unload are plugin-host concerns and are not a side
  effect of closing a panel" — the panel-to-plugin direction — and leaves the
  reverse direction unstated.
- [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)
  already treats a GUI content handle as generation-owned: "if a record's
  owner generation is no longer active, Core restores the terminal with
  `crashed` or `unloaded`", with a closed release-reason vocabulary
  (`dismissed`, `closed`, `quit`, `suspended`, `reloaded`, `disabled`,
  `crashed`, `unloaded`).
- [Chrome Surface Contract](chrome-surface-contract-candidate.md) states that
  "suspend, dispose, and reload release the scene, the bind, and the Core
  panel", which conflates the two halves: releasing the scene and the bind is
  the direction this record keeps, while releasing the panel container on every
  reload is the alternative it rejects (see [Decision A](#decision-a-ownership)).
- [Help Overlay Ownership Design](help-overlay-ownership-design.md) requires
  that "no stale panel or stale rows survive" a crash, disable, or reload,
  which is satisfiable only if a panel distinguishes "my controller is gone"
  from "I was closed".

Two behaviours ship today, and they fail in opposite directions
([Implementation status](#implementation-status)):

- **The scene path has the fence and destroys the container.** The
  `terminal`-slot scene panel is created by Core and records `owner` and
  `epoch`; `ensure_panel` refuses a different generation; suspend, dispose, and
  activation rollback release the owner, and release disposes the panel. That
  is the rejected "generation-owned ephemeral panel" alternative, shipped for
  one path.
- **The `bitty.panel.create` path has no fence and keeps the container.** A
  panel created by a plugin generation carries no record of that generation, so
  a reload leaves it running with whatever grants it had and no owner, and
  nothing bounds it.

Neither behaviour is the contract this record decides. Both must move, and the
record states which path each of its rules governs rather than claiming that
no code path observes a generation change.

## Implementation status

Point-in-time evidence from `bitty` at `origin/main` revision
`7ac871d43f1e2995459e93d425ea385a44612e75` (2026-11-03), read as text with no
checkout, no build, and no test run, except the workspace rows, which were
re-read at `cec83552`, the create-path and grant-ceiling rows, which were
re-read at `b0d86eee` and `6bc0c5fa` (2026-11-05), and the grant-lifecycle,
state-machine, overlay, and restart-persistence rows, which were re-read at
`7dd0a8ec` (2026-11-09) and again at `23ff0f6c` (2026-11-10). These rows
record what exists; none is a conformance claim against this record, and none
promotes anything to **Verified** or **Compatible**. Line numbers drift; the file path
is the durable citation.

| Surface                      | Status at `7ac871d4` unless noted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel registry and lifecycle | `crates/bitty-runtime/src/registry/panel.rs` holds `PanelRegistry` with `create_panel`, `mount_panel`, `unmount_panel`, `focus_panel`, `suspend_panel`, `resume_panel`, `dispose_panel`, monotonic generation, `StaleHandle`, `GenerationExhausted`, and MRU-per-workspace focus.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Panel record contents        | `PanelRecord` carries `id`, `generation`, `state`, `panel_type`, `workspace: Option<WorkspaceId>`, `view`, `title`, and `last_controller_generation: Option<Generation>` (added at `6bc0c5fa` for D.2 phase 0). It carries **no** owner, plugin, provider, or current-controller binding field, and `workspace` is written only by `create_panel`; no assignment path exists after creation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Panel allocation generation  | `create_panel` bumps the registry-wide counter and stamps the result on the record, so a panel's `Generation` is the allocation epoch of the whole registry, not a per-panel fencing counter. Disposal retires the record and bumps the counter again.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Plugin-created panels        | `bitty.panel.create` reaches the host through `PanelCreateHandler = Rc<dyn Fn(&str) -> Result<(u64, u64), BridgeError>>` (`crates/bitty-runtime/src/plugin_runtime/services.rs`), which is handed only a type string. The production backend (`crates/bitty-terminal/src/plugin_runtime.rs`) reads the Core-published `focused_workspace` cell and calls `create_panel(parsed, Some(workspace))` (`b0d86eee`), so a created record is attributed to the presented workspace; a `None` cell returns `E_UI_UNAVAILABLE` before any record is allocated. The registry behind it is process-owned and shared by every generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Workspace membership         | Membership is assigned at creation and only when the caller passes `Some(WorkspaceId)`. `create_panel` then charges `max_panels_per_workspace`, inserts into `workspace_panels`, and seeds `focus_per_workspace`; with `None` it charges only the window-wide `max_panels_per_window` (which counts every record), never appears in a workspace list, and never enters the focus MRU. The registry also declares `active_workspace: Option<WorkspaceId>`, assigned only inside `create_panel` when it is `None` and never read: write-only and registry-global, not a per-generation fact. `Runtime::focused_view()` (`crates/bitty-runtime/src/runtime/layout_focus.rs`) returns the focused `ViewId` or `None`; `Runtime::focused_workspace_id()` (`crates/bitty-runtime/src/runtime/workspaces.rs:268`) resolves it to the presented slot's minted id or `None`, and the production create backend reads it through the Core-published `focused_workspace` cell (see the workspace identity row).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Workspace identity           | `WorkspaceSlot` (`crates/bitty-runtime/src/runtime/workspaces.rs:75`) carries `pub id: WorkspaceId`, minted once by `Runtime::mint_workspace_id` (`:282`) when the slot is created and never reused. `Runtime::active_workspace_id` (`:251`) always answers for the presented workspace; `Runtime::focused_workspace_id` (`:268`) reads `focused_view()`, verifies the leaf is in the live layout, and returns the presented slot's id or `None`. The id lives on the slot that holds `layout` and `focus`, not on an index-keyed side table. `TerminalRegistry::create_workspace` (`crates/bitty-runtime/src/registry/terminal.rs:336`) still mints from its own `next_workspace_raw` counter, but its callers are tests; it remains a separate counter, neither bridged to the slot id nor retired. `TerminalRegistry::active_workspace` (`:393`) and `set_active_workspace` (`:402`) still have no production callers. The create path is wired: `bitty.panel.create` reads the Core-published `focused_workspace` cell, calls `create_panel(parsed, Some(workspace))`, and returns a `BridgeError` with the `E_UI_UNAVAILABLE` code when no workspace resolves; `PanelError` itself still has no such variant, and the mapping stays at the bridge seam. The app tick refreshes the cell through `Runtime::focused_workspace_id`, so the resolver has a production caller. [bitty#2889](https://github.com/bitty-terminal/bitty/pull/2889) merged as `b0d86eee`; positive and negative tests cover resolution and the fail-closed branch. |
| Grant lifecycle              | Grants live in `capabilities: HashMap<(PanelId, Generation), BTreeSet<String>>`, written by `grant_panel_capability` and read by `is_panel_capability_granted` and `require_panel_capability`. `dispose_panel` now runs `release_generation_scope` for the bound controller generation before its other teardown: that writes the retired-ceiling tombstone and `last_controller_generation`, then removes `capabilities[(panel_id, generation)]`; a panel that never mounted has no ceiling, and panel disposal drops any tombstone. The key's `Generation` is the allocation epoch, which a reload does not change, so a reload preserves every grant unless the release/bind seam is used; `derive_rebind_grants` and `install_rebound_grants` exist, but no production `rebind_panel` caller invokes them yet. The same release also drains the panel's queued bus events, unregisters the panel commands the ending generation registered, dismisses the overlays attributed to `(PanelId, generation)`, and writes one `GenerationReleaseRecord` per panel, read back through `unbind_release_count` and `unbind_release_record` (`7dd0a8ec`). Its only production caller is still `dispose_panel`, which retires the record, so the release runs at container disposal and not yet at the plugin generation boundary.                                                                                                                                                                                                                  |
| Component-request teardown   | `drop_plugin(plugin_id)` in `crates/bitty-runtime/src/plugin_runtime/component_requests.rs` retains `submissions` on `plugin_id`, filters `in_flight` on `plugin_id`, and retains `tickets`/`completed` on `owner != plugin_id`. It is **plugin-scoped**: none of those structures carries a generation, so "one generation's tickets" was wrong. No panel equivalent exists, generation-scoped or otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Scene-panel binding          | `crates/bitty-runtime/src/scene_host.rs` keeps `HostPanel { handle, view, owner: String, epoch: u32 }`. `ensure_panel` refuses a different `owner` or `epoch` with `E_UI_UNAVAILABLE` ("held by another plugin generation"). `release_owner(owner, epoch)` drops that generation's scenes and calls `release_panel`, which calls `dispose_panel`; `detach` does the same when a generation's last scene goes. The panel is created with `create_panel(PanelType::Rich, None)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Generation boundary trigger  | `clear_ui_blocks` (`crates/bitty-runtime/src/plugin_runtime/services.rs`) calls `release_owner(&plugin_id, ui_epoch)`. It runs on suspend, on dispose, and on activation rollback from `crates/bitty-runtime/src/plugin_runtime/mod.rs`. The scene path therefore disposes its panel container at each of those boundaries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Controller generation value  | `ui_epoch: Cell<u32>` is set from the plugin entry's activation counter (`set_ui_epoch(entry.generation)`), which activation advances with `saturating_add(1)`. Handle minting masks it to 30 bits (`UI_HANDLE_EPOCH_BITS`); `HostPanel.epoch` stores the unmasked `u32`. This is a different counter and a different type from the registry's `Generation(u64)`, and nothing in code compares the two.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Panel state machine in code  | Two tables, not one. `bitty_ui::panel::PanelState` (six states) is what `PanelRecord.state` holds, and its `can_transition` permits `Created`, `Mounted`, `Focused`, and `Suspended` to `Disposed`. `crates/bitty-ui/src/panel_state.rs` adds a seventh `Closed` state in `PanelLifecycle`, whose `can_transition` now also permits `Created -> Disposed` and `Focused -> Disposed` (`7dd0a8ec`, one test per edge), so the two tables agree on every disposal edge. `dispose_panel` still consults neither table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Panel disposal call sites    | Outside the registry, `dispose_panel` is called only from `crates/bitty-runtime/src/scene_host.rs`. No workspace-close path, no `panel.close` backend, and no `panel.destroy` backend disposes a panel; `workspace_panels` has no accessor and no bulk dispose-by-workspace operation exists. `PanelRuntime::dispose_panel` also unbinds placement and removes the panel's lease and scene entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Panel lease table            | `PanelRuntime.leases: HashMap<PanelId, PanelLeaseEntry>` (`crates/bitty-runtime/src/registry/host.rs`) is inserted `idle()` at `create_panel` and removed at `dispose_panel`. `PanelLease::check_write` gates the panel write path in `crates/bitty-runtime/src/runtime/submit_host.rs`. The holder is an opaque `LeaseHolder` with no generation dimension, and the table is documented as a UX metaphor recording who may drive a panel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Overlay attribution          | `Overlay` (`crates/bitty-ui/src/panel.rs`) carries `id`, `kind`, `bounds`, `text`, `tooltip`, `generation: u64`, and `truncated` — no panel, plugin, or controller owner on the type. The registry keeps the attribution beside it in `overlay_attribution: HashMap<u64, (PanelId, Generation)>`, written by `create_panel_overlay` and released by `release_attributed_overlays` (`7dd0a8ec`), so `release_generation_scope` — and therefore `dispose_panel` — dismisses the overlays attributed to `(PanelId, generation)`. `create_panel_overlay` has no production caller, so the attributed release dismisses 0 overlays on the live path and the family is implemented-only (unwired). `OverlayManager` offers `dismiss(id)` and a whole-manager `clear()`, and `clear()` runs only in `PanelRegistry::dispose()`. Plugin presentation surfaces are the exception: `crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs` keeps a `(plugin_id, handle)` session that Core tears down on suspend, unload, disable, crash, rollback, and generation change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Content and capture release  | `clear_ui_blocks` clears the generation's block registry and spec overlay handles and releases its scenes and bind; suspend and dispose additionally revoke the generation's targeting lenses and the plugin-wide overlay capture. Content, capture, and scene release are therefore already generation-scoped on this path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Restart persistence          | `crates/bitty-ui/src/panel_persist.rs` carries `PersistedPanel { id: PanelId, key: PanelRestoreKey { workspace: WorkspaceId, persistent: PersistentId }, title: String }` and the `v=<n>;id=<n>;ws=<n>;pid=<text>;title=<text>` encoding at `PERSIST_MANIFEST_VERSION = 2` (`7dd0a8ec`); `id` is documented as advisory and is never used to re-attach. `plan_restore` refuses `PersistencePolicy::StableIdentity` with `ManifestError::StableIdentityUnsupported` and returns the records unchanged under `Ephemeral`, so the caller mints fresh ids; `stable_identity_is_refused_at_the_restore_entry` covers the refusal. `PersistencePolicy` still has **no `Default` impl** and no production selector, and `plan_restore` still has no production caller. No field carries the creating owner name, and `decode_manifest` wraps the persisted `ws` integer in `WorkspaceId::new`, so the index-to-`WorkspaceId` resolution at restore stays open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Plugin reload ordering       | `crates/bitty-plugin-host/src/lifecycle.rs` implements FS-2's ladder, FS-4 records, and `reload_generation`, which disposes generation `N` before `N+1` activates and restores `N` when activation fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

### Code grounding

The evidence above was read from `bitty` `origin/main` at
`7ac871d43f1e2995459e93d425ea385a44612e75` unless a row names a later
revision. Primary files:
`crates/bitty-runtime/src/scene_host.rs`,
`crates/bitty-runtime/src/plugin_runtime/services.rs`,
`crates/bitty-runtime/src/plugin_runtime/mod.rs`,
`crates/bitty-runtime/src/plugin_runtime/component_requests.rs`,
`crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`,
`crates/bitty-runtime/src/registry/panel.rs`,
`crates/bitty-runtime/src/registry/host.rs`,
`crates/bitty-runtime/src/registry/lease.rs`,
`crates/bitty-runtime/src/runtime/submit_host.rs`,
`crates/bitty-terminal/src/plugin_runtime.rs`,
`crates/bitty-ui/src/panel.rs`, `crates/bitty-ui/src/panel_state.rs`,
`crates/bitty-ui/src/panel_persist.rs`, and
`crates/bitty-plugin-host/src/lifecycle.rs`.

## Decision A: ownership

**Decided in this record: ownership splits at the content boundary.** The
**panel container is workspace-owned and persistent**; **panel content and the
controller binding are generation-owned and ephemeral**.

1. A panel container belongs to its workspace, matching the accepted ontology
   rule that `WorkspaceId` owns panels and `PanelId` is scoped under a
   workspace. Disposing a plugin generation never disposes a panel container
   and never re-mints its `PanelId`.
2. Panel content is generation-owned. Disposal of generation `N` releases its
   scene, its bind, its GUI content handle, its subscriptions, its tasks, its
   timers, and its queued events, consistent with the plugin host rule that
   "disposal drops generation N's queued events and its subscriptions" and
   with the closed release-reason vocabulary the GUI content path already
   uses.

   **The release runs at the generation edge itself and needs no successor.**
   A generation that is disposed, crashes, or is disabled with no `N+1` runs no
   bind, so a release that existed only inside a bind's phase 1 would never run
   for it. On the terminal edge the container therefore releases, for that
   controller generation: its grant rows for `(PanelId, N)`, the panel's queued
   events, the panel commands `N` registered, and `N`'s overlay attribution —
   and it completes that release **before** presenting the placeholder, so the
   placeholder is never shown over a departed generation's rows. A failed
   release leaves the panel unbound and refuses every verb, with one
   FS-4-style record naming the family that failed: the same fail-closed shape
   as a failed bind, and never a re-bind of `N`. The release is observable by
   construction — one counter entry per panel in the panel registry names the
   most recently ended controller generation and advances once per family
   released; the entry is created even when a family releases nothing, so
   "nothing to release" is distinguishable from "the release never ran". The
   entry is replaced at the panel's next edge, dropped on workspace close or
   panel disposal, and read through the required
   `unbind_release_count(PanelId)` accessor; a per-generation entry that
   accumulates one row per reload is the unbounded growth this record forbids.
   The queue side is also readable through `queued_events_for_panel`.

   **The grant ceiling survives the edge in a bounded retired-ceiling
   tombstone.** Before the release deletes the `(PanelId, N)` live grant row,
   it captures the row's set and writes a tombstone keyed `(owner, PanelId, N)`
   — the owner and controller generation of the binding it ends. When the row
   does not exist — a generation that bound but held no grants — the tombstone
   is still written, with an empty set, because "ended with nothing" is a fact
   the successor must be able to distinguish from "the record was lost".

   **The key is the binding pair, not the panel alone.** `PanelId` is
   registry-scoped and unique, so the workspace and the process instance are
   implied by the panel record and a tombstone never crosses a registry
   boundary. The owner is not implied: two plugins can carry the same
   controller generation number, and cross-plugin adoption is undecided (B.6),
   so a tombstone keyed only by `(PanelId, N)` could hand a successor a wider
   ceiling than its own predecessor held (`N-13`). Phase 0 accepts a tombstone
   only when both its owner and its generation match the predecessor the panel
   record names; a bind whose owner differs from that predecessor's owner is
   refused as a lost record until B.6 admits a cross-owner rule. The table
   holds **at most one entry per `(owner, panel)`**, so while only same-owner
   rebinds are admitted it holds at most one per panel: a new tombstone for the
   same owner and panel replaces the previous one.

   **Only the bound controller's edge writes a tombstone.** A generation that
   has already been displaced — the panel record names a different controller
   generation — releases its own grant rows and capture state but writes no
   tombstone. Its late edge therefore cannot replace the current controller's
   tombstone or erase a successor's ceiling (`N-16`).

   **The table is capped by live panels, not by an absolute constant.** The cap
   is the registry instance's configured `max_panels_per_window`, and an
   insertion never evicts a live panel's tombstone. [bitty#2890](https://github.com/bitty-terminal/bitty/pull/2890)
   (`6bc0c5fa`) removed the eviction path: `PanelRegistry::retain_grant_ceiling`
   in `crates/bitty-runtime/src/registry/panel.rs` takes its capacity from
   `self.config.max_panels_per_window`, clamped by the structural
   `MAX_RETAINED_GRANT_CEILINGS = MAX_PANELS_PER_WINDOW` bound, which remains in
   the code as an absolute upper bound rather than the effective cap; an
   insertion that would still exceed it fails the release closed with
   `PanelError::ResourceExhausted` — live row retained, panel unbound, one
   FS-4-style record naming the tombstone step — rather than evict any entry
   (`N-14`). Because a disposed panel drops its entry, the table cannot hold
   more entries than live panels, so the configured cap is sufficient. An entry
   is dropped when a successor successfully binds the same panel, when the
   panel's next controller generation ends and writes its own tombstone, or on
   workspace close or panel disposal, whichever comes first.

   The tombstone write is part of the release, not an optimisation: if it
   cannot be written, the release fails closed without deleting the live row,
   the panel stays unbound, every verb is refused, and one FS-4-style record
   names the tombstone step; a later bind also refuses rather than proceed
   without a ceiling (D.2 phase 0).

   **An empty tombstone is not a missing tombstone.** An empty tombstone means
   the predecessor ended without holding panel-scoped grants, so `P` is a real
   empty ceiling and nothing of the predecessor survives; a missing tombstone
   for a panel whose record still names a previous controller means the ceiling
   record was lost, and the bind refuses (D.2 phase 0). A reload never falls
   back to "there is no predecessor row, so there is no ceiling".

   A bind that displaces a still-bound predecessor repeats the release in
   phase 1; that repetition is a second caller of the same release for the race
   where a successor binds before the predecessor's edge, and it is not the
   mechanism that satisfies this rule. On the reload path the edge release and
   its tombstone complete before `N+1` activates (C.5), so phase 0 reads the
   tombstone rather than a row the edge already deleted.

3. The controller binding is generation-fenced by the **controller
   generation**. A container holds at most one controller (the at-most-one rule
   the Panel Runtime RFC applies to `PanelId -> ViewId`), and a call that names
   a controller generation other than the bound one fails closed before any
   content, grid, or PTY access, mirroring `StaleHandle`.
4. Rebind preserves the container and its presentation facts — attachment,
   `PresentationMode`, workspace membership, and title — and replaces the
   content. A rebind is not a new allocation, so it charges no additional
   slot against PR-1 (`max_panels_per_workspace`) or PR-2
   (`max_panels_per_window`).
5. A panel with no bound controller is a valid, representable state. It is not
   a dangling reference: it holds its container, presents a placeholder (see
   [Decision E](#decision-e-bounded-recovery)), and accepts no command,
   content, or capture verb.
6. **Scope: which panels are containers.** A container is a panel addressed by
   a `bitty.panel.*` verb: it has an identity the user can see, a title, a place
   in the workspace layout, and a focus history. The `terminal`-slot scene
   panel that `SceneHost` creates is **not** a container under this record. It
   is Core-created on first `ui.mount("terminal", …)`, has no title, no
   persisted identity, no user-facing close, and no `bitty.panel.*` verb; its
   placement is whichever leaf the published target names, and it exists only
   to host one generation's scene. Its lifetime therefore stays
   generation-scoped, and `release_panel` disposing it on suspend, dispose, and
   reload is the correct behaviour for it — not the rejected alternative.
   Decision A's container rules, the placeholder, and the rebind rules apply to
   containers; the scene panel is out of their scope. What the scene path does
   contribute is the fence: `ensure_panel`'s owner/epoch refusal is the
   precedent this record generalizes, not a behaviour to delete.
7. **Workspace membership is assigned at creation, by Core, from the focused
   leaf of the presented workspace.** The creating generation never names a
   workspace and cannot: the create seam hands it only a panel type string. The
   referent is fixed: the focused leaf of the workspace the instance presents,
   read through `Runtime::focused_view()`
   (`crates/bitty-runtime/src/runtime/layout_focus.rs`), which returns the
   focused `ViewId` or `None`. When the presented workspace has no focused
   view, or the instance presents no workspace, no workspace resolves: the
   create fails closed, allocates no record, charges no slot, and reports
   `E_UI_UNAVAILABLE` through the create mapping the merged backend now
   serves. That branch is reachable by construction, because
   `focused_view` is an `Option` and a workspace whose leaves are all closed
   has none; an always-answerable global pointer is exactly the fallback this
   rule forbids. A container with `workspace: None` is not a state this record
   permits. Two cases the seam makes explicit: `panel.create` carries no
   target, so a create with no target resolves by this same rule and never by a
   guessed or defaulted workspace, and a generation that presents nothing — no
   scene, no mount, no panel of its own — resolves identically, because the
   input is Core's presented workspace and never the calling generation's own
   surfaces. Such a generation does not fail resolution for presenting nothing;
   it fails only when Core has no focused view to read.

   **The identity that names that workspace exists in the runtime, and the
   create path now uses it.** At `bitty` `origin/main` revision `cec83552`
   (2026-11-05), `WorkspaceSlot` carries `pub id: WorkspaceId`
   (`crates/bitty-runtime/src/runtime/workspaces.rs:75`), minted once by
   `Runtime::mint_workspace_id` (`:282`) when the slot is created and never
   reused. `Runtime::active_workspace_id` (`:251`) always answers for the
   presented workspace, and `Runtime::focused_workspace_id` (`:268`) reads
   `focused_view()`, verifies the leaf is in the live layout, and returns the
   presented slot's id or `None`. The id lives on the same `WorkspaceSlot` that
   holds `layout` and `focus`, not on an index-keyed side table.
   `TerminalRegistry::create_workspace`
   (`crates/bitty-runtime/src/registry/terminal.rs:336`) still mints from its
   own `next_workspace_raw` counter, but its callers are tests; it remains a
   separate counter, neither bridged to the slot id nor retired, and no create
   path may consult it.
   `TerminalRegistry::active_workspace` (`:393`) and `set_active_workspace`
   (`:402`) still have no production callers. The earlier claim that no
   `WorkspaceId` is reachable from `Runtime`, that `WorkspaceSlot` carries no
   id, and that `TerminalRegistry::create_workspace` is the only minter is
   withdrawn: it was true at the previous pin and is false at this revision.

   The id space is the runtime's minted slot id, so "attributed to a
   workspace" names one bucket rather than two: the panel registry's
   `workspace_panels` bucket is keyed by exactly the value
   `focused_workspace_id` returns. A create never reads the terminal
   registry's separate counter. If a future path ever surfaced a
   terminal-registry id for the same workspace, the two would be different
   namespaces and the create must refuse rather than choose between them; this
   record does not authorize joining the counters. Core must not manufacture
   the id from an index, a `seq`, or another positional value, and must not
   accept one from the plugin.

   **The create path is wired.** [bitty#2889](https://github.com/bitty-terminal/bitty/pull/2889)
   merged as `b0d86eee` (2026-11-05): the runtime publishes the presented
   workspace's id into the plugin session (`focused_workspace`, refreshed by
   the app tick through `Runtime::focused_workspace_id`), and the production
   `bitty.panel.create` backend
   (`crates/bitty-terminal/src/plugin_runtime.rs`) reads that cell and calls
   `create_panel(parsed, Some(workspace))`. When the cell is `None`, the
   backend returns a `BridgeError` with the `E_UI_UNAVAILABLE` code before
   allocating a record; `PanelError` itself still carries no such variant, and
   the mapping stays at the bridge seam. No `panel.create` argument can reach
   or influence the id. The merged commit adds a positive test that the
   resolved id is the panel registry bucket key and a negative test that a
   create with no presented workspace allocates no record and returns
   `E_UI_UNAVAILABLE`. A create that cannot resolve must not allocate a
   record, charge a slot, or fall back to a global pointer.

   Acceptance remains two tests, because a resolver test does not prove the
   create path uses it: (a) **the focused view of a presented workspace
   resolves to the minted `WorkspaceId`, no plugin input can influence the
   result, and the id is the panel registry bucket key**; and (b) **a
   production `bitty.panel.create` with no focused leaf allocates no record,
   charges no slot, and returns `E_UI_UNAVAILABLE`, and no production create
   calls `create_panel(_, None)`**. The merged commit adds both tests; this
   record still treats the decision as contingent on them passing in the
   production backend, in the same sense that the restore key is contingent on
   `RFC-OQ-9`. The restore path's index-to-`WorkspaceId`
   resolution stays open (see
   [Decision B](#decision-b-identity-and-the-restore-key)), but the create path
   and the restore path must share one resolution function so a create-time
   identity and a restore-time index cannot diverge.

   The recorded workspace is the lifetime and bind-time referent: the merged
   create path writes the resolved id into `PanelRecord.workspace`; no later
   assignment path exists, and a bind reads it from the record rather than
   re-resolving it, so a focus change, a mount,
   and a rebind cannot move a panel between workspaces (`focus_panel` already
   refuses a workspace argument that disagrees with the record).
   `PanelRegistry::active_workspace` is **not** the source and has no role
   here: it is a registry-global field assigned once inside `create_panel` when
   it is `None` and never read anywhere, so consulting it would attribute every
   later plugin panel to whichever create happened first. It is dead in code
   today and its removal is required work; no resolution path may read it in
   the meantime. A resolved workspace may be one in which the plugin holds no
   other grant: membership is attribution and PR-1 accounting, never authority,
   and authority stays the panel-scoped grant set plus the binding. Rebind
   preserves the recorded workspace and never re-resolves it, and an unbound
   placeholder stays attributed to it.

8. **PR-1 and PR-2 accounting.** A `Created` but unmounted container charges
   one workspace slot and one window slot from allocation, because it occupies
   a record and a workspace list entry; a `Declared` panel type charges
   nothing; a rebind charges nothing, including a rebind of an unbound
   placeholder, which already holds its slots; disposal releases both. A
   placeholder therefore keeps its slots until it is closed, and "rebind is
   free" is a statement about slots already held, not about slots that were
   never charged.

**Rejected: generation-owned ephemeral panels**, where the panel is a child of
the generation that created it and is disposed with it. Rejected because it
would delete the user's layout, focus history, and title on every plugin
reload and every installed-package `wake`; because it contradicts the accepted
`WorkspaceId` owns-panels relation; because a crash or a budget suspension
would then destroy workspace structure in response to a plugin fault, which
FS-P2 containment forbids; and because the accepted focus and restore rules
are written against a `PanelId` that outlives visibility changes.

**Rejected: no binding at all** (the `bitty.panel.create` shape). It leaves a
reloaded generation with no way to find its own panel, leaves a disabled
generation's panels live and unaudited, and makes "no stale panel survives"
unenforceable.

**Reconciled, not rejected: the scene-panel dispose-on-release.** The scene
panel is excluded by scope rule 6 rather than converted into a container,
because the object it would preserve has no user identity to preserve. Making
it a container would put an unbound placeholder into the focused terminal leaf
on every reload, which is worse than the discarded panel, and it would give a
Core-internal surface a workspace slot it never charged.

## Decision B: identity and the restore key

**Decided in this record.**

1. **`PanelId` survives a plugin reload.** It is not re-minted by the
   successor generation, not invalidated by generation disposal, and not
   renumbered by a rebind. It changes only on container disposal.
2. **`(PanelId, Generation)` survives a reload unchanged.** The panel
   allocation generation is an allocation epoch, not a controller fence; a
   reload therefore introduces no new panel `StaleHandle` class. Controller
   staleness is a separate, additional fence on the binding, carried as the
   controller generation, so the two generations are never conflated in one
   field and are never compared.
3. **A `PanelId` is not addressable authority.** Holding or guessing a
   `PanelId` grants nothing: a plugin reaches a panel only through a granted
   verb, and every such verb is checked against the controller binding before
   the panel is touched and again at use (see
   [Decision D](#decision-d-authority-on-rebind)). This restates the accepted
   "presentation never confers authority" rule at the identity level.
4. **A `PanelId` is not a restore key.** Restart re-mints a fresh `PanelId`.
   The restore key is `(WorkspaceId, PersistentId)`, where `PersistentId` is
   the manifest-declared, owner-scoped panel key and `WorkspaceId` is resolved
   from the persisted workspace at restore. Decision B fixes the tuple and the
   record that carries it now exists: `PersistedPanel` holds
   `key: PanelRestoreKey { workspace: WorkspaceId, persistent: PersistentId }`
   beside an advisory `id`, at `PERSIST_MANIFEST_VERSION = 2` with a
   `v=2;id=<n>;ws=<n>;pid=<text>;title=<text>` encoding
   (`crates/bitty-ui/src/panel_persist.rs`, `7dd0a8ec`), and `plan_restore`
   refuses `PersistencePolicy::StableIdentity` with
   `ManifestError::StableIdentityUnsupported` instead of resurrecting the
   persisted id. Three parts remain open under `RFC-OQ-9`, not decided here:
   no field carries the creating owner name, `decode_manifest` wraps the
   persisted `ws` integer in `WorkspaceId::new` so the index-to-`WorkspaceId`
   resolution at restore is still unresolved, and `plan_restore` has no
   production caller. That resolution and the create
   path's identity step (A.7) must be one resolution function, not two: restore
   must not carry an index-to-id mapping that a create would not use, or the
   two paths could attribute one panel to two workspaces.
5. **Until `RFC-OQ-9` is decided, nothing is restored.** This record fixes the
   key, not the persistence contract, the encoding, the version policy, or
   whether restart restore ships at all. Within that: **no caller may select
   `PersistencePolicy::StableIdentity` for panels**, because it reuses the
   persisted `PanelId`, which is the alternative this record rejects. The
   variant has no `Default` impl and no production selector today, so nothing
   selects it now; the rule exists so no future selector can resurrect an
   identity by choosing a variant, and the panel restore entry point refuses it
   explicitly with `ManifestError::StableIdentityUnsupported` (`7dd0a8ec`)
   rather than inheriting a "safe default" that a caller can change. The
   variant stays in the type for terminals and workspaces, whose
   identity question is a different one.
6. **Cross-plugin adoption is not decided here.** A successor generation of the
   same plugin re-attaches to a persisted panel without user action once a
   persistence contract exists. Whether a _different_ plugin may ever claim a
   persisted panel, and under what consent surface, is an open question (see
   [Open points](#open-points)); this record states no rule for it, so no
   implementer can read a consent rule out of it.

The consequence to state plainly: within one `Instance`, a panel is durable
across plugin generations; across a process boundary, a panel is not durable at
all until the persistence contract exists, and the key this record fixes has no
encoding to travel in.

## Decision C: lifecycle mapping

**Decided in this record.** Panel states are the accepted six, held in
`PanelRecord.state` as `bitty_ui::panel::PanelState`; the generation column
names the controller's state at which the panel state is legal. Any
combination not listed is illegal and fails closed. The seven-state
`PanelLifecycle` type is _not_ the registry's state and the registry cannot
represent `Closed`; where this record needs `Closed` it says so explicitly.

| Panel state | Legal controller generation states                       | Meaning                                                                                                            |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Declared`  | none; `Registered` (panel type declared in the manifest) | The provider declared the panel type. No `PanelId` exists, and nothing is charged against PR-1 or PR-2.            |
| `Created`   | `Activated`                                              | `PanelId` allocated, no attachment. Requires a live controller holding `panel.create`.                             |
| `Mounted`   | `Activated`, or none (placeholder)                       | Bound to a view. The placeholder case is the unbound container described in Decision E.                            |
| `Focused`   | `Activated`                                              | Mounted and owning input routing. Never reachable without an attached view.                                        |
| `Suspended` | `Activated`, `Suspended`, or none                        | Invisible without destroying the attachment, or unmounted with the attachment released.                            |
| `Disposed`  | any terminal generation state                            | Container retired: attachment, MRU entry, lease entry, commands, queues, grants, and overlay attribution released. |

Transition rules that follow:

1. **Controller `Suspended` does not suspend the panel.** A suspended
   generation detaches handlers and retains grants, so it can receive nothing;
   the panel therefore keeps its container and its state, loses its controller
   verbs, and presents the placeholder. It does not become `Suspended` itself,
   because `Suspended` means "invisible without destroying the attachment",
   which is a workspace fact, not a plugin fact.
2. **Controller `Disposed` never cascades to panel `Disposed`.** The panel
   becomes unbound, releases that generation's panel-scoped families through the
   unbind release in A.2 — which first writes the retired-ceiling tombstone
   before it deletes the generation's grant row — and then presents the
   placeholder. Only an explicit user close, workspace close, or an explicit
   recovery decision retires the container.
3. **Crash.** A generation that faults enters the FS-2 ladder and ends
   `Disabled`; the panel becomes unbound, releases that generation's
   panel-scoped families through the unbind release in A.2, presents the
   placeholder with reason `crashed`, and keeps its attachment and focus
   history. No automatic respawn, no retry loop: a crash-triggered reload would
   restart the same fault, which the reload contract already refuses for
   watcher-triggered failures.
4. **Disable.** User or policy disable behaves as crash with reason
   `disabled`, except that the placeholder names the disable rather than a
   fault, and re-enabling the plugin permits a rebind. A disabled plugin's
   panels remain visible until the user closes them; hiding them silently
   would be the orphan this record forbids.
5. **Reload mid-mount.** Because generation `N` is disposed before `N+1`
   activates, a mount that started against `N` must fail closed. The edge
   release and its tombstone complete before `N+1` activates, so the
   successor's phase 0 has the predecessor's ceiling to read rather than a row
   the edge already deleted (A.2, D.2). The mount is
   transactional in the sense the compositor already requires: the binding
   either commits against a controller that is still `Activated`, or commits
   nothing and leaves the panel in its pre-mount state (`Created`, or
   `Suspended` when it had an attachment). No panel is left half-mounted, and
   no view is left bound to a disposed generation. A refused mount is retried
   only by `N+1` re-issuing it, never by Core replaying the old request.
6. **Reload mid-content.** Content committed by `N` is released during `N`'s
   teardown, before `N`'s resources are dropped, so `N+1` never observes
   `N`'s scene, bind, or GUI handle. `N+1` starts with empty queues: queued
   events are never replayed into a successor generation.
7. **`Closed` is retained, and it is a seven-axis state only.** `Closed`
   ("hidden and unfocused, plugin still loaded") has no accepted counterpart
   and is not representable in `PanelRecord`. This record maps `Closed` to
   "container retained, controller still bound, content retained", and leaves
   its admission into the accepted lifecycle, and the registry representation
   it would need, to an RFC amendment (see [Open points](#open-points)).
8. **`Focused -> Disposed` and `Created -> Disposed` are legal in this
   record.** A workspace close routinely meets a focused panel and a reload
   discard meets an unmounted one, so neither transition may be refused.
   - `Focused -> Disposed` must release, in this order: input routing (focus
     moves to the next MRU entry, or to none when the workspace has no other
     panel), the view attachment, the MRU entry, the lease entry, the scene
     slot, panel commands, panel bus queues, panel grants, and the panel's
     overlay attribution. The loss is reported once.
   - `Created -> Disposed` must release the workspace slot charge, the window
     slot charge, panel grants, the lease entry, and any overlay attribution
     recorded for the panel between creation and disposal; it has no attachment
     and no MRU entry to release.

   The two code tables now agree on these edges and neither gates disposal:
   the six-state `PanelState::can_transition` permits both, the seven-state
   `PanelLifecycle::can_transition` gained both at `7dd0a8ec` with one test per
   edge, and `dispose_panel` consults no transition table at all. The contract
   requires disposal to keep consulting the six-state model — a table that
   describes a legal transition must not be the reason a user cannot close a
   panel.

9. **A workspace close is a disposal path, not a category.** Closing a
   workspace disposes every panel attributed to it, ordered by MRU with the
   focused panel first, through the release obligations of rule 8, and emits
   one FS-4-style record per panel with owner, controller generation, reason
   `quit`, and action `disposed`. No such path exists today: `dispose_panel` is
   called only from the scene host, `workspace_panels` has no accessor, and
   there is no bulk dispose-by-workspace operation. The path has to be built,
   and until it is built the `Drop` outcome is reachable only through the scene
   host's own release.

## Decision D: authority on rebind

**Decided in this record: a rebound panel inherits no authority it did not
itself obtain.**

### D.1 One derivation

A rebind computes the successor's panel-scoped grant set with exactly one rule:

```text
R = the successor generation's own panel-scoped resolution
    (manifest declaration plus any activation-time consent)
P = the predecessor generation's panel-scoped grant set for this PanelId
C = the subset of (R minus P) for which a permission-diff consent
    was granted during this bind

grant(n+1) = (R ∩ P) ∪ C
```

`P` is read by phase 0 (D.2) from the live row when the bind displaces a
still-bound predecessor, and from the retired-ceiling tombstone written at that
predecessor's terminal edge (A.2) when the predecessor ended before this bind —
the reload case. It is never read from the live table after an edge has drained
it, and a live row left by a failed release is refused rather than read (D.2
phase 0). A panel that has never been bound has no predecessor and therefore no
ceiling: `P` is absent rather than empty, `C` is empty, and the first bind
grants `R` with no permission-diff consent because `panel.create` is the
authorization. An empty tombstone is a real empty ceiling, not an absent one:
the predecessor bound and ended holding nothing, so nothing of it survives.

Precedence, in order and with no fourth rule:

1. **The successor's own resolution comes first.** No element of
   `grant(n+1)` lies outside `R`. This is the sense in which nothing is
   inherited: every capability the successor holds is one it obtained for
   itself.
2. **The predecessor's set is a ceiling, never a source.** `P` can only
   subtract. An element of `P \ R` is dropped without a prompt, without a
   refusal record against the successor, and without a path back, because
   narrowing needs no consent: the successor never asked for it.
3. **A widening needs an explicit permission-diff consent.** An element of
   `R \ P` is denied until a consent for that capability is granted during
   this bind, and is never granted by the predecessor's absence. Consenting
   admits it to `C` for this binding only; the next rebind recomputes, and a
   narrower successor drops it again. This applies to a bind that has a
   predecessor; the first bind of a never-bound panel is the absent-`P` case
   above and grants `R` whole.

Three sentences are removed rather than reworded, because each was a competing
algorithm: "the intersection is recomputed rather than inherited" (the
intersection is `R ∩ P`, a filter, not a source), "a narrowed set carries
forward per the reload contract" (it does not; it is simply absent from `R`),
and "inherits nothing" as a standalone headline (it now reads "inherits no
authority it did not itself obtain", which is the rule above).

**Where the derivation runs, and today.** At `6bc0c5fa` ([bitty#2890](https://github.com/bitty-terminal/bitty/pull/2890)),
`PanelRegistry::derive_rebind_grants` and `PanelRegistry::install_rebound_grants`
(`crates/bitty-runtime/src/registry/panel.rs`) implement the derivation and
installation seam, while `release_generation_scope` writes the retired-ceiling
tombstone and `PanelRecord.last_controller_generation` before deleting the live
grant row. The derivation reads three things: the successor's resolution, the
**captured** predecessor set for the same `PanelId` (the immutable snapshot
taken at bind entry, D.2 phase 0, read from the live row or the retired-ceiling
tombstone as phase 0 selects and never from the live grant table after it has
been drained), and the caller-supplied consent set for this bind. What still
does not exist is the production `rebind_panel` two-phase boundary in
[D.2](#d2-two-phase-bind) that invokes `derive_rebind_grants` and
`install_rebound_grants` across a plugin reload (`N -> N+1`), owner-keying on
the tombstone (`(owner, PanelId, N)`), a container-preserving generation edge
outside `dispose_panel` (which currently retires the panel record and drops the
tombstone on container disposal), and a production permission-diff consent
record; until those land, the end-to-end reload path remains required work
rather than shipped behavior.

**A bind is a pure function of that captured snapshot.** Once phase 0 returns,
nothing the bind mutates can change the derivation's result: the three inputs
are immutable for the duration of the bind, the live grant table is not an
input to the formula, and the output is written exactly once in phase 2 or not
at all. An implementation that evaluates the formula against the live table is
a defect even where it happens to compute the right set, because the ordering
in D.2 then decides what the formula means.

### D.2 Two-phase bind

A bind is two mutating phases, preceded by a capture step, phase 0, which reads
and mutates nothing. Phase 1 invalidates in five ordered steps, phase 2 commits
in three, and the successor may not issue its first panel verb until phase 2 has
returned.

Phase 0 — capture, at bind entry and before any invalidation, with no step
skipped:

1. Read the predecessor's panel-scoped grant set for this `PanelId` into an
   immutable snapshot stamped with the panel id, the predecessor's owner and
   controller generation, and this bind attempt, and hand that snapshot to the
   derivation in D.1 as `P`. The source is the live row when the bind displaces
   a still-bound predecessor, and the retired-ceiling tombstone written at that
   predecessor's terminal edge (A.2) when the predecessor ended before this
   bind — the reload case. When both exist for the same generation the live row
   wins. The live row is not touched here; phase 1 removes any remaining row
   after the snapshot exists.

   A live row with no binding on the panel record is not a source. That state
   is what a failed edge release leaves behind when its tombstone write did not
   complete (A.2): the predecessor ended, the release did not, and the row is
   diagnostic evidence rather than a ceiling the bind may consume. Phase 0
   refuses the bind in that state, emits the same FS-4-style record, and leaves
   the row untouched; recovery from the failed release is not decided by this
   record and no successor bind may consume the row (`N-15`).

   When neither a usable live row nor a tombstone exists, the bind distinguishes
   two cases by `PanelRecord.last_controller_generation`, which is retained
   across unbind (`6bc0c5fa`; adding the predecessor owner alongside that
   generation remains required work). No previous controller — a panel that has
   never been bound — means no predecessor and no ceiling: `P` is absent, and
   the first bind commits `R` with no permission-diff consent, because
   `panel.create` is the authorization. A previous controller with neither a
   usable live row nor a tombstone means the ceiling record was lost: the bind
   is refused with `PanelError::CeilingLost`. A tombstone whose owner or
   generation does not match the record's last controller is treated as a
   missing record and refused the same way. A refused snapshot runs no phase 1
   step, writes no phase 2 step, and emits one FS-4-style record naming the
   capture, the owner, and both generations; a still-bound predecessor stays
   bound. An empty tombstone is not a missing one: it yields `P = ∅` as a real
   ceiling.

Phase 1 — invalidate the predecessor, in this order, with no step skipped:

1. When a predecessor exists and the panel record still names it as
   controller, write its retired-ceiling tombstone (A.2) if its edge has not
   already written one, then remove every panel-scoped grant held by the
   predecessor for this `PanelId` if a row remains. A displaced predecessor
   that is no longer the bound controller writes no tombstone; its late edge
   releases its own rows only (A.2). On the reload path the edge release has
   already done both, so this step is a no-op there. The derivation reads the
   phase 0 snapshot and never this table.
2. Drop the panel's queued events (they are panel-scoped, and the successor
   has not bound, so a panel-wide drain cannot touch it).
3. Release the predecessor's capture handles for this panel and revoke its
   live overlay capture session.
4. Dismiss the panel overlays attributed to the predecessor.
5. Cancel every in-flight panel verb of the predecessor with the refusal class
   `ControllerReleased`.

Phase 2 — commit, in this order:

1. Install the derived set `(R ∩ P) ∪ C` for `(PanelId, controller generation)`,
   keyed by the controller generation rather than the allocation generation.
2. Write the binding `(owner, controller generation)` on the panel record.
3. Reset the panel's lease entry to `Idle`, drop the panel's retired-ceiling
   tombstone for the predecessor owner and generation, then and only then
   permit successor verbs.

No verb is permitted between step 1 and step 3, so no caller observes the panel
as bound with an empty or partial grant set.

Rules that make the phases decidable:

- **Revalidate at use, not only at entry.** Every panel verb checks the
  binding against the caller's controller generation immediately before it
  touches panel state, and a verb may not hold a panel reference across a
  yield, a callback boundary, or a queue drain without revalidating. An
  entry-only check is a defect: it reopens the confused-deputy window between
  check and act.
- **Failed invalidation refuses the bind.** If any step of phase 1 cannot
  complete, the bind is refused, nothing of phase 2 is written, the panel is
  left unbound, and the placeholder is presented. There is no partial bind and
  no "invalidated most of it" state. One FS-4-style record names the old
  controller generation, the attempted new one, the step that failed, and the
  set successfully invalidated before the failure.
- **A failed capture or a failed install refuses the bind, with the predecessor
  left either bound or gone — never half of each.** A capture that cannot be
  taken refuses the bind before any invalidation: a still-bound predecessor
  stays the controller, and a predecessor that already ended leaves the panel
  unbound with the placeholder it already presents. No placeholder is
  re-presented over a live controller. A phase 2 step 1 install that
  cannot complete leaves the binding unwritten, the panel unbound, the
  placeholder presented, the invalidated set not re-installed, and one
  FS-4-style record naming the failed install and both generations. No verb is
  permitted in either case, so no caller observes a panel that is bound with an
  empty or partial grant set.
- **Two typed refusals, neither borrowed from `StaleHandle`.**
  `ControllerConflict` refuses a verb that names a generation which is not the
  bound one, carrying the panel id, the bound generation, and the presented
  one. `ControllerReleased` refuses a verb that was in flight when its
  generation was unbound. `PanelError` has no variant for either today, so
  both are required additions; naming them here is what lets a test assert
  against a defined class instead of matching a message string.
- **The binding is the security fence; the lease stays a UX metaphor.** A
  successful commit resets the panel's lease to `Idle`, so a predecessor's
  holder cannot keep writing through the lease after it lost the binding, and
  the successor acquires the lease under its own holder. The two mechanisms
  answer different questions — the binding answers "may this generation touch
  this panel at all", the lease answers "which participant holds the writing
  turn" — and a second binding that did not state this relationship would let
  two drivers coexist.

### D.3 What survives a rebind and what does not

| Item                                                                  | Survives a rebind          | Why                                                                                                                                    |
| --------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `PanelId`, panel allocation `Generation`                              | Yes                        | Container identity; a rebind is not an allocation (B.1, B.2).                                                                          |
| Workspace membership, attachment, title, geometry, `PresentationMode` | Yes                        | Presentation facts the container owns (A.4); rebind re-parents nothing.                                                                |
| Focus state                                                           | Yes, unchanged             | Focus is workspace state; a rebind neither grants nor takes it (D.5 family 6).                                                         |
| Scrollback, grid, cursor, modes                                       | Yes, but not to the plugin | They belong to the terminal, not the panel or the generation; no PTY descriptor is handed over.                                        |
| Panel-scoped queue budgets (PR-7, PR-8)                               | Yes, re-armed empty        | Attribution stays with the `PanelId`; occupancy does not survive.                                                                      |
| Lease entry                                                           | Yes, reset to `Idle`       | The record survives, the tenure does not (D.2).                                                                                        |
| Capability grants                                                     | No                         | Re-derived by D.1 from the phase 0 snapshot, read from the live row or the retired-ceiling tombstone; a ceiling, installed in phase 2. |
| Queued events                                                         | No                         | Dropped in phase 1; never replayed.                                                                                                    |
| Overlay attribution, modal authority                                  | No                         | Released in phase 1; a queued modal from the predecessor is dropped, never presented by the successor.                                 |
| Capture handles, block handles, scene, bind                           | No                         | Generation-owned content; released before the successor may act.                                                                       |
| In-flight verbs                                                       | No                         | Cancelled with `ControllerReleased`.                                                                                                   |
| Controller binding                                                    | Replaced                   | That is what a rebind is.                                                                                                              |

### D.4 The six families, and what can be revoked today

| Family                  | Key in code today                                                                                                                                                                                     | Generation-revocable today                                                                                                                                                                                                                 | Required action                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Capability grants       | `capabilities[(PanelId, allocation Generation)]`; written by `grant_panel_capability`, removed by `release_generation_scope` (called from `dispose_panel`)                                            | Partly — the release drains `(PanelId, N)`'s grants, queued events, commands, and attributed overlays, but the key's generation is the allocation epoch, which a reload does not change, and its only production caller retires the record | Re-key to `(PanelId, controller generation)`; reach the release from the plugin boundary; capture, remove, install |
| Content and capture     | Generation-scoped block registry, spec overlay handles, scene, bind, targeting lenses, overlay capture session                                                                                        | Yes — `clear_ui_blocks` releases them at suspend, dispose, and rollback                                                                                                                                                                    | Nothing new; the bind must not replay any of it                                                                    |
| Overlay attribution     | `overlay_attribution: HashMap<u64, (PanelId, Generation)>` beside `Overlay`, which itself carries no owner; written by `create_panel_overlay`, released by `release_attributed_overlays` (`7dd0a8ec`) | At the registry seam — `release_generation_scope` dismisses the attributed overlays; no production caller creates an attributed overlay yet, so 0 are released on the live path                                                            | Wire `create_panel_overlay` into a production overlay path; dismiss in phase 1 as well                             |
| Scrollback and terminal | No panel-held PTY; access only through the scope-checked host path                                                                                                                                    | Not applicable — there is no panel-owned handle to revoke                                                                                                                                                                                  | State the non-claim: no object is handed to the successor                                                          |
| Bus queues              | `(PanelId, topic)`, drained by `event_bus.clear_panel_counted` inside `release_generation_scope` (`7dd0a8ec`)                                                                                         | At the registry seam — the unbind release counts and drains the panel's queue, and `queued_events_for_panel` reads it back                                                                                                                 | Reach the release from the plugin boundary so it runs at the generation edge, not only inside `dispose_panel`      |
| Focus                   | Workspace MRU, not panel state                                                                                                                                                                        | Not applicable — a rebind grants nothing                                                                                                                                                                                                   | Nothing new; a rebind must not call focus                                                                          |

`release_generation_scope` is now the per-generation revoker for grants, bus
queues, commands, and overlay attribution (`7dd0a8ec`), so the function the
earlier revision asked for exists. What is still missing is a caller at the
plugin boundary: the release runs only from `dispose_panel`, which retires the
container, and the edge a reload actually crosses (`clear_ui_blocks`) still
calls only `release_owner`, which is scene-panel-only.

### D.5 Family rules

1. **Capability grants.** D.1 applies. The successor holds only what its own
   resolution produced, narrowed by the predecessor's set, widened only by
   consent granted in this bind.
2. **Content capture.** No capture of terminal content, clipboard, selection,
   or raw PTY bytes is inherited or replayed. A generation that wants
   observation asks again under its own grants, and the high-risk families
   named by the isolation rules stay high-risk on every ask. The predecessor's
   capture session is revoked in phase 1 rather than left to expire.
3. **Overlay.** Overlay surfaces attributed to the previous generation are
   dismissed with it. The single modal authority is unchanged: a rebind neither
   acquires nor transfers a modal, and a queued modal request from a disposed
   generation is dropped rather than presented by its successor. Plugin
   presentation surfaces already tear down at every generation boundary; panel
   overlays are dismissed by `release_generation_scope`, which no plugin
   boundary reaches yet, which is why D.4 still lists the wiring as required
   work.
4. **Scrollback and terminal access.** A panel never holds a PTY descriptor,
   and no rebind path may reach the grid, scrollback, cursor, modes, or reply
   buffers except through the accepted scope-checked host path. A terminal
   view attached to a panel is not handed to the successor generation as a
   readable object.
5. **Bus subscriptions and queues.** The successor generation's subscriptions
   come from its own manifest and its own registration. Per-panel queue
   budgets (PR-7, PR-8) stay attributed to the `PanelId`, re-armed empty; the
   global envelope (PR-9) and the per-plugin envelope are unchanged. Nothing
   is drained from `N` into `N+1`.
6. **Focus.** A rebind does not grant focus. Focus is workspace state; a
   rebound panel is focused only if it already was, and an unbound panel never
   receives keyboard, IME, or wheel input.

## Decision E: bounded recovery

**Decided in this record: an explicit placeholder is the default outcome, and
there are exactly three legal outcomes.** Never a silent orphan, never an
automatic deletion of the user's structure.

| Outcome     | When                                                                                                                                                       | User-visible result                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Placeholder | The controller is missing, `Suspended`, `Disabled`, crashed, mid-reload, or a different version than the persisted content requires.                       | The container stays in place with its title and geometry, presents a non-interactive surface naming the reason, and offers close and retry actions. |
| Unavailable | The provider is installed but the panel's required capability is denied (`panel.create`/`panel.focus`/`panel.provider`), or safe mode excludes the plugin. | The container stays, presents "unavailable" with the denial named, and accepts no content verb.                                                     |
| Drop        | The user closes the panel, closes the workspace, or accepts an explicit "discard panels of this plugin" action.                                            | The container is disposed through the path in C.8 and C.9; `PanelId` retires; the loss is attributed and reported.                                  |

Rules:

1. Recovery is bounded by construction: one placeholder per unbound panel, no
   per-tick respawn, no unbounded retry, and no diagnostic that grows with the
   number of attempts. Each transition increments one counter keyed
   `(PanelId, controller generation, reason)` and emits one FS-4-style record
   with owner, generation, reason, and action. **The counter is capped at
   eight.** At the cap the counter stops incrementing, the panel keeps its
   placeholder, and a single `saturated` diagnostic is emitted once per
   `(PanelId, binding)`; further attempts of the same reason change no state
   and emit nothing. A reason outside the vocabulary is a defect and is
   counted as such, not passed through.
2. Placeholder reasons are a **superset with an explicit mapping**, not an
   "alignment" claim. The base is the GUI content release vocabulary; two
   reasons are added, and the three close-side reasons are mapped rather than
   dropped:
   - shared: `suspended`, `reloaded`, `disabled`, `crashed`, `unloaded`;
   - added by this record: `denied` (capability denial or safe-mode exclusion)
     and `incompatible` (schema skew, rule 3);
   - mapped from the content vocabulary: `closed`, `dismissed`, and `quit` are
     user-initiated ends of the content, so they select the `Drop` outcome
     rather than a placeholder reason, and a user close that does present a
     placeholder presents `closed`. `dismissed` and `quit` are accepted as
     aliases of `closed` on any surface that already emits them, so no
     diagnostic is split across two spellings.

   A reason outside the resulting set is a defect, and a user-supplied reason
   is never accepted.

3. **Version skew is explicit, not silent.** A panel whose persisted content
   was produced under a newer schema than the restored provider supports
   presents the placeholder with `incompatible`; content is never downgraded,
   reinterpreted, or partially applied. A provider that is newer than the
   persisted record may ignore unknown fields, consistent with the
   forward-tolerance rule the rehydration path already implements.
4. **A missing plugin is `unloaded`, not deleted.** An uninstalled provider
   leaves placeholders until the user closes them; the placeholder keeps the
   last non-content identity facts (title, workspace index, geometry) so a
   reinstall can rebind.
5. Placeholder presentation is Core-owned and bounded: it is a fixed,
   non-plugin scene under the same scene limits as any other panel content
   (`SCN-1..SCN-5`), it holds no plugin text, and it cannot be styled or
   replaced by a plugin.
6. No recovery path reaches a terminal, a PTY, a renderer handle, or a plugin
   callback; the whole recovery surface is header-level presentation plus
   commands.

## Decision F: required test matrix

**Decided in this record.** Each row is a headless test obligation; a feature
PR that touches panel lifecycle, rebind, or generation teardown adds its row
before merge. The matrix has **twenty-three rows**. The count is not the
contract; the coverage is, and rows `PGO-15` to `PGO-23` exist because rows
`PGO-1` to `PGO-14` test the happy direction of a rebind and not the
adversarial one. Each added row names the wrong implementation it is expected
to fail. `PGO-22` exists because the order of the bind's capture, invalidation,
and install across a generation edge is a property no earlier row
discriminated, and `PGO-23` because the
unbind edge releases families that every earlier row reads only after a bind.

| ID     | Case                                        | Assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PGO-1  | Reload with a mounted plugin panel          | `PanelId`, attachment, `PresentationMode`, and title are unchanged across generation `N -> N+1`; content is replaced; no `StaleHandle` is produced for the panel itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| PGO-2  | Reload with a suspended panel               | The panel stays `Suspended` with its attachment intact; `N+1` rebinds without a mount; no focus change occurs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PGO-3  | Controller disposal with no successor       | Panel becomes unbound, presents the placeholder with the right reason, keeps its attachment, and receives no input.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| PGO-4  | Crash during a callback                     | FS-2 ladder output is unchanged; only the owning generation is affected; sibling panels and terminals stay responsive (FS-P2); the panel's placeholder reason is `crashed`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| PGO-5  | Disable, then re-enable                     | Placeholder appears with `disabled`, disappears on rebind after activation, and content is not restored from the disabled generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| PGO-6  | Reload racing a mount                       | A mount against a disposing generation commits nothing; the view ends unbound; the panel keeps its pre-mount state; `N+1` can mount cleanly afterwards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| PGO-7  | Rebind authority sweep at bind time         | Run the bind twice: once with the predecessor still bound, and once after its edge release in the same reload. In both runs the predecessor holds `{panel.create, panel.focus}` and `N+1` resolves `{panel.create, panel.overlay}`, a family the predecessor never held. At the instant the bind returns, and before `N+1` issues any verb, the panel's grant set equals `(own resolution ∩ predecessor set) ∪ consented widening`, read back through the accessors the verbs use; it is `{panel.create}` without consent for `panel.overlay`, and `{panel.create, panel.overlay}` only after that consent. The predecessor set is the live row in the first run and the tombstone in the second. `panel.focus` is absent without a prompt or a refusal record against the successor; the denied `panel.overlay` is recorded against the successor, not as a narrowing. Capture handles, overlay attribution, and queued events are observably empty for `N+1` rather than inferred from `N+1` not having asked. A non-empty predecessor set never commits empty. Fails for an implementation that ignores the ceiling and grants `R` whole, for one that reads only a live row and treats the reload's missing row as no ceiling, and for one that carries the narrowed set forward. `PGO-22` fixes the ordering and the edge-crossing case.                                                                                                                                                                                                                                                                                      |
| PGO-8  | Two generations racing for one panel        | The second bind fails closed with the typed `ControllerConflict` and changes nothing; at most one controller is ever recorded; the refusal names both generations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| PGO-9  | Guessing a `PanelId`                        | An ungranted verb naming a live `PanelId` is denied before any state access; a granted verb naming another generation's panel is denied.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| PGO-10 | Denied capability at rebind                 | Panel presents `unavailable` with the denial named; no content verb is reachable; safe mode produces the same outcome without loading a third-party VM.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| PGO-11 | Older or newer provider version             | Newer-persisted content presents `incompatible` and applies nothing; newer-provider-over-older-record ignores unknown fields; no partial application in either direction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| PGO-12 | No policy selector resurrects an identity   | No `PersistencePolicy` value reachable by a production caller restores a persisted `PanelId`; `StableIdentity` is refused at the panel restore entry point; a session restored under the documented default produces fresh ids and never reuses a persisted numeric id.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| PGO-13 | Panel disposal reclaim                      | After disposal, commands, queues, grants, MRU entries, lease entries, and overlay attribution are released and the panel counts return to the pre-creation baseline within the PB-3 reclaim tolerance (FS-P4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PGO-14 | Placeholder bounds                          | A workspace full of unbound panels still produces one bounded placeholder each, no respawn, no unbounded counter growth (the counter stops at eight and emits one `saturated` note), and a single findable reason per panel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| PGO-15 | Displaced generation still holding a handle | Generation `N` keeps a panel handle across the rebind. After `N+1` binds, every verb `N` issues is refused with `ControllerConflict` before any state access; `N` cannot read `N+1`'s scene, bind, capture session, queued events, or component results; no refusal mutates panel state. Fails for an implementation that empties `N+1`'s state at bind and never re-checks the caller.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| PGO-16 | Failed invalidation                         | Invalidation step 3 (capture release) is made to fail. The bind is refused, the panel is unbound, no grant and no binding is written, the successor's first verb is refused, one FS-4 record names the failed step and both generations, and the panel state is identical to its pre-bind snapshot apart from the placeholder. Fails for an implementation that binds after a partially completed invalidation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| PGO-17 | Widening requires permission-diff consent   | The successor's resolution declares a capability the predecessor never held. Without consent the bind succeeds and that capability is denied; the denial is recorded against the successor, not as a narrowing. With consent it is granted, and only for that binding: the next rebind is asked again. Fails for an implementation that reads the predecessor's absence as permission.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| PGO-18 | Narrowing is silent, widening is denied     | Run the bind after the predecessor's edge release, so only the tombstone holds its set. The predecessor held `{panel.create, panel.focus, panel.overlay}`; the successor resolves `{panel.create, panel.provider}`, dropping two families the predecessor held and adding one the predecessor never held. The bind succeeds without any consent prompt or prompt record for the two dropped families; those two are denied without a refusal record against the successor. The widening `panel.provider` is denied and its denial is recorded against the successor, not as a narrowing, so the committed set is `{panel.create}`; with a permission-diff consent for `panel.provider` it becomes `{panel.create, panel.provider}`, for this binding only. Fails for an implementation that reads only a live row and treats the reload's missing row as no ceiling (it would grant `{panel.create, panel.provider}` without consent), that carries the narrowed set forward, or that prompts on narrowing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| PGO-19 | Bounded recovery under denial               | With a required capability denied at rebind, the panel presents `unavailable` with `denied`, accepts zero verbs, produces exactly one FS-4 record, and is unchanged after 100 ticks: no respawn, no second record, no counter growth past the cap. Fails for an implementation that retries the bind per tick or re-emits per attempt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| PGO-20 | Bounded recovery under crash and disable    | Crash: placeholder `crashed`, one FS-4 record, no respawn within the driver's reload window, container, title, and focus history intact, and no authority from the crashed generation survives the next bind. Disable: placeholder `disabled`, re-enable permits a rebind, and the disabled generation's grants are not restored by the rebind. Fails for an implementation that treats re-enable as resuming the old binding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PGO-21 | Workspace close with a focused panel        | Closing a workspace whose focused panel is `Focused` reaches `Disposed` through C.8 and C.9: focus moves to the next MRU entry or to none, the view attachment, MRU entry, lease entry, commands, queues, grants, and overlay attribution are released, both PR-1 and PR-2 counts return to baseline, and one FS-4 record per panel carries reason `quit`. Fails for an implementation that refuses the transition table's missing edge or that leaves the lease entry behind.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| PGO-22 | Snapshot captured before invalidation       | Run four sub-cases. (a) Still-bound displacement: the predecessor holds `{panel.create, panel.focus}`, `N+1` resolves the same set, phase 0 captures the live row, and the committed set equals `{panel.create, panel.focus}` (the live row wins even if an older tombstone is present). (b) Reload with non-empty tombstone: `N` holds `{panel.create, panel.focus}`, is disposed, its edge release writes the tombstone, and `N+1` binds in the same reload; the committed set equals `(R ∩ P_N) ∪ C`, with `P_N` the tombstoned predecessor set, never `C` and never empty. (c) Reload with an empty tombstone: `N` bound and ended holding `∅`, its edge release wrote an empty tombstone, and `N+1` resolves non-empty `R = {panel.create, panel.focus}` with `C = ∅`; phase 0 reads `P_N = ∅` as a real ceiling and the committed set is `∅` (with consented widening `C`, the committed set equals `C` only). (d) Missing-source refusal (`CeilingLost`): `PanelRecord.last_controller_generation` names a predecessor (or the tombstone's owner or generation does not match), and neither a usable live row nor a matching tombstone is present; phase 0 refuses the bind with `PanelError::CeilingLost` before any phase 1 invalidation or phase 2 write. In (a)–(c), provenance names the predecessor generation and the bind attempt, and no verb is permitted between the grant install and the binding write. Fails for remove-then-derive, for phase 0 reading only the live table the edge has drained, for treating an empty or missing `P` as no ceiling, bind-then-install, and derivation from the live table. |
| PGO-23 | Unbind release with no successor            | A generation crashes, is disabled, and is separately disposed, each with no successor. Before the placeholder is read, its grant rows, the panel's queued events (read through `queued_events_for_panel`), its commands, and its overlay attribution are observably empty, and `unbind_release_count(PanelId)` named the ended generation at each edge and advanced once per family released. For the crash and disable edges, `retained_grant_ceiling(PanelId)` reports the ended generation and the released set — empty when the generation held nothing — while the panel remains open. After workspace close or panel disposal, `retained_grant_ceiling(PanelId)` reports `None` and `retained_grant_ceiling_count()` returns to the value it held before the first edge. Fails for an implementation whose only drain is bind phase 1, one that shows the placeholder before the release ends, one that never writes a tombstone, one that accumulates one release record or tombstone per reload, and one that leaves the tombstone after workspace close or panel disposal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## What is decided in this record and what stays open

Decided here (candidate direction, awaiting owner acceptance):

- the ownership split at the content boundary, the rejection of
  generation-owned ephemeral panels, and the exclusion of the Core-owned
  `terminal`-slot scene panel from the container rules;
- workspace membership assigned at creation by Core from the presented
  workspace's focused leaf, recorded once and never re-resolved, wired by
  [bitty#2889](https://github.com/bitty-terminal/bitty/pull/2889) as `b0d86eee`
  with both A.7 acceptance tests, and the PR-1/PR-2 accounting for a
  created-but-unmounted container;
- `PanelId` survival across plugin reload, the separation of allocation
  generation from controller generation, and the restore key
  `(WorkspaceId, PersistentId)` as a tuple with a fresh `PanelId` on restore;
- the panel-state to generation-state mapping, including crash, disable,
  reload-mid-mount, and the two disposal edges `Focused -> Disposed` and
  `Created -> Disposed`;
- the single grant derivation over an immutable captured snapshot, the
  retired-ceiling tombstone that carries the predecessor's set across a
  generation edge, the two-phase bind, the unbind release at the generation
  edge, the two typed refusals, and the binding-versus-lease relationship;
- the three-outcome bounded recovery, its reason vocabulary with the close-side
  mapping, and its counter cap;
- the required test matrix.

Open, and explicitly not settled here:

- the persistence contract, encoding, version policy, and whether restart
  restore ships (`RFC-OQ-9`, and the persistence half of PW-5), including the
  record fields and manifest version that would carry
  `(WorkspaceId, PersistentId)`, and the index-to-`WorkspaceId` resolution at
  restore, which must be the same function the create path uses (A.7, B.4);
- which plugin-facing verbs a rebound generation regains, given that
  `bitty.panel.close` and `bitty.panel.destroy` remain unimplemented host
  seams and only `panel.create`, `panel.focus`, and the pinned-float backend
  are wired;
- whether the code-state `Closed` enters the accepted lifecycle, and how the
  registry would represent it;
- whether a different plugin may ever claim a persisted panel, and under what
  consent surface — no rule in this record admits or refuses it;
- whether panel-level lease or handoff semantics (the
  [OQ-083](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  direction) compose with the controller binding or sit above it, now that
  D.2 fixes the bind-time relationship between binding and lease;
- the exact diagnostic spelling and the operator surface for the reason
  vocabulary, beyond the close-side mapping in E.2.

## Security review

The record is a trust-boundary record, not only a lifecycle record, because it
decides what authority survives a generation change.

1. No new authority is created. A rebind concedes nothing: the successor's
   panel-scoped set is its own resolution filtered by the predecessor's set,
   widened only by a consent granted in that bind (D.1). The predecessor's set
   is a ceiling and cannot be a source, which is the property the earlier text
   lost between "inherits nothing", "intersection", and "carry forward". The
   ceiling is captured before any invalidation (D.2 phase 0): from the live row
   when a still-bound predecessor is displaced, and from the retired-ceiling
   tombstone the edge release writes before deleting that row when the
   predecessor ended at a reload (A.2). Neither the bind's ordering nor the
   generation edge can turn the ceiling into a missing record: a missing record
   with a predecessor expected refuses the bind, and an empty tombstone is a
   real empty ceiling rather than an absent one.
2. The confused-deputy case is closed at the type and binding level: a panel
   handle is not authority, the controller generation is checked against the
   binding before and at use, no path accepts a `PanelId` where a `ViewId` or
   `TerminalId` is expected, and an unbound panel refuses every verb.
3. The placeholder path is plugin-free: it renders no plugin text, runs no
   plugin callback, holds no PTY or GPU handle, and its geometry passes no
   `LogicalRect -> PTY` resize.
4. Failure is contained. A crash, disable, or budget suspension affects only
   the owning generation and leaves container structure intact, which is
   strictly less destructive than the cascade a generation-owned panel model
   would require. A failed invalidation refuses the bind rather than committing
   a partial one (D.2), bounded recovery keeps the panel visible and
   non-interactive rather than respawning (E.1), and the unbind release of A.2
   runs at the generation edge with no successor, so a departed generation's
   families are empty before the placeholder is read.
5. Nothing here weakens a normative control: invariants 2, 3, 4, and 7,
   FS-P1 through FS-P5, and threat-model row `T-25` hold unchanged, and no
   exclusion in the Panel Runtime RFC's explicit-exclusions table is relaxed.
6. Two reviewable questions remain for the security reviewer, and each is now
   answerable by test rather than by reading prose. **Grant invalidation at the
   binding boundary:** the derivation is D.1, the ordering and failure mode are
   D.2, the enforcement functions exist at the existing release/bind seam, but
   the production `N -> N+1` `rebind_panel` two-phase boundary and a
   workspace-close entry point do not, and `PGO-16`, `PGO-17`, and `PGO-18`
   discriminate a ceiling from a source and a failed invalidation from a
   partial bind, while `PGO-22` discriminates
   the snapshot that keeps the ceiling readable from a derivation that reads
   the table after invalidation and now crosses the generation edge that
   deletes it. **A displaced generation cannot observe its successor:**
   `PGO-15` asserts the refusal class and the absence of observation, `PGO-7`
   reads the emptied families back through the accessors the verbs use on both
   the live-row and tombstone paths, `PGO-21` covers the focused-panel disposal
   that was unreachable, and `PGO-23` asserts that the ending generation's
   families are released at the boundary itself when no successor follows.
7. The record states where enforcement does not exist. `PanelError` has no
   `ControllerConflict` or `ControllerReleased` variant, the grant table is
   keyed by the allocation generation rather than the controller generation,
   the `Overlay` type carries no owner (attribution lives in the registry's
   side table and has no production writer), and no production `N -> N+1`
   `rebind_panel` two-phase boundary or workspace-close entry point consumes
   the release/bind seam. The seam itself implements the tombstone capture,
   the `CeilingLost` refusal, the empty-versus-missing distinction, live-row
   precedence, and the live-panel capacity bound with fail-closed insertion
   (`6bc0c5fa`, `B-5`), and since `7dd0a8ec` the four-family unbind release
   with its `GenerationReleaseRecord`/`unbind_release_count` accessors and the
   `(WorkspaceId, PersistentId)` restore key with the `StableIdentity`
   refusal; the create path is wired at `b0d86eee`. `PGO-16`, `PGO-21`, and
   `PGO-22` would still fail against today's code because the production bind
   and workspace-close paths do not exist, `PGO-12` is half-satisfied (the
   refusal is landed and tested, but no production caller restores a session),
   and `PGO-23` is satisfiable at the registry seam but unimplemented as a
   test row. A reader cannot mistake this section for a statement of current
   safety.

No `P0` acceptance criterion is modified; the affected evidence row is the one
that would carry the rebind-authority tests.

## Verification plan

Conformance requires, at minimum:

1. An acceptance record — an RFC amendment or successor RFC — that adopts the
   ownership split, the restore key, and the grant derivation, with the Panel
   Runtime RFC's lifecycle section, the Plugin Host Runtime RFC's reload
   section, and the scene host's dispose-on-release behaviour updated in the
   same wave.
2. Implementation of the controller binding on the panel record, keyed by the
   controller generation and distinct from the allocation generation, and the
   retained last-controller field that lets phase 0 distinguish "never bound"
   from "record lost" (merged at `6bc0c5fa`); the production `rebind_panel`
   boundary with the capture step, the two-phase order, and the fail-closed
   branches; the unbind release at the generation edge with its bounded
   counter and accessor, releasing grants, queued events, commands, and
   attributed overlays (the accessors and the four released families merged at
   `7dd0a8ec`, still reached only from `dispose_panel`); the
   retired-ceiling tombstone with its configured cap (the registry's
   `max_panels_per_window`, clamped by the retained `MAX_RETAINED_GRANT_CEILINGS`
   bound) and retention (merged at `6bc0c5fa`); the two typed
   refusal variants; grant re-keying to `(PanelId, controller generation)`;
   overlay attribution at the registry seam (merged at `7dd0a8ec`, unwired at
   the plugin boundary); the workspace-identity surface that now exists in
   `Runtime` (mint at slot creation, store on `WorkspaceSlot`, read through
   `active_workspace_id` and `focused_workspace_id`) and the create-boundary
   wiring that consumes it (merged at `b0d86eee`), passing both A.7 acceptance
   tests; and the bulk dispose-by-workspace path that C.9 requires.
3. The `Created -> Disposed` and `Focused -> Disposed` edges in
   `PanelLifecycle::can_transition` (merged at `7dd0a8ec` with one test per
   edge, so the seven-axis table no longer contradicts the six-state table the
   registry actually uses), and disposal continuing to consult the six-state
   model.
4. The full [test matrix](#decision-f-required-test-matrix) green headlessly,
   with `PGO-7`, `PGO-8`, `PGO-9`, `PGO-15`, `PGO-16`, `PGO-21`, `PGO-22`, and
   `PGO-23` also covered by the security evidence for the affected criterion.
5. An update to the Panel Runtime RFC's implementation-status rows and to the
   [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) so no page
   claims either the old cascade or a shipped rebind.
6. A documented non-claim: restart restore stays unimplemented until
   `RFC-OQ-9`, no production selector chooses a persistence policy for panels,
   and no persisted identity is resurrected.

## Alternatives considered

| Alternative                                                                    | Trade-off                                                            | Disposition                                                                                                                                                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generation-owned ephemeral panels                                              | Simplest ownership; no unbound state to reason about                 | Rejected — destroys workspace structure on reload, crash, and disable; contradicts the accepted owns-panels relation                                                                  |
| No binding, keep the `bitty.panel.create` shape                                | No new field, no migration                                           | Rejected — a reloaded generation cannot find its panel and a disabled generation's panels stay live and unaudited                                                                     |
| Container and content both generation-owned, container retained as a tombstone | One owner everywhere                                                 | Rejected — a tombstone is exactly the silent orphan this record forbids, and it cannot be closed or rebound cleanly                                                                   |
| Rebind inherits grants unchanged                                               | No consent round-trip on reload; matches today's accidental behavior | Rejected — it would let a widened replacement inherit narrowed-era authority silently, which is the `T-25` abuse                                                                      |
| Rebind grants the successor's own resolution with no ceiling                   | One rule, simplest to implement                                      | Rejected — a manifest edit would then widen authority with no consent at all, and the predecessor's set would stop constraining anything                                              |
| Auto-close panels when the provider disappears                                 | Bounded and terminal; nothing left unbound                           | Rejected — a plugin fault must not destroy the user's layout (FS-P2 containment, user intent)                                                                                         |
| Placeholder with an automatic retry loop                                       | Looks self-healing                                                   | Rejected — a crash-triggered loop restarts the same fault; the reload contract already refuses it                                                                                     |
| Persist `PanelId` as the restore key                                           | Reuses an id users already see                                       | Rejected — restore must not trust a persisted integer, restart re-mints ids per the accepted rehydration rule, and `StableIdentity` is not selectable for panels                      |
| Reuse the plugin-scoped `drop_plugin` shape for panel teardown                 | One teardown function, no new key                                    | Rejected — a plugin-scoped purge is safe only under FS-6's dispose-before-activate ordering, which a rebind does not provide; it would let a predecessor's teardown reach a successor |
| Extend the scene-panel dispose-on-release to every panel                       | Consistent with the one shipped fence                                | Rejected as a container rule by A.6: it would delete user structure on reload; kept for the scene panel, which has no user identity                                                   |

## Affected contracts

| Contract                                                                                                                     | Effect                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                    | On acceptance: the lifecycle section gains the controller binding, the unbound state, and the two disposal edges; a new open question is retired |
| [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md) | On acceptance: the reload section states that a generation change rebinds panels rather than disposing them; FS-6 ordering is unchanged          |
| [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)   | Unchanged ceilings; RC-1/RC-2 are re-established per generation at rebind, RC-5 queues re-arm empty, RC-11 store state survives                  |
| [Workspace Compositor Specification](workspace-compositor.md)                                                                | Unchanged; the container keeps its `LayoutTree` slot across a rebind, and no decoration is affected                                              |
| [Panel Placement Decision](panel-placement-decision.md)                                                                      | Unchanged direction; the container is a panel identity with a `View` attachment, so rebinding re-parents nothing                                 |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)                                                    | Unchanged in direction; the Core-owned scene panel is classified as content, not as a container (A.6)                                            |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md)                                                                       | Its panel-versus-plugin lifecycle paragraph gains the reverse direction this record supplies                                                     |
| [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)                                                | Its generation-owned content handle and release-reason vocabulary are adopted as the content half of the split, with the mapping in E.2          |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md)                                                              | Its "release the scene, the bind, and the Core panel" row needs the container exception stated at acceptance                                     |
| [Workspace Panel Invariants](workspace-panel-invariants.md)                                                                  | Unchanged statuses; a rebind invariant would be added by the acceptance wave, not here                                                           |
| [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)                         | Row `T-25` already names the abuse case; its required defense matches D.1, D.2, and `PGO-15` to `PGO-23`                                         |

## Open points

- The persistence contract and encoding behind the
  `(WorkspaceId, PersistentId)` restore key (`RFC-OQ-9`, PW-5 persistence): the
  record fields, the manifest version, and the workspace-index-to-`WorkspaceId`
  resolution the key needs. The tuple is fixed; the record is not.
- The plugin-facing verb surface a rebound generation regains; `panel.close`
  and `panel.destroy` have no host backend today, so the recovery menu is
  Core-side only for now.
- Admission of `Closed` into the accepted lifecycle, and the registry
  representation it would need. The two disposal edges are no longer open;
  C.8 decides them.
- Cross-plugin adoption of a persisted panel and the consent surface it needs;
  B.6 states no rule and decides nothing about it.
- Recovery from a failed generation-edge release. The release fails closed with
  the live row retained and no tombstone, and a successor bind refuses (`A.2`,
  `D.2` phase 0). Whether the release retries, whether the panel is terminal
  until the user closes it, and which component triggers either is not decided
  here. The owner is the plugin-host generation lifecycle; the gate is the
  revision that wires the edge release and states its trigger before that
  release ships.
- Composition with the OQ-083 lease/handoff direction: whether a panel lease
  and a controller binding are one mechanism or two, now that D.2 fixes how a
  bind resets the lease.
- The exact diagnostic spelling for the reason vocabulary and its operator
  surface, beyond the close-side mapping in E.2.
- Whether the unbound placeholder participates in accessibility semantics as
  a named status region; that belongs to the accessibility baseline.
- Whether the activation-generation counter should fail closed instead of
  saturating. It advances with `saturating_add(1)` and is masked to 30 bits for
  handle minting, so at `u32::MAX` the counter stops advancing and a stale
  generation would compare equal to the bound one; this record requires the
  binding to reject a saturated counter, and whether the counter itself should
  report exhaustion is left to the owning lifecycle contract.

## Acceptance criteria

This record is complete when:

1. It is reviewed, and linked from the Panel Runtime RFC's open-questions area
   and from the Plugin Host Runtime RFC's reload section as the candidate
   resolution of the panel/generation seam.
2. The ownership split, the restore key, and the grant derivation are either
   accepted through an RFC amendment or retained explicitly as a candidate
   with the blocking workstreams named.
3. The [affected-contracts](#affected-contracts) table matches the edits made
   in the same wave.
4. The test matrix is either implemented or tracked as a named blocking
   obligation on the acceptance task, with no row silently dropped.
5. Owner acceptance and a security reviewer sign-off are recorded, since
   Decision D changes what authority survives a generation change.

## P0 Review Sign-off

Required, not waived: this record redefines which authority a plugin
generation may exercise over a panel that predates it, and it names an
enforcement point — grant invalidation at the binding boundary — whose
production `rebind_panel` boundary does not exist in code today. A security
reviewer must confirm the grant derivation, the placeholder's plugin-free
path, the fail-closed bind, the workspace
identity surface and the create-path wiring with both A.7 acceptance tests, and
the containment claims for `PGO-4`, `PGO-7`, `PGO-15`, `PGO-16`, `PGO-21`,
`PGO-22`, and `PGO-23` before status can move from draft.

The first independent security review returned `NEEDS-FIX` with eight blocking
gaps and did not sign off. The revision that answered it addressed each of them
in place and recorded what the code actually does where the earlier text was
wrong; a second independent re-review confirmed seven of the eight and
returned three blocking findings in the bind and derivation text, which the
following revision answered in place. A third independent re-review recorded
in `bitty-docs`
(`docs/security/panel-generation-ownership-third-review.md`) closed `B-1` and
`B-3`, kept `B-2` open because the identity step named accessors and an id the
tree does not contain, and added `B-4` because the edge release deleted the
grant ceiling the bind's phase 0 must read. The revision that followed answered
`B-2` by stating the identity step as a bounded, fail-closed prerequisite with
its own acceptance test, and `B-4` by making the edge release write a bounded
retired-ceiling tombstone before it deletes the live row. A fourth independent
review recorded in `bitty-docs`
(`docs/security/panel-generation-ownership-fourth-review.md`) closed `B-4` in
text, kept `B-2` open because that text was stale against `bitty` `cec83552`,
and added `B-6` because `PGO-7` and `PGO-18` could pass with the ceiling
ignored. Two merges since that review move the implementation facts without
clearing the verdict. [bitty#2889](https://github.com/bitty-terminal/bitty/pull/2889)
merged as `b0d86eee` wires the production create backend to the Core-published
workspace id, refuses a missing workspace with `E_UI_UNAVAILABLE`, and adds a
positive and a negative test; the create-path wiring in A.7 is merged, while
the restore-path index resolution stays open (`RFC-OQ-9`).
[bitty#2890](https://github.com/bitty-terminal/bitty/pull/2890) merged as
`6bc0c5fa` addresses `B-5` in code at the existing release/bind seam: the
retired-ceiling tombstone is written before the live row is deleted,
`PanelError::CeilingLost` refuses a lost or other-generation ceiling,
`PanelRecord.last_controller_generation` distinguishes empty from missing, the
live row wins, capacity is bounded by live panels with fail-closed insertion
and no eviction, and disposal drops the tombstone; the commit adds 17
integration and 4 unit test rows. The production `N -> N+1` `rebind_panel`
two-phase boundary and a workspace-close entry point still do not exist, so
D.2 remains open work rather than an implemented boundary. A fifth independent
review and a subsequent code-side conformance audit on
[bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476) confirmed
`B-2` closed on the mechanism and `B-5` implemented in code at the
release/bind seam, flagged the remaining stale `B-5` prose in `A.2`, `D.1`,
and `D.2` plus the narrow `B-6` sub-case split in `PGO-22` (both synchronized
in this revision), and enumerated the thirteen remaining code-side items
required before the issue can close. The verdict remains `NEEDS-FIX` until
those code-side items, a follow-up security review, and owner sign-off land.
The 2026-11-10 re-review re-derived the record against `bitty` `origin/main`
`23ff0f6c` and found that four of those thirteen items had landed at
`7dd0a8ec` (items 5, 6, 10, and 12), leaving nine; it judged the six acceptance
bullets on [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476)
and found none satisfied, with two carrying a tested mechanism and no
production caller. It therefore does not promote this record: `status` stays
`draft`, and the acceptance sentence's four clauses — accepted decision,
updated `PanelRuntime` data model, no orphaned panel or widened permission
path, tests and docs synchronized — each remain unmet.
No `P0` acceptance criterion is modified in the meantime, and no shipped
behavior is claimed.

## References

- [Panel Runtime RFC](panel-runtime-rfc.md) — accepted lifecycle, identity,
  focus routing, capability families, PR-1 through PR-12, and FS-P1 through
  FS-P5.
- [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md)
  — accepted per-plugin VM lifecycle, A.5 generation ownership, and reload
  queue-drain rules.
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  — accepted RC-1 through RC-11 ceilings and FS-2/FS-4/FS-6 failure semantics.
- [Workspace Compositor Specification](workspace-compositor.md) — accepted
  hierarchy, attachment, decoration, and interaction atomicity.
- [Core Ontology and Identity Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md)
  — accepted owns-panels relation, `GenerationId` fencing, and the
  Restore/Persistence separation.
- [Panel Placement Decision](panel-placement-decision.md) — draft panel
  identity and attachment direction this record composes with.
- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md) —
  draft Core-owned content path; source of the scene budgets a placeholder
  also respects, and of the scene panel this record classifies as content.
- [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)
  — candidate generation-owned content handle and release-reason vocabulary.
- [Chrome Surface Contract](chrome-surface-contract-candidate.md) — candidate
  surface inventory whose reload row this record narrows to content and bind.
- [Workspace-Native UI Runtime](ui-runtime-candidate.md) — candidate panel
  state axes and the panel-versus-plugin lifecycle paragraph.
- [Workspace Panel Invariants](workspace-panel-invariants.md) — candidate
  invariant set and its uncovered reload and persistence follow-ups.
- [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) — the
  prioritized gap list this record answers at the lifecycle level.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  — normative invariants 2, 3, 4, and 7.
- [Threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  — row `T-25`, the authority-carry-over abuse case this record's fence exists
  to prevent.
