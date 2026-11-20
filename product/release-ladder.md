---
title: Release Ladder
description: Maps the Pre-alpha / Engineering Milestones M1-M8 stage (re-baselined 2026-11-20 at release v0.0.46, f854d5a9, 19 workspace crates of which 14 are publish = true) to the v0.1-v1.0 maturity ladder and the Implemented/Verified lifecycle
category: product
audience: maintainer
document_type: overview
status: draft
website_publish: false
sidebar_order: 21
---

# Release Ladder

## Status and provenance

- Stage: **Pre-alpha / Engineering Milestones M1-M8** at the canonical snapshot of
  `2026-10-02` (`bitty` synchronized revision `310bf87`, canonical
  `previous_revision` `2cb49af`, baseline `de134ec`, 18 crates, 54 OQs `Accepted`
  with 46 open, release `v0.0.21`). Earlier snapshots — `c6db24d` (`2026-09-27`,
  21 crates, `previous_revision` `679f12f`) and `799f743` before it — are
  retained as provenance in this paragraph and the dated status note below. The
  [revision-pinned implementation state](#revision-pinned-implementation-state-at-491c567-historical)
  below is historical evidence pinned to `491c567` after pivot-wave #1200-1213;
  `491c567` and `c6db24d` are separate rewritten histories with distinct root
  commits (`43739d0` and `9cbcce9`, no merge base), so `491c567` is neither an
  ancestor nor a descendant of `c6db24d` and no statement in that section is
  re-derived at `c6db24d`.
  Experimental implementations `c0aadd2` (CTX-0095 vertical slice, PR #148) +
  `7e3104d` (CTX-0096 dogfood, PR #149) + `a8735d0` (CTX-0098 PTY reply fix,
  PR #151) are `Implemented` (experimental) not `Verified`/`Compatible`. This
  ladder maps the accepted product, architecture, and security contracts to the
  candidate `v0.1`-`v1.0` maturity ladder in
  [Proposed Delivery Sequence](proposed-delivery-sequence.md) without weakening
  normative security controls. `R-004` clipboard evidence was re-audited at
  `bitty` `7a4ee41` (baseline `de134ec`) per
  [`security/audits/clipboard-2026-09.md`](../security/audits/clipboard-2026-09.md)
  (2026-08-31, CTX-0097) and remains `Open` with residual platform-backend,
  real-window UX, and `8192`-byte bound-scope limits; `R-005`/`R-006`/`R-007`
  at `bitty` `d4d75e9` (`5bdcdbd`/`0afc94d`/`d4d75e9`, Issues #137/#138/#139,
  baseline `de134ec`) are `Mitigated` per RS-1..RS-7, overall
  maturity remains `Pre-alpha` (not `Verified`/`Compatible`/`Release-ready`).
  Canonical snapshot:
  [`docs/project/project-state.json`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json)
  (synchronized `310bf87`, `2026-10-02`, `Pre-alpha / Engineering Milestones M1-M8`, `R-004`
  `Open`, `R-005`/`R-006`/`R-007` `Mitigated`, experimental `c0aadd2`/`7e3104d`/`a8735d0`
  `Implemented` not `Verified`, release `v0.0.21`) validated by `bun .github/scripts/check-state.mjs`.

> **Status note (2026-10-02, `bitty` `main`@`310bf87`).** The `21 crates`
> figure above is stale: `bitty-core` and `bitty-panels` are retired and
> `bitty-agent`/`bitty-ipc` were extracted to independent repositories
> (CTX-0918, CTX-0906), leaving an 18-crate workspace. Core now links
> `bitty-ipc` only as a git dependency (pin `e9714e7`), not as a workspace
> member. This note updates the current-state crate count only; the
> canonical synchronized snapshot in
> [`docs/project/project-state.json`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json)
> is updated separately and remains the authoritative source.

- Lifecycle: `Draft -> Experimental Implementation -> Accepted -> Verified -> Compatible -> Release-ready`
  (spec) and `Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
  (crate) per the [Risk Evidence RFC](../specifications/risk-evidence-rfc.md).
  All RFCs/ADRs are `Accepted` and `Implemented` (headless `Implemented` at
  `be3bdb4`, experimental `Implemented` at `a8735d0`) but remain `Implemented`
  not yet `Verified` until the evidence matrix (RS-1..RS-7,
  `unit`/`integration`/`adversarial`/`manual-audit`/`ci-gate`) is satisfied. No
  risk moves from `Open` while the matrix is `pending` except
  `R-005`/`R-006`/`R-007` moved `Open -> Mitigated` at `d4d75e9` per
  PR #144/#145/#146; `R-004` explicitly remains `Open` at `7a4ee41` (not
  `Mitigated`/`Verified`); experimental `c0aadd2`/`7e3104d`/`a8735d0` do not change risk
  state. Overall product remains not `Verified`/`Compatible`.
- Authority: the ladder is a planning companion to the maturity ladder; it does
  not authorize publication or compatibility. Closing any open question still
  requires its RFC/ADR with independent review per the
  [open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
- Companion evidence: [`release-mechanics.md`](../development/release-mechanics.md)
  (draft, CTX-0044) records the crate publish order and `cargo publish --dry-run`
  verification for the workspace. This document mirrors that intent for
  navigation. For `R-004`, the companion evidence is at `7a4ee41`
  (baseline `de134ec`, audit above) and remains `Open`; for `R-005`/`R-006`/`R-007`,
  companion evidence is at `d4d75e9` (`5bdcdbd`/`0afc94d`/`d4d75e9`, Issues
  #137/#138/#139) per `project-state.json` and remains `Mitigated` (not
  `Verified`).
- Decided extraction boundaries (direction only, no implementation): the
  small-core boundaries are decided by
  [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  and
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  with focused contracts `W-71` through `W-75`. This decision status does not
  change any row below: no extraction, migration, or relocation is implemented,
  and `W-75`'s contract that externalizes `bitty-compat-lab` and `bitty-perf` is
  not yet executed (`W-105`). At `v0.0.46` neither verification crate exists in
  the workspace, so the candidate pages below describe no current crate member;
  their implementation status is unchanged by this re-baseline. The affected
  implementation-status candidates
  ([`compat-lab.md`](compat-lab.md), [`compat-matrix.md`](compat-matrix.md),
  [`perf-baseline.md`](perf-baseline.md), [`perf-evidence.md`](perf-evidence.md),
  and the [terminal compatibility matrix](../reference/compatibility-matrix.md))
  stay candidate. See the
  [small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

**Re-baseline note (2026-11-20, `bitty` `v0.0.46`@`f854d5a9`, `main`@`f854d5a9`).**
The crate roster and release anchor stated above are superseded as _current
state_. `bitty` tags `v0.0.46` (annotated tag object `70ad5221`) at commit
`f854d5a9` (2026-11-20), which is also current `main`, and releases `v0.0.38`
through `v0.0.46` have all shipped. This re-baseline moves the anchor from
`5d19152` (the `v0.0.45` release) to `f854d5a9`. The workspace holds 19 crates,
14 of them `publish = true`; `bitty-com`, the Windows `bitty.com` console
companion proxy, is the one member added since the `v0.0.45` roster and it is
not published. The roster is re-derived in
[Workspace roster at v0.0.46](#workspace-roster-at-v0046-2026-11-20), and the
`v0.0.45` note and table below stay as dated provenance rather than being
deleted. The release publishes 51 GitHub Release assets, and the mirrored
[`SHA256SUMS`](https://cdn.bitty.run/releases/v0.0.46/SHA256SUMS) carries 49
entries, including `cb17346d6e567ad6ff15981cf6c5172a0e9ae692b3ff09fefe0b7e14aef4b36c`
for `bitty-0.0.46-x86_64-unknown-linux-gnu.tar.zst`, verified against a real
download of that archive. One post-release defect is known and tracked: the
Scoop channel's E2E assertion rejects the intentional `bitty.com` shim (`bitty`
issue #3279, fix in flight), so the channel is recorded here neither as broken
nor as repaired. The `2026-10-02` snapshot revision `310bf87` remains dated
provenance only: it is not an ancestor of current `main` (the history was
rewritten), so no statement in this document is re-derived from that tree.
Maturity, risk, and open-question judgements are deliberately unchanged by this
re-baseline; they stay as recorded at the snapshot until
[`project-state.json`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json)
is re-synchronized by its owning task. Nothing here upgrades a row to
`Verified`, `Compatible`, or `Release-ready`.

**Re-baseline note (2026-11-18, `bitty` `v0.0.45`@`5d19152`, `main`@`5d19152e`;
retained as dated provenance).**
The crate roster and release anchor above were superseded as _current state_,
first by this `v0.0.45` note and now by the `v0.0.46` note above.
`bitty` tagged `v0.0.45` (`5d19152`, 2026-11-18) on `main` `5d19152e`, and
releases `v0.0.38` through `v0.0.45` had all shipped. That re-baseline moved
the anchor from `67f51b5` (the `v0.0.44` snapshot, `7b3d3df`) to `5d19152`. The
workspace held 18 crates, 14 of them `publish = true`; that roster is
preserved in
[Workspace roster at v0.0.45](#workspace-roster-at-v0045-2026-11-18). The
`2026-10-02` snapshot revision `310bf87` is recorded here as dated provenance
only: it is not an ancestor of current `main` (the history was rewritten), so
no statement in this document is re-derived from that tree. Maturity, risk, and
open-question judgements were deliberately unchanged by that re-baseline; they
stay as recorded at the snapshot until
[`project-state.json`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json)
is re-synchronized by its owning task. Nothing here upgrades a row to
`Verified`, `Compatible`, or `Release-ready`.

## Workspace roster at v0.0.46 (2026-11-20)

Re-derived from `bitty` `Cargo.toml` workspace members and each member manifest
at tag `v0.0.46` (`f854d5a9`): 19 workspace members, 14 with `publish = true`.
`bitty-com` is the only member added since the
[v0.0.45 roster](#workspace-roster-at-v0045-2026-11-18): a dependency-free
`std`-only Windows console companion proxy shipped as `bitty.com` next to
`bitty.exe` (bitty#3224 via `#3234`), and it is not published. Retired members
(`bitty-core`, `bitty-panels`, `bitty-app`, `bitty-agent`, `bitty-compat-lab`,
`bitty-perf`) no longer exist in the tree, and the extracted `bitty-ipc` /
`bitty-agent` code lives in independent repositories linked as git dependencies,
not as workspace members.

| Crate                | Role (manifest description)                                                                       | `publish = true` |
| -------------------- | ------------------------------------------------------------------------------------------------- | ---------------- |
| `bitty-terminal`     | Terminal binary, thin composition root                                                            | no               |
| `bitty-com`          | Windows console companion proxy (`bitty.com`) that launches the sibling Bitty executable          | no               |
| `bitty-config`       | Typed, validated configuration pipeline                                                           | yes              |
| `bitty-daemon`       | `bittyd` session-host daemon: service version, capability set, handshake seam                     | no               |
| `bitty-lua`          | Deterministic phodopus Lua VM budgets for plugins                                                 | yes              |
| `bitty-package`      | Package lifecycle and integrity verification                                                      | yes              |
| `bitty-platform`     | Window and event-loop adapter (wraps `winit`)                                                     | yes              |
| `bitty-plugin-host`  | Draft plugin platform host                                                                        | yes              |
| `bitty-pty`          | PTY wrapper with backpressure and resize (native ConPTY spawn on Windows, `portable-pty` on Unix) | yes              |
| `bitty-render`       | GPU rendering pipeline (`wgpu`, `harfrust`/`swash` shaped text, `crossfont` fallback)             | yes              |
| `bitty-rich`         | Rich presentation helpers (draft)                                                                 | yes              |
| `bitty-runtime`      | Runtime orchestration for the Correct Terminal                                                    | yes              |
| `bitty-sandbox`      | Narrow inherited-OS-confinement adapter for plugin-spawned tools (Linux Landlock, fail-closed)    | yes              |
| `bitty-term-state`   | Terminal truth core: grid, state, damage, scrollback                                              | yes              |
| `bitty-test-support` | Shared test-harness helpers (live-PTY gating)                                                     | no               |
| `bitty-test-vm`      | VM test-tier controller: base-image/overlay policy and gated KVM smoke                            | no               |
| `bitty-ui`           | View, layout, and selection primitives                                                            | yes              |
| `bitty-vt`           | VT parser producing `TerminalAction` values (wraps `vte`)                                         | yes              |
| `bitty-winjob`       | Narrow reviewed Win32 adapter: job objects, ConPTY spawn, console adoption                        | yes              |

The publish split is a packaging fact, not a maturity signal: `publish = true`
marks a crate the publish order can push to the registry, and it says nothing
about `Verified` or `Compatible` status.

## Workspace roster at v0.0.45 (2026-11-18)

Re-derived at that re-baseline from `bitty` `crates/` and each member manifest
at tag `v0.0.45` (`5d19152`): 18 workspace members, 14 with `publish = true`,
preserved here as dated provenance. Retired members
(`bitty-core`, `bitty-panels`, `bitty-app`, `bitty-agent`, `bitty-compat-lab`,
`bitty-perf`) did not exist in that tree either, and the extracted `bitty-ipc` /
`bitty-agent` code lived in independent repositories linked as git dependencies,
not as workspace members.

| Crate                | Role (manifest description)                                                                       | `publish = true` |
| -------------------- | ------------------------------------------------------------------------------------------------- | ---------------- |
| `bitty-terminal`     | Terminal binary, thin composition root                                                            | no               |
| `bitty-config`       | Typed, validated configuration pipeline                                                           | yes              |
| `bitty-daemon`       | `bittyd` session-host daemon: service version, capability set, handshake seam                     | no               |
| `bitty-lua`          | Deterministic phodopus Lua VM budgets for plugins                                                 | yes              |
| `bitty-package`      | Package lifecycle and integrity verification                                                      | yes              |
| `bitty-platform`     | Window and event-loop adapter (wraps `winit`)                                                     | yes              |
| `bitty-plugin-host`  | Plugin platform host                                                                              | yes              |
| `bitty-pty`          | PTY wrapper with backpressure and resize (native ConPTY spawn on Windows, `portable-pty` on Unix) | yes              |
| `bitty-render`       | GPU rendering pipeline (`wgpu`, shaped text, `crossfont` fallback)                                | yes              |
| `bitty-rich`         | Rich presentation helpers                                                                         | yes              |
| `bitty-runtime`      | Runtime orchestration                                                                             | yes              |
| `bitty-sandbox`      | Narrow inherited-OS-confinement adapter for plugin-spawned tools (Linux Landlock, fail-closed)    | yes              |
| `bitty-term-state`   | Terminal truth core: grid, state, damage, scrollback                                              | yes              |
| `bitty-test-support` | Shared test-harness helpers (live-PTY gating)                                                     | no               |
| `bitty-test-vm`      | VM test-tier controller: base-image/overlay policy and gated KVM smoke                            | no               |
| `bitty-ui`           | View, layout, and selection primitives                                                            | yes              |
| `bitty-vt`           | VT parser producing `TerminalAction` values (wraps `vte`)                                         | yes              |
| `bitty-winjob`       | Narrow reviewed Win32 adapter: job objects, ConPTY spawn, console adoption                        | yes              |

## Revision-pinned implementation state at 491c567 (historical)

Everything in this section is evidence pinned to the `bitty` revision `491c567`
(after pivot-wave #1200-1213) and is superseded by the canonical snapshot in
_Status and provenance_ above. `491c567` and `c6db24d` are separate rewritten
histories (distinct root commits `43739d0` and `9cbcce9`, no merge base), so this
section is a historical record, not a description of the `c6db24d` tree.

- **Workspace** (historical; the current 19-crate roster is the
  [v0.0.46 table](#workspace-roster-at-v0046-2026-11-20) above): 21 members in
  `bitty/Cargo.toml` (edition 2024, resolver 3,
  `rust-version` 1.85, toolchain 1.98.1): `bitty-vt`, `bitty-pty`,
  `bitty-platform`, `bitty-config`, `bitty-package`, `bitty-lua` (`phodopus`
  git `1653c51`, after the piccolo-to-Phodopus swap #1204), `bitty-term-state`,
  `bitty-ui`, `bitty-render`, `bitty-plugin-host`, `bitty-rich`, `bitty-ipc`,
  `bitty-agent`, `bitty-runtime`, `bitty-app`, `bitty-core`, `bitty-panels`,
  plus verification/support crates `bitty-compat-lab`, `bitty-perf`,
  `bitty-test-support`, and `bitty-test-vm`. Ten leaves/branch crates are
  `publish = true` (`vt`, `pty`, `platform`, `config`, `package`, `lua`,
  `term-state`, `render`, `ui`, `ipc`); eleven tail/support crates remain
  `publish = false` until `Verified`.
- **Releases**: `v0.0.20` (`d9f5b49`, 2026-09-11) is the first workspace Cargo
  version bump since `0.0.1` (aligned by `scripts/check-release-version.sh`);
  `v0.0.19` (`c2aabee`, 2026-09-03) ships cross-platform `bitty`
  binaries (`bitty-<target>` dist assets plus `.sha256`, `SHA256SUMS`,
  `provenance.json`, `.deb`/`.rpm`/`.apk`/`.pkg.tar.zst`) with Homebrew, Scoop,
  and AUR (`bitty` plus `bitty-bin` prebuilt) distribution per `bitty`
  CHANGELOG; the binary artifact was renamed `bitty-app` -> `bitty` with the
  crate name unchanged. Release artifacts are distribution evidence, not
  `Verified`/`Compatible` claims. At the pinned `491c567` the workspace still
  carries `workspace.package.version 0.0.20` and `[Unreleased]` was synced with
  the pivot-wave merges (#1213); the version bump to `v0.0.21` recorded in the
  canonical snapshot landed later, and the synchronized revision `310bf87`
  carries `workspace.package.version 0.0.21`.
- **Accepted**: the open questions accepted at that revision via 17 RFCs and 8
  ADRs, enumerated below over the OQ-001..OQ-045 range. The current `Accepted`
  and open counts are the snapshot figures recorded in _Status and provenance_
  above, not a count re-derived from this pinned revision:
  Performance Budget (OQ-001), Platform Support Tiers (OQ-003), Compatibility
  Milestone (OQ-004 M1), Core Workspace Topology (OQ-005), Upstream Dependencies
  (OQ-006), Terminal State (OQ-007), Lua Runtime (OQ-009), Configuration Model
  (OQ-010), Plugin Platform (OQ-011/012/013), Isolation Resource (OQ-014),
  Rich Presentation (OQ-008/015/016), CLI Contract (OQ-017), IPC and Agent
  (OQ-018), DevTools (OQ-019), Headless Deferred (OQ-020 ADR 0008), Package
  Lifecycle (OQ-021), Package Follow-up (OQ-022/026-029), Website Delivery
  (OQ-023), Governance (OQ-024), Risk Evidence (OQ-025), Lua Pins (OQ-030),
  os.getenv Policy (OQ-031), Async/GC Tuning (OQ-032), Plugin Host Runtime and
  Store (OQ-033/034/035), Focused/Idle Outline Colors (OQ-039), Panel
  Transitions (OQ-040), Per-View Appearance Overrides (OQ-041), Per-Panel
  Background Image (OQ-042), and Focus Outline Width (OQ-045).
- **Implemented but not yet Verified**: `rich` (ImageStore/scene OQ-008/015/016,
  Kitty chunked intake `1fc6294`), `ipc` (bounded framing 256 KiB, wire v1,
  peer-credential auth, scopes OQ-018, profiling/ctl surface through `491c567`),
  with compat-lab/perf verification crates added after `be3bdb4`; dependency
  resolution was retired from Core under bitty#1999 (W-72 assigns it to the
  external `bitty-plugin-manager`; its registry solving remains pending), so no
  Core resolver implementation is claimed. The risk register remains `Open`
  except `R-005`/`R-006`/`R-007`
  `Mitigated` at `d4d75e9`, matrix `Mitigated` for those three. `R-004` clipboard
  (`23` `suspicious_paste` + `13` `paste` unit + `4` remediation at
  `7a4ee41`, baseline `19` at `de134ec`) is `Implemented` but explicitly `Open`
  per the 2026-08-31 audit (residual platform backends, real-window UX,
  `8192`-byte post-acquisition bound); `R-005` hyperlink (`5bdcdbd`),
  `R-006` capability (`0afc94d`), `R-007` VM budgets (`d4d75e9`) are `Mitigated`
  with residual UX/grant/budget soak gaps per independent review. Pivot-wave
  additions (all `Implemented`, not `Verified`): plugin persistent-store quota
  backend RC-11 (`store.rs`, `E_STORE_QUOTA`, #1200), host-owned lifecycle
  ladder with enforcement records and reload ordering (`lifecycle.rs`, #1201),
  fail-closed VM load gate with stable budget codes (`gate.rs`/`error.rs`,
  #1202), and the piccolo-to-Phodopus Lua VM swap with readiness mirror suite
  (#1204/#1206/#1207).
- **Governance and Website**: Website Delivery RFC (OQ-023) loader with
  eight-field schema, pinned `src/content/docs-revision.json`, multi-version
  `/docs/<version>/<path>/` and redirect manifest; Governance RFC (OQ-024) MIT
  license, branch protections, `Docs-PR`/`Code-PR` release train — both
  `Accepted` 2026-08-29.

## Candidate maturity ladder (from proposed-delivery-sequence)

| Version | Candidate scope (maturity label, not date)                | Workspace focus at that slice                                                                                                                                                                                                           | Status at pinned `491c567` (historical)                                                                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v0.0.x  | Architecture and protocol prototypes                      | `bitty-core` seed only                                                                                                                                                                                                                  | prototypes done; seed retained but `publish = false`                                                                                                                                                                                                                                                                              |
| v0.1    | Minimal terminal slice (shell echo, resize, backpressure) | `vt` + `pty` + `term-state` + `platform` + `config` + `render` + `ui` + `runtime` + `app` gated by [Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md) (CTX-0109 draft, one process/window/workspace/terminal) | `Draft` spec at CTX-0109, `Experimental Implementation` at `c0aadd2` (CTX-0095 PR #148) + `a8735d0` (CTX-0098 PTY fix) `Implemented` not `Verified`; headless deterministic replay `be3bdb4` 808 tests plus visible `winit`/`wgpu` evidence now exists but remains not `Verified`; acceptance gated on spec + experimental review |
| v0.2    | VT and TUI compatibility work                             | `vt`/`term-state` fidelity, compatibility matrix OQ-004                                                                                                                                                                                 | Scope defined per OQ-004; `compat-lab` forming (`0e65f85`), verification pending                                                                                                                                                                                                                                                  |
| v0.3    | GPU rendering, fonts, performance, graphics               | `render` `wgpu` 25.0 `crossfont` 0.9, platform surface                                                                                                                                                                                  | `Implemented` headless, `Verified` pending                                                                                                                                                                                                                                                                                        |
| v0.4    | Lua configuration system                                  | `config` `ConfigPlan` + `lua` `phodopus` RC-1/RC-2 (piccolo-to-Phodopus swap #1204, readiness mirror suite #1207), store quota RC-11 (#1200), fail-closed load gate (#1202)                                                             | `Accepted` and `Implemented`, not yet `Verified`                                                                                                                                                                                                                                                                                  |
| v0.5    | Plugin API                                                | `plugin-host` capability/event lifecycle OQ-011/012/013 plus lifecycle ladder with enforcement records and reload ordering (#1201)                                                                                                      | `Accepted` and `Implemented`, not yet `Verified`                                                                                                                                                                                                                                                                                  |
| v0.6    | Plugin manager and lazy loading                           | `package` lifecycle + manager overlay                                                                                                                                                                                                   | `Accepted` lifecycle/integrity, resolver `Implemented` but signatures draft, `Verified` pending                                                                                                                                                                                                                                   |
| v0.7    | DevTools and debug protocol                               | `runtime` instrumentation seam (no dedicated `bitty-debug`)                                                                                                                                                                             | `Accepted` per DevTools RFC, `Implemented` not yet `Verified`                                                                                                                                                                                                                                                                     |
| v0.8    | Rich presentation, Markdown stress                        | `rich` blocks, scene/zone, images OQ-008/015/016                                                                                                                                                                                        | `Accepted` and `Implemented` (Kitty chunked intake `1fc6294`), not yet `Verified`                                                                                                                                                                                                                                                 |
| v0.9    | IPC, `bitty ctl`, MCP adapter                             | `ipc` + `agent` bounded framing/scopes OQ-018                                                                                                                                                                                           | `Accepted` and `Implemented` (profiling/ctl surface through `1835175`), not yet `Verified`                                                                                                                                                                                                                                        |
| v1.0    | Stabilized contracts                                      | All above under semver-compatible surfaces                                                                                                                                                                                              | requires `Verified` + `Compatible` per risk evidence RFC; not yet claimed                                                                                                                                                                                                                                                         |

The local daemon (`bittyd`) enters the v0.2.0 slice per
[ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md),
a timing amendment to ADR 0008: one instance per user, peer-credential IPC,
session-grained attach and detach, and no sessions that survive a daemon restart.
Every ADR 0008 trust-boundary gate stays authoritative. Remote UI and the mobile
control plane remain post-v1.0 and behind their own separate, strictly later gate.

The status column reports the revision-pinned `491c567` evidence recorded in the
historical section above; it is not re-derived at `310bf87` or at the
`v0.0.45` (`5d19152`, `main` `5d19152e`) and `v0.0.46` (`f854d5a9`) re-baseline
anchors. No row in this ladder claims `Verified`, `Compatible`, or
`Release-ready`.

## Verification gates

- `just check` 0 issues (`fmt-check` + `markdownlint` + `links` +
  `metadata` + `language` + `agents` + `hygiene` + `svg` + `actionlint`; the
  repository `justfile` has no `state` recipe), `act -n`
  DRYRUN success for the Docs quality `ci.yml` workflow.
- Snapshot evidence at the dated `2026-10-02` synchronized `bitty` snapshot
  (`310bf87`, historical — not re-run for the `v0.0.45`/`v0.0.46` re-baselines):
  `cargo check --workspace --all-targets --locked` and
  `cargo check --target x86_64-pc-windows-gnu` pass at the synchronized
  `bitty` revision per that repository's CI (merge gates green through
  `679f12f`; the synchronized head `310bf87` carries only post-`679f12f`
  documentation and internal cleanup changes, not new public contracts).
- `cargo test --workspace --all-targets --locked` soak passes
  (`Implemented`); `cargo clippy -- -D warnings` 0 warnings; `cargo fmt --check` clean.
- Publish order verified via `cargo publish --dry-run` (leaves
  `publish = true` PASS, dependents correctly await index).

## Cross-reference and maintenance

- Candidate spine and early-deferral: canonical in
  [Proposed Delivery Sequence](proposed-delivery-sequence.md#candidate-build-order-spine).
- Crate publish order and workspace version mapping:
  [Release mechanics](../development/release-mechanics.md) (CTX-0044 draft) and the
  `cargo publish --dry-run` records in [G1 publish log](g1-publish-log.md).
- Compatibility and platform bars: [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md),
  [Compatibility Milestone RFC](../specifications/compatibility-milestone-rfc.md) (M1).
- First real single-window slice: [Single-Window Vertical Slice Acceptance Plan](vertical-slice-acceptance.md)
  (CTX-0109, draft, depends on CTX-0107/0108; one process/window/workspace/terminal,
  cursor/scrollback/resize/selection/copy-paste/nvim+tmux smoke, PB-1..PB-7, Tier 1/2);
  `Implemented` headless does not equal `Verified` visible slice — review gates still apply.
- Security gates for `v1.0`: normative in
  [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md); this ladder does not weaken them.
- Maintain this file alongside `proposed-delivery-sequence.md`: when a version
  slice moves from `Implemented` to `Verified`, update the status column and
  the [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md) per the risk evidence RFC;
  `Verified` requires independent security-auditor and P0-AC evidence.
