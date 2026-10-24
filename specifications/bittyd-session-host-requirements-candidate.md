---
title: Wheel consumer requirements for the bittyd session host (Candidate)
description: Draft consumer requirements from Wheel for the Core-owned bittyd session-host contract, covering field authority, lifecycle disposition, bounds, trust posture, adapter boundary, and conformance vectors
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 79
---

# Wheel consumer requirements for the bittyd session host (Candidate)

## Document status

> Status: **design input. Not an accepted contract and not implementation
> evidence.** This document records what Wheel needs from the Core-owned
> `bittyd` session-host contract ([bitty#2546], [bitty#2064], [bitty#2218]) and
> the conformance vectors Wheel will run against that contract. `bittyd` does
> not ship today, no contract in this area is accepted, and nothing here
> authorizes daemon, transport, registry, or fake-server code.
>
> Field names, method names, state names, error codes, and numeric service
> limits below are either quoted from an accepted source or explicitly marked
> as open (`D-nn`). Candidate spellings exist only to make the requirements
> testable; Core owns the final vocabulary.

| Control           | Value                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| Status            | Design input, unreviewed, not accepted                                      |
| Owner             | Wheel CTX-0035                                                              |
| Upstream contract | bitty#2546 (with #2064 and #2218); `bittyd` does not ship                   |
| Downstream use    | Wheel CTX-0036 transport adapter and fake-server conformance suite          |
| Evidence status   | No test vector in this document has been executed against a real `bittyd`   |
| Change authority  | Wheel may record consumer requirements; Core and the security corpus decide |

> **Core response.** The Core-owned answers to `D-01` through `D-18`, the
> service surface, and the conformance harness plan are recorded in the
> [bittyd Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md).
> That contract is a candidate until owner and security review; this document
> remains the consumer input, and the contract states the Core answer wherever
> the two differ.

## 1. Purpose and scope

Wheel is the Coding Agent Harness and runs as an independent out-of-process
harness. In the hosted model this document targets, its agent work runs in a
worker process supervised by a session host. Wheel must not implement a
long-lived daemon, session registry, attach protocol, or worker supervisor. The
pending Core contract moves those concerns into `bittyd`. Wheel therefore needs
to state, before the contract is frozen:

1. which session, client, generation, attach-count, last-seen, and lifecycle
   fields the adapter depends on;
2. which actor may attach, detach, abort, or stop, and with what attribution;
3. what happens on every disconnect, crash, restart, timeout, and reattach path;
4. what trust posture and what bounds the service must provide;
5. exactly which concerns stay in Wheel and which move to `bittyd`;
6. a test-vector set that can run against a fake server first and the real
   service later;
7. the decisions Core must make, recorded as open rather than assumed.

In scope: the consumer-facing requirements and the conformance matrix. Out of
scope: the contract itself, any wire format, any daemon design, and any claim
that a mechanism exists.

Requirement levels used below:

- `R-*` — a Wheel consumer requirement. Core may satisfy it differently, but
  Wheel needs the property, not the spelling.
- `D-*` — an open decision owned by Core (with security co-ownership where the
  trust boundary changes). No answer is recorded in this document.
- `Q-*` — a narrower trust question that blocks adapter implementation.
- `V-*` — a conformance test vector.
- `N-*` — a non-goal.

## 2. Normative sources and boundary

This document does not weaken any accepted record. It is subordinate to them:

| Source                                                                                                                              | What it binds here                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008] (accepted)                                                                                                               | Daemon definitions, PTY ownership, bounded persistence, and both trust-boundary gates remain authoritative.                                                                                                                                                                                                             |
| [ADR 0019] (accepted 2026-10-22)                                                                                                    | The v0.2.0 slice: single instance per user via socket lock, peer-credential IPC re-checked before privileged actions, thin clients, session-grained attach/detach, per-domain single-writer, service API versioning from day one. Remote UI, sessions surviving a daemon restart, and autostart stay outside the slice. |
| [bitty#2546]                                                                                                                        | Contract scope and the required decision list this document feeds.                                                                                                                                                                                                                                                      |
| [bitty#2064]                                                                                                                        | Core service host: lifecycle, single instance, IPC.                                                                                                                                                                                                                                                                     |
| [bitty#2218]                                                                                                                        | Attach/detach and persistence design; remote sessions separately deferred.                                                                                                                                                                                                                                              |
| [bitty-ipc] transport bounds                                                                                                        | Accepted RC-9/RC-10 framing, queue, rate, and connection ceilings; the floor for any `bittyd` service limits.                                                                                                                                                                                                           |
| [`SECURITY-MODEL.md`](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md)                                          | Wheel's authority policy, same-user residual, audit fail-closed rules, and the statement that daemon scope is not Wheel's.                                                                                                                                                                                              |
| [`README.md` § Local Session Daemon](https://github.com/bitty-terminal/wheel/blob/main/README.md#local-session-daemon-experimental) | `wheel-session` is a prototype and transport reference, not the final daemon.                                                                                                                                                                                                                                           |
| [wheel#101] / CarryCtx `PX-0195`                                                                                                    | Wheel cancellation remains blocked on the `bittyd` session-host contract; only the non-daemon process primitive was re-scoped.                                                                                                                                                                                          |
| Wheel cancellation design input (2026-10-22)                                                                                        | Cancellation must stay distinguishable from timeout in both result and audit.                                                                                                                                                                                                                                           |

Consequences that constrain every later section:

- `bittyd` is same-user infrastructure, not a privilege boundary. Nothing here
  may be read as multi-user authentication or as isolation from a compromised
  account.
- The v0.2.0 slice does not persist sessions across a daemon restart. Wheel
  therefore cannot require continuation after restart and must surface loss
  instead of implying recovery.
- Wheel must keep working with no daemon present. `bittyd` may not become a
  startup, diagnostics, or safe-mode dependency.
- No TCP listener and no remote transport is part of this requirement set.

## 3. Terminology

| Term                | Meaning in this document                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Session             | One unit registered and supervised by `bittyd`. For Wheel, one hosted agent-worker run.                                                       |
| Client              | A process attached to a session: a panel/TUI, an operator CLI, or the Wheel adapter process.                                                  |
| Attach              | A lease binding one client connection to one session for events and, optionally, control.                                                     |
| Detach              | Removing an attach lease without ending the session or its worker.                                                                            |
| Worker              | The process `bittyd` supervises. For Wheel, the harness worker process that owns the run.                                                     |
| Worker generation   | A monotonically increasing fence for the worker binding of one session. It answers "which worker does this request target".                   |
| State revision      | A monotonically increasing fence for lifecycle and attachment changes of one session. It answers "is this snapshot older than my view".       |
| Daemon instance     | One `bittyd` process lifetime, identified by a fresh instance id on every start.                                                              |
| Service API version | The versioned `bittyd` contract version, negotiated at connect and refused on mismatch rather than half-honored.                              |
| Terminal state      | A lifecycle state after which the session never runs again. Terminal states are immutable.                                                    |
| Orphan              | A worker process still alive with no live registry entry, for example after a daemon crash.                                                   |
| Adapter             | The Wheel-side boundary that maps Wheel run control onto the `bittyd` service API. It owns no lifecycle truth of its own.                     |
| Fake server         | A test peer that implements the published surface to run conformance vectors before the real service exists. It is not evidence for `bittyd`. |

Two counters are required rather than one because they fence different mistakes.
A single counter cannot both refuse "abort the wrong worker" and order "this
snapshot predates my detach" without overloading transitions. Core may collapse
them only if both properties survive; that choice is `D-03`.

## 4. Required session and client fields

Field names are candidate. Every row states the property Wheel depends on, not a
wire spelling.

### 4.1 Handshake and connection

| Field (candidate)     | Semantics                                                                                 | Authority                         | Wheel requirement |
| --------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- | ----------------- |
| `service_api_version` | Contract version of the service, plus the supported client range.                         | Server, immutable per connection  | `R-S01`           |
| `daemon_instance_id`  | Fresh opaque value per daemon start; changes on every restart.                            | Server, immutable                 | `R-S02`           |
| `daemon_pid`          | Observational only; never a signal or authority input.                                    | Server                            | `R-S03`           |
| `server_identity`     | What the client can verify about the server: OS identity and endpoint ownership facts.    | Server                            | `R-S04`           |
| `peer_identity`       | Authenticated peer facts: OS identity and process id for attribution.                     | Server, from the transport        | `R-S05`           |
| `client_id`           | Server-assigned identity for this connection. Client-supplied values are never authority. | Server                            | `R-S06`           |
| `client_instance`     | Optional consumer-supplied opaque value used only to correlate reconnects in audit.       | Client, ignored for authorization | `R-S07`           |
| `scopes`              | Effective scopes granted to this client, evaluated server-side.                           | Server                            | `R-S08`           |
| `capabilities`        | Advertised feature set, including whether worker sessions are hosted at all.              | Server                            | `R-S09`           |
| `limits`              | Advertised frame, queue, attach, retention, and timeout bounds.                           | Server                            | `R-S10`           |
| `server_monotonic_ms` | Monotonic server clock for age computation without trusting the client clock.             | Server                            | `R-S11`           |

`R-S01`: A version mismatch is a typed refusal before any session operation.
There is no "best effort" mode and no downgrade by feature probing.

`R-S02`: Session handles from one daemon instance must never resolve inside a
later instance. Session ids may be recycled only if the instance id fences them.

`R-S04`/`R-S05`: Wheel needs the server identity to refuse an endpoint it cannot
attribute, and the peer identity to write audit records that name the client
process. A pid is observational because pids are reused.

`R-S09`: The v0.2.0 slice is defined around terminal sessions. Whether it hosts
non-terminal agent workers is undecided (`D-01`). Capability advertisement lets
Wheel refuse cleanly instead of emulating a worker session it does not have.

### 4.2 Session record

| Field (candidate)                 | Semantics                                                                                  | Authority         | Wheel requirement |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------- | ----------------- |
| `session_id`                      | Opaque server-assigned id, unique within a daemon instance.                                | Server, immutable | `R-S12`           |
| `session_kind`                    | Kind of hosted unit, for example `worker`; prevents terminal-attach semantics on a worker. | Server, immutable | `R-S13`           |
| `owner_client_id`                 | Client that created the session; the default control owner.                                | Server, immutable | `R-S14`           |
| `lifecycle_state`                 | Current state from a closed set; terminal states are immutable.                            | Server only       | `R-S15`           |
| `generation`                      | Worker-binding counter; increments on each worker bind or rebind, never reused.            | Server only       | `R-S16`           |
| `state_revision`                  | Counter incremented on every lifecycle or attachment change.                               | Server only       | `R-S17`           |
| `attach_count`                    | Server-derived number of live attach leases. Never client-set or client-incremented.       | Server only       | `R-S18`           |
| `attached[]`                      | Bounded list of attach leases with client id, lease id, role, attach time, last seen.      | Server only       | `R-S19`           |
| `last_client_seen_at`             | Latest client activity, monotonic.                                                         | Server only       | `R-S20`           |
| `last_worker_seen_at`             | Latest worker liveness signal, if supervision provides one; not a client heartbeat.        | Server only       | `R-S21`           |
| `created_at` / `state_changed_at` | Wall-clock display values, never used for ordering or fencing.                             | Server only       | `R-S22`           |
| `worker_handle`                   | Opaque handle for correlation; not a pid and not a signal target.                          | Server            | `R-S23`           |
| `terminal_reason`                 | Typed reason for entering a terminal state, from a closed set.                             | Server only       | `R-S24`           |
| `requested_by`                    | Client or operator that requested the terminal transition, when there was one.             | Server only       | `R-S25`           |
| `worker_exit`                     | Exit code, signal, and cleanup classification for the worker process.                      | Server            | `R-S26`           |
| `created_by_kind`                 | Whether the session was created by a consumer, an operator, or the daemon itself.          | Server            | `R-S27`           |

`R-S12`: Wheel maps its own run identity to `session_id` and persists that
mapping itself. `bittyd` never stores Wheel task, context, or agent state.

`R-S16`: Every effectful request carries the generation the caller believes it
targets. The server refuses a mismatch instead of applying the effect to the
current worker. Attachment and detachment do not change the generation.

`R-S17`: Every response that carries session state includes the revision. Wheel
discards an older snapshot and never merges two revisions field by field.

`R-S18`: `attach_count` is derived from live leases. A client that loses its
transport must not be able to leave a stale increment behind after the lease
expires.

`R-S24`: Wheel needs at least these distinguishable classes, whatever the final
names: consumer-requested cancellation, consumer timeout, operator/administrative
termination, daemon stop, worker normal exit, worker crash, supervision failure,
and host shutdown. Conflating cancellation with timeout or crash breaks the
cancellation design and the audit record.

`R-S26`: The cleanup classification must tell Wheel whether the worker's process
tree was verifiably swept, could not be verified, or was never started. Wheel's
existing process primitive uses exactly this distinction and must not lose it at
the adapter.

### 4.3 Attach lease record

| Field (candidate)  | Semantics                                                                     | Authority | Wheel requirement |
| ------------------ | ----------------------------------------------------------------------------- | --------- | ----------------- |
| `attach_id`        | Identity of one attach lease, distinct from `client_id`.                      | Server    | `R-S28`           |
| `role`             | Observer or controller; observers never receive control authority implicitly. | Server    | `R-S29`           |
| `attached_at`      | Monotonic attach time.                                                        | Server    | `R-S30`           |
| `last_seen_at`     | Monotonic activity for this lease.                                            | Server    | `R-S31`           |
| `lease_expires_at` | Bounded lifetime after last activity; expiry detaches, never aborts.          | Server    | `R-S32`           |
| `scopes`           | Effective scopes for this lease, not for the connection as a whole.           | Server    | `R-S33`           |

`R-S28`: Detach and event routing operate on the lease, not only on the client,
so one client cannot detach another client's attachment by guessing an id.

## 5. Actor authority

Possession of a connection or a session id grants no authority. Every action is
authorized server-side against the authenticated peer and the session policy.
The exact policy is `D-07`; the matrix below records the shape Wheel needs.

Legend: **A** allowed, **D** denied, **P** policy-dependent (must be explicit and
attributed), **–** not applicable.

| Action                              | Owner client | Other attached client | Same-user, not attached | Operator client | `bittyd` supervisor | Worker itself |
| ----------------------------------- | ------------ | --------------------- | ----------------------- | --------------- | ------------------- | ------------- |
| Create/host a worker session        | A            | D                     | D                       | P               | P                   | –             |
| Attach as observer                  | A            | P                     | D                       | A               | –                   | –             |
| Attach as controller                | A            | D by default          | D                       | P               | –                   | –             |
| Detach own lease                    | A            | A                     | –                       | A               | –                   | –             |
| Detach another client's lease       | D            | D                     | D                       | P               | P                   | –             |
| Abort session                       | A            | P                     | D                       | A               | P                   | D             |
| Force-kill worker                   | D            | D                     | D                       | D               | A                   | –             |
| Stop the daemon                     | D            | D                     | D                       | P               | –                   | –             |
| List other sessions                 | D            | D                     | D                       | P               | A                   | –             |
| Mutate generation or lifecycle      | D            | D                     | D                       | D               | A                   | –             |
| Read events for an attached session | A            | A (own lease)         | D                       | A               | –                   | –             |

Requirements:

- `R-A01`: The creator is not automatically an administrator of the whole
  daemon. Creating one session must not grant listing, stopping, or aborting
  other sessions.
- `R-A02`: An observer lease is read-only until control is granted explicitly.
  Attaching a second client must not silently move abort authority.
- `R-A03`: Detaching another client's lease requires session-management
  authority and produces an attributed record naming the actor and the target.
- `R-A04`: Abort authority is session-scoped and explicit. The authenticated OS
  identity alone is not a grant; scope evaluation decides.
- `R-A05`: Only `bittyd` terminates the worker process. Clients request an
  abort; they never signal, never address a pid, and never receive a pid as an
  authority token.
- `R-A06`: The Wheel adapter never stops the shared daemon and never aborts a
  session it does not own. Daemon stop is an operator/user action.
- `R-A07`: A worker cannot abort itself through the service API; it exits, and
  the supervisor classifies the exit. This keeps "cancelled" distinguishable
  from "finished" and from "crashed".
- `R-A08`: Every denial is typed, static, and attributed. A denial must not echo
  session content, caller bytes, or another session's existence details.
- `R-A09`: A terminal session is read-only. Attaching for control, aborting, or
  mutating it after the terminal state is refused or answered with the immutable
  terminal snapshot, never with a new transition.

## 6. Lifecycle and disposition

### 6.1 Lifecycle state requirements

The state set is `D-04`; the properties are not:

- `R-L01`: States distinguish at least: not yet running, running with at least
  one attachment, running with no attachment, stop in progress, normal exit,
  crash/failure, and administrative termination.
- `R-L02`: "Running with no attachment" is a first-class state or an explicit
  flag. Wheel must be able to show that work continues with no client.
- `R-L03`: Terminal states are immutable. A new run gets a new session id and a
  generation starting from a fresh counter; a terminal session is never revived.
- `R-L04`: Every transition carries an attributed cause and a state revision.
  There is no unattributed state change.
- `R-L05`: A client disconnect, an expired lease, or a missed heartbeat is a
  client-lifecycle event. It must never be classified as a worker failure or a
  cancellation.
- `R-L06`: Worker supervision is authoritative. `bittyd` detects exit, records
  status and cleanup, and never reports a session as finished without a terminal
  state.
- `R-L07`: `bittyd` does not restart consumer workers on its own. Retry policy
  belongs to the consumer and produces a new session (`D-17`).

### 6.2 Timeout classes

"Timeout" is not one event. The adapter and the tests need these classes
separated:

| Class             | Owner  | Trigger                              | Effect                                           | Result class      | Retry rule                                      |
| ----------------- | ------ | ------------------------------------ | ------------------------------------------------ | ----------------- | ----------------------------------------------- |
| Transport idle    | bittyd | No complete frame within the bound   | Close that connection and expire its lease       | Transport timeout | Reconnect and reattach; reads may retry         |
| Request           | bittyd | A method exceeds its bound           | No partial state; outcome may be unknown         | Request timeout   | Reconcile with status before any mutating retry |
| Attach lease      | bittyd | Heartbeat older than the lease bound | Detach only                                      | Attach expired    | Reattach                                        |
| Session retention | bittyd | Terminal session older than the TTL  | Metadata collected                               | Unknown session   | No retry; treat as lost                         |
| Worker execution  | Wheel  | The run's own deadline               | Wheel requests abort with a timeout-class reason | Consumer timeout  | Wheel policy; new session for a retry           |

`R-L08`: `bittyd` must not impose a default execution deadline on an attached
worker. Transport and request bounds are limits on IPC, not on how long an agent
run may take.

`R-L09`: A consumer timeout is expressed as an abort with a distinguishable
reason class, so the terminal reason remains "timed out" rather than becoming a
generic user cancellation.

`R-L10`: A request timeout whose outcome is unknown must be reconciled against
`status` before the adapter retries any mutating operation. Blind retries are
forbidden because an abort retry can hit a newer generation.

### 6.3 Disposition matrix

This is the core of the document. Every row is asserted by at least one
conformance vector in § 10.

| ID   | Event                               | Session and worker outcome                                                                                                     | Generation / attach / last seen                                                                                  | Client-visible result                                                               | Wheel adapter obligation                                                                                               | Forbidden                                                                 |
| ---- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| L-01 | Client transport closes, no detach  | Worker continues. Session stays running; becomes detached when the last lease ends.                                            | Generation unchanged; lease expires after the grace bound; `attach_count` decrements.                            | No terminal event; next status shows detached.                                      | Mark the client lost, keep the run, reattach later. Never infer abort.                                                 | Abort on EOF; treat close as stop.                                        |
| L-02 | Explicit detach                     | Worker continues. Session stays running or becomes detached.                                                                   | Lease removed immediately; `attach_count` decrements; state revision increments.                                 | Typed detach acknowledgement with previous attach state; repeat is `not attached`.  | Release the lease and keep the session handle.                                                                         | Abort; detaching someone else's lease without authority.                  |
| L-03 | Consumer abort (current generation) | Worker terminated under supervision; terminal reason is consumer cancellation; cleanup classified.                             | Abort carries the current generation; terminal state keeps that binding; repeat returns the same terminal state. | Terminal snapshot with reason, actor, and cleanup.                                  | Record the cancellation request and the terminal outcome; distinguish from timeout.                                    | Claiming success before the terminal state; signalling the worker.        |
| L-04 | Operator abort                      | Same as L-03 with operator attribution and a management scope.                                                                 | Same as L-03.                                                                                                    | Terminal snapshot naming the operator action.                                       | Treat as an external stop; do not report it as a consumer cancellation.                                                | Hiding the actor; presenting it as a normal completion.                   |
| L-05 | Abort with a stale generation       | No state change. The current worker is untouched.                                                                              | Server returns current state, generation, and revision.                                                          | Typed stale-generation refusal.                                                     | Reconcile; do not auto-retry the mutating call with the refreshed generation.                                          | Applying the abort to the new generation; retrying silently.              |
| L-06 | Unauthorized abort or detach        | No state change.                                                                                                               | None.                                                                                                            | Typed denial, static, attributed.                                                   | Surface the denial; keep read-only access if still attached.                                                           | Leaking target details; falling back to a privileged path.                |
| L-07 | Worker crash                        | Session becomes failed; exit code, signal, and cleanup recorded; no automatic restart.                                         | Generation is unchanged by the crash; terminal state is immutable; a retry is a new session.                     | Terminal snapshot; attached clients are notified before retention expiry.           | Record a run failure; a retry is a new session.                                                                        | Silent restart; reporting success; classifying as user cancel.            |
| L-08 | Worker normal exit                  | Session becomes exited; status recorded; no automatic restart.                                                                 | Same as L-07.                                                                                                    | Terminal snapshot with exit status.                                                 | Record completion, not success, until Wheel's own verification passes.                                                 | Equating process exit 0 with task success.                                |
| L-09 | `bittyd stop` with active sessions  | Default behavior must be explicit: refuse with a typed active-sessions result, or enter a bounded drain that notifies clients. | No session is aborted without a terminal reason and attribution.                                                 | Typed refusal with counts, or a stopping notification followed by terminal reasons. | Wheel never initiates stop; if the host stops, mark runs interrupted.                                                  | Silent kill; exit status that hides refused work.                         |
| L-10 | `bittyd stop --force` (if provided) | All active sessions terminate with the daemon-stop reason; workers reaped; cleanup recorded.                                   | Each terminal transition is attributed and revisioned.                                                           | Terminal reasons delivered where the transport still exists.                        | Mark every hosted run interrupted; require an explicit user re-run.                                                    | Pretending the work can resume; partial teardown without terminal states. |
| L-11 | Daemon crash                        | No terminal state is guaranteed. Registry is gone; workers may be orphaned.                                                    | New instance id on the next start; old handles are unusable.                                                     | Transport failure, then a typed stale-instance or unknown-session result.           | Treat the outcome as unknown; reconcile before any retry; never assume continuation.                                   | Silent adoption of an orphan; fencing by session id alone.                |
| L-12 | Daemon restart (clean)              | All sessions end; the v0.2.0 slice does not persist them.                                                                      | New instance id; registry empty; old handles rejected.                                                           | Typed stale-instance or unknown-session result.                                     | Surface "host restarted"; do not resume.                                                                               | Claiming recovery; reusing the old mapping.                               |
| L-13 | Request or transport timeout        | Session state is unchanged unless the request reached the server.                                                              | Request timeout may leave the outcome unknown; no partial state.                                                 | Typed timeout class.                                                                | Reconcile via status; retry only idempotent reads, or a mutating call with the same generation and an idempotency key. | Treating an IPC timeout as worker failure; blind abort retry.             |
| L-14 | Last-seen stale / lease expiry      | Detach only; worker continues.                                                                                                 | `attach_count` decrements; generation unchanged.                                                                 | No terminal event; next status shows detached.                                      | Reattach when needed; keep the run.                                                                                    | Aborting idle sessions; treating silence as failure.                      |
| L-15 | Reattach, same client               | New lease on the same session; worker continues.                                                                               | Generation must match; snapshot at the current revision; bounded backlog.                                        | Snapshot plus a truncation marker when history was dropped.                         | Verify the instance and generation; adopt the snapshot; record any gap.                                                | Unbounded replay; assuming no events were lost.                           |
| L-16 | Reattach, different client          | Allowed only by multi-attach policy; observer by default; control transfer is explicit.                                        | New lease; `attach_count` increments; generation unchanged.                                                      | Snapshot with role and co-attachment list.                                          | Surface co-attachment; never assume exclusive control.                                                                 | Silent control steal; implicit abort of the previous controller.          |
| L-17 | Attach cap exceeded                 | Existing attachments unaffected; the new attach is shed.                                                                       | `attach_count` unchanged; refusal carries the advertised cap.                                                    | Typed limit refusal.                                                                | No tight retry loop; surface the condition.                                                                            | Evicting an existing client silently.                                     |
| L-18 | Terminal session collected          | Record removed after the retention bound.                                                                                      | Handle becomes unknown.                                                                                          | Typed unknown-session result.                                                       | Treat as lost, never as success.                                                                                       | Inferring a terminal reason after collection.                             |
| L-19 | Host reboot                         | All sessions gone; no persistence promise.                                                                                     | New instance, new identity, empty registry.                                                                      | Typed stale-instance or unavailable result.                                         | Surface the interruption; do not resume.                                                                               | Claiming crash recovery.                                                  |
| L-20 | Session id reused across instances  | Must never bind a stale client to the new session.                                                                             | Instance id mismatch is refused before session lookup.                                                           | Typed stale-instance result.                                                        | Never reuse the old mapping.                                                                                           | Session-id-only fencing; best-effort attach.                              |

## 7. Bounds, queues, and single-writer rules

### 7.1 Transport bounds to inherit, not reinvent

These are accepted `bitty-ipc` values. They are the floor for the `bittyd`
service and must not be duplicated as Wheel constants:

| Bound                               | Accepted value | Source                                         |
| ----------------------------------- | -------------- | ---------------------------------------------- |
| Frame payload                       | 256 KiB        | `bitty-ipc` framing                            |
| Streamed chunk                      | 256 KiB        | RC-10                                          |
| Pending requests per client         | 64             | `bitty-ipc` channel                            |
| Channel capacity                    | 256            | `bitty-ipc` channel                            |
| Sustained request rate / burst      | 100/s / 200    | RC-9                                           |
| Concurrent connections per endpoint | 16             | RC-9                                           |
| Decoded request payload             | 1 MiB          | RC-9 (chunking required above the frame bound) |

`R-B01`: The service must publish its own limits at handshake. Wheel reads them
and parameterizes tests; it must not hardcode a second copy that can drift.

`R-B02`: A limit violation is refused whole, with a bounded counts-and-limits
result. No partial request is applied and no caller bytes are echoed.

### 7.2 Queue and backpressure requirements

- `R-B03`: Each client has a bounded egress queue. A stalled reader may not
  block lifecycle processing, another client, or the worker.
- `R-B04`: Terminal-state and stop notifications are control frames. They are
  never silently shed. If the queue cannot accept one, the attachment is closed
  with a typed error so the client knows it missed a terminal event.
- `R-B05`: Observability frames may be shed newest-first within the accepted
  rate and queue bounds. Shedding is counted and attributed.
- `R-B06`: Reattach backlog is bounded and reports truncation explicitly. There
  is no unbounded output or event replay; ADR 0008's bounded-persistence rule
  applies.
- `R-B07`: Registry retention is bounded: maximum sessions, maximum attach
  leases per session, maximum retained terminal records, and a TTL. These are
  advertised limits (`D-14`), not implicit behavior.
- `R-B08`: One session's fault, a refused request, or a payload violation leaves
  no partial session state and does not take the daemon down (ADR 0019 D3).

### 7.3 Single-writer rules

`R-B09` — exactly one writer per fact:

1. `bittyd` is the only writer of registry, lifecycle, generation,
   attach-count, lease, and last-seen state.
2. The worker is the only writer of the run's task, context, tool, and audit
   state. `bittyd` never stores or mutates Wheel state.
3. One worker generation is bound to a session at a time. A rebind requires the
   previous generation to be terminal; overlapping generations are forbidden.
4. One controller lease exists per session unless Core explicitly adopts a
   multi-controller model with an input/control ownership rule.
5. Clients mutate only through generation-checked methods. There is no shared
   memory, no direct registry file edit, and no out-of-band signal.
6. The Wheel adapter keeps only a cache for display and revalidates before a
   mutating call. `bittyd` never keeps a second copy of Wheel truth.
7. Only Wheel persists the `(run, instance, session, generation)` mapping; only
   `bittyd` persists the session record.

`R-B10`: Mutating methods accept an idempotency key scoped to the caller and the
session. A duplicate delivery returns the first result or the current terminal
state; it must not apply the effect twice.

## 8. Authentication and trust

### 8.1 Posture

`bittyd` is same-user local infrastructure. The trust boundary is the OS user
account, exactly as in Wheel's security model. Peer credentials prove "same OS
user", not "trusted client"; a compromised or hostile same-user process is
inside the boundary. No requirement here may be described as multi-user
authentication, privilege separation, or a sandbox.

`bitty-ipc` already carries reviewed framing, peer-credential, and scope
primitives at the level described below. Whether `bittyd` reuses that crate is a
Core decision; Wheel requires the resulting properties, not a particular crate
layout.

### 8.2 Unix peer credentials

- `R-T01`: The endpoint is a filesystem Unix domain socket in an owner-private
  directory with owner-only modes. An abstract-namespace socket, a
  world-accessible directory, or a weaker mode is not acceptable as the
  authenticated endpoint.
- `R-T02`: The daemon verifies the connecting peer's OS identity with the
  platform peer-credential mechanism (`SO_PEERCRED`, `LOCAL_PEERCRED`, or the
  BSD equivalent) and rejects a different user before parsing a request.
- `R-T03`: Credentials are re-checked before each privileged action, not only at
  connect, so a passed descriptor cannot be mistaken for the original principal.
- `R-T04`: Endpoint tamper detection fails closed. If the directory or socket
  owner or mode changed, the daemon stops serving that endpoint and exits rather
  than continuing unauthenticated.
- `R-T05`: The client verifies the endpoint it connected to: owner, mode, and
  OS identity of the server. It refuses an endpoint it cannot attribute.
- `R-T06`: A uid mismatch caused by a user namespace or container mapping is an
  authentication failure, not a "same user" success.
- `R-T07`: The authenticated peer triple (identity, pid, connection) is recorded
  for attribution. The pid is informational and may be reused.

`R-T05` narrows but does not remove the residual risk: a same-user impostor
daemon can satisfy ownership and mode checks. Wheel therefore keeps the content
it sends across the boundary minimal (§ 8.6).

### 8.3 Windows identity equivalent

- `R-T08`: The endpoint is a named pipe with a current-user-only DACL and remote
  clients rejected at the pipe level. There is no "Everyone" or authenticated
  users grant.
- `R-T09`: The daemon verifies the client process id from the pipe and compares
  the client token's SID with the daemon's user SID. A different SID is rejected
  before request parsing.
- `R-T10`: The client verifies the server process SID from the pipe. Connecting
  to an unverified pipe is refused.
- `R-T11`: Elevation behavior is explicit. A medium-integrity client and an
  elevated daemon (or the reverse) either work under a documented same-user rule
  or fail closed with a typed result. Silent fallback to a weaker endpoint is
  forbidden.
- `R-T12`: If autostart or a service account is ever added, it must not silently
  change the principal to a system account. A different principal is a different
  contract and needs its own security review.

### 8.4 macOS and BSD

- `R-T13`: macOS uses the platform peer-credential call on a private socket;
  code signing is not an authentication substitute.
- `R-T14`: FreeBSD x86_64 is Tier 2 for the platform and inherits the Unix
  requirements where the peer-credential call exists. An unsupported cell
  returns a typed unsupported result; there is no unauthenticated fallback.

### 8.5 Platform cells

| Platform           | Tier (ADR 0002) | Wheel requirement                                                                |
| ------------------ | --------------- | -------------------------------------------------------------------------------- |
| Linux x86_64       | 1               | Full adapter surface once the contract is accepted.                              |
| Windows x86_64     | 1               | Full surface through the named-pipe identity equivalent; native-runner evidence. |
| macOS ARM64        | 1               | Full surface through the platform peer-credential call.                          |
| Linux ARM64        | 2               | Same surface, best-effort cadence.                                               |
| macOS x86_64       | 2               | Same surface, best-effort cadence.                                               |
| FreeBSD x86_64     | 2               | Same surface where the peer-credential call exists.                              |
| Other BSDs, others | 3               | Typed unsupported; no fallback transport.                                        |

`R-T15`: Cross-compilation is not evidence for a Tier 1 cell. The adapter may
only claim a cell after a real-runner conformance run.

### 8.6 Content boundary

- `R-T16`: Provider credentials, secret environment values, and raw provider
  payloads never cross the `bittyd` boundary. Wheel sends run control and
  lifecycle metadata, not credentials.
- `R-T17`: The v0.2.0 requirement does not include carrying prompts, transcripts,
  or tool output through `bittyd`. If a later consumer needs content transport,
  that is a separate widening with its own consent and security review.
- `R-T18`: Refusals carry counts, bounds, and static reason codes, never caller
  bytes, session content, or file paths.
- `R-T19`: `bittyd` is not a confused deputy. It does not connect to other
  services, execute provider calls, or forward a client's request to another
  principal on that client's behalf.
- `R-T20`: Authentication failures are attributed without recording secret
  material and without turning into an existence oracle for other sessions.

### 8.7 Trust questions for Core

| ID   | Question                                                                                                 | Why Wheel needs it                                              | Wheel position                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Q-01 | What exactly does a client verify about the server before its first request?                             | Wheel needs to refuse an endpoint it cannot attribute.          | Verify OS identity plus endpoint ownership and mode; state the same-user impostor residual honestly. |
| Q-02 | How is the endpoint discovered: environment, configuration, or a fixed per-user convention?              | Wheel must never guess or hardcode a host path.                 | One documented discovery mechanism; a typed "no endpoint" result otherwise.                          |
| Q-03 | Is there one endpoint per user or one per session?                                                       | Affects connection, listing scope, and stop semantics.          | One per user for the v0.2.0 single-instance slice.                                                   |
| Q-04 | What happens under user namespaces and container uid mapping?                                            | A mapped uid can look equal without being the same principal.   | Fail closed as unauthenticated or unsupported.                                                       |
| Q-05 | On Windows, what is the elevation and integrity-level rule, and what happens under AppContainer?         | A silent elevation downgrade would change the trust posture.    | Explicit rule or typed refusal; no weaker endpoint.                                                  |
| Q-06 | Does the daemon re-check peer credentials before every privileged action, and what is the refusal shape? | A connect-time-only check permits descriptor passing attacks.   | Re-check and refuse with a static typed result.                                                      |
| Q-07 | Can a client make the daemon act toward another service or principal?                                    | Prevents a confused-deputy path around Wheel's policy gates.    | No forwarding, no provider calls, no execution on behalf of a peer.                                  |
| Q-08 | How are authentication failures attributed without content or an existence oracle?                       | Wheel's audit needs correlation without leaking other sessions. | Static code plus peer identity and counts only.                                                      |

## 9. Wheel adapter boundary

### 9.1 Ownership split

| Concern                                     | Wheel (harness)      | `bittyd` (service host)                |
| ------------------------------------------- | -------------------- | -------------------------------------- |
| Task graph, roles, agent loop               | Owns                 | Must not store or interpret            |
| Context store, snapshots, checkpoints       | Owns                 | Must not store                         |
| Tool policy, role gates, consent            | Owns                 | Must not grant or widen                |
| Provider routing, secrets                   | Owns                 | Never receives                         |
| Execution audit content and chain           | Owns                 | Records lifecycle attribution only     |
| Cancellation policy (when to abort)         | Owns                 | Executes termination under supervision |
| Run retry policy                            | Owns                 | Never restarts                         |
| Per-user service lifecycle                  | Must not own         | Owns                                   |
| Single-instance lock                        | Must not own         | Owns                                   |
| IPC transport and authentication            | Consumes             | Owns                                   |
| Attach/detach leases                        | Consumes             | Owns                                   |
| Session registry and lifecycle state        | Consumes             | Owns                                   |
| Worker generation                           | Consumes and records | Owns                                   |
| Worker supervision, exit detection, reaping | Consumes             | Owns                                   |
| Bounded queues and retention                | Consumes limits      | Owns                                   |
| Service API versioning                      | Negotiates           | Owns                                   |

`R-W01`: Wheel must not grow a competing daemon, registry, attach protocol, or
worker supervisor while the contract is pending. The prototype `wheel-session`
remains experimental (README continuation boundary).

`R-W02`: `bittyd` must not become Wheel's state of record for tasks, context,
audit content, or agent progress. Losing a session record must never lose Wheel
work products that were already persisted.

### 9.2 Adapter surface Wheel needs

Operation names and shapes belong to Core. Semantically the adapter needs:

| Operation        | Purpose                                                        | Required properties                                                  |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `negotiate`      | Read version, instance, capabilities, limits, and identity.    | Typed mismatch; no partial mode.                                     |
| `host` (or bind) | Ask the service to host a worker for a run, if supported.      | Idempotent per run; capability-gated; refuses duplicates.            |
| `attach`         | Obtain a lease and a snapshot for a session.                   | Instance- and generation-fenced; bounded backlog; role explicit.     |
| `detach`         | Release one lease.                                             | Idempotent; lease-scoped; never aborts.                              |
| `status`         | Read lifecycle, generation, revision, attach count, last seen. | Authoritative; cheap enough to reconcile after a timeout.            |
| `abort`          | Request termination with a typed reason class.                 | Generation-checked; idempotent; distinct cancel and timeout classes. |
| `events`         | Receive bounded state and terminal notifications.              | Ordered per revision; truncation explicit; control frames not shed.  |
| `close`          | Close the connection without implying detach or abort.         | Lease expiry semantics; no session effect.                           |

`R-W03`: The adapter is transport-injectable. The same conformance suite runs
against a fake server and the real service; no Wheel state module may depend on
a concrete socket or FIFO.

`R-W04`: Transport selection is explicit. If the `bittyd` transport is selected
and unavailable, the adapter fails with a typed unavailable result. It must not
silently fall back to an in-process run while a hosted run may exist.

`R-W05`: There is no dual-run. A run is hosted either by an in-process harness
or by `bittyd`, never both. The adapter refuses to create a second worker for a
run that already has a live session.

`R-W06`: When hosted, Wheel does not signal worker pids. Termination goes
through the service. Wheel's process-level cancellation primitive remains the
standalone path and is not duplicated inside the adapter.

`R-W07`: Transport loss is an unknown outcome, not a failure and not a success.
The adapter records "outcome unknown" before reconciling.

`R-W08`: Mutating retries require the same generation and an idempotency key.
After a stale-generation refusal the adapter refreshes state and stops; it does
not replay the mutation against the new generation.

`R-W09`: The adapter records `daemon_instance_id`, `session_id`, `generation`,
`state_revision`, and `client_id` in Wheel's audit stream. It never records
provider secrets, prompt bodies, or `bittyd` caller bytes.

`R-W10`: Wheel's role, consent, and path gates apply before an operation reaches
the adapter. A `bittyd` scope grant never substitutes for a Wheel policy gate,
and a Wheel grant never substitutes for a `bittyd` scope.

`R-W11`: Version skew is a refusal, not best effort. Wheel declares its supported
range and reports the mismatch.

`R-W12`: Daemon absence is a supported state. Wheel starts, diagnoses, and runs
without `bittyd` when the in-process transport is selected.

`R-W13`: The adapter never calls daemon stop and never lists or mutates sessions
it does not own.

### 9.3 Prototype relationship

The existing `wheel-session/1` prototype is a transport reference only:

- its FIFO methods (`ping`, `session.status`, `session.snapshot`, `context.*`,
  `shutdown`) are not the `bittyd` contract and must not be treated as a
  starting schema;
- its same-user FIFO residual is not an authentication story and must not be
  copied into the adapter;
- its JSON-line framing and 64 KiB request bound are prototype-specific; the
  `bittyd` service API version governs framing, not the prototype;
- `context.put`/`context.get` are Wheel state operations. They stay in Wheel and
  do not become `bittyd` methods;
- the prototype's explicit-shutdown behavior is not a stop contract.

## 10. Conformance test vectors

Rules for the vector suite:

1. The fake server implements the published contract surface once it exists.
   Until then it implements the candidate surface with a recorded version and is
   labelled "candidate, not `bittyd`". Passing it proves adapter behavior, not
   upstream conformance.
2. Every vector asserts the typed result, the resulting state, and the absence of
   partial state. A vector that only asserts "no crash" is not acceptable.
3. Time, monotonic clocks, and limits are injected. Tests never sleep on a wall
   clock and never hardcode a host path.
4. Tests parameterize on advertised `limits`; a literal frame cap in a test is a
   defect unless it is the value under test.
5. Platform-gated vectors are skipped only with an explicit typed skip reason,
   never silently passed.

| ID   | Area            | Setup and action                                                 | Expected result                                                                                   | Assertions                                                                                                                   | Status                |
| ---- | --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| V-01 | Handshake       | Connect with a matching version.                                 | Version, instance id, capabilities, limits, server identity, client id, monotonic clock returned. | Client id is server-assigned; limits are present; instance id is fresh.                                                      | ready                 |
| V-02 | Handshake       | Connect with an unsupported version.                             | Typed version-mismatch refusal; connection closed.                                                | No session operation succeeds; no downgrade path.                                                                            | ready                 |
| V-03 | Handshake       | Service advertises no worker-session capability.                 | Typed unsupported-capability result.                                                              | Adapter refuses to host; no in-process fallback starts.                                                                      | blocked: D-01         |
| V-04 | Handshake       | Send a frame above the advertised frame bound.                   | Typed limit refusal with limit and actual size.                                                   | No partial parse; connection state defined; no caller bytes echoed.                                                          | ready                 |
| V-05 | Attach          | Attach one observer lease.                                       | Lease created; attach count 1; revision increments.                                               | Lease id differs from client id; role is observer.                                                                           | ready                 |
| V-06 | Attach          | Close the transport without detach.                              | Lease expires after the grace bound; worker alive.                                                | Attach count returns to 0; generation unchanged; no terminal state.                                                          | ready                 |
| V-07 | Attach          | Detach twice.                                                    | First detach acknowledged; second reports not attached.                                           | Idempotent; no abort; revision ordering preserved.                                                                           | ready                 |
| V-08 | Attach          | Attach up to the advertised cap, then one more.                  | New attach shed with a typed limit result.                                                        | Existing leases intact; no silent eviction.                                                                                  | blocked: D-14         |
| V-09 | Attach          | Attach to an unknown or foreign session.                         | Typed denial or not-found, per policy.                                                            | No content from another session; no existence oracle beyond policy.                                                          | ready                 |
| V-10 | Attach          | Same client attaches twice.                                      | Exactly one of: a second lease, or a typed duplicate refusal.                                     | Behavior matches the decided model; no double-counted authority.                                                             | blocked: D-09         |
| V-11 | Lifecycle       | Abort with the current generation.                               | Worker terminated; terminal reason is consumer cancellation; cleanup classified.                  | Repeat abort returns the same terminal state; no second termination.                                                         | ready                 |
| V-12 | Lifecycle       | Abort with a stale generation.                                   | Typed stale-generation refusal carrying current state, generation, revision.                      | Worker is still alive; no state change; no automatic retry.                                                                  | ready                 |
| V-13 | Lifecycle       | Abort without session authority.                                 | Typed denial, attributed.                                                                         | No state change; no target details leaked.                                                                                   | ready                 |
| V-14 | Lifecycle       | Kill the worker process during a run.                            | Session becomes failed; exit status and cleanup recorded; no restart.                             | No new generation is bound; attached clients notified; reattach is read-only.                                                | ready                 |
| V-15 | Lifecycle       | Let the worker exit normally.                                    | Session becomes exited with status.                                                               | No restart; terminal state immutable.                                                                                        | ready                 |
| V-16 | Stop            | Stop with one active session, default mode.                      | Either a typed active-sessions refusal or a bounded drain, per the decision.                      | No silent kill; actor and reason recorded; client notification on drain.                                                     | blocked: D-05         |
| V-17 | Stop            | Force stop with two active sessions.                             | Both terminate with the daemon-stop reason; cleanup recorded.                                     | Clients notified before close; no session without a terminal reason.                                                         | blocked: D-05         |
| V-18 | Restart         | Crash the daemon, start a new instance, present an old handle.   | Typed stale-instance or unknown-session result.                                                   | Empty registry; no orphan adoption; instance id changed.                                                                     | blocked: D-06         |
| V-19 | Timeout         | Hold a request past its bound.                                   | Typed request timeout; session state unchanged or reconciled.                                     | No partial state; a mutating retry is refused or deduplicated.                                                               | ready                 |
| V-20 | Retention       | Age a terminal session past the retention TTL.                   | Session becomes unknown.                                                                          | Adapter treats it as lost, not success.                                                                                      | blocked: D-14         |
| V-21 | Reattach        | Reattach after transport loss with the same generation.          | Snapshot at the current revision; bounded backlog.                                                | Truncation marker when history was dropped; no unbounded replay.                                                             | ready                 |
| V-22 | Reattach        | A second client attaches.                                        | Observer lease by default; control not transferred.                                               | Co-attachment visible; abort authority unchanged without an explicit grant.                                                  | blocked: D-09         |
| V-23 | Bounds          | Exceed the pending-request cap.                                  | Shed newest; typed limit result.                                                                  | Daemon stays responsive; attribution present.                                                                                | ready                 |
| V-24 | Bounds          | Send a partial frame and stall.                                  | The stalled client is closed after the bound.                                                     | Lifecycle and other clients unaffected; worker unaffected.                                                                   | ready                 |
| V-25 | Trust (Unix)    | Connect as a different OS user.                                  | Unauthenticated before request parsing.                                                           | No method executes; refusal is static.                                                                                       | gated: second uid     |
| V-26 | Trust (Unix)    | Widen the endpoint directory or replace the socket.              | Daemon refuses to serve; client refuses to connect.                                               | No unauthenticated fallback; typed refusal.                                                                                  | ready                 |
| V-27 | Trust (Windows) | Connect with a different SID.                                    | Unauthenticated before request parsing.                                                           | No method executes; pipe refuses remote clients.                                                                             | gated: Windows runner |
| V-28 | Trust           | Inspect the process endpoints.                                   | No TCP listener exists.                                                                           | Only the documented local endpoint is bound.                                                                                 | ready                 |
| V-29 | Adapter         | Select the bittyd transport while the service is absent.         | Typed unavailable.                                                                                | No in-process worker is started as a fallback.                                                                               | ready                 |
| V-30 | Adapter         | Select the in-process transport while a fake daemon listens.     | The fake daemon receives no connection.                                                           | No accidental daemon dependency.                                                                                             | ready                 |
| V-31 | Adapter         | Drop the transport during an abort request.                      | Outcome unknown recorded; status reconciled.                                                      | No blind abort retry; no success claim.                                                                                      | ready                 |
| V-32 | Adapter         | Drive an abort through the adapter.                              | Termination only through the service; no direct signal.                                           | Fake server receives exactly one abort; the adapter never reads or uses a worker pid; the seam exposes one termination path. | ready                 |
| V-33 | Adapter         | Inspect Wheel audit records for a hosted run.                    | Instance, session, generation, revision, client id present.                                       | No secret, prompt, or caller-byte content.                                                                                   | ready                 |
| V-34 | Cancellation    | Trigger a consumer timeout, then a user cancel in separate runs. | Timeout and cancel produce distinct terminal reasons.                                             | Results and audit distinguish them; cleanup recorded.                                                                        | ready                 |

Vector-to-requirement notes:

- V-06 and V-14 are the pair that proves client lifetime is not worker lifetime.
- V-12 and V-31 are the pair that proves a stale or unknown outcome cannot abort
  a newer generation.
- V-18, V-19, and V-20 are the "host changed underneath us" set; all three must
  fail toward "lost", never toward "success".
- V-29 is the anti-dual-run gate; without it a fallback bug can start a second
  worker and silently duplicate side effects.

## 11. Non-goals

- `N-01`: No daemon, transport, registry, reaper, or session protocol
  implementation in Wheel. This document is requirements, not a design for code.
- `N-02`: No fake-server implementation here. CTX-0036 owns that.
- `N-03`: No definition or acceptance of the Core contract. `D-*` items are open.
- `N-04`: No claim that `bittyd` exists, ships, or has any implemented behavior.
- `N-05`: No remote UI, remote attach, mobile control plane, SSH service, or
  network listener.
- `N-06`: No persistence of sessions across daemon restart in the v0.2.0 slice.
- `N-07`: No autostart requirement and no service-account model.
- `N-08`: No multi-user authentication, privilege separation, sandbox, or
  protection from a compromised same-user process.
- `N-09`: No PTY, terminal rendering, scrollback, or panel-runtime contract; those
  are Core concerns and only relevant here as "not a Wheel worker session".
- `N-10`: No provider routing, model selection, task graph, context, tools,
  consent, or audit content in `bittyd`.
- `N-11`: No Windows, macOS, or BSD implementation claim before real-runner
  evidence.
- `N-12`: No cancellation implementation. CTX-0034 owns the standalone process
  primitive; hosted cancellation waits for the contract.
- `N-13`: No change to `SECURITY-MODEL.md` authority classes. The adapter adds no
  authority class.
- `N-14`: No `wheel-session/1` compatibility promise. The prototype may be
  replaced by the adapter.

## 12. Open decisions for bitty#2546

Each decision is Core-owned. "Wheel position" is a consumer preference, not an
answer. The blocking column names vectors that cannot be finalized first.

| ID   | Decision needed                                                                                               | Why Wheel needs it                                                                | Options                                                                                     | Wheel position                                                                                                   | Blocks     |
| ---- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- |
| D-01 | Does the v0.2.0 slice host non-terminal agent workers at all, or only terminal sessions?                      | Wheel cannot plan the adapter if worker hosting is assumed but absent.            | In slice; capability-gated later; explicitly out of slice with a follow-up contract.        | Define the session/attach/registry semantics generically; gate worker hosting by capability so absence is typed. | V-03, host |
| D-02 | Session identity and fencing: instance id, id recycling, and uniqueness scope.                                | A stale client must never attach to a recycled session id.                        | Random non-reused ids; sequential ids fenced by instance id; per-instance namespace.        | Random or instance-fenced; never session-id-only fencing.                                                        | V-18, L-20 |
| D-03 | Generation and revision: one counter or two; increment points; which requests carry which.                    | Wrong-worker fencing and snapshot ordering are different properties.              | Single counter; worker generation plus state revision.                                      | Two counters with explicit transition rules.                                                                     | V-12, V-21 |
| D-04 | Lifecycle state set, terminal reason taxonomy, and mapping to the `bitty-ipc` error taxonomy.                 | Cancel, timeout, crash, operator stop, and daemon stop must stay distinguishable. | Minimal set with reason codes; richer state machine; reuse of transport error classes only. | Closed state set plus closed reason classes; transport errors never substitute for lifecycle reasons.            | V-11, V-34 |
| D-05 | `bittyd stop` with active sessions: refuse, drain, or force by default; exit codes; client notification.      | A silent stop destroys another client's work and cannot be checkpointed.          | Refuse; bounded drain; force by default.                                                    | Refuse by default; explicit drain and force modes with reasons and attribution.                                  | V-16, V-17 |
| D-06 | Crash and restart: confirm no persistence; orphan worker policy; stale-handle rejection; registry rebuild.    | Orphans can duplicate side effects or escape cleanup.                             | Reap from recorded identity; leave and report; adopt into a new session.                    | No adoption; reap only from a recorded identity, never a pattern; empty registry on restart.                     | V-18       |
| D-07 | Attach/abort authorization: scopes, creator versus operator, and whether consumers can attach as controllers. | Wheel needs a deterministic answer to "who may stop this run".                    | Reuse `terminal.*`; add a session scope family; owner-only with operator override.          | New session/agent scope family, deny by default; `terminal.*` must not be stretched to worker sessions.          | V-13, V-22 |
| D-08 | Client identity: issuance, lifetime, reconnect behavior, and whether a consumer instance id is accepted.      | Audit attribution and lease ownership need stable but non-authoritative identity. | Server-assigned per connection; stable per consumer instance; both.                         | Server-assigned `client_id`; consumer-supplied instance value is audit-only.                                     | V-01, V-31 |
| D-09 | Multi-attach and control ownership: observers versus controllers, transfer, input if any.                     | Two controllers can fight over abort and any future input.                        | Single controller; multiple observers; multi-controller with an ownership token.            | One controller, many observers, explicit transfer.                                                               | V-10, V-22 |
| D-10 | Event delivery: snapshot plus deltas or polling; ordering; terminal-event guarantee; backlog bounds.          | Wheel must know whether it can miss a terminal event silently.                    | Poll only; at-least-once stream; best-effort stream with a reconciliation read.             | Stream plus authoritative status; terminal events never shed; truncation explicit.                               | V-21, V-24 |
| D-11 | Service API versioning: scheme, negotiation, refusal, and compatibility window.                               | Half-working version skew is worse than a refusal.                                | Integer version; semantic version; per-feature capability bits only.                        | Version plus capability advertisement; refuse mismatches; no feature-probe downgrade.                            | V-02, V-03 |
| D-12 | Heartbeat and last-seen: who heartbeats, intervals, staleness, detach threshold, clock source.                | Detach-on-silence is safe; abort-on-silence is not.                               | Client heartbeat; server probe; worker heartbeat.                                           | Client heartbeat with monotonic server time; staleness detaches only; thresholds are published limits.           | V-06, V-14 |
| D-13 | Timeout ownership: transport, request, attach, retention, and execution deadlines.                            | An IPC timeout must not kill a long agent run.                                    | Daemon imposes all; consumer owns execution; mixed.                                         | Daemon owns IPC and retention only; Wheel owns execution deadlines and expresses them as a timeout-class abort.  | V-19, V-34 |
| D-14 | Resource limits: max sessions, attaches, retained terminal records, TTL, metadata bytes.                      | Unbounded registry retention is a denial-of-service path.                         | Fixed constants; negotiated; configuration with a system maximum.                           | Published, bounded, system maximum not weakenable by user config; advertised at handshake.                       | V-08, V-20 |
| D-15 | Platform cells and unsupported behavior: Linux, macOS, Windows, FreeBSD; elevation and namespace cases.       | Wheel must fail closed on a cell the service does not support.                    | Tiered support with typed unsupported; silent single-platform assumption.                   | Follow ADR 0002 tiers; typed unsupported; no weaker transport on any cell.                                       | V-25, V-27 |
| D-16 | Audit and attribution: what `bittyd` records, retention, consumer visibility, and content exclusion.          | Wheel needs correlation, not a second audit authority.                            | Lifecycle-only records; full content; consumer-readable log.                                | Lifecycle and refusal records only, static and content-free; Wheel keeps its own audit of record.                | V-33       |
| D-17 | Worker restart policy: confirm `bittyd` never restarts consumer workers; rebind rules for consumer retries.   | A hidden restart can duplicate tool side effects.                                 | Auto-restart with backoff; never restart; restart on consumer request only.                 | Never restart; a retry is a new session with a new generation.                                                   | V-14, V-15 |
| D-18 | Idempotency: keys for host, abort, and detach; duplicate delivery and conflict semantics.                     | Transport retries and timeouts make duplicate delivery normal.                    | Per-caller key; per-session key; no keying.                                                 | Per-caller and per-session key; duplicate returns the first or current terminal result.                          | V-11, V-19 |

Decision notes:

- D-01 is the gating question. If the v0.2.0 slice is terminal-only, Wheel states
  that clearly and keeps the prototype; the adapter work in CTX-0036 then targets
  the contract surface without claiming worker hosting.
- D-07 is a scope-model change, not just a naming choice. `bitty-ipc`'s accepted
  scope families are closed; stretching `terminal.manage` to cover agent-worker
  abort would silently grant terminal authority to an agent client and is a
  consent downgrade.
- D-13 is where the current `wheel-session` prototype's implicit behavior must
  not leak forward: the prototype has no execution deadline and no restart
  promise, and that is the correct posture for a supervisor.
- D-18 is not optional polish. Without it, a request timeout followed by a retry
  is a duplicate abort or a duplicate host request, which is exactly the class of
  bug that produces two workers for one run.

## 13. Acceptance criteria and review checklist

For this document:

1. It states requirements from Wheel's side and leaves every Core choice open.
2. It does not describe `bittyd` as implemented or the contract as accepted.
3. Every field, state, and refusal it relies on is either sourced or marked
   `R-*`/`D-*`/`Q-*`.
4. The disposition matrix covers client close, detach, abort, `bittyd stop`,
   worker crash, daemon restart, stale generation, timeout, and reattach.
5. The adapter boundary keeps task, context, runner, tools, consent, audit, and
   cancellation policy in Wheel, and lifecycle/registry/attach/IPC/supervision in
   `bittyd`.
6. Every vector is runnable against a fake server and has a real-service
   assertion; blocked vectors name their decision.
7. No host path, username, or environment-specific value appears.
8. Nothing in this document authorizes code, a daemon, or a fake server.

For the eventual contract (what would let Wheel adopt it):

1. D-01 through D-18 are decided and recorded, with security co-ownership for
   the trust boundary.
2. The service publishes version, capabilities, and limits at handshake.
3. Attach, detach, abort, status, and events are specified with generation,
   revision, and idempotency semantics.
4. Stop, crash, restart, and stale-handle behavior are specified and do not
   silently destroy another client's work.
5. Peer-credential requirements and platform cells are specified with
   unsupported behavior, not fallbacks.
6. A conformance harness exists that both a fake server and the real service can
   pass.
7. Independent review confirms that Wheel's adapter adds no authority class and
   no second source of truth.

## 14. References

- [bitty#2546] — Define the bittyd session-host contract for long-running Agent
  workers.
- [bitty#2064] — `bittyd` core service host: lifecycle, single-instance, IPC.
- [bitty#2218] — Built-in multiplexer story: detach/attach and session
  persistence (design first).
- [ADR 0008] — Headless daemon, detach/reattach, and remote UI trust boundary.
- [ADR 0019] — `bittyd` staging advance to the v0.2.0 slice.
- [ADR 0002] — Platform support tiers.
- [bitty-ipc] — Local IPC framing, peer credentials, scopes, and accepted
  RC-9/RC-10 bounds.
- [`SECURITY-MODEL.md`](https://github.com/bitty-terminal/wheel/blob/main/SECURITY-MODEL.md) — Wheel authority policy, residual
  risks, and evidence gates.
- [`README.md` § Local Session Daemon](https://github.com/bitty-terminal/wheel/blob/main/README.md#local-session-daemon-experimental) — Product position and the local session daemon's
  continuation boundary.
- Wheel cancellation design input (2026-10-22) — requires cancellation and
  timeout to stay distinct.
- [wheel#101] — Cancellation blocked on the `bittyd` contract (CarryCtx
  `PX-0195`).

[bitty#2546]: https://github.com/bitty-terminal/bitty/issues/2546
[bitty#2064]: https://github.com/bitty-terminal/bitty/issues/2064
[bitty#2218]: https://github.com/bitty-terminal/bitty/issues/2218
[ADR 0002]: https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md
[ADR 0008]: https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md
[ADR 0019]: https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md
[bitty-ipc]: https://github.com/bitty-terminal/bitty-ipc
[wheel#101]: https://github.com/bitty-terminal/wheel/issues/101
