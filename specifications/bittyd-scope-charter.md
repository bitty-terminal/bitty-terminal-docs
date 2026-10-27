---
title: bittyd Scope Charter
description: Defines the mechanism floor the bittyd session host must own and what must remain in the terminal core, the AI layer, or extensions
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 81
---

# bittyd Scope Charter

> Status: **draft scope charter, not an accepted contract.** It fixes the
> boundary of the `bittyd` session host: which facts the daemon must own
> because no other component can own them correctly, and what must remain in
> the terminal core, the AI layer, or extensions. It does not change
> [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md),
> does not change the accepted
> [bittyd Session-Host Contract](bittyd-session-host-contract.md),
> and claims no implementation. The session-host contract was accepted
> separately on 2026-10-27 through its own P0 gate; accepting this charter
> remains a separate documentation act.

## Document status

This charter exists so that the session host inherits the same discipline the
terminal core already has in the
[Small-Core Capability Floor](small-core-capability-floor.md): a written floor,
an owner for everything above it, and a review gate that rejects silent growth.
It is the session-host counterpart of that floor, not a replacement for it.

- Scope: the `bittyd` process only. The terminal core, the IPC broker, the AI
  layer, and extensions are named where the boundary needs them, but this
  document defines none of their behavior.
- Authority: it explains and constrains the already accepted staging in
  [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  and the accepted service surface in the
  [bittyd Session-Host Contract](bittyd-session-host-contract.md).
  Where this charter and an accepted source disagree, the accepted source wins
  and this charter is corrected.
- Implementation status: none is claimed. No `bittyd` crate or binary exists;
  no daemon, transport, registry, or fake-server code is authorized by this
  document.

## Purpose and scope

The question this charter answers is narrow and recurring: **is this capability
something only the session host can own, or is it policy that belongs to
someone else?**

In scope:

- the mechanism floor the daemon must provide for sessions to be correct;
- the explicit exclusion list, with the owning layer for each excluded item;
- the placement test used to decide a future proposal;
- the change-control rule that keeps the floor from expanding by accretion;
- the security and verification obligations implied by each floor row.

Out of scope:

- the wire format, method set, counters, bounds, and lifecycle states — owned by
  the [session-host contract](bittyd-session-host-contract.md) and
  [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md);
- terminal behavior, rendering, and configuration — owned by the
  [Small-Core Capability Floor](small-core-capability-floor.md) and its cited
  contracts;
- agent semantics, providers, context, and approvals — owned by the AI corpus;
- presentation, workflow, and product experience — owned by extensions;
- remote hosts, multi-user access, and cloud execution — deliberately outside
  the v0.2.0 slice.

## Normative sources this specification must not weaken

This charter must be read together with, and must not weaken:

- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (`accepted`): the daemon trust-boundary gates, single PTY ownership,
  session-grained attach and detach, bounded persistence, and contained
  failure.
- [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  (`accepted`): the v0.2.0 slice, per-domain single writer, service API
  versioning from day one, and `D5` daemon absence as a supported state.
- [bittyd Session-Host Contract](bittyd-session-host-contract.md)
  (`accepted` 2026-10-27): `D-01` through `D-18`, the single-writer rule
  `R-B09`, the `worker_sessions=false` v0.2.0 decision, and the conformance
  matrix.
- [Wheel consumer requirements for the bittyd session host](bittyd-session-host-requirements-candidate.md)
  (`draft`): consumer-facing fields, authority, and `V-01` through `V-34`.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (`accepted`): the local IPC posture, scope families, per-request
  authorization, and the read-only Agent default.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  and [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  (`normative`): `T-09` same-user IPC takeover, `T-10` Agent confused deputy,
  peer-credential checks, and per-action scopes.
- [Small-Core Capability Floor](small-core-capability-floor.md) (`accepted`):
  the terminal-core floor and the rule that everything above it belongs to
  extensions; this charter adds the session-host floor beside it.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`accepted`): Core keeps mechanisms, extensions supply policy, and plugins
  never enter terminal, render, or input hot paths.

The product vision's non-goal about not committing to `bittyd` "at the current
documentation phase" is a staging constraint from that phase. `ADR 0019`
(accepted 2026-10-22) advances the staging to the v0.2.0 slice and is the later
authority; it changes the schedule, not the product position that Bitty is
agent-friendly rather than agent-centric.

## Terminology

| Term               | Meaning in this document                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Session-host floor | The minimum mechanism set below. Nothing above it may be added to the daemon without change control.                            |
| Mechanism          | A fact or operation that requires one correct owner, where a second implementation is a defect rather than a variation.         |
| Policy             | A choice on which reasonable products differ: layout, status wording, notification rules, workflow, model routing, UX.          |
| Session fact       | Registry membership, lifecycle state, generation, revision, lease, attach count, last-seen, and refusal audit.                  |
| Session content    | Terminal bytes, scrollback, prompts, context, tool calls, task state, provider payloads, and approvals.                         |
| Consumer           | A client of the session host: the GUI, `bitty ctl`, an Agent adapter, or Wheel.                                                 |
| Extension          | An L1 Rust Core Extension or an L2 Lua plugin as defined by the [Small-Core Capability Floor](small-core-capability-floor.md).  |
| Daemon absence     | The supported state in which Bitty runs, diagnoses itself, and serves a single window with no daemon present (`ADR 0019` `D5`). |

## Principle: mechanism, not policy

The daemon is an authority, not a product surface. One sentence governs every
proposal:

> **`bittyd` owns session facts. It never owns session content and never owns
> presentation policy.**

This resolves two opposite failure modes at once:

- If the daemon owns too little, every consumer reimplements recovery,
  attach/detach, and generation validation, and the system has no shared
  semantics.
- If the daemon owns too much, it becomes a second product with its own status
  bar, keybindings, configuration language, and eventually its own agents — the
  terminal equivalent of a multiplexer that is powerful and impossible to
  extend.

The floor below is deliberately complete for the first failure and deliberately
empty for the second.

## The session-host floor

Each row is a mechanism no other component can own correctly. Removing a row
does not simplify the daemon; it moves the cost into every consumer.

| Floor row                               | What the daemon owns                                                                                           | Why no other component can own it                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Process and PTY ownership               | Spawn, bind, supervise, reap, and signal the process of a hosted session, and hold its PTY master.             | A second PTY owner is a conformance violation (`ADR 0008`); the daemon is the process authority for hosted sessions. |
| Session registry and identity           | Instance id, session id, session kind, terminal id, membership, and the sole-writer rule.                      | Cross-client visibility and uniqueness need one store; a client-local registry diverges on reconnect.                |
| Counters and fencing                    | `generation` (worker binding) and `state_revision` (snapshot-visible mutation), monotonic and server-assigned. | Clients cannot attest their own freshness; only the writer can increment a fence that others must obey.              |
| Attach, detach, and leases              | Per-connection attach leases, attach count, last-seen, and lease expiry.                                       | Whether anyone is attached is a shared fact; per-client tracking cannot answer it.                                   |
| Control ownership and transfer          | One controller lease per session, control token, explicit attributed transfer, and controller vacate rules.    | Input authority needs a single arbiter; otherwise two clients type into one PTY.                                     |
| Abort, stop, drain, and force           | Terminal causes, grace periods, refusal, reaping, and the immutable terminal record.                           | A lifecycle may end once; only one authority can decide the recorded cause and prevent double termination.           |
| Event delivery guarantee                | Snapshot plus revision-tagged deltas, at-least-once within a live lease, and non-shed terminal notifications.  | Ordering and loss semantics are properties of the transport owner, not of each consumer.                             |
| Refusal and lifecycle audit             | Attributed records of lifecycle transitions and refusals, bounded and owner-private.                           | Audit written by the audited party is not evidence; it must sit with the authority that refused.                     |
| Version handshake, capabilities, bounds | Service version, immutable per-connection capabilities, advertised limits, and typed refusal before effects.   | Downgrade and capability probing are transport-level decisions; per-consumer guesses diverge.                        |

Everything else the daemon might be tempted to do is a policy choice and belongs
to one of the layers below.

## Explicit exclusions

| Excluded capability                                       | Owning layer                                    | Reason it is not a daemon mechanism                                                               |
| --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Layout, workspace, pane tree, split policy                | Terminal core (`ADR 0014`)                      | A session has no opinion about how it is arranged on screen.                                      |
| Tab strips, sidebars, status lines, badges, themes        | Extensions (declarative UI)                     | Presentation is composable; every product answers it differently.                                 |
| Status semantics (`working`, `waiting`, `needs-approval`) | Contract between AI/agent events and extensions | The daemon can report facts (revision, lease, terminal cause) but must not interpret intent.      |
| Keybindings, copy-mode, search, scrollback interaction    | Terminal core                                   | Input and selection are terminal behavior, not session lifecycle.                                 |
| Notification policy (what notifies, wording, silence)     | Extensions plus `platform.notify`               | The daemon may know a session ended; it must not decide whether that is worth interrupting.       |
| Agent logic, models, prompts, context, approvals          | AI layer and the agent surface                  | Semantic task work is not session administration.                                                 |
| Task graphs and orchestration                             | Agent harnesses and durable project tooling     | Ordering work is not owning a session.                                                            |
| Remote hosts, multi-user access, cloud execution          | A future accepted transport and trust contract  | Each adds an authentication and privacy model the v0.2.0 slice does not have.                     |
| Package management and plugin loading                     | Plugin platform and the package manager         | Unrelated authority; loading code in the daemon would create a second plugin host.                |
| Persistence across restart                                | Explicitly none in v0.2.0 (`D-06`)              | Restart persistence changes the state, migration, and recovery contract; it is never incremental. |

Two exclusions deserve emphasis because they are the usual drift points:

- **Status semantics.** The daemon may expose that a session is `running`,
  `stopping`, or terminal, and that a lease exists. It must not decide that an
  agent is "waiting for you". That judgment needs agent-protocol knowledge the
  daemon deliberately does not have.
- **Notification policy.** "A session exited" is a fact; "interrupt the user
  now" is product policy.

## Placement test

A proposal goes into the daemon only if it passes all three questions:

1. **Does it need a single writer?** If two correct implementations could
   coexist and merely disagree, it is policy, not mechanism.
2. **Can a consumer implement it correctly without the daemon?** If yes, it
   stays out. Convenience is not a reason to centralize authority.
3. **If it stays out, will every consumer be forced to reimplement the same
   recovery or validation?** If yes, the mechanism belongs in the floor — this
   is the floor-completeness test, and it is the only test that can add a row.

A proposal that passes must also state its **scope cost**: the IPC scope it
needs, the audit record class it creates, the conformance vectors it requires,
and the platform cells it must pass. A row that cannot pay that cost is not
ready.

## Three layers, one direction of authority

| Layer                      | Owns                                                                        | Must not own                                              |
| -------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| Terminal core (in process) | PTY, grid, scrollback, input, render, and configuration for its own window. | Cross-client session facts, presentation policy.          |
| `bittyd` (out of process)  | Registry, lifecycle, fences, leases, control ownership, refusal audit.      | Session content, status judgment, any plugin API.         |
| Extensions and clients     | Panels, status presentation, workflow, agents, providers, and approvals.    | Terminal state, direct session writes, capability grants. |

Rules that follow from this shape:

- **Authority flows down, state flows up.** A consumer requests an action; it
  never writes session state directly.
- **Extensions must never talk to `bittyd`.** They talk to the terminal core
  through the plugin host and capability grants; the core mediates any session
  call. The daemon has no plugin API and must never grow one, because a second
  extension host inside the authority boundary would recreate the platform
  split this charter exists to prevent.
- **Session content never enters the daemon's records.** Exit status, lease
  identity, and refusal codes are facts; prompts, bytes, argv, and environment
  are not.

## Scope economics

Keeping the daemon small is not only an aesthetic preference; each capability
carries a fixed cost that is paid forever:

| Cost              | Paid per added capability                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| Authority surface | A new IPC scope, its consent wording, and its revocation semantics.              |
| Audit obligation  | A record class, a retention bound, and a redaction rule.                         |
| Verification      | New conformance vectors, negative cases, and stale-generation mutations.         |
| Platform          | A cell in every advertised OS matrix, with native-runner evidence.               |
| Compatibility     | A service-version obligation that cannot be withdrawn without a major bump.      |
| Attack surface    | One more parser, one more state transition, one more same-user trust assumption. |

This is why "small daemon" is a security property as much as a product one, and
why the charter treats every addition as an authority decision rather than a
feature request.

## Comparison anchors

The floor is easier to defend against real designs than against abstractions.

| Archetype                                                           | What it demonstrates                                                                          | What Bitty takes                                                         | What Bitty must not take                                                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Single-process terminals (Alacritty, Kitty, WezTerm, Ghostty class) | Excellent rendering and input with no session authority; closing the window ends the process. | Rendering discipline, zero-plugin baseline, daemon-absent operation.     | The assumption that a session and a window are the same lifetime.                                             |
| Multiplexer servers (tmux/zellij class)                             | A server plus clients is a workable session model, proven over decades.                       | Session/client separation, attach and detach, leases, control ownership. | Server-owned status bars, copy-mode, keybindings, and configuration language.                                 |
| Daemon-backed agent terminals (Kero class)                          | A daemon plus status visibility plus an agent-facing CLI is a coherent product shape.         | Durable sessions, visible status, a scriptable control surface.          | Status judgment and a text-scraping drive interface as the contract; there is no capability model to inherit. |
| Vertically integrated agent platforms (Warp class)                  | Terminal, agent, cloud execution, and governance can be one product with excellent UX.        | Nothing structurally; it is a different product bet.                     | Absorbing the agent, the cloud, and the workflow into the substrate.                                          |

The tmux row is the cautionary one: its server is powerful precisely because it
owns policy, and its extension ceiling is low for the same reason. Bitty wants
the session model without the policy.

## Change control

The floor changes only by an explicit decision, never by a pull request that
"also needed" a daemon field:

1. A proposal names the floor row it extends, or states why a new row is
   required, using the three placement questions.
2. It records the scope cost from [Scope economics](#scope-economics).
3. It updates `ADR 0019` or adds a new accepted ADR, plus a security review when
   the change touches a trust boundary.
4. It adds the conformance vectors before implementation, not after.
5. This charter's tables are updated in the same change, so the written floor
   never lags the code.

A proposal that cannot complete these steps is a follow-up issue, not a daemon
change. Child issues created from the session-host contract are subject to the
same rule; being listed under the v0.2.0 milestone is not authorization.

## Security review

- The floor preserves every normative gate named above: peer-credential
  authentication, per-request scope evaluation, the `T-09` same-user takeover
  boundary, the `T-10` confused-deputy boundary, and the read-only Agent
  default.
- Single-writer ownership is a security control, not only a consistency rule:
  it is what makes stale-handle and stale-generation rejection possible.
- The daemon records refusals because a refusal is evidence; it records no
  session content because content is both sensitive and out of scope.
- Daemon absence stays supported (`ADR 0019` `D5`), so no security or diagnostic
  path depends on a listener existing.
- No new trust boundary is introduced by this charter. Any future change that
  adds one updates the security corpus first.

## Verification plan

No implementation is claimed. The session-host contract was accepted on
2026-10-27; the following evidence is still required before any floor row is
called verified:

| Gate                      | Evidence                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Conformance vectors       | `V-01` through `V-34` from the consumer requirements, plus `C-01` through `C-08` from the contract.             |
| Stale and foreign handles | Stale instance, stale session, stale generation, and foreign-principal requests refused before any effect.      |
| Lease and control         | Attach, detach, expire, transfer, vacate, and one-controller invariants under concurrent clients.               |
| Stop semantics            | Refuse, drain, force, host shutdown, double-drain refusal, and terminal-cause immutability.                     |
| Capability refusal        | `worker_sessions=false` refuses worker creation with `UnsupportedCapability`; no emulation and no fallback.     |
| Daemon absence            | `bitty --safe`, headless tests, CI, and single-window use pass with no daemon present.                          |
| Scope compliance          | A review checklist proves no floor row was implemented as policy and no excluded capability entered the daemon. |

## Alternatives considered

- **No daemon; each client owns its sessions.** Rejected. Attach counts,
  generation fencing, and terminal causes cannot be made consistent across
  clients, and every consumer would reimplement recovery — the exact repeated
  cost the floor exists to absorb.
- **A full multiplexer server that owns session UX.** Rejected. It produces the
  tmux outcome: a powerful server whose status bar, copy-mode, and keybindings
  cannot be replaced by extensions, which contradicts the small-core direction.
- **A generic micro-kernel with pluggable lifecycle policies.** Rejected. The
  lifecycle is the authority; making it pluggable moves policy inside the trust
  boundary and makes conformance undecidable.
- **Expose a daemon plugin API so extensions can manage sessions directly.**
  Rejected. It would create a second extension host inside the authority
  boundary and bypass the terminal core's capability grants.

## Affected contracts

This charter changes no accepted contract. It depends on, and must stay
synchronized with:

- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  and [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md);
- [bittyd Session-Host Contract](bittyd-session-host-contract.md)
  and [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md);
- [Small-Core Capability Floor](small-core-capability-floor.md) and
  [Core and Plugin Boundaries](../architecture/core-boundaries.md);
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md);
- [Panel Runtime RFC](panel-runtime-rfc.md) for panel lifecycle, which is
  distinct from session lifecycle;
- the security corpus, which remains authoritative on trust boundaries.

## Open points

- **Application-level session generation.** The contract defines `generation`
  as the worker-binding counter and `state_revision` as the snapshot counter.
  An approval, consent, or takeover fence is a third thing. When the worker kind
  is enabled, either the consumer owns that fence as opaque session content or
  the daemon adds a distinct field and becomes its sole writer. Deciding this is
  a prerequisite for advertising `worker_sessions=true`.
- **Status semantics ownership.** Which contract defines
  `working`/`waiting`/`needs-approval`, and which component computes it. The
  daemon must not; the AI and presentation layers must agree.
- **Retention: mechanism versus policy.** Queue depth, lease TTL, and audit
  bounds are mechanisms; how long a user keeps logs is policy. The split needs
  an owning contract before any retention UI ships.
- **Whether persistence ever enters scope.** `D-06` excludes restart
  persistence. Any future proposal is a new accepted decision with its own
  migration, recovery, and security work, not a checkpoint added to the
  existing state.
- **Platform cells.** The first v0.2.0 cell is Linux x86_64; other cells need
  native-runner evidence before they are advertised.
- **Whether any daemon-side extension hook is ever acceptable.** The current
  position is none. Changing it requires the change-control path and a security
  review, because it moves extension code inside the authority boundary.

## Acceptance criteria

- [ ] The floor table and the exclusion table are reviewed by the architecture
      owner and the security reviewer.
- [ ] Every excluded capability names an owning layer, and no excluded item is
      described as "later in the daemon" without an accepted decision.
- [ ] The placement test and change-control rule are referenced by the
      session-host contract's own review checklist.
- [ ] The charter is linked from the Small-Core Capability Floor as the
      session-host counterpart and routed from the specification register.
- [ ] No row claims implementation, and no accepted contract is reopened.

## P0 Review Sign-off

- [ ] Architecture category owner: floor rows match the accepted contracts; no
      row moves policy into the authority boundary.
- [ ] Security reviewer: peer-credential, scope, stale-handle, and refusal-audit
      gates are preserved; no new trust boundary.
- [ ] Docs curator: metadata schema, title/H1 match, taxonomy, links,
      self-containment, and index synchronization.

## References

- Staging and trust boundary:
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md),
  [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md).
- Service surface:
  [bittyd Session-Host Contract](bittyd-session-host-contract.md),
  [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md).
- Core and extension ownership:
  [Small-Core Capability Floor](small-core-capability-floor.md),
  [Core and Plugin Boundaries](../architecture/core-boundaries.md).
- Authority and scopes:
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
- Adjacent layers:
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [Workspace Compositor Specification](workspace-compositor.md),
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md).
