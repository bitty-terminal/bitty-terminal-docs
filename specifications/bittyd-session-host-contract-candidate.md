---
title: bittyd Session-Host Contract (Candidate)
description: Candidate Core contract for the bittyd session host - D-01 through D-18 decisions, session identity and lifecycle, scoped service surface, stop and restart semantics, bounds, conformance matrix, fake-server harness plan, and the v0.2.0 implementation breakdown
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 80
---

# bittyd Session-Host Contract (Candidate)

## Document status

> Status: **candidate, not accepted and not implemented.** This document records
> the Core-owned answers to decisions `D-01` through `D-18` raised by the
> [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md),
> and the service surface, bounds, conformance matrix, and harness plan that
> follow from those answers. `bittyd` does not ship, no `bittyd` crate or binary
> exists, and nothing here authorizes daemon, transport, registry, or
> fake-server code. The contract is promoted to `accepted` only after owner
> sign-off and independent security review; see
> [P0 Review Sign-off](#p0-review-sign-off).

| Control          | Value                                                                               |
| ---------------- | ----------------------------------------------------------------------------------- |
| Status           | Candidate, reviewed by no one yet, authorizes no code                               |
| Owner            | Core terminal platform (bitty#2546)                                                 |
| Upstream records | ADR 0008, ADR 0019, ADR 0002, security corpus, `bitty-ipc` RC-9/RC-10               |
| Consumer         | Wheel CTX-0036 adapter and fake-server conformance suite; other Agent harnesses     |
| Implementation   | bitty v0.2.0 slice, tracked as the child issues of bitty#2546 (#2064, #2218)        |
| Evidence status  | No vector in this document has been executed against a real `bittyd`                |
| Change authority | Core owns the answers; the security corpus co-owns the trust boundary               |
| Promotion gate   | Owner sign-off plus independent security-reviewer sign-off, then `status: accepted` |

This document is self-contained: a reader needs no other design record,
archival capture, or unpublished conversation to apply it. Candidate wording, method
names, field names, and numeric defaults are normative for conformance only
after promotion; until then they are the fixed shape the fake server and the
adapter target.

## Purpose and scope

`bittyd` is the per-user, single-instance host process admitted to the v0.2.0
slice by [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md).
It owns the service lifecycle, the authenticated local endpoint, the session
registry, attach and detach leases, worker supervision, and service API
versioning. Consumer harnesses such as Wheel own their task graph, context, tool
policy, consent, audit content, and cancellation policy; they consume this
service and must not grow a competing daemon.

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

This candidate is subordinate to every accepted record below. Where a source
and this document disagree, the source wins and this document is defective.

| Source                                                                                                                               | What it binds here                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Daemon definitions, single PTY ownership, session-grained attach and detach, bounded persistence, contained failure, attributed enforcement, and both trust-boundary gates. The daemon owns the PTY lifecycle, grid, scrollback, and plugin VMs for sessions it hosts; a second PTY owner is a conformance violation. |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | The v0.2.0 slice: single instance per user via socket lock, peer-credential IPC re-checked before privileged actions, thin GUI and `bitty ctl` clients, session-grained attach and detach, per-domain single writer, service API versioning from day one. Remote UI, restart persistence, and autostart stay outside. |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Platform tiers and the rule that cross-compilation is never evidence for a Tier 1 cell.                                                                                                                                                                                                                               |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                    | Invariants 1 through 10, especially local-only IPC with an explicit scope per operation, read-only Agent default, untrusted observation data, bounded untrusted input, secret-minimizing diagnostics, and `bitty --safe` independence.                                                                                |
| [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (normative)                     | T-09 (same-user IPC takeover), T-10 (Agent confused deputy), T-11 (secret exposure), R-011 through R-014, and the future-daemon scope line.                                                                                                                                                                           |
| [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) (normative) | P0-AC-021 (peer credentials), P0-AC-022 (per-action scopes), P0-AC-023 (child process scope limitation), P0-AC-024 (Agent read-only default), P0-AC-025 (DevTools scopes), P0-AC-026 (trace minimization).                                                                                                            |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | Local framing, peer-credential posture, the closed v1 scope families, per-request server-side evaluation, the error taxonomy, and no default TCP.                                                                                                                                                                     |
| `bitty-ipc` accepted `RC-9`/`RC-10`                                                                                                  | 256 KiB frame, 256 KiB streamed chunk, 64 pending requests, 256 channel capacity, 100 req/s sustained with 200 burst, 16 concurrent connections per endpoint, 1 MiB decoded request payload, shed-newest with attribution. These are the floor, not a target.                                                         |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (candidate)                                             | Consumer input and the `V-01` through `V-34` vector set. It is not an authority; this document answers its `D-*` items and may narrow its positions.                                                                                                                                                                  |
| bitty#2546, bitty#2064, bitty#2218                                                                                                   | Scope context for the contract and the v0.2.0 session-host slice. Issue text is not a normative source.                                                                                                                                                                                                               |

The single-writer rule is restated because every later section depends on it:
`bittyd` is the only writer of the registry, lifecycle, generation, attach
count, lease, and last-seen state; the worker or consumer is the only writer of
its own task, context, tool, and audit content; one connection never writes
another client's state; and no client edits registry files or signals a worker
out of band.

## Terminology

| Term                | Meaning in this document                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session             | One unit registered and supervised by `bittyd`: one terminal or, when enabled, one worker run.                                                                                  |
| Session kind        | `terminal` or `worker`. The kind fixes the spawn, content, and control semantics and never changes for a session.                                                               |
| Client              | A process connected to the daemon: a GUI/TUI panel, `bitty ctl`, or a consumer adapter such as Wheel's.                                                                         |
| Attach lease        | A bounded grant binding one connection to one session for events and, when the role allows, terminal input.                                                                     |
| Observer            | A lease that receives state events and terminal snapshots but holds no control or input authority.                                                                              |
| Controller          | The single lease per session that holds input and abort authority, subject to the session's control token.                                                                      |
| Control token       | A 256-bit secret minted at session creation, returned once to the creator, and required to claim or keep controller authority.                                                  |
| Worker              | The process the daemon supervises for a session. For a terminal session this is the PTY child tree.                                                                             |
| Generation          | Monotonic fence for the worker binding of one session. It answers "which worker does this request target".                                                                      |
| State revision      | Monotonic fence for every snapshot-visible mutation of one session. It answers "is this snapshot older than my view".                                                           |
| Daemon instance     | One `bittyd` process lifetime, identified by a fresh random instance id on every start.                                                                                         |
| Service API version | The `{major, minor}` contract version negotiated at connect and refused on mismatch instead of half-honored.                                                                    |
| Terminal state      | A lifecycle state after which the session never runs again. Terminal states and their reasons are immutable.                                                                    |
| Orphan record       | A durable, owner-private record of a spawned process identity, used after a daemon crash to decide whether an exact process may be reaped. It is never used to adopt a session. |
| Operator capability | A per-boot, owner-private capability that gates daemon-scoped actions. It is an explicit-intent gate, not a privilege boundary against a hostile same-user process.             |
| Adapter             | The consumer-side boundary that maps run control onto the service API. It owns no lifecycle truth.                                                                              |
| Fake server         | A test peer implementing the published surface with injected time and limits. It is labeled `candidate-not-bittyd` and is never evidence for the real service.                  |
| Content plane       | Terminal output, snapshots, scrollback, and input encoding. It is owned by the accepted terminal and IPC contracts, not here.                                                   |

Two counters are required rather than one because they fence different
mistakes: a request can target the wrong worker while being based on a current
snapshot, and a snapshot can be stale while targeting the right worker. `D-03`
records the increments and exclusions.

## Decision record (D-01 through D-18)

Each row is decided. "Candidate" below means the contract is not yet accepted,
not that the answer is optional. The sections after the table define the
mechanics that conformance asserts.

| ID   | Decision                    | Answer                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-01 | Session kinds in v0.2.0     | The v0.2.0 slice contains **terminal sessions only**. The contract defines the `worker` kind so consumers can target it, but a v0.2.0 daemon advertises `worker_sessions=false` and refuses worker creation with `UnsupportedCapability`. Worker hosting needs an ADR 0019 amendment and a security review of worker spawn and credential inheritance before any build advertises it true. |
| D-02 | Identity and fencing        | 128-bit random `daemon_instance_id` and `session_id`; the instance id is checked before any session lookup; `session_id` is never reused within an instance; terminal sessions carry an immutable `terminal_id` (client-supplied or server-assigned when absent) that is unique among live sessions. Session-id-only fencing is forbidden.                                                 |
| D-03 | Counters                    | Two `u64` counters. `generation` starts at 0 at create and increments by one when a worker binds; v0.2.0 permits one bind, so it is 0 or 1 and never wraps. `state_revision` increments by one on every snapshot-visible mutation; heartbeats and last-seen updates never increment it.                                                                                                    |
| D-04 | Lifecycle and reasons       | Closed states `created`, `running`, `stopping`, and terminal `exited`, `failed`, `terminated`; `attached` is a derived flag, not a state. Closed terminal reasons keep cancel, timeout, operator abort, daemon stop, host shutdown, normal exit, signal, spawn failure, and supervision failure distinct. Transport errors never substitute for a reason.                                  |
| D-05 | Stop policy                 | `daemon.stop` refuses by default when sessions are active; explicit `drain` notifies, refuses new work, waits the advertised grace, then terminates the remainder; explicit `force` terminates immediately. Signals run the drain policy with the `host_shutdown` reason. Exit codes and client notification are specified, and every transition is attributed.                            |
| D-06 | Crash, restart, orphans     | No persistence. A restart gets a new instance id and an empty registry; old handles are refused. There is no adoption. Only an exact orphan identity (boot id, pid, process start time, recorded group) may be signalled after a crash; an unverifiable record is reported and never signalled.                                                                                            |
| D-07 | Authorization and scopes    | A new, deny-by-default `session.*` family plus `daemon.*` scopes, separate from `terminal.*`. Controller authority requires the session's control token. Daemon-scoped actions require the operator capability. `terminal.*` stays authoritative for terminal content and is never stretched to cover sessions.                                                                            |
| D-08 | Client identity             | The server assigns a random per-connection `client_id`; the server captures the authenticated peer identity; a consumer-supplied `client_instance` is audit-only, bounded, and never authority. Client-supplied ids never grant anything.                                                                                                                                                  |
| D-09 | Multi-attach and control    | One controller and many observers per session, within the published caps. Control is claimed with the control token and moves only by explicit, attributed transfer. A controller disconnect vacates control at lease expiry; it never transfers silently. The controller lease owns terminal input.                                                                                       |
| D-10 | Event delivery              | Snapshot plus ordered, revision-tagged deltas on the lease. Delivery is at-least-once within a live lease. Terminal and stop notifications are control frames that are never silently shed: if the queue cannot take one, the lease is closed with `TerminalEventLost`. `status` is the authoritative reconciliation read; backlog is bounded and truncation is explicit.                  |
| D-11 | Versioning and capabilities | A `{major, minor}` service version. Same major with a client minor at or below the server minor is accepted; every other case is a typed refusal before any operation. Capabilities are explicit and immutable per connection; there is no feature-probe downgrade. One major is served at a time.                                                                                         |
| D-12 | Heartbeat and last-seen     | The client heartbeats its leases. The server uses its own monotonic clock. Any successful request naming a lease refreshes it; staleness only detaches, never aborts. Interval, TTL, and transport idle bound are advertised limits.                                                                                                                                                       |
| D-13 | Timeout ownership           | The daemon owns transport idle, request, spawn, attach-lease, retention, abort-grace, drain-grace, and orphan-reap bounds. The consumer owns the execution deadline and expresses it as an abort with the `consumer_timeout` reason. The daemon imposes no default execution deadline.                                                                                                     |
| D-14 | Resource limits             | Limits are advertised at handshake and enforced with whole-request refusal. System maxima are compiled and may only change upward through an attributable contract revision; user configuration may lower but never raise them.                                                                                                                                                            |
| D-15 | Platform cells              | ADR 0002 tiers apply. The first v0.2.0 cell is Linux x86_64; every other cell needs native-runner conformance before it is advertised. Unsupported cells return a typed result and never a weaker transport. Namespace, SID, and elevation mismatches fail closed.                                                                                                                         |
| D-16 | Audit and attribution       | The daemon records lifecycle and refusal records only: peer identity, client id, instance, session, generation, revision, action, static result code, counts, and limits. It never records terminal content, PTY bytes, argv, env, clipboard, prompts, provider payloads, or tokens. The sink is owner-private, bounded, and not readable over the service.                                |
| D-17 | Worker restart              | The daemon never restarts a consumer worker and never rebinds a session. A retry is a new session with a new id, a new control token, and a generation starting at 0.                                                                                                                                                                                                                      |
| D-18 | Idempotency                 | Mutating methods carry a client-generated 128-bit key scoped to the authenticated user, the target, and the method. Duplicates return the first result or the current terminal snapshot; a fingerprint conflict is refused; the key store is bounded and fail-closed at capacity.                                                                                                          |

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

Consequences today: the Wheel adapter can be written and tested against the
candidate surface, but its hosted worker path stays disabled until the
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
  server when absent. It is immutable for the session and unique among
  non-terminal sessions; a second live session with the same `terminal_id` is
  refused with `TerminalAlreadyHosted`. After a session is terminal and
  collected, the `terminal_id` may be reused, so reconnecting clients fence with
  `(instance, session_id)`, not `terminal_id`.
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
  revocation, control claim, control transfer, control vacancy, and terminal
  finalization;
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

- `swept`: the recorded process tree was verified gone;
- `unverified`: the daemon could not verify the tree;
- `not_started`: no worker was ever bound.

A terminal session is read-only. `status` serves its snapshot until retention;
attach, controller attach, abort, kill, and transfer are refused with
`NotRunning` or answered with the immutable terminal snapshot when the request is
idempotent. A terminal session is never revived.

### D-05: stop, drain, and force

`daemon.stop` has three explicit modes. The operator capability is required in
all modes; consumer adapters never issue it.

| Mode               | Behavior                                                                                                                                                                                                            | IPC result                                                         | CLI exit                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `refuse` (default) | If any session is non-terminal, change nothing and return the active-session count. If none are active, stop cleanly.                                                                                               | `Denied/ActiveSessions` with counts, or a clean stop               | 3 or 0                                           |
| `drain`            | Enter `stopping`, refuse new sessions and controller attaches, notify every attached lease with `daemon_stopping` and the drain deadline, wait up to `drain_grace_ms`, then abort the remainder with `daemon_stop`. | Accepted; terminal events delivered where a transport still exists | 0, or 4 when the deadline forced the remainder   |
| `force`            | Abort every session immediately with `daemon_stop`, wait up to `abort_grace_ms` for exits and reaping, then exit.                                                                                                   | Accepted                                                           | 0, or 5 when a worker could not be verified gone |

- Signals (`SIGTERM`, `SIGINT`) run the `drain` mode with the `host_shutdown`
  reason, not `daemon_stop`, so a service-manager restart stays distinguishable
  from an explicit operator stop. `SIGKILL` has no handler and is crash
  behavior.
- No session reaches a terminal state without a reason, a revision, and an
  actor. A drain that cannot notify a lease closes that lease with
  `TerminalEventLost` before or at the terminal transition; it never silently
  drops the notification and continues.
- A refused `refuse` request leaves the daemon running. A drain that is already
  in progress returns `DaemonStopping` rather than starting a second drain.
- Exit code 6 is reserved for endpoint tamper or a failed authentication
  invariant; it is not a stop mode and never applies to a normal drain.
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
- Before spawning a worker, the daemon appends a bounded orphan record:
  `session_id`, `generation`, `boot_id`, `pid`, process start time, process
  group id, and the executable path digest. The journal holds at most
  `max_orphan_records`; when it is full, a new spawn is refused with
  `LimitExceeded` rather than dropping a live record. The record is
  owner-private (`0700` directory, `0600` file) and is removed after a verified
  reap.
- On startup, and only while holding the single-instance lock, the daemon
  examines orphan records:
  - a record from a different boot id is stale and is discarded;
  - a record whose pid no longer exists is discarded;
  - a record whose pid exists but whose process start time does not match is a
    pid-reuse case, is discarded, and is never signalled;
  - an exact match (same boot id, pid, start time, and recorded group) is
    terminated with a graceful signal, then a kill signal after
    `orphan_reap_grace_ms`, and is recorded as `orphan_reaped`;
  - an unverifiable record is reported as `orphan_unverified` and is never
    signalled.
- Reaping never uses a name, pattern, port, or "newest process" heuristic, and
  never signals a process the daemon did not record. A reaped orphan never
  becomes a session and never receives a terminal event.
- The daemon reports orphan counts and verification state in `daemon.status`;
  it does not expose process ids to consumer clients.

### D-07: authorization and scopes

Possession of a connection, a session id, or a terminal id grants no authority.
Every action is authorized server-side against the authenticated peer, the
connection's effective scopes, and the session's control relation. Same-user
identity is not a grant.

The service adds a closed scope family, separate from the `bitty-ipc` v1
families:

| Scope             | Grants                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.inspect` | Read status and list the caller's visible sessions.                                                                                                                     |
| `session.host`    | Create a session of an enabled kind.                                                                                                                                    |
| `session.attach`  | Obtain an observer lease on a visible session.                                                                                                                          |
| `session.control` | With the control token or a controller lease: claim control, abort, transfer control, and revoke another lease on the same session. Immediate kill stays operator-only. |
| `daemon.inspect`  | Read daemon status and the operator's all-session view.                                                                                                                 |
| `daemon.control`  | Stop, drain, force, and reap-verify.                                                                                                                                    |

Rules:

- The family is additive and independent: no scope implies another, and a
  higher-sounding name is not a superset.
- The baseline grant for an ordinary consumer connection is `session.inspect`,
  `session.host`, `session.attach`, and `session.control`, each still filtered
  by the per-session visibility and control-token rules. The operator
  capability adds `daemon.inspect` and `daemon.control`.
- A connection cannot widen its own scopes. Scope changes require a new
  connection and a new server-side grant.
- `terminal.*` remains authoritative for terminal content. A controller lease on
  a terminal session also requires `terminal.input` to write input; an observer
  lease that reads terminal content also requires `terminal.inspect`. The
  `session.*` family never grants terminal content by itself, and `terminal.*`
  is never stretched to cover session administration.
- Creating a session grants authority over that session only. It never grants
  listing, attaching, aborting, or stopping another session, and it never makes
  the creator a daemon administrator.
- Visibility is explicit: a client can address a session only while it holds a
  live lease or presents that session's control token with the request. There is
  no discovery by enumeration; `session.list` returns only live-lease sessions,
  and the operator view requires `daemon.inspect`.
- Every denial is static, typed, attributed, and content-free. A missing scope
  is decided before session lookup and returns `ScopeViolation`. For a caller
  that holds the scope, unknown, collected, and unauthorized sessions return the
  same `NotFound` result, so a denial is not an existence oracle; audit keeps
  the distinction.

Controller authority is the control token:

- Minted at create as 256 bits from the OS CSPRNG, returned only in the create
  response. The daemon stores a digest for verification and never logs or
  writes the token.
- Required to claim the controller lease, abort, or transfer control, and to
  reclaim control after a reconnect. Immediate kill is operator-only and does
  not accept a control token.
- Scoped to one session; the generation is checked separately on effectful
  requests. It is not a daemon-wide credential and grants nothing outside its
  session.
- Never placed in a child environment, argv, audit record, or diagnostic
  export. A consumer that persists it must use an owner-private secret store
  (`0600`) in its own state directory.
- A lost token means the session can no longer be controlled by that consumer;
  observers still see it, and an operator can stop it. There is no recovery
  method that reveals or resets the token.

Operator capability:

- Minted at daemon start, stored in the owner-private runtime directory
  (`0700` directory, `0600` file), and rotated on every start.
- Presented at handshake to obtain `daemon.inspect` and `daemon.control`.
- Explicitly an intent gate, not a privilege boundary: any process running as
  the same user can read the file. The security review must confirm the file
  mechanism or replace it, but the requirement that daemon-scoped actions need
  an explicit operator grant is decided.
- Never inherited by a session worker, never placed in an environment, and
  never accepted from a consumer adapter.

### D-08: client identity

- `client_id` is a 128-bit random value assigned per connection at handshake.
  It is never supplied by the client and never used as a durable identity.
- `client_instance` is an optional, bounded (128 bytes), opaque consumer value
  used to correlate reconnects in audit. It is recorded but never evaluated for
  authorization.
- The server records the authenticated peer identity (Unix uid or Windows SID),
  the peer pid, and the process start time at handshake. The pid is
  informational because it can be reused.
- A reconnect receives a new `client_id`. Durable authority comes from the
  control token and live leases, not from `client_id`.
- No client-supplied id, header, or path parameter is ever authority.

### D-09: multi-attach and control ownership

- One controller lease per session, plus observers up to
  `max_attaches_per_session`.
- Observer leases are read-only for control and input. They receive state
  events and may read terminal content only with `terminal.inspect`.
- Controller claim requires `session.control` and the control token. If another
  lease already holds control, the claim is refused with `ControlHeld`; a
  second controller is never created by racing.
- Control moves only by an explicit `control.transfer` from the current
  controller to a target `attach_id` on the same session. The target must be a
  live observer lease, must hold `session.control`, and the transfer is
  attributed and increments the revision. A transfer to a terminal session's
  controller also requires the target to hold `terminal.input`.
- A controller disconnect vacates control when its lease expires. Control is
  not transferred implicitly, and no other client becomes controller without
  presenting the token.
- The controller may revoke another lease on its own session; the operator may
  revoke any lease. Revocation is attributed and increments the revision.
- The controller lease is the single input owner for a terminal session. A
  second client cannot write input by attaching as an observer; it must receive
  an explicit transfer. This preserves the ADR 0008 single-focused-writer rule.
- Attaching the same client twice is allowed as two distinct leases, each with
  its own `attach_id`; only one can be controller.

### D-10: event delivery and ordering

- Attach returns a snapshot at the current `state_revision` plus a bounded
  backlog of retained events for that session. `backlog_truncated` and
  `earliest_revision` make a gap explicit; there is no unbounded replay.
- Events are ordered per session by `state_revision` and carry `instance_id`,
  `session_id`, `revision`, `kind`, and the terminal marker. Events from
  different sessions have no global order; transport order is the only order
  across sessions.
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

- The service version is `{major: u16, minor: u16}`. The first accepted
  contract is `1.0`; the candidate surface is labeled `candidate` and is not a
  versioned release.
- Handshake carries the client version. The server accepts the same major and a
  client minor in `[min_client_minor, server_minor]`; `min_client_minor` starts
  at `0` for `1.0`. A different major, or a client minor outside that range, is
  `VersionMismatch` and the connection closes before any session operation.
- There is no best-effort mode, no probe-based downgrade, and no partial
  surface. A server serves one major at a time in v0.2.0; an older major gets a
  typed refusal, not a translated session.
- Capabilities are an explicit set, fixed for the connection:
  `terminal_sessions` (true), `worker_sessions` (false), `events`,
  `control_transfer`, `idempotent_mutations`. A client must refuse to use a
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

| Class          | Owner  | Trigger                                | Effect                                   | Result class      |
| -------------- | ------ | -------------------------------------- | ---------------------------------------- | ----------------- |
| Transport idle | bittyd | No complete frame within the bound     | Close the connection; expire its leases  | Transport timeout |
| Request        | bittyd | A method exceeds its bound             | No partial state; outcome may be unknown | Request timeout   |
| Attach lease   | bittyd | Lease heartbeat older than the TTL     | Detach only                              | Attach expired    |
| Spawn bind     | bittyd | Worker not bound within the bound      | `failed/spawn_failed`                    | Start failure     |
| Retention      | bittyd | Terminal record older than the TTL     | Collect metadata                         | Unknown session   |
| Abort grace    | bittyd | Graceful termination exceeds the bound | Kill signal, then classify cleanup       | Termination       |
| Drain grace    | bittyd | Drain exceeds the bound                | Force the remainder with `daemon_stop`   | Daemon stop       |
| Orphan reap    | bittyd | Reap exceeds the bound                 | Kill signal, then verify                 | Orphan reap       |
| Execution      | Wheel  | The run's own deadline                 | Abort with `consumer_timeout`            | Consumer timeout  |

- The daemon imposes no default execution deadline on an attached worker.
  Transport and request bounds constrain IPC, not how long work takes.
- A consumer timeout is an abort with the `timeout` reason class, so the
  terminal reason stays `consumer_timeout` and never becomes a generic
  cancellation.
- A request timeout whose outcome is unknown is reconciled with `status` before
  any mutating retry. A mutating retry needs the same generation and an
  idempotency key; a stale-generation refusal ends the retry path.

### D-14: resource limits

All values are advertised in `limits` at handshake. Values are candidate
defaults; user configuration may lower a default or raise it up to the
advertised system maximum, never above it. System maxima are compiled constants;
raising one requires an attributable contract revision and security review.

| Limit                               | Default | System maximum | Rationale                                                                        |
| ----------------------------------- | ------- | -------------- | -------------------------------------------------------------------------------- |
| `max_sessions`                      | 16      | 64             | Live non-terminal sessions; reuses the Core `MAX_TERMINALS` ceiling and default. |
| `max_attaches_per_session`          | 8       | 16             | Bounded by the accepted RC-9 connection ceiling.                                 |
| `max_attaches_per_connection`       | 8       | 16             | One connection cannot monopolize every session.                                  |
| `max_retained_terminal_records`     | 64      | 64             | Bounded terminal snapshot retention.                                             |
| `session_record_bytes`              | 4096    | 4096           | Bounds per-session metadata.                                                     |
| `terminal_retention_ms`             | 600000  | 3600000        | Terminal records are collected after ten minutes by default.                     |
| `max_event_backlog_events`          | 256     | 256            | Bounded per-session event ring.                                                  |
| `max_event_backlog_bytes`           | 262144  | 262144         | Reuses the RC-10 frame ceiling as the backlog byte bound.                        |
| `attach_heartbeat_interval_ms`      | 5000    | 5000           | Client heartbeat cadence.                                                        |
| `attach_lease_ttl_ms`               | 15000   | 15000          | Three missed heartbeats detach; never aborts.                                    |
| `transport_idle_ms`                 | 30000   | 30000          | Closes a silent connection.                                                      |
| `request_timeout_ms`                | 10000   | 10000          | Per-request bound.                                                               |
| `spawn_bind_timeout_ms`             | 30000   | 30000          | A worker must bind within this bound or the session fails.                       |
| `abort_grace_ms`                    | 5000    | 5000           | Graceful signal, then kill.                                                      |
| `drain_grace_ms`                    | 10000   | 10000          | Bounded daemon drain.                                                            |
| `orphan_reap_grace_ms`              | 5000    | 5000           | Graceful orphan termination, then kill.                                          |
| `max_idempotency_keys_per_session`  | 1024    | 1024           | Bounded dedupe store.                                                            |
| `max_idempotency_bytes_per_session` | 65536   | 65536          | Bounds the dedupe records and stored results per session.                        |
| `max_orphan_records`                | 64      | 64             | At most one record per live spawn; full journal refuses a spawn.                 |
| `audit_file_bytes`                  | 1048576 | 2097152        | One bounded audit segment; rotation count is a compiled constant.                |
| `audit_segments`                    | 2       | 2              | Two segments bound total audit bytes.                                            |
| `max_spawn_argv_entries`            | 64      | 64             | Bounds a create request.                                                         |
| `max_spawn_env_entries`             | 128     | 128            | Bounds the explicit child environment.                                           |
| `max_spawn_field_bytes`             | 4096    | 4096           | Bounds each argv, env, and cwd field.                                            |
| `max_spawn_spec_bytes`              | 65536   | 65536          | Bounds the whole spawn specification.                                            |

`max_sessions` bounds live non-terminal sessions; retained terminal records are
bounded separately by `max_retained_terminal_records`. The registry's aggregate
bound is
`(max_sessions + max_retained_terminal_records) × session_record_bytes +
max_sessions × (max_event_backlog_bytes + max_idempotency_bytes_per_session)`,
which is 21,495,808 bytes at the system maxima. The audit sink is separately
bounded by `audit_file_bytes × audit_segments`, and the orphan journal by
`max_orphan_records`. No registry structure grows without one of these bounds.

Inherited transport bounds are not repeated as daemon constants: 256 KiB frame,
256 KiB chunk, 64 pending requests, 256 channel capacity, 100 req/s sustained
with 200 burst, 16 connections per endpoint, and 1 MiB decoded request payload.
The daemon publishes them in `limits` for clients that parameterize tests.

A limit violation is refused whole: no partial request is applied, no session
is transitioned, the result carries counts and the limit that was hit, and no
caller bytes are echoed. A refused request never takes the daemon down.

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
- actor: peer uid or SID, peer pid, `client_id`, and optional bounded
  `client_instance`;
- action and static result code;
- counts and limits for a refusal;
- for a terminal transition: state, reason, exit code or signal, cleanup class.

The daemon never records terminal text, PTY bytes, scrollback, clipboard
content, argv, environment values, file contents, prompts, transcripts, tool
output, provider payloads, secret values, the control token, or the operator
capability. `client_instance` is opaque consumer data and is recorded as
supplied within its bound; consumers must not put secrets in it.

- The sink is an owner-private append-only file under
  `$XDG_STATE_HOME/bitty/audit/` (directory `0700`, file `0600`), bounded by
  `audit_file_bytes` and `audit_segments`. A future alternative sink must keep
  the same owner-private, bounded, content-free properties.
- Refusals of privileged actions and all terminal transitions are attributed
  before the reply is sent where the sink is available. If the sink cannot be
  written, the daemon refuses the privileged action with `Internal`, changes no
  state, and reports `audit_degraded=true` in `daemon.status`; reads continue.
  The missing record is surfaced through that degraded state and the typed
  refusal, never silently ignored.
- There is no service method to read audit in v0.2.0. The operator reads the
  owner-private file. Wheel and other consumers keep their own audit of record
  and record the daemon instance, session, generation, revision, and client id.
- Audit is best-effort across a daemon crash; it is not a durable ledger and
  must not be presented as one.

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

- Every mutating method (`session.create`, `session.abort`, `session.kill`,
  `session.control.transfer`, `daemon.stop`) carries a client-generated
  idempotency key: 128 random bits, encoded in at most 128 bytes.
- The key is scoped to `(authenticated uid or SID, target, method)`. For
  `session.create` the target is the requested `terminal_id` when supplied,
  otherwise the requested kind, and the fingerprint includes the kind, the
  terminal id, and the bounded spawn specification digest.
  For session methods the target is the `session_id`. For `daemon.stop` the
  target is the daemon instance id.
- A duplicate with the same fingerprint returns the first result. For a
  terminal session, a duplicate abort or kill returns the current terminal
  snapshot, not a second termination. A duplicate `session.create` returns the
  same session snapshot and the same control token, because the original
  response may have been lost before the token reached the client.
- A duplicate with a different fingerprint (different method, target,
  generation, or reason class) is refused with `IdempotencyConflict` and
  applies nothing.
- Idempotency keys for `session.create` are secrets: a duplicate returns the
  control token, so a consumer must not log the key or place it in a child
  environment.
- Keys are retained until the session is terminal and collected, bounded by
  `max_idempotency_keys_per_session`. At capacity, a new mutating request is
  refused with `IdempotencyCapacity` and no effect; the daemon never evicts a
  key in a way that could permit a duplicate effect.
- Detach is naturally idempotent: a second detach returns `not_attached` and
  does not increment the revision. Status and list are read-only and do not
  require keys.

## Service surface

The surface is specified as logical operations. Framing, envelope fields, and
encoding follow the accepted `bitty-ipc` v1 transport; exact JSON key spellings
are frozen by the first implementation and pinned by the conformance corpus.
Method names below are the contract names for conformance and must match the
`bitty-ipc` method grammar (lowercase dotted segments).

### Handshake

`daemon.negotiate`:

Request: `client_version {major, minor}`, optional `client_instance`,
optional `operator_capability`.

Response:

| Field                 | Meaning                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `service_api_version` | `{major, minor, min_client_minor}` of the service and the accepted client range.              |
| `daemon_instance_id`  | Fresh random instance id.                                                                     |
| `daemon_pid`          | Observational only; never a signal or authority input.                                        |
| `server_identity`     | OS uid or SID, endpoint kind, endpoint owner, and endpoint mode facts.                        |
| `peer_identity`       | Authenticated uid or SID, pid, and process start time.                                        |
| `client_id`           | Server-assigned connection identity.                                                          |
| `scopes`              | Effective scopes for this connection.                                                         |
| `capabilities`        | `terminal_sessions`, `worker_sessions`, `events`, `control_transfer`, `idempotent_mutations`. |
| `limits`              | All advertised bounds from `D-14` plus the inherited `bitty-ipc` bounds.                      |
| `server_monotonic_ms` | Server monotonic clock at handshake.                                                          |
| `daemon_state`        | `running` or `stopping`; a stopping daemon refuses new sessions.                              |

A version mismatch, an untrusted endpoint, a failed peer check, or a missing
operator capability (when operator scopes are requested) is a typed refusal and
the connection closes. No session operation is possible before a successful
negotiate.

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

- The child never inherits the daemon's environment or any daemon credential.
  The daemon adds no service token, socket path, operation capability, or
  secret to the child; this is the P0-AC-023 child-scope rule.
- The daemon treats argv, env, and cwd as opaque spawn data: it does not parse,
  interpret, record, or log them. The spawn specification is dropped from
  memory after the bind.
- Response: the session snapshot, the control token, and the current revision.
  Create does not attach. The creator must claim the controller lease with the
  token if it wants control; otherwise the session runs detached.
- Duplicate live `terminal_id` is `TerminalAlreadyHosted`. A worker kind with
  `worker_sessions=false` is `UnsupportedCapability`.

### Status and list

`session.status`:

Request: `session_id`, optional instance echo, optional generation echo.
Response: the full session snapshot.

- Status never refuses on a stale generation; it returns the current
  generation, revision, lifecycle, terminal flag, attach count, controller
  presence, last-seen values, and terminal reason.
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

Request: `session_id`, `role` (`observer` or `controller`), optional
`expected_generation` (required for controller), optional `control_token`.

- Observer: requires `session.attach` and visibility. Allowed at any
  non-terminal state, including `stopping`.
- Controller: requires `session.control`, the control token, and a matching
  `expected_generation`. Refused with `ControlHeld` when another lease holds
  control, with `SessionStopping` while stopping, and with `NotRunning` when
  terminal.
- Response: `attach_id`, role, effective lease scopes, snapshot at the current
  revision, bounded backlog, and `backlog_truncated` with `earliest_revision`.
- The lease records `attached_at`, `last_seen_at`, and `lease_expires_at` in
  server monotonic time. `attach_id` is distinct from `client_id` and is the
  only handle used for detach and transfer.

`session.detach`:

Request: `attach_id` or `session_id` plus `attach_id`.
Response: detach acknowledgement, previous attach state, and revision.

- Own detach is always allowed. Detaching another lease is a revocation: it
  requires controller authority on that session or `daemon.control`, the target
  receives `lease_revoked`, and the action is attributed.
- Duplicate detach returns `not_attached` and changes nothing.
- Detach never aborts, never changes the generation, and never produces a
  terminal reason.
- Expiry and revocation follow the same state path and are attributed.

`session.control.transfer`:

Request: `session_id`, `generation`, `target_attach_id`, `control_token`,
idempotency key.

- Requires `session.control` and the current controller lease. The target must
  be a live observer lease on the same session that holds `session.control`; a
  terminal session's target must also hold `terminal.input`.
- On success the target becomes controller, the previous controller becomes an
  observer, the revision increments, and both leases receive
  `control_transfer`. A stale generation or a missing token applies nothing.
- Control never transfers on disconnect, expiry, or attach; only this explicit
  method moves it.

### Abort and kill

`session.abort`:

Request: `session_id`, `generation`, `reason_class` (`cancel`, `timeout`,
`operator`), idempotency key, optional control token.

- Requires `session.control` (or `daemon.control` for the `operator` reason).
  Consumer controllers may use `cancel` and `timeout`; `operator` requires
  `daemon.control`.
- A generation of `0` aborts a session that has not bound a worker: the spawn is
  cancelled, the session becomes `terminated` with the requested reason, and
  cleanup is `not_started` when nothing was spawned.
- A generation mismatch is `StaleGeneration`, carrying the current generation
  and revision, with no state change. The adapter reconciles and never retries
  the mutation against the new generation.
- On acceptance: state becomes `stopping`, revision increments, the abort
  record is attributed, and the terminal event follows after termination and
  reaping. The response is not a success claim about the worker; it is an
  accepted transition.
- A duplicate after terminal returns the terminal snapshot.
- A missing scope is `Denied/ScopeViolation`, decided before session lookup. A
  caller that holds the scope but lacks visibility or the control token gets
  `NotFound`. Neither result carries target details, and neither changes state.

`session.kill`:

Request: `session_id`, `generation`, idempotency key.

- Operator-only (`daemon.control`). Immediately kills the recorded worker
  identity, then reaps. Terminal reason is `operator_abort`; cleanup is
  `swept` or `unverified`.
- Not available to consumer adapters. This is the only immediate-kill path.

### Daemon status and stop

`daemon.status`:

- Returns daemon state (`running` or `stopping`), instance id, pid
  (observational), uptime, session counts by state, orphan candidate counts,
  `audit_degraded`, advertised limits, and the drain deadline when stopping.
- `daemon.inspect` is required for `daemon.status`; the handshake facts are the
  only daemon information an ordinary consumer connection receives.

`daemon.stop`:

- Request: mode (`refuse`, `drain`, `force`), idempotency key, optional bounded
  static label used for audit only (it never changes the terminal reason).
- Requires `daemon.control` and a successful peer re-check.
- Behavior, results, and exit codes are defined in `D-05`.

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
- Before every privileged action (create, controller attach, abort, kill,
  transfer, detach-other, stop), the daemon re-verifies the captured peer: the
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
  record, and exits with code 6. The client verifies the endpoint owner, mode,
  and server identity before its first request and refuses an endpoint it
  cannot attribute.
- The daemon keeps the single-instance lock for its whole lifetime. A second
  start fails with a typed "already running" result; stale socket files are
  removed only while holding the lock.

### Error taxonomy mapping

Transport and framing errors stay in the accepted `bitty-ipc` taxonomy. Session
outcomes are service results, never transport errors, and the two are never
substituted for each other.

| Condition                           | Result                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| Major or minor version mismatch     | `VersionMismatch` (transport-level)                                            |
| Peer credential failure             | `Unauthenticated`                                                              |
| Endpoint tamper                     | `Unauthenticated`, then daemon exit 6                                          |
| Frame or payload over bound         | `FrameTooLarge` / `PayloadTooLarge` / `LimitExceeded` with counts              |
| Pending-request or queue over bound | `PendingLimitExceeded` / `ChannelFull`; control frames close the lease instead |
| Rate limit                          | `Denied/RateLimited`                                                           |
| Missing scope                       | `Denied/ScopeViolation`                                                        |
| Worker kind disabled                | `Denied/UnsupportedCapability`                                                 |
| Unsupported platform cell           | `Denied/UnsupportedPlatform`                                                   |
| Instance mismatch                   | `Denied/StaleInstance`                                                         |
| Generation mismatch                 | `Denied/StaleGeneration` with current generation and revision                  |
| Unknown, collected, or unauthorized | `NotFound`                                                                     |
| Controller already held             | `Denied/ControlHeld`                                                           |
| Session stopping                    | `Denied/SessionStopping`                                                       |
| Terminal session mutation           | `Denied/NotRunning` or the terminal snapshot for an idempotent repeat          |
| Duplicate live terminal id          | `Denied/TerminalAlreadyHosted`                                                 |
| Active sessions on default stop     | `Denied/ActiveSessions` with counts                                            |
| Drain already in progress           | `Denied/DaemonStopping`                                                        |
| Idempotency fingerprint conflict    | `Denied/IdempotencyConflict`                                                   |
| Idempotency store full              | `Denied/IdempotencyCapacity`                                                   |
| Terminal event could not be queued  | Close the lease with `Denied/TerminalEventLost`                                |
| Request deadline                    | `Timeout` with the request id and bound                                        |
| Audit sink unavailable              | `Denied/Internal`, no state change, `audit_degraded=true`                      |
| Invariant failure                   | `Internal`, fail closed, no partial state                                      |

The `Denied.code` values above are a closed service-level set. Unknown codes
are surfaced as a static `Internal` and never parsed as text. Refusals carry
counts, bounds, and static codes only; no caller bytes, path, terminal text, or
another session's details.

## State transitions and disposition

| Event                                | Session and worker outcome                                                                               | Counters and leases                                                           | Client-visible result                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Client transport closes, no detach   | Worker continues; session stays `running`; derived `attached` becomes false when the last lease expires. | Generation unchanged; lease expires after the TTL; attach count decrements.   | No terminal event; the next status shows `attached=false`.                         |
| Explicit detach                      | Worker continues; session stays `running` or detached.                                                   | Lease removed immediately; revision increments.                               | Detach acknowledgement; a repeat is `not_attached`.                                |
| Controller abort, current generation | Worker terminated under supervision; reason `consumer_cancel`.                                           | Generation unchanged; revision increments; repeat returns the terminal state. | Terminal event with reason, actor, and cleanup.                                    |
| Controller abort, timeout reason     | Same as above with `consumer_timeout`.                                                                   | Same as above.                                                                | Terminal event distinguishable from cancellation.                                  |
| Abort with stale generation          | No state change; worker untouched.                                                                       | Current generation and revision returned.                                     | `StaleGeneration`; the adapter reconciles and stops.                               |
| Unauthorized abort or detach         | No state change.                                                                                         | None.                                                                         | Static denial or `NotFound`; no target details.                                    |
| Worker crash by signal               | Session becomes `failed`; signal and cleanup recorded; no restart.                                       | Generation unchanged; terminal state immutable.                               | Terminal event; a retry is a new session.                                          |
| Worker normal exit                   | Session becomes `exited`; exit code recorded; no restart.                                                | Same as above.                                                                | Terminal event; process exit 0 is not task success.                                |
| `daemon.stop` default with sessions  | No session changes; typed refusal with counts.                                                           | None.                                                                         | `ActiveSessions`; CLI exit 3.                                                      |
| `daemon.stop drain`                  | Notify, refuse new work, wait the deadline, then terminate the remainder.                                | Each transition attributed and revisioned.                                    | `daemon_stopping` then terminal events, or `TerminalEventLost` for a closed lease. |
| `daemon.stop force`                  | All active sessions terminate with `daemon_stop`, reaped and recorded.                                   | Same as above.                                                                | Terminal events where the transport exists; otherwise the client reconciles.       |
| Daemon crash                         | No terminal state guaranteed; workers may be orphaned.                                                   | Registry gone; next start has a new instance id.                              | Transport failure, then `StaleInstance`/`NotFound`; outcome unknown.               |
| Clean daemon restart                 | All sessions end; no persistence.                                                                        | New instance id; empty registry.                                              | `StaleInstance`; never resumed.                                                    |
| Request or transport timeout         | State unchanged unless the request reached the server.                                                   | Outcome may be unknown; no partial state.                                     | Typed timeout; reconcile with status, retry only with key and generation.          |
| Lease expiry / last-seen stale       | Detach only; worker continues.                                                                           | Attach count decrements; generation unchanged.                                | No terminal event; status shows detached.                                          |
| Reattach, same client                | New controller lease with the token; worker continues.                                                   | Generation must match; snapshot at the current revision.                      | Snapshot plus `backlog_truncated` when history was dropped.                        |
| Reattach, different client           | Observer by default; control requires a transfer.                                                        | New lease; attach count increments; generation unchanged.                     | Snapshot with role and co-attachment.                                              |
| Attach cap exceeded                  | Existing leases unaffected; the new attach is shed.                                                      | Attach count unchanged; refusal carries the cap.                              | Typed limit refusal; no tight retry loop.                                          |
| Terminal record collected            | Record removed after the TTL.                                                                            | Handle becomes unknown.                                                       | `NotFound`; treat as lost, never as success.                                       |
| Host reboot                          | All sessions gone; no persistence promise.                                                               | New instance, new identity, empty registry.                                   | `StaleInstance` or unavailable; do not resume.                                     |
| Session id reused across instances   | Never binds a stale client to a new session.                                                             | Instance mismatch refused before lookup.                                      | `StaleInstance`; never session-id-only fencing.                                    |
| Orphan exact identity after crash    | The old worker is reaped if the recorded identity verifies; never adopted.                               | New instance has no lease or revision for it.                                 | No client event; `daemon.status` reports the reap count.                           |
| Unverifiable orphan                  | Never signalled; reported.                                                                               | None.                                                                         | `daemon.status` reports `orphan_unverified`.                                       |

## Conformance matrix

The vector set is the Wheel consumer set `V-01` through `V-34`, plus Core
vectors `C-01` through `C-08` for properties a consumer adapter cannot prove.
"Fake" is what a fake server can validate with injected time and limits. "Real"
names what only the real service can prove.

| Vector | Area            | Decisions        | Fake server                                                                  | Real service requirement                                                         |
| ------ | --------------- | ---------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| V-01   | Handshake       | D-08, D-11, D-14 | Yes: all fields, fresh instance, server-assigned client id, limits present   | Required on each advertised cell for identity facts.                             |
| V-02   | Handshake       | D-11             | Yes: typed refusal, connection closed, no downgrade                          | Required to prove the real binary honors its own version.                        |
| V-03   | Handshake       | D-01             | Yes: `worker_sessions=false` and typed unsupported                           | Required to prove the delivered daemon advertises false and spawns nothing.      |
| V-04   | Handshake       | D-14             | Yes: frame-bound refusal with actual and limit                               | Required for real transport framing.                                             |
| V-05   | Attach          | D-03, D-09       | Yes: observer lease, count, revision, distinct attach id                     | Required for real lease lifecycle.                                               |
| V-06   | Attach          | D-09, D-12       | Yes with injected clock: expiry detaches, worker alive, generation unchanged | Required to prove no abort on silence.                                           |
| V-07   | Attach          | D-09, D-18       | Yes: idempotent detach, no revision change on repeat                         | Required for real registry behavior.                                             |
| V-08   | Attach          | D-14             | Yes with injected cap: shed, no eviction                                     | Required to prove the compiled cap and advertised value agree.                   |
| V-09   | Attach          | D-07             | Yes: uniform `NotFound`, no content                                          | Required to prove peer filtering and audit attribution.                          |
| V-10   | Attach          | D-09             | Yes: two leases, only one controller                                         | Required for real lease identity.                                                |
| V-11   | Lifecycle       | D-03, D-04       | Yes: simulated cancellation and terminal snapshot                            | Required for real signal, reap, and terminal reason.                             |
| V-12   | Lifecycle       | D-03             | Yes: stale generation refusal, no state change                               | Required to prove the real counter cannot be spoofed.                            |
| V-13   | Lifecycle       | D-07             | Yes: scope/token denial and static result                                    | Required for real peer and scope evaluation.                                     |
| V-14   | Lifecycle       | D-04, D-17       | Partial: simulated crash and terminal event                                  | Required: real signal death, cleanup, no restart.                                |
| V-15   | Lifecycle       | D-04, D-17       | Partial: simulated normal exit                                               | Required: real wait status and immutable terminal record.                        |
| V-16   | Stop            | D-05             | Yes: typed active-session refusal                                            | Required: CLI exit code and daemon still running.                                |
| V-17   | Stop            | D-05             | Partial: protocol shape of force stop                                        | Required: real two-session force, terminal events, reaping.                      |
| V-18   | Restart         | D-02, D-06       | No: instance change can be simulated, not a crash                            | Required: real crash, new instance, stale handle, empty registry.                |
| V-19   | Timeout         | D-13, D-18       | Yes with injected request deadline                                           | Required: real request bound and dedupe.                                         |
| V-20   | Retention       | D-14             | Yes with injected clock                                                      | Required: real TTL and collection.                                               |
| V-21   | Reattach        | D-10             | Yes: snapshot, bounded backlog, truncation marker                            | Required: real retained ring behavior.                                           |
| V-22   | Reattach        | D-09             | Yes: second client observer, no control transfer                             | Required: real lease and token checks.                                           |
| V-23   | Bounds          | D-14             | Yes: pending cap shed                                                        | Required: real queue pressure and attribution.                                   |
| V-24   | Bounds          | D-12, D-14       | Yes with injected clock: partial frame closed                                | Required: real socket stall and isolation.                                       |
| V-25   | Trust (Unix)    | D-07, D-15       | No                                                                           | Required: second uid; peer rejection before parsing.                             |
| V-26   | Trust (Unix)    | D-07, D-15       | No                                                                           | Required: endpoint mode/owner tamper and fail-closed exit.                       |
| V-27   | Trust (Windows) | D-15             | No                                                                           | Required on a Windows runner: SID mismatch and remote-pipe rejection.            |
| V-28   | Trust           | D-15             | No                                                                           | Required: startup scan shows no TCP listener.                                    |
| V-29   | Adapter         | D-01             | Yes: driver with no server returns typed unavailable                         | Adapter-only; the real daemon absence is a supported state.                      |
| V-30   | Adapter         | D-01             | Yes: fake daemon receives no connection                                      | Adapter-only.                                                                    |
| V-31   | Adapter         | D-13, D-18       | Yes: drop during abort, unknown outcome, reconcile                           | Required to prove the real request cannot be applied twice.                      |
| V-32   | Adapter         | D-07             | Yes: fake server counts exactly one abort and sees no pid                    | Required to prove no out-of-band signal path.                                    |
| V-33   | Adapter         | D-16             | Yes: fake server identity fields in Wheel audit                              | Adapter-only; the real audit content rule is C-07.                               |
| V-34   | Cancellation    | D-04, D-13       | Yes: distinct simulated reasons                                              | Required: real cancel and timeout reasons and cleanup.                           |
| C-01   | Identity        | D-02             | No                                                                           | Instance id freshness, session id non-reuse, terminal id uniqueness.             |
| C-02   | Trust           | D-07             | No                                                                           | Peer re-check before each privileged action, including after peer exit.          |
| C-03   | Orphans         | D-06             | No                                                                           | Exact-identity orphan reap; pid-reuse and unverifiable records never signalled.  |
| C-04   | Counters        | D-03             | Partial: revision increments can be simulated                                | Real revision increments and no increment on heartbeat.                          |
| C-05   | Containment     | D-14             | Partial: refusal shapes                                                      | Real refusal leaves no partial state; daemon survives.                           |
| C-06   | Events          | D-10             | Yes with injected queue pressure                                             | Real control frame is never shed; `TerminalEventLost` on failure.                |
| C-07   | Audit           | D-16             | No                                                                           | Audit sink modes, content-free records, bounded rotation, `audit_degraded`.      |
| C-08   | Daemon absence  | D-01, D-05       | Yes: no endpoint                                                             | Real `bitty --safe`, headless tests, and plain invocation work without `bittyd`. |

Vectors blocked by an earlier decision are now unblocked by this contract:
V-03 by D-01, V-08/V-20 by D-14, V-16/V-17 by D-05, V-18 by D-06, V-10/V-22 by
D-09, and V-25/V-27 by D-15. No vector remains blocked on an unanswered
decision; V-25/V-27 remain gated on test infrastructure, not on the contract.

## Fake-server-first harness plan

The sequence exists so consumer work is not serialized behind a daemon. It does
not turn fake-server results into daemon evidence.

1. **Freeze the corpus (contract promotion).** The vector table, assertions,
   injected limits, and typed results are the shared corpus. A test driver may
   not fork expectations; a disagreement is a contract defect.
2. **Fake server (Wheel CTX-0036).** Implement the candidate surface with
   injected monotonic time, injected limits, simulated lifecycle, transport
   fault injection, and a request log for V-32. Label every run
   `candidate-not-bittyd`. The fake server implements the handshake, create,
   status, list, attach, detach, abort, kill, heartbeat, stop modes, events, and
   the closed refusal set; it may simulate a worker but never claims a real
   process.
3. **Adapter suite (Wheel).** Run every fake-capable vector against the
   transport-injectable adapter. Assert typed results, resulting state, and the
   absence of partial state. Parameterize on advertised limits; never sleep on a
   wall clock; never hardcode a host path.
4. **Real service (Core).** Build `bittyd` and a conformance driver that runs
   the same corpus against the real service on Linux x86_64. Record per-vector
   pass/fail with the daemon instance, commit, and cell. A passing fake-server
   run is not evidence for this step.
5. **Platform cells (Core).** Repeat on Windows x86_64 and macOS ARM64 native
   runners before advertising those cells; then the Tier 2 cadence. A typed
   skip is recorded with its reason and is never counted as a pass.
6. **Trust and security vectors (Core + security reviewer).** Run the
   second-uid, endpoint-tamper, no-TCP, audit-mode, and orphan tests with the
   required privileged setup. These have no fake-server substitute.
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
labeled `feat`, `P1`, `area:architecture` and milestoned `v0.2.0`. None of them is authorized to merge before this contract is accepted
and the security review records its evidence.

| Issue      | Slice                           | Scope                                                                                                                                                                                                                                              | Depends on                |
| ---------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| bitty#2606 | Crate and binary seam           | New library crate plus a `bittyd` binary; one-way dependency direction from the daemon to `bitty-term-state`, `bitty-pty`, `bitty-plugin-host`, and `bitty-ipc`; no mechanism crate depends on the daemon; handshake skeleton and service version. | Contract acceptance       |
| bitty#2601 | Registry and generations        | Session records, instance/session ids, generation and revision counters, terminal-id uniqueness, retention, bounded registry, orphan records.                                                                                                      | Crate seam                |
| bitty#2607 | IPC service                     | `bitty-ipc` v1 server loop, handshake, peer capture and re-check, endpoint lock and tamper detection, scope evaluation, method dispatch, error mapping.                                                                                            | Crate seam                |
| bitty#2609 | Attach, detach, abort           | Leases, observer/controller roles, control token, control transfer, abort and kill pipeline, terminal reasons and cleanup classes.                                                                                                                 | Registry, IPC service     |
| bitty#2602 | Event stream                    | Snapshot plus bounded backlog, revision ordering, control-frame reservation, terminal guarantee, `TerminalEventLost`, heartbeat and last-seen.                                                                                                     | Registry, attach          |
| bitty#2603 | Limits and retention            | Compiled system maxima, advertised limits, registry and lease caps, event ring, idempotency store, retention TTL, audit sink bounds, fail-closed degradation.                                                                                      | Registry, events          |
| bitty#2604 | Platform cells                  | Unix socket and peer credentials on Linux/macOS/FreeBSD; Windows named pipe and SID; single-instance lock; unsupported-cell refusal; native-runner evidence.                                                                                       | IPC service               |
| bitty#2605 | Conformance harness             | Shared corpus runner, fake-server parity driver, real-service driver, injected time/limits, evidence records, CI wiring.                                                                                                                           | All implementation slices |
| bitty#2608 | Security review and P0 evidence | Threat-model and risk-register update, P0-AC-021..026 evidence, secret minimization, child-scope proof, audit content proof, operator-capability review, and the D-01 worker-enablement recommendation.                                            | All implementation slices |

The bitty-ai/Wheel adapter dependency is explicit:

- Wheel CTX-0036 owns the transport adapter and the fake server. It starts
  against the candidate surface, with `worker_sessions=false`, and can proceed
  in parallel with Core implementation.
- Wheel must not implement a daemon, registry, attach protocol, or worker
  supervisor. `wheel-session` stays a prototype and is not the contract.
- Wheel's hosted worker path stays disabled until the `worker_sessions`
  capability is advertised after the D-01 gate; the adapter must return a typed
  unavailable/unsupported result instead of falling back to an in-process run.
- The Core conformance corpus is the only definition of expected behavior. Wheel
  and Core may not maintain divergent expectations.

## Security review

This candidate decides a trust-bearing local service surface. It weakens no
accepted control, and it does not claim any control is implemented. The review
must confirm each item below before promotion.

| Control                                  | How this contract preserves it                                                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-AC-021 endpoint and peer credentials  | Filesystem socket in an owner-private `0700` directory, socket `0600`, peer credentials checked before parsing, re-checked before privileged actions, tamper detection exits 6, no TCP. Windows uses a current-user DACL, pid plus SID, remote rejection. |
| P0-AC-022 per-action scopes              | A new deny-by-default `session.*` and `daemon.*` family, evaluated server-side on every request; no ambient grant from a connection or handle; `terminal.*` is not stretched.                                                                             |
| P0-AC-023 child process scope limitation | The child receives an explicit bounded environment and never the daemon's environment, service token, socket path, operation capability, or secrets. The control token never enters a child.                                                              |
| P0-AC-024 Agent read-only default        | The service carries no terminal content, prompts, or tool output; worker hosting is disabled; an Agent consumer gets no content authority from a session lease.                                                                                           |
| P0-AC-025 DevTools scopes                | Unchanged; the session family does not grant debug, trace, or control scopes.                                                                                                                                                                             |
| P0-AC-026 secret minimization            | Audit and diagnostics are content-free; no argv, env, PTY bytes, clipboard, prompt, provider payload, token, or capability value; owner-private modes; no service audit read.                                                                             |
| Bounded persistence                      | The registry is in memory; audit and orphan records are bounded and owner-private; sessions never survive a restart; retention is bounded.                                                                                                                |
| Single writer                            | `bittyd` alone writes registry, lifecycle, counters, leases, and last-seen; consumers alone write their own state; clients mutate only through generation-checked methods.                                                                                |
| Containment                              | A refusal, limit violation, or one session's fault leaves no partial state and does not take the daemon down; audit failure fails closed for mutations.                                                                                                   |
| Daemon absence                           | `bitty --safe`, headless tests, and plain invocation work without `bittyd`; the daemon is never a startup, diagnostics, or safe-mode dependency.                                                                                                          |

New mechanisms that the review must scrutinize:

1. The **control token** is a new session-scoped bearer secret. It is not a
   daemon-wide or user-wide credential, is never logged or inherited, and is
   stored as a digest. The review must confirm that a same-user process cannot
   use it to cross a session boundary and that losing it degrades to
   observation, not to a privileged reset path.
2. The **operator capability** is a per-boot owner-private file. It is an
   explicit-intent gate, not a privilege boundary, because any same-user process
   can read a `0600` file. The review must confirm that this is stated honestly
   and that the capability is absent from environments, children, logs, and
   consumer surfaces.
3. **Explicit child environments** change the spawn path from inheritance to
   construction. The review must confirm that no daemon secret can leak through
   defaults, that argv and env are never recorded, and that terminal behavior
   remains correct when the client supplies its environment.
4. **Orphan reaping** signals processes after a crash. The exact-identity rule
   (boot id, pid, start time, recorded group) and the never-signal-unverified
   rule must be reviewed against pid reuse and process-group reuse.
5. **Worker enablement** remains disabled. The review must not treat the
   contract's worker vocabulary as authorization; enabling it needs the ADR
   amendment and the dedicated review named in D-01.

No accepted P0 criterion is downgraded to a suggestion. Where a mechanism is
new, it is additive and deny-by-default; where a control cannot yet be
evidenced (no daemon exists), the gap is recorded rather than claimed.

## Verification plan

Before promotion:

1. Independent security review of this document against the security corpus and
   the `bitty-ipc` accepted bounds, with a recorded APPROVE or a defect list.
2. Owner sign-off on D-01, D-05, D-07, D-14, and D-15, because they decide
   scope, destructive behavior, authority, and platform claims.
3. Cross-check that every `D-01` through `D-18` answer cites a source where it
   restates one, and that no answer weakens an accepted control.
4. `just check` green in `bitty-terminal-docs` and `act -n` for the workflow
   syntax, with no external provenance references and English-only content.

Before the first implementation merge:

1. The implementation issues reference this contract and the accepted
   promotion record; no issue starts before acceptance.
2. The fake-server suite passes every fake-capable vector and is labeled
   candidate-only.
3. The real-service suite passes `C-01` through `C-08` and the real-required
   vectors on Linux x86_64.
4. The security review records P0 evidence for P0-AC-021 through P0-AC-026 and
   the single-instance, tamper, child-scope, audit, and daemon-absence proofs.
5. A second cell is advertised only after its native-runner run is recorded.

Definition of done for this contract task: decisions recorded, service surface
stated, conformance matrix complete, harness plan written, implementation issues
filed, `just check` green, and the PR opened. The contract is not merged here;
owner and security review are the merge gate.

## Alternatives considered

| Alternative                                    | Trade-off                                                                                                                                                                  | Disposition                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Host agent workers in v0.2.0                   | Would let Wheel's hosted path land sooner; adds generic process supervision and credential-inheritance risk to a daemon that holds secrets, without an ADR 0019 amendment. | Rejected for v0.2.0; the kind is defined and capability-gated, with a named enablement gate. |
| Reuse `terminal.*` scopes for session control  | No new scope vocabulary; would silently grant terminal authority to an Agent client and collapse consent domains.                                                          | Rejected; the session family is separate and `terminal.*` stays authoritative for content.   |
| One counter instead of generation and revision | Simpler; cannot fence "wrong worker" and "stale snapshot" independently.                                                                                                   | Rejected.                                                                                    |
| Controller identity as `client_id`             | No token to manage; dies on reconnect and makes ownership unstable.                                                                                                        | Rejected; the control token survives reconnect and is session-scoped.                        |
| Abort on silence                               | Cleans up idle work automatically; destroys a long run because a client paused.                                                                                            | Rejected; staleness detaches only.                                                           |
| Persistent sessions across daemon restart      | Survives crashes; conflicts with the explicit v0.2.0 exclusion and the bounded-persistence rules.                                                                          | Rejected for v0.2.0.                                                                         |
| Force stop by default                          | Simple operator UX; silently destroys another client's work.                                                                                                               | Rejected; refuse by default, explicit drain and force.                                       |
| Adopt orphans after a crash                    | Preserves work; creates duplicate-side-effect and ambiguous-ownership risk with no persistence contract.                                                                   | Rejected; exact-identity reap only, never adoption.                                          |
| One controller or no observer multi-attach     | Simplest authority; loses the operator/observer and second-viewer use cases.                                                                                               | Rejected; one controller plus bounded observers with explicit transfer.                      |
| Poll-only event delivery                       | Simplest; makes terminal-event loss silent and pushes latency to the consumer.                                                                                             | Rejected; ordered stream plus authoritative status.                                          |
| Per-feature capability bits without a version  | Small; makes incompatible changes indistinguishable from additive ones.                                                                                                    | Rejected; version plus explicit capabilities.                                                |
| Unbounded event replay on reattach             | Complete history; violates bounded persistence and memory ceilings.                                                                                                        | Rejected; bounded backlog with an explicit truncation marker.                                |
| A single daemon-wide admin token               | Simple operations; a durable user-wide credential with a larger blast radius than the per-session token.                                                                   | Rejected; per-session control token plus per-boot operator capability.                       |
| A one-time peer check at connect only          | Fewer syscalls; fails open on inherited descriptors and pid reuse.                                                                                                         | Rejected; privileged actions re-check the captured peer.                                     |

## Affected contracts

| Contract                                                                                                                             | Effect                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Unchanged and authoritative. This document supplies the session-host mechanics under its definitions, ownership, persistence, and trust gates.                                            |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | Unchanged. D-01 does not expand the slice; worker enablement requires an amendment.                                                                                                       |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Unchanged; D-15 applies its tiers to the daemon cells.                                                                                                                                    |
| `bitty-ipc` v1 (accepted)                                                                                                            | Consumed unchanged for framing, peer credentials, error classes, and RC-9/RC-10. The additive `session.*`/`daemon.*` scope family needs one registry revision; no existing scope changes. |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | Unchanged; the service uses its transport and method grammar and adds no content plane.                                                                                                   |
| Security corpus (normative)                                                                                                          | Requires a threat-model, risk-register, and P0-evidence update before implementation; this document adds no control weakening.                                                            |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (candidate)                                             | Its D items are answered here; its vectors feed the conformance matrix. It remains a consumer input, not an authority.                                                                    |
| [Specifications register](README.md)                                                                                                 | Gains a Draft-table row; the Wheel requirements document gains a Core response pointer.                                                                                                   |
| bitty#2546, #2064, #2218                                                                                                             | Contract decided; implementation issues are filed as children of #2546.                                                                                                                   |
| bitty-execution execution-supervisor contract                                                                                        | No change. Worker hosting, if enabled later, must define its relationship to the existing execution-supervisor boundary rather than duplicate it.                                         |

## Open points

These are not globally numbered open questions. They stay here until one blocks
a current-milestone gate; the decisions above do not depend on them.

- Owner sign-off and independent security-reviewer sign-off (promotion gate).
- D-01 worker enablement: the ADR 0019 amendment and the spawn/credential
  security review. Tracked by the security review issue.
- Operator-capability mechanism: file versus a distinct operator endpoint. The
  requirement (explicit operator grant) is decided; the mechanism is a security
  review choice.
- Whether the session scope family is registered in `bitty-ipc` or in a
  bittyd-owned service-scope registry. It must be one additive registry, and no
  existing `bitty-ipc` scope may change meaning.
- Exact JSON key spellings and frame layout, frozen by the first implementation
  and the conformance corpus.
- Orphan-journal fsync cadence and the exact process-identity syscalls per cell.
- Windows integrity-level and AppContainer rule details beyond "fail closed".
- Audit sink implementation detail (file versus an equivalent owner-private
  sink) beyond the stated properties.
- Platform advertisement order after Linux x86_64, driven by native-runner
  evidence.

## Acceptance criteria

This contract is complete when:

1. D-01 through D-18 are decided, internally consistent, and traceable to an
   accepted source where they restate one.
2. The service surface covers handshake, create, status, list, attach, detach,
   abort, kill, stop/drain/force, events, heartbeat, stale-handle refusal,
   peer re-check, and the error taxonomy.
3. The conformance matrix maps every `V-01` through `V-34` vector to decisions
   and states what a fake server can and cannot validate.
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

## P0 Review Sign-off

Not signed in this wave. This is a candidate, and the security review is a
promotion gate, not a formality.

| Reviewer                   | Required for                                                                                  | Status  |
| -------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| Project initiator (owner)  | D-01, D-05, D-07, D-14, D-15 and final promotion                                              | Pending |
| Security reviewer          | Trust boundary, scopes, tokens, operator capability, audit, child environment, orphan reaping | Pending |
| Core architecture reviewer | Crate seam, single-writer rule, registry and counter semantics                                | Pending |
| Wheel consumer reviewer    | Adapter boundary and vector mapping                                                           | Pending |

The security reviewer must record an explicit APPROVE or a defect list in the
promotion PR. A missing sign-off is a merge blocker, not a comment.

## References

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
  RC-9/RC-10 framing, peer credentials, scope families, and bounds.
- [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) - define the
  bittyd session-host contract for long-running Agent workers.
- [bitty#2064](https://github.com/bitty-terminal/bitty/issues/2064) - bittyd core
  service host: lifecycle, single instance, IPC.
- [bitty#2218](https://github.com/bitty-terminal/bitty/issues/2218) - built-in
  multiplexer story: detach/attach and session persistence (design first).
