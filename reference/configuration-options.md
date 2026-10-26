---
title: Configuration options reference
description: Complete user-facing configuration inventory for the pre-0.0.21 config surface with types defaults ranges reload behavior and gaps
category: reference
audience: user
document_type: reference
status: draft
website_publish: true
sidebar_order: 30
---

# Configuration options reference

## Status and provenance

- Status: **draft**. This page is a lookup reference, not a stability
  promise. Core2192 plugin-settings rows and Core PR #2198 diagnostics below
  are implemented-only evidence from merged Core
  `1c68de2545c961790d0a2011340e4a3c04564ab7`; unrelated rows retain their own implementation,
  candidate, or gap status.
- Ownership: `bitty-terminal-docs` **CTX-0059** renders this inventory; the
  `bitty` repository owns the schemas, defaults, validation, and tests it
  mirrors. When code and this page disagree, the code wins and this page
  needs a fix.
- The text-stack rows (`font.features`, `font.disable_ligatures`, and
  `BITTY_TEXT_STACK`) cite unmerged `bitty` PR
  [#2732](https://github.com/bitty-terminal/bitty/pull/2732) at `c87f1307`
  (2026-10-27, CTX-1607); they are implemented-only until that PR merges.
- Extraction method: `EffectiveConfig` and per-section structs in
  `bitty-config/src/types.rs`, chord/action grammar in
  `bitty-config/src/keymap.rs`, discovery bounds in
  `bitty-config/src/wheel.rs`, the Lua admission surface in
  `bitty-lua/src/config.rs`, CLI parsing in `bitty-app/src/cli.rs`, and the
  manifest reader in `bitty-runtime/src/plugin_runtime/manifest_toml.rs`
  plus `bitty-plugin-host/src/manifest.rs` and
  `bitty-plugin-host/src/capability.rs`.
- Machine-readable companion:
  [configuration-inventory.json](configuration-inventory.json) carries the
  same rows with per-option `since`, `status`, and `source` fields for
  website import. The JSON is data, not prose: it has no frontmatter and is
  regenerated from code, never hand-edited for new options.
- Honesty rule: `since` is uniformly **pre-0.0.21 (implemented-only)**.
  Nothing below has shipped as a stable contract in any release, and rows
  marked **gap** name behavior the code does not own yet instead of
  inventing it.

## Purpose and scope

This reference inventories configuration inputs, validation bounds, precedence,
and reload behavior. The plugin settings section records merged implementation
evidence relevant to 0.0.24; it does not introduce a schema or policy change.

## How to read the tables

| Column      | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Key path    | Lua table path in `init.lua` (or CLI flag / env var / manifest key for those surfaces).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Type        | Admitted Lua/CLI/TOML shape. Integers are exact (floats rejected); strings are case rules as noted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Default     | Effective value when no layer declares the key. `unset` means the merge inherits a lower layer or a built-in fallback named in the row.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Valid range | Accepted values. Anything else is rejected, never clamped or silently ignored.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Fail-closed | What rejection does: `ignore element` (startup drops only the invalid top-level table or scalar, re-validates the rest, reports the file path, field path, and error, and keeps every other valid element and layer), `reject reload` (live reload keeps the previous plan and never adopts the invalid content), `exit 2` (CLI usage error), or `deny` (capability absent means denied). Whole-layer failures that cannot be narrowed to one element (Lua syntax/runtime faults, budget exhaustion, undeclared keys, profile `extends` failures) drop the entire external layer at startup with the same diagnostic contract; see [Startup salvage and strict diagnostics](#startup-salvage-and-strict-diagnostics). |
| Reload      | `live` (applied by diff-and-reconcile), `restart` (accepted, effective after next start), or `n/a` (not a reloadable setting).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Global rules behind every row: unknown keys fail closed as undeclared
fields; out-of-range values fail closed with a source-attributed
diagnostic. Startup is fail-soft for present external configuration: it
ignores only the invalid element (or the whole layer when the failure cannot
be narrowed) and never silently uses a default. `bitty config check` and
`bitty doctor` stay strict and report the same input as a non-zero failure.
Core2192 plugin settings are evaluated in a restricted plain-data Lua
VM with no host callbacks, file I/O, process execution, network access, or
`require`; ordinary Core configuration keeps its separate Lua admission
surface. File bounds for ordinary Core configuration remain at most 64 KiB /
2048 lines / 4096 bytes per line, at most 64 top-level keys and 32 keys per
nested table, with strings at most 2048 bytes.

## Locations and precedence

The user file is `$XDG_CONFIG_HOME/bitty/init.lua` (fallback
`~/.config/bitty/`; a sibling `config.lua` is accepted only when
`init.lua` is absent). `BITTY_CONFIG` overrides the file path and
`BITTY_PROFILE` overrides the profile name; `--config` / `--profile` win
over both.

### Named profiles

Named profiles live at `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` — or the
sibling `profiles/` directory of an explicit `--config` / `BITTY_CONFIG` file
— and compose through a single-parent `extends` chain with cycle detection.
`bitty config profile` manages them with `create`, `clone`, `rename`,
`delete`, `list`, `show`, `use`, `get`, `set`, and `path`; `use` rewrites only
the persisted `profile = "…"` selector value, and `get`/`set` address the
documented dotted scalar paths. Before editing a leaf of an inherited
complete table, `set` pins the whole resolved table into the profile, so a
parent's later edits no longer reach that table. The verbs, refusals,
atomic-write contract, and accepted paths are in
[Profile management commands](../configuration/lua-and-xdg.md#profile-management-commands);
the table rule is in
[Table completeness](../configuration/lua-and-xdg.md#table-completeness).

Merge precedence, low to high: `CoreDefaults (0)` < `SystemDefaults (10)`
< `SystemPolicy (20, non-overridable)` < `Distribution (30)` <
`Profile (40)` < `User (50)` < `TrustedLocal (60, project-scoped,
hash-bound consent)` < `Cli (70)`. Scalars replace. A declared table is
complete: omitted leaves take the built-in default, not the inherited value,
except the optional leaves listed in the table-completeness rule. Keymaps
merge by `context + chord` identity, plugins merge by `id`. `bitty --safe`
ignores every external layer and forces the safe effective config (decoration
`0/0/1/0/0`, opaque outline pair, animations `0` ms, `views` dropped).

## Startup salvage and strict diagnostics

Startup is fail-soft for a present but invalid external configuration. When a
top-level table or scalar fails validation, the loader drops only that element
from that layer, re-validates the remaining plan, and prints one bounded
stderr diagnostic per ignored element naming the file path, the field path,
the error, and `ignored; using defaults and remaining layers`. Valid tables
from the same file and every other layer stay in effect. Bitty never rewrites,
comments, or otherwise mutates `~/.config/bitty/...` automatically.

Failures that cannot be narrowed to one top-level element drop the whole
external layer with the same diagnostic contract, and startup continues on the
remaining layers. This covers Lua syntax or runtime faults, Lua budget
exhaustion, undeclared keys, unreadable files, profile `extends` cycles, and
missing parent profiles. A missing explicit `--config` / `BITTY_CONFIG` path,
a missing explicit `--profile` / `BITTY_PROFILE` name, CLI usage errors, and
internal defects stay fatal (exit 2). A persisted selector that no longer
resolves is external configuration: startup ignores it with a diagnostic and
does not rewrite the selector; the next launch retries. The miss loads no
profile layer, so nothing was resurrected and no other surface is denied.

Salvage never escalates a capability or trust value. When a security-sensitive
element is ignored — or when any whole external layer is dropped, because the
vanished layer might have restricted it — a deny overlay runs after the normal
merge and before validation/installation:

- `plugins`: deny-all. No configured plugin is enabled. The config layer has
  no runtime activation consumer, so this is a configuration-level deny and
  does not claim a plugin process was stopped.
- `history`: transcript and command capture stay off.
- `mouse`: middle and right button bindings resolve to `none`.
- `decoration`: the background-image root allowlist is empty and every
  configured image is cleared — `decoration.background_image`,
  `window.background_image`, and every per-view `background_image`. The
  runtime therefore loads no image and cannot reject the config for a path
  outside the denied roots.

Lower layers cannot re-enable a denied element for that launch. Every other
setting from the same file and from the remaining layers stays effective.
`keymaps` grants no capability and falls back to the shipped defaults when
dropped; because the keymap model has no unbind action, a `command:` binding
declared by a lower-precedence layer can still appear. A present invalid value
is never turned into a more permissive one.

Diagnostics are bounded to at most eight lines (the deny-overlay summary has a
reserved slot, evicting the last element line if needed) plus one suppression
line when more were dropped. `bitty config check` reports the full list. Diagnostics carry paths, field names, and
bounded validation messages only. They never include file contents or
unrelated file data; validation messages may quote the offending value.

`bitty config check` and `bitty doctor` remain strict: they reject the same
input with a non-zero exit and the exact first field error, without salvage.
Live reload is strict as well: an invalid edit reports `load-error` and keeps
the last-good effective configuration instead of dropping to defaults.
`--fail-loud` shell and pane startup semantics are unchanged.

## Per-plugin user files (`plugins/<owner>.<name>.lua`)

Core2192 adds an optional restricted Lua settings file beside the Lua layers.
One canonical file per plugin is at
`<config-dir>/plugins/<owner>.<name>.lua`, where `<config-dir>` is the
environment-derived configuration directory (XDG/APPDATA/HOME, never
hardcoded) and each id segment is at most 64 bytes. The file must return a
plain table containing only booleans, integers, strings, and string arrays.
The settings VM has no host, I/O, process, network, or `require` authority.

The short-name compatibility alias `<config-dir>/plugins/<name>.lua` is used
only when complete discovery proves that exactly one plugin owns `<name>`.
Ambiguous aliases, disabled installed claimants, invalid candidates, and
incomplete discovery fail closed. The canonical file wins over the alias.

The file layer is selected in this order: canonical Lua, then the unique short
alias, then legacy TOML. Only the first existing file is read; a present but
invalid Lua file does not fall through to the alias or TOML.

The Lua loader sets `PlainConfigLimits.source_bytes` to 16 KiB and uses the
remaining plain-data limits below. The generic evaluator's source default is
64 KiB; it does not override this narrower plugin settings loader cap.

| Lua bound               | Value                                           | Fail-closed                                        |
| ----------------------- | ----------------------------------------------- | -------------------------------------------------- |
| RC-1 execution          | 10,000,000 instructions / 50 ms wall time       | rejected file uses lower layers                    |
| RC-2 memory             | 32 MiB accounted VM heap                        | rejected file uses lower layers                    |
| Source bytes            | at most 16 KiB                                  | rejected file uses lower layers                    |
| Extraction depth        | at most 16                                      | rejected file uses lower layers                    |
| Entries per table       | at most 64                                      | rejected file uses lower layers                    |
| Values in returned tree | at most 256                                     | rejected file uses lower layers                    |
| Bytes per string        | at most 2,048                                   | rejected file uses lower layers                    |
| Aggregate output        | at most 16 KiB, including structural overhead   | rejected file uses lower layers                    |
| Manifest declarations   | at most 32 keys; names at most 64 bytes         | invalid manifest rejected                          |
| Type agreement          | strict, no coercion; undeclared keys unreadable | lower layer for that key / `E_SETTINGS_UNDECLARED` |

Precedence per declared key: shipped default < shared host source < selected
user file. A wrong-typed value fails to the lower layer for that key; a
malformed or rejected Lua file falls back wholesale and never aborts startup.
If neither a canonical nor an eligible alias Lua file is selected, legacy
`<owner>.<name>.toml` is used as a compatibility fallback with the same strict
declaration and type rules, but its own parser bounds:

| Legacy TOML fallback bound            | Value                                                  | Fail-closed                     |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| Source bytes / lines / bytes per line | at most 16 KiB / 512 lines / 1,024 bytes               | rejected file uses lower layers |
| Keys per file                         | at most 64; duplicates rejected                        | rejected file uses lower layers |
| String values                         | at most 512 bytes, no NUL                              | lower layer for that key        |
| String arrays                         | at most 32 items, each at most 128 bytes, strings only | lower layer for that key        |

The selected file is read when the plugin activates, and its resolved
declared-key map is pinned to that generation. Editing it does not hot-reload
the plugin or its settings; the new values apply on the next activation of
that plugin (for example a process restart). `bitty ctl config reload` and the
automatic `init.lua` file poll do not reread per-plugin settings files.

### Inspecting and scaffolding settings

Status: **implemented-only** (Core PR
[#2299](https://github.com/bitty-terminal/bitty/pull/2299)). The CLI never
creates or runs the plugin VM.

`bitty plugin config show <id>` prints the declared `[settings]` schema (key,
type, shipped default, and the description field when a schema carries one),
the canonical Lua, short-alias, and legacy TOML candidate paths with
present/absent state, which file the resolver selected, and every effective
value with the layer that served it (`manifest-default`, `host`, or
`user-file`). The selected file is evaluated by the bounded plain settings VM
described above, exactly as activation evaluates it. The report is available
as a versioned JSON envelope with `--format json` or `--json`.

`bitty plugin config scaffold <id>` writes a commented template to the
canonical `<config-dir>/plugins/<owner>.<name>.lua` path using only the
manifest's declared keys and shipped defaults; no values are invented and no
Lua file is executed to produce it. `--init` is an alias for `scaffold`. The
command refuses an existing file without `--force`, always refuses a symlinked
target or symlinked `plugins/` directory, writes only inside the
environment-derived config root, and commits atomically with an owner-only
file mode.

A successful `bitty plugin install` and the first `bitty plugin enable`
auto-generate the same canonical path when the plugin declares at least one
setting. The generated file is **commented** (every declared key and its
shipped default is a comment, and the returned table is empty), so the
manifest defaults remain in effect until the user uncomments a line. Creation
happens only when the canonical file, its eligible short alias, and the legacy
`<owner>.<name>.toml` are all absent; an existing file or user edit is never
overwritten, and `scaffold --force` is the explicit replacement path. A
plugin with no declared settings gets no file. The write uses a 0600
temp-file plus no-clobber commit, refuses symlinks and special files, and is
best-effort after a successful install (a read-only config root produces a
diagnostic, never a failed install). `bitty plugin info <id>` prints the
canonical path and whether it exists.

Inspection fails closed with a non-zero exit after printing the report when the
selected file is rejected, or when it carries keys the manifest does not
declare or values whose type disagrees. Unknown plugin ids, unreadable stored
schemas, an existing scaffold target without `--force`, unsafe paths, and
symlinked targets are typed errors, never partial writes.

The machine-managed ledger is `<config-dir>/bitty-plugins.lua` and stays
machine-only. It is data-only Lua, parsed without a Lua VM or host access, and
contains one record per managed plugin (`source`, `manifest_hash`, `enabled`,
`granted`, `denied`). Unknown fields, duplicate keys or capability items,
non-UTF-8 input, and over-limit files fail closed. Authority stays
manifest-bound: a grant is honoured only when the installed manifest declares
that capability for the recorded `manifest_hash`; undeclared grants are
dropped with a diagnostic. Text-editing the ledger can never widen authority.

A pre-Lua `bitty-plugins.toml` ledger is read once for migration and is never
rewritten: the Lua ledger is written atomically (0600 temp, no-clobber commit)
and the previous TOML bytes are retained at `bitty-plugins.toml.bak`.
Migration preserves `source`, `manifest_hash`, `enabled`, `granted`, and
`denied`, never overwrites an existing Lua ledger, and refuses symlinked or
special files. `bitty plugin doctor` reports the ledger state and
`--repair` retains an obsolete legacy file as a backup.

Core PR
[#2198](https://github.com/bitty-terminal/bitty/pull/2198) diagnostics for alias
ambiguity, canonical-over-alias shadowing, dropped entries, and rejected files
are **implemented-only** at merged Core
`1c68de2545c961790d0a2011340e4a3c04564ab7`. The host retains them per plugin
generation and the terminal logs them at startup. They are host-internal,
not Lua-visible or independently Verified; no stable public diagnostics
contract is claimed.

Source evidence at that revision:
[settings loader](https://github.com/bitty-terminal/bitty/blob/1c68de2545c961790d0a2011340e4a3c04564ab7/crates/bitty-runtime/src/plugin_runtime/plugin_settings.rs),
[plain-data limits](https://github.com/bitty-terminal/bitty/blob/1c68de2545c961790d0a2011340e4a3c04564ab7/crates/bitty-lua/src/plain_config.rs),
[RC-1/RC-2 constants](https://github.com/bitty-terminal/bitty/blob/1c68de2545c961790d0a2011340e4a3c04564ab7/crates/bitty-lua/src/lib.rs),
and [TOML parser](https://github.com/bitty-terminal/bitty/blob/1c68de2545c961790d0a2011340e4a3c04564ab7/crates/bitty-config/src/plugin_file.rs).

## Execution budget tightening (manifest `[limits]` and `plugin-budgets.lua`)

Status: **implemented-only** (bitty#2304). This surface can only tighten the
compiled RC-1/RC-2 ceilings; it can never raise them.

Two optional layers are upper bounds on the host defaults:

1. `bitty-plugin.toml` `[limits]`: `fuel_instructions`, `wall_ms`,
   `memory_bytes`, `warning_ms` (all optional). Values validate in
   `1..=ceiling`; zero, a negative or non-integer value, an above-ceiling
   value, and a `warning_ms` that is not below `wall_ms` fail manifest
   validation with the manifest field path.
2. `<config-dir>/plugin-budgets.lua`: a data-only Lua return table with an
   optional global `default` table and optional per-plugin `plugins` entries
   keyed by validated plugin id. It is parsed without a Lua VM or host access
   (16 KiB, 256 lines, 512 bytes per line, 256 plugin entries, UTF-8 only,
   duplicate/unknown keys and non-integer values fail closed). Symlinks and
   special files are refused.

| Dimension           | Host ceiling | Scope                       |
| :------------------ | :----------- | :-------------------------- |
| `fuel_instructions` | 10,000,000   | per VM, RC-1                |
| `wall_ms`           | 50           | per callback, RC-1          |
| `memory_bytes`      | 33,554,432   | per VM accounted heap, RC-2 |
| `warning_ms`        | 8            | advisory, never suspends    |

Effective value per dimension is the minimum of the host ceiling, the
manifest declaration, the user global default, and the user per-plugin
override. A later layer that declares a larger number is inert, never a
widening. When the effective `wall_ms` is below the advisory threshold, the
effective `warning_ms` is capped at `wall_ms - 1`.

Failure posture: a rejected `plugin-budgets.lua` is not silently ignored —
plugin activation fails closed with a typed budget error, and
`bitty plugin config show <id>` prints the effective rows and exits non-zero.
`bitty --safe` ignores the manifest declaration and the user file and runs the
host defaults, so the recovery path cannot be blocked by a bad local file.
The file is read at startup; live generations keep their activation-time
budgets. `bitty plugin config show <id>` reports each dimension's host
ceiling, manifest value, user layers, effective value, and source layer.

## Core options (`init.lua` top level and tables)

### `font`

| Key path                 | Type   | Default                   | Valid range                                                                                                                                                                | Fail-closed                    | Reload  |
| ------------------------ | ------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------- |
| `font.family`            | string | `JetBrainsMono Nerd Font` | trimmed non-empty, at most 128 bytes                                                                                                                                       | ignore element / reject reload | live    |
| `font.size`              | float  | `12.0`                    | finite, `(0, 128]`                                                                                                                                                         | ignore element / reject reload | live    |
| `font.line_height`       | float  | `1.375`                   | finite, `[1.0, 2.0]`                                                                                                                                                       | ignore element / reject reload | live    |
| `font.letter_spacing`    | float  | `2.0`                     | finite, `[0.0, 8.0]`                                                                                                                                                       | ignore element / reject reload | live    |
| `font.features`          | list   | empty                     | at most 32 entries; each entry is `TAG`, `TAG=<u32>`, `TAG on`, `TAG off`, `+TAG`, or `-TAG`; `TAG` is exactly 4 ASCII alphanumeric characters; at most 16 bytes per entry | ignore element / reject reload | restart |
| `font.disable_ligatures` | string | `never`                   | `never`, `cursor`, or `always`                                                                                                                                             | ignore element / reject reload | restart |

#### Text stack and fallback

`BITTY_TEXT_STACK` is a startup-only environment switch for the text stack,
not an `init.lua` key and not live-reloadable. `auto` (default) and `shaped`
resolve the `harfrust`/`swash`/`fontdb` stack first, then `crossfont`, then the
deterministic headless rasterizer; `classic` forces `crossfont`. An unknown
value is ignored with a startup warning and resolves to `auto`.

`font.features` and `font.disable_ligatures` only apply while the shaped stack
is active. The `crossfont` fallback keeps grid geometry and per-cell painting
but has no shaping stage, so programming ligatures and OpenType feature
overrides do not apply there. The resolved stack and any fallback reason are
visible in startup logs, the verbose tick line, and `bitty doctor`'s
`text-stack` row (`Runtime::text_stack` / `Runtime::text_stack_note`).

### `window`

| Key path                     | Type    | Default  | Valid range                                                                                                                                        | Fail-closed                    | Reload |
| ---------------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| `window.opacity`             | float   | `1.0`    | finite, `[0.0, 1.0]`                                                                                                                               | ignore element / reject reload | live   |
| `window.padding`             | integer | `8`      | `[0, 64]` logical px                                                                                                                               | ignore element / reject reload | live   |
| `window.radius_px`           | integer | `0`      | `[0, 24]` physical px (parsed no-op in S0: zero render effect)                                                                                     | ignore element / reject reload | live   |
| `window.blur_radius`         | integer | `0`      | only `0`; non-zero rejects with `window.blur_radius` (OQ-038 has no accepted blur design)                                                          | ignore element / reject reload | live   |
| `window.background_image`    | string  | unset    | absolute or `~`-anchored, non-empty, at most 4096 bytes, no NUL; root trust, format, and decode belong to the loader                               | ignore element / reject reload | live   |
| `window.background_fit`      | string  | `fill`   | `fill` \| `fit` \| `center` \| `tile` \| `stretch` (exact, case-sensitive)                                                                         | ignore element / reject reload | live   |
| `window.background_opacity`  | float   | `1.0`    | finite, `[0.0, 1.0]`; image-alpha dim only                                                                                                         | ignore element / reject reload | live   |
| `window.background_position` | string  | `center` | `center` \| `top-left` \| `top` \| `top-right` \| `left` \| `right` \| `bottom-left` \| `bottom` \| `bottom-right`; only `fit`/`center` observe it | ignore element / reject reload | live   |

#### Window background fit and opacity

`window.background_image` paints behind the grid over the **whole live
surface**, including `window.padding`. The window tier uses the live surface
as its destination frame: it is stable across splits and pane moves, and is
re-derived on every window resize and DPI change. The per-view tier
(`decoration.background_image` and `views.<selector>.background_image`) uses
that leaf's content frame instead, so it re-fits on a split, divider move,
pane move, and window resize. The default `fill` is uniform cover: aspect
ratio is preserved, both axes are covered, and the overflow is cropped evenly
from the center, so there are no edge gaps and no distortion. `fit` is uniform
contain (full image, letterboxed, position honored); `center` and `tile` keep
native pixels scaled by the DPI factor; `stretch` scales non-uniformly onto
the whole surface.

`window.background_opacity` multiplies the image alpha when the image is
blended over the theme background. `window.opacity` then scales the finished
premultiplied window once for the compositor. The order is fixed, the knobs are
independent, and a single value is never applied twice to the same layer.

`window.opacity` and `window.padding` are optional individually: a `window`
table that declares only one of them defaults the other (`opacity` to `1.0`,
`padding` to `8`), the same way the other optional `window` leaves default.
Present values keep their type and range checks.

`window.blur_radius` is schema-present for a future platform-blur contract, but
OQ-038 is unresolved: the shipped loader accepts only `0` and rejects a
non-zero value at validation with a typed `window.blur_radius` diagnostic.

### `terminal`

| Key path                           | Type    | Default                                                | Valid range                                                          | Fail-closed                    | Reload  |
| ---------------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------ | ------- |
| `terminal.scrollback`              | integer | `10000`                                                | `[0, 100000]` lines                                                  | ignore element / reject reload | restart |
| `terminal.shell`                   | string  | unset (chain: `terminal.shell` > `$SHELL` > `/bin/sh`) | trimmed non-empty, at most 1024 bytes, no NUL, no control characters | ignore element / reject reload | restart |
| `terminal.scroll_lines_per_notch`  | integer | `3`                                                    | `[1, 32]`                                                            | ignore element / reject reload | restart |
| `terminal.scroll_pixels_per_notch` | integer | `16`                                                   | `[1, 256]`                                                           | ignore element / reject reload | restart |

### `selection`, `close_confirm`, `layout`, `workspace`

| Key path              | Type    | Default                                                     | Valid range                                                                                                                                                      | Fail-closed                    | Reload  |
| --------------------- | ------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------- |
| `selection.auto_copy` | boolean | `false`                                                     | `true` \| `false`                                                                                                                                                | ignore element / reject reload | restart |
| `close_confirm`       | string  | `when_busy`                                                 | `always` \| `when_busy` \| `never` (exact lowercase)                                                                                                             | ignore element / reject reload | restart |
| `layout.gaps_in`      | integer | `0`                                                         | `[0, 16]` cells                                                                                                                                                  | ignore element / reject reload | restart |
| `layout.gaps_out`     | integer | `0`                                                         | `[0, 16]` cells                                                                                                                                                  | ignore element / reject reload | restart |
| `layout.resize_step`  | float   | `0.05`                                                      | finite, `[0.01, 0.20]` split-ratio delta per `resize_split` keypress (CTX-0963, `bitty` #1697; out-of-range, NaN, and infinite rejected, never clamped)          | ignore element / reject reload | live    |
| `workspace.layout`    | string  | unset (current tree preserved via the built-in no-op tiler) | well-formed provider name (bare `dwindle`, `spiral`, `master`, `grid` or qualified `owner.name:algorithm`); membership enforced at apply by the runtime registry | ignore element / reject reload | restart |

`close_confirm` must not be declared by project layers: a
repository-local file must not disable a data-loss guard.

#### Adaptive new-panel policy (runtime-only)

`workspace.layout` selects a layout-provider name; it is not the adaptive
new-panel placement policy. `Mod+N` / `new_panel` uses the Core
`PanelLayoutMode`, whose shipped default is `Spiral` (0.0.28, `bitty`
issue #2571): the fresh pane rotates clockwise (Right -> Down -> Left -> Up)
around the focused pane, continuing only while the pane created by the
previous split still holds focus, and the chain restarts at Right on any
other focus or close. `Balanced` keeps the 0.0.27 bisect-largest policy
(split the physically largest slot along the cell-aspect-aware axis and
place the fresh pane after it, right or below) as an explicit opt-in since
0.0.28; `Dwindle` always splits the focused pane right/down, and
`BisectLargest` bisects the largest panel on the raw axis. The mode is
exposed through `Runtime::panel_layout_mode` / `set_panel_layout_mode`; the
shipped release has no TOML or Lua selector for it, and a user
configuration cannot choose `Balanced`, `Spiral`, or any other mode.
Explicit `new_split:<dir>` always splits the focused pane on the requested
axis.

Adaptive insertion is bounded by a gap-aware minimum pane of 10 columns by 4
rows. A target is refused, with a warning and no layout change, when
`(dimension - inner gap) / 2` is below the bound on both axes. At the default
inner gap of 0 cells a 20-column pane splits into two 10-column children. At a
1-cell gap the same pane cannot split horizontally (9-column children) and
falls back to a vertical split when its height allows; only a target that fits
on neither axis is refused. Under the `Spiral` default, an ineligible focused
slot instead sends the plan to the largest feasible `Balanced` target (with
one bounded warning) so `Mod+N` keeps working; the chord is refused only when
no leaf can host two usable 10x4 panes.

### `decoration` (logical px, Core-owned)

| Key path                            | Type             | Default                                               | Valid range                                                                                                               | Fail-closed                    | Reload |
| ----------------------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| `decoration.gaps_in`                | integer          | `6`                                                   | `[0, 32]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.gaps_out`               | integer          | `6`                                                   | `[0, 32]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.border`                 | integer          | `2`                                                   | `[0, 8]`                                                                                                                  | ignore element / reject reload | live   |
| `decoration.radius`                 | integer          | `6`                                                   | `[0, 16]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.content_inset`          | integer          | `6`                                                   | `[0, 32]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.border_color`           | string           | unset (theme `border.focused` / `border.idle` tokens) | `#RRGGBB` \| `#RRGGBBAA`, no names/shorthands                                                                             | ignore element / reject reload | live   |
| `decoration.border_color_focused`   | string           | unset (inherits resolved base)                        | `#RRGGBB` \| `#RRGGBBAA`                                                                                                  | ignore element / reject reload | live   |
| `decoration.border_color_idle`      | string           | unset (inherits resolved base)                        | `#RRGGBB` \| `#RRGGBBAA`                                                                                                  | ignore element / reject reload | live   |
| `decoration.border_width`           | integer          | unset (inherits `decoration.border`)                  | `[0, 16]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.border_width_focused`   | integer          | unset (inherits resolved base)                        | `[0, 16]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.border_width_idle`      | integer          | unset (inherits resolved base)                        | `[0, 16]`                                                                                                                 | ignore element / reject reload | live   |
| `decoration.background_image`       | string           | unset (no image)                                      | absolute or `~`-anchored path, non-empty, at most 4096 bytes, no NUL; root trust, format, and decode belong to the loader | ignore element / reject reload | live   |
| `decoration.background_fit`         | string           | `fill`                                                | `fill` \| `fit` \| `center` \| `tile` \| `stretch` (exact, case-sensitive)                                                | ignore element / reject reload | live   |
| `decoration.background_image_roots` | array of strings | unset / empty (denies every path)                     | at most 32 entries, each absolute or `~`-anchored, at most 4096 bytes, no NUL                                             | ignore element / reject reload | live   |

Resolution order for outlines is theme tokens, then `border_color` /
`border_width` base, then the explicit focused/idle pair; only an
explicit member overrides. Contrast contract on the resolved pair:
focused at least `3:1` against the background (enforced), focused at
least `3:1` against idle unless the width cue
(`border_width_focused >= border_width_idle + 1`) is present (enforced),
idle at least `1.5:1` against the background (advisory, reported by
`bitty config check`).

### `views.<selector>.<field>` (per-View overrides)

Selectors: `*` (every View), a content name (`empty` \| `terminal` \|
`rich` \| `browser`), `ws:<1..=16>` (canonical decimal, no leading
zeros), or `view:<ViewId>` (`1..=2^64-1`). Selector keys are at most 64
bytes. Tiers resolve wildcard < content < workspace < view,
independently of declaration order. Default: no entries. Every entry is
dropped under safe mode.

| Field                  | Type    | Default                             | Valid range                                        | Fail-closed                    | Reload |
| ---------------------- | ------- | ----------------------------------- | -------------------------------------------------- | ------------------------------ | ------ |
| `border_color`         | string  | unset (inherit)                     | `#RRGGBB` \| `#RRGGBBAA`                           | ignore element / reject reload | live   |
| `border_color_focused` | string  | unset (inherit)                     | `#RRGGBB` \| `#RRGGBBAA`                           | ignore element / reject reload | live   |
| `border_color_idle`    | string  | unset (inherit)                     | `#RRGGBB` \| `#RRGGBBAA`                           | ignore element / reject reload | live   |
| `border_width`         | integer | unset (inherit)                     | `[0, 16]`                                          | ignore element / reject reload | live   |
| `border_width_focused` | integer | unset (inherit)                     | `[0, 16]`                                          | ignore element / reject reload | live   |
| `border_width_idle`    | integer | unset (inherit)                     | `[0, 16]`                                          | ignore element / reject reload | live   |
| `background_image`     | string  | unset (inherit)                     | same path syntax as `decoration.background_image`  | ignore element / reject reload | live   |
| `background_fit`       | string  | unset (inherit, `fill` at the root) | `fill` \| `fit` \| `center` \| `tile` \| `stretch` | ignore element / reject reload | live   |

Reserved fields `opacity`, `blur`, and `animations` are rejected until
their owning open question accepts them; unknown fields fail closed.

### `scrollbar`, `mouse`

| Key path                             | Type    | Default              | Valid range                                      | Fail-closed                    | Reload  |
| ------------------------------------ | ------- | -------------------- | ------------------------------------------------ | ------------------------------ | ------- |
| `scrollbar.mode`                     | string  | `auto`               | `hidden` \| `always` \| `auto` (exact lowercase) | ignore element / reject reload | restart |
| `scrollbar.width`                    | integer | `8`                  | `[1, 32]` logical px                             | ignore element / reject reload | restart |
| `mouse.focus_follows_mouse`          | boolean | `false`              | `true` \| `false`                                | ignore element / reject reload | restart |
| `mouse.focus_follows_mouse_delay_ms` | integer | `0`                  | `[0, 2000]` ms                                   | ignore element / reject reload | restart |
| `mouse.right`                        | string  | `none`               | `none` \| any chrome-action spelling             | ignore element / reject reload | restart |
| `mouse.middle`                       | string  | `paste_from_primary` | `none` \| any chrome-action spelling             | ignore element / reject reload | restart |

`mouse.right` and `mouse.middle` bind the two chrome buttons to the same
action vocabulary as `keymaps[].action` — `paste_from_clipboard`,
`paste_from_primary`, `copy_to_clipboard`, `toggle_help`,
`command:<owner:cmd>`, and the rest of the catalog — plus an explicit `none`
no-op. The shipped matrix is `right = "none"` and
`middle = "paste_from_primary"`: a default right-click reads no clipboard,
opens no suspicious-paste dialog, and writes no PTY bytes, so an accidental
right-click over a multi-line clipboard can no longer trap the user behind
the confirmation gate. Unknown action spellings fail closed with the owning
field path (`mouse.right` / `mouse.middle`), and a project layer may not bind
either button. Every `mouse` leaf is presence-gated: a layer that omits
`mouse.right` or `mouse.middle` (including a hover-only table or
`mouse = {}`) says nothing, so the lower-precedence value survives with its
attribution and the shipped default applies only when no layer declares the
leaf. A pane that enables mouse reporting
(`DECSET 1000`/`1002`/`1003` plus `1006`) still receives the button as
protocol bytes first; capture wins and no host action runs.

### `appearance` (theme, custom palette, animations)

| Key path                                        | Type                | Default               | Valid range                                                                                                                                                                                                                                                                                                                                          | Fail-closed                    | Reload |
| ----------------------------------------------- | ------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| `appearance.theme` (or top-level `theme` alias) | string              | `bitty-dark`          | known preset name or alias (trimmed, at most 64 bytes), `local:<name>` for a user theme file (candidate under OQ-047), or dual `light:<name>,dark:<name>` (either order, case-insensitive, whitespace-tolerant; CTX-0951); unknown single names, either unknown dual half, and malformed dual values rejected with a diagnostic naming the valid set | ignore element / reject reload | live   |
| `appearance.colors.background`                  | string              | unset (preset value)  | `#RRGGBB` exactly (no alpha, no shorthand, no names); the `colors` table must be complete (4 chrome colors plus exactly 16 `ansi` entries) or the layer is rejected                                                                                                                                                                                  | ignore element / reject reload | live   |
| `appearance.colors.foreground`                  | string              | unset (preset value)  | `#RRGGBB` exactly                                                                                                                                                                                                                                                                                                                                    | ignore element / reject reload | live   |
| `appearance.colors.cursor`                      | string              | unset (preset value)  | `#RRGGBB` exactly                                                                                                                                                                                                                                                                                                                                    | ignore element / reject reload | live   |
| `appearance.colors.selection`                   | string              | unset (preset value)  | `#RRGGBB` exactly                                                                                                                                                                                                                                                                                                                                    | ignore element / reject reload | live   |
| `appearance.colors.ansi`                        | array of 16 strings | unset (preset values) | exactly 16 `#RRGGBB` entries                                                                                                                                                                                                                                                                                                                         | ignore element / reject reload | live   |
| `appearance.animations.enabled`                 | boolean             | `true`                | `true` \| `false` (`false` equals `0` ms)                                                                                                                                                                                                                                                                                                            | ignore element / reject reload | live   |
| `appearance.animations.reduced_motion`          | string              | `auto`                | `auto` \| `always` \| `never`                                                                                                                                                                                                                                                                                                                        | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.open`        | integer             | `150`                 | `[0, 500]` ms                                                                                                                                                                                                                                                                                                                                        | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.close`       | integer             | `120`                 | `[0, 500]` ms                                                                                                                                                                                                                                                                                                                                        | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.focus`       | integer             | `100`                 | `[0, 500]` ms                                                                                                                                                                                                                                                                                                                                        | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.workspace`   | integer             | `200`                 | `[0, 500]` ms                                                                                                                                                                                                                                                                                                                                        | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.move`        | integer             | `150`                 | `[0, 500]` ms (CTX-0967 panel move; Hyprland-style reposition, layout commits immediately, only Core chrome fades)                                                                                                                                                                                                                                   | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.resize`      | integer             | `120`                 | `[0, 500]` ms (CTX-0967 panel resize; divider/keyboard step, same presentation-only rule)                                                                                                                                                                                                                                                            | ignore element / reject reload | live   |
| `appearance.animations.duration_ms.drag`        | integer             | `150`                 | `[0, 500]` ms (CTX-0967 panel drag; Alt+drag float move, same presentation-only rule)                                                                                                                                                                                                                                                                | ignore element / reject reload | live   |
| `appearance.animations.easing.open`             | string              | `ease_out`            | `linear` \| `ease_in` \| `ease_out` \| `ease_in_out` \| `spring` (`spring` resolves to `ease_in_out`; parameters deferred)                                                                                                                                                                                                                           | ignore element / reject reload | live   |
| `appearance.animations.easing.close`            | string              | `ease_in`             | same enum                                                                                                                                                                                                                                                                                                                                            | ignore element / reject reload | live   |
| `appearance.animations.easing.focus`            | string              | `ease_in_out`         | same enum                                                                                                                                                                                                                                                                                                                                            | ignore element / reject reload | live   |
| `appearance.animations.easing.workspace`        | string              | `ease_in_out`         | same enum                                                                                                                                                                                                                                                                                                                                            | ignore element / reject reload | live   |
| `appearance.animations.easing.move`             | string              | `ease_in_out`         | same enum (CTX-0967)                                                                                                                                                                                                                                                                                                                                 | ignore element / reject reload | live   |
| `appearance.animations.easing.resize`           | string              | `ease_in_out`         | same enum (CTX-0967)                                                                                                                                                                                                                                                                                                                                 | ignore element / reject reload | live   |
| `appearance.animations.easing.drag`             | string              | `ease_out`            | same enum (CTX-0967)                                                                                                                                                                                                                                                                                                                                 | ignore element / reject reload | live   |

Safe mode and `reduced_motion = "always"` (or `auto` with a platform
reduced-motion signal) force `0` ms. `appearance.colors` stays inline only;
a separate local theme file is selected explicitly as `local:<name>` and is a
candidate contract under OQ-047
([Local Theme Files](../specifications/local-theme-files-candidate.md)).

### `mod_key`, `leader_key`, `leader_timeout_ms`, `input.leader`, `input.timeout_len`, `keymaps`, `plugins`

| Key path            | Type                                  | Default                                                  | Valid range                                                                                                                                                                                                                                                                                                  | Fail-closed                    | Reload  |
| ------------------- | ------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ------- |
| `mod_key`           | string                                | `alt`                                                    | `alt` (`opt`/`option`) \| `super` (`meta`/`cmd`/`command`/`win`/`windows`), trimmed, case-insensitive, at most 32 bytes; `ctrl`/`shift` rejected (they would steal shell typing)                                                                                                                             | ignore element / reject reload | live    |
| `leader_key`        | string                                | unset (`alt+space`; `ctrl+space` on Windows)             | shared chord grammar (see keymap rules)                                                                                                                                                                                                                                                                      | ignore element / reject reload | live    |
| `leader_timeout_ms` | integer                               | unset (`1000`)                                           | `[100, 60000]` ms                                                                                                                                                                                                                                                                                            | ignore element / reject reload | live    |
| `input.leader`      | string                                | unset (same platform default as `leader_key`)            | shared chord grammar; wins over `leader_key` when both are present (`bitty#1650` via `#1748`)                                                                                                                                                                                                                | ignore element / reject reload | live    |
| `input.timeout_len` | integer                               | unset (`1000`)                                           | `[100, 60000]` ms; wins over `leader_timeout_ms` when both are present (`bitty#1650` via `#1748`)                                                                                                                                                                                                            | ignore element / reject reload | live    |
| `keymaps[]`         | array of `{ chord, action, context }` | 97 shipped bindings (Alt-as-Mod map; see defaults below) | chord at most 64 bytes (`<mod>+...+<key>`, single-character keys need a modifier; named keys may stand alone), action at most 64 bytes from the closed catalog, `context` must be `global`; at most 1024 entries; merge by `context + chord`                                                                 | ignore element / reject reload | live    |
| `plugins[]`         | array of `{ id, enabled }`            | empty                                                    | Top-level `plugins` is a normal Lua declaration path. `id` is trimmed, non-empty, at most 128 bytes; `enabled` is a boolean; at most 1024 entries; entries merge by `id`. An invalid table is ignored at startup and denied for the launch (see [Startup salvage](#startup-salvage-and-strict-diagnostics)). | ignore element / reject reload | restart |

`schema_version` current is `1` (absent assumes `0` and migrates; newer
than `1` is rejected). Profile `extends` is a single-parent chain with
cycle detection; multiple inheritance is open.

## Keymap rules, action catalog, and shipped defaults

Chord grammar: `<mod>+...+<key>`, mods `ctrl`/`control`,
`alt`/`opt`/`option`, `shift`, `super`/`meta`/`cmd`/`win`
(case-insensitive, any order); one key: a named key (`tab`, `enter`,
`escape`, `space`, `backspace`, `delete`, `insert`, `home`, `end`,
`pageup`, `pagedown`, `up`, `down`, `left`, `right`, `f1`..`f35`) or one
ASCII character. A bound chord is consumed by chrome and never reaches
the PTY; unbound keys always go to the shell.

Bindable actions: `goto_split:<left|right|up|down>`,
`new_split:<left|right|up|down>`, `new_panel`, `resize_split:<left|right|up|down>`,
`close_view` (aliases `close_surface`, `close_panel`, `exit_panel`, `close_focused_panel`),
`toggle_zoom` (aliases `toggle_split_zoom`, `suspend_panel`, `detach_panel`, `suspend_focused_panel`, `detach_focused_panel`),
`toggle_floating` (alias `floating_toggle`; CTX-0962),
`focus_next`, `focus_prev`,
`focus:<1..=256>`, `copy_to_clipboard`, `paste_from_clipboard`,
`paste_from_primary` (no shipped chord; the `mouse.middle` default),
`scroll_page_up`, `scroll_page_down`, `increase_font_size`,
`decrease_font_size`, `reset_font_size`, `toggle_help`,
`open_composer` (manual bind only), `fold_toggle` / `fold_expand` /
`fold_collapse` (manual bind only), `toggle_pinned` (alias `pinned_toggle`;
manual bind only), `workspace_new`, `workspace_close`, `workspace_prev`,
`workspace_next`, `workspace_last`, `workspace_next_occupied`,
`workspace_prev_occupied`, `workspace_focus:<1..=16>`,
`workspace_move:<1..=16>`, `workspace_swap:<1..=16>`,
`jump_to_prompt:<prev|next>`, `select_command_output`, `toggle_palette`.

`enter_copy_mode` and `open_search` retired with the Core copy-mode/search
policy and fail closed as unknown actions, so a user binding must target the
owning plugin command instead; the retired `ctrl+shift+space` and
`ctrl+shift+f` chords are ordinary shell input again.

`toggle_help` (alias `show_help`) is still a Core action in the current source.
The decided direction moves the help/which-key panel to a first-party plugin
with a plugin command and plugin-suggested chords; once that migration ships,
the two spellings and the four default help chords leave the Core catalog, and
a user binding must target the plugin command. The migration is not shipped
yet, so the current catalog above remains accurate. The ownership design and
removal plan are the
[Help and Which-Key Overlay Ownership Design](../specifications/help-overlay-ownership-design.md).

`toggle_floating` flips the focused panel between tiled and floating
through the `bitty.workspace:floating-toggle` primitive
(`bitty-ui::presentation::toggle_floating`). The shipped default is
Mod-aware `alt+a` (rebinds to `super+a` under `mod_key = "super"`);
bare `a` stays shell input and `alt+v` stays deliberately free because
fish reserves `alt+v` for `$EDITOR`. Zoom restores before the toggle;
`Fullscreen`/`Scratchpad` transitions fail closed with a warning and no
state change. User entries replace the shipped chord by
`context + chord` identity.

`bitty.workspace:scratchpad-toggle` (spelled
`command:bitty.workspace:scratchpad-toggle` on the chrome key path) toggles
the window scratchpad slot for the core-owned keymap command (bitty issue
2091, CTX-1241; `crates/bitty-terminal/src/chrome_keys.rs`). The command
routes past the plugin runtime straight to the core runtime
(`Runtime::scratchpad_toggle`), validated on the live tree before any state
change: a refused toggle parks nothing and leaves zoom and occupancy
untouched. It carries no shipped default chord; bind it through a user
`keymaps` entry by `context + chord` identity like any other action.

Shipped defaults (97 bindings, Alt spelling; `mod_key = "super"`
rebinds every `alt`-bearing chord, `alt`-free chords pass through):

- Navigate: `alt+h/j/k/l` and `alt+arrows`, `ctrl+alt+arrows`;
  `ctrl+tab` / `ctrl+shift+tab` cycle focus. Directional chords rank a
  candidate by facing-edge distance, then dwindle tree adjacency, then
  shared-edge overlap, then perpendicular center.
- New panel: `alt+n` (`new_panel`) applies the `Spiral` adaptive policy
  (clockwise right, down, left, up around the focused slot, continuing while
  the fresh pane stays focused, with a largest-feasible `Balanced` fallback
  when the focused slot is too small); it is refused at the gap-aware 10x4
  minimum. `alt+q` closes the focused panel.
- Workspaces: `alt+t` new, `alt+w` close (kill-confirm),
  `alt+-` / `alt+=` previous/next, `alt+tab` last-used, `alt+[` / `alt+]`
  cycle occupied workspaces (next/previous, wrapping), `alt+1..9` jump,
  `shift+alt+1..9` move window.
- Splits: `shift+alt+h/j/k/l` and `shift+alt+arrows` create;
  `shift+ctrl+h/j/k/l` (+arrows) and `ctrl+shift+alt+h/j/k/l`
  (+arrows) resize by `layout.resize_step` per keypress (default `0.05`).
- Panels and Views: `alt+q` (`close_view`, aliases `close_panel`,
  `exit_panel`) requests view close with confirmation gating (`close_confirm` or
  running process; revokes overlay capture if modal capture is active);
  `alt+a` toggles the focused panel tiled/floating (`super+a` under
  `mod_key = "super"`); `alt+v` stays free for fish.
- Zoom and Suspend: `alt+z` / `alt+m` / `alt+f` zoom (and temporarily
  suspends/releases active overlay capture, aliases `suspend_panel`,
  `detach_panel`), `alt+u` / `alt+i` page up/down,
  `ctrl+shift+c` / `ctrl+shift+v` copy/paste.
- Font zoom: `ctrl+equal` / `ctrl+plus` (+shifted spellings) larger,
  `ctrl+minus` (+shifted) smaller, `ctrl+0` reset.
- Help: ``alt+` ``, `alt+?`, `alt+shift+?`, `alt+shift+/`.

`toggle_palette`, `toggle_pinned`, and `paste_from_primary` ship without a
chord (manual bind only), so they add no entry to the 97;
`paste_from_primary` is still the shipped `mouse.middle` default.

`alt+n` is not a workspace verb; the new-workspace chord is `alt+t`. The
adaptive new-panel mode is runtime-only (see
[Adaptive new-panel policy](#adaptive-new-panel-policy-runtime-only)): a user
keymap can rebind the chord but cannot select `Balanced`, `Spiral`, `Dwindle`,
or `BisectLargest`.

## Theme presets

30 built-in presets selected by `appearance.theme` (or the top-level
`theme` alias), with per-preset Bitty-owned outline tokens derived so
the contrast contract holds. Aliases are accepted alternate spellings.
Single names match case-insensitively with whitespace trimmed; dual
`light:<name>,dark:<name>` pairs (either order, same trimming rules)
resolve per OS appearance, dark-first on unknown (CTX-0951, bitty PR 1687).
Unknown single names, either unknown dual half, and malformed
dual values fail closed at validation with a diagnostic naming the
valid set. A `local:<name>` selection resolves a bounded file candidate on
the load path; see [Theme presets](../configuration/themes.md) and
[Local Theme Files](../specifications/local-theme-files-candidate.md).
This closes
[bitty-terminal-docs#190](https://github.com/bitty-terminal/bitty-terminal-docs/issues/190).

| Preset                 | Alias(es)                       | Category |
| ---------------------- | ------------------------------- | -------- |
| `bitty-dark` (default) | `dark`                          | Dark     |
| `tokyo-night`          | `tokyonight`                    | Dark     |
| `tokyo-night-storm`    | `tokyonight-storm`              | Dark     |
| `tokyo-night-day`      | `tokyonight-day`                | Light    |
| `catppuccin-mocha`     | `catppuccin`                    | Dark     |
| `catppuccin-macchiato` | —                               | Dark     |
| `catppuccin-frappe`    | —                               | Dark     |
| `catppuccin-latte`     | —                               | Light    |
| `dracula`              | —                               | Dark     |
| `nord`                 | —                               | Dark     |
| `gruvbox-dark`         | `gruvbox`                       | Dark     |
| `gruvbox-light`        | —                               | Light    |
| `solarized-dark`       | `solarized`                     | Dark     |
| `solarized-light`      | —                               | Light    |
| `one-dark`             | `onedark`                       | Dark     |
| `one-light`            | `onelight`                      | Light    |
| `ayu-dark`             | `ayu`                           | Dark     |
| `ayu-mirage`           | —                               | Dark     |
| `ayu-light`            | —                               | Light    |
| `kanagawa-wave`        | `kanagawa`                      | Dark     |
| `kanagawa-lotus`       | —                               | Light    |
| `rose-pine`            | `rosepine`, `rose-pine-main`    | Dark     |
| `rose-pine-moon`       | `rosepine-moon`                 | Dark     |
| `rose-pine-dawn`       | `rosepine-dawn`                 | Light    |
| `everforest-dark`      | `everforest`                    | Dark     |
| `everforest-light`     | —                               | Light    |
| `monokai`              | `monokai-classic`               | Dark     |
| `night-owl`            | `nightowl`                      | Dark     |
| `github-dark`          | `github`, `github-dark-default` | Dark     |
| `github-light`         | `github-light-default`          | Light    |

## Plugin manifest keys (`bitty-plugin.toml`)

Manifest ceiling 256 KiB, UTF-8, duplicate keys rejected. Unknown
sections, sub-tables, and numeric values fail closed.

| Key path                             | Type                      | Required                          | Valid range                                                                                                                                                                                                                         | Fail-closed     |
| ------------------------------------ | ------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `[plugin] id`                        | string                    | yes                               | owner-qualified, at most 128 bytes                                                                                                                                                                                                  | reject manifest |
| `[plugin] name`                      | string                    | yes                               | non-empty, at most 128 bytes, no NUL/ESC                                                                                                                                                                                            | reject manifest |
| `[plugin] version`                   | string                    | yes                               | SemVer 2                                                                                                                                                                                                                            | reject manifest |
| `[plugin] description`               | string                    | no                                | at most 1024 bytes, no NUL/ESC                                                                                                                                                                                                      | reject manifest |
| `[plugin] license`                   | string                    | no                                | non-empty when present, at most 256 bytes (SPDX)                                                                                                                                                                                    | reject manifest |
| `[compat] bitty`                     | string                    | no                                | version-range syntax                                                                                                                                                                                                                | reject manifest |
| `[compat] plugin-api`                | string                    | no                                | version-range syntax                                                                                                                                                                                                                | reject manifest |
| `[capabilities] <id>`                | boolean                   | no                                | ids known to the active capability catalog only (Core seed by default; see families below); `true` requests, `false` is ignored; filesystem authority must use `[[capabilities.filesystem]]`, never a boolean key                   | reject manifest |
| `[[capabilities.filesystem]] access` | string                    | yes (per entry)                   | `read` \| `write`                                                                                                                                                                                                                   | reject manifest |
| `[[capabilities.filesystem]] paths`  | array of strings          | yes (per entry)                   | at most 32 patterns per kind, 8 KiB total pattern text                                                                                                                                                                              | reject manifest |
| `[lazy] commands`                    | array of strings          | no                                | at most 128 qualified names                                                                                                                                                                                                         | reject manifest |
| `[lazy] events`                      | array of strings          | no                                | at most 256 event types, 1..128 bytes each, no NUL/space                                                                                                                                                                            | reject manifest |
| `[lazy] claims`                      | array of strings          | no                                | 1..64 bytes each                                                                                                                                                                                                                    | reject manifest |
| `[tools.git] required`               | boolean                   | yes (when the section is present) | `true` \| `false` (raising to `true` changes the manifest hash and re-confirms grants)                                                                                                                                              | reject manifest |
| `[tools.git] version`                | string                    | yes (when the section is present) | version-requirement syntax, at most 128 bytes                                                                                                                                                                                       | reject manifest |
| `[settings] <key>`                   | declaration               | no                                | key `^[a-z][a-z0-9_]*$`, 1..=64 bytes, at most 32 keys per manifest; kind `bool` \| `int` \| `string` \| `string-array` with a shipped default agreeing in kind and bound; undeclared keys are unreadable (`E_SETTINGS_UNDECLARED`) | reject manifest |
| dependencies / services              | gap in this reader subset | —                                 | full manifest model additionally bounds dependencies (at most 8) and provided/required services (at most 16 each, dot-separated interface names)                                                                                    | reject manifest |

There are no `[network]` and no `[limits]` manifest sections: network
authority is requested through capability ids, and bounds are
host constants, not manifest keys
([bitty#1326](https://github.com/bitty-terminal/bitty/issues/1326)).

Settings declarations stay out of `canonical_bytes`: declaring or changing
a value never invalidates the grant pins bound to the manifest hash
(`bitty` #2057). Values are the user's, authority is the system's —
no config value grants anything.

Capability families in the Core seed (deny-by-default; absent means
denied; no wildcards; unknown identifiers rejected): `terminal`
(`terminal.semantic-read`, `terminal.raw-read`, `terminal.input.self`,
`terminal.input.all`, `terminal.manage`), `ui` (`ui.rich`, `ui.overlay`,
`ui.protocol-register`), `clipboard` (`clipboard.read`,
`clipboard.write`), `env` (`env.read`), `fs` (`fs.read`, `fs.write`,
always with a `:path-glob` parameter via `[[capabilities.filesystem]]`),
`process` (`process.spawn`), `network` (`network.connect`, scoped
`:host` forms), `runtime` (`runtime.inspect`, `runtime.configure`,
`runtime.plugin-manage`), `debug` (`debug.inspect`, `debug.trace`,
`debug.control`), `platform` (`platform.notify`, `platform.open-url`,
`platform.image-file`), `protocol` (`protocol.register`), `panel`
(`panel.provider`, `panel.create`, `panel.focus`, `panel.overlay`),
`browser` (`browser.embed`, `browser.navigation`, `browser.file-url`,
`browser.storage`), `layout` (`layout.provider`).

The Core seed is AI-free: `agent.*`, `mcp.*`, and `ai.*` are not Core
capabilities, so a Core-only install rejects them fail-closed. They
validate only through an explicitly extended capability catalog, when
the `ai` extension contributes them at extension load (`bitty-ai`
registers the `agent`, `mcp`, and `ai` families with the seven heads
`agent.context.terminal`, `agent.context.workspace`, `agent.memory`
(parameter required), `mcp.invoke` (parameter required), `ai.provider`,
`ai.stream`, and `ai.model`, plus role ceilings and the
provider-credential adapter). Core keeps the shape rules and the
enforcement math; capability vocabulary lives in extensions.

## CLI flags

Global startup flags: `--headless`, `--test-mode` (deterministic
headless servo; takes precedence over `--headless`), `--safe`,
`--fail-loud` (failed startup steps fatal instead of fail-soft),
`--split [h|horizontal|v|vertical[:ratio]]` (bare `--split` means
horizontal), `--split-ratio <float>`, `--stack`, `--overlay`,
`--layout <single|split:h[:ratio]|stack[:n]|overlay[:x,y,w,h]>`,
`--focus <next|prev|up|down|left|right|<id>>`,
`--config <path>`, `--profile <name>`, `--theme <name>`,
`--font-family <name>`, `--font-size <points>` (raw, fail-closed at
merge), `--opacity <value>` (raw, fail-closed at merge),
`--log-level <error|warn|info|debug|trace>`, `-v` / `--verbose`
(shorthand for debug-level ticks), `--` (rest is program argv verbatim),
`-h` / `--help`, `-V` / `--version`. Unknown pre-`--` dash-flags and bad
`--split` / `--split-ratio` / `--log-level` / `--layout` / `--focus`
values exit `2`; missing `--config` / `--profile` / `--theme` /
`--font-family` / `--font-size` / `--opacity` values warn-ignored.

Subcommands: `config <path|check|show|validate|edit|profile>`, `init [--yes]
[--force] [--scrollback <lines>] [--close-confirm
<always|when_busy|never>] [--gaps-in <px>] [--gaps-out <px>] [--border <px>]
[--radius <px>]` (init-only; validated fail-closed at dispatch), `doctor
[--format <table|json|jsonl>] [--no-color]`, `run -- COMMAND...`,
`ctl` (with `--socket` / `--instance`, before or after the word),
`list|ls <kind> [--format <table|json|jsonl>] [--socket] [--instance]
[--no-color]`, `inspect <target> <value> [--format] [--no-color]`,
`dev`, `plugin`. Subcommand positionals outside the grammar fail closed
at dispatch.

## Environment variables

| Variable              | Role                                                            | Values                         |
| --------------------- | --------------------------------------------------------------- | ------------------------------ |
| `BITTY_CONFIG`        | Config file path override (below `--config`, above XDG default) | file path                      |
| `BITTY_PROFILE`       | Profile name override (below `--profile`)                       | profile name                   |
| `BITTY_SOCKET`        | IPC socket surface used by test-mode and `ctl`                  | socket path                    |
| `BITTY_VERBOSE`       | Tick stats on (`1`/`true`); shorthand for debug level           | `1`, `true` (case-insensitive) |
| `BITTY_HEADLESS`      | Single headless tick smoke (`1`/`true`)                         | `1`, `true` (case-insensitive) |
| `BITTY_LOG`           | Explicit stderr log level override                              | level name                     |
| `$SHELL`              | Shell fallback when `terminal.shell` is unset                   | executable path                |
| `$VISUAL` / `$EDITOR` | Editor for `bitty config edit` (`$VISUAL` first)                | executable                     |
| `NO_COLOR`            | Disables ANSI coloring in table output when set                 | presence                       |
| `XDG_CONFIG_HOME`     | Config root (above `%APPDATA%` above `$HOME/.config`)           | directory                      |

Plugin-side environment access is capability-gated (`env.read`,
deny-by-default), not ambient.

## Project definitions (gap)

`.wheel/project.toml` discovery exists (nearest `.wheel/project.toml`
wins within 32 ancestor levels; `.agents/` is the compatibility
fallback and never shadows an ancestor `.wheel/`), but nothing reads,
parses, or validates the file, so there are no `project.toml` options
to inventory yet
([bitty#1326](https://github.com/bitty-terminal/bitty/issues/1326)).

## References

- [Lua configuration and filesystem layout](../configuration/lua-and-xdg.md):
  the configuration design contract this reference mirrors.
- [Theme presets](../configuration/themes.md): the theme catalog design
  contract.
- [Terminal compatibility matrix](compatibility-matrix.md): sibling draft
  reference page and its honesty rules.
- Machine inventory:
  [configuration-inventory.json](configuration-inventory.json).
