---
title: bittyd IPC Contract (Candidate)
description: Candidate-for-sign-off freeze of the served bittyd IPC surface - one logical scope registry and revision rule, handshake fields, per-method request and result schema, method and scope table, authorization order, closed refusal set, and the 1.x compatibility rule
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
> and their registry, the handshake fields, the per-method request and result
> JSON schema, the method and scope table, the authorization order, the closed
> refusal set, and the compatibility rule. It restates decisions already
> accepted in the [bittyd Session-Host Contract](bittyd-session-host-contract.md)
> on 2026-10-27 and adds no new authority.
>
> It is not `accepted`. The Owner, Security, Architecture, and Consumer reviews
> that bitty#2664 lists as acceptance criteria are **not all recorded**: the
> Security sign-off is recorded on 2026-10-29, and the Owner, Architecture, and
> Consumer boxes under [Sign-off](#sign-off) remain unchecked. No control in
> this document is verified, and a merged implementation or a green corpus is
> not a sign-off.
>
> The per-method [Wire schema](#wire-schema) and the served-versus-accepted
> table were added on 2026-10-29 after the Architecture and Consumer reviews
> returned NEEDS-FIX because a consumer had to read `dispatch.rs` to learn a
> field name. The addition freezes only the shapes the merged code serves; it
> changes no scope, no decision, and no control, and the Security sign-off still
> covers the same trust boundary.
>
> The accepted session-host contract owns every decision; this document owns
> only the spelling, field shape, and ordering of the service-interface surface.
> A spelling or wire-shape choice here does not reopen a decision. Where the two
> disagree, the accepted contract's decision stands and the wire difference is
> recorded as a **dated narrowing** in
> [Dated narrowings](#dated-narrowings), not as a blanket rule that the accepted
> text silently overrides the served schema.
>
> The service surface is served by `crates/bitty-daemon` on `main` (PR #2761,
> `d360b442f`), with the P1 corrections in PRs #2770 and #2776, the grant-expiry
> revision in PR #2786, and the conformance harness in PRs #2769 and #2771. The
> daemon binds a per-user Unix socket, serves `daemon.negotiate` and the method
> catalog below, and runs the conformance corpus through both the reference fake
> and the real binary on Linux x86_64. The security-sign-off corrections this
> revision records are merged in PR #2794 (`ea0de791`), which also pins the
> pre-write refusal boundary; the merged corpus carries 41 vectors, the parity
> gate compares 29 shared vectors, the fake driver executes 33 and records 8
> typed skips, and the real service executes 37 and records 4. Two catalog
> methods are not served:
> `daemon.orphans.verify` refuses `UnsupportedCapability` and `session.resize`
> refuses `ScopeViolation` because the daemon grants no `terminal.*` scope. No
> event frame is pushed on a connection, so `events` is frozen `false` for
> service `1.0`; the merged build advertises `true`, which is a recorded
> served-versus-frozen deviation (bitty#2792), not a promise. `session.create`
> is served as a **registry-only** method: it registers a `created` session at
> `generation: 0` and starts no process or PTY and opens no content plane.
> Worker spawn, containment, terminal content, and event delivery are deferred,
> not promised. Grant expiry now bumps `state_revision`; an expiry event is
> still deferred.

| Control          | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status           | Candidate for sign-off; Security sign-off recorded 2026-10-29; Owner, Architecture, and Consumer reviews unchecked; no control verified                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Issue            | [bitty#2664](https://github.com/bitty-terminal/bitty/issues/2664) — freeze bittyd IPC scopes, handshake, and version contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Parent           | [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) — define the bittyd session-host contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Upstream records | Accepted [bittyd Session-Host Contract](bittyd-session-host-contract.md), [promotion record](bittyd-session-host-promotion-record.md), ADR 0008, ADR 0019, `bitty-ipc` v1, security corpus                                                                                                                                                                                                                                                                                                                                                                                                          |
| Consumers        | Wheel CTX-0036 adapter and fake server; `bitty` GUI, `bitty ctl`, and other local clients                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Implementation   | `crates/bitty-daemon` on `main`: `bittyd start` binds a per-user Unix socket and serves the `bitty-ipc` v1 envelope. The scope registry, handshake, grants, dispatch, audit sink, and peer re-check are merged in PR #2761 (`d360b442f`); the session registry in PR #2751 (`c593afd7`); the P1 corrections in PR #2770 (`57d459f7`); the repeat-detach and grant-revision fixes in PR #2776 (`a1c5639a`); the grant-expiry revision in PR #2786; the conformance harness in PR #2769 (`87463f34`) and PR #2771 (`0b9483f2`); the security-sign-off corrections are merged in PR #2794 (`ea0de791`) |
| Served methods   | 15 of the 17 catalog methods, each with a request and result schema in [Wire schema](#wire-schema). `daemon.orphans.verify` is `Denied/UnsupportedCapability`; `session.resize` is `Denied/ScopeViolation`. `session.create` is registry-only (`generation: 0`, no process, PTY, or content plane). `events` is frozen `false`; no event frame is pushed. Worker spawn, containment, terminal content, and event delivery are deferred                                                                                                                                                              |
| Wire schema      | One table per catalog method in [Wire schema](#wire-schema), read from `crates/bitty-daemon/src/service/dispatch.rs` and `src/service/wire.rs` at `ea0de791`; 15 served methods carry a success result, 2 unserved methods carry only their typed refusal. Shared shapes are frozen once and referenced by key                                                                                                                                                                                                                                                                                      |
| Evidence         | 41 corpus vectors on `main`: 29 shared by the fake and real drivers, 8 real-only, 4 fake-only; the parity gate compares the 29 shared vectors. The fake driver executes 33 and records 8 typed skips; the real driver executes 37 and records 4. The corpus parses through one strict model and runs in `bitty` CI on Linux x86_64. Evidence records are per-cell JSON; a fake run never closes a real row. The wire schema has no separate vector; it is read from the merged handlers and pinned by the corpus only where a vector names the key                                                  |
| Evidence gaps    | No event-wire vector, no `session.create` process or PTY, no `session.resize` success path, no containment/orphan-adoption path, no request-deadline vector, no second served platform cell, and no independent security evidence set. See [Deferred items](#deferred-items)                                                                                                                                                                                                                                                                                                                        |
| Change authority | Core terminal platform owns this freeze; the security corpus co-owns the trust boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Promotion gate   | Owner, Security, Architecture, and Consumer sign-off recorded, `just check` green, and no new authority introduced                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Document status

### What this freeze does

- It fixes **names**: scope family names, method names, capability names,
  handshake field names, event kinds, refusal codes, and the identifier formats
  already fixed by the accepted contract.
- It fixes **wire shape**: for every served method, the exact request parameter
  keys, their JSON types and requiredness, the exact success-result keys, and
  the branch that produces each result. A consumer no longer reads
  `dispatch.rs` to learn a field name; the schema is normative here and the code
  is its evidence.
- It fixes **ordering**: the accept/refuse order, the per-request authorization
  order, and the conditions that must not be distinguishable to a client.
- It fixes **compatibility**: what may change inside service major `1`, and what
  requires a new accepted contract.
- It repairs nothing and weakens nothing. Where the accepted contract and this
  document disagree, the accepted contract wins and this document is defective.
- It freezes only what the merged code and corpus actually serve. A method,
  field, event, or control that the code does not serve is named under
  [Deferred items](#deferred-items), [Accepted fields not served in 1.0](#accepted-fields-not-served-in-10),
  or [Open points](#open-points); this document does not convert a plan into a
  promise.
- It records where the served wire differs from the accepted prose as a
  **dated narrowing** with a named owner. A narrowing is not a second decision
  and it does not authorize the accepted contract to be read as if it described
  the wire.
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
- the per-method request and result JSON schema, including field presence,
  shared object shapes, and the dated narrowings against the accepted prose;
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

| Term                | Meaning in this document                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wire version        | The `bitty-ipc` envelope version `v` carried on every frame, with `1` the only supported value. It describes framing, envelope, and correlation.                                                                                                 |
| Service version     | The `{major, minor}` contract version negotiated in `daemon.negotiate`. It describes the session surface, never the framing.                                                                                                                     |
| Negotiation         | The single pre-authentication `daemon.negotiate` exchange that fixes the service version, scopes, capabilities, limits, and identity for one connection.                                                                                         |
| Scope registry      | **One logical registry with two disjoint physical homes and one grammar.** The v1 families live in `bitty-ipc`; the service families live in the `bittyd` table; both use the same method grammar and naming rule, and no name has two meanings. |
| Baseline grant      | The scopes an ordinary consumer connection receives: `session.inspect`, `session.attach`, and `session.control`. `session.host` is never baseline.                                                                                               |
| Capability          | An explicit, per-connection boolean that gates a method family. It never changes meaning inside a major.                                                                                                                                         |
| Control relation    | The authorization rule that requires the current controller lease, or the current control token while control is vacant. Scope alone is never sufficient.                                                                                        |
| Frozen spelling     | The single name a scope, method, capability, field, event, or refusal code uses in the contract, the registry, the corpus, and every consumer.                                                                                                   |
| Wire schema         | The normative request and result table for a served method: exact JSON keys, JSON types, required or optional presence, result branch, and notes. Code is evidence, not the schema.                                                              |
| Dated narrowing     | A served-wire fact that is narrower than the accepted prose, recorded with the date and the owning issue. It never widens a control and is replaced only by a reviewed revision.                                                                 |
| Existence oracle    | A response that lets a client learn whether a session, grant, or endpoint it may not see exists. The service provides exactly one deliberate exception: the live-vacant-control code.                                                            |
| Live vacant control | A live session with no current controller lease. A control method that names it and presents no valid token answers `Denied/InvalidControlToken`; that is the one oracle exception.                                                              |
| Served method       | A catalog method the merged daemon can execute to a success or a typed refusal. `daemon.orphans.verify` and `session.resize` are not served.                                                                                                     |
| Keyed method        | A method that carries a client-generated opaque idempotency key of 1 to 128 bytes and consults a bounded store: create, controller attach, grant mint, and transfer. The daemon derives a 128-bit store key from it.                             |
| Keyless method      | A method that is naturally idempotent by its target and never consults an idempotency store, so capacity can never block termination or revocation.                                                                                              |
| Unkeyed method      | A method that carries no key and is not naturally idempotent: `daemon.host_grant` mint. Its duplicate rule is not frozen and stays with security review.                                                                                         |

## Implementation evidence

The following facts are read from the merged `bitty` `main` (`ea0de791`,
PR #2794) and the corpus at
`crates/bitty-daemon/tests/harness/corpus.json`. They describe the surface this
document freezes; they are not a security verification, and no row here
satisfies a P0 control.

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
- **Wire schema:** every request key and result key in
  [Wire schema](#wire-schema) is read from the handlers in
  `src/service/dispatch.rs` and the typed parameter helpers in
  `src/service/wire.rs` at `ea0de791`; `session_json` in `dispatch.rs` owns the
  shared `session` object. The schema is not a second encoder: the daemon
  renders the `bitty-ipc` v1 envelope and these handlers build its `result`.
- **Registry-only create:** `session.create` inserts a `created` record with
  `generation: 0`, `state_revision: 0`, no attach, and no worker. It reads no
  spawn specification and starts no process, PTY, or content plane; a created
  session can be inspected, attached (metadata only), aborted, or killed, but
  it never reaches `running` in this slice.
- **Advertised but unenforced:** `request_timeout_ms` is in the `limits` array
  (`src/limits.rs`, `RequestTimeoutMs`), but the only `Refusal::timeout` call
  site is the negotiate deadline in `src/service/server.rs`. No
  post-handshake request deadline is enforced; the deferred row is bitty#2805.
- **Grants:** `src/service/grants.rs` owns host and observer grants, the
  single-use bearer, the peer and correlation-digest binding, the TTLs, the cap
  refusals, and the sweep. `src/lease/host.rs` records the revision bump for
  grant mint, consume, revoke, and expiry.
- **Corpus:** `tests/harness/corpus.json` (schema
  `bittyd-conformance-corpus/1`) carries **41 vectors** on `main`: 29 shared by
  the fake and real drivers, 8 real-only, and 4 fake-only. The parity gate
  compares the 29 shared vectors; the fake driver executes 33 and records 8
  typed skips, and the real driver executes 37 and records 4. The harness runs
  in `bitty` CI on Linux x86_64 and records per-cell evidence; a fake run never
  closes a real row.
- **Not served:** `daemon.orphans.verify` is `Denied/UnsupportedCapability`
  (containment is deferred, bitty#2791); `session.resize` is
  `Denied/ScopeViolation` (no `terminal.*` scope is granted, bitty#2790); no
  event frame is pushed on a connection (bitty#2792, bitty#2605); worker spawn
  is disabled (`worker_sessions=false`, bitty#2790). Grant expiry bumps
  `state_revision` once per affected session (merged in PR #2786); it still
  emits no event.
- **Events deviation:** the merged build advertises the `events` capability
  `true` while sending no frame. This freeze sets `events` to `false` for
  service `1.0`; the advertised `true` is a served-versus-frozen deviation
  dated 2026-10-29 and owned by bitty#2792. Flipping the bit to `true` after a
  delivered event frame is an additive minor change; no `1.0` client may rely
  on event delivery because of the advertised bit.

## Version sources and ownership

Two version axes are independent, and each has exactly one owner. A supported
wire version never implies a supported service version, and a service version
never implies a wire version.

| Axis             | Owner                           | Single source of truth                                                                                                | Changes when                                                                                                                                                     | Refusal                                                 |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Wire version     | `bitty-ipc`                     | `WIRE_VERSION` and `SUPPORTED_WIRE_VERSIONS`, carried per frame as `v`                                                | The framing, envelope, or correlation contract changes; that is a `bitty-ipc` contract revision, not this one.                                                   | `VersionMismatch`, connection closes                    |
| Service version  | This contract, `1.0` today      | `{major, minor}` in `daemon.negotiate`, plus `min_client_minor` in the response                                       | Additive method, scope, capability, or field inside major `1` bumps the minor; a breaking change requires `2.0`.                                                 | `VersionMismatch`, connection closes                    |
| Scope registry   | One logical registry, two homes | `bitty-ipc` for v1 families; the `bittyd`-owned table for `session.*` and `daemon.*`; one grammar and one naming rule | A scope or method is added, removed, renamed, or re-meant, per the revision rule.                                                                                | `NotFound`, `InvalidMethod`, or `Denied/ScopeViolation` |
| Capability set   | This document                   | The six capability names in [Capabilities and methods](#capabilities-and-methods)                                     | A capability is added inside a minor; its name and meaning never change inside a major.                                                                          | `Denied/UnsupportedCapability`                          |
| Limit values     | Accepted contract `D-14`        | The `D-14` table and the Resource limits section                                                                      | A system maximum may only change upward, through an attributable contract revision plus security review.                                                         | `LimitExceeded`, `Denied/*` by method                   |
| Request deadline | Accepted `D-13`                 | `request_timeout_ms` in the advertised `limits`; enforcement is deferred to bitty#2805                                | An enforced request deadline is an additive behavior change that must name its typed result and get a corpus vector; the advertised value alone changes nothing. | `Timeout` when enforced; no wire result in `1.0`        |

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

The service has **one logical registry, two disjoint physical homes, and one
grammar**. The v1 families and the service families are stored in different
crates, but there is no second vocabulary, no per-consumer spelling, and no
adapter-local aliasing: a name has exactly one meaning across both homes.

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

| Change                                                                                                  | Required revision                                                                                                                 |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Add a scope name to `session.*` or `daemon.*`                                                           | Service minor bump; registry revision                                                                                             |
| Add a method that uses only existing scopes                                                             | Service minor bump; registry revision; method catalog row                                                                         |
| Add a capability                                                                                        | Service minor bump; name and meaning fixed for the major; clients ignore a capability they do not know                            |
| Add an optional response field or an optional request field with unchanged default                      | Service minor bump; no existing field changes meaning; absence preserves the previous behavior                                    |
| Serve `session.resize` (per-connection `terminal.manage` at negotiate, then controller-lease authority) | Service minor bump; registry revision; method-catalog row; the handshake `scopes` array carries the new grant; conformance vector |
| Change a scope meaning, method name, refusal code, or the meaning of an existing field                  | Service major bump (`2.0`); a new accepted contract; independent security review; one major served at a time                      |
| Remove a scope, method, capability, or field                                                            | Service major bump; same gate as a meaning change                                                                                 |
| Raise a compiled `system_max`                                                                           | Upward only, through an attributable contract revision plus security review; this document does not carry the numbers             |

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

| Kind               | Frozen spellings                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scopes             | `session.inspect`, `session.host`, `session.attach`, `session.control`, `daemon.inspect`, `daemon.control`                                                                                                                                                                                                                                                                                                              |
| Methods            | `daemon.negotiate`, `daemon.status`, `daemon.stop`, `daemon.host_grant`, `daemon.orphans.verify`, `session.create`, `session.status`, `session.list`, `session.attach`, `session.grant`, `session.grant.revoke`, `session.detach`, `session.control.transfer`, `session.resize`, `session.abort`, `session.kill`, `lease.heartbeat`                                                                                     |
| Capabilities       | `terminal_sessions`, `worker_sessions`, `events`, `observer_grants`, `control_transfer`, `idempotent_mutations`                                                                                                                                                                                                                                                                                                         |
| Handshake request  | `client_version`, `client_correlation`, `operator_capability`, `host_grant`                                                                                                                                                                                                                                                                                                                                             |
| Handshake response | `wire_version`, `service_api_version`, `daemon_instance_id`, `daemon_pid`, `server_identity`, `peer_identity`, `client_id`, `scopes`, `capabilities`, `limits`, `server_monotonic_ms`, `daemon_state`                                                                                                                                                                                                                   |
| Event kinds        | `session_state`, `session_terminal`, `control_transfer`, `lease_revoked`, `daemon_stopping`                                                                                                                                                                                                                                                                                                                             |
| Identifier formats | `daemon_instance_id`, `session_id`, `attach_id`, and `grant_id` are 32 lowercase hex characters. A supplied `terminal_id` is 1 to 128 bytes (the `terminal_id_bytes` system maximum) from `[A-Za-z0-9._:-]`; an absent one is assigned 32 lowercase hex characters. The control token, observer grant, and host grant are 256-bit bearers (64 lowercase hex). An idempotency key is an opaque string of 1 to 128 bytes. |

`session.resize` is the one method spelling the accepted contract does not
state: it fixes the resize authority, the revision effect, and the refusal, but
not the method name. This freeze fixes `session.resize` so the corpus has one
name, and the merged catalog and corpus `C-05`/`V-13` use it. The method is not
served in this slice: the daemon grants no `terminal.*` scope, so every
`session.resize` request is `Denied/ScopeViolation` before target lookup.

The intended success mechanism is fixed here but not served: the connection
receives a per-connection `terminal.manage` grant at `daemon.negotiate` (the
scope set is immutable for the connection, so the grant must be negotiated,
never added mid-connection), and the method then requires the current
controller lease rather than an operator path. Resize changes the PTY size,
increments `state_revision`, and is controller-only; an observer letterboxes or
scales locally. Serving it is a **method addition under an existing scope**:
service minor bump, registry revision, method-catalog row, a `terminal.manage`
row in the handshake `scopes` array, and a conformance vector. The revision
class is the `Add a method that uses only existing scopes` row in
[Revision rule](#revision-rule), with the additional handshake-scope grant
recorded as a scope-delivery change, not a scope-meaning change. The success
path is deferred to bitty#2790 and stays in [Deferred items](#deferred-items).

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

| Field                 | Presence | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client_version`      | required | `{major, minor}`, both unsigned 16-bit. Compared against the server range; a mismatch is `VersionMismatch` and the connection closes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `client_correlation`  | optional | At most 128 bytes of valid UTF-8 with no control characters. The raw value is never stored or echoed. The daemon derives `client_correlation_digest` as the first 16 bytes of `SHA-256` over `prefix` + `raw_value`, where `prefix` is the 28 ASCII bytes `bittyd:client_correlation:v1` plus one NUL byte (`0x00`), rendered as 32 lowercase hex characters. That digest is audit metadata **and** the optional grant-binding condition: `daemon.host_grant` (`client_correlation_digest`) and `session.grant` (`observer_correlation_digest`) carry the derived digest as the binding, and each grant is usable only from the connection whose derived digest matches. The mint carries the digest; the later connection presents the raw value at `daemon.negotiate` and the daemon derives it. A plain `SHA-256` of the raw value, or any other truncation, never matches. The value is not a scope and does not identify the client. A malformed value is `InvalidRequest`, never normalized. |
| `operator_capability` | optional | The per-boot 256-bit bearer, 64 lowercase hex, that adds `daemon.inspect` and `daemon.control`. A present but malformed or wrong bearer is one static `Unauthenticated` and closes. An absent field adds no `daemon.*` scope and is not a refusal; a later `daemon.*` method then fails `Denied/ScopeViolation`. It is never placed in an environment, inherited by a worker, or accepted as authority from a session lease.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `host_grant`          | optional | A single-use 256-bit bearer, 64 lowercase hex, minted by `daemon.host_grant`. Consuming it adds `session.host` to the connection. A missing, expired, wrong-peer, wrong-correlation, already-consumed, or revoked grant adds nothing and leaves later `session.create` to fail with `Denied/ConsentRequired`. A present but malformed value is `InvalidRequest`, not `Unauthenticated`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

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
  fresh request and no pipelined method is ever served after the handshake.
  The decision is taken at the last instant before the negotiate response's
  first byte is written: bytes queued at that point are refused as a whole,
  never parsed. A byte that arrives after the response write begins is a
  post-handshake frame; it is parsed only once the connection is negotiated and
  is never refused on that basis. This refusal and the over-long-`id` refusal
  are the only two no-`id` shapes; both are consequences of refusing bytes the
  server must not parse. There is still exactly one handshake per connection.
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
4. `client_correlation` is not authority. The raw value is never stored or
   echoed; the daemon derives `client_correlation_digest` as the first 16 bytes
   of `SHA-256` over `prefix` + `raw_value`, where `prefix` is the 28 ASCII
   bytes `bittyd:client_correlation:v1` plus one NUL byte (`0x00`), rendered as
   32 lowercase hex characters. That digest is audit metadata **and** the
   optional grant binding: `daemon.host_grant` (`client_correlation_digest`) and
   `session.grant` (`observer_correlation_digest`) carry the derived digest as
   the binding, and each grant is usable only from the connection whose derived
   digest matches. The mint carries the digest; the later connection presents
   the raw value at `daemon.negotiate` and the daemon derives it. A plain
   `SHA-256` of the raw value, or any other truncation, never matches. It is not
   a scope, not an identity, and not a lookup key. The wire envelope's `id` is a
   different field: at most 64 bytes, an opaque per-connection correlation
   value, server-generated for events, unique per connection, never supplied by
   the client for an event, and never a UUID or a durable identity.
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

| Method                     | Served | Scope grant                                                         | Authority beyond scope                                                                                                                                                                                                                                                | Idempotency                                                                     | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daemon.negotiate`         | yes    | none (pre-authentication)                                           | Endpoint, peer, and wire checks precede it; exactly one per connection                                                                                                                                                                                                | keyless                                                                         | Consumes `host_grant` when possible; a present `operator_capability` is verified, an absent one grants nothing.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `daemon.status`            | yes    | `daemon.inspect`                                                    | Operator capability obtained at negotiate                                                                                                                                                                                                                             | keyless                                                                         | Daemon state, lifecycle counts, `audit_degraded`, limits, drain deadline, and `tcp_listeners`. The `orphans` key is a transitional placeholder, not a frozen field; uptime, pid, and orphan counts are not served (bitty#2791, bitty#2806).                                                                                                                                                                                                                                                                            |
| `daemon.stop`              | yes    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                                                                                                                                                                    | keyless                                                                         | `mode` is `refuse`, `drain`, or `force`; a repeated stop is `Denied/DaemonStopping`; a default stop with active sessions is `Denied/ActiveSessions`.                                                                                                                                                                                                                                                                                                                                                                   |
| `daemon.host_grant`        | yes    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                                                                                                                                                                    | no key; `revoke` idempotent by `grant_id`; `mint` creates a new grant each call | `action` is `mint` or `revoke`; mint returns the bearer once plus the non-secret `grant_id`; a consumed-but-unexpired grant can still be revoked (bitty#2763). Mint accepts `ttl_ms` and `client_correlation_digest`; see [Grant request fields](#grant-request-fields).                                                                                                                                                                                                                                               |
| `daemon.orphans.verify`    | no     | `daemon.control`                                                    | None reached; the handler refuses before any orphan action                                                                                                                                                                                                            | keyless                                                                         | Always `Denied/UnsupportedCapability` after the scope check; no orphan is claimed verified. The accepted `action`/`retire` form is not served and is not in the open PR #2801 head; containment and orphan verification are bitty#2791.                                                                                                                                                                                                                                                                                |
| `session.create`           | yes    | `session.host` **and** `process.spawn`                              | Consumed host consent; peer re-check                                                                                                                                                                                                                                  | keyed (pre-session store)                                                       | **Registry-only:** registers a `created` session at `generation: 0`; starts no process or PTY and opens no content plane; a spawn specification is not read. The create-key lookup runs before the `terminal_id` uniqueness check; `kind: worker` is `Denied/UnsupportedCapability` once create authority is present, while a caller without consent gets the earlier `Denied/ConsentRequired` (or `Denied/ScopeViolation` without `process.spawn`); the response is the only place the initial control token appears. |
| `session.status`           | yes    | `session.inspect`                                                   | Visibility: operator view (`daemon.inspect`), a live lease on this connection, the current control token, or the immutable terminal snapshot for a connection that held a lease                                                                                       | keyless                                                                         | Never refuses on a stale generation; the authoritative reconciliation read. It does not map a missing token to `InvalidControlToken` (that mapping is control-method only).                                                                                                                                                                                                                                                                                                                                            |
| `session.list`             | yes    | `session.inspect`                                                   | Live lease on this connection; `daemon.inspect` for the operator view                                                                                                                                                                                                 | keyless                                                                         | A consumer connection never enumerates another client's sessions; the operator view requires `daemon.inspect` and carries metadata only.                                                                                                                                                                                                                                                                                                                                                                               |
| `session.attach`           | yes    | observer: `session.attach`; controller: `session.control`           | Observer: valid single-use grant. Controller: current control token and matching `expected_generation`                                                                                                                                                                | controller keyed; observer single-use grant, not keyed                          | The request role is `attach_role` (`controller` or `observer`); the response is `role`. A claim creates a controller lease; it never promotes an observer lease in place.                                                                                                                                                                                                                                                                                                                                              |
| `session.grant`            | yes    | `session.control` or `daemon.control`                               | Control relation (current controller lease, or vacant control with the current token), or the `daemon.control` operator path, which is ungated                                                                                                                        | keyed                                                                           | Mints one single-use **observer** grant; the bearer appears only in the mint response. `kind` is not a served request field: a present `kind` is ignored under the unknown-field rule and never selects a grant kind, so `kind: observer` is the only conforming value and clients omit it. `ttl_ms` and `observer_correlation_digest` are optional; see [Grant request fields](#grant-request-fields). A terminal session is `Denied/NotRunning`.                                                                     |
| `session.grant.revoke`     | yes    | `session.control` or `daemon.control`                               | A retained grant is checked against the caller's correlation binding first: a non-operator mismatch gets the unknown-grant `not_active` success and revokes nothing; otherwise visibility and the control relation run; the `daemon.control` operator path is ungated | keyless (`grant_id`)                                                            | Revokes an unconsumed grant; a matching revoke still requires the control relation and bumps `state_revision`; a second revoke is `not_active`, not a refusal. A retained grant on a terminal session is `Denied/NotRunning`. `ttl_ms` and the digest fields are mint-only.                                                                                                                                                                                                                                            |
| `session.detach`           | yes    | own lease: none; other lease: `session.control` or `daemon.control` | Own detach is always allowed; detaching another lease is a revocation and requires the control relation or the operator path                                                                                                                                          | keyless (`attach_id`)                                                           | A repeat detach of a handle this connection already detached or revoked is `was_attached: false`, `not_attached: true`, no revision bump. Never aborts or changes the generation.                                                                                                                                                                                                                                                                                                                                      |
| `session.control.transfer` | yes    | `session.control`                                                   | Control relation; the target is a live observer lease with `session.control`                                                                                                                                                                                          | keyed                                                                           | Rotates the token onto the target exactly once; the token is delivered to the target on its next lease response, never in the requester's response.                                                                                                                                                                                                                                                                                                                                                                    |
| `session.resize`           | no     | `terminal.manage`                                                   | Not reached; the daemon grants no `terminal.*` scope                                                                                                                                                                                                                  | no key; not deduped by generation (policy open)                                 | Always `Denied/ScopeViolation` before target lookup and before any method field is read. The intended controller-only mechanism is a per-connection `terminal.manage` grant at negotiate plus the controller-lease check; the success path is deferred to bitty#2790.                                                                                                                                                                                                                                                  |
| `session.abort`            | yes    | `session.control`; operator reason: `daemon.control`                | Control relation for `cancel` and `timeout`; the `operator` reason uses the operator path and accepts no control token                                                                                                                                                | keyless                                                                         | `reason_class` is `cancel`, `timeout`, or `operator`; a request after terminal returns `accepted: false`, `not_running: true`, not a refusal.                                                                                                                                                                                                                                                                                                                                                                          |
| `session.kill`             | yes    | `daemon.control`                                                    | Peer re-check; operator capability                                                                                                                                                                                                                                    | keyless                                                                         | Immediate whole-identity termination; a request after terminal returns `accepted: false`, `not_running: true`. Never available to a consumer adapter.                                                                                                                                                                                                                                                                                                                                                                  |
| `lease.heartbeat`          | yes    | none beyond lease ownership                                         | The singular `attach_id` must belong to this connection                                                                                                                                                                                                               | keyless                                                                         | Refreshes the named lease; a foreign lease is `NotFound` and is not refreshed; it also delivers a pending rotated control token to the target. The accepted multi-`attach_id` request form is not served; see [Dated narrowings](#dated-narrowings).                                                                                                                                                                                                                                                                   |

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

**The event model is frozen; only delivery is deferred.** `D-10` already fixes
the five event kinds (`session_state`, `session_terminal`, `control_transfer`,
`lease_revoked`, `daemon_stopping`), the `v: 1` event envelope with a
server-generated `id` of at most 64 bytes, per-lease routing, per-session
revision ordering, the bounded backlog with explicit truncation, and the
terminal-event guarantee. This freeze restates that model and adds no event
kind and no subscribe method. The only deferred part is that the merged service
pushes **no event frame on any connection**: `events` is frozen `false` for
service `1.0`, the merged build's advertised `true` is a recorded deviation,
and the wire delivery plus its vectors are deferred to bitty#2792 and
bitty#2605. The envelope `id` is an **opaque per-connection correlation value**
chosen by the server; it is not a UUID, not a durable identity, and never an
input to authorization. `session.status` and `session.list` are the only
reconciliation reads in this slice; no consumer may implement event-driven
behavior against this surface until a vector exists and the bit is `true`.

### Capabilities and methods

| Capability             | Advertised in `1.0` | Gates                                                                                                                                                                                                                                     |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terminal_sessions`    | true                | `session.create` with `kind: terminal`                                                                                                                                                                                                    |
| `worker_sessions`      | false               | `session.create` with `kind: worker`; false means `Denied/UnsupportedCapability` once create authority is present, while missing consent answers first with `Denied/ConsentRequired` (or `Denied/ScopeViolation` without `process.spawn`) |
| `events`               | false               | Events on live leases, including the control-frame reservation rule. Frozen `false` until a frame is delivered; `false` to `true` is an additive minor change (bitty#2792)                                                                |
| `observer_grants`      | true                | `session.grant`, `session.grant.revoke`, and observer `session.attach`                                                                                                                                                                    |
| `control_transfer`     | true                | `session.control.transfer`                                                                                                                                                                                                                |
| `idempotent_mutations` | true                | `session.create`, `session.attach`, `session.grant` mint, and `session.control.transfer`                                                                                                                                                  |

Rules:

1. The `1.0` profile freezes `terminal_sessions=true`,
   `worker_sessions=false`, `events=false`, and `observer_grants`,
   `control_transfer`, and `idempotent_mutations` true. The accepted contract
   has no reduced variant of this surface; a build that cannot provide
   `observer_grants`, `control_transfer`, or `idempotent_mutations` is a
   different capability profile and needs its own review before a release
   describes it as the v0.2.0 surface. `worker_sessions` and `events` are
   deliberately false in `1.0`: with create authority present, `worker_sessions`
   yields the typed `D-01` refusal, and without consent the earlier
   scope/consent answer applies; `events` becomes true only when a frame is
   delivered and a vector passes (bitty#2792), and `false` to `true` is
   additive inside major `1`.
2. A client must refuse to use a method whose capability is absent. It returns
   its own typed unavailable result to its caller; it must not probe, retry with
   a different method, or fall back to an in-process substitute.
3. A capability never changes semantics inside a major. Its name and meaning are
   fixed; additions are minor-versioned and additive.
4. An unknown capability name is ignored by a forward-compatible client. A
   well-formed unknown method is `NotFound`; a malformed method name is
   `InvalidMethod`. Neither is a silent no-op.
5. The merged build advertises `events: true` while this freeze says `false`.
   The frozen value is `false`; a consumer must follow the freeze and must not
   treat the advertised bit as evidence that events work. The deviation is
   dated 2026-10-29 and owned by bitty#2792; correcting the bit to match the
   freeze does not require a contract revision, and flipping it to `true` after
   a delivered, vector-backed event frame is the additive minor change. The
   `worker_sessions: false` bit is honest, and its typed refusal is the only
   proof in this slice.

### Keyed and keyless methods

- **Keyed**: `session.create`, controller `session.attach`, `session.grant`
  mint, and `session.control.transfer`. Each carries a client-generated
  **opaque string of 1 to 128 bytes** in `idempotency_key`; the daemon derives
  the 128-bit store key as the first 16 bytes of `SHA-256` over the 25 ASCII
  bytes `bittyd/idempotency-key/v1` plus one NUL byte plus the raw bytes. The
  wire value is not a 128-bit hex id, and the client never sees the derived
  key. Session-scoped keys share the bounded per-session descriptor store;
  `session.create` uses the separate pre-session store indexed by
  `(uid or SID, key)`. An observer `session.attach` is not keyed at the wire:
  it validates and consumes the single-use grant before any store lookup, so a
  replay is `Denied/ObserverGrantRequired` (corpus `V-22`). A key on a keyless
  method is ignored under the unknown-field rule and confers nothing.
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

| Field                         | Method                                         | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ttl_ms`                      | `session.grant` mint, `daemon.host_grant` mint | A positive integer no greater than the effective `observer_grant_ttl_ms` (60 000 in the shipped default profile) or `host_grant_ttl_ms` (300 000). `0` and an over-limit value are `InvalidRequest` with `counts.actual` and `counts.limit`; the stored expiry uses the requested TTL. Absent means the compiled default.                                                                                                                                                                           |
| `observer_correlation_digest` | `session.grant` mint                           | Exactly 32 lowercase hex characters carrying the derived digest of the raw `client_correlation` a later observer connection presents at `daemon.negotiate`: the first 16 bytes of `SHA-256` over `prefix` + `raw_value`, where `prefix` is the 28 ASCII bytes `bittyd:client_correlation:v1` plus one NUL byte (`0x00`), lowercase hex. A plain `SHA-256` of the raw value, or any other truncation, never matches. Any other width or case is `InvalidRequest`; absent keeps the uid-only binding. |
| `client_correlation_digest`   | `daemon.host_grant` mint                       | Exactly 32 lowercase hex characters carrying the derived digest of the raw `client_correlation` a later client connection presents at `daemon.negotiate`: the first 16 bytes of `SHA-256` over `prefix` + `raw_value`, where `prefix` is the 28 ASCII bytes `bittyd:client_correlation:v1` plus one NUL byte (`0x00`), lowercase hex. A plain `SHA-256` of the raw value, or any other truncation, never matches. Any other width or case is `InvalidRequest`; absent keeps the uid-only binding.   |

Rules:

1. `ttl_ms` and both digest fields are mint-only. Sending any of them on
   `session.grant.revoke` or `daemon.host_grant` `revoke` is `InvalidRequest`.
2. The digest field is method-scoped: `client_correlation_digest` on
   `session.grant` and `observer_correlation_digest` on `daemon.host_grant` are
   cross-method fields and are `InvalidRequest`, never silently ignored.
3. A correlation-bound grant is usable only from the connection whose
   derived digest matches. A host-grant mismatch adds no scope; an observer
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

## Wire schema

This section is the normative request and result schema for service `1.0`. It
closes the gap that let a consumer learn a field name only by reading
`crates/bitty-daemon/src/service/dispatch.rs`: every served method has an exact
request table and an exact result table, and the two unserved catalog methods
have a typed refusal instead of a result. The code at `ea0de791` is the
evidence; this section is the contract. Where a handler and this section
disagree, the handler is defective until the difference is recorded here as a
revision, never the reverse.

The schema covers the 15 served methods of the 17-method catalog.
`daemon.orphans.verify` and `session.resize` are unserved and appear under
[Unserved catalog methods](#unserved-catalog-methods). The handshake fields are
already fixed in [Handshake](#handshake); `daemon.negotiate` points at that
section instead of restating it.

### Envelope and common conventions

The request and response envelope is the accepted `bitty-ipc` v1 envelope; this
freeze does not re-spell framing, chunking, or correlation mechanics.

| Direction | Shape                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Request   | `{"v": 1, "id": <string>, "method": <string>, "params": <object or absent>}`                                            |
| Success   | `{"v": 1, "id": <string>, "ok": true, "result": <object>}`                                                              |
| Refusal   | `{"v": 1, "id": <string>, "ok": false, "error": {"class": <string>, "code": <string>, "message": <string>, "counts"?}}` |

Rules that apply to every method:

1. `v` is the integer `1`. `id` is 1 to 64 bytes and is echoed; it is an opaque
   per-connection correlation value, not a UUID, not a durable identity, and
   never authority. The client chooses the request `id`; the server chooses an
   event `id` and never accepts a client-supplied event id. `method` is a
   lowercase dotted name of at most 128 bytes. `params` is a JSON object when
   present; an absent or `null` `params` is the same as an empty object.
2. Every served success `result` is a JSON object. A refusal is never a partial
   result and applies nothing; the `error.code` vocabulary is the closed set in
   [Refusal taxonomy](#refusal-taxonomy), and `counts` is
   `{"actual": <u64>, "limit": <u64>}` when present.
3. Every value is case-sensitive. An identifier in the wrong case is
   `InvalidRequest`, never normalized. A hex identifier is lowercase.
4. **Presence.** `required` means the key must be present with the stated type;
   a missing key, an explicit `null`, or a different JSON type is
   `InvalidRequest`. `optional` means the key may be omitted; the frozen
   encoding is omission. An explicit `null` is not a valid optional encoding:
   the merged parser treats it as absent for a few string and integer helpers,
   but refuses it for `ttl_ms`, a digest, `generation`, and `target_attach_id`,
   and that tolerance is not a wire promise. A `1.0` client must omit an
   optional field rather than send `null`.
5. **Unknown fields.** A well-formed field that a method does not read is
   ignored, except for the transport-reserved ambient names `auth`, `scope`,
   and `role` at depth 1, which are `InvalidRequest`, and the method-scoped
   cross-field rules named in the method table. The service never silently
   applies a field that belongs to another method.
6. **Instance binding.** `daemon_instance_id` is accepted on every
   post-handshake served method: a string of 32 lowercase hex characters. A
   malformed value is `InvalidRequest`; a value different from the serving
   instance is `Denied/StaleInstance`. It is checked after the scope stage and
   before the handler's target lookup, so a caller without the method scope
   learns nothing from it. `daemon.negotiate` is the handshake and is not a
   post-handshake request.
7. **Idempotency.** `idempotency_key` is a string of 1 to 128 bytes (UTF-8
   bytes, not characters) and is opaque to the daemon; empty or over-long is
   `InvalidRequest`. It is required on the four keyed methods and is ignored on
   a keyless method. A duplicate with the same derived key and the same
   fingerprint replays the stored descriptor with a recomputed snapshot and
   applies nothing; a different fingerprint is `Denied/IdempotencyConflict`.
   A lease-bound result replays only on the connection that created it;
   `session.create` replays across connections so a lost response is
   recoverable. A full store refuses a keyed method with
   `Denied/IdempotencyCapacity` and never blocks termination or revocation.
8. **Generation and target aliases.** `generation` is the canonical unsigned
   integer on `session.abort`, `session.kill`, and
   `session.control.transfer`. `expected_generation` is the canonical name on
   `session.attach` and a deprecated alias on the other three. On
   `session.control.transfer`, `target_attach_id` is canonical and `attach_id`
   is a deprecated alias. `attach_id` is the canonical name on
   `session.detach` and `lease.heartbeat`; no alias is read there. Both
   spellings with the same value are accepted; both with different values are
   `InvalidRequest` and apply nothing. The aliases
   remain accepted for the whole of major `1`; removing one is a `2.0` change,
   because a `1.x` removal would refuse input `1.0` accepted.
9. **Bounds and digits.** A `u64` is a non-negative JSON integer; a fractional,
   negative, or string-encoded number is `InvalidRequest`. A `u32` is a
   non-negative JSON integer no greater than `4294967295`.

### Shared object shapes

`session` is one object, rendered by `session_json` and reused by every method
that returns a session. It is metadata only: no terminal text, PTY bytes,
scrollback, clipboard content, content handle, owner peer, controller presence,
or pending-grant count.

| Key               | Type           | Presence    | Meaning                                                                                                                                                                                                  |
| ----------------- | -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`      | string         | required    | 32 lowercase hex. Server-assigned; never client-supplied.                                                                                                                                                |
| `kind`            | string         | required    | `terminal` in `1.0`.                                                                                                                                                                                     |
| `terminal_id`     | string         | required    | The supplied id, or the server-assigned 32-hex id when the request omitted one.                                                                                                                          |
| `state`           | string         | required    | `created`, `running`, `stopping`, `exited`, `failed`, or `terminated`.                                                                                                                                   |
| `generation`      | u64            | required    | `0` for every session in `1.0`; no worker is bound.                                                                                                                                                      |
| `state_revision`  | u64            | required    | Monotonic revision; it changes on a snapshot-visible mutation.                                                                                                                                           |
| `attach_count`    | u16            | required    | Live attach-lease count at the request instant; an expired lease is excluded.                                                                                                                            |
| `attached`        | bool           | required    | Derived from `attach_count > 0`; not a lifecycle state.                                                                                                                                                  |
| `created_at_ms`   | u64            | required    | Server monotonic milliseconds.                                                                                                                                                                           |
| `last_seen_ms`    | u64            | required    | Server monotonic milliseconds of the last session activity.                                                                                                                                              |
| `terminal_reason` | string or null | conditional | Present only when `state` is terminal; `worker_exit`, `worker_signal`, `spawn_failed`, `supervision_failed`, `consumer_cancel`, `consumer_timeout`, `operator_abort`, `daemon_stop`, or `host_shutdown`. |
| `cleanup`         | string or null | conditional | Present only when `state` is terminal; `swept`, `unverified`, or `not_started`.                                                                                                                          |

`counts` is the `daemon.status` `sessions` object:

| Key        | Type | Presence | Meaning                                   |
| ---------- | ---- | -------- | ----------------------------------------- |
| `created`  | u64  | required | Sessions registered and not yet bound.    |
| `running`  | u64  | required | Bound sessions that are alive.            |
| `stopping` | u64  | required | Sessions draining after an accepted stop. |
| `terminal` | u64  | required | Retained terminal records.                |

A `limits` entry is `{"name": string, "effective": u64, "default": u64, "system_max": u64}`.
The `1.0` handshake and `daemon.status` advertise 54 entries; a client reads
`effective` and never hardcodes the count.

### Served methods

Each table below is the complete request and success-result schema for one
method. A refusal replaces the result and is listed only where the method has a
non-obvious refusal. Keys are exact; order is not significant.

#### `daemon.negotiate`

Request and result: the [Handshake](#handshake) tables. No other key is read.
Exactly one negotiate per connection; a second is `Denied/AlreadyNegotiated`
and the connection closes. The method is pre-authentication, so
`daemon_instance_id` is not a field here.

#### `daemon.status`

Request: no required parameter; only the common `daemon_instance_id` is read.

| Result key           | Type        | Presence | Notes                                                                                                                                                                     |
| -------------------- | ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `daemon_instance_id` | string      | required | 32 lowercase hex; the serving instance.                                                                                                                                   |
| `daemon_state`       | string      | required | `running` or `stopping`.                                                                                                                                                  |
| `active_sessions`    | u64         | required | `created + running + stopping`.                                                                                                                                           |
| `sessions`           | object      | required | The `counts` object above.                                                                                                                                                |
| `audit_degraded`     | bool        | required | `true` when the audit sink is degraded.                                                                                                                                   |
| `drain_deadline_ms`  | u64 or null | required | Server monotonic milliseconds; `null` while running.                                                                                                                      |
| `tcp_listeners`      | u32 or null | required | This process's listening TCP sockets; `null` outside Linux or when `/proc/self` is unavailable. The served cell reports `0`; the field is observational, never authority. |
| `limits`             | array       | required | Array of `limits` entries; same values as the handshake.                                                                                                                  |

The merged build also emits `orphans: {"verify": "deferred"}`. It is a
transitional placeholder, not a `1.0` field: it is omitted from the frozen key
set above, no consumer may read it, and orphan counts and verification state
are deferred to bitty#2791. `daemon_pid`, uptime, and orphan counts are **not
served**; see
[Accepted fields not served in 1.0](#accepted-fields-not-served-in-10).

#### `daemon.stop`

| Request key | Type   | Presence | Notes                                    |
| ----------- | ------ | -------- | ---------------------------------------- |
| `mode`      | string | optional | `refuse` (default), `drain`, or `force`. |

| Result key          | Type        | Presence | Notes                                                                               |
| ------------------- | ----------- | -------- | ----------------------------------------------------------------------------------- |
| `accepted`          | bool        | required | Always `true` on success.                                                           |
| `mode`              | string      | required | The parsed mode.                                                                    |
| `active_sessions`   | u64         | required | Active count observed before the stop.                                              |
| `terminated`        | u64         | required | Sessions terminated by this stop. In `1.0` these are generation-0 pre-bind cancels. |
| `drain_deadline_ms` | u64 or null | required | Set for `drain`; `null` for `refuse` and `force`.                                   |

A repeated stop after the daemon entered `stopping` is
`Denied/DaemonStopping`. A default `refuse` stop with active sessions is
`Denied/ActiveSessions` with `counts.actual = active` and
`counts.limit = max_sessions`.

#### `daemon.host_grant`

| Request key                 | Type   | Presence | Notes                                                                                    |
| --------------------------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `action`                    | string | required | `mint` or `revoke`; any other value is `InvalidRequest`.                                 |
| `ttl_ms`                    | u64    | optional | Mint only; `1..=effective host_grant_ttl_ms`; absent uses the default.                   |
| `client_correlation_digest` | string | optional | Mint only; 32 lowercase hex, the derived digest from the handshake.                      |
| `grant_id`                  | string | optional | Required for `revoke`; 32 lowercase hex. Ignored on `mint` under the unknown-field rule. |

Mint result:

| Result key      | Type   | Presence | Notes                                                |
| --------------- | ------ | -------- | ---------------------------------------------------- |
| `grant_id`      | string | required | 32 lowercase hex; non-secret.                        |
| `grant`         | string | required | 64 lowercase hex; the 256-bit bearer, returned once. |
| `expires_at_ms` | u64    | required | Server monotonic milliseconds.                       |

Revoke result: `{"grant_id": string, "revoked": bool, "not_active": bool}`.
`revoked` and `not_active` are complements; a second revoke is the
`not_active` success, not a refusal. `observer_correlation_digest` is a
`session.grant` field and is `InvalidRequest` here; `ttl_ms` and
`client_correlation_digest` on `revoke` are `InvalidRequest`. Mint is unkeyed:
the duplicate policy is the open point named in
[Grant request fields](#grant-request-fields).

#### `daemon.orphans.verify`

Not served in `1.0`; see [Unserved catalog methods](#unserved-catalog-methods).

#### `session.create`

| Request key       | Type   | Presence | Notes                                                                                                                                                                                                                  |
| ----------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`            | string | optional | `terminal` (default) or `worker`. `worker` is `Denied/UnsupportedCapability` after the stage-6 create-scope check and before the stage-7 host-grant liveness re-check; any other value is `InvalidRequest`.            |
| `terminal_id`     | string | optional | 1 to 128 bytes (the `terminal_id_bytes` system maximum) from `[A-Za-z0-9._:-]`; absent means the server assigns 32 lowercase hex. Duplicate among live sessions is `Denied/TerminalAlreadyHosted` for a different key. |
| `idempotency_key` | string | required | 1 to 128 bytes.                                                                                                                                                                                                        |

No spawn field is read: `argv`, `env`, `cwd`, `cols`, `rows`, and `term` are
not `1.0` request fields. A present one is an unknown field and is ignored.
**Served semantics:** the method registers a `created` session at
`generation: 0` with `state_revision: 0`, no attach, and no worker. It starts
no process or PTY, allocates no terminal, and opens no content plane. A created
session never reaches `running` in this slice; it can be inspected, attached
for metadata, granted, aborted, or killed. Do not describe create as spawning a
terminal.

Fingerprint parts: `create`, `kind`, and `terminal_id` (empty when absent).

| Result key      | Type           | Presence | Notes                                                                                                                                         |
| --------------- | -------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `session`       | object         | required | A `session` snapshot; `state: created`, `generation: 0`.                                                                                      |
| `control_token` | string or null | required | 64 lowercase hex on a fresh create while the initial token is live; `null` on a replay after a controller claim or once the token is retired. |
| `replayed`      | bool           | required | `false` for the first execution, `true` for a stored-descriptor replay.                                                                       |

The response is the only place the initial control token appears. A replay
recomputes the snapshot and never re-issues a claimed token.

#### `session.status`

| Request key     | Type   | Presence | Notes                                       |
| --------------- | ------ | -------- | ------------------------------------------- |
| `session_id`    | string | required | 32 lowercase hex.                           |
| `control_token` | string | optional | 64 lowercase hex; used only for visibility. |

`generation` is not read; a present value is an unknown field and is ignored.
The result is `{"session": <session object>}`. A missing token is `NotFound` or
the visible-lease path, never `Denied/InvalidControlToken`; that mapping is
control-method only. The method never refuses on a stale generation.

#### `session.list`

Request: no required parameter; only the common `daemon_instance_id` is read.
Result: `{"sessions": [<session object>, ...]}`. An ordinary connection sees
only sessions with a live lease on that connection; `daemon.inspect` adds the
operator all-session view. Neither view carries owner peer identity or content.

#### `session.attach`

| Request key           | Type   | Presence                | Notes                                                                                         |
| --------------------- | ------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| `session_id`          | string | required                | 32 lowercase hex.                                                                             |
| `attach_role`         | string | required                | `controller` or `observer`; `role` is not a request field and is `InvalidRequest` at depth 1. |
| `expected_generation` | u64    | required for controller | Must match the current generation; mismatch is `Denied/StaleGeneration`.                      |
| `control_token`       | string | optional for controller | 64 lowercase hex; a missing token on a claim is `Denied/InvalidControlToken`.                 |
| `observer_grant`      | string | required for observer   | 64 lowercase hex; single-use.                                                                 |
| `idempotency_key`     | string | required for controller | 1 to 128 bytes. Observer attach does not read it.                                             |

Controller success result:

| Result key            | Type   | Presence | Notes                                               |
| --------------------- | ------ | -------- | --------------------------------------------------- |
| `session`             | object | required | Snapshot after the claim.                           |
| `attach_id`           | string | required | 32 lowercase hex.                                   |
| `role`                | string | required | `controller`.                                       |
| `lease_expires_at_ms` | u64    | required | Server monotonic milliseconds.                      |
| `control_token`       | string | required | 64 lowercase hex; the rotated token, returned once. |
| `replayed`            | bool   | required | `false`.                                            |

Controller replay result: `{"session": object, "attach_id": string or null,
"role": "controller", "replayed": true, "not_attached": bool}`. It carries no
`lease_expires_at_ms` and no `control_token`; `attach_id` is `null` when the
lease no longer resolves, and `not_attached` is then `true`.

Observer success result: `{"session": object, "attach_id": string,
"role": "observer", "lease_expires_at_ms": u64, "replayed": false}`. It carries
no `control_token`. Observer attach is not keyed and never replays: a consumed
grant is `Denied/ObserverGrantRequired`. The response carries no backlog,
`backlog_truncated`, `earliest_revision`, or effective lease scopes in `1.0`.

#### `session.grant`

| Request key                   | Type   | Presence | Notes                                                           |
| ----------------------------- | ------ | -------- | --------------------------------------------------------------- |
| `session_id`                  | string | required | 32 lowercase hex.                                               |
| `idempotency_key`             | string | required | 1 to 128 bytes.                                                 |
| `control_token`               | string | optional | 64 lowercase hex; required only when control is vacant.         |
| `ttl_ms`                      | u64    | optional | `1..=effective observer_grant_ttl_ms`; absent uses the default. |
| `observer_correlation_digest` | string | optional | 32 lowercase hex; absent keeps the uid-only binding.            |

`kind` is **not** a served request field. A present `kind` is ignored under the
unknown-field rule and never selects a grant kind; `1.0` mints observer grants
only. The only conforming client value is `kind: observer`, and clients omit
the field. `client_correlation_digest` is a `daemon.host_grant` field and is
`InvalidRequest` here.

Fingerprint parts: `grant`, `session_id`, `ttl_ms` (decimal or `default`), and
`observer_correlation_digest` (hex or `none`).

Mint result:

| Result key      | Type   | Presence | Notes                                                         |
| --------------- | ------ | -------- | ------------------------------------------------------------- |
| `grant_id`      | string | required | 32 lowercase hex.                                             |
| `grant`         | string | required | 64 lowercase hex; the 256-bit observer bearer, returned once. |
| `expires_at_ms` | u64    | required | Server monotonic milliseconds.                                |
| `session_id`    | string | required | 32 lowercase hex.                                             |
| `replayed`      | bool   | required | `false`.                                                      |

Replay result: `{"grant_id": string, "grant": string or null,
"grant_active": bool, "session_id": string, "replayed": true}`. It carries no
`expires_at_ms`; `grant` is `null` and `grant_active` is `false` once the grant
is consumed, expired, or revoked. A terminal session is `Denied/NotRunning`
before keyed admission.

#### `session.grant.revoke`

| Request key     | Type   | Presence | Notes                                                   |
| --------------- | ------ | -------- | ------------------------------------------------------- |
| `grant_id`      | string | required | 32 lowercase hex.                                       |
| `control_token` | string | optional | 64 lowercase hex; required only when control is vacant. |

`ttl_ms`, `observer_correlation_digest`, and `client_correlation_digest` are
mint-only; a present one is `InvalidRequest`. Result:
`{"grant_id": string, "revoked": bool, "not_active": bool}`. `revoked` and
`not_active` are complements. The `not_active` descriptor is byte-identical for
an unknown grant, a swept record, and a non-operator correlation mismatch.

#### `session.detach`

| Request key     | Type   | Presence | Notes                                                                             |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------- |
| `attach_id`     | string | required | 32 lowercase hex. The `session_id`-plus-`attach_id` request form is not served.   |
| `control_token` | string | optional | 64 lowercase hex; required only when detaching another lease with vacant control. |

Result:

| Result key     | Type   | Presence | Notes                                  |
| -------------- | ------ | -------- | -------------------------------------- |
| `session`      | object | required | Snapshot after the detach.             |
| `attach_id`    | string | required | The target handle.                     |
| `was_attached` | bool   | required | `false` on the idempotent repeat.      |
| `not_attached` | bool   | required | Complement of `was_attached`.          |
| `revoked`      | bool   | required | `true` when another lease was revoked. |

A repeat detach of a handle this connection already detached or revoked changes
nothing and does not bump the revision.

#### `session.control.transfer`

| Request key        | Type   | Presence | Notes                                                                  |
| ------------------ | ------ | -------- | ---------------------------------------------------------------------- |
| `session_id`       | string | required | 32 lowercase hex.                                                      |
| `generation`       | u64    | required | Canonical; `expected_generation` is accepted as the one-release alias. |
| `target_attach_id` | string | required | 32 lowercase hex; `attach_id` is accepted as the one-release alias.    |
| `control_token`    | string | optional | 64 lowercase hex; required only when control is vacant.                |
| `idempotency_key`  | string | required | 1 to 128 bytes.                                                        |

Live result: `{"session": object, "controller": string, "previous_controller":
string or null, "replayed": false}`. Replay result: `{"session": object,
"controller": string or null, "replayed": true, "not_attached": bool}`; it
carries no `previous_controller`. The rotated token is delivered to the target
on the target's next `lease.heartbeat`, never in the requester's result.

#### `session.abort`

| Request key     | Type   | Presence | Notes                                                                                               |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------------------------- |
| `session_id`    | string | required | 32 lowercase hex.                                                                                   |
| `generation`    | u64    | required | Canonical; `expected_generation` is accepted as the one-release alias.                              |
| `reason_class`  | string | required | `cancel`, `timeout`, or `operator`; any other value is `InvalidRequest`.                            |
| `control_token` | string | optional | 64 lowercase hex; parsed but not used as authority with `reason_class: operator`, so omit it there. |

The method is keyless; an `idempotency_key` is ignored. Results:

| Branch            | Result keys                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Already terminal  | `session`, `accepted: false`, `not_running: true`. No `reason`, `stage`, `cleanup`, or `deadline_ms`.                                       |
| Pre-bind accepted | `session`, `accepted: true`, `reason` (terminal reason), `stage: "not_started"`, `cleanup: "not_started"`.                                  |
| Bound accepted    | `session`, `accepted: true`, `reason` (terminal reason), `stage: "graceful"` or `"kill_due"`, `deadline_ms` (u64). It carries no `cleanup`. |

In `1.0` every session is at generation `0` and unbound, so the observed
accepted branch is pre-bind: the session becomes `terminated` with the requested
reason and `cleanup: not_started`. The bound branch is the schema for the
worker slice (bitty#2790) and is unreachable here.

#### `session.kill`

| Request key  | Type   | Presence | Notes                                                                  |
| ------------ | ------ | -------- | ---------------------------------------------------------------------- |
| `session_id` | string | required | 32 lowercase hex.                                                      |
| `generation` | u64    | required | Canonical; `expected_generation` is accepted as the one-release alias. |

`control_token` is not read by the handler, and there is no key. Operator-only
(`daemon.control`). Result branches
match `session.abort`: already terminal, pre-bind accepted with
`reason: operator_abort` and `cleanup: not_started`, or bound accepted with
`stage` and `deadline_ms`.

#### `lease.heartbeat`

| Request key | Type   | Presence | Notes                                                                             |
| ----------- | ------ | -------- | --------------------------------------------------------------------------------- |
| `attach_id` | string | required | 32 lowercase hex; **singular**. The accepted multi-id request form is not served. |

Result:

| Result key            | Type           | Presence | Notes                                                                                                                           |
| --------------------- | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `session`             | object         | required | Snapshot at the heartbeat.                                                                                                      |
| `attach_id`           | string         | required | Echo of the singular handle.                                                                                                    |
| `lease_expires_at_ms` | u64            | required | Server monotonic milliseconds.                                                                                                  |
| `control_token`       | string or null | required | The pending rotated token when this lease is the transfer target; `null` otherwise. It is always present and is delivered once. |

The field is singular and the result has no `server_monotonic_ms`; both are
recorded as dated narrowings against the accepted heartbeat prose.

### Unserved catalog methods

These methods are in the catalog and keep their frozen spelling, but the merged
daemon refuses them before reading any method field (the envelope still
requires `params` to be an object when present). They have no success schema in
`1.0`.

| Method                  | Request in `1.0` | Result in `1.0`                                                                    | Deferred owner |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------- | -------------- |
| `session.resize`        | No field is read | `Denied/ScopeViolation`, before target lookup and before any method field is read. | bitty#2790     |
| `daemon.orphans.verify` | No field is read | `Denied/UnsupportedCapability`, after scope and before any orphan action.          | bitty#2791     |

`session.resize` intent: when served, the request is `session_id` (32 lowercase
hex), `generation` (u64), and the dimensions `cols` and `rows` (positive
integers within the terminal bounds); the connection must already hold the
`terminal.manage` grant from `daemon.negotiate`, and the caller must hold the
current controller lease. The result is not frozen here; the two candidates the
worker slice may choose are a full `{"session": object}` snapshot or
`{"accepted": bool}` with the revision, and the choice is part of the bitty#2790
revision. An observer never resizes.

`daemon.orphans.verify` intent: the accepted text allows `action: verify`
(default) or `action: retire` with a bounded journal record id. Neither the
`action` parameter nor `retire` is in the open PR #2801 head; PR #2801 serves a
parameterless pass returning `{"reaped": u64, "unverified": u64, "stale": u64,
"reserved": u64, "committed": u64}`. That candidate shape is recorded as
evidence only. It is not frozen until bitty#2791 merges, and `retire` stays
unserved until a merged handler accepts it.

### Dated narrowings

These are the places where the served wire is narrower than the accepted prose.
Each is dated, scoped, and owned; none widens a control, and none may be read as
a general override of the accepted contract.

| Date       | Narrowing                                                                                                                                                                                                                                  | Served evidence at `ea0de791`                                                                                   | Effect on a consumer                                                                                                       | Owner      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 2026-10-29 | `session.attach` requests `attach_role`, not `role`. The accepted text says `role`, but `role` is a transport-reserved ambient name at depth 1 and is `InvalidRequest`; the response key is `role`.                                        | `dispatch.rs` reads `attach_role`; `validate_no_ambient_auth` rejects `role`; `wire.rs` test pins the split.    | Send `attach_role`; read `role`. Do not send `role`.                                                                       | bitty#2664 |
| 2026-10-29 | An **absent** `operator_capability` is not a refusal at negotiate and adds no `daemon.*` scope. A later `daemon.*` method is `Denied/ScopeViolation`; only a present malformed or wrong bearer is one static `Unauthenticated` and closes. | `handshake.rs` verifies only a present bearer; `dispatch.rs` checks the scope, not the field.                   | Omit the field for a consumer connection; treat `ScopeViolation` as the missing-capability answer.                         | bitty#2607 |
| 2026-10-29 | The `D-07` uniform `NotFound` is narrowed for a **live vacant-control** session: a control method with a missing, stale, or rotated token answers `Denied/InvalidControlToken`. No other pair is distinguishable.                          | `dispatch.rs` `live_vacant_control` and `control_authority`; [Denial order](#denial-order-for-control-methods). | Treat this one code as the vacant-control signal; do not infer existence from any other refusal.                           | bitty#2664 |
| 2026-10-29 | `session.create` is registry-only. The accepted text requires a terminal spawn specification; `1.0` reads none, starts no process or PTY, and leaves the session at `generation: 0`, `state: created`.                                     | `dispatch.rs` `session_create` calls `host.create` with no spawn spec; the registry stores metadata only.       | Never treat create as a running terminal or send spawn fields expecting an effect; a create-only adapter is metadata-only. | bitty#2790 |
| 2026-10-29 | `lease.heartbeat` takes a **singular** `attach_id` and returns no `server_monotonic_ms`. The accepted text allows one or more ids and a server clock in the response.                                                                      | `dispatch.rs` `lease_heartbeat` parses one `attach_id`; the result has `lease_expires_at_ms` only.              | Heartbeat one lease per request and use the handshake `server_monotonic_ms` for age.                                       | bitty#2806 |
| 2026-10-29 | `session.grant` does not read `kind`. The accepted text names `kind: observer`; the served method mints observer grants only and ignores any present `kind`.                                                                               | `dispatch.rs` `session_grant` reads no `kind`; the unknown-field rule drops it.                                 | Omit `kind`; never use it to select host or observer authority.                                                            | bitty#2664 |
| 2026-10-29 | `session.detach` requires `attach_id`; the accepted `session_id`-plus-`attach_id` form is not read.                                                                                                                                        | `dispatch.rs` `session_detach` parses `attach_id` only; `session_id` is an ignored unknown field.               | Always send the target `attach_id`.                                                                                        | bitty#2806 |

The generation and target aliases are not narrowings: they are additive
tolerances on top of the accepted canonical names, and they are removed only at
`2.0` (see rule 8 in
[Envelope and common conventions](#envelope-and-common-conventions)).

### Accepted fields not served in 1.0

This table separates an accepted field from a served one. `Not served` means no
success key exists in `1.0`; a consumer must not read the key or infer it from
the snapshot. Every row names its owner and is dated 2026-10-29.

| Accepted field                                                                                  | Accepted source           | Served in `1.0`                                       | Status     | Owner                                         |
| ----------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------- | ---------- | --------------------------------------------- |
| Controller presence and pending observer-grant count in `session.status`/`session.list`         | `D-09`; status section    | No key in the `session` snapshot.                     | Deferred   | bitty#2806                                    |
| Owner peer identity in the `session.list` operator view                                         | `D-09`; list section      | No key; the snapshot is owner-free.                   | Deferred   | bitty#2806                                    |
| Effective lease scopes in the `session.attach` result                                           | `D-09`; attach section    | No key.                                               | Deferred   | bitty#2806                                    |
| Backlog, `backlog_truncated`, and `earliest_revision` in `session.attach`                       | `D-10`; attach section    | No key.                                               | Deferred   | bitty#2792 (delivery) and bitty#2605 (vector) |
| `server_monotonic_ms` in the `lease.heartbeat` result                                           | `D-12`; heartbeat section | No key; the handshake value is the only server clock. | Deferred   | bitty#2806                                    |
| `daemon_pid` and uptime in `daemon.status`                                                      | Status section            | No key.                                               | Deferred   | bitty#2806                                    |
| Orphan counts by class and verification state in `daemon.status`                                | `D-06`; status section    | Only the unfrozen `orphans` placeholder; no counts.   | Deferred   | bitty#2791                                    |
| Terminal spawn specification (`argv`, `env`, `cwd`, `cols`, `rows`, `term`) in `session.create` | Create section            | No key is read; the method is registry-only.          | Not served | bitty#2790                                    |
| `action` (`verify` or `retire`) and the count result in `daemon.orphans.verify`                 | `D-06`; orphan section    | Neither is parsed; the method refuses.                | Not served | bitty#2791                                    |
| `session.resize` success result and dimensions                                                  | `D-09`; resize section    | No success path; the method refuses before parsing.   | Not served | bitty#2790                                    |

A deferred row is not permission to invent the key; the addition is an optional
response field in a later `1.x` minor, and an old client ignores it. A
`Not served` row is a behavior gap, not an additive field: it needs the owning
implementation slice and a conformance vector before this schema may name a
success result.

### Event schema and capability

`D-10` already froze the event envelope, per-lease routing, per-session
revision ordering, the bounded backlog, and the terminal-event guarantee. This
freeze restates those names and adds no event kind:

| Field               | Type   | Meaning                                                                                              |
| ------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `v`                 | u64    | Wire version `1`.                                                                                    |
| `id`                | string | Opaque server-chosen per-connection correlation value, at most 64 bytes. Not a UUID and not durable. |
| `event.kind`        | string | `session_state`, `session_terminal`, `control_transfer`, `lease_revoked`, or `daemon_stopping`.      |
| `event.instance_id` | string | The `daemon_instance_id` the event belongs to.                                                       |
| `event.session_id`  | string | 32 lowercase hex.                                                                                    |
| `event.attach_id`   | string | The target lease, 32 lowercase hex.                                                                  |
| `event.revision`    | u64    | The session `state_revision` the event carries.                                                      |
| `event.terminal`    | bool   | The terminal marker; a terminal event is never silently shed.                                        |

The event body never carries PTY bytes, terminal text, prompts, tool output, or
provider payloads. The only deferred part is delivery: no frame is pushed in
`1.0`, `events` is frozen `false`, and bitty#2792 owns the wire plus bitty#2605
the vectors. A client that receives a frame while the negotiated bit is `false`
must ignore it and reconcile with `session.status`.

### Request deadline

The handshake advertises `request_timeout_ms` (default and system maximum
`10000`), and the accepted `D-13` taxonomy keeps `Request` as a daemon-owned
bound with a typed timeout. The merged daemon enforces only the negotiate
deadline: `Refusal::timeout` has one call site, in `src/service/server.rs`, and
no post-handshake request deadline is applied (`src/limits.rs` declares
`RequestTimeoutMs`; `src/service/dispatch.rs` never consults it). This freeze
does not redefine `Timeout` as audit-only. It records a dated enforcement gap:
the class stays in the accepted taxonomy, the advertised limit stays in the
`limits` array, and enforcement plus a request-deadline vector are deferred to
bitty#2805. Until that lands, a `1.0` client must not assume a post-handshake
request is bounded by the advertised value.

## Authorization order

### Stage order

Every request walks the same stages in the same order. A request that fails a
stage stops there; a later stage never observes it.

| Stage | Check                                                                                                                                                                                                                                                  | Refusal                                                                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Transport: accepted connection, single-instance lock, captured peer; per-frame peer credentials verified while the frame is assembled, before any payload is parsed or resolved; supported per-frame `v`                                               | `VersionMismatch`, `Unauthenticated`, or transport failure; connection closes where the class says so                                                                               |
| 2     | Pre-authentication: negotiate completed (service-version range fixed), one negotiate only, timeout and byte budget respected; a stopping daemon refuses mutations except a repeated stop                                                               | `Denied/AlreadyNegotiated`, `LimitExceeded`; `Denied/DaemonStopping`; the negotiate deadline emits one aggregated `Timeout` audit record; connection closes for the handshake cases |
| 3     | Method resolves: a well-formed name in the registry, or a malformed name                                                                                                                                                                               | `NotFound` for a well-formed unknown method; `InvalidMethod` for a malformed name                                                                                                   |
| 4     | Capability: the method's required capability is enabled                                                                                                                                                                                                | `Denied/UnsupportedCapability`                                                                                                                                                      |
| 5     | Authentication: the captured peer is still the same live process before a privileged effect; the per-frame credential was already checked at stage 1                                                                                                   | `Unauthenticated`; connection closes and nothing applies                                                                                                                            |
| 6     | Scope: the method's required scope is in the connection's effective set                                                                                                                                                                                | `Denied/ScopeViolation`, decided before any target lookup                                                                                                                           |
| 7     | Derived authority: consumed host consent, valid observer grant, control relation, or operator path                                                                                                                                                     | `Denied/ConsentRequired`, `Denied/ObserverGrantRequired`, `Denied/ControllerRequired`, `Denied/InvalidControlToken`, `Denied/ControlHeld`                                           |
| 8     | Target resolution: instance binding, visibility, and existence                                                                                                                                                                                         | `Denied/StaleInstance` before lookup; uniform `NotFound` for unknown, collected, or invisible; the live-vacant-control carve-out below                                              |
| 9     | Generation: the request's generation matches the session's current generation on effectful methods; `generation` is canonical, `expected_generation` is the attach name and the one-release alias elsewhere, and an ambiguous pair is `InvalidRequest` | `Denied/StaleGeneration` with the current generation and revision, applying nothing                                                                                                 |
| 10    | Idempotency: keyed methods consult their store; duplicates replay, fingerprints conflict                                                                                                                                                               | `Denied/IdempotencyConflict`, `Denied/IdempotencyCapacity` (keyed only)                                                                                                             |
| 11    | Effect, revision increment, attribution, and typed result                                                                                                                                                                                              | `Denied/Internal`, `Internal`, or the method result                                                                                                                                 |

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
- A missing, expired, consumed, wrong-session, wrong-peer, or wrong-correlation
  observer grant is one code: `Denied/ObserverGrantRequired`.
- A missing, stale, or rotated control token at a vacant control relation is one
  code: `Denied/InvalidControlToken`. The deliberate carve-out is recorded under
  [Denial order for control methods](#denial-order-for-control-methods): a
  caller that holds the scope and knows the 128-bit id can tell a live vacant
  session from an unknown one; no other pair is distinguishable.
- An absent operator capability is not a refusal at negotiate and is not
  distinguishable from a capability that was never requested: both yield the
  baseline scopes. Only a **present** malformed or wrong bearer is
  `Unauthenticated`, and that response is identical to a failed peer check.
- A missing, expired, revoked, wrong-peer, or wrong-correlation host grant adds
  no `session.host` scope and produces the same `Denied/ConsentRequired` at
  create; a consumed grant whose binding no longer matches the connection is
  the same `Denied/ConsentRequired` on the create re-check.
- A non-operator `session.grant.revoke` with a wrong-correlation binding
  returns the byte-identical `{grant_id, revoked: false, not_active: true}`
  success as an unknown or swept grant id, and revokes nothing; the operator
  path is ungated.
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
| `ConsentRequired`       | yes    | Host consent is missing, expired, revoked, consumed, or bound to a different peer or correlation digest                    |
| `ControllerRequired`    | yes    | The caller is not the current controller on a control method                                                               |
| `InvalidControlToken`   | yes    | Control is vacant and the token is missing, stale, or rotated                                                              |
| `ControlHeld`           | yes    | A valid current token is presented while a live controller still holds control                                             |
| `ObserverGrantRequired` | yes    | An observer attach lacks a valid single-use grant, including one bound to a different correlation digest                   |
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
mutation. `Timeout` stays the accepted `D-13` request-deadline class. In `1.0`
it is emitted only for a missed negotiate deadline, as one aggregated audit
record with `request_id` and `timeout_ms`, and no response frame; a
post-handshake request deadline is not enforced yet (bitty#2805), so no
post-handshake `Timeout` is claimed. The class is not redefined as audit-only:
when enforcement lands, it uses the same static refusal shape. The inherited
`FrameTooLarge`, `PayloadTooLarge`, `PendingLimitExceeded`, and `ChannelFull`
enum labels have no wire emission in this slice; an over-bound frame is
reported as `LimitExceeded`. A `Denied` code not in the table is not a `1.0`
code.

### Transport and validation classes

| Condition                                                                                 | Served result                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unsupported wire or service version                                                       | `VersionMismatch`; connection closes                                                                                                                                |
| Peer credential or endpoint tamper failure                                                | `Unauthenticated`; connection closes                                                                                                                                |
| Declared frame above `max_frame_bytes`                                                    | `LimitExceeded` (the inherited `FrameTooLarge` label maps to it); closes without a frame                                                                            |
| Payload, id, or field over a bound                                                        | `LimitExceeded` or `InvalidRequest`; an over-long `id` returns `InvalidRequest` with `id` omitted and then closes; other complete-frame validation bounds stay open |
| Pending request or channel over bound                                                     | No such surface is served in this slice; the inherited labels are declared only                                                                                     |
| Unknown method with valid grammar                                                         | `NotFound` (v1 registry policy; deny-by-default)                                                                                                                    |
| Malformed method name                                                                     | `InvalidMethod`                                                                                                                                                     |
| Malformed request payload or field                                                        | `InvalidRequest`                                                                                                                                                    |
| Ambiguous alias pair (`generation`/`expected_generation`, `target_attach_id`/`attach_id`) | `InvalidRequest`; the two values differ, and nothing applies                                                                                                        |
| Reserved ambient field `auth`, `scope`, or `role` at depth 1                              | `InvalidRequest`, never ignored as an authority field                                                                                                               |
| Well-formed unknown method field                                                          | Ignored, except the method-scoped cross-fields and the reserved names above                                                                                         |
| Negotiate deadline                                                                        | `Timeout` in the audit record; no response frame; connection closes                                                                                                 |
| Unknown, collected, or invisible session                                                  | `NotFound` (live-vacant-control carve-out aside)                                                                                                                    |
| Invariant failure without a typed service result                                          | `Internal`; fail closed                                                                                                                                             |

`bitty-ipc` v1 resolves a well-formed method absent from its registry as
`NotFound` before authorization and reserves `InvalidMethod` for names that
violate the wire grammar. This freeze preserves that split for the service
families; it does not widen `InvalidMethod` to mean an unknown method.

A refusal carries static codes, counts, and the limit that was hit. It never
echoes caller bytes, a path, terminal text, a token, a bearer value, or another
session's details.

**Corpus coverage.** The merged 41 vectors pin 17 wire codes:
`VersionMismatch`, `Unauthenticated`, `LimitExceeded`, `NotFound`,
`ScopeViolation`, `ConsentRequired`, `ControllerRequired`,
`InvalidControlToken`, `ObserverGrantRequired`, `AlreadyNegotiated`,
`UnsupportedCapability`, `StaleInstance`, `StaleGeneration`, `NotRunning`,
`ActiveSessions`, `IdempotencyConflict`, and `InvalidRequest`. `ControlHeld`,
`SessionStopping`, `TerminalAlreadyHosted`, `DaemonStopping`,
`IdempotencyCapacity`, `RateLimited`, `Internal`, and `InvalidMethod` are
implemented and unit- or integration-tested but have no corpus row; `Timeout`
has one negotiate-deadline emission path and no post-handshake request-deadline
vector (bitty#2805). bitty#2605 owns the remaining coverage gap. A vector that expects
a code outside this table is a contract defect, not a corpus choice.

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

| Condition pair                                                                                                       | Single result                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Unknown session, collected session, foreign session, or an invisible session                                         | `NotFound`                                                                                            |
| Missing host consent vs. a host grant that is expired, revoked, consumed, peer-mismatched, or correlation-mismatched | `Denied/ConsentRequired` at create                                                                    |
| Observer grant missing, expired, consumed, wrong-session, wrong-peer, or wrong-correlation                           | `Denied/ObserverGrantRequired`                                                                        |
| Control token missing, stale, or rotated at a vacant control relation                                                | `Denied/InvalidControlToken`                                                                          |
| A caller that lacks `process.spawn` and also lacks host consent                                                      | `Denied/ScopeViolation`, never `ConsentRequired`                                                      |
| An absent operator capability vs. a capability that was never requested                                              | Baseline scopes, no refusal; only a present invalid bearer is the static `Unauthenticated` + close    |
| A present malformed or wrong operator bearer vs. a failed peer check at negotiate                                    | One static `Unauthenticated` and close; the response never reveals whether the capability file exists |
| Unknown `Denied` code from a peer                                                                                    | Static `Internal`, never parsed as text                                                               |
| Non-operator revoke wrong-correlation vs. an unknown or swept `grant_id`                                             | The byte-identical `{grant_id, revoked: false, not_active: true}` success; nothing is revoked         |

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
- remove a deprecated alias (`expected_generation` on abort/kill/transfer, or
  `attach_id` on transfer); removal is a `2.0` change because it would refuse
  input `1.0` accepts;
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

- Serialize the frozen spelling and the [Wire schema](#wire-schema); do not
  alias a method, scope, capability, or field, and do not read a key the schema
  marks not served.
- Send `attach_role`, a singular `attach_id`, and no `session.create` spawn
  field; treat create as registry-only until bitty#2790 lands.
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
field-presence rule (omit, never `null`), the per-method wire schema (added
2026-10-29), the `attach_role`/`role` split, the `events: false` freeze, the
`session.resize` spelling (frozen; the method remains unserved), and the
grant-expiry revision (merged in PR #2786, pinned by `C-10`).

| Item                                                                                  | Owner                                                    | Constraint this freeze keeps                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session.resize` success path, dimensions, and controller-only revision effect        | bitty#2790                                               | The spelling, `terminal.manage` scope, negotiate-time grant, and controller-lease mechanism are frozen; every request today is `Denied/ScopeViolation`; no consumer may assume resize works                                          |
| `daemon.orphans.verify`, the `action`/`retire` form, and cgroup/subreaper containment | bitty#2791                                               | Every request today is `Denied/UnsupportedCapability`; no orphan is claimed verified; the open PR #2801 head serves a parameterless count result and no `retire`; corpus `C-03` pins the refusal                                     |
| Worker spawn, bind, and the terminal content plane                                    | bitty#2790                                               | `session.create` is registry-only at `generation: 0`; `worker_sessions=false`; with create authority `kind: worker` is `Denied/UnsupportedCapability` before any spawn; enabling needs the ADR 0019 amendment and a dedicated review |
| Event frame delivery on a live connection                                             | bitty#2792 for wire delivery; bitty#2605 for the vectors | `D-10` fixes the envelope, routing, ordering, backlog, and terminal guarantee; no event frame is sent today; `events` is frozen `false`; `session.status`/`session.list` stay the reconciliation reads                               |
| Expiry event and its wire vector                                                      | bitty#2792; bitty#2605                                   | Expiry now bumps `state_revision` once per affected session (merged PR #2786); it still emits no event, so a consumer cannot observe expiry as an event                                                                              |
| Post-handshake `request_timeout_ms` enforcement and its vector                        | bitty#2805 (filed 2026-10-29)                            | The limit stays advertised and `Timeout` stays the accepted `D-13` class; no post-handshake deadline is enforced today; the negotiate deadline is the only `Timeout` emission                                                        |
| Accepted session and daemon metadata fields not served in `1.0`                       | bitty#2806 (filed 2026-10-29)                            | Controller presence, pending observer grants, owner peer, lease scopes, heartbeat `server_monotonic_ms`, `daemon_pid`, and uptime are optional response additions in a later `1.x`; none is invented here                            |
| Conformance coverage for the unserved refusals                                        | bitty#2605                                               | The merged corpus pins 17 wire codes over 41 vectors; a behavior outside the corpus is not proven                                                                                                                                    |
| Independent security evidence for the served surface                                  | bitty#2608                                               | No P0 control is verified by this document or by the merged corpus; the security reviewer must record evidence or a tracked defect before sign-off                                                                                   |
| Endpoint discovery and transport details beyond Linux x86_64                          | Accepted contract `D-15`                                 | Native-runner evidence before advertisement; a non-served cell has no endpoint; `UnsupportedPlatform` is a startup refusal, not a wire code                                                                                          |
| Numeric limit values and the `{effective, default, system_max}` schema                | Accepted contract `D-14`, bitty#2603                     | Keys are the `D-14` names; a client reads `effective`; a `system_max` only moves upward through contract revision and review                                                                                                         |
| Duplicate handling for unkeyed `daemon.host_grant` mint                               | Security review, bitty#2608                              | Mint creates a new grant per call; revoke is idempotent by `grant_id`; no key or fingerprint is invented here; the corpus must encode one behavior                                                                                   |
| Remote transport, restart persistence, and multi-instance service                     | ADR 0019, ADR 0008, accepted contract                    | No remote listener, no persistence, no second instance, no in-process fallback                                                                                                                                                       |

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
uniform non-operator revoke answer, the absence of an event wire, the
advertised-but-unenforced `request_timeout_ms`, and the registry-only
`session.create` (a caller may believe a terminal exists when only metadata
does). Each can silently change an authority boundary without changing the
method list. The merged code and corpus are evidence to inspect, not a control
that the reviewer may mark verified.

## Verification plan

Evidence in this delivery:

1. Every frozen name traces to the accepted contract, `bitty-ipc` v1, or the
   IPC and Agent RFC; `session.resize` is the one spelling the accepted
   contract does not state, and the merged catalog and corpus use it.
2. The method table covers the 17 catalog names, and every method has one scope
   rule and one idempotency class. Two methods are declared unserved with a
   typed refusal; they are not counted as delivered.
3. The [Wire schema](#wire-schema) covers all 15 served methods with exact
   request and result keys, types, presence, and result branches, and gives the
   two unserved methods a typed refusal instead of a success shape. Every row
   is traceable to a handler in `dispatch.rs` and a helper in `wire.rs` at
   `ea0de791`; the dated narrowings and the served-versus-accepted table name
   every field the freeze does not serve and its owner.
4. The refusal table contains every `Denied.code` in the accepted taxonomy and
   no new code. The `Served` column separates a declared code from a reachable
   one, and the corpus-coverage note records which codes the 41 merged vectors
   pin.
5. `terminal.*` is unchanged, no `session.*` scope grants terminal content, and
   the only transport scope the daemon grants is `process.spawn`.
6. The corpus runs both drivers in `bitty` CI on Linux x86_64; a fake run never
   closes a real row, and the parity report names the shared ids.
7. `just check` and `git diff --check` are green; the document is English-only
   and self-contained.

Not proven by this delivery, and therefore not frozen as working behavior:

- no event frame is sent, so the five event kinds and the `events` capability
  have no wire evidence; the merged build's advertised `true` is a deviation
  from the frozen `false`;
- `session.resize` and `daemon.orphans.verify` have no success path;
- `session.create` starts no process or PTY, so the accepted spawn
  specification, generation 1, and the content plane are not proven;
- `request_timeout_ms` is advertised but no post-handshake deadline is
  enforced, and no request-deadline vector exists (bitty#2805);
- grant expiry now bumps `state_revision` (`C-10`) but still emits no event
  (bitty#2792);
- the corpus does not pin every implemented refusal code, the expiry event, or
  a second platform cell (bitty#2605, bitty#2792);
- the daemon's independence from startup, safe mode, and the headless path
  (the `Daemon absence` control) has no test in this delivery; it is a design
  requirement, not verified behavior;
- no P0 control has the evidence set bitty#2608 requires, and nothing here
  marks a control verified.

Before this freeze is signed off:

1. Wheel and `bitty-ai` consumer review record that the adapter and fake server
   can target the frozen names and the [Wire schema](#wire-schema) with no local
   alias, that `attach_role`/`role` is the pair they serialize, that
   `session.create` is treated as registry-only, and that they do not rely on
   the `events` bit or a not-served field.
2. Independent security review records that the refusal set, the no-oracle
   rules and the live-vacant carve-out, the control relation, the token and
   bearer handling, and the deferred items weaken no P0 control (bitty#2608).
   Recorded 2026-10-29 on bitty#2664 comment 6483942309.
3. Core architecture review confirms the one-logical-registry wording, the
   revision rule, the per-method wire schema, the unserved-method dispositions,
   the dated narrowings, and the `NotRunning`/`DaemonStopping` split.
4. bitty#2605 adds the missing refusal vectors and a parity check that fails on
   a divergent fixture; bitty#2805 adds the post-handshake request-deadline
   vector if enforcement lands before sign-off.
5. bitty#2608's security reviewer confirms the PR #2794 vectors `V-37` to
   `V-41` (TTL bounds, correlation binding and revoke uniformity,
   pipelined-tail refusal, over-long `id`, and spelling aliases), the merged
   expiry vector `C-10`, and the no-`id` refusal shapes.

Definition of done for this freeze: the document is merged with an honest
status, the sign-off table records the Security sign-off dated 2026-10-29 and
the remaining unchecked boxes with the evidence each reviewer must inspect, and
`just check` is green. Implementation stays with
bitty#2790, #2791, #2792, #2805, #2806, #2608, #2605, and #2666; this document
does not authorize a listener, a transport fallback, or a consumer-side alias.

## Alternatives considered

| Alternative                                               | Trade-off                                                                                                                              | Disposition                                                                             |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Let each consumer define its own scope spelling           | No cross-repository negotiation; the corpus cannot be shared and the fake server forks expectations.                                   | Rejected; one registry and one spelling were the point of bitty#2664.                   |
| Freeze the frame layout here too                          | One document for everything; duplicates `bitty-ipc` v1 and puts a second encoding contract beside the served one.                      | Rejected; the served encoding is `bitty-ipc` v1, the names are frozen here.             |
| Freeze names only and leave field shapes to `dispatch.rs` | Less prose; every consumer keeps reading code, two adapters can disagree on a key, and a field rename becomes an unversioned break.    | Rejected; the missing per-method schema was the review defect that reopened bitty#2664. |
| Keep `events: true` with a caveat until delivery          | Matches the merged build today; makes the advertised capability disagree with the delivered surface and invites event-driven adapters. | Rejected; `1.0` freezes `false`, and `false` to `true` is additive after bitty#2792.    |
| Treat the advertised `request_timeout_ms` as enforced     | One less deferred row; claims a bound the daemon does not apply and makes a hung request indistinguishable from a slow one.            | Rejected; `Timeout` stays the accepted class and enforcement is bitty#2805.             |
| Put `session.*` in the existing `terminal.*` family       | No new vocabulary; silently grants terminal authority to an Agent client and collapses consent domains.                                | Rejected by the accepted contract; a separate family is frozen.                         |
| Make `session.host` baseline                              | Simpler create path; drops per-client spawn consent and `P0-AC-024`.                                                                   | Rejected; consent is an explicit grant consumed at negotiate.                           |
| One version number for wire and service                   | Fewer fields; cannot refuse version change and encoding change independently.                                                          | Rejected; two axes with separate owners.                                                |
| Best-effort negotiation with capability probing           | Older clients keep working; makes an incompatible change indistinguishable from an additive one and hides refusals.                    | Rejected; strict range check and explicit capabilities.                                 |
| Expose a discovery or enumerate method                    | Easier client bootstrap; becomes an existence and enumeration oracle.                                                                  | Rejected; live-lease visibility and `session.list` only.                                |
| Keep refusals as free-text messages                       | Easier debugging; untestable, leaks caller bytes, and lets a client parse meaning into a code.                                         | Rejected; static codes, counts, and limits only.                                        |

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
`session.resize` spelling, registry home, operator-capability failure code,
absent-vs-null question, `events: false` freeze, and per-method wire schema are
**resolved** and recorded above, not open.

- **`session.grant` `kind` enforcement.** The accepted text names
  `kind: observer`; the served method ignores the field under the unknown-field
  rule. The freeze tells clients to omit it. Whether a later `1.x` build may
  refuse a present `kind` other than `observer` is open, because that would
  refuse input `1.0` accepts; until a decision, the field stays ignored and
  never selects host authority.
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
4. Every served method has an exact request and result table with JSON types,
   presence, result branches, and the shared `session`, `counts`, and `limits`
   shapes; the two unserved methods have a typed refusal and no success shape;
   every not-served accepted field names its owner.
5. A version mismatch is a typed refusal before any session operation, the
   v0.2.0 capability profile is stated and freezes `events: false`, a missing
   client-side capability produces a typed client refusal or the typed worker
   refusal, and no bit is described as delivered behavior.
6. The authorization order is fixed, and every condition that must not be
   distinguishable to a client is listed with its single result, except the
   dated live-vacant-control narrowing.
7. The refusal set is closed, and no code is invented outside the accepted
   taxonomy; `Timeout` stays the accepted request-deadline class even while
   post-handshake enforcement is deferred.
8. The `1.x` additive rule and the `2.0` breaking rule are explicit, every
   deferred item names its owner, and every untraced proposal is recorded as an
   open point.
9. The dated narrowings are dated and owned, and the served-versus-accepted
   table separates a deferred optional field from a not-served behavior.
10. `terminal.*` is unchanged and never stretched; `session.*` never grants
    terminal content.
11. The document is English-only, self-contained, and free of research
    references; `just check` and `git diff --check` are green.
12. The [Sign-off](#sign-off) section records the Security sign-off dated
    2026-10-29 and three unchecked boxes with the evidence each reviewer must
    inspect; no control is marked verified.

## Sign-off

This freeze is a **candidate for sign-off**, not accepted. Only the Security
box below is checked (2026-10-29); no control is verified. A sign-off records
that the named reviewer inspected the named evidence; it is not a restatement of
a green test run.

- [ ] **Owner — Core terminal platform.** Review the frozen names and ordering
      in this document against `crates/bitty-daemon/src/service/scopes.rs`
      (six scopes, 17 methods, baseline and operator sets),
      `src/contract.rs` (`1.0`, `1.0..=1.0`, six capabilities),
      `src/handshake.rs` (request/response fields, correlation hashing, bearer
      parsing), and `src/service/dispatch.rs` (authorization order, refusal
      constructors). Confirm the document freezes only what PRs #2761, #2770,
      and #2776 serve, and that the two unserved methods are labelled rather
      than promised.
- [x] **Security.** Review the closed refusal set in `src/codes.rs`, the close
      predicate `Refusal::closes_connection`, the control relation and token
      handling in `src/service/dispatch.rs` and `src/lease/host.rs`, the grant
      store in `src/service/grants.rs`, the live-vacant-control carve-out, the
      audit and no-secret rules, and corpus vectors `V-02`, `V-09`, `V-13`,
      `V-22`, `V-33`, `C-02`, `C-07`, and `C-09`. Confirm no P0 control is
      marked verified and record the P0 evidence set required by bitty#2608.
      Signed 2026-10-29 on bitty#2664 comment 6483942309 against code
      `ea0de791` and docs `369bba18`; no P0 control is verified.
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

| Reviewer                                | Evidence inspected                                                                                                  | Status                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Owner — Core terminal platform (author) | This document; `scopes.rs`, `contract.rs`, `handshake.rs`, `dispatch.rs`; PRs #2761/#2770/#2776                     | Unchecked; required before acceptance                                              |
| Security reviewer                       | `codes.rs`, `dispatch.rs`, `lease/host.rs`, `grants.rs`; corpus V-02/V-09/V-13/V-22/V-33/C-02/C-07/C-09; bitty#2608 | Signed 2026-10-29; bitty#2664 comment 6483942309; code `ea0de791`; docs `369bba18` |
| Architecture reviewer                   | Registry and revision rule; version axes; method catalog; grant revision table; deferrals                           | Unchecked; required before acceptance                                              |
| Consumer reviewer                       | Handshake fields; scope array; role pair; capabilities; idempotency; refusals; no-alias rule                        | Unchecked; required before acceptance                                              |
| Docs curator (repository gate)          | Spine, metadata, index row, English-only, self-containment, and cross-document synchronization                      | Unchecked; required before merge                                                   |

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
- [bitty#2794](https://github.com/bitty-terminal/bitty/pull/2794) — the merged
  security-sign-off corrections (`ea0de791`): pre-auth pipelining refusal,
  over-long `id`, grant TTL and correlation digests, and the uniform revoke
  answer.
- [bitty#2790](https://github.com/bitty-terminal/bitty/issues/2790) — worker
  spawn, bind, generation 1, and the `session.resize`/content plane.
- [bitty#2791](https://github.com/bitty-terminal/bitty/issues/2791) — process
  containment, signal delivery, reaping, and orphan verification;
  [bitty#2801](https://github.com/bitty-terminal/bitty/pull/2801) is the open
  implementation PR whose head serves a parameterless count result and no
  `retire`.
- [bitty#2792](https://github.com/bitty-terminal/bitty/issues/2792) — session
  event frames pushed to subscribed connections.
- [bitty#2805](https://github.com/bitty-terminal/bitty/issues/2805) — enforce
  `request_timeout_ms` and add a request-deadline vector.
- [bitty#2806](https://github.com/bitty-terminal/bitty/issues/2806) — serve the
  accepted session and daemon metadata fields (`session.status`/`session.list`
  controller presence and pending grants, owner peer, lease scopes, heartbeat
  `server_monotonic_ms`, `daemon_pid`, uptime).
- [bitty#2605](https://github.com/bitty-terminal/bitty/issues/2605) — the shared
  conformance harness and the remaining vector coverage.
- [bitty#2608](https://github.com/bitty-terminal/bitty/issues/2608) — the
  independent security review and P0 evidence set.
- [bitty#2666](https://github.com/bitty-terminal/bitty/issues/2666) — the
  conditional release eligibility gate that consumes this freeze.
- [bitty#2783](https://github.com/bitty-terminal/bitty/pull/2783) — the
  per-family component protocol; a different surface that does not change this
  contract.
