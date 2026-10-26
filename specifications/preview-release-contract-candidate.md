---
title: Preview Release Contract (Candidate)
description: Candidate contract for a daily preview release channel - 23:30 local schedule and UTC mapping, preview tag format, matrix and artifacts, stable-channel isolation proof, provenance, retention, promotion, required gates, and owner decisions
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 82
---

# Preview Release Contract (Candidate)

## Document status

> Status: **candidate, not accepted and not implemented.** This document records
> the contract shape bitty#2655 requires before any preview workflow exists. The
> `bitty` repository has no preview workflow; the stable `release.yml` accepts
> stable `vX.Y.Z` tags and a manual dispatch that publishes nothing. No workflow,
> script, release, tag, or channel change is authorized by this document.

| Control          | Value                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Status           | Candidate, reviewed by no one yet, authorizes no code                                                                             |
| Owner            | Release surface (bitty#2655, Task CTX-0153); schedule owner is an open decision (`P-01`)                                          |
| Repository       | `bitty-terminal-docs` (this contract) and `bitty` (future implementation, not authorized here)                                    |
| Issue            | [bitty#2655](https://github.com/bitty-terminal/bitty/issues/2655) — `[0.1.0] Define nightly preview release cadence around 23:30` |
| Upstream records | `bitty` `release.yml`, `packaging/README.md` R2 and channel layout, bootstrap install scripts, ADR 0002 tiers                     |
| Implementation   | None. No `.github/workflows/preview.yml`, no preview tag, no preview release, no test exists                                      |
| Evidence status  | Current-state claims verified against `bitty` `origin/main` `87900ada` (2026-10-26); no preview run has ever executed             |
| Change authority | Release owner owns the candidate; the security corpus co-owns the trust boundary and supply-chain controls                        |
| Promotion gate   | Owner decisions `P-01` through `P-14`, independent review, and security review; then `status: accepted`                           |

Candidate wording uses "must" to describe what the accepted contract would
require. It is not a current obligation, and it is not evidence that any control
is implemented. The stable tags `v0.0.28` and `v0.0.29` are immutable history:
nothing in this contract moves, recreates, or repoints them.

## Purpose and scope

The product cadence requires a preview build roughly every night at 23:30 local
time. Today the Core repository cannot satisfy that cadence: every scheduled
workflow is CI-only, and the release workflow is a stable-channel pipeline that
refuses anything except a stable `vX.Y.Z` tag. Pushing a preview-shaped tag into
that pipeline fails validation rather than producing a preview.

This document decides, as a candidate, the questions bitty#2655 leaves open:

1. The exact schedule, including the timezone-to-UTC mapping and the behavior of
   daylight-saving transitions (`Schedule`).
2. The preview tag grammar, its ordering against stable tags, and the mechanism
   that makes existing stable readers reject it (`Tag format`).
3. The build matrix, artifact names, and the deliberate absence of installers
   (`Matrix and artifacts`).
4. The proof that preview artifacts cannot reach `latest.txt`, stable R2
   pointers, or any package-manager channel (`Isolation proof`).
5. Provenance, attestation, retention, cleanup, and promotion (`Provenance and
retention`).
6. Which gates a preview must pass, and which stable gates it may skip
   (`Required gates`).

In scope: the contract above and the owner decisions that block acceptance.

Out of scope and owned elsewhere:

- any workflow, script, test, or release implementation;
- crates.io publication (previews never publish crates; the binary is never a
  crates.io artifact);
- stable release authorization, changelog policy, and version-bump mechanics;
- package formats, signing, notarization, and installers, which remain stable
  channel work;
- support commitments for preview users (`P-12`);
- the maturity ladder: a preview does not make any slice `Implemented`,
  `Verified`, or `Compatible`.

## Normative sources this specification must not weaken

Where a source below and this document disagree, the source wins and this
document is defective.

| Source                                                                                                                               | What it binds here                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bitty` `.github/workflows/release.yml` (current)                                                                                    | Stable tag predicate, packaging validation, build matrix, GitHub Release creation, R2 mirror and stable pointers, and the channel publishers. Previews must not change its contract.       |
| `bitty` `packaging/README.md` § R2 bucket layout and CDN mapping                                                                     | Key classes: `bitty/releases/<TAG>/` immutable payload, `bitty/install/` mutable stable pointers, immutable prefix rule, and the statement that prerelease tags never update `latest.txt`. |
| `bitty` `scripts/install.sh` and `scripts/install.ps1`                                                                               | Bootstrap entry points resolve `latest.txt` and reject any version containing `-`; previews are not installable through them.                                                              |
| `bitty` `scripts/check-release-version.sh`                                                                                           | Workspace version is the single source of truth; tag mode requires exact equality with the tag, which a preview tag cannot satisfy.                                                        |
| [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md) (accepted) | Platform tiers. A preview cell is a delivery convenience under a tier, never a tier promotion.                                                                                             |
| [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) (normative)                    | Untrusted input, least authority, secret minimization, bounded artifacts, and no silent permission escalation.                                                                             |
| [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md) (normative)                     | Supply-chain and distribution threats; a preview channel must not widen a stable trust boundary.                                                                                           |
| [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md) (normative) | Secret handling and evidence rules that the future workflow and its review must satisfy.                                                                                                   |
| [Documentation workflow](../docs/development/documentation-workflow.md) (normative)                                                  | Frontmatter, status meanings, English-only content, self-containment, and review ownership.                                                                                                |
| [bitty#2655](https://github.com/bitty-terminal/bitty/issues/2655)                                                                    | Acceptance items for the contract. Issue text is context, not a normative contract.                                                                                                        |

The single-writer rule for distribution is restated because every isolation
claim depends on it: only the stable release pipeline writes stable payloads and
stable pointers. The preview channel is a separate writer with no authority over
any stable key, pointer, repository, or package index.

## Terminology

| Term                 | Meaning in this document                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable tag           | A git tag matching `^v[0-9]+\.[0-9]+\.[0-9]+$` that the stable pipeline publishes.                                                                         |
| Preview tag          | A git tag matching the candidate grammar in `Tag format`; never a stable tag.                                                                              |
| Preview base version | The `X.Y.Z` in `[workspace.package] version` at the previewed commit.                                                                                      |
| Cadence date         | The local calendar date on which the preview run passes its preflight; stamped `YYYYMMDD` in the tag.                                                      |
| Cadence slot         | The nominal 23:30 local time on a cadence date.                                                                                                            |
| Stable pointer       | `bitty/install/latest.txt`, `bitty/install/install.sh`, `bitty/install/install.ps1`, or any package-manager channel state that resolves a default version. |
| Stable channel       | GitHub "latest" release, R2 `releases/` and `install/` prefixes, Homebrew, Scoop, AUR, APT, Copr, Cachix, and crates.io.                                   |
| Promotion            | Creating the stable tag on the exact commit a preview targeted, then publishing through the stable pipeline.                                               |
| Fail closed          | The run aborts before creating a tag or uploading an asset; no best-effort fallback and no swallowed error.                                                |

## Current state (verified)

Verified against `bitty` `origin/main` `87900ada` (2026-10-26). These facts are
the reason the contract looks the way it does; if they drift, the contract is
re-verified before acceptance.

| Fact                                | Evidence                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No preview workflow exists          | `.github/workflows/` contains `bsd-tier.yml`, `ci.yml`, `codeql.yml`, `release.yml`, `repair-release-channels.yml`, `snapshot-source.yml`, and `vm-tier.yml` only.        |
| Scheduled workflows are CI-only     | `vm-tier.yml` (03:17 UTC), `bsd-tier.yml` (03:47 UTC), `codeql.yml` (Mondays 04:30 UTC), `snapshot-source.yml` (06:17 UTC). None creates a release.                       |
| Stable tag filter is broad          | `release.yml` triggers on `push.tags: v[0-9]+.[0-9]+.[0-9]+*`; a preview-shaped tag matches the filter and then fails `validate`.                                         |
| Stable validation is exact          | The `validate` job rejects any tag not matching `^v[0-9]+\.[0-9]+\.[0-9]+$`.                                                                                              |
| Release creation is stable-only     | The `release` job runs only for `refs/tags/v*` and sets `prerelease: false`.                                                                                              |
| Stable pointers are dash-guarded    | `r2-stable` runs only when the ref is a version tag and the tag name contains no `-`; it re-checks `^v[0-9]+\.[0-9]+\.[0-9]+$` before writing.                            |
| Several publishers are default-on   | `apt`, `copr`, and `nix` run unless their repository variable is exactly `false`; they gate on `refs/tags/v*` only. `aur`, `aur-bin`, `homebrew`, and `scoop` are opt-in. |
| `r2-mirror` has no dash guard       | It gates on `refs/tags/v*` and `needs: release`; its only preview barrier today is the failing `validate` job.                                                            |
| Bootstrap scripts reject prerelease | `scripts/install.sh` and `scripts/install.ps1` fail on any version containing `-`.                                                                                        |
| No signatures, attestations, SBOM   | `release.yml` writes `SHA256SUMS` and `provenance.json` only; `install.sh` states that 0.1.0 is hash-only and that Sigstore/cosign remains a follow-up.                   |
| Version base equals newest stable   | `origin/main` workspace version is `0.0.29`; the newest stable tag is `v0.0.29`. The equality case is open (`P-11`).                                                      |
| Manual dispatch cannot publish      | `workflow_dispatch` runs validation and build jobs, but `release` and every channel job are gated on a tag ref.                                                           |

## Schedule (candidate)

### Cadence and timezone

- One preview per local calendar day, nominally at **23:30 local time**.
- The IANA timezone is an owner decision (`P-01`). The candidate is
  `Europe/Berlin`; the product cadence has no canonical timezone record today,
  and the schedule owner is also undecided.
- GitHub Actions evaluates `schedule` cron expressions in UTC on the default
  branch only. A fixed UTC expression cannot follow daylight saving, so the
  candidate uses two UTC slots and a local-time preflight.

| Local season                     | Offset | 23:30 local is | Cron A `30 21 * * *` | Cron B `30 22 * * *`         |
| -------------------------------- | ------ | -------------- | -------------------- | ---------------------------- |
| CET (last Sun Oct–last Sun Mar)  | UTC+1  | 22:30 UTC      | 22:30 local — no-op  | 23:30 local — run            |
| CEST (last Sun Mar–last Sun Oct) | UTC+2  | 21:30 UTC      | 23:30 local — run    | 00:30 local next day — no-op |

Both crons are off the hour boundary, matching the repository's existing
scheduler convention. The off-season firing is a successful no-op, not a failure.

### Preflight

The first job of a preview run is a preflight that decides whether the run is a
real cadence slot. It uses the same timezone the owner selects, derives the
cadence date from that zone, and never guesses a date in UTC.

```bash
PREVIEW_TZ="Europe/Berlin"          # candidate; P-01 decides the real value
local_hm="$(TZ="$PREVIEW_TZ" date +%H:%M)"
local_date="$(TZ="$PREVIEW_TZ" date +%Y%m%d)"
if [[ "$local_hm" < "23:25" || "$local_hm" > "23:59" ]]; then
  echo "off-slot or late run (${local_hm} ${PREVIEW_TZ}); no preview"
  exit 0
fi
```

- The candidate lateness window is `23:25`–`23:59` local. A run delayed past
  local midnight is a missed night, not a backdated preview (`P-02`). No preview
  is ever stamped with a date other than the cadence date.
- A timezone without daylight saving (for example UTC) collapses to one cron and
  keeps the same preflight; a fixed-offset zone uses the same two-slot shape.
- GitHub may start a scheduled run late under load. The preflight is the only
  authority on whether a run belongs to a cadence slot; the cron expression is
  a trigger, not a guarantee.
- Scheduled workflows run on the default branch. A manual dispatch must resolve
  its input SHA on `main`; a dispatch for a non-`main` commit fails closed.
- GitHub disables scheduled workflows after 60 days without repository activity
  (documented explicitly for public repositories). Re-enabling is an operational
  task for the schedule owner (`P-13`), not something a preview run can repair.

### No-op rules

A run is a successful no-op, with a recorded reason and no tag, when any of the
following is true:

1. The preflight is outside the accepted local-time window.
2. `HEAD` is identical to the commit targeted by the most recent successful
   preview release; `main` has not advanced since that preview.
3. A preview tag for this cadence date already exists. The tag is never moved,
   deleted, or reused; a same-date run for a different commit is refused.
4. The workspace base version is not strictly greater than the newest stable tag
   (candidate, `P-11`).

A no-op is not a failure and must not be reported as a published preview.

### Failed night

- Any gate, build leg, checksum, or smoke failure aborts before tag creation and
  before any upload. There is no partial preview: an incomplete matrix does not
  publish the cells that succeeded.
- Build outputs of a failed run stay as GitHub Actions artifacts for triage for
  seven days and are never promoted, relabeled, or copied to a release.
- There is no automatic retry and no backfill. The next night publishes the
  then-current `main`; if the failed commit is still the head, it is retried
  naturally. A manual dispatch may publish on a later date using that date's
  stamp; it never backdates a tag.
- A failed night is visible as a failed workflow run. Whether it also opens an
  issue or notifies a channel is an owner decision (`P-13`).

### Concurrency

- One repository-wide concurrency group (`preview-release`) with
  `cancel-in-progress: false`. A manual dispatch queues behind a scheduled run
  rather than racing it.
- Tags and releases are created only after every matrix leg has produced and
  verified its bytes, so two runs cannot interleave a partial release.

## Tag format (candidate)

### Grammar

```text
preview-tag := "v" X "." Y "." Z "-preview." YYYYMMDD
```

- `X.Y.Z` is the workspace version at the previewed commit, read through
  `scripts/check-release-version.sh --print`; it is not typed by hand.
- `YYYYMMDD` is the cadence date in the owner-selected timezone, zero-padded.
- Example: `v0.0.30-preview.20261027`.
- No `+build` metadata and no commit SHA in the tag. Build metadata is ignored
  in semver precedence, so two different previews could compare equal; the
  commit belongs in `provenance.json` and the release body.
- The tag is annotated, immutable, and created once. It is never moved, deleted,
  or reused, including after promotion.
- At most one preview tag per cadence date. A same-date rerun for a different
  commit is refused; a second preview in one day needs a different date stamp or
  a future owner decision (`P-08`).

### Ordering against stable tags

| Comparison                                               | Result                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `v0.0.30-preview.20261027` vs `v0.0.30`                  | Preview is **lower** (semver prerelease of the same core version). |
| `v0.0.30-preview.20261027` vs `v0.0.29`                  | Preview is **higher** (0.0.30 core is above the previous stable).  |
| `v0.0.30-preview.20261026` vs `v0.0.30-preview.20261027` | Earlier date is lower; the fixed-width date sorts correctly.       |
| `v0.0.30-preview.20261027` vs `v0.0.31-preview.20261027` | Lower core version is lower.                                       |
| `v0.0.30-preview.20261027` vs any stable tag             | Never equal; the `-preview.` segment makes the strings distinct.   |

The candidate rule is that the preview base must be **strictly greater** than
the newest stable tag, so every preview sorts above every published stable
release. Right now the workspace version equals the newest stable tag
(`0.0.29`), so that rule would block previews until the next version bump. The
alternative — allow equality and accept that the preview sorts below the just
released stable — is owner decision `P-11`. Either way, the preview is never
`latest`.

### Why existing stable readers cannot parse it as stable

| Reader                                             | Behavior on `v0.0.30-preview.20261027`                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `release.yml` `validate` job                       | Rejects: the tag does not match `^v[0-9]+\.[0-9]+\.[0-9]+$`.                                                                                        |
| `scripts/check-release-version.sh --tag`           | Rejects: the stripped tag (`0.0.30-preview.20261027`) is not equal to the workspace version (`0.0.30`).                                             |
| `release.yml` `release` job                        | Unreachable after a failed `validate`; if it were reached, it would create a non-prerelease release, which is itself a defect the contract forbids. |
| `release.yml` `r2-stable` job                      | Skipped by `!contains(github.ref_name, '-')`; if reached, its regex guard exits non-zero before writing.                                            |
| `scripts/install.sh` / `install.ps1`               | Reject any version containing `-`; a preview cannot be installed through the bootstrap path even if a user pins it explicitly.                      |
| `latest.txt` consumers                             | `latest.txt` is written only by `r2-stable`; the preview workflow has no path to that job (see `Isolation proof`).                                  |
| GitHub "latest release" selection                  | The preview release is created with `prerelease: true` and `make_latest: false`.                                                                    |
| `r2-stable` monotonic comparison (`base()` helper) | Strips at `-` and compares numeric cores only; it can never see a preview tag because the job never runs for one.                                   |

One caveat is load-bearing. The stable tag filter `v[0-9]+.[0-9]+.[0-9]+*`
**does** match a preview tag, so a human pushing a preview tag by hand starts a
`Release` run that fails in `validate`. That is fail-closed, but noisy. The
preview workflow creates its tag through the release API with `GITHUB_TOKEN`;
GitHub does not start new workflow runs from events caused by `GITHUB_TOKEN`.
If an operator later creates preview tags with a personal token, the stable
workflow runs and fails validation; that guard is intentional and must stay.

## Matrix and artifacts (candidate)

### Build matrix

A preview is a release build, not a compatibility run. The candidate is the
three Tier 1 cells that cover the platforms the product claims first, with the
same runners the stable workflow already uses.

| Cell               | Runner           | Target                     | Archive name                                               |
| ------------------ | ---------------- | -------------------------- | ---------------------------------------------------------- |
| Linux x86_64 glibc | `ubuntu-24.04`   | `x86_64-unknown-linux-gnu` | `bitty-<PREVIEW_VERSION>-x86_64-unknown-linux-gnu.tar.zst` |
| macOS arm64        | `macos-15`       | `aarch64-apple-darwin`     | `bitty-<PREVIEW_VERSION>-aarch64-apple-darwin.tar.zst`     |
| Windows x64        | `windows-latest` | `x86_64-pc-windows-msvc`   | `bitty-<PREVIEW_VERSION>-windows-x86_64.zip`               |

`<PREVIEW_VERSION>` is the full `X.Y.Z-preview.YYYYMMDD` string, for example
`0.0.30-preview.20261027`. The stable naming convention is reused with the
preview version substituted, so a consumer can tell the channel from the
filename alone.

Adding Linux aarch64, macOS x86_64, Windows ARM64, FreeBSD, or any compatibility
cell is out of the candidate and is owner decision `P-07`.

### Artifact contents

| Archive          | Contents                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Linux `.tar.zst` | `bin/bitty`, `share/applications/run.bitty.Bitty.desktop`, `share/icons/`, `share/metainfo/run.bitty.Bitty.metainfo.xml`, `LICENSE`, `README.md`, `CHANGELOG.md` |
| macOS `.tar.zst` | `bin/bitty`, `LICENSE`, `README.md`, `CHANGELOG.md`; no `.app`, no DMG, no notarization                                                                          |
| Windows `.zip`   | `bitty.exe`, `LICENSE`, `README.md`, `CHANGELOG.md`; no installer                                                                                                |

Each archive ships a `<archive>.sha256` sidecar in GNU `sha256sum` format, a
top-level `SHA256SUMS`, and a `provenance.json`. Preview assets are downloaded
directly from the GitHub pre-release; there is no bootstrap script for them.

### Installers and channel payloads: absent by design

| Surface                                 | Preview | Reason                                                                                                                                                 |
| --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.deb`, `.rpm`, `.apk`, `.pkg.tar.zst`  | No      | Package managers never receive previews (`P-04`); shipping a package would create an installable stable-format artifact with no channel to upgrade it. |
| `.dmg`, `.app`, `.pkg`                  | No      | macOS delivery is an interactive signed/notarized flow; previews stay unsigned archives.                                                               |
| `setup.exe`, MSI, MSIX, winget          | No      | Windows installers are stable-channel work and carry signing and SmartScreen implications.                                                             |
| GitHub "latest" release                 | No      | `prerelease: true`, `make_latest: false`.                                                                                                              |
| `latest.txt`                            | No      | Stable pointer only; the preview workflow cannot write it (`Isolation proof`).                                                                         |
| R2 object (any prefix)                  | No      | Candidate v1 publishes no R2 object at all; the preview workflow holds no Cloudflare credential (`P-05`).                                              |
| Homebrew, Scoop, AUR, APT, Copr, Cachix | No      | Stable channels only; `P-04`.                                                                                                                          |
| crates.io                               | No      | The binary is never a crates.io artifact and previews never run `cargo publish`.                                                                       |

A future R2 preview mirror, if the owner ever wants one (`P-05`), is reserved to
`bitty/preview/<TAG>/` and cannot reuse `bitty/releases/`, `bitty/install/`, or
`bitty/apt/`. That reservation is a namespace statement, not an authorization.

## Isolation proof (candidate)

### Design principles

1. **Separate workflow.** The preview channel is a new
   `.github/workflows/preview.yml`. It never calls, reuses, or copies a job from
   `release.yml`.
2. **No stable credentials.** The preview workflow has no `environment: release`,
   no Cloudflare, APT, AUR, Homebrew, Scoop, Copr, Cachix, or tap token. Its
   permissions are limited to `contents: write` (release creation),
   `id-token: write`, and `attestations: write` (attestation).
3. **No stable writer.** No step in the preview workflow writes an R2 object,
   calls `wrangler`, edits a tap or bucket repository, submits a Copr build, or
   signs an APT index.
4. **Tag predicate at every boundary.** Preview-shaped is the only accepted
   shape in the preview workflow; stable-shaped is the only accepted shape in
   every stable publishing job. Neither side trusts the other's filter.
5. **Fail closed.** A guard that cannot prove the tag is preview-shaped aborts
   before any upload. No `|| true`, no "best effort" upload, no catch-all.

### Channel-by-channel proof

| Stable surface                             | Current control (verified)                                                                            | Preview guarantee                                                                                 | Fail-closed assertion                                                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bitty/install/latest.txt`                 | Written only by `r2-stable`; job requires `!contains(ref_name, '-')` and re-checks the stable regex.  | Preview workflow has no R2 credential and no `wrangler` step.                                     | Static: preview workflow contains no `wrangler`, `bitty/install`, or `latest.txt`.                           |
| `bitty/install/install.sh` / `install.ps1` | Written only by `r2-stable` on the same stable-only path.                                             | Same as above.                                                                                    | Static: no `bitty/install` or install-script upload step in the preview workflow.                            |
| `bitty/releases/<TAG>/`                    | Written by `r2-mirror`; `needs: release`, tag push. No dash guard today.                              | Preview never uploads to R2; future preview prefix is `bitty/preview/<TAG>/` only.                | Static: no `bitty/releases/` literal; the key builder requires an explicit prefix argument.                  |
| GitHub "latest" release                    | `release` job is stable-gated and creates `prerelease: false`.                                        | Preview release uses `prerelease: true` and `make_latest: false`.                                 | Static: both fields present; runtime: `gh release view` reports `isPrerelease: true` and `latest` unchanged. |
| Homebrew tap                               | `homebrew` job: `needs: r2-mirror`, tag prefix, `vars.HOMEBREW_PUBLISH == 'true'`.                    | No job, no tap token, no formula rendering.                                                       | Static: preview workflow contains no `homebrew`, tap URL, or `HOMEBREW` token name.                          |
| Scoop bucket                               | `scoop` job: same shape.                                                                              | No job, no bucket token.                                                                          | Static: no `scoop`, bucket URL, or `SCOOP` token name.                                                       |
| AUR `bitty` / `bitty-bin`                  | `aur` / `aur-bin` jobs: tag prefix, opt-in variables, SSH key secret.                                 | No job, no SSH key, no `PKGBUILD` render.                                                         | Static: no `aur`, `PKGBUILD`, or `AUR_SSH` token name.                                                       |
| APT repository                             | `apt` job: `needs: [build, r2-mirror]`, `refs/tags/v*`, default-on (`vars.APT_PUBLISH != 'false'`).   | Preview never enters `release.yml`; accepted contract also adds an explicit stable-tag predicate. | Static: no `apt`/`dists/stable`; regression test asserts the stable predicate on the `apt` job.              |
| Copr                                       | `copr` job: `needs: [build, r2-mirror]`, `refs/tags/v*`, default-on (`vars.COPR_PUBLISH != 'false'`). | Same as APT.                                                                                      | Static: no `copr`/`copr-cli`; regression test asserts the stable predicate.                                  |
| Cachix                                     | `nix` job: `needs: build`, `refs/tags/v*`, default-on (`vars.NIX_PUBLISH != 'false'`).                | No job, no Cachix token.                                                                          | Static: no `cachix`/`CACHIX` token name.                                                                     |
| crates.io                                  | Not part of `release.yml`; publish is a separate manual procedure.                                    | Preview workflow never runs `cargo publish` and has no registry token.                            | Static: no `cargo publish` and no `CARGO_REGISTRY_TOKEN`.                                                    |

### The weakest current link

`apt`, `copr`, and `nix` are **default-on**: they run unless their variable is
exactly `false`, and their only tag predicate is `startsWith(github.ref,
'refs/tags/v')`. They are safe today only because `validate` rejects a preview
tag first and `build`/`release` sit in their `needs` chain. `r2-mirror` and
`release` are equally broad: neither checks for `-`. A refactor that removes
`needs: validate`, or a future author who copies a channel job into a preview
workflow, would publish preview bytes into a stable channel.

The accepted contract therefore requires two changes before any preview
implementation is authorized:

1. A shared stable-tag predicate on **every** publishing job (`release`,
   `r2-mirror`, `r2-stable`, `aur`, `aur-bin`, `homebrew`, `scoop`, `copr`,
   `apt`, `nix`), independent of the `needs` chain. Candidate mechanism: a
   `stable` output from `validate` (`true` only for `^vX.Y.Z$`) that every
   publisher requires, plus `!contains(github.ref_name, '-')` for defense in
   depth.
2. A static isolation test, `scripts/tests/check-preview-isolation.test.sh`,
   modeled on the existing channel-regression tests, that fails when the
   preview workflow gains a stable surface or when a publisher loses its
   stable predicate. The preview workflow runs it before building.

### Required assertions (fails closed)

The accepted implementation must provide all of the following. Each is a
reviewable test, not a comment.

1. **Static workflow isolation.** The isolation test asserts the preview
   workflow has no `environment: release`, no `wrangler`, no `bitty/install`,
   no `bitty/releases`, no `bitty/apt`, no Homebrew/Scoop/AUR/Copr/Cachix
   publisher or token name, and no `cargo publish`.
2. **Release metadata.** The test asserts `prerelease: true` and
   `make_latest: false` on the release creation step.
3. **Tag guard.** A preflight guard asserts the tag matches
   `^v[0-9]+\.[0-9]+\.[0-9]+-preview\.[0-9]{8}$`, that the commit is on
   `main`, and that the tag does not already exist (`git ls-remote --exit-code`).
4. **Stable predicate regression.** The test asserts the stable tag predicate on
   every publisher listed above; removing it fails the test.
5. **Stable reader rejection.** The test invokes
   `scripts/check-release-version.sh --tag vX.Y.Z-preview.YYYYMMDD` and expects
   a non-zero exit, and runs
   `BITTY_VERSION=vX.Y.Z-preview.YYYYMMDD scripts/install.sh` expecting the
   prerelease rejection path before any network access.
6. **Pointer read-back.** Before and after a preview run, the operator (or an
   automated check) fetches `bitty/install/latest.txt` and the tap/bucket/index
   heads and asserts they are byte-identical and unmoved. A preview that
   changes any of them is a release-blocking defect, even if the workflow
   reports success.

## Provenance and retention (candidate)

### Provenance and attestation

- `SHA256SUMS` covers every archive; each archive also carries a `.sha256`
  sidecar. Release creation verifies the downloaded assets against both before
  the release is published.
- `provenance.json` keeps the stable fields (`commit`, `tag`, `date`,
  `toolchain`, `build_runner`) and adds `"channel": "preview"` and
  `"base_version": "X.Y.Z"`. The added fields are additive; no stable consumer
  reads this file today.
- Candidate attestation: `actions/attest-build-provenance` for every archive,
  verified in the run with `gh attestation verify`. This is build provenance,
  not a code signature.
- Candidate signature posture: **none**. No codesign, notarization, Authenticode,
  GPG, or Sigstore/cosign signature in v1. `install.sh` already documents that
  0.1.0 is hash-only, and a preview must not imply otherwise. Signing previews is
  owner decision `P-10`.
- Candidate SBOM: none in v1. The stable pipeline produces none today, and a
  preview-only SBOM would create an evidence asymmetry without a consumer. Also
  `P-10`.

### Retention and cleanup

- Keep the most recent **14** preview releases (two weeks), plus any preview
  whose target commit is also a stable tag target. Age is measured by release
  creation time, not tag string.
- Prune after a successful new preview, never before it. Cleanup lists
  prereleases, filters by the preview tag regex, sorts newest first, and deletes
  beyond the window with `gh release delete --cleanup-tag --yes`.
- Cleanup never deletes a tag that does not match the preview grammar, never
  touches a stable release, and never deletes a release it cannot prove is a
  preview. A refused deletion is reported, not forced.
- Workflow artifacts of preview builds are retained for seven days for triage;
  release assets follow the release retention above.
- There is no R2 copy to prune in v1. If `P-05` later adds `bitty/preview/`, that
  prefix uses the same window and its own cleanup step.
- Whether a prune failure should fail the run or only report is `P-06`. The
  candidate is: the new preview stays published, and the run fails visibly so
  the backlog is not silent.

### Promotion

Promotion is **retag the same commit, never rebuild or relabel the preview
bytes**:

1. The preview must have passed every required gate, its provenance must verify,
   and its target commit must still be on `main`.
2. The owner (or delegated release owner) approves the promotion and confirms the
   changelog and workspace version are ready for the stable tag.
3. The stable `vX.Y.Z` tag is created on the **exact preview commit**. The
   preview tag is not moved or deleted.
4. The stable tag push runs `release.yml`, which builds stable channel artifacts
   from that commit through the stable pipeline. Preview archives are never
   copied, renamed, or uploaded as stable assets; stable bytes must come from the
   stable pipeline.
5. The promoted preview release remains available as evidence and is excluded
   from retention pruning by the stable-commit rule.

"Never rebuild" means never promote a different source revision and never reuse
preview binaries as stable artifacts. It does not promise byte-identical output
between the preview and stable builds.

## Required gates (candidate)

A preview is a release, not a nightly test run. It does not repeat the full test
matrix that `main` CI already ran; it proves that the exact commit it publishes
is green, that the release artifacts build reproducibly enough to verify, and
that the release metadata is sound.

| Gate                                                        | Preview                                             | Stable                                                 | Notes                                                                   |
| ----------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| Exact commit is on `main` and its `CI` run is green         | Required                                            | Implied by release review, not machine-checked         | Preview queries the commit's checks; a red or missing run fails closed. |
| `scripts/check-release-version.sh` (in-repo consistency)    | Required                                            | Required                                               | Same script; no tag-equality mode for previews.                         |
| Workspace base version is valid for a preview (`P-11`)      | Required                                            | Not applicable                                         | Candidate: strictly greater than the newest stable tag.                 |
| Static isolation test                                       | Required                                            | Not applicable                                         | `scripts/tests/check-preview-isolation.test.sh`.                        |
| `actionlint` on the preview workflow                        | Required at review time                             | Required                                               | No workflow merges without it.                                          |
| `act -n` dry run of the preview workflow                    | Required at review time                             | Required                                               | Syntax only; not runtime evidence.                                      |
| Build with `--locked` and the release rustflags             | Required                                            | Required                                               | Builder paths remapped to `/build/...`.                                 |
| `scripts/check-release-paths.sh` per binary                 | Required                                            | Required                                               | Fail-closed builder-path scan.                                          |
| `scripts/check-binary-arch.sh` per binary                   | Required                                            | Required                                               | Architecture claim matches bytes.                                       |
| `SHA256SUMS`, sidecars, read-back verification              | Required                                            | Required                                               | No release without verified bytes.                                      |
| Linux bundle install smoke (`--version` + headless start)   | Required                                            | Required across four distros                           | Preview uses one clean container.                                       |
| Windows unzip-and-run smoke                                 | Candidate required (`P-07`)                         | Required                                               | Preview may skip only by owner decision.                                |
| macOS launch smoke                                          | Not required                                        | Required (DMG mount)                                   | Previews have no DMG and no notarization.                               |
| Six-cell matrix + Alpine + FreeBSD                          | Not required                                        | Required                                               | Preview builds three cells.                                             |
| `.deb`/`.rpm`/`.apk`/`.pkg.tar.zst`, DMG, setup.exe, winget | Not required                                        | Required                                               | Previews ship no installers.                                            |
| Homebrew, Scoop, AUR, APT, Copr, Cachix, R2, `latest.txt`   | Not required                                        | Required for enabled channels; APT/Copr/Nix default-on | Previews ship no channel state.                                         |
| Post-release end-to-end across channels                     | Not required                                        | Required                                               | No channel to test.                                                     |
| CodeQL                                                      | Not re-run                                          | Separate workflow                                      | Inherited from `main` CI and the weekly schedule.                       |
| CodeRabbit / PR review                                      | Attached to the workflow PR, not to the nightly run | Attached to the release PR                             | Release automation does not bypass review.                              |

Failure semantics: any required gate fails, the run stops before tag creation
and before upload. There is no partial preview and no "publish what passed".

## Security review

This candidate introduces a recurring publication path. It weakens no accepted
control, and it claims no implemented control. The review must confirm each row.

| Threat                                           | Control in this contract                                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Tag confusion reaches a stable channel           | Preview grammar is distinct; stable readers reject it; every publisher gains an explicit stable predicate; isolation test.              |
| Preview holds stable credentials                 | No `environment: release`, no Cloudflare/APT/AUR/Homebrew/Scoop/Copr/Cachix secret, minimal `permissions`; static token allowlist test. |
| Preview poisons `latest.txt` or a stable pointer | No R2 credential, no `wrangler`, no tap/bucket/index write; before/after pointer read-back is a release-blocking check.                 |
| Artifact substitution or silent corruption       | `--locked`, pinned actions, SHA-pinned toolchain, per-asset checksums, read-back verification, build provenance attestation.            |
| Prerelease treated as supported                  | Release body and README state previews are unsupported; no bootstrap install; no package channel; `latest` never points at a preview.   |
| Tag moved or reused                              | Tags are annotated and immutable; preflight refuses an existing tag; cleanup deletes only preview tags beyond the window.               |
| Preview bytes relabeled as stable on promotion   | Promotion creates the stable tag on the same commit; the stable pipeline rebuilds; preview assets are never copied to stable keys.      |
| Scheduled workflow drift or silent disablement   | Preflight records the cadence date; a missed night is visible as no release; the schedule owner owns re-enablement (`P-13`).            |
| Unbounded retention or disk growth               | Fixed 14-release window, seven-day workflow artifacts, no R2 copy in v1.                                                                |
| New secret surface                               | None: the only credential is the repository `GITHUB_TOKEN` and the OIDC token used for attestation.                                     |

The security reviewer must specifically challenge the default-on APT/Copr/Nix
publishers, the broad `r2-mirror` condition, and the temptation to copy
`release.yml` into a preview workflow. Those are the three places where the
isolation proof can be lost without a visible diff in the preview file.

## Verification plan

Before acceptance of this contract:

1. Record owner decisions `P-01` through `P-14`, or record an explicit deferral
   with an owner and a date for each.
2. Obtain an independent review `APPROVE` from an agent other than the author.
3. Obtain a security review `APPROVE` covering the isolation proof, credential
   posture, tag confusion, and promotion.
4. Confirm every current-state claim against the pinned `bitty` revision and
   record any drift instead of silently updating the contract.
5. Confirm the isolation assertions are concrete enough to implement as tests,
   with named files and expected exit behavior.
6. Synchronize the affected documents listed in `Affected contracts`.
7. Run `just check` in this repository and `git diff --check`.

Before the first implementation merge (a separate, future task; not authorized
here):

1. Add `.github/workflows/preview.yml` and
   `scripts/tests/check-preview-isolation.test.sh`; pass `actionlint` and
   `act -n`.
2. Add the stable-tag predicate to every publisher in `release.yml` and prove it
   with a regression test.
3. Exercise the full pipeline with a `dry_run` dispatch input that builds and
   verifies but creates no tag and no release.
4. Run one shadow night, then one real preview; record that `latest.txt`, the
   tap, the bucket, the AUR repositories, the APT index, the Copr project, and
   the Cachix cache are byte-identical or unmoved before and after.
5. Verify the attestation with `gh attestation verify` and confirm the release
   reports `isPrerelease: true` and is not `latest`.
6. Repeat on a second night to prove idempotence: the second night is a no-op if
   `main` has not advanced, and a new dated preview if it has.

Definition of done for this contract task: the candidate is written, the index
row exists, `just check` is green, and the open owner decisions are listed. The
contract is not accepted by this task.

## Alternatives considered

| Alternative                                      | Trade-off                                                                                                                       | Disposition                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `nightly-YYYYMMDD+sha` tags (superseded sketch)  | Not semver, build metadata is ignored in precedence, and existing readers have no shared interpretation.                        | Rejected.                                                                             |
| `vX.Y.Z-preview.N` with a per-preview counter    | Needs mutable state and a race-free counter; a rerun can reuse or skip a number.                                                | Rejected; the date is idempotent per day and human-readable.                          |
| Reuse `release.yml` with a `prerelease` input    | One pipeline to maintain, but mixes stable and preview paths; APT/Copr/Nix are default-on and would need delicate guards.       | Rejected; separate workflow with no stable credentials is the stronger isolation.     |
| One fixed UTC cron                               | Simplest schedule; drifts by one hour across daylight saving.                                                                   | Rejected for the Berlin candidate; acceptable if `P-01` chooses a fixed-offset zone.  |
| One cron plus a DST calendar table               | One trigger per day; brittle on transition dates and in leap years.                                                             | Rejected; two crons plus a local preflight is simpler and self-correcting.            |
| Publish previews to `bitty/preview/` in R2       | Easier downloads and CDN caching; adds a Cloudflare credential and a second cleanup surface to the preview workflow.            | Deferred to `P-05`; v1 has no R2 contact.                                             |
| Package-manager preview channels                 | Users could install previews through familiar tools; every channel would gain a prerelease version grammar and rollback burden. | Rejected by candidate; `P-04` is the owner decision.                                  |
| Rebuild or repackage preview artifacts as stable | Saves a stable build; risks shipping bytes that the stable pipeline never produced.                                             | Rejected; promote by retagging the commit and rebuilding through the stable pipeline. |
| One preview tag per commit                       | Finer granularity; unbounded tags and releases, and no daily cadence.                                                           | Rejected.                                                                             |
| Draft releases instead of prereleases            | Hidden from the public; still requires a tag and gives no installable preview.                                                  | Rejected.                                                                             |
| Run the full stable matrix every night           | Maximum coverage; multiplies build minutes and failure probability for a channel that publishes no installers.                  | Rejected; three cells, with breadth as `P-07`.                                        |
| Automatic retry of a failed night                | Fewer missed previews; can hide a persistent failure and publish a stale commit under a fresh date.                             | Rejected; fail visibly, fix forward, allow a manual dispatch on a later date.         |

## Affected contracts

| Contract                                                                             | Effect                                                                                                                                        |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Release Distribution Matrix and Hardening Plan](../product/release-distribution.md) | Gains the preview row and the no-channel-installer rule when this contract is accepted; the stable matrix and timing gate do not change here. |
| [Release Pre-Study](../product/release-pre-study.md)                                 | Its binary-preview research is superseded by this contract once accepted; until then it remains research and this document is the candidate.  |
| [Release Ladder](../product/release-ladder.md)                                       | Unchanged maturity mapping. A preview is not `Implemented`, `Verified`, or `Compatible` evidence.                                             |
| [Release mechanics](../development/release-mechanics.md)                             | Crate publish order is unchanged; previews publish no crate.                                                                                  |
| `bitty` `packaging/README.md`                                                        | R2 key layout unchanged. `bitty/preview/<TAG>/` is reserved only if `P-05` is accepted; stable key classes never move.                        |
| `bitty` `.github/workflows/release.yml`                                              | Future hardening: an explicit stable-tag predicate on every publisher, independent of `needs`. The stable contract itself does not change.    |
| `bitty` `scripts/install.sh` / `install.ps1`                                         | Unchanged; their prerelease rejection is part of the isolation proof.                                                                         |
| `bitty` `scripts/tests/`                                                             | Gains the isolation test named in this contract when implementation is authorized.                                                            |
| [Specifications index](README.md)                                                    | Gains the Draft row for this candidate.                                                                                                       |
| [bitty#2655](https://github.com/bitty-terminal/bitty/issues/2655)                    | This document answers the contract half. The implementation half remains unauthorized until acceptance.                                       |

## Open points

Every item below is an owner decision. The candidate column is a default for
review, not a decision made by this document.

| ID   | Decision                                                   | Candidate default                                                       | Why it is open                                                                                                             |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| P-01 | Timezone, exact UTC schedule, and schedule owner           | `Europe/Berlin`, two crons, release owner as schedule owner             | The product cadence names 23:30 local but never names a zone or an owner; the mapping changes with the zone.               |
| P-02 | Lateness window and DST mechanism                          | Two crons plus a local preflight; accept 23:25–23:59 local              | A wider window absorbs scheduler delay but moves the nominal time; a narrower window misses more nights.                   |
| P-03 | Whether previews are public                                | Public GitHub prereleases, explicitly unsupported                       | A public preview is discoverable and useful; it also invites support expectations and wider exposure of unfinished builds. |
| P-04 | Whether package managers ever receive previews             | Never                                                                   | Any preview channel in Homebrew/Scoop/AUR/APT/Copr creates a second version grammar and a rollback path.                   |
| P-05 | Whether previews mirror to R2 under `bitty/preview/<TAG>/` | No R2 contact in v1                                                     | A mirror improves download reliability but adds a Cloudflare credential and a second retention surface.                    |
| P-06 | Retention count/window and prune-failure semantics         | 14 releases; prune failure fails the run after the preview is published | Retention is a policy choice; failing the run on a prune error is stricter than some owners want.                          |
| P-07 | Matrix breadth and smoke scope                             | Three cells; Linux smoke required, Windows smoke candidate              | More cells increase coverage and cost; macOS has no headless launch proof.                                                 |
| P-08 | Multiple previews per day and manual dispatch policy       | One per date; dispatch may run only on a later date, never backdate     | A second same-day preview needs a suffix grammar the tag format does not define.                                           |
| P-09 | Whether docs-only or non-binary commits trigger a preview  | Any advancement of `main` triggers                                      | Path filtering reduces noise but needs a maintained list of build-relevant paths and can miss a real change.               |
| P-10 | Signing, attestation, and SBOM posture                     | Build attestation only; no signature, no SBOM                           | Signing and SBOMs add supply-chain evidence but also secrets, tools, and a stable-parity gap.                              |
| P-11 | Rule when the base version equals the newest stable tag    | Require strictly greater; block until the next bump                     | Equality would let previews run immediately but make them sort below the just-released stable.                             |
| P-12 | Support policy and user expectation for previews           | Unsupported, no upgrade path, download-and-run only                     | The owner must decide how much documentation and triage preview users receive.                                             |
| P-13 | Failed-night notification and schedule ownership           | Failed run is visible; no automatic issue; owner re-enables schedules   | Notification volume, on-call expectations, and the 60-day scheduler-disable rule need an owner.                            |
| P-14 | Promotion authority and checklist                          | Release owner approves; same-commit retag; stable pipeline rebuilds     | Who may promote and which evidence is mandatory is an authority decision, not a technical one.                             |

## Acceptance criteria

This contract is complete when:

1. `P-01` through `P-14` are decided, or each is explicitly deferred with a
   named owner and date; no open item is silently resolved.
2. An independent reviewer records `APPROVE` on the diff.
3. A security reviewer approves the isolation proof, specifically the default-on
   APT/Copr/Nix publishers, the broad `r2-mirror` condition, the no-credential
   preview posture, and the promotion rule.
4. The isolation assertions are concrete and testable: named test file, named
   guards, expected rejection behavior, and evidence that a preview cannot reach
   a stable pointer.
5. The tag grammar and reader table are re-verified against the then-current
   `bitty` revision; any drift is recorded, not patched silently.
6. The affected documents in `Affected contracts` are synchronized, including
   the release distribution and pre-study sections that describe previews.
7. No workflow, script, release, tag, or channel change is claimed or made by
   this task; `v0.0.28` and `v0.0.29` remain untouched.
8. The document is English-only, self-contained, and free of external
   provenance references.

Moving from candidate to accepted records the owner decisions and reviewer
sign-offs in this document and updates `status` to `accepted`. Implementation
remains a separate task with its own acceptance gates.

## P0 Review Sign-off

Not signed. This is a candidate; owner decisions and the security review are
promotion gates, not formalities.

| Reviewer                     | Required for                                                                             | Status  |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| Project initiator (owner)    | `P-01` through `P-14`, schedule ownership, and final promotion                           | Pending |
| Security reviewer            | Credential scope, tag confusion, channel isolation, provenance, retention, and promotion | Pending |
| Release engineering reviewer | Schedule mechanics, matrix, artifact naming, gate selection, and promotion runbook       | Pending |
| Docs curator                 | Document spine, index row, language, status, and cross-document synchronization          | Pending |

## References

- [bitty#2655](https://github.com/bitty-terminal/bitty/issues/2655) — the
  owning issue and acceptance items.
- [`bitty` `release.yml`](https://github.com/bitty-terminal/bitty/blob/main/.github/workflows/release.yml)
  — stable tag predicate, matrix, release creation, R2 mirror, stable pointers,
  and channel publishers.
- [`bitty` `packaging/README.md`](https://github.com/bitty-terminal/bitty/blob/main/packaging/README.md)
  — R2 bucket layout, key classes, cache policy, `latest.txt` format, channel
  sources, and lifecycle.
- [`bitty` `scripts/install.sh`](https://github.com/bitty-terminal/bitty/blob/main/scripts/install.sh)
  and [`scripts/install.ps1`](https://github.com/bitty-terminal/bitty/blob/main/scripts/install.ps1)
  — bootstrap entry points and prerelease rejection.
- [`bitty` `scripts/check-release-version.sh`](https://github.com/bitty-terminal/bitty/blob/main/scripts/check-release-version.sh)
  — workspace version as the single source of truth.
- [`bitty` `scripts/check-release-paths.sh`](https://github.com/bitty-terminal/bitty/blob/main/scripts/check-release-paths.sh)
  — builder-path release gate.
- [ADR 0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0002-platform-support-tiers.md)
  — platform tiers.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
  and [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
  — normative security controls.
- [Documentation workflow](../docs/development/documentation-workflow.md) —
  frontmatter, status, language, and review policy.
- [Release Distribution Matrix and Hardening Plan](../product/release-distribution.md),
  [Release Pre-Study](../product/release-pre-study.md), and
  [Release Ladder](../product/release-ladder.md) — companion release documents.
