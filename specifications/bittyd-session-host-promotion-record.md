---
title: bittyd Session-Host Contract Promotion Record
description: Accepted owner promotion of D-01 through D-18 for the bittyd session host - disposition table, slice boundaries, sign-off status, independent security review scope, and out-of-scope limits
category: specifications
audience: contributor
document_type: register
status: accepted
website_publish: false
sidebar_order: 82
---

# bittyd Session-Host Contract Promotion Record

## Document status

> Status: **accepted on 2026-10-27 by the project owner.** This record promotes
> decisions `D-01` through `D-18` of the
> [bittyd Session-Host Contract](bittyd-session-host-contract.md) from candidate
> to accepted Core contract, and records exactly which sign-offs exist. The
> owner approved the decisions and the contract text on 2026-10-27 through the
> promotion gate [bitty#2663](https://github.com/bitty-terminal/bitty/issues/2663).
>
> The independent security review is **not** approved. Acceptance and
> implementation authorization are deliberately separate: the decision record is
> accepted now, the first review returned `NEEDS-FIX` on 2026-10-27 and its
> revision was submitted, then the second review returned `NEEDS-FIX` on
> 2026-10-27 with `F-1` through `F-8` and `F-11` blocking. The second revision is
> submitted and the third independent security review named in
> [Independent security review requirements](#independent-security-review-requirements)
> must record an APPROVE before implementation starts. No security,
> architecture, Wheel, or bitty-ai approval is implied by this record.
>
> The first revision applies findings `B-1` through `B-13`; the second revision
> applies `F-1` through `F-8` and `F-11`. The dated dispositions live in the
> contract's
> [Security review revision (2026-10-27)](bittyd-session-host-contract.md#security-review-revision-2026-10-27)
> and
> [Second security review revision (2026-10-27)](bittyd-session-host-contract.md#second-security-review-revision-2026-10-27)
> sections. This record records the sign-off state only and claims no approval.
>
> The contract document was renamed from
> `bittyd-session-host-contract-candidate.md` to
> `bittyd-session-host-contract.md` in the same change, because accepted
> specifications in this corpus do not carry a `-candidate` suffix. Inbound
> references from the implementation issues are repointed per
> [Dependent issues](#dependent-issues).
>
> `bittyd` still does not ship. No `bittyd` crate, binary, service file,
> endpoint, registry, transport, or fake-server implementation exists, and this
> record authorizes none of them by itself.

| Control         | Value                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Status          | Accepted 2026-10-27; first review `NEEDS-FIX`; second review `NEEDS-FIX` 2026-10-27; second revision pending third review    |
| Owner           | Project initiator (owner decision, 2026-10-27); Core terminal platform owns the contract text                                |
| Gate            | [bitty#2663](https://github.com/bitty-terminal/bitty/issues/2663), parent [#2546]                                            |
| Contract        | [bittyd Session-Host Contract](bittyd-session-host-contract.md) (`status: accepted`)                                         |
| Consumer input  | [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (still `draft`)                                 |
| Implementation  | Nine v0.2.0 slices ([#2601] through [#2609]) plus [#2664], [#2665], [#2666]                                                  |
| Evidence status | No vector has run against a real `bittyd`; no P0 evidence exists yet; `B-1..B-13` and `F-1..F-8`/`F-11` revised in text only |

## Purpose and scope

The v0.2.0 session-host slice was blocked on one question: are the Core answers
to `D-01` through `D-18` accepted, or is every implementation issue still
arguing with a candidate? This record answers that question and nothing more.

In scope:

- the dated owner promotion and its exact scope;
- a disposition table for `D-01` through `D-18` with the slice each decision
  unlocks and the boundary it leaves closed;
- the sign-off rows, recorded honestly, including the reviews that do **not**
  exist yet;
- the independent security review scope that gates implementation, now at the
  third review after the first and second returned `NEEDS-FIX`;
- the out-of-scope boundary for remote transport, plugin access, and
  Windows/macOS advertisement;
- the cross-reference each dependent issue needs so its body can be repointed.

Out of scope and owned elsewhere:

- the contract mechanics themselves (states, methods, counters, limits,
  conformance vectors) — owned by the
  [bittyd Session-Host Contract](bittyd-session-host-contract.md), linked not
  restated here;
- the session-host mechanism floor and exclusion set — owned by the draft
  [bittyd Scope Charter](bittyd-scope-charter.md);
- consumer requirements and `V-01` through `V-34` — owned by the candidate
  [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md);
- the trust boundary, threat model, risk register, and P0 evidence set — owned
  by the [security corpus](https://github.com/bitty-terminal/bitty-docs/tree/main/docs/security)
  and the implementation review;
- any daemon code, packaging, release action, or milestone change.

## Normative sources this record must not weaken

This record is subordinate to every accepted source below. Where a source and
this record disagree, the source wins and this record is defective.

| Source                                                                                                                               | What it binds here                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Daemon definitions, single PTY ownership, session-grained attach and detach, bounded persistence, containment, attributed enforcement, and both trust-boundary gates.                               |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | The v0.2.0 slice and its exclusions: no remote UI, no restart persistence, no autostart requirement, no plugin-capability change, and a daemon-absence requirement.                                 |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Platform tiers and the rule that cross-compilation is never native-runner evidence for a Tier 1 cell.                                                                                               |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                    | Invariants 1 through 10: local-only IPC with an explicit per-operation scope, read-only Agent default, untrusted observation data, bounded untrusted input, secret minimization, and safe mode.     |
| [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (normative)                     | `T-09` same-user IPC takeover, `T-10` Agent confused deputy, `T-11` trace or crash-report secret leakage, and the future-daemon scope line.                                                         |
| [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md) (normative)                   | `R-011` IPC client reads terminal data or kills processes, `R-012` child credential leakage, `R-013` hostile-output confused deputy, and `R-014` trace or crash-report exposure.                    |
| [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) (normative) | `P0-AC-021` peer credentials, `P0-AC-022` per-action scopes, `P0-AC-023` child-scope limitation, `P0-AC-024` Agent read-only default, `P0-AC-025` DevTools scopes, `P0-AC-026` secret minimization. |
| `bitty-ipc` accepted `RC-9`/`RC-10`                                                                                                  | 256 KiB frame and streamed chunk, 64 pending requests, 256 channel capacity, 100 req/s sustained with 200 burst, 16 connections per endpoint, 1 MiB decoded payload, shed-newest with attribution.  |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | Local framing, peer-credential posture, closed v1 scope families, per-request server-side evaluation, error taxonomy, and no default TCP.                                                           |
| [Remote Session Decision](remote-session-decision.md) (accepted)                                                                     | The accepted remote decline for this timeframe and the admission bar a future remote record must clear.                                                                                             |
| [Multiplexer Decision](multiplexer-decision.md) (accepted)                                                                           | Session-host dependency on the accepted contract; no detach/attach seam or session manager exists today.                                                                                            |

## Promotion decision and rationale

**Decision: promote `D-01` through `D-18` to an accepted Core contract; keep
implementation blocked on the third independent security review after the first
and second returned `NEEDS-FIX` and the second revision was submitted.**

Scope of the acceptance:

- accepted: the decision answers, the lifecycle and reason vocabulary, the
  scope family, the service surface at contract level, the advertised-limit
  table, the platform-cell typing, the audit rule set, the conformance matrix,
  and the harness plan;
- accepted as a gate, not as evidence: every claim that a mechanism enforces a
  property. No vector has run against a real service;
- not accepted here: implementation authorization, worker hosting, remote
  transport, plugin access, Windows/macOS advertisement, packaging, release
  eligibility, or any change to the scope charter's draft status.

Rationale for promoting now:

1. **The blocking cost is real and current.** Nine v0.2.0 implementation slices
   ([#2601] through [#2609]) and three contract-freeze issues
   ([#2664], [#2665], [#2666]) name the promotion as a
   blocker. Consumer work on the adapter and fake server cannot freeze its
   expectation corpus while the contract is still a candidate.
2. **The answers rest on accepted sources.** Every `D-*` row either restates
   ADR 0008, ADR 0019, ADR 0002, the security corpus, `bitty-ipc` `RC-9`/
   `RC-10`, or the accepted IPC and Agent RFC, or it narrows a consumer
   position that was never an authority. Promotion adds no new authority class.
3. **The open questions are mechanism choices, not decision gaps.** The
   operator-capability file mechanism, the scope-registry owner, the exact JSON
   spellings, the orphan-journal fsync cadence, and the Windows integrity rule
   are review and implementation choices under a decided requirement; they stay
   in [Open points](#open-points) instead of blocking acceptance.
4. **The security gate stays where it can be evidenced.** No daemon exists, so a
   pre-implementation security review can review the design and threat model but
   cannot produce P0 evidence. Splitting the review into a design gate before
   implementation and an evidence gate before the first merge keeps the P0
   controls mandatory without pretending evidence exists.
5. **The corpus prefers one authoritative definition.** This record does not
   restate the mechanics; it records dispositions and boundaries so the contract
   stays the single normative text.

## Decision disposition (D-01 through D-18)

Each row is the accepted disposition, the slice it unlocks, and the exact
boundary it leaves closed. Mechanics live in the
[contract](bittyd-session-host-contract.md#decision-record-d-01-through-d-18).

| ID   | Accepted disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Unlocks (slice / issue)                                                                                                          | Exact boundary that stays closed                                                                                                                                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-01 | Terminal sessions only in v0.2.0. The `worker` kind is defined so consumers can target it: every build advertises `worker_sessions=false` and refuses worker create with `Denied/UnsupportedCapability` before any spawn.                                                                                                                                                                                                                                                                             | Session-kind field in the registry ([#2601]); method surface ([#2607]); attach/abort paths ([#2609]); crate seam ([#2606]).      | No worker spawn, supervision, credential inheritance, or advertisement. Enablement needs an ADR 0019 amendment and the dedicated spawn/credential/cleanup review ([#2608]).                                                                            |
| D-02 | 128-bit random `daemon_instance_id` and `session_id`; the instance is checked before any session lookup; `session_id` is never reused within an instance; `terminal_id` is immutable and unique among live sessions.                                                                                                                                                                                                                                                                                  | Registry identity and lookup ([#2601]); handshake instance binding ([#2607]); adapter handles ([#2609]).                         | No session-id-only fencing, no adoption, no handle resolution across instances; `terminal_id` reuse is allowed once a session is terminal, and a retained record is fenced by session id.                                                              |
| D-03 | `generation` starts at 0 and increments once on worker bind (0 or 1 in v0.2.0); `state_revision` increments once per snapshot-visible mutation and never on heartbeat or last-seen.                                                                                                                                                                                                                                                                                                                   | Registry counters ([#2601]); generation checks on effectful requests ([#2609]); snapshot and event revisions ([#2602]).          | No rebind and no generation above 1; no revision bump for heartbeat, `last_seen_at`, `last_worker_seen_at`, or a no-op idempotent repeat.                                                                                                              |
| D-04 | Closed states `created`, `running`, `stopping`, `exited`, `failed`, `terminated`; `attached` is a derived flag; terminal reasons keep cancel, timeout, operator abort, daemon stop, host shutdown, exit, signal, spawn failure, and supervision failure distinct; every terminal transition carries a cleanup class.                                                                                                                                                                                  | Registry lifecycle ([#2601]); abort and stop classification ([#2609]); terminal events ([#2602]); stop modes ([#2607]).          | No extra states or reasons; transport errors never substitute for a reason; terminal records are immutable and never revived.                                                                                                                          |
| D-05 | `daemon.stop` refuses by default with `Denied/ActiveSessions`; `drain` notifies, refuses new work, waits `drain_grace_ms`, then terminates the remainder; `force` terminates immediately. Signals run drain with `host_shutdown`.                                                                                                                                                                                                                                                                     | Daemon stop dispatch and CLI exit codes ([#2607]); `V-16`/`V-17` ([#2665]); release eligibility ([#2666]).                       | No force-by-default, no autostart, no restart persistence; exit code 6 stays reserved for endpoint tamper or a failed authentication invariant.                                                                                                        |
| D-06 | No persistence and no adoption: a restart gets a new instance id and an empty registry, and old handles are refused. A boot-id-matched orphan record is reaped through its pre-recorded containment identity, including a reserved record with no pid; an unverifiable record is quarantined and reported, never guessed at.                                                                                                                                                                          | Registry retention and orphan journal ([#2601]); crash and restart behavior ([#2607]); `C-03` ([#2665]).                         | Sessions never survive a restart; no registry replay; no name, pattern, port, or newest-process signal heuristic.                                                                                                                                      |
| D-07 | Additive, deny-by-default `session.*` and `daemon.*` families separate from `terminal.*`; the baseline is `session.inspect`, `session.attach`, and `session.control`; `session.host` is never baseline and create requires explicit per-client consent plus `process.spawn`; controller authority requires the current session control token; daemon-scoped actions require the operator capability.                                                                                                  | Scope evaluation and handshake grants ([#2607]); control-token pipeline ([#2609]); cross-repository scope freeze ([#2664]).      | `terminal.*` never covers session administration; a connection, session id, or terminal id grants nothing; consumer adapters never receive a `daemon.*` grant (the capability file is not hidden from a same-uid adapter); inspect-only cannot create. |
| D-08 | Server-assigned random per-connection `client_id`; the server captures the authenticated peer identity; a consumer correlation value is hashed and only its digest is audited.                                                                                                                                                                                                                                                                                                                        | Handshake identity fields ([#2607]); audit attribution ([#2603]).                                                                | No durable client identity and no client-supplied id, header, or path parameter as authority; a reconnect always gets a new `client_id`; raw correlation strings are never stored.                                                                     |
| D-09 | One controller plus bounded observers; observation requires a single-use, TTL-bound, attributed, revocable grant minted by the controller or operator; control is claimed with the control token, which rotates onto the claiming lease, and moves only by explicit, attributed `control.transfer`; a controller disconnect vacates at lease expiry; the controller lease owns terminal input and is the only lease that may resize.                                                                  | Lease model and transfer ([#2609]); lease expiry and events ([#2602]).                                                           | No second controller, no self-granted observation, no implicit transfer, no observer input or resize, no control acquisition by reconnect without the token.                                                                                           |
| D-10 | Attach returns a snapshot at the current revision plus a bounded backlog with explicit truncation; per-session revision order; at-least-once within a live lease; control frames are never silently shed, otherwise the lease closes with `TerminalEventLost`.                                                                                                                                                                                                                                        | Event ring and terminal-event guarantee ([#2602]); `V-21`, `V-23`, `V-24`, `C-06` ([#2665]).                                     | No unbounded replay; no PTY bytes, terminal text, prompts, tool output, or provider payloads in the session stream; `status` remains the reconciliation read.                                                                                          |
| D-11 | `{major, minor}` version; same major with `min_client_minor <= client minor <= server minor` is accepted, every other case is a typed refusal before any operation; capabilities are explicit and fixed per connection.                                                                                                                                                                                                                                                                               | Handshake negotiation ([#2607]); service version constants ([#2606]); version freeze ([#2664]); `V-01`/`V-02` ([#2665]).         | No best-effort downgrade, feature-probe fallback, or second served major; an unknown method is `InvalidMethod`, never a silent no-op.                                                                                                                  |
| D-12 | Clients heartbeat their leases; the server monotonic clock is authoritative; any successful request naming a lease refreshes it; staleness detaches only and never aborts.                                                                                                                                                                                                                                                                                                                            | Lease expiry and heartbeat ([#2602], [#2609]); `V-06` ([#2665]).                                                                 | No abort on silence, no wall-clock trust, no terminal reason produced by staleness; transport idle closes the connection only.                                                                                                                         |
| D-13 | The daemon owns transport idle, request, spawn bind, attach lease, retention, abort grace, drain grace, and orphan reap bounds; the consumer owns the execution deadline and expresses it as an abort with `consumer_timeout`; there is no default execution deadline.                                                                                                                                                                                                                                | Bounds enforcement ([#2603]); abort and request-timeout handling ([#2609]); `V-19` ([#2665]).                                    | No daemon-imposed execution deadline; a consumer timeout never collapses into generic cancellation; an unknown outcome is reconciled with `status` before any mutating retry.                                                                          |
| D-14 | Every limit is advertised at handshake as `{effective, default, system_max}` and enforced with whole-request refusal; system maxima are compiled; user configuration may lower the effective value but never raise it above the maximum. The contract's Resource limits section is normative for enforcement.                                                                                                                                                                                         | Limit table and enforcement ([#2603]); transport-bound inheritance ([#2607], [#2664]); `V-04`, `V-08`, `V-20`, `V-23` ([#2665]). | No system-maximum increase without an attributable contract revision and security review; no partial mutation without a typed result on refusal; no registry, lease, connection, or journal structure without a bound.                                 |
| D-15 | ADR 0002 tiers apply. Linux x86_64 is the first cell; Windows x86_64 and macOS ARM64 are conformance-gated and unadvertised until native-runner evidence; unsupported cells return typed `UnsupportedPlatform` or no endpoint.                                                                                                                                                                                                                                                                        | Platform-cell implementation ([#2604]); release eligibility ([#2666]); `V-25` through `V-28` ([#2665]).                          | No Windows/macOS advertisement, no fallback or weaker transport, no TCP listener, no cross-compilation or emulation as evidence; namespace, SID, and elevation mismatches fail closed.                                                                 |
| D-16 | Lifecycle and refusal records only: peer identity, client id, instance, session, generation, revision, action, static result code, counts, and limits. Never terminal content, argv, env, clipboard, prompts, provider payloads, or tokens; the sink is owner-private, bounded, and not readable over the service.                                                                                                                                                                                    | Audit sink and attribution ([#2603]); `C-07`, `V-33` ([#2665]); `P0-AC-026` evidence ([#2608]).                                  | No terminal data, secrets, or tokens in audit or diagnostics; audit is not a durable ledger; `audit_degraded` refuses mutations closed while reads continue.                                                                                           |
| D-17 | The daemon never restarts a worker and never rebinds a session; a retry is a new session with a new id, a new control token, and a generation starting at 0.                                                                                                                                                                                                                                                                                                                                          | Abort and failure disposition ([#2609]); no-restart terminal events ([#2602], [#2665]).                                          | No automatic repair, no second worker for a run that may still be alive, and no rebind after a future worker enablement without a superseding contract.                                                                                                |
| D-18 | Keyed methods (create, attach, grant mint, transfer) carry a client-generated 128-bit key; abort, kill, stop, detach-other, and grant revoke are keyless and naturally idempotent, so capacity can never block termination or revocation. `session.create` uses a separate pre-session store indexed by `(uid or SID, key)`; duplicates return a descriptor or the terminal snapshot; snapshots are recomputed on replay; fingerprint conflicts are refused; both stores are bounded and fail closed. | Idempotency store ([#2603]); create/abort/kill/transfer dedupe ([#2609]); `V-07`, `V-19`, `V-31` ([#2665]).                      | No eviction or retirement that could permit a duplicate effect; create keys are token-equivalent secrets; a conflict or capacity refusal applies nothing; create idempotency does not survive a restart.                                               |

No decision in the table is conditional on another decision. The ordering in the
next section is a delivery order, not a precedence order.

## Slice boundaries and unlocking order

Promotion changes what may be planned and reviewed; it does not start Core
implementation. The order below is the boundary a reviewer should enforce.

| Step | Work                                                                                 | May start after                                                  | May merge after                                                                                  |
| ---- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0    | Wheel adapter and fake server (consumer side, labeled `candidate-not-bittyd`)        | This promotion; the surface is accepted and the corpus is frozen | Fake-only evidence never closes a real-service row; no merge gate in this repository             |
| 1    | Independent security design review of the accepted contract (first phase of [#2608]) | This promotion                                                   | Review records APPROVE or a defect list; defects become tracked tasks, never silent fixes        |
| 2    | Crate and binary seam ([#2606])                                                      | Step 1 APPROVE                                                   | One-way dependency check, `cargo check`, `fmt`, clippy, no listener, no autostart                |
| 3    | Registry and generations ([#2601]); IPC service ([#2607])                            | Step 2 seam merged                                               | Slice acceptance criteria plus the P0 controls that slice touches                                |
| 4    | Attach, detach, abort ([#2609])                                                      | Registry and IPC service merged                                  | Slice acceptance criteria; stale-generation and duplicate-effect tests                           |
| 5    | Event stream ([#2602]); limits, retention, idempotency, audit ([#2603])              | Step 4 merged                                                    | Slice acceptance criteria; terminal-event guarantee and audit secrecy tests                      |
| 6    | Platform cells ([#2604])                                                             | IPC service merged                                               | Linux x86_64 native evidence; other cells unadvertised until their native-runner run is recorded |
| 7    | Conformance harness ([#2605]) and the frozen corpus ([#2665])                        | All implementation slices; contract-level work can start earlier | Fake/real parity gate; real-service rows only from the real service                              |
| 8    | Release eligibility ([#2666])                                                        | Steps 1 through 7                                                | Owner authorization is still a separate action; this step never tags or publishes                |

Two contract-freeze issues run in parallel with the implementation steps because
they freeze vocabulary the slices consume:

- [#2664] freezes IPC scopes, handshake, and version spelling. It is
  blocked by this promotion and by the security design review, not by the
  implementation.
- [#2665] freezes the shared `V-01` through `V-34` and `C-01` through
  `C-19` corpus. The corpus is frozen by this promotion and extended by the
  2026-10-27 revision; the drivers are not built.

## Promotion sign-off (P0 review)

One owner approval exists and no security approval exists. The table records the
dated sign-off state and the reviews that do not exist yet; a missing row is not
an approval.

| Reviewer                           | Required for                                                                                      | Status 2026-10-27                                                                                                       | Evidence or next gate                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Project initiator (owner)          | `D-01`, `D-05`, `D-07`, `D-14`, `D-15`, and final promotion of the decision set                   | **APPROVED 2026-10-27** for the decisions and contract text                                                             | This record; gate [bitty#2663](https://github.com/bitty-terminal/bitty/issues/2663)                                          |
| First independent security review  | Trust boundary, IPC framing, capability and authentication, resource bounds, audit, failure modes | **NEEDS-FIX 2026-10-27**; `B-1` through `B-13` recorded                                                                 | Dispositions in the contract's [first revision section](bittyd-session-host-contract.md#security-review-revision-2026-10-27) |
| First revision                     | Apply every `B-*` finding, choosing least privilege where a choice is offered                     | **SUBMITTED 2026-10-27** for the second review                                                                          | No approval claimed                                                                                                          |
| Second independent security review | The revised contract, the `B-1` through `B-13` dispositions, and the residual-risk section        | **NEEDS-FIX 2026-10-27**; `F-1` through `F-8` and `F-11` blocking; `F-9`/`F-12`–`F-16` tracked, `F-10` and `F-13` fixed | [#2608]; contract's [second revision section](bittyd-session-host-contract.md#second-security-review-revision-2026-10-27)    |
| Second revision                    | Apply every `F-*` P0/P1 finding and record follow-up dispositions                                 | **SUBMITTED 2026-10-27**; third review pending                                                                          | This table; no approval claimed                                                                                              |
| Third independent security review  | The second revision, the `F-*` dispositions, and the follow-up table                              | **PENDING** — required before implementation starts                                                                     | [#2608] must record an explicit APPROVE or a defect list                                                                     |
| Core architecture reviewer         | Crate seam, single-writer rule, registry and counter semantics                                    | **NOT RECORDED** as a separate sign-off                                                                                 | No claim is made; the first architecture review is the [#2606] crate-seam review                                             |
| Wheel consumer reviewer            | Adapter boundary, lifecycle truth ownership, and the `V-01` through `V-34` mapping                | **NOT RECORDED**                                                                                                        | Requirements remain candidate input; Wheel adapter work stays fake-server-only                                               |
| bitty-ai consumer reviewer         | Hosted-worker boundary and `worker_sessions=false`                                                | **NOT RECORDED**                                                                                                        | Worker hosting stays disabled regardless; no build may advertise it                                                          |

The owner approval covers scope, destructive behavior, authority, platform
claims, and the contract text. It does not cover, and must not be cited as:

- an independent security approval;
- a Core architecture approval separate from the owner decision;
- a Wheel or bitty-ai consumer confirmation;
- evidence that any control is implemented.

The implementation-authorization line is: **no Core implementation slice starts
before the third independent security design review records an APPROVE, and no
slice merges before its P0 evidence exists.** Neither `NEEDS-FIX` is an
authorization and neither revision is an approval.

### Third-review checklist

The third independent review must verify, in addition to the six areas and the
seven mechanisms:

1. **F-1** — `session.abort`, `session.kill`, and `daemon.stop` are keyless and
   can never be refused by idempotency capacity; D-18, the abort/kill surface,
   and C-18 agree.
2. **F-2** — `session.grant`, `session.grant.revoke`, `session.abort`,
   `session.control.transfer`, detach-other, and a controller claim
   (`session.attach` with role `controller`) require the current controller
   lease or the current token at a vacant control relation; scope alone never
   suffices; observers are always denied; `ControllerRequired` and
   `InvalidControlToken` are applied consistently.
3. **F-3** — a reserved record is actionable through its pre-recorded
   containment identity; the subreaper double-run residual is stated; D-18 no
   longer calls an old worker an "orphan candidate"; the adapter never retries
   an unfenced create.
4. **F-4** — event rings and per-session idempotency stores are released at the
   terminal transition; the 256 MiB per-session content cap is explicit and
   separate from the metadata aggregate; the arithmetic includes every store.
5. **F-5** — the stored-result descriptor arithmetic is feasible at the stated
   count and byte bounds; snapshots are recomputed on replay; the create record
   stores the terminal id once as a digest and the token as 32 bytes; the
   descriptor's result reference names the lease or grant it created.
6. **F-6** — raw `terminal_id` never enters audit; `terminal_id_digest` and the
   non-secret `grant_id` are the audit targets.
7. **F-7** — `daemon.host_grant` is operator-only, peer-bound, TTL-bounded, and
   audited; one static code applies per missing authority
   (`ConsentRequired` for host consent, `ScopeViolation` for `process.spawn`).
8. **F-8** — `swept` means the whole cgroup subtree or subreaper descendant set
   is empty; every terminal transition terminates that identity before cleanup
   classification; surviving descendants become journal records.
9. **Follow-ups** — `F-9`, `F-10`, `F-12`, `F-13`, `F-14`, `F-15`, and `F-16`
   each have a disposition in the contract's review-2 table; `F-10` and `F-13`
   are fixed, the rest are tracked.
10. **Scope** — the review-wide obligations list seven mechanisms, not five.
11. **No approval claim** — the first two reviews remain `NEEDS-FIX`, and the
    third review alone can record an APPROVE.

## Independent security review requirements

The review covers six areas. Each area names what must be checked and what
evidence closes it. A review that covers fewer areas is incomplete and does not
authorize implementation.

> **Revision note, 2026-10-27.** The first review returned `NEEDS-FIX` with
> findings `B-1` through `B-13`; its revision is recorded in the contract's
> [first revision section](bittyd-session-host-contract.md#security-review-revision-2026-10-27).
> The second review returned `NEEDS-FIX` with `F-1` through `F-8` and `F-11`
> blocking and `F-9`/`F-12`–`F-16` tracked, with `F-10` and `F-13` fixed; its revision is in the
> [second revision section](bittyd-session-host-contract.md#second-security-review-revision-2026-10-27).
> The six areas below still apply; the third review additionally verifies every
> `B-*` and `F-*` disposition and that no disposition weakens a P0 control.

### 1. Trust boundary

- Same-user posture: `bittyd` is same-user infrastructure, not a privilege
  boundary or a multi-user authentication mechanism. The residual risk that a
  compromised account controls the daemon must be stated, not implied.
- Endpoint: owner-private `0700` runtime directory, `0600` socket, owner and
  mode verified at startup and on a bounded interval; a replacement, mode change,
  or owner change stops acceptance and exits 6.
- Peer credentials: captured before request parsing; re-checked before every
  privileged action (create, controller attach, abort, kill, transfer,
  detach-other, stop); a dead peer, changed identity, inherited descriptor, or
  pid reuse fails closed with `Unauthenticated`.
- Namespaces and containers: a uid that is equal only through a user namespace or
  container mapping is `Unauthenticated`, never same-user success.
- Windows: current-user-only pipe DACL, remote-client rejection at the pipe
  level, pid plus token SID comparison, and a fail-closed rule for elevation,
  AppContainer, or integrity-level mismatch.
- No TCP listener, no abstract-namespace socket, no `/tmp` fallback, and no
  discovery service on any cell.
- Required evidence: negative tests for a foreign uid/SID, tampered endpoint
  mode/owner/replacement, peer exit mid-request, pid reuse, and a post-start
  listener scan. Maps to `P0-AC-021`, `T-09`, and `R-011`.

### 2. IPC framing

- The service inherits `bitty-ipc` v1 framing and bounds unchanged: 256 KiB
  frame, 256 KiB streamed chunk, 64 pending requests, 256 channel capacity,
  100 req/s sustained with 200 burst, 16 connections per endpoint, and 1 MiB
  decoded payload.
- Framing and transport failures stay in the accepted taxonomy; a session
  outcome is never returned as a transport error, and a transport error is never
  substituted for a terminal reason.
- Partial frames, over-bound frames, pending-limit pressure, channel pressure,
  and rate limiting each produce a typed refusal with counts and no partial
  request state.
- The session event stream carries no PTY bytes, terminal text, prompts, tool
  output, or provider payloads; the content plane stays in the accepted terminal
  and IPC contracts.
- Method names follow the `bitty-ipc` dotted grammar; unknown methods are typed,
  never silent no-ops.
- Required evidence: transport tests for frame, payload, pending, channel, and
  rate limits; a partial-frame test; a corpus-level assertion that no session
  event carries content. Consumed with [#2664].

### 3. Capability and authentication

- New `session.*` and `daemon.*` families are additive and deny-by-default; no
  scope implies another; a higher-sounding name is not a superset.
- Evaluation order is server-side and fixed: version, peer identity, scope,
  visibility, control relation, generation. A missing scope is decided before
  session lookup, and a caller that holds the scope but lacks visibility gets the
  same `NotFound` as an unknown session, so denial is not an existence oracle.
- `terminal.*` keeps its meaning and is never stretched to cover session
  administration. A controller lease still needs `terminal.input` to write input;
  an observer still needs `terminal.inspect` to read content.
- Control token: 256-bit OS CSPRNG, returned once, stored as a digest, scoped to
  one session, required for controller claim, abort, and transfer, and never
  logged, inherited, placed in a child environment, or recoverable through a
  reset path. Losing it degrades to observation.
- Operator capability: confirm the honest description as an explicit-intent gate
  and not a privilege boundary against a hostile same-user process. Confirm the
  file mechanism or require a replacement. Confirm it is absent from
  environments, children, logs, diagnostics, and consumer surfaces, and that a
  consumer adapter can never present it.
- `client_id` is server-assigned and non-authoritative; a consumer correlation
  value is hashed to an audit-only digest; no client-supplied id, header, or
  path parameter grants authority.
- No bypass API, no temporary privileged path, and no scope widening without a
  new connection and a new server-side grant.
- Required evidence: the scope matrix, token-absence and token-theft tests, a
  child-environment inspection, a bypass-API search, and negative tests for
  version mismatch and missing operator capability. Maps to `P0-AC-022`,
  `P0-AC-023`, `P0-AC-024`, `P0-AC-025`, `T-09`, `T-10`, and `R-012`.

### 4. Resource bounds

- Every limit in the contract's `D-14` table is either enforced or explicitly
  deferred with a tracked defect. The review must not accept a table row that
  exists only in prose.
- System maxima are compiled constants; user configuration may lower a value but
  never raise it above the maximum; raising a maximum requires an attributable
  contract revision and this review.
- Refusal is whole-request: no partial session, no partial lease, no partial
  idempotency record, and no daemon exit. A refusal carries counts and the limit
  that was hit, and echoes no caller bytes.
- The aggregate bound in the contract is argued against actual allocations, not accepted as arithmetic: session records, live-session event rings and descriptor idempotency stores, connection pending/outbound buffers, lease queues, create keys, observer grants, and host-consent grants total 72,057,856 bytes of session-host metadata (76,514,304 with audit and journal). Event rings and idempotency stores are released at the terminal transition, so retained records cost metadata only. The content plane is separate: `max_content_bytes_per_session` is 256 MiB and the system-maximum worst-case content allocation is 16 GiB, satisfying ADR-0019 `D3`'s per-terminal bound; the accepted `IMG-4` per-window aggregate image budget is unchanged.
- The event ring, retention TTL, idempotency store, orphan journal, spawn
  specification, audit segments, and lease caps are each bounded, and capacity
  failure fails closed instead of evicting a live record.
- `state_revision` and `generation` overflow fail closed; no counter wraps or
  reuses a value.
- Required evidence: a table-driven test per limit (advertised equals enforced),
  capacity-pressure tests for each bounded store, and a no-partial-state
  assertion per refusal.

### 5. Audit and secret minimization

- Records contain only the contract's field set: timestamp, server monotonic
  time, instance, session, generation, revision, actor, action, static result
  code, counts, limits, and terminal state/reason/exit/cleanup.
- Records never contain terminal text, PTY bytes, scrollback, clipboard, argv,
  environment values, file contents, prompts, transcripts, tool output,
  provider payloads, secret values, the control token, or the operator
  capability.
- The sink is owner-private (`0700` directory, `0600` file), bounded by
  `audit_file_bytes` and `audit_segments`, and is not readable over the service.
- If the sink cannot be written, a privileged mutation is refused with `Internal`,
  changes no state, and surfaces `audit_degraded=true`; reads continue. Audit
  loss on a crash is stated as best-effort, never presented as a durable ledger.
- Diagnostics, traces, and crash reports follow the same minimization rule; no
  seeded secret may appear in any of them.
- Required evidence: seeded-secret tests across argv, env, PTY text, clipboard,
  prompts, tokens, and capabilities; file-mode and rotation tests; an
  audit-degraded test; a crash-tail statement. Maps to `P0-AC-026`, `T-11`, and
  `R-014`.

### 6. Failure modes

- A refused request leaves no partial mutation without a typed result, keeps
  the daemon responsive, and never takes an unrelated session down.
- A stale generation, stale instance, or collected session returns the typed
  result and applies nothing; `status` remains the reconciliation read.
- Terminal-event loss is always visible as a delivered event or a typed
  `TerminalEventLost` close; a slow reader cannot block lifecycle processing or
  another client.
- Endpoint tamper, failed peer check, and failed authentication invariants fail
  closed; exit 6 is reserved for them.
- An unverifiable orphan record is reported and never signalled; a verified
  exact identity is reaped without adoption.
- Spawn failure, worker signal death, supervision loss, drain that exceeds the
  deadline, and forced stop each produce the correct terminal reason and cleanup
  class.
- Daemon absence stays supported: `bitty --safe`, headless tests, CI, and a plain
  invocation work with no daemon, and no startup or diagnostics path requires it.
- Required evidence: fault injection for transport drop during abort, queue
  pressure, pending limit, partial frame, instance change, and peer death;
  `C-01` through `C-19` results from the real service; daemon-absence tests.

### Review-wide obligations

Beyond the six areas, the reviewer must:

- update the threat model for the local-daemon transition and record
  risk-register entries for the new mechanisms;
- record `P0-AC-021` through `P0-AC-026` evidence or a tracked defect for each;
- scrutinize the seven new mechanisms named by the contract: the control token,
  the operator capability, explicit child environments, two-phase orphan
  reaping, observer grants, the pre-session create-key store, and the
  worker-disabled state;
- confirm the session scope family is additive and that `terminal.*` semantics
  are unchanged;
- confirm the single-owner PTY rule and the child-scope rule each have a
  negative test;
- recommend the `D-01` worker disposition; the recommendation is advisory and
  cannot enable worker hosting without an ADR 0019 amendment. The capability
  stays `false` regardless;
- record an explicit APPROVE or a defect list in [#2608]. A missing
  review is an implementation blocker, not a comment.

This record does not downgrade any P0 control to a suggestion, and it does not
claim that any control above is implemented.

## Out of scope

### Remote transport

No remote transport is accepted, implied, or prepared by this promotion:

- no remote UI, remote attach, SSH, mobile control plane, or network listener;
- no method served to a non-local client, and no discovery, port, registry key,
  or broadcast mechanism;
- ADR 0008's second trust-boundary gate stays unsolved, and a future remote
  record must clear the admission bar in the accepted
  [Remote Session Decision](remote-session-decision.md);
- a local session scope never covers a remote method, and accepting the local
  daemon never implies accepting a remote frontend.

### Plugin access

- Extensions and plugins never talk to `bittyd`. They gain no session, daemon,
  registry, lease, or attach authority from this contract.
- Plugins receive no session id, no control token, no operator capability, and
  no PTY descriptor; the single PTY owner stays `bittyd` for sessions it hosts.
- ADR 0019's exclusions stay: no change to the plugin capability grammar and no
  change to the six-layer effective-capability intersection.
- The draft [bittyd Scope Charter](bittyd-scope-charter.md) keeps its exclusion
  set; it remains a draft and is not promoted by this record.

### Windows and macOS scope

- The contract types Windows x86_64 and macOS ARM64 as conformance-gated cells.
  This promotion does not advertise either cell and provides no evidence for
  either.
- No Windows named pipe, SID comparison, DACL, elevation rule, macOS
  peer-credential call, or FreeBSD peer-credential equivalent is implemented by
  this record.
- Implementability statements in the contract are design intent, not
  native-runner evidence. Cross-compilation, emulation, and a passing build are
  never evidence for a Tier 1 cell.
- Linux ARM64, macOS x86_64, and FreeBSD x86_64 keep their Tier 2 best-effort
  cadence; other cells stay typed unsupported with no transport.

### Also outside this promotion

- session persistence across a daemon restart, and any adoption of a surviving
  worker;
- autostart, service units, or a desktop-launch requirement;
- worker hosting of any kind;
- the terminal content plane (PTY bytes, rendering, scrollback, input encoding);
- packaging, artifacts, tags, CDN/R2 mutation, and current-release eligibility;
- implementation of any slice, including the crate seam;
- promotion of the scope charter or of the Wheel requirements document.

## Dependent issues

The dependent issue bodies live in the `bitty` repository and are **not** edited
by this documentation change. Each body needs the same two mechanical updates:

1. repoint the contract path from
   `bittyd-session-host-contract-candidate.md` to
   `bittyd-session-host-contract.md`;
2. replace the candidate qualifier with the accepted status and keep the
   security gate.

Canonical replacement line for the `Contract:` field:

```text
Contract: specifications/bittyd-session-host-contract.md (accepted 2026-10-27 via bitty#2663; revised twice 2026-10-27 for B-1..B-13 and F-1..F-8/F-11; third independent security review required before implementation).
```

| Issue                                                        | Slice                             | Decisions consumed                     | Body update needed                                                                                                                 |
| ------------------------------------------------------------ | --------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [#2601](https://github.com/bitty-terminal/bitty/issues/2601) | Registry and generations          | D-02, D-03, D-04, D-06, D-14           | Repoint the path; drop `(candidate)`; state that identity, counters, lifecycle, retention, and the orphan journal are accepted.    |
| [#2602](https://github.com/bitty-terminal/bitty/issues/2602) | Event stream                      | D-10, D-12, D-03                       | Repoint the path; record that control frames may only close as `TerminalEventLost` and that staleness detaches only.               |
| [#2603](https://github.com/bitty-terminal/bitty/issues/2603) | Limits, retention, idempotency    | D-14, D-16, D-18                       | Repoint the path; record the accepted defaults and system maxima as the implementation target.                                     |
| [#2604](https://github.com/bitty-terminal/bitty/issues/2604) | Platform cells                    | D-15, D-07                             | Repoint the path; keep Windows and macOS explicitly unadvertised until native-runner evidence exists.                              |
| [#2605](https://github.com/bitty-terminal/bitty/issues/2605) | Conformance harness               | D-01 through D-18, D-10, D-16          | Repoint the path; record that the corpus is frozen and fake runs stay labeled `candidate-not-bittyd`.                              |
| [#2606](https://github.com/bitty-terminal/bitty/issues/2606) | Crate and binary seam             | D-11, D-02, single-writer rule         | Repoint the path; change "blocked on contract acceptance" to "blocked on the security design review".                              |
| [#2607](https://github.com/bitty-terminal/bitty/issues/2607) | IPC service                       | D-07, D-08, D-11, D-15, error taxonomy | Repoint the path; record the accepted scope family and that [#2664] freezes the spelling.                                          |
| [#2608](https://github.com/bitty-terminal/bitty/issues/2608) | Security review and P0 evidence   | All rows; D-01 recommendation          | Split the body into a pre-implementation design review and a pre-merge P0 evidence review; the design review now gates all slices. |
| [#2609](https://github.com/bitty-terminal/bitty/issues/2609) | Attach, detach, abort, kill       | D-03, D-04, D-07, D-09, D-17, D-18     | Repoint the path; record that the control token, transfer, and no-rebind rules are accepted.                                       |
| [#2664](https://github.com/bitty-terminal/bitty/issues/2664) | IPC scope and version freeze      | D-07, D-08, D-11, D-14                 | Repoint the path; the blocker changes from "contract promotion" to the security design review.                                     |
| [#2665](https://github.com/bitty-terminal/bitty/issues/2665) | Fake and real conformance harness | D-01 through D-18, `V-*`, `C-*`        | Repoint the path; record that the corpus is frozen by promotion while the drivers are not built.                                   |
| [#2666](https://github.com/bitty-terminal/bitty/issues/2666) | Release eligibility gate          | D-01, D-05, D-15, [#2608]              | Repoint the path; the accepted-contract condition is satisfied; security and implementation evidence still gate eligibility.       |

Closure condition for [bitty#2663](https://github.com/bitty-terminal/bitty/issues/2663):
this record merged, the contract and register updated, and each dependent body
repointed. The issue does not wait for the security review, because that review
gates implementation rather than the decision record.

## Verification

Local gates for this documentation change:

- the pinned docs gates in `bitty-terminal-docs`, run directly because Bun
  segfaults on this host: Prettier 3.9.6 format check, markdownlint-cli2
  0.23.1, `check-docs` local links, frontmatter metadata, English-only
  language, `AGENTS.md`/`TODO.md` budgets, hygiene, and actionlint 1.7.12;
- `git diff --check` for whitespace errors;
- no workflow file changed, so no `act -n` re-run is required by this diff;
- the contract rename is verified by the local link gate, which fails on any
  remaining in-repository reference to the old path;
- both 2026-10-27 revisions are Markdown prose only: no code, script, workflow,
  configuration, lockfile, fixture, or submodule pin changes, and no vector was
  executed against a real `bittyd`;
- `just check` is **not** recorded green on this host: Bun segfaults, so the
  pinned Prettier, markdownlint-cli2, check-docs, and actionlint gates were run
  directly (see the delivery report and the contract's verification section).

Review checklist for this record:

1. Every `D-01` through `D-18` row has a disposition, an unlocked slice, and a
   closed boundary; no row restates mechanics that belong to the contract.
2. No sign-off is claimed beyond the owner's 2026-10-27 approval; both
   security reviews are recorded as `NEEDS-FIX`, the second revision as
   submitted, and the third review as pending.
3. The security review scope covers all six areas and names the evidence each
   one requires.
4. Remote transport, plugin access, and Windows/macOS advertisement are recorded
   as out of scope with the owning source named.
5. Every dependent issue is listed with the exact body update it needs.
6. The contract status, the register, and the cross-references agree.

## Alternatives considered

| Alternative                                                       | Trade-off                                                                                                                    | Disposition                                                                                                   |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Accept only `D-01`, `D-05`, `D-07`, `D-14`, and `D-15` now        | Smaller decision surface; leaves the remaining thirteen answers candidate, so the blocked slices still lack a frozen target. | Rejected — the owner promoted the full set, and partial acceptance recreates the blocker.                     |
| Keep the contract candidate until the independent security review | Keeps the P0 gate in one step; freezes consumer work and the vector corpus, and gives the reviewer no stable text.           | Rejected — acceptance is split from implementation authorization instead.                                     |
| Enable worker sessions with the promotion                         | Would unblock Wheel's hosted path; violates ADR 0019's slice and skips the spawn/credential/cleanup review.                  | Rejected — `worker_sessions` stays `false` with a typed refusal.                                              |
| Keep the `-candidate` filename and only change `status`           | No inbound link breakage; accepted documents in this corpus would then carry a candidate suffix.                             | Rejected — the corpus convention is no suffix; the dependent issue bodies are repointed in the same delivery. |
| Copy the D-01..D-18 mechanics into this record                    | One self-contained promotion page; creates a second normative source that can drift from the contract.                       | Rejected — this record carries disposition and boundary only; the contract stays authoritative.               |
| Record security as "approved with follow-ups"                     | Would unblock implementation immediately; fabricates an approval that does not exist.                                        | Rejected — the review is recorded as pending, with its exact scope fixed here.                                |

## Affected contracts

| Contract                                                                                     | Effect                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md)                              | Becomes `status: accepted`, loses the `-candidate` suffix, and gains the dated acceptance statement and the promotion-record pointer. Mechanics revised twice on 2026-10-27: `B-1` through `B-13`, then `F-1` through `F-8` and `F-11`; neither revision claims approval. |
| [Specifications register](README.md)                                                         | The contract moves from the draft table to the accepted table; this record gains its own accepted row.                                                                                                                                                                    |
| [bittyd Scope Charter](bittyd-scope-charter.md)                                              | Stays `draft`; its references to the contract now read `accepted` instead of `candidate`/`draft`. No mechanism-floor change.                                                                                                                                              |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md)                 | Stays `draft` consumer input; its Core-response pointer now names the accepted contract and this record.                                                                                                                                                                  |
| [Multiplexer Decision](multiplexer-decision.md)                                              | Status qualifiers for the contract change from draft to accepted; the decision's own rules are unchanged.                                                                                                                                                                 |
| [Remote Session Decision](remote-session-decision.md)                                        | Status qualifiers for the contract change; the no-remote exclusion is confirmed, not weakened.                                                                                                                                                                            |
| [Positioning in the Agent Era](../product/positioning-in-the-agent-era.md)                   | The contract reference drops its candidate label; no product claim changes.                                                                                                                                                                                               |
| ADR 0008, ADR 0019, ADR 0002, security corpus, `bitty-ipc` `RC-9`/`RC-10`, IPC and Agent RFC | Unchanged and authoritative. This record adds no scope and weakens no control.                                                                                                                                                                                            |
| `bitty` issues [#2601] through [#2609], [#2664] through [#2666]                              | Not edited here; each needs the repoint and status update listed in [Dependent issues](#dependent-issues).                                                                                                                                                                |

## Open points

These are not globally numbered open questions; they stay here until one blocks
a current-milestone gate. None of them blocks the accepted decision set.

- The third independent security review across the six areas, before
  implementation starts. Owned by [#2608]. Both prior reviews returned
  `NEEDS-FIX` on 2026-10-27; the second revision is submitted. A reopened
  `B-*` or `F-*` row becomes a tracked defect.
- `#2608`'s body currently schedules the review after the implementation
  slices. The owner split recorded here makes the design review a
  pre-implementation gate and the P0 evidence a pre-merge gate; the issue body
  needs that split.
- A separate Core architecture sign-off is not recorded. The crate-seam review in
  [#2606] is the first architecture gate; whether the owner promotion
  suffices as the architecture decision is for review to confirm.
- Wheel and bitty-ai consumer confirmation of the adapter boundary is not
  recorded. The requirements document remains candidate input.
- Operator-capability mechanism: owner-private file versus a distinct operator
  endpoint. The requirement is decided; the mechanism is a security review
  choice.
- Session-scope registry ownership: `bitty-ipc` versus a bittyd-owned service
  registry. It must be one additive registry and no existing scope may change
  meaning. Owned by [#2664].
- Exact JSON key spellings and frame layout, frozen by [#2664] and the
  conformance corpus.
- Orphan-journal fsync cadence and the exact process-identity syscalls per cell.
- Windows integrity-level and AppContainer rules beyond "fail closed", and the
  macOS peer-credential call choice, both pending [#2604] and its native
  evidence.
- Platform advertisement order after Linux x86_64, driven by native-runner
  evidence.
- Whether the scope charter is promoted separately. This record does not promote
  it.

## Acceptance criteria

This promotion record is complete when:

1. `D-01` through `D-18` each have an accepted disposition, an unlocked slice,
   and a closed boundary, and the contract remains the only mechanics source.
2. The owner approval is dated and scoped, and no security, architecture, Wheel,
   or bitty-ai approval is fabricated.
3. The third independent security review scope covers the trust boundary, IPC
   framing, capability and authentication, resource bounds, audit, and failure
   modes, names the evidence each requires, and verifies every `B-1` through
   `B-13` and `F-1` through `F-8`/`F-11` disposition.
4. Remote transport, plugin access, and Windows/macOS advertisement are recorded
   as out of scope with their owning sources.
5. Every dependent issue is cross-referenced with the exact body update it
   needs, and no other repository is edited by this change.
6. The contract status, this record, the specifications register, the charter
   reference, the requirements pointer, and the two decision records agree.
7. Every `B-1` through `B-13` and `F-1` through `F-8`/`F-11` finding has a dated
   disposition in the contract and the third independent review remains the
   implementation gate.
8. The pinned docs gates and `git diff --check` are green on the change;
   `just check` is not recorded because Bun segfaults on the revision host.

## P0 Review Sign-off

The promotion sign-off table above is the single source of truth; this section
records the P0 disposition only.

| Control                                  | Disposition                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-AC-021 endpoint and peer credentials  | Not evidenced. Design accepted; security review before implementation, evidence before first merge.                                                                      |
| P0-AC-022 per-action scopes              | Not evidenced. Scope family accepted; review must confirm additive, deny-by-default, no bypass API.                                                                      |
| P0-AC-023 child process scope limitation | Not evidenced. Explicit child environment accepted; no worker spawn exists to test.                                                                                      |
| P0-AC-024 Agent read-only default        | Not evidenced. Worker hosting disabled; no content plane in the session stream; `session.host` is not baseline and create needs per-client consent plus `process.spawn`. |
| P0-AC-025 DevTools scopes                | Not evidenced. The session family grants no debug, trace, or control scope.                                                                                              |
| P0-AC-026 secret minimization            | Not evidenced. Content-free audit accepted; seeded-secret tests are a review obligation.                                                                                 |
| Bounded persistence and containment      | Not evidenced. In-memory registry, bounded sinks, whole-request refusal, and the `B-6`/`B-9` journal and limit rules accepted as design.                                 |
| Single writer and single PTY owner       | Not evidenced. Accepted as design; negative tests are implementation acceptance criteria.                                                                                |
| Daemon absence                           | Not evidenced. `bitty --safe`, headless, CI, and plain invocation must keep working with no daemon.                                                                      |

No P0 control is downgraded, waived, or converted into a suggestion by this
promotion or by the 2026-10-27 revision. Where evidence cannot exist yet, the gap
is recorded here and assigned to [#2608]. Both security reviews are
`NEEDS-FIX`, the second revision is submitted, and the third review is pending;
this table claims no approval for either revision.

## References

- [bittyd Session-Host Contract](bittyd-session-host-contract.md) — the accepted
  decisions, service surface, limits, conformance matrix, and harness plan.
- [bittyd Scope Charter](bittyd-scope-charter.md) — the draft mechanism floor and
  exclusion set.
- [Wheel consumer requirements for the bittyd session host](bittyd-session-host-requirements-candidate.md)
  — the candidate consumer input and the `V-01` through `V-34` vectors.
- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md),
  [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md),
  and [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md)
  — daemon ownership and trust gates, staging and exclusions, and platform tiers.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  — the normative controls this promotion must not weaken.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  and [`bitty-ipc`](https://github.com/bitty-terminal/bitty-ipc) — transport,
  scopes, error taxonomy, and `RC-9`/`RC-10` bounds.
- [Multiplexer Decision](multiplexer-decision.md) and
  [Remote Session Decision](remote-session-decision.md) — accepted local
  attach/detach dependency and the remote decline with its admission bar.
- [bitty#2663](https://github.com/bitty-terminal/bitty/issues/2663) — this
  promotion gate; [#2546] — the contract parent; [#2601] through
  [#2609] — the implementation slices; [#2664], [#2665],
  [#2666] — the contract freeze, harness freeze, and release-eligibility
  follow-ups.

[#2546]: https://github.com/bitty-terminal/bitty/issues/2546
[#2601]: https://github.com/bitty-terminal/bitty/issues/2601
[#2602]: https://github.com/bitty-terminal/bitty/issues/2602
[#2603]: https://github.com/bitty-terminal/bitty/issues/2603
[#2604]: https://github.com/bitty-terminal/bitty/issues/2604
[#2605]: https://github.com/bitty-terminal/bitty/issues/2605
[#2606]: https://github.com/bitty-terminal/bitty/issues/2606
[#2607]: https://github.com/bitty-terminal/bitty/issues/2607
[#2608]: https://github.com/bitty-terminal/bitty/issues/2608
[#2609]: https://github.com/bitty-terminal/bitty/issues/2609
[#2664]: https://github.com/bitty-terminal/bitty/issues/2664
[#2665]: https://github.com/bitty-terminal/bitty/issues/2665
[#2666]: https://github.com/bitty-terminal/bitty/issues/2666
