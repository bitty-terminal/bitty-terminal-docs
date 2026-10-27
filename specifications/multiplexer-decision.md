---
title: Multiplexer Decision
description: Accepted decision for the built-in multiplexer story - Core and extension seam, bittyd as the session host, attach authority, bounded persistence, session limits, remote deferral, and owner decisions
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: false
sidebar_order: 83
---

# Multiplexer Decision

## Document status

> Status: **accepted on 2026-10-26 by the project owner**, choosing Option C
> (Core/extension seam). This is the design bitty#2218 asked for: whether
> detach/attach, persistence, and remote sessions are a Core mechanism, an
> extension, or a seam; whether a server is needed; and what the attach trust
> boundary is. It authorizes no code, daemon, crate, or transport by itself;
> implementation scopes are listed below and remain separately gated.

| Control          | Value                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Status           | Accepted (2026-10-26), authorizes the seam boundary but no code                                  |
| Owner            | Terminal platform runtime surface (bitty#2218, CTX-0155); final decision is the project owner's  |
| Issue            | [bitty#2218](https://github.com/bitty-terminal/bitty/issues/2218) — built-in multiplexer story   |
| Upstream records | ADR 0008, ADR 0014, ADR 0015, ADR 0016, ADR 0019, bittyd session-host contract and scope charter |
| Implementation   | None. No seam, session manager, dedicated server, or remote transport exists                     |
| Promotion gate   | Satisfied 2026-10-26 for the decision; `M-01` through `M-06` stay open with fail-safe defaults   |

Accepted wording uses "must" for what the decision requires. It remains not
evidence that a control exists; implementation is tracked separately.

## Purpose and scope

Bitty covers the **layout half** of multiplexing: workspaces, splits, stack and
overlay, zoom, and a versioned snapshot that restores layout after a restart. The
**session half** is missing: a shell that survives its client, a second client
that binds to it, a live session that survives a restart, and access from another
machine.

In scope: which layer owns detach and attach; whether the multiplexer rides the
`bittyd` candidate; the attach authority and content boundary; what persistence
stores; bounds; follow-up scopes; and the owner decisions that block acceptance.

Out of scope and owned elsewhere: terminal behavior and rendering; workspace and
panel semantics (Core, ADR 0014); the `bittyd` wire surface and lifecycle (its own
contract); agent semantics (AI corpus); and any implementation or schedule
commitment.

## Normative sources this specification must not weaken

| Source                                                                                                                                                                                                                                                                                                                                 | What it binds here                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)                                                                                                                                                                                                                 | Daemon taxonomy, single PTY ownership, session-grained attach/detach, bounded persistence, contained failure, and both trust-boundary gates.                                                                                                                                                                                                  |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted)                                                                                                                                                                                                   | Local per-user daemon staging, v0.2.0 exclusions (no restart persistence, no remote), daemon absence, and #2218's own scope.                                                                                                                                                                                                                  |
| [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md) and [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md) (accepted)                     | Retained Core mechanisms; everything above them is an extension through public, capability-gated interfaces. [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md) additionally keeps workspace lifecycle and layout in Core, with presentation plugin-only. |
| [Small-Core Capability Floor](small-core-capability-floor.md) (accepted)                                                                                                                                                                                                                                                               | Terminal Truth, PTY/process ownership, safe mode never reading stored state, and the 200-line-per-pane scrollback restore.                                                                                                                                                                                                                    |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md) (accepted)                                                                                                                                                                                                                                                            | Mechanism versus policy, no plugin in terminal/render/input hot paths, and no plugin-held PTY descriptor.                                                                                                                                                                                                                                     |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                                                                                                                                                                                               | `Instance -> Window -> Workspace -> LayoutTree -> View`, `ViewId != TerminalId`, one hosting View per Terminal.                                                                                                                                                                                                                               |
| [Panel Runtime RFC](panel-runtime-rfc.md) (accepted)                                                                                                                                                                                                                                                                                   | Panel lifecycle and the current save/restore status; the persistence contract stays `RFC-OQ-9`.                                                                                                                                                                                                                                               |
| [bittyd Scope Charter](bittyd-scope-charter.md) (draft)                                                                                                                                                                                                                                                                                | Session-host floor, layout/presentation exclusion, extensions never talk to `bittyd`, no restart persistence.                                                                                                                                                                                                                                 |
| [bittyd Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md) (draft)                                                                                                                                                                                                                                          | Identity, leases, control ownership, scopes, bounds, and the no-persistence and no-remote exclusions this decision depends on.                                                                                                                                                                                                                |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), [P0 criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) (normative) | Local-only transport, per-request scopes, read-only Agent default, `T-09`, `R-011` through `R-014`, and P0 evidence.                                                                                                                                                                                                                          |
| [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) (accepted)                                                                                                                                                                                                              | Local framing, peer credentials, scope families, error taxonomy, and no default TCP.                                                                                                                                                                                                                                                          |
| [Documentation workflow](../docs/development/documentation-workflow.md) (normative)                                                                                                                                                                                                                                                    | Frontmatter, status meanings, English-only content, self-containment, and review ownership.                                                                                                                                                                                                                                                   |

Two accepted sources use different words for one split: the floor says session
save/restore is Core-owned, while the boundary table lists saving, restoring,
naming, and organizing as extension policy. This decision reads that as the
mechanism/policy split it is: **Core owns the codec, atomic write, and validated
restore; the extension owns when to save, naming, organization, and
presentation.** A plugin never writes the file format and never bypasses the Core
restore path.

## Terminology

| Term             | Meaning in this document                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Session          | A terminal plus its PTY child tree, with an id that survives client disconnect.                                   |
| Detach           | Ending a client's lease while the session, its PTY, and its processes keep running.                               |
| Persistence      | Restoring layout and metadata after a restart — not keeping a process alive.                                      |
| Restart survival | Processes continuing after the session host restarts. Excluded by the `bittyd` candidate; not recommended.        |
| Attach lease     | A bounded grant binding one connection to one session for events and, for the controller, input.                  |
| Controller       | The single lease per session that may write input, resize, abort, and transfer control.                           |
| Observer         | A lease that reads a bounded snapshot and events but holds no input, resize, or control authority.                |
| Terminal Truth   | Grid, scrollback, cursor, modes, and damage owned by the host; clients receive snapshots and never write it.      |
| Seam             | A bounded, capability-gated Core interface that lets an extension request session actions without owning the PTY. |

## Current capability and the missing half

| Capability                                      | State in the corpus                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspaces, splits, stack, overlay, zoom, focus | Accepted in the [Workspace Compositor](workspace-compositor.md) and [Panel Runtime RFC](panel-runtime-rfc.md); shipped subsets are `Implemented-only`, never `Verified`.                                                                                                                     |
| Layout identity                                 | `Instance -> Window -> Workspace -> LayoutTree -> View`, `ViewId != TerminalId`, one hosting View per Terminal.                                                                                                                                                                              |
| Session snapshot round-trip                     | `SessionSnapshot` format v1 stores workspace slots, layout trees, focus, MRU, bounded per-pane scrollback, and `OSC 7` cwd; one file, atomic temp-plus-rename, validated whole before mutation, clean start on failure, `--safe` never reads it. Recorded at `bitty` `668a461` (2026-09-20). |
| Persistence bound                               | 200 scrollback lines per pane, per the [Small-Core Capability Floor](small-core-capability-floor.md).                                                                                                                                                                                        |
| Process detach, reattach, and restart survival  | Missing. Closing the window ends the processes; no client can bind to a live session; a restart re-spawns shells rather than continuing them.                                                                                                                                                |
| Session identity and leases                     | Missing in Core. Defined only by the [bittyd candidate](bittyd-session-host-contract-candidate.md); no daemon ships.                                                                                                                                                                         |
| Remote access                                   | Missing and deferred behind a separate trust-boundary ADR; no remote transport exists.                                                                                                                                                                                                       |

Retiring `Pane = PTY = Terminal = UI` is why the missing half is a lifecycle problem, not a layout rewrite. The [Architecture Overview](../architecture/overview.md) records that the separation "preserves space for future detach and attach, session persistence, and a remote UI. Those future capabilities are not themselves commitments." This document keeps that sentence true.

A restored layout after a restart is **persistence**, not reattachment: the shell is new, process state is gone, and only bounded history remains. Real detachment needs a process that outlives the GUI.

## Options

| Option                 | Shape                                                                                                                                                                                                                                                                    | Consequences                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Extension-only      | Core unchanged; a plugin or L1 extension owns a server, wire protocol, attach state, and the PTY.                                                                                                                                                                        | No Core growth, but the extension becomes a second PTY owner and session registry, which ADR 0008 makes a conformance violation. Lua cannot hold a PTY fd; a Rust extension could, but leases, fencing, and audit would then live outside the process authority, and every consumer would reimplement them. |
| B. Core mechanism      | Core owns detach/attach and a local server inside the terminal process.                                                                                                                                                                                                  | One authority and no new process, but Core becomes the daemon ADR 0008 defines as separate. A single-process GUI cannot outlive its window, daemon absence stops being supported, and tmux-style policy accumulates inside the trust boundary.                                                              |
| C. Core/extension seam | Core keeps Terminal Truth, PTY, process and resource enforcement, identity, and the snapshot codec, and exposes a bounded attach/detach seam. The session host owns attach facts; an extension owns UI, naming, organization, persistence policy, and any remote client. | Authority stays with the process; policy stays replaceable. It needs one focused seam contract and the `bittyd` contract promoted, so it is the slowest option — but the only one that keeps single ownership, daemon absence, and Small Core true together.                                                |

### Recommendation

**Option C.** Detach changes _who owns the process_: ADR 0008 fixes a single PTY
owner and session-grained attach, ADR 0019 stages a separate per-user host for
that ownership, and ADR 0015/ADR 0016 keep process, permission, and resource
enforcement in Core. Option A moves ownership out of the only layer allowed to own
it. Option B moves a daemon into the layer that must work without one.

| Seam element                             | Core owns                                                          | Extension receives                                     |
| ---------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Session descriptors                      | Stable ids, lifecycle, attach count, controller presence           | Bounded read-only values; no PTY handle or grid buffer |
| Attach and detach requests               | Authorization, lease creation, input routing, stale-handle refusal | Success or a typed refusal with counts and limits      |
| Lifecycle events                         | Create, attach, detach, expiry, terminal state, reason             | Cold-path events, never the render or input hot path   |
| Snapshot and restore                     | Codec, atomic write, validation, fail-closed restore               | Commands that request or select a snapshot             |
| Naming, ordering, picker, restore policy | Nothing                                                            | Extension policy over the descriptors and commands     |

The extension never talks to the session host; Core mediates every call. It never
receives a descriptor, grid reference, or scrollback buffer — only values and
commands, the same rule the plugin platform already applies.

## Server question

**The recommended option needs no dedicated server. It rides the `bittyd`
candidate.**

A separate multiplexer server is wrong because it would be a second PTY owner and
a second session registry (ADR 0008 makes the first a conformance violation and
the second a split-brain "who is attached" answer); it would duplicate leases,
counters, and refusal audit the candidate already defines; it would create a
second extension-facing authority, contradicting the charter rule that Core
mediates session calls; and it would give Bitty two daemons instead of one
supported absence.

| Prerequisite                                                                                   | Why the multiplexer depends on it                                                                                                                                                                        | State                                 |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [bittyd Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md) accepted | Fixes `D-07` scopes, `D-09` leases, control, and the `session.attach`/`session.detach` surface, `D-10` delivery, `D-11` versioning, `D-14` bounds, and `D-16` audit; `D-06` excludes restart persistence | Draft                                 |
| Additive `session.*` / `daemon.*` scopes registered in the IPC registry                        | `terminal.*` must not grant session administration; a lease must not grant terminal content                                                                                                              | Open                                  |
| `bittyd` Linux x86_64 conformance for attach, detach, expiry, transfer, and stale handles      | An attach design is not evidence; other cells stay unadvertised per ADR 0002                                                                                                                             | No daemon                             |
| This Core seam accepted as a focused contract                                                  | The extension API must be reviewed before an extension can target it, and this decision fixes the boundary rather than the exact API                                                                     | This candidate                        |
| `bitty-ipc` framing, peer-credential, and RC-9/RC-10 evidence                                  | The attach path inherits the local transport and its ceilings                                                                                                                                            | Accepted contract, no daemon evidence |

The multiplexer also depends on what `bittyd` deliberately does not own: layout
(Core, ADR 0014), the session file (Core codec), naming and organization
(extension), and remote transport (a separate ADR). That division is Option C, not
a gap in the daemon.

If the owner declines `bittyd`, the fallback is not a custom server. It is the
weaker in-process story ADR 0019 permits: snapshot restore with no promise that
processes survive a client or a host. This document authorizes neither.

## Security boundary

### Who may attach

- **Local attach requires the authenticated same-user peer.** Unix uses
  `SO_PEERCRED` or the platform equivalent; Windows uses a current-user-only pipe
  DACL plus SID comparison. A uid equal only through a namespace is
  `Unauthenticated`.
- **Possession of an id or connection grants nothing.** Every action is authorized server-side against the peer, the connection's scopes, and the session relation. A missing scope is refused before lookup; unknown and unauthorized sessions return the same `NotFound`.
- **The controller presents the session's 256-bit control token**, minted at creation, stored as a digest, scoped to one session, and never in an environment, argv, audit record, log, or child. Losing it degrades to observation.
- **Operators are not a content bypass.** Daemon actions need the per-boot operator capability; content still needs `terminal.inspect`; kill is operator-only. Cross-user and anonymous attach are refused.

### What an attached client may read and write

| Role       | Reads                                                                                  | Writes                                                                              |
| ---------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Observer   | Status, bounded snapshot and deltas, scrollback within budget, with `terminal.inspect` | Nothing. No input, resize, control, or abort.                                       |
| Controller | The same content, plus live deltas at the current revision                             | Input with `terminal.input`, PTY resize, abort, transfer, revoke on its own session |
| Operator   | Daemon status and all-session view; content only with `terminal.inspect`               | Stop, drain, force, revoke; never silent content access                             |

**Only the controller may resize the PTY.** An observer from a differently sized
window never resizes the session; it letterboxes or scales locally. This avoids
the tmux "smallest/largest client wins" ambiguity and keeps one writer for one
grid.

### How Terminal Truth and scrollback are protected

- Clients receive revision-tagged snapshots and bounded deltas, never raw PTY bytes and never a mutable grid. Stale handles are refused before any effect; a mismatch never applies a partial mutation.
- Scrollback leaves the host only inside an authorized lease and within the published snapshot and backlog bounds. There is no unbounded replay, and truncation is explicit.
- The session file may contain on-screen text: owner-private (`0700` directory, `0600` file), excluded from diagnostics, audit, and crash reports, disableable, and never read in safe mode.
- No plugin, panel, or extension receives a PTY descriptor, grid reference, or scrollback buffer.

### What a detach does to running processes

Nothing. Detach ends a lease; it does not signal the child, change the generation, or produce a terminal reason. The session, PTY, grid, and scrollback continue. A disconnected controller vacates control at lease expiry; control never transfers implicitly, and an observer does not become controller by waiting. Reattach returns a snapshot at the current revision plus a bounded backlog, with duplicates resolved by revision. Closing the only process is different: the children end and only the snapshot survives.

### What remote access would additionally require

Remote is a separate, strictly larger transition, not covered by any local scope
or by accepting this decision. It needs its own accepted ADR under the ADR 0008
gate, before any transport code; network authentication at least as strong as
mTLS with a pinned CA or SSH-tunnel trust, never an ambient bearer token;
encryption in transit, replay resistance, and a fuzzed framing corpus; a consent
ledger per `(remote identity, AgentId)` with explicit per-device grants and no
local scope inheritance; and a snapshot or damage stream, never raw PTY
passthrough.

### Fail-closed defaults and non-goals

Defaults: deny by default; no attach without peer authentication and scope; no
listener; no remote transport; no cross-user sessions; no automatic control
transfer; no process adoption; no session-file read in safe mode; a corrupt or
unknown-version file starts clean; over-limit requests are refused whole.

Non-goals: tmux wire-protocol compatibility; a remote UI or TCP listener; a
`bittyd` implementation or schedule commitment; multi-tenant session sharing; live
PTY migration; restart survival of live processes; and plugin access to Terminal
Truth.

## Persistence

Persistence restores a **session description**, not a process.

| Stored (layout profile)                                                                                                                                                      | Stored (content profile, existing)     | Never stored                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace slots and ids, `LayoutTree` with `H`/`V` and ratios, `ViewId` to `TerminalId` mapping, focus, MRU, presentation modes, panel attachment ids and types, `OSC 7` cwd | Bounded scrollback, 200 lines per pane | Environment, argv, clipboard, control tokens, operator capability, SSH or provider credentials, PTY or process ids, plugin VM state, image store or GPU state, audit records |

Session names and ordering are extension metadata; Core validates their bounds on commit but does not interpret them.

- **Terminal state is not restored into a new process.** A new shell gets a clean grid; only bounded history is presented above it. Pretending otherwise would forge terminal state or require process survival.
- **Crash consistency.** One file, written to a temporary path and renamed after a successful write, with version and integrity validated as a whole. A partial, corrupt, or truncated file starts clean and is never partially applied.
- **Single writer.** Only the instance that owns the file writes it; a second instance starts clean rather than racing a last-writer-wins merge.
- **Versioning.** An integer format version; a file newer than this build supports is ignored and starts clean; a downgrade never rewrites a file it does not understand. Migration lives in one Core codec with round-trip and corruption tests.
- **Sensitivity.** The content profile persists on-screen text and can persist printed secrets. It is owner-private, documented as sensitive, excluded from diagnostics, and disableable; encryption at rest is an owner decision, not an implied property.

## Bounds

Defaults recorded here; accepted bounds are reused. User configuration may lower a
bound, never raise it above the system maximum.

| Bound                           | Default                    | Maximum | At the limit                                                                                     |
| ------------------------------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| Live sessions per host          | 16                         | 64      | `LimitExceeded` before creation; no partial session                                              |
| Attached clients per session    | 8                          | 16      | Refuse the new lease; existing leases continue                                                   |
| Attaches per connection         | 8                          | 16      | Refuse the new attach                                                                            |
| Event backlog per session       | 256 events / 256 KiB       | Same    | Truncate with `backlog_truncated` and `earliest_revision`; no silent gap                         |
| Pending requests per connection | 64                         | 64      | Typed backpressure refusal                                                                       |
| Channel capacity                | 256                        | 256     | Shed newest with attribution for non-terminal events                                             |
| Frame and streamed chunk        | 256 KiB                    | 256 KiB | Refuse before allocation                                                                         |
| Request rate                    | 100/s sustained, 200 burst | Same    | Shed newest with attribution                                                                     |
| Session metadata record         | 4096 bytes                 | 4096    | Refuse the mutation; prior record intact                                                         |
| Persisted session file          | 4 MiB                      | 8 MiB   | Drop oldest scrollback first; if metadata alone exceeds it, write nothing                        |
| Attach snapshot                 | 4 MiB                      | 8 MiB   | Truncate history first, never the live grid; refuse the attach if the live grid alone exceeds it |
| Attach lease TTL                | 15 s                       | 15 s    | Expire and detach; never abort the session                                                       |

Session, attach, backlog, transport, and metadata values reuse `D-14` of the
bittyd candidate and the accepted RC-9/RC-10 ceilings. The persisted-file and
attach-snapshot bounds are this decision's recorded defaults.

Terminal-state and stop notifications are control events: if the queue cannot take
one, the lease closes with a terminal-event-lost result rather than dropping it
silently. A refused request never transitions a session and never echoes caller
bytes; the refusal carries the limit and the observed count.

## Implementation scopes if admitted

These become separate issues **only after** the owner accepts this decision. They
are not filed here and are not commitments.

| Scope | Content                                                                                                                    | Depends on                                                                            | Security review                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| M-1   | Core attach/detach seam, `bittyd` client wiring, and `bitty ctl` attach/detach                                             | Accepted bittyd contract, registered session scopes, accepted seam, Linux conformance | Peer credentials, leases, control token, stale handles, resize authority |
| M-2   | Extension persistence policy over the existing snapshot: save timing, naming, organization, restore prompt, disable switch | Core snapshot codec and commands; M-1 only for live persistence                       | Content at rest, corruption, safe-mode exclusion                         |
| M-3   | Remote attach: gateway, device grants, framing, client                                                                     | A separate accepted remote ADR, M-1, and fuzzed transport evidence                    | Network identity, consent ledger, replay, framing                        |

Ordering is M-1 before live M-2 behavior and before M-3. M-2's layout-only half
can proceed independently because the snapshot exists. None may claim `Verified`
without the [Risk Evidence RFC](risk-evidence-rfc.md) gates.

## Decision register

Each row is an owner decision. The recommendation is the accepted position; the
default applies if the owner does not decide.

| ID   | Decision               | Recommendation                                                                               | Default if undecided                       |
| ---- | ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| M-01 | Local attach transport | Reuse the `bittyd` endpoint and its peer-credential posture                                  | No new transport; snapshot restore only    |
| M-02 | Server ownership       | `bittyd` hosts sessions; no dedicated multiplexer server                                     | No server; no detach or reattach promise   |
| M-03 | Remote authentication  | SSH-tunnel trust first behind a separate ADR; mTLS with a pinned CA later                    | No remote transport at all                 |
| M-04 | Persistence scope      | Layout plus bounded scrollback restore; live sessions survive a client, never a host restart | Snapshot restore only; no process survival |
| M-05 | Multi-client policy    | One controller plus bounded observers, explicit transfer only                                | One controller, zero observers             |
| M-06 | Session UX ownership   | First-party L2 plugin, bundled-disabled; Core keeps commands and the codec                   | Commands only; no built-in session UI      |

`M-04` is the row most likely to be misread: "session persistence" in the issue
means both the restore that exists and the restart survival that does not. This
decision keeps the first and refuses the second, because restart survival changes
recovery, migration, adoption, and the security of a process that outlives its
authority.

## Acceptance mapping

[bitty#2218](https://github.com/bitty-terminal/bitty/issues/2218) asks for a design
decision first and implementation only after acceptance.

| bitty#2218 item                                                                                        | Status in this document                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a) Core mechanism, extension, or seam?                                                                | Answered as a candidate: Option C, with Core retained mechanisms and extension policy.                                                                                                           |
| (b) Server process or the `bittyd` candidate?                                                          | Answered as a candidate: no dedicated server; rides `bittyd`, with named promotion prerequisites.                                                                                                |
| (c) Security boundary for attach and remote access?                                                    | Answered as a candidate: peer credentials, scopes, control token, observer/controller authority, separate remote gate.                                                                           |
| An accepted RFC (or accepted decline) recorded in the corpus                                           | **Not satisfied.** This is a candidate; owner acceptance is required before the issue closes.                                                                                                    |
| If admitted, scoped tasks with security review, bounded queues, and no plugin access to Terminal Truth | Design satisfied by [Implementation scopes](#implementation-scopes-if-admitted), [Bounds](#bounds), and [Security boundary](#security-boundary); **issues are not filed**, so not satisfied yet. |
| No tmux wire compatibility and no remote UI or daemon commitment                                       | Honored; compatibility is a non-goal, and the bittyd recommendation is contingent on its own acceptance.                                                                                         |

The issue closes only when the owner accepts this decision or explicitly declines
multiplexing and accepts that recorded outcome. This documentation task does not
close bitty#2218 and promotes no capability.

## Security review

| Threat                                               | Control in this decision                                                                                                | Evidence still needed                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Same-user IPC takeover (`T-09`)                      | Peer credentials before parsing and re-checked before privileged actions; deny-by-default scopes; no anonymous endpoint | Peer-check and tamper tests              |
| Control hijack or two input writers                  | One controller lease, session-scoped token stored as a digest, explicit attributed transfer                             | Concurrent attach and transfer vectors   |
| Terminal Truth corruption by a client                | Clients receive snapshots; only the controller writes input and resize; no client writes the grid                       | Stale and foreign-handle negative tests  |
| Scrollback or session-file secret exposure (`R-014`) | Owner-private file, no diagnostics or audit content, disable switch, safe mode never reads                              | File-mode, redaction, crash-report tests |
| Bounds exhaustion or queue starvation                | Advertised limits, whole-request refusal, bounded backlog, explicit truncation, terminal events never shed              | Limit and backpressure tests             |
| Remote trust escalation                              | Separate ADR; no local scope covers a remote method; no TCP listener by default                                         | Remote ADR evidence before code          |
| Plugin confused deputy (`T-10`)                      | Plugins receive descriptors and commands, never a PTY fd, grid, or scrollback buffer, and never talk to `bittyd`        | Capability-denial tests                  |

New mechanisms to scrutinize: the session file as a store of on-screen text, the
controller-only resize rule, and operator enumeration without content access.

## Verification plan

Before acceptance: record `M-01` through `M-06` or an explicit deferral with an owner and date; obtain an independent `APPROVE` from a reviewer other than the author; obtain a security `APPROVE` covering peer credentials, leases, control ownership, the session file, bounds, and the remote gate; re-check every current-state claim and record drift; confirm the prerequisites in [Server question](#server-question) are complete and none is claimed satisfied; synchronize the affected documents and index row; run `just check` and `git diff --check`.

Before any implementation merge, in a separate task: prove the seam refuses stale and foreign handles, the session file fails closed on corruption, bounds refuse whole requests, and `bitty --safe` never reads stored state.

## Alternatives considered

| Alternative                           | Trade-off                                                                                                | Disposition                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| tmux/zellij wire compatibility        | Existing clients could attach; freezes a foreign protocol and policy model forever.                      | Rejected; the issue names it a non-goal.                    |
| Extension-owned server (Option A)     | No Core change; second PTY owner, second registry, recovery outside the authority.                       | Rejected by the single-ownership rule.                      |
| Core-owned server (Option B)          | One process; makes Core the daemon and breaks daemon absence.                                            | Rejected; contradicts ADR 0008 and ADR 0019.                |
| Dedicated server beside `bittyd`      | Keeps `bittyd` small; duplicates registry, leases, audit, and splits attach truth.                       | Rejected; one session authority is the point of the floor.  |
| Restart survival via process adoption | Keeps work alive across a host restart; needs adoption, identity reuse, and duplicate-side-effect rules. | Rejected here; requires a new accepted decision.            |
| Unbounded scrollback persistence      | Best restore fidelity; violates bounded persistence and writes more screen content to disk.              | Rejected; the accepted 200-line bound stands.               |
| Multi-controller input                | Feels collaborative; races the PTY and defeats the single-writer rule.                                   | Rejected; one controller plus observers, explicit transfer. |

## Affected contracts

Nothing changes in this task; the effects apply only if the owner accepts.

| Contract                                                                                            | Effect                                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [Architecture Overview](../architecture/overview.md)                                                | Gains a pointer beside the detach/attach non-commitment sentence; that sentence stays accurate for remote and restart survival.        |
| [Workspace Compositor Specification](workspace-compositor.md)                                       | No layout change; confirms layout stays Core and attach is client-level, not a second View.                                            |
| [Panel Runtime RFC](panel-runtime-rfc.md)                                                           | No contract change; `RFC-OQ-9` remains the persistence open question.                                                                  |
| [bittyd contract](bittyd-session-host-contract-candidate.md) and [charter](bittyd-scope-charter.md) | Unchanged; this decision consumes their answers and blocks implementation on their promotion.                                          |
| [Remote infrastructure candidate](remote-infrastructure-candidate.md)                               | Remains candidate behind the ADR 0008 gate; this decision adds no remote method or transport.                                          |
| [Remote Session Decision](remote-session-decision.md)                                               | Records the accepted remote decline for the v0.2.0 timeframe and the admission bar; `M-03` and `M-3` stay blocked on it.               |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                   | Its session-restore row is the existing capability this decision builds on; no status change.                                          |
| [Specifications index](README.md) and bitty#2218                                                    | Gain the Draft row and the design answer respectively; the issue stays open until owner acceptance and then gains scoped child issues. |

## Open points

- Seam spelling, command names, and the refusal taxonomy are a focused contract,
  not decided here.
- Encryption at rest for the session file, and its key hierarchy, is a
  security-owner decision.
- How an observer's differently sized viewport is presented (letterbox, scale, or
  local scroll) is client policy, constrained by "observers never resize the PTY".
- Whether a first-party session plugin is bundled-disabled or absent from the
  default distribution is a distribution decision.
- The next format version's shape, including whether layout and content become
  separate files, is deferred to the implementation issue.

## Acceptance criteria

This decision is complete when:

1. `M-01` through `M-06` are decided or explicitly deferred with an owner and a date; no row is silently resolved.
2. An independent reviewer records `APPROVE`, and a security reviewer approves attach authority, session-file handling, bounds, and the remote gate.
3. Current-state claims are re-verified and any drift is recorded, not patched silently.
4. Affected documents and the specifications index are synchronized.
5. No implementation, daemon, or remote capability is claimed; the document is English-only and self-contained.

Moving to accepted records the owner decisions and reviewer sign-offs and sets
`status: accepted`. Implementation remains a separate task with its own gates.

## P0 Review Sign-off

Not signed. This is a candidate; the owner decision and security review are
promotion gates.

| Reviewer                  | Required for                                                                                | Status  |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------- |
| Project initiator (owner) | `M-01` through `M-06`, the seam recommendation, and the accept-or-decline decision          | Pending |
| Security reviewer         | Attach authority, control token, session file, bounds, denial behavior, and the remote gate | Pending |
| Runtime reviewer          | Seam shape, `bittyd` dependency, resize authority, and the M-1 scope                        | Pending |
| Docs curator              | Spine, metadata, index row, language, self-containment, and cross-document synchronization  | Pending |

## References

- [bitty#2218](https://github.com/bitty-terminal/bitty/issues/2218) and [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) — the owning issues and the session-host parent.
- [Architecture Overview](../architecture/overview.md), [Workspace Compositor Specification](workspace-compositor.md), and [Panel Runtime RFC](panel-runtime-rfc.md) — separation, layout, and the existing snapshot round-trip.
- [bittyd Session-Host Contract (Candidate)](bittyd-session-host-contract-candidate.md) and [bittyd Scope Charter](bittyd-scope-charter.md) — the session host this decision depends on.
- [Small-Core Capability Floor](small-core-capability-floor.md) and [Core and Plugin Boundaries](../architecture/core-boundaries.md) — retained mechanisms and the mechanism/policy split.
- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md), [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md), [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md), [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md), and [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) — ownership, staging, and trust-boundary gates.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), and [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) — normative controls.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md) and [Remote Infrastructure and Remote Client (Candidate)](remote-infrastructure-candidate.md) — transport limits and the deferred remote direction.
- [Documentation workflow](../docs/development/documentation-workflow.md) — frontmatter, status, language, and review policy.
