---
title: bitty-network Shared Network Crates (Candidate)
description: Candidate direction for a split network stack with a dependency-free API crate a unified runtime and policy implementation layered features and capability-gated consumers
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 62
---

# bitty-network Shared Network Crates (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document records the
> terminal-platform slice of the shared-network direction: a split
> `bitty-network-api` plus `bitty-network` crate pair with a unified
> runtime and policy core, layered features, a host-mediated Lua path,
> and capability-gated consumers. It authorizes no shipped, stable, or
> compatibility-guaranteed behavior, weakens no accepted source it
> cites, and makes no implementation claim beyond the explicitly
> labeled built-versus-not-built record below. Crate names, module
> paths, API spellings, and defaults repeated here are direction, not
> contract. The crates exist in the bitty-network repository (see the
> built-versus-not-built record below). The name `bitty-net` now names
> the native component executable that hosts the implementation out of
> process under the accepted
> [DIR-030](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)
> direction, not a crate.

## Purpose and scope

Bitty core ships network-free today, and several future consumers each
need network access: AI providers, weather-class plugins, remote
panels, and the Wheel execution direction. If each consumer wires its
own stack, the workspace does not just duplicate dependencies — it
duplicates runtimes, connection pools, DNS caches, TLS policy, and
proxy handling, with behavior drifting per consumer. This document
freezes the **terminal-platform side** of the answer — the crate
split, the unified runtime and policy core, the feature layers, the
plugin boundary, the deployment shape, and the consumer order — so
future design work starts from a stable input instead of re-litigating
the shape per consumer.

In scope (all **Candidate** unless cited otherwise):

- BN-1: the two-crate split (`bitty-network-api` plus
  `bitty-network`); plugins depend on the API crate only.
- BN-2: the unified runtime and policy core as the value of the
  shared stack.
- BN-3: the Lua path (`bitty.network`) and the manifest-to-capability
  permission model.
- BN-4: the internal layering (runtime, transport, protocol, TLS,
  DNS, policy) and which layer each consumer class uses.
- BN-5: the feature flags, all default-off.
- BN-6: the deployment shape (a `bitty-net` native component
  coprocess from the start, per DIR-030; no embedded backend and no
  daemon).
- BN-7: the L0/L1/L2 extension model and the core-network-AI
  boundary.
- BN-8: the consumer order (AI provider first, capability gating
  second, weather-class pilot plugin third).

Out of scope and owned elsewhere (pointers, not content):

- the AI provider implementations themselves (direction, `bitty-ai`
  and `bitty-ai-docs` owners);
- the Wheel execution machinery beyond its network-layer use
  (direction, `bitty-ai` owner; terminal-side consequences in the
  candidate
  [Terminal Platform Boundaries](terminal-platform-boundaries-candidate.md));
- the plugin manifest, permission-model, and registry detail beyond
  the network permission half (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md);
  direction, `bitty-plugins-docs` owner);
- the Lua harness and SDK surface spelling beyond `bitty.network`
  (accepted
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md);
  direction, `bitty-plugins-docs` owner);
- the remote trust boundary and daemon taxonomy (accepted,
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md));
- shared governance, decision, and security corpora (linked, never
  copied,
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

## Normative sources this specification must not weaken

- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (accepted): Core manages resources, state, invariants, and
  mechanisms; plugins manage behavior, policy, and user experience;
  the small-core rule keeps statusline, sidebar, and similar surfaces
  as plugins; the P0 gates stand. The network crates are host-side
  mechanism; composition stays policy.
- [Future Boundaries](../architecture/future-boundaries.md) (draft;
  recorded network-boundary sections are candidate direction): the
  recorded Core network boundary — Core never initiates network
  connections, and network exists only behind explicit transport or
  provider boundaries. The L1 network extension is one such explicit
  boundary; it does not place network dependencies in the terminal
  core crates.
- [Terminal Platform Boundaries (Candidate)](terminal-platform-boundaries-candidate.md)
  (candidate): the terminal-side execution-host and security-ceiling
  direction this record composes with; it decides nothing here.
- [Remote Infrastructure and Remote Client (Candidate)](remote-infrastructure-candidate.md)
  (candidate): the panel remote protocol and session direction whose
  transport posture BN-4 narrows to WebSocket-first.
- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`): the panel
  lifecycle contract; this note adds no lifecycle rule.
- [ADR 0008 — Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (accepted): remote UI is a strictly larger trust surface than a
  local daemon, is never implicit in a daemon acceptance, and requires
  its own trust-boundary gate. Any remote-panel use of the network
  crates sits behind that gate; this record does not reopen it.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  and [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  (normative): least-privilege capability families, sensitive-data
  handling, and the P0 gates. The security corpus co-owns any future
  network trust-boundary change.
- [DIR-030](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)
  and the
  [Native Component Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/native-component-boundary.md)
  (accepted direction): native capabilities run as independently
  installed stdio coprocesses that Core resolves without `PATH`,
  verifies by digest, spawns, and grants; BN-3 and BN-6 follow it.
- [Open-question register, OQ-085](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (open): the L0–L4 trust-level model (level 0 Core, 1 bundled Lua, 2
  third-party Lua, 3 native sidecar, 4 external tools and network) and
  the per-level capability domains including network. BN-3 adopts this
  model as candidate direction; the question stays open and current P0
  gates stay authoritative until the security corpus accepts it. This
  numbering is distinct from the BN-7 extension layers below; the two
  schemes must not be conflated.

## Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the recorded direction only; no review has accepted it.                  |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## BN-1 Two-crate split (Candidate)

**Candidate.** The shared network direction is two crates, not one:

- `bitty-network-api`: the lightweight contract surface — request, response,
  error, stream, and WebSocket API types, capability definitions, and
  the service trait. It carries zero implementation dependencies: no
  HTTP client, no TLS, no QUIC, and no runtime in its closure.
- `bitty-network`: the real implementation — runtime, transport,
  HTTP, WebSocket, TLS, DNS, and policy behind the API crate's
  service trait.

**Candidate.** Plugins depend on `bitty-network-api` only and reach
the implementation through IPC or service lookup. Plugin code never
names the implementation's dependencies: whether the backend uses a
given HTTP client, TLS library, or QUIC stack is invisible above the
API boundary, so swapping the backend never touches a plugin.

## BN-2 Unified runtime and policy (Candidate)

**Candidate.** The value of the shared stack is one runtime and one
policy, not dependency deduplication. `bitty-network` owns a single
shared async runtime for all network consumers; per-plugin private
runtimes are forbidden, so scheduling, thread counts, and shutdown
behavior stay in one reviewed place.

**Candidate.** The crate further unifies what per-consumer stacks
would each reinvent: one HTTP connection pool, one DNS cache, one TLS
session cache, proxy configured once (`HTTPS_PROXY` and `NO_PROXY`
with system-proxy and PAC inheritance under one documented
precedence), and one TLS provider (system CA store, custom CA bundle,
and client-certificate policy on a single surface).

**Candidate.** Offline-first is the default posture: failed or absent
connectivity degrades to cached or unavailable state through a typed
error, never to silent retry storms or ambient background traffic.

## BN-3 Lua path and permission model (Candidate)

**Candidate.** The Lua path is `bitty.network` (for example a
request call shape returning a handle whose response arrives as an
event) mapping onto the Core component broker, which forwards the
request with its grant to the `bitty-net` component, which dispatches
to the Rust implementation (Lua -> Core broker -> `bitty-net`, per
DIR-030). No network crate is linked into Core or exposed to the Lua
VM. A Lua plugin deals with URLs and responses only: sockets, TLS,
runtimes, certificates, and proxy settings are never visible at the
Lua layer.

**Candidate.** Permission flows from the plugin manifest: granted
`network.connect:HOST[:PORT]` capabilities name the allowed
destinations; the reference host additionally implements a
`[[network.egress]]` table, whose status as a manifest field is owned
by the plugin corpus (its manifest capability authority specification
currently classifies it as a host implementation experiment). Core
computes the per-plugin grant from those declarations, attaches it to
every request, and the component re-checks it before it moves bytes;
the component never widens it. Plugins are denied raw
`sockets` and unrestricted `connect` by construction, not by
convention — there is no plugin-reachable path to an arbitrary
endpoint outside its grant.

**Candidate.** A per-plugin by per-host traffic view (a Network
Inspector direction showing which plugin talked to which host, how
often, and how much) is future direction, not contract: it names the
audit surface the capability path must one day feed, and promises no
shape or ship vehicle here.

## BN-4 Internal layering (Candidate)

**Candidate.** `bitty-network` is not an HTTP-client wrapper. Its
layers are: shared runtime; transport (TCP, UDP, QUIC); protocol
(HTTP, WebSocket); TLS; DNS; and policy. Each consumer class enters
at its own layer:

- HTTP-class plugins consume the HTTP layer through the BN-3 path.
- Remote panels consume the transport layer (WebSocket framing now;
  see below), behind the ADR 0008 gate.
- The Wheel execution direction consumes the HTTP and WebSocket
  layers (owner-pending, `bitty-ai` owner).

**Candidate.** A future QUIC transport is direction, not contract: it
may one day serve the transport layer underneath the same session and
service model, but no endpoint identity, discovery, relay, or
migration behavior is specified here and none is promised.

## BN-5 Feature layers (Candidate)

**Candidate.** The implementation crate is factored into features —
`client`, `server`, `http`, `websocket`, `quic`, `proxy`, `oauth` —
and every feature defaults to off. Consumers compile only what they
use: the weather-class pilot needs `client` plus `http`, and that
combination must not pull the remote server path into the binary.
Enabling a feature never changes default behavior for consumers that
did not ask for it.

## BN-6 Deployment shape (Candidate)

**Candidate.** Compile-time optionality (features) is not runtime
optionality (where the implementation lives). Three shapes were
considered: compile features, a dynamically loaded network library,
and a standalone network daemon. The dynamic-library shape is
rejected: the Rust ABI is not stable enough to carry this boundary,
so a `cdylib` plugin-style split would trade a reviewed API for an
accidental one.

**Accepted direction (DIR-030).** The implementation runs out of
process from the start as the native component `net` (executable
`bitty-net`): Core resolves it from its component install root (never
`PATH`), verifies its descriptor and SHA-256 digest before every
spawn, starts it on first use as a stdin/stdout coprocess, stops it
when idle, and remains the policy authority that issues every grant.
The wire codec is the `bitty-network-wire` crate; its byte layout is
owned by the bitty-network repository. The earlier recommendation —
an embedded backend first and a future `bitty-networkd` socket daemon
later — is superseded: there is no embedded phase and no daemon. The
`bitty-network-api` surface stays the consumer contract, so plugins
never observe the deployment shape. The process, install, and
authority model is defined in the [Native Component Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/native-component-boundary.md).

## BN-7 Extension model and the hardest boundary (Candidate)

**Candidate.** The workspace grows in three extension layers:

- L0 Core: the minimal stable core with no network.
- L1 Rust Core Extensions: host-side capabilities in Rust —
  network, remote, media, and their peers.
- L2 Lua Plugins: behavior, policy, and user experience.

**Candidate.** The hardest boundary in this model is core ≠ network
≠ AI: the AI runtime holds no network stack of its own and consumes
the L1 network extension through the same API and capability path as
everyone else. (These L0/L1/L2 extension layers are a different
numbering from the OQ-085 L0–L4 trust levels cited in BN-3; a plugin
or component carries one position in each scheme.)

**Candidate.** The small-core rule is unchanged: statusline, sidebar,
and equivalent surfaces stay L2 plugins. If such a plugin wants live
network data it goes through the same `bitty.network` path with the
same manifest declaration, capability check, and audit — plugin
status confers no network privilege.

## BN-8 Consumer order (Candidate)

**Candidate.** Consumers arrive in this order, each gated on the
previous:

1. **AI provider first.** The `bitty-ai` providers are the first
   consumer (owner-pending, `bitty-ai` owner): they exercise the
   `client` plus `http` path with explicit provider configuration
   and credential handling owned by the AI corpus.
2. **Capability gating second.** The manifest allowlist, capability
   check, and audit path is accepted with security-corpus review
   before any third-party plugin may use the network. No
   weather-class plugin ships on an unreviewed gate.
3. **Weather-class pilot plugin third.** A single low-risk,
   read-only, user-visible plugin (the weather class: public HTTPS
   endpoint, no credentials, no user data transmitted) pilots the
   plugin path end to end and proves the allowlist, check, and audit
   wiring before broader plugin network use is considered.

**Candidate.** Source-host and mail classes follow only after the
pilot demonstrates the boundary; each new class is its own admission
decision with its own consent and data-handling review, never an
automatic extension of the pilot grant.

## Built versus not built

Verified 2026-10-01 against `bitty` `main`, the bitty-network
repository `main`, and the `bitty-ai` workspace. `Implemented` below means code exists; nothing below is
`Verified`, and nothing authorizes shipped or
compatibility-guaranteed behavior. The default terminal core remains
completely network-free.

| #   | Claim                                                            | State            | Evidence                                                                                                                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The `bitty` workspace carries no network dependencies by default | Implemented-only | 21 crates verified with zero default network dependencies (no HTTP client, TLS, or QUIC in default closure; `bitty-network-lua` decoupled behind optional Cargo feature `network` in `bitty-runtime`/`bitty-lua`, PR #1544 / CTX-0882); that embedded feature path is being removed under DIR-030 |
| 2   | The `bitty-ai` workspace carries no network dependencies         | Implemented-only | 2 crates verified with zero network dependencies; provider network use is future work, not present code                                                                                                                                                                                           |
| 3   | The only async-runtime use is panel-adjacent                     | Implemented-only | the single async-runtime use is `bitty-runtime` `panels_async.rs`; no shared network runtime exists                                                                                                                                                                                               |
| 4   | A `bitty-network-api` crate exists                               | Implemented-only | `bitty-network-api` exists in the bitty-network repository with request, response, error, and capability types; no `bitty` crate links it                                                                                                                                                         |
| 5   | A `bitty-network` implementation crate exists                    | Implemented-only | `bitty-network` plus `bitty-network-core`, `bitty-network-dns`, and `bitty-network-tls` exist in the bitty-network repository with default-off `http` and `websocket` features                                                                                                                    |
| 6   | A shared Tokio runtime or pooled connection state exists         | Implemented-only | runtime, DNS cache, and transport modules exist inside `bitty-network`; no cross-consumer sharing exists because no deployed consumer exists                                                                                                                                                      |
| 7   | Unified proxy or TLS-provider handling exists                    | Implemented-only | proxy handling (`HTTPS_PROXY`, `NO_PROXY`) and a TLS trust provider exist in the bitty-network crates; no PAC or system-proxy inheritance is claimed here                                                                                                                                         |
| 8   | A `bitty.network` Lua path exists                                | NOT built        | the embedded `bitty-network-lua` skeleton binding (optional `bitty` feature `network`) is being retired under DIR-030; the Lua -> Core broker -> `bitty-net` path does not exist yet                                                                                                              |
| 9   | A manifest network permission or capability check exists         | Implemented-only | `network.connect:HOST[:PORT]` capability parsing exists in `bitty-package` and the reference host reads `[[network.egress]]`; the Core broker grant intersection does not exist yet; OQ-085 stays open                                                                                            |
| 10  | A Network Inspector, component broker, or `bitty-net` exists     | NOT built        | no traffic view and no Core component broker; the `bitty-network-wire` codec and the `bitty-net` binary land under bitty-network#71; the `bitty-networkd` daemon is superseded by DIR-030 and will not be built                                                                                   |
| 11  | Any AI provider, weather-class, or remote-panel consumer exists  | NOT built        | no consumer of the shared stack is deployed                                                                                                                                                                                                                                                       |

Rows 8, 10, and 11 are the remaining gap this candidate names; rows
4–7 and 9 record code that exists but is not `Verified`. Any future RFC
that claims to close a row must cite implementation evidence in the
owning repository; this note alone closes nothing.

## Security review

This note designs no network code and records a gap; it grants no
capability, moves no trust boundary, and changes no P0 gate. The
security-sensitive content is the shape of the future gates: socket
and unrestricted-connect denial by construction for plugin contexts,
manifest allowlists checked at the API boundary, per-grant audit
entries feeding a future Inspector, one shared runtime with
per-consumer isolation and rate limits (a shared pool is also shared
fate under abuse), single-point proxy-credential handling, a unified
CA and client-certificate policy, and remote-panel authentication at
the strength ADR 0008 requires. A future implementation RFC will need
its own security review covering certificate validation, credential
storage for providers and mail-class consumers, timeout and retry
ceilings, audit retention and redaction, and the `bitty-net`
component's digest verification, grant re-check, wire bounds, and
process sandboxing (the sandboxing follow-up named by DIR-030); that
review is an acceptance gate for the successor, not for this note.

## Verification plan

1. `just check` green (format, markdownlint, links, metadata,
   language, agents, hygiene, svg) — the Docs quality workflow is the
   merge gate for this docs-only repository.
2. Built-versus-not-built rows re-checked against `bitty` `main` and
   the `bitty-ai` workspace at review time: the zero-network-dependency
   closures, the single `panels_async.rs` async use, the existing
   bitty-network crates, and the absence of the broker Lua path, the
   component broker, the wire codec, and the `bitty-net` binary. Any drift becomes a revision of the
   table, never a silent claim.
3. Independent reviewer confirms candidate status is unmistakable, the
   two-crate naming is used consistently (`bitty-net` names only the
   component executable), QUIC transport and the Inspector are stated
   as direction rather than contract, the coprocess deployment cites
   DIR-030, no research-process reference
   leaked in, no normative wording leaked in, and cross-links point at
   canonical documents rather than duplicating them.

## Alternatives considered

- **One crate instead of two.** Rejected: a single crate puts
  implementation dependencies in every consumer's closure, so plugins
  observe backend choices and the out-of-process deployment in BN-6
  becomes a breaking change. The API crate is what makes the backend
  swappable and the plugin side stable.
- **Each consumer wires its own stack.** Rejected: AI providers,
  weather-class plugins, remote panels, and Wheel would each carry a
  runtime, pool, DNS cache, TLS policy, and proxy handling,
  multiplying audit surface and guaranteeing behavior drift. One
  reviewed runtime-plus-policy core is cheaper to secure than four
  unreviewed ones.
- **Network in the default closure.** Rejected: it breaks the
  network-free L0 invariant, forces every user to carry socket and
  TLS code, and widens the default attack surface for users who never
  enable a network consumer. The default stays offline.
- **Plugin-side sockets with advisory policy.** Rejected: convention
  cannot confine execution contexts. Denial by construction through a
  host-mediated API plus manifest allowlist is the only boundary the
  capability model can audit, so direct plugin sockets are refused
  outright.
- **Dynamic library for the implementation.** Rejected: the Rust ABI
  is not stable, so the library boundary would freeze accidents
  instead of the reviewed API surface. The implementation runs out of
  process as the `bitty-net` coprocess (DIR-030), never through a
  `cdylib`.
- **Embedded backend first, `bitty-networkd` daemon later.**
  Superseded by DIR-030: an embedded phase links network code into
  Core, and a socket daemon adds discovery, authentication, and
  cross-instance state that a per-instance stdio coprocess avoids.
- **QUIC transport now.** Rejected as the initial posture: endpoint
  identity, discovery, relay, and migration are undecided direction,
  and specifying them here would promise what no review has accepted.
- **Defining the full network RFC here.** Rejected: the API method
  surface, timeout and retry ceilings, certificate policy detail,
  proxy precedence detail, the per-level capability table, and the
  component wire protocol belong to successor RFCs with implementation
  evidence and security-corpus review. This note fixes only the
  architecture those documents assume.

## Affected contracts

None changed. This candidate is consumed (not yet) by the `bitty-ai`
provider direction (owner-pending, `bitty-ai-docs` owner) for the AI
consumer, the candidate
[Remote Infrastructure and Remote Client](remote-infrastructure-candidate.md)
for panel transport, and the accepted
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
for the manifest and permission-model half of BN-3; it restates,
without altering, the accepted [Panel Runtime RFC](panel-runtime-rfc.md),
[Core and Plugin Boundaries](../architecture/core-boundaries.md), the
draft [Future Boundaries](../architecture/future-boundaries.md), and
[ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md).
Acceptance of a successor RFC would reference this note; it would not
retroactively normativize it.

## Open points

1. The `bitty-network-api` method surface and error taxonomy (which
   calls, which typed offline and denied shapes, streaming versus
   request-response) — owned by the future network RFC, not decided
   here. The wire protocol v1 byte layout is owned by the
   bitty-network repository.
2. The per-level OQ-085 network-domain table (which domains each
   trust level may hold) and its mapping onto the L0/L1/L2 extension
   layers — owned by the security corpus with the capability-gating
   successor, not decided here.
3. Consent-record shape and audit retention and redaction policy —
   owned by the capability-gating successor with security-reviewer
   sign-off.
4. Proxy precedence detail beyond unified handling (per-host
   exceptions, authenticated proxies, credential storage) — owned by
   the future network RFC.
5. Timeout, retry, rate-limit, and cache-size ceilings per consumer
   class — owned by the future network RFC with measurement evidence.
6. WebSocket messages over the component wire protocol, the registry
   install source for components, and per-platform component
   sandboxing — follow-ups named by DIR-030; cross-instance sharing is
   not provided.
7. Whether the weather-class pilot admits polling, push, or both, and
   its refresh budget — owned by the pilot proposal, not decided here.

## Acceptance criteria

1. The document is `draft` candidate status with no normative,
   shipped, stable, or compatibility-guaranteed wording.
2. BN-1 states the two-crate split with the zero-implementation-dependency
   API crate and plugin dependence on the API only.
3. BN-2 states the unified runtime and policy core (shared runtime,
   pool, DNS and TLS caches, one-time proxy, unified TLS provider)
   as the value of the stack.
4. BN-3 states the `bitty.network` Lua path, the manifest allowlist
   to capability-check flow, socket denial by construction, and the
   Inspector as future direction.
5. BN-4 states the runtime-plus-transport-plus-protocol layering that
   is not an HTTP-client wrapper, with each consumer class at its
   layer and QUIC as direction, not contract.
6. BN-5 states the feature flags with every default off and the
   weather pilot compiling `client` plus `http` only.
7. BN-6 states the rejected dynamic library and the DIR-030
   `bitty-net` coprocess deployment from the start, with the embedded
   phase and the `bitty-networkd` daemon superseded.
8. BN-7 states the L0/L1/L2 extension model, the core ≠ network ≠ AI
   boundary, and the small-core rule, without conflating the OQ-085
   numbering.
9. BN-8 states the AI-provider-first, capability-gating-second,
   weather-pilot-third order with later classes individually gated.
10. The built-versus-not-built table is present, records the existing
    bitty-network crates and the missing broker, codec, and
    `bitty-net` binary, and claims nothing beyond `Implemented`-only.
11. `just check` passes; the document is registered in the
    Specifications index draft table.

## P0 Review Sign-off

Not applicable: no security boundary, capability, resource ceiling, or
trust decision changes. The security review above records that
disposition, including the shared-runtime isolation, certificate,
proxy-credential, rate-limit, audit, component-integrity, and
remote-authentication questions flagged for the successor network
RFCs. Those successors will require owner and security-reviewer
sign-off before acceptance.

## References

- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`Accepted`) — ownership tables, the small-core rule, and P0 gates.
- [Future Boundaries](../architecture/future-boundaries.md) (`Draft`)
  — the recorded Core network boundary this direction composes with.
- [Terminal Platform Boundaries (Candidate)](terminal-platform-boundaries-candidate.md)
  (`Draft`) — terminal-side execution-host and security-ceiling
  direction.
- [Remote Infrastructure and Remote Client (Candidate)](remote-infrastructure-candidate.md)
  (`Draft`) — the panel remote protocol and session direction.
- [Panel Runtime RFC](panel-runtime-rfc.md) (`Accepted`) — panel
  lifecycle contract this note must not weaken.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  (`Accepted`, `bitty-plugins-docs`) — manifest and permission-model
  contract BN-3 composes with.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (`Accepted`, `bitty-ai-docs`) — local-surface concepts the
  remote-panel posture composes with.
- [Native Component Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/native-component-boundary.md)
  (accepted direction DIR-030, `bitty-docs`) — the component process,
  install, and authority model BN-6 adopts.
- [Open-question register, OQ-085](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (`Open`, `bitty-docs`) — the L0–L4 trust-level and capability-domain
  model BN-3 adopts as direction.
- [ADR 0008 — Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (`Accepted`, `bitty-docs`) — the remote trust-boundary gate BN-4
  sits behind.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  (`bitty-docs`) — normative security sources.
