---
title: Extension Execution Mediation
description: Threat model for extension and tool execution mediation stating enforced-today gates versus planned 0.2.0 hardening
category: architecture
audience: security-reviewer
document_type: specification
status: draft
website_publish: true
sidebar_order: 25
---

# Extension Execution Mediation

## Document status

This document is `draft`. It is a threat-model page for extension
execution mediation: what the gate enforces today versus what stays
planned for the post-0.1.0 / 0.2.0 horizon. Every claim below carries
an explicit label — **Enforced today** or **Planned** — and draft text
does not authorize shipped, stable, normative, or
compatibility-guaranteed behavior.

Requests pass gate-level mediation through
capability, policy, authenticated-scope, and resource-budget checks
before execution. At `bitty` `1c68de25`, admitted Layer-2 tool spawns also
have inherited exec confinement on Linux: an EXECUTE-only Landlock ruleset
is installed in the child before exec. Setup failure and non-Linux
platforms refuse those spawns fail-closed. This is `Implemented-only`
evidence, not full OS isolation or P0 acceptance.

## Purpose and scope

This page answers one question: when an extension or plugin asks Bitty
to execute something on the host, what stops a malicious or compromised
requester, and what still does not.

In scope:

- the enforced-today mediation gates on the tool-spawn path
  (capability grants with consent and revocation, argv mediation, env
  scrubbing, fail-closed verdicts, integrity pins, bounded work);
- the roles and enforcement points that decide which requesters may
  reach execution at all;
- the planned 0.2.0 hardening items that close the gaps the gates
  leave open, with live tracker pointers;
- the residual risks stated honestly, including what mediation cannot
  fix.

Out of scope (owned elsewhere):

- the Core versus plugin ownership tables and P0 security gates
  themselves ([Core and Plugin Boundaries](core-boundaries.md));
- the upstream `extensions/` versus downstream `plugins/` directory
  split ([Extension, Plugin, and Component Directory
  Semantics](directory-semantics.md));
- the Lua plugin manifest, capability grant lifecycle, and package
  integrity model (Plugin Platform and Package Lifecycle contracts in
  the plugin ecosystem corpus);
- the cross-project security corpus, risk register, and audit program
  (linked under Normative sources, never copied);
- prompt-injection defenses, which belong to the AI lane (see Residual
  risks).

This page tracks [bitty#2070](https://github.com/bitty-terminal/bitty/issues/2070)
(`v0.2.0`). The confinement and spawn-ledger observations below are checked
against `bitty` `1c68de2545c961790d0a2011340e4a3c04564ab7`.
Implementation evidence describes that source revision; the shared
security corpus remains authoritative for requirements.

## Normative sources this specification must not weaken

- [Core and Plugin Boundaries](core-boundaries.md) (`accepted`): every
  trust transition passes capability, policy, authenticated-scope, and
  resource-budget gates; installation never executes package code;
  updates never silently elevate capabilities; third-party failure
  preserves a safe startup path. This page redefines no ownership row
  and weakens no P0 gate.
- [Extension, Plugin, and Component Directory
  Semantics](directory-semantics.md) (`draft`): install-time placement
  never runs unit code; execution begins only through the
  capability-gated load path. Directory placement creates no
  ambient-authority path.
- The security corpus in `bitty-docs` (overview, threat model, risk
  register): authoritative for cross-project requirements. On conflict,
  that corpus takes precedence.
- The pre-audit state in
  [bitty#975](https://github.com/bitty-terminal/bitty/issues/975)
  (open): no claim on this page is a `Verified` or audit-passed claim.
  The strongest status any enforcement below may carry is
  `Implemented`, never `Verified` and never an absolute such as
  zero-ambient-authority.

## Terminology

| Term                | Meaning                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Mediation           | Gate-level checks applied to an execution request before it runs: capability, policy, scope, and budget. Not OS confinement.       |
| Gate-only mediation | Request-gate checks alone; insufficient to constrain a binary's later execs. Admitted Layer-2 tools also require exec confinement. |
| OS inheritance      | Linux child and descendant exec restrictions through EXECUTE-only Landlock; non-Linux admitted tool spawns refuse fail-closed.     |
| Unit of mediation   | The `command` plus `args` vector of one tool spawn. Shells are never invoked; there is no string command line to interpolate.      |
| Fail-closed verdict | A denial shaped as an explicit error (`NotFound`, `InvalidRequest`, `LimitExceeded`) rather than a silent pass or a default allow. |
| TOFU pin            | Trust-on-first-use pin binding the strongest available artifact identity; a changed pin blocks until re-approved.                  |
| Enforcement point   | A named gate in the role matrix (for example `sandbox-exec`) that a request kind must satisfy before execution.                    |

## Threat framing

The adversary is a malicious or compromised extension, plugin, or tool
declaration attempting to escape its granted authority: running an
unapproved binary, smuggling flags or shell syntax through arguments,
reaching the network or secrets through the environment, persisting
across updates, or exhausting host resources. The transport underneath
(IPC, package fetch) is untrusted input until validated.

What mediation promises: no execution without a grant, no grant wider
than declared, no silent widening later, and no unbounded work. What
mediation does not promise yet: containment of a process that passed
the gate legitimately but behaves maliciously within its allowance
(see Residual risks).

## Enforced today

Labels read `[Enforced]` per item for skimming, with implementation evidence
only and no independent P0 acceptance. Confinement and ledger observations
are pinned to `1c68de25`; the source-transparency subsection names its own
revision.

### Deny-by-default grants with consent and revocation `[Enforced]`

Sensitive locations are default-deny. Access requires an explicit
per-path user-consent grant; there is no silent-access path and no
glob-widened consent (the host seam rejects glob-widened requests).
Consent is session-scoped, recorded with host monotonic timestamps,
and revocable per path — a revoked grant denies again immediately.
Every grant, denial, and revocation is recorded in the bounded
`FsAuditLedger` (see Audit below). Narrow capability-shaped path
patterns constrain what a grant may cover; Lua cannot widen its own
scope.

### Argv mediation: one command plus args, allowlisted verbs `[Enforced]`

The unit of mediation is the `command` plus `args` vector (CTX-0444).
Only the `git` tool slice is accepted; any other tool name fails
closed until its own slice is accepted. Within `git`, only
read-oriented verbs pass (`status`, `diff`, `log`, `branch`, `show`,
`rev-parse`, `ls-files`); write verbs (`commit`, `push`, `reset`,
mutating `checkout`) are absent, so staging or commit UX needs
explicit user action plus a broader grant.

Smuggling vectors fail closed at validation time, before any spawn:

- verb smuggling through exec-style flags is denied (no risky exact
  flags such as `--upload-pack`);
- shell metacharacters, NUL bytes, control characters, and whitespace
  tricks in any argument are denied — there is no shell to
  interpolate, and no argument is ever re-parsed as a command line;
- near-miss names stay outside the scrub list rather than inside it,
  so over-matching cannot quietly legitimize a vector.

### Bounded argv and payload budgets `[Enforced]`

Every spawn carries accepted bounds: at most 32 args, 256 bytes per
arg, 8 KiB total argv, 8 KiB observation payload
(implementation-measured in `bitty-plugin-host/src/tools.rs`; pending
independent re-verification, not an accepted normative limit). Args
beyond the per-entry cap are counted in `args_omitted`, never silently
dropped, so truncation is visible to the requester and to audit.

### Environment scrubbing `[Enforced]`

Hostile spawn environments are scrubbed (CTX-0465): `PAGER` and
`GIT_PAGER` are denied outright because even `GIT_PAGER=cat` would
re-open the pager execution vector closed for argv and config.
Near-miss names (`MY_PAGER`, `GIT_TERMINAL_PROMPT`) stay allowed, and
a hostile probe carrying an explicit spawn env with pager variables
is a tested denial.

### Fail-closed verdicts `[Enforced]`

Unknown, malformed, or over-budget requests receive explicit errors,
never a silent pass and never a default allow:

- undeclared tools and unknown execution ids fail as `NotFound`;
- malformed tool names, NUL/control arguments, and malformed request
  or client identity fail as `InvalidRequest`;
- over-budget fields, burst overflow, and excess cancel grace fail as
  `LimitExceeded`, with bursts failing closed rather than silently
  evicting tracked outcomes.

### Integrity pins with no silent auto-update `[Enforced]`

Versioned extension payloads publish under the immutable
`bitty/extensions/<name>/<version>/` prefix with `SHA256SUMS`
sidecars and immutable cache policy. Trust-on-first-use pins bind the
strongest available artifact identity: the first pin anchors, a
changed pin blocks until re-approved, and a first install with no pin
takes the explicit no-pin path rather than an implicit trust path.
Consistent with the accepted boundary contract, updates never
silently elevate capabilities — a capability-widening update requires
fresh approval through the grant path above.

### Source transparency for plugin installs `[Enforced]`

Plugin store management shows what an install would replace and refuses
source it cannot verify or read before any consent prompt or commit.
Four mechanisms cover the Lua plugin store, and each has a live
consumer on the install or inspection path rather than tests alone:

- **`bitty plugin show-source <id>`** prints the verified module tree
  of one store-installed plugin. The recorded `content_digest` is
  recomputed over the installed tree and must match before a single
  byte reaches stdout, so a tampered store fails closed with empty
  stdout instead of printing untrusted bytes. Per-file digests ride a
  `-- <path> sha256 <digest>` header; the tree digest, plugin id,
  version, source class, and package root go to stderr so stdout stays
  pipe-friendly. It is read-only — no execution, no network, no
  mutation — and bundled plugins (compiled into `bitty`) have no store
  source to print. Implementation:
  `crates/bitty-terminal/src/plugin.rs` (`op_show_source`, reached
  from the `show-source` verb). The native-extension counterpart,
  `bitty extension show-source <name> [<version>]` in
  `crates/bitty-terminal/src/component.rs`, predates this work and is
  unchanged.
- **Mandatory update diff.** A version change, or a same-version
  content change, always requires approval even when the capability
  set is unchanged. The bounded old-versus-new line preview is built
  from the staged snapshot the transaction commits — never re-read
  from the source — and renders before the decision, so `--yes`
  approves a reviewed snapshot rather than an unseen one. Truncated
  and omitted files are marked and counted, not silently dropped.
  Implementation: `UpdatePreview` and `build_update_preview` in
  `crates/bitty-runtime/src/plugin_runtime/package.rs`, consumed by
  `render_update_preview` in `crates/bitty-terminal/src/plugin.rs`.
- **Declared source pin.** A manifest may declare `[source] sha256`,
  the digest of the module tree it ships with. A declared pin that
  does not match the staged tree fails closed as `SourcePinMismatch`
  and commits nothing; unknown `[source]` keys are rejected, and the
  pin is folded into the manifest hash consent binds to, so declaring
  one binds the approved source digest to the grant. Implementation:
  `crates/bitty-runtime/src/plugin_runtime/package.rs` and
  `crates/bitty-runtime/src/plugin_runtime/manifest_toml.rs` (parsing
  and enforcement), with shape validation and grant-hash binding in
  `crates/bitty-plugin-host/src/manifest.rs`.
- **Lua readability gate.** Every `*.lua` file in the staged module
  tree is checked against the shared no-obfuscation rule — more than
  1,000 bytes on one line, or more than 200 bytes average per line,
  refuses — before consent and before commit, bounded to 1,024 files
  and 1 MiB per file. Minified source therefore cannot become a
  reviewable-looking artifact through the store even when no
  publish-side gate saw it. Implementation: `check_readable_lua` in
  `crates/bitty-runtime/src/plugin_runtime/package.rs`, applying
  `is_obfuscated_source_text` from
  `crates/bitty-runtime/src/component/descriptor.rs`.

All four are install-side. They bound what a local install may
commit, not what a registry may publish, and the pin stays optional
per manifest; the publish-side gate and a mandatory pin remain
planned below.

Source: `crates/bitty-terminal/src/plugin.rs`,
`crates/bitty-runtime/src/plugin_runtime/{package,manifest_toml}.rs`,
`crates/bitty-runtime/src/component/descriptor.rs`, and
`crates/bitty-plugin-host/src/manifest.rs` at `b5145675`.

### Bounded work and quotas `[Enforced]`

Spawns are DoS-bounded: tracked outcomes cap at 64
(implementation-measured; pending independent re-verification) with
burst overflow failing closed as `LimitExceeded`; cancel grace periods
clamp to a policy maximum; every stored outcome is accounted rather
than silently evicted. Queue, task, callback, and per-plugin VM
budgets (CPU, instructions, memory) apply on the plugin side per the
accepted boundary gates.

### TCB minimization through the small-core graph fence `[Enforced]`

The small-core graph fence keeps Core from importing the execution
crate directly (tracked as W-147): Core reaches spawning only through
the typed `SpawnService` seam with a scope guard, generation-fenced
handles, and typed cancel. Execution policy therefore lives in one
auditable place instead of scattered across Core call sites, and the
fence is structural (a dependency rule) rather than a convention
comment.

### Roles and enforcement points including SandboxExec `[Enforced]`

The role matrix assigns each agent role the enforcement points it
may pass. Execution requests (`RequestKind::ExecutionRun`) route to
the `sandbox-exec` enforcement point; roles without that point (for
example Reviewer) cannot reach execution regardless of what they
request. Scope guards separate every spawn, and non-tool requests
carry no allowlist path around the gate.

### Filesystem audit ledger `[Enforced]`

Every filesystem authorization decision — allow, deny, and
consent-required — is recorded in the bounded drop-oldest
`FsAuditLedger` (1,024 entries, 8 paths per entry with the remainder
counted; implementation-measured, pending independent re-verification).
Consent grants and revocations audit too, so the ledger
shows not only what was decided but which grant made an allow
possible.

### Inherited tool exec confinement `[Enforced]`

For admitted Layer-2 tools, `bitty-sandbox` installs a Linux Landlock ABI v1
ruleset handling only `EXECUTE`. Rules pin the allowlisted executable and its
ELF interpreter by inode; `restrict_self` runs in the child's `pre_exec`
hook. Other execs in that confined process tree fail, while reads, writes,
memory maps, and network access are not confined by this ruleset. There is
no seccomp or full OS isolation claim.

Confinement setup failure refuses the spawn as `Unavailable` with a
confinement diagnostic. macOS, Windows, and other platforms refuse admitted
tool spawns until their mechanisms land; no unconfined fallback exists for
this path. Generic non-tool requests and operator-configured secret-tier
helpers are outside this exec profile and retain their own gates.

Source: `crates/bitty-sandbox/src/{lib,linux}.rs` and
`crates/bitty-runtime/src/plugin_runtime/spawn.rs` at `1c68de25`.

### Bounded spawn-decision ledger `[Enforced]`

`ToolSpawnLedger` in `crates/bitty-plugin-host/src/tools.rs` records bounded
allow/deny decisions. At `1c68de25`, each `SpawnService` also owns a ledger
and every `dispatch` appends one decision. `Allow` means gate authorization;
an authorized spawn that later fails to start still records `Allow`, not a
successful execution. `Deny` means a gate refused before execution.

The drop-oldest ledger retains at most 1,024 entries and counts evictions.
Sequence numbers replace wall-clock timestamps; caller identity is clamped
to 128 bytes, tool names to 64 bytes, and at most 8 argument previews of
64 bytes each are retained with excess arguments counted. These are source
bounds, not a new normative limit or verification claim.

Environment values cannot enter through the ledger API because it takes no
environment parameter. Attribution-only construction is the barrier, not
secret redaction: a secret supplied as an argument can persist as a
truncated preview. `secret://` names are references, not secret values.
This bounded in-memory decision history is not durable or exhaustive
execution history and proves no P0 audit closure. The shared
[execution mediation security page](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/extension-execution-mediation.md)
remains authoritative for audit limitations and follow-up requirements.

## Planned (0.2.0 roadmap)

Each item below is **Planned**, tracked by a live `bitty` issue.
Pointers to these trackers are roadmap links, not provenance, and
nothing in this section may be read as implemented; landed mechanisms
are recorded in the enforced sections above.

- **Registry publish gate and mandatory source pin**
  ([bitty#2069](https://github.com/bitty-terminal/bitty/issues/2069)):
  the install-side half of this issue is enforced above; what remains
  is the `bitty-plugins` registry refusing minified or obfuscated Lua
  at publish time, and every official manifest declaring
  `[source] sha256` so the pin becomes mandatory instead of opt-in.
  Neither exists in the current registry tree: no plugin manifest
  there declares a source pin, and its registry validation applies no
  readability rule.
- **Signatures and identity**: package signatures remain draft per
  the accepted boundary contract; the TOFU pin store is the enforced
  interim, not the end state. Identity-bound pins replace
  first-use trust once the signature contract lands.
- **bittyd trust boundary** ([bitty#2064](https://github.com/bitty-terminal/bitty/issues/2064)):
  post-0.1.0 privileged service host (single instance per user via
  socket lock, IPC trust boundary with socket permissions,
  `SO_PEERCRED`, and cross-user denial, per-domain single-writer
  restatement). Anything outliving windows moves to bittyd; anything
  needing a window stays in Core.
- **SSH platform service** ([bitty#2065](https://github.com/bitty-terminal/bitty/issues/2065)):
  multi-consumer SSH service hosted in bittyd once the trust
  boundary above exists.
- **bitty-remote pairing** ([bitty#2066](https://github.com/bitty-terminal/bitty/issues/2066)):
  mobile control plane with pairing, end-to-end encryption, and scope
  tokens, gated on the bittyd trust boundary.

## Residual risks

Stated honestly; none of the enforced gates above mitigate these,
and no planned item fully does either.

1. **Allowlisted-but-malicious behavior.** A tool that stays inside
   its verbs, args, env, and budget but misuses them (for example a
   read verb pointed at a sensitive path the grant legitimately
   covers) passes every gate. Distinguishing malicious use from
   legitimate use inside an allowance is unsolved industry-wide;
   mediation bounds the blast radius but cannot judge intent.
2. **Prompt injection.** Terminal output is untrusted observation
   data, never instructions — but defending agent and model
   consumers against injected instructions in that data belongs to
   the AI lane, not to execution mediation. This page claims no
   prompt-injection protection.
3. **Consent fatigue.** Every sensitive path needs explicit consent,
   and frequent prompts train users to approve reflexively. Grants
   stay narrow and session-scoped to limit what one reflexive click
   yields, but the human factor remains the weakest approval link.
4. **Partial confinement and bounded attribution.** Linux confinement on
   admitted tools restricts exec only; it does not confine file I/O, memory
   maps, or network access. Non-Linux admitted tool spawns refuse by design.
   Generic non-tool execution and secret-tier helpers are outside this
   profile. Ledger eviction loses older decisions, and argument previews
   can retain caller-supplied secrets; no durable audit or redaction proof
   follows from the attribution ledger.
5. **Pre-audit status.** The audit program in
   [bitty#975](https://github.com/bitty-terminal/bitty/issues/975)
   is open. Until independent P0-AC evidence lands, every
   `[Enforced]` item above is implementation evidence only. This
   page makes no absolute claims — no zero-ambient-authority, no
   verified-confinement, no audit-passed language.

## Security review

This page states the security assessment for the trust boundary it
describes (extension and tool execution mediation), as required by the
specification spine.

- **Boundary.** The mediated operation is an extension or tool spawn
  crossing from plugin-declared intent into host execution. The gate
  is the request path described above; deny-by-default is the posture
  whenever no narrow grant applies.
- **Enforced posture.** Request gates fail closed. Admitted Linux tools
  additionally inherit EXECUTE-only Landlock; non-Linux platforms refuse
  those spawns. File I/O, memory maps, and network access remain outside
  this ruleset; no full OS isolation is claimed.
- **Residual risk.** The five residual risks above are not mitigated
  by any enforced or planned gate. Prompt-injection defense belongs to
  the AI lane and is not claimed here.
- **Evidence status.** The audit program
  ([bitty#975](https://github.com/bitty-terminal/bitty/issues/975)) is
  open. Until independent P0 acceptance evidence lands, every
  `[Enforced]` item is implementation evidence only; this page makes
  no absolute confinement or audit-passed claim.
- **Numeric bounds.** The argv and payload bounds, the tracked-outcome
  cap, and the filesystem and spawn-ledger sizes are source-observed
  values pending independent re-verification; treat them as current
  implementation status, not accepted normative limits.

## Verification plan

- [ ] Every `[Enforced]` claim traces to a named `bitty` source on
      `origin/main` (argv allowlist and bounds in
      `bitty-plugin-host/src/tools.rs`, consent lifecycle and ledger
      in `bitty-plugin-host/src/fs_authz.rs`, roles and
      `sandbox-exec` in `bitty-plugin-host/src/roles.rs`, verdicts
      and budgets in
      `bitty-runtime/src/plugin_runtime/spawn.rs`, pins in
      `bitty-package/src/trust.rs`, source transparency in
      `bitty-terminal/src/plugin.rs` and
      `bitty-runtime/src/plugin_runtime/package.rs`, immutable
      payload layout in the `bitty` packaging README).
- [ ] Every `[Planned]` claim resolves to its owning tracker and no
      planned item is worded as enforced. Confinement and ledger presence
      are checked at `1c68de25` and source transparency at `b5145675`,
      separately from broader roadmap work.
- [ ] No claim exceeds `draft`; no absolute pre-audit language
      appears (zero-ambient-authority, verified, audit-passed).
- [ ] This page agrees with [Core and Plugin
      Boundaries](core-boundaries.md) and [Extension, Plugin, and
      Component Directory Semantics](directory-semantics.md) and
      duplicates neither.
- [ ] `just check` (format, markdownlint, links, metadata,
      language, hygiene) passes.

## Alternatives considered

- **Shell-string mediation with an escaping allowlist.** Rejected:
  escaping is deny-list thinking and fails open on the next shell
  feature; argv-vector mediation with no shell in the path removes
  the interpolation class instead of filtering it.
- **One ambient execution grant per plugin.** Rejected: it merges
  distinct trust decisions (which binary, which verbs, which paths)
  into one boolean and makes silent widening invisible. Per-request
  mediation with per-path consent keeps each decision attributable.
- **Deferring the page until full confinement is available.** Rejected:
  operators need the implemented-versus-planned split and the explicit
  EXECUTE-only and attribution-ledger limits before the audit.
- **Placing this page under `security/` alongside the audits.**
  Rejected: `security/` holds revision-locked audit records for
  parser, clipboard, loader, and image surfaces; this page is an
  architecture threat model of a mediation mechanism, so it sits in
  `architecture/` next to the boundary and directory pages it
  constrains itself against.

## Affected contracts

- [Core and Plugin Boundaries](core-boundaries.md): unchanged; this
  page is a mediation consequence of its accepted gates.
- [Extension, Plugin, and Component Directory
  Semantics](directory-semantics.md): unchanged; install roots defined
  there gain no execution path from anything written here.
- Plugin ecosystem contracts (Plugin Platform, Package Lifecycle):
  no wording change; signatures stay owned there, and the publish-side
  readability gate and mandatory pin remain owned by the registry
  work, with `bitty#2069` as the execution-tracked pointer.
- `bitty` packaging README (R2 bucket layout and CDN mapping): no
  change; the immutable prefix and `SHA256SUMS` convention cited
  here stay owned there.

## Open points

1. Non-Linux confinement mechanisms and any broader Linux confinement:
   implementation and independent evidence remain owning security work;
   this page records only the current EXECUTE-only slice.
2. Spawn-ledger persistence, query, aggregation, and redaction guarantees
   beyond the current bounded attribution surface: follow the shared
   security corpus; no new guarantee is decided here.
3. Signature scheme and identity roots: owned by the package
   lifecycle work; this page records only that TOFU is interim.
4. bittyd IPC trust details (socket permissions, `SO_PEERCRED`,
   cross-user denial, service API versioning): owned by
   `bitty#2064`; this page must not pre-decide them.
5. Re-verification of every `[Enforced]` claim against the code at
   each release: until the audit program (`bitty#975`) produces
   evidence, each sync pass re-checks the traced sources by hand.
6. Registry publish gate and mandatory `[source] sha256` rollout:
   install-side enforcement is recorded above, but nothing here
   constrains what `bitty-plugins` publishes until its validation
   refuses unreadable Lua and requires the pin.

## Acceptance criteria

- A reader can state, for any execution request, which gate decides
  it today, what verdict a violation receives, and which planned
  item (if any) hardens it further.
- Every claim is labeled `[Enforced]` or `[Planned]`; no planned
  item reads as implemented and no enforced item reads as verified.
- The residual-risks section names allowlisted-but-malicious use,
  prompt injection (AI lane), consent fatigue, partial confinement and ledger limits,
  and the open pre-audit state without absolute claims.
- The page agrees with the two architecture pages it constrains
  itself against and links rather than duplicates the owning
  contracts.

## P0 Review Sign-off

Not requested. This page defines no new trust boundary, grants no
capability, and weakens no P0 gate — it records existing gates and
planned hardening. Security review stays with the authoritative
security corpus and the owning implementation's focused reviews; the
open pre-audit state (`bitty#975`) is recorded above rather than
resolved here. A P0 sign-off entry will be added only if a later
revision touches a trust transition.

## References

- [Core and Plugin Boundaries](core-boundaries.md) — accepted
  ownership split and P0 gates this page must not weaken.
- [Extension, Plugin, and Component Directory
  Semantics](directory-semantics.md) — install roots whose placement
  never executes code.
- [Security](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  — authoritative cross-project security corpus (takes precedence on
  conflict).
- [bitty#2070](https://github.com/bitty-terminal/bitty/issues/2070) —
  owning issue: canonical threat-model page (this page).
- [bitty#2064](https://github.com/bitty-terminal/bitty/issues/2064) —
  bittyd core service host and IPC trust boundary.
- [bitty#2065](https://github.com/bitty-terminal/bitty/issues/2065) —
  SSH platform service in bittyd.
- [bitty#2066](https://github.com/bitty-terminal/bitty/issues/2066) —
  bitty-remote mobile control plane (pairing, E2E, scope tokens).
- [bitty#2067](https://github.com/bitty-terminal/bitty/issues/2067) —
  OS-level confinement inheritance for tool spawns.
- [bitty#2068](https://github.com/bitty-terminal/bitty/issues/2068) —
  spawn audit ledger for tool executions.
- [bitty#2069](https://github.com/bitty-terminal/bitty/issues/2069) —
  owning issue for Lua source transparency: install-side show-source,
  update diff, source pin, and readability gate are enforced above;
  the registry publish gate and mandatory pin remain planned.
- [bitty#975](https://github.com/bitty-terminal/bitty/issues/975) —
  open security and risk closure epic; no `Verified` claims until it
  lands.
- [bitty packaging README](https://github.com/bitty-terminal/bitty/blob/main/packaging/README.md)
  — owner of the R2/CDN key convention, `SHA256SUMS` sidecars, and
  immutable cache policy cited above.
