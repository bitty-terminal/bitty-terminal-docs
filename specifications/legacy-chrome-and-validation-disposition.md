---
title: Legacy Chrome and Validation Suite Disposition
description: Candidate terminal-platform record of the accepted legacy-chrome path dispositions and validation-suite membership from W-74 W-75 and ADR 0017 with CI commands the no-plugin baseline evidence artifacts removal gates and deprecation links
category: specifications
audience: maintainer
document_type: specification
status: draft
website_publish: true
sidebar_order: 72
---

# Legacy Chrome and Validation Suite Disposition

## Document status

Candidate terminal-platform synchronization record. It summarizes accepted
cross-repository decisions owned by
[bitty-docs](https://github.com/bitty-terminal/bitty-docs) and records only
their terminal-side consequences. It decides nothing new, authorizes no
implementation, and describes no executed removal or relocation. The linked
sources are normative; where this page and a linked source differ, the linked
source wins.

- Traceability: `bitty-terminal-docs` CarryCtx `CTX-0087` (plan keys `W-83` and
  `W-84`), Issue
  [#166](https://github.com/bitty-terminal/bitty-terminal-docs/issues/166).
- Accepted sources this record synchronizes:
  - [`W-74` Legacy Chrome Retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md)
    assigns an owner and a disposition to every legacy tab-strip, scratchpad,
    workspace, and workspaceline path and defines behavior parity, the
    no-plugin baseline, and the removal gates.
  - [`W-75` Validation Suite Ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md)
    makes `bitty-compat-lab` and `bitty-perf` independent validation
    repositories, preserves every required gate, and fixes the immutable pin
    discipline.
  - [ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md)
    retires the `bitty-terminal.tabs` compatibility alias and the bundled
    `bitty-terminal.shell-integration` manifest at a `>= v0.2.0` floor and
    defines the stored-grant migration path.
- Execution status: not executed. The `bitty` workspace still carries the
  transitional workspaceline, the compatibility aliases, and the bundled
  manifests, and `bitty-compat-lab` and `bitty-perf` are still product-workspace
  members. Relocation is `W-105`; Core-side removal is `W-104`. Every
  implementation-status page linked below stays candidate.
- Frontmatter `status` is `draft` per the repository metadata schema; document
  status is Candidate.

## Purpose and scope

This record gives the terminal-platform corpus one discoverable page that
reflects the accepted disposition in `W-74`, `W-75`, and ADR 0017, so that the
architecture, product, and reference pages do not drift while the retirement
and the validation-suite relocation are still unexecuted. It exists for the
`W-83` documentation-synchronization deliverable and carries the terminal-side
entry point for the `W-84` validation-repository relocation guidance.

In scope:

- the per-path legacy-chrome disposition, with the owner and the disposition
  direction from `W-74`;
- the retained Core mechanism and the no-plugin baseline;
- the validation-suite membership, the CI and local commands that stay
  required, and the immutable pin and evidence discipline from `W-75`;
- the deprecation and removal gates, the version floor, and the deprecation
  links;
- the traceability from this page to `W-83`, `W-84`, and the existing
  terminal-platform pages it synchronizes.

Out of scope and not decided here:

- the content or interface of the `bar`, `statusline`, and shell-integration
  packages;
- the `W-40` bar review, the `W-51` registry migration, and the `W-122` bar
  onboarding;
- the concrete external coupling and thin-check mechanisms, which are parked to
  `W-105`;
- any implementation, extraction, manifest removal, code deletion, or grant
  migration;
- the exact spellings of the workspace read API, lifecycle events, capability
  names, and command namespace (`OQ-056`) and the tab-order scope (`OQ-052`).

Nothing here weakens a normative security control. Where a control or threshold
appears to need change, it is parked to the owning source and is not changed
here.

## Normative sources this specification must not weaken

This record must be read together with, and must not weaken:

- The security corpus in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): the security
  overview, the threat model, the risk register, and the P0 security acceptance
  criteria, which stay authoritative for every trust boundary named here.
- [`W-74` Legacy Chrome Retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md),
  which owns the per-path table, the behavior-parity definition, the
  no-plugin baseline, and the removal gates.
- [`W-75` Validation Suite Ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md),
  which owns the membership, build policy, required gates, and pin discipline.
- [ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md),
  which owns the alias and bundled-manifest retirement floor and the
  stored-grant migration path.
- [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  (workspace is a Core mechanism; presentation is plugin-only; `bitty --safe`
  has no built-in minimal bar),
  [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  (Boundary 5, legacy chrome; Boundary 6, validation suites), and
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
  (binding constraint 12).

## Terminology

- **Legacy chrome**: the Core-resident workspace and tab presentation that
  predates ADR 0014, together with its compatibility aliases and settings.
- **Retained Core mechanism**: a Core-owned, always-available primitive that
  works with zero plugins and in `bitty --safe`.
- **Compatibility alias**: a deprecated identifier, claim, command spelling, or
  constant kept only so stored grants, scripts, and third-party claimants keep
  working during a documented window.
- **No-plugin baseline**: what Bitty does with zero bar, status, or other
  presentation plugins enabled, including `bitty --safe`.
- **Validation suite**: a headless, bounded test or measurement harness that
  exercises the production revision; it is tooling with no shipped runtime
  authority and is `publish = false`.
- **Independent validation repository**: a separate Git repository that owns a
  validation suite, its CI, and its evidence, and consumes a pinned production
  revision. The reserved homes are `bitty-compat-lab` and `bitty-perf`.
- **Required gate**: a check whose failure blocks merge on the product change
  path, enforced by branch protection on the product repository, regardless of
  which repository hosts the job definition.
- **Tested production revision**: the exact, immutable `bitty` revision a
  validation suite is pinned to and exercises.

## Legacy chrome path disposition

The owner and disposition direction for each legacy path are accepted by
`W-74`; the authoritative table with source evidence is in
[`W-74` Legacy Chrome Retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md).
The summary below records only the disposition and the owner. Current locations
are evidence of where the code lives today, not a claim that any disposition has
been executed.

| Legacy area                                                                                                     | Owner                                                                                          | Disposition direction                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace lifecycle and state (`crates/bitty-runtime/src/runtime/workspaces.rs`, lifecycle and command portion) | bitty Core (`W-104`)                                                                           | Retain lifecycle, state, and command handling as a Core mechanism.                                                                                                                                                                                                                                                                                                                |
| First-party workspace policy path (`crates/bitty-runtime/src/workspace.rs`)                                     | bitty Core (`W-104`)                                                                           | Retire the manifest policy path after parity; re-home pure observation helpers only when no consumer remains.                                                                                                                                                                                                                                                                     |
| `tabs` alias shim (`crates/bitty-runtime/src/tabs.rs`)                                                          | bitty Core (`W-104`)                                                                           | Deprecate and remove at the documented `>= v0.2.0` alias boundary; do not delete ahead of the window. Executed early under the DEC-0100 owner waiver of the ADR-0017 floor (`bitty#1717` `471b3f9`).                                                                                                                                                                              |
| Tab-strip projection (`crates/bitty-ui/src/tab_strip.rs`)                                                       | `bar` presentation plugin; Core removal `W-104`                                                | Move panel tabs to plugin policy; retire the Core-side module once parity exists.                                                                                                                                                                                                                                                                                                 |
| Scratchpad slot (`crates/bitty-ui/src/scratchpad.rs`)                                                           | bitty Core                                                                                     | Retain as a Core hidden slot and state mechanism; visible indicator and toggle UX move to the bar or statusline plugin while the toggle stays a Core workspace command.                                                                                                                                                                                                           |
| Bundled manifests and claims (`crates/bitty-plugin-host/src/bundled.rs`)                                        | bitty Core (`W-104`); replacement registration is a first-party package                        | Retire the bundled `bitty-terminal.workspace` and `bitty-terminal.tabs` entries after parity; drop the exclusive `workspaceline` and `tabline` claims; keep the workspace commands in the Core command namespace. The `tabs`/`tabline` portion executed early (`bitty#1717` `471b3f9`, DEC-0100 waiver); the `workspace`/`workspaceline` remainder stays open under `bitty#1572`. |
| Bundled shell-integration manifest                                                                              | bitty Core (`W-104`); replacement is an independently versioned first-party package (ADR 0017) | Retire the bundled `bitty-terminal.shell-integration` manifest at the `>= v0.2.0` floor while keeping the plugin id available through the independent package; Core keeps OSC 7/133 parsing, semantic zones, and Terminal Truth.                                                                                                                                                  |
| Transitional workspaceline and status-bar presentation (`crates/bitty-runtime/src/runtime/workspaces.rs`)       | bitty Core (`W-104`)                                                                           | Retire the presentation once a first-party presentation plugin covers it; the lifecycle and state stay.                                                                                                                                                                                                                                                                           |
| Generic chrome band mechanism (`crates/bitty-runtime/src/runtime/band_slots.rs`)                                | bitty Core                                                                                     | Retain: edge reservation, mount routing, stacked band rows, and per-edge geometry are generic, not workspace-specific.                                                                                                                                                                                                                                                            |
| Presentation-state mechanism (`crates/bitty-ui/src/presentation.rs`)                                            | bitty Core                                                                                     | Retain: presentation mode is mechanism, not chrome.                                                                                                                                                                                                                                                                                                                               |
| Legacy settings `workspace.show_bar` and `workspace.bar.edge`                                                   | bitty Core (`W-104`); first-party plugin mapping                                               | Deprecate with the transition: map to the plugin settings with a deprecation window or remove alongside the workspaceline; introduce no new Core bar-appearance keys.                                                                                                                                                                                                             |
| Never-empty guard, stable panel identity, and scene candidates                                                  | owning RFCs                                                                                    | Out of scope for `W-74`; accepted or rejected by their owning RFCs.                                                                                                                                                                                                                                                                                                               |
| Terminal tab-stop state (`crates/bitty-term-state/src/tabs.rs`)                                                 | bitty Core                                                                                     | Retain: a terminal mechanism unrelated to workspace tabs, listed only to disambiguate the name.                                                                                                                                                                                                                                                                                   |

### Compatibility aliases

The `bitty-terminal.tabs` plugin id, the `bitty-terminal.tabs:*` command
aliases, the `tabline` claim alias, and the `TABS_*` constants and
`TabsIntegration` functions are compatibility aliases, not mechanisms. They
resolve to the canonical workspace names, grant no extra authority, and are
removed with the bundled manifest after parity, at the `>= v0.2.0` floor fixed
by [ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md).
The `tabs`-alias portion executed early under the DEC-0100 owner waiver of
that floor (`bitty#1717` `471b3f9`).
The accessibility chrome node kind that names a tab strip is a generic
accessibility classification and is retained with the generic chrome mechanism.

### Retained Core mechanism

Core keeps the workspace lifecycle and state, the panel and layout primitives,
the generic chrome geometry and slot mechanism with hit-testing and
click-to-command routing, the bounded workspace observation and control
surfaces, the hidden scratchpad slot, and the presentation-state mechanism.
Nothing in the disposition deletes a retained mechanism, and no private
first-party bypass is introduced.

## Validation-suite membership and CI

`W-75` decides that `bitty-compat-lab` and `bitty-perf` relocate out of the
product workspace into independent validation repositories. An independent
repository is not an independent gate: the compatibility and performance checks
stay required on the product change path and must run against the actual
production revision. The authoritative decision, membership table, and required
gates are in
[`W-75` Validation Suite Ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md).

| Repository         | Membership after `W-105`                                                                                                      | Required gates retained                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `bitty-compat-lab` | Independent validation repository; external pinned production revision; no product-workspace member and no product dependency | Compatibility release matrix and the compat-lab M1 suites (`m1_mode_golden`, `m1_color_golden`), with floors |
| `bitty-perf`       | Independent validation repository; external pinned production revision; no product-workspace member and no product dependency | Benchmark compile and run gate and the parser-throughput regression floor                                    |
| `bitty` (product)  | Keeps only product and retained harness members; removes the `dev-perf` to `bitty-perf` edge                                  | The same required checks on the product change path, with no coverage loss                                   |

The runtime-owned M1 suites `m1_mode_input`, `m1_color_title`, and
`m1_shell_coverage`, plus `bitty-test-support` and `bitty-test-vm`, stay in the
product workspace. The anti-silent-omission floors are preserved
(`m1_mode_golden` ten tests, `m1_color_golden` seven tests, and the existing
compatibility-matrix and performance floors).

### CI and local commands that stay required

The commands below are the current required and local entry points recorded by
`W-75` and the
[terminal compatibility matrix](../reference/compatibility-matrix.md). They run
in the `bitty` repository today; after `W-105` they run in the owning validation
repository, and the product repository keeps a required check on its change
path. Local runs use the same suite roster and floors as CI and are never weaker
than the required check.

Required product-path commands:

```sh
cargo test -p bitty-perf --benches
cargo test -p bitty-perf --test parser_throughput_regression
scripts/m1-matrix.sh
scripts/compat-matrix.sh
```

Compatibility-lab commands:

```sh
cargo test -p bitty-compat-lab --locked
BITTY_COMPAT_REVISION="$(git rev-parse --short HEAD)" \
  cargo run -p bitty-compat-lab --bin compat_report --locked -- \
  --out recording/compat-report.json
cargo run -p bitty-compat-lab --bin collect_dumps --locked
cargo test -p bitty-compat-lab --test compare --locked -- --nocapture
```

Env-gated local compatibility probes (not run by CI):

```sh
scripts/compat-local.sh
BITTY_COMPAT_LIVE=1 cargo test -p bitty-compat-lab --test live_compat --locked -- \
  --nocapture --test-threads=1
```

Local performance commands:

```sh
cargo bench --no-run
cargo bench -p bitty-perf --bench startup_real -- --nocapture
cargo bench -p bitty-perf --bench latency_real -- --nocapture
cargo bench -p bitty-perf --bench idle_real -- --nocapture
```

The current required check set on the product change path includes the quality
job (benchmark compile and run plus the parser-throughput regression floor), the
four Tier 1 platform legs (`linux-x11`, `linux-wayland`, `macos`, `windows`)
that run the M1 and compatibility matrices, and the `m1-matrix` and
`compat-matrix` aggregate views. `W-105` must keep every one of them required
and visible; removing a gate from branch protection is a coverage loss and is
not permitted.

### Immutable pin discipline

Each validation repository records one immutable tested production revision (a
commit, never a moving branch or an untagged ref) and the matching suite
revision. A pin bump is an owned, reviewed change in the validation repository
and never moves implicitly; every gate result resolves to exactly two
revisions, the production revision under test and the suite revision that
produced it. The required check on the product change path exercises the suite
at the pinned suite revision against the product revision being proposed.

### No-plugin baseline

`W-74` defines the no-plugin baseline as Bitty with zero bar, status, or other
presentation plugins enabled, including `bitty --safe`:

1. Workspaces are fully usable: every workspace operation works through Core
   commands and key bindings, with no dependency on the plugin system.
2. Core draws no workspace presentation: no bar, no tab strip, no sidebar, and
   no workspace pills; every edge band reserves zero space.
3. The hidden scratchpad slot and its Core toggle command remain available, with
   no visible indicator when no presentation plugin is enabled.
4. The baseline does not depend on the plugin runtime, event delivery, or
   request queue.
5. The transitional workspaceline is the only exception while it is still
   present; it is removed once a first-party presentation plugin reaches parity.

### Evidence artifacts

Compatibility and performance evidence is produced by the validation suites, in
the owning validation repository, against the pinned production revision:

- **Compatibility**: the release-matrix report and matrix JSON plus the M1
  evidence rows.
- **Performance**: the benchmark baselines, the parser-throughput regression
  result, and the environment and revision provenance recorded beside them.
- **Retention and citation**: machine-readable artifacts stay versioned in the
  owning validation repository and are cited by reference, not copied. The
  evidence matrix in bitty-docs remains the canonical register, and every
  citation must resolve to the relocated gate, artifact, and the two revisions.
  Metadata-only scaffold checks are not product, compatibility, or performance
  evidence.

## Deprecation and removal gates

No legacy path is removed until every gate below that applies to it is
satisfied and recorded. `W-74` satisfies the ownership gate only; it does not
satisfy the parity, review, migration, regression, or documentation gates.

| Gate                          | Owner                                             | Requirement                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ownership and disposition     | `W-74` (accepted)                                 | Every path has an owner and a disposition.                                                                                                                                    |
| Behavior parity               | owning implementation task; reviewed under `W-40` | The replacement reproduces the user-visible behavior or an accepted alternative is recorded.                                                                                  |
| Independent bar review        | `W-40`                                            | Confirms parity, the no-plugin baseline, and no presentation regression; `W-104` does not start before `W-40`, `W-74`, and `W-83` are complete.                               |
| Alias and settings migration  | `W-26`, `W-27`                                    | Removes or maps the compatibility aliases and the `workspace.show_bar` and `workspace.bar.edge` settings under a documented deprecation window.                               |
| No regression                 | owning implementation task                        | Covers the no-plugin baseline, safe mode, workspace navigation and persistence, scratchpad hide/show/toggle, and capacity bounds; gates and CI green on the removal revision. |
| Deprecation window            | `W-26`, `W-27`, `W-104`                           | Aliases are removed only at the `>= v0.2.0` boundary; a flag-day removal is not allowed. ADR 0017 fixes the floor and the stored-grant migration.                             |
| Documentation synchronization | `W-83`, `W-80` through `W-84`                     | Affected architecture, specification, product, and reference pages are synchronized before the retirement task completes.                                                     |
| Independent review and CI     | `W-104`                                           | Independent review and passing CI; a green build is an acceptance gate, not a substitute for review.                                                                          |

Removal order: the first-party presentation plugin reaches parity (`W-40`);
aliases and settings are migrated or mapped (`W-26`, `W-27`); the transitional
workspaceline, the bundled manifests, and the Core-side candidate tab-strip
module are removed (`W-104`), with the shell-integration replacement package
available and at parity; Core keeps the retained mechanism. No step removes a
retained mechanism.

### Deprecation links

- [`W-74` Legacy Chrome Retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md)
  records the `>= v0.2.0` alias window and the migration and removal gates.
- [ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md)
  fixes the alias and bundled-manifest floor and the stored-grant migration:
  a stored `bitty-terminal.tabs` record is remapped to
  `bitty-terminal.workspace` without widening authority and with denials
  preserved; a shell-integration record carries forward through the hash-bound
  update path or re-consents when a capability is added; unmigrated or orphaned
  records are inert and reported, never silently revived.
- [Documentation workflow](../docs/development/documentation-workflow.md)
  records the deprecation and versioning policy this page follows.

## Traceability

| Plan key | Scope                                     | Terminal-platform consequence                                                                                                                                                                                      |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `W-83`   | Terminal documentation synchronization    | This page and the affected architecture, product, and reference pages reflect the accepted `W-74`, `W-75`, and ADR 0017 dispositions without claiming execution. `W-83` is a completion prerequisite for `W-104`.  |
| `W-84`   | Validation-repository relocation guidance | This page is the terminal-platform entry point for the `bitty-compat-lab` and `bitty-perf` relocation guidance accepted by `W-75`; the owning repositories accept the guide before their `CTX-0002` tasks unblock. |

`CTX-0087` also synchronizes the existing pages listed under References below.
Nothing in `W-83` or `W-84` authorizes a removal or a relocation;
those remain `W-104` and `W-105`.

## Implementation status

Candidate. No disposition in this page is executed:

- the transitional workspaceline, the `bitty-terminal.tabs` alias, and the
  bundled `bitty-terminal.workspace` and `bitty-terminal.shell-integration`
  manifests are still present in the `bitty` tree;
- `bitty-compat-lab` and `bitty-perf` are still product-workspace members, and
  their independent repositories are metadata-only scaffolds;
- the relocation is `W-105` and the Core-side removal is `W-104`.

The implementation-status pages
[compatibility lab](../product/compat-lab.md),
[compatibility matrix for release](../product/compat-matrix.md),
[performance baseline](../product/perf-baseline.md),
[performance evidence](../product/perf-evidence.md), and the
[terminal compatibility matrix](../reference/compatibility-matrix.md) stay
candidate. The
[core and plugin boundaries](../architecture/core-boundaries.md),
[architecture overview](../architecture/overview.md), and
[future boundaries](../architecture/future-boundaries.md) pages remain the
accepted architecture and candidate-mechanism records they already are.

Execution pointer (`W-104`): the Core-side removal has since executed in
part — the transitional workspaceline display was removed (`bitty#1721`
`819f286`) and the `tabs` alias was purged early (`bitty#1717` `471b3f9`);
the disposition direction above stands, and the manifest/claim remainder
stays open under `bitty#1572`.

## Security review

This record adds no trust boundary and changes no capability. The security
review of each accepted source stands: the retirement cannot remove a security
enforcement point because the retained mechanism and the permission checks stay
in Core; safe mode keeps zero third-party plugins and every workspace
operation; presentation uses only the public, capability-gated API with read
never implying control; and validation tooling gains no product authority by
moving out of the workspace. No P0 control is weakened, and the downstream
`W-104`, `W-26`, `W-27`, and `W-105` tasks each require security review again
before their own merge where they touch a trust boundary.

## Verification plan

This is a candidate synchronization record; it has no executable verification
of its own. Before this page is treated as current, the repository-local
`just check` must pass with zero issues, and every relative link and fragment on
this page must resolve. Any later execution of the disposition must prove, at
minimum, the verification plan of the owning source: the no-plugin baseline,
behavior parity, fail-closed interaction, deprecation windows, no regression,
preserved bounds, the retained mechanism, cross-platform evidence, and no
coverage loss for the relocated validation gates.

## Alternatives considered

| Alternative                                              | Disposition                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Leave the disposition only in the bitty-docs contracts   | Rejected: terminal-platform readers would have no single routed entry point, and the affected pages could drift silently. |
| Duplicate the full `W-74` and `W-75` normative text here | Rejected: cross-repository contracts are linked, not copied; this page records only terminal-side consequences.           |
| Record the disposition as implemented                    | Rejected: no removal or relocation is executed; the pages stay candidate.                                                 |
| Create a new normative decision on the terminal side     | Rejected: nothing new is decided; the sources own the decisions.                                                          |

## Affected contracts

- [`W-74` legacy-chrome retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md): owns the per-path owner and disposition, parity, no-plugin baseline, and removal gates recorded here.
- [`W-75` validation-suite ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md): owns the independent validation-repository membership, pin discipline, and preserved gates.
- [`ADR 0017`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md): owns the `bitty-terminal.tabs` alias and bundled shell-integration manifest retirement and the stored-grant migration path.
- [`ADR 0015`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md) Boundary 5 and [`ADR 0016`](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md): the accepted extraction boundaries this disposition is consistent with.
- Core integration `W-104` and validation relocation `W-105`: consume this disposition; their content is not decided here.
- Downstream execution stays with `bitty` `W-26`, `W-27`, `W-40`, `W-83`, `W-104`, and `W-105`, and with the `bitty-compat-lab` and `bitty-perf` `CTX-0002`/`CTX-0003` tasks.

## Open points

The following details are parked with their owning sources and are not reopened
here:

- first covering presentation plugin and settings mapping, parked to `W-104`
  and the first-party plugin (`W-74`);
- deprecation-window mechanics, parked to `W-26` and `W-27`;
- the fate of the candidate tab-strip module, parked to the `bar` plugin RFC
  and `W-104`;
- the external coupling and thin required-check mechanisms, `dev-perf`
  resolution, benchmark-baseline placement, mixed M1 roster split, and the local
  developer entry point, parked to `W-105` and the two validation
  implementation tasks (`W-75`);
- tab-order scope (`OQ-052`) and the workspace read API, event, capability, and
  command spellings (`OQ-056`).

## Acceptance criteria

- Every legacy path named by the task carries an owner and a disposition
  direction consistent with `W-74`.
- The validation-suite membership, required CI and local commands, required
  checks, immutable pin discipline, no-plugin baseline, and evidence artifacts
  are recorded consistent with `W-75`.
- The deprecation and removal gates are stated and linked, including the
  `>= v0.2.0` floor and the stored-grant migration from ADR 0017.
- The `W-83` and `W-84` traceability and the deprecation links are present.
- No implementation is described as executed, and every implementation-status
  page stays candidate.
- No normative content owned by bitty-docs is duplicated as if original, and no
  P0 control is weakened.
- The document is self-contained, in English, and `just check` passes with zero
  issues.

## P0 Review Sign-off

| Role                 | Scope                                                          | Requirement                                                           |
| -------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| `architecture-owner` | Disposition consistency with `W-74` and `W-75`                 | Approve; confirms no new decision and no boundary change.             |
| `security-reviewer`  | Safe mode, capability model, and validation-tooling neutrality | Confirm no P0 control is weakened; the source security reviews stand. |
| `docs-curator`       | Taxonomy, metadata, links, traceability, and candidate status  | Approve; confirms discoverability and unchanged registers.            |

## References

- [bitty-terminal-docs#166](https://github.com/bitty-terminal/bitty-terminal-docs/issues/166)
  (CarryCtx `CTX-0087`, plan keys `W-83` and `W-84`).
- [`W-74` Legacy Chrome Retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md)
  and
  [`W-75` Validation Suite Ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md).
- [ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md),
  [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md),
  [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md),
  and
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md).
- [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).
- Terminal-platform pages synchronized by this record:
  [Core and Plugin Boundaries](../architecture/core-boundaries.md),
  [Architecture Overview](../architecture/overview.md),
  [Future Boundaries](../architecture/future-boundaries.md),
  [Terminal compatibility matrix](../reference/compatibility-matrix.md),
  [Compatibility lab](../product/compat-lab.md),
  [Compatibility matrix for release](../product/compat-matrix.md),
  [Performance baseline](../product/perf-baseline.md),
  [Performance evidence](../product/perf-evidence.md), and the
  [Release Ladder](../product/release-ladder.md).
- Accepted terminal-platform specifications:
  [Compatibility Milestone RFC](compatibility-milestone-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md),
  [Default Distribution RFC](default-distribution-rfc.md), and the
  [Chrome Surface API (Candidate)](chrome-surface-api-candidate.md).
- [Specifications index](README.md) and
  [documentation workflow](../docs/development/documentation-workflow.md).
