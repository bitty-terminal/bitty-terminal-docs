---
title: Remote Session Decision
description: Accepted decision declining remote session transport for the v0.2.0 timeframe and recording the admission bar, ownership, threats, and exit trigger for any future remote access
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: false
sidebar_order: 85
---

# Remote Session Decision

## Document status

> Status: **accepted on 2026-10-27 by the project owner**. This is the remote
> ADR the accepted [Multiplexer Decision](multiplexer-decision.md) defers to and
> [bitty#2731](https://github.com/bitty-terminal/bitty/issues/2731) asks for. The
> decision is that **no remote transport is admitted now**: remote session access
> is declined for the v0.2.0 timeframe, and the bar a later proposal must clear
> is recorded below. It authorizes no code, crate, binary, service, listener,
> pairing flow, device grant, or protocol, and it claims no remote capability
> exists.

| Control          | Value                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| Status           | Accepted (2026-10-27); records a decline plus an admission bar, not a feature                                        |
| Owner            | Terminal platform runtime surface (bitty#2731, CTX-0160); the final decision is the project owner's                  |
| Issue            | [bitty#2731](https://github.com/bitty-terminal/bitty/issues/2731) — remote session ADR and authentication            |
| Upstream records | ADR 0008, ADR 0019, the Multiplexer Decision, the bittyd charter and session-host contract, and the security corpus  |
| Implementation   | None. No remote transport, listener, gateway, pairing surface, device grant, or relay client exists                  |
| Supersession     | A later accepted remote ADR that satisfies [Admission bar](#admission-bar) and states that it supersedes this record |

Accepted wording uses "must" for what this decision requires and "would" for
what a future admission must demonstrate. The document is a decision, not
evidence that any control exists.

## Purpose and scope

The accepted [Multiplexer Decision](multiplexer-decision.md) settles detach and
attach locally and records that remote access is "a separate, strictly larger
transition" that "needs its own accepted ADR under the ADR 0008 gate, before any
transport code". This record answers that open question with the fail-safe
position already recorded in the corpus: remote is refused now, and the corpus
states exactly what would have to be true before it can be admitted.

In scope: the decline and its timeframe, the supported path users have today,
ownership of a future remote surface, the transport, pairing, authorization,
end-to-end, authority, bounds, audit, and failure requirements that form the
admission bar, the threat mapping, alternatives, and the exit trigger.

Out of scope and owned elsewhere: the local detach/attach seam and its bounds
(the [Multiplexer Decision](multiplexer-decision.md) and the
[bittyd session-host contract](bittyd-session-host-contract-candidate.md));
workspace and layout identity ([Workspace Compositor](workspace-compositor.md));
agent semantics (the AI corpus); the SSH or terminal-multiplexer implementation
a user chooses to run; and any implementation, staffing, or schedule
commitment.

## Normative sources this specification must not weaken

| Source                                                                                                                                                                                                                                                                                                                                 | What it binds here                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)                                                                                                                                                                                                                 | Remote UI is never implicit in a local daemon; a remote transition needs network authentication at least as strong as mTLS with a pinned CA or SSH-tunnel trust, never an ambient bearer token; encryption in transit, replay resistance, a consent ledger per `(remote identity, AgentId)`, and a fuzzed framing corpus. |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted)                                                                                                                                                                                                   | The v0.2.0 slice is a local per-user daemon; remote UI, restart persistence, and autostart stay outside it, and no accepted local daemon scope covers a remote method.                                                                                                                                                    |
| [Multiplexer Decision](multiplexer-decision.md) (accepted)                                                                                                                                                                                                                                                                             | Option C ownership, controller-only resize, peer-credential local attach, bounded leases and snapshots, `M-03`, `M-3`, and the recorded default "no remote transport at all".                                                                                                                                             |
| [bittyd Scope Charter](bittyd-scope-charter.md) and [Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md) (draft)                                                                                                                                                                                             | Session-host floor, single-writer rule, audit and refusal records, and the v0.2.0 exclusion of remote hosts, multi-user access, and cloud execution.                                                                                                                                                                      |
| [Small-Core Capability Floor](small-core-capability-floor.md) (accepted) and [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted)                                                                                                                                                                               | Core retains Terminal Truth, PTY and process ownership, and safe mode; mechanisms never move to a plugin, and no plugin holds a PTY descriptor.                                                                                                                                                                           |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                                                                                                                                                                                               | `ViewId` is not `TerminalId`, one hosting View per Terminal, and a remote client is a client of a session, not a second View in the local layout.                                                                                                                                                                         |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), [P0 criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) (normative) | Local-user-only IPC, no default TCP listener, per-action scopes, read-only Agent default, `T-04`, `T-09`, `R-011` through `R-014`, `R-020`, `P0-AC-007`/`008`/`021`/`022`/`032`, and the rule that deferral never creates a P0 bypass.                                                                                    |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)                                                                                                                                                                                                              | Local framing, peer credentials, scope families, typed errors, and "no default TCP".                                                                                                                                                                                                                                      |
| [Remote Infrastructure and Remote Client (Candidate)](remote-infrastructure-candidate.md) (draft)                                                                                                                                                                                                                                      | Candidate transport, relay, and device-grant direction only; it satisfies no gate and grants no authority.                                                                                                                                                                                                                |
| [Documentation workflow](../docs/development/documentation-workflow.md) (normative)                                                                                                                                                                                                                                                    | Frontmatter, status meanings, English-only text, self-containment, and review ownership.                                                                                                                                                                                                                                  |

None of these sources admits a remote transport today. This decision consumes
their constraints and adds no method, scope, or listener.

## Terminology

| Term            | Meaning in this document                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Remote session  | A terminal session hosted on one machine and observed or driven from another machine over a network.                                                                        |
| Remote gateway  | A future out-of-process component that terminates the network transport, authenticates devices, and calls the local session surface with explicit scopes. It is never Core. |
| Device identity | A public key plus a host-assigned record and label, created by an explicit host-local pairing action.                                                                       |
| Pairing         | The host-local flow that binds a device identity to a grant set. It is never initiated or completed by the remote device alone.                                             |
| Admission bar   | The set of requirements in this document that a future remote proposal must demonstrate before acceptance.                                                                  |
| Relay           | Optional infrastructure that assists connection establishment or forwards opaque ciphertext; it is never required and never authoritative.                                  |
| End-to-end      | Only the paired device and the host session process hold plaintext session content; intermediaries see ciphertext and minimal metadata.                                     |
| Lease           | The bounded attach grant defined by the Multiplexer Decision; a remote lease is one more client lease, never a second session owner.                                        |
| Controller      | The single lease per session permitted to send input, resize the PTY, abort, and transfer control.                                                                          |
| Observer        | A lease that reads a bounded snapshot and events but holds no input, resize, or control authority.                                                                          |

## Decision

### No remote transport is admitted now

1. **Remote access is declined for the v0.2.0 timeframe.** The v0.2.0 slice is
   the local `bittyd` staging defined by ADR 0019 and the
   [charter](bittyd-scope-charter.md). Remote stays a post-v1.0 direction behind
   the ADR 0008 gate, as the [release ladder](../product/release-ladder.md)
   already records; this decision stages nothing later and promises no date.
2. **Nothing remote ships or is scaffolded.** No listener on any address or
   protocol (TCP, UDP, QUIC, WebSocket, or a bridged Unix socket); no `--listen`
   or `--remote` flag; no remote mode in `bittyd`; no gateway binary or package;
   no pairing, QR, or device-management surface; no device grants; no discovery
   or relay client; no remote IPC method registration.
3. **The default is denial, not a disabled switch that merely hides a listener.**
   The supported startup has no network listener, no remote-capable code path in
   the terminal core, and no remote transport in `bittyd`. Evidence for the
   decline is the absence of the surface, not a default-off configuration value.
4. **No plugin hosts a remote session listener.** A plugin's own declared network
   capability, where the plugin platform grants one, never becomes a session
   attach path; a session reachable from a plugin would make the plugin a second
   session authority.
5. **This record authorizes nothing.** The admission bar below describes
   requirements for a future accepted ADR; it is not a design, a backlog, or an
   implementation plan.

### Why denial is the correct default

Remote is a strictly larger trust transition than the local daemon: an
untrusted network reaches a gateway that reaches the session host, and every
remote feature widens what a stolen device, a hostile network, or a compromised
intermediary can do. The corpus has no accepted network identity, pairing,
device-grant, remote scope, audit, or fuzz evidence for that transition, and
ADR 0019 explicitly excludes it from the slice that does exist. Admitting a
"small" remote path — a localhost bridge, a bearer token, a plugin listener —
would create the P0 bypass ADR 0008 forbids and would make the decline look
conditional when it is not.

The honest position is therefore the one the Multiplexer Decision already
records as its fail-safe default and `M-03`'s unaccepted fallback: **no remote
transport at all**. A future proposal must earn admission against the bar
instead of inheriting authority from a local scope, a daemon acceptance, or a
plugin grant.

### What users have today

- **SSH plus a terminal multiplexer is the supported remote path.** A user who
  needs detach/attach or access from another machine runs `ssh` and a
  multiplexer such as tmux, zellij, or screen inside the remote shell. Bitty is
  then a local terminal client rendering that stream.
- **That path is ordinary terminal usage, not a Bitty remote-session feature.**
  Bitty does not authenticate the device, hold a snapshot stream, grant or
  revoke device authority, audit the remote attach, or keep a session alive on
  the host. SSH and the multiplexer own the trust boundary and the lifecycle.
- **Local surfaces stay local.** `bitty ctl`, the IPC endpoint, the future
  local attach lease, and the session file remain current-user-only; none is
  reachable over a network, and none becomes a remote stepping stone.
- **No compatibility claim is made for the SSH path.** It is supported because
  it needs nothing from Bitty beyond rendering bytes; it is not `Verified` as a
  Bitty feature and does not satisfy any part of the admission bar.

### Ownership

Remote sessions are an **extension surface**: a separate gateway component plus
a remote client. They are never Core and never a `bittyd` mode.

| Layer                | Owner                                         | Responsibility                                                                                                                                                                                                                                                         |
| -------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terminal Truth       | Core                                          | Grid, scrollback, cursor, modes, damage, and the only write path; a remote client receives bounded snapshots and deltas and never a mutable grid.                                                                                                                      |
| PTY and processes    | Core                                          | PTY ownership, child lifecycle, process and resource enforcement, and terminal identity; a remote request never creates a second PTY owner.                                                                                                                            |
| Session host         | `bittyd` (local only)                         | Leases, attach/detach, control ownership, refusal records, and bounded audit for local clients; **it gains no network listener, bind, or remote method**.                                                                                                              |
| Remote gateway       | Separate component/extension, out of process  | Transport termination, mutual authentication, pairing records, device grants, remote scope evaluation, rate limits, remote audit, reconnect, and revocation. It holds no PTY fd, grid reference, or scrollback buffer and calls only the local scoped session surface. |
| Remote client        | Separate client application/protocol consumer | Rendering, input capture, and device-side key storage; it is a client of a session, not a second View in the local layout, and may ship independently of the host.                                                                                                     |
| Device policy and UX | Extension policy                              | Which devices exist, labels, grant review, revocation UX, and presentation; Core validates bounds and never interprets device policy.                                                                                                                                  |

Three rules follow and are normative for any future design:

1. **The gateway is not Core.** Core never initiates a network connection, and
   the terminal core crates gain no network dependency. The gateway depends on
   the session surface; the dependency never reverses.
2. **`bittyd` never grows a remote mode implicitly.** A remote listener in the
   daemon would contradict ADR 0019's explicit exclusions and require its own
   accepted amendment; "the daemon is already there" is not an argument for
   network exposure.
3. **The gateway is not a plugin-host bypass.** It is not a Lua plugin, it does
   not receive plugin authority, and plugin code never runs inside the gateway
   or the transport path. Its exact packaging (an L1 extension component or an
   out-of-process native sidecar) stays open, but its trust level is fixed:
   least privilege, no PTY ownership, no ambient authority.

### Admission bar

Every row must be satisfied and recorded in a **new accepted remote ADR**,
reviewed by the security corpus as co-owner, before any transport code is
written. A row that is unproven is a refusal, not a deferred detail.

#### Transport

- **Explicit opt-in, no default listener.** Remote is disabled by default; a
  user must start the gateway deliberately with an explicit listen address.
  Startup and test evidence must show that the default build opens no network
  listener, and no code path may bind implicitly on first use.
- **No default TCP, and no localhost-TCP stepping stone.** Binding `127.0.0.1`
  as "temporarily remote" is rejected for the same reason ADR 0008 rejects it
  for the local daemon: it widens the attack surface before authentication
  exists.
- **Authenticated transport.** The network layer must authenticate the host to
  the device and the device to the host, with host identity pinned by public
  key or a pinned CA. TLS 1.3-class transport or a public-key-identified QUIC
  substrate is admissible; SSH forwarding may carry the transport when it
  authenticates both ends, but it confers no local scope and does not replace
  device grants.
- **The relay is optional, opaque, and non-authoritative.** Discovery and relay
  infrastructure must never be required, must forward ciphertext only, and must
  not be trusted for identity. A relay that terminates TLS is not admissible by
  default.
- **Bounded, versioned framing.** The wire surface must be versioned, bounded,
  and fuzzed under the same "oversized header sheds with no allocation of the
  claimed size" bar as the local framing property; a version mismatch refuses
  rather than degrades.
- **Core stays network-free.** No terminal core crate may depend on the
  transport; the gateway is the only network touchpoint in the path.

#### Pairing and authentication

- **Mutual authentication, not a bearer secret.** A device proves possession of
  a private key and the host proves possession of its pinned identity. A bearer
  token alone, a password alone, an ambient `BITTY_*` environment token, or
  "the network is trusted" is refused.
- **Pairing is host-local and explicit.** Pairing starts on the host, uses a
  short-lived single-use secret with an expiry and an attempt budget, requires
  human confirmation on the host, and records a device key plus a human label.
  A remote device cannot pair itself, silently re-pair, or extend its own grant.
- **Proof of possession per connection.** Each connection presents a
  short-lived proof bound to the channel and the device key; possession of a
  session id, lease id, or earlier proof grants nothing.
- **Replay protection.** Nonces, monotonic sequence or revision checks, and
  short-lived proofs must make replayed attach, input, resize, control, and
  revocation messages ineffective. Reconnect re-authenticates; it never resumes
  a captured stream.
- **Secrets stay out of ambient surfaces.** Device keys live in the OS keyring
  or an equivalent secret-storage tier, never in argv, environment, logs,
  audit records, or a child process.
- **Per-device revocation always exists.** A lost or retired device is revoked
  by the host, and revocation is durable before the next connection is
  accepted.

#### Authorization scopes

Remote authority is a **separate scope family**, evaluated server-side per
request. No local scope is inherited, no remote grant transits into a plugin
grant, and possession of a connection grants nothing.

| Scope family             | Grants                                                               | Default   | Notes                                                                                                               |
| ------------------------ | -------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| `remote.session.read`    | Bounded snapshot, deltas, and scrollback within the published budget | Denied    | Equivalent to local `terminal.inspect`; never raw PTY bytes.                                                        |
| `remote.session.input`   | Input bytes to one session                                           | Denied    | Controller only; never implied by read.                                                                             |
| `remote.session.resize`  | PTY resize for one session                                           | Denied    | Separate from input and controller-only; an observer letterboxes or scales locally.                                 |
| `remote.session.spawn`   | Create a session or spawn a process                                  | Denied    | High-risk, per-device, never implied; Core keeps process and resource enforcement and may refuse on its own limits. |
| `remote.session.control` | Abort, transfer control, or revoke the device's own lease            | Denied    | Never lets a device revoke another device or the host.                                                              |
| `remote.clipboard.*`     | Read or write the host clipboard                                     | Denied    | Separate read and write grants; never implied by terminal read, and OSC 52 policy still applies.                    |
| `remote.device.manage`   | Pair, relabel, grant, or revoke devices                              | Host-only | Never remote; the gateway exposes no remote method for it.                                                          |

The exact identifiers are open and belong to the future scope registry, but the
split is not: read, input, resize, spawn, control, clipboard, and device
management are independently grantable, and a grant in one never implies
another.

- **Same refusal shape.** Missing scope, unknown session, and unauthorized
  session return the same result, so a remote caller gets no existence oracle.
- **No cross-user attach.** A remote identity maps to exactly one host user and
  one grant set; it never reaches another user's sessions, regardless of
  possession of an id.
- **No runtime administration.** Remote never receives configuration write,
  plugin management, operator capability, or audit read.
- **Resize stays single-writer.** Only the controller resizes; a remote viewer
  with a different geometry never changes the PTY, exactly as the Multiplexer
  Decision fixes for local observers.

#### End-to-end expectations

- **End-to-end means the endpoints.** Only the paired device and the host
  session process hold plaintext session content. Discovery, signaling, and
  relay infrastructure see ciphertext and the minimum metadata needed to route.
- **No silent termination.** Gateway-side termination is acceptable only when
  the gateway is the host endpoint; a third-party relay terminating transport
  and re-encrypting is a different trust model and is refused by default.
- **Integrity and freshness.** Each stream is integrity protected and
  replay-protected; a reordered, truncated, or replayed frame is refused whole,
  never partially applied.
- **Rotation and revocation.** Host and device keys rotate; a rotated or
  revoked identity requires re-pairing, and a pinned-identity mismatch fails
  closed instead of prompting an insecure override.
- **Content is a snapshot, not a byte pipe.** The remote client consumes the
  bounded snapshot and damage stream; forwarding raw PTY bytes to a viewer is a
  review blocker, as ADR 0008 already records.

#### What a remote client may read and write

| Role              | Reads                                                                                     | Writes                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Remote observer   | Status, bounded snapshot and deltas, scrollback within budget, with `remote.session.read` | Nothing: no input, resize, control, abort, clipboard, or process action                                                  |
| Remote controller | The same content plus live deltas at the current revision                                 | Input with `remote.session.input`, PTY resize with `remote.session.resize`, abort, transfer, and revoke of its own lease |
| Device manager    | Device list, labels, grants, and last-seen metadata on the host                           | Pair, relabel, grant, and revoke, on the host only                                                                       |

A remote controller is still not an operator: it cannot inspect other users'
sessions, read audit, change configuration, manage plugins, or spawn a process
without the separate `remote.session.spawn` grant. A remote observer never
becomes controller by waiting, reconnecting, or sending unsolicited input.

#### Rate limits and abuse bounds

Remote reuses the accepted local ceilings rather than inventing weaker ones:

- RC-9/RC-10: `100` requests per second sustained, `200` burst, `64` pending
  requests per connection, `256` KiB frame and chunk, shed-newest with
  attribution.
- Multiplexer bounds: `8` attached clients per session default (`16` maximum),
  `256` events or `256` KiB backlog per session with explicit truncation, a
  `4` MiB attach snapshot default (`8` MiB maximum), and a `15` s lease TTL.
- Remote-specific bounds must be recorded before code: handshake and
  authentication timeouts, authentication-attempt budget with backoff and host
  notification, pairing-attempt budget, per-device and per-source connection
  caps, new-device cap, concurrent stream count, snapshot request rate, input
  rate, resize rate, total bytes per session, and idle/half-open cleanup.
- **Pre-authentication allocation is bounded.** A peer that has not
  authenticated may not cause unbounded buffering, parsing, or task creation;
  slowloris and partial-frame behavior must be covered by tests.
- **Refusal is whole.** Over-limit or malformed requests are refused without a
  partial session, partial resize, or echoed caller bytes; the refusal carries
  the limit and the observed count.

#### Audit and telemetry

- **Attributed lifecycle records.** The gateway records connect, pair, grant,
  authentication failure, attach, detach, refusal, revocation, disconnect,
  version mismatch, and identity mismatch with device id, label, session,
  revision, action, static result code, counts, and limits.
- **No content.** Audit never records terminal text, PTY bytes, input,
  clipboard, argv, environment, prompts, keys, tokens, or pairing secrets.
- **Owner-private and bounded.** The sink is owner-private (`0700` directory,
  `0600` file), bounded and rotated, reports a degraded state when it cannot
  write, and is not readable through the remote service.
- **Not remotely controllable.** A remote device cannot disable, truncate, or
  read audit; revocation and pairing events are recorded even when the request
  is refused.
- **Telemetry is off by default.** Any future telemetry is opt-in, content-free,
  and previewed before export; remote availability never enables it.
- **Consent ledger.** Per ADR 0008, a remote grant is recorded per
  `(remote identity, AgentId)` where an agent is involved, with explicit
  per-device grants and no inheritance from a local scope.

#### Failure modes

| Failure                          | Required behavior                                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network disconnect or partition  | The lease expires at its TTL (`15` s default) and the session, PTY, and processes continue. Control is vacated, never transferred implicitly; reconnect returns a snapshot at the current revision plus a bounded backlog. |
| Reconnect                        | Re-authenticate and re-evaluate scopes; never resume a captured stream, replay buffered input, or restore a stale control token.                                                                                           |
| Revocation                       | Terminate the device's leases immediately, drop pending requests, refuse new attach, keep the session running, and accept no remote override; the revocation is durable before a reconnect is honored.                     |
| Authentication failure           | Fail closed before any session lookup, leave no partial state, back off, notify the host after the attempt budget, and audit the refusal without exposing which factor failed.                                             |
| Version or identity mismatch     | Refuse the connection; no downgrade, no "trust anyway" prompt, no fallback transport.                                                                                                                                      |
| Relay or discovery failure       | Drop the connection. Never fall back to plaintext, an unauthenticated direct path, or a different relay identity without re-authorization.                                                                                 |
| Host restart or `bittyd` absence | Remote fails closed. The v0.2.0 slice has no restart survival; a remote client cannot adopt, resurrect, or migrate a process.                                                                                              |
| Clock skew                       | Bounded tolerance only; a skew that breaks freshness or replay checks refuses the connection rather than shortening the check.                                                                                             |
| Resource exhaustion              | Shed newest with attribution at the documented bound, refuse whole requests, and never abort the local session to protect the remote connection.                                                                           |
| Client crash                     | Equivalent to disconnect: the lease expires, the session continues, and no input is replayed on the next connection.                                                                                                       |

### Threats and required controls

| Threat                                 | Existing control this decision preserves                                                                                                    | Required new control before admission                                                                                                                            | Evidence gate                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Unauthenticated attach                 | No listener by default, peer-credential local attach, deny-by-default scopes, `P0-AC-021`/`022`, `T-09`                                     | Network mutual authentication, pinned host identity, pre-parse authentication, host-local pairing, no anonymous endpoint, startup no-listener proof              | Negative-auth matrix, no-listener startup scan, pairing abuse tests   |
| Session hijack, replay, or token theft | Session-scoped control token stored as a digest, lease TTL, server-side per-request scopes, single controller                               | Per-connection proof of possession, replay-resistant nonces/sequence, channel binding, re-authentication on reconnect, immediate revocation, no bearer-only flow | Replay, capture, stolen-device, and concurrent-attach vectors         |
| Clipboard or OSC leakage               | Separate OSC 52 read/write policy with consent, paste inspection, remote/unknown restrictive origin, `T-04`, `R-004`                        | Separate remote clipboard read/write grants, no clipboard in snapshots, no implicit host clipboard to a remote viewer, no remote paste bypass                    | Clipboard scope matrix, OSC 52 read/write tests, hostile-viewer tests |
| Resize, input, or connection DoS       | Controller-only resize, bounded requests and backlog, whole-request refusal, shed-newest, `15` s lease TTL                                  | Remote-specific handshake, auth, pairing, connection, stream, input, and resize budgets; pre-auth allocation bounds; slowloris and half-open cleanup             | Limit, timeout, fuzz, and backpressure suites                         |
| Plugin-mediated exfiltration           | Per-plugin VM and capability model, no PTY fd/grid/scrollback to plugins, no network for L2 by default, `T-10`, `R-006`                     | Remote grants never become plugin grants; no plugin listener; the gateway never proxies plugin traffic or widens a plugin capability                             | Capability-denial and confused-deputy tests                           |
| Relay or gateway compromise            | No relay today; no remote surface to compromise                                                                                             | End-to-end ciphertext with pinned identities, opaque relay, no relay-side TLS termination by default, gateway least privilege, no PTY ownership, revocation      | Relay-compromise, key-substitution, and gateway-pivot exercises       |
| Scope escalation or cross-user attach  | Per-action scopes, `terminal.inspect < terminal.input < terminal.manage`, equal `NotFound` for missing/unauthorized, no cross-user sessions | Separate remote scope family, no local-scope inheritance, per-device grants, host-only device management, no operator or plugin authority                        | Full scope × action matrix, cross-user and cross-device negatives     |
| Audit or metadata leakage              | Secret-minimizing traces, typed redaction, owner-private files, `T-11`, `R-014`                                                             | Content-free remote audit, bounded owner-private sink, no remote read/disable, metadata minimization at the relay                                                | Redaction and audit-content review                                    |
| Unsupported transport sneaks in        | ADR 0008 "no TCP today", ADR 0019 exclusions, no default listener                                                                           | Explicit opt-in only, no localhost-TCP bridge, single accepted transport per version, version mismatch refuses                                                   | Startup and configuration negative tests                              |

### Alternatives considered

| Alternative                                       | Trade-off                                                                                                      | Disposition                                                                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No remote transport now (this decision)           | No built-in remote UX; relies on SSH and a multiplexer                                                         | **Accepted** — matches ADR 0008/0019, `M-03`'s fail-safe, and the issue's default; the supported path still exists                                           |
| Core-owned remote listener                        | One binary and no gateway boundary; makes Core the network endpoint and breaks the network-free core direction | Rejected — widens Core's trust boundary and contradicts the ownership split                                                                                  |
| Remote mode inside `bittyd`                       | Reuses the session host; turns the local daemon into a network service                                         | Rejected — contradicts ADR 0019's explicit exclusions; requires a separate accepted amendment                                                                |
| Third-party or bundled Lua plugin provides remote | Fastest extension path; a plugin becomes a second session authority and a listener                             | Rejected now; a future gateway stays out of the plugin host, and plugin network capabilities never become attach paths                                       |
| Bearer-token pairing                              | Simple; a stolen token is full access and replay is trivial                                                    | Rejected — mutual authentication and proof of possession are required                                                                                        |
| Localhost TCP bridge as a stepping stone          | Easy local testing; widens the surface before authentication                                                   | Rejected — same reason ADR 0008 rejects it for the daemon                                                                                                    |
| Raw PTY passthrough over TLS                      | Minimal server work; pushes unbounded parsing and image decode to the viewer                                   | Rejected — the remote client consumes a bounded snapshot or damage stream                                                                                    |
| Relay-terminated TLS                              | Simpler relay and client; the relay holds plaintext and becomes a trust anchor                                 | Rejected by default — a relay forwards ciphertext only; a hosting relay is a different trust model requiring its own decision                                |
| SSH tunnel to the local IPC endpoint              | Authenticates both ends with existing tools; appears to grant "remote" cheaply                                 | Rejected as an attach path — the tunnel peer would inherit local peer authority; SSH may only carry transport to a gateway that keeps separate remote scopes |
| Admit remote now behind a default-off flag        | Would let early adopters test; surface exists before its controls and evidence                                 | Rejected — a hidden listener is still a listener; evidence for the decline is absence of the surface                                                         |

### Exit and revisit trigger

This decision stops being the answer only when **all** of the following hold,
and a new ADR that satisfies the [Admission bar](#admission-bar) explicitly
supersedes this record:

1. **Local attach exists and passes conformance.** The Core seam is accepted,
   the bittyd session-host contract is accepted, and Linux x86_64 conformance
   covers attach, detach, expiry, transfer, stale handles, and scope refusal
   (`M-1`).
2. **Remote scopes exist separately.** `session.*` and remote scope families are
   registered, and no local scope grants a remote method.
3. **The remote trust boundary is accepted.** A remote ADR records every
   admission-bar row with security-corpus co-ownership, new P0 criteria for the
   remote transition, and an explicit statement that it supersedes this record.
4. **Authentication and transport evidence exists.** Mutual authentication,
   pinned identity, replay resistance, revocation, and a fuzzed framing corpus
   have reviewable results; the default startup still opens no listener.
5. **The device-grant and audit model is accepted.** Pairing, per-device grants,
   revocation UX, content-free audit, and telemetry posture are decided and
   owned, not sketched.
6. **A product requirement funds it.** A named milestone owns the work and the
   project owner decides to revisit; this record creates no backlog item and no
   schedule.

If any gate is unmet, the position remains this decline. A defect found in the
supported SSH and multiplexer path does not create a remote requirement; it is
handled as ordinary terminal and SSH troubleshooting.

### Relationship to the Multiplexer Decision

- `M-03` remains a recorded recommendation, not an accepted transport: "SSH
  tunnel trust first behind a separate ADR; mTLS with a pinned CA later". This
  decision neither adopts nor rejects that ordering; it constrains any choice
  to the admission bar.
- `M-3` (remote attach: gateway, device grants, framing, client) stays blocked.
  Its dependency "a separate accepted remote ADR" is this record's Admission
  bar, plus the local `M-1` conformance gate.
- The default in the Multiplexer Decision's decision register — "No remote
  transport at all" — is the accepted position, not an unexercised fallback.

## Security review

This record adds no capability, listener, method, transport, or trust
transition. It is a fail-closed decline: the most restrictive admissible
posture is the accepted one, and the local-only baseline, `bitty --safe`, daemon
absence, and peer-credential attach are unchanged. No P0 criterion is weakened;
`T-09`, `R-011` through `R-014`, `R-020`, and `P0-AC-021`/`022`/`032` keep their
current required defenses.

The threat table above is the review surface for any future admission. Two
properties must survive every revision: a remote grant never becomes a plugin or
local grant, and no remote path may bypass scope evaluation, bounds, or audit.
The security corpus stays co-owner of the trust boundary per ADR 0008; a
security reviewer signs off on the admission bar before any transport code, and
again on the concrete design.

## Verification plan

For this decision:

1. Every current-state claim is checked against the corpus and recorded; drift is
   reported, not patched silently.
2. The decline, the admission bar, the ownership table, the threat mapping, and
   the exit trigger are submitted together for independent review; review
   findings are recorded, not silently patched, and the security reviewer
   confirms the admission bar covers every ADR 0008 remote-gate element.
3. The specifications index and every affected document are synchronized, and
   the document is English-only and self-contained.
4. `just check` and `git diff --check` pass.

Before any future admission, in a separate task:

1. Prove the default build opens no network listener and the gateway refuses to
   start without explicit opt-in.
2. Prove mutual authentication, pinned identity, replay refusal, revocation, and
   scope denial with negative and adversarial tests.
3. Fuzz the framing and handshake surfaces, including oversized headers,
   partial frames, and pre-authentication allocation.
4. Prove the remote path cannot reach a PTY descriptor, grid, scrollback buffer,
   plugin authority, audit sink, or another user's session.
5. Record the exact revision and evidence per the [Risk Evidence RFC](risk-evidence-rfc.md)
   before claiming anything beyond `Implemented`.

## Acceptance mapping (bitty#2731)

| bitty#2731 item                           | Where this decision answers it                                                                                                                           | Status                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Transport, no default TCP                 | [Transport](#transport): explicit opt-in, no default listener, no localhost-TCP bridge, authenticated transport                                          | Answered as a decline plus requirement                 |
| Authentication and pairing                | [Pairing and authentication](#pairing-and-authentication): mutual auth, host-local pairing, proof of possession, replay resistance                       | Answered as an admission requirement                   |
| Authorization scopes                      | [Authorization scopes](#authorization-scopes): read, input, resize, spawn, control, clipboard, host-only device management                               | Answered as an admission requirement                   |
| End-to-end expectations                   | [End-to-end expectations](#end-to-end-expectations): endpoint plaintext, opaque relay, integrity, rotation                                               | Answered as an admission requirement                   |
| What a remote client may read and write   | [What a remote client may read and write](#what-a-remote-client-may-read-and-write): observer/controller/device manager                                  | Answered                                               |
| Rate limits and abuse bounds              | [Rate limits and abuse bounds](#rate-limits-and-abuse-bounds): reuse local ceilings plus required remote bounds                                          | Answered as a requirement; exact new numbers stay open |
| Core, extension, or separate product      | [Ownership](#ownership): Core keeps Terminal Truth, PTY, and process enforcement; a separate gateway is the extension surface; never `bittyd` implicitly | Answered                                               |
| Default if undecided: no remote transport | [Decision](#decision): no remote transport is admitted now                                                                                               | Accepted                                               |
| Implementation claim                      | [Document status](#document-status) and [Decision](#decision): none exists and none is authorized                                                        | Honored                                                |

bitty#2731 closes on this accepted decision. It authorizes no child
implementation issue; filing one requires the exit trigger above.

## Affected contracts

| Contract                                                                                                                                                                                                                                                                                                                   | Effect                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [Multiplexer Decision](multiplexer-decision.md)                                                                                                                                                                                                                                                                            | Gains the remote answer it defers; `M-03` and `M-3` stay recommendations blocked on this bar; no local attach rule changes.                  |
| [Remote Infrastructure and Remote Client (Candidate)](remote-infrastructure-candidate.md)                                                                                                                                                                                                                                  | Remains candidate direction and now sits behind this admission bar; its RI-4 transport and RI-6 grants satisfy no requirement by themselves. |
| [bittyd Scope Charter](bittyd-scope-charter.md) and [Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md)                                                                                                                                                                                         | Unchanged; the no-remote exclusion is confirmed, and the daemon gains no network listener or remote method.                                  |
| [Architecture Overview](../architecture/overview.md)                                                                                                                                                                                                                                                                       | No change; the "not themselves commitments" sentence stays accurate for remote, and the ownership split keeps network out of Core.           |
| [Workspace Compositor Specification](workspace-compositor.md)                                                                                                                                                                                                                                                              | No change; a remote client is not a second hosting View, and `ViewId != TerminalId` stays fixed.                                             |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), [P0 criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) | No control changes today; any admission requires security co-owner review and new or extended P0 criteria for the remote transition.         |
| [Release ladder](../product/release-ladder.md)                                                                                                                                                                                                                                                                             | Consistent with the recorded post-v1.0 staging; no row or milestone changes.                                                                 |
| [Specifications index](README.md)                                                                                                                                                                                                                                                                                          | Gains this accepted row; no other index changes.                                                                                             |

## Open points

- The exact remote scope identifiers, their registry placement, and whether
  they reuse the `session.*` prefix.
- Whether the gateway is packaged as an L1 extension component or an
  out-of-process native sidecar, and which repository owns it.
- The first admissible transport: SSH forwarding as the cheapest authenticated
  binding versus a pinned-identity TLS or QUIC substrate.
- Device-grant storage, the pairing UX surface, and whether grants are
  per-device only or also per-session.
- Remote-specific numeric bounds (authentication attempts, connection caps,
  stream counts, and input/resize rates).
- Whether an agent identity on a remote device needs the consent ledger
  `(remote identity, AgentId)` in the first admitted version or can start with
  device-only grants; ADR 0008 requires the ledger where an agent is involved.
- Whether a hosting relay is ever admissible as a distinct trust model.

## Acceptance criteria

1. The decision states, without ambiguity, that no remote transport is admitted
   now and that remote access is declined for the v0.2.0 timeframe; no text
   implies a listener, gateway, pairing flow, or remote capability exists.
2. The admission bar covers transport, pairing and authentication, authorization
   scopes, end-to-end expectations, read/write authority, rate limits and abuse
   bounds, audit and telemetry, and failure modes, with fail-closed defaults.
3. Ownership is explicit: Core keeps Terminal Truth, PTY, and process
   enforcement; the remote gateway is a separate out-of-process component and
   never Core; `bittyd` gains no implicit remote transport.
4. Every required threat — unauthenticated attach, session hijack, clipboard or
   OSC leakage, resize or connection DoS, plugin-mediated exfiltration, and
   relay or gateway compromise — maps to an existing control or a required new
   one, with an evidence gate.
5. The supported path (SSH plus a terminal multiplexer) and the future
   extension-provided option are recorded as alternatives, and the exit trigger
   is explicit.
6. The specifications index and affected documents are synchronized; the
   document is English-only and carries no research reference; the diff contains
   no implementation claim.

## P0 Review Sign-off

| Reviewer                  | Required for                                                                               | Status                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Project initiator (owner) | The decline, the v0.2.0 timeframe, and the admission bar                                   | Accepted 2026-10-27                                          |
| Security reviewer         | Any admitted remote transport, pairing flow, device grant, remote scope, or relay          | Not required for this decline; required before any admission |
| Runtime reviewer          | The ownership split: Core, local `bittyd`, and the separate gateway                        | Pending; required before any transport design                |
| Docs curator              | Spine, metadata, index row, language, self-containment, and cross-document synchronization | Pending; this delivery is submitted for review               |

## References

- [bitty#2731](https://github.com/bitty-terminal/bitty/issues/2731) — the remote
  session ADR and authentication issue this decision answers.
- [Multiplexer Decision](multiplexer-decision.md) — the local seam, attach
  authority, `M-03`, `M-3`, and the remote deferral this record completes.
- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  and [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  — the remote trust-boundary gate and the v0.2.0 local-daemon exclusions.
- [bittyd Scope Charter](bittyd-scope-charter.md) and
  [Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md)
  — the session host that must never grow a network listener implicitly.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md),
  and [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md)
  — the normative controls and risks the admission bar extends.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  — local framing, peer credentials, scopes, and the no-default-TCP posture.
- [Remote Infrastructure and Remote Client (Candidate)](remote-infrastructure-candidate.md)
  — candidate transport, relay, and device-grant direction sitting behind this
  bar.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) and the
  [Small-Core Capability Floor](small-core-capability-floor.md) — Terminal Truth,
  PTY ownership, and the mechanism/policy split.
- [Documentation workflow](../docs/development/documentation-workflow.md) —
  frontmatter, status, language, and review policy.
