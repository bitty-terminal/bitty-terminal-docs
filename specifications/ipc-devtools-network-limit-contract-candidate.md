---
title: IPC, DevTools, and Network Limit Contract
description: Accepted contract fixing debug-scope implication accepted peer proof per-connection principal session and consent endpoint rate ownership the Windows commitment network redirect transfer deadline and proxy bounds typed failure vocabulary and plugin control transaction semantics
category: specifications
audience: security-reviewer
document_type: specification
status: accepted
website_publish: false
sidebar_order: 88
---

# IPC, DevTools, and Network Limit Contract

## Document status

> Status: **accepted** (`bitty-terminal-docs#122`, `#123`, `#203`, `CTX-0191`).
> The independent security review that
> [documentation-workflow](../docs/development/documentation-workflow.md)
> requires for trust boundaries, resource limits, and IPC/MCP/DevTools content
> is recorded under [Security review](#security-review), and the dispositions
> for `LQ-1`..`LQ-6` are recorded under [Open questions](#open-questions).
>
> This record answers the seven questions in
> [bitty-terminal-docs#123](https://github.com/bitty-terminal/bitty-terminal-docs/issues/123)
> and freezes the parent DevTools/IPC/network security contract in
> [bitty-terminal-docs#122](https://github.com/bitty-terminal/bitty-terminal-docs/issues/122)
> (including the DevTools RFC reconciliations in
> [bitty-terminal-docs#203](https://github.com/bitty-terminal/bitty-terminal-docs/issues/203))
> as **one** contract instead of separate notes, because the subjects share
> three mechanisms (peer proof, connection identity, refusal vocabulary).
>
> Where a bound exists in merged code it is labelled `implemented` with its
> `file:line`; where a clause records the accepted normative rule that governs
> cross-surface interpretation it is labelled `accepted`. An `implemented`
> mechanism and an `accepted` contract rule are tracked explicitly so
> verification campaigns can audit each obligation against its code citation.

## Purpose and scope

Seven limit questions were asked at once and answered in seven places, alongside
parent security-contract items covering plugin control transactions and DevTools
wire/version reconciliation. Left separate, the same `100 req/s` figure appeared
as a per-connection budget in one code path and an endpoint-wide budget in
another, the Windows transport was described as both "plan" and "implemented",
and the network bounds were described as "open" while the numbers were compiled
into `main`.

In scope:

- **C-1** what a debug scope does and does not imply about IPC scopes.
- **C-2** what counts as an accepted peer proof on each platform cell.
- **C-3** the per-connection principal, session, and consent lifecycle.
- **C-4** who owns the rate bucket, and therefore what aggregate rate a surface
  actually enforces.
- **C-5** what is committed for Windows, and what is not.
- **C-6** network redirect, transfer, deadline, and proxy bounds.
- **C-7** the typed failure vocabulary and the rule that keeps it closed.
- **C-8** the order in which these controls compose.
- **C-9** transactional plugin suspend, resume, and disposal control semantics.

Out of scope, owned elsewhere and linked rather than copied:

- The 54-row compiled limit table itself, its `{effective, default,
system_max}` triples, and the enforcement-stage order: accepted, owned by the
  [bittyd Session-Host Contract](bittyd-session-host-contract.md) (`D-14`) and
  compiled in `bitty` `crates/bitty-daemon/src/limits.rs:251-306`. This record
  reproduces only the eight inherited transport rows, because those are the
  rows that can drift from their `bitty-ipc` source.
- The per-method wire schema and the served-versus-accepted table: accepted,
  owned by the [bittyd IPC Contract](bittyd-ipc-contract.md).
- The debug protocol method set, its redaction rules, and the automation
  bearer's UX: accepted plus `Implemented-only` amendments, owned by the
  [DevTools RFC](devtools-rfc.md).
- Plugin-runtime budgets `RC-1`..`RC-5` and the queue/drop policies: accepted,
  owned by the
  [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
- Whether the network profile is accepted at all (`CC-02`): open, owned by the
  successor network safety specification that does not exist yet.

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  (normative): invariant 5, "IPC is local-user-only by default and every
  operation has an explicit scope"; invariant 7, "every untrusted input has
  size, time, nesting, rate, and memory limits appropriate to its protocol".
  Every clause below is an application of those two invariants and may not
  relax either.
- [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted):
  `D-07` peer capture, `D-08` pid-is-informational, `D-09` grants, `D-14` the
  limit table, `D-15` the platform cells, `D-16` audit before mutation.
- [bittyd IPC Contract](bittyd-ipc-contract.md) (accepted): the authorization
  order, the closed refusal set, and the closing-versus-keeping refusal split.
- [DevTools RFC](devtools-rfc.md) (accepted): the three debug scopes, the rule
  that a session begins with zero debug scopes, and the `Implemented-only`
  Amendment A1 methods that read terminal state.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (accepted, `OQ-018`): the transport bounds `RC-9`/`RC-10` inherit from, and
  the MCP/Agent read-only default.
- [bitty-network Shared Network Crates (Candidate)](bitty-network-candidate.md)
  (draft): `CC-02`..`CC-06`. This record supplies the numbers `CC-02` asks for
  and closes none of its rows.

## Status vocabulary

| Label         | Meaning in this document                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implemented` | The named code path exists on the cited revision and enforces the stated shape. Not `Verified`: no independent campaign has confirmed it against a hostile peer. |
| `accepted`    | The normative cross-surface contract rule fixed by `bitty-terminal-docs#122`, `#123`, and `#203` following independent security review (`CTX-0191`).             |
| `deferred`    | A post-0.1.0 enhancement or downstream consumer obligation explicitly excluded from the 0.1.0 live claim, with an owner and fail-closed 0.1.0 boundary stated.   |

## Clause status summary

| Clause | Subject                                                | Status                                                                                                                    |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| C-1    | Debug-scope implication                                | `accepted` + `implemented` (`devtools-rfc.md` scope table reconciled in `CTX-0191`)                                       |
| C-2    | Accepted peer proof                                    | `accepted` + `implemented` on Linux and macOS/FreeBSD refusal; `implemented` library + `accepted` refusal on Windows      |
| C-3    | Principal, session, and consent                        | `accepted` + `implemented`                                                                                                |
| C-4    | Endpoint rate ownership                                | `accepted` + `implemented` (two-bucket rule: DevTools per-endpoint `100 req/s`, `bittyd` per-connection `16 × 100 req/s`) |
| C-5    | Windows commitment                                     | `accepted` (0.1.0 live commitment is Unix-only `servable = false`; named-pipe library implemented, daemon deferred)       |
| C-6    | Network redirect/transfer/deadline/proxy               | `accepted` + `implemented` for concurrency/size/deadline/proxy bounds; host bridge owns per-consumer rate limiting        |
| C-7    | Typed failures                                         | `accepted` + `implemented`                                                                                                |
| C-8    | Composition order                                      | `accepted` + `implemented`                                                                                                |
| C-9    | Plugin suspend, resume, and disposal control semantics | `accepted` + `implemented` (`devtools-rfc.md` `debug.control` transactional per `(PluginId, generation)`)                 |

## C-1 Debug-scope implication

**Rule.** A debug scope implies no IPC scope, and an IPC scope implies no debug
scope. A method that reads terminal state requires **both** its debug scope and
the terminal scope of every terminal it can reach, evaluated server-side. A
consent grant covers exactly one scope and never the scope beside it.

**Implemented.** `bitty-ipc` `crates/bitty-ipc-api/src/scope.rs:23` states the
transport rule, "`debug` scopes are fully distinct from IPC scopes until
explicit elevation", and `:25` states that "elevation is per-client, per-scope,
and ledgered". The scope registry holds 15 scopes across seven families
(`scope.rs:40`), with `process.spawn` always separate (`scope.rs:15`).

The consuming side is stricter than "distinct", not looser: the terminal-reading
debug methods (`getSnapshot`, `getGridText`, `getInputRing`, `getModifiers`,
`getFocus`) require a debug scope **and** `terminal.inspect`, and a
client-supplied `terminalId` cannot select a looser capability entry
([DevTools RFC](devtools-rfc.md), implementation note for `bitty` CTX-0792,
PR #1515). The capability map is clamped to the session's scopes at open and on
every revocation, so it can only narrow what the connection holds:
`bitty-ipc` `crates/bitty-ipc-devtools/src/ctl.rs:406` (`open_connection`),
`:520` (`grant_scope`), `:596` (`revoke_scope`).

The five consentable scopes are `debug.inspect`, `debug.trace`,
`debug.control`, `terminal.inspect`, and `terminal.input`
([DevTools RFC](devtools-rfc.md), automation-bearer scoping). Each is granted
and revoked individually through the consent ledger (`ctl.rs:520`, `:596`,
`:617`), so a `debug.inspect` consent is not a `terminal.inspect` consent.

**Accepted.** One implication table, normative for every surface:

| Held scope         | Implies                                        | Does not imply                                       |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------- |
| `debug.inspect`    | nothing                                        | `debug.trace`, `debug.control`, `terminal.inspect`   |
| `debug.trace`      | nothing (it is not a superset in the registry) | `debug.inspect`, `debug.control`, `terminal.inspect` |
| `debug.control`    | nothing                                        | `debug.inspect`, `debug.trace`, `terminal.inspect`   |
| `terminal.inspect` | nothing                                        | `terminal.input`, `terminal.manage`, any debug scope |
| `ai.inspect`       | nothing                                        | `ai.invoke`                                          |

The [DevTools RFC](devtools-rfc.md) per-scope table has been updated in
`CTX-0191` (`LQ-1` resolved) to state independent scopes rather than a superset
ladder (`debug.trace` requires its own grant and does not confer
`debug.inspect`; `debug.control` requires its own grant and does not confer
`debug.inspect` or `debug.trace`).

## C-2 Accepted peer proof

**Rule.** A peer is accepted only when the transport proves **same local user**
at accept time and can **re-prove it before every privileged action**. A uid
comparison alone is not an accepted proof, because a pid can be reused; the
capture must carry a value that a recycled process cannot reproduce. A proof is
bound to one accepted connection and cannot be replayed onto another.

**Implemented (Linux).** `bitty` `crates/bitty-daemon/src/peer.rs:7-13` fixes
the accepted mechanism: `SO_PEERCRED` for uid/gid/pid, the peer's `/proc` start
time, and a user-namespace comparison; a uid that matches only through a user
namespace or container mapping is `Unauthenticated` (`D-15`), never success.
`:24` records why: "the pid alone is informational (`D-08`) because it can be
reused; the start time is what makes the check meaningful".

The proof is a type, not a boolean: `bitty-ipc`
`crates/bitty-ipc-auth/src/auth.rs:126` (`VerifiedPeer`, private fields,
constructible only through `verify_peer_for_connection` at `:183`), and
`bitty-ipc-devtools` `crates/bitty-ipc-devtools/src/devtools/serve.rs:372`
(`ConnectedPeerProof`) adds the accepted stream's `dev`/`ino` identity
(`bitty-ipc-auth` `crates/bitty-ipc-auth/src/peer.rs:9-60`) plus a recheck
closure. `serve.rs:1735` (`serve_bound_connection_with_endpoint_budget`) refuses
before any byte is served when the proof does not match the accepted stream, and
`ServeContext::recheck_before_read` re-verifies the live peer against the bound
identity.

**Implemented (refusal).** macOS and FreeBSD are refused rather than served
with a weaker check. `bitty` `crates/bitty-daemon/src/platform.rs:15-22`: macOS
has `LOCAL_PEERCRED`/`LOCAL_PEERPID` but no process start time in the safe API,
and FreeBSD's `xucred` has no pid at all, so both cells answer
`Denied/UnsupportedPlatform`. `peer.rs:17` states the rule explicitly: "A
weaker check is never substituted."

**Implemented (Windows, library).** `bitty-ipc-auth`
`crates/bitty-ipc-auth/src/auth.rs:219` (`verify_windows_peer_for_connection`)
compares the pipe client's token SID with the runtime user's SID and refuses on
mismatch; `bitty-ipc-devtools` `crates/bitty-ipc-devtools/src/devtools/serve.rs:1760`
reads the client pid and `:1779`
(`serve_bound_pipe_connection_with_endpoint_budget`) serves a bound pipe under
the same endpoint budget. The proof also pins the retained connection handle
(`serve.rs:380-385`), so two connections from one process share a pid but never
an identity.

**Accepted.** The per-platform acceptance bar as a single normative table:

| Cell           | Accepted proof                                          | Re-proof                  | Status                                                                 |
| -------------- | ------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| Linux          | uid + gid + pid + `/proc` start time + user-ns          | every privileged dispatch | `accepted` + `implemented`                                             |
| macOS          | would need uid + pid + start time; no start time exists | —                         | refused (`accepted` + `implemented`)                                   |
| FreeBSD        | would need a pid; `xucred` has none                     | —                         | refused (`accepted` + `implemented`)                                   |
| Windows        | client pid + token SID equality                         | every bound-pipe read     | `implemented` in `bitty-ipc`; refused (`servable = false`) in `bittyd` |
| Any other cell | none                                                    | —                         | refused (`accepted`)                                                   |

**Accepted disposition (`LQ-2`).** On Linux, `SO_PEERCRED` + `/proc/<pid>/stat`
start time + user-namespace inode check combined with per-dispatch re-verification
against the bound `(dev, ino)` stream identity (`ServeContext::recheck_before_read`)
is accepted for `0.1.0`: any pid recycling during the accept window produces a
start-time mismatch on the re-verification check before a privileged method can
execute. Optional `SO_PEERPIDFD` hardening is `deferred` post-0.1.0 without
blocking the Linux cell.

## C-3 Per-connection principal, session, and consent

**Rule.** Identity is server-minted, never client-asserted, and never shared
between connections. Every connection has one principal, one session, and one
consent generation; any consent change advances the generation, which voids
every authorization snapshot and bearer minted under the previous one.

**Implemented.** `bitty-ipc`
`crates/bitty-ipc-devtools/src/ctl.rs:132-140` defines `ConnectionIdentity`
(`principal_id`, `session_id`, `consent_generation`) and states that the
identifiers are minted from one process-wide, non-reusing counter so "two
connections can never share a session and a bearer or queued control bound to
one connection cannot be satisfied by another". `:406` mints the pair at accept;
`:520` and `:596` bump the generation on grant and revoke; `:617` ends the
session; `:653` (`ConnectionGrant`) revokes on drop, so the authority and its
bearers cannot outlive the connection (`serve.rs:504-509`). The live session
count is bounded at `MAX_AUTHORITY_SESSIONS = 64` (`ctl.rs:112`), above the
transport's 16-connection cap so the accept-path shed is what a normal overload
hits.

The daemon side has the same shape with different names: `bitty`
`crates/bitty-daemon/src/service/grants.rs:1-30` fixes one record shape for
host-consent and observer grants — a 256-bit bearer delivered once, a non-secret
128-bit `grant_id`, the authenticated peer uid the grant is bound to, an
optional session, and a TTL from `D-14`. Single use is enforced by retiring the
bearer on first consume, and a missing, expired, consumed, revoked,
wrong-session, or wrong-peer grant is **one** `Unusable` refusal so a probe
cannot learn a grant's state. The handshake consumes at most one host grant
(`crates/bitty-daemon/src/handshake.rs:18`), and a grant that cannot be consumed
adds no scope rather than closing the connection.

**Accepted.** Two cross-surface rules:

1. A connection's consent generation is part of its authorization identity. A
   refusal or audit record that depends on consent evaluates the live
   `consent_generation` so a stale-snapshot denial cannot be confused with a
   static scope denial.
2. A bearer is bound to exactly one `(session, principal, consent_generation,
target, method_family)` tuple. Widening any element requires a new mint,
   never a mutation of the existing one.

## C-4 Endpoint rate ownership

**Rule.** A rate bound is only meaningful with its **owner** stated: per
connection, per principal, or per endpoint. Two surfaces that quote the same
figure with different owners enforce different aggregate rates, and a document
that quotes the figure without the owner is ambiguous by construction.

**Implemented, two owners.** The same `RC-9` figures (100 req/s sustained, 200
burst) are enforced by two different bucket owners:

| Surface                       | Bucket owner              | Evidence                                                                                                                |
| ----------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `bittyd` service endpoint     | one bucket per connection | `bitty` `crates/bitty-daemon/src/service/server.rs:947-975` (limiter built in `accept_peer`), checked at `:1437`        |
| DevTools/`bitty ctl` endpoint | one bucket per endpoint   | `bitty-ipc` `crates/bitty-ipc-devtools/src/devtools/serve.rs:1703-1721` (`endpoint_admit`), used by `:1735` and `:1779` |

The figures themselves are not duplicated by hand. `bitty-ipc`
`crates/bitty-ipc-core/src/limits.rs:15-29` is the source
(`RC9_REQ_PER_SEC = 100`, `RC9_BURST_PER_SEC = 200`, `RC9_MAX_CONNECTIONS = 16`,
`RC9_WINDOW_MS = 1_000`), and the daemon's eight inherited transport rows are
compiled copies that are fixed, not configurable
(`bitty` `crates/bitty-daemon/src/limits.rs:298-305`; `is_fixed` at `:361`;
a differing override is `LimitsError::FixedLimit` at `:646-655`). The copies
agree row for row today:

| Advertised row                 | Daemon value | `bitty-ipc` source                       |
| ------------------------------ | ------------ | ---------------------------------------- |
| `max_frame_bytes`              | 262144       | `frame.rs:20` (`256 * 1024`)             |
| `max_chunk_bytes`              | 262144       | `limits.rs:34` (`RC10_CHUNK_CEILING`)    |
| `max_pending_requests`         | 64           | `channel.rs:38`                          |
| `max_channel_capacity`         | 256          | `channel.rs:35`                          |
| `max_request_rate_per_sec`     | 100          | `limits.rs:15`                           |
| `max_request_burst`            | 200          | `limits.rs:18`                           |
| `max_connections_per_endpoint` | 16           | `limits.rs:26`                           |
| `max_request_payload_bytes`    | 1048576      | `limits.rs:23` (`RC9_PAYLOAD_CAP_BYTES`) |

**Consequence of the split, stated as arithmetic.** A `bittyd` client can open
up to 16 connections, each admitted at 100 req/s sustained, so the endpoint's
aggregate admission ceiling is 16 × 100 = 1600 req/s. The DevTools endpoint's
aggregate ceiling is 100 req/s regardless of how many connections it accepts.

**Accepted (`LQ-3` resolved).** The two-bucket rule is accepted for `0.1.0`:

1. The **DevTools/`bitty ctl` endpoint** enforces an **endpoint-wide** bucket of
   `100 req/s` sustained (`200` burst) across all accepted connections.
2. The **`bittyd` service endpoint** enforces a **per-connection fairness
   bucket** of `100 req/s` sustained (`200` burst) combined with the hard
   `max_connections_per_endpoint = 16` cap, bounding its aggregate admission
   ceiling at `16 × 100 = 1600 req/s` (`3200` burst).
3. A surface that enforces a per-connection bucket states its aggregate ceiling
   as `max_connections_per_endpoint × max_request_rate_per_sec` (`1600 req/s`
   for `bittyd`), never `100 req/s` unqualified.

**Implemented (shedding).** Exceeding the connection cap sheds the **newest**
connection, preserving service for established clients: `bitty-ipc`
`crates/bitty-ipc-core/src/limits.rs:208-224`
(`check_connection_cap`, `Denied/ConnectionLimit`, "shed newest") and `bitty`
`crates/bitty-daemon/src/service/server.rs:713-722` (accept loop drops the new
stream once the live count reaches the cap). DevTools publishes the same cap
through `max_connections()` (`serve.rs:2172`).

## C-5 Windows commitment

**Rule.** When Windows IPC is served, it uses **one** mechanism only: a named
pipe with a current-user-only DACL, remote clients rejected at the pipe layer,
and client pid plus token SID equality as the peer proof. There is no fallback
to TCP, to an abstract namespace, or to a lower-integrity pipe. For the `0.1.0`
release line, the live daemon and `bitty ctl` commitment is **Unix-only**
(`servable = false` on Windows in `bittyd`); the daemon refuses the Windows cell
fail-closed rather than serving it without a native-runner conformance campaign.

**Implemented (library).** `bitty-ipc`
`crates/bitty-ipc-winpipe/src/pipe.rs:14` (`MAX_SID_BYTES = 68`), `:18`
(`MAX_PIPE_NAME_CHARS = 256`), `:22` (`ACCEPT_POLL = 20 ms`), and the SID parser
at `:36-58`, which rejects a value that is not revision 1 with a 0..=15
subauthority count and an exact `8 + 4 * count` length. The pipe itself is
created with the SDDL `O:<sid>D:P(A;;GA;;;<sid>)` — owner is the current user
and the DACL is protected and grants only that user
(`crates/bitty-ipc-winpipe/src/ffi.rs:249-252`), with
`PIPE_REJECT_REMOTE_CLIENTS` set so a remote client is refused by the kernel
rather than by policy (`ffi.rs:325`). Creation then attests the endpoint it just
made: a null (allow-all) DACL, a foreign owner, a deny/inherited/non-SID entry,
or a SID other than the current user all fail closed
(`ffi.rs:363-443`). `bitty-ipc-auth`
`crates/bitty-ipc-auth/src/auth.rs:219` performs the SID comparison.
`bitty-ipc-devtools`
`crates/bitty-ipc-devtools/src/devtools/serve.rs:1779` serves a bound pipe under
the endpoint budget with the peer proof described in C-2.

**Implemented (refusal).** `bitty` `crates/bitty-daemon/src/platform.rs:23-30`
records the daemon's position: "Windows has a designed named-pipe transport but
no implementation in this slice", the cell is `servable = false`, and the
mechanism it names is `\\.\pipe\bittyd-<SID>` with a current-user-only DACL,
remote clients rejected at the pipe level, `GetNamedPipeClientProcessId` plus
token SID comparison, and fail-closed SID/AppContainer/integrity mismatches.

**Accepted (`LQ-4` and `bitty-terminal-docs#203` resolved).** The Windows
obligation table for `0.1.0`:

| Obligation                                          | Satisfied by                                                | Status                  |
| --------------------------------------------------- | ----------------------------------------------------------- | ----------------------- |
| Pipe name and DACL are per-user, never machine-wide | `bitty-ipc-winpipe` listener (`ffi.rs:249-252`, `:363-443`) | `implemented` (library) |
| Peer proof is SID equality, never pid alone         | `verify_windows_peer_for_connection` (`auth.rs:219`)        | `implemented` (library) |
| Remote clients are refused at the pipe layer        | `PIPE_REJECT_REMOTE_CLIENTS` (`ffi.rs:325`)                 | `implemented` (library) |
| Proof is bound to one connection and cannot replay  | `ConnectedPeerProof` handle identity (`serve.rs:380-385`)   | `implemented` (library) |
| `0.1.0` daemon/client live endpoint                 | `servable = false` (`Denied/UnsupportedPlatform`)           | `accepted` (Unix-only)  |
| Live Windows daemon + native-runner campaign        | Post-0.1.0 platform milestone                               | `deferred`              |

## C-6 Network redirect, transfer, deadline, and proxy limits

**Rule.** Every network bound is stated with its unit, its scope (one hop, one
request, one connection, or one process), and whether a caller may narrow or
widen it. A bound that a caller can widen is not a bound.

### Redirects

**Implemented.** `bitty-network` `crates/bitty-network/src/http.rs:179`
(`MAX_REDIRECT_HOPS = 5`) bounds followed hops per request. The shared clients
never follow redirects themselves (`Policy::none`, `http.rs:641`); each hop is
canonicalized to one absolute destination and re-authorized against the
capability (host, port, method) before anything is sent (`http.rs:844-850`). A
denied hop returns the typed denial and the destination is never contacted; a
chain longer than the bound fails closed with `NetworkError::Offline`
(`http.rs:847`). `303` rewrites the follow-up to `GET` with an empty body and
drops the stale entity headers (`http.rs:186`, `:189`, `:204`); other redirect
statuses preserve method and body. Cross-origin hops drop exactly
`authorization`, `proxy-authorization`, `cookie`, and `cookie2`
(`STRIPPED_CROSS_ORIGIN_HEADERS`, `http.rs:197`); same-origin hops forward every
header.

### Transfer

**Implemented.** `DEFAULT_MAX_BODY_BYTES = 8 MiB`
(`http.rs:169`) is the mandatory ceiling; a caller's `max_body_bytes`
(`bitty-network-api` `crates/bitty-network-api/src/lib.rs:816`) can only narrow
it (`effective_body_limit` takes the minimum, `http.rs:944`). The declared
`Content-Length` is checked first, so no body bytes are read when it already
exceeds the cap, and the body then streams through a capped sink; an over-long
body fails closed with `NetworkError::Budget` rather than being buffered or
truncated (`http.rs:56-62`).

Across the component wire, `bitty-network`
`crates/bitty-network-wire/src/lib.rs:96` (`MAX_FRAME_BYTES = 256 KiB`), `:111`
(`MAX_BODY_CHUNK_BYTES = 192 KiB`), `:119` (`MAX_REQUEST_BODY_BYTES = 8 MiB`),
`:99` (`MAX_IN_FLIGHT = 64`), `:102`/`:105` (64 headers, 16 KiB total), `:108`
(8 KiB URL), and `bitty-net` `crates/bitty-net/src/lib.rs:82`
(`OUTBOUND_QUEUE_FRAMES = 2 × MAX_IN_FLIGHT = 128`), with the in-flight limit
clamped rather than trusted at `:659`.

WebSocket budgets are transport-enforced: `crates/bitty-network/src/websocket.rs:108`
(1 MiB frame), `:117` (4 MiB message), `:126` (16 MiB aggregate), `:134` (65536
frames), `:142` (16384 messages), `:150` (write buffer `2 ×` message = 8 MiB),
`:91` (30 s default timeout), `:100` (10 s close timeout).

### Deadline

**Implemented.** `DEFAULT_REQUEST_TIMEOUT = 30 s` (`http.rs:143`) bounds every
request unless the caller overrides it per request (`http.rs:818`). The bound
covers the **whole** exchange including followed redirect hops, so a chain of
slow hops cannot multiply the caller's budget; each hop is sent with the time
remaining, never a fresh one (`http.rs:49-53`). An expired deadline always
surfaces `NetworkError::Timeout { after }` (`bitty-network-api`
`crates/bitty-network-api/src/lib.rs:274-277`), including when the proxy or the
origin stalls.

Adjacent deadline bounds that a reader must not confuse with it: DNS resolution
uses `DEFAULT_DNS_TIMEOUT = 5 s` (`crates/bitty-network-dns/src/lib.rs:127`) and
caches at most `DNS_CACHE_MAX_ENTRIES = 128` entries with at most
`MAX_DNS_ADDRS = 16` addresses per answer (`:146`, `:133`); CONNECT heads are
bounded at 16 KiB with 64 KiB of permitted leftover
(`crates/bitty-network/src/transport.rs:40`, `:46`).

### Proxy

**Implemented.** Reqwest's ambient system/PAC discovery is disabled on every
client regardless of feature, so no unselected variable or platform proxy can
bypass the decision (`http.rs:40-46`). Proxy selection is explicit: an override
URL, or environment variables when the `proxy` feature is enabled, with
`HTTP_PROXY` for `http`/`ws`, `HTTPS_PROXY` for `https`/`wss`, `ALL_PROXY` as
fallback, uppercase preceding lowercase (`http.rs:31-33`, `:146-157`). A
configured proxy that cannot be parsed or carries userinfo is rejected before a
client is built: `with_proxy` returns `NetworkError::Offline`, and an invalid
environment route makes the service fail closed for **every** request instead of
silently switching to direct egress (`http.rs:44-46`, `:505-507`).
`NO_PROXY`/`no_proxy` matching is case-insensitive: an exact entry, a
leading-dot entry that covers subdomains (`.example.com` covers
`api.example.com` but not `example.com`), or `*`; an entry carrying a port never
matches a bare host (`http.rs:1371-1390`). The proxy decision is re-evaluated
per hop (`http.rs:83-85`).

### Per-consumer rate limiting

**Accepted (`LQ-5` resolved).** `bitty-network` is the transport/protocol
bounds layer: it enforces concurrency (`MAX_IN_FLIGHT = 64`,
`OUTBOUND_QUEUE_FRAMES = 128`), size (`8 MiB` body, `256 KiB` frame, `16 MiB`
WebSocket aggregate), hop (`5` redirects), and deadline (`30 s` total request,
`5 s` DNS) bounds. Per-consumer request-rate limiting belongs to the **host
capability bridge layer** (such as the Lua/agent host bridge) before a consumer
can enter `bitty-network`, and no document may describe `bitty-network` itself
as a rate limiter until a host-bridge or successor network-safety contract adds
an explicit rate bucket (`bitty-network-lua` remains an unshipped skeleton).

## C-7 Typed failures

**Rule.** Every refusal is typed, static, and countable. No refusal carries
caller bytes. A refusal names the limit and the observed count, never the
content that exceeded it.

**Implemented.** Three closed vocabularies, each owned by one layer:

| Layer         | Type           | Shape                                                                                                                                                                                        | Evidence                                                      |
| ------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Transport     | `IpcError`     | 21 variants; `FrameTooLarge`/`PayloadTooLarge` carry `limit`+`actual`, `Denied` carries a stable code and a static reason                                                                    | `bitty-ipc` `crates/bitty-ipc-api/src/error.rs:57-187`        |
| Transport     | `ErrorClass`   | 11 classes mapping variants onto the RFC taxonomy (`framing`, `channel`, `transport`, `timeout`, `validation`, `scope`, `unauthenticated`, `denied`, `not_found`, `unavailable`, `internal`) | `error.rs:11-34`                                              |
| Service       | `RefusalCode`  | 32 static codes with a snake-case audit spelling and a PascalCase wire spelling                                                                                                              | `bitty` `crates/bitty-daemon/src/codes.rs:56-88`              |
| Network       | `NetworkError` | 6 variants: `Denied{domain}`, `Offline`, `Timeout{after}`, `Budget{limit_bytes}`, `CountBudget{limit_items}`, `Tls{reason}`                                                                  | `bitty-network` `crates/bitty-network-api/src/lib.rs:265-303` |
| Configuration | `LimitsError`  | 4 variants: `AboveSystemMax`, `BelowFloor`, `FixedLimit`, `DuplicateOverride`                                                                                                                | `bitty` `crates/bitty-daemon/src/limits.rs:476-509`           |

Four rules make the vocabulary closed in practice:

1. **Open codes at the transport, closed set at the service.** `Denied` codes
   are open-ended strings, so adding one extends no enum and needs no RFC
   revision (`bitty-ipc` `crates/bitty-ipc-api/src/refusal.rs:15-16`). The
   daemon deliberately narrows that to its 32 static codes and maps unknown
   conditions to `Internal` with a static spelling
   (`crates/bitty-daemon/src/codes.rs:1-10`). Both statements are true; a
   reader who takes either as the other will mis-scope a change.
2. **Counts and bounds only.** `AgentRefusal` variants carry `limit`/`actual`
   pairs or nothing, so transporting or logging a mapped error cannot leak
   caller input (`refusal.rs:32-38`).
3. **A refusal carries the enforced value.** `LimitRefusal` is
   `(limit, effective, actual)` and can only be built for a limit whose stage
   actually refuses (`crates/bitty-daemon/src/limits.rs:553-596`, `:735-741`).
   Content-plane, retention, and deadline limits prune, collect, or expire and
   must never be turned into a refusal (`:179-192`).
4. **No credential confusion.** A downstream provider-credential refusal is
   `Denied/ProviderAuth`, never `Unauthenticated`, because the latter is the
   transport peer verdict and conflating them misdirects incident response
   (`refusal.rs:61-87`).

**Accepted.** The cross-surface naming rule: a refusal code names the
**control** that refused (`RateLimited`, `PayloadCap`, `ConnectionLimit`,
`ScopeViolation`, `ConsentRequired`), never the subsystem that noticed it, so
the same control reads identically on the transport, service, and network
surfaces.

## C-8 Composition order

**Rule.** Peer proof precedes admission, admission precedes rate, rate precedes
version, version precedes the handshake gate, and scope precedes any mutation.
No later stage runs after an earlier refusal, and a refusal applies nothing.

**Implemented.** The two orders agree:

1. `bitty` `crates/bitty-daemon/src/limits.rs:21-68` fixes twelve enforcement
   stages in ascending order, from `ConnectionAdmission` through `Deadline`,
   and states that a stage "must not mutate the protected structure before the
   stage that owns the limit has passed".
2. `bitty` `crates/bitty-daemon/src/service/server.rs:1424-1450` shows the wire
   order: version check, then the negotiate-only gate **ahead of** the rate
   limiter "so an unnegotiated connection cannot consume a rate budget before
   the handshake", then `limiter.check`, then envelope parsing.
3. `bitty-ipc` `crates/bitty-ipc-devtools/src/devtools/serve.rs:1723-1757`
   states that peer proof and rate admission are independent controls: "neither
   substitutes for the other", and the function refuses before either is
   consulted if the proof does not hold.

**Accepted.** The order as one normative sequence: **proof → caps → rate →
version → handshake → scope → limit → mutation**, with refusal at any step
leaving the previous state intact.

## C-9 Plugin suspend, resume, and disposal transaction semantics

**Rule.** Every `debug.control` plugin lifecycle mutation
(`bitty.debug/suspendHandler`, `bitty.debug/resumePlugin`,
`bitty.debug/disposeGeneration`) is transactional per `(PluginId, generation)`
and bound to the originating connection's `(principal_id, session_id,
consent_generation)`. A queued control action re-verifies the live session and
consent generation at drain time before mutating plugin state.

**Implemented and Accepted (`bitty-terminal-docs#122`, [DevTools RFC](devtools-rfc.md)).**

1. **Scope and identity binding.** Enqueuing or draining any of the three
   methods requires `debug.control` (`bitty-ipc-devtools/src/ctl.rs:132-140`,
   `:520`, `:596`). If `debug.control` is revoked, the consent generation
   advances, or the session ends before the control queue drains, the pending
   action is rejected at drain time with no plugin state change.
2. **Idempotent per-generation transitions.**
   - `suspendHandler` transitions the target handler on `(PluginId, generation)`
     to suspended; subsequent dispatches to that handler are skipped and
     counted as dropped until resumed or disposed. Repeating `suspendHandler`
     on an already-suspended handler of the same generation is a no-op returning
     the current suspended state.
   - `resumePlugin` restores suspended handlers on `(PluginId, generation)` only
     when that generation is still active; it never resurrects a disposed or
     superseded generation.
   - `disposeGeneration` atomically tears down all handlers, subscriptions,
     timers, and UI/statusline registrations owned by `(PluginId, generation)`
     and increments the active generation counter so any in-flight callback or
     queued control targeting the old generation fails closed with a stale-generation
     refusal.
3. **Audit before mutation.** Every control transition records an audit entry
   naming `(principal_id, session_id, consent_generation, plugin_id, generation,
action)` before the state transition is applied (`D-16`).

## Conformance examples

Each row is a protocol or limit case a conformance corpus can execute. The
"expected" column is the typed outcome, not prose.

### Valid

| #    | Case                                                                                  | Expected                                                       | Basis                         |
| ---- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| V-1  | One frame with a 262144-byte payload                                                  | accepted                                                       | `frame.rs:20`, `:47`          |
| V-2  | A logical request of 1 MiB split into four 256 KiB chunks                             | accepted as an RC-10 sequence                                  | `limits.rs:23`, `:34`, `:242` |
| V-3  | `timeout_ms = 30000`                                                                  | accepted (at the ceiling)                                      | `channel.rs:50`, `:129`       |
| V-4  | 64 concurrent pending requests                                                        | accepted                                                       | `channel.rs:38`, `:512`       |
| V-5  | The 16th concurrent connection                                                        | accepted                                                       | `limits.rs:26`, `:213`        |
| V-6  | A debug client holding `debug.inspect` **and** `terminal.inspect` calls `getSnapshot` | accepted for terminals its capability map covers               | DevTools RFC, CTX-0792 note   |
| V-7  | A network request whose caller sets `max_body_bytes = 1 MiB`                          | accepted; the 1 MiB cap wins over the 8 MiB default            | `http.rs:944`                 |
| V-8  | A 5-hop redirect chain                                                                | accepted, each hop re-authorized                               | `http.rs:179`, `:847`         |
| V-9  | `NO_PROXY=.example.com` and a request to `api.example.com`                            | proxied bypassed (direct egress)                               | `http.rs:1371-1390`           |
| V-10 | A configuration override that lowers `max_sessions` to 4                              | accepted (`effective` 4, `default` 16, `system_max` 64)        | `limits.rs:635-679`           |
| V-11 | `suspendHandler` with `debug.control` and matching `(session_id, consent_generation)` | accepted; target handler on `(PluginId, generation)` suspended | C-9, `ctl.rs:132-140`, `:520` |

### Invalid

| #    | Case                                                                          | Expected                                                       | Basis                                                               |
| ---- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| I-1  | A frame declaring 262145 bytes                                                | `FrameTooLarge { limit: 262144 }`, refused before allocation   | `frame.rs:88-130`                                                   |
| I-2  | A logical payload of 1 MiB + 1 without chunking                               | `Denied/PayloadCap`, rejected whole, no partial parse          | `limits.rs:180-191`                                                 |
| I-3  | `timeout_ms = 0` or `30001`                                                   | `InvalidRequest`                                               | `channel.rs:129-133`                                                |
| I-4  | A 65th pending request                                                        | `PendingLimitExceeded { limit: 64 }`                           | `channel.rs:512-518`                                                |
| I-5  | A 17th concurrent connection                                                  | the new stream is dropped (shed newest)                        | `server.rs:713-722`                                                 |
| I-6  | 201 requests in one second on one connection                                  | `Denied/RateLimited`, no token consumed, connection stays open | `limits.rs:115-130`, `bittyd-ipc-contract.md` closing-refusal table |
| I-7  | A second `daemon.negotiate`                                                   | `Denied/AlreadyNegotiated`, connection closes                  | `server.rs:1430-1440`                                               |
| I-8  | A debug client holding only `debug.inspect` calls `getSnapshot`               | scope refusal for the missing `terminal.inspect`               | C-1                                                                 |
| I-9  | A consent grant for `debug.inspect` used to read terminal text                | refused: one grant, one scope                                  | `ctl.rs:520`, C-1                                                   |
| I-10 | A 6-hop redirect chain                                                        | `NetworkError::Offline`, destination never contacted           | `http.rs:847`                                                       |
| I-11 | A response body of 8 MiB + 1                                                  | `NetworkError::Budget { limit_bytes }`, not truncated          | `http.rs:56-62`                                                     |
| I-12 | A proxy URL carrying userinfo                                                 | `NetworkError::Offline`, no client built                       | `http.rs:44-46`                                                     |
| I-13 | `NO_PROXY=example.com:8080` and a request to `example.com`                    | **not** bypassed; the port-bearing entry never matches         | `http.rs:1371-1390`                                                 |
| I-14 | A configuration override that raises `max_frame_bytes`                        | `LimitsError::FixedLimit { fixed: 262144 }`                    | `limits.rs:646-655`                                                 |
| I-15 | A configuration override naming `max_sessions` twice                          | `LimitsError::DuplicateOverride`                               | `limits.rs:639-643`                                                 |
| I-16 | A macOS daemon endpoint accept                                                | `Denied/UnsupportedPlatform`, no weaker check                  | `platform.rs:15-22`                                                 |
| I-17 | A queued `suspendHandler` drained after `consent_generation` advances/revokes | refused at drain time; plugin handler state unchanged          | C-9, `ctl.rs:596`                                                   |

## Dated narrowings and synchronized prose

This record changes three existing statements. Each change is recorded here so
a reader of the older document can find the newer reading without diffing
history.

1. **[bitty-network Shared Network Crates (Candidate)](bitty-network-candidate.md)
   `CC-02`** said the successor specification "sets no redirect, transfer, or
   deadline value". That is still true of an accepted `bitty-network` architecture
   promotion, but false of merged code and of this limit contract: every bound
   in C-6 is compiled in `bitty-network` `main` and accepted here as the
   numeric ceiling.
2. **[bitty-network Shared Network Crates (Candidate)](bitty-network-candidate.md)
   Open point 5** assigned "timeout, retry, rate-limit, and cache-size ceilings
   per consumer class" to a future network RFC. Timeout, transfer, and cache
   ceilings have code values cited and accepted in C-6; per-consumer rate
   limiting is assigned to the host capability bridge layer (`LQ-5`).
3. **`TODO.md`** listed `#122`, `#123`, and `#203` as pending. With the
   DevTools RFC reconciliations (`#203`), the `LQ-1`..`LQ-6` dispositions, the
   `C-9` plugin control transaction rules, and the independent security review
   recorded below, all three issues are closed (`CTX-0191`).

Two documents were checked and need no change: the
[bittyd Session-Host Contract](bittyd-session-host-contract.md) and the
[bittyd IPC Contract](bittyd-ipc-contract.md) quote the same transport figures
(256 KiB frame, 256 KiB chunk, 64 pending, 256 channel capacity, 100/200 rate,
16 connections, 1 MiB payload, shed-newest). The eight-row comparison in C-4
confirms the compiled copies agree; if a future revision moves a figure in
`bitty-ipc-core`, that table is the check that catches the drift.

## Open questions

All six open questions from the draft candidate (`LQ-1`..`LQ-6`) are resolved:

| ID   | Question                                                                                     | Resolution (`CTX-0191`)                                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LQ-1 | Does the DevTools RFC's per-scope ladder mean "grant confers" or "client shown both grants"? | **Resolved (`accepted`).** [DevTools RFC](devtools-rfc.md) per-scope table updated to state independent scopes (`debug.trace` and `debug.control` do not confer `debug.inspect`).         |
| LQ-2 | Does the Linux peer capture move to `pidfd`/boot-id atomicity?                               | **Resolved (`accepted`).** `SO_PEERCRED` + `/proc` start time + user-ns check with per-dispatch stream `(dev, ino)` recheck is accepted for `0.1.0`; `SO_PEERPIDFD` is post-0.1.0.        |
| LQ-3 | Does `bittyd` add an endpoint-wide rate bucket?                                              | **Resolved (`accepted`).** Two-bucket rule accepted: DevTools enforces `100 req/s` per endpoint; `bittyd` enforces `100 req/s` per connection across `16` connections (`1600 req/s` cap). |
| LQ-4 | Who owns the Windows native-runner campaign, and when?                                       | **Resolved (`accepted`).** `0.1.0` live daemon/client commitment is Unix-only (`servable = false` on Windows); named-pipe library is implemented, live Windows daemon is post-0.1.0.      |
| LQ-5 | Does the network stack gain per-consumer rate limiting?                                      | **Resolved (`accepted`).** `bitty-network` enforces concurrency/size/hop/deadline bounds; per-consumer rate limiting belongs to the host capability bridge layer.                         |
| LQ-6 | Which surface owns the canonical limit table once `CC-02` is accepted?                       | **Resolved (`accepted`).** `D-14` (`bittyd-session-host-contract.md`) owns daemon limits; C-4 and C-6 here own cross-repo transport parity and `bitty-network` protocol ceilings.         |

## Security review

**Completed (`CTX-0191`, independent security review `APPROVE`).** Each of the
seven review questions required by
[documentation-workflow](../docs/development/documentation-workflow.md) is
answered in the negative:

1. **Can a client obtain a scope it was not granted, by combining a debug
   method, a capability map entry, and a consent bearer? (C-1, C-3)** — **No.**
   Debug and IPC scopes are independent in `bitty-ipc-api/src/scope.rs:23-25`;
   terminal-reading debug methods require both `debug.inspect` and
   `terminal.inspect` server-side; capability maps are clamped to live session
   scopes on open and revocation (`ctl.rs:406`, `:520`, `:596`); and each
   consent grant covers a single scope and advances `consent_generation` on
   change.
2. **Can a peer proof be replayed onto another connection, or survive a pid
   reuse? (C-2, LQ-2)** — **No.** `VerifiedPeer` (`auth.rs:126`) and
   `ConnectedPeerProof` (`serve.rs:372`) bind the peer's `/proc` start time and
   user namespace (or Windows token SID + connection handle) to the accepted
   stream's `(dev, ino)` identity and re-verify before privileged reads
   (`ServeContext::recheck_before_read`).
3. **Can one local user exceed the aggregate rate the contract advertises?
   (C-4, LQ-3)** — **No.** The contract explicitly states the bucket owner per
   surface: `100 req/s` (`200` burst) endpoint-wide on DevTools (`serve.rs:1703`)
   and `100 req/s` (`200` burst) per connection across at most `16` concurrent
   connections (`1600 req/s` aggregate ceiling) on `bittyd` (`server.rs:713`,
   `:947`, `:1437`).
4. **Does any Windows path fall back to a weaker transport or a weaker proof?
   (C-5)** — **No.** `bitty-ipc-winpipe` enforces `O:<sid>D:P(A;;GA;;;<sid>)`
   with `PIPE_REJECT_REMOTE_CLIENTS` and post-creation DACL attestation
   (`ffi.rs:249-443`), while `bittyd` sets `servable = false` on Windows and
   refuses with `Denied/UnsupportedPlatform` (`platform.rs:23-30`).
5. **Can a network consumer exceed the transfer, hop, or deadline bound by
   chaining requests, hops, or connections? (C-6, LQ-5)** — **No.** Redirects
   are capped at `MAX_REDIRECT_HOPS = 5` with per-hop capability
   re-authorization and shared remaining deadline (`http.rs:49-53`, `:179`,
   `:844-850`), response bodies are capped at `min(caller, 8 MiB)` via a
   streaming sink (`http.rs:56-62`, `:944`), and in-flight requests are clamped
   to `MAX_IN_FLIGHT = 64` (`bitty-net/src/lib.rs:659`).
6. **Does any refusal carry caller bytes, credential material, or a value that
   distinguishes "absent" from "wrong"? (C-7)** — **No.** Refusals carry only
   static codes and `(limit, effective, actual)` counts (`limits.rs:553-596`,
   `refusal.rs:32-38`), and invalid/missing/expired/revoked grants collapse to a
   single `Unusable` verdict (`grants.rs:1-30`).
7. **Does any limit get evaluated after the structure it protects is mutated?
   (C-8, C-9)** — **No.** Enforcement stages run strictly before mutation
   (`limits.rs:21-68`, `server.rs:1424-1450`), and queued `debug.control`
   plugin actions re-verify live `(session_id, consent_generation)` at drain
   time and audit before mutating plugin state (C-9).

## Verification plan

1. `just check` in this repository (format, markdownlint, links, metadata,
   language, agents, hygiene, svg) is the merge gate for this docs-only change.
2. Every `file:line` citation is checked against the cited revisions:
   `bitty-ipc` `b960e46`, `bitty` `b5145675`, `bitty-network` `e5d8677`. A moved
   line is a citation fix, not a contract change; a moved **value** is a
   contract revision and needs its own record.
3. The C-4 eight-row comparison is re-run whenever a `bitty-ipc-core` constant
   changes, because the daemon copies are fixed and cannot follow silently.
4. The conformance examples (`V-1`..`V-11`, `I-1`..`I-17`) are executable by a
   corpus; a row that cannot be made to fail on a deliberate mutation is not a
   test.

## Affected contracts

| Document                                                                        | Effect                                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md)                 | No change. Supplies `D-07`/`D-08`/`D-09`/`D-14`/`D-15`/`D-16`.                             |
| [bittyd IPC Contract](bittyd-ipc-contract.md)                                   | No change. Supplies the authorization order and closing-refusal split.                     |
| [DevTools RFC](devtools-rfc.md)                                                 | Synchronized in `CTX-0191` (`#122`, `#123`, `#203`): `LQ-1`, `DEV-022`/`DEV-023`, framing. |
| [bitty-network Shared Network Crates (Candidate)](bitty-network-candidate.md)   | `CC-02` and Open point 5 narrowed with C-6 numeric bounds and `LQ-5` host-bridge split.    |
| [bittyd Session-Host Promotion Record](bittyd-session-host-promotion-record.md) | Unchanged; its transport restatement stays correct under C-4.                              |

## Acceptance criteria

1. The document is `accepted` status with explicit distinction between
   `accepted` contract rules, `implemented` code paths, and `deferred`
   post-0.1.0 items.
2. Each of the seven #123 subjects has its own clause (`C-1`..`C-7`), plus the
   composition rule (`C-8`) and plugin control transaction semantics (`C-9` for
   `#122`), and no clause restates another.
3. Every numeric bound carries a `file:line` citation to the revision it was read
   from; no value is invented.
4. Every `LQ-1`..`LQ-6` question has a recorded accepted disposition.
5. The eight inherited transport rows are compared against their `bitty-ipc`
   source, so a drift is detectable in one table.
6. The conformance example set contains valid and invalid cases for protocol,
   limit, scope, rate, redirect, transfer, deadline, proxy, and plugin control
   behaviour.
7. The affected prose statements in [DevTools RFC](devtools-rfc.md) and
   `TODO.md` are updated in the same change.
8. `just check` passes.
9. The independent security review answering questions 1–7 is recorded in
   [Security review](#security-review).

## References

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  (normative): invariants 5 and 7.
- [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted):
  peer capture, grants, the `D-14` limit table, and the `D-15` platform cells.
- [bittyd IPC Contract](bittyd-ipc-contract.md) (accepted): authorization order
  and the closed refusal set.
- [DevTools RFC](devtools-rfc.md) (accepted): debug scopes, redaction, and the
  `Implemented-only` A1 methods.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (accepted, `OQ-018`): the inherited transport bounds and the MCP/Agent
  read-only default.
- [Isolation Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  (accepted): plugin budgets that are not this contract's bounds.
- [bitty-network Shared Network Crates (Candidate)](bitty-network-candidate.md)
  (draft): `CC-02`..`CC-06`.
- [Documentation workflow](../docs/development/documentation-workflow.md)
  (normative): status meanings, the security-review requirement, and
  self-containment.
