---
title: Execution Extraction Contract
description: Terminal-side execution supervisor extraction contract covering principals and identity generation fencing lifecycle ownership cancel and reap bounded resources recovery and safe mode the principal-scoped host contract placement and the Core mechanisms that stay retained
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 67
---

# Execution Extraction Contract

## Document status

This document is `Accepted` (`W-132`) as the terminal-side execution extraction
contract that
[ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
Boundary 1 delegates to this repository. It elaborates the accepted direction
that the AI-agnostic execution supervisor moves to an independent repository
(reserved candidate name `bitty-execution`) and fixes the principals, identity
and generation fencing, lifecycle ownership, cancellation, resource and
recovery behavior, the high-level public contract shape, and the Core
mechanisms that stay retained. It does not authorize extraction, does not
authorize shipped, stable, or compatibility-guaranteed behavior, and does not
weaken any normative security control. The extraction and the Core integration
remain gated on this contract and on their own implementation evidence.

This document decides the placement question that ADR 0016 parked to `W-132`:
the supervisor mechanism is an in-process native library crate, not an
out-of-process worker and not a daemon, for the 0.1.0 scope; a separate
repository is not a separate process. Phase 3 detached supervision remains
parked to the headless/daemon decision and its owning task.

The one `Implemented-only` Core-internal body of behavior this document
records is source-level evidence reviewed against the workspace `bitty`
checkout. It is not `Verified`, is not `Compatible`, and is not the extracted
extension or the public host contract. Frontmatter `status` is `accepted` per
the repository metadata schema; document status is Accepted.

- Owning task: `W-132` (bitty-terminal-docs), CarryCtx `CTX-0088`, Issue
  [bitty-terminal-docs#171](https://github.com/bitty-terminal/bitty-terminal-docs/issues/171),
  under open question `OQ-061`.
- Predecessor decision:
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  (Boundary 1), accepted 2026-10-02.
- Sibling focused contracts:
  [Composer Architecture and Host API](composer-architecture.md) (`W-82`) and
  [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md) (`W-29`
  and `W-30`).
- Downstream owners named, not decided here: the `bitty-execution` repository
  contract-readiness and standalone supervisor mechanism task `CTX-0002` and
  `CTX-0003`, and the Core integration and retirement task `W-140`
  (CarryCtx `CTX-0933`).

## Purpose and scope

The execution supervisor is the AI-agnostic mechanism that manages OS
processes and PTYs on behalf of callers: spawn-time lifetime, process and PTY
resource management, cancellation execution, bounded output, structured
outcome, and recovery. ADR 0016 Boundary 1 accepted that this mechanism moves
to an independent repository while Core retains Terminal Truth, the permission
and resource enforcement at the host boundary, identity and generation
fencing, the AI-agnostic typed bridge, and the safe defaults. This document
turns that decision into the explicit terminal-side contract so that the
`bitty-execution` implementation and the Core integration can cite one
definition of the boundary.

In scope:

- the principals that may hold execution handles and the identity model,
  including the distinct execution generation and the host-side stale-handle
  rejection;
- process, PTY, and job ownership and the spawn, adopt, attach, detach, cancel,
  kill, exit, reap, and orphan lifecycle;
- bounded process and grant counts, output buffering and backpressure,
  memory and descriptor budgets, and refusal under pressure;
- crash and restart recovery, what survives, what is re-derived, what fails
  closed, and the interaction with safe mode;
- the high-level principal-scoped host operations, their bounded inputs and
  outputs, and their typed failures;
- the placement decision (in-process crate versus worker versus other);
- the mechanisms Core retains and the security and verification obligations.

Out of scope and owned elsewhere:

- the semantic `bitty-ai` layer: the task model, agent ownership, job-to-task
  binding, claims and leases, mailbox delivery, progress notes, retry policy,
  timeout policy selection, and the agent-finalization quiescence rule;
- the exact trait, wire, trait-method signature, manifest, and schema
  spellings, which the `bitty-execution` implementation and the SDK tasks fix
  within this contract's constraints;
- repository creation, package layout, and the dependency wiring of the
  extracted crate, which are separate scoped tasks;
- the headless/daemon detach-and-reattach direction, which stays with the
  headless ADR and Phase 3.

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- The [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  the threat model, the
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and the
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md),
  which stay authoritative on every trust boundary named here. The named
  controls include Terminal Truth ownership (`P0-AC-016`), safe startup and
  safe mode (`P0-AC-019`), plugin capability checking and hot-path exclusion
  (`P0-AC-012`, `P0-AC-015`), paste and input inspection
  (`P0-AC-008`), trace minimization and redaction (`P0-AC-026`), and the
  package install and activation controls (`P0-AC-027` through `P0-AC-030`).
- [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  Boundary 1 and the binding constraints inherited from the bootstrap fence,
  including that execution identity and authority are fenced by the host, the
  execution output contract is bounded, no private first-party bypass exists,
  and a standalone crate is not process isolation.
- [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md),
  which inherits the same bootstrap fence; this contract does not reopen it.
- [ADR 0013 - Core Ontology and Identity Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md):
  the `ExecutionContext`, `Terminal`, `Panel`, `GenerationId`, and the
  Panel/Execution separation and Restore/Persistence separation that the
  execution boundary reuses. Panels never own executions, and panel visibility
  never becomes authority.
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md):
  the deferred headless and daemon direction that Phase 3 must compose with
  rather than bypass.
- The accepted terminal, plugin, and AI contracts that build on this
  boundary: the
  [Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md),
  [Rich Presentation RFC](rich-presentation-rfc.md),
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md),
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  and
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
- The [open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  entry `OQ-061`, which owns the full identity-domain mapping and stays Open.
  This contract uses the execution-side terms it needs and does not answer the
  semantic-domain questions.

## Terminology

- **Execution** (also **job**): one real OS process or process tree managed by
  the supervisor. An execution is host truth, represented in the reviewed
  implementation by a job id and a snapshot.
- **Semantic assignment generation**: the task/agent ownership generation owned
  by `bitty-ai`. The host never interprets it.
- **Execution generation**: the host handle generation minted per spawn,
  distinct from the semantic assignment generation. The host rejects a stale
  handle itself.
- **Principal**: an opaque caller identity on whose behalf an execution
  operation is requested. The host authorizes each `(principal, operation)`
  pair; a principal is never an `AgentId`, `TaskId`, or LLM symbol.
- **Retained Core mechanism**: a Core-owned, always-available primitive that
  works with zero plugins and in `bitty --safe`.
- **Owned process tree**: the process and its descendants that a job owns and
  that the host kills and reaps as a unit; never a single unattributed PID.
- **Bounded ring**: a per-stream, newest-wins output store with a fixed byte
  ceiling, so raw output never grows memory or a database without bound.
- **Fail closed**: refusal that leaves the previous state intact, changes no
  authority, and returns a typed error rather than degrading silently.

## Architecture overview

The supervisor sits above the PTY and process primitives and below the
AI-agnostic typed bridge. It is a mechanism: it manages processes, PTYs,
lifetimes, cancellation execution, bounded output, and structured outcomes,
and it never learns agent or task ontology. Callers hold handles and issue
principal-scoped operations; the host authorizes each operation, enforces the
bounds, and rejects a stale generation before touching a process. The
semantic layer (`bitty-ai`) consumes the structured result and holds the task,
binding, claim, retry, and handoff policy.

```text
bitty-ai (semantic)      Task / Agent / binding / retry / mailboxes
        |
        v
AI-agnostic typed bridge ExecutionResult, generic execution verbs
        |
        v
Execution supervisor     job registry, lifetime, cancel, output, recovery
        |
        v
PTY / process primitives owned process tree, PTY master, signals, clocks
        |
        v
Core enforcement         Terminal Truth, permission, resource, generation fence
```

Core retains the enforcement column: Terminal Truth and PTY ownership, the
per-principal permission and resource gate, the identity and generation fence,
the safe startup path, the AI-agnostic bridge, and the safe defaults. The
extracted supervisor supplies the supervision mechanics. A separate repository
does not change the trust decision: Core revalidates the supervisor's outputs
and enforces every budget regardless of where the code lives.

## Principals and identity

The actors that may participate in execution operations are:

| Actor                   | May hold a handle       | Authority                                                                                                        |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Terminal Core           | Yes, as host authority  | Owns spawn, enforcement, the fence, and the defaults; it is the authorizer, not a convenience bypass.            |
| Plugin host / plugin    | Only through public API | Untrusted; deny-by-default; may `observe`, `read_output`, or `attach` only when granted; never a raw PTY handle. |
| Agent (`bitty-ai`)      | Only through public API | Requests operations through the AI-agnostic bridge; semantic ownership binds on the AI side; per-op authorized.  |
| External IPC/MCP client | Only through public API | Untrusted and read-only by default; every operation is authorized and bounded like any other principal.          |
| Core UI (panel/chrome)  | Through the same API    | Observes and attaches; origin is provenance, not lifecycle authority; a panel never owns an execution.           |

The identity model that the host enforces:

1. **Opaque principal.** A principal is a bounded, validated opaque identity
   string with no control bytes. The host does not parse it for agent, task, or
   provider ontology.
2. **Independent capabilities.** Each operation is its own capability. Holding
   some does not imply the others, and no observe/control bundle or ambient
   scope exists. The operation set is `spawn`, `observe`, `read_output`,
   `write_input`, `signal`, `cancel`, `attach`, and `transfer`, with event
   replay and acknowledgement part of observation. Grant delegation is
   bounded, and a principal may delegate only operations it currently holds;
   self-grant is prohibited.
3. **Deny by default with hidden existence.** An unauthorized request fails
   closed and reveals as little about the job's existence as the operation
   needs. An unknown or evicted id and a denied operation are distinct typed
   failures, so a caller cannot probe the job table by error shape.
4. **Two generations.** The semantic assignment generation (task/agent
   ownership, owned by `bitty-ai`) is not the execution generation (host
   handle, owned by Core). A handle carries a job id and its execution
   generation.
5. **Host-side stale-handle rejection.** Surrender of a stale handle is a host
   fact, not an AI-layer convention. Every operation that consumes a handle
   checks the generation in the host and returns a typed stale rejection
   changing nothing. A stale handle must not end, signal, or mutate an
   arbitrary process because of a caller defect.
6. **Generation is monotonic and never reused.** A new execution generation is
   minted per spawn; job ids are never reused within a supervisor lifetime and
   never reused across a restart.
7. **Fences are per object.** The execution generation fences an execution
   handle. It is distinct from the panel write-lease generation, the plugin VM
   generation, and the terminal registry generation, which fence their own
   objects. No fence is transferred between object types.

The exact principal grammar, grant wire representation, and per-operation
request shapes are parked to the implementation within these constraints.

## Lifecycle: process, PTY, and job ownership

The core objects and lifetimes are:

| Object             | Meaning                                     | Lifecycle owner                                |
| ------------------ | ------------------------------------------- | ---------------------------------------------- |
| `Task` (semantic)  | Work such as "fix issue #91".               | `bitty-ai`.                                    |
| `Execution` / job  | A real OS process or process tree.          | The supervisor mechanism under the Core fence. |
| `Agent` (semantic) | The decision-making logical actor.          | `bitty-ai`.                                    |
| `Panel`            | A human observation/interaction projection. | Core panel lifecycle; never owns an execution. |

Ownership rules:

- **A job does not belong to a panel.** Closing a panel, switching panels,
  compacting a conversation, or an agent going away does not by itself end an
  execution. An origin panel is provenance metadata ("started from here"),
  never ownership; an execution may project to zero, one, or several panels,
  including a headless run.
- **Core owns Terminal Truth and the PTY.** No panel, view, layout node, or
  plugin holds a PTY descriptor. The supervisor manages the process and its
  PTY under Core's ownership; the PTY is one execution backend, not the job
  abstraction.
- **The job's owner plus subscribers is distinct from its origin.** Multiple
  principals may observe; control is scoped per operation.

Lifecycle stages:

1. **Spawn.** The caller declares the job at spawn: an `argv`-first program and
   argument list (never a shell string by default), an environment policy,
   optional working directory, a declared lifetime, a kind, an I/O mode, and
   separated timeouts. Pipe jobs run with closed stdin by default; a PTY with
   writable stdin requires the interactive opt-in. Spawning confers the first
   ownership rather than exercising an existing grant; the spawn itself is
   still authorized and interlocked before any thread or process starts.
2. **Lifetime.** The lifetime is declared at spawn (for example agent-scoped,
   task-scoped, workspace-scoped, or detached) and the host executes the
   cleanup policy for the declared lifetime. Deadlines are held by the host,
   not by the caller, so they fire even when the owning agent or its provider
   connection is gone. Long-lived service and watch jobs are not treated as
   hung: hard, idle, and retention clocks are distinct and no implicit blanket
   deadline exists.
3. **Adopt.** After a restart, the supervisor adopts persisted facts. Adoption
   never restarts a job on its own. Terminal jobs keep their observed facts; a
   job that was queued or running at the crash has an unknown outcome and
   requires an explicit respawn (a new spawn with a new id) when, and only
   when, a principal asks.
4. **Attach and detach.** Attach is a subscription to a live event cursor
   (a reconnect-aware tail), not an ownership transfer and not a second
   execution. Detach, disconnect, or panel close ends the subscription, not
   the job. Event delivery is at-least-once with stable ids for critical
   events and may be replayed across a disconnect; the consumer deduplicates.
5. **Cancel and kill.** A cancel request carries the handle, a mode, and a
   grace period. Supported modes are graceful stop, immediate kill, and
   graceful-then-kill. The host owns the sequence and executes it against the
   owned process tree; it returns a typed cancel outcome and publishes exactly
   one resolved event per accepted request. Concurrent requests coalesce, and
   a later stronger mode escalates an executing cancel. A caller must never
   infer that sending a signal stopped the process.
6. **Exit and reap.** The host observes exit, classifies a structured outcome,
   kills the owned tree on cancel or deadline, and reaps descendants. An
   outcome is never a bare exit code and is never guessed: an OOM-killed
   classification requires per-job evidence, and an unobservable status is
   reported as unknown.
7. **Orphan handling.** Kills reach the owned process tree, never a single
   unattributed PID, so descendants cannot be orphaned by a partial kill. When
   the supervisor that owned a running job goes away, the job is reported as
   supervisor-lost with an unknown outcome rather than a fabricated exit.
   Longer-lived detached supervision is Phase 3 and is not authorized here.

Needs-input handling is a lifecycle concern (a job waiting on a prompt must
become observable as waiting for input rather than hanging), but the
terminal-side presentation and the exact state name are parked; the reviewed
implementation's sensitive-input interlock is `Implemented-only` evidence
below, not the accepted contract.

## Resource management and refusal

Every dimension a job or a principal can grow is bounded and enforced by Core,
with observable attribution. The values below are the reviewed Core-internal
implementation evidence where noted; the binding requirement is that a finite
bound exists before the corresponding implementation lands, and the numbers
are re-confirmed during extraction.

| Dimension                       | Finite bound (evidence where noted)                              | Refusal mode                                               |
| ------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- |
| Tracked jobs                    | `DEFAULT_MAX_JOBS`, the tracked-execution ceiling `64`           | Typed registry-full; finished records evictable only later |
| Retained output per stream      | `MAX_OUTPUT_BYTES_PER_JOB` `256 KiB`, newest wins                | Oldest bytes evicted; reads report truncation              |
| Output read per call            | `MAX_READ_BYTES` `1 MiB`, `MAX_READ_LINES` `10 000`              | Typed invalid-read, nothing read                           |
| Input write per call            | `MAX_WRITE_INPUT_BYTES` `64 KiB`                                 | Typed invalid-write, nothing written                       |
| Write and signal rate           | `MAX_WRITES_PER_WINDOW` `128/s`, `MAX_SIGNALS_PER_WINDOW` `32/s` | Typed rate-limited, nothing changed                        |
| Grants per job                  | `MAX_GRANTS_PER_JOB` `64`                                        | Typed grants-full, delegate nothing new                    |
| Cancel grace                    | `MAX_CANCEL_GRACE_MS` `60 000 ms`                                | Typed invalid-cancel, nothing recorded                     |
| Principal name                  | `MAX_JOB_PRINCIPAL_BYTES` `64`, no control bytes                 | Typed invalid-principal, nothing authorized                |
| Persisted manifest and log file | `MAX_MANIFEST_BYTES` `4 MiB`, `MAX_LOG_FILE_BYTES` `1 MiB`       | Typed persist error, foreign or grown store refused        |

Bounded process count, output buffering, and backpressure:

- The tracked-job table has a hard ceiling. Overflow fails closed; a finished
  record becomes evictable only after its retention elapses, so capacity is
  never silently exceeded.
- Output is retained in per-stream bounded rings with newest-wins eviction, so
  a flooding job cannot grow unbounded memory. A read is bounded and reports
  truncation; a filter selects only within retained bytes and never recovers
  dropped bytes.
- Observation events (progress, output notices, heartbeats) are coalesced and
  may be dropped oldest-first; critical events (completion, failure,
  needs-input, permission-required, timeout, ownership change, cancellation)
  are delivered reliably with stable ids.
- Output never floods a model context: what crosses the bridge is a bounded
  tail plus references, with explicit tail or filtered reads for more.

Memory and descriptor budgets:

- A memory budget is enforced per job where the platform can provide per-job
  evidence (for example per-job cgroup accounting on Linux); where it cannot,
  the outcome is reported as unknown rather than assumed. A relative
  memory-pressure signal is not proof that this job was the OOM victim.
- File descriptors and PTY masters are owned and released by the supervisor;
  a job or plugin never receives an ambient descriptor or a raw PTY handle.
- The process-tree backend bounds what a kill reaches; an unsupported backend
  reports unsupported rather than pretending to have stopped the job.

Refusal under pressure is a contract, not best effort: an over-bound,
over-rate, over-capacity, or unauthorized request leaves the previous state
intact, changes no authority, and returns a typed failure. No refusal path
silently drops correctness or escalates privilege.

## Recovery and safe mode

Crash and restart recovery separates what survives from what is re-derived and
what fails closed.

| Category        | Behavior after restart                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Survives        | Terminal facts: metadata, the output index totals, and spilled log files held by reference; persisted ids as provenance.      |
| Re-derived      | Running state and process state, from the OS and from configuration; grants are explicitly re-issued and never silently kept. |
| Fails closed    | Capability grants; unknown outcomes; stale handles; any corrupted, foreign, or over-grown persisted store.                    |
| Never automatic | Retry and respawn. Unknown outcomes require an explicit respawn with a fresh id; there is no default retry.                   |

Recovery obligations:

1. **A crash does not invent an exit.** A job that was queued or running when
   the supervisor died has a genuinely unknown outcome and is reported as
   such, never as a clean exit. The outcome vocabulary keeps unknown and
   supervisor-lost distinct from observed exits.
2. **Ids are never reused.** Post-restart spawns continue above the highest
   issued id, and a replay cursor detects the restart gap, so a consumer can
   tell replayed history from new work.
3. **Authority does not survive a crash.** Capability grants are not restored
   implicitly; adoption starts unauthorized and every grant is re-issued
   explicitly. Silent authority never survives a restart.
4. **No automatic retry.** Retrying a mutating command can duplicate an effect;
   re-execution is an explicit primitive and unknown outcomes require
   inspection first.
5. **A hostile or damaged store fails closed.** A corrupted, foreign-version,
   or over-grown manifest or log file is refused rather than partially
   trusted; raw output never enters the metadata store.

Interaction with safe mode:

- The execution mechanism is a retained Core mechanism, so it is available
  with zero plugins and in `bitty --safe`; the extracted supervisor does not
  become a startup prerequisite.
- Safe mode never creates a third-party plugin VM and selects the built-in
  safe configuration. Recovery must not require loading third-party code.
- Persisted state adopted in safe mode confers no authority: no persisted grant
  is trusted, and an untrusted store is refused rather than promoted.
- Safe mode must retain a usable execution path for the mechanisms Core owns;
  extraction may not make a Core capability depend on optional availability.

Phase 3 detached supervision (a supervisor that outlives the GUI, with
handoff and adoption across processes) stays with the headless/daemon
direction and its owning task; this contract does not authorize it and does
not let a later phase bypass the recovery rules above.

## Public contract shape

The public contract is principal-scoped, bounded, and typed. It is described
here at the shape level; exact signatures, wire encodings, and manifests are
fixed by the implementation within these constraints.

Principal-scoped operations (names are indicative and may be spelled
differently, but the capability split is binding):

| Operation     | Meaning                                                        | Bounded input / output                                   |
| ------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `spawn`       | Create a job under the caller's first ownership.               | `argv`-first bounded spec; returns a handle.             |
| `observe`     | Read lifecycle state, list, replay events, acknowledge.        | Bounded page and cursor; typed unknown-cursor.           |
| `read_output` | Read retained stdout/stderr bytes and the metadata-only index. | Bounded bytes/lines; reports truncation.                 |
| `write_input` | Write bytes to an interactive job's stdin.                     | Bounded payload and rate; typed refusal otherwise.       |
| `signal`      | Deliver a portable signal request to a live job.               | Bounded rate; typed permission and unsupported outcomes. |
| `cancel`      | Request termination through the host's typed cancel protocol.  | Handle, mode, bounded grace; typed cancel outcome.       |
| `attach`      | Subscribe to a live job's event cursor (reconnect-aware).      | Bounded replay window; detach on disconnect.             |
| `transfer`    | Move ownership (delegation plus ownership transfer).           | Bounded grants; typed refusal when unauthorized.         |

Contract properties:

1. **Every operation is authorized per principal and per job.** No operation
   implies another; no privileged bundle short-circuits the gate.
2. **Handles are generation-fenced.** The generation is checked in the host on
   every handle-consuming operation; a stale handle is a typed rejection that
   changes nothing. This is the same fence that protects cancellation: a stale
   handle must never end an arbitrary process.
3. **Inputs and outputs are bounded.** Args, environment, writes, reads,
   signal and write rates, grants, replay windows, and cancel grace each have a
   finite bound; an over-bound request fails closed.
4. **Results are structured, not bare codes.** The authoritative host result
   carries the execution id, a typed outcome, timestamps, output and artifact
   references, optional resource usage, and a truncation flag. The semantic
   projection (summary, diagnostics, progress note) belongs to `bitty-ai` and
   is not produced here.
5. **Failures are typed.** Representative typed failures include unknown job,
   invalid spec, registry full, supervisor unavailable, invalid read, invalid
   cursor, unknown event, denied, invalid principal, invalid write,
   rate-limited, signal rate-limited, unsupported, invalid cancel,
   grants-full, secure-input denied, and command-risk denied or
   needs-consent. The cancel path additionally distinguishes stale generation,
   already exited, permission denied, graceful, killed, still-running, and
   unknown.
6. **The bridge is AI-agnostic.** The verbs are generic execution verbs; the
   terminal side never learns `AgentId`, `TaskId`, LLM, prompt, or provider
   symbols. At most generic principals, execution ids, targets, capabilities,
   and opaque metadata cross the boundary.
7. **Growth is additive and fails closed.** A version or capability mismatch
   disables the optional consumer with a diagnostic rather than silently
   degrading or escalating.

## Placement: crate, worker, or other

ADR 0016 parked the crate-versus-worker-versus-other choice to this contract.
The decision for the 0.1.0 scope is:

**The execution supervisor is an in-process native library crate, not an
out-of-process worker and not a daemon. The per-job OS process or process tree
is the isolation unit for the executed program.**

Rationale:

- PTY ownership, the permission and resource gate, and the generation fence
  are Core-retained; keeping the supervisor in-process avoids introducing a
  new inter-process trust boundary for a capability that already isolates the
  untrusted program in its own OS process.
- A dedicated supervisor daemon, socket surface, or `PATH`-discovered helper
  would add a new ambient-authority and discovery surface without a security
  requirement, and the native-component rule forbids a socket daemon, `PATH`
  discovery, and a dynamically loaded library as a native capability.
- In-process placement does not relax trust. The supervisor is untrusted by
  location exactly like any extracted component: Core bounds its inputs and
  revalidates and bounds its outputs before consumption.

Consequences and boundaries of the decision:

- **A separate repository is not a separate process.** Moving the crate to the
  `bitty-execution` repository is packaging, not isolation. Core still
  enforces budgets, still owns Terminal Truth and the PTY, and still rejects
  stale handles.
- The exact dependency wiring (workspace path dependency versus a pinned
  dependency to the extracted repository) is a packaging decision owned by the
  repository-creation and integration tasks, not by this document.
- Phase 3 detached supervision remains parked; if it is ever accepted, it is a
  separate decision under the headless/daemon direction and must preserve
  every rule in this contract.

## What Core retains

Core retains the following mechanisms and may not delegate the trust decision:

1. **Terminal Truth.** Parser state, grid semantics, cursor state, modes, and
   canonical scrollback. Plugins and the supervisor may alter presentation or
   report process facts, never Terminal Truth.
2. **PTY and process permission and resource enforcement.** Every `observe`,
   `read_output`, `write_input`, `signal`, `cancel`, `attach`, and `transfer`
   is authorized per principal; the resource bounds in this contract are
   enforced regardless of where the supervision code lives.
3. **Identity and generation fencing.** The execution generation is distinct
   from the semantic assignment generation, and the host rejects a stale
   handle itself.
4. **Safe startup and safe mode.** A no-third-party-plugin startup path and
   `bitty --safe` retain a usable execution mechanism and never load
   third-party code to recover.
5. **The AI-agnostic bridge.** The terminal side never learns agent or task
   ontology; semantic ownership, binding, claims, retry, and handoff stay with
   `bitty-ai`.
6. **Safe defaults.** `argv`-first execution rather than a shell string by
   default, and closed stdin unless an interactive PTY is explicitly
   requested.
7. **Bounded output and revalidation.** Raw output never floods a model
   context; the host keeps a bounded ring with optional persisted logs and
   artifact references and revalidates anything the supervisor returns.
8. **Owned-process-tree kill and OOM evidence.** Kills reach the owned tree,
   and an OOM verdict is asserted only with per-job evidence.
9. **No private first-party bypass.** Plugin policy, including first-party
   plugin policy, uses the public, capability-gated API; there is no raw PTY,
   GPU, or window handle and no input hot-path callback.

## Current implementation status

No part of this contract is implemented as the extracted extension or as the
public host contract. There is no `bitty-execution` runtime, no published
execution crate, and no accepted trait, wire, or manifest surface. The
`bitty-execution` repository is a metadata-only scaffold and is not evidence
of implementation. This document does not authorize the extraction.

Source-reviewed `Implemented-only` Core-internal evidence exists in the
`bitty` repository under `crates/bitty-runtime/src/execution/`, the behavior
the extraction would later replace. It is not `Verified`, not `Compatible`,
not the extension, and not the public host contract. The evidence was read
from the workspace `bitty` checkout at short revision `5670d9ae`
(2026-10-02, `main`) and is bounded to source inspection:

- `model.rs`: `JobId`, `JobSpec` (`argv`-first with `with_cwd`/`with_env`), the
  `JobLifetime` and `JobKind` enums, `JobIo` (pipe default, PTY opt-in),
  `JobTimeouts` (hard/idle/retention), `JobOrigin`, `JobPrincipal`,
  `JobOperation` (the eight independent capabilities), `JobGrant`, `JobState`,
  `JobEvent`, `JobSnapshot`, `JobCancel`, and the `JobError` failure set
  including `Denied`, `RegistryFull`, `RateLimited`, `InvalidRead`,
  `InvalidWrite`, `InvalidCancel`, `GrantsFull`, `SecureInputDenied`,
  `CommandRiskDenied`, and `CommandRiskNeedsConsent`.
- `outcome.rs`: `ExecutionOutcome` (`Success`, `ExitCode`, `Signaled`,
  `SpawnFailed`, `Cancelled`, `TimedOut`, `OomKilled`, `SupervisorLost`,
  `Unknown`), `ExecutionGeneration`, `ExecutionHandle`, `CancelMode`,
  `CancelRequest`, `CancelOutcome` (including `StaleGeneration`), and
  `CancelReceipt`.
- `registry.rs`: the capacity-bounded `JobRegistry` with
  `DEFAULT_MAX_JOBS = bitty_ipc::execution::MAX_TRACKED_EXECUTIONS` (`64`),
  principal-scoped `spawn_as`/`get_as`/`list_as`/`read_output_as`/
  `write_input_as`/`signal_as`/`cancel_as`/`attach_as`/`transfer_as`, the
  role and command-risk interlocks before tracking, and the owned-tree kill
  path.
- `output.rs`: `MAX_OUTPUT_BYTES_PER_JOB` (`256 KiB`), `MAX_READ_BYTES`
  (`1 MiB`), `MAX_READ_LINES` (`10 000`), the `ReadOutput` tail/filter shape,
  and the metadata-only `OutputIndex`.
- `persistence.rs`: `JobStore`, the versioned manifest, `reconcile`,
  `ResumeDecision`, `ResumeCursor`, `IdAllocator`, and the explicit
  non-goals that grants are not persisted and adoption never respawns.
- `supervisor.rs`: `adoption_plan`, `AdoptionKind` (surviving facts versus
  explicit respawn), and the daemon/handoff scaffolding.
- `oom.rs`, `cgroup.rs`, `process_tree.rs`, `sensitive_input.rs`,
  `retention.rs`, and `delivery.rs`: per-job OOM evidence, opt-in cgroup
  accounting, kill scope, the sensitive-input interlock, retention policy, and
  the critical/observation delivery split.

Tests exist under `crates/bitty-runtime/tests/` (`job_supervisor.rs`,
`job_capability_ops.rs`, `job_outcomes_cancel.rs`, `job_output_delivery.rs`,
`job_persistence_supervisor.rs`, and `execution_job_cgroup_oom.rs`). This
document does not assert that the suite is green; their presence is bounded
source evidence and the parity gate belongs to the integration and
verification tasks.

Known gaps a `bitty-execution` implementation and the Core integration must
close; none weakens a control, and none is authorization:

- The reviewed supervisor is in-process Core code, not an independent crate or
  the public host contract.
- The Windows process backend is planned in the draft execution-host direction
  and is not verified here; the Linux/macOS owned-tree backends and the opt-in
  cgroup OOM evidence are the only backend evidence read.
- OOM classification outside cgroup-delegated Linux reports unknown by
  design; non-Linux budget parity is not established.
- Needs-input signaling, the terminal-side job view, and multi-principal
  visibility composition have no accepted terminal-side contract yet.
- Phase 3 detached supervision is scaffold-level only and unaccepted.

## Security review

The execution boundary touches process launch, PTY and descriptor ownership,
input and output, cancellation, capability grants, and crash recovery, all of
which the security corpus governs. Independent security review is required
before this contract merges. Reviewers must confirm that:

- Core retains Terminal Truth, PTY and process permission and resource
  enforcement, the identity and generation fence, safe startup, the
  AI-agnostic bridge, and the safe defaults (`P0-AC-016`, `P0-AC-019`);
- every operation is authorized per principal and per job, with deny-by-default
  and hidden existence, no observe/control bundle, no ambient authority, and
  no self-grant;
- a stale execution handle is rejected by the host itself and can never end,
  signal, or mutate an arbitrary process because of a caller defect;
- no private first-party bypass exists: first-party and third-party consumers
  use the same public, capability-gated API, and no plugin receives a raw PTY,
  process, or window handle (`P0-AC-012`, `P0-AC-015`);
- no supervisor or plugin callback runs on the input, parser, or render hot
  path;
- the output contract is bounded, raw output does not enter the metadata store
  or flood model context, and trace minimization and redaction hold
  (`P0-AC-026`);
- recovery fails closed: grants are not silently restored, unknown outcomes
  are not guessed, ids are not reused, and a corrupted or foreign store is
  refused;
- safe mode and zero-plugin startup retain a usable execution path and never
  load third-party code to recover;
- a separate repository is not treated as process isolation, and an
  in-process supervisor is still untrusted by location.

The `bitty-execution` implementation and the Core integration (`W-140`) each
require security review again before their own merge.

## Verification plan

This is a contract specification; it has no executable verification of its
own. Any later implementation must prove, at minimum, the positive paths and
the following negative-path evidence:

1. **Ownership and no bypass.** A first-party consumer uses the same public,
   capability-gated API as a third-party consumer; the parity suite denies the
   same operations for both; no private first-party path and no raw PTY handle
   exist.
2. **Stale generation is rejected host-side.** An operation carrying a handle
   with a superseded or fabricated generation fails with a typed stale
   rejection; the target process is not signalled, killed, or mutated; no
   event is emitted for it.
3. **Unauthorized principal is denied.** A principal without the required
   grant is refused for each operation independently; the refusal hides
   existence as required; no state, grant, or process changes.
4. **Over-budget fails closed.** Registry overflow, an over-bound output read,
   an over-bound or over-rate write, a signal burst over the rate, a grant
   table at capacity, and an over-bound cancel grace each fail with their
   typed refusal and leave the previous state intact.
5. **Crash recovery is honest.** After an interrupted run, a queued or running
   job is reported as unknown or supervisor-lost, never as a clean exit; ids
   are not reused; grants are not restored; an explicit respawn gets a fresh
   id; no automatic retry occurs.
6. **Safe mode holds.** With third-party plugins disabled and in `bitty
--safe`, no third-party plugin VM is created, the execution mechanism
   remains usable, and recovering an untrusted or damaged persisted store
   fails closed rather than granting authority.
7. **No hot-path execution.** Input, paste, parser, and render tests show no
   synchronous supervisor or plugin callback on the hot path.
8. **Safe defaults hold.** Pipe jobs run with closed stdin, `argv`-first
   execution passes adversarial values as single validated arguments with no
   shell interpretation, and shell execution is an explicit opt-in.
9. **Owned-tree kill and reap.** Cancel and deadline kills reach the whole
   owned process tree, descendants are reaped, and no kill is issued against
   an unattributed single PID.
10. **OOM evidence is exact.** An OOM-killed classification appears only with
    per-job evidence; a signal without that evidence is reported as signalled,
    and an unobservable status as unknown.
11. **Placement does not relax trust.** An in-process supervisor's outputs are
    revalidated and re-bounded before consumption; moving the crate changes no
    trust decision and no budget.
12. **Documentation gates pass.** The repository-local `just check` passes
    with zero issues.

## Alternatives considered

| Alternative                                                                      | Disposition                                                                                                                                                               |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the execution supervisor inside Core as a Core feature                      | Rejected by ADR 0016 Boundary 1: it leaves optional supervision policy in the small core and contradicts the extraction direction.                                        |
| Extract to an out-of-process supervisor worker or daemon for 0.1.0               | Rejected: it adds a new inter-process trust and discovery surface without a security requirement; the native-component rule forbids a socket daemon and `PATH` discovery. |
| Treat the separate `bitty-execution` repository as process isolation             | Rejected: a separate repository is not a separate process; Core still enforces budgets, owns Terminal Truth, and rejects stale handles.                                   |
| Let the `bitty-ai` layer enforce generation fencing and stale-handle rejection   | Rejected: the host itself must reject a stale handle, so an AI-layer defect cannot end an arbitrary process.                                                              |
| Persist and silently restore capability grants across a restart                  | Rejected: silent authority must not survive a crash; adoption starts unauthorized and every grant is explicitly re-issued.                                                |
| Auto-retry or auto-respawn on an unknown outcome                                 | Rejected: retrying a mutating command can duplicate an effect; re-execution stays an explicit primitive after inspection.                                                 |
| Read output into model context without bound, or persist raw stdout in the store | Rejected: raw output never floods model context and never enters the metadata store; only bounded tails and references cross the bridge.                                  |
| Execute through a shell string by default                                        | Rejected: shell interpolation is an injection class; `argv`-first execution is the default and shell execution is an explicit opt-in.                                     |
| Kill a single PID rather than the owned process tree                             | Rejected: it orphans descendants and cannot attribute the process tree to the job.                                                                                        |
| Let the extracted supervisor own placement, budgets, or the permission gate      | Rejected: Core retains the permission and resource gate, the aggregate bounds, and pre-consumption revalidation; the supervisor is untrusted by location.                 |

## Affected contracts

- [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  Boundary 1 and its binding constraints: this page supplies the focused
  contract they delegate; the constraints are unchanged.
- [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md),
  [ADR 0013](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md),
  and
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md):
  the bootstrap fence, the identity model, and the headless/daemon deferral
  this contract composes with.
- [Execution Host and Supervisor Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/execution-host-boundary.md):
  the draft capture this contract draws on without accepting wholesale; where
  the draft and this page differ, this accepted contract governs.
- [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md):
  `W-132` now has its contract; the dependency order is unchanged, and
  `W-140` through `W-146` remain gated on their producer evidence.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md):
  the generic execution verbs and the agent IPC surface this contract's
  operations compose with; whether and how the verbs bind to the wire stays
  with that RFC and the implementation.
- [Panel Runtime RFC](panel-runtime-rfc.md),
  [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md),
  and [Terminal State RFC](terminal-state-rfc.md): the panel, terminal, and
  generation vocabulary this contract reuses without redefining.
- [Composer Architecture and Host API](composer-architecture.md) and
  [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md): sibling
  focused contracts that share the same retained-Core rules and the no-bypass
  fence.
- [Specification register](README.md): routes to this document.
- `bitty-execution` `CTX-0002`/`CTX-0003` and Core integration `W-140`
  (`CTX-0933`): the downstream owners; their content is not decided here.

## Open points

The following details are parked, not decided, each with a named owner and a
reason. No item broadens an existing global open question into a new one.

- **Full semantic identity-domain mapping** (`AgentId`, `TaskId`, `RunId`,
  `ExecutionId`, panel projection) stays Open under `OQ-061`, owned by the
  AI-architecture and IPC contracts; this contract uses only the execution
  side and does not answer the semantic mapping.
- **Exact trait, wire, and manifest spellings** are parked to the
  `bitty-execution` implementation (`CTX-0003`) within this contract's
  constraints; nothing about the concrete interface is decided here.
- **Cross-platform process-tree parity** (Windows process backend and
  non-Linux cgroup or budget parity) is parked to the Core integration
  (`W-140`, `CTX-0933`) and the `bitty-execution` implementation; the
  reviewed backend evidence is Linux and macOS, with the Windows backend
  planned.
- **Output retention and artifact retention defaults** (ring size, persisted
  log retention, artifact retention) are parked to the `bitty-execution`
  implementation and the storage-scope reconciliation, and must be finite
  before the corresponding implementation lands.
- **Needs-input surfacing and the terminal-side job view** are parked to the
  semantic terminal, panel, and UI contracts; this contract requires that a
  waiting job be observable rather than hanging but fixes no presentation.
- **Phase 3 detached supervision and handoff across a GUI exit** are parked to
  the headless/daemon decision and the Core integration; this contract permits
  no bypass of its recovery rules.
- **Dependency wiring of the extracted crate** (workspace path dependency
  versus a pinned dependency on the `bitty-execution` repository) is parked to
  repository creation and integration; the placement decision here is
  in-process, not packaging.
- **Whether `transfer` is a committed verb or a shape** remains as recorded in
  the draft execution-host direction; the SDK and IPC contracts settle the
  binding, while this contract fixes only the ownership-transfer capability.
- **Recovery of an in-flight job's output bytes** beyond the persisted index
  and spilled logs is parked to the implementation; the contract requires only
  that a crash not invent an exit and that raw output not enter the metadata
  store.

## Acceptance criteria

- The principals that may hold handles, the opaque identity model, the
  independent per-operation capabilities, and the two-generation fence with
  host-side stale-handle rejection are defined.
- Process, PTY, and job ownership, and the spawn, adopt, attach, detach,
  cancel, kill, exit, reap, and orphan lifecycle are defined, including that a
  job does not belong to a panel.
- Bounded process and grant counts, bounded output buffering and backpressure,
  memory and descriptor budgets, and typed refusal under pressure are defined.
- Crash and restart recovery distinguishes what survives, what is re-derived,
  and what fails closed, and the interaction with safe mode is defined.
- The principal-scoped operation shape, bounded inputs and outputs, typed
  failures, and host-side stale-handle invalidation are defined at the shape
  level.
- The placement decision is stated as an in-process library crate, with the
  rationale and the explicit rule that a separate repository is not a separate
  process.
- The Core-retained mechanisms are enumerated: Terminal Truth, PTY and
  permission and resource enforcement, identity and generation fencing, safe
  startup, the AI-agnostic bridge, `argv`-first and closed-stdin defaults,
  bounded output, owned-tree kill and OOM evidence, and no private first-party
  bypass.
- Security review, a verification plan with negative-path evidence for stale
  generation, unauthorized principal, over-budget, crash recovery, safe mode,
  and no hot-path, alternatives, affected contracts, open points, acceptance
  criteria, and P0 sign-off are present.
- The downstream owners (`bitty-execution` `CTX-0002`/`CTX-0003` and Core
  integration `W-140`/`CTX-0933`) are named without deciding their content,
  nothing is described as implemented, and the extraction is not authorized.
- The document is self-contained with no research-repository references, and
  the repository-local `just check` passes with zero issues.

## P0 Review Sign-off

| Role                 | Scope                                                                    | Requirement                                                            |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `architecture-owner` | Extraction ownership, placement, and retained-Core correctness           | Approve; confirms the boundary, the placement decision, and the fence. |
| `security-reviewer`  | Process launch, PTY ownership, capabilities, output, recovery, safe mode | Independent security review required before merge.                     |
| `docs-curator`       | Taxonomy, metadata, links, terminology, and register synchronization     | Approve; confirms discoverability, self-containment, and schema.       |

## References

- [bitty-terminal-docs#171](https://github.com/bitty-terminal/bitty-terminal-docs/issues/171)
  (CarryCtx `CTX-0088`, plan key `W-132`), RFC `OQ-061`.
- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  Boundary 1, and [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md),
  [ADR 0013](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0013-core-ontology-identity.md),
  and [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md).
- [Execution Host and Supervisor Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/execution-host-boundary.md)
  and the
  [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md),
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  and
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
- [Terminal State RFC](terminal-state-rfc.md),
  [Panel Runtime RFC](panel-runtime-rfc.md),
  [TerminalRegistry and View Lifecycle Contract](terminal-registry-view-lifecycle-rfc.md),
  [Rich Presentation RFC](rich-presentation-rfc.md),
  [Composer Architecture and Host API](composer-architecture.md),
  [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md),
  and the [Specification register](README.md).
- Security corpus in `bitty-docs`:
  [overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md),
  and the
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md).
