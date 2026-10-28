---
title: bittyd IPC Contract (Candidate)
description: Candidate-for-sign-off freeze of the served bittyd IPC surface - one scope registry and revision rule, handshake fields, method and scope table, authorization order, closed refusal set, and the 1.x compatibility rule
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 83
---

# bittyd IPC Contract (Candidate)

> Status: **candidate for sign-off.** This document freezes the cross-repository
> IPC surface that bitty#2664 asks for, limited to what the merged `bittyd`
> service loop and conformance corpus actually serve: the service scope families
> and their registry, the handshake fields, the method and scope table, the
> authorization order, the closed refusal set, and the compatibility rule. It
> restates decisions already accepted in the
> [bittyd Session-Host Contract](bittyd-session-host-contract.md) on 2026-10-27
> and adds no new authority.
>
> It is not `accepted`. The Owner, Security, Architecture, and Consumer reviews
> that bitty#2664 lists as acceptance criteria are **not recorded**; the four
> boxes under [Sign-off](#sign-off) are unchecked. No control in this document
> is verified, and a merged implementation or a green corpus is not a sign-off.
>
> The accepted session-host contract owns every decision; this document owns
> only the spelling and ordering of the service-interface surface. A spelling
> choice here does not reopen a decision, and where the two disagree the
> accepted contract wins.
>
> The service surface is served by `crates/bitty-daemon` on `main` (PR #2761,
> `d360b442f`), with the P1 corrections in PRs #2770 and #2776, the grant-expiry
> revision in PR #2786, and the conformance harness in PRs #2769 and #2771. The
> daemon binds a per-user Unix socket, serves `daemon.negotiate` and the method
> catalog below, and runs the conformance corpus through both the reference fake
> and the real binary on Linux x86_64. The security-sign-off corrections this
> revision records are in review as PR #2794 (`0a584577`) plus a follow-up that
> refuses a post-flush pre-handshake frame; the merged corpus carries 36 vectors
> and PR #2794 adds five. Two catalog methods are not served:
> `daemon.orphans.verify` refuses `UnsupportedCapability` and `session.resize`
> refuses `ScopeViolation` because the daemon grants no `terminal.*` scope. No
> event frame is pushed on a connection. Worker spawn, containment, terminal
> content, and event delivery are deferred, not promised. Grant expiry now
> bumps `state_revision`; an expiry event is still deferred.

| Control          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status           | Candidate for sign-off; four required reviews unchecked; no control verified                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Issue            | [bitty#2664](https://github.com/bitty-terminal/bitty/issues/2664) — freeze bittyd IPC scopes, handshake, and version contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Parent           | [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) — define the bittyd session-host contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Upstream records | Accepted [bittyd Session-Host Contract](bittyd-session-host-contract.md), [promotion record](bittyd-session-host-promotion-record.md), ADR 0008, ADR 0019, `bitty-ipc` v1, security corpus                                                                                                                                                                                                                                                                                                                                                                                                             |
| Consumers        | Wheel CTX-0036 adapter and fake server; `bitty` GUI, `bitty ctl`, and other local clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Implementation   | `crates/bitty-daemon` on `main`: `bittyd start` binds a per-user Unix socket and serves the `bitty-ipc` v1 envelope. The scope registry, handshake, grants, dispatch, audit sink, and peer re-check are merged in PR #2761 (`d360b442f`); the session registry in PR #2751 (`c593afd7`); the P1 corrections in PR #2770 (`57d459f7`); the repeat-detach and grant-revision fixes in PR #2776 (`a1c5639a`); the grant-expiry revision in PR #2786; the conformance harness in PR #2769 (`87463f34`) and PR #2771 (`0b9483f2`); the security-sign-off corrections are in review as PR #2794 (`0a584577`) |
| Served methods   | 15 of the 17 catalog methods. `daemon.orphans.verify` is `Denied/UnsupportedCapability`; `session.resize` is `Denied/ScopeViolation`. No event frame is pushed. Worker spawn, containment, terminal content, and event delivery are deferred                                                                                                                                                                                                                                                                                                                                                           |
| Evidence         | 36 corpus vectors on `main`: 26 shared by the fake and real drivers, 6 real-only, 4 fake-only. PR #2794 adds five vectors (`V-37` to `V-41`), for 41 at the review head (29 shared, 8 real-only, 4 fake-only). The corpus parses through one strict model and runs in `bitty` CI on Linux x86_64. Evidence records are per-cell JSON; a fake run never closes a real row                                                                                                                                                                                                                               |
| Evidence gaps    | No event-wire vector, no `session.resize` success path, no containment/orphan-adoption path, no second served platform cell, and no independent security evidence set. See [Deferred items](#deferred-items)                                                                                                                                                                                                                                                                                                                                                                                           |
| Change authority | Core terminal platform owns this freeze; the security corpus co-owns the trust boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Promotion gate   | Owner, Security, Architecture, and Consumer sign-off recorded, `just check` green, and no new authority introduced                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Document status

### What this freeze does

- It fixes **names**: scope family names, method names, capability names,
  handshake field names, event kinds, refusal codes, and the identifier formats
  already fixed by the accepted contract.
- It fixes **ordering**: the accept/refuse order, the per-request authorization
  order, and the conditions that must not be distinguishable to a client.
- It fixes **compatibility**: what may change inside service major `1`, and what
  requires a new accepted contract.
- It repairs nothing and weakens nothing. Where the accepted contract and this
  document disagree, the accepted contract wins and this document is defective.
- It freezes only what the merged code and corpus actually serve. A method,
  field, event, or control that the code does not serve is named under
  [Deferred items](#deferred-items) or [Open points](#open-points); this
  document does not convert a plan into a promise.
- It does not fix the numeric limit values, the per-cell endpoint discovery
  mechanism, or the conformance fixtures. Those stay with `D-14` and bitty#2603,
  accepted contract `D-15`, and bitty#2605, and the corpus pins the fixtures.

### What this freeze is not

- It is not the session-host contract. Lifecycle states, terminal reasons,
  counters, leases, grants, audit rules, limits, and platform tiers stay
  authoritative there; this document only names their service-interface
  surface.
- It is not implementation authorization. The third independent security review
  recorded APPROVE-WITH-FOLLOWUPS with `F-9` and `F-12` as slice gates, and each
  slice still needs its P0 evidence (bitty#2608).
- It is not a consumer specification. Wheel and `bitty-ai` consume this surface;
  they do not get a second spelling.

## Purpose and scope

`bittyd` exposes one authenticated local service. Two independent contracts
already govern it: `bitty-ipc` v1 owns the transport, envelope, peer
credentials, and the v1 scope families, while the accepted session-host
contract owns the service semantics. This freeze closes the gap between them: a
consumer adapter, a fake server, a real daemon, and the conformance corpus use
one set of names and one version source, and a change to one of them follows the
revision rule below rather than forking a spelling.

In scope:

- the `session.*` and `daemon.*` scope families and the registry that owns them;
- the handshake request and response fields, the version axes, and the
  accept/refuse order;
- the normative method and scope table for the v0.2.0 terminal-only slice;
- the per-request authorization order and the no-existence-oracle rules;
- the closed refusal set and the conditions that are never distinguishable;
- the `1.x` additive compatibility rule and the `2.0` breaking rule.

Out of scope and owned elsewhere:

- framing, envelope encoding, chunking, and correlation-id mechanics
  (`bitty-ipc` v1); the daemon serves that contract and does not re-spell it;
- per-cell endpoint discovery, non-Linux socket or pipe naming, and platform
  transport details (accepted contract `D-15`);
- numeric limit values and their `{effective, default, system_max}` schema
  (accepted contract `D-14`, bitty#2603);
- lifecycle, counter, lease, grant, audit, and orphan semantics (accepted
  contract, bitty#2601, #2609);
- conformance vector identifiers and fixtures (bitty#2665; delivered through
  bitty#2605);
- packaging and release eligibility (bitty#2666);
- worker hosting, remote transport, and session persistence across a restart
  (excluded by ADR 0019 and the accepted contract).

## Normative sources this specification must not weaken

| Source                                                                                                                               | What it binds here                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | The v0.2.0 slice: single instance per user, peer-credential IPC re-checked before privileged actions, session-grained attach and detach, and service API versioning from day one.                                                                                                                                                                                                        |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Daemon definitions, single PTY ownership, bounded persistence, attributed enforcement, and both trust-boundary gates.                                                                                                                                                                                                                                                                    |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted)                                                           | `D-07` scopes and control relation, `D-08` identity, `D-11` versioning, `D-14` limits, `D-16` audit, `D-18` idempotency, the service surface, the refusal table, and the trust-boundary residuals.                                                                                                                                                                                       |
| [Promotion record](bittyd-session-host-promotion-record.md) (accepted)                                                               | The accepted disposition per decision, the sign-off state, and the review-wide obligations that this freeze must not silently satisfy.                                                                                                                                                                                                                                                   |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | The closed v1 scope families, per-request server-side evaluation, the error taxonomy, local-only transport, and no default TCP.                                                                                                                                                                                                                                                          |
| `bitty-ipc` v1 (accepted)                                                                                                            | The wire envelope (`v`, `id`, `method`, `params`), method grammar, `SUPPORTED_WIRE_VERSIONS`, the 15 v1 scopes, the method-required-scope registry, and the `IpcError` classes.                                                                                                                                                                                                          |
| [Security corpus](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                      | `P0-AC-021` through `P0-AC-026`, the T-09/T-10/T-11 threat lines, and the rule that a new scope is additive, deny-by-default, and reviewed.                                                                                                                                                                                                                                              |
| [bitty#2664](https://github.com/bitty-terminal/bitty/issues/2664)                                                                    | The freeze scope and its acceptance criteria: one spelling and version source, `terminal.*` not stretched, consumer and security review recorded, vectors frozen. The issue's "no listener" clause bound the freeze delivery; the later implementation slice bitty#2607 serves the endpoint, and this document does not authorize it. Issue text is not a normative source for behavior. |

## Terminology

| Term                | Meaning in this document                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wire version        | The `bitty-ipc` envelope version `v` carried on every frame, with `1` the only supported value. It describes framing, envelope, and correlation.                                      |
| Service version     | The `{major, minor}` contract version negotiated in `daemon.negotiate`. It describes the session surface, never the framing.                                                          |
| Negotiation         | The single pre-authentication `daemon.negotiate` exchange that fixes the service version, scopes, capabilities, limits, and identity for one connection.                              |
| Scope registry      | The single table that maps a scope name to its meaning and a method to its required scope. v1 families live in `bitty-ipc`; the service families are frozen here.                     |
| Baseline grant      | The scopes an ordinary consumer connection receives: `session.inspect`, `session.attach`, and `session.control`. `session.host` is never baseline.                                    |
| Capability          | An explicit, per-connection boolean that gates a method family. It never changes meaning inside a major.                                                                              |
| Control relation    | The authorization rule that requires the current controller lease, or the current control token while control is vacant. Scope alone is never sufficient.                             |
| Frozen spelling     | The single name a scope, method, capability, field, event, or refusal code uses in the contract, the registry, the corpus, and every consumer.                                        |
| Existence oracle    | A response that lets a client learn whether a session, grant, or endpoint it may not see exists. The service provides exactly one deliberate exception: the live-vacant-control code. |
| Live vacant control | A live session with no current controller lease. A control method that names it and presents no valid token answers `Denied/InvalidControlToken`; that is the one oracle exception.   |
| Served method       | A catalog method the merged daemon can execute to a success or a typed refusal. `daemon.orphans.verify` and `session.resize` are not served.                                          |
| Keyed method        | A method that carries a client-generated 128-bit idempotency key and consults a bounded store: create, controller attach, grant mint, and transfer.                                   |
| Keyless method      | A method that is naturally idempotent by its target and never consults an idempotency store, so capacity can never block termination or revocation.                                   |
| Unkeyed method      | A method that carries no key and is not naturally idempotent: `daemon.host_grant` mint. Its duplicate rule is not frozen and stays with security review.                              |

## Implementation evidence

The following facts are read from the merged `bitty` `main`, the review head of
PR #2794 (`0a584577`) and its follow-up, and the corpus at
`crates/bitty-daemon/tests/harness/corpus.json`. They describe the surface this
document freezes; they are not a security verification, and no row here
satisfies a P0 control. Where the review head differs from `main`, the row says
so.

- `bitty-ipc` v1 defines **15 scopes** across the `terminal`, `view`, `config`,
  `plugin`, `process`, `debug`, and `ai` families, and **51 registered
  methods**; `required_scope_for_method` returns `None` for an unknown method,
  which the daemon denies without side effects.
- The wire envelope is version `1`; `SUPPORTED_WIRE_VERSIONS` contains only
  `1`; the correlation `id` is bounded to 64 bytes; the method name is bounded
  to 128 bytes and validated as lowercase dotted segments.
- `crates/bitty-daemon` serves that envelope over a per-user Unix socket.
  `bittyd start` is the only invocation that binds an endpoint; plain `bittyd`
  creates no runtime file and binds nothing. No TCP listener is opened.
- **Scope registry:** `src/service/scopes.rs` owns the six service scopes and
  the 17-method catalog. `ServiceScopeSet::baseline()` is
  `session.inspect`, `session.attach`, `session.control`;
  `ServiceScopeSet::operator()` is `daemon.inspect`, `daemon.control`;
  `session.host` is added only by a consumed host grant. The connection's
  transport set is only `process.spawn`.
- **Handshake:** `src/contract.rs` fixes service `1.0`, accepted client range
  `1.0..=1.0`, and the six capabilities; `src/handshake.rs` holds the request,
  response, correlation hashing, bearer parsing, and the pure version check;
  `src/service/wire.rs` parses and renders the JSON fields.
- **Dispatch:** `src/service/dispatch.rs` implements the eleven-stage request
  order, the refusal constructors, the control relation, the no-oracle
  mapping, and per-method handlers. `src/service/server.rs` owns admission,
  the pre-auth gate, frame credentials, and the single-threaded loop.
- **Grants:** `src/service/grants.rs` owns host and observer grants, the
  single-use bearer, the peer and correlation-digest binding, the TTLs, the cap
  refusals, and the sweep. `src/lease/host.rs` records the revision bump for
  grant mint, consume, revoke, and expiry.
- **Corpus:** `tests/harness/corpus.json` (schema
  `bittyd-conformance-corpus/1`) carries **36 vectors** on `main`: 26 shared by
  the fake and real drivers, 6 real-only, and 4 fake-only. PR #2794 adds five
  (`V-37` to `V-41`), for 41 at the review head (29 shared, 8 real-only, 4
  fake-only). The harness runs in `bitty` CI on Linux x86_64 and records
  per-cell evidence; a fake run never closes a real row.
- **Not served:** `daemon.orphans.verify` is `Denied/UnsupportedCapability`
  (containment is deferred, bitty#2791); `session.resize` is
  `Denied/ScopeViolation` (no `terminal.*` scope is granted, bitty#2790); no
  event frame is pushed on a connection (bitty#2792, bitty#2605); worker spawn
  is disabled (`worker_sessions=false`, bitty#2790). Grant expiry bumps
  `state_revision` once per affected session (merged in PR #2786); it still
  emits no event.

## Version sources and ownership

Two version axes are independent, and each has exactly one owner. A supported
wire version never implies a supported service version, and a service version
never implies a wire version.

| Axis            | Owner                      | Single source of truth                                                               | Changes when                                                                                                     | Refusal                                                 |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Wire version    | `bitty-ipc`                | `WIRE_VERSION` and `SUPPORTED_WIRE_VERSIONS`, carried per frame as `v`               | The framing, envelope, or correlation contract changes; that is a `bitty-ipc` contract revision, not this one.   | `VersionMismatch`, connection closes                    |
| Service version | This contract, `1.0` today | `{major, minor}` in `daemon.negotiate`, plus `min_client_minor` in the response      | Additive method, scope, capability, or field inside major `1` bumps the minor; a breaking change requires `2.0`. | `VersionMismatch`, connection closes                    |
| Scope registry  | Split, see below           | `bitty-ipc` for v1 families; the `bittyd`-owned table for `session.*` and `daemon.*` | A scope or method is added, removed, renamed, or re-meant, per the revision rule.                                | `NotFound`, `InvalidMethod`, or `Denied/ScopeViolation` |
| Capability set  | This document              | The six capability names in [Capabilities and methods](#capabilities-and-methods)    | A capability is added inside a minor; its name and meaning never change inside a major.                          | `Denied/UnsupportedCapability`                          |
| Limit values    | Accepted contract `D-14`   | The `D-14` table and the Resource limits section                                     | A system maximum may only change upward, through an attributable contract revision plus security review.         | `LimitExceeded`, `Denied/*` by method                   |

Rules that follow:

1. `wire_version` is a **response echo only**. It is not a request field, it is
   not renegotiated in `daemon.negotiate`, and it never substitutes for the
   per-frame `v`. A frame outside `SUPPORTED_WIRE_VERSIONS` is refused whole.
2. The service version is negotiated exactly once per connection and is
   immutable afterward. A client that needs a different major, minor range,
   scope set, or capability set reconnects.
3. The server accepts the same major and a client minor in
   `[min_client_minor, server_minor]`. The merged server fixes `1.0`, `0`, and
   `1.0..=1.0`, so a `1.1` client is refused as well as a `2.0` or `0.x` one.
   A different major, or a client minor outside the range, is
   `VersionMismatch` and the connection closes before any session operation.
4. Capabilities are advertised, not requested. The request has no capability
   or scope list; the server sends the fixed six-boolean set and the effective
   scopes on the connection. A client cannot widen either by asking.
5. A service `2.0` does not imply a wire version change, and a future wire
   version does not imply a service change. Each axis is negotiated and refused
   on its own.

## Scope registry: ownership and revision

### Ownership rule

The service has exactly **one** authoritative registry. There is no second
vocabulary, no per-consumer spelling, and no adapter-local aliasing.

- The v1 families (`terminal.*`, `view.*`, `config.*`, `plugin.*`,
  `process.spawn`, `debug.*`, `ai.*`) stay owned by `bitty-ipc`. Their names,
  meanings, defaults, and method mappings are unchanged by this document.
- The spelling of the `session.*` and `daemon.*` names and of the method
  catalog is owned by this document. Their meanings and the baseline grant are
  owned by the accepted contract and restated here; a spelling choice does not
  reopen a decision. The `bittyd`-owned table implements them; `bitty-ipc` owns
  the grammar and the v1 families and does not reinterpret the service names.
- The security corpus co-owns every trust-bearing property: the baseline grant,
  consent, the control relation, the operator capability, and the refusal
  codes.
- A consumer (Wheel, `bitty-ai`, `bitty ctl`) may hold its own adapter types but
  must serialize the frozen spelling and must not define a method, scope, or
  capability of its own.

The physical home of the service half is **the `bittyd`-owned table**
(`crates/bitty-daemon/src/service/scopes.rs`, bitty#2607, decided 2026-10-28,
merged in PR #2761): the daemon owns the `session.*` and `daemon.*` names and
their method map, reusing the `bitty-ipc` method grammar and validator rather
than adding variants to the closed `bitty-ipc` `Scope` enum. `bitty-ipc`'s enum is not `#[non_exhaustive]` and
carries exhaustive matches, so extending it would force a cross-repository
release and pin bump for a surface whose meaning the accepted contract already
places with the service. Consumers keep the one-spelling rule below and test
against the wire, not against a client-side copy of the enum. A future
extraction of the table into `bitty-ipc` is a mechanism change under the
revision rule, not a change to any frozen name.

### Revision rule

| Change                                                                                 | Required revision                                                                                                     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Add a scope name to `session.*` or `daemon.*`                                          | Service minor bump; registry revision                                                                                 |
| Add a method that uses only existing scopes                                            | Service minor bump; registry revision; method catalog row                                                             |
| Add a capability                                                                       | Service minor bump; name and meaning fixed for the major; clients ignore a capability they do not know                |
| Add an optional response field or an optional request field with unchanged default     | Service minor bump; no existing field changes meaning; absence preserves the previous behavior                        |
| Change a scope meaning, method name, refusal code, or the meaning of an existing field | Service major bump (`2.0`); a new accepted contract; independent security review; one major served at a time          |
| Remove a scope, method, capability, or field                                           | Service major bump; same gate as a meaning change                                                                     |
| Raise a compiled `system_max`                                                          | Upward only, through an attributable contract revision plus security review; this document does not carry the numbers |

Rules:

1. A registry revision never reuses a retired name for a different meaning. A
   retired name stays retired or returns with its original meaning.
2. No existing `bitty-ipc` v1 scope changes meaning, default grant, or method
   mapping because a service family was added.
3. No scope implies another scope. A higher-sounding name is not a superset, and
   `session.control` is necessary but never sufficient for a control action.
4. `terminal.*` is never stretched to cover session or daemon administration,
   and `session.*` never grants terminal content.

The delivery set for a revision — this document, the `bittyd` registry, the
conformance corpus, and the consumer requirements in one delivery — and a
security exception that would let `1.x` refuse input `1.0` accepted are
proposals recorded under [Open points](#open-points), not rules here. `D-11`
owns the revision decision; it does not fix that delivery set or that exception.

### One spelling source

The following spellings are frozen for service major `1`. A consumer, a fake
server, a real daemon, and the corpus use exactly these names. The accepted
contract owns each decision and the meaning of each name; this document owns
only the spelling. The one spelling the accepted contract does not state,
`session.resize`, is fixed in the table; its unserved status is recorded under
[Deferred items](#deferred-items), not treated as a new decision.

| Kind               | Frozen spellings                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scopes             | `session.inspect`, `session.host`, `session.attach`, `session.control`, `daemon.inspect`, `daemon.control`                                                                                                                                                                                                                          |
| Methods            | `daemon.negotiate`, `daemon.status`, `daemon.stop`, `daemon.host_grant`, `daemon.orphans.verify`, `session.create`, `session.status`, `session.list`, `session.attach`, `session.grant`, `session.grant.revoke`, `session.detach`, `session.control.transfer`, `session.resize`, `session.abort`, `session.kill`, `lease.heartbeat` |
| Capabilities       | `terminal_sessions`, `worker_sessions`, `events`, `observer_grants`, `control_transfer`, `idempotent_mutations`                                                                                                                                                                                                                     |
| Handshake request  | `client_version`, `client_correlation`, `operator_capability`, `host_grant`                                                                                                                                                                                                                                                         |
| Handshake response | `wire_version`, `service_api_version`, `daemon_instance_id`, `daemon_pid`, `server_identity`, `peer_identity`, `client_id`, `scopes`, `capabilities`, `limits`, `server_monotonic_ms`, `daemon_state`                                                                                                                               |
| Event kinds        | `session_state`, `session_terminal`, `control_transfer`, `lease_revoked`, `daemon_stopping`                                                                                                                                                                                                                                         |
| Identifier formats | `daemon_instance_id`, `session_id`, and `attach_id` are 32 lowercase hex characters; `grant_id` is 32 lowercase hex characters; the control token, observer grant, and host grant are 256-bit bearers; an idempotency key is 128 bits encoded in at most 128 bytes                                                                  |

`session.resize` is the one method spelling the accepted contract does not
state: it fixes the resize authority, the revision effect, and the refusal, but
not the method name. This freeze fixes `session.resize` so the corpus has one
name, and the merged catalog and corpus `C-05`/`V-13` use it. The method is not
served in this slice: the daemon grants no `terminal.*` scope, so every
`session.resize` request is `Denied/ScopeViolation` before target lookup. The
spelling is frozen; the success path is deferred to bitty#2790 and stays in
[Deferred items](#deferred-items).

## Scope families

The families are additive and deny-by-default. The table restates the accepted
`D-07` meanings; it grants nothing beyond them.

| Scope             | Baseline for a consumer | Grants                                                                                                                                                   | Never grants                                                                               |
| ----------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `session.inspect` | yes                     | Read metadata status and list sessions with a live lease on this connection                                                                              | Terminal content, another client's sessions, enumeration without a lease                   |
| `session.host`    | no                      | Create a session of an enabled kind; requires explicit per-client consent and `process.spawn`                                                            | Any authority over another client's session; daemon administration                         |
| `session.attach`  | yes                     | Accept a valid observer grant to obtain an observer lease                                                                                                | A lease without a grant; control, input, resize, or abort authority                        |
| `session.control` | yes                     | With the current control token or a controller lease: claim control, mint or revoke an observer grant, abort, transfer control, and revoke another lease | Immediate kill, daemon administration, terminal content, or controller authority by itself |
| `daemon.inspect`  | no                      | Read daemon status, orphan counts, and the operator all-session view                                                                                     | Session mutation, session content, or reading the audit sink                               |
| `daemon.control`  | no                      | Stop, drain, force, revoke any lease, mint or revoke host-consent and observer grants, and run `daemon.orphans.verify`                                   | A privilege boundary against the same-uid owner; session content; reading the audit sink   |

Baseline and grant rules:

1. An ordinary consumer connection receives `session.inspect`,
   `session.attach`, and `session.control`, each still filtered by per-session
   visibility, the observer-grant rule, and the control relation.
2. `session.host` is never baseline. It is added to a connection's effective
   scopes only by consuming a valid, unexpired, peer-bound `daemon.host_grant`
   at `daemon.negotiate`.
3. The operator capability adds `daemon.inspect` and `daemon.control`. The
   capability is a per-boot intent gate, not an isolation boundary: a same-uid
   adapter that can read it can become an operator, and no wording here claims
   otherwise.
4. A connection cannot widen its own scopes and cannot renegotiate in place.
   Scope changes require a new connection and a new server-side grant.
5. Effective scopes are fixed for the connection and reported once in the
   `scopes` handshake field. `session.host` appears there if and only if a host
   grant was consumed for that connection.
6. Creating a session grants authority over that session only. It never grants
   listing, attaching, aborting, or stopping another session, and it never makes
   the creator a daemon administrator.
7. The merged connection's transport scopes are exactly `process.spawn`. The
   daemon does not grant the `bitty-ipc` CLI default set, and it grants no
   `terminal.*`, `view.*`, `config.*`, `plugin.*`, or `debug.*` scope. The
   `scopes` array therefore reports the three baseline service scopes plus
   `process.spawn` on an ordinary connection.

## Handshake

`daemon.negotiate` is the only pre-authentication method. It runs after the
transport accept, the peer-credential capture, and the wire-version check, and
before any operation that can name a session.

### Request fields

| Field                 | Presence | Rule                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client_version`      | required | `{major, minor}`, both unsigned 16-bit. Compared against the server range; a mismatch is `VersionMismatch` and the connection closes.                                                                                                                                                                                                                                                                                        |
| `client_correlation`  | optional | At most 128 bytes of valid UTF-8 with no control characters. It is hashed on receipt; only a truncated 128-bit SHA-256 digest is audited as `client_correlation_digest`. It is never echoed, stored raw, or evaluated for authorization. A malformed value is `InvalidRequest`, never normalized.                                                                                                                            |
| `operator_capability` | optional | The per-boot 256-bit bearer, 64 lowercase hex, that adds `daemon.inspect` and `daemon.control`. A present but malformed or wrong bearer is one static `Unauthenticated` and closes. An absent field adds no `daemon.*` scope and is not a refusal; a later `daemon.*` method then fails `Denied/ScopeViolation`. It is never placed in an environment, inherited by a worker, or accepted as authority from a session lease. |
| `host_grant`          | optional | A single-use 256-bit bearer, 64 lowercase hex, minted by `daemon.host_grant`. Consuming it adds `session.host` to the connection. A missing, expired, wrong-peer, already-consumed, or revoked grant adds nothing and leaves later `session.create` to fail with `Denied/ConsentRequired`. A present but malformed value is `InvalidRequest`, not `Unauthenticated`.                                                         |

An optional field must be **omitted**, not sent as `null`: the merged parser
refuses an explicit `null` for `client_correlation` or `host_grant` as
`InvalidRequest`, and for `operator_capability` as `Unauthenticated`. Unknown
request fields are ignored at this layer, except the transport-reserved `auth`,
`scope`, and `role` names at depth 1, which are `InvalidRequest`.

The wire version is **not** a negotiate field. Every frame carries `v`, and the
transport refuses an unsupported value before the service sees the request.

### Response fields

| Field                 | Meaning                                                                                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wire_version`        | The accepted wire version (`1`). An echo for the client's records, not a second negotiation.                                                                                                                                                             |
| `service_api_version` | The object `{major: 1, minor: 0, min_client_minor: 0}`; the accepted client range is `1.0..=1.0`.                                                                                                                                                        |
| `daemon_instance_id`  | The fresh 128-bit random instance id, 32 lowercase hex, minted at daemon start.                                                                                                                                                                          |
| `daemon_pid`          | The daemon pid, unsigned 32-bit. Observational only; never a signal target, handle, or authority input.                                                                                                                                                  |
| `server_identity`     | `{uid, endpoint_kind, endpoint_owner, endpoint_mode}`. `endpoint_kind` is `unix_socket` on the served cell; mode is `0600`. Observational, not proof of server authenticity.                                                                             |
| `peer_identity`       | `{uid, pid, start_time}` captured before parsing. `start_time` is a platform fact and may be `null`.                                                                                                                                                     |
| `client_id`           | The server-assigned 128-bit random connection identity, 32 lowercase hex. Never client-supplied and never durable.                                                                                                                                       |
| `scopes`              | An ordered array: service scopes in catalog order, then transport scopes. An ordinary connection reports `session.inspect`, `session.attach`, `session.control`, `process.spawn`; `session.host` appears only after a consumed host grant.               |
| `capabilities`        | An object with the six capability booleans, fixed for the connection.                                                                                                                                                                                    |
| `limits`              | An array of `{name, effective, default, system_max}` objects, including inherited transport bounds. The `1.0` corpus pins 54 entries (46 `D-14` rows and 8 inherited `RC-9`/`RC-10` bounds); a client reads `effective` and must not hardcode the count. |
| `server_monotonic_ms` | The server monotonic clock at handshake, so clients compute lease and last-seen age without trusting their own clock.                                                                                                                                    |
| `daemon_state`        | `running` or `stopping`. A stopping daemon refuses new sessions and every mutation except a repeated `daemon.stop`.                                                                                                                                      |

The response is sent once and is immutable for the connection. It carries no
session data, no terminal content, and no secret other than the effect of an
already-consumed grant (the widened `scopes` set).

### Accept and refuse order

The order is fixed. A later step never runs after an earlier refusal, and a
refusal is a static typed result, never a partially applied negotiation.

1. Transport accept, single-instance lock, and peer-credential capture, before
   any frame is parsed. The per-frame `SCM_CREDENTIALS` is verified while the
   frame is assembled, before its payload is parsed or its method resolved.
2. Per-frame wire-version validation; an unsupported `v` is `VersionMismatch`
   and the connection closes. This runs before the handshake gate.
3. Negotiate-only gate: before the connection is negotiated, the only accepted
   method is `daemon.negotiate`; any other method is `Denied/AlreadyNegotiated`
   and closes. The rate limiter and envelope parsing run only after this gate.
4. Exactly one `daemon.negotiate`, within the pre-authentication budget.
5. Service-version range check.
6. A present `operator_capability` is verified; a malformed or wrong bearer is
   `Unauthenticated` and closes. An absent field is not checked and grants no
   `daemon.*` scope. A `host_grant` is consumed when possible; failure is not a
   refusal. The correlation digest is recorded, the connection is marked
   negotiated, and the response is sent.
7. Method resolution, then the capability check, then server-side scope
   evaluation, then the visibility, control relation, generation, and
   idempotency checks in the order fixed by
   [Authorization order](#authorization-order).

A version mismatch, a failed peer check, or a present but invalid operator
capability is a typed refusal and the connection closes. The operator-capability
case returns the same static `Unauthenticated` refusal as a failed peer check
(decided 2026-10-28, bitty#2607), so the response never reveals whether the
capability file exists; the request path never reads the file. An **absent**
operator capability is not a refusal: the connection simply receives no
`daemon.*` scope, and a later `daemon.*` method is `Denied/ScopeViolation`. A
`host_grant` that cannot be consumed does not close the connection: it simply
adds no `session.host` scope, and a later `session.create` fails with
`Denied/ConsentRequired`. No session operation is possible before a successful
negotiate.

### Pre-authentication state machine and limits

- One response per request and exactly one negotiate per connection. A second
  `daemon.negotiate` is `Denied/AlreadyNegotiated` and closes. Any byte that
  arrives before the negotiate response — a complete frame or a fragment of
  one — is refused with `Denied/AlreadyNegotiated` whose response omits `id`,
  and the connection closes after that refusal frame drains. The queued bytes
  are never read, parsed, or resumed, so a partial second frame cannot become a
  fresh request and no pipelined method is ever served after the handshake. A
  post-flush pending-input check refuses the same way: bytes already pending
  when the negotiate response has drained are refused with the same no-`id`
  result instead of being reinterpreted as a post-handshake request. This
  refusal and the over-long-`id` refusal are the only two no-`id` shapes; both
  are consequences of refusing bytes the server must not parse. There is still
  exactly one handshake per connection.
- The handshake completes within `negotiate_timeout_ms` and may send at most
  `pre_auth_max_bytes` before the response. Exceeding the deadline closes the
  connection with one aggregated `Timeout` audit record and no response frame;
  exceeding the byte budget is a typed `LimitExceeded` refusal. Neither is
  retried on the same connection.
- A failed handshake is not retried on the same connection. There is no
  best-effort mode, no probe-based downgrade, and no partial surface.
- A client that needs different scopes, capabilities, or a different version
  reconnects; it cannot renegotiate in place.

### Identity and correlation rules

1. `client_id` is assigned by the server, is 128 bits of randomness, is unique
   per connection, and is never durable. A reconnect receives a new one. Durable
   authority comes from the control token and live leases, never from
   `client_id`.
2. `peer_identity` is captured from the OS at accept and re-checked before every
   privileged action. On Linux, every request frame must carry
   `SCM_CREDENTIALS` matching the captured uid and pid; a missing or mismatched
   credential closes the connection with `Unauthenticated`. On cells without a
   per-message credential mechanism, the captured process handle is re-checked
   before every privileged action and the residual is stated, not hidden.
3. `server_identity` is observational. The client's endpoint owner and mode check
   is tamper detection, not server authentication; a same-uid impostor can bind
   the path first.
4. `client_correlation` is a correlation hint only. It is not an identity, not a
   grant, and not a lookup key. The wire envelope's `id` is a different field:
   at most 64 bytes, server-generated for events, unique per connection, and
   never supplied by the client for an event.
5. No client-supplied id, header, path parameter, `scope`, `role`, or `auth`
   field is ever authority. The transport rejects ambient-authority envelope
   fields; the service evaluates the real grant server-side.

## Method catalog

The catalog is the complete v0.2.0 service surface for the `session.*`,
`daemon.*`, and `lease.*` names. A well-formed method in those families outside
this table is `NotFound`, matching `bitty-ipc` v1's unknown-method rule; a name
that violates the wire grammar is `InvalidMethod`. Neither is a silent no-op,
and neither falls through to a default grant. The v1 families keep their own
registry and method map, which this freeze does not change.

| Method                     | Served | Scope grant                                                         | Authority beyond scope                                                                                                                                                                                                                                                | Idempotency                                                                     | Notes                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daemon.negotiate`         | yes    | none (pre-authentication)                                           | Endpoint, peer, and wire checks precede it; exactly one per connection                                                                                                                                                                                                | keyless                                                                         | Consumes `host_grant` when possible; a present `operator_capability` is verified, an absent one grants nothing.                                                                                                                                                                                                                                           |
| `daemon.status`            | yes    | `daemon.inspect`                                                    | Operator capability obtained at negotiate                                                                                                                                                                                                                             | keyless                                                                         | Daemon state, lifecycle counts, `audit_degraded`, limits, drain deadline, `tcp_listeners`, and `orphans: {verify: "deferred"}`.                                                                                                                                                                                                                           |
| `daemon.stop`              | yes    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                                                                                                                                                                    | keyless                                                                         | `mode` is `refuse`, `drain`, or `force`; a repeated stop is `Denied/DaemonStopping`; a default stop with active sessions is `Denied/ActiveSessions`.                                                                                                                                                                                                      |
| `daemon.host_grant`        | yes    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                                                                                                                                                                    | no key; `revoke` idempotent by `grant_id`; `mint` creates a new grant each call | `action` is `mint` or `revoke`; mint returns the bearer once plus the non-secret `grant_id`; a consumed-but-unexpired grant can still be revoked (bitty#2763). Mint accepts `ttl_ms` and `client_correlation_digest`; see [Grant request fields](#grant-request-fields).                                                                                  |
| `daemon.orphans.verify`    | no     | `daemon.control`                                                    | None reached; the handler refuses before any orphan action                                                                                                                                                                                                            | keyless                                                                         | Always `Denied/UnsupportedCapability` after the scope check; no orphan is claimed verified. Containment and orphan verification are bitty#2791.                                                                                                                                                                                                           |
| `session.create`           | yes    | `session.host` **and** `process.spawn`                              | Consumed host consent; peer re-check                                                                                                                                                                                                                                  | keyed (pre-session store)                                                       | The create-key lookup runs before the `terminal_id` uniqueness check; `kind: worker` is `Denied/UnsupportedCapability` once create authority is present, while a caller without consent gets the earlier `Denied/ConsentRequired` (or `Denied/ScopeViolation` without `process.spawn`); the response is the only place the initial control token appears. |
| `session.status`           | yes    | `session.inspect`                                                   | Visibility: operator view (`daemon.inspect`), a live lease on this connection, the current control token, or the immutable terminal snapshot for a connection that held a lease                                                                                       | keyless                                                                         | Never refuses on a stale generation; the authoritative reconciliation read. It does not map a missing token to `InvalidControlToken` (that mapping is control-method only).                                                                                                                                                                               |
| `session.list`             | yes    | `session.inspect`                                                   | Live lease on this connection; `daemon.inspect` for the operator view                                                                                                                                                                                                 | keyless                                                                         | A consumer connection never enumerates another client's sessions; the operator view requires `daemon.inspect` and carries metadata only.                                                                                                                                                                                                                  |
| `session.attach`           | yes    | observer: `session.attach`; controller: `session.control`           | Observer: valid single-use grant. Controller: current control token and matching `expected_generation`                                                                                                                                                                | controller keyed; observer single-use grant, not keyed                          | The request role is `attach_role` (`controller` or `observer`); the response is `role`. A claim creates a controller lease; it never promotes an observer lease in place.                                                                                                                                                                                 |
| `session.grant`            | yes    | `session.control` or `daemon.control`                               | Control relation (current controller lease, or vacant control with the current token), or the `daemon.control` operator path, which is ungated                                                                                                                        | keyed                                                                           | Mints one single-use observer grant; the bearer appears only in the mint response. `ttl_ms` and `observer_correlation_digest` are optional; see [Grant request fields](#grant-request-fields). A terminal session is `Denied/NotRunning`.                                                                                                                 |
| `session.grant.revoke`     | yes    | `session.control` or `daemon.control`                               | A retained grant is checked against the caller's correlation binding first: a non-operator mismatch gets the unknown-grant `not_active` success and revokes nothing; otherwise visibility and the control relation run; the `daemon.control` operator path is ungated | keyless (`grant_id`)                                                            | Revokes an unconsumed grant; a matching revoke still requires the control relation and bumps `state_revision`; a second revoke is `not_active`, not a refusal. A retained grant on a terminal session is `Denied/NotRunning`. `ttl_ms` and the digest fields are mint-only.                                                                               |
| `session.detach`           | yes    | own lease: none; other lease: `session.control` or `daemon.control` | Own detach is always allowed; detaching another lease is a revocation and requires the control relation or the operator path                                                                                                                                          | keyless (`attach_id`)                                                           | A repeat detach of a handle this connection already detached or revoked is `was_attached: false`, `not_attached: true`, no revision bump. Never aborts or changes the generation.                                                                                                                                                                         |
| `session.control.transfer` | yes    | `session.control`                                                   | Control relation; the target is a live observer lease with `session.control`                                                                                                                                                                                          | keyed                                                                           | Rotates the token onto the target exactly once; the token is delivered to the target on its next lease response, never in the requester's response.                                                                                                                                                                                                       |
| `session.resize`           | no     | `terminal.manage`                                                   | Not reached; the daemon grants no `terminal.*` scope                                                                                                                                                                                                                  | no key; not deduped by generation (policy open)                                 | Always `Denied/ScopeViolation` before target lookup. The controller-only success path and its revision effect are deferred to bitty#2790.                                                                                                                                                                                                                 |
| `session.abort`            | yes    | `session.control`; operator reason: `daemon.control`                | Control relation for `cancel` and `timeout`; the `operator` reason uses the operator path and accepts no control token                                                                                                                                                | keyless                                                                         | `reason_class` is `cancel`, `timeout`, or `operator`; a request after terminal returns `accepted: false`, `not_running: true`, not a refusal.                                                                                                                                                                                                             |
| `session.kill`             | yes    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                                                                                                                                                                    | keyless                                                                         | Immediate whole-identity termination; a request after terminal returns `accepted: false`, `not_running: true`. Never available to a consumer adapter.                                                                                                                                                                                                     |
| `lease.heartbeat`          | yes    | none beyond lease ownership                                         | The named `attach_id` must belong to this connection                                                                                                                                                                                                                  | keyless                                                                         | Refreshes `lease_expires_at`; a foreign lease is `NotFound` and is not refreshed; it also delivers a pending rotated control token to the target.                                                                                                                                                                                                         |

**Stopping is not one state.** A stopping **daemon** refuses every mutating
method except a repeated `daemon.stop` with `Denied/DaemonStopping`; reads
(`daemon.status`, `session.status`, `session.list`) and `lease.heartbeat`
remain available. A **draining session** refuses a new **controller** attach
with `Denied/SessionStopping`; an observer attach with a valid single-use grant
is allowed at any non-terminal state, including `stopping` (accepted contract
`D-09`; `src/lease/host/tests.rs`). A **terminal session** refuses a grant
mint or revoke with `Denied/NotRunning`, while `session.abort` and
`session.kill` return a success result with `accepted: false` and
`not_running: true`. `Denied/NotRunning` is not the daemon-stopping code; the
two names are not interchangeable.

The contract defines five event kinds (`session_state`, `session_terminal`,
`control_transfer`, `lease_revoked`, `daemon_stopping`) and no subscribe
method. The merged service sends **no event frame on any connection**; the
`events` capability is advertised `true`, but that bit is not evidence of event
delivery. `session.status` and `session.list` are the only reconciliation reads
in this slice. Event envelope, routing, ordering, backlog, the terminal-event
guarantee, and the wire vectors stay deferred (bitty#2792 for wire delivery,
bitty#2605 for the corpus); no consumer may implement event-driven behavior
against this surface until a vector exists.

### Capabilities and methods

| Capability             | Advertised in `1.0` | Gates                                                                                                                                                                                                                                     |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal_sessions`    | true                | `session.create` with `kind: terminal`                                                                                                                                                                                                    |
| `worker_sessions`      | false               | `session.create` with `kind: worker`; false means `Denied/UnsupportedCapability` once create authority is present, while missing consent answers first with `Denied/ConsentRequired` (or `Denied/ScopeViolation` without `process.spawn`) |
| `events`               | true                | Events on live leases, including the control-frame reservation rule                                                                                                                                                                       |
| `observer_grants`      | true                | `session.grant`, `session.grant.revoke`, and observer `session.attach`                                                                                                                                                                    |
| `control_transfer`     | true                | `session.control.transfer`                                                                                                                                                                                                                |
| `idempotent_mutations` | true                | `session.create`, `session.attach`, `session.grant` mint, and `session.control.transfer`                                                                                                                                                  |

Rules:

1. The v0.2.0 profile advertises `terminal_sessions=true`,
   `worker_sessions=false`, and `events`, `observer_grants`,
   `control_transfer`, and `idempotent_mutations` true. The accepted contract
   has no reduced variant of this surface; a build that cannot provide one of
   the four is a different capability profile and needs its own review before a
   release describes it as the v0.2.0 surface. `worker_sessions` is the only
   capability the contract deliberately advertises false; with create authority
   present it yields the typed `D-01` refusal, and without consent the earlier
   scope/consent answer applies.
2. A client must refuse to use a method whose capability is absent. It returns
   its own typed unavailable result to its caller; it must not probe, retry with
   a different method, or fall back to an in-process substitute.
3. A capability never changes semantics inside a major. Its name and meaning are
   fixed; additions are minor-versioned and additive.
4. An unknown capability name is ignored by a forward-compatible client. A
   well-formed unknown method is `NotFound`; a malformed method name is
   `InvalidMethod`. Neither is a silent no-op.
5. The merged build advertises `events: true` but serves no event frame. A
   consumer must not treat that bit as evidence that events work; it is a
   contract-target value, not a delivered behavior. The same caveat applies to
   `worker_sessions: false`: the bit is honest, but the typed refusal is the
   only proof in this slice.

### Keyed and keyless methods

- **Keyed**: `session.create`, controller `session.attach`, `session.grant`
  mint, and `session.control.transfer`. Each carries a client-generated
  128-bit key, encoded in at most 128 bytes. Session-scoped keys share the
  bounded per-session descriptor store; `session.create` uses the separate
  pre-session store indexed by `(uid or SID, key)`. An observer
  `session.attach` is not keyed at the wire: it validates and consumes the
  single-use grant before any store lookup, so a replay is
  `Denied/ObserverGrantRequired` (corpus `V-22`).
- **Keyless and naturally idempotent**: `session.abort`, `session.kill`,
  `daemon.stop`, `session.detach` of another lease, `session.grant.revoke`, and
  `lease.heartbeat`. They are naturally idempotent by `(session_id, generation)`,
  by the daemon instance and mode, by the target `attach_id`/`grant_id`, or by
  the connection's live lease, and they never consult either store.
- **No key, duplicate policy open**: `daemon.host_grant`. `mint` creates a new
  grant on every call, while `revoke` is idempotent by `grant_id`. The merged
  code proves only that behavior; the accepted `D-18` keyless set does not name
  the method. This freeze defines no key, fingerprint, or dedupe rule for
  `mint`. The Security review must accept the duplicate effect or require a key
  or fingerprint, and the corpus must encode one behavior; the policy is
  recorded in [Open points](#open-points). `session.resize` would raise the
  same question, but it is never accepted in this slice, so its duplicate rule
  is deferred with the method (bitty#2790).
- A full idempotency store can refuse only a keyed method, and only with
  `Denied/IdempotencyCapacity`; it can never block termination or revocation.
- A duplicate with the same fingerprint returns the stored descriptor; a
  snapshot is recomputed, never stored. A different fingerprint is
  `Denied/IdempotencyConflict` and applies nothing. A lease-bound result replays
  only on the connection that created it; `session.create` stays replayable
  across connections so a lost response can be recovered.

### Grant request fields

Both mints accept optional fields. A field that is present but malformed is
`InvalidRequest`; the service never silently ignores a field that belongs to
another method.

| Field                         | Method                                         | Rule                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttl_ms`                      | `session.grant` mint, `daemon.host_grant` mint | A positive integer no greater than the effective `observer_grant_ttl_ms` (60 000 in the shipped default profile) or `host_grant_ttl_ms` (300 000). `0` and an over-limit value are `InvalidRequest` with `counts.actual` and `counts.limit`; the stored expiry uses the requested TTL. Absent means the compiled default. |
| `observer_correlation_digest` | `session.grant` mint                           | Exactly 32 lowercase hex characters naming the 128-bit digest a later observer connection presents at `daemon.negotiate`. Any other width or case is `InvalidRequest`; absent keeps the uid-only binding.                                                                                                                 |
| `client_correlation_digest`   | `daemon.host_grant` mint                       | Exactly 32 lowercase hex characters naming the 128-bit digest a later client connection presents at `daemon.negotiate`. Any other width or case is `InvalidRequest`; absent keeps the uid-only binding.                                                                                                                   |

Rules:

1. `ttl_ms` and both digest fields are mint-only. Sending any of them on
   `session.grant.revoke` or `daemon.host_grant` `revoke` is `InvalidRequest`.
2. The digest field is method-scoped: `client_correlation_digest` on
   `session.grant` and `observer_correlation_digest` on `daemon.host_grant` are
   cross-method fields and are `InvalidRequest`, never silently ignored.
3. A correlation-bound grant is usable only from the connection whose
   negotiated digest matches. A host-grant mismatch adds no scope; an observer
   attach with a mismatch is `Denied/ObserverGrantRequired`; create is
   `Denied/ConsentRequired`; a non-operator `session.grant.revoke` with a
   mismatch returns the unknown-grant `not_active` success and revokes nothing.
4. The operator `daemon.control` path is not correlation-gated: the operator
   may revoke any grant, and `daemon.host_grant` revoke is operator-only.
5. A keyed `session.grant` duplicate whose `ttl_ms` or
   `observer_correlation_digest` differs from the stored request is
   `Denied/IdempotencyConflict`, never a replay of a differently bound grant.

The `{grant_id, revoked: false, not_active: true}` result is byte-identical for
an unknown grant id, a swept record, and a non-operator correlation mismatch.

### Grant revision rules

`state_revision` advances once per snapshot-visible session mutation. The
merged grant path follows that rule for mint, consume, revoke, and expiry, and
the observer attach that consumes a grant bumps twice: once for the new lease
and once for the consume. Corpus `C-04` pins the exact sequence.

| Grant operation                                    | Session revision effect                                    | Evidence / gap                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host grant mint (`daemon.host_grant` `mint`)       | none; a host grant names no session                        | unit tests in `grants.rs`; the bearer appears once                                                                                                 |
| Host grant consume at `daemon.negotiate`           | none; it widens the connection's `scopes`                  | unit tests; a consumed grant is retained to its TTL and can be revoked (bitty#2763)                                                                |
| Host grant revoke (`daemon.host_grant` `revoke`)   | none; no session target                                    | idempotent by `grant_id`; a second revoke is `not_active`                                                                                          |
| Observer grant mint (`session.grant`)              | +1 on commit                                               | `C-04` step: revision `2`                                                                                                                          |
| Observer grant consume (observer `session.attach`) | +1 for the attach and +1 for the consume                   | `C-04` steps: revision `3` then `4`                                                                                                                |
| Observer grant revoke (`session.grant.revoke`)     | +1 when the outcome is `Revoked`; none when `not_active`   | `C-04` steps: revision `6` then `7`; repeat revoke is a success result with `not_active: true`                                                     |
| Keyed grant mint replay                            | none; the original `grant_id` is returned                  | `grant_active` is false and the bearer is omitted once the grant is consumed, expired, or revoked; a terminal session refuses `NotRunning` instead |
| Grant expiry (host or observer sweep)              | +1 per affected session, once; a later sweep bumps nothing | `C-10` pins the one-time bump (merged in PR #2786); expiry still emits no event                                                                    |

No event frame is emitted for a grant mint, consume, revoke, or expiry in this
slice. A consumer that tracks authority must reconcile with `session.status`;
revision-based reconciliation of expiry is available through `C-10`, and event
delivery remains deferred to bitty#2792.

## Authorization order

### Stage order

Every request walks the same stages in the same order. A request that fails a
stage stops there; a later stage never observes it.

| Stage | Check                                                                                                                                                                                                    | Refusal                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Transport: accepted connection, single-instance lock, captured peer; per-frame peer credentials verified while the frame is assembled, before any payload is parsed or resolved; supported per-frame `v` | `VersionMismatch`, `Unauthenticated`, or transport failure; connection closes where the class says so                                              |
| 2     | Pre-authentication: negotiate completed (service-version range fixed), one negotiate only, timeout and byte budget respected; a stopping daemon refuses mutations except a repeated stop                 | `Denied/AlreadyNegotiated`, `LimitExceeded`; `Denied/DaemonStopping`; `Timeout` is an audit record only; connection closes for the handshake cases |
| 3     | Method resolves: a well-formed name in the registry, or a malformed name                                                                                                                                 | `NotFound` for a well-formed unknown method; `InvalidMethod` for a malformed name                                                                  |
| 4     | Capability: the method's required capability is enabled                                                                                                                                                  | `Denied/UnsupportedCapability`                                                                                                                     |
| 5     | Authentication: the captured peer is still the same live process before a privileged effect; the per-frame credential was already checked at stage 1                                                     | `Unauthenticated`; connection closes and nothing applies                                                                                           |
| 6     | Scope: the method's required scope is in the connection's effective set                                                                                                                                  | `Denied/ScopeViolation`, decided before any target lookup                                                                                          |
| 7     | Derived authority: consumed host consent, valid observer grant, control relation, or operator path                                                                                                       | `Denied/ConsentRequired`, `Denied/ObserverGrantRequired`, `Denied/ControllerRequired`, `Denied/InvalidControlToken`, `Denied/ControlHeld`          |
| 8     | Target resolution: instance binding, visibility, and existence                                                                                                                                           | `Denied/StaleInstance` before lookup; uniform `NotFound` for unknown, collected, or invisible; the live-vacant-control carve-out below             |
| 9     | Generation: the request's generation matches the session's current generation on effectful methods                                                                                                       | `Denied/StaleGeneration` with the current generation and revision, applying nothing                                                                |
| 10    | Idempotency: keyed methods consult their store; duplicates replay, fingerprints conflict                                                                                                                 | `Denied/IdempotencyConflict`, `Denied/IdempotencyCapacity` (keyed only)                                                                            |
| 11    | Effect, revision increment, attribution, and typed result                                                                                                                                                | `Denied/Internal`, `Internal`, or the method result                                                                                                |

Rules:

1. Scope is decided before target lookup. A caller without the scope learns
   nothing about whether the target exists.
2. `session.create` has no generation and no existing session. It runs the
   create-key lookup before the `terminal_id` uniqueness check, so a retry with
   the same key returns the original result while the first session is live;
   only a different key with a live `terminal_id` is
   `Denied/TerminalAlreadyHosted`.
3. `session.attach` with the observer role validates and consumes the grant
   before consulting the idempotency store, so a replayed observer attach is
   `Denied/ObserverGrantRequired` rather than a duplicate descriptor. Corpus
   `V-22` proves that behavior and the ambiguity formerly recorded here is
   closed: observer attach is not a keyed request at the wire.
4. Generation is checked on every effectful request that names it (`abort`,
   `kill`, `control.transfer`, controller attach, and the pre-bind cancel intent
   of a generation-0 abort or kill). A stale generation applies nothing and
   returns the current counters so the adapter can reconcile.
5. Idempotency is the last check before the effect. It can neither grant
   authority nor rescue a request that failed an earlier stage.
6. Privileged actions re-check the captured peer after authorization and before
   the effect: create, controller attach, abort, kill, transfer, detach-other,
   grant mint or revoke, and stop. A dead peer, changed identity, or failed
   handle check closes the connection with `Unauthenticated` and applies
   nothing.

### Denial order for control methods

The fixed order for a control method (for example `session.abort`) is:

1. missing `session.control` → `Denied/ScopeViolation` before session lookup;
2. unknown, collected, terminal, or invisible session → `NotFound`, **except**
   the live-vacant-control carve-out below;
3. visible observer or any live lease that is not the current controller →
   `Denied/ControllerRequired`;
4. live session with vacant control and the token missing, stale, or rotated →
   `Denied/InvalidControlToken`;
5. a valid current token presented while a live controller lease still holds
   control → `Denied/ControlHeld`;
6. a generation mismatch → `Denied/StaleGeneration`.

The carve-out in step 4 is deliberate: a live session whose control is vacant
must answer `Denied/InvalidControlToken` for a missing or stale token, because
the accepted contract's denial order names that result. The consequence is that
a caller holding `session.control` can distinguish a live vacant session from
an unknown or terminal one when it already knows the 128-bit `session_id`. That
is the one exception to the uniform `NotFound` rule below; it applies only to
control methods, only to a live session, and only while control is vacant. A
`session.status` or `session.list` read never maps this way.
None of these results carries target details, terminal content, another
session's fields, or caller bytes, and none changes state.

### Control token semantics

- The control token is a 256-bit bearer, spelled as 64 lowercase hex
  characters. It appears in the `session.create` response (the initial token),
  the controller `session.attach` response (the rotated token), and the
  transfer target's next lease response after `session.control.transfer`. The
  requester never receives the target's token. It never appears in an audit
  record, a diagnostic, or a refusal.
- A missing, stale, or rotated token on a control method against a **live
  vacant** session is `Denied/InvalidControlToken`. The same condition against
  an unknown, terminal, or occupied session stays `NotFound` (or
  `ControllerRequired` when the caller holds a non-controller lease).
- A caller that holds any live lease but is not the controller gets
  `Denied/ControllerRequired` **before** the token is considered. A valid token
  does not promote an observer lease; only a controller claim through
  `session.attach` rotates control onto a controller lease (corpus `V-10`).
- `session.status` and `session.list` are not control methods. A missing token
  there is `NotFound` (or a visible read when a lease/operator path applies),
  never `InvalidControlToken`.
- `session.kill` and the `operator` reason of `session.abort` use the operator
  path and accept no control token. The token is necessary but never sufficient
  for a control action: the method's scope is checked first, and the control
  relation is checked after visibility.

### No existence oracle

- A caller that holds the scope gets the same `NotFound` for an unknown,
  collected, foreign, or invisible session. The daemon does not distinguish
  "never existed" from "you cannot see it".
- Consent state is hidden from a caller without `process.spawn`: when both
  authorities are missing, `session.create` returns `Denied/ScopeViolation`, and
  `Denied/ConsentRequired` is returned only to a caller that already holds
  `process.spawn`.
- A missing, expired, consumed, wrong-session, or wrong-peer observer grant is
  one code: `Denied/ObserverGrantRequired`.
- A missing, stale, or rotated control token at a vacant control relation is one
  code: `Denied/InvalidControlToken`. The deliberate carve-out is recorded under
  [Denial order for control methods](#denial-order-for-control-methods): a
  caller that holds the scope and knows the 128-bit id can tell a live vacant
  session from an unknown one; no other pair is distinguishable.
- An absent operator capability is not a refusal at negotiate and is not
  distinguishable from a capability that was never requested: both yield the
  baseline scopes. Only a **present** malformed or wrong bearer is
  `Unauthenticated`, and that response is identical to a failed peer check.
- A missing, expired, revoked, or wrong-peer host grant adds no `session.host`
  scope and produces the same `Denied/ConsentRequired` at create.
- A non-operator `session.grant.revoke` whose connection digest does not match
  the retained grant's binding returns the byte-identical
  `{grant_id, revoked: false, not_active: true}` success as an unknown or swept
  grant id, and revokes nothing; the operator path is ungated.
- `session.list` never enumerates another client's sessions; the operator view
  requires `daemon.inspect`, and even that view carries metadata only.
- `daemon.status` is operator-only; the handshake facts are the only daemon
  information an ordinary consumer connection receives.
- An unknown refusal code from a peer is surfaced as a static `Internal`, never
  parsed as text and never treated as success.

## Refusal taxonomy

Transport, framing, and validation errors stay in the accepted `bitty-ipc`
taxonomy. Session outcomes are service results, never transport errors, and the
two are never substituted for each other.

### Service refusal codes

The `Denied.code` values below are the closed service-level set for major `1`.
An existing code never changes meaning. Whether a `1.x` minor may add a code is
an open point, so this freeze adds none. The `Served` column records whether the
merged daemon can emit the code on the wire today; a `no` row is a declared
code, not a proof of behavior.

| Code                    | Served | Condition                                                                                                                  |
| ----------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| `ScopeViolation`        | yes    | The connection lacks the method's required scope, or `process.spawn` is missing at create                                  |
| `ConsentRequired`       | yes    | Host consent is missing, expired, revoked, consumed, or bound to a different peer                                          |
| `ControllerRequired`    | yes    | The caller is not the current controller on a control method                                                               |
| `InvalidControlToken`   | yes    | Control is vacant and the token is missing, stale, or rotated                                                              |
| `ControlHeld`           | yes    | A valid current token is presented while a live controller still holds control                                             |
| `ObserverGrantRequired` | yes    | An observer attach lacks a valid single-use grant                                                                          |
| `AlreadyNegotiated`     | yes    | A second negotiate, a request before the negotiate response, or any byte queued before the response; the connection closes |
| `UnsupportedCapability` | yes    | A disabled session kind or an unserved method (`worker_sessions=false`, `daemon.orphans.verify`)                           |
| `UnsupportedPlatform`   | no     | Declared for a non-served cell; the merged CLI exits with a startup error, not a wire refusal                              |
| `StaleInstance`         | yes    | The request names a different daemon instance than the connection is bound to                                              |
| `StaleGeneration`       | yes    | The request's generation does not match the current generation                                                             |
| `SessionStopping`       | yes    | A mutation is refused while the session drains or a cancel is pending                                                      |
| `NotRunning`            | yes    | A grant mint or revoke targets a terminal session; abort and kill return `not_running` in a success result instead         |
| `TerminalAlreadyHosted` | yes    | A different create key names a `terminal_id` that a live session already holds                                             |
| `ActiveSessions`        | yes    | A default `daemon.stop` while sessions are active                                                                          |
| `DaemonStopping`        | yes    | A mutation is refused after the daemon entered `stopping`; a repeated `daemon.stop` also returns it                        |
| `IdempotencyConflict`   | yes    | A duplicate key carries a different fingerprint or arrives on the wrong connection                                         |
| `IdempotencyCapacity`   | yes    | A keyed method is refused because its store is full; termination is never refused this way                                 |
| `TerminalEventLost`     | no     | Declared for the event stream; no event frame is sent in this slice                                                        |
| `RateLimited`           | yes    | The request exceeds the advertised rate                                                                                    |
| `Internal`              | yes    | The audit sink is unavailable (`Denied/Internal`) or an invariant fails (bare `Internal`)                                  |

A code in this table is returned as `Denied/<code>`. The non-`Denied` wire
result classes are `VersionMismatch`, `Unauthenticated`, `LimitExceeded`,
`NotFound`, `InvalidMethod`, `InvalidRequest`, and bare `Internal`: `NotFound`
is the uniform target result and the well-formed unknown-method result,
`InvalidMethod` is a grammar failure, `InvalidRequest` is a malformed payload or
field, and `Internal` is the fail-closed invariant result with no partial
mutation. `Timeout` is not a wire result: it is the single aggregated audit
record for a missed negotiate deadline, closes the connection, and sends no
frame. The inherited `FrameTooLarge`, `PayloadTooLarge`, `PendingLimitExceeded`,
and `ChannelFull` enum labels have no wire emission in this slice; an
over-bound frame is reported as `LimitExceeded`. A `Denied` code not in the
table is not a `1.0` code.

### Transport and validation classes

| Condition                                        | Served result                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unsupported wire or service version              | `VersionMismatch`; connection closes                                                                                                                                |
| Peer credential or endpoint tamper failure       | `Unauthenticated`; connection closes                                                                                                                                |
| Declared frame above `max_frame_bytes`           | `LimitExceeded` (the inherited `FrameTooLarge` label maps to it); closes without a frame                                                                            |
| Payload, id, or field over a bound               | `LimitExceeded` or `InvalidRequest`; an over-long `id` returns `InvalidRequest` with `id` omitted and then closes; other complete-frame validation bounds stay open |
| Pending request or channel over bound            | No such surface is served in this slice; the inherited labels are declared only                                                                                     |
| Unknown method with valid grammar                | `NotFound` (v1 registry policy; deny-by-default)                                                                                                                    |
| Malformed method name                            | `InvalidMethod`                                                                                                                                                     |
| Malformed request payload or field               | `InvalidRequest`                                                                                                                                                    |
| Negotiate deadline                               | `Timeout` in the audit record; no response frame; connection closes                                                                                                 |
| Unknown, collected, or invisible session         | `NotFound` (live-vacant-control carve-out aside)                                                                                                                    |
| Invariant failure without a typed service result | `Internal`; fail closed                                                                                                                                             |

`bitty-ipc` v1 resolves a well-formed method absent from its registry as
`NotFound` before authorization and reserves `InvalidMethod` for names that
violate the wire grammar. This freeze preserves that split for the service
families; it does not widen `InvalidMethod` to mean an unknown method.

A refusal carries static codes, counts, and the limit that was hit. It never
echoes caller bytes, a path, terminal text, a token, a bearer value, or another
session's details.

**Corpus coverage.** The merged 36 vectors pin 16 wire codes:
`VersionMismatch`, `Unauthenticated`, `LimitExceeded`, `NotFound`,
`ScopeViolation`, `ConsentRequired`, `ControllerRequired`,
`InvalidControlToken`, `ObserverGrantRequired`, `AlreadyNegotiated`,
`UnsupportedCapability`, `StaleInstance`, `StaleGeneration`, `NotRunning`,
`ActiveSessions`, and `IdempotencyConflict`. `ControlHeld`, `SessionStopping`,
`TerminalAlreadyHosted`, `DaemonStopping`, `IdempotencyCapacity`,
`RateLimited`, `Internal`, and `InvalidMethod` are implemented and unit- or
integration-tested but have no corpus row; PR #2794 adds the `InvalidRequest`
row (`V-40`), and `Timeout` is audit-only. bitty#2605 owns the remaining
coverage gap. A vector that expects a code outside this table is a contract
defect, not a corpus choice.

### Closing refusals

Typed refusals close a connection after their refusal frame is written and
drained in these cases: `VersionMismatch`, `Unauthenticated`,
`Denied/AlreadyNegotiated`, every refusal of a `daemon.negotiate` request
(including the `InvalidRequest` from a malformed payload), a pre-handshake frame
that omits `v`, and the over-long-`id` `InvalidRequest` whose response omits
`id`. Every other `Denied` code, `NotFound`, `InvalidMethod`, `InvalidRequest`
on an already-negotiated non-handshake request, `LimitExceeded`, and a
rate-limited non-negotiate request leaves the connection open. `Timeout` is the
negotiate-deadline audit record: it closes the connection with no response
frame. A transport EOF, a socket I/O error, or a response that cannot be
rendered closes without a typed refusal.

Frame-level failures that prevent a complete frame carry no correlation id, so
they also close without a response frame: a missing, foreign, or mid-frame-changed
`SCM_CREDENTIALS`, a declared frame above `max_frame_bytes`, the pre-auth byte
budget, the negotiate deadline, the idle bound, and the outbound-queue bound.
An endpoint tamper closes acceptance for every connection and is a startup/exit
path. A complete frame that hits a rate bound receives the typed refusal and
stays open. A complete frame whose `id` is over 64 bytes receives the typed
`InvalidRequest` with `id` omitted and then closes; the pipelined-tail
`Denied/AlreadyNegotiated` is the only other typed response without an `id`.

### Conditions never distinguishable to a client

| Condition pair                                                                               | Single result                                                                                         |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unknown session, collected session, foreign session, or an invisible session                 | `NotFound`                                                                                            |
| Missing host consent vs. a host grant that is expired, revoked, consumed, or peer-mismatched | `Denied/ConsentRequired` at create                                                                    |
| Observer grant missing, expired, consumed, wrong-session, or wrong-peer                      | `Denied/ObserverGrantRequired`                                                                        |
| Control token missing, stale, or rotated at a vacant control relation                        | `Denied/InvalidControlToken`                                                                          |
| A caller that lacks `process.spawn` and also lacks host consent                              | `Denied/ScopeViolation`, never `ConsentRequired`                                                      |
| An absent operator capability vs. a capability that was never requested                      | Baseline scopes, no refusal; only a present invalid bearer is the static `Unauthenticated` + close    |
| A present malformed or wrong operator bearer vs. a failed peer check at negotiate            | One static `Unauthenticated` and close; the response never reveals whether the capability file exists |
| Unknown `Denied` code from a peer                                                            | Static `Internal`, never parsed as text                                                               |
| Non-operator revoke correlation mismatch vs. an unknown or swept `grant_id`                  | The byte-identical `{grant_id, revoked: false, not_active: true}` success; nothing is revoked         |

The live-vacant-control carve-out in [Denial order for control methods](#denial-order-for-control-methods)
is the one deliberate exception to the uniform `NotFound` row. It is not a
general oracle: it applies only to a live session, only while control is
vacant, and only on a control method that already passed the scope check.

## Compatibility rule

The one-major rule and capability immutability restate `D-11`; the upward-only
`system_max` rule restates `D-14`. This section adds no compatibility rule the
accepted contract does not already own. The delivery set and the `1.x` security
exception are proposals recorded under [Open points](#open-points), not rules
here.

### Additive within 1.x

A `1.x` revision is additive. It may:

- add a method that uses only existing scopes, gated by an existing or new
  capability;
- add a scope name, without changing an existing name, meaning, or default grant;
- add a capability name, with its meaning fixed for the major;
- add an optional response field, or an optional request field whose absence
  preserves the `1.0` behavior;
- raise a `system_max` upward through an attributable contract revision plus
  security review.

A `1.x` revision must not:

- remove, rename, or re-mean a method, scope, capability, field, event, or
  refusal code;
- add a required request field, or make an optional field required;
- start refusing a request that `1.0` accepts;
- lower a compiled `system_max` below a value a `1.0` client may have observed,
  or change the `{effective, default, system_max}` schema;
- change the meaning of an existing field, a lifecycle state, a terminal reason,
  or the control relation;
- serve two majors at once, translate between majors, or half-honor a minor.

Every additive change bumps the server minor and is a registry revision. The
four-artifact delivery set is a proposal under Open points.

### Breaking changes require 2.0

A breaking change requires all of the following:

1. service major `2.0`, negotiated as a different major and refused by a `1.x`
   server rather than translated;
2. a new accepted contract that supersedes this freeze for major `2`;
3. independent security review of the changed trust surface;
4. one major served at a time, with `1.x` clients receiving `VersionMismatch`
   against a `2.x` server and the reverse.

Whether `2.0` also needs a migration note naming consumer changes and evidence
for closing the old major is a proposal under Open points; `D-11` requires one
major served at a time but does not require that note.

A wire version change is separate: it is a `bitty-ipc` contract revision and may
land independently, but it never makes a service major compatible or
incompatible by itself.

### Consumer obligations

- Serialize the frozen spelling; do not alias a method, scope, or capability.
- Parameterize tests and adaptive behavior on the advertised `effective` limit,
  never on a hardcoded default.
- Ignore unknown response fields and unknown capability names; treat a
  well-formed unknown method as `NotFound`, a malformed method as
  `InvalidMethod`, and an unknown refusal code as `Internal`.
- Refuse to use a method whose capability is absent, and never substitute an
  in-process fallback.
- Reconcile with `session.status` after a timeout or an unknown outcome; retry a
  mutation only with the same key and the current generation.
- Treat a missing endpoint as a supported state, not as a reason to pick another
  transport.

## Deferred items

The following items are deliberately not frozen here. Each names its owner and
what this freeze does require of it. Resolved items are recorded in place, not
deferred: the scope registry home (bitty#2607), the operator-capability failure
code (`Unauthenticated`), the observer-attach replay rule (`V-22` closes it), the
absent-vs-null encoding (an explicit `null` is refused), the `session.resize`
spelling (frozen; the method remains unserved), and the grant-expiry revision
(merged in PR #2786, pinned by `C-10`).

| Item                                                                                         | Owner                                                    | Constraint this freeze keeps                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session.resize` success path and its controller-only revision effect                        | bitty#2790                                               | The spelling and scope requirement are frozen; every request today is `Denied/ScopeViolation`; no consumer may assume resize works                                             |
| `daemon.orphans.verify` and cgroup/subreaper containment, signal delivery, production reaper | bitty#2791                                               | Every request today is `Denied/UnsupportedCapability`; no orphan is claimed verified; corpus `C-03` pins the refusal                                                           |
| Worker spawn and bind                                                                        | bitty#2790                                               | `worker_sessions=false`; with create authority `kind: worker` is `Denied/UnsupportedCapability` before any spawn; enabling needs the ADR 0019 amendment and a dedicated review |
| Event frame delivery on a live connection                                                    | bitty#2792 for wire delivery; bitty#2605 for the vectors | No event frame is sent today; `events: true` is not evidence; `session.status`/`session.list` stay the reconciliation reads                                                    |
| Expiry event and its wire vector                                                             | bitty#2792; bitty#2605                                   | Expiry now bumps `state_revision` once per affected session (merged PR #2786); it still emits no event, so a consumer cannot observe expiry as an event                        |
| Conformance coverage for the unserved refusals                                               | bitty#2605                                               | The merged corpus pins 16 wire codes and 36 vectors; PR #2794 adds five vectors and the `InvalidRequest` row; a behavior outside the corpus is not proven                      |
| Independent security evidence for the served surface                                         | bitty#2608                                               | No P0 control is verified by this document or by the merged corpus; the security reviewer must record evidence or a tracked defect before sign-off                             |
| Endpoint discovery and transport details beyond Linux x86_64                                 | Accepted contract `D-15`                                 | Native-runner evidence before advertisement; a non-served cell has no endpoint; `UnsupportedPlatform` is a startup refusal, not a wire code                                    |
| Numeric limit values and the `{effective, default, system_max}` schema                       | Accepted contract `D-14`, bitty#2603                     | Keys are the `D-14` names; a client reads `effective`; a `system_max` only moves upward through contract revision and review                                                   |
| Duplicate handling for unkeyed `daemon.host_grant` mint                                      | Security review, bitty#2608                              | Mint creates a new grant per call; revoke is idempotent by `grant_id`; no key or fingerprint is invented here; the corpus must encode one behavior                             |
| Remote transport, restart persistence, and multi-instance service                            | ADR 0019, ADR 0008, accepted contract                    | No remote listener, no persistence, no second instance, no in-process fallback                                                                                                 |

## Security review

This document names a trust-bearing service surface. It adds no control and
weakens none; it must not be used as evidence that any control exists. The
review must confirm the following before this freeze is accepted.

| Control                                   | What this freeze must not do                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `P0-AC-021` endpoint and peer credentials | Restate a transport that lacks peer capture before parsing, per-message credentials on Linux, endpoint tamper detection, or no-TCP as optional. |
| `P0-AC-022` per-action scopes             | Introduce an ambient grant, a scope that implies another, or a method whose scope is evaluated after the effect.                                |
| `P0-AC-023` child scope limitation        | Let a session, capability, or handshake field carry daemon authority into a child, or let `session.host` become baseline.                       |
| `P0-AC-024` Agent read-only default       | Grant content through `session.*`, make observation self-granted, or let an inspect-only client create a session.                               |
| `P0-AC-025` DevTools scopes               | Fold `debug.*` into `daemon.*`, or let a connection obtain debug authority by connecting.                                                       |
| `P0-AC-026` secret minimization           | Put a raw correlation value, token, bearer, argv, env, terminal text, or caller bytes into a result, event, audit record, or diagnostic.        |
| No existence oracle                       | Let a refusal distinguish unknown from invisible, or reveal consent state to a caller without spawn authority.                                  |
| Strict refusal                            | Add a best-effort mode, a probe-based downgrade, a translated major, or a partial capability surface.                                           |
| Single writer and single instance         | Give a client a path to edit registry truth, signal a worker out of band, or open a second daemon instance.                                     |
| Daemon absence                            | Make the endpoint, the handshake, or this contract a startup, safe-mode, or headless dependency.                                                |

The review must also challenge the live-vacant-control carve-out (the one
deliberate oracle), the absent-versus-present operator capability split, the
`daemon.host_grant` mint duplicate effect, the `NotRunning` versus
`DaemonStopping` split, the two no-`id` refusal shapes (the pipelined tail and
the over-long `id`), the grant TTL and correlation-digest binding including the
uniform non-operator revoke answer, and the absence of an event wire. Each can
silently change an authority boundary without changing the method list. The
merged code and corpus are evidence to inspect, not a control that the reviewer
may mark verified.

## Verification plan

Evidence in this delivery:

1. Every frozen name traces to the accepted contract, `bitty-ipc` v1, or the
   IPC and Agent RFC; `session.resize` is the one spelling the accepted
   contract does not state, and the merged catalog and corpus use it.
2. The method table covers the 17 catalog names, and every method has one scope
   rule and one idempotency class. Two methods are declared unserved with a
   typed refusal; they are not counted as delivered.
3. The refusal table contains every `Denied.code` in the accepted taxonomy and
   no new code. The `Served` column separates a declared code from a reachable
   one, and the corpus-coverage note records which codes the 36 merged vectors
   and the five PR #2794 vectors pin.
4. `terminal.*` is unchanged, no `session.*` scope grants terminal content, and
   the only transport scope the daemon grants is `process.spawn`.
5. The corpus runs both drivers in `bitty` CI on Linux x86_64; a fake run never
   closes a real row, and the parity report names the shared ids.
6. `just check` and `git diff --check` are green; the document is English-only
   and self-contained.

Not proven by this delivery, and therefore not frozen as working behavior:

- no event frame is sent, so the five event kinds and the `events` capability
  have no wire evidence;
- `session.resize` and `daemon.orphans.verify` have no success path;
- grant expiry now bumps `state_revision` (`C-10`) but still emits no event
  (bitty#2792);
- the corpus does not pin every implemented refusal code, the expiry event, or
  a second platform cell (bitty#2605, bitty#2792);
- no P0 control has the evidence set bitty#2608 requires, and nothing here
  marks a control verified.

Before this freeze is signed off:

1. Wheel and `bitty-ai` consumer review record that the adapter and fake server
   can target the frozen names with no local alias, that `attach_role`/`role` is
   the pair they serialize, and that they do not rely on the `events` bit.
2. Independent security review records that the refusal set, the no-oracle
   rules and the live-vacant carve-out, the control relation, the token and
   bearer handling, and the deferred items weaken no P0 control (bitty#2608).
3. Core architecture review confirms the registry home, the revision rule, the
   unserved-method dispositions, and the `NotRunning`/`DaemonStopping` split.
4. bitty#2605 adds the missing refusal vectors and a parity check that fails on
   a divergent fixture.
5. bitty#2608's security reviewer confirms the five PR #2794 vectors (TTL
   bounds, correlation binding and revoke uniformity, pipelined-tail refusal,
   over-long `id`, and spelling aliases), the merged expiry vector `C-10`, and
   the no-`id` refusal shapes.

Definition of done for this freeze: the document is merged with an honest
status, the sign-off table records four unchecked boxes with the evidence each
reviewer must inspect, and `just check` is green. Implementation stays with
bitty#2790, #2791, #2792, #2608, #2605, and #2666; this document does not
authorize a listener, a transport fallback, or a consumer-side alias.

## Alternatives considered

| Alternative                                         | Trade-off                                                                                                           | Disposition                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Let each consumer define its own scope spelling     | No cross-repository negotiation; the corpus cannot be shared and the fake server forks expectations.                | Rejected; one registry and one spelling were the point of bitty#2664.       |
| Freeze the frame layout here too                    | One document for everything; duplicates `bitty-ipc` v1 and puts a second encoding contract beside the served one.   | Rejected; the served encoding is `bitty-ipc` v1, the names are frozen here. |
| Put `session.*` in the existing `terminal.*` family | No new vocabulary; silently grants terminal authority to an Agent client and collapses consent domains.             | Rejected by the accepted contract; a separate family is frozen.             |
| Make `session.host` baseline                        | Simpler create path; drops per-client spawn consent and `P0-AC-024`.                                                | Rejected; consent is an explicit grant consumed at negotiate.               |
| One version number for wire and service             | Fewer fields; cannot refuse version change and encoding change independently.                                       | Rejected; two axes with separate owners.                                    |
| Best-effort negotiation with capability probing     | Older clients keep working; makes an incompatible change indistinguishable from an additive one and hides refusals. | Rejected; strict range check and explicit capabilities.                     |
| Expose a discovery or enumerate method              | Easier client bootstrap; becomes an existence and enumeration oracle.                                               | Rejected; live-lease visibility and `session.list` only.                    |
| Keep refusals as free-text messages                 | Easier debugging; untestable, leaks caller bytes, and lets a client parse meaning into a code.                      | Rejected; static codes, counts, and limits only.                            |

## Affected contracts

| Contract                                                                                                                  | Effect                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted)                                                | Authoritative for every decision. This document restates its `D-07`, `D-08`, `D-11`, `D-14`, `D-16`, and `D-18` surfaces, owns only their spelling, and adds no rule.            |
| [Promotion record](bittyd-session-host-promotion-record.md) (accepted)                                                    | Unchanged. The sign-off state stays as recorded; this freeze claims no approval it does not list.                                                                                |
| [bittyd Scope Charter](bittyd-scope-charter.md) (draft)                                                                   | Unchanged. The freeze adds no mechanism and no policy to the charter's floor.                                                                                                    |
| `bitty-ipc` v1 (accepted)                                                                                                 | No v1 name changes. The `session.*`/`daemon.*` names live in the `bittyd`-owned table; the v1 grammar, validator, 15 scopes, defaults, and method mappings are reused unchanged. |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted) | Unchanged; this freeze uses its transport, method grammar, error classes, and local-only posture.                                                                                |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (draft)                                      | Consumed as input only. The frozen names replace any consumer-side spelling, and the consumer review is still required.                                                          |
| Security corpus (normative)                                                                                               | `P0-AC-021` through `P0-AC-026` are unchanged; the freeze must be reviewed against them before acceptance.                                                                       |
| `bitty` GUI, `bitty ctl`, and `bitty-ai` adapters                                                                         | No new authority. Each consumes the frozen names and the advertised capabilities; none gets a local alias or a second registry.                                                  |
| [bittyd Current-Release Eligibility Gate](bittyd-release-eligibility.md) (candidate)                                      | Consumes this freeze as one eligibility row; the release gate never treats a merged freeze as implementation evidence.                                                           |
| [Specifications register](README.md)                                                                                      | Lists this document as Draft/candidate for sign-off in the draft table; a status change is a separate reviewed edit.                                                             |

## Open points

These stay open until the named review or task closes them. None is a reason to
serve a different spelling in the meantime. The observer-attach replay,
`session.resize` spelling, registry home, operator-capability failure code, and
absent-vs-null questions are **resolved** and recorded above, not open.

- **Event capability honesty.** The merged build advertises `events: true` while
  sending no event frame. The Consumer and Security reviews must decide whether
  `1.0` may keep that bit while bitty#2792/#2605 close the wire, or require the
  bit to be false until a vector passes. Until one is chosen, no consumer may
  rely on event delivery.
- **Revision delivery set.** Whether a revision must update this document, the
  `bittyd` registry, the conformance corpus, and the consumer requirements in
  one delivery is proposed here, not accepted. Core architecture review must
  accept or replace that delivery rule before it can block a merge.
- **`1.x` security exception.** The accepted contract does not authorize a
  `1.x` build to refuse input `1.0` accepted. A recorded compatibility exception
  is proposed; until the security review accepts it, no `1.x` revision may
  refuse a request `1.0` accepts.
- **New refusal codes inside `1.x`.** The accepted `Denied.code` set is closed
  and does not authorize an addition inside `1.x`. Whether an additive code rule
  is allowed is open; until it is accepted, this freeze adds no code.
- **`2.0` migration note.** A migration note naming consumer changes and the
  evidence that closes the old major is proposed; `D-11` requires one major
  served at a time but does not require that note.
- **`daemon.host_grant` mint duplicate policy.** Mint carries no key and
  creates a new grant on every call; revoke is idempotent by `grant_id`. The
  Security review must accept that effect or require a key or fingerprint rule,
  and the corpus must encode one behavior (bitty#2608).
- **Operator capability as a wire field.** `D-07` says the capability is never
  accepted as a wire field from a consumer adapter, while the handshake carries
  `operator_capability`. This freeze keeps the handshake field as the only
  channel and treats the adapter prohibition as grant policy, which cannot be
  enforced against the same-uid owner; the consumer review must confirm that
  wording.

## Acceptance criteria

This freeze is complete when:

1. Every scope, method, capability, handshake field, event kind, identifier
   format, and refusal code has exactly one frozen spelling and one owner.
2. The registry ownership and revision rule is stated, and every change class
   names its gate.
3. The handshake covers the version axes, the request and response fields, the
   accept/refuse order, the pre-authentication limits, the server-assigned
   identity, the peer facts, `client_correlation`, `host_grant`, and the
   `wire_version` ownership.
4. A version mismatch is a typed refusal before any session operation, the
   v0.2.0 capability profile is stated, a missing client-side capability
   produces a typed client refusal or the typed worker refusal, and the
   `events` bit is not described as delivered behavior.
5. The authorization order is fixed, and every condition that must not be
   distinguishable to a client is listed with its single result.
6. The refusal set is closed, and no code is invented outside the accepted
   taxonomy.
7. The `1.x` additive rule and the `2.0` breaking rule are explicit, every
   deferred item names its owner, and every untraced proposal is recorded as an
   open point.
8. `terminal.*` is unchanged and never stretched; `session.*` never grants
   terminal content.
9. The document is English-only, self-contained, and free of research
   references; `just check` and `git diff --check` are green.
10. The [Sign-off](#sign-off) section records four unchecked boxes with the
    evidence each reviewer must inspect; no control is marked verified.

## Sign-off

This freeze is a **candidate for sign-off**, not accepted. No box below is
checked, and no control is verified. A sign-off records that the named reviewer
inspected the named evidence; it is not a restatement of a green test run.

- [ ] **Owner — Core terminal platform.** Review the frozen names and ordering
      in this document against `crates/bitty-daemon/src/service/scopes.rs`
      (six scopes, 17 methods, baseline and operator sets),
      `src/contract.rs` (`1.0`, `1.0..=1.0`, six capabilities),
      `src/handshake.rs` (request/response fields, correlation hashing, bearer
      parsing), and `src/service/dispatch.rs` (authorization order, refusal
      constructors). Confirm the document freezes only what PRs #2761, #2770,
      and #2776 serve, and that the two unserved methods are labelled rather
      than promised.
- [ ] **Security.** Review the closed refusal set in `src/codes.rs`, the close
      predicate `Refusal::closes_connection`, the control relation and token
      handling in `src/service/dispatch.rs` and `src/lease/host.rs`, the grant
      store in `src/service/grants.rs`, the live-vacant-control carve-out, the
      audit and no-secret rules, and corpus vectors `V-02`, `V-09`, `V-13`,
      `V-22`, `V-33`, `C-02`, `C-07`, and `C-09`. Confirm no P0 control is
      marked verified and record the P0 evidence set required by bitty#2608.
- [ ] **Architecture.** Review the registry home and revision rule, the two
      version axes, the capability profile, the 17-method catalog against the
      15 served methods, the `NotRunning`/`DaemonStopping` split, the grant
      mint/consume/revoke/expiry revision rules (including the merged bitty#2780
      fix), and the deferred dispositions in bitty#2790, #2791, #2792, and
      #2605. Confirm a
      `1.x` addition cannot re-mean a name and a `2.0` change cannot be served
      side by side.
- [ ] **Consumer — Wheel adapter and fake server, plus `bitty-ai`.** Review the
      handshake request and response fields, the `scopes` array including
      `process.spawn`, `attach_role`/`role`, the capability profile including
      the `events` caveat, the identifier and bearer formats, the idempotency
      classes, the `not_attached` repeat, and the refusal codes. Confirm the
      adapter can target this surface with no local alias, does not rely on
      `events` or `session.resize`, and returns its own typed unavailable result
      when a capability is absent.

| Reviewer                                | Evidence inspected                                                                                                  | Status                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Owner — Core terminal platform (author) | This document; `scopes.rs`, `contract.rs`, `handshake.rs`, `dispatch.rs`; PRs #2761/#2770/#2776                     | Unchecked; required before acceptance |
| Security reviewer                       | `codes.rs`, `dispatch.rs`, `lease/host.rs`, `grants.rs`; corpus V-02/V-09/V-13/V-22/V-33/C-02/C-07/C-09; bitty#2608 | Unchecked; required before acceptance |
| Architecture reviewer                   | Registry and revision rule; version axes; method catalog; grant revision table; deferrals                           | Unchecked; required before acceptance |
| Consumer reviewer                       | Handshake fields; scope array; role pair; capabilities; idempotency; refusals; no-alias rule                        | Unchecked; required before acceptance |
| Docs curator (repository gate)          | Spine, metadata, index row, English-only, self-containment, and cross-document synchronization                      | Unchecked; required before merge      |

A missing signature is an acceptance blocker, not a comment. The document must
not be marked `accepted` while any box above is unchecked, and no implementation
slice may cite it as an approval. The docs-curator row is a repository gate, not
a substitute for the four product reviews.

## References

- [bittyd Session-Host Contract](bittyd-session-host-contract.md) — accepted
  decisions, lifecycle, limits, audit, conformance matrix, and trust boundary.
- [bittyd Session-Host Contract Promotion Record](bittyd-session-host-promotion-record.md)
  — accepted dispositions, sign-off state, and review-wide obligations.
- [bittyd Scope Charter](bittyd-scope-charter.md) — draft mechanism floor and
  exclusions for the daemon.
- [Wheel consumer requirements for the bittyd session host (Candidate)](bittyd-session-host-requirements-candidate.md)
  — consumer input and the `V-*` vector set.
- [ADR 0019 - bittyd Staging Advance to the v0.2.0 Slice](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  — accepted staging, minimal slice, and exclusions.
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  — accepted daemon definitions, ownership, and trust gates.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md), and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  — normative controls and evidence gates.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  — accepted local transport, scopes, error taxonomy, and rate limits.
- [`bitty-ipc`](https://github.com/bitty-terminal/bitty-ipc) — accepted wire
  envelope, 15 v1 scopes, method-to-scope registry, peer credentials, and
  `IpcError` classes.
- [bitty#2664](https://github.com/bitty-terminal/bitty/issues/2664) — freeze the
  bittyd IPC scopes, handshake, and version contract.
- [bitty#2761](https://github.com/bitty-terminal/bitty/pull/2761) — the merged
  service loop (`d360b442f`): scopes, handshake, grants, and peer re-check.
- [bitty#2770](https://github.com/bitty-terminal/bitty/pull/2770) and
  [bitty#2776](https://github.com/bitty-terminal/bitty/pull/2776) — the P1
  corrections and the repeat-detach/grant-revision fixes (`57d459f7`,
  `a1c5639a`).
- [bitty#2769](https://github.com/bitty-terminal/bitty/pull/2769) and
  [bitty#2771](https://github.com/bitty-terminal/bitty/pull/2771) — the
  conformance harness and its operator-capability setup fix (`87463f34`,
  `0b9483f2`).
- [bitty#2786](https://github.com/bitty-terminal/bitty/pull/2786) — the merged
  grant-expiry revision bump; [bitty#2780](https://github.com/bitty-terminal/bitty/issues/2780)
  is the closed issue, and the expiry event stays with bitty#2792.
- [bitty#2794](https://github.com/bitty-terminal/bitty/pull/2794) — the
  security-sign-off corrections in review (`0a584577`): pre-auth pipelining
  refusal, over-long `id`, grant TTL and correlation digests, and the uniform
  revoke answer.
- [bitty#2790](https://github.com/bitty-terminal/bitty/issues/2790) — worker
  spawn, bind, generation 1, and the `session.resize`/content plane.
- [bitty#2791](https://github.com/bitty-terminal/bitty/issues/2791) — process
  containment, signal delivery, reaping, and orphan verification.
- [bitty#2792](https://github.com/bitty-terminal/bitty/issues/2792) — session
  event frames pushed to subscribed connections.
- [bitty#2605](https://github.com/bitty-terminal/bitty/issues/2605) — the shared
  conformance harness and the remaining vector coverage.
- [bitty#2608](https://github.com/bitty-terminal/bitty/issues/2608) — the
  independent security review and P0 evidence set.
- [bitty#2666](https://github.com/bitty-terminal/bitty/issues/2666) — the
  conditional release eligibility gate that consumes this freeze.
- [bitty#2783](https://github.com/bitty-terminal/bitty/pull/2783) — the
  per-family component protocol; a different surface that does not change this
  contract.
