---
title: bittyd Current-Release Eligibility Gate (Candidate)
description: Conditional readiness checklist for shipping the terminal-only bittyd slice - contract sign-offs, worker refusal, conformance and parity evidence, platform cells, artifacts, P0 security evidence, docs synchronization, rollback, and non-goals
category: specifications
audience: contributor
document_type: policy
status: draft
website_publish: false
sidebar_order: 84
---

# bittyd Current-Release Eligibility Gate (Candidate)

> Status: **candidate conditional gate, not release authorization.** This
> document defines when the terminal-only `bittyd` slice may be called eligible
> for the current release train. Eligibility is a checklist that every row must
> satisfy; it is not a tag, a publication, a channel update, or an owner
> approval. No row here authorizes a tag, an artifact upload, a CDN or R2 write,
> a catalog update, or a stable-pointer move, and nothing in this document
> claims that `bittyd` is implemented.
>
> At authoring (2026-10-27) three structural rows are met — the accepted
> session-host contract (whose `D-01` keeps worker hosting out of the ship),
> ADR 0019 as accepted and unchanged, and the no-persistence constraint that
> makes rollback migration-free — and every implementation-dependent row is
> open. The gate stays `draft` until the owner records the first eligibility
> decision; the decision then records which rows are met, never a blanket
> "eligible".

| Control          | Value                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status           | Candidate conditional gate; not release authorization                                                                                                                                                                   |
| Issue            | [bitty#2666](https://github.com/bitty-terminal/bitty/issues/2666) — define the bittyd current-release eligibility gate                                                                                                  |
| Parent           | [bitty#2546](https://github.com/bitty-terminal/bitty/issues/2546) — define the bittyd session-host contract                                                                                                             |
| Release train    | The stable release tracked by milestone `v0.2.0`; the exact tag and version are assigned by the release owner at tag time, not fixed here                                                                               |
| Upstream records | Accepted [session-host contract](bittyd-session-host-contract.md), [promotion record](bittyd-session-host-promotion-record.md), the [IPC freeze](bittyd-ipc-contract.md), ADR 0008, ADR 0019, ADR 0002, security corpus |
| Implementation   | bitty#2601 through #2609. Only the `bitty-daemon` seam is merged on `main` (`a35041d8`); the session registry is in review (bitty#2601, PR #2751). No listener, endpoint, registry state, or conformance driver exists  |
| Evidence status  | Zero conformance vectors have run; zero P0 evidence exists; no artifact, package, or channel has been produced for `bittyd`                                                                                             |
| Change authority | Release owner owns the gate; the security corpus co-owns the P0 evidence rows; the Core platform owns the implementation rows                                                                                           |
| Promotion gate   | Every row `MET` with a recorded artifact, then explicit owner authorization for the publication action, which this document never performs                                                                              |

## Document status

### What this gate decides

- Whether the terminal-only `bittyd` slice may enter the **current** release
  train without moving the planned `v0.2.0` milestone.
- Which evidence artifact closes each condition, and which repository gate
  enforces it.
- Which conditions are non-goals, so an incomplete slice is not silently
  relabeled as complete.

### What this gate never decides

- It does not authorize a tag, a GitHub release, an R2 upload, a `latest.txt`
  move, a package-channel publish, a catalog entry, or a support commitment.
- It does not accept a security control, a contract, or an ADR; those keep
  their own review records.
- It does not make a fake-server run, a cross-compiled build, or a dry run into
  real-service evidence.
- It does not change the milestone, the release ladder, or the preview channel.

## Purpose and scope

The daemon slice is unusual: it can be fully documented, reviewed, and still be
unsafe to ship because a control has no evidence. The release train needs a
single, auditable answer to "may this slice ship now?" that is separate from the
question "did we implement it?" and separate again from "did the owner decide to
publish it?".

This document is that answer sheet. It is a policy, not a plan: it names the
condition, the artifact that proves it, and the gate that enforces it, and it
leaves the work to the implementation and release tasks.

In scope:

- contract, sign-off, and documentation prerequisites;
- the `worker_sessions=false` and daemon-absence guarantees;
- implementation, fake/real parity, Linux native evidence, and advertised cells;
- package, binary, startup, safe-mode, and headless behavior;
- `P0-AC-021` through `P0-AC-026` evidence, plus the `F-9`/`F-12` slice gates;
- the rollback and abort plan;
- explicit non-goals.

Out of scope and owned elsewhere:

- the release workflow, packaging recipes, and channel publishers in `bitty`;
- the conformance corpus and drivers (bitty#2605, #2665);
- the security review record (bitty#2608);
- the daemon implementation (bitty#2601 through #2609);
- preview releases, which are governed by the accepted
  [Preview Release Contract](preview-release-contract.md) and never carry a
  daemon support claim.

## Normative sources this gate must not weaken

| Source                                                                                                                               | What it binds here                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md) (accepted) | The v0.2.0 slice and its exclusions: no remote, no restart persistence, no autostart requirement, and explicit evidence for the trust transition. |
| [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md) (accepted)               | Daemon definitions, single PTY ownership, bounded persistence, contained failure, attributed enforcement, and both trust gates.                   |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Platform tiers and the rule that cross-compilation or emulation is never evidence for a Tier 1 cell.                                              |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted)                                                           | The service surface, the conformance matrix, the fake-server plan, the limits, and the platform-cell rule this gate samples.                      |
| [Promotion record](bittyd-session-host-promotion-record.md) (accepted)                                                               | The slice order, the sign-off state, and the review-wide obligations.                                                                             |
| [bittyd IPC Contract](bittyd-ipc-contract.md) (candidate)                                                                            | The frozen service names and the compatibility rule that a release must satisfy; a candidate freeze is not implementation evidence.               |
| [Preview Release Contract](preview-release-contract.md) (accepted)                                                                   | Preview artifacts never carry a stable claim, never touch a stable pointer, and are not evidence for this gate.                                   |
| [Security corpus](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                      | `P0-AC-021` through `P0-AC-026`, the T-09/T-10/T-11 threat lines, and the rule that a P0 control without evidence is a release blocker.           |
| [bitty#2666](https://github.com/bitty-terminal/bitty/issues/2666)                                                                    | The gate scope and acceptance criteria. Issue text is not a normative source for a control.                                                       |

## Terminology

| Term                  | Meaning in this document                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eligibility           | Every row in the checklist is `MET` and the owner has recorded the eligibility decision. It is not publication authorization.                     |
| Evidence artifact     | A reviewable, durable record: a conformance run with its metadata, a CI run, a security review record, a release run, or a signed owner decision. |
| Enforcing gate        | The repository-level check that fails when the evidence is absent or stale.                                                                       |
| `MET`                 | The artifact exists, covers the advertised cells, and is reviewed on the revision being shipped.                                                  |
| `OPEN`                | No artifact exists yet, or the artifact does not cover the claimed scope.                                                                         |
| `BLOCKED`             | The row cannot be satisfied until a named decision or upstream slice lands.                                                                       |
| Typed skip            | A vector that cannot run on a cell and is recorded as skipped with a reason. A typed skip is never a pass.                                        |
| Advertised cell       | A platform the build claims to support and for which native evidence exists.                                                                      |
| Publication action    | The owner-authorized act of tagging, publishing artifacts, moving a channel pointer, or updating a catalog. This document never performs it.      |
| Current release train | The stable release whose milestone is `v0.2.0`; the version number is assigned at tag time by the release owner.                                  |

## Gate rules

1. **All rows, one decision.** Eligibility requires every row `MET`. A partial
   checklist is recorded as "not eligible" with the open rows named; there is no
   "eligible except" status.
2. **Evidence, not intent.** A merged contract, a plan, a dry run, a
   cross-compiled build, or a fake-server pass is not evidence for a row that
   names real-service or release behavior.
3. **Evidence is revision-bound.** Evidence recorded against a commit other than
   the one being released is stale. A dependency bump, a workflow change, or a
   contract revision invalidates the rows it touches until re-run.
4. **Typed skips are reported, never counted.** A privileged-setup vector that
   cannot run records its reason and keeps its row `OPEN` unless the row
   explicitly accepts a documented residual.
5. **No control is waived by schedule.** A missed milestone moves the release,
   not the gate. The milestone itself is never redefined to make the slice fit.
6. **Readiness and publication are separate.** The gate can be `MET` and the
   release still not happen; the owner authorizes publication as a distinct act
   after the gate passes.
7. **No self-certification.** The implementer does not sign the security or
   consumer rows, and a green CI run does not substitute for an independent
   review.
8. **Rollback is a precondition.** A slice without a recorded rollback and abort
   path is not eligible, even when every other row is green.

## Current gate state

At authoring (2026-10-27):

| Area                    | State   | Why                                                                                                                                        |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Contract and authority  | Partial | The session-host contract and promotion record are accepted; the IPC freeze is a candidate and the consumer/security sign-offs are pending |
| Worker refusal          | `OPEN`  | The accepted text requires `worker_sessions=false`; no build exists to advertise it                                                        |
| Implementation          | `OPEN`  | Only the crate seam is merged on `main` (`a35041d8`); the registry is in review, and no listener or endpoint exists                        |
| Conformance and parity  | `OPEN`  | No driver, no corpus run, no parity record                                                                                                 |
| Platform cells          | `OPEN`  | No native run on any cell; Linux x86_64 is the only intended first cell                                                                    |
| Artifacts and packaging | `OPEN`  | No `bittyd` artifact exists; `release.yml` builds only the `bitty` binary today                                                            |
| Security P0 evidence    | `OPEN`  | Zero P0 evidence; bitty#2608 has recorded reviews, not implementation evidence                                                             |
| Documentation           | Partial | Contract and freeze exist; release notes, ADR state, and the `bitty` docs pin are unchanged for a daemon ship                              |
| Rollback                | `OPEN`  | No release is planned yet; the rollback path is specified here, not exercised                                                              |

## Readiness checklist

The tables below are the gate. Each row names one condition, the artifact that
proves it, the gate that enforces it, an owner, and its state. A row without an
artifact cannot be marked `MET`.

Owner is a role, not a person: contract owner, release owner, security owner
(bitty#2608), Core platform, Core architecture, conformance owner
(bitty#2605/#2665), packaging owner, consumer owners (Wheel and `bitty-ai`), and
docs curator. The owner column records who must produce or accept the artifact,
never who merely filed it.

### A. Contract and authority

| ID   | Condition                                                                                                                     | Evidence artifact                                                                               | Enforced by                                                            | Owner             | State  |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------- | ------ |
| A-01 | The terminal-only session-host contract and its promotion record are accepted and unchanged in meaning                        | The two accepted documents with `status: accepted`; the `D-01` through `D-18` disposition table | `just check` metadata plus docs review; accepted status is the record  | Contract owner    | `MET`  |
| A-02 | The IPC freeze is accepted with its owner, consumer, architecture, security, and docs-curator sign-offs recorded              | The freeze document `status` and its completed sign-off table                                   | Docs review; a candidate freeze cannot be cited as an accepted surface | Contract owner    | `OPEN` |
| A-03 | The owner records the eligibility decision for this train                                                                     | A dated owner decision listing every row and its state                                          | Release owner review; no machine gate                                  | Release owner     | `OPEN` |
| A-04 | Independent security review of the implemented surface is recorded with the P0 evidence                                       | The bitty#2608 review record and the evidence matrix it approves                                | Security review record; a missing review is an implementation blocker  | Security owner    | `OPEN` |
| A-05 | Core architecture review records the crate seam, single-writer rule, registry, and counter semantics                          | The bitty#2606 review record                                                                    | PR review on the seam slice                                            | Core architecture | `OPEN` |
| A-06 | Wheel and `bitty-ai` consumers record that the adapter and fake server target the frozen surface with `worker_sessions=false` | The consumer review records; the adapter conformance run                                        | Consumer review plus the adapter suite                                 | Consumer owners   | `OPEN` |

### B. Worker refusal and daemon absence

| ID   | Condition                                                                                                         | Evidence artifact                                                                        | Enforced by                                                              | Owner           | State  |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- | ------ |
| B-01 | Every shipped build advertises `worker_sessions=false`                                                            | Real handshake capture for vector `V-03` on each advertised cell                         | Conformance driver (bitty#2605); the value is compiled, not configurable | Core platform   | `OPEN` |
| B-02 | `session.create` with `kind: worker` is refused with `Denied/UnsupportedCapability` before any process is spawned | `V-03` run record plus the post-request process-table check                              | Conformance driver; a spawn after refusal fails the vector               | Core platform   | `OPEN` |
| B-03 | No consumer adapter starts an in-process worker as a fallback                                                     | Adapter suite results for `V-29` and `V-30`                                              | Consumer suite; a fallback fails the vector                              | Consumer owners | `OPEN` |
| B-04 | `bitty --safe`, headless tests, and plain invocation work with no daemon present                                  | `C-08` run record and the headless test job                                              | `bitty` CI `Quality gates`; daemon absence is a supported state          | Core platform   | `OPEN` |
| B-05 | No endpoint is a startup, diagnostics, or safe-mode dependency                                                    | Startup path review plus `C-08`; a missing endpoint returns a typed "no endpoint" result | `bitty` CI and the release smoke test                                    | Core platform   | `OPEN` |

### C. Implementation and conformance

| ID   | Condition                                                                                                           | Evidence artifact                                                                                                | Enforced by                                                     | Owner             | State  |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------- | ------ |
| C-01 | Every implementation slice (bitty#2601 through #2609) is merged on the release commit                               | The merged PRs and the release commit's green `Quality gates` run                                                | `bitty` CI; `mergeable` plus required checks on each PR         | Core platform     | `OPEN` |
| C-02 | The fake server passes every fake-capable vector and every run is labeled `candidate-not-bittyd`                    | The fake-server run record with the vector list and the label                                                    | Adapter suite; an unlabeled or forked expectation fails the run | Conformance owner | `OPEN` |
| C-03 | The real service passes `C-01` through `C-19` and every real-required `V-*` vector on Linux x86_64                  | The real-service conformance record, per-vector pass/fail, with instance, commit, cell, capabilities, and limits | Conformance driver (bitty#2605) in `bitty` CI                   | Conformance owner | `OPEN` |
| C-04 | The parity gate passes: fake and real service agree on the same vector ids and expected results                     | The parity report naming any divergence and its resolution                                                       | Conformance driver; a divergence blocks the real-service claim  | Conformance owner | `OPEN` |
| C-05 | Privileged-setup vectors run, or record a typed skip with a reason and keep their row open                          | The run record for `C-12`, `C-13`, `C-15`, `C-16`, `V-25` through `V-28`                                         | Conformance driver; a typed skip is never counted as a pass     | Conformance owner | `OPEN` |
| C-06 | Every run records the service version, contract revision, daemon instance, capability set, limits, commit, and cell | The evidence record schema and one conforming record per vector class                                            | Conformance driver; an incomplete record is not evidence        | Conformance owner | `OPEN` |
| C-07 | No cross-compilation, emulation, or CI-built binary is used as native evidence                                      | The per-cell run record showing the native runner                                                                | ADR 0002 rule; release review                                   | Conformance owner | `OPEN` |

### D. Platform cells

| ID   | Condition                                                                                            | Evidence artifact                                                            | Enforced by                                             | Owner             | State  |
| ---- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------- | ------ |
| D-01 | Linux x86_64 is the only advertised cell until its native run is recorded                            | The Linux x86_64 native conformance record                                   | Conformance driver; release notes must match the record | Conformance owner | `OPEN` |
| D-02 | Any second advertised cell has its own native-runner conformance record before advertisement         | The per-cell native record for Windows x86_64, macOS ARM64, or a Tier 2 cell | ADR 0002 tier rule; release review                      | Conformance owner | `OPEN` |
| D-03 | Unadvertised cells return `Denied/UnsupportedPlatform` or have no endpoint, never a weaker transport | The refusal record for each unsupported cell tested                          | Conformance driver; a fallback transport fails the cell | Conformance owner | `OPEN` |
| D-04 | Namespace, SID, and elevation mismatches fail closed                                                 | The identity-mismatch test record for each advertised cell                   | Conformance driver; P0-AC-021 evidence                  | Security owner    | `OPEN` |

### E. Artifacts, startup, and packaging

| ID   | Condition                                                                                                                                                | Evidence artifact                                                                                         | Enforced by                                                                     | Owner           | State  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------- | ------ |
| E-01 | A `bittyd` library crate and binary are built by the release pipeline for every advertised cell                                                          | The `release.yml` run and its per-target build logs                                                       | `release.yml` `validate` and build jobs; `just release-smoke-test`              | Packaging owner | `OPEN` |
| E-02 | The artifact set, names, checksums, and provenance are recorded, and the read-back verification passes                                                   | The release run's `SHA256SUMS`, per-asset `.sha256`, `provenance.json`, and the `r2-mirror` read-back log | `release.yml` `r2-mirror`; `just release-smoke-test`, `just release-paths-test` | Packaging owner | `OPEN` |
| E-03 | The version is aligned across Cargo, packaging, the tag, and the service version the binary reports                                                      | The `check-release-version.sh` output and a `bittyd` version/handshake capture                            | `release.yml` `validate`; `just package-manifests-test`                         | Packaging owner | `OPEN` |
| E-04 | Explicit start only: no autostart, service file, or login item is required or installed by default                                                       | The install tree listing and the startup-path review                                                      | Install smoke test (`just install-smoke-test`); release review                  | Packaging owner | `OPEN` |
| E-05 | A second instance fails with a typed "already running" result and does not disturb the first                                                             | The single-instance lock test record                                                                      | Conformance driver; startup test                                                | Core platform   | `OPEN` |
| E-06 | Exit codes match `D-05`: `0` success, `1` internal before listening, `2` usage, `3` active sessions, `4` drain forced, `5` unverified worker, `6` tamper | The CLI exit-code test record per mode                                                                    | Conformance driver plus `bitty ctl` tests                                       | Core platform   | `OPEN` |
| E-07 | Install, upgrade, and uninstall leave no daemon state behind and do not require a migration                                                              | The package install/upgrade/uninstall smoke record                                                        | `just install-smoke-test`, `just package-manifests-test`                        | Packaging owner | `OPEN` |
| E-08 | The packaging choice for `bittyd` (same archive as `bitty` or a separate asset) is recorded in the packaging index before the artifact ships             | The packaging index entry and the release asset list                                                      | Release review; today `release.yml` builds only the `bitty` binary              | Packaging owner | `OPEN` |
| E-09 | Release notes state the daemon scope, the exclusions, and that daemon absence remains supported                                                          | The drafted release notes for the train                                                                   | Release owner review                                                            | Release owner   | `OPEN` |

### F. Security P0 evidence

The evidence rows below are owned by [bitty#2608](https://github.com/bitty-terminal/bitty/issues/2608).
A row marked with a follow-up keeps the gate open until the follow-up is closed
or an accepted residual is recorded; neither `F-9` nor `F-12` may be downgraded
by this gate.

`F-9` and `F-12` (no zero padding) are the bitty#2608 follow-up gate names
referenced by F-07 and F-08. Readiness rows use zero-padded identifiers and
deliberately skip `F-09` and `F-12`: the orphan-reaping and no-downgrade
conditions are rows `F-13` and `F-14`, so the two vocabularies never collide.

| ID   | Condition                                                                                                                                                                      | Evidence artifact                                                                                                                                                                                                                   | Enforced by                                                     | Owner          | State  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- | ------ |
| F-01 | `P0-AC-021`: peer credentials captured before parsing, endpoint tamper exits `6`, no TCP listener, single instance                                                             | The endpoint/peer test record, the tamper test, the no-TCP scan, and the second-uid rejection (`V-25`, `V-26`, `V-28`, `C-02`)                                                                                                      | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-02 | `P0-AC-022`: per-action scopes, the full scope×method matrix, inspect-only create refused, host consent and `process.spawn` both required                                      | The `C-09` and `C-19` run records plus the matrix table                                                                                                                                                                             | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-03 | `P0-AC-023`: explicit child environment, no daemon secret in the child, `close_range(..., CLOEXEC)`, child `/proc/self/fd` scan                                                | The `C-12` run record and the child descriptor scan                                                                                                                                                                                 | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-04 | `P0-AC-024`: metadata-only snapshots, content needs a live lease plus `terminal.inspect`, worker hosting refused, no baseline host consent                                     | The `C-09` record and the content-boundary test                                                                                                                                                                                     | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-05 | `P0-AC-025`: `debug.*` scopes stay distinct and are never granted by connection                                                                                                | The DevTools scope test record                                                                                                                                                                                                      | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-06 | `P0-AC-026`: audit and diagnostics are content-free, raw correlation values are hashed, tokens and bearers never appear, redacted `Debug`, no core dumps                       | The `C-07` and `C-14` records plus the diagnostic-export inspection                                                                                                                                                                 | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-07 | `F-9` (idempotency dedupe keys) is closed or recorded as an accepted residual by the security owner                                                                            | The follow-up decision in the bitty#2608 record and the idempotency slice tests                                                                                                                                                     | Security review record; the idempotency slice gate (`F-9`)      | Security owner | `OPEN` |
| F-08 | `F-12` (privileged peer re-check and plugin `connect()` denial evidence) is closed or recorded as an accepted residual                                                         | The `C-15` and `C-16` records, the plugin seccomp negative test, and the follow-up decision                                                                                                                                         | Security review record; the plugin-adjacent slice gate (`F-12`) | Security owner | `OPEN` |
| F-10 | Audit rotation, refusal-flood aggregation, `audit_degraded`, and bounded loss are demonstrated                                                                                 | The `C-07` and `C-14` records                                                                                                                                                                                                       | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-11 | The trust-boundary residuals are recorded in the threat model and risk register: same-uid impostor, live descriptor passing, plugin sidecar, spawned worker, adapter, debugger | The updated [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) and [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md) entries | Security review record; bitty-docs review                       | Security owner | `OPEN` |
| F-13 | Orphan reaping proves two-phase identity, pid-reuse refusal, and never signalling an unverified record                                                                         | The `C-03` and `C-13` crash-injection records                                                                                                                                                                                       | Security review record; conformance driver                      | Security owner | `OPEN` |
| F-14 | No accepted P0 criterion is downgraded to a suggestion in the release record                                                                                                   | The bitty#2608 evidence matrix mapping each `P0-AC` row to its artifact                                                                                                                                                             | Security review record; release owner review                    | Release owner  | `OPEN` |

### G. Documentation and governance

| ID   | Condition                                                                                                   | Evidence artifact                                                              | Enforced by                                                                                                                   | Owner          | State  |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| G-01 | The contract, the IPC freeze, and this gate are current and honestly statused                               | The three documents plus the register rows                                     | `just check` in `bitty-terminal-docs`; docs review                                                                            | Docs curator   | `OPEN` |
| G-02 | `D-01` keeps worker hosting out of the v0.2.0 slice, and ADR 0019 is unchanged                              | The accepted session-host contract `D-01` and ADR 0019 (accepted, unchanged)   | Docs review; enabling workers requires a dated ADR 0019 amendment plus security review (`D-01`); release-note wording is G-05 | Contract owner | `MET`  |
| G-03 | The threat model, risk register, and P0 acceptance criteria carry the daemon rows                           | The bitty-docs change that adds the daemon `T-*`/`R-*` and P0 evidence entries | bitty-docs review                                                                                                             | Security owner | `OPEN` |
| G-04 | The platform matrix and support statement list the advertised cells and the daemon's unsupported surfaces   | The updated release ladder or platform matrix                                  | Docs review                                                                                                                   | Docs curator   | `OPEN` |
| G-05 | Release notes and changelog state the daemon scope, the exclusions, and daemon absence as a supported state | The release notes draft and the changelog entry                                | Release owner review                                                                                                          | Release owner  | `OPEN` |
| G-06 | The `bitty` docs submodule pin points at the merged documentation revision                                  | The pin bump and `scripts/docs-pin.sh` check                                   | `just docs-pin-test` in the release checklist                                                                                 | Docs curator   | `OPEN` |
| G-07 | The documentation is English-only, self-contained, and free of research references                          | The `language`, links, and hygiene checks                                      | `just check` (`language`, `links`, `hygiene`)                                                                                 | Docs curator   | `OPEN` |

### H. Rollback and recovery

| ID   | Condition                                                                                                                                  | Evidence artifact                                                                                       | Enforced by                                                                  | Owner          | State  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- | ------ |
| H-01 | The eligibility decision is recorded before the tag is created, and a failed packaging validation stops the release before any publish job | The dated eligibility decision and the failing validation run                                           | Release owner checklist; `release.yml` `validate`; `just release-smoke-test` | Release owner  | `OPEN` |
| H-02 | After a tag: a defect handling path exists for an immutable artifact, including withdrawing a recommendation and repointing a channel      | The release owner's rollback record naming the affected tag, channels, and advisory                     | Release owner; channel publisher gates                                       | Release owner  | `OPEN` |
| H-03 | A rollback never requires a session migration, because no session survives a daemon restart or a release rollback                          | The accepted contract `D-06`/`D-17` no-persistence rule and ADR 0019's no-restart-persistence exclusion | Contract review of `D-06`/`D-17`; release-note wording is G-05               | Contract owner | `MET`  |
| H-04 | The kill switch is daemon absence: clients keep working when `bittyd` is absent, stopped, or rolled back                                   | `C-08` and the adapter `V-29` record                                                                    | Conformance driver; release smoke test                                       | Core platform  | `OPEN` |
| H-05 | A P0 failure after publication triggers an owner-authorized rollback or withdrawal, never a silent patch inside a shipped artifact         | The advisory and the owner authorization record                                                         | Security review record; release owner                                        | Release owner  | `OPEN` |

## Owner authorization and publication boundary

Eligibility and publication are two decisions with two records.

1. **Eligibility decision.** The release owner records the dated row-by-row
   state. A row with no artifact is `OPEN`; the decision cannot list it as
   satisfied by intent. The decision is the only thing that changes the gate's
   status, and this document never performs it.
2. **Publication authorization.** After eligibility, the owner separately
   authorizes the tag, the artifact upload, the channel update, or the catalog
   entry. That authorization names the exact tag, the channels, and the rollback
   owner.
3. **What this document never does.** It never creates a tag, runs a release
   workflow, writes to R2 or the CDN, updates `latest.txt`, publishes a package
   recipe, or changes a stable pointer. Those actions belong to `release.yml`
   and the release owner, under the channel rules in the packaging index.
4. **Preview is not a shortcut.** A preview release of the daemon slice proves
   nothing for this gate and never carries a support claim, a stable channel, or
   a `latest` pointer.

## Explicit non-goals

The following are deliberately outside the terminal-only ship. A release that
claims any of them is out of scope for this gate, regardless of the milestone.

- Worker sessions, generic process supervision, and worker credential
  inheritance. `worker_sessions` stays `false`; enabling it requires an ADR 0019
  amendment and the dedicated security review.
- Remote UI, remote attach, SSH, mobile control, or any network listener.
- Session persistence across a daemon restart, adoption after a crash, or
  rebinding a session to a new worker.
- Autostart, a login item, or a service unit as a requirement. Explicit start is
  sufficient for v0.2.0.
- Windows, macOS, FreeBSD, or Linux ARM64 advertisement before native-runner
  evidence.
- A daemon-wide admin token, an in-process worker fallback, or a second daemon
  per user.
- A crates.io install path for the binary, a support commitment for preview
  users, or a stable-pointer change performed by this task.
- Any change to the milestone, the release ladder, the preview channel, or the
  `terminal.*` scope meanings.

## Security review

This gate summarizes security conditions; it does not accept them. The security
review must confirm the following before any row is marked `MET`.

| Risk                                             | What the gate must not allow                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Shipping a P0 control with no evidence           | A `MET` row whose artifact is a plan, a fake run, a cross-build, or an unreviewed claim.                                           |
| Downgrading `F-9` or `F-12` to make a slice fit  | A release that closes the gate while either follow-up is open without an accepted residual from the security owner.                |
| Treating daemon absence as untested              | A release that never runs `C-08` or the headless and safe-mode path without a daemon.                                              |
| Advertising a cell without native evidence       | A release note, matrix entry, or package that names a cell with no native record.                                                  |
| Leaking content or secrets into release evidence | A conformance record, release log, or artifact that contains terminal text, argv, env, tokens, bearers, or raw correlation values. |
| Publishing before authorization                  | Any tag, upload, or channel write performed by the eligibility task or by an agent acting on its own.                              |
| Irreversible rollback                            | A release with no daemon-absence path, no channel withdrawal record, or a persisted state that a rollback would strand.            |

The reviewer must specifically challenge the artifact set (E-01/E-08), the
native-evidence claim per cell (C-07/D-01/D-02), and the daemon-absence path
(B-04/B-05/H-04), because each can pass a superficial checklist while failing the
trust transition the daemon exists to serve.

## Verification plan

At this candidate:

1. Every row names an evidence artifact and an enforcing gate; no row relies on
   an unnamed or non-existent check.
2. The state column is honest: only rows with real, reviewable artifacts are
   `MET`, and every implementation row is `OPEN` or `BLOCKED`.
3. `bitty#2608`, `F-9`, `F-12`, and `P0-AC-021` through `P0-AC-026` are named
   with their gates.
4. The rollback section distinguishes pre-tag, post-tag, and daemon-absence
   paths, and no path requires a session migration.
5. The non-goals match ADR 0019 and the accepted contract; nothing adds a
   capability the contract excludes.
6. `just check` and `git diff --check` are green; the document is English-only
   and self-contained.

At the eligibility decision (future, by the release owner):

1. Re-run every row against the exact release commit, not an earlier one.
2. Confirm each artifact still covers the advertised cells and the current
   service version.
3. Record the decision with the row states, the artifact links, and the
   remaining risks; a single `OPEN` row means "not eligible".
4. Record the separate publication authorization only after eligibility.

Definition of done for this candidate: the gate is merged with an honest
candidate status, the register row matches, the evidence rows name real gates,
and `just check` is green. It does not change any status to `MET` by itself.

## Alternatives considered

| Alternative                                                     | Trade-off                                                                                                        | Disposition                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Release when the milestone date arrives                         | Predictable calendar; ships a daemon with unproven controls and no rollback evidence.                            | Rejected; the milestone moves, not the gate.                                      |
| Accept a fake-server run as enough evidence                     | Fast and cheap; fake runs cannot prove peer credentials, reaping, or native cells.                               | Rejected; fake runs are labeled candidate-only and never close a real row.        |
| Trust a cross-compiled build for Windows or macOS               | No native runner needed; violates ADR 0002 and hides platform peer-credential gaps.                              | Rejected; a cell is advertised only after native evidence.                        |
| Make eligibility and publication one decision                   | Fewer steps; collapses evidence review into the irreversible act and removes the owner's separate authorization. | Rejected; two decisions, two records.                                             |
| Gate only on "tests pass"                                       | Simple; ignores sign-offs, packaging, rollback, documentation sync, and daemon absence.                          | Rejected; the checklist covers the release surface, not only code tests.          |
| Ship the daemon in every package format on day one              | Nothing to decide later; multiplies the artifact and rollback surface before the first native run.               | Deferred; the packaging choice is an explicit row (E-08) with its own review.     |
| Keep a stable pointer rollback as a manual, undocumented action | Less process; the rollback owner and channel state are unknown during an incident.                               | Rejected; rollback is a precondition and names the owner, channels, and advisory. |

## Affected contracts

| Contract                                                                   | Effect                                                                                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| [bittyd Session-Host Contract](bittyd-session-host-contract.md) (accepted) | Authoritative; this gate samples its conformance matrix, limits, platform rule, and worker exclusion without redefining them.       |
| [Promotion record](bittyd-session-host-promotion-record.md) (accepted)     | Unchanged; its slice order is the implementation order this gate assumes.                                                           |
| [bittyd IPC Contract](bittyd-ipc-contract.md) (candidate)                  | Consumed as the frozen name source; its acceptance is row A-02, not an assumption of this gate.                                     |
| [Preview Release Contract](preview-release-contract.md) (accepted)         | Unchanged; preview artifacts never satisfy this gate and never carry its claim.                                                     |
| [Release ladder](../product/release-ladder.md) and milestone `v0.2.0`      | Unchanged by this document. A daemon ship updates the support statement through row G-04 and the owner's publication decision.      |
| `bitty` `release.yml` and packaging index                                  | Consumed as the enforcement for artifact rows. The `bittyd` artifact set is an explicit open choice (E-08), not a change made here. |
| Security corpus (normative)                                                | `P0-AC-021` through `P0-AC-026` and the bitty#2608 evidence matrix are unchanged; this gate only requires their completion.         |
| [Specifications register](README.md)                                       | Adds one candidate row; the register never shows this gate as accepted or as release authorization.                                 |

## Open points

- **Current release identity.** The gate names the milestone `v0.2.0`; the exact
  tag and version stay with the release owner, so a release note can name the
  train without this document guessing a version.
- **`bittyd` artifact placement.** Whether the daemon ships in the existing
  `bitty` archives or as a separate asset per cell is undecided (E-08). It needs
  a packaging decision and a rollback statement before the artifact rows can be
  `MET`.
- **Service version in the artifact.** `bittyd --version` or the handshake must
  report the service version; the exact output contract is owned by the crate
  seam (bitty#2606) and must be pinned before E-03.
- **Privileged setups.** `C-12`, `C-13`, `C-15`, and `C-16` need a second uid or
  pid namespace, a delegated cgroup v2, a seccomp-capable plugin host, and
  per-message credential capture. The runner that provides them is not chosen
  yet; without it those rows stay `OPEN` with typed skips.
- **Second cell choice.** Windows x86_64 or macOS ARM64 may follow Linux x86_64;
  the order is evidence-driven and unset (D-02).
- **Residual acceptance.** If `F-9` or `F-12` cannot close before the train, the
  security owner must record an accepted residual; this gate does not grant one.
- **Publication channels.** Which package channels carry `bittyd` is a release
  owner decision after eligibility; this gate only requires that E-04, E-07,
  and H-02 name them.

## Acceptance criteria

This gate is complete when:

1. Every readiness row names a condition, an evidence artifact, an enforcing
   gate, and an owner, and its state is `MET`, `OPEN`, or `BLOCKED`.
2. The gate states that it is conditional only and never authorizes a tag,
   artifact, channel, catalog, or stable-pointer change.
3. `worker_sessions=false`, the typed worker refusal, and daemon absence are
   explicit rows with real-service evidence requirements.
4. Implementation, fake/real parity, Linux native evidence, and advertised cells
   are distinct rows, and a typed skip is never a pass.
5. The P0 evidence rows name bitty#2608, `F-9`, `F-12`, and `P0-AC-021` through
   `P0-AC-026`.
6. Documentation synchronization and the `bitty` docs pin are rows, not
   assumptions.
7. The rollback plan covers pre-tag, post-tag, and daemon-absence paths, and no
   path requires session migration.
8. The non-goals match ADR 0019 and the accepted contract.
9. The document is English-only, self-contained, and free of research
   references; `just check` and `git diff --check` are green.
10. The owner sign-off row records the eligibility decision separately from the
    publication authorization, and neither is implied by this candidate.

## P0 Review Sign-off

This gate claims no approval that is not listed.

| Reviewer                   | Required for                                                                                 | Status                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Release owner              | The gate text, the row set, and the eligibility/publication split                            | Submitted 2026-10-27                                                |
| Core terminal platform     | Implementation, artifact, startup, and rollback rows                                         | Pending; required before any row is marked `MET` for implementation |
| Security reviewer          | The P0 evidence rows, `F-9`/`F-12`, the residual rules, and the threat-model synchronization | Pending; bitty#2608 owns the evidence record                        |
| Wheel consumer reviewer    | Adapter, fake-server, and daemon-absence rows                                                | Pending                                                             |
| bitty-ai consumer reviewer | Worker refusal and hosted-worker exclusion                                                   | Pending                                                             |
| Docs curator               | Spine, metadata, index row, language, self-containment, and cross-document synchronization   | Pending; this delivery is submitted for review                      |

The first eligibility decision is a separate dated record. It cannot cite this
table as evidence, and this table cannot cite the decision as a review.

## References

- [bittyd Session-Host Contract](bittyd-session-host-contract.md) — conformance
  matrix, fake-server plan, limits, platform cells, and trust boundary.
- [bittyd Session-Host Contract Promotion Record](bittyd-session-host-promotion-record.md)
  — slice order and sign-off state.
- [bittyd IPC Contract (Candidate)](bittyd-ipc-contract.md) — frozen service
  names and compatibility rule.
- [Preview Release Contract](preview-release-contract.md) — preview isolation
  and the required-gates pattern this gate follows.
- [Release ladder](../product/release-ladder.md) — the v0.2.0 milestone and the
  daemon's staging.
- [ADR 0019 - bittyd Staging Advance to the v0.2.0 Slice](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  — accepted slice and exclusions.
- [ADR 0008 - Headless Daemon, Detach/Reattach and Remote UI Trust Boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  — accepted daemon definitions and trust gates.
- [ADR 0002 - Platform Support Tiers](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md)
  — platform tiers and native-runner evidence.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md), and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  — normative controls and evidence gates.
- [bitty#2608](https://github.com/bitty-terminal/bitty/issues/2608) — security
  review and P0 evidence for the daemon slice.
- [bitty#2666](https://github.com/bitty-terminal/bitty/issues/2666) — this
  conditional eligibility gate.
- [bitty#2605](https://github.com/bitty-terminal/bitty/issues/2605) — the
  conformance harness that enforces the parity and cell rows.
- [bitty#2665](https://github.com/bitty-terminal/bitty/issues/2665) — the frozen
  conformance corpus this gate samples.
