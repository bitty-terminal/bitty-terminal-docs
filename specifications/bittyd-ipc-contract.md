---
title: bittyd IPC Contract (Candidate)
description: Candidate freeze of the bittyd service IPC surface - one scope registry and revision rule, handshake fields, normative method and scope table, authorization order, closed refusal set, and the 1.x compatibility rule
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 83
---

# bittyd IPC Contract (Candidate)

> Status: **candidate freeze.** This document freezes the cross-repository IPC
> surface that bitty#2664 asks for: the service scope families and their
> registry, the handshake fields, the method and scope table, the authorization
> order, the closed refusal set, and the compatibility rule. It restates
> decisions already accepted in the
> [bittyd Session-Host Contract](bittyd-session-host-contract.md) on 2026-10-27
> and adds no new authority.
>
> It is `draft` rather than `accepted` for two honest reasons. The consumer and
> independent security sign-offs that bitty#2664 lists as acceptance criteria
> are **not recorded**, and two mechanism choices the accepted contract leaves
> open — the physical home of the service scope registry and the failure code
> for a missing operator capability — are stated as constraints here and
> deferred to their owners. The sign-offs this freeze needs are listed under
> [P0 Review Sign-off](#p0-review-sign-off).
>
> No daemon, listener, endpoint, registry, transport, or fake server is
> implemented, and nothing here authorizes one.

| Control          | Value                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Status           | Candidate freeze; freezes accepted decisions and adds no new authority                                                                                                                     |
| Issue            | [bitty#2664](https://github.com/bitty-terminal/bitty/issues/2664) — freeze bittyd IPC scopes, handshake, and version contract                                                              |
| Parent           | [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) — define the bittyd session-host contract                                                                                |
| Upstream records | Accepted [bittyd Session-Host Contract](bittyd-session-host-contract.md), [promotion record](bittyd-session-host-promotion-record.md), ADR 0008, ADR 0019, `bitty-ipc` v1, security corpus |
| Consumers        | Wheel CTX-0036 adapter and fake server; `bitty` GUI, `bitty ctl`, and other local clients                                                                                                  |
| Implementation   | None. No `bittyd` crate, binary, listener, registry revision, or conformance driver exists; implementation is bitty#2606, #2607, #2609                                                     |
| Evidence status  | No frame has been exchanged with a real `bittyd`; no conformance vector has run                                                                                                            |
| Change authority | Core terminal platform owns this freeze; the security corpus co-owns the trust boundary                                                                                                    |
| Promotion gate   | Consumer, architecture, and independent security reviews recorded, `just check` green, and no new authority introduced                                                                     |

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
- It does not fix the frame encoding, the JSON serialization, the numeric limit
  values, the endpoint discovery mechanism per cell, or the conformance
  fixtures. Those are named under [Deferred items](#deferred-items).

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
consumer adapter, a fake server, a real daemon, and the conformance corpus must
agree on one set of names and one version source before any of them is written.

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
  (`bitty-ipc` v1, bitty#2607);
- endpoint discovery, socket or pipe naming, and platform transport details
  (bitty#2604 and bitty#2607);
- numeric limit values and their `{effective, default, system_max}` schema
  (accepted contract `D-14`, bitty#2603);
- lifecycle, counter, lease, grant, audit, and orphan semantics (accepted
  contract, bitty#2601, #2609);
- conformance vector identifiers and fixtures (bitty#2665);
- daemon implementation, packaging, and release eligibility (bitty#2606,
  #2607, #2609, #2666);
- worker hosting, remote transport, and session persistence across a restart
  (excluded by ADR 0019 and the accepted contract).

## Normative sources this specification must not weaken

| Source                                                                                                                               | What it binds here                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | The v0.2.0 slice: single instance per user, peer-credential IPC re-checked before privileged actions, session-grained attach and detach, and service API versioning from day one.                                                          |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Daemon definitions, single PTY ownership, bounded persistence, attributed enforcement, and both trust-boundary gates.                                                                                                                      |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted)                                                           | `D-07` scopes and control relation, `D-08` identity, `D-11` versioning, `D-14` limits, `D-16` audit, `D-18` idempotency, the service surface, the refusal table, and the trust-boundary residuals.                                         |
| [Promotion record](bittyd-session-host-promotion-record.md) (accepted)                                                               | The accepted disposition per decision, the sign-off state, and the review-wide obligations that this freeze must not silently satisfy.                                                                                                     |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)            | The closed v1 scope families, per-request server-side evaluation, the error taxonomy, local-only transport, and no default TCP.                                                                                                            |
| `bitty-ipc` v1 (accepted)                                                                                                            | The wire envelope (`v`, `id`, `method`, `params`), method grammar, `SUPPORTED_WIRE_VERSIONS`, the 15 v1 scopes, the method-required-scope registry, and the `IpcError` classes.                                                            |
| [Security corpus](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                      | `P0-AC-021` through `P0-AC-026`, the T-09/T-10/T-11 threat lines, and the rule that a new scope is additive, deny-by-default, and reviewed.                                                                                                |
| [bitty#2664](https://github.com/bitty-terminal/bitty/issues/2664)                                                                    | The freeze scope and its acceptance criteria: one spelling and version source, `terminal.*` not stretched, consumer and security review recorded, vectors frozen, no listener included. Issue text is not a normative source for behavior. |

## Terminology

| Term             | Meaning in this document                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wire version     | The `bitty-ipc` envelope version `v` carried on every frame, with `1` the only supported value. It describes framing, envelope, and correlation.                  |
| Service version  | The `{major, minor}` contract version negotiated in `daemon.negotiate`. It describes the session surface, never the framing.                                      |
| Negotiation      | The single pre-authentication `daemon.negotiate` exchange that fixes the service version, scopes, capabilities, limits, and identity for one connection.          |
| Scope registry   | The single table that maps a scope name to its meaning and a method to its required scope. v1 families live in `bitty-ipc`; the service families are frozen here. |
| Baseline grant   | The scopes an ordinary consumer connection receives: `session.inspect`, `session.attach`, and `session.control`. `session.host` is never baseline.                |
| Capability       | An explicit, per-connection boolean that gates a method family. It never changes meaning inside a major.                                                          |
| Control relation | The authorization rule that requires the current controller lease, or the current control token while control is vacant. Scope alone is never sufficient.         |
| Frozen spelling  | The single name a scope, method, capability, field, event, or refusal code uses in the contract, the registry, the corpus, and every consumer.                    |
| Existence oracle | A response that lets a client learn whether a session, grant, or endpoint it may not see exists. The service never provides one.                                  |
| Keyed method     | A method that carries a client-generated 128-bit idempotency key and consults a bounded store: create, attach, grant mint, and transfer.                          |
| Keyless method   | A method that is naturally idempotent by its target and never consults an idempotency store, so capacity can never block termination or revocation.               |

## Current state (read-only inspection)

The following facts were read from the local `bitty-ipc` checkout while writing
this freeze; they are the baseline the freeze extends, not a claim that this
document's service family exists.

- `bitty-ipc` v1 defines **15 scopes** across the `terminal`, `view`, `config`,
  `plugin`, `process`, `debug`, and `ai` families, and **51 registered
  methods**; `required_scope_for_method` returns `None` for an unknown method,
  which the server denies without side effects.
- The wire envelope is version `1`; `SUPPORTED_WIRE_VERSIONS` contains only
  `1`; the correlation `id` is bounded to 64 bytes; the method name is bounded
  to 128 bytes and validated as lowercase dotted segments.
- No `session.*` or `daemon.*` scope name, method name, capability name, or
  handshake field exists in `bitty-ipc` or in `bitty` today. The service family
  is text only.
- No `bittyd` crate, binary, endpoint, listener, registry, or fake server
  exists in any repository.

## Version sources and ownership

Two version axes are independent, and each has exactly one owner. A supported
wire version never implies a supported service version, and a service version
never implies a wire version.

| Axis            | Owner                      | Single source of truth                                                            | Changes when                                                                                                     | Refusal                                    |
| --------------- | -------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Wire version    | `bitty-ipc`                | `WIRE_VERSION` and `SUPPORTED_WIRE_VERSIONS`, carried per frame as `v`            | The framing, envelope, or correlation contract changes; that is a `bitty-ipc` contract revision, not this one.   | `VersionMismatch`, connection closes       |
| Service version | This contract, `1.0` today | `{major, minor}` in `daemon.negotiate`, plus `min_client_minor` in the response   | Additive method, scope, capability, or field inside major `1` bumps the minor; a breaking change requires `2.0`. | `VersionMismatch`, connection closes       |
| Scope registry  | Split, see below           | `bitty-ipc` for v1 families; this document for `session.*` and `daemon.*`         | A scope or method is added, removed, renamed, or re-meant, per the revision rule.                                | `InvalidMethod` or `Denied/ScopeViolation` |
| Capability set  | This document              | The six capability names in [Capabilities and methods](#capabilities-and-methods) | A capability is added inside a minor; its name and meaning never change inside a major.                          | `Denied/UnsupportedCapability`             |
| Limit values    | Accepted contract `D-14`   | The `D-14` table and the Resource limits section                                  | A system maximum may only change upward, through an attributable contract revision plus security review.         | `LimitExceeded`, `Denied/*` by method      |

Rules that follow:

1. `wire_version` is a **response echo only**. It is not a request field, it is
   not renegotiated in `daemon.negotiate`, and it never substitutes for the
   per-frame `v`. A frame outside `SUPPORTED_WIRE_VERSIONS` is refused whole.
2. The service version is negotiated exactly once per connection and is
   immutable afterward. A client that needs a different major, minor range,
   scope set, or capability set reconnects.
3. The server accepts the same major and a client minor in
   `[min_client_minor, server_minor]`. `min_client_minor` starts at `0` for
   `1.0`. A different major, or a client minor outside the range, is
   `VersionMismatch` and the connection closes before any session operation.
4. A service `2.0` does not imply a wire version change, and a future wire
   version does not imply a service change. Each axis is negotiated and refused
   on its own.

## Scope registry: ownership and revision

### Ownership rule

The service has exactly **one** authoritative registry. There is no second
vocabulary, no per-consumer spelling, and no adapter-local aliasing.

- The v1 families (`terminal.*`, `view.*`, `config.*`, `plugin.*`,
  `process.spawn`, `debug.*`, `ai.*`) stay owned by `bitty-ipc`. Their names,
  meanings, defaults, and method mappings are unchanged by this document.
- The `session.*` and `daemon.*` names, their meanings, the method catalog, and
  the baseline grant are owned by this document and restated from the accepted
  contract. `bitty-ipc` implements them in its one registry; it does not
  reinterpret them.
- The security corpus co-owns every trust-bearing property: the baseline grant,
  consent, the control relation, the operator capability, and the refusal
  codes.
- A consumer (Wheel, `bitty-ai`, `bitty ctl`) may hold its own adapter types but
  must serialize the frozen spelling and must not define a method, scope, or
  capability of its own.

The physical home of the service half — new variants in the `bitty-ipc` `Scope`
enum and its method map, or a `bittyd`-owned table that reuses the same method
grammar and parser — is a mechanism choice deferred to bitty#2607. Both options
must satisfy the ownership rule, the revision rule, and the one-spelling rule
below.

### Revision rule

| Change                                                                                 | Required revision                                                                                                                        |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Add a scope name to `session.*` or `daemon.*`                                          | Service minor bump; registry revision; this document, `bitty-ipc`, the conformance corpus, and the consumer requirements in one delivery |
| Add a method that uses only existing scopes                                            | Service minor bump; registry revision; method catalog row and corpus vector in the same delivery                                         |
| Add a capability                                                                       | Service minor bump; name and meaning fixed for the major; clients ignore a capability they do not know                                   |
| Add an optional response field or an optional request field with unchanged default     | Service minor bump; no existing field changes meaning; absence preserves the previous behavior                                           |
| Change a scope meaning, method name, refusal code, or the meaning of an existing field | Service major bump (`2.0`); a new accepted contract; independent security review; one major served at a time                             |
| Remove a scope, method, capability, or field                                           | Service major bump; same gate as a meaning change                                                                                        |
| Raise a compiled `system_max`                                                          | Upward only, through an attributable contract revision plus security review; this document does not carry the numbers                    |
| Fix a security defect by refusing input `1.0` accepted                                 | A recorded compatibility exception inside the same revision that carries the security review; never a silent minor                       |

Rules:

1. A registry revision never reuses a retired name for a different meaning. A
   retired name stays retired or returns with its original meaning.
2. No existing `bitty-ipc` v1 scope changes meaning, default grant, or method
   mapping because a service family was added.
3. No scope implies another scope. A higher-sounding name is not a superset, and
   `session.control` is necessary but never sufficient for a control action.
4. `terminal.*` is never stretched to cover session or daemon administration,
   and `session.*` never grants terminal content.
5. A registry revision that cannot update all four artifacts in one delivery is
   incomplete and does not merge.

### One spelling source

The following spellings are frozen for service major `1`. A consumer, a fake
server, a real daemon, and the corpus use exactly these names.

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
name; if the Core architecture review prefers another spelling, it changes here
once, before any implementation, and the corpus follows. The defect is recorded
in [Open points](#open-points).

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

## Handshake

`daemon.negotiate` is the only pre-authentication method. It runs after the
transport accept, the peer-credential capture, and the wire-version check, and
before any operation that can name a session.

### Request fields

| Field                 | Presence | Rule                                                                                                                                                                                                                                                                                              |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client_version`      | required | `{major, minor}`, both unsigned 16-bit. Compared against the server range; a mismatch is `VersionMismatch` and the connection closes.                                                                                                                                                             |
| `client_correlation`  | optional | At most 128 bytes of valid UTF-8 with no control characters. It is hashed on receipt; only a truncated 128-bit SHA-256 digest is audited as `client_correlation_digest`. It is never echoed, stored raw, or evaluated for authorization. A malformed value is `InvalidRequest`, never normalized. |
| `operator_capability` | optional | The per-boot bearer that requests `daemon.inspect` and `daemon.control`. It is verified only when `daemon.*` scopes are requested. It is never placed in an environment, inherited by a worker, or accepted as authority from a session lease.                                                    |
| `host_grant`          | optional | A single-use bearer minted by `daemon.host_grant`. Consuming it adds `session.host` to the connection. A missing, expired, wrong-peer, already-consumed, or revoked grant adds nothing and leaves later `session.create` to fail with `Denied/ConsentRequired`.                                   |

The wire version is **not** a negotiate field. Every frame carries `v`, and the
transport refuses an unsupported value before the service sees the request.

### Response fields

| Field                 | Meaning                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `wire_version`        | The accepted wire version (`1`). An echo for the client's records, not a second negotiation.                                 |
| `service_api_version` | `{major, minor, min_client_minor}` of the service and the accepted client range.                                             |
| `daemon_instance_id`  | The fresh 128-bit random instance id, 32 lowercase hex.                                                                      |
| `daemon_pid`          | Observational only; never a signal target, handle, or authority input.                                                       |
| `server_identity`     | OS uid or SID, endpoint kind, endpoint owner, and endpoint mode facts. Observational, not proof of server authenticity.      |
| `peer_identity`       | The authenticated uid or SID, peer pid, and peer process start time captured before parsing.                                 |
| `client_id`           | The server-assigned 128-bit random connection identity. Never client-supplied and never durable.                             |
| `scopes`              | The effective scope set for this connection; `session.host` appears only after a consumed host grant.                        |
| `capabilities`        | The six capability booleans, fixed for the connection.                                                                       |
| `limits`              | Every bound as `{effective, default, system_max}`, including inherited transport bounds. Keys are the accepted `D-14` names. |
| `server_monotonic_ms` | The server monotonic clock at handshake, so clients compute lease and last-seen age without trusting their own clock.        |
| `daemon_state`        | `running` or `stopping`. A stopping daemon refuses new sessions.                                                             |

The response is sent once and is immutable for the connection. It carries no
session data, no terminal content, and no secret other than the effect of an
already-consumed grant (the widened `scopes` set).

### Accept and refuse order

The order is fixed. A later step never runs after an earlier refusal, and a
refusal is a static typed result, never a partially applied negotiation.

1. Transport accept, single-instance lock, and peer-credential capture, before
   any frame is parsed.
2. Wire-version validation on each frame; an unsupported `v` is `VersionMismatch`
   and the connection closes.
3. Exactly one `daemon.negotiate`, within the pre-authentication budget.
4. Service-version range check.
5. Operator-capability verification, only when `daemon.*` scopes are requested.
6. Capability and limit advertisement, fixed for the connection.
7. Method dispatch, server-side scope evaluation, then the visibility, control
   relation, generation, and idempotency checks in the order fixed by
   [Authorization order](#authorization-order).

A version mismatch, an untrusted endpoint, a failed peer check, or a missing or
invalid operator capability when `daemon.*` scopes are requested is a typed
refusal and the connection closes. A `host_grant` that cannot be consumed does
not close the connection: it simply adds no `session.host` scope, and a later
`session.create` fails with `Denied/ConsentRequired`. No session operation is
possible before a successful negotiate.

### Pre-authentication state machine and limits

- One request to one response. No pipelining, no request before the negotiate
  response, and no second negotiate. A frame that arrives before the response,
  or a second `daemon.negotiate`, is `Denied/AlreadyNegotiated` and the
  connection closes; frames are never buffered and replayed after the handshake.
- The handshake completes within `negotiate_timeout_ms` and may send at most
  `pre_auth_max_bytes` before the response. Exceeding either closes the
  connection with a typed timeout or limit refusal and one aggregated audit
  record.
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
`daemon.*`, and `lease.*` names. A method in those families outside this table
is `InvalidMethod`; it is not a silent no-op and never falls through to a
default grant. The v1 families keep their own registry and method map, which
this freeze does not change.

| Method                     | Scope grant                                                         | Authority beyond scope                                                                                                       | Idempotency               | Notes                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daemon.negotiate`         | none (pre-authentication)                                           | Endpoint, peer, and wire checks precede it; exactly one per connection                                                       | keyless                   | Consumes `host_grant`; verifies `operator_capability` only for `daemon.*` requests.                                                                                                       |
| `daemon.status`            | `daemon.inspect`                                                    | Operator capability obtained at negotiate                                                                                    | keyless                   | Daemon state, counts, orphan classes, `audit_degraded`, limits, drain deadline.                                                                                                           |
| `daemon.stop`              | `daemon.control`                                                    | Peer re-check; operator capability                                                                                           | keyless                   | `mode` is `refuse`, `drain`, or `force`; a repeated stop returns the current state or the same typed result.                                                                              |
| `daemon.host_grant`        | `daemon.control`                                                    | Peer re-check; operator capability                                                                                           | keyless                   | `action` is `mint` or `revoke`; mint returns the bearer once plus the non-secret `grant_id`.                                                                                              |
| `daemon.orphans.verify`    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                           | keyless                   | `action` is `verify` or `retire`; never signals an unverified record.                                                                                                                     |
| `session.create`           | `session.host` **and** `process.spawn`                              | Consumed host consent; peer re-check                                                                                         | keyed (pre-session store) | The create-key lookup runs before the `terminal_id` uniqueness check; `kind: worker` is `Denied/UnsupportedCapability`; the response is the only place the initial control token appears. |
| `session.status`           | `session.inspect`                                                   | Visibility: live lease, current control token, or valid observer grant                                                       | keyless                   | Never refuses on a stale generation; the authoritative reconciliation read.                                                                                                               |
| `session.list`             | `session.inspect`                                                   | Live lease on this connection; `daemon.inspect` for the operator view                                                        | keyless                   | Never enumerates another client's sessions.                                                                                                                                               |
| `session.attach`           | observer: `session.attach`; controller: `session.control`           | Observer: valid single-use grant. Controller: current control token and matching `expected_generation`                       | keyed                     | A claim creates a controller lease; it never promotes an observer lease in place.                                                                                                         |
| `session.grant`            | `session.control` or `daemon.control`                               | Control relation (current controller lease, or vacant control with the current token)                                        | keyed                     | Mints one single-use observer grant; the bearer appears only in the mint response.                                                                                                        |
| `session.grant.revoke`     | `session.control` or `daemon.control`                               | Same control relation as mint                                                                                                | keyless (`grant_id`)      | Revokes an unconsumed grant; a second revoke is `not_active`.                                                                                                                             |
| `session.detach`           | own lease: none; other lease: `session.control` or `daemon.control` | Own detach is always allowed; detaching another lease is a revocation and requires the control relation or the operator path | keyless (`attach_id`)     | Never aborts, never changes the generation, and never produces a terminal reason.                                                                                                         |
| `session.control.transfer` | `session.control`                                                   | Control relation; the target is a live observer lease with `session.control`, plus content scopes for content authority      | keyed                     | Rotates the token onto the target exactly once; a transfer is never replayed to a different lease.                                                                                        |
| `session.resize`           | `terminal.manage`                                                   | Controller lease; the baseline `session.control` scope is necessary and never sufficient                                     | keyless                   | Controller-only; increments `state_revision`; an observer attempt is `Denied/ControllerRequired`.                                                                                         |
| `session.abort`            | `session.control`; operator reason: `daemon.control`                | Control relation for `cancel` and `timeout`; the `operator` reason uses the operator path and accepts no control token       | keyless                   | `reason_class` is `cancel`, `timeout`, or `operator`; a duplicate after terminal returns the terminal snapshot.                                                                           |
| `session.kill`             | `daemon.control`                                                    | Peer re-check; operator capability                                                                                           | keyless                   | Immediate whole-identity termination; never available to a consumer adapter.                                                                                                              |
| `lease.heartbeat`          | none beyond lease ownership                                         | The named `attach_id` values must belong to this connection                                                                  | keyless                   | Refreshes `lease_expires_at`; a foreign lease is `NotFound` and is not refreshed.                                                                                                         |

Events are pushed on the connection for each live lease; there is no subscribe
method. The event kinds are `session_state`, `session_terminal`,
`control_transfer`, `lease_revoked`, and `daemon_stopping`. Event envelope,
routing, ordering, backlog, and the terminal-event guarantee stay owned by the
accepted contract (`D-10`) and bitty#2602.

### Capabilities and methods

| Capability             | Advertised in `1.0` | Gates                                                                                             |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| `terminal_sessions`    | true                | `session.create` with `kind: terminal`                                                            |
| `worker_sessions`      | false               | `session.create` with `kind: worker`; false means `Denied/UnsupportedCapability` before any spawn |
| `events`               | true                | Events on live leases, including the control-frame reservation rule                               |
| `observer_grants`      | true                | `session.grant`, `session.grant.revoke`, and observer `session.attach`                            |
| `control_transfer`     | true                | `session.control.transfer`                                                                        |
| `idempotent_mutations` | true                | `session.create`, `session.attach`, `session.grant` mint, and `session.control.transfer`          |

Rules:

1. The v0.2.0 profile advertises `terminal_sessions=true`,
   `worker_sessions=false`, and `events`, `observer_grants`,
   `control_transfer`, and `idempotent_mutations` true. The accepted contract
   has no reduced variant of this surface; a build that cannot provide one of
   the four is a different capability profile and needs its own review before a
   release describes it as the v0.2.0 surface. `worker_sessions` is the only
   capability the contract deliberately advertises false, with the typed
   refusal in `D-01`.
2. A client must refuse to use a method whose capability is absent. It returns
   its own typed unavailable result to its caller; it must not probe, retry with
   a different method, or fall back to an in-process substitute.
3. A capability never changes semantics inside a major. Its name and meaning are
   fixed; additions are minor-versioned and additive.
4. An unknown capability name is ignored by a forward-compatible client. An
   unknown method is `InvalidMethod`, never a silent no-op.

### Keyed and keyless methods

- **Keyed**: `session.create`, `session.attach`, `session.grant` mint, and
  `session.control.transfer`. Each carries a client-generated 128-bit key,
  encoded in at most 128 bytes. Session-scoped keys share the bounded
  per-session descriptor store; `session.create` uses the separate pre-session
  store indexed by `(uid or SID, key)`.
- **Keyless**: `session.abort`, `session.kill`, `daemon.stop`,
  `session.detach` of another lease, `session.grant.revoke`, `session.resize`,
  `lease.heartbeat`, and `daemon.host_grant`. They are naturally idempotent by
  `(session_id, generation)`, by the daemon instance and mode, or by the target
  `attach_id`/`grant_id`, and they never consult either store.
- A full idempotency store can refuse only a keyed method, and only with
  `Denied/IdempotencyCapacity`; it can never block termination or revocation.
- A duplicate with the same fingerprint returns the stored descriptor; a
  snapshot is recomputed, never stored. A different fingerprint is
  `Denied/IdempotencyConflict` and applies nothing. A lease-bound result replays
  only on the connection that created it; `session.create` stays replayable
  across connections so a lost response can be recovered.

## Authorization order

### Stage order

Every request walks the same stages in the same order. A request that fails a
stage stops there; a later stage never observes it.

| Stage | Check                                                                                                                 | Refusal                                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Transport: accepted connection, single-instance lock, captured peer, supported per-frame `v`                          | `VersionMismatch`, `Unauthenticated`, or transport failure; connection closes where the class says so                                     |
| 2     | Pre-authentication: negotiate completed, one negotiate only, timeout and byte budget respected                        | `Denied/AlreadyNegotiated`, `Timeout`, `LimitExceeded`; connection closes                                                                 |
| 3     | Service version and capability: supported major and minor range, required capability present                          | `VersionMismatch` (closes); `Denied/UnsupportedCapability`                                                                                |
| 4     | Method known and grammatically valid                                                                                  | `InvalidMethod`                                                                                                                           |
| 5     | Authentication: captured peer still the same live process; per-message credentials match where the cell provides them | `Unauthenticated`; connection closes and nothing applies                                                                                  |
| 6     | Scope: the method's required scope is in the connection's effective set                                               | `Denied/ScopeViolation`, decided before any target lookup                                                                                 |
| 7     | Derived authority: consumed host consent, valid observer grant, control relation, or operator path                    | `Denied/ConsentRequired`, `Denied/ObserverGrantRequired`, `Denied/ControllerRequired`, `Denied/InvalidControlToken`, `Denied/ControlHeld` |
| 8     | Target resolution: instance binding, visibility, and existence                                                        | `Denied/StaleInstance` before lookup; uniform `NotFound` for unknown, collected, or invisible                                             |
| 9     | Generation: the request's generation matches the session's current generation on effectful methods                    | `Denied/StaleGeneration` with the current generation and revision, applying nothing                                                       |
| 10    | Idempotency: keyed methods consult their store; duplicates replay, fingerprints conflict                              | `Denied/IdempotencyConflict`, `Denied/IdempotencyCapacity` (keyed only)                                                                   |
| 11    | Effect, revision increment, attribution, and typed result                                                             | `Denied/Internal`, `Internal`, or the method result                                                                                       |

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
   `Denied/ObserverGrantRequired` rather than a duplicate descriptor. The
   ambiguity this creates with the keyed-method rule is recorded in
   [Open points](#open-points); the corpus must not encode both behaviors.
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
2. scope present but no visibility → `NotFound`;
3. visible observer or any lease that is not the current controller →
   `Denied/ControllerRequired`;
4. control vacant and the token is missing, stale, or rotated →
   `Denied/InvalidControlToken`;
5. the caller holds no lease on the session and a live controller holds
   control → `Denied/ControlHeld`;
6. a generation mismatch → `Denied/StaleGeneration`.

None of these results carries target details, terminal content, another
session's fields, or caller bytes, and none changes state.

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
  code: `Denied/InvalidControlToken`.
- A missing, expired, revoked, or wrong-peer host grant adds no `session.host`
  scope and produces the same `Denied/ConsentRequired` at create.
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
A new code needs a service minor bump and a registry revision; an existing code
never changes meaning.

| Code                    | Condition                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `ScopeViolation`        | The connection lacks the method's required scope, or `process.spawn` is missing at create               |
| `ConsentRequired`       | Host consent is missing, expired, revoked, consumed, or bound to a different peer                       |
| `ControllerRequired`    | The caller is not the current controller on a control method, or an observer attempts resize            |
| `InvalidControlToken`   | Control is vacant and the token is missing, stale, or rotated                                           |
| `ControlHeld`           | A different controller lease holds control                                                              |
| `ObserverGrantRequired` | An observer attach lacks a valid single-use grant                                                       |
| `AlreadyNegotiated`     | A second negotiate, or a request before the negotiate response; the connection closes                   |
| `UnsupportedCapability` | The requested session kind is disabled; `worker_sessions=false` refuses `kind: worker` before any spawn |
| `UnsupportedPlatform`   | The cell is not advertised; returned at handshake or as a typed service refusal                         |
| `StaleInstance`         | The request names a different daemon instance than the connection is bound to                           |
| `StaleGeneration`       | The request's generation does not match the current generation                                          |
| `SessionStopping`       | A mutation is refused while the session drains                                                          |
| `NotRunning`            | A mutation, claim, or transfer targets a terminal session that will never run again                     |
| `TerminalAlreadyHosted` | A different create key names a `terminal_id` that a live session already holds                          |
| `ActiveSessions`        | A default `daemon.stop` while sessions are active                                                       |
| `DaemonStopping`        | A drain is already in progress                                                                          |
| `IdempotencyConflict`   | A duplicate key carries a different fingerprint or arrives on the wrong connection                      |
| `IdempotencyCapacity`   | A keyed method is refused because its store is full; termination is never refused this way              |
| `TerminalEventLost`     | A lease is closed because a control frame could not be queued                                           |
| `RateLimited`           | The request exceeds the advertised rate                                                                 |
| `Internal`              | The audit sink is unavailable; no state change, and `audit_degraded` is reported                        |

A code in this table is returned as `Denied/<code>`. `NotFound`, `Timeout`, and
bare `Internal` are result classes outside the `Denied` set: `NotFound` is the
uniform target result, `Timeout` carries the request id and bound, and `Internal`
is the fail-closed invariant result with no partial mutation. A `Denied` code
not in the table is not a `1.0` code.

### Transport and validation classes

| Condition                                        | Result                                                 |
| ------------------------------------------------ | ------------------------------------------------------ |
| Unsupported wire or service version              | `VersionMismatch`; connection closes                   |
| Peer credential or endpoint tamper failure       | `Unauthenticated`; connection closes                   |
| Frame or payload over bound                      | `FrameTooLarge`, `PayloadTooLarge`, or `LimitExceeded` |
| Pending request or channel over bound            | `PendingLimitExceeded` or `ChannelFull`                |
| Unknown or malformed method                      | `InvalidMethod`                                        |
| Request deadline                                 | `Timeout` with the request id and bound                |
| Unknown, collected, or invisible session         | `NotFound`                                             |
| Invariant failure without a typed service result | `Internal`; fail closed                                |

A refusal carries static codes, counts, and the limit that was hit. It never
echoes caller bytes, a path, terminal text, a token, a bearer value, or another
session's details.

### Conditions never distinguishable to a client

| Condition pair                                                                               | Single result                                                                             |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Unknown session, collected session, foreign session, or an invisible session                 | `NotFound`                                                                                |
| Missing host consent vs. a host grant that is expired, revoked, consumed, or peer-mismatched | `Denied/ConsentRequired` at create                                                        |
| Observer grant missing, expired, consumed, wrong-session, or wrong-peer                      | `Denied/ObserverGrantRequired`                                                            |
| Control token missing, stale, or rotated at a vacant control relation                        | `Denied/InvalidControlToken`                                                              |
| A caller that lacks `process.spawn` and also lacks host consent                              | `Denied/ScopeViolation`, never `ConsentRequired`                                          |
| A missing operator capability vs. a failed peer check at negotiate                           | One static refusal and close; the code must not reveal whether the capability file exists |
| Unknown `Denied` code from a peer                                                            | Static `Internal`, never parsed as text                                                   |

## Compatibility rule

### Additive within 1.x

A `1.x` revision is additive. It may:

- add a method that uses only existing scopes, gated by an existing or new
  capability;
- add a scope name, without changing an existing name, meaning, or default grant;
- add a capability name, with its meaning fixed for the major;
- add an optional response field, or an optional request field whose absence
  preserves the `1.0` behavior;
- raise a `system_max` upward through an attributable contract revision plus
  security review;
- add a refusal code with a new, distinct meaning.

A `1.x` revision must not:

- remove, rename, or re-mean a method, scope, capability, field, event, or
  refusal code;
- add a required request field, or make an optional field required;
- start refusing a request that `1.0` accepts, except through the recorded
  security exception in the revision rule;
- lower a compiled `system_max` below a value a `1.0` client may have observed,
  or change the `{effective, default, system_max}` schema;
- change the meaning of an existing field, a lifecycle state, a terminal reason,
  or the control relation;
- serve two majors at once, translate between majors, or half-honor a minor.

Every additive change bumps the server minor and is published as one revision of
this document, the `bitty-ipc` registry, the conformance corpus, and the consumer
requirements.

### Breaking changes require 2.0

A breaking change requires all of the following:

1. service major `2.0`, negotiated as a different major and refused by a `1.x`
   server rather than translated;
2. a new accepted contract that supersedes this freeze for major `2`;
3. independent security review of the changed trust surface;
4. one major served at a time, with `1.x` clients receiving `VersionMismatch`
   against a `2.x` server and the reverse;
5. a migration note that names what a consumer must change and what evidence
   closes the old major.

A wire version change is separate: it is a `bitty-ipc` contract revision and may
land independently, but it never makes a service major compatible or
incompatible by itself.

### Consumer obligations

- Serialize the frozen spelling; do not alias a method, scope, or capability.
- Parameterize tests and adaptive behavior on the advertised `effective` limit,
  never on a hardcoded default.
- Ignore unknown response fields and unknown capability names; treat an unknown
  method as `InvalidMethod` and an unknown refusal code as `Internal`.
- Refuse to use a method whose capability is absent, and never substitute an
  in-process fallback.
- Reconcile with `session.status` after a timeout or an unknown outcome; retry a
  mutation only with the same key and the current generation.
- Treat a missing endpoint as a supported state, not as a reason to pick another
  transport.

## Deferred items

The following items are deliberately not frozen here. Each names its owner and
what this freeze does require of it.

| Item                                                                                    | Owner                                                      | Constraint this freeze keeps                                                                                                      |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Frame layout, JSON serialization, chunking, streaming, and key spelling on the wire     | bitty#2607 with `bitty-ipc` v1                             | The logical field names and method grammar in this document are the contract; the corpus pins the fixtures, not a second spelling |
| Endpoint discovery, socket and pipe naming, mode checks, and per-cell transport details | bitty#2604 and bitty#2607                                  | Owner-private endpoint, peer credentials before parsing, no TCP, no fallback transport, typed "no endpoint"                       |
| Numeric limit values and the `{effective, default, system_max}` schema                  | Accepted contract `D-14`, bitty#2603                       | Keys are the `D-14` names; a client reads `effective`; a `system_max` only moves upward through contract revision and review      |
| Physical home of the service scope registry                                             | bitty#2607                                                 | One registry, one spelling, additive revision, no v1 re-meaning                                                                   |
| Failure code for a missing or invalid operator capability at negotiate                  | Operator-capability mechanism decision and security review | One static refusal, connection closes, no file-existence oracle, no `daemon.*` scope granted                                      |
| The `session.resize` method spelling                                                    | Core architecture review                                   | Controller lease plus `terminal.manage`; controller-only; revision increment; `Denied/ControllerRequired` otherwise               |
| Observer attach replay versus the keyed-method rule                                     | Security review with the consumer review                   | One behavior only; the corpus must not encode both; no second attach from a consumed grant                                        |
| Conformance vector ids and fixtures                                                     | bitty#2665                                                 | A fixture that disagrees with a frozen name in this document is a contract defect, not a corpus choice                            |
| Platform advertisement order beyond Linux x86_64                                        | Accepted contract `D-15`, bitty#2604                       | Native-runner evidence before advertisement; `Denied/UnsupportedPlatform` or no endpoint elsewhere                                |
| Worker hosting, remote transport, and restart persistence                               | ADR 0019, ADR 0008, accepted contract                      | `worker_sessions=false`; no remote listener; no persistence; no in-process fallback                                               |

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

The review must also challenge the two deferred mechanism choices (registry home
and operator-capability failure code) and the observer-attach replay rule, since
each can silently change an authority boundary without changing the method list.

## Verification plan

At this freeze:

1. Every frozen name traces to the accepted contract, `bitty-ipc` v1, or the
   IPC and Agent RFC; no name is invented except `session.resize`, which is
   recorded as a defect for the Core architecture review.
2. The method table covers the accepted service surface, and every method has
   one scope rule and one idempotency class.
3. The refusal table contains every `Denied.code` in the accepted error taxonomy
   and no new code.
4. `terminal.*` is unchanged, and no `session.*` scope grants terminal content.
5. `just check` and `git diff --check` are green; the document is English-only
   and self-contained.

Before this freeze is accepted:

1. Wheel and `bitty-ai` consumer review record that the adapter and fake server
   can target the frozen names with no local alias.
2. Independent security review records that the refusal set, the no-oracle
   rules, the control relation, and the deferred items weaken no P0 control.
3. Core architecture review confirms the registry revision rule and resolves the
   `session.resize` spelling.
4. bitty#2665 encodes the frozen names in the conformance corpus and fails on a
   divergent fixture.

Before the first implementation merge:

1. The `bitty-ipc` registry revision lands additively and its tests prove no v1
   scope changed.
2. The handshake, method table, and refusal set are exercised by the fake server
   and the real service with the same expected results.
3. Every privileged-action peer re-check and every no-oracle pair has a test.

Definition of done for this freeze: the document is merged with an honest
status, the index row matches the status, the sign-off ledger records which
reviews exist and which do not, and `just check` is green. Implementation stays
with bitty#2606, #2607, and #2609.

## Alternatives considered

| Alternative                                         | Trade-off                                                                                                           | Disposition                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Let each consumer define its own scope spelling     | No cross-repository negotiation; the corpus cannot be shared and the fake server forks expectations.                | Rejected; one registry and one spelling were the point of bitty#2664.    |
| Freeze the frame layout here too                    | One document for everything; duplicates `bitty-ipc` v1 and pre-empts the transport slice before its review.         | Rejected; encoding is deferred to bitty#2607, the names are frozen here. |
| Put `session.*` in the existing `terminal.*` family | No new vocabulary; silently grants terminal authority to an Agent client and collapses consent domains.             | Rejected by the accepted contract; a separate family is frozen.          |
| Make `session.host` baseline                        | Simpler create path; drops per-client spawn consent and `P0-AC-024`.                                                | Rejected; consent is an explicit grant consumed at negotiate.            |
| One version number for wire and service             | Fewer fields; cannot refuse version change and encoding change independently.                                       | Rejected; two axes with separate owners.                                 |
| Best-effort negotiation with capability probing     | Older clients keep working; makes an incompatible change indistinguishable from an additive one and hides refusals. | Rejected; strict range check and explicit capabilities.                  |
| Expose a discovery or enumerate method              | Easier client bootstrap; becomes an existence and enumeration oracle.                                               | Rejected; live-lease visibility and `session.list` only.                 |
| Keep refusals as free-text messages                 | Easier debugging; untestable, leaks caller bytes, and lets a client parse meaning into a code.                      | Rejected; static codes, counts, and limits only.                         |

## Affected contracts

| Contract                                                                                                                  | Effect                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted)                                                | Authoritative. This document restates its `D-07`, `D-08`, `D-11`, `D-14`, `D-16`, and `D-18` surfaces and adds no rule.                                         |
| [Promotion record](bittyd-session-host-promotion-record.md) (accepted)                                                    | Unchanged. The sign-off state stays as recorded; this freeze claims no approval it does not list.                                                               |
| [bittyd Scope Charter](bittyd-scope-charter.md) (draft)                                                                   | Unchanged. The freeze adds no mechanism and no policy to the charter's floor.                                                                                   |
| `bitty-ipc` v1 (accepted)                                                                                                 | One additive registry revision, owned by bitty#2607: new `session.*`/`daemon.*` names, no change to the 15 v1 scopes, their defaults, or their method mappings. |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted) | Unchanged; this freeze uses its transport, method grammar, error classes, and local-only posture.                                                               |
| [Wheel consumer requirements](bittyd-session-host-requirements-candidate.md) (draft)                                      | Consumed as input only. The frozen names replace any consumer-side spelling, and the consumer review is still required.                                         |
| Security corpus (normative)                                                                                               | `P0-AC-021` through `P0-AC-026` are unchanged; the freeze must be reviewed against them before acceptance.                                                      |
| `bitty` GUI, `bitty ctl`, and `bitty-ai` adapters                                                                         | No new authority. Each consumes the frozen names and the advertised capabilities; none gets a local alias or a second registry.                                 |
| [bittyd Current-Release Eligibility Gate](bittyd-release-eligibility.md) (candidate)                                      | Consumes this freeze as one eligibility row; the release gate never treats a merged freeze as implementation evidence.                                          |
| [Specifications register](README.md)                                                                                      | Adds one candidate row until the sign-offs are recorded; a status change is a separate reviewed edit.                                                           |

## Open points

These stay open until the named review or task closes them. None is a reason to
serve a different spelling in the meantime.

- **Observer attach replay.** The accepted attach surface says a replayed
  observer attach is `Denied/ObserverGrantRequired` because the grant is
  consumed, while `D-18` makes attach a keyed method whose duplicate returns a
  stored descriptor. This freeze follows the explicit attach text and records
  the tension; the security and consumer reviews must pick one behavior before
  the corpus encodes it.
- **`session.resize` spelling.** The accepted contract fixes the authority,
  revision effect, and refusal but not the method name. This freeze proposes
  `session.resize`; the Core architecture review confirms or renames it once.
- **Registry home.** The accepted contract leaves open whether the service family
  is registered in `bitty-ipc` or in a `bittyd`-owned table. This freeze fixes
  the ownership and revision constraints and defers the mechanism to
  bitty#2607.
- **Operator-capability failure code.** The accepted handshake requires a typed
  refusal and close, but names no code. The mechanism decision and security
  review must fix one static result that does not reveal whether the capability
  file exists.
- **Operator capability as a wire field.** `D-07` says the capability is never
  accepted as a wire field from a consumer adapter, while the handshake carries
  `operator_capability`. This freeze keeps the handshake field as the only
  channel and treats the adapter prohibition as grant policy, which cannot be
  enforced against the same-uid owner; the consumer review must confirm that
  wording.
- **Absent vs. null.** Whether an absent optional field is omitted or sent as
  `null` is an encoding question for bitty#2607 and the corpus; it must not
  create two client behaviors.

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
   v0.2.0 capability profile is stated, and a missing capability produces a
   typed client refusal or the typed worker refusal, never a partial surface.
5. The authorization order is fixed, and every condition that must not be
   distinguishable to a client is listed with its single result.
6. The refusal set is closed, and no code is invented outside the accepted
   taxonomy.
7. The `1.x` additive rule and the `2.0` breaking rule are explicit, and every
   deferred item names its owner.
8. `terminal.*` is unchanged and never stretched; `session.*` never grants
   terminal content.
9. The document is English-only, self-contained, and free of research
   references; `just check` and `git diff --check` are green.
10. The sign-off table records the consumer, architecture, security, and docs
    reviews that exist, and marks the rest as pending rather than implied.

## P0 Review Sign-off

This freeze claims no approval that is not listed. It is a candidate until the
rows marked pending are recorded.

| Reviewer                        | Required for                                                                                      | Status                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Core terminal platform (author) | The freeze text, the method catalog, and the refusal set                                          | Submitted 2026-10-27                           |
| Wheel consumer reviewer         | Adapter and fake-server target names; no local alias; `worker_sessions=false` behavior            | Pending; required before acceptance            |
| bitty-ai consumer reviewer      | Hosted-worker boundary and the typed unsupported path                                             | Pending; required before acceptance            |
| Core architecture reviewer      | Registry revision rule, control relation, `session.resize` spelling, and no v1 re-meaning         | Pending; required before acceptance            |
| Independent security reviewer   | The scope family, consent, control relation, refusal set, no-oracle rules, and the deferred items | Pending; required before acceptance            |
| Docs curator                    | Spine, metadata, index row, language, self-containment, and cross-document synchronization        | Pending; this delivery is submitted for review |

A missing signature is an acceptance blocker, not a comment. The freeze must not
be marked `accepted` while any row above is pending, and no implementation slice
may cite this document as an approval.

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
- [bitty#2665](https://github.com/bitty-terminal/bitty/issues/2665) — freeze the
  shared conformance corpus that pins these names.
- [bitty#2666](https://github.com/bitty-terminal/bitty/issues/2666) — the
  conditional release eligibility gate that consumes this freeze.
