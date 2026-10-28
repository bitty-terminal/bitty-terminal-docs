---
title: bittyd Session-Host Contract
description: Accepted Core contract for the bittyd session host - D-01 through D-18 decisions, session identity and lifecycle, scoped service surface, stop and restart semantics, bounds, conformance matrix, fake-server harness plan, v0.2.0 implementation breakdown, and the 2026-10-27 security-review revisions
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: false
sidebar_order: 80
---

# bittyd Session-Host Contract

## Document status

> Status: **accepted on 2026-10-27 by the project owner; implementation is
> authorized under the third independent security review verdict
> APPROVE-WITH-FOLLOWUPS, with `F-9` gating the idempotency slice and `F-12`
> gating the plugin and peer-recheck evidence.** This
> document records the Core-owned answers to decisions `D-01` through `D-18`
> raised by the [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md),
> and the service surface, bounds, conformance matrix, and harness plan that
> follow from those answers. Acceptance covers the decisions and contract text;
> it does not claim that `bittyd` ships. No `bittyd` crate or binary exists, and
> nothing here authorizes daemon, transport, registry, or fake-server code on
> its own.
>
> **Security review revision, 2026-10-27.** The first independent security
> review returned `NEEDS-FIX` with findings `B-1` through `B-13`. This revision
> applies each finding, choosing the least-privilege option wherever the review
> offered one. The dispositions are recorded in
> [Security review revision (2026-10-27)](#security-review-revision-2026-10-27),
> together with the finding table. The revision is submitted, not approved: the
> second review also returned `NEEDS-FIX`; the second revision is submitted and
> the third independent security review returned APPROVE-WITH-FOLLOWUPS on
> 2026-10-27, with `F-9` and `F-12` as slice gates.
> The promotion disposition, the dated sign-off status, the remaining review
> scope, and the out-of-scope boundaries are recorded in the
> [bittyd Session-Host Contract Promotion Record](bittyd-session-host-promotion-record.md).

| Control          | Value                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status           | Accepted 2026-10-27; first and second reviews `NEEDS-FIX`; third review APPROVE-WITH-FOLLOWUPS (`F-9`, `F-12` slice gates)                             |
| Owner            | Core terminal platform (bitty#2546)                                                                                                                    |
| Upstream records | ADR 0008, ADR 0019, ADR 0002, security corpus, `bitty-ipc` RC-9/RC-10                                                                                  |
| Consumer         | Wheel CTX-0036 adapter and fake-server conformance suite; other Agent harnesses                                                                        |
| Implementation   | bitty v0.2.0 slice, tracked as the child issues of bitty#2546 (#2064, #2218) and the contract-freeze issues #2664, #2665                               |
| Evidence status  | No vector in this document has been executed against a real `bittyd`                                                                                   |
| Change authority | Core owns the answers; the security corpus co-owns the trust boundary                                                                                  |
| Promotion gate   | Owner sign-off recorded 2026-10-27; third review APPROVE-WITH-FOLLOWUPS; `F-9`/`F-12` gate the affected slices; each slice still needs its P0 evidence |

This document is self-contained: a reader needs no other design record,
archival capture, or unpublished conversation to apply it. Method names, field
names, lifecycle and reason vocabularies, and numeric defaults are normative
for conformance from acceptance. Exact JSON key spellings and frame layout
remain open until bitty#2664 and the conformance corpus freeze them; until
then the spellings in this document are the fixed shape the fake server and the
adapter target.

## Purpose and scope

`bittyd` is the per-user, single-instance host process admitted to the v0.2.0
slice by [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md).
It owns the service lifecycle, the authenticated local endpoint, the session
registry, attach and detach leases, worker supervision, and service API
versioning. Consumer harnesses such as Wheel own their task graph, context, tool
policy, consent, audit content, and cancellation policy; they consume this
service and must not grow a competing daemon.

What the daemon may own is bounded by the draft
[bittyd Scope Charter](bittyd-scope-charter.md): this document defines the
service surface, while the charter fixes the mechanism floor and the exclusions
that keep presentation, agent, and workflow policy out of the daemon.

This document decides the questions bitty#2546 left open:

1. Which session kinds the v0.2.0 slice hosts, and how an absent kind is
   reported (`D-01`).
2. Session identity, fencing, counters, lifecycle, and reason taxonomy
   (`D-02`, `D-03`, `D-04`).
3. Who may create, attach, control, abort, or stop, and with what attribution
   (`D-05`, `D-07`, `D-08`, `D-09`).
4. What happens on disconnect, crash, restart, timeout, orphan, and retry
   (`D-06`, `D-12`, `D-13`, `D-17`, `D-18`).
5. Event delivery, versioning, bounds, platform cells, and audit
   (`D-10`, `D-11`, `D-14`, `D-15`, `D-16`).
6. The service surface and error taxonomy at contract level, the conformance
   matrix, and the fake-server-first harness plan.

In scope: the decisions, the logical service surface, the conformance vectors,
and the implementation breakdown.

Out of scope and owned elsewhere:

- any wire-format, framing, or encoding decision beyond the inherited
  `bitty-ipc` v1 constraints (`RC-9`/`RC-10`);
- PTY bytes, terminal text, scrollback, rendering, image protocols, and input
  encoding; the terminal content plane stays with the accepted terminal and IPC
  contracts, linked to a session lease but not redefined here;
- provider routing, model selection, prompts, tool execution, agent context,
  consent ledgers, and audit content (Wheel and `bitty-ai` own these);
- remote UI, remote attach, SSH, mobile control, and any network listener
  (ADR 0008 defers them to a separate, later trust-boundary ADR);
- session persistence across a daemon restart (explicitly outside the v0.2.0
  slice);
- daemon implementation, crates, binaries, unit files, autostart, and CI
  wiring.

## Normative sources this specification must not weaken

This contract is subordinate to every accepted record below. Where a source
and this document disagree, the source wins and this document is defective.

| Source                                                                                                                               | What it binds here                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Daemon definitions, single PTY ownership, session-grained attach and detach, bounded persistence, contained failure, attributed enforcement, and both trust-boundary gates. The daemon owns the PTY lifecycle, grid, scrollback, and plugin VMs for sessions it hosts; a second PTY owner is a conformance violation.                                                                                                                                                                  |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | The v0.2.0 slice: single instance per user via socket lock, peer-credential IPC re-checked before privileged actions, thin GUI and `bitty ctl` clients, session-grained attach and detach, per-domain single writer, service API versioning from day one. Remote UI, restart persistence, and autostart stay outside.                                                                                                                                                                  |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Platform tiers and the rule that cross-compilation is never evidence for a Tier 1 cell.                                                                                                                                                                                                                                                                                                                                                                                                |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                    | Invariants 1 through 10, especially local-only IPC with an explicit scope per operation, read-only Agent default, untrusted observation data, bounded untrusted input, secret-minimizing diagnostics, and `bitty --safe` independence.                                                                                                                                                                                                                                                 |
| [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (normative)                     | T-09 (same-user IPC takeover), T-10 (Agent confused deputy), T-11 (secret exposure), R-011 through R-014, and the future-daemon scope line.                                                                                                                                                                                                                                                                                                                                            |
| [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) (normative) | P0-AC-021 (peer credentials), P0-AC-022 (per-action scopes), P0-AC-023 (child process scope limitation), P0-AC-024 (Agent read-only default), P0-AC-025 (DevTools scopes), P0-AC-026 (trace minimization).                                                                                                                                                                                                                                                                             |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | Local framing, peer-credential posture, the closed v1 scope families, per-request server-side evaluation, the error taxonomy, and no default TCP.                                                                                                                                                                                                                                                                                                                                      |
| `bitty-ipc` accepted `RC-9`/`RC-10`                                                                                                  | 256 KiB frame, 256 KiB streamed chunk, 64 pending requests, 256 channel capacity, 100 req/s sustained with 200 burst, 16 concurrent connections per endpoint, 1 MiB decoded request payload, shed-newest with attribution. These are the floor, not a target. Source-verified existing guarantees: peer credentials at accept, server-side per-request scopes with `process.spawn` separate, wire v1 envelope with a bounded correlation id, and no ambient authority in the envelope. |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (candidate)                                             | Consumer input and the `V-01` through `V-34` vector set. It is not an authority; this document answers its `D-*` items and may narrow its positions.                                                                                                                                                                                                                                                                                                                                   |
| bitty#2546, bitty#2064, bitty#2218                                                                                                   | Scope context for the contract and the v0.2.0 session-host slice. Issue text is not a normative source.                                                                                                                                                                                                                                                                                                                                                                                |

The single-writer rule is restated because every later section depends on it:
`bittyd` is the only writer of the registry, lifecycle, generation, attach
count, lease, and last-seen state; the worker or consumer is the only writer of
its own task, context, tool, and audit content; one connection never writes
another client's state; and no client edits registry files or signals a worker
out of band.

## Terminology

| Term                 | Meaning in this document                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session              | One unit registered and supervised by `bittyd`: one terminal or, when enabled, one worker run.                                                                                  |
| Session kind         | `terminal` or `worker`. The kind fixes the spawn, content, and control semantics and never changes for a session.                                                               |
| Client               | A process connected to the daemon: a GUI/TUI panel, `bitty ctl`, or a consumer adapter such as Wheel's.                                                                         |
| Attach lease         | A bounded grant binding one connection to one session for events and, when the role allows, terminal input.                                                                     |
| Observer             | A lease that receives metadata state events but holds no control, input, or content authority of its own; content reads also need `terminal.inspect`.                           |
| Observer grant       | A single-use, TTL-bound, attributed, revocable ticket minted by the controller or the operator that authorizes one observer attach.                                             |
| Controller           | The single lease per session that holds input and abort authority, bound to the session's current control token.                                                                |
| Control token        | A 256-bit secret minted at session creation, rotated on every claim and transfer, bound to the controller lease, returned once, and required only at claim time.                |
| Create-key store     | The pre-session idempotency store indexed by `(uid or SID, key)` that makes a retried `session.create` return the first result instead of spawning a second worker.             |
| Containment identity | The whole-tree identity used to verify a reap: a cgroup v2 scope on Linux x86_64, or a pidfd-tracked subreaper that adopts descendants; never a bare process group.             |
| Worker               | The process the daemon supervises for a session. For a terminal session this is the PTY child tree.                                                                             |
| Generation           | Monotonic fence for the worker binding of one session. It answers "which worker does this request target".                                                                      |
| State revision       | Monotonic fence for every snapshot-visible mutation of one session. It answers "is this snapshot older than my view".                                                           |
| Daemon instance      | One `bittyd` process lifetime, identified by a fresh random instance id on every start.                                                                                         |
| Service API version  | The `{major, minor}` contract version negotiated at connect and refused on mismatch instead of half-honored.                                                                    |
| Terminal state       | A lifecycle state after which the session never runs again. Terminal states and their reasons are immutable.                                                                    |
| Orphan record        | A durable, owner-private record of a spawned process identity, used after a daemon crash to decide whether an exact process may be reaped. It is never used to adopt a session. |
| Operator capability  | A per-boot, owner-private capability that gates daemon-scoped actions. It is an explicit-intent gate, not a privilege boundary against a hostile same-user process.             |
| Adapter              | The consumer-side boundary that maps run control onto the service API. It owns no lifecycle truth.                                                                              |
| Fake server          | A test peer implementing the published surface with injected time and limits. It is labeled `candidate-not-bittyd` and is never evidence for the real service.                  |
| Content plane        | Terminal output, snapshots, scrollback, and input encoding. It is owned by the accepted terminal and IPC contracts, not here.                                                   |

Two counters are required rather than one because they fence different
mistakes: a request can target the wrong worker while being based on a current
snapshot, and a snapshot can be stale while targeting the right worker. `D-03`
records the increments and exclusions.

## Decision record (D-01 through D-18)

Each row is decided, accepted on 2026-10-27, and normative for conformance. The
sections after the table define the mechanics that conformance asserts.

| ID   | Decision                    | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Session kinds in v0.2.0     | The v0.2.0 slice contains **terminal sessions only**. The contract defines the `worker` kind so consumers can target it, but a v0.2.0 daemon advertises `worker_sessions=false` and refuses worker creation with `UnsupportedCapability`. Worker hosting needs an ADR 0019 amendment and a security review of worker spawn and credential inheritance before any build advertises it true.                                                                                                                                                                                                                                                                                                                                                                                                        |
| D-02 | Identity and fencing        | 128-bit random `daemon_instance_id` and `session_id`; the instance id is checked before any session lookup; `session_id` is never reused within an instance; terminal sessions carry an immutable `terminal_id` (client-supplied or server-assigned when absent) that is unique among live sessions. Session-id-only fencing is forbidden.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| D-03 | Counters                    | Two `u64` counters. `generation` starts at 0 at create and increments by one when a worker binds; v0.2.0 permits one bind, so it is 0 or 1 and never wraps. `state_revision` increments by one on every snapshot-visible mutation; heartbeats and last-seen updates never increment it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| D-04 | Lifecycle and reasons       | Closed states `created`, `running`, `stopping`, and terminal `exited`, `failed`, `terminated`; `attached` is a derived flag, not a state. Closed terminal reasons keep cancel, timeout, operator abort, daemon stop, host shutdown, normal exit, signal, spawn failure, and supervision failure distinct. Transport errors never substitute for a reason.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D-05 | Stop policy                 | `daemon.stop` refuses by default when sessions are active; explicit `drain` notifies, refuses new work, waits the advertised grace, then terminates the remainder; explicit `force` terminates immediately. Signals run the drain policy with the `host_shutdown` reason. Exit codes and client notification are specified, and every transition is attributed.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D-06 | Crash, restart, orphans     | No persistence. A restart gets a new instance id and an empty registry; old handles are refused. There is no adoption. A boot-id-matched orphan record is reaped through its pre-recorded containment identity, including a reserved record with no pid; an unverifiable record is quarantined and reported, never guessed at.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D-07 | Authorization and scopes    | A new, deny-by-default `session.*` family plus `daemon.*` scopes, separate from `terminal.*`. The baseline grant is `session.inspect`, `session.attach`, and `session.control`; `session.host` is never baseline. `session.create` requires explicit per-client `session.host` consent and intersects `process.spawn` executable policy. Controller authority requires the session's current control token. Daemon-scoped actions require the operator capability. `terminal.*` stays authoritative for terminal content and is never stretched to cover sessions.                                                                                                                                                                                                                                |
| D-08 | Client identity             | The server assigns a random per-connection `client_id`; the server captures the authenticated peer identity; a consumer-supplied correlation value is hashed on receipt and only the digest is audited. Client-supplied ids never grant anything and raw correlation strings are never stored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D-09 | Multi-attach and control    | One controller and many observers per session, within the published caps. An observer attach requires a single-use, TTL-bound, attributed observer grant minted by the controller or the operator; a bare connection cannot self-grant observation. Control is claimed with the control token, which rotates onto the claiming lease, and moves only by explicit, attributed transfer. A controller disconnect vacates control at lease expiry; it never transfers silently. The controller lease owns terminal input and is the only lease that may resize.                                                                                                                                                                                                                                      |
| D-10 | Event delivery              | Snapshot plus ordered, revision-tagged deltas on the lease. Delivery is at-least-once within a live lease. Terminal and stop notifications are control frames that are never silently shed: if the queue cannot take one, the lease is closed with `TerminalEventLost`. `status` is the authoritative reconciliation read; backlog is bounded and truncation is explicit.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| D-11 | Versioning and capabilities | A `{major, minor}` service version. Same major with a client minor at or below the server minor is accepted; every other case is a typed refusal before any operation. Capabilities are explicit and immutable per connection; there is no feature-probe downgrade. One major is served at a time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D-12 | Heartbeat and last-seen     | The client heartbeats its leases. The server uses its own monotonic clock. Any successful request naming a lease refreshes it; staleness only detaches, never aborts. Interval, TTL, and transport idle bound are advertised limits.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| D-13 | Timeout ownership           | The daemon owns transport idle, request, spawn, attach-lease, retention, abort-grace, drain-grace, and orphan-reap bounds. The consumer owns the execution deadline and expresses it as an abort with the `consumer_timeout` reason. The daemon imposes no default execution deadline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| D-14 | Resource limits             | Limits are advertised at handshake as `{effective, default, system_max}` triples and enforced with whole-request refusal. The `D-14` table is the normative value table; the Resource limits section is normative for enforcement where its wording is more precise. System maxima are compiled and may only change upward through an attributable contract revision plus security review; user configuration may lower the effective value but never raise it above the system maximum.                                                                                                                                                                                                                                                                                                          |
| D-15 | Platform cells              | ADR 0002 tiers apply. The first v0.2.0 cell is Linux x86_64; every other cell needs native-runner conformance before it is advertised. Unsupported cells return a typed result and never a weaker transport. Namespace, SID, and elevation mismatches fail closed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D-16 | Audit and attribution       | The daemon records lifecycle and refusal records only: peer identity, client id, instance, session, generation, revision, action, static result code, counts, limits, and the target of a transfer, revoke, detach, or grant (raw `terminal_id` is represented only by `terminal_id_digest`). Every audited string is valid UTF-8, control-character free, and bounded; a raw consumer correlation value is hashed, never stored. It never records terminal content, PTY bytes, argv, env, clipboard, prompts, provider payloads, or tokens. Refusal records are budgeted and aggregated so a refusal flood cannot exhaust the sink. The sink is owner-private, bounded, rotates with loss bounded to the tail, and is not readable over the service; it is not tamper-evident against the owner. |
| D-17 | Worker restart              | The daemon never restarts a consumer worker and never rebinds a session. A retry is a new session with a new id, a new control token, and a generation starting at 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| D-18 | Idempotency                 | Keyed methods (create, attach, grant mint, transfer) carry a client-generated 128-bit key; termination and revocation (abort, kill, stop, detach-other, grant revoke) are keyless and naturally idempotent, so a full store can never block them. Session-scoped methods share one bounded descriptor store; `session.create` uses a separate pre-session store indexed by `(uid or SID, key)`. Duplicates return a descriptor or the terminal snapshot; snapshots are recomputed on replay; a fingerprint conflict is refused; both stores fail closed at capacity and retire keys only where retirement cannot permit a duplicate effect.                                                                                                                                                       |

### D-01: terminal sessions only, worker sessions reserved

The v0.2.0 slice is defined around terminal sessions. Hosting an arbitrary agent
worker is a different supervision and credential-inheritance problem: the daemon
holds secrets and audit, and a worker it spawns must not inherit either. ADR
0019 authorizes thin terminal clients, attach and detach, and versioning; it
does not authorize generic worker supervision.

The contract still defines the worker kind, because a consumer must be able to
target it and receive a typed answer:

- `capabilities.worker_sessions` is `false` in every v0.2.0 build.
- `session.create` with `kind: worker` is refused with
  `Denied/UnsupportedCapability` before any process is spawned.
- The daemon never emulates a worker session as a terminal session, and a
  consumer must not fall back to an in-process worker while claiming the hosted
  path.
- A build may advertise `worker_sessions=true` only after (a) an accepted ADR
  0019 amendment names worker supervision in the slice and (b) an independent
  security review accepts the spawn, environment, credential, cleanup, and
  audit behavior. The security review issue in the implementation breakdown
  owns that recommendation.
- The 2026-10-27 promotion accepts the worker vocabulary and its refusal path;
  it does not enable worker hosting and does not satisfy either enablement
  condition.

Consequences today: the Wheel adapter can be written and tested against the
accepted surface, but its hosted worker path stays disabled until the
capability is advertised. The adapter must treat absence as typed and must not
start an in-process worker as a fallback.

### D-02: identity and fencing

- `daemon_instance_id` is a 128-bit random value generated at process start,
  encoded as 32 lowercase hex characters. It is not a secret and is immutable
  for the process lifetime.
- `session_id` is a 128-bit random value assigned by the server, encoded as 32
  lowercase hex characters. It is never derived from a pid, terminal id, or
  counter, and is never reused within one instance.
- A session reference is logically `(daemon_instance_id, session_id,
generation)`. The connection is bound to one instance at handshake; a request
  that names a different instance is refused with `StaleInstance` before any
  session lookup. Omission of the instance means "the instance bound to this
  connection".
- A terminal session carries `terminal_id`, a bounded opaque value supplied by
  the creating client (the existing Core terminal identity) or assigned by the
  server when absent. A supplied `terminal_id` is 1 to 128 bytes from the safe
  opaque alphabet `[A-Za-z0-9._:-]`; it contains no whitespace, control
  characters, or NUL. A server-assigned id is 32 lowercase hex characters. A
  non-conforming value is refused with `InvalidRequest` before any spawn. The
  raw value stays in session memory and status for authorized clients; audit
  stores only `terminal_id_digest`, a truncated 128-bit SHA-256 digest, so the
  id cannot become an audit content channel. It is immutable for the
  session and unique among non-terminal sessions; a second live session with the
  same `terminal_id` is refused with `TerminalAlreadyHosted`. Once a session is
  terminal, its `terminal_id` may be reused even while the terminal record is
  retained; a retained record and a live session can therefore share an id, so
  reconnecting clients fence with `(instance, session_id)`, not
  `terminal_id`.
- Handles from an earlier instance never resolve. The daemon does not consult
  the current registry, orphan records, or process ids to "find" them.

### D-03: generation and revision

`generation`:

- starts at `0` when the session is created, before a worker is bound;
- increments by one when a worker binds to the session;
- is never decremented, reused, or wrapped;
- is 0 or 1 in v0.2.0 because no rebind is permitted;
- is required on every effectful request (`abort`, `kill`, `control.transfer`);
- is not changed by attach, detach, heartbeat, or control transfer.

`state_revision`:

- starts at `0` for the create snapshot;
- increments by exactly one on each subsequent snapshot-visible mutation:
  worker bind, every lifecycle transition, attach, detach, lease expiry, lease
  revocation, observer-grant mint and consume, control claim, control transfer,
  control vacancy, controller resize, and terminal finalization;
- does not increment on heartbeat, `last_seen_at`, `last_worker_seen_at`, or a
  repeated idempotent request that changes nothing;
- is included in every snapshot, status response, and event;
- is `u64` and never wraps; an overflow is an internal fault that fails closed
  rather than reusing a revision.

`attach_count` and `attached` are derived from live leases and are reported in
the snapshot; they are not independently writable.

### D-04: lifecycle states and terminal reasons

| State        | Meaning                                                                              | Allowed next states               |
| ------------ | ------------------------------------------------------------------------------------ | --------------------------------- |
| `created`    | Registered; worker not bound yet or spawn in progress.                               | `running`, `failed`, `terminated` |
| `running`    | Worker bound and alive; `attached` tells whether any lease is live.                  | `stopping`, `exited`, `failed`    |
| `stopping`   | A graceful abort or drain is in progress; the worker may still be alive.             | `terminated`, `exited`, `failed`  |
| `exited`     | Terminal: the worker exited on its own with a wait status, including a nonzero code. | none                              |
| `failed`     | Terminal: spawn failure, signal termination, or supervision loss.                    | none                              |
| `terminated` | Terminal: the daemon terminated the worker on a request or shutdown.                 | none                              |

`attached` is a derived boolean (`attach_count > 0`); it is not a lifecycle
state, so a detach never masquerades as a lifecycle transition.

Terminal reasons are a closed set:

| Reason               | Terminal state | Cause                                                                   |
| -------------------- | -------------- | ----------------------------------------------------------------------- |
| `worker_exit`        | `exited`       | The worker exited on its own; exit code recorded.                       |
| `worker_signal`      | `failed`       | The worker died from a signal not sent by the daemon; signal recorded.  |
| `spawn_failed`       | `failed`       | The worker never bound (spawn error, missing executable, bind timeout). |
| `supervision_failed` | `failed`       | The daemon could not observe, reap, or verify the worker's exit.        |
| `consumer_cancel`    | `terminated`   | A controller requested abort with the `cancel` reason.                  |
| `consumer_timeout`   | `terminated`   | A controller requested abort with the `timeout` reason.                 |
| `operator_abort`     | `terminated`   | An operator aborted the session.                                        |
| `daemon_stop`        | `terminated`   | An explicit `daemon.stop` drained or forced the session.                |
| `host_shutdown`      | `terminated`   | The host or service manager signalled the daemon to stop.               |

`terminal_reason` is immutable. When an abort request races a worker exit, the
daemon records the first effective cause: a worker that exits on its own before
the abort takes effect is `worker_exit`, and the superseded request is recorded
in audit as requested-but-not-effective. This keeps cancel, timeout, and natural
completion distinguishable, which cancellation policy and audit both require.

Every terminal transition carries `cleanup`, and the exit information is
specific to the reason: `exit_code` for `exited`, `signal` for
`failed/worker_signal`, and no exit status for a session that never bound.
`cleanup` is one of:

- `swept`: the whole containment identity was terminated and verified gone: the
  cgroup v2 subtree is empty, or the subreaper has no remaining descendants and
  every recorded pidfd reports exit. A bare process-group check is never
  `swept`;
- `unverified`: the daemon could not verify the whole tree, including a
  descendant that left the process group via `setsid`/`setpgid` before the
  containment identity was established;
- `not_started`: no worker process was ever spawned.

Cleanup is a process-tree operation, not a one-pid observation. On every
terminal transition, including a worker that exits on its own, the daemon first
terminates the whole containment identity: a graceful signal to the tree, then a
kill signal after `abort_grace_ms`, then it verifies the cgroup subtree empty
(Linux x86_64) or the full subreaper descendant set gone. Only then does it
classify `cleanup`. A surviving descendant keeps the terminal transition pending
through the grace and kill window; if the identity still cannot be verified
gone, the daemon completes the transition with `cleanup: unverified`, records
the surviving identity in the orphan journal, and reports it. `worker_exit`
does not mean the tree is gone, and a bare process-group check never yields
`swept`.

A terminal session is read-only. `status` serves its snapshot until retention;
attach, controller attach, abort, kill, and transfer are refused with
`NotRunning` or answered with the immutable terminal snapshot when the request is
idempotent. A terminal session is never revived.

### D-05: stop, drain, and force

`daemon.stop` has three explicit modes. The operator capability is required in
all modes; consumer adapters never issue it.

| Mode               | Behavior                                                                                                                                                                                                                                                                       | IPC result                                                         | CLI exit                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| `refuse` (default) | If any session is non-terminal, change nothing and return the active-session count. If none are active, stop cleanly.                                                                                                                                                          | `Denied/ActiveSessions` with counts, or a clean stop               | 3 or 0                                           |
| `drain`            | Enter `stopping`, refuse new sessions and controller attaches, notify every attached lease with `daemon_stopping` and the drain deadline, wait up to `drain_grace_ms`, then abort the remainder with `daemon_stop`, or with `host_shutdown` when a signal initiated the drain. | Accepted; terminal events delivered where a transport still exists | 0, or 4 when the deadline forced the remainder   |
| `force`            | Abort every session immediately with `daemon_stop`, wait up to `abort_grace_ms` for exits and reaping, then exit.                                                                                                                                                              | Accepted                                                           | 0, or 5 when a worker could not be verified gone |

- Signals (`SIGTERM`, `SIGINT`) run the `drain` mode with the `host_shutdown`
  reason, not `daemon_stop`, so a service-manager restart stays distinguishable
  from an explicit operator stop. A signal-initiated drain that reaches its
  deadline forces the remainder with `host_shutdown`, never `daemon_stop`. The
  same reason is used when a signal arrives during an operator `drain`; the
  forced remainder then records `host_shutdown` because the host, not the
  operator, caused the last transition. `SIGKILL` has no handler and is crash
  behavior.
- `force` during an in-progress `drain` is accepted as an escalation: it skips
  the remaining drain grace, terminates the remainder with `daemon_stop` (or
  `host_shutdown` when a signal initiated the drain), and is attributed to the
  operator who requested the escalation. Each transition carries its own
  revision. `refuse` during a drain returns `Denied/DaemonStopping`.
- A session still in `created` when a drain deadline or a `force` reaches it is
  cancelled through the same pre-bind cancel intent as the generation-0 abort,
  with cleanup `not_started`, or `swept` when the spawn syscall had already
  returned and the child was terminated before bind; the spawn path never binds
  a child the stop covered. The terminal reason is the stop's reason
  (`daemon_stop`, or `host_shutdown` after a signal).
- No session reaches a terminal state without a reason, a revision, and an
  actor. A drain that cannot notify a lease closes that lease with
  `TerminalEventLost` before or at the terminal transition; it never silently
  drops the notification and continues.
- A refused `refuse` request leaves the daemon running. A drain that is already
  in progress returns `DaemonStopping` rather than starting a second drain.
- Exit codes are `0` success, `1` internal failure before any listener is
  accepted, `2` usage or argument error in `bitty ctl`, `3` active sessions on a
  default stop, `4` drain deadline forced the remainder, `5` a worker could not
  be verified gone, and `6` endpoint tamper or a failed authentication
  invariant. Codes `1` and `2` never describe a session outcome.
- Exit `6` ends the process without terminal transitions: no terminal event is
  promised, clients see a transport failure, and every live worker keeps its
  two-phase journal record (`reserved` or `committed`) for the next start to
  reap. The daemon does not attempt a drain after a tamper or
  authentication-invariant failure, because the endpoint can no longer be
  trusted.
- The daemon writes the final audit record and attempts to flush it before
  exiting; a crash may lose the tail of audit, so audit is not a durable ledger
  (Wheel keeps its audit of record).

### D-06: crash, restart, and orphans

- There is no session persistence in v0.2.0. A clean restart ends every session.
  A crash ends the registry without terminal states; clients see a transport
  failure and must treat the outcome as unknown.
- A new process always gets a new `daemon_instance_id` and an empty registry.
  An old handle is refused with `StaleInstance` (or `NotFound` when the
  instance is current but the record was collected). There is no adoption, no
  registry replay, and no "best effort" reattach into a new instance.
- The orphan journal is two-phase. The daemon creates the containment identity
  first (the cgroup v2 subtree on Linux x86_64, or the subreaper bookkeeping),
  then **reserves** a bounded record and fsyncs it: `session_id`, `generation`,
  `boot_id`, the reserved-at monotonic time, and the containment identity. After
  the spawn returns, the daemon **commits** the record with `pid`, process start
  time, process group id, the containment identity, and the executable path
  digest, and fsyncs again. A crashed reserve with no commit is a `reserved`
  record; a crashed commit is a `committed` record. The cgroup path is recorded
  before the first process can exist, so a reserved record is actionable even
  without a pid.
- The journal holds at most `max_orphan_records`; when it is full, a new spawn
  is refused with `LimitExceeded` rather than dropping a live record. The
  record is owner-private (`0700` directory, `0600` file) and is removed only
  after a verified reap or after the quarantine retention expires.
- On startup, and only while holding the single-instance lock, the daemon
  examines orphan records:
  - a record from a different boot id is stale and is discarded (the boot id
    fences the old containment identity);
  - a `reserved` record with the same boot id is reaped through its containment
    identity even though no pid was committed: a non-empty identity is
    terminated (the whole cgroup subtree or subreaper descendant set) and must
    verify empty, an empty or absent cgroup subtree is already reaped, and the
    subreaper fallback with no pre-spawn identity is quarantined per the rule
    below; the record is `orphan_reaped` only when the identity verifies empty
    or the recorded cgroup subtree is absent, never when the identity is merely
    unknown;
  - a `committed` record whose pid no longer exists but whose containment
    identity is non-empty is reaped through the identity, not discarded on the
    pid alone;
  - a `committed` record whose pid exists but whose process start time does not
    match is a pid-reuse case: if its containment identity is empty it is
    discarded and never signalled; if the identity is non-empty it is reaped
    through the identity and never signalled by the reused pid;
  - an exact match (same boot id, pid, start time, recorded group, and
    containment identity) is terminated with a graceful signal, then a kill
    signal after `orphan_reap_grace_ms`, and is recorded as `orphan_reaped`
    only when the whole containment identity verifies empty;
  - a record whose containment identity cannot be verified, or a reserved
    record on a cell where no pre-spawn identity exists (the subreaper fallback
    after a crash before the first child is adopted), is quarantined as
    `orphan_unverified`, retained for `orphan_record_retention_ms`, reported,
    and never signalled by pid.
- The startup scan and every actionable reap complete before the daemon binds
  its endpoint, so no client can create a session while an earlier record is
  still actionable. A containment identity left by a crash before its record
  was reserved is empty by construction, because the reserve precedes the
  spawn, and is removed at startup. The daemon never signals a process it did
  not record.
- The subreaper fallback has a stated double-run residual: a crash after the
  spawn syscall but before the child is adopted cannot be fenced by pid, so the
  daemon cannot prove the child is gone. The record stays quarantined, and the
  adapter must never retry an unfenced create: it reconciles with `status` on
  the same instance, and across `StaleInstance` it treats the old run as
  possibly alive and does not create a second host for it. The daemon does not
  claim a reaped subtree when the fallback could not establish one.
- Quarantine is a record class, not a licence to guess. A quarantined record
  never causes a signal, never becomes a session, and never blocks a new spawn
  beyond its journal slot. When the journal is full of quarantined records, a
  new spawn is still refused with `LimitExceeded` until retirement, so the
  bound is never evaded by accumulating unverifiable records.
- The containment identity is what makes `swept` mean the whole tree. Linux
  x86_64 uses a delegated cgroup v2 scope per session; where cgroup delegation
  is unavailable, the daemon is a child subreaper and tracks every descendant
  by pidfd, so a descendant that calls `setsid` or `setpgid` is still inside
  the identity. A process-group-only check is never sufficient for `swept`.
- `daemon.orphans.verify` (`daemon.control`) re-runs verification on demand and
  returns counts by class (`reaped`, `unverified`, `reserved`, `committed`,
  `stale`) with no process ids. It may signal only exact matches, applies the
  same never-signal rule to quarantined records, and is idempotent. The operator
  may also retire a quarantined record explicitly; retirement is attributed,
  removes only the journal record, never signals, never adopts a session, and
  frees the slot so a quarantine cannot block new spawns for the whole retention
  window.
- Reaping never uses a name, pattern, port, or "newest process" heuristic, and
  never signals a process the daemon did not record. A reaped orphan never
  becomes a session and never receives a terminal event.
- Crash injection is part of the acceptance evidence: a kill between reserve
  and spawn, between spawn and commit, and during reap must each leave a
  record in a defined class, never a silently missing record and never a
  duplicate spawn on the next start.
- The daemon reports orphan counts and verification state in `daemon.status`;
  it does not expose process ids to consumer clients.

### D-07: authorization and scopes

Possession of a connection, a session id, or a terminal id grants no authority.
Every action is authorized server-side against the authenticated peer, the
connection's effective scopes, and the session's control relation. Same-user
identity is not a grant.

The service adds a closed scope family, separate from the `bitty-ipc` v1
families:

| Scope             | Grants                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.inspect` | Read metadata status and list the caller's visible sessions. Never terminal content.                                                                                                                              |
| `session.host`    | Create a session of an enabled kind. Never in the baseline; requires explicit per-client consent and `process.spawn`.                                                                                             |
| `session.attach`  | Accept a valid observer attach grant and obtain an observer lease on a visible session.                                                                                                                           |
| `session.control` | With the current control token or a controller lease: claim control, mint or revoke an observer grant, abort, transfer control, and revoke another lease on the same session. Immediate kill stays operator-only. |
| `daemon.inspect`  | Read daemon status, orphan counts, and the operator's all-session view.                                                                                                                                           |
| `daemon.control`  | Stop, drain, force, revoke any lease, mint or revoke host-consent and observer grants, and run `daemon.orphans.verify`.                                                                                           |

Rules:

- The family is additive and independent: no scope implies another, and a
  higher-sounding name is not a superset.
- The baseline grant for an ordinary consumer connection is `session.inspect`,
  `session.attach`, and `session.control`, each still filtered by the
  per-session visibility, observer-grant, and control-token rules. `session.host`
  is **not** baseline: every creating client must receive it as an explicit
  per-client consent grant, because creating a session spawns a process and
  P0-AC-024 requires per-client consent for process spawning. The operator
  capability adds `daemon.inspect` and `daemon.control`.
- `session.create` intersects two independent authorities: `session.host`
  (may this client ask the daemon to host a session at all) and
  `process.spawn` (may this client spawn this executable under the existing
  executable-allowlist policy). Neither implies the other. A missing or invalid
  `session.host` consent grant is `Denied/ConsentRequired`; a missing
  `process.spawn` is `Denied/ScopeViolation`. Both are decided before any spawn,
  and the two codes never substitute for each other: one static code per missing
  authority. When both are missing, the daemon returns `Denied/ScopeViolation`;
  `Denied/ConsentRequired` is returned only to a caller that already holds
  `process.spawn`, so the response never reveals consent state to a client
  without spawn authority. An inspect-only client cannot create a session, and
  a `process.spawn` holder without host consent cannot make the daemon host one.
  The create response, including an idempotent duplicate, is the only place the
  initial control token appears.
- `session.host` consent has a real channel: the operator-only
  `daemon.host_grant` method mints a single-use, TTL-bound, audited bearer
  grant (default `host_grant_ttl_ms`, at most the system maximum) and returns
  its non-secret `grant_id` plus the bearer value once. The grant is bound to
  the authenticated peer uid or SID that presents it and optionally to a
  `client_correlation_digest`. A client presents it in `daemon.negotiate`; a
  successful consume adds `session.host` to that connection's scopes. Mint,
  consume, expiry, and revoke are attributed. The operator may revoke a grant
  by `grant_id`; a consumed, expired, wrong-peer, wrong-correlation, or revoked
  grant is `Denied/ConsentRequired`.
- The operator capability is an intent gate, not an isolation boundary: a
  same-uid client that can read the capability file can mint its own host grant
  and thereby obtain `session.host`. The consent channel exists to make that
  action explicit, peer-bound, time-bounded, attributable, and revocable, not to
  prove that a human approved it. This residual is stated in the trust-boundary
  section and is not claimed as a privilege boundary.
- A connection cannot widen its own scopes. Scope changes require a new
  connection and a new server-side grant; the host grant is consumed at
  negotiate and is never added to an established connection.
- `terminal.*` remains authoritative for terminal content. Session metadata
  (`status`, attach responses, events) never carries terminal text, PTY bytes,
  scrollback, or clipboard content. A live observer or controller lease that
  reads terminal content also requires `terminal.inspect`; a controller lease
  that writes input requires `terminal.input`; a controller resize requires
  `terminal.manage`. The `session.*` family never grants terminal content by
  itself, and `terminal.*` is never stretched to cover session administration.
- Creating a session grants authority over that session only. It never grants
  listing, attaching, aborting, or stopping another session, and it never makes
  the creator a daemon administrator.
- Visibility is explicit: a client can address a session only while it holds a
  live lease, presents that session's control token with the request, or
  presents a valid observer grant for that session. There is no discovery by
  enumeration; `session.list` returns only live-lease sessions, and the
  operator view requires `daemon.inspect`.
- Every denial is static, typed, attributed, and content-free. A missing scope
  is decided before session lookup and returns `ScopeViolation`. For a caller
  that holds the scope, unknown, collected, and invisible sessions return the
  same `NotFound` result, so a denial is not an existence oracle. A caller that
  can see the session but lacks the required control relation gets
  `Denied/ControllerRequired`, and a stale or rotated token at a vacant control
  gets `Denied/InvalidControlToken`; audit keeps the distinction.

Control relation. A method that acts on controller authority is authorized
only when (a) the request arrives on the current controller lease, or (b)
control is vacant and the request presents the current control token. The
`session.control` scope is necessary and never sufficient, and an observer
lease is always denied `Denied/ControllerRequired`. This rule applies to
`session.grant`, `session.grant.revoke`, `session.abort` with a consumer
reason, `session.control.transfer`, and detach/revoke of another lease. A
controller claim is the same relation read at vacuity: it requires
`session.control` and the current control token, and the claim creates the
controller lease rather than promoting an observer lease in place. A live
controller elsewhere is `Denied/ControlHeld`; a missing, stale, or rotated token
when control is vacant is `Denied/InvalidControlToken`. The operator paths
(`daemon.control`, `session.kill`, and the `operator` abort reason) use the
operator capability and are not controller methods.

Controller authority is the control token:

- Minted at create as 256 bits from the OS CSPRNG, returned only in the create
  response (including an idempotent duplicate). The daemon verifies with a
  digest and keeps the token itself only in memory for the life of the
  create-key record so a duplicate create can return it; neither the token nor
  the digest is ever logged or written to disk. The record holds the initial
  token only until the first successful claim or transfer, then stops carrying
  a token.
- The token is bound to the controller lease. A successful claim or transfer
  rotates the token: the daemon mints a new 256-bit token, returns it once to
  the new controller, and invalidates the previous token in the same
  transaction. The create token is the claim ticket for the first claim and
  ceases to be valid when that claim succeeds.
- Required at claim time and at a vacant control relation: to claim the
  controller lease, to act on control while no controller lease is live, and to
  reclaim control after a reconnect. The current controller lease transfers,
  aborts, grants, and revokes without re-presenting the token. It is not required
  on every input frame or heartbeat. After a successful claim, the controller
  lease keeps authority through lease liveness, not by re-presenting the token; a
  lapsed lease vacates control and the next action from the vacant relation needs
  the current token.
- Scoped to one session; the generation is checked separately on effectful
  requests. It is not a daemon-wide credential and grants nothing outside its
  session.
- Revocation is explicit and attributed. The operator may revoke any lease,
  including the controller lease, through `daemon.control`; the current
  controller may revoke an observer lease on its own session through
  `session.control`. Revoking the controller vacates control and rotates the
  token, so neither the revoked token nor any other client can reclaim control;
  the session continues detached, and only an operator kill or stop ends it.
  Regaining a controller for that session requires a new session. There is no
  recovery method that reveals the token.
- Never placed in a child environment, argv, audit record, or diagnostic
  export. A consumer that persists it must use an owner-private secret store
  (`0600`) in its own state directory.
- A lost token before the first claim may be recovered only by an idempotent
  duplicate create with the same key while the initial token is still current.
  After the first claim or transfer the token has rotated and no method reveals
  or resets it: that consumer can no longer control the session, observers still
  see metadata, and an operator can stop it.
- Residual: token secrecy is not a boundary against the account owner. A
  same-user process with `ptrace` access (where Yama or an equivalent policy
  permits it), `/proc/<pid>/mem`, or a debugger attached to the client can read
  the token from the client's memory. The token protects against a different
  session's client and against accidental cross-session use, not against the
  owner's own debugging capability.

Observer grants:

- An observer attach requires a grant minted by the current controller
  (`session.control`) or by the operator (`daemon.control`). A grant names the
  session, the issuing lease or operator, the intended peer identity, a single
  use, and a TTL (`observer_grant_ttl_ms`). It is single-use: the first
  successful attach consumes it, and a second attempt is
  `Denied/ObserverGrantRequired`.
- A grant is attributed: mint, consume, expiry, and revoke each produce an audit
  record with the issuing actor and the consumed lease. An expired,
  already-consumed, wrong-session, or wrong-peer grant is refused with a static
  code and changes nothing.
- The controller or operator may revoke an unconsumed grant, and the operator
  may revoke a live observer lease. Revocation increments the revision.
- A grant never carries terminal content authority. It authorizes one lease;
  content still needs `terminal.inspect`.

Operator capability:

- Minted at daemon start, stored in the owner-private runtime directory
  (`0700` directory, `0600` file), and rotated on every start.
- Presented at handshake to obtain `daemon.inspect` and `daemon.control`.
- Explicitly an intent gate, not a privilege boundary: any process running as
  the same user can read the file, including a consumer adapter. The capability
  cannot be hidden from a same-uid adapter, so an adapter that runs as the owner
  can always become an operator; "adapters never receive `daemon.*`" is a grant
  policy, not an isolation guarantee.
- Never inherited by a session worker, never placed in an environment, and
  never accepted as a wire field from a consumer adapter.

### D-08: client identity

- `client_id` is a 128-bit random value assigned per connection at handshake.
  It is never supplied by the client and never used as a durable identity.
- `client_correlation` is an optional, bounded (128 bytes) consumer value. It
  must be valid UTF-8 with no control characters; the daemon hashes it on
  receipt and records only the 32-hex (128-bit) SHA-256 digest as
  `client_correlation_digest`. The raw value is never stored, logged, or
  echoed. The digest is audit metadata **and** the optional grant-binding
  condition: a host grant minted with `client_correlation_digest`
  (`daemon.host_grant`) and an observer grant minted with
  `observer_correlation_digest` (`session.grant`) are usable only from the
  connection whose negotiated digest matches. The value is not a scope, does
  not identify the client, and grants nothing by itself. A malformed value is
  refused with `InvalidRequest` rather than normalized.
- The server records the authenticated peer identity (Unix uid or Windows SID),
  the peer pid, and the process start time at handshake. The pid is
  informational because it can be reused.
- A reconnect receives a new `client_id`. Durable authority comes from the
  control token and live leases, not from `client_id`.
- No client-supplied id, header, or path parameter is ever authority.

### D-09: multi-attach and control ownership

- One controller lease per session, plus observers up to
  `max_attaches_per_session`.
- An observer lease is created only from a valid observer grant (minted by the
  controller or the operator, single-use, TTL-bound, attributed, revocable). A
  connection that merely holds `session.attach` cannot open an observer lease by
  naming a session. Without the grant, a same-user process that learns a session
  id would become controller-capable: it could observe content and wait for a
  control opportunity. The grant closes that path.
- Observer leases are read-only for control, input, and resize. They receive
  metadata state events. Content reads need a live lease **and**
  `terminal.inspect`; a metadata status or attach response never carries
  terminal content.
- Controller claim requires `session.control` and the current control token. If
  another lease already holds control, the claim is refused with `ControlHeld`;
  a second controller is never created by racing. A successful claim binds the
  rotated token to the claiming lease.
- Control moves only by an explicit `control.transfer` from the current
  controller to a target `attach_id` on the same session. The target must be a
  live observer lease, must hold `session.control`, and the transfer is
  attributed and increments the revision. A transfer to a terminal session's
  controller also requires the target to hold `terminal.input`. The transfer
  rotates the control token and returns the new token to the target; the
  previous controller's token is refused from that point.
- A controller disconnect vacates control when its lease expires. Control is
  not transferred implicitly, and no other client becomes controller without
  presenting the current token. A terminal session answers a claim with
  `NotRunning`, never a new token.
- The controller may revoke an observer lease or an unconsumed observer grant on
  its own session; the operator may revoke any lease or grant. Revocation is
  attributed and increments the revision. The operator revoking the controller
  rotates the token and leaves control vacant.
- The controller lease is the single input owner for a terminal session. A
  second client cannot write input or resize by attaching as an observer; it
  must receive an explicit transfer. Input writes need the controller lease and
  `terminal.input`; resize needs the controller lease and `terminal.manage`, is
  controller-only, and increments `state_revision`. An observer letterboxes or
  scales locally and never changes the PTY size. This preserves the ADR 0008
  single-focused-writer rule and the accepted multiplexer resize rule.
- Attaching the same client twice is allowed as two distinct leases, each with
  its own `attach_id` and each needing its own grant; only one can be controller.

### D-10: event delivery and ordering

- Attach returns a snapshot at the current `state_revision` plus a bounded
  backlog of retained events for that session. `backlog_truncated` and
  `earliest_revision` make a gap explicit; there is no unbounded replay.
- Events are ordered per session by `state_revision` and carry `instance_id`,
  `session_id`, `attach_id`, `revision`, `kind`, and the terminal marker. Events
  from different sessions have no global order; transport order is the only
  order across sessions.
- The event envelope is frozen for the major version: wire version `v: 1`, a
  server-generated correlation `id` of at most 64 bytes that is unique per
  connection, and an `event` object carrying the fields above. The client never
  supplies an event correlation id, and the daemon never echoes a client id in
  an event. Events are routed per lease: an event for `attach_id` is written
  only to the connection that owns that lease, never broadcast, never fanned
  out to another connection, and never queued on a lease that has been
  detached. A client that holds two leases on one session receives two
  per-lease copies and deduplicates by `(session_id, revision, kind,
attach_id)`.
- Within a live lease, delivery is at-least-once. A reconnect may see duplicates
  and must deduplicate by `(session_id, revision, kind)`. An event is never
  renumbered or synthesized after the fact.
- Control frames are `session_state`, `session_terminal`, `control_transfer`,
  `lease_revoked`, and `daemon_stopping`. They are never silently shed. If a
  lease's bounded queue cannot accept one, the daemon closes that lease with
  `TerminalEventLost`; the client reconciles with `session.status`, which serves
  the terminal record until retention.
- A terminal state becomes visible to `status` only after a control-frame slot
  is reserved for every attached lease or that lease has been closed with
  `TerminalEventLost`. This is the terminal-event guarantee: the client either
  receives the event or knows it missed it.
- There are no shed-able observability frames in v0.2.0. A future observability
  class must be shed newest-first, counted, and attributed; it may never carry
  a terminal or control transition.
- The session event stream never carries PTY bytes, terminal text, prompts,
  tool output, or provider payloads. The content plane is separate.

### D-11: service API versioning and capabilities

- There are two independent version axes. The **wire version** is `v: 1` on
  every `bitty-ipc` v1 frame and describes framing, envelope, and correlation.
  The **service version** is `{major: u16, minor: u16}` carried in
  `daemon.negotiate` and describes the session surface. A supported wire version
  never implies a supported service version; each is negotiated and refused on
  its own axis.
- The first accepted service contract is `1.0`. Exact JSON key spellings and
  frame layout are frozen by bitty#2664 and the conformance corpus (see Open
  points), not by this document.
- Handshake carries the client service version. The server accepts the same
  major and a client minor in `[min_client_minor, server_minor]`;
  `min_client_minor` starts at `0` for `1.0`. A different major, or a client
  minor outside that range, is `VersionMismatch` and the connection closes
  before any session operation.
- Accept and refuse order is fixed:
  1. transport accept and peer-credential capture before any frame is parsed;
  2. wire-version validation on every frame, with `VersionMismatch` closing the
     connection on a frame outside `SUPPORTED_WIRE_VERSIONS`;
  3. exactly one `daemon.negotiate`, with a bounded pre-auth budget;
  4. service-version range check;
  5. operator-capability verification when `daemon.*` scopes are requested;
  6. capability and limits advertisement, fixed for the connection;
  7. method dispatch, server-side scope evaluation, then visibility and
     generation checks.
     A failure at any step returns its own typed result and closes where the
     contract says so. A later step never runs after an earlier refusal.
- The pre-auth state machine is one request to one response: no pipelining, no
  request before the negotiate response, and no second negotiate. A frame that
  arrives before the negotiate response, or a second `daemon.negotiate`, is
  refused with `Denied/AlreadyNegotiated` and the connection closes; frames are
  never buffered and reordered behind the handshake. The connection has
  `negotiate_timeout_ms` to complete the handshake and may send at most
  `pre_auth_max_bytes` before the response; exceeding either closes it with a
  typed timeout or limit refusal and one aggregated audit record. A failed
  handshake is not retried on the same connection.
- There is no best-effort mode, no probe-based downgrade, and no partial
  surface. A server serves one major at a time in v0.2.0; an older major gets a
  typed refusal, not a translated session.
- Capabilities are an explicit set, fixed for the connection:
  `terminal_sessions` (true), `worker_sessions` (false), `events`,
  `observer_grants`, `control_transfer`, `idempotent_mutations`. A client must refuse to use a
  method whose capability is absent. A capability never changes semantics
  within a major; additions are minor-versioned and additive.
- Unknown capability names are ignored by a forward-compatible client, but an
  unknown method is `InvalidMethod`, not a silent no-op.

### D-12: heartbeat and last-seen

- The client heartbeats its leases at or below
  `limits.attach_heartbeat_interval_ms`. The heartbeat names the lease ids on
  the connection.
- Any successful request that names a lease also refreshes that lease. A
  heartbeat refreshes all leases on the connection.
- `last_seen_at`, `lease_expires_at`, and `last_worker_seen_at` are server
  monotonic values; the handshake publishes `server_monotonic_ms` so clients
  compute age without trusting their own clock.
- `last_worker_seen_at` is present only when supervision provides a worker
  liveness signal. A PTY child is observed through process wait, not a
  heartbeat, so it is absent for terminal sessions unless the implementation
  has a real signal to report.
- Staleness detaches the lease only. It never aborts a session, never changes
  the generation, and never produces a terminal reason. Detach on silence is
  safe; abort on silence is forbidden.
- A connection with no traffic for `limits.transport_idle_ms` is closed with a
  transport timeout, and its leases expire.

### D-13: timeout ownership

| Class          | Owner  | Trigger                                | Effect                                                 | Result class      |
| -------------- | ------ | -------------------------------------- | ------------------------------------------------------ | ----------------- |
| Transport idle | bittyd | No complete frame within the bound     | Close the connection; expire its leases                | Transport timeout |
| Request        | bittyd | A method exceeds its bound             | Typed timeout; a mutation may have applied             | Request timeout   |
| Attach lease   | bittyd | Lease heartbeat older than the TTL     | Detach only                                            | Attach expired    |
| Spawn bind     | bittyd | Worker not bound within the bound      | `failed/spawn_failed`                                  | Start failure     |
| Retention      | bittyd | Terminal record older than the TTL     | Collect metadata                                       | Unknown session   |
| Abort grace    | bittyd | Graceful termination exceeds the bound | Kill signal, then classify cleanup                     | Termination       |
| Drain grace    | bittyd | Drain exceeds the bound                | Force the remainder; signal drains use `host_shutdown` | Daemon stop       |
| Orphan reap    | bittyd | Reap exceeds the bound                 | Kill signal, then verify                               | Orphan reap       |
| Execution      | Wheel  | The run's own deadline                 | Abort with `consumer_timeout`                          | Consumer timeout  |

- The daemon imposes no default execution deadline on an attached worker.
  Transport and request bounds constrain IPC, not how long work takes.
- A consumer timeout is an abort with the `timeout` reason class, so the
  terminal reason stays `consumer_timeout` and never becomes a generic
  cancellation.
- A request timeout whose outcome is unknown is reconciled with `status` before
  any mutating retry. A mutation never leaves a partial effect without a typed
  result: it either applies whole, or the client receives a typed timeout and
  must reconcile. A timed-out mutation may have applied; the adapter treats it
  as unknown, reads `status`, and retries only with the same idempotency key and
  generation. A stale-generation refusal ends the retry path.

### D-14: resource limits

All values are advertised in `limits` at handshake. This section is normative
for enforcement and values; the `D-14` decision row is its summary and never
overrides it. Each limit is an object `{effective, default, system_max}`:

- `default` is the compiled default; `system_max` is the compiled ceiling;
- `effective` is the value the daemon actually enforces for this run, never
  above `system_max` and never below a compiled floor where one is defined;
- user configuration may lower `effective` below `default`, or raise it back up
  to `system_max`, and never above `system_max`;
- clients parameterize tests and adaptive behavior on `effective`, never on a
  hardcoded default;
- raising a `system_max` requires an attributable contract revision and
  security review;
- inherited transport bounds are published as objects with
  `effective == default == system_max`, so one schema covers everything.

| Limit                                     | Default   | System maximum | Rationale                                                                                         |
| ----------------------------------------- | --------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `max_sessions`                            | 16        | 64             | Live non-terminal sessions; reuses the Core `MAX_TERMINALS` ceiling and default.                  |
| `max_attaches_per_session`                | 8         | 16             | Bounded by the accepted RC-9 connection ceiling.                                                  |
| `max_attaches_per_connection`             | 8         | 16             | One connection cannot monopolize every session.                                                   |
| `max_retained_terminal_records`           | 64        | 64             | Bounded terminal snapshot retention.                                                              |
| `session_record_bytes`                    | 4096      | 4096           | Bounds per-session metadata.                                                                      |
| `terminal_retention_ms`                   | 600000    | 3600000        | Terminal records are collected after ten minutes by default.                                      |
| `max_event_backlog_events`                | 256       | 256            | Bounded per-session event ring.                                                                   |
| `max_event_backlog_bytes`                 | 262144    | 262144         | Reuses the RC-10 frame ceiling as the backlog byte bound.                                         |
| `max_lease_queue_events`                  | 256       | 256            | Bounded outbound queue depth for one lease.                                                       |
| `max_lease_queue_bytes`                   | 65536     | 65536          | Bounded outbound queue bytes for one lease.                                                       |
| `max_connection_pending_bytes`            | 1048576   | 1048576        | Sum of in-flight request payloads per connection; 64 pending requests may not multiply beyond it. |
| `max_connection_outbound_bytes`           | 1048576   | 1048576        | Per-connection outbound buffer across all its leases.                                             |
| `attach_heartbeat_interval_ms`            | 5000      | 5000           | Client heartbeat cadence.                                                                         |
| `attach_lease_ttl_ms`                     | 15000     | 15000          | Three missed heartbeats detach; never aborts.                                                     |
| `observer_grant_ttl_ms`                   | 60000     | 300000         | Single-use observer grant lifetime.                                                               |
| `max_pending_observer_grants_per_session` | 8         | 8              | Bounds unconsumed observer grants; a mint at the cap is refused with `LimitExceeded`.             |
| `host_grant_ttl_ms`                       | 300000    | 900000         | Single-use host-consent grant lifetime.                                                           |
| `max_pending_host_grants`                 | 8         | 8              | Bounds outstanding host-consent grants; a mint at the cap is refused with `LimitExceeded`.        |
| `host_grant_record_bytes`                 | 128       | 128            | Bounds one host-consent grant record.                                                             |
| `grant_id_bytes`                          | 32        | 32             | Fixed 128-bit hex non-secret grant id; shorter or longer values are `InvalidRequest`.             |
| `transport_idle_ms`                       | 30000     | 30000          | Closes a silent connection.                                                                       |
| `request_timeout_ms`                      | 10000     | 10000          | Per-request bound.                                                                                |
| `negotiate_timeout_ms`                    | 5000      | 5000           | Pre-auth handshake bound.                                                                         |
| `pre_auth_max_bytes`                      | 8192      | 8192           | Bytes a connection may send before the negotiate response.                                        |
| `spawn_bind_timeout_ms`                   | 30000     | 30000          | A worker must bind within this bound or the session fails.                                        |
| `abort_grace_ms`                          | 5000      | 5000           | Graceful signal, then kill.                                                                       |
| `drain_grace_ms`                          | 10000     | 10000          | Bounded daemon drain.                                                                             |
| `orphan_reap_grace_ms`                    | 5000      | 5000           | Graceful orphan termination, then kill.                                                           |
| `orphan_record_retention_ms`              | 3600000   | 86400000       | Quarantine retention for unverifiable orphan records; one hour by default, at most one day.       |
| `max_idempotency_keys_per_session`        | 512       | 512            | Bounded dedupe store; 128 bytes per entry with a 65,536-byte cap.                                 |
| `max_idempotency_bytes_per_session`       | 65536     | 65536          | Bounds 512 descriptor records at 128 bytes each; released at the terminal transition.             |
| `max_create_idempotency_keys`             | 128       | 128            | Pre-session create-key store depth; covers live and retained sessions.                            |
| `max_create_idempotency_bytes`            | 32768     | 32768          | Pre-session store bytes; 128 records of at most 256 bytes.                                        |
| `create_idempotency_ttl_ms`               | 600000    | 3600000        | Retirement floor for create keys; retirement never permits a duplicate effect.                    |
| `max_orphan_records`                      | 64        | 64             | At most one record per live spawn; full journal refuses a spawn.                                  |
| `orphan_record_bytes`                     | 4096      | 4096           | Bounds one two-phase journal record.                                                              |
| `terminal_id_bytes`                       | 128       | 128            | Bounds a client-supplied `terminal_id`; server ids are 32 hex characters.                         |
| `attach_id_bytes`                         | 32        | 32             | Fixed 128-bit hex `attach_id`; shorter or longer values are `InvalidRequest`.                     |
| `refusal_audit_budget_per_sec`            | 20        | 20             | Per-connection refusal records before aggregation; excess is counted, not lost silently.          |
| `audit_file_bytes`                        | 1048576   | 2097152        | One bounded audit segment; rotation count is a compiled constant.                                 |
| `audit_segments`                          | 2         | 2              | Two segments bound total audit bytes.                                                             |
| `max_spawn_argv_entries`                  | 64        | 64             | Bounds a create request.                                                                          |
| `max_spawn_env_entries`                   | 128       | 128            | Bounds the explicit child environment.                                                            |
| `max_spawn_field_bytes`                   | 4096      | 4096           | Bounds each argv, env, and cwd field.                                                             |
| `max_spawn_spec_bytes`                    | 65536     | 65536          | Bounds the whole spawn specification.                                                             |
| `max_content_bytes_per_session`           | 268435456 | 268435456      | Content-plane cap per session (grid, scrollback, images); outside the metadata aggregate.         |

`max_sessions` bounds live non-terminal sessions; retained terminal records are
bounded separately by `max_retained_terminal_records`. The event ring and the
per-session idempotency store are released at the terminal transition, so a
retained terminal record is metadata only (`session_record_bytes`) and the
`per-session` line multiplies live sessions only. The aggregate session-host
metadata bound at the system maxima is:

```text
sessions    = (max_sessions + max_retained_terminal_records) × session_record_bytes
            = (64 + 64) × 4096 = 524,288

per-session = max_sessions × (max_event_backlog_bytes + max_idempotency_bytes_per_session)
            = 64 × (262,144 + 65,536) = 20,971,520

leases      = max_attaches_per_connection × connections × (max_lease_queue_bytes + lease_record_bytes)
            = 16 × 16 × (65,536 + 512) = 16,908,288

connections = connections × (max_connection_pending_bytes + max_connection_outbound_bytes)
            = 16 × (1,048,576 + 1,048,576) = 33,554,432

creates     = max_create_idempotency_bytes = 32,768

observer grants = max_sessions × max_pending_observer_grants_per_session × observer_grant_record_bytes
                = 64 × 8 × 128 = 65,536

host grants = max_pending_host_grants × host_grant_record_bytes
            = 8 × 128 = 1,024

metadata total = 524,288 + 20,971,520 + 16,908,288 + 33,554,432
               + 32,768 + 65,536 + 1,024
               = 72,057,856 bytes
```

`connections` is the inherited RC-9 ceiling of 16, `lease_record_bytes` is a
compiled 512-byte lease record, and the grant record sizes are compiled. The
per-connection lease cap times the connection ceiling (256 leases) dominates the
per-session product (1,024), so the lease bound follows the connection ceiling,
not `max_sessions × max_attaches_per_session`. The audit sink is separately
bounded by `audit_file_bytes × audit_segments` (4,194,304 bytes at the system
maxima) and the orphan journal by `max_orphan_records × orphan_record_bytes`
(262,144 bytes), so the **session-host metadata state** including bounded sinks
is 76,514,304 bytes. No registry, lease, connection, create, grant, audit, or
journal structure grows without one of these bounds; a per-connection record is
fixed by the closed scope and capability sets plus
`max_attaches_per_connection`, and is not a growing store.

The content plane is counted separately because it is terminal content, not
session-host registry metadata; for a hosted session the daemon holds it under
the accepted terminal content contracts. ADR 0008 requires maximum scrollback
cells and image-store bytes per terminal, and ADR 0019 `D3` keeps that bound;
this contract sets the per-session content cap the daemon advertises as
`max_content_bytes_per_session` = 268,435,456 bytes (256 MiB), inclusive of
grid, scrollback, and images for one session, and the content owner prunes to
fit. The accepted `IMG-4` aggregate image budget (256 MiB per window across all
protocols and terminals) still governs Core's image store and is not weakened;
the per-session cap is a memory ceiling, not an image entitlement. At the system
maxima the worst-case content allocation is
`max_sessions × max_content_bytes_per_session` =
17,179,869,184 bytes (16 GiB), and the combined session-host plus content bound
is 17,256,383,488 bytes. This contract does not redefine the content plane; it
fixes the per-session cap the daemon advertises and accounts for it separately
from the metadata aggregate.

The whole-spawn-specification bound dominates: a request whose `argv`, `env`,
and `cwd` fields are each individually valid but whose combined specification
exceeds `max_spawn_spec_bytes` is refused with `LimitExceeded` before any spawn.
No partial environment is constructed, and the daemon never spawns first and
validates the remainder afterwards.

Inherited transport bounds are not repeated as daemon constants: 256 KiB frame,
256 KiB chunk, 64 pending requests, 256 channel capacity, 100 req/s sustained
with 200 burst, 16 connections per endpoint, and 1 MiB decoded request payload.
The daemon publishes them in `limits` for clients that parameterize tests, and
the per-connection bounds above close the gap where 64 pending requests of the
maximum payload would otherwise multiply past the transport ceiling.

A limit violation is refused whole: no partial mutation is applied without a
typed result, no session is transitioned, the result carries counts and the
limit that was hit, and no caller bytes are echoed. A refused request never
takes the daemon down.

### D-15: platform cells and unsupported behavior

The service surface is platform-neutral. Cells follow ADR 0002:

| Cell           | Tier | v0.2.0 status                                          | Peer identity mechanism                           |
| -------------- | ---- | ------------------------------------------------------ | ------------------------------------------------- |
| Linux x86_64   | 1    | First delivery cell; full surface after conformance    | `SO_PEERCRED` plus peer process handle            |
| Windows x86_64 | 1    | Conformance-gated; no advertisement before it          | Named-pipe client pid plus token SID comparison   |
| macOS ARM64    | 1    | Conformance-gated; no advertisement before it          | Platform peer-credential call on a private socket |
| Linux ARM64    | 2    | Best-effort cadence; same surface                      | Same as Linux x86_64                              |
| macOS x86_64   | 2    | Best-effort cadence; same surface                      | Same as macOS ARM64                               |
| FreeBSD x86_64 | 2    | Best-effort; same surface where peer credentials exist | BSD peer-credential equivalent                    |
| Other cells    | 3    | Typed unsupported; no transport                        | None                                              |

- An unadvertised cell returns `UnsupportedPlatform` at handshake, or "no
  endpoint" when the daemon cannot start at all. There is no fallback socket,
  no anonymous transport, and no weaker peer check.
- Cross-compilation, emulation, and a passing build are not evidence for a
  Tier 1 cell. Native-runner conformance is required before advertisement.
- Unix: a uid that appears equal only through a user namespace or container
  mapping is `Unauthenticated`, never same-user success. On macOS, code signing
  is not an authentication substitute; the platform peer-credential call is.
- Windows: the pipe has a current-user-only DACL and rejects remote clients at
  the pipe level. A SID mismatch, an AppContainer that cannot be attributed, or
  an integrity-level mismatch that the documented same-user rule does not cover
  fails closed with `Unauthenticated`/`UnsupportedPlatform`; there is no silent
  elevation fallback.
- The daemon never opens a TCP listener on any cell. The only endpoint is the
  documented local socket or named pipe.

### D-16: audit and attribution

The daemon records lifecycle and refusal events, not content. Each record has:

- wall-clock timestamp (display only) and server monotonic time (ordering);
- `daemon_instance_id`;
- `session_id`, `generation`, and `state_revision` when a session exists;
- actor: peer uid or SID, peer pid, `client_id`, and the optional
  `client_correlation_digest` (never the raw correlation value);
- action and static result code;
- the target of the action: `attach_id` for transfer, revoke, and detach;
  `terminal_id_digest` for create and terminal transitions; `grant_id` for host
  and observer grant mint, consume, and revoke; `session_id` otherwise. Raw
  `terminal_id` and raw grant bearer values never appear in audit;
- counts and limits for a refusal;
- for a terminal transition: state, reason, exit code or signal, cleanup class.

Every string field written to audit is valid UTF-8, contains no control
characters (`0x00-0x1F`, `0x7F`), and is bounded to 128 bytes unless a stricter
bound is named. A value that fails validation is replaced with the static marker
`invalid`, never escaped, truncated mid-character, or written raw. `attach_id`, `session_id`, `terminal_id_digest`, and `grant_id` are already bounded by the
contract, and no other caller-controlled free-form string is stored.

The daemon never records terminal text, PTY bytes, scrollback, clipboard
content, argv, environment values, file contents, prompts, transcripts, tool
output, provider payloads, secret values, the control token, or the operator
capability. There is no caller-supplied audit label: the `daemon.stop` label was
removed in the 2026-10-27 revision because a free-form caller string in audit is
an injection and secret-retention channel with no contract need.

- The sink is an owner-private append-only file under
  `$XDG_STATE_HOME/bitty/audit/` (directory `0700`, file `0600`), bounded by
  `audit_file_bytes` and `audit_segments`. A future alternative sink must keep
  the same owner-private, bounded, content-free properties.
- Rotation happens when the active segment reaches `audit_file_bytes`: the
  active segment is fsynced, a new segment is opened, and the oldest segment is
  removed so at most `audit_segments` exist. A crash may lose the unflushed tail
  of the active segment; the loss is bounded by one segment and never rewrites
  or reorders a completed record. Rotation failure sets `audit_degraded=true`
  and fails privileged mutations closed exactly like a write failure.
- Refusals of privileged actions and all terminal transitions are attributed
  before the reply is sent where the sink is available. If the sink cannot be
  written, the daemon refuses the privileged action with `Internal`, changes no
  state, and reports `audit_degraded=true` in `daemon.status`; reads continue.
  The missing record is surfaced through that degraded state and the typed
  refusal, never silently ignored.
- Refusal records are budgeted per connection at
  `refusal_audit_budget_per_sec`. Beyond the budget the daemon emits one
  aggregated record per second carrying the suppressed count and the static
  code histogram; a refusal is still returned to the caller. The aggregate
  record makes suppression observable instead of silent, and the budget bounds
  the sink pressure a refusal flood can create.
- There is no service method to read audit in v0.2.0. The operator reads the
  owner-private file. Wheel and other consumers keep their own audit of record
  and record the daemon instance, session, generation, revision, and client id.
- Audit is best-effort across a daemon crash; it is not a durable ledger and
  must not be presented as one. It is also not tamper-evident against the
  account owner: the owner can read, edit, truncate, or delete an owner-private
  file, so audit is evidence about consumer clients and daemon behavior within
  the owner's account, never evidence against the owner.
- Diagnostics follow the same minimization rule. Trace, debug, panic, and crash
  output never carries argv, env, clipboard, token, operator capability, or PTY
  content. Token-bearing structures implement a redacted `Debug` that prints a
  type name and a static marker, and the daemon disables core dumps for itself
  (`RLIMIT_CORE=0` and a non-dumpable process on Linux). A crash report that
  would include a token-bearing structure is refused rather than redacted
  best-effort.

### D-17: worker restart

- The daemon never restarts a worker, never rebinds a session to a new worker,
  and never "repairs" a failed session.
- A retry is a new `session.create` with a new session id, a new control token,
  and a generation starting at 0. The old session stays terminal until
  retention and then becomes unknown.
- A consumer that loses a transport or times out reconciles with `status`; it
  never assumes continuation and never creates a second worker for a run that
  may still be alive. The adapter refuses a second host for a run that already
  has a live session.
- If worker hosting is enabled later, this no-rebind rule still holds unless a
  superseding contract explicitly defines a rebind with a new generation and a
  terminal predecessor.

### D-18: idempotency

Two stores exist, and neither can block a termination:

- **Keyed methods** carry a client-generated 128-bit idempotency key, encoded in
  at most 128 bytes: `session.create`, `session.attach`, `session.grant` mint,
  and `session.control.transfer`.
- **Termination and revocation methods are keyless**: `session.abort`,
  `session.kill`, `daemon.stop`, `session.detach` of another lease, and
  `session.grant.revoke` carry no idempotency key and never consult either
  store. They are naturally idempotent by `(session_id, generation)`, by the
  daemon instance and mode, or by the target `attach_id`/`grant_id`: a duplicate
  abort or kill after the terminal transition returns the terminal snapshot, a
  repeated `daemon.stop` returns the current daemon state or the same typed
  result, a repeated revoke returns `not_attached`/`not_active`, and a full
  idempotency store can therefore never block termination or revocation.
- Own-lease detach is naturally idempotent for the same reason.

Session-scoped keyed methods use a **per-session key store** keyed by
`(authenticated uid or SID, key)` and record the method, target, and
fingerprint. For session methods the target is the `session_id` (plus
`attach_id`, `grant_id`, or `terminal_id_digest` when the method names one).
Each stored entry is a bounded descriptor, never a snapshot or terminal
content:

```text
key                     16 bytes  (128 random bits)
method                   1 byte
target kind              1 byte
target                  16 bytes  (session/attach/grant id, or terminal-id digest)
fingerprint             16 bytes  (truncated SHA-256 of method, target, generation, reason class or spawn digest)
result descriptor       48 bytes  (status 2, result class 2, session id 16, generation 8, revision 8, flags 4, result ref 8)
alignment/reserved      30 bytes
total                  128 bytes per entry
512 keys × 128 bytes = 65,536 bytes = max_idempotency_bytes_per_session
```

`result ref` is a 64-bit index into the session's lease or observer-grant record
created by the original call; it is not a raw id and is never reused while the
entry exists. A duplicate `session.attach` or `session.grant` mint returns the
same `attach_id` or `grant_id` (and the same unconsumed bearer for a mint) while
that record exists, and `not_attached`/`not_active` after it is gone. A
lease-bound result is replayed only on the connection that created it; a
duplicate presented on another connection is refused with
`IdempotencyConflict`. `session.create` stays replayable across connections so a
lost create response can be recovered.

A replay returns the stored descriptor and, for a live session, the client
reads `session.status` for the current snapshot; snapshots are recomputed, not
stored. `max_idempotency_keys_per_session` is 512 and
`max_idempotency_bytes_per_session` is 65,536, so the per-entry budget is
128 bytes and the bound is feasible without storing a snapshot per key.

`session.create` cannot use a per-session store because no session exists yet.
It uses a separate **pre-session create-key store** keyed by
`(authenticated uid or SID, key)`, bounded by `max_create_idempotency_keys` and
`max_create_idempotency_bytes`. Each entry records:

```text
key                     16 bytes
method + target kind     2 bytes
terminal-id digest      16 bytes  (raw terminal_id is kept only in session memory)
fingerprint             16 bytes  (truncated SHA-256 of kind, terminal id digest, spawn-spec digest)
session_id              16 bytes
initial control token   32 bytes  (only while the initial token is current)
status + generation + revision  18 bytes
flags/reserved           4 bytes
total                  120 bytes, budgeted at 256 bytes per entry
128 keys × 256 bytes = 32,768 bytes = max_create_idempotency_bytes
```

A second live `terminal_id` still collides through `TerminalAlreadyHosted`,
independent of the key store. The create-key lookup runs before the uniqueness
check, so a retry with the same key returns the original result.

A duplicate with the same fingerprint returns the stored descriptor. A
duplicate `session.create` additionally returns the same control token only
while the initial token is still current, because the original response may
have been lost before the token reached the client. After any successful claim
or transfer the duplicate returns the descriptor with `control_claimed=true`
and no token: returning the rotated token would reveal a secret minted to a
different lease and create a recovery path the contract forbids. A duplicate
with a different fingerprint (different method, target, generation, reason
class, or spawn specification digest) is refused with `IdempotencyConflict`
and applies nothing.

Create keys are token-equivalent secrets: a duplicate create can return the
control token, so a consumer must not log the key, place it in a child
environment, or reuse it for a different spawn specification.

- Session keys are released at the terminal transition, not at collection. The
  event ring and the per-session idempotency store are freed when the session
  becomes terminal, and a retained terminal record is metadata only
  (`session_record_bytes`). Termination is therefore never gated by either
  store.
- Create keys are retained for at least `create_idempotency_ttl_ms` and never
  retired while the referenced session is live. At capacity, a new keyed
  request other than a termination is refused with `IdempotencyCapacity` and no
  effect.
- Retirement cannot permit a duplicate effect. A key is retired only when
  (a) its stored result is a refusal that applied nothing, (b) its session is
  terminal and the `create_idempotency_ttl_ms` floor has passed, or (c) for a
  session-scoped key, its result is a terminal descriptor that the client can
  still reconcile through `status`; a create key additionally waits for the
  floor in (b). The daemon never evicts a key whose retirement would let a retry
  apply the mutation twice; at capacity it refuses new keyed work instead.
- The create-key store is in memory and does not survive a restart. After a
  restart a client that retries a create with the same key gets a new session;
  the old session is neither adopted nor assumed dead. Its two-phase journal
  record is reaped or quarantined per `D-06`, and the adapter must not retry an
  unfenced create whose outcome is unknown: it reconciles with `status` while
  the instance is current, and across `StaleInstance` it treats the old run as
  possibly alive and does not create a second host for it. There is no
  "orphan candidate" adoption and no duplicate-spawn permission in this
  contract.

## Service surface

The surface is specified as logical operations. Framing, envelope fields, and
encoding follow the accepted `bitty-ipc` v1 transport; exact JSON key spellings
are frozen by the first implementation and pinned by the conformance corpus.
Method names below are the contract names for conformance and must match the
`bitty-ipc` method grammar (lowercase dotted segments).

### Handshake

`daemon.negotiate`:

Request: `client_version {major, minor}`, optional `client_correlation`,
optional `operator_capability`, optional `host_grant`. The wire version is
carried by every frame and is not renegotiated here. A `host_grant` is consumed
at most once; a missing, expired, wrong-peer, or revoked grant is
`Denied/ConsentRequired` when the client later calls `session.create`.

Response:

| Field                 | Meaning                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `wire_version`        | The accepted wire version (`1`).                                                                                 |
| `service_api_version` | `{major, minor, min_client_minor}` of the service and the accepted client range.                                 |
| `daemon_instance_id`  | Fresh random instance id.                                                                                        |
| `daemon_pid`          | Observational only; never a signal or authority input.                                                           |
| `server_identity`     | OS uid or SID, endpoint kind, endpoint owner, and endpoint mode facts.                                           |
| `peer_identity`       | Authenticated uid or SID, pid, and process start time.                                                           |
| `client_id`           | Server-assigned connection identity.                                                                             |
| `scopes`              | Effective scopes for this connection; `session.host` appears only with explicit consent.                         |
| `capabilities`        | `terminal_sessions`, `worker_sessions`, `events`, `observer_grants`, `control_transfer`, `idempotent_mutations`. |
| `limits`              | Every bound as `{effective, default, system_max}`, including the inherited transport bounds.                     |
| `server_monotonic_ms` | Server monotonic clock at handshake.                                                                             |
| `daemon_state`        | `running` or `stopping`; a stopping daemon refuses new sessions.                                                 |

A version mismatch, an untrusted endpoint, a failed peer check, or a missing
operator capability (when operator scopes are requested) is a typed refusal and
the connection closes. No session operation is possible before a successful
negotiate.

- Exactly one `daemon.negotiate` is accepted per connection. A second one, or
  any request frame that arrives before the negotiate response, closes the
  connection with `Denied/AlreadyNegotiated`; frames are never buffered and
  replayed after the handshake.
- The handshake must complete within `negotiate_timeout_ms` and may send at most
  `pre_auth_max_bytes` first. Exceeding either closes the connection with a
  typed result and one aggregated audit record.
- The response is sent once and is immutable for the connection. A client that
  needs different scopes or capabilities reconnects; it cannot renegotiate in
  place.

### Endpoint discovery

There is exactly one documented discovery rule per platform. Clients never
scan, guess, or fall back to another transport.

- Unix: the endpoint is `$XDG_RUNTIME_DIR/bitty/bittyd.sock`, inside a `0700`
  directory, as a `0600` socket owned by the user. If `XDG_RUNTIME_DIR` is
  unset or unusable, the client gets a typed "no endpoint" result; there is no
  `/tmp` fallback and no abstract-namespace socket.
- Windows: the endpoint is a local named pipe whose name is derived from the
  current user SID, with a current-user-only DACL and remote clients rejected
  at the pipe level.
- `BITTYD_ENDPOINT` may override the derived endpoint for tests, alternate
  runtime roots, and nested sessions. It is a path, not a credential; the
  daemon and client resolve it the same way, and an endpoint that fails the
  owner/mode or SID checks is refused even when the override is set.
- There is no registry key, port, broadcast, or discovery service. A missing
  endpoint is a normal supported state, not an error that changes the
  consumer's transport selection.

### Session create

`session.create`:

Request: `kind` (`terminal` only in v0.2.0), optional `terminal_id` (the
server assigns an opaque id when absent), spawn specification (required for
`terminal`), idempotency key.

The terminal spawn specification is bounded and explicit:

| Field         | Rule                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `argv`        | 1 to `max_spawn_argv_entries` entries, each at most `max_spawn_field_bytes`.                                                               |
| `env`         | At most `max_spawn_env_entries` explicit `name=value` entries; this is the child's environment, not a patch over the daemon's environment. |
| `cwd`         | One bounded absolute path, at most `max_spawn_field_bytes`.                                                                                |
| `cols`/`rows` | Positive, within the existing terminal bounds.                                                                                             |
| `term`        | Optional; the daemon supplies a default only when absent.                                                                                  |

- `session.create` requires `session.host` **and** `process.spawn`. The first is
  an explicit per-client consent grant, never part of the baseline; the second
  is the existing executable-allowlist policy. The executable must satisfy that
  policy exactly as any other spawn does. A missing, expired, or invalid host
  grant is `Denied/ConsentRequired`; a missing `process.spawn` is
  `Denied/ScopeViolation`. Both are decided before any spawn, and a host grant
  without `process.spawn`, or the reverse, is not sufficient. An inspect-only
  client cannot create a session.
- The child never inherits the daemon's environment or any daemon credential.
  The daemon adds no service token, socket path, operation capability, or
  secret to the child; this is the P0-AC-023 child-scope rule.
- File-descriptor hygiene is mandatory. Every descriptor the daemon opens is
  `O_CLOEXEC`/`FD_CLOEXEC` at creation, including the listening socket, accepted
  connections, audit files, orphan-journal files, pidfds, cgroup descriptors,
  and the PTY master. Immediately before `exec`, the child calls
  `close_range(3, ~0, CLOSE_RANGE_CLOEXEC)` on Linux (or the per-descriptor
  equivalent on macOS/FreeBSD) so only the PTY slave on stdio survives. A
  child-side `/proc/self/fd` test asserts that no daemon descriptor, socket,
  audit file, journal file, or token-bearing structure is visible after exec.
- The whole-spawn-specification bound dominates the per-field bounds: a
  request whose individual fields are valid but whose combined specification
  exceeds `max_spawn_spec_bytes` is refused with `LimitExceeded` before any
  spawn, and no partial environment or child is created.
- The daemon treats argv, env, and cwd as opaque spawn data: it does not parse,
  interpret, record, or log them. The spawn specification is dropped from
  memory after the bind.
- Response: the session snapshot, the initial control token, and the current
  revision. Create does not attach. The creator must claim the controller lease
  with the token if it wants control; the claim rotates the token onto the
  claiming lease; otherwise the session runs detached.
- Duplicate live `terminal_id` is `TerminalAlreadyHosted`. A worker kind with
  `worker_sessions=false` is `UnsupportedCapability`. The create-key lookup runs
  before the uniqueness check: a retry with the same key returns the original
  result even while the first session is live, and only a different key with a
  live `terminal_id` is `TerminalAlreadyHosted`.

### Status and list

`session.status`:

Request: `session_id`, optional instance echo, optional generation echo.
Response: the full session snapshot.

- The snapshot is metadata only. It never carries terminal text, PTY bytes,
  scrollback, clipboard content, or a content handle. Reading content requires a
  live lease **and** `terminal.inspect` on the content plane; status and list
  never become a content side channel.
- Status never refuses on a stale generation; it returns the current
  generation, revision, lifecycle, terminal flag, attach count, controller
  presence, pending observer-grant count, last-seen values, and terminal reason.
- Status is the authoritative reconciliation read and must be cheap enough to
  call after any timeout.
- A foreign, unknown, or collected session is `NotFound`. An instance mismatch
  is `StaleInstance`.

`session.list`:

- Returns only sessions with a live lease on this connection. It never
  enumerates other clients' sessions.
- `daemon.inspect` adds an operator view with session id, kind, state,
  generation, revision, attach count, and owner peer identity; it never
  includes content.

### Attach and detach

`session.attach`:

Request: `session_id`, `role` (`observer` or `controller`), for observer an
`observer_grant`, for controller `expected_generation` and `control_token`, and
an idempotency key.

- Observer: requires `session.attach` **and** a valid observer grant. The grant
  is single-use, TTL-bound, attributed, and revocable; the daemon consumes it
  on the successful attach, so a replay is `Denied/ObserverGrantRequired`. A
  grant minted for a named peer or correlation digest refuses any other peer.
  Observer attach is allowed at any non-terminal state, including `stopping`,
  and is refused with `NotRunning` when terminal.
- Controller: requires `session.control`, the current control token, and a
  matching `expected_generation`. A live controller elsewhere is
  `Denied/ControlHeld`; a missing, stale, or rotated token is
  `Denied/InvalidControlToken`; stopping is `Denied/SessionStopping`; terminal
  is `Denied/NotRunning`. A successful claim rotates the token and returns the
  new token once to the claiming lease; a refused claim returns no token.
- Response: `attach_id` (32 lowercase hex characters), role, effective lease
  scopes, snapshot at the current revision, bounded backlog, and
  `backlog_truncated` with `earliest_revision`. The snapshot is metadata only;
  content still needs `terminal.inspect`.
- The lease records `attached_at`, `last_seen_at`, and `lease_expires_at` in
  server monotonic time. `attach_id` is distinct from `client_id` and is the
  only handle used for detach and transfer.
- An observer lease never carries input, resize, abort, or transfer authority,
  and it never becomes controller by waiting, by disconnect of the controller,
  or by a race. It becomes controller only through `control.transfer`.

`session.grant` and `session.grant.revoke` (observer grants):

Request (mint): `session_id`, `kind: observer`, optional `ttl_ms` (at most
`observer_grant_ttl_ms`), optional `observer_correlation_digest`, optional
`control_token` required only when control is vacant, and an idempotency key.

- Mint requires control authority: the current controller lease, or control
  vacant with the current control token, or the operator path
  `daemon.control`. `session.control` alone is never sufficient, and an observer
  lease is denied `Denied/ControllerRequired`. A missing, stale, or rotated
  token when control is vacant is `Denied/InvalidControlToken`. The daemon
  returns a 256-bit bearer grant and its non-secret `grant_id` (32 lowercase hex
  characters), stores the bearer digest for verification, and keeps the bearer
  value only in memory until the grant is consumed, expired, or revoked, so an
  idempotent duplicate mint can return the same unconsumed value. A duplicate
  after consumption or expiry returns the `grant_id` and `not_active` with no
  value. The mint, issuing actor, and expiry are recorded.
- The grant is single-use and expires at the TTL. Mint, consume, expiry, and
  revoke each increment the revision and are audited; a grant never appears in
  audit, diagnostics, or an environment.
- `session.grant.revoke` names the non-secret `grant_id` (never the bearer
  value), requires the same control authority as minting (an optional
  `control_token` is required only when control is vacant), and is idempotent
  without a key: a second revoke returns `not_active` and changes nothing. The
  operator may revoke any grant through `daemon.control`. An observer lease is
  denied `Denied/ControllerRequired`; a stale or rotated token is
  `Denied/InvalidControlToken`.
- A mint for a terminal session is `NotRunning`. A mint at the per-session
  pending-grant cap is refused with `LimitExceeded` and mints nothing.

`session.detach`:

Request: `attach_id` or `session_id` plus `attach_id`; a revocation of another
lease carries an optional `control_token` (required only when control is
vacant). It carries no idempotency key: the target `attach_id` is the dedupe
key.
Response: detach acknowledgement, previous attach state, revision, and the
audited target `attach_id`.

- Own detach is always allowed. Detaching another lease is a revocation: it
  requires control authority on that session (the current controller lease, or
  control vacant with the current control token) or the operator path
  `daemon.control`. An observer lease is denied `Denied/ControllerRequired`; a
  stale or rotated token is `Denied/InvalidControlToken`. The target receives
  `lease_revoked`, and the action is attributed with both the acting lease and
  the target `attach_id`.
- Duplicate detach returns `not_attached` and changes nothing.
- Detach never aborts, never changes the generation, and never produces a
  terminal reason.
- Expiry, self-detach, and revocation follow the same state path and are
  attributed. A detach never releases terminal content to another connection.

`session.control.transfer`:

Request: `session_id`, `generation`, `target_attach_id`, optional
`control_token` (required only when control is vacant), idempotency key.

- Requires the `session.control` scope and control authority: the current
  controller lease, or control vacant with the current control token. An
  observer lease is denied `Denied/ControllerRequired`; a live controller
  elsewhere is `Denied/ControlHeld`; a missing, stale, or rotated token when
  control is vacant is `Denied/InvalidControlToken`. The target must be a live
  observer lease on the same session that holds `session.control`; a terminal
  session's target must also hold `terminal.input`, and its resize authority
  requires `terminal.manage`.
- On success the target becomes controller, the previous controller becomes an
  observer, the revision increments, both leases receive `control_transfer`,
  and the target receives a newly rotated control token exactly once. The
  previous token is refused from that instant; a transfer response is never
  replayed to a different lease.
- The transfer is audited with the source `attach_id`, the target `attach_id`,
  the generation, and the resulting revision. A stale generation, a missing or
  stale token, or a non-observer target applies nothing.
- A terminal session answers a transfer with `NotRunning`; it never mints a
  token and never revives control. Control never transfers on disconnect,
  expiry, or attach; only this explicit method moves it.

### Abort and kill

`session.abort`:

Request: `session_id`, `generation`, `reason_class` (`cancel`, `timeout`,
`operator`), optional `control_token` only when control is vacant. There is no
idempotency key: the method is naturally idempotent by `(session_id,
generation)` and is never gated by a key store.

- Requires the `session.control` scope **and** control authority: the request
  arrives on the current controller lease, or control is vacant and it presents
  the current control token. Scope alone is never sufficient, and an observer
  lease is always denied with `Denied/ControllerRequired`. The `operator`
  reason requires `daemon.control` instead of the control relation and does not
  accept a control token. Consumer controllers may use `cancel` and `timeout`.
- A generation of `0` aborts a session that has not bound a worker: the spawn is
  cancelled, the session becomes `terminated` with the requested reason, and
  cleanup is `not_started` when nothing was spawned, or `swept` when the spawn
  syscall had already returned and the child was terminated before bind. The
  generation-0 abort is a cancel intent committed on the session record before
  the bind: the spawn path observes it and never binds a child the abort
  covered. A generation-0 abort that loses the race to a committed bind is
  `StaleGeneration` with the current generation and revision and applies
  nothing, so no orphan is created and no worker is killed by a stale request.
- A generation mismatch is `StaleGeneration`, carrying the current generation
  and revision, with no state change. The adapter reconciles and never retries
  the mutation against the new generation.
- On acceptance: state becomes `stopping`, revision increments, the abort
  record is attributed, and the terminal event follows after termination and
  reaping. The response is not a success claim about the worker; it is an
  accepted transition.
- A duplicate after terminal returns the terminal snapshot; it needs no key and
  is never refused for idempotency capacity.
- Denial order is fixed. A missing `session.control` scope is
  `Denied/ScopeViolation` before session lookup. A caller with the scope but no
  visibility gets `NotFound`. A visible observer, or any lease that is not the
  current controller, gets `Denied/ControllerRequired`. When control is vacant,
  a missing, stale, or rotated token gets `Denied/InvalidControlToken`; a live
  controller elsewhere gets `Denied/ControlHeld`. None of these results carries
  target details or changes state.

`session.kill`:

Request: `session_id`, `generation`. No idempotency key and no control token.

- Operator-only (`daemon.control`). Immediately terminates the whole
  containment identity, then reaps. Terminal reason is `operator_abort`;
  cleanup is `not_started` when no worker process was ever spawned, `swept` only
  when the containment identity verifies empty, otherwise `unverified`.
- A generation-0 kill commits the same pre-bind cancel intent as the
  generation-0 abort and `daemon.stop`: the spawn path never binds a child the
  kill covered, and cleanup is `not_started` when nothing was spawned or `swept`
  when the spawn syscall had already returned and the child was terminated
  before bind. A kill that loses the race to a committed bind is
  `StaleGeneration` with the current generation and revision and applies
  nothing; the operator re-issues at the current generation.
- Not available to consumer adapters and never gated by a key store. This is
  the only immediate-kill path; a duplicate after terminal returns the terminal
  snapshot.

### Daemon status and stop

`daemon.status`:

- Returns daemon state (`running` or `stopping`), instance id, pid
  (observational), uptime, session counts by state, orphan counts by class
  (`reaped`, `unverified`, `reserved`, `committed`, `stale`), `audit_degraded`,
  advertised limits, and the drain deadline when stopping.
- `daemon.inspect` is required for `daemon.status`; the handshake facts are the
  only daemon information an ordinary consumer connection receives.

`daemon.stop`:

- Request: mode (`refuse`, `drain`, `force`). There is no idempotency key, no
  control token, and no caller-supplied label: the method is naturally
  idempotent by daemon instance and mode, and audit fields are daemon-generated
  and bounded. A repeated stop returns the same typed result or the current
  daemon state, and a full idempotency store can never block it.
- Requires `daemon.control` and a successful peer re-check.
- Behavior, results, exit codes, and force-during-drain escalation are defined
  in `D-05`.

`daemon.host_grant`:

- Request: `action` (`mint` or `revoke`), optional `ttl_ms` (at most
  `host_grant_ttl_ms`), optional `client_correlation_digest`, and for revoke a
  `grant_id`.
- Requires `daemon.control` and a successful peer re-check. Mint returns a
  256-bit bearer host grant once and its non-secret `grant_id`; the daemon stores
  only the bearer digest and the peer binding. The grant is single-use,
  TTL-bound, and accepted only from the authenticated peer uid or SID it was
  bound to, plus the optional correlation digest.
- Consume, expiry, revoke, and mint are attributed with `grant_id`; the bearer
  value never appears in audit, diagnostics, or an environment. Revoke is
  idempotent: a second revoke returns `not_active` and changes nothing.
- This is an operator-only method. A same-uid adapter that can read the
  operator capability can mint its own grant; that is the stated intent-gate
  residual, not an isolation claim.

`daemon.orphans.verify`:

- Requires `daemon.control` and a successful peer re-check. Request: optional
  `action` (`verify` by default, or `retire` with a bounded journal record id).
  Re-runs orphan verification and returns counts by class with no process ids.
  It applies the same never-signal rule to quarantined and unverifiable
  records, signals only exact matches, and is idempotent. `retire` removes one
  quarantined record without signalling or adopting it, is attributed, and is
  the only way to free a quarantined slot before its retention expires.
- It is the only method that re-triggers orphan verification outside startup;
  there is no method to read the journal file or to address one record by pid.

### Events and heartbeat

`lease.heartbeat`:

- Request: one or more `attach_id` values owned by this connection.
- Response: `server_monotonic_ms` and each lease's `lease_expires_at`.
- A heartbeat for a foreign lease is `NotFound`; it never refreshes it.

Events are pushed on the connection for each live lease; there is no separate
subscribe method. The event kinds are:

| Kind               | Meaning                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `session_state`    | Lifecycle, attach, detach, claim, transfer, or revision change.    |
| `session_terminal` | Terminal transition with state, reason, exit information, cleanup. |
| `control_transfer` | Controller moved from one lease to another.                        |
| `lease_revoked`    | A lease was revoked by the controller or operator.                 |
| `daemon_stopping`  | Drain started; includes the deadline.                              |

### Stale handles, peer re-check, and refusals

- Instance mismatch is checked before session lookup and returns
  `StaleInstance`. Unknown, collected, or unauthorized sessions return
  `NotFound`. Effectful methods with a stale generation return
  `StaleGeneration` plus the current state, and apply nothing.
- On Linux, the accepted socket enables `SO_PASSCRED` and every request frame
  must carry `SCM_CREDENTIALS` matching the handshake peer uid and pid. A frame
  whose ancillary credentials are missing, differ from the handshake peer, or
  arrive after the peer process identity changed closes the connection with
  `Unauthenticated`. This closes the live-fd-passing path on the first cell: a
  connected socket handed to another process does not carry the original
  process's credentials on the next frame.
- On cells without a per-message credential mechanism (macOS and BSD peer
  credentials are connection-scoped), the residual is explicit: the daemon
  captures credentials at accept, and re-checks the captured process handle
  before every privileged action (create, controller attach, abort, kill,
  transfer, detach-other, grant, stop). A live descriptor passed to another
  process is accepted as the original peer between the accept and the next
  re-check; the review must test and record that residual rather than claim it
  is closed.
- Before every privileged action, the daemon re-verifies the captured peer: the
  process handle or pid plus start time is still the same live process, and the
  OS identity still matches. A dead peer, a changed identity, or a failed
  handle check closes the connection with `Unauthenticated` and applies
  nothing. This fails closed on inherited descriptors after peer exit and on
  pid reuse; it is not a defense against a hostile same-user process, which is
  inside the trust boundary.
- Endpoint tamper detection runs at startup and on a bounded interval: the
  runtime directory must be `0700`, the socket `0600`, and both owned by the
  daemon's uid (or the pipe DACL must be current-user-only). A mismatch stops
  acceptance, closes clients with `Unauthenticated`, writes an attributed
  record, and exits with code 6.
- The client verifies the endpoint owner and mode before its first request and
  refuses an endpoint it cannot attribute. That check is tamper **detection**,
  not server authentication: a same-uid impostor can create a socket at the
  path before the daemon does, and the client has no cryptographic proof of the
  server identity in v0.2.0. The `server_identity` handshake field is
  observational and must not be presented as proof. The residual is recorded
  and tested, not qualified away.
- The daemon keeps the single-instance lock for its whole lifetime. A second
  start fails with a typed "already running" result; stale socket files are
  removed only while holding the lock.

### Error taxonomy mapping

Transport and framing errors stay in the accepted `bitty-ipc` taxonomy. Session
outcomes are service results, never transport errors, and the two are never
substituted for each other.

| Condition                                                 | Result                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Major or minor version mismatch                           | `VersionMismatch` (transport-level)                                            |
| Peer credential failure                                   | `Unauthenticated`                                                              |
| Endpoint tamper                                           | `Unauthenticated`, then daemon exit 6                                          |
| Frame or payload over bound                               | `FrameTooLarge` / `PayloadTooLarge` / `LimitExceeded` with counts              |
| Pending-request or queue over bound                       | `PendingLimitExceeded` / `ChannelFull`; control frames close the lease instead |
| Rate limit                                                | `Denied/RateLimited`                                                           |
| Missing scope                                             | `Denied/ScopeViolation`                                                        |
| Missing, expired, or invalid `session.host` consent       | `Denied/ConsentRequired`                                                       |
| Scope present but not the controller, on a control method | `Denied/ControllerRequired` (observer or other lease is denied)                |
| Stale, rotated, or missing token when control is vacant   | `Denied/InvalidControlToken`                                                   |
| Observer attach without a valid grant                     | `Denied/ObserverGrantRequired`                                                 |
| Second negotiate or pre-auth frame                        | `Denied/AlreadyNegotiated`, connection closes                                  |
| Resize without the controller lease                       | `Denied/ControllerRequired`                                                    |
| Worker kind disabled                                      | `Denied/UnsupportedCapability`                                                 |
| Unsupported platform cell                                 | `Denied/UnsupportedPlatform`                                                   |
| Instance mismatch                                         | `Denied/StaleInstance`                                                         |
| Generation mismatch                                       | `Denied/StaleGeneration` with current generation and revision                  |
| Unknown, collected, or invisible                          | `NotFound`                                                                     |
| Controller already held                                   | `Denied/ControlHeld`                                                           |
| Session stopping                                          | `Denied/SessionStopping`                                                       |
| Terminal session mutation                                 | `Denied/NotRunning` or the terminal snapshot for an idempotent repeat          |
| Duplicate live terminal id                                | `Denied/TerminalAlreadyHosted`                                                 |
| Active sessions on default stop                           | `Denied/ActiveSessions` with counts                                            |
| Drain already in progress                                 | `Denied/DaemonStopping`                                                        |
| Idempotency fingerprint or connection conflict            | `Denied/IdempotencyConflict`                                                   |
| Idempotency store full (keyed methods only)               | `Denied/IdempotencyCapacity`; termination is keyless and never refused         |
| Terminal event could not be queued                        | Close the lease with `Denied/TerminalEventLost`                                |
| Request deadline                                          | `Timeout` with the request id and bound                                        |
| Audit sink unavailable                                    | `Denied/Internal`, no state change, `audit_degraded=true`                      |
| Invariant failure                                         | `Internal`, fail closed; no partial mutation without a typed result            |

The `Denied.code` values above are a closed service-level set. Unknown codes
are surfaced as a static `Internal` and never parsed as text. Refusals carry
counts, bounds, and static codes only; no caller bytes, path, terminal text, or
another session's details.

## State transitions and disposition

| Event                                         | Session and worker outcome                                                                                                             | Counters and leases                                                           | Client-visible result                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Client transport closes, no detach            | Worker continues; session stays `running`; derived `attached` becomes false when the last lease expires.                               | Generation unchanged; lease expires after the TTL; attach count decrements.   | No terminal event; the next status shows `attached=false`.                                                |
| Explicit detach                               | Worker continues; session stays `running` or detached.                                                                                 | Lease removed immediately; revision increments.                               | Detach acknowledgement; a repeat is `not_attached`.                                                       |
| Create without `session.host` consent         | No session registered; no process spawned.                                                                                             | None.                                                                         | `Denied/ConsentRequired`; missing `process.spawn` is `ScopeViolation`.                                    |
| Observer attach without a grant               | No lease created; session unchanged.                                                                                                   | None; no revision.                                                            | `Denied/ObserverGrantRequired`; no content or control handle.                                             |
| Observer grant expired or consumed            | No lease created; grant stays consumed or expired.                                                                                     | None; the grant is unusable.                                                  | `Denied/ObserverGrantRequired`; a fresh grant is required.                                                |
| Observer grant revoked                        | An unconsumed grant is invalidated; a live observer lease is revoked.                                                                  | Revision increments; target receives `lease_revoked`.                         | Attributed revocation; the observer reconciles with status.                                               |
| Observer resize attempt                       | No PTY resize; session unchanged.                                                                                                      | None; no revision.                                                            | `Denied/ControllerRequired`; the observer letterboxes locally.                                            |
| Controller resize                             | PTY resized by the single controller.                                                                                                  | Revision increments; generation unchanged.                                    | Accepted resize with the new revision.                                                                    |
| Controller abort, current generation          | Worker terminated under supervision; reason `consumer_cancel`.                                                                         | Generation unchanged; revision increments; repeat returns the terminal state. | Terminal event with reason, actor, and cleanup.                                                           |
| Controller abort, timeout reason              | Same as above with `consumer_timeout`.                                                                                                 | Same as above.                                                                | Terminal event distinguishable from cancellation.                                                         |
| Abort with stale generation                   | No state change; worker untouched.                                                                                                     | Current generation and revision returned.                                     | `StaleGeneration`; the adapter reconciles and stops.                                                      |
| Unauthorized abort or detach                  | No state change.                                                                                                                       | None.                                                                         | `NotFound` if invisible; observer is `ControllerRequired`; no target details.                             |
| Stale or rotated control token                | No state change.                                                                                                                       | None.                                                                         | `Denied/InvalidControlToken`; the token is never reissued.                                                |
| Termination while key store is full           | Abort, kill, or stop proceeds; no key is stored.                                                                                       | Terminal transition or daemon stop as usual.                                  | Terminal snapshot, accepted stop, or typed daemon result; never `IdempotencyCapacity`.                    |
| Worker crash by signal                        | Session becomes `failed`; signal and cleanup recorded; no restart.                                                                     | Generation unchanged; terminal state immutable.                               | Terminal event; a retry is a new session.                                                                 |
| Worker normal exit                            | Session becomes `exited`; whole containment identity terminated and cleanup recorded; exit code recorded; no restart.                  | Same as above.                                                                | Terminal event; process exit 0 is not task success.                                                       |
| `daemon.stop` default with sessions           | No session changes; typed refusal with counts.                                                                                         | None.                                                                         | `ActiveSessions`; CLI exit 3.                                                                             |
| `daemon.stop drain`                           | Notify, refuse new work, wait the deadline, then terminate the remainder.                                                              | Each transition attributed and revisioned.                                    | `daemon_stopping` then terminal events, or `TerminalEventLost` for a closed lease.                        |
| `daemon.stop force`                           | All active sessions terminate with `daemon_stop`, reaped and recorded.                                                                 | Same as above.                                                                | Terminal events where the transport exists; otherwise the client reconciles.                              |
| `force` during an active drain                | Drain grace is skipped; the remainder terminates with `daemon_stop`, or `host_shutdown` after a signal.                                | Each transition attributed; escalation is attributed to its operator.         | Escalation accepted; terminal events or `TerminalEventLost` per lease.                                    |
| Endpoint tamper or auth invariant             | Daemon exits 6 without terminal transitions; live workers keep reserved/committed journal records.                                     | No revision or terminal record; next start reaps or quarantines.              | Transport failure; `Unauthenticated` where a connection still exists.                                     |
| Generation-0 abort or kill wins the bind race | The spawn is cancelled or the unbound child is terminated; cleanup is `not_started` or `swept`.                                        | Terminal transition and revision; no generation increment.                    | Terminal event with the requested or operator reason; no orphan.                                          |
| Generation-0 abort or kill loses the race     | Bind committed; no state change from the stale request.                                                                                | Current generation and revision returned.                                     | `StaleGeneration`; the adapter reconciles and stops, the operator may re-issue at the current generation. |
| Daemon crash                                  | No terminal state guaranteed; workers may be orphaned.                                                                                 | Registry gone; next start has a new instance id.                              | Transport failure, then `StaleInstance`/`NotFound`; outcome unknown.                                      |
| Clean daemon restart                          | All sessions end; no persistence.                                                                                                      | New instance id; empty registry.                                              | `StaleInstance`; never resumed.                                                                           |
| Request or transport timeout                  | No partial mutation without a typed result; a mutation may have applied.                                                               | Outcome unknown until reconciled; revision reflects any applied mutation.     | Typed timeout; reconcile with status, retry only with key and generation.                                 |
| Lease expiry / last-seen stale                | Detach only; worker continues.                                                                                                         | Attach count decrements; generation unchanged.                                | No terminal event; status shows detached.                                                                 |
| Reattach, same client                         | New controller lease with the current token, which rotates; worker continues.                                                          | Generation must match; snapshot at the current revision.                      | Snapshot plus `backlog_truncated` when history was dropped.                                               |
| Reattach, different client                    | Observer only with a grant; control requires a transfer.                                                                               | New lease; attach count increments; generation unchanged.                     | Snapshot with role and co-attachment.                                                                     |
| Attach cap exceeded                           | Existing leases unaffected; the new attach is shed.                                                                                    | Attach count unchanged; refusal carries the cap.                              | Typed limit refusal; no tight retry loop.                                                                 |
| Terminal record collected                     | Record removed after the TTL.                                                                                                          | Handle becomes unknown.                                                       | `NotFound`; treat as lost, never as success.                                                              |
| Host reboot                                   | All sessions gone; no persistence promise.                                                                                             | New instance, new identity, empty registry.                                   | `StaleInstance` or unavailable; do not resume.                                                            |
| Session id reused across instances            | Never binds a stale client to a new session.                                                                                           | Instance mismatch refused before lookup.                                      | `StaleInstance`; never session-id-only fencing.                                                           |
| Orphan exact identity after crash             | The old worker or reserved cgroup subtree is reaped only if the boot-id-matched record and containment identity verify; never adopted. | New instance has no lease or revision for it.                                 | No client event; `daemon.status` reports the reap count.                                                  |
| Unverifiable orphan                           | Quarantined, retained, reported; never signalled by pid; subreaper fallback states the double-run residual.                            | None.                                                                         | `daemon.status` and `daemon.orphans.verify` report `orphan_unverified`.                                   |

## Conformance matrix

The vector set is the Wheel consumer set `V-01` through `V-34`, plus Core
vectors `C-01` through `C-19` for properties a consumer adapter cannot prove.
"Fake" is what a fake server can validate with injected time and limits. "Real"
names what only the real service can prove.

| Vector | Area            | Decisions        | Fake server                                                                                       | Real service requirement                                                                    |
| ------ | --------------- | ---------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| V-01   | Handshake       | D-08, D-11, D-14 | Yes: all fields, fresh instance, server-assigned client id, limits present                        | Required on each advertised cell for identity facts.                                        |
| V-02   | Handshake       | D-11             | Yes: typed refusal, connection closed, no downgrade                                               | Required to prove the real binary honors its own version.                                   |
| V-03   | Handshake       | D-01             | Yes: `worker_sessions=false` and typed unsupported                                                | Required to prove the delivered daemon advertises false and spawns nothing.                 |
| V-04   | Handshake       | D-14             | Yes: frame-bound refusal with actual and limit                                                    | Required for real transport framing.                                                        |
| V-05   | Attach          | D-03, D-09       | Yes: observer lease, count, revision, distinct attach id                                          | Required for real lease lifecycle.                                                          |
| V-06   | Attach          | D-09, D-12       | Yes with injected clock: expiry detaches, worker alive, generation unchanged                      | Required to prove no abort on silence.                                                      |
| V-07   | Attach          | D-09, D-18       | Yes: idempotent detach, no revision change on repeat                                              | Required for real registry behavior.                                                        |
| V-08   | Attach          | D-14             | Yes with injected cap: shed, no eviction                                                          | Required to prove the compiled cap and advertised value agree.                              |
| V-09   | Attach          | D-07             | Yes: uniform `NotFound`, no content                                                               | Required to prove peer filtering and audit attribution.                                     |
| V-10   | Attach          | D-09             | Yes: two leases, only one controller                                                              | Required for real lease identity.                                                           |
| V-11   | Lifecycle       | D-03, D-04       | Yes: simulated cancellation and terminal snapshot                                                 | Required for real signal, reap, and terminal reason.                                        |
| V-12   | Lifecycle       | D-03             | Yes: stale generation refusal, no state change                                                    | Required to prove the real counter cannot be spoofed.                                       |
| V-13   | Lifecycle       | D-07             | Yes: scope/token denial and static result                                                         | Required for real peer and scope evaluation.                                                |
| V-14   | Lifecycle       | D-04, D-17       | Partial: simulated crash and terminal event                                                       | Required: real signal death, cleanup, no restart.                                           |
| V-15   | Lifecycle       | D-04, D-17       | Partial: simulated normal exit                                                                    | Required: real wait status, whole-tree reap and cleanup class, immutable terminal record.   |
| V-16   | Stop            | D-05             | Yes: typed active-session refusal                                                                 | Required: CLI exit code and daemon still running.                                           |
| V-17   | Stop            | D-05             | Partial: protocol shape of force stop                                                             | Required: real two-session force, terminal events, reaping.                                 |
| V-18   | Restart         | D-02, D-06       | No: instance change can be simulated, not a crash                                                 | Required: real crash, new instance, stale handle, empty registry.                           |
| V-19   | Timeout         | D-13, D-18       | Yes with injected request deadline                                                                | Required: real request bound and dedupe.                                                    |
| V-20   | Retention       | D-14             | Yes with injected clock                                                                           | Required: real TTL and collection.                                                          |
| V-21   | Reattach        | D-10             | Yes: snapshot, bounded backlog, truncation marker                                                 | Required: real retained ring behavior.                                                      |
| V-22   | Reattach        | D-09             | Yes: second client needs a single-use grant; no control transfer                                  | Required: real grant store, lease, and token checks.                                        |
| V-23   | Bounds          | D-14             | Yes: pending cap shed                                                                             | Required: real queue pressure and attribution.                                              |
| V-24   | Bounds          | D-12, D-14       | Yes with injected clock: partial frame closed                                                     | Required: real socket stall and isolation.                                                  |
| V-25   | Trust (Unix)    | D-07, D-15       | No                                                                                                | Required: second uid; peer rejection before parsing.                                        |
| V-26   | Trust (Unix)    | D-07, D-15       | No                                                                                                | Required: endpoint mode/owner tamper and fail-closed exit.                                  |
| V-27   | Trust (Windows) | D-15             | No                                                                                                | Required on a Windows runner: SID mismatch and remote-pipe rejection.                       |
| V-28   | Trust           | D-15             | No                                                                                                | Required: startup scan shows no TCP listener.                                               |
| V-29   | Adapter         | D-01             | Yes: driver with no server returns typed unavailable                                              | Adapter-only; the real daemon absence is a supported state.                                 |
| V-30   | Adapter         | D-01             | Yes: fake daemon receives no connection                                                           | Adapter-only.                                                                               |
| V-31   | Adapter         | D-13, D-18       | Yes: drop during abort, unknown outcome, reconcile                                                | Required to prove the real request cannot be applied twice.                                 |
| V-32   | Adapter         | D-07             | Yes: fake server counts exactly one abort and sees no pid                                         | Required to prove no out-of-band signal path.                                               |
| V-33   | Adapter         | D-16             | Yes: fake server identity fields in Wheel audit                                                   | Adapter-only; the real audit content rule is C-07.                                          |
| V-34   | Cancellation    | D-04, D-13       | Yes: distinct simulated reasons                                                                   | Required: real cancel and timeout reasons and cleanup.                                      |
| C-01   | Identity        | D-02             | No                                                                                                | Instance id freshness, session id non-reuse, terminal id uniqueness.                        |
| C-02   | Trust           | D-07             | No                                                                                                | Peer re-check before each privileged action, including after peer exit.                     |
| C-03   | Orphans         | D-06             | No                                                                                                | Two-phase exact-identity reap; pid-reuse and unverifiable records never signalled.          |
| C-04   | Counters        | D-03             | Partial: revision increments can be simulated                                                     | Real revision increments and no increment on heartbeat.                                     |
| C-05   | Containment     | D-14             | Partial: refusal shapes                                                                           | Real refusal leaves no partial mutation without a typed result; daemon survives.            |
| C-06   | Events          | D-10             | Yes with injected queue pressure                                                                  | Real control frame is never shed; `TerminalEventLost` on failure.                           |
| C-07   | Audit           | D-16             | No                                                                                                | Audit sink modes, content-free records, bounded rotation, refusal budget, `audit_degraded`. |
| C-08   | Daemon absence  | D-01, D-05       | Yes: no endpoint                                                                                  | Real `bitty --safe`, headless tests, and plain invocation work without `bittyd`.            |
| C-09   | Authorization   | D-07             | Yes: full scope×method matrix; inspect-only create refused                                        | Real scope evaluation: `session.host` consent and `process.spawn` both required.            |
| C-10   | Attach          | D-09             | Yes with injected clock: grant single-use, TTL, revoke                                            | Real grant store, consume-once, expiry, and revocation.                                     |
| C-11   | Control         | D-09             | Yes: old token refused, new token works, terminal is `NotRunning`                                 | Real token rotation, lease binding, and refusal after transfer/revoke.                      |
| C-12   | Child scope     | D-07             | Partial: refusal shape                                                                            | Real child `/proc/self/fd` scan and `close_range(..., CLOEXEC)` proof.                      |
| C-13   | Orphans         | D-06             | No                                                                                                | Two-phase journal crash injection, reserved-record cgroup reap, and containment identity.   |
| C-14   | Audit           | D-16             | Partial: refusal-budget shape                                                                     | Flood budget/aggregation, rotation, redacted `Debug`, no core dumps.                        |
| C-15   | Trust (plugin)  | D-07             | No                                                                                                | Plugin host denies `connect()` to the daemon endpoint; negative test.                       |
| C-16   | Trust           | D-07             | No                                                                                                | Per-message `SCM_CREDENTIALS` mismatch closes; fd-passing residual tested.                  |
| C-17   | Session         | D-03, D-09       | Yes: observer resize refused, revision increments                                                 | Real controller-only resize and revision increment.                                         |
| C-18   | Termination     | D-18             | Yes with injected full store: abort/kill/stop still succeed                                       | Real termination is keyless and never returns `IdempotencyCapacity`.                        |
| C-19   | Consent         | D-07             | Yes: host grant consume/expire/revoke, one code per missing authority, and the both-missing order | Real `daemon.host_grant`, peer binding, TTL, audit, and create refusal codes.               |

Vectors blocked by an earlier decision are now unblocked by this contract:
V-03 by D-01, V-08/V-20 by D-14, V-16/V-17 by D-05, V-18 by D-06, V-10/V-22 by
D-09 (with the 2026-10-27 observer-grant narrowing), and V-25/V-27 by D-15. No
vector remains blocked on an unanswered decision; V-25/V-27 and C-09 through
C-19 remain gated on test infrastructure, not on the contract. C-09 through
C-19 were added by the security review revisions and are part of the frozen
corpus. Privileged-setup vectors (C-12, C-13, C-15, C-16) record the required
setup (second uid or pid namespace, delegated cgroup v2, seccomp-capable plugin
host, per-message credential capture) and skip with a typed reason when it is
absent; a fake server never marks them passed.

## Fake-server-first harness plan

The sequence exists so consumer work is not serialized behind a daemon. It does
not turn fake-server results into daemon evidence.

1. **Frozen corpus (contract promotion, 2026-10-27).** The vector table,
   assertions, injected limits, and typed results are the shared corpus. A test
   driver may not fork expectations; a disagreement is a contract defect.
2. **Fake server (Wheel CTX-0036).** Implement the accepted surface with
   injected monotonic time, injected limits, simulated lifecycle, transport
   fault injection, and a request log for V-32. Label every run
   `candidate-not-bittyd`. The fake server implements the handshake (including
   the single-negotiate state machine), host and observer grants, create
   (including the `session.host` consent and `process.spawn` intersection),
   status, list, attach, detach, resize, keyless abort/kill, heartbeat, stop
   modes, orphan verify,
   events, and the closed refusal set; it may simulate a worker but never claims
   a real process.
3. **Adapter suite (Wheel).** Run every fake-capable vector against the
   transport-injectable adapter. Assert typed results, resulting state, and the
   absence of a partial mutation without a typed result. Parameterize on
   advertised `effective` limits; never sleep on a wall clock; never hardcode a
   host path.
4. **Real service (Core).** Build `bittyd` and a conformance driver that runs
   the same corpus against the real service on Linux x86_64. Record per-vector
   pass/fail with the daemon instance, commit, and cell. A passing fake-server
   run is not evidence for this step.
5. **Platform cells (Core).** Repeat on Windows x86_64 and macOS ARM64 native
   runners before advertising those cells; then the Tier 2 cadence. A typed
   skip is recorded with its reason and is never counted as a pass.
6. **Trust and security vectors (Core + security reviewer).** Run the
   second-uid, endpoint-tamper, per-message credential, no-TCP, audit-mode,
   refusal-flood, plugin-`connect()` denial, child-descriptor, and orphan
   crash-injection tests with the required privileged setup. These have no
   fake-server substitute.
7. **Parity gate (both).** The fake server and the real service must pass the
   same vector ids with the same expected results. A divergence blocks the
   real-service claim until the corpus or the implementation is corrected.

What a fake server cannot validate: peer-credential enforcement, endpoint
tamper, real process termination and reaping, orphan identity checks, daemon
crash and restart, the absence of a TCP listener, platform cells, audit file
modes and rotation, real queue pressure, and real PTY behavior. Those rows are
marked `No` or `Partial` above; a fake run never closes them.

Harness rules:

- Time, monotonic clocks, limits, and fault injection are injected; tests never
  sleep on a wall clock.
- A test that asserts "no crash" without a typed result and a state assertion
  is not a conformance vector.
- Platform-gated vectors skip with an explicit typed reason and are reported;
  silent passes are defects.
- Every run records the service version, contract commit, daemon instance,
  capability set, and limits, so evidence is reproducible.
- No test fixture embeds a developer home path, username, socket path, or port;
  endpoints come from the test environment.

## Implementation breakdown

The v0.2.0 session-host slice is filed as child issues of bitty#2546 in
`bitty` (bitty#2601, bitty#2602, bitty#2603, bitty#2604, bitty#2605, bitty#2606, bitty#2607, bitty#2608, bitty#2609), each
labeled `feat`, `P1`, `area:architecture` and milestoned `v0.2.0`. None of them
is authorized to merge under the third-review verdict APPROVE-WITH-FOLLOWUPS,
provided the slice's gates are met: the idempotency slice waits for `F-9`, the
plugin-adjacent slices wait for `F-12`, and every slice still needs its P0
evidence (bitty#2608).

| Issue      | Slice                           | Scope                                                                                                                                                                                                                                                                                                                                                                                                        | Depends on                                                    |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| bitty#2606 | Crate and binary seam           | New library crate plus a `bittyd` binary; one-way dependency direction from the daemon to `bitty-term-state`, `bitty-pty`, `bitty-plugin-host`, and `bitty-ipc`; no mechanism crate depends on the daemon; handshake skeleton and service version.                                                                                                                                                           | Contract acceptance                                           |
| bitty#2601 | Registry and generations        | Session records, instance/session ids, generation and revision counters, terminal-id uniqueness, retention, bounded registry, two-phase orphan journal with a pre-spawn containment identity, reserved-record reap, quarantine, and the content-plane cap.                                                                                                                                                   | Crate seam                                                    |
| bitty#2607 | IPC service                     | `bitty-ipc` v1 server loop, single-negotiate pre-auth state machine, per-message `SCM_CREDENTIALS` where the cell provides it, peer capture and re-check, endpoint lock and tamper detection, scope evaluation, `daemon.host_grant` and `session.host` consent, the control relation, keyless termination, `process.spawn` intersection, method dispatch, error mapping.                                     | Crate seam                                                    |
| bitty#2609 | Attach, detach, abort           | Leases, observer grants, observer/controller roles, the control relation, control-token rotation and lease binding, controller-only resize, control transfer, revoke paths, keyless abort and kill, whole-tree cleanup, terminal reasons and cleanup classes.                                                                                                                                                | Registry, IPC service                                         |
| bitty#2602 | Event stream                    | Frozen event envelope and correlation, per-lease routing, snapshot plus bounded backlog, revision ordering, control-frame reservation, terminal guarantee, `TerminalEventLost`, heartbeat and last-seen.                                                                                                                                                                                                     | Registry, attach                                              |
| bitty#2603 | Limits and retention            | Compiled system maxima, `{effective, default, system_max}` limits schema, registry/lease/connection caps, event ring, descriptor-only per-session idempotency and pre-session create-key stores, retention TTL, audit sink bounds, refusal budget, fail-closed degradation.                                                                                                                                  | Registry, events                                              |
| bitty#2604 | Platform cells                  | Unix socket and peer credentials on Linux/macOS/FreeBSD; Windows named pipe and SID; single-instance lock; unsupported-cell refusal; native-runner evidence.                                                                                                                                                                                                                                                 | IPC service                                                   |
| bitty#2605 | Conformance harness             | Shared corpus runner (`V-01..V-34`, `C-01..C-19`), fake-server parity driver, real-service driver, injected time/limits, evidence records, CI wiring.                                                                                                                                                                                                                                                        | All implementation slices                                     |
| bitty#2608 | Security review and P0 evidence | Threat-model and risk-register update, B-1..B-13 and F-1..F-8/F-11 evidence, P0-AC-021..026 evidence, secret minimization, child `/proc/self/fd` and `close_range` proof, audit content and diagnostic proof, operator-capability review, and the D-01 worker-enablement recommendation. The third independent design review of this contract precedes implementation; P0 evidence precedes the first merge. | Contract acceptance (design review); all slices (P0 evidence) |

The bitty-ai/Wheel adapter dependency is explicit:

- Wheel CTX-0036 owns the transport adapter and the fake server. It starts
  against the accepted surface, with `worker_sessions=false`, and can proceed
  in parallel with Core implementation.
- Wheel must not implement a daemon, registry, attach protocol, or worker
  supervisor. `wheel-session` stays a prototype and is not the contract.
- Wheel's hosted worker path stays disabled until the `worker_sessions`
  capability is advertised after the D-01 gate; the adapter must return a typed
  unavailable/unsupported result instead of falling back to an in-process run.
- The Core conformance corpus is the only definition of expected behavior. Wheel
  and Core may not maintain divergent expectations.

## Security review

This contract decides a trust-bearing local service surface. It weakens no
accepted control, and it does not claim any control is implemented. The review
must confirm each item below before implementation starts, and record evidence
for the evidenced items before the first implementation merge.

| Control                                  | How this contract preserves it                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-AC-021 endpoint and peer credentials  | Filesystem socket in an owner-private `0700` directory, socket `0600`, peer credentials checked before parsing, per-message credentials on Linux, re-checked before privileged actions, tamper detection exits 6, no TCP. Windows uses a current-user DACL, pid plus SID, remote rejection.                                       |
| P0-AC-022 per-action scopes              | A new deny-by-default `session.*` and `daemon.*` family, evaluated server-side on every request; `session.host` is never baseline; create intersects `session.host` consent with `process.spawn`; observers need a single-use grant; no ambient grant from a connection or handle; `terminal.*` is not stretched.                 |
| P0-AC-023 child process scope limitation | The child receives an explicit bounded environment and never the daemon's environment, service token, socket path, operation capability, or secrets. Every daemon descriptor is `CLOEXEC` and `close_range(..., CLOEXEC)` runs before `exec`, so only the PTY slave on stdio survives. The control token never enters a child.    |
| P0-AC-024 Agent read-only default        | Status, attach, and event snapshots are metadata only; content needs a live lease plus `terminal.inspect`; worker hosting is disabled; an Agent consumer gets no content authority from a session lease, no `session.host` in its baseline, and cannot create a session without explicit per-client consent plus `process.spawn`. |
| P0-AC-025 DevTools scopes                | Unchanged; the session family does not grant debug, trace, or control scopes.                                                                                                                                                                                                                                                     |
| P0-AC-026 secret minimization            | Audit and diagnostics are content-free; no argv, env, PTY bytes, clipboard, prompt, provider payload, token, or capability value; raw correlation values are hashed; owner-private modes; no core dumps; redacted `Debug`; no service audit read.                                                                                 |
| Bounded persistence                      | The registry is in memory; audit, create keys, and the two-phase orphan journal are bounded and owner-private; sessions never survive a restart; retention is bounded.                                                                                                                                                            |
| Single writer                            | `bittyd` alone writes registry, lifecycle, counters, leases, attach count, and last-seen; consumers alone write their own state; clients mutate only through generation-checked methods.                                                                                                                                          |
| Containment                              | A refusal, limit violation, or one session's fault leaves no partial mutation without a typed result and does not take the daemon down; audit failure fails closed for mutations.                                                                                                                                                 |
| Daemon absence                           | `bitty --safe`, headless tests, and plain invocation work without `bittyd`; the daemon is never a startup, diagnostics, or safe-mode dependency.                                                                                                                                                                                  |

New mechanisms that the review must scrutinize:

1. The **control token** is a new session-scoped bearer secret. It is not a
   daemon-wide or user-wide credential, is never logged or inherited, is stored
   as a digest, and rotates on every claim and transfer so the token is bound to
   the current controller lease. The review must confirm that a same-user
   process cannot use it to cross a session boundary, that an old token is
   refused after rotation, and that losing it degrades to observation, not to a
   privileged reset path.
2. The **operator capability** is a per-boot owner-private file. It is an
   explicit-intent gate, not a privilege boundary, because any same-user process
   can read a `0600` file, including a consumer adapter. The review must confirm
   that this is stated honestly, that the capability cannot be hidden from a
   same-uid adapter, and that it is absent from environments, children, logs,
   diagnostics, and consumer grant surfaces.
3. **Explicit child environments** change the spawn path from inheritance to
   construction. The review must confirm that no daemon secret can leak through
   defaults, that argv and env are never recorded, that descriptor hygiene is
   proved by a child `/proc/self/fd` scan, and that terminal behavior remains
   correct when the client supplies its environment.
4. **Two-phase orphan reaping** signals processes after a crash. The
   reserve/commit fsync rule, quarantine for unverifiable records, the
   containment identity (cgroup v2 or pidfd-tracked subreaper), and the
   never-signal-unverified rule must be reviewed against pid reuse,
   process-group reuse, and crash injection between the two phases.
5. **Observer grants** are a new single-use bearer ticket. The review must
   confirm that observation cannot be self-granted, that a consumed or expired
   grant is refused, and that revocation and audit attribution are complete.
6. The **pre-session create-key store** holds token-equivalent secrets before a
   session exists. The review must confirm the `(uid, key)` index, the
   method/target/fingerprint conflict rule, the retirement rule that cannot
   permit a duplicate effect, and the restart residual.
7. **Worker enablement** remains disabled. The review must not treat the
   contract's worker vocabulary as authorization; enabling it needs the ADR
   amendment and the dedicated review named in D-01.

### Trust boundary and residual risk

`bittyd` is same-user infrastructure, not a privilege boundary. The security
review must record the following residuals in the threat model instead of
claiming they are closed:

- **Same-uid impostor.** Every process running as the owner can connect to the
  endpoint, read the operator capability, and present itself as a client. The
  client's endpoint owner/mode check detects an endpoint owned by another
  principal but cannot authenticate the server to the client; a same-uid
  impostor can bind the path first. `server_identity` is observational, not
  proof. The test records the residual.
- **Live descriptor passing.** On cells with connection-scoped credentials
  (macOS, BSD), a connected descriptor passed to another process is accepted as
  the original peer between accepts and the next re-check. Linux closes this
  with per-message `SCM_CREDENTIALS`; the other cells must state and test the
  residual rather than inherit a Linux-only claim.
- **Plugin and native sidecar.** An L1 Rust extension runs in the terminal-core
  process with the owner's authority and can call a daemon client API directly,
  bypassing IPC scopes. The plugin host must deny `connect()` to the daemon
  endpoint (no socket creation or `connect` syscall, enforced by a seccomp
  filter or an equivalent socket-denial policy) and carry a negative test that
  proves the syscall fails. Until that rule exists, "extensions never talk to
  `bittyd`" is a policy statement, not an enforced boundary, and this contract
  does not claim it as one.
- **Spawned worker.** A worker runs as the same uid and can open its own
  connection to the endpoint. Without the operator capability it receives only
  the baseline scopes, has no visibility, no observer grant, and no
  `session.host` consent, so it cannot enumerate or attach to another session;
  with the capability file it can become an operator, which is the same-uid
  residual above. It can consume daemon resources within the advertised limits,
  which is a resource residual, not a child-scope grant.
- **Operator and adapter.** A consumer adapter running as the owner can read the
  operator capability. The `daemon.*` separation is a consent and attribution
  boundary, never an isolation boundary against the owner's adapter.
- **Debugger and memory.** A same-user debugger, `ptrace` where permitted,
  `/proc/<pid>/mem`, or a crash dump of a client can read the control token
  from client memory. Audit is not tamper-evident against the owner either: an
  owner-private file can be read, edited, truncated, or deleted by the owner.

No accepted P0 criterion is downgraded to a suggestion. Where a mechanism is
new, it is additive and deny-by-default; where a control cannot yet be
evidenced (no daemon exists), the gap is recorded rather than claimed.

## Security review revision (2026-10-27)

The first independent security review returned `NEEDS-FIX` on 2026-10-27 with
findings `B-1` through `B-13`. This section records each disposition and where
the contract now applies it. Where the review offered a choice, the revision
took the least-privilege option: no baseline create authority, no self-granted
observation, controller-only resize, token rotation, a two-phase journal, and a
plugin-host socket denial requirement instead of a policy claim.

| ID   | Finding                                                                                                                                                                                                                                                                          | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Applied in                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| B-1  | `session.host` sat in the baseline grant, so any client could create sessions without consent.                                                                                                                                                                                   | `session.host` removed from the baseline and made an explicit per-client consent grant; `session.create` also requires `process.spawn` (executable allowlist), and neither scope implies the other. Added the scope×method rule that an inspect-only client cannot create.                                                                                                                                                                                                                                                                                                                                             | D-07 scope table and rules; create surface; error taxonomy; P0-AC-024 row; C-09.                |
| B-2  | An observer lease could be self-granted by any client with `session.attach`, so observers were effectively controller-capable.                                                                                                                                                   | Added a single-use, TTL-bound, attributed, revocable observer attach grant minted by the controller or the operator; observation is never self-granted. Added mint/consume/expiry/revoke revision and audit rules.                                                                                                                                                                                                                                                                                                                                                                                                     | D-09; attach surface; `session.grant`/`session.grant.revoke`; V-22; C-10; requirements pointer. |
| B-3  | The control token did not rotate, was not bound to the controller lease, and had undefined revoke, "keep", and debugger semantics.                                                                                                                                               | Rotate the token on every claim and transfer and bind it to the controller lease; define operator and controller revocation; define the token as required at claim time only; state the same-uid debugger residual; add old-token-refused, new-token-works, and terminal-`NotRunning` tests.                                                                                                                                                                                                                                                                                                                           | D-07 token rules; D-09; transfer surface; C-11.                                                 |
| B-4  | Content read did not require a live lease plus `terminal.inspect`, write did not require the controller lease, and resize was unowned.                                                                                                                                           | Content read requires a live lease and `terminal.inspect`; input requires the controller lease and `terminal.input`; resize requires the controller lease and `terminal.manage`, is controller-only, and increments the revision; status, attach, and event snapshots are metadata only.                                                                                                                                                                                                                                                                                                                               | D-03; D-07; D-09; status/attach surfaces; state transitions; C-17.                              |
| B-5  | `session.create` had no pre-session key store, so a retried create could spawn twice; count/byte numbers were not feasible and restart was undefined.                                                                                                                            | Added the `(uid or SID, key)` create-key store with method/target/fingerprint conflict, feasible 128-key/32 KiB bounds, token-equivalent secrecy, defined restart behavior, attach and revoke keys, and a retirement rule that cannot permit a duplicate effect.                                                                                                                                                                                                                                                                                                                                                       | D-18; limits table; create surface; C-09.                                                       |
| B-6  | A single-phase orphan record cannot survive a crash between spawn and commit, unverifiable records had no disposition, and `swept` did not mean the whole tree.                                                                                                                  | Two-phase journal (reserve+fsync, spawn, commit pid/start/pgid+fsync), quarantine and retention for unverifiable records, operator `daemon.orphans.verify`, containment identity (cgroup v2 or pidfd-tracked subreaper), and crash-injection tests. `swept` now requires the whole identity to verify empty.                                                                                                                                                                                                                                                                                                           | D-06; D-04 cleanup; daemon surface; state transitions; C-03; C-13.                              |
| B-7  | Audit carried a raw `client_instance`, a caller-supplied stop label, unbounded strings, no target fields, no flood budget, undefined rotation/loss, weak diagnostics rules, and implied tamper evidence.                                                                         | Removed the stop label; replaced raw `client_instance` with `client_correlation_digest`; required UTF-8/no-control/bounded audit strings; added target fields for transfer/revoke/detach; added a refusal budget with aggregation; defined rotation and bounded loss; required redacted `Debug`, no core dumps, and a content-free diagnostics rule; stated audit is not tamper-evident against the owner.                                                                                                                                                                                                             | D-08; D-16; handshake; stop/detach/transfer surfaces; limits; C-14.                             |
| B-8  | The trust boundary lacked same-uid, fd-passing, plugin, and adapter residuals; the client-verifies-server claim was overstated; credentials were connection-scoped only; the plugin host did not deny `connect()`.                                                               | Added the trust-boundary and residual-risk subsection: same-uid impostor, live descriptor passing, plugin/native sidecar, spawned worker, adapter, and debugger. Qualified the client check as tamper detection, not server authentication. Required per-message `SCM_CREDENTIALS` on Linux and a stated, tested residual elsewhere. Required the plugin host to deny `connect()` with a negative test, or the claim stays policy-only. Stated the operator capability cannot be hidden from a same-uid adapter.                                                                                                       | Security review section; stale-handle/peer-check surface; C-15; C-16.                           |
| B-9  | `D-14` and the limits section disagreed; lease, connection, and create stores were unbounded; the aggregate was stale; the limits schema was undefined; ids were unbounded.                                                                                                      | Made the Resource limits section normative for enforcement and `D-14` its summary; added `max_lease_queue_bytes/events`, `max_connection_pending_bytes`, `max_connection_outbound_bytes`, create-store, grant, pre-auth, and retention limits; defined the `{effective, default, system_max}` schema; bounded `terminal_id` and `attach_id`; removed the stop label; made the whole-spawn-spec cap dominate; recomputed the metadata aggregate (72,057,856 bytes, 76,514,304 including audit and journal) and added the separate 256 MiB-per-session content cap (17,256,383,488 bytes combined at the system maxima). | D-02; D-14; create/attach/stop surfaces; handshake; C-05.                                       |
| B-10 | Signal drain forced the remainder with `daemon_stop`; exit 6 left sessions undefined; "no partial state" was false for timeouts; the generation-0 bind race was undefined; `daemon.orphans.verify` was claimed but absent; force-during-drain and exit codes 1/2 were undefined. | Signal-initiated forced remainder is `host_shutdown`; exit 6 ends without terminal transitions and leaves reserved/committed journal records; replaced "no partial state" with "no partial mutation without a typed result; a timed-out mutation may have applied and is reconciled via status/idempotency"; defined the generation-0 cancel-intent race; added `daemon.orphans.verify`; defined force-during-drain escalation; defined exit codes 1 and 2.                                                                                                                                                            | D-05; D-13; abort surface; daemon surface; state transitions; C-05.                             |
| B-11 | Wire and service versions were conflated; accept/refuse order and the pre-auth state machine were undefined; the event envelope, correlation, and per-lease routing were unfrozen; `terminal_id` was unbounded.                                                                  | Stated the two version axes and the fixed accept/refuse order; added the one-negotiate, no-pipelining pre-auth state machine with a bounded budget; froze the event envelope, server-generated correlation, and per-lease routing; bounded `terminal_id` and `attach_id`.                                                                                                                                                                                                                                                                                                                                              | D-02; D-10; D-11; handshake; events; V-01/V-02; limits.                                         |
| B-12 | Child descriptor inheritance and token-bearing diagnostics were not required.                                                                                                                                                                                                    | Required `CLOEXEC` on every daemon descriptor and `close_range(..., CLOEXEC)` before `exec`, leaving only the PTY slave and stdio; added the child `/proc/self/fd` test; required redacted `Debug` and no core dumps for token-bearing structures.                                                                                                                                                                                                                                                                                                                                                                     | Create surface; P0-AC-023 row; D-16 diagnostics; C-12; C-14.                                    |
| B-13 | ADR 0008's reattach sketch conflicted with the no-rebind contract; the multiplexer's "Core owns attach count" conflicted with `bittyd` as sole writer; the contract lacked the resize rule; checkout path references were stale.                                                 | Recorded the dated narrowing of ADR 0008's reattach sketch (no new PTY/Terminal pair for a session id; `Attached <-> Detached` is not a lifecycle state; a retry is a new session); clarified that Core owns only its cached view while `bittyd` is the sole writer of session, lease, and attach-count truth; restated the controller-only resize rule; audited the four affected documents for host or local-checkout paths (none remain) and replaced bare repository names with canonical URLs plus repository-relative source paths.                                                                              | Affected contracts; D-02; D-09; multiplexer decision; references.                               |

Revision-level rules that follow from the table:

- No disposition weakens an accepted control. Every new mechanism is additive,
  deny-by-default, bounded, and attributed.
- The revision is a text change only. No daemon, crate, transport, registry, or
  fake server is implemented or claimed by it.
- The revision does **not** record an approval. It was submitted for the second
  independent security review; after that review also returned `NEEDS-FIX`, the
  third independent review returned APPROVE-WITH-FOLLOWUPS on 2026-10-27 with
  `F-9`/`F-12` as slice gates. A reviewer may reopen
  any `B-*` row; a reopened row is a new tracked defect, never a silent
  edit.

## Second security review revision (2026-10-27)

The second independent review returned `NEEDS-FIX` on 2026-10-27. It closed
`B-4`, `B-12`, and `B-13`; `B-1`, `B-2`, `B-3`, `B-5`, `B-6`, `B-7`, `B-8`,
`B-9`, `B-10`, and `B-11` remained partial, and the fresh pass added `F-1`
through `F-16`. This revision applies the blocking `F-1` through `F-8` and
`F-11`, records the remaining findings in
[Follow-ups (review 2)](#follow-ups-review-2), and claims no approval.

| ID   | Finding                                                                                                                                                      | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                    | Applied in                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| F-1  | A full idempotency store could refuse `session.abort`, `session.kill`, or `daemon.stop`, turning a dedupe bound into a termination denial.                   | Termination methods are keyless and never consult either store; they are idempotent by session/generation or daemon instance/mode. The key store can refuse only keyed methods, and C-18 asserts termination under a full store.                                                                                                                                                                                               | D-18; abort/kill; `daemon.stop`; error taxonomy; state transitions; C-18.           |
| F-2  | Method authorization contradicted D-07/D-09: grant, grant revoke, abort, and transfer accepted scope alone or an optional token, and an observer could pass. | A single control-relation rule now applies: current controller lease, or current token at a vacant control relation; `session.control` is necessary and never sufficient; an observer is always `Denied/ControllerRequired`. Added `Denied/InvalidControlToken` for stale/rotated/missing tokens and applied it at grant, revoke, abort, transfer, detach-other, and attach.                                                   | D-07; D-09; grant/revoke; abort; transfer; detach-other; attach; error taxonomy.    |
| F-3  | A reserved record had no pid, so it could not be reaped, and D-18 called the old worker an "orphan candidate" without a fence.                               | The containment identity is created before reserve and recorded in the reserved record; startup reaps a boot-id-matched reserved record through its cgroup subtree/subreaper set. The subreaper fallback states the double-run residual and requires adapters never to retry an unfenced create. D-18's orphan-candidate claim is corrected.                                                                                   | D-06; D-18; D-05 exit 6; state transitions; C-13.                                   |
| F-4  | The aggregate omitted retained-session event rings/idempotency stores and the content plane.                                                                 | Event rings and per-session idempotency stores are released at the terminal transition; retained records are metadata only. Added the separate `max_content_bytes_per_session` cap (256 MiB, 16 GiB worst case at system maxima) sourced from ADR 0008's per-terminal scrollback and image-store caps and bounded by the accepted `IMG-4` per-window aggregate, and renamed the 76.5 MB figure to session-host metadata state. | D-14; D-18; limits table; aggregate; B-9 disposition.                               |
| F-5  | The idempotency byte bounds were infeasible at 1024 keys × 64 KiB and stored snapshots.                                                                      | Stored results are bounded descriptors; snapshots are recomputed on replay. Session store is 512 × 128 B = 65,536 B; create store is 128 × 256 B = 32,768 B. The create entry stores `terminal_id_digest` once and the token as 32 bytes; the descriptor carries an 8-byte result reference to the lease or grant it created. The arithmetic is in D-18.                                                                       | D-18; limits table.                                                                 |
| F-6  | Raw `terminal_id` was an audit content channel; grants had no non-secret target.                                                                             | `terminal_id` is restricted to a safe opaque alphabet and audit stores only `terminal_id_digest`; raw values stay in memory. Added the non-secret `grant_id` (32 hex) as the audit and revoke target for host and observer grants.                                                                                                                                                                                             | D-02; D-16; grant/revoke; `daemon.host_grant`; limits.                              |
| F-7  | `session.host` consent had no channel, and `ConsentRequired`/`ScopeViolation` were ambiguous.                                                                | Added operator-only `daemon.host_grant`: single-use, peer-bound, TTL-bounded, revocable, audited, consumed at negotiate. One static code per missing authority: `ConsentRequired` for host consent, `ScopeViolation` for `process.spawn`. Stated the same-uid intent-gate residual.                                                                                                                                            | D-07; handshake; `daemon.host_grant`; create surface; error taxonomy; limits; C-19. |
| F-8  | `swept` could be false, and a normal worker exit did not reap the tree.                                                                                      | `swept` requires the whole cgroup subtree or subreaper descendant set empty. Every terminal transition, including `worker_exit`, terminates the identity (graceful then kill) and verifies it empty before cleanup classification; survivors become journal records and force `unverified`.                                                                                                                                    | D-04; D-06; kill; state transitions; C-13.                                          |
| F-11 | The promotion record's review scope listed five mechanisms, not seven.                                                                                       | The promotion record now lists the control token, operator capability, explicit child environments, two-phase orphan reaping, observer grants, the pre-session create-key store, and the worker-disabled state, and carries a third-review checklist.                                                                                                                                                                          | Promotion record review-wide obligations and sign-off section.                      |

The first-review `B-*` rows stay as recorded; this revision closes the remaining
partial rows through the `F-*` dispositions rather than rewriting history.

## Follow-ups (review 2)

The second review's non-blocking findings are tracked here. `F-10` and `F-13`
are fixed in this revision; the rest are tracked as follow-ups with a named
owner gate and no silent fix. The finding text for `F-9`, `F-12`, and
`F-14`–`F-16` is recorded in the second-review record (bitty#2608); this table
records disposition only.

| ID   | Disposition                                                                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-9  | Tracked follow-up; the third-review result-reference clarification in D-18 does not close the dedupe-key finding. Must close before the first implementation merge or become an accepted residual. |
| F-10 | Fixed: the lost-token sentence now distinguishes pre-claim recovery through an idempotent duplicate create from irreversible loss after rotation.                                                  |
| F-12 | Tracked follow-up; owner to triage before the first implementation merge. No contract change claimed.                                                                                              |
| F-13 | Fixed: privileged vector setup wording now names the required second-uid/pid-namespace, cgroup, seccomp, and per-message-credential setup, and requires a typed skip when absent.                  |
| F-14 | Tracked follow-up; no contract change in this revision.                                                                                                                                            |
| F-15 | Tracked follow-up; no contract change in this revision.                                                                                                                                            |
| F-16 | Tracked follow-up; no contract change in this revision.                                                                                                                                            |

## Verification plan

At promotion (2026-10-27):

1. Owner sign-off on D-01, D-05, D-07, D-14, and D-15 is recorded in the
   [promotion record](bittyd-session-host-promotion-record.md).
2. Every `D-01` through `D-18` answer was cross-checked against its cited
   source; no answer weakens an accepted control.
3. The pinned docs gates are green: Prettier 3.9.6, markdownlint-cli2 0.23.1,
   `check-docs` (links, metadata, language, agents, hygiene), and actionlint
   1.7.12, run directly because Bun segfaults on the revision host; `just check`
   itself is not recorded.
4. No external provenance references and English-only content.
5. The first review returned `NEEDS-FIX` on 2026-10-27 and its revision is in
   [Security review revision (2026-10-27)](#security-review-revision-2026-10-27);
   the second review returned `NEEDS-FIX` on 2026-10-27 and its revision is in
   [Second security review revision (2026-10-27)](#second-security-review-revision-2026-10-27).
   The third independent review is **recorded** (APPROVE-WITH-FOLLOWUPS,
   2026-10-27); `F-9` and `F-12` gate their slices, and its scope is fixed in the
   [promotion record](bittyd-session-host-promotion-record.md#independent-security-review-requirements).

Before the first implementation merge:

1. The implementation issues reference this contract and the accepted
   promotion record; no implementation slice merges before its gates are met —
   the third review verdict (APPROVE-WITH-FOLLOWUPS with `F-9`/`F-12`) and the
   slice's P0 evidence.
2. The fake-server suite passes every fake-capable vector and is labeled
   candidate-only.
3. The real-service suite passes `C-01` through `C-19` and the real-required
   vectors on Linux x86_64.
4. The third review records P0 evidence for P0-AC-021 through P0-AC-026, the
   `B-1` through `B-13` and `F-1` through `F-8`/`F-11` dispositions, and the
   single-instance, tamper,
   child-descriptor, audit, plugin-`connect()` denial, per-message credential,
   and daemon-absence proofs.
5. A second cell is advertised only after its native-runner run is recorded.

Definition of done for this contract task: decisions recorded, service surface
stated, conformance matrix complete, harness plan written, implementation issues
filed, the pinned docs gates green, and the promotion record merged. Promotion accepts
the decisions; it does not authorize implementation. The third independent
security review named in the promotion record remains the first implementation
gate.

## Alternatives considered

| Alternative                                         | Trade-off                                                                                                                                                                  | Disposition                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Host agent workers in v0.2.0                        | Would let Wheel's hosted path land sooner; adds generic process supervision and credential-inheritance risk to a daemon that holds secrets, without an ADR 0019 amendment. | Rejected for v0.2.0; the kind is defined and capability-gated, with a named enablement gate.          |
| Reuse `terminal.*` scopes for session control       | No new scope vocabulary; would silently grant terminal authority to an Agent client and collapse consent domains.                                                          | Rejected; the session family is separate and `terminal.*` stays authoritative for content.            |
| One counter instead of generation and revision      | Simpler; cannot fence "wrong worker" and "stale snapshot" independently.                                                                                                   | Rejected.                                                                                             |
| Controller identity as `client_id`                  | No token to manage; dies on reconnect and makes ownership unstable.                                                                                                        | Rejected; the control token survives reconnect and is session-scoped.                                 |
| Abort on silence                                    | Cleans up idle work automatically; destroys a long run because a client paused.                                                                                            | Rejected; staleness detaches only.                                                                    |
| Persistent sessions across daemon restart           | Survives crashes; conflicts with the explicit v0.2.0 exclusion and the bounded-persistence rules.                                                                          | Rejected for v0.2.0.                                                                                  |
| Force stop by default                               | Simple operator UX; silently destroys another client's work.                                                                                                               | Rejected; refuse by default, explicit drain and force.                                                |
| Adopt orphans after a crash                         | Preserves work; creates duplicate-side-effect and ambiguous-ownership risk with no persistence contract.                                                                   | Rejected; exact-identity reap only, never adoption.                                                   |
| One controller or no observer multi-attach          | Simplest authority; loses the operator/observer and second-viewer use cases.                                                                                               | Rejected; one controller plus bounded observers with explicit transfer.                               |
| Poll-only event delivery                            | Simplest; makes terminal-event loss silent and pushes latency to the consumer.                                                                                             | Rejected; ordered stream plus authoritative status.                                                   |
| Per-feature capability bits without a version       | Small; makes incompatible changes indistinguishable from additive ones.                                                                                                    | Rejected; version plus explicit capabilities.                                                         |
| Unbounded event replay on reattach                  | Complete history; violates bounded persistence and memory ceilings.                                                                                                        | Rejected; bounded backlog with an explicit truncation marker.                                         |
| A single daemon-wide admin token                    | Simple operations; a durable user-wide credential with a larger blast radius than the per-session token.                                                                   | Rejected; per-session control token plus per-boot operator capability.                                |
| A one-time peer check at connect only               | Fewer syscalls; fails open on inherited descriptors and pid reuse.                                                                                                         | Rejected; privileged actions re-check the captured peer.                                              |
| `session.host` in the baseline grant                | Every consumer could create sessions without a consent step; drops the P0-AC-024 per-client consent requirement.                                                           | Rejected by the 2026-10-27 review; `session.host` is explicit consent and intersects `process.spawn`. |
| Self-granted observer attach                        | Any client with `session.attach` could observe another session's metadata; no consent from the controller or operator.                                                     | Rejected; a single-use, TTL-bound, revocable observer grant is required.                              |
| A static control token for the session lifetime     | Simpler claim path; a leaked token is valid forever and a transfer does not revoke the previous controller.                                                                | Rejected; the token rotates on every claim and transfer and is bound to the controller lease.         |
| Process-group-only containment                      | No cgroup or subreaper setup; a descendant that calls `setsid`/`setpgid` escapes and `swept` becomes a false claim.                                                        | Rejected; cgroup v2 or a pidfd-tracked subreaper defines the identity.                                |
| Per-session-only idempotency store                  | Simpler table; `session.create` has no session yet, so a retried create can spawn twice.                                                                                   | Rejected; a separate pre-session create-key store is required.                                        |
| Client authenticates the server by filesystem check | No extra protocol; a same-uid impostor can bind the path first.                                                                                                            | Rejected; the check is tamper detection only, and the residual is stated and tested.                  |

## Affected contracts

| Contract                                                                                                                             | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Authoritative; narrowed by dated note. This document supplies the session-host mechanics under its definitions, ownership, persistence, and trust gates. The 2026-10-27 narrowing: ADR 0008's reattach sketch is not adopted. A session id never receives a new PTY/Terminal pair after the worker exits; the session is terminal and an `NotRunning` reattach is refused. `Attached <-> Detached` is not a lifecycle state; `attached` is a derived flag. A retry is a new session with a new id and token.                                                                                                                                                                   |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | Unchanged. D-01 does not expand the slice; worker enablement requires an amendment. `D3` keeps ADR 0008's per-terminal scrollback and image-store caps; this contract supplies `max_content_bytes_per_session` (256 MiB per session, 16 GiB worst case at the system maxima), and the accepted `IMG-4` per-window aggregate image budget is unchanged.                                                                                                                                                                                                                                                                                                                         |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Unchanged; D-15 applies its tiers to the daemon cells.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `bitty-ipc` v1 (accepted)                                                                                                            | Consumed unchanged for framing, wire version, scopes, peer credentials, error classes, and RC-9/RC-10. Existing guarantees verified in the source: `SO_PEERCRED`/`LOCAL_PEERCRED` at accept (`crates/bitty-ipc-auth/src/auth.rs`), server-side per-request scope evaluation with `process.spawn` separate (`crates/bitty-ipc-api/src/scope.rs`), wire envelope and `<=64`-byte correlation (`crates/bitty-ipc-api/src/wire.rs`), RC-9/RC-10 bounds (`crates/bitty-ipc-core/src/limits.rs`). The additive `session.*`/`daemon.*` family needs one registry revision, and the service binding adds per-message `SCM_CREDENTIALS` on Linux; neither changes an existing v1 scope. |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | Unchanged; the service uses its transport and method grammar and adds no content plane.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Security corpus (normative)                                                                                                          | Requires a threat-model, risk-register, and P0-evidence update before implementation; this document adds no control weakening.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (candidate)                                             | Its D items are answered here; its vectors feed the conformance matrix. It remains a consumer input, not an authority.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [Specifications register](README.md)                                                                                                 | Already carries the Accepted row for this contract and the promotion record; no new row is added by the revision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [Multiplexer Decision](multiplexer-decision.md) (accepted)                                                                           | Clarified by the 2026-10-27 revision: Core owns its cached read-only descriptor view only; `bittyd` is the sole writer of session, lease, and attach-count truth. Restated: only the controller may resize, and resize increments the revision.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`bitty-plugin-host`](https://github.com/bitty-terminal/bitty) plugin host                                                           | New requirement for the review: the plugin host must deny `connect()` to the `bittyd` endpoint (seccomp or equivalent) and carry a negative test; until then "extensions never talk to `bittyd`" is policy, not an enforced boundary.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| bitty#2546, #2064, #2218                                                                                                             | Contract decided; implementation issues are filed as children of #2546.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [`bitty-execution`](https://github.com/bitty-terminal/bitty-execution) execution-supervisor contract                                 | No change. Worker hosting, if enabled later, must define its relationship to the existing execution-supervisor boundary rather than duplicate it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Dated narrowing of ADR 0008's reattach sketch (2026-10-27)

ADR 0008 records a candidate reattach sketch "without freezing fields" and
expects a future RFC to make it normative. This contract is that normative text
for the v0.2.0 slice, and it narrows the sketch on three points. The narrowing is
dated, additive, and does not alter ADR 0008's definitions, ownership rules,
bounded-persistence requirements, or trust gates:

1. ADR 0008's "reattach after process exit creates a new PTY/Terminal pair for
   that session id" is **not adopted**. A session id never receives a second
   worker. Once the worker exits the session is terminal, and reattach or
   control claim answers `NotRunning`; a retry is a new session with a new id
   and a new control token (`D-17`).
2. ADR 0008's `Attached <-> Detached` is **not** a lifecycle state here.
   `attached` is a derived boolean over live leases; attach and detach increment
   `state_revision` but never change the lifecycle state or the generation.
3. ADR 0008's "simultaneous-multi-viewer model with its own input-ownership
   rule" is accepted as one controller plus bounded observers, with an explicit
   single-use observer grant, explicit attributed transfer, and controller-only
   resize (`D-09`). Control never transfers implicitly.

A future ADR may reopen any of the three points; until then this section is the
dated record that the contract narrows the sketch rather than silently
contradicting it.

## Open points

These are not globally numbered open questions. They stay here until one blocks
a current-milestone gate; the decisions above do not depend on them.

- Owner sign-off is recorded (2026-10-27). The first and second independent
  security reviews returned `NEEDS-FIX` on 2026-10-27; the third returned
  APPROVE-WITH-FOLLOWUPS with `F-9`/`F-12` as slice gates, not a reopening of
  the accepted decision text. See the
  [promotion record](bittyd-session-host-promotion-record.md) and
  [Second security review revision (2026-10-27)](#second-security-review-revision-2026-10-27).
- D-01 worker enablement: the ADR 0019 amendment and the spawn/credential
  security review. Tracked by the security review issue.
- Operator-capability mechanism: file versus a distinct operator endpoint. The
  requirement (explicit operator grant) is decided; the mechanism is a security
  review choice, and no mechanism hides it from a same-uid adapter.
- Whether the session scope family is registered in `bitty-ipc` or in a
  bittyd-owned service-scope registry. It must be one additive registry, and no
  existing `bitty-ipc` scope may change meaning.
- Exact JSON key spellings and frame layout, frozen by the first implementation
  and the conformance corpus.
- The exact per-cell syscalls for containment identity (cgroup v2 delegation
  fallback and subreaper adoption) and the per-cell per-message credential
  equivalent; the Linux x86_64 rule is fixed, the other cells are review input.
- Windows integrity-level and AppContainer rule details beyond "fail closed".
- Audit sink implementation detail (file versus an equivalent owner-private
  sink) beyond the stated properties.
- Platform advertisement order after Linux x86_64, driven by native-runner
  evidence.
- The third security review may reopen any `B-1` through `B-13` or `F-*` row; a
  reopened row becomes a tracked defect, never a silent contract edit.

## Acceptance criteria

This contract is complete when:

1. D-01 through D-18 are decided, internally consistent, and traceable to an
   accepted source where they restate one.
2. The service surface covers handshake, create, status, list, observer grants,
   attach, detach, resize, abort, kill, stop/drain/force, orphan verify, events,
   heartbeat, stale-handle refusal, peer re-check, and the error taxonomy.
3. The conformance matrix maps every `V-01` through `V-34` vector and every
   `C-01` through `C-19` vector to decisions and states what a fake server can
   and cannot validate.
4. The fake-server-first harness plan names the corpus owner, the two drivers,
   the parity gate, and the real-service-only evidence.
5. The implementation breakdown is filed as child issues of bitty#2546 with the
   required labels and milestone and names the bitty-ai/Wheel adapter
   dependency.
6. No normative security control is weakened; new mechanisms are additive,
   deny-by-default, and flagged for review.
7. No daemon, crate, binary, fake server, or wire format is implemented or
   claimed as implemented by this task.
8. The document is English-only, self-contained, and free of external
   provenance references.
9. The 2026-10-27 first and second review revisions record a disposition for
   every `B-1` through `B-13` and `F-1` through `F-8`/`F-11` finding; the third
   review records APPROVE-WITH-FOLLOWUPS with `F-9`/`F-12` as slice gates.

## P0 Review Sign-off

Accepted on the owner sign-off recorded below. The first and second independent
security reviews returned `NEEDS-FIX`; the third review of the second revision
returned APPROVE-WITH-FOLLOWUPS on 2026-10-27. This document claims no approval
that is not listed here.

| Reviewer                           | Required for                                                                                                   | Status 2026-10-27                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Project initiator (owner)          | D-01, D-05, D-07, D-14, D-15 and final promotion                                                               | APPROVED 2026-10-27 for decisions and contract text                      |
| First independent security review  | Trust boundary, IPC framing, capability and authentication, resource bounds, audit, failure modes (bitty#2608) | NEEDS-FIX 2026-10-27; `B-1` through `B-13` dispositions recorded below   |
| Second independent security review | The first revision, the `B-1` through `B-13` dispositions, and the residual-risk section                       | NEEDS-FIX 2026-10-27; `F-1` through `F-8`/`F-11` found and dispositioned |
| Second revision                    | The `F-*` dispositions, the follow-up table, and the third-review checklist                                    | SUBMITTED 2026-10-27; no approval claimed                                |
| Third independent security review  | The second revision and every `B-*`/`F-*` disposition                                                          | APPROVE-WITH-FOLLOWUPS 2026-10-27; `F-9` and `F-12` remain slice gates   |
| Core architecture reviewer         | Crate seam, single-writer rule, registry and counter semantics                                                 | Not recorded as a separate sign-off                                      |
| Wheel consumer reviewer            | Adapter boundary and vector mapping                                                                            | Not recorded; Wheel stays a candidate consumer input                     |
| bitty-ai consumer reviewer         | Hosted-worker boundary and `worker_sessions=false`                                                             | Not recorded; worker hosting stays disabled                              |

The third security reviewer recorded APPROVE-WITH-FOLLOWUPS on 2026-10-27
(bitty#2742). `F-9` (idempotency dedupe keys) gates the idempotency slice and
`F-12` (peer re-check and plugin seccomp evidence) gates the plugin-adjacent
slices; no other `B-*` or `F-*` row remains open. A reopened `B-*` or `F-*` row is a
tracked defect, not a silent edit. The review scope and the evidence each area requires
are fixed in the
[promotion record](bittyd-session-host-promotion-record.md#independent-security-review-requirements).
A missing review is an implementation blocker, not a comment.

## References

- [bittyd Session-Host Contract Promotion Record](bittyd-session-host-promotion-record.md)
  — the dated owner promotion, the D-01 through D-18 disposition table, the
  sign-off status, and the independent security review scope.
- [bittyd Scope Charter](bittyd-scope-charter.md) (draft) — the session-host
  mechanism floor and exclusion set that bounds this contract's scope; it
  changes no service-surface rule.
- [Wheel consumer requirements for the bittyd session host (Candidate)](bittyd-session-host-requirements-candidate.md)
  - consumer requirements and the `D-*`, `V-*`, and `Q-*` sets answered here.
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  - accepted daemon definitions, ownership, bounded persistence, and both trust
    gates.
- [ADR 0019 - bittyd Staging Advance to the v0.2.0 Slice](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  - accepted staging, minimal slice, and exclusions.
- [ADR 0002 - Platform Support Tiers](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md)
  - platform tiers and native-runner evidence rule.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md), and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  - normative controls and evidence gates.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  - accepted local transport, scopes, error taxonomy, and rate limits.
- [`bitty-ipc`](https://github.com/bitty-terminal/bitty-ipc) - accepted
  RC-9/RC-10 framing, peer credentials, scope families, and bounds. Existing
  guarantees read for this revision: `crates/bitty-ipc-auth/src/auth.rs`
  (peer credentials at accept), `crates/bitty-ipc-api/src/scope.rs`
  (server-side per-request scopes, `process.spawn` separate),
  `crates/bitty-ipc-api/src/wire.rs` (wire v1 envelope and correlation), and
  `crates/bitty-ipc-core/src/limits.rs` (RC-9/RC-10 bounds).
- [Multiplexer Decision](multiplexer-decision.md) - accepted attach authority,
  controller-only resize, and the seam this contract's leases serve.
- [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) - define the
  bittyd session-host contract for long-running Agent workers.
- [bitty#2064](https://github.com/bitty-terminal/bitty/issues/2064) - bittyd core
  service host: lifecycle, single instance, IPC.
- [bitty#2218](https://github.com/bitty-terminal/bitty/issues/2218) - built-in
  multiplexer story: detach/attach and session persistence (design first).
