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

> Status: **draft** decision record. The accepted
> [Panel Runtime RFC](panel-runtime-rfc.md) fixes the panel lifecycle, panel
> identity, generation addressing, and the panel capability families, but it
> states nothing about what happens to a panel when the plugin generation that
> created, drives, or presents into it ends. The accepted
> [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md)
> fixes per-plugin generation ownership and reload ordering but never mentions
> panels. This document records the direction that closes that seam, states
> which parts it decides and which stay open, and names the successor
> acceptance that would make it binding. It accepts nothing, promotes nothing
> to **Verified** or **Compatible**, changes no accepted text, and does not
> describe shipped behavior. Owner acceptance is still required.

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

## Terminology

| Term                        | Meaning in this document                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel container             | The workspace-owned slot and its panel identity: placement, attachment, title, presentation mode, and the visible surface. Outlives any one plugin generation. |
| Panel content               | What the container currently presents: a terminal grid, a declarative scene, a browser surface, or a helper handle. Owned by the generation that produced it.  |
| Controller                  | The plugin generation currently bound to a panel, at most one per panel. A panel may have no controller.                                                       |
| Panel allocation generation | The `Generation` inside `(PanelId, Generation)`. Monotonic, stamps the allocation epoch, and makes a superseded handle fail with `StaleHandle`.                |
| Plugin generation           | The `(PluginId, generation)` pair that owns one VM, its grants, tasks, timers, and queues, per the Plugin Host Runtime RFC A.5.                                |
| Controller binding          | The recorded link from a panel container to the controller generation that currently drives it. Absent today.                                                  |
| Rebind                      | Attaching a new controller generation to an existing panel container without disposing the container or re-minting `PanelId`.                                  |
| Placeholder                 | The explicit, non-interactive panel presentation that names a missing or unavailable controller. Never an empty surface and never a silent orphan.             |
| Restore key                 | The persisted identity pair a restart uses to re-attach a panel container: `(WorkspaceId, PersistentId)`, never a `PanelId`.                                   |

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

Today the distinction exists in no code path (see
[Implementation status](#implementation-status)): a panel created by a plugin
generation carries no record of that generation, so a reload leaves it running
with full authority and no owner, and nothing bounds it.

## Implementation status

Point-in-time evidence from `bitty` at revision `a168b197` (2026-10-24). These
rows record what exists; none of them is a conformance claim against this
record, and none promotes anything to **Verified** or **Compatible**.

| Surface                      | Status at `a168b197`                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panel registry and lifecycle | `crates/bitty-runtime/src/registry/panel.rs` holds `PanelRegistry` with `create_panel`, `mount_panel`, `unmount_panel`, `focus_panel`, `suspend_panel`, `resume_panel`, `dispose_panel`, monotonic generation, `StaleHandle`, `GenerationExhausted`, and MRU-per-workspace focus.                                                                                                               |
| Panel record contents        | `PanelRecord` carries `id`, `generation`, `state`, `panel_type`, `workspace`, `view`, and `title`. It carries **no** owner, plugin, provider, or binding field, and neither this file nor `crates/bitty-ui/src/panel.rs` mentions `PluginId`.                                                                                                                                                   |
| Panel allocation generation  | `create_panel` bumps the registry-wide counter and stamps the result on the record, so a panel's `Generation` is the allocation epoch of the whole registry, not a per-panel fencing counter. Disposal retires the record and bumps the counter again.                                                                                                                                          |
| Plugin-created panels        | `bitty.panel.create` reaches the host through `PanelCreateHandler = Rc<dyn Fn(&str) -> Result<(u64, u64), BridgeError>>` (`crates/bitty-runtime/src/plugin_runtime/services.rs`), which is handed only a type string. The registry behind it is process-owned and installed once at startup (`crates/bitty-terminal/src/plugin_runtime.rs`), so every generation allocates into the same table. |
| Grant lifecycle              | `dispose_panel` removes the panel's commands, bus queues, and `capabilities.remove(&(panel_id, generation))`. Nothing removes a panel's grants on a plugin generation change, because no code path observes one.                                                                                                                                                                                |
| Generation-scoped teardown   | `drop_plugin(plugin_id)` in `crates/bitty-runtime/src/plugin_runtime/component_requests.rs` purges one generation's component tickets and cancels its in-flight requests at suspend, reload, or dispose. No panel equivalent exists.                                                                                                                                                            |
| Panel state machine in code  | `crates/bitty-ui/src/panel_state.rs` carries a seventh state, `Closed` ("Closed by the user: hidden and unfocused, plugin still loaded"), which the accepted lifecycle does not name; `can_transition` allows `Closed -> Mounted`, `Mounted -> Disposed`, `Suspended -> Disposed`, and `Closed -> Disposed`, but not `Created -> Disposed` or `Focused -> Disposed`.                            |
| Restart persistence          | `crates/bitty-ui/src/panel_persist.rs` defaults to `PersistencePolicy::Ephemeral` (fresh ids every restart) because the decision is blocked on `RFC-OQ-9`; `panel_rehydrate.rs` re-applies the seven-axis state without deserializing a VM heap.                                                                                                                                                |
| Plugin reload ordering       | `crates/bitty-plugin-host/src/lifecycle.rs` implements FS-2's ladder, FS-4 records, and `reload_generation`, which disposes generation `N` before `N+1` activates and restores `N` when activation fails.                                                                                                                                                                                       |

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
3. The controller binding is generation-fenced. A container holds at most one
   controller (the at-most-one rule the Panel Runtime RFC applies to
   `PanelId -> ViewId`), and a call that names a controller generation other
   than the bound one fails closed before any content, grid, or PTY access,
   mirroring `StaleHandle`.
4. Rebind preserves the container and its presentation facts — attachment,
   `PresentationMode`, workspace membership, and title — and replaces the
   content. A rebind is not a new allocation, so it charges no additional
   slot against PR-1 (`max_panels_per_workspace`) or PR-2
   (`max_panels_per_window`).
5. A panel with no bound controller is a valid, representable state. It is not
   a dangling reference: it holds its container, presents a placeholder (see
   [Decision E](#decision-e-bounded-recovery)), and accepts no command,
   content, or capture verb.

**Rejected: generation-owned ephemeral panels**, where the panel is a child of
the generation that created it and is disposed with it. Rejected because it
would delete the user's layout, focus history, and title on every plugin
reload and every installed-package `wake`; because it contradicts the accepted
`WorkspaceId` owns-panels relation; because a crash or a budget suspension
would then destroy workspace structure in response to a plugin fault, which
FS-P2 containment forbids; and because the accepted focus and restore rules
are written against a `PanelId` that outlives visibility changes.

**Rejected: no binding at all** (today's shape). It leaves a reloaded
generation with no way to find its own panel, leaves a disabled generation's
panels live and unaudited, and makes "no stale panel survives" unenforceable.

## Decision B: identity and the restore key

**Decided in this record.**

1. **`PanelId` survives a plugin reload.** It is not re-minted by the
   successor generation, not invalidated by generation disposal, and not
   renumbered by a rebind. It changes only on container disposal.
2. **`(PanelId, Generation)` survives a reload unchanged.** The panel
   allocation generation is an allocation epoch, not a controller fence; a
   reload therefore introduces no new panel `StaleHandle` class. Controller
   staleness is a separate, additional fence on the binding, so the two
   generations are never conflated in one field.
3. **A `PanelId` is not addressable authority.** Holding or guessing a
   `PanelId` grants nothing: a plugin reaches a panel only through a granted
   verb, and every such verb is checked against the controller binding before
   the panel is touched. This restates the accepted "presentation never
   confers authority" rule at the identity level.
4. **A `PanelId` is not a restore key.** Restart re-mints a fresh `PanelId`.
   The restore key is `(WorkspaceId, PersistentId)`, with the persisted record
   also carrying the providing `owner.name` and the manifest-declared panel
   key, so a successor generation of the same plugin re-attaches without user
   action, a different plugin can claim it only through explicit user consent,
   and no persisted integer id is trusted as identity.
5. **Until `RFC-OQ-9` is decided, nothing is restored.** The current
   `Ephemeral` default stands: this record fixes the key, not the persistence
   contract, the encoding, the version policy, or whether restart restore
   ships at all.

The consequence to state plainly: within one `Instance`, a panel is durable
across plugin generations; across a process boundary, a panel is not durable at
all until the persistence contract exists.

## Decision C: lifecycle mapping

**Decided in this record.** Panel states are the accepted six; the generation
column names the controller's state at which the panel state is legal. Any
combination not listed is illegal and fails closed.

| Panel state | Legal controller generation states                       | Meaning                                                                                                 |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Declared`  | none; `Registered` (panel type declared in the manifest) | The provider declared the panel type. No `PanelId` exists, and nothing is charged against PR-1 or PR-2. |
| `Created`   | `Activated`                                              | `PanelId` allocated, no attachment. Requires a live controller holding `panel.create`.                  |
| `Mounted`   | `Activated`, or none (placeholder)                       | Bound to a view. The placeholder case is the unbound container described in Decision E.                 |
| `Focused`   | `Activated`                                              | Mounted and owning input routing. Never reachable without an attached view.                             |
| `Suspended` | `Activated`, `Suspended`, or none                        | Invisible without destroying the attachment, or unmounted with the attachment released.                 |
| `Disposed`  | any terminal generation state                            | Container retired: attachment, MRU entry, commands, queues, and grants released.                        |

Transition rules that follow:

1. **Controller `Suspended` does not suspend the panel.** A suspended
   generation detaches handlers and retains grants, so it can receive nothing;
   the panel therefore keeps its container and its state, loses its controller
   verbs, and presents the placeholder. It does not become `Suspended` itself,
   because `Suspended` means "invisible without destroying the attachment",
   which is a workspace fact, not a plugin fact.
2. **Controller `Disposed` never cascades to panel `Disposed`.** The panel
   becomes unbound and presents the placeholder. Only an explicit user close,
   workspace close, or an explicit recovery decision retires the container.
3. **Crash.** A generation that faults enters the FS-2 ladder and ends
   `Disabled`; the panel becomes unbound, presents the placeholder with reason
   `crashed`, and keeps its attachment and focus history. No automatic
   respawn, no retry loop: a crash-triggered reload would restart the same
   fault, which the reload contract already refuses for watcher-triggered
   failures.
4. **Disable.** User or policy disable behaves as crash with reason
   `disabled`, except that the placeholder names the disable rather than a
   fault, and re-enabling the plugin permits a rebind. A disabled plugin's
   panels remain visible until the user closes them; hiding them silently
   would be the orphan this record forbids.
5. **Reload mid-mount.** Because generation `N` is disposed before `N+1`
   activates, a mount that started against `N` must fail closed. The mount is
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
7. **Unexpected fifth case, recorded as open.** The seventh code state
   `Closed` ("hidden and unfocused, plugin still loaded") has no accepted
   counterpart. This record maps `Closed` to "container retained, controller
   still bound, content retained", and leaves its admission into the accepted
   lifecycle to an RFC amendment (see [Open points](#open-points)).

## Decision D: authority on rebind

**Decided in this record: a rebound panel inherits nothing.**

A controller binding carries no authority. On rebind, all of the following are
re-established from the new generation's own activation snapshot, and none is
carried across:

1. **Capability grants.** Panel grants are keyed `(PanelId, generation)` today
   and are cleared only at disposal, so a reload would silently preserve them.
   This record requires an explicit grant invalidation at the binding
   boundary: the successor generation holds only the capabilities its own
   manifest resolution and consent produced, and the intersection is
   recomputed rather than inherited. A narrowed set carries forward per the
   reload contract; a wider set requires permission-diff consent.
2. **Content capture.** No capture of terminal content, clipboard, selection,
   or raw PTY bytes is inherited or replayed. A generation that wants
   observation asks again under its own grants, and the high-risk families
   named by the isolation rules stay high-risk on every ask.
3. **Overlay.** Overlay surfaces contributed by the previous generation are
   released with it. The single modal authority is unchanged: a rebind neither
   acquires nor transfers a modal, and a queued modal request from a disposed
   generation is dropped rather than presented by its successor.
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
| Drop        | The user closes the panel, closes the workspace, or accepts an explicit "discard panels of this plugin" action.                                            | The container is disposed through the normal path; `PanelId` retires; the loss is attributed and reported.                                          |

Rules:

1. Recovery is bounded by construction: one placeholder per unbound panel, no
   per-tick respawn, no unbounded retry, and no diagnostic that grows with the
   number of attempts. Each transition increments a bounded counter and emits
   one FS-4-style record with owner, generation, reason, and action.
2. Placeholder reasons are a closed vocabulary, aligned with the release
   reasons the GUI content path already uses: `reloaded`, `suspended`,
   `disabled`, `crashed`, `unloaded`, `denied`, `incompatible`. A reason
   outside the set is a defect, and a user-supplied reason is never accepted.
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
before merge.

| ID     | Case                                         | Assertion                                                                                                                                                                                                        |
| ------ | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PGO-1  | Reload with a mounted plugin panel           | `PanelId`, attachment, `PresentationMode`, and title are unchanged across generation `N -> N+1`; content is replaced; no `StaleHandle` is produced for the panel itself.                                         |
| PGO-2  | Reload with a suspended panel                | The panel stays `Suspended` with its attachment intact; `N+1` rebinds without a mount; no focus change occurs.                                                                                                   |
| PGO-3  | Controller disposal with no successor        | Panel becomes unbound, presents the placeholder with the right reason, keeps its attachment, and receives no input.                                                                                              |
| PGO-4  | Crash during a callback                      | FS-2 ladder output is unchanged; only the owning generation is affected; sibling panels and terminals stay responsive (FS-P2); the panel's placeholder reason is `crashed`.                                      |
| PGO-5  | Disable, then re-enable                      | Placeholder appears with `disabled`, disappears on rebind after activation, and content is not restored from the disabled generation.                                                                            |
| PGO-6  | Reload racing a mount                        | A mount against a disposing generation commits nothing; the view ends unbound; the panel keeps its pre-mount state; `N+1` can mount cleanly afterwards.                                                          |
| PGO-7  | Rebind authority sweep                       | Grants, overlay ownership, capture handles, subscriptions, and queues are all empty on `N+1` before it acts; a narrowed carry-forward still applies; a capability-adding replacement is blocked pending consent. |
| PGO-8  | Two generations racing for one panel         | The second bind fails closed with a typed controller conflict and changes nothing; at most one controller is ever recorded.                                                                                      |
| PGO-9  | Guessing a `PanelId`                         | An ungranted verb naming a live `PanelId` is denied before any state access; a granted verb naming another generation's panel is denied.                                                                         |
| PGO-10 | Denied capability at rebind                  | Panel presents `unavailable` with the denial named; no content verb is reachable; safe mode produces the same outcome without loading a third-party VM.                                                          |
| PGO-11 | Older or newer provider version              | Newer-persisted content presents `incompatible` and applies nothing; newer-provider-over-older-record ignores unknown fields; no partial application in either direction.                                        |
| PGO-12 | Restart with the current `Ephemeral` default | No panel identity is resurrected; a restored session produces fresh ids and never reuses a persisted numeric id.                                                                                                 |
| PGO-13 | Panel disposal reclaim                       | After disposal, commands, queues, grants, and MRU entries are released and the panel counts return to the pre-creation baseline within the PB-3 reclaim tolerance (FS-P4).                                       |
| PGO-14 | Placeholder bounds                           | A workspace full of unbound panels still produces one bounded placeholder each, no respawn, no unbounded counter growth, and a single findable reason per panel.                                                 |

## What is decided in this record and what stays open

Decided here (candidate direction, awaiting owner acceptance):

- the ownership split at the content boundary and the rejection of
  generation-owned ephemeral panels;
- `PanelId` survival across plugin reload, the separation of allocation
  generation from controller fence, and the restore key
  `(WorkspaceId, PersistentId)` with a fresh `PanelId` on restore;
- the panel-state to generation-state mapping, including crash, disable, and
  reload-mid-mount;
- the no-inheritance rule for grants, capture, overlay, scrollback, and
  subscriptions on rebind;
- the three-outcome bounded recovery and its closed reason vocabulary;
- the required test matrix.

Open, and explicitly not settled here:

- the persistence contract, encoding, version policy, and whether restart
  restore ships (`RFC-OQ-9`, and the persistence half of PW-5);
- which plugin-facing verbs a rebound generation regains, given that
  `bitty.panel.close` and `bitty.panel.destroy` remain unimplemented host
  seams and only `panel.create`, `panel.focus`, and the pinned-float backend
  are wired;
- whether the code-state `Closed` enters the accepted lifecycle, and whether
  `Created -> Disposed` and `Focused -> Disposed` become legal transitions;
- whether a different plugin may ever claim a persisted panel, and under what
  consent surface;
- whether panel-level lease or handoff semantics (the
  [OQ-083](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  direction) compose with the controller binding or sit above it;
- the exact diagnostic spelling and the operator surface for the closed
  reason vocabulary.

## Security review

The record is a trust-boundary record, not only a lifecycle record, because it
decides what authority survives a generation change.

1. No new authority is created. A rebind concedes nothing: grants, capture,
   overlay, and scrollback access are re-derived from the new generation's own
   manifest resolution and consent, and the intersection is recomputed.
2. The confused-deputy case is closed at the type and binding level: a panel
   handle is not authority, a `PanelId` is checked against the controller
   binding before any state access, and no path accepts a `PanelId` where a
   `ViewId` or `TerminalId` is expected.
3. The placeholder path is plugin-free: it renders no plugin text, runs no
   plugin callback, holds no PTY or GPU handle, and its geometry passes no
   `LogicalRect -> PTY` resize.
4. Failure is contained. A crash, disable, or budget suspension affects only
   the owning generation and leaves container structure intact, which is
   strictly less destructive than the cascade a generation-owned panel model
   would require.
5. Nothing here weakens a normative control: invariants 2, 3, 4, and 7 and
   FS-P1 through FS-P5 hold unchanged, and no exclusion in the Panel Runtime
   RFC's explicit-exclusions table is relaxed.
6. A security reviewer is required before acceptance. The two reviewable
   questions are the grant-invalidation point at the binding boundary (it
   currently does not exist in code, so the rule must be implemented, not
   merely restated) and the guarantee that a displaced generation cannot
   observe a successor's content or results.

No `P0` acceptance criterion is modified; the affected evidence row is the one
that would carry the rebind-authority tests.

## Verification plan

Conformance requires, at minimum:

1. An acceptance record — an RFC amendment or successor RFC — that adopts the
   ownership split, the restore key, and the no-inheritance rule, with the
   Panel Runtime RFC's lifecycle section and the Plugin Host Runtime RFC's
   reload section updated in the same wave.
2. Implementation of a controller binding on the panel record, with a
   generation fence distinct from the allocation generation, and grant
   invalidation at the binding boundary.
3. The full [test matrix](#decision-f-required-test-matrix) green headlessly,
   with PGO-7, PGO-8, and PGO-9 also covered by the security evidence for the
   affected criterion.
4. An update to the Panel Runtime RFC's implementation-status rows and to the
   [UI and Compositor Gap Analysis](ui-compositor-gap-analysis.md) so no page
   claims either the old cascade or a shipped rebind.
5. A documented non-claim: restart restore stays unimplemented until
   `RFC-OQ-9`, and the `Ephemeral` default stays the tested behavior.

## Alternatives considered

| Alternative                                                                    | Trade-off                                                            | Disposition                                                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Generation-owned ephemeral panels                                              | Simplest ownership; no unbound state to reason about                 | Rejected — destroys workspace structure on reload, crash, and disable; contradicts the accepted owns-panels relation |
| No binding, keep today's shape                                                 | No new field, no migration                                           | Rejected — a reloaded generation cannot find its panel and a disabled generation's panels stay live and unaudited    |
| Container and content both generation-owned, container retained as a tombstone | One owner everywhere                                                 | Rejected — a tombstone is exactly the silent orphan this record forbids, and it cannot be closed or rebound cleanly  |
| Rebind inherits grants unchanged                                               | No consent round-trip on reload; matches today's accidental behavior | Rejected — it would let a widened replacement inherit narrowed-era authority silently                                |
| Auto-close panels when the provider disappears                                 | Bounded and terminal; nothing left unbound                           | Rejected — a plugin fault must not destroy the user's layout (FS-P2 containment, user intent)                        |
| Placeholder with an automatic retry loop                                       | Looks self-healing                                                   | Rejected — a crash-triggered loop restarts the same fault; the reload contract already refuses it                    |
| Persist `PanelId` as the restore key                                           | Reuses an id users already see                                       | Rejected — restore must not trust a persisted integer, and restart re-mints ids per the accepted rehydration rule    |

## Affected contracts

| Contract                                                                                                                     | Effect                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                                                    | On acceptance: the lifecycle section gains the controller binding and the unbound state; a new open question is retired                 |
| [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md) | On acceptance: the reload section states that a generation change rebinds panels rather than disposing them; FS-6 ordering is unchanged |
| [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)   | Unchanged ceilings; RC-1/RC-2 are re-established per generation at rebind, RC-5 queues re-arm empty, RC-11 store state survives         |
| [Workspace Compositor Specification](workspace-compositor.md)                                                                | Unchanged; the container keeps its `LayoutTree` slot across a rebind, and no decoration is affected                                     |
| [Panel Placement Decision](panel-placement-decision.md)                                                                      | Unchanged direction; the container is a panel identity with a `View` attachment, so rebinding re-parents nothing                        |
| [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)                                                    | Unchanged; Core still owns the scene path, so a rebound generation cannot present without re-submitting content                         |
| [Workspace-Native UI Runtime](ui-runtime-candidate.md)                                                                       | Its panel-versus-plugin lifecycle paragraph gains the reverse direction this record supplies                                            |
| [Panel GUI Content Presentation](panel-gui-content-presentation-candidate.md)                                                | Its generation-owned content handle and release-reason vocabulary are adopted as the content half of the split                          |
| [Chrome Surface Contract](chrome-surface-contract-candidate.md)                                                              | Its "release the scene, the bind, and the Core panel" row needs the container exception stated at acceptance                            |
| [Workspace Panel Invariants](workspace-panel-invariants.md)                                                                  | Unchanged statuses; a rebind invariant would be added by the acceptance wave, not here                                                  |

## Open points

- The persistence contract and encoding behind the
  `(WorkspaceId, PersistentId)` restore key (`RFC-OQ-9`, PW-5 persistence).
- The plugin-facing verb surface a rebound generation regains; `panel.close`
  and `panel.destroy` have no host backend today, so the recovery menu is
  Core-side only for now.
- Admission of `Closed` into the accepted lifecycle, and whether
  `Created -> Disposed` and `Focused -> Disposed` become legal transitions; the
  current `can_transition` table has no path from either state to `Disposed`,
  which a workspace close can reach.
- Cross-plugin adoption of a persisted panel and the consent surface it needs.
- Composition with the OQ-083 lease/handoff direction: whether a panel lease
  and a controller binding are one mechanism or two.
- The exact diagnostic spelling for the closed reason vocabulary and its
  operator surface.
- Whether the unbound placeholder participates in accessibility semantics as
  a named status region; that belongs to the accessibility baseline.

## Acceptance criteria

This record is complete when:

1. It is reviewed, and linked from the Panel Runtime RFC's open-questions area
   and from the Plugin Host Runtime RFC's reload section as the candidate
   resolution of the panel/generation seam.
2. The ownership split, the restore key, and the no-inheritance rule are
   either accepted through an RFC amendment or retained explicitly as a
   candidate with the blocking workstreams named.
3. The [affected-contracts](#affected-contracts) table matches the edits made
   in the same wave.
4. The test matrix is either implemented or tracked as a named blocking
   obligation on the acceptance task, with no row silently dropped.
5. Owner acceptance and a security reviewer sign-off are recorded, since
   Decision D changes what authority survives a generation change.

## P0 Review Sign-off

Required, not waived: this record redefines which authority a plugin
generation may exercise over a panel that predates it, and it names an
enforcement point (grant invalidation at the binding boundary) that does not
exist in code today. A security reviewer must confirm the no-inheritance rule,
the placeholder's plugin-free path, and the containment claim for PGO-4 and
PGO-7 before status can move from draft. No `P0` acceptance criterion is
modified in the meantime, and no shipped behavior is claimed.

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
  also respects.
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
