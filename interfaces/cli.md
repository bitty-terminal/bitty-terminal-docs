---
title: Command-line interface
description: Candidate reference for the extensible CLI, runtime control, output, and introspection contracts
category: reference
audience: user
document_type: reference
status: draft
website_publish: true
sidebar_order: 10
---

# Command-line interface

## Document status

> Status: candidate architecture. An extensible, first-class CLI is an
> accepted working direction, and experimental parser/registry code exists in
> the `bitty` workspace. The shared executable registry, command tree,
> identifiers, environment variables, output schemas, and exit codes are
> candidate contracts until separately specified, implemented, and verified;
> no stable or supported CLI contract is claimed.

## Purpose and scope

The Bitty CLI is a formal frontend to the same capabilities used by GUI
actions, key bindings, Lua, IPC, developer tools, and agent adapters. It must
not become a second implementation of runtime behavior hidden inside argument
parsing.

IPC authentication, client scope, and untrusted terminal-output requirements
are normative in the [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and
[threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md).

## Candidate direction: one executable registry, many frontends

```text
                         Executable Registry
                                  |
          +-----------+-----------+-----------+-----------+
          |           |           |           |           |
         GUI         CLI         Lua         IPC         MCP
          |           |           |           |           |
          +-----------+-----------+-----------+-----------+
                                  |
                           Runtime services
```

A CLI request such as a view split should resolve to the same owned executable
that a key binding or Lua invocation uses:

```text
bitty ctl view split --right
  -> command core.view.split { direction: "right" }
  -> IPC
  -> runtime ViewManager
```

The CLI adapter owns parsing, target selection, serialization, and display. The
runtime service owns the operation.

## Action and command distinction

Status: **candidate contract.**

- An **action** is a fast contextual user operation such as copy, paste, font
  increase, or view split. It is suitable for key binding and may not produce
  standard output.
- A **command** has structured arguments and a structured result, can fail, and
  is suitable for automation.

Both may use one lower-level executable registry. The naming distinction keeps
runtime interactions and machine-oriented queries clear without creating
independent business logic.

## Command classes

Status: **candidate contract.**

Bitty needs three classes of CLI operation:

- **Local:** requires no running instance; examples include version, doctor,
  config validation, and package management.
- **Runtime:** connects to an instance; examples include listing terminals,
  splitting a view, sending input, and reloading configuration.
- **Extension:** declared by a plugin; examples include Markdown rendering,
  sessions, and SSH workflows.

Starting a terminal and controlling an existing instance must remain visibly
different operations.

## Candidate top-level grammar

```text
bitty
├── run
├── ctl
├── config
├── plugin
├── list
├── inspect
├── dev
├── doctor
├── cmd
├── x
├── completion
└── version
```

This tree is a candidate namespace, not a stable or supported CLI. Its intent
is to keep the top level small and stable:

- `bitty` opens the terminal with the default shell.
- `bitty run [OPTIONS] -- COMMAND...` starts a child program.
- `bitty ctl` controls a running instance.
- `bitty config` locates, validates, and explains configuration.
- `bitty plugin` manages plugin packages.
- `bitty list` enumerates resources.
- `bitty inspect` exposes user-facing state and ownership.
- `bitty dev` contains developer tracing, captures, dumps, and overlays.
- `bitty doctor` diagnoses the installation and compatibility.
- `bitty cmd` invokes a qualified executable directly.
- `bitty x` is the candidate spelling for a collision-free plugin command
  namespace.

`--` unambiguously separates Bitty arguments from the child process. Bitty
should avoid interpreting `bitty htop` as a child program because it conflicts
with a growing command ecosystem; prefer `bitty run -- htop`.

## Runtime control

Status: **candidate contract.**

```sh
bitty ctl instance list
bitty ctl window list
bitty ctl view list
bitty ctl terminal list --format json

bitty ctl terminal spawn
bitty ctl terminal close t:3
bitty ctl terminal send t:1 "cargo test"
bitty ctl terminal text t:1

bitty ctl view split --right
bitty ctl view focus v:3
bitty ctl config reload
```

Shipped slice: the workspace verbs `bitty ctl workspace list|new|close|focus|move`
are implemented (`bitty` #433/#457, CTX-0257/CTX-0259) with scope gates
`view.inspect` (`list`) and `view.manage` (`new|focus|move`), while
`workspace close ws:N` requires the elevated `terminal.manage` scope because
it kills live sessions. Workspace ids are dense: `workspace new` takes the
lowest free `ws:N` in `1..=16` and slots stay ordered by id, so deleting
`ws:3` and creating again reuses `ws:3` instead of leaving a gap (issue #2532,
`bitty` PR #2538). The rest of the runtime-control surface above remains
candidate; see the
[Workspace Compositor Specification](../specifications/workspace-compositor.md)
evidence section.

Runtime control should travel over a versioned IPC protocol and share the
capability model used by agents and plugins. Reading terminal text, sending
input, closing a terminal, modifying configuration, and managing views are not
equivalent permissions.

IPC is current-user-local by default. Agent and MCP clients begin read-only;
terminal output is untrusted observation data and never an instruction source.

Candidate capability groups include:

```text
terminal.inspect  terminal.input  terminal.manage
view.inspect      view.manage
config.inspect    config.modify
```

The exact names and authorization flow are open.

### Current list behavior and CTX-1269 candidate diagnostics

Status: **implemented experimental list behavior; candidate, not stable.**

The current `bitty` `main` source implements `core.terminal.list` and
`core.workspace.list`. The diagnostic fields described below were merged into
`bitty` `main` by bitty #2183; they remain experimental, not stable, and not a
compatibility-guaranteed CLI schema.

`terminal.list` is derived from the active layout: it lists the terminal IDs
corresponding to the active layout leaves and reports whether each leaf has a
pane session. It is not a process-wide inventory and does not include
terminals retained in hidden or inactive workspaces. `workspace.list` reports
workspace identity and active state; the merged experimental diagnostic also
provides bounded memory accounting for retained workspaces, described below.

The candidate retains the existing read scopes: `core.terminal.list` requires
`terminal.inspect`, and `core.workspace.list` requires `view.inspect`. The
diagnostic fields add no permission, terminal-content access, or control
operation; both reports remain read-only.

#### CTX-1269 candidate diagnostics

Status: **implemented and merged into `bitty` `main` (bitty #2183);
experimental and not stable.**

The candidate extends `core.terminal.list` with a bounded `diagnostics` array
aligned one-for-one with the returned `terminals` array. Each diagnostic has:

- `terminal_id` and `view_id`, using the current one-to-one `t:N`/`v:N`
  mapping;
- `has_session`, `scrollback_lines`, and `retained_heap_bytes`;
- `child_pid`, which is either the recorded direct-child PID or `null`; and
- `child_state`, one of `unreaped`, `reaped`, or `absent`.

`unreaped` means that the PTY handle still owns an unconsumed child status; it
does not assert that the child is currently running because this read-only
query does not poll. `reaped` means the status was consumed while the pane
session remains attached. `absent` has no session and no PID. The diagnostic
contains no command, cwd, host path, or terminal text.

The candidate terminal envelope is therefore shaped as follows:

```json
{
  "terminals": [{ "id": "t:7", "has_pane_session": true }],
  "diagnostics": [
    {
      "terminal_id": "t:7",
      "view_id": "v:7",
      "has_session": true,
      "scrollback_lines": 200,
      "retained_heap_bytes": 65536,
      "child_pid": 1234,
      "child_state": "unreaped"
    }
  ],
  "total_lower_bound": 1,
  "truncated": false
}
```

`child_state` is an ownership state, not a process-status probe:

| State      | Meaning                                                                |
| ---------- | ---------------------------------------------------------------------- |
| `unreaped` | The attached PTY handle still owns an unconsumed child status.         |
| `reaped`   | The child status was consumed while the pane session remains attached. |
| `absent`   | No pane session is attached; `child_pid` is `null`.                    |

The query performs no poll, wait, kill, or reap operation. A non-null PID and
`unreaped` state must not be read as proof that the child is currently alive.

The terminal result is bounded to the active-layout prefix, at most
`MAX_TERMINALS` entries (`64` in the candidate runtime). `terminals` and
`diagnostics` are truncated together and remain aligned. `truncated` is true
when the bounded walk stops before all active-layout leaves are visited.
`total_lower_bound` is the number of returned entries: it is exact when
`truncated` is false and is only a lower bound when `truncated` is true. The
candidate does not scan retained inactive workspaces for this command.

The same candidate adds a `memory` object to `core.workspace.list`. Its
`workspaces` array covers retained workspace slots in slot order, including
hidden or inactive workspaces, with rows containing:

- `seq`, `active`, `leaf_views`, and `layout_truncated`;
- `detached_floats_total`, `detached_floats_reported`,
  `detached_floats_omitted`, and `detached_floats_truncated`;
- `owned_views`, `pane_sessions`, `primary_state`, and `owned_bytes`.

The candidate workspace envelope retains the existing identity fields and adds
the versioned memory report:

```json
{
  "workspaces": ["ws:1"],
  "names": ["ws1"],
  "active": 1,
  "active_id": "ws:1",
  "count": 1,
  "memory": {
    "v": 1,
    "workspaces": [
      {
        "seq": 1,
        "active": true,
        "leaf_views": 1,
        "layout_truncated": false,
        "detached_floats_total": 0,
        "detached_floats_reported": 0,
        "detached_floats_omitted": 0,
        "detached_floats_truncated": false,
        "owned_views": 1,
        "pane_sessions": 0,
        "primary_state": true,
        "owned_bytes": 65536
      }
    ],
    "aggregate": {
      "workspaces": 1,
      "leaf_views": 1,
      "pane_sessions": 0,
      "orphaned_pane_sessions": 0,
      "primary_states": 1,
      "owned_views": 1,
      "unique_owned_bytes": 65536,
      "unattributed_bytes": 0
    }
  }
}
```

The workspace walk reports at most `MAX_WORKSPACES` rows (`16`), visits at
most `MAX_VIEWS_PER_WORKSPACE` layout leaves (`32`) per row, and examines at
most `MAX_SESSION_PANES_TOTAL` pane-session owners (`128`) in the aggregate.
The layout depth guard is `64`. Detached floats are materialized only when the
complete detached-float set fits in the row's remaining leaf budget; otherwise
none of that set is materialized and all are reported as omitted. Their total,
reported, omitted, and truncation fields remain explicit.
`layout_truncated` records a depth/leaf-prefix stop.
These bounds describe the diagnostic report and do not change the active
layout or the existing `terminal.list` result.

The workspace `aggregate` reports bounded workspace, leaf, pane-session,
orphaned-session, primary-state, and ownership counts, together with
`unique_owned_bytes` and `unattributed_bytes`. A pane owner is charged once by
`ViewId`; the runtime-global primary state is charged once by its primary-owner
marker. Shared or duplicate references are therefore visible in leaf counts
but not double-counted in ownership or byte totals. Orphaned global owners are
aggregate-only and contribute to `unattributed_bytes`.

Both candidate reports are read-only. Workspace memory output omits terminal
text, cwd, host paths, and PIDs. It makes no claim about process RSS, RSS
reduction, or post-close reclaim. The active-layout versus retained-workspace
distinction remains explicit: `terminal.list` describes currently laid-out
terminals, while workspace memory diagnostics account for retained hidden
state. The broader workspace lifecycle and ownership contract remains in the
[Workspace Compositor Specification](../specifications/workspace-compositor.md).

Workspace close has a separate control lifecycle and is not encoded as a
memory-report field. An idle target transitions directly to `Closed`; a live
target first returns `Pending` and arms a kill confirmation without tearing
down sessions. Repeating close for that same target returns `Closed` and tears
down its sessions. `Esc` or the explicit cancel path returns to the ordinary
state without closing. A pending arm is replaced when another workspace is
armed, and unknown workspace indices fail closed. These control-plane semantics
are present at `bitty` `1c68de25`, which includes merged #2183 (CTX-1269);
they remain experimental, `Implemented-only`, and pending independent
verification.

## Instance targeting and environment

Status: **candidate contract.**

Explicit target selection should be possible:

```sh
bitty ctl --instance <id> ...
bitty ctl --socket <path> ...
```

A shell launched inside Bitty may receive contextual variables such as:

```text
TERM=bitty
BITTY=1
BITTY_VERSION=0.3.0
BITTY_INSTANCE_ID=i:1
BITTY_TERMINAL_ID=t:4
BITTY_VIEW_ID=v:8
BITTY_SOCKET=...
```

Every name and value above is illustrative. Socket disclosure, inheritance,
remote sessions, nested terminals, spoofing, and permission checks need a
security specification before these variables become public protocol.

If no explicit target is supplied, current-terminal context may take
precedence, followed by an unambiguous focused/default instance. Ambiguity must
be reported rather than silently selecting an unrelated instance.

## Extension commands

Status: **accepted direction.**

Plugins must not pollute or override the core namespace. A collision-free route
qualified by plugin identity must remain available even if a short alias
conflicts. The exact command tokens for that route remain undecided.

Status: **candidate grammar example.**

```sh
bitty x example.markdown render README.md
```

Status: **candidate contract.**

```sh
# Optional manifest-derived short form.
bitty x markdown render README.md

# Optional top-level alias, if the product keeps this feature.
bitty markdown render README.md
```

Built-ins are reserved. Two plugins claiming the same alias create a diagnostic
and require the qualified ID or explicit user selection. In this candidate
grammar, the fully qualified route uses `bitty x`. There is no last-installed or
last-loaded winner.

Plugin help and completion are read from static manifest metadata without
loading the plugin VM. `bitty --help` should place optional aliases under an
`Extensions` section so users can distinguish core and third-party behavior.

Package lifecycle and external executable extensions are covered in
[Package management](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/package-management.md).

## Implemented slice: `bitty plugin` management

Status: **implemented-only, source-qualified** at `bitty`
`1c52ba7617e4c42d2fde06c5b318ebefc54aec3b` (PR #2212). The original
bundled-only v1 slice (`95c2b23`, #483, CTX-0150) rejected Git and local-path
sources; that is a historical observation, not the current source behavior.
This section does not claim a shipped 0.0.24 release, a stable CLI, complete
security acceptance, or implementation of the other candidate subtrees.

- Verbs: `bitty plugin list|install|remove|enable|disable|info|revoke`. `list` and
  `info` accept `--format table|json|jsonl` (default `table`) and `--no-color`.
- Class: management needs no running instance, IPC, or plugin VM, and loads or
  executes no package code. Store inspection and state changes are local/offline;
  Git acquisition uses the network and system `git`, while archive extraction
  uses system helpers. Installation is therefore not universally offline.
- Sources: `bitty plugin install <source> [--yes]` accepts a bundled ID, a
  local plugin directory, a local `.tar.gz`/`.tgz`/`.tar.zst`/`.zip` archive,
  or an allowlisted Git spelling: `https://<host>/<path>.git`,
  `git+https://<host>/<path>.git`, or `git@<host>:<path>`. Git checkout and
  archive extraction converge on the local-directory validation and consent
  pipeline. Unsupported schemes and malformed sources fail closed; this does
  not add a registry-install route. Source operands remain bounded to 256 bytes.
- Durable state: the bundled managed manifest lives at
  `$XDG_CONFIG_HOME/bitty/bitty-plugins.toml` (or beside an explicit
  `--config`), a strict bounded TOML subset; unknown keys, duplicates,
  malformed values, over-limit files, and unknown versions fail closed before
  any mutation. Store installs instead use
  `$XDG_DATA_HOME/bitty/plugins/current.json` and versioned package trees under
  `packages/<id>/<version>/`. The user's configuration `init.lua` is never
  rewritten by these management operations.
- Capability consent: new requested capabilities require explicit approval
  (`--yes` or an interactive `[y/N]` that fails closed on EOF). Store consent
  binds to the staged snapshot, including manifest hash and content digest;
  a capability increase blocks until approved, while unchanged or narrowed
  sets carry forward. Decline or EOF returns before committing the new package
  version or index, preserving the existing record and grants. Temporary staging
  and housekeeping may occur before consent.
- First activation: a fresh CLI local, Git, or archive install records the
  package **disabled**, even with `--yes` or no requested capabilities.
  `bitty plugin enable <id>` separately authorizes future discovery and
  activation; it updates desired state without executing the package. Startup
  discovery skips disabled store records before resolving their packages.
  Resolution and activation retain integrity, compatibility, safe-mode, and
  recorded-grant checks; enablement does not bypass them or promise immediate
  changes to an already-running generation.
- Updates and boundaries: store updates/reinstalls preserve the existing
  enabled or disabled state, including after approved capability changes.
  This CLI policy selects `LocalInstallOptions::staged_and_disabled()`; the
  public library default remains `enable = true, explicit_override = None`.
  Bundled install/enable behavior is unchanged: bundled `enable` re-checks the
  manifest pin and grant coverage. `revoke <id> [--cap <capability>]` operates
  on bundled managed records; store grants are reset by removal and reinstall.
  `remove` requires `--force`; bundled state mutation retains its `.bak`.
- Exit codes: `0` success (including idempotent no-op toggles), `1` declined
  consent, aborted prompt, filesystem or fetch-helper failure, `2` usage error,
  `4` plugin error (unknown ID, invalid or corrupt manifest, rejected source,
  hostile archive, pin mismatch,
  uncovered grant, blocked capability increase).
- Post-install guidance (implemented-only, `bitty` #2144, PR #2154): a
  successful `plugin install` or `plugin enable` prints the enable command,
  package location, per-plugin configuration path and declared setting
  defaults, manifest-provided next-step hints, and an `info` command pointer.
  The hints are bounded display-only text: they do not grant authority, run
  plugin code, or enter the grant-binding manifest hash. The same guidance is
  printed for bundled and local-source installs, with platform-neutral path
  rendering.
- Deliberate non-goals in this slice: no `bitty x` execution, no top-level
  aliases, no dynamic plugin namespace, and no plugin completion integration —
  those stay candidate contract above.

Evidence: the pinned
[CLI parser and acquisition paths](https://github.com/bitty-terminal/bitty/blob/1c52ba7617e4c42d2fde06c5b318ebefc54aec3b/crates/bitty-terminal/src/plugin.rs),
[package transactions](https://github.com/bitty-terminal/bitty/blob/1c52ba7617e4c42d2fde06c5b318ebefc54aec3b/crates/bitty-runtime/src/plugin_runtime/package.rs),
[discovery and activation](https://github.com/bitty-terminal/bitty/blob/1c52ba7617e4c42d2fde06c5b318ebefc54aec3b/crates/bitty-runtime/src/plugin_runtime/mod.rs),
and [CLI tests](https://github.com/bitty-terminal/bitty/blob/1c52ba7617e4c42d2fde06c5b318ebefc54aec3b/crates/bitty-terminal/tests/cli_plugin.rs)
support these source observations. Tests cover local fresh-disabled installs,
explicit enable followed by v1/v3 activation, preserved enabled/disabled update
state, and exact index/grant preservation on decline and EOF. They do not
establish successful Git transport, activation of the enabled v2 update, or an
instrumented zero-invocation proof. Archive tests cover installation but do not
assert the disabled bit; its policy follows the shared source tail. No new
product execution is implied by this documentation. For the review procedure,
see [Review Extension Source and Consent](../how-to/review-extension-source-and-consent.md).

### `bitty init` and startup presentation

Status: **implemented-only evidence** from `bitty` PR #2153 and PR #2157
(0.0.24); this does not make the broader CLI candidate contract stable.

Profile-backed `bitty init` from Core issue #2187 is implemented (CTX-1404):
a bare run writes `profiles/default.lua` plus a thin versioned `init.lua`
selector. `bitty init --profile NAME` writes only `profiles/NAME.lua` and
does not activate it; activation is the explicit
`bitty config profile use NAME` operation.

First-class preset seeds from Core issue #2371 are implemented (0.0.25):

- `bitty init --profile minimal` writes the smallest seed: one `theme` key
  (`dark`), with every other value left at the shipped default.
- `bitty init --profile dark` writes the ordinary generated defaults with the
  dark theme family (`dark` alias).
- `bitty init --profile light` writes the same generated defaults with the
  `github-light` preset.
- Presets are deterministic: they never prompt, need neither a TTY nor
  `--yes`, never read `$SHELL` or `BITTY_PROFILE`, and never activate the
  profile they write. Explicit value flags still apply to the seed.
- Any other valid name keeps the interactive wizard flow (or `--yes`
  generated defaults) and still never activates the profile.
- An existing target profile (preset or custom) is a conflict: the run exits
  2 and writes nothing without `--force`. With `--force`, previous bytes go
  to a collision-free `<file>.bak[.N]` sibling before the atomic replacement.

- The interactive TTY wizard uses single-keypress navigation for option
  pickers. Arrow keys and `j`/`k` move immediately, Enter selects the current
  entry, and the bounded escape-sequence reader preserves a lone Escape as
  cancel without treating a partial CSI/SS3 sequence as a separate answer.
  Non-TTY input keeps the line-oriented path.
- The ASCII mascot greeting, `--mascot`, and `--no-splash` were removed.
  Core `b99059bc` (PR #2197), present at `1c68de25`, also removes the splash
  code and first-run marker lifecycle. `bitty init` starts with the setup
  prompt and no mascot output; no splash-suppression option remains.
- `--profile NAME` combined with `--config`/`BITTY_CONFIG` is refused as
  ambiguous. `BITTY_PROFILE` is a one-launch input and never selects the init
  output target. Named-profile writes run no plugin, component, fetch, or
  shell-init follow-up.
- A legacy `init.lua` without the versioned selector envelope is never
  replaced implicitly, including with `--force`. `bitty init --migrate`
  copies complete legacy bytes to `profiles/default.lua`, validates the
  profile, compares effective values, then rewrites `init.lua` as the
  selector and keeps a recoverable backup.
- Generated files validate before mutation. New files use exclusive creation;
  replacements write and sync a sibling temporary file then rename over the
  target; backups use `<file>.bak[.N]` exclusive creation.
- The wizard still writes only the documented configuration surface and keeps
  its bounded-attempt and fail-closed behavior. These are implementation
  observations, not an acceptance of the candidate CLI grammar.

## Shipped slice: `bitty dev` build features

Status: **implemented build gating** (read-only from `bitty` `main`@`5670d9a`,
2026-10-02; `crates/bitty-terminal/Cargo.toml` `[features]`,
`crates/bitty-terminal/README.md`, and `CHANGELOG.md`). This section records
how the developer verbs are compiled; it does not accept the candidate `dev`
subtree, its output schemas, or its exit codes beyond what is listed here.

- `bitty dev capture|synthesize|dump|overlay` are compiled only with the
  non-default `dev-tools` cargo feature of `bitty-terminal`.
- `bitty dev trace startup|latency` is compiled only with the non-default
  `dev-perf` cargo feature, which also links the `bitty-perf` crate.
- Both features are off by default (`default = []`), so release and default
  builds carry neither surface.
- Without the feature, arguments are still validated (usage errors exit `2`);
  a valid request then fails with exit `1` and
  `bitty dev <verb>: built without dev-tools feature` or
  `bitty dev trace: built without dev-perf feature`, followed by a rebuild
  hint (`cargo build -p bitty-terminal --features dev-tools` or
  `--features dev-perf`). For the `dev-tools` verbs, `--format json|jsonl`
  returns an `ok:false` envelope.

## Introspection

Status: **candidate contract.**

Configuration, actions, commands, plugins, and protocols should be inspectable
instead of requiring source-code lookup. Candidate operations include:

```sh
bitty list fonts
bitty list themes
bitty list keymaps
bitty list actions
bitty list commands
bitty list plugins
bitty list protocols

bitty inspect command example.markdown:render
bitty inspect key ctrl+shift+m
bitty inspect plugin example.markdown
bitty inspect config font.size
bitty inspect protocol kitty-graphics
```

`inspect` is user-facing explanation of effective state. `dev` is lower-level
diagnostics such as VT/PTY/render/plugin traces, deterministic recordings and
replay, grid/scene/atlas dumps, performance capture, and renderer overlays.

## Configuration commands

Status: **candidate contract.**

```sh
bitty paths
bitty config path
bitty config check
bitty config show
bitty config show --source
bitty config defaults
bitty config diff
bitty config reload
bitty config profile list
bitty config profile show NAME
bitty config profile use NAME
bitty config profile path NAME
```

`config check` should evaluate configuration in a fresh configuration VM,
produce and validate a typed plan, and avoid creating a GUI. `config show`
should show effective values, while `--source` explains which layer and file
provided each value.

`config profile` is implemented (CTX-1404, issue #2187) as a local,
pre-runtime surface:

- `list` reads bounded directory metadata and evaluates no Lua.
- `show NAME` loads and validates the single-parent `extends` chain and
  prints profile-only values with source attribution.
- `use NAME` validates the name, chain, and prospective selector, then
  rewrites only the `profile = "..."` value in the existing selector,
  preserving comments and user overrides. It keeps a recoverable backup and
  never reloads a running instance or mutates plugin/component state.
- `path NAME` validates the name grammar and prints the resolved path without
  creating it or evaluating Lua.
- A legacy `init.lua` without the versioned selector envelope is refused;
  `bitty init --migrate` is the explicit conversion path.

Path and configuration architecture are documented in
[Lua and XDG configuration](../configuration/lua-and-xdg.md).

## Safe mode configuration precedence

Status: **implementation reference (experimental).** Documented from the merged
`bitty` behavior at `20519bc` (CTX-0346); the flag is `Implemented`
(experimental), not `Verified`.

`bitty --safe` selects the built-in safe effective configuration and reads no
external configuration layer at all. The flag is an unconditional override:
it never consults user files, profiles, the environment, or CLI appearance
overrides, so a hostile, invalid, or missing user configuration cannot abort
or influence safe startup or validation.

| Layer or input                                                                    | Normal startup                      | `bitty --safe`                  |
| --------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| Built-in Core defaults                                                            | Base layer                          | Wins for every attributed field |
| System / distribution defaults                                                    | Applied under the user layers       | Ignored                         |
| Profile (`--profile` / `BITTY_PROFILE`)                                           | Under the user file                 | Ignored                         |
| User file (XDG probe, `--config`, `BITTY_CONFIG`)                                 | Overrides profile and Core defaults | Ignored                         |
| CLI appearance overrides (`--theme`, `--font-family`, `--font-size`, `--opacity`) | Highest precedence                  | Ignored                         |

Normal startup resolves by declared precedence, never load order:

```text
CLI appearance > user file > profile > Core defaults
```

Under `--safe` the effective configuration is fixed:

- every schema field is attributed to Core defaults, with no conflicts and no
  policy violations;
- decoration geometry is forced to `gaps_in = 0`, `gaps_out = 0`, `border = 1`,
  `radius = 0`, `content_inset = 0` (`0/0/1/0/0`);
- the focused/idle outline pair is forced to the opaque built-ins `#FFFFFF`
  (focused) and `#808080` (idle).

Startup, `bitty config check`, and `bitty doctor` share this load path, so the
same safe-mode precedence applies to all three. Non-safe behavior is unchanged.

Implementation note: `bitty-app::config_cli::load_merged_config` returns
`bitty_config::safe_merged()` when `--safe` is set. The contrast obligations for
the safe outline pair are AC-1..AC-3 in
[RFC-0001](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md); the safe
decoration invariant is rule 5 of the
[Workspace Compositor Specification](../specifications/workspace-compositor.md);
the layer model is owned by the
[Configuration Model RFC](../specifications/configuration-model-rfc.md) and the
[Lua and XDG configuration](../configuration/lua-and-xdg.md) reference.

## Test mode

Status: **implementation reference (experimental).** Documented from the merged
`bitty` behavior at `92cd709` (CTX-0506, PR #831); the flag is `Implemented`
(experimental), not `Verified`.

`bitty --test-mode` runs a deterministic headless E2E servo: the real runtime
plus the `BITTY_SOCKET` IPC surface without a display, GPU, winit event loop, or
VM, so native tests can drive panels and assert state over the `bitty.debug/*`
protocol. The flag is argv-only — it has no environment-variable, configuration,
or profile equivalent — and it takes precedence over `--headless`. The test
surface itself is documented as the test-mode E2E amendment in the
[DevTools RFC](../specifications/devtools-rfc.md#test-mode-e2e-surface-implemented-only-amendment-a3).

Loop and exit behavior:

- the loop runs at a fixed 16 ms tick (~60 Hz): it pumps the PTY, drains the
  control queue, ticks the runtime, and publishes the inspect snapshot;
- it exits `0` only after the elevated `bitty.debug/testExit` wire verb applies;
  there is no CLI verb for `testExit`, so a harness sends the raw method and
  needs `BITTY_CTL_ELEVATE=debug.control`;
- it is fail-closed: when the IPC socket cannot serve, the process reports the
  failure on stderr and exits `1` instead of running a harness against no
  surface. Normal startup keeps its documented fail-soft IPC behavior.

Bounds: test mode grants no new scope, issues no automation bearer, changes no
rate, redaction, or payload bound, and opens no transport beyond the
current-user `0600` Unix socket with its accepted endpoint and peer checks
(Unix-only; no TCP listener). The control queue and reply bounds stay in force.

## Output contract

Status: **candidate contract.**

All query-like commands should support a consistent machine-readable format.
Standard output contains the requested result; standard error contains
diagnostics and logs. Informational logging must never corrupt JSON or JSONL on
standard output.

Status: **candidate formats.**

```text
--format table
--format json
--format jsonl
```

Schemas need versioning and stability rules. Human table output is not a
machine contract.

Status: **candidate exit codes.**

| Code | Meaning                 |
| ---- | ----------------------- |
| 0    | success                 |
| 1    | generic error           |
| 2    | CLI usage error         |
| 3    | configuration error     |
| 4    | plugin error            |
| 5    | compatibility error     |
| 6    | IPC/runtime unavailable |
| 7    | permission denied       |
| 8    | conflict                |

These codes are placeholders until error taxonomy is designed across local,
runtime, and plugin operations.

## Doctor and completion

Status: **candidate contract.**

`bitty doctor` should be a stable recovery and diagnostics entry point covering
platform, GPU, fonts, PTY/ConPTY, terminfo, shell integration, configuration,
plugins, dependency and key conflicts, renderer state, and supported image
protocols. It should offer structured output for automation.

Shell completion should target Bash, Zsh, Fish, PowerShell, and Nushell. Dynamic
plugin completion comes from static package manifests and should update when
the installed plugin set changes, without starting every plugin runtime.

## Shipped slice: `bitty shell-init` shell integration

Status: **implemented local-class slice** (read-only from `bitty`
`origin/main`, CTX-1054, `bitty` #1813, merged as `c9392355` via PR #1852,
verified read-only via `merge-base --is-ancestor`). This section records the
implemented shell-integration subtree; it does not accept the rest of the
candidate tree or its other subtrees.

- Shape: `bitty shell-init <shell>`, where `<shell>` is one of
  `bash|zsh|fish|powershell|nushell` (case-insensitive and trimmed; `pwsh`
  accepted for PowerShell, `nu` for Nushell). The shell table is shared with
  `bitty completion`, so the two commands never disagree on names. The script
  prints to stdout, exit `0`.
- Class: local only — no instance, no config load, no plugin VM, safe-mode
  clean. Each script is static: per-shell prompt hooks (OSC 7 cwd report plus
  OSC 133 prompt-start `A` and command-done-with-status `D` marks,
  observation only) followed by one eval line wiring the matching
  `bitty completion <shell>` output, so Tab completion works after init.
  Nushell instead inlines the completion definitions, because Nushell parses
  `source` paths before `save -f` runs and a save-then-source roundtrip of a
  just-written file cannot load.
- Wiring is opt-in eval; the command never edits rc files:
  - bash: `eval "$(bitty shell-init bash)"` in `~/.bashrc`;
  - zsh: `eval "$(bitty shell-init zsh)"` in `~/.zshrc` (after compinit, so
    `compdef` can register Tab completion);
  - fish: `bitty shell-init fish | source` in `config.fish`;
  - powershell: `bitty shell-init powershell | Out-String | Invoke-Expression`
    in `$PROFILE`;
  - nushell: `bitty shell-init nushell | save -f
~/.config/nushell/bitty-shell-init.nu`, then `source` that file from
    `config.nu` (see the script header).
- Verified behaviors: the bash hook is prepended to `PROMPT_COMMAND` so it runs
  first and captures the previous command's status (string- and array-valued
  `PROMPT_COMMAND` are both preserved); zsh registers `compdef _bitty bitty`
  without auto-compinit; PowerShell prefers the native exit code (`$LASTEXITCODE`)
  and chains the previous `prompt`; double-sourcing is idempotent in all five
  shells via a per-shell guard variable.
- `bitty init` prints the shell-init hint on success, so a fresh shell gets
  working Tab completion plus cwd/status prompt marks after init.
- Flags: `--format` and `--no-color` are accepted and ignored (shell-init
  emits a script, never the output envelope and never color);
  `--socket`/`--instance` fail closed (exit `2`): they select a runtime target
  this command never uses. Missing/unknown shell, extra positionals, unknown
  flags, and stray `--` fail closed (exit `2`, stderr only, no stdout
  script).
- Exit codes: `0` success; `2` usage error.
- Deliberate non-goals in this slice: no rc-file auto-editing; no `bitty x`
  execution or plugin completion integration. Deferred (do not treat as
  available): OSC 7 percent-encoding of cwd paths (`bitty` #1855),
  session-local Nushell double-source guard (`bitty` #1856), B/C span zones,
  and per-float styling.

## Deferred candidates

An interactive `bitty shell` could expose the registry as a remote-control
REPL. This is useful for diagnostics and scripting but is not an initial
contract.

Renderer overlays such as damage, cells, glyphs, images, and layout are useful
development frontends. They depend on renderer architecture and are likewise
deferred.

## Open questions

- What is the minimum stable top-level command set for the first usable build?
- Do actions and commands need different registries or just different metadata?
- What is the versioned command argument/result schema?
- How does IPC authenticate local clients, agents, and nested or remote shells?
- Which environment variables are safe and portable enough to standardize?
- Should optional top-level plugin aliases exist at all?
- How are output schema versions negotiated?
- Which exit codes can be made stable across platform-specific failures?
- How does instance selection behave with several graphical sessions and no
  current-terminal context?
- Which `inspect` and `doctor` operations must work in safe mode?
