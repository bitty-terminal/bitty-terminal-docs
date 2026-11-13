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
>
> The 2026-11-14 sync re-derived every row this merge can move — residuals
> `2`, `4`, and the rows that cite the bind, the placeholder, or the release —
> at `bitty` `origin/main` `26360f15` (2026-11-14), which carries
> [bitty#3142](https://github.com/bitty-terminal/bitty/pull/3142) merged as
> `0f6a1c7b`; the rows that merge cannot move keep the earlier read recorded
> below. Residuals `2` and `4` move to landed: both now have a production
> caller through the app-installed `PanelGenerationPort`
> (`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:210`, with
> `release_generation` at `:220` and `bind_successor` at `:230`), carried over
> `PanelEdgeRelease`, `PanelEdgeBind` on the closed `PlaceholderReason`
> vocabulary, and one `PanelEdgeReport` (`:171`) per edge. `PluginRuntime`
> holds the port in `panel_generation_port`
> (`crates/bitty-runtime/src/plugin_runtime/mod.rs:870`) and takes it through
> `PluginRuntime::set_panel_generation_port` (`:1822`); it asks for
> `release_generation` from `dispose_inner` (`:3857`, which dispose, unload,
> disable, and the `reload_inner` teardown that names `reloaded` reach) and for
> `bind_successor` from `reload_inner` (`:4063`, only after `dispose_inner`
> returned and the successor activated). The app answers both with
> `AppPanelGenerationPort` (`crates/bitty-terminal/src/plugin_runtime.rs:762`,
> `impl PanelGenerationPort` at `:782`) and installs one instance beside the
> scene host at the composition root (`:1179`); its `release_generation`
> (`:783`) delegates to the registry's `present_placeholder` and its
> `bind_successor` (`:815`) to `PanelRuntime::rebind_panel`, so the unbind
> ordering and D.2's phase order stay the registry's, and
> `the_generation_edge_rebinds_a_container_through_the_installed_port`
> (`:3323`) drives a reload through the real port. What the port deliberately
> does not hand over is the panel host: no registry, no renderer, no scene, no
> capability token taken from presentation data, and no panel id a plugin can
> choose — the runtime decides when an edge runs and which owner and generation
> it names, the app decides which containers that names, and a refusal moves
> nothing and is reported rather than retried. What the merge does not close
> stays stated. The port answers only for the containers a generation already
> drives — a binding still in force, or the retained pair an ended edge left —
> and nothing in the tree writes a container's _first_ binding, because
> `bitty.panel.create` carries no `PluginId` and no generation; so on today's
> reload edge both calls enumerate an empty set and commit nothing, and the
> record tests mint that first binding through the public API (follow-up
> `(e)`). The consent set the bind receives is empty in this slice, so every
> widening is denied rather than granted (D.1, `PGO-17`). Residuals `8` (the
> `panel.overlay` grammar and its owner acceptance) and `10` (the persistence
> contract) stay blocked on an undecided contract, and the follow-ups `(a)`
> through `(e)` stay open and non-blocking. This revision accepts nothing,
> promotes nothing to **Verified** or **Compatible**, changes no accepted text,
> and does not describe shipped behaviour. Owner acceptance remains required
> and is out of scope here.
>
> The 2026-11-13 sync re-read every row of
> [Implementation status](#implementation-status) at `bitty` `origin/main`
> `3311892f` and records, per residual carried on
> [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476), whether it
> has landed, is implemented but unwired, or is blocked on an undecided
> contract. Six residuals have a landed mechanism — the `PanelRecord` binding
> and owner (`c526f81e`), the two typed refusals (`1567da45`), the
> generation-edge release the scene host performs (`ff3673c3`), the bulk
> dispose-by-workspace path (`2431ad49`), the owner-keyed tombstone
> (`52c1bfa6`), and the conformance matrix that names a home for most of the
> rows (`1feda0d8`, `52c1bfa6`) — two are implemented at the registry seam with
> no production caller (`2`, the production `rebind_panel`, and `4`, the
> placeholder), and two stay blocked on an undecided contract (`8`, the
> `panel.overlay` grammar and its owner acceptance, and `10`, the persistence
> contract), with `8`'s attribution writer having landed at `3311892f`. The
> four follow-ups the landed work's review raised, and a fifth this sync added,
> are recorded as open and non-blocking, with the line each names. This
> revision accepts nothing, promotes nothing to **Verified** or **Compatible**,
> changes no accepted text, and does not describe shipped behaviour. Owner
> acceptance remains required and is out of scope here. Both counts are that
> read's: residuals `2` and `4` have since moved to landed, as the 2026-11-14
> sync above records.
>
> The same sync re-derived residual `5` from the tree instead of from the
> paragraph above, and moved it: `clear_ui_blocks` calls
> `SceneHost::release_owner`, and the scene host is installed on the production
> startup path, so the generation edge does reach
> `release_generation_scope` for the panel a generation mounted. The earlier
> reading — that the release runs only from `dispose_panel` and
> `present_placeholder` and therefore never at a generation edge — was wrong
> about reachability, not about the direct call graph. The row now states the
> trigger, the four lifecycle events that run it, and the container it still
> cannot name. Residual `8` keeps its status and gains the draft candidate that
> carries the grammar question. No decision here moves, and the Open points
> that own the release's failure policy and the `panel.overlay` mapping stay
> open.
>
> The 2026-11-11 sync re-read every row of
> [Implementation status](#implementation-status) at `bitty` `origin/main`
> `7e99bda6` and records, per residual carried on
> [bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476), either the
> symbol, file:line, and landing PR or the undecided contract question that
> blocks it. Two residuals are now blocked on an undecided contract rather than
> on missing wiring — the generation-edge caller for the release (`5`) and a
> writer for `create_panel_overlay` (`8`) — and the other eight are decided by
> this record and unimplemented. The four items that landed since the 2026-11-05
> audit are recorded with the symbol and the PR that carries each, and every row
> names the revision it was read at instead of inheriting an older one. This
> revision accepts nothing, promotes nothing to **Verified** or **Compatible**,
> changes no accepted text, and does not describe shipped behaviour.

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

| Term                        | Meaning in this document                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel container             | The workspace-owned slot and its panel identity: placement, attachment, title, presentation mode, and the visible surface. Outlives any one plugin generation. Only panels addressed by `bitty.panel.*` verbs are containers (see [Decision A](#decision-a-ownership)).                                                                                                                                                           |
| Panel content               | What the container currently presents: a terminal grid, a declarative scene, a browser surface, or a helper handle. Owned by the generation that produced it.                                                                                                                                                                                                                                                                     |
| Controller                  | The plugin generation currently bound to a panel, at most one per panel. A panel may have no controller.                                                                                                                                                                                                                                                                                                                          |
| Panel allocation generation | The `Generation` inside `(PanelId, Generation)`. Monotonic, stamps the allocation epoch, and makes a superseded handle fail with `StaleHandle`.                                                                                                                                                                                                                                                                                   |
| Controller generation       | The plugin activation generation that drives a panel — the counter the runtime already sets as `ui_epoch` on plugin services at activation. Never the panel allocation generation, and never compared with it.                                                                                                                                                                                                                    |
| Plugin generation           | The `(PluginId, generation)` pair that owns one VM, its grants, tasks, timers, and queues, per the Plugin Host Runtime RFC A.5.                                                                                                                                                                                                                                                                                                   |
| Controller binding          | The recorded link from a panel container to the controller generation that currently drives it. The panel record carries it as `PanelBinding` (`plugin_id`, `controller_generation`), written only by the bind, which the app-installed generation port reaches at a plugin reload; the link that ships is still only the `terminal`-slot scene panel's `HostPanel { owner, epoch }`, and `bitty.panel.create` panels carry none. |
| Rebind                      | Binding a new controller generation to an existing panel container without disposing the container or re-minting `PanelId`.                                                                                                                                                                                                                                                                                                       |
| Placeholder                 | The explicit, non-interactive panel presentation that names a missing or unavailable controller. Never an empty surface and never a silent orphan.                                                                                                                                                                                                                                                                                |
| Restore key                 | The persisted identity pair a restart uses to re-attach a panel container: `(WorkspaceId, PersistentId)`, never a `PanelId`. The tuple is decided and is carried by `PanelRestoreKey`; the owner field, the encoding's index-to-`WorkspaceId` resolution, and a production restore caller stay open.                                                                                                                              |
| Retired-ceiling tombstone   | The bounded per-panel record the edge release writes before deleting a departed controller generation's grant row: `(owner, PanelId, ended controller generation) -> captured grant set`. Bind phase 0 reads it across a reload; at most one entry exists per `(owner, panel)`.                                                                                                                                                   |

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
  panel created by a plugin generation carries no recorded generation on any
  live path: the record has a `binding` field for exactly that pair, but the
  only writer is the bind, and since `0f6a1c7b` the only production caller is
  the generation port's `bind_successor`, which enumerates containers a
  generation already holds through a binding — so a container that never
  bound a controller still has no owner, and a reload leaves it running with
  whatever grants it had and nothing bounding it.

Neither behaviour is the contract this record decides. Both must move, and the
record states which path each of its rules governs rather than claiming that
no code path observes a generation change.

## Implementation status

Point-in-time evidence from `bitty`, read as text with no checkout, no build,
and no test run. The base revision of this sync is `origin/main`
`26360f151deeb0b5a73ca7f2942080a1bb9c9200` (2026-11-14), which carries
[bitty#3142](https://github.com/bitty-terminal/bitty/pull/3142) merged as
`0f6a1c7b`; the rows that merge can move were re-derived there and say so
inline, and the previous base is `origin/main`
`3311892f75b38adb50e835822e1129c72866a6a3` (2026-11-13), where every row below
and the [residual ledger](#residual-ledger) were re-read; earlier reads are
kept only where a row names one. The rows that carry a later or narrower read
say so inline: the workspace rows were first read at `cec83552`, the
create-path rows at `b0d86eee`, the grant-ceiling rows at `6bc0c5fa`, and the
release, restore, and lifecycle rows at `7dd0a8ec`, `23ff0f6c`, and
`7e99bda6`. Two files the scene and boundary rows rest on are unchanged across
`7e99bda6..3311892f` — `crates/bitty-runtime/src/plugin_runtime/services.rs`
and `crates/bitty-terminal/src/plugin_runtime.rs` — so the rows resting on them
keep their earlier revision; the registry, the scene host, the presentation
session, the workspace runtime, and the composition files did change in that
range and were re-read at `3311892f`. `0f6a1c7b` then changed
`plugin_runtime/panel_generation.rs` (new), `plugin_runtime/mod.rs`,
`registry/panel.rs`, `registry/host.rs`, and
`crates/bitty-terminal/src/plugin_runtime.rs`, so every row this merge re-read
is re-read at `26360f15` and says so. The rows on `registry/panel.rs` that it
was not re-read for keep their `3311892f` pin under the table headers below,
and their line numbers have drifted since that read. These rows
record what exists; none is a conformance claim against this record, and none
promotes anything to **Verified** or **Compatible**. Line numbers drift; the file path
is the durable citation.

| Surface                      | Status at `3311892f` unless noted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel registry and lifecycle | `crates/bitty-runtime/src/registry/panel.rs` holds `PanelRegistry` with `create_panel`, `mount_panel`, `unmount_panel`, `focus_panel`, `suspend_panel`, `resume_panel`, `dispose_panel`, `present_placeholder`, `rebind_panel`, `retire_rebound_ceiling`, `dispose_workspace_panels`, monotonic generation, `StaleHandle`, `GenerationExhausted`, and MRU-per-workspace focus. The placeholder, rebind, and bulk-dispose entries are new since `7e99bda6`; each is recorded in its own row below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Panel record contents        | `PanelRecord` (`crates/bitty-runtime/src/registry/panel.rs:594`) carries `id`, `generation` (`:598`, the allocation epoch), `state`, `panel_type`, `workspace: Option<WorkspaceId>` (`:601`), `view`, `title`, `binding: Option<PanelBinding>` (`:613`), `last_controller_generation: Option<Generation>` (`:622`), `last_controller_owner: Option<PluginId>` (`:638`), and `placeholder: Option<PanelPlaceholder>` (`:646`). `PanelBinding` (`:424`) holds one pair, `plugin_id` and `controller_generation`, so an owner never exists without the controller generation written with it; `owner()` (`:655`), `controller_generation()` (`:668`), and `grant_key_generation()` (`:680`) are the only readers. There is no separate provider field and no standalone current-controller field. `workspace` is still written only by `create_panel`; no assignment path exists after creation. The binding writer is `rebind_panel`'s phase 2 step 2, reached in production only through `AppPanelGenerationPort::bind_successor` (`crates/bitty-terminal/src/plugin_runtime.rs:815`) at a plugin reload since `0f6a1c7b`, so on every other live path `binding`, `last_controller_generation`, `last_controller_owner`, and `placeholder` are all `None` and the record is created with them set to `None` (`create_panel`, `:1845`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Panel allocation generation  | `create_panel` bumps the registry-wide counter and stamps the result on the record, so a panel's `Generation` is the allocation epoch of the whole registry, not a per-panel fencing counter. Disposal retires the record and bumps the counter again.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Plugin-created panels        | `bitty.panel.create` reaches the host through `PanelCreateHandler = Rc<dyn Fn(&str) -> Result<(u64, u64), BridgeError>>` (`crates/bitty-runtime/src/plugin_runtime/services.rs`), which is handed only a type string. The production backend (`crates/bitty-terminal/src/plugin_runtime.rs`) reads the Core-published `focused_workspace` cell and calls `create_panel(parsed, Some(workspace))` (`b0d86eee`), so a created record is attributed to the presented workspace; a `None` cell returns `E_UI_UNAVAILABLE` before any record is allocated. The registry behind it is process-owned and shared by every generation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Workspace membership         | Membership is assigned at creation and only when the caller passes `Some(WorkspaceId)`. `create_panel` then charges `max_panels_per_workspace`, inserts into `workspace_panels`, and seeds `focus_per_workspace`; with `None` it charges only the window-wide `max_panels_per_window` (which counts every record), never appears in a workspace list, and never enters the focus MRU. The registry also declares `active_workspace: Option<WorkspaceId>`, assigned only inside `create_panel` when it is `None` and never read: write-only and registry-global, not a per-generation fact. `Runtime::focused_view()` (`crates/bitty-runtime/src/runtime/layout_focus.rs`) returns the focused `ViewId` or `None`; `Runtime::focused_workspace_id()` (`crates/bitty-runtime/src/runtime/workspaces.rs:278`) resolves it to the presented slot's minted id or `None`, and the production create backend reads it through the Core-published `focused_workspace` cell (see the workspace identity row).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Workspace identity           | `WorkspaceSlot` (`crates/bitty-runtime/src/runtime/workspaces.rs:65`) carries `pub id: WorkspaceId`, minted once by `Runtime::mint_workspace_id` (`:296`) when the slot is created and never reused. `Runtime::active_workspace_id` (`:256`) always answers for the presented workspace; `Runtime::focused_workspace_id` (`:278`) reads `focused_view()`, verifies the leaf is in the live layout, and returns the presented slot's id or `None`. The id lives on the slot that holds `layout` and `focus`, not on an index-keyed side table. `TerminalRegistry::create_workspace` (`crates/bitty-runtime/src/registry/terminal.rs:342`) still mints from its own `next_workspace_raw` counter, but its callers are tests; it remains a separate counter, neither bridged to the slot id nor retired. `TerminalRegistry::active_workspace` (`:399`) and `set_active_workspace` (`:408`) still have no production callers. The create path is wired: `bitty.panel.create` reads the Core-published `focused_workspace` cell, calls `create_panel(parsed, Some(workspace))`, and returns a `BridgeError` with the `E_UI_UNAVAILABLE` code when no workspace resolves; `PanelError` itself still has no such variant, and the mapping stays at the bridge seam. The app tick refreshes the cell through `Runtime::focused_workspace_id`, so the resolver has a production caller. [bitty#2889](https://github.com/bitty-terminal/bitty/pull/2889) merged as `b0d86eee`; positive and negative tests cover resolution and the fail-closed branch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Grant lifecycle              | Grants live in `capabilities: HashMap<(PanelId, Generation), BTreeSet<String>>` (`crates/bitty-runtime/src/registry/panel.rs:1517`), written by `grant_panel_capability` (`:2864`) and read by `is_panel_capability_granted` (`:3794`) and `require_panel_capability` (`:3809`). The key's `Generation` is no longer unconditionally the allocation epoch: `grant_key_generation` (`:680`) resolves to the bound controller generation when one exists and to the allocation epoch otherwise, and `resolved_grant_generation` (`:1636`) accepts only the generation that key names, so a stale one resolves to nothing even while a row survives. `rebind_panel` (`:3627`, facade `PanelRuntime::rebind_panel` at `crates/bitty-runtime/src/registry/host.rs:452`) now exists as a production-shaped bind and is the only caller of `derive_rebind_grants` (`:3453`) and `install_rebound_grants` (`:3483`); the panel host is app-owned, so the reload edge reaches it through `PanelGenerationPort::bind_successor` (`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:230`, call at `crates/bitty-runtime/src/plugin_runtime/mod.rs:4063`), and residual `2` is landed. `release_generation_scope` (`:2964`) writes the retired-ceiling tombstone through `retain_grant_ceiling` (`:3256`), stamps `last_controller_generation` and `last_controller_owner` from the binding before releasing it, removes the binding-key row and — when a controller was bound — sweeps any row the allocation epoch still holds (`:3074`), then drains the panel's queued bus events, unregisters the panel commands the ending generation registered, dismisses the overlays attributed to `(PanelId, generation)`, and writes one `GenerationReleaseRecord` (`:1298`) read back through `unbind_release_count` (`:3224`) and `unbind_release_record` (`:3215`). Its direct callers are `dispose_panel` (`:2106`, call at `:2152`) and `present_placeholder` (`:2264`, call at `:2347`). `dispose_panel` is itself reached at the plugin generation boundary through the scene host — `clear_ui_blocks` → `SceneHost::release_owner` → `release_panel` → `PanelRuntime::dispose_panel` — so the release does run at that boundary for the panel a generation mounted (residual `5`). `present_placeholder` is reached in production at `26360f15` through `PanelGenerationPort::release_generation` (`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:220`, call at `crates/bitty-runtime/src/plugin_runtime/mod.rs:3857`), which presents it on the containers the ended generation still binds (residual `4`, landed). `retire_rebound_ceiling` (`:3146`) drops the tombstone after a committed bind, gated on the record actually binding a controller. |
| Component-request teardown   | `drop_plugin(plugin_id)` in `crates/bitty-runtime/src/plugin_runtime/component_requests.rs` retains `submissions` on `plugin_id`, filters `in_flight` on `plugin_id`, and retains `tickets`/`completed` on `owner != plugin_id`. It is **plugin-scoped**: none of those structures carries a generation, so "one generation's tickets" was wrong. No panel equivalent exists, generation-scoped or otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Scene-panel binding          | `crates/bitty-runtime/src/scene_host.rs` keeps `HostPanel { handle, view, owner: String, epoch: u32 }` (`:159`). `ensure_panel` (`:458`) refuses a different `owner` or `epoch` with `E_UI_UNAVAILABLE` ("held by another plugin generation"). `release_owner(owner, epoch)` (`:365`) drops that generation's scenes and calls `release_panel`, which calls `dispose_panel`; `detach` does the same when a generation's last scene goes. The panel is created with `create_panel(PanelType::Rich, None)`. Since `3311892f` the host is also the presentation session's overlay attribution sink: `panel_handle_for` (`:394`) resolves the generation's own panel, `admit_attributed_overlay` (`:418`) admits one `NonModal` registry overlay under `(panel_id, panel_generation)` through `create_panel_overlay` (`:424`), and `dismiss_attributed_overlay` (`:441`) is idempotent. A generation that mounted no `terminal`-slot scene owns no panel, so its attribution is refused and counted rather than silently dropped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Generation boundary trigger  | `PluginServices::clear_ui_blocks` (`crates/bitty-runtime/src/plugin_runtime/services.rs:3207`) calls `SceneHost::release_owner(&self.plugin_id, self.ui_epoch.get())` (`:3213`) when a scene backend is installed, then drops the generation's block registry and spec overlay handles. Four lifecycle events run it, each named by its enclosing function in `crates/bitty-runtime/src/plugin_runtime/mod.rs`: `suspend_inner` (`:3544`, call at `:3561`), `dispose_inner` (`:3664`, call at `:3679` — unload, disable, crash), `reload_inner` (`:3832`, which enters `dispose_inner` so generation `N` is released before `N+1` activates, `A.2`/FS-6), and activation `rollback` (`:4789`, call at `:4811`). `release_owner` retains every scene whose `owner`/`epoch` does not match and then `release_panel` (`crates/bitty-runtime/src/scene_host.rs:530`) disposes only the `HostPanel` that matches both, so a foreign owner or a stale epoch is a no-op rather than a cross-generation release (`ensure_panel`, `:458`, refuses a different `owner`/`epoch` with `E_UI_UNAVAILABLE`). The container it can release is the `terminal`-slot scene panel, created `Rich` with no workspace (`:511`), which is why the edge reaches exactly that panel and no other.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Controller generation value  | `ui_epoch: Cell<u32>` is set from the plugin entry's activation counter (`set_ui_epoch(entry.generation)`), which activation advances with `saturating_add(1)`. Handle minting masks it to 30 bits (`UI_HANDLE_EPOCH_BITS`); `HostPanel.epoch` stores the unmasked `u32`. This is a different counter and a different type from the registry's `Generation(u64)`, and nothing in code compares the two.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Panel state machine in code  | Two tables, not one, and the unbound condition is neither. `bitty_ui::panel::PanelState` (`crates/bitty-ui/src/panel.rs:78`, six states) is what `PanelRecord.state` holds, and its `can_transition` permits `Created`, `Mounted`, `Focused`, and `Suspended` to `Disposed`. `crates/bitty-ui/src/panel_state.rs` adds a seventh `Closed` state in `PanelLifecycle`, whose `can_transition` also permits `Created -> Disposed` and `Focused -> Disposed` (`7dd0a8ec`, one test per edge), so the two tables agree on every disposal edge. No seventh or eighth `PanelState` was added for "unbound": since `7c50c9db` that state is the record's `placeholder: Option<PanelPlaceholder>` (`panel.rs:646`) beside a `None` `binding`, which is a fact about the controller and the content rather than a lifecycle state. Its vocabulary is closed and lives outside the registry: `PlaceholderReason` (`crates/bitty-ui/src/panel_recovery.rs:234`, seven spellings), `RecoveryReason` (`:319`, eight, one of which disposes the container), `RecoveryOutcome`'s close-side mapping, and the counter `RECOVERY_ATTEMPT_CAP = 8` (`:66`) enforced by `RecoveryBudget` (`:640`), which is keyed `(PanelId, controller generation, reason)` in the registry's `recovery` field (`panel.rs:1546`) and bounded per panel. `present_placeholder` (`:2264`) refuses a token outside the vocabulary with `PanelError::RecoveryReasonRejected` (`:216`) before anything moves. `dispose_panel` still consults neither transition table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Panel disposal call sites    | Outside the registry, `dispose_panel` is called from `crates/bitty-runtime/src/scene_host.rs` (`:493`, `:517`, `:545`, the generation-owned scene panel releasing its container) and from `PanelRegistry::dispose_workspace_panels` (`crates/bitty-runtime/src/registry/panel.rs:2588`), which sweeps a workspace's panels in MRU order with the focused panel first and returns a `WorkspaceDisposeReport` carrying one `PanelDisposalRecord` per disposed panel (reason `quit`, action `disposed`). That sweep is wired to the workspace close: `Runtime::remove_workspace` calls `dispose_panels_of_workspace` (`crates/bitty-runtime/src/runtime/workspaces.rs:2101`), which borrows the installed host and calls `PanelRuntime::dispose_workspace_panels` (`crates/bitty-runtime/src/registry/host.rs:409`, registry call at `:413`); with no host installed it does nothing and the report stays `None`. A refusal is reported in `remaining` and keeps the container and its attribution, so a later sweep retries it; the close never fails because of the sweep. The `bitty.panel.close` and `bitty.panel.destroy` verb backends still answer `not_implemented` (`crates/bitty-runtime/src/plugin_runtime/services.rs:7016`, `:7024`). `PanelRuntime::dispose_panel` also unbinds placement and removes the panel's lease and scene entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Panel lease table            | `PanelRuntime.leases: HashMap<PanelId, PanelLeaseEntry>` (`crates/bitty-runtime/src/registry/host.rs`) is inserted `idle()` at `create_panel` and removed at `dispose_panel`. `PanelLease::check_write` gates the panel write path in `crates/bitty-runtime/src/runtime/submit_host.rs`. The holder is an opaque `LeaseHolder` with no generation dimension, and the table is documented as a UX metaphor recording who may drive a panel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Overlay attribution          | `Overlay` (`crates/bitty-ui/src/panel.rs`) carries `id`, `kind`, `bounds`, `text`, `tooltip`, `generation: u64`, and `truncated` — no panel, plugin, or controller owner on the type. The registry keeps the attribution beside it in `overlay_attribution: BTreeMap<u64, (PanelId, Generation)>` (`crates/bitty-runtime/src/registry/panel.rs:1542`), written by `create_panel_overlay` (`:2708`) and released by `release_attributed_overlays` (`:2742`), so `release_generation_scope` — and therefore `dispose_panel` and `present_placeholder` — dismisses the overlays attributed to `(PanelId, generation)`; `overlay_attribution_of` (`:2725`) and `attributed_overlay_count` (`:2731`) read it back. Since `3311892f` `create_panel_overlay` has a production writer: the panel-attributed presentation overlay, where the presentation session admits through `PresentationOverlayAttribution` (`crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`, field at `:185`, `set_attribution` at `:230`, admit at `:308`, release at `:510`) and the app-owned `SceneHost` installed at `crates/bitty-terminal/src/plugin_runtime.rs:1047` supplies it. The boundary is that only a generation owning a `terminal`-slot scene panel can be attributed: a generation that mounted none is refused and counted (`attribution_refusals`, `:250`), so the attributed release dismisses 0 overlays for those generations. The plugin-facing `panel.overlay` verb still does not exist in this tree — the string is a grant (`crates/bitty-plugin-host/src/capability.rs:217`, `:547`) with no host backend (residual `8`); the grammar is proposed only by a draft candidate in `bitty-plugins-docs`, recorded in the residual ledger. `OverlayManager` offers `dismiss(id)` and a whole-manager `clear()`, and `clear()` runs only in `PanelRegistry::dispose()` (`panel.rs:3839`); `PanelRegistry::dispose()` also clears `overlay_attribution` (`:3845`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Content and capture release  | `clear_ui_blocks` clears the generation's block registry and spec overlay handles and releases its scenes and bind; suspend and dispose additionally revoke the generation's targeting lenses and the plugin-wide overlay capture. Content, capture, and scene release are therefore already generation-scoped on this path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Restart persistence          | `crates/bitty-ui/src/panel_persist.rs` carries `PersistedPanel { id: PanelId, key: PanelRestoreKey { workspace: WorkspaceId, persistent: PersistentId }, title: String }` and the `v=<n>;id=<n>;ws=<n>;pid=<text>;title=<text>` encoding at `PERSIST_MANIFEST_VERSION = 2` (`7dd0a8ec`); `id` is documented as advisory and is never used to re-attach. `plan_restore` refuses `PersistencePolicy::StableIdentity` with `ManifestError::StableIdentityUnsupported` and returns the records unchanged under `Ephemeral`, so the caller mints fresh ids; `stable_identity_is_refused_at_the_restore_entry` covers the refusal. `PersistencePolicy` still has **no `Default` impl** and no production selector, and `plan_restore` still has no production caller. No field carries the creating owner name, and `decode_manifest` wraps the persisted `ws` integer in `WorkspaceId::new`, so the index-to-`WorkspaceId` resolution at restore stays open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Plugin reload ordering       | `crates/bitty-plugin-host/src/lifecycle.rs` implements FS-2's ladder, FS-4 records, and `reload_generation`, which disposes generation `N` before `N+1` activates and restores `N` when activation fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Residual ledger

Every residual carried on
[bitty#2476](https://github.com/bitty-terminal/bitty/issues/2476) is listed
below with its state at `3311892f`. Three states are used, and each means one
thing:

- **landed** — a merged mechanism exists, names a symbol, and a production path
  reaches it;
- **implemented-only** — a merged mechanism exists and is exercised through
  public API, but no production caller reaches it, with the reason stated;
- **BLOCKED-ON-CONTRACT** — the next step is an undecided contract, quoted as
  the question it is, and no amount of wiring closes it.

The blocker text is the last recorded status on the issue, re-read at
`3311892f` and corrected where the code has moved since it was written.
Line numbers drift; the symbol and the file path are the durable citation.

| #   | Residual                                                                                                                       | Status              | Evidence at `3311892f`, or the revision the row names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `PanelRecord` owner field, plus a controller generation distinct from the allocation epoch, with `capabilities` re-keyed to it | landed              | `PanelRecord.binding: Option<PanelBinding>` (`crates/bitty-runtime/src/registry/panel.rs:613`) holds `plugin_id` and `controller_generation` as one pair (`PanelBinding`, `:424`), read only through `owner()` (`:655`) and `controller_generation()` (`:668`); `grant_key_generation()` (`:680`) and `resolved_grant_generation()` (`:1636`) key every grant lookup on the controller generation when one is bound and on the allocation epoch otherwise. [bitty#3120](https://github.com/bitty-terminal/bitty/pull/3120) merged as `c526f81e`; #3128 and #3130 extended it. The shape is landed and tested (`the_allocation_epoch_and_the_controller_generation_are_separate_values`, `:4617`), but the writer is `rebind_panel`'s phase 2 step 2, whose only production caller is the reload edge's `AppPanelGenerationPort::bind_successor` (`crates/bitty-terminal/src/plugin_runtime.rs:815`; residual `2` landed), so a panel that has not reloaded carries no binding.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2   | Production `rebind_panel` with phase 0 capture, the five phase-1 invalidations, and the three phase-2 commits                  | landed              | `PanelRegistry::rebind_panel` (`:3627`, `:3738` at `26360f15`) and the facade `PanelRuntime::rebind_panel` (`crates/bitty-runtime/src/registry/host.rs:452`) commit phase 2 steps 1 and 2, then the facade resets the lease and calls `retire_rebound_ceiling` (`:3146`, `:3169` at `26360f15`; call at `host.rs:481`), which is D.2's order. Phase 0 is `capture_rebind_source` (`:3328`, `:3426` at `26360f15`), the derivation `derive_rebind_grants` (`:3453`, `:3551` at `26360f15`), the install `install_rebound_grants` (`:3483`, `:3581` at `26360f15`). [bitty#3128](https://github.com/bitty-terminal/bitty/pull/3128) merged as `1feda0d8`, extended by [bitty#3130](https://github.com/bitty-terminal/bitty/pull/3130) (`52c1bfa6`). Landed since [bitty#3142](https://github.com/bitty-terminal/bitty/pull/3142) merged as `0f6a1c7b`, read at `26360f15`: the panel host is app-owned, so the seam is an app-installed port — `PanelGenerationPort::bind_successor` (`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:230`, trait at `:210`), held in `PluginRuntime.panel_generation_port` (`crates/bitty-runtime/src/plugin_runtime/mod.rs:870`), taken through `set_panel_generation_port` (`:1822`), called from `bind_panel_generation` (`:1872`, call at `:4063` in `reload_inner`, only after `dispose_inner` returned and the successor activated) — answered by `AppPanelGenerationPort` (`crates/bitty-terminal/src/plugin_runtime.rs:762`, impl at `:782`, `bind_successor` at `:815`), which delegates to the facade `PanelRuntime::rebind_panel` (`crates/bitty-runtime/src/registry/host.rs:452`) so phase 2 step 3's lease reset and the tombstone drop keep D.2's order; the installer is production (`:1179`, beside the scene host) and `the_generation_edge_rebinds_a_container_through_the_installed_port` (`:3323`) drives a reload through the real port. Phase-1 steps 3 and 5 (capture revoke and in-flight cancellation) are discharged before the port is asked: `dispose_inner` runs `clear_ui_blocks` and `cancel_parked_command`, and `reload_inner` enters it. Bounds: `suspend_inner` asks the port for nothing; the port enumerates only containers the predecessor holds through a binding or the retained pair an ended edge left, and nothing in the tree writes a container's first binding (`bitty.panel.create` carries no `PluginId` or generation), so on today's tree the edge reaches the port with an empty set and `:3323` mints the first binding through the public API (follow-up `(e)`); the consent set is empty, so every widening is denied (`PGO-17`). |
| 3   | `ControllerConflict` and `ControllerReleased` in `PanelError`, revalidated at use                                              | landed              | Both variants exist (`:189`, `:206`) and are produced by `panel_state_at_controller_fence` (`:1680`), applied at the mount surface (`mount_panel`, `:1911`, fence call at `:1933`). [bitty#3121](https://github.com/bitty-terminal/bitty/pull/3121) merged as `1567da45`. The variant's doc at `26360f15` no longer says it is unreachable: `0f6a1c7b` rewrote it as reachable wherever a binding exists — a verb that presents the allocation epoch while a controller is bound lands there — and the first binding is still minted by tests (follow-up `(e)`). The collision with `PGO-15` is follow-up `(d)` below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | Unbound or placeholder panel state, the reason vocabulary, and the capped recovery counter                                     | landed              | `PanelRecord.placeholder: Option<PanelPlaceholder>` (`:646`, type at `:550`) is the unbound representation — no seventh `PanelState`; `present_placeholder` (`:2264`, `:2286` at `26360f15`) writes it and reads the closed vocabulary `PlaceholderReason` (`crates/bitty-ui/src/panel_recovery.rs:234`, seven spellings) and `RecoveryReason` (`:319`, eight); the counter is `RecoveryBudget` (`:640`) under `RECOVERY_ATTEMPT_CAP = 8` (`:66`), keyed `(PanelId, controller generation, reason)` in the registry's `recovery` field (`panel.rs:1546`) and read through `recovery_attempts` (`:2397`), `recovery_saturated_for` (`:2409`), and `recovery_records` (`:2427`); a token outside the vocabulary is refused with `PanelError::RecoveryReasonRejected` before anything moves. [bitty#3125](https://github.com/bitty-terminal/bitty/pull/3125) merged as `7c50c9db`. Landed since [bitty#3142](https://github.com/bitty-terminal/bitty/pull/3142) merged as `0f6a1c7b`, read at `26360f15`: `present_placeholder` now has a production caller — `PanelGenerationPort::release_generation` (`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:220`, trait at `:210`), called from `release_panel_generation` (`crates/bitty-runtime/src/plugin_runtime/mod.rs:1846`, call at `:3857` in `dispose_inner`, which dispose, unload, disable, and the `reload_inner` teardown reach as `reloaded`) — and `AppPanelGenerationPort::release_generation` (`crates/bitty-terminal/src/plugin_runtime.rs:783`, installed at `:1179`) answers it through `PanelRuntime::present_placeholder` (`crates/bitty-runtime/src/registry/host.rs:512`), so the tombstone, the grant-row removal, the queue drain, the command unregistration, and the overlay dismissal run before the placeholder is visible; `tests/panel_placeholder_bounds.rs` (6 rows) still covers the bounds. Bounds: only a container the ended generation still binds is presented, so with no first binding written anywhere in the tree the edge presents nothing on today's tree (follow-up `(e)`); a refused reason moves nothing and is reported in `refused`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 5   | A caller for `release_generation_scope` at the plugin generation boundary                                                      | landed              | `release_generation_scope` (`crates/bitty-runtime/src/registry/panel.rs:2964`) has two direct callers inside the registry — `dispose_panel` (`:2106`, call at `:2152`, container-retiring) and `present_placeholder` (`:2264`, call at `:2347`, unbind with the container preserved) — and a production path from outside it that runs at the generation edge: `PluginServices::clear_ui_blocks` (`crates/bitty-runtime/src/plugin_runtime/services.rs:3207`) calls `SceneHost::release_owner` (`:3213`), `release_panel` (`crates/bitty-runtime/src/scene_host.rs:530`) disposes the `HostPanel` whose `owner` and `epoch` both match, and `dispose_panel` runs the release because a mounted panel counts as a controller (`panel.rs:2131`, branch at `:2145`). `clear_ui_blocks` runs on four events: `suspend_inner` (`crates/bitty-runtime/src/plugin_runtime/mod.rs:3544`, call `:3561`), `dispose_inner` (`:3664`, call `:3679`), the `reload_inner` (`:3832`) path that enters `dispose_inner` so `N` releases before `N+1` activates, and activation `rollback` (`:4789`, call `:4811`). The installer is production, not a test: `crates/bitty-terminal/src/plugin_runtime.rs:1047` inside `discover_with_roots` (`:937`), reached from `discover_and_activate` (`:865`) and called by `crates/bitty-terminal/src/main.rs:1229`; [bitty#2785](https://github.com/bitty-terminal/bitty/pull/2785) merged as `ff3673c3`, and `release_owner_detaches_the_scene_and_retires_the_panel` (`scene_host.rs:825`) covers the release. What stays open is scope, not reachability: the host holds one `HostPanel` (`:159`) for its `terminal`-slot scene panel, created `Rich` with no workspace (`:511`), so the edge releases that container and no other, and a panel created through `bitty.panel.create` is still unnamed at the edge (`PanelCreateHandler`, `services.rs:839`, receives only a type string; follow-up `(e)`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 6   | Bulk dispose-by-workspace in MRU order, with one record per panel (`C.9`)                                                      | landed              | `dispose_workspace_panels` (`:2588`) walks `panels_for_workspace` (`:2502`) — focused panel first, then MRU — calls `dispose_panel` per entry, and returns a `WorkspaceDisposeReport` (`:1431`) with one `PanelDisposalRecord` (`:1392`, reason `quit`, action `disposed`) per disposed panel plus a `remaining` list on refusal. [bitty#3124](https://github.com/bitty-terminal/bitty/pull/3124) merged as `2431ad49`. Reachable: `Runtime::remove_workspace` calls `dispose_panels_of_workspace` (`crates/bitty-runtime/src/runtime/workspaces.rs:2101`, body at `:2213`), which borrows the installed host and calls `PanelRuntime::dispose_workspace_panels` (`crates/bitty-runtime/src/registry/host.rs:409`); `tests/panel_workspace_dispose.rs` carries 10 rows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 7   | Owner-keyed tombstone `(owner, PanelId, N)` with a cross-owner refusal                                                         | landed              | `retained_ceilings: BTreeMap<(Option<PluginId>, PanelId), RetainedGrantCeiling>` (`:1532`) with the owner mirrored on the value (`RetainedGrantCeiling.owner`, `:1274`); `PanelRecord.last_controller_owner` (`:638`, accessor `:3179`) retains the predecessor owner across the edge; `rebind_panel` refuses a bind whose owner is not the predecessor's with `CeilingLost` (`:3704`). [bitty#3130](https://github.com/bitty-terminal/bitty/pull/3130) merged as `52c1bfa6`. One entry per `(owner, panel)`, replaced by the panel's next edge (`:3271`). Two gaps are follow-ups `(a)` and `(b)` below; neither reopens the residual.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 8   | A production writer for `create_panel_overlay`                                                                                 | BLOCKED-ON-CONTRACT | The writer half **landed** at `3311892f`: the presentation session admits its surface through `PresentationOverlayAttribution` (`crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`, field `:185`, `set_attribution` `:230`, admit `:308`, release `:510`), and the app-owned `SceneHost` installed at `crates/bitty-terminal/src/plugin_runtime.rs:1047` implements it through `admit_attributed_overlay` (`crates/bitty-runtime/src/scene_host.rs:418`), which calls `create_panel_overlay` (`:424`) under `(panel_id, panel_generation)`; `tests/presentation_overlay_attribution.rs` carries 4 rows. [bitty#3132](https://github.com/bitty-terminal/bitty/pull/3132) merged as `3311892f`. What remains is the plugin-facing surface: the verb is absent from this tree — `panel.overlay` is a grant string (`crates/bitty-plugin-host/src/capability.rs:217`, `:547`) with no host backend — and only a generation owning a `terminal`-slot scene panel can be attributed at all. **Blocker:** `RFC-OQ-5`, and what it now waits on is owner acceptance rather than an unwritten grammar: the sibling corpus `bitty-plugins-docs` carries `specifications/panel-overlay-capability-candidate.md` ([PR #189](https://github.com/bitty-terminal/bitty-plugins-docs/pull/189), squash `9b4174f8`, `status: draft`), which proposes `bitty.panel.overlay_show` and `bitty.panel.overlay_hide` with a parameter grammar, typed denials, attribution to `(panel_id, generation)`, and proposed bounds `OV-1` through `OV-4`. That document is a draft candidate, not accepted text; this record links it and copies none of it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 9   | The `PGO` matrix as `crates/bitty-runtime/tests/panel_generation_ownership.rs`                                                 | landed              | The file exists with a coverage map naming where each row lives, driving the **production** bind through its public entry points rather than a test-only binder. [bitty#3130](https://github.com/bitty-terminal/bitty/pull/3130) merged as `52c1bfa6`; [bitty#3128](https://github.com/bitty-terminal/bitty/pull/3128) (`1feda0d8`) carries the 11 rows in `tests/panel_rebind.rs` it maps to. Rows still without a home are named by the file itself rather than implied covered: `PGO-4`, `PGO-5`, `PGO-20` (crash and disable recovery, plugin-host driven), `PGO-6` (reload racing a mount), `PGO-9` (`PanelId` guessing across every verb), `PGO-11` (provider version records), `PGO-13` (disposal reclaim against the PB-3 tolerance), and `PGO-15` (verbs from a displaced generation, plugin-runtime driven — follow-up `(d)`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 10  | Restore path: owner field, index-to-`WorkspaceId` resolution, production `plan_restore` caller                                 | BLOCKED-ON-CONTRACT | Unchanged at `3311892f`: `crates/bitty-ui/src/panel_persist.rs` is not in the `7e99bda6..3311892f` diff. `plan_restore` (`:472`) refuses `StableIdentity` but has no production caller — its only non-test reference is the re-export at `crates/bitty-ui/src/lib.rs:275`; `PersistedPanel` (`:267`) carries `id`, `key`, and `title` and no creating owner; `PERSIST_MANIFEST_VERSION` is still `2` (`:55`) and `decode_manifest` (`:367`) wraps the persisted `ws` integer in `WorkspaceId::new`, so the index stays an interpretation rather than a resolution. **Blocker:** the persistence contract itself — record fields, manifest version, and the index-to-`WorkspaceId` resolution (`RFC-OQ-9`, and the persistence half of PW-5) — is undecided, so a production caller would commit to an encoding the contract has not fixed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

One residual names no new mechanism beyond its dependency: residual `10` cannot
carry an owner until the persistence contract fixes the fields. Residual `5`'s
surface question is answered in the tree rather than by a decision here — the
plugin-host generation lifecycle performs the edge release for the panel the
scene host holds — and what remains open on it is the container a generation
created through `bitty.panel.create`, which no seam in the tree names at the
edge (follow-up `(e)`).

What landed, verified by symbol rather than by prose:

| Change                                        | Symbol and file:line                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Landed by                                                                                                                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four-family release at the edge               | `release_generation_scope` (`crates/bitty-runtime/src/registry/panel.rs:2964`) removes the grant row, drains queued bus events through `clear_panel_counted` (`:1226`), unregisters the panel commands through `commands_for` and `unregister_panel` (`crates/bitty-ui/src/panel.rs:618`, `:622`), dismisses attributed overlays through `release_attributed_overlays` (`:2742`), and writes one `GenerationReleaseRecord` (`:1298`) read through `unbind_release_count` (`:3224`), where `None` is "no edge ran" and `Some(0)` is "the edge released nothing" | [bitty#3094](https://github.com/bitty-terminal/bitty/pull/3094) (`7dd0a8ec`)                                                                                                              |
| Tombstone written first, release fails closed | `retain_grant_ceiling` (`:3256`) stores the departing generation's set before `capabilities.remove`, and a `ResourceExhausted` refusal returns before any other family is touched, so the live row and every other family survive; `dispose_panel` runs the release before its view, queue, and record teardown and propagates the error (`:2152`)                                                                                                                                                                                                             | [bitty#2890](https://github.com/bitty-terminal/bitty/pull/2890) (`6bc0c5fa`) for the tombstone, [bitty#3094](https://github.com/bitty-terminal/bitty/pull/3094) (`7dd0a8ec`) for the edge |
| Both disposal edges                           | `PanelLifecycle::can_transition` (`crates/bitty-ui/src/panel_state.rs:145`) permits `Created -> Disposed` and `Focused -> Disposed`, one test per edge                                                                                                                                                                                                                                                                                                                                                                                                         | [bitty#3094](https://github.com/bitty-terminal/bitty/pull/3094) (`7dd0a8ec`)                                                                                                              |
| Restore key                                   | `PanelRestoreKey` (`crates/bitty-ui/src/panel_persist.rs:239`), `PERSIST_MANIFEST_VERSION = 2` (`:55`), `plan_restore` refusing `PersistencePolicy::StableIdentity` (`:472`)                                                                                                                                                                                                                                                                                                                                                                                   | [bitty#3094](https://github.com/bitty-terminal/bitty/pull/3094) (`7dd0a8ec`)                                                                                                              |
| Panel binding and owner on the record         | `PanelBinding` (`crates/bitty-runtime/src/registry/panel.rs:424`), `PanelRecord.binding` (`:613`), `grant_key_generation` (`:680`), `resolved_grant_generation` (`:1636`)                                                                                                                                                                                                                                                                                                                                                                                      | [bitty#3120](https://github.com/bitty-terminal/bitty/pull/3120) (`c526f81e`)                                                                                                              |
| Two typed refusals at use                     | `PanelError::ControllerConflict` (`:189`), `PanelError::ControllerReleased` (`:206`), `panel_state_at_controller_fence` (`:1680`) applied at `mount_panel` (`:1933`)                                                                                                                                                                                                                                                                                                                                                                                           | [bitty#3121](https://github.com/bitty-terminal/bitty/pull/3121) (`1567da45`)                                                                                                              |
| Workspace-close disposal in MRU order         | `dispose_workspace_panels` (`:2588`), `WorkspaceDisposeReport` (`:1431`), `PanelDisposalRecord` (`:1392`), wired at `crates/bitty-runtime/src/runtime/workspaces.rs:2101`                                                                                                                                                                                                                                                                                                                                                                                      | [bitty#3124](https://github.com/bitty-terminal/bitty/pull/3124) (`2431ad49`)                                                                                                              |
| Unbound placeholder and capped recovery       | `PanelPlaceholder` (`:550`), `PanelRecord.placeholder` (`:646`), `present_placeholder` (`:2264`), `RecoveryBudget` (`crates/bitty-ui/src/panel_recovery.rs:640`), `RECOVERY_ATTEMPT_CAP` (`:66`)                                                                                                                                                                                                                                                                                                                                                               | [bitty#3125](https://github.com/bitty-terminal/bitty/pull/3125) (`7c50c9db`)                                                                                                              |
| Production bind through the app port          | `PanelRegistry::rebind_panel` (`:3627`), `PanelRuntime::rebind_panel` (`crates/bitty-runtime/src/registry/host.rs:452`), `retire_rebound_ceiling` (`:3146`), `crates/bitty-runtime/tests/panel_rebind.rs` (11 rows), reached in production through `PanelGenerationPort::bind_successor` (`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:230`) from `reload_inner` (`crates/bitty-runtime/src/plugin_runtime/mod.rs:4063`) via `AppPanelGenerationPort` (`crates/bitty-terminal/src/plugin_runtime.rs:782`)                                      | [bitty#3128](https://github.com/bitty-terminal/bitty/pull/3128) (`1feda0d8`)                                                                                                              |
| Owner-keyed tombstone and the `PGO` matrix    | `retained_ceilings` keyed `(Option<PluginId>, PanelId)` (`:1532`), `last_controller_owner` (`:638`, `:3179`), cross-owner refusal (`:3704`), `crates/bitty-runtime/tests/panel_generation_ownership.rs`                                                                                                                                                                                                                                                                                                                                                        | [bitty#3130](https://github.com/bitty-terminal/bitty/pull/3130) (`52c1bfa6`)                                                                                                              |
| Panel-attributed presentation overlay         | `admit_attributed_overlay` (`crates/bitty-runtime/src/scene_host.rs:418`), `PresentationOverlayAttribution` (`crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs:185`), scene host installed at `crates/bitty-terminal/src/plugin_runtime.rs:1047`, `crates/bitty-runtime/tests/presentation_overlay_attribution.rs` (4 rows)                                                                                                                                                                                                                     | [bitty#3132](https://github.com/bitty-terminal/bitty/pull/3132) (`3311892f`)                                                                                                              |

### Open follow-ups from the landed work

Four findings the review of the landed work raised, plus one the ledger sync
raised, recorded here so the next revision inherits them instead of
rediscovering them. None blocks a residual and none changes a decision; each is
fix-forward, and each names the line it was reported against.

- **(a) The allocation-epoch edge inherits the previous controller's owner.**
  `release_generation_scope` stamps the tombstone's owner as
  `bound_owner.or(last_ended_owner)` (`crates/bitty-runtime/src/registry/panel.rs:3044`),
  but `PanelRecord.last_controller_owner`'s own doc says it is `None` "on an
  edge that ended the allocation epoch instead of a bound controller — an
  unbound panel has no owner to stamp" (`:634`). A probe produced a tombstone
  `(Some(owner), Generation(2))` for an epoch edge that had no bound owner, and
  the owner fence then refuses a later bind that presents another owner. The
  field's contract and the write disagree; one of the two must move.
- **(b) The one-entry-per-`(owner, panel)` rule has no revert-detecting test.**
  Removing the `retained_ceilings.retain(...)` block at
  `crates/bitty-runtime/src/registry/panel.rs:3271` leaves every suite green, so
  residual `7`'s retention rule is enforced by code no test would miss.
- **(c) A live cross-owner refusal cannot name both generations.** The refusal
  at `crates/bitty-runtime/src/registry/panel.rs:3704` returns
  `CeilingLost { last_controller_generation: None, tombstone_generation: None }`
  when a still-bound predecessor's owner differs and no tombstone exists, which
  renders as "no predecessor ceiling" — so the FS-4 record A.2 asks for cannot
  name the generation that held the panel and the one refused.
- **(d) The widened fence returns a variant D.2 does not define for that case.**
  A generation whose own binding already ended is refused with
  `ControllerReleased` (`:3689`) even while its successor is bound, where D.2
  reserves `ControllerConflict` for "a generation which is not the bound one".
  That divergence is why `PGO-15` stays unclaimed and is listed as unclaimed in
  the matrix's coverage map.
- **(e) A `bitty.panel.create` container has no release at the generation edge.**
  The generation edge releases through `clear_ui_blocks` → `SceneHost::release_owner`,
  and the scene host holds exactly one `HostPanel`
  (`crates/bitty-runtime/src/scene_host.rs:159`) for its `terminal`-slot scene
  panel. A container a generation allocated through `bitty.panel.create` is
  created with `create_panel(parsed, Some(workspace))` and nothing else: the seam
  is `PanelCreateHandler = Rc<dyn Fn(&str) -> Result<(u64, u64), BridgeError>>`
  (`crates/bitty-runtime/src/plugin_runtime/services.rs:839`), which carries no
  `PluginId` and no generation, so no seam in the tree names that panel when
  its creating generation ends. Such a panel is released by
  dispose-by-workspace (`C.9`, `dispose_workspace_panels`) or not at all. Residual
  `5` is recorded as landed for the panel `A.2`'s release can name; the wider
  reading, in which every container a generation created is released with it,
  is what this gap leaves open, and closing it needs the same binding question
  `A.3` forbids answering with a second ledger.

### Code grounding

The evidence above was read from `bitty` `origin/main` at
`3311892f75b38adb50e835822e1129c72866a6a3` unless a row names an earlier
revision; the residual ledger and the landed changes were re-read there, and
the release, restore, and lifecycle rows keep the revisions they name.
Primary files:
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
`crates/bitty-ui/src/panel_persist.rs`,
`crates/bitty-ui/src/panel_recovery.rs`,
`crates/bitty-plugin-host/src/lifecycle.rs`, and the panel suites under
`crates/bitty-runtime/tests/` (`panel_rebind.rs`,
`panel_generation_ownership.rs`, `panel_workspace_dispose.rs`,
`panel_placeholder_bounds.rs`, `panel_grant_ceiling.rs`,
`panel_unbind_release.rs`, `panel_workspace_identity.rs`, and
`presentation_overlay_attribution.rs`).

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
been drained), and the caller-supplied consent set for this bind. Since
`1feda0d8` and `52c1bfa6` the `rebind_panel` two-phase boundary in
[D.2](#d2-two-phase-bind) does invoke `derive_rebind_grants` and
`install_rebound_grants`, and the tombstone is owner-keyed
(`(owner, PanelId, N)`). That caller exists since `0f6a1c7b`: the plugin
runtime reaches the boundary across a reload (`N -> N+1`) through the
app-installed `PanelGenerationPort::bind_successor`, and the
container-preserving edge runs through `PanelGenerationPort::release_generation`
into `present_placeholder`. What still does not exist is a production
permission-diff consent record (the port passes an empty set, so every
widening is denied) and an edge that names a `bitty.panel.create` container
which never bound a controller (follow-up `(e)`); with those open, the
end-to-end reload path is reached but not complete, and it remains required
work rather than shipped behavior.

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
   across unbind (`6bc0c5fa`), beside the retained
   `last_controller_owner` that keys the tombstone (`52c1bfa6`). No previous
   controller — a panel that has
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
- **Two typed refusals, neither borrowed from `StaleHandle`.** `ControllerConflict`
  refuses a verb that names a generation which is not the
  bound one, carrying the panel id, the bound generation, and the presented
  one. `ControllerReleased` refuses a verb that was in flight when its
  generation was unbound. Both exist in `PanelError` since `1567da45`
  (`crates/bitty-runtime/src/registry/panel.rs:189`, `:206`) and the fence that
  produces them is applied at the mount surface; no other verb is wired to it
  yet, and every live call site presents the allocation epoch, which the fence
  still accepts. One divergence is recorded rather than settled: the fence
  returns `ControllerReleased` for a generation whose own binding ended even
  while its successor is bound, where this section names `ControllerConflict`
  for "a generation which is not the bound one" (follow-up `(d)` under
  [Implementation status](#implementation-status)).
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

| Family                  | Key in code today                                                                                                                                                                                                           | Generation-revocable today                                                                                                                                                                                                                                                                               | Required action                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability grants       | `capabilities[(PanelId, allocation Generation)]`; written by `grant_panel_capability`, removed by `release_generation_scope` (reached from `dispose_panel`, which the plugin generation edge enters through the scene host) | Partly — the release drains `(PanelId, N)`'s grants, queued events, commands, and attributed overlays, but the key's generation is the allocation epoch, which a reload does not change, and every production path to it retires the record                                                              | Re-key to `(PanelId, controller generation)` (landed); reach the release from the plugin boundary (landed for the scene-panel container, open for a `bitty.panel.create` container); capture, remove, install |
| Content and capture     | Generation-scoped block registry, spec overlay handles, scene, bind, targeting lenses, overlay capture session                                                                                                              | Yes — `clear_ui_blocks` releases them at suspend, dispose, and rollback                                                                                                                                                                                                                                  | Nothing new; the bind must not replay any of it                                                                                                                                                               |
| Overlay attribution     | `overlay_attribution: HashMap<u64, (PanelId, Generation)>` beside `Overlay`, which itself carries no owner; written by `create_panel_overlay`, released by `release_attributed_overlays` (`7dd0a8ec`)                       | At the registry seam — `release_generation_scope` dismisses the attributed overlays; the presentation session is a production writer through the scene host, so a generation release dismisses the surface it raised, and a generation that mounted no `terminal`-slot scene raises nothing attributable | Wire `create_panel_overlay` into a production overlay path (landed for the presentation surface); dismiss in phase 1 as well                                                                                  |
| Scrollback and terminal | No panel-held PTY; access only through the scope-checked host path                                                                                                                                                          | Not applicable — there is no panel-owned handle to revoke                                                                                                                                                                                                                                                | State the non-claim: no object is handed to the successor                                                                                                                                                     |
| Bus queues              | `(PanelId, topic)`, drained by `event_bus.clear_panel_counted` inside `release_generation_scope` (`7dd0a8ec`)                                                                                                               | At the registry seam — the unbind release counts and drains the panel's queue, and `queued_events_for_panel` reads it back                                                                                                                                                                               | Reach the release from the plugin boundary so it runs at the generation edge (landed for the scene-panel container through `dispose_panel`)                                                                   |
| Focus                   | Workspace MRU, not panel state                                                                                                                                                                                              | Not applicable — a rebind grants nothing                                                                                                                                                                                                                                                                 | Nothing new; a rebind must not call focus                                                                                                                                                                     |

`release_generation_scope` is now the per-generation revoker for grants, bus
queues, commands, and overlay attribution (`7dd0a8ec`), so the function the
earlier revision asked for exists, and the plugin boundary does reach it:
`clear_ui_blocks` (`crates/bitty-runtime/src/plugin_runtime/services.rs:3207`)
calls `SceneHost::release_owner` (`:3213`), whose `release_panel`
(`crates/bitty-runtime/src/scene_host.rs:530`) disposes the generation's
`HostPanel` through `PanelRuntime::dispose_panel` (`:545`), which runs the
release (`crates/bitty-runtime/src/registry/panel.rs:2152`). Two qualifications
stand. That path retires the container, so the container-preserving edge A.2
orders before a placeholder runs from `present_placeholder` only, which since
`0f6a1c7b` is reached in production through
`PanelGenerationPort::release_generation`
(`crates/bitty-runtime/src/plugin_runtime/panel_generation.rs:220`) at the
dispose, unload, disable, and reload edges. And `release_owner` names only the
one panel the scene host holds, so a `bitty.panel.create` container is not
released when its creating generation ends unless it bound a controller the
port can enumerate (follow-up `(e)` under
[Implementation status](#implementation-status)).

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
   D.2, and the two-phase bind itself exists as `PanelRegistry::rebind_panel`
   (`1feda0d8`, extended by `52c1bfa6`) — and since `0f6a1c7b` the reload edge
   reaches it through the app-installed
   `PanelGenerationPort::bind_successor`, so the boundary is no longer
   unwired; what still has no production source is the permission-diff consent
   record it takes as an empty set. `PGO-16`, `PGO-17`, and `PGO-18`
   discriminate a ceiling from a source and a failed invalidation from a
   partial bind, while `PGO-22` discriminates
   the snapshot that keeps the ceiling readable from a derivation that reads
   the table after invalidation and now crosses the generation edge that
   deletes it. **A displaced generation cannot observe its successor:**
   `PGO-7`
   reads the emptied families back through the accessors the verbs use on both
   the live-row and tombstone paths, `PGO-21`'s mechanism is exercised by the
   workspace-close suite without the row being labelled, and `PGO-23` asserts
   that the ending generation's
   families are released at the boundary itself when no successor follows.
   `PGO-15` is the row that does not hold yet: the fence refuses a displaced
   generation with the wrong typed class, so the assertion cannot be written
   against the class this record names (follow-up `(d)`).
7. The record states where enforcement does not exist. `PanelError` now
   carries both typed refusals (`1567da45`) and the grant table is keyed by the
   controller generation when one is bound (`c526f81e`), but the binding is
   written only by `rebind_panel`'s phase 2 step 2, whose only production
   caller is the reload edge's port, so a panel that has not reloaded still
   presents the allocation epoch as its only key. `create_panel_overlay` has a production writer since
   `3311892f`, but only for a generation that owns a `terminal`-slot scene
   panel, and the plugin-facing `panel.overlay` verb is still absent from the
   tree — its grammar and proposed bounds live only in a draft candidate in
   `bitty-plugins-docs`, not in accepted text (`RFC-OQ-5`). A workspace-close disposal path exists
   (`2431ad49`), and a placeholder exists (`7c50c9db`) with a production caller
   since `0f6a1c7b` — the port's `release_generation`. The seam itself implements the tombstone capture,
   the `CeilingLost` refusal, the empty-versus-missing distinction, live-row
   precedence, and the live-panel capacity bound with fail-closed insertion
   (`6bc0c5fa`, `B-5`), and since `7dd0a8ec` the four-family unbind release
   with its `GenerationReleaseRecord`/`unbind_release_count` accessors and the
   `(WorkspaceId, PersistentId)` restore key with the `StableIdentity`
   refusal; the create path is wired at `b0d86eee`. `PGO-15` still has no row,
   `PGO-12` is half-satisfied (the
   refusal is landed and tested, but no production caller restores a session),
   and `PGO-4`, `PGO-5`, `PGO-6`, `PGO-9`, `PGO-11`, `PGO-13`, and `PGO-20`
   are listed by the matrix as unclaimed rather than implied covered. A reader
   cannot mistake this section for a statement of current
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
   controller generation and distinct from the allocation generation, with the
   owner retained beside it (merged: `c526f81e` for the shape, `52c1bfa6` for
   the retained owner); the production `rebind_panel`
   boundary with the capture step, the two-phase order, and the fail-closed
   branches (merged at `1feda0d8` and `52c1bfa6`, still without a production
   caller); the unbind release at the generation edge with its bounded
   counter and accessor, releasing grants, queued events, commands, and
   attributed overlays (the accessors and the four released families merged at
   `7dd0a8ec`, reached from `dispose_panel` and `present_placeholder`, the
   latter itself uncalled); the
   retired-ceiling tombstone with its configured cap (the registry's
   `max_panels_per_window`, clamped by the retained `MAX_RETAINED_GRANT_CEILINGS`
   bound) and retention (merged at `6bc0c5fa`, re-keyed by owner at
   `52c1bfa6`); the two typed
   refusal variants (merged at `1567da45`, applied at the mount surface);
   grant re-keying to `(PanelId, controller generation)` (merged at
   `c526f81e`); overlay attribution at the registry seam with a production
   writer for scene-panel generations (merged at `3311892f`, the verb surface
   still absent); the workspace-identity surface that now exists in
   `Runtime` (mint at slot creation, store on `WorkspaceSlot`, read through
   `active_workspace_id` and `focused_workspace_id`) and the create-boundary
   wiring that consumes it (merged at `b0d86eee`), passing both A.7 acceptance
   tests; the unbound placeholder with its reason vocabulary and capped
   counter (merged at `7c50c9db`, reached in production through the generation
   port since `0f6a1c7b`); and the bulk dispose-by-workspace path that C.9
   requires (merged at `2431ad49` and wired
   to the workspace close).
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
  until the user closes it, and who owns either is not decided here. The owner
  is the plugin-host generation lifecycle, and the wiring half is no longer
  future work: at `3311892f` the plugin-host generation lifecycle runs the
  release on the four events the [residual ledger](#residual-ledger) names, for
  the panel the scene host holds. What this point keeps open is the failure
  policy around that release, not the component that triggers it.
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
- The four non-blocking defects the landed bind and tombstone work left behind
  — the inherited owner on an allocation-epoch edge, the untested
  one-entry-per-`(owner, panel)` rule, the `CeilingLost { None, None }`
  cross-owner refusal, and the `ControllerReleased`/`ControllerConflict`
  divergence that keeps `PGO-15` unclaimed. They are recorded with the line each
  names under
  [Open follow-ups from the landed work](#open-follow-ups-from-the-landed-work)
  and are fixed forward; none reopens a decision in this record, and none blocks
  a residual.

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
`rebind_panel` boundary now exists in code and is reached in production
through the app-installed panel generation port (`0f6a1c7b`). A
security
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
integration and 4 unit test rows. That commit left the production
`N -> N+1` `rebind_panel`
two-phase boundary and a workspace-close entry point absent, so D.2 remained
open work at that revision. Both have since landed, with different
reachability: `1feda0d8` adds
`PanelRegistry::rebind_panel` and `PanelRuntime::rebind_panel`, which the
app-installed panel generation port reaches at a plugin reload since
`0f6a1c7b` (the panel host is app-owned, so only the composition root can
answer the edge, and no container carries a first binding yet — follow-up
`(e)`), and `2431ad49` adds the bulk dispose-by-workspace path and wires it
to the workspace close (landed and reachable). A fifth independent
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
The 2026-11-13 read of `3311892f` found six of the ten residuals landed, two
implemented with no production caller, and two blocked on an
undecided contract ([Residual ledger](#residual-ledger)); it also found four
non-blocking defects in the landed bind and tombstone code, plus the
`bitty.panel.create` boundary the generation edge does not reach, recorded under
[Open follow-ups from the landed work](#open-follow-ups-from-the-landed-work).
The 2026-11-14 read of `26360f15` moves that count to eight of the ten
residuals landed, none implemented-only, and the same two blocked on an
undecided contract, because residuals `2` and `4` gained a production caller
through the app-installed panel generation port (`0f6a1c7b`,
[bitty#3142](https://github.com/bitty-terminal/bitty/pull/3142)). Those two
blocked contracts, the `bitty.panel.create` boundary the port still does not
name (which leaves the edge with no container to move on today's tree), the
empty consent set the bind receives, the unclaimed `PGO-15`, and the
fact that residual `8`'s grammar is a draft candidate with no acceptance behind
it all argue against sign-off rather than for it, so the verdict does not move.
Owner acceptance is required and is not recorded here.
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
- [Panel Overlay Capability (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/panel-overlay-capability-candidate.md)
  — draft candidate for the plugin-facing `panel.overlay` verb that residual `8`
  waits on: the call shape, parameter grammar, typed denials, attribution to
  `(panel_id, generation)`, and bounds `OV-1` through `OV-4` are all proposals
  there, none accepted and none adopted here.
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
