---
title: Lua configuration and filesystem layout
description: Candidate contract for Lua configuration, XDG roots, layering, and cross-platform paths
category: configuration
audience: mixed
document_type: specification
status: draft
website_publish: true
sidebar_order: 10
---

# Lua configuration and filesystem layout

## Document status

> Status: candidate architecture. Lua is the accepted working direction for
> user configuration, and experimental `bitty-config` code exists. The
> two-stage configuration plan, layer stack, merge rules, reload
> classification, and project-trust mechanics are accepted in
> [Configuration Model RFC](../specifications/configuration-model-rfc.md)
> (OQ-010, 2026-08-27). Platform path separation, directory contents,
> filenames, and CLI examples remain candidate contracts pending ADRs; no
> stable or supported configuration contract is claimed.

## Purpose and scope

Bitty should offer Neovim-like flexibility—`init.lua`, modules, starter
configurations, profiles, and community distributions—while keeping resolution,
merging, validation, plugin isolation, and reload behavior deterministic.

## Normative sources this specification must not weaken

Configuration and workspace trust requirements are normative in the
[security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) and
[threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md). The layouts proposed here must not
turn a search path or project file into implicit code execution.

## Terminology

- Configuration root: the environment-derived directory for user configuration.
- Canonical settings file: the owner-qualified Lua file selected before a short alias.
- Implemented-only: merged source evidence without independent verification or a stability promise.

## Accepted direction: use the correct XDG roots

On Linux and BSD, per-user configuration starts at:

```text
$XDG_CONFIG_HOME/bitty/
```

The common default is `~/.config/bitty/`. `$XDG_CONFIG_DIRS` is the ordered set
of system configuration roots such as `/etc/xdg`; it is not the user's primary
configuration directory. User configuration has higher precedence than system
defaults, subject to non-overridable system policy.

Bitty should keep distinct categories distinct:

- **Config** — user-authored configuration and reproducibility files; normally
  `~/.config/bitty/`.
- **Data** — installed plugins, themes, and runtime resources; normally
  `~/.local/share/bitty/`.
- **State** — sessions, layouts, history, crash, and plugin state; normally
  `~/.local/state/bitty/`.
- **Cache** — disposable derived data; normally `~/.cache/bitty/`.
- **Runtime** — sockets, locks, and current-login instance data; under
  `$XDG_RUNTIME_DIR/bitty/`.

Deleting cache must not remove configuration or persistent state. Logout may
remove runtime data. Installed packages must not live in a dotfiles-oriented
configuration directory.

## User configuration tree

A minimal configuration may contain only:

```text
$XDG_CONFIG_HOME/bitty/
└── init.lua
```

An advanced configuration may use:

```text
$XDG_CONFIG_HOME/bitty/
├── init.lua
├── bitty-plugins.lua
├── bitty-plugins.lock
├── lua/
│   └── config/
│       ├── init.lua
│       ├── options.lua
│       ├── appearance.lua
│       ├── terminal.lua
│       ├── keymaps.lua
│       └── platform.lua
├── plugins/
│   ├── init.lua
│   ├── ui.lua
│   ├── navigation.lua
│   ├── sessions.lua
│   ├── development.lua
│   └── ai.lua
├── themes/
│   └── sunset.toml
└── profiles/
    ├── default.lua
    ├── minimal.lua
    ├── coding.lua
    └── remote.lua
```

Here `plugins/` contains plugin behavior configuration or declarative imports,
not installed plugin source. `themes/` holds optional local theme files
(implemented-only candidate under OQ-047; no installed theme packages). The
data-only Lua ledger path is implemented in the current Core plugin CLI; the
lock name and the wider package semantics remain candidates and are documented
in
[Package management](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/package-management.md).

The configuration root is not a package or extension-data root. Installed
plugin packages and other application data belong under the data root; durable
session and plugin state belongs under the state root; rebuildable indexes and
compiled artifacts belong under the cache root; and sockets, locks, and
current-login instance data belong under the runtime root. This separation is
part of the shipped Core2192 settings path: the per-plugin user file is read
from the environment-derived configuration root only.

## Lua modules without a global runtime path

Status: **accepted direction.**

Bitty should retain the approachable user experience of `init.lua` plus `lua/`
modules.

Status: **candidate contract.**

Module resolution should avoid Neovim's ambient, first-found global
runtime-path semantics.

```text
Config VM  -> $BITTY_CONFIG/lua/
Plugin A VM -> package A module tree
Plugin B VM -> package B module tree
```

`require("config.options")` in the configuration VM resolves user config
modules. A plugin's private `require("internal")` resolves only inside that
plugin. Plugin-to-plugin use goes through declared, versioned host services.

### Restricted plugin settings Lua

Status: **implemented-only** (Core2192 settings and Core PR #2198 diagnostics,
read-only evidence from merged Core `1c68de2545c961790d0a2011340e4a3c04564ab7`).
A plugin's optional user settings file
is `<config-root>/plugins/<owner>.<name>.lua`; the file is evaluated as a
bounded plain-data return table. It is a settings value source, not a plugin
module and not an authority or capability source.

The settings VM is deliberately narrower than the ordinary plugin runtime. It
has no host callbacks and no `print`, `tonumber`, `io`, `os`, `debug`,
`package`, `require`, `load`, `loadfile`, or `dofile` globals. It cannot read
files, spawn processes, access the network, or reach host objects. A denied
global or a non-table return fails closed and the lower settings layers remain
effective.
Evaluation uses the same RC-1/RC-2 instruction, wall-clock, and memory budget
model as plugin Lua: RC-1 is 10,000,000 instructions and 50 ms wall time;
RC-2 is a 32 MiB accounted heap. The
settings loader caps source bytes at 16 KiB. Plain-data extraction also caps
nesting at 16 levels, 64 entries per table, 256 values, 2,048 bytes per
string, and 16 KiB of aggregate output.

Only booleans, integers, strings, and arrays of strings are admitted as plain
values. A manifest `[settings]` declaration is required for every readable
key, with at most 32 keys, a lower-case identifier of at most 64 bytes, one
of `bool`, `int`, `string`, or `string-array`, and a matching shipped default.
Types are strict: integers are not floats, arrays must be dense string arrays,
and no coercion is performed. Undeclared or incompatible entries are dropped;
`bitty.settings.get` rejects an undeclared read with
`E_SETTINGS_UNDECLARED`. Every generation receives its own declared-key set
and resolved map, so settings cannot cross plugin boundaries.

The per-plugin settings layers, from lowest to highest, are:

```text
manifest shipped default < shared host source < selected user file
selected user file: canonical Lua > short alias > legacy TOML
```

The Lua file is selected in this order:

1. `<owner>.<name>.lua` is canonical and wins whenever it is present.
2. `<name>.lua` is a short-name compatibility alias. It is considered only
   after a complete discovery pass proves that exactly one discovered plugin
   owns that short name. Collisions, disabled installed claimants, incomplete
   discovery, invalid candidates, and unavailable discovery fail closed and do
   not use the alias.
3. If neither Lua file is present, the legacy
   `<owner>.<name>.toml` file is used as a compatibility fallback.

Canonical Lua takes precedence over both the short alias and legacy TOML. A
present but invalid canonical Lua file does not fall through to an alias or
TOML file; the plugin keeps running on lower settings layers and the rejection
is recorded internally. The legacy TOML subset remains data-only and follows
the same declared-key, strict-type, per-key default behavior. No setting value
grants capability or changes the machine-managed ledger:
`<config-dir>/bitty-plugins.lua` (data-only Lua; a pre-Lua
`bitty-plugins.toml` is read once for migration and retained at
`bitty-plugins.toml.bak`). Values in any user file are data, never authority:
grants stay bound to the manifest hash recorded by the host, and undeclared
keys are dropped with a diagnostic.

A successful `bitty plugin install` and the first `bitty plugin enable` create
the canonical Lua file once when the plugin declares at least one setting. The
generated file contains the declared defaults as comments and returns an empty
table, so the manifest defaults stay in effect until the user edits a line. It
is written atomically with owner-only permissions, is never created over an
existing canonical/alias/legacy file, and is not created for a plugin with no
declared settings. `bitty plugin config scaffold --force` remains the explicit
overwrite path.

The selected file is read when the plugin activates, and its resolved map is
pinned to that generation. Editing it does not hot-reload the plugin or its
settings; the new values apply on the next activation of that plugin (for
example after a process restart). `bitty ctl config reload` and the automatic
`init.lua` file poll do not reread per-plugin settings files.

Users do not need to read Core sources to find or create the file.
`bitty plugin config show <id>` prints the declared schema, the candidate and
selected paths, and every effective value with its serving layer, without
creating a plugin VM. `bitty plugin config scaffold <id>` writes a commented
canonical Lua template from the manifest defaults only; it refuses to
overwrite without `--force`, refuses symlinked targets, and commits atomically
inside the configuration root. See the
[per-plugin user files reference](../reference/configuration-options.md#inspecting-and-scaffolding-settings)
for the exact output, flags, and failure behavior.

The plugin ecosystem owns the public settings API vocabulary and capability
boundary; see its [`bitty.settings` reference](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/reference/settings.md)
and [Lua runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md).

Diagnostics for alias ambiguity, canonical-over-alias shadowing, dropped
entries, and rejected files are **implemented-only** in merged Core PR
[#2198](https://github.com/bitty-terminal/bitty/pull/2198) at
`1c68de2545c961790d0a2011340e4a3c04564ab7`. They are retained on host-owned
plugin generation state and read by the terminal's startup logging path.
They are not Lua-visible, independently Verified, or a stable public
diagnostics contract. See the pinned
[Core settings loader](https://github.com/bitty-terminal/bitty/blob/1c68de2545c961790d0a2011340e4a3c04564ab7/crates/bitty-runtime/src/plugin_runtime/plugin_settings.rs)
and the separate [Lua and legacy TOML bounds](../reference/configuration-options.md).

A candidate minimal entry point is:

```lua
-- Candidate API only.
return require("config")
```

And a modular plan could look like:

```lua
-- Candidate API only: lua/config/init.lua
local bitty = require("bitty")

return bitty.config({
    terminal = require("config.terminal"),
    appearance = require("config.appearance"),
    keymaps = require("config.keymaps"),
    plugins = require("config.plugins"),
})
```

Exact module search rules and the built-in `bitty` module API remain open.

## Declarative configuration plan

Status: **candidate contract.**

Official configuration should return data rather than imperatively mutate live
objects during load:

```lua
-- Candidate schema.
return {
    font = {
        family = "JetBrains Mono",
        size = 13,
    },
    window = {
        opacity = 0.95,
        padding = 8,
    },
    terminal = {
        scrollback = 10000,
    },
}
```

The intended lifecycle is:

```text
Lua -> ConfigPlan -> typed validation -> merge -> diff -> reconcile
```

This architecture enables offline validation, effective-config inspection,
source attribution, controlled reload, and deterministic distribution/user
composition. An imperative API may exist for runtime behaviors, but it is not
the default configuration model.

Key mappings likewise should be data describing a command/action and context,
not side effects during module import.

## Layers and precedence

Status: **candidate contract.**

```text
Core defaults
  -> System defaults
  -> Distribution
  -> Profile
  -> User config
  -> Trusted local override
  -> CLI override
```

The later layer wins only according to the schema's merge policy. A candidate
precedence shorthand is:

```text
CLI > local > user > profile > distribution > system > core default
```

System policy is distinct from system defaults and may be non-overridable.
Bitty should not automatically execute arbitrary Lua found across every
`$XDG_CONFIG_DIRS` entry. A safer system layout could separate trusted defaults
and policy:

```text
/etc/xdg/bitty/
├── defaults.lua
└── policy.lua
```

Whether even these files are Lua, a restricted schema, or signed/trusted
modules is an open security decision.

Status: **shipped defaults** for the precedence order and the CLI/env
override mechanics below (read-only from `bitty` `origin/main`,
`crates/bitty-config/src/file.rs` and `crates/bitty-app/src/main.rs`,
CTX-0169/CTX-0180). The settled order is `CLI > file > profile >
defaults`: explicit CLI appearance flags win over the user file
(`init.lua`), which wins over the named profile, which wins over core
defaults. `BITTY_CONFIG` (explicit path) and `BITTY_PROFILE` (profile
name) sit between CLI flags and probed files — CLI wins over env. A
missing explicit `--config`/`BITTY_CONFIG` path, or a
requested-but-missing profile, fails closed instead of falling back.

Status: **shipped safe-mode override** (`bitty` `20519bc`, CTX-0346).
`bitty --safe` short-circuits the entire layer stack above: it selects the
built-in safe effective configuration and reads no external layer, so
`--config`/`BITTY_CONFIG`, profiles, system/distribution layers, and CLI
appearance overrides are all ignored. Every field is attributed to Core
defaults, decoration is forced to `0/0/1/0/0`, and the focused/idle outline
pair to the opaque `#FFFFFF`/`#808080` built-ins. See the safe-mode precedence
table in the [CLI reference](../interfaces/cli.md#safe-mode-configuration-precedence)
and [RFC-0001](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md) (OQ-039).

## Merge semantics

Status: **candidate contract.**

Configuration layers must not rely on arbitrary Lua table concatenation or
load order. Each typed schema field defines how it merges.

Status: **candidate rules.**

- A scalar is replaced by the later layer.
- A structured map uses schema-guided deep merge.
- A plugin set merges by globally unique plugin ID.
- Key mappings merge or resolve by context plus chord.
- A generic list declares replace, append, or merge-by-ID behavior; it never
  concatenates implicitly.

Source metadata should survive merge so that `config show --source` and
developer tools can explain every effective value and conflict.

## Profiles

Status: **shipped defaults** for profile selection, naming, and layering
(read-only from `bitty` `origin/main`,
`crates/bitty-config/src/file.rs`, CTX-0169, issue #271);
**candidate** for multi-parent `extends`. Single-parent `extends` chains are
shipped (read-only from `bitty` `origin/main`, `crates/bitty-config/src/file.rs`,
`load_profile_chain`, issue #1366): base-first resolution with cycle detection,
missing/illegal parents fail closed, 16-hop cap.

Shipped mechanics:

- Named profiles live at `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`.
- Selection is `--profile NAME`, else `BITTY_PROFILE`, else the persisted
  selector in `init.lua`; a missing, empty, or whitespace-only launch value
  means absent.
- Names allow `[A-Za-z0-9_-]` only (no paths, no extensions) and at most 64
  bytes; anything else fails closed. System-wide `XDG_CONFIG_DIRS` is never
  consulted for profiles.
- The profile plan layers UNDER the user file (`init.lua` still wins) and
  under CLI appearance flags (`CLI > file > profile > defaults`, settled in
  [Layers and precedence](#layers-and-precedence)).
- A requested-but-missing or invalid profile fails closed (exit 2); a bare
  launch with no profile request keeps working.

Persisted selection (CTX-1404, issue #2187) is a versioned User-layer
envelope, implemented by `bitty init`:

```lua
-- $XDG_CONFIG_HOME/bitty/init.lua
return {
    format = "bitty-profile-v1",
    profile = "default",
    -- User overrides belong here and win over the selected profile.
    window = { opacity = 0.95, padding = 8 },
}
```

- The exact `format = "bitty-profile-v1"` discriminator is required. An
  unmarked `init.lua` is a legacy plain configuration; a bare `profile` key
  without the discriminator stays undeclared.
- Selection order is `--profile` > `BITTY_PROFILE` > persisted selector. A
  broken explicit selection fails closed instead of falling back to the
  selector; an explicit launch selection never rewrites the selector.
- The selected chain is not loaded in addition to an explicit chain, and the
  selector adds no value layer: User overrides remain above the whole profile
  chain.
- `extends` stays profile-layer-only. The selector is not a profile parent.
- Selecting or creating a profile does not install, enable, grant, or fetch a
  plugin; profile declarations are configuration data only.
- Safe startup (`--safe`) still returns the built-in safe configuration
  before reading any selector, profile, or parent.

Shipped: profile composition via single-parent `extends` chains
with cycle detection (base-first, 16-hop cap, fail-closed);
multiple inheritance remains open.

Profiles compose focused changes rather than duplicate an entire config. A
coding profile, for example, may extend a default profile, add development
plugins, and increase scrollback:

```lua
-- Candidate schema: profiles/coding.lua
return {
    extends = "default",
    plugins = {
        { import = "plugins.git" },
        { import = "plugins.development" },
    },
    terminal = {
        scrollback = 50000,
    },
}
```

A candidate launch form is `bitty --profile coding`; its placement in the CLI
grammar remains open.

The shipped launch form is `bitty --profile coding` (or `BITTY_PROFILE=coding`)
as specified above; the grammar-ownership question is closed by that shipment
and only multi-parent `extends` stays open.

## Profile-backed initialization

Status: **implemented-only** on `bitty` `main` after issue #2187 (CTX-1404);
the profile model above remains the shipped contract.

`bitty init` writes `profiles/default.lua` plus a thin `init.lua` selector.
`bitty init --profile NAME` writes only `profiles/NAME.lua` and does not
activate it. Activation is explicit:

```bash
bitty init
bitty init --yes
bitty init --yes --profile work
bitty init --profile minimal
bitty init --profile dark
bitty init --profile light
bitty config profile use work
bitty config profile list
bitty config profile show work
bitty config profile path work
bitty init --migrate
```

First-class presets (Core issue #2371, 0.0.25):

- `--profile minimal` writes the smallest seed: a single `theme` key with the
  shipped defaults supplying every other value.
- `--profile dark` writes the ordinary generated defaults with the dark theme
  family (`dark`).
- `--profile light` writes the ordinary generated defaults with the
  `github-light` preset.
- Preset seeds are deterministic: no prompts, no TTY or `--yes` requirement,
  no `$SHELL` or `BITTY_PROFILE` read, and no activation. Explicit value
  flags (`--theme`, `--font-size`, ...) still apply and add only the blocks
  they touch to a minimal seed.
- Every other valid name keeps the wizard flow (or `--yes` generated
  defaults) and still writes only `profiles/NAME.lua`.

**Current generated output (after the 0.0.25 preset record):** Current
`--profile minimal` output writes a nested
`appearance.theme` key, with the shipped defaults supplying every other value.
This current output note is separate from the historical 0.0.25 preset record above.

A conflict (an existing target profile or selector) fails closed with exit 2
and writes nothing. `--force` is the explicit reset: the previous bytes go to
a collision-free `<file>.bak[.N]` sibling (exclusive creation, synced) before
the new content is published by an atomic sibling-temp rename, so a failed
write leaves the previous file in place.

- A fresh profile-backed init publishes the profile before the selector.
  A crash before selector publication leaves the previous configuration
  usable and never auto-selects the orphan.
- Writes validate the generated Lua first. New files use exclusive creation;
  replacements write and sync a sibling temporary file, then rename over the
  target. Existing bytes go to a collision-free `<file>.bak[.N]` sibling
  created with exclusive creation, so the sole recovery copy is not
  overwritten.
- A complete legacy `init.lua` is never silently replaced or reinterpreted,
  including with `--force`. `bitty init --migrate` copies the complete source
  bytes to `profiles/default.lua`, validates the profile, compares the
  effective values with the pre-migration configuration, and only then
  replaces `init.lua` with the selector. The legacy bytes remain in the
  selector backup.
- `bitty config profile use NAME` validates the name, the whole profile chain,
  and the prospective selector before mutation. It rewrites only the
  `profile = "..."` value, preserving comments and user overrides, and keeps
  a backup of the previous selector.
- `--profile NAME` combined with `--config`/`BITTY_CONFIG` is refused as
  ambiguous. `BITTY_PROFILE` is never an output target.
- When a persisted selector lives in an explicit `--config`/`BITTY_CONFIG`
  file, its profile directory is the sibling `profiles/` directory of that
  file (the same location `bitty init` writes). One-launch `--profile` and
  `BITTY_PROFILE` continue to resolve under the user config root.
- `config profile list` reads directory metadata only (no Lua evaluation);
  `show` loads the bounded `extends` chain; `path` validates the name and
  prints the resolved path without creating it.
- `--force` is an explicit reset of the named generated file, with backups;
  a default run refuses an existing target instead of guessing. Lossless
  merge into arbitrary hand-edited Lua is not part of this slice: the wizard
  never serializes a typed plan back over source, so edit the profile
  directly or use an explicit reset.

## Shipped CLI overrides, setup wizard, and logging defaults

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
`crates/bitty-app/src/main.rs`, CTX-0149/CTX-0180/CTX-0190/CTX-0480/CTX-0481).
These are reported here as shipped status; they change no normative contract
above.

- CLI appearance overrides (CTX-0180): `--theme NAME`, `--font-family NAME`,
  `--font-size PTS`, and `--opacity FLOAT` apply to one launch. They form a
  single `Cli` layer plan over the file and profile values; sibling fields
  keep file values. `--font-size` and `--opacity` are parsed as raw text and
  validated at merge time — invalid values fail closed (exit 2), never
  warn-ignored. Since CTX-0290, `--opacity` below `1.0` scales pixel alpha
  through the shipped premultiplied renderer path; when the surface cannot
  composite premultiplied the window stays opaque (fail-closed).
- Startup layout and focus values (CTX-0480, `bitty` #779): malformed
  `--split`, `--split-ratio`, `--layout`, `--log-level`, and `--focus` input
  fails closed with usage and exit `2` instead of warning and silently running
  defaults; finite out-of-range split ratios and layout stack counts clamp
  loudly. A syntactically valid but unresolvable `--focus` id still warns and
  continues with the existing layout.
- Fail-loud startup (CTX-0481, `bitty` #788): `--fail-loud` (also
  `BITTY_FAIL_LOUD=1` or `true`) turns a failed primary shell, a failed startup
  pane shell, or an attempted-but-rejected IPC servo into a startup abort with
  exit `1` instead of the default fail-soft warning path. A
  platform-unsupported startup step is deliberately never fatal, and
  mid-session respawn failures keep their existing keymap/ctl warning
  semantics.
- Explicit config path: `--config PATH` wins verbatim; else `BITTY_CONFIG`;
  else the XDG default is probed (`$XDG_CONFIG_HOME/bitty/init.lua`,
  fallback `~/.config/bitty/init.lua`, then the `config.lua` alias).
  `bitty config path|check|edit` locates, validates with per-key source
  attribution (`cli/file/profile/default`), and opens the file in
  `$VISUAL`/`$EDITOR` (`vi` fallback).
- Setup wizard (CTX-0149, issue #243; profile-backed by #2187/CTX-1404;
  preset seeds by #2371): `bitty init [--yes] [--force] [--profile NAME]
[--migrate]` is the opt-in first-run writer. A bare run writes
  `profiles/default.lua` plus the thin `init.lua` selector; `--profile NAME`
  writes only that profile and never activates it; `--profile
minimal|dark|light` seeds a deterministic preset without prompting. Without
  `--force`, an existing target is an error, never a silent overwrite;
  `--force` copies the previous bytes to a collision-free `<file>.bak[.N]`
  sibling before atomically replacing the file. A legacy `init.lua` is never
  replaced implicitly; `--migrate` is the explicit conversion. A program
  literally named `init` must be invoked as `bitty -- init ...`.
  `--yes`/`--force` are init-only and ignored by normal startup.
- Quiet logging (CTX-0190): the default stderr level is `Warn` — warnings,
  errors, plus unconditional key user-facing lines (paste confirm/cancel,
  startup summary); per-frame `bitty tick` stats sit at `Debug`/`Trace` and
  stay silent by default. `-v`/`--verbose` (also `BITTY_VERBOSE=1`) selects
  `Debug`; `--log-level error|warn|info|debug|trace|verbose` selects
  directly (`verbose` maps to `Debug`). Precedence is `--log-level`, then
  `--verbose`/`-v`/`BITTY_VERBOSE=1`, then `BITTY_LOG`, then `RUST_LOG`
  (both accept bare levels and `RUST_LOG`-style filters, most verbose wins,
  `BITTY_LOG` preferred), then the quiet default.

Open: whether the CLI appearance flag set grows (for example spacing or
padding flags); the wizard prompt UX and starter-content evolution; and the
exact tick-line format, which remains a diagnostic, not a stable interface.

## Scrollbar overlay (shipped defaults)

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
commit `c49ead1`, CTX-0181, closes `bitty` #281; merged to `bitty`
origin `main`, verified read-only via `merge-base --is-ancestor`).
This section reports the shipped contract only. It changes no normative
contract above and weakens no security control.

Shipped modes (`scrollbar.mode`, default `"hidden"`):

- `"hidden"` — never painted; zero pixels, zero geometry delta, so existing
  layouts stay geometry-neutral.
- `"always"` — overlay thumb painted whenever scrollback exists.
- `"auto"` — thumb revealed on mouse proximity, hover, or drag only.

Shipped geometry: the thumb is painted in the present layer, never into
grid truth. Its geometry derives from scrollback length plus viewport
offset; thumb width is logical pixels scaled by the live DPI factor (like
`window.padding`), default `8`, range `1`–`32` (wider values fail closed).
Engagement (proximity, hover, drag) reuses the existing mouse path, and
drag scrolls through `View::scroll_by`. Hit-testing accounts for panel gaps
(CTX-0177) and padding (CTX-0223); releases over the thumb skip hyperlink
activation.

Shipped config contract:

```lua
-- Shipped schema (CTX-0181, bitty #405).
return {
    scrollbar = { mode = "auto", width = 8 },
}
```

The `scrollbar` table deep-merges while `scrollbar.mode` and
`scrollbar.width` are scalar-replace with per-field source attribution
(`cli`/`file`/`profile`/`default`); system policy may pin either field as
non-overridable. Unknown modes and out-of-range widths fail closed (exit
2), never warn-ignored. Open: exact proximity radius, hover timing, and
whether a CLI flag set grows to cover `scrollbar.*`.

## Shipped layout gaps (panel gaps reference)

Status: **shipped defaults** (read-only from `bitty` `origin/main`,
commit `abde197`, CTX-0240, `bitty` #415; merged to `bitty` origin
`main`, verified read-only via `merge-base --is-ancestor`). This section
is the reference for the shipped gap contract; the merge-class
instantiation stays in the [Configuration Model RFC](../specifications/configuration-model-rfc.md).
It changes no normative contract above and weakens no security control.

Shipped contract (`layout.gaps_in` / `layout.gaps_out`, cells):

- Both fields are `0..=16` cells, default `0` (edge-to-edge tiling).
  Larger values fail closed like every other config bound (threat T-01);
  one cell is about `10`px wide at the default `10x22` cell.
- The solver is content-agnostic: panel leaves flow through the same
  `layout_with_gaps` path as terminal leaves (CTX-0177 algebra reuse).
- Split siblings exclude the `gaps_in` bands, which are painted with the
  theme background every damaged frame; `Gaps::ZERO` is bit-identical to
  legacy tiling.
- Stack (workspace) leaves share the container bounds, so `gaps_in`
  between them is meaningless: a stack gets the `gaps_out` inset only,
  with zero inner gap.

Shipped config contract:

```lua
-- Shipped schema (CTX-0240, bitty #415).
return {
    layout = { gaps_in = 2, gaps_out = 1 },
}
```

Absent `layout` tables (or absent keys within them) mean "this layer says
nothing" and inherit silently. There are no per-panel-type gap overrides.
Open: whether a CLI flag set grows to cover `layout.*`.

## Shipped workspace decoration (Core-owned px reference)

Status: **shipped** — the `6/6/2/6/6` geometry plus `content_inset`, the live
present-path px painting, and the focused/idle outline colors (read-only from
`bitty` `origin/main`, verified read-only via `merge-base --is-ancestor`). This
section is the reference for the shipped decoration surface; the accepted
normative contract is the
[Workspace Compositor Specification](../specifications/workspace-compositor.md)
section "Core-owned gaps, border, radius, and content inset" (accepted
CTX-0118; the CTX-0333 amendment unified the sibling gap to `6` and added
`content_inset`), and the merge-class instantiation stays in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md). It
changes no normative contract above and weakens no security control.

Shipped revisions: `bitty` PR #487 (merge commit `485fbfd`, CTX-0292) shipped
the first config surface; `bitty` PR #562 (merge commit `9031b3f`, CTX-0333)
shipped the unified `6/6/2/6/6` set and `content_inset`; `bitty` PR #519 (merge
commit `638ef81`, CTX-0294) shipped the live present-path px painting and
`bitty` PR #533 (merge commit `3d08d8e`, CTX-0311) added the SDF rounded
fills; `bitty` PR #572 (merge commit `f83b1e1`, CTX-0340) shipped the
focused/idle outline colors.

Shipped contract (`decoration.*`, logical pixels):

| Field                      | Default | Valid range | Owner |
| -------------------------- | ------- | ----------- | ----- |
| `decoration.gaps_in`       | `6` px  | `0..=32` px | Core  |
| `decoration.gaps_out`      | `6` px  | `0..=32` px | Core  |
| `decoration.border`        | `2` px  | `0..=8` px  | Core  |
| `decoration.radius`        | `6` px  | `0..=16` px | Core  |
| `decoration.content_inset` | `6` px  | `0..=32` px | Core  |

Shipped outline colors (CTX-0340, RFC-0001 OQ-039):

| Field                             | Default     | Valid values            | Reload |
| --------------------------------- | ----------- | ----------------------- | ------ |
| `decoration.border_color`         | unset       | `#RRGGBB` / `#RRGGBBAA` | live   |
| `decoration.border_color_focused` | `#33CCFF`   | `#RRGGBB` / `#RRGGBBAA` | live   |
| `decoration.border_color_idle`    | `#595959AA` | `#RRGGBB` / `#RRGGBBAA` | live   |

`decoration.border_color` is the base for both focus states; the two explicit
members override it per state. Resolution order (later wins) is theme token
(`border.focused` / `border.idle`, supplied by the selected preset) then
`decoration.border_color` then the explicit `border_color_focused` /
`border_color_idle` pair. Only an explicitly set pair member overrides the
resolved base; an unset member inherits it and never silently shadows it. The
canonical grammar is `#RRGGBB` or `#RRGGBBAA` (8-digit form is RGBA byte
order); alpha defaults to `FF` when omitted, and `#RGB` shorthand, named
colors, `rgb()`/`rgba()`, gradients, and images are rejected fail-closed with a
diagnostic naming the offending key.

Contrast is enforced on the resolved pair over the preset background
(WCAG 2.1 relative luminance): **AC-1** focused outline >= 3:1 against the
background and **AC-2** focused >= 3:1 against idle are fail-closed at
`ConfigPlan` (AC-2 applies only when the two resolved colors differ, since a
base-only config claims no color-only focus distinction); **AC-3** idle >= 1.5:1
against the background is an advisory reported by `bitty config check` and never
rejects a config. `bitty --safe` ignores user and preset color values and forces
the opaque built-in pair `#FFFFFF` focused / `#808080` idle (alpha `FF`).

The defaults above are the shipped `CTX-0333` set (`6/6/2/6/6` +
`content_inset`), matching the accepted
[Workspace Compositor Specification](../specifications/workspace-compositor.md)
"Core-owned gaps, border, radius, and content inset" contract. The `CTX-0292`
merge commit `485fbfd` shipped the pre-CTX-0333 `4/6/2/6` set without
`content_inset`; the unified `6/6/2/6/6` set and `content_inset` shipped with
`bitty` PR #562 (merge commit `9031b3f`) and are in `bitty` `origin/main`.

- Core owns the surface: the five fields are validated through `ConfigPlan`,
  never proposed by a `LayoutProvider`, and never carried by a `View`, so no
  plugin mutation path exists (accepted contract rules 1-4).
- Unknown keys and out-of-range values fail closed with a source-attributed
  diagnostic; Core never falls back to a silent default when validation
  fails.
- `decoration` deep-merges as a table while each field is scalar-replace
  with per-field source attribution; project layers may set the surface
  because it is presentation-only chrome with no process authority (like the
  scrollbar), and the fields reload `Live`.
- The Core solver is total, deterministic, and saturating: `gaps_out`
  insets the workspace area, `gaps_in` reserves the band between siblings,
  `border` insets each View's content rect, and `radius` is carried as clip
  metadata. Values are logical pixels scaled by the Window DPI factor only
  at render time; an out-of-range live update is rejected fail-closed.
- The shipped live present path paints the px decoration (fractional-cell View
  frames plus the SDF rounded-fill/radius primitive, `bitty` PR #519 CTX-0294
  and PR #533 CTX-0311), so the values are visible behavior, not only carried
  intent.
- `bitty --safe` forces `gaps_in = 0`, `gaps_out = 0`, `border = 1`,
  `radius = 0`, `content_inset = 0` (`0/0/1/0/0`) regardless of user
  configuration (accepted contract rule 6).

Canonical config contract (shipped `CTX-0333` set):

```lua
-- Canonical schema (shipped; CTX-0333, bitty PR #562, in bitty origin/main).
return {
    decoration = { gaps_in = 6, gaps_out = 6, border = 2, radius = 6, content_inset = 6 },
}
```

The `CTX-0292` merge commit `485fbfd` shipped `gaps_in = 4, gaps_out = 6,
border = 2, radius = 6` without `content_inset`; the canonical `6/6/2/6/6` set
and `content_inset` shipped with `bitty` PR #562.

Absent `decoration` tables (or absent keys within them) mean "this layer
says nothing" and inherit silently.

The px decoration is painted on the live present path (`bitty` PR #519
`638ef81`, CTX-0294, plus the CTX-0311 SDF rounded fills in PR #533
`3d08d8e`): `gaps_out` insets the workspace area, `gaps_in` reserves the band
between siblings, `border` insets each View's content rect, and `radius` clips
the frame. The values are validated, stored, attributed, and rendered.

### Decoration px versus layout cells

Two similarly named gap surfaces exist and must not be conflated:

| Surface                           | Unit                 | Default   | Range    | Status                                                         |
| --------------------------------- | -------------------- | --------- | -------- | -------------------------------------------------------------- |
| `layout.gaps_in` / `gaps_out`     | cells (`10x22` each) | `0` / `0` | `0..=16` | shipped; painted by the single-window path (CTX-0177/CTX-0240) |
| `decoration.gaps_in` / `gaps_out` | logical px           | `6` / `6` | `0..=32` | shipped; painted by the live present path (bitty PR #562/#519) |

Also distinct: `decoration.radius` (View frame corner radius, logical px)
versus `window.radius_px` (window corner radius, physical px, S0 parsed no-op,
CTX-0241).

Open: whether a CLI flag set grows to cover `decoration.*`.

### Workspace bar settings (bar-plugin-owned input)

Status: **shipped input** (read-only from `bitty` `origin/main`,
[bitty#1572](https://github.com/bitty-terminal/bitty/issues/1572)
implementer decision, CTX-0979 `bitty` #1721). `workspace.show_bar` and
`workspace.bar.edge` are RETAINED as `bar`-plugin-owned input
(`bitty-terminal.bar`); Core parses but does not use these keys as workspace
truth. There is no Core workspace-strip fallback, including in `bitty --safe`;
a bar presentation plugin uses read-only workspace observations and Core
commands. With no such plugin, workspace bands reserve zero space. No
`workspace.bar.colors` or `workspace.bar.pill_align` keys were introduced.

```lua
-- Shipped input (CTX-0979, bitty #1721; bar-plugin-owned, Core draws nothing).
return {
    workspace = { show_bar = true, bar = { edge = "bottom" } },
}
```

Per-plugin user files (Core2192, `bitty` #2057): the bar plugin declares
`show`, `edge`, `show_single`, `name_max_chars`, `label`, `icons`, and the
Waybar-style module groups `modules_left`, `modules_center`, and
`modules_right` in its manifest `[settings]`. Their shipped defaults are
`label = "index"`, `icons = "ascii"`, `modules_left = { "workspaces" }`,
`modules_center = { "clock" }`, and `modules_right = { "network", "cpu",
"memory", "battery" }`. The module groups are true left, center, and right
anchors; provider-backed modules hide fail closed when their provider is
absent or ungranted. A user file at
`<config-dir>/plugins/<owner>.<name>.lua` overrides the shipped defaults
through the same source that serves `bitty.settings.get`; legacy TOML is only
the compatibility fallback. Values are the user's, authority is the system's:
no value grants anything, and settings declarations stay out of the manifest
hash. The full file grammar, bounds, precedence, and read gate live in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md#plugin-settings-plane)
and the [configuration options reference](../reference/configuration-options.md#per-plugin-user-files-pluginslua).

## Appearance knobs (supported reference)

Status: **implementation reference** read-only from `bitty` `origin/main`
`3eb8e0e` (the outline and animation rows below were introduced by `f83b1e1`
CTX-0340 and `3c5878e` CTX-0341; the decoration rows by `9031b3f` CTX-0333).
This is the lookup table for the appearance knobs `init.lua` already accepts;
the merge/reload mechanics stay in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md). The
accepted focus/idle outline color contract is the
[Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
(accepted; OQ-039 focused/idle outline colors closed 2026-09-12 and shipped in
`f83b1e1`; OQ-036 label position, OQ-037 frame color, and OQ-038 opacity and
blur remain `Open`). The accepted animation contract is the
[Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
(accepted; OQ-040 closed 2026-09-12 and shipped in `3c5878e` CTX-0341).

| Key                          | Default                        | Range or values                                                             |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `appearance.theme`           | `bitty-dark` (alias `dark`)    | preset name, alias, or dual `light:<name>,dark:<name>`; unknown fail closed |
| `theme` (alias)              | unset                          | `appearance.theme` wins                                                     |
| `appearance.colors.*`        | unset                          | complete inline palette, `#RRGGBB`-only                                     |
| `font.family`                | `JetBrainsMono Nerd Font`      | non-empty, `<= 128` bytes                                                   |
| `font.size`                  | `12.0`                         | `(0, 128]`                                                                  |
| `font.line_height`           | `1.375`                        | `[1.0, 2.0]`                                                                |
| `font.letter_spacing`        | `2.0`                          | `[0.0, 8.0]`                                                                |
| `window.opacity`             | `1.0`                          | `[0.0, 1.0]` whole window                                                   |
| `window.padding`             | `8`                            | `0..=64` logical px                                                         |
| `window.radius_px`           | `0`                            | `0..=24` physical px (no-op S0)                                             |
| `window.blur_radius`         | `0`                            | only `0`; non-zero fails closed (OQ-038)                                    |
| `window.background_image`    | unset                          | absolute or `~` path under `decoration.background_image_roots`              |
| `window.background_fit`      | `fill`                         | `fill`/`fit`/`center`/`tile`/`stretch`                                      |
| `window.background_opacity`  | `1.0`                          | `[0.0, 1.0]` image-alpha dim                                                |
| `window.background_position` | `center`                       | nine CSS positions; only `fit`/`center`                                     |
| `layout.gaps_in`/`gaps_out`  | `0`/`0`                        | `0..=16` cells                                                              |
| `layout.resize_step`         | `0.05`                         | `0.01..=0.20` split-ratio delta per keypress, fail-closed, live             |
| `decoration.*`               | see decoration reference above | logical px                                                                  |
| `scrollbar.mode`/`width`     | `hidden`/`8`                   | `hidden`/`always`/`auto`, `1..=32`                                          |

The built-in preset names, aliases, and dark/light categories are listed in the
[theme preset catalog](themes.md); the full 30-preset catalog resolves today.
`appearance.theme` matches a name or alias case-insensitively with surrounding
whitespace trimmed; it also accepts a dual `light:<name>,dark:<name>` pair
(either order, same trimming rules) that resolves per OS appearance
(dark-first on unknown). Unknown single names, either unknown dual half, and
malformed dual values fail closed at validation with a diagnostic naming the
valid set (CTX-0951, `bitty` #1687; closes
[bitty-terminal-docs#190](https://github.com/bitty-terminal/bitty-terminal-docs/issues/190).

- Inline custom palette (CTX-0392, completed as a first-class preset
  alternative in issue #2333; read-only from `bitty` `origin/main` at
  `c64dd1e`): `appearance.colors` carries `background`, `foreground`,
  `cursor`, `selection`, plus exactly 16 `ansi` hex strings. Every leaf is
  `#RRGGBB`-only; a missing, short, long, or malformed leaf rejects the whole
  reload fail-closed, never a partial palette, and the diagnostic names the
  exact leaf. This table is the shipped custom-color surface; it accepts no
  file path. A local theme file is a separate, explicitly selected
  `local:<name>` source (implemented-only candidate under OQ-047, see
  [Local Theme Files](../specifications/local-theme-files-candidate.md)).

- The gap layers compose: effective gap =
  `decoration.gap * DPI_scale + layout.gap_cells * cell_axis` (CTX-0333).
- `window.opacity` is whole-window, not per-surface or background-only.
  `window.background_opacity` is the separate image-alpha dim: it applies
  before the image is blended over the theme background, then
  `window.opacity` scales the finished premultiplied surface once. The window
  background tier is sized from the live surface (stable across splits and
  pane moves); the per-view tier is sized from each leaf's content frame and
  re-fits on split, divider move, pane move, and resize. A blur contract
  remains design-only (OQ-038): `window.blur_radius` accepts only `0` and
  rejects a non-zero value at validation with a typed diagnostic.
- Label position (OQ-036) and frame/margin-line color (OQ-037) have no config
  key yet; do not document them as supported.
- Focused/idle outline colors (OQ-039) shipped with `bitty` PR #572 (merge
  commit `f83b1e1`, CTX-0340). Panel animations (OQ-040) shipped with `bitty`
  PR #580 (merge commit `3c5878e`, CTX-0341). The shipped contract values are:

  | Shipped key                            | Default     | Values / bound                                       | Reload |
  | -------------------------------------- | ----------- | ---------------------------------------------------- | ------ |
  | `decoration.border_color`              | unset       | `#RRGGBB` / `#RRGGBBAA`                              | live   |
  | `decoration.border_color_focused`      | `#33CCFF`   | `#RRGGBB` / `#RRGGBBAA`                              | live   |
  | `decoration.border_color_idle`         | `#595959AA` | `#RRGGBB` / `#RRGGBBAA`                              | live   |
  | `appearance.animations.enabled`        | `true`      | boolean                                              | live   |
  | `appearance.animations.reduced_motion` | `"auto"`    | `auto` / `always` / `never`                          | live   |
  | `appearance.animations.duration_ms.*`  | see below   | per transition, integer `0..=500` ms                 | live   |
  | `appearance.animations.easing.*`       | see below   | `linear`/`ease_in`/`ease_out`/`ease_in_out`/`spring` | live   |

  `duration_ms` and `easing` are per-transition tables over the closed set
  `open`, `close`, `focus`, `workspace`, `move`, `resize`, `drag`
  (CTX-0967 adds the last three). Shipped defaults:

  ```lua
  duration_ms = { open = 150, close = 120, focus = 100, workspace = 200, move = 150, resize = 120, drag = 150 }
  easing = {
      open = "ease_out",
      close = "ease_in",
      focus = "ease_in_out",
      workspace = "ease_in_out",
      move = "ease_in_out",
      resize = "ease_in_out",
      drag = "ease_out",
  }
  ```

  Move/resize/drag are Hyprland-style geometry gestures (CTX-0967, `bitty`
  #1696): the layout commits immediately and only Core-owned chrome fades,
  so they share the `0..=500` ms bound, the closed easing enum, and the
  reduced-motion contract with the RFC-0002 set. Triggers are Alt-drag
  float move, border-drag divider, keyboard resize step, and
  reparent/cross-workspace/auto-create paths.

  `spring` is accepted but reserved: its
  parameters are deferred, so it resolves to `ease_in_out` until a follow-up
  RFC defines them. Durations and easing spellings fail closed with a
  source-attributed diagnostic; `enabled = false`, `reduced_motion = "always"`,
  and `bitty --safe` all collapse every duration to `0` ms while committing the
  final state instantly. Animations are renderer-side presentation chrome: they
  never interpolate grid, cursor, scrollback, or Terminal Truth, and a
  workspace transition fades Core-owned chrome only (no grid interpolation).
  This slice performs no platform reduced-motion query, so `auto` treats an
  absent signal as "animate".

- Per-View/per-panel appearance overrides (`views.<selector>.*`) and the
  focus/idle outline width (`decoration.border_width` / `_focused` / `_idle`)
  are **accepted contracts** but **not supported yet** (OQ-041 and OQ-045
  resolved 2026-09-12, docs CTX-0163;
  [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)).
  The accepted selector grammar is `*` < content type
  (`empty`/`terminal`/`rich`/`browser`) < `ws:<1..=16>` < `view:<ViewId>`,
  resolved per field per `View`; the accepted `views.*` field set is
  `border_color`/`_focused`/`_idle`, `border_width`/`_focused`/`_idle`, and
  `background_image`/`background_fit`; `opacity`, `blur`, and `animations` are
  reserved and rejected until OQ-038/OQ-043 accept them. A fatal
  `views.<selector>` field or selector rejects the whole reload; `--safe`
  ignores every `views.*` entry. No `views.*` key or `decoration.border_width*`
  key is supported; do not document one as working. `background_image_roots`
  remains global-only and cannot be widened per `View`.
- Per-panel animation overrides are **candidate and narrowed** (OQ-043;
  [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md)):
  the accepted OQ-041 layer fixes the override mechanics, so only the animation
  field set and its reduced-motion/budget interaction remain. The global
  `appearance.animations.*` contract is unchanged.
- Plugin-supplied appearance (OQ-044) and plugin-supplied images (OQ-049) remain
  **open**; the override layer is Core-owned user configuration and grants no
  plugin authority.
- The per-panel background-image contract
  (`decoration.background_image` / `decoration.background_fit` /
  `decoration.background_image_roots`) is **accepted as a contract** but **not
  supported yet** (OQ-042 resolved 2026-09-12;
  [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)).
  The accepted formats are PNG/JPEG/static WebP with bounds BG-1..BG-5 reused from
  the image-store corpus (IMG-1..IMG-5; BG-6 is a design bound, BG-7 a
  present-path bound), deny-by-default approved roots, fit modes
  `fill`/`fit`/`center`/`tile`/`stretch`, fail-closed whole-reload rejection,
  and `--safe` ignoring image contributions. Do not document the keys as
  working until `bitty` ships them; a `views.*` entry may not widen the
  approved roots, and plugin-supplied images remain open (OQ-049).

## Shipped keymaps and Mod key

Status: **shipped defaults** (read-only from `bitty` `origin/main` at
`7d98f53`, `crates/bitty-config/src/keymap.rs` and `crates/bitty-config/src/file.rs`,
with the historical CTX-0236,
CTX-0257, CTX-0258, CTX-0259, CTX-0262, CTX-0263, CTX-0264, CTX-0265, CTX-0962,
CTX-0963; merged
to `bitty` origin `main` at commits `2a5e451`, `227ca3a`, `6e662a2`,
`1ea2f66`, `8b987a0`, `bc1fbba`, `11d9bec`, `c8faa52`, plus
`0c473b05` (CTX-0962 floating toggle) and `e0ea7638` (CTX-0963 resize
step), all verified read-only
via `merge-base --is-ancestor`; the `leader_key`, `leader_timeout_ms`, and
`close_confirm` rows are read-only from `origin/main` at `c64dd1e`
(CTX-0715, CTX-0370), same verification). This section is the shipped reference for the
keybinding surface; the merge-class instantiation stays in the
[Configuration Model RFC](../specifications/configuration-model-rfc.md), and
the input-side dispatch evidence stays in the
[Input and Pointer Contract](../specifications/input-pointer-rfc.md).

Shipped schema:

```lua
-- Shipped schema (CTX-0236/CTX-0257; leader override CTX-0715; close safety CTX-0370; floating toggle CTX-0962; resize step CTX-0963).
return {
    mod_key = "alt", -- "alt" (default; opt/option) or "super" (meta/cmd/win)
    leader_key = "ctrl+q", -- legacy leader chord override; default Alt+Space (Ctrl+Space on Windows)
    leader_timeout_ms = 1500, -- legacy leader fail-open timeout in ms, 100..=60000 (default 1000)
    input = { leader = "ctrl+b", timeout_len = 1000 }, -- canonical leader surface (bitty#1650): wins over legacy keys when both are present
    close_confirm = "when_busy", -- "always" | "when_busy" (default) | "never"
    layout = { resize_step = 0.05 }, -- tiled resize delta per keypress, 0.01..=0.20, fail-closed, live (CTX-0963)
    mouse = { right = "none", middle = "paste_from_primary" }, -- button actions; RestartRequired
    keymaps = {
        { chord = "alt+h", action = "goto_split:left", context = "global" },
        { chord = "alt+a", action = "toggle_floating", context = "global" },
    },
}
```

- `mod_key` is scalar-replace with per-field source attribution. `"alt"` keeps
  the canonical map byte-identical; `"super"` rebinds every `alt`-bearing
  default (including the `ctrl+shift+alt+h/j/k/l` resize variant) to Super.
  `ctrl`/`shift` and unknown values fail closed; explicit `keymaps` entries
  keep their exact spelling and overlay by `context + chord` identity.
- `keymaps` is set-by-identifier: a user entry with the same `context + chord`
  replaces the shipped entry, anything else appends. The shipped set is
  97 entries, all context `global` (Core `DEFAULT_KEYMAPS` at `7d98f53`);
  unknown chords, actions, or contexts fail closed, and single-character keys
  require at least one modifier.
- `mouse.right` and `mouse.middle` are current shipped fields using the same
  action vocabulary as `keymaps[].action`. Their defaults are respectively
  `"none"` (inert right-click) and `"paste_from_primary"` (middle-click
  paste from the primary selection); each may be explicitly set to `"none"`
  or another supported chrome action. Both are `RestartRequired`; see the
  [reload classification inventory](#reload-classification-shipped-schema-inventory).
- `layout.resize_step` is the tiled resize granularity (CTX-0963, `bitty`
  #1697): `0.05` default, `0.01..=0.20` split-ratio delta per
  `resize_split` keypress, fail-closed (NaN, infinite, and out-of-range
  rejected, never clamped), `Live` reload read at keypress time. Lua
  accepts int or float (`layout = { resize_step = 0.05 }`); omitted
  inherits the default so existing `layout = { ... }` tables keep working.
- Floating toggle (CTX-0962, `bitty` #1695): `toggle_floating` (alias
  `floating_toggle`) flips the focused panel tiled/floating. Shipped on
  Mod-aware `alt+a` (`super+a` under `mod_key = "super"`); bare `a`
  stays shell input and `alt+v` stays deliberately free because fish
  reserves `alt+v` for `$EDITOR`. Zoom restores before the toggle;
  `Fullscreen`/`Scratchpad` fail closed with a warning and no state
  change. User-overridable by `context + chord` identity.
- `leader_key` is a fully-optional top-level scalar (CTX-0715, resolved at
  startup per CTX-0723; read-only from `bitty` `origin/main` at `c64dd1e`).
  When present it must be a chord spelling in the shared chord grammar
  (`"ctrl+q"`, `"alt+space"`); a bare letter fails closed with the
  `leader_key` field path and can never steal shell typing. Absent means the
  platform default (`Alt+Space`, `Ctrl+Space` on Windows).
- `leader_timeout_ms` is a fully-optional top-level integer (CTX-0715) for the
  leader fail-open timeout. When present it must be `100..=60000`
  (default `1000`); anything else fails closed with the `leader_timeout_ms`
  field path.
- `input.leader` / `input.timeout_len` is the canonical leader surface (`bitty#1650` via `#1748`, two-step `<Leader> <second>` only with multi-step deferred fail-closed). Each wins over its legacy alias when both are present; chord and timeout override independently.
- Shipped groups (canonical Alt spelling): new panel `alt+n`, floating
  toggle `alt+a` (CTX-0962; `alt+v` deliberately free for fish), workspace
  `alt+t` / `alt+1..9` /
  `alt+-` / `alt+=` / `alt+tab` / `alt+w` (CTX-0257, DEC-0034) plus
  `shift+alt+1..9` move-to-workspace (CTX-0259); spatial focus
  `alt+h/j/k/l`, `alt+arrows`, `ctrl+alt+arrows`; split
  `shift+alt+h/j/k/l`, `shift+alt+arrows`; resize `shift+ctrl+h/j/k/l`,
  `shift+ctrl+arrows`, `ctrl+shift+alt+h/j/k/l`, `ctrl+shift+alt+arrows`
  (CTX-0258/CTX-0262, step `layout.resize_step` CTX-0963); page `alt+u`/`alt+i`; zoom
  `alt+z`/`alt+m`/`alt+f`; focus cycle `ctrl+tab`/`ctrl+shift+tab`; clipboard
  `ctrl+shift+c`/`ctrl+shift+v`; per-window font size
  `ctrl+=`/`ctrl+plus`/`ctrl+-`/`ctrl+0` with shifted spellings (CTX-0263);
  help popup backtick chord plus `alt+?` spellings (CTX-0265).
- Named keys are bindable beyond letters and digits: `tab`, `enter`,
  `escape`, `space`, `backspace`, `delete`/`del`, `insert`/`ins`, `home`/`hm`,
  `end`, `pageup`/`pgup`/`pu`, `pagedown`/`pgdn`/`pd`, arrows, and `f1..f35`
  (CTX-0264; short aliases canonicalize to the long names).
- Single-owner consumption: a chord that matches a bound keymap is consumed by
  its action and never reaches the PTY; unbound keys (plain `Tab`, arrows,
  letters, digits) always reach the shell. Workspace close never kills
  silently: a live workspace arms a pending confirm (repeat the chord to
  confirm, `Esc` cancels) and idle workspaces close immediately. The help
  popup (CTX-0265) is a presentation-only overlay generated from the live
  registry on every show; it is informational, not modal, so unbound keys
  still reach the shell while it is visible.
- `close_confirm` is a fully-optional top-level scalar (CTX-0370; read-only
  from `bitty` `origin/main` at `c64dd1e`) selecting the view/window close
  safety: `"always"` confirms every close, `"when_busy"` (default) confirms
  while any session that the close will destroy has a foreground job beyond
  the idle shell, and `"never"` never confirms. For a CTX-1297 workspace
  prune, the doomed set includes all real panes represented by a hidden zoom
  backup and the runtime-global primary PTY when its owner is in that
  workspace; a busy job in any of them arms the confirmation. The first
  gesture leaves the layout, zoom, workspace, and sessions unchanged, the
  repeated `close_view` gesture confirms the same target, and `Esc` cancels
  without mutation. Anything else fails closed with the `close_confirm` field
  path. The workspace kill-confirm gate (CTX-0257) is a separate control and
  is not governed by this key; project layers must not declare it, so a
  repository-local file can never disable this data-loss guard. The CTX-1297
  wording is implementation evidence, not a release, merge, or tag claim.

CTX-1297 implementation evidence: the existing `close_view` action is invoked
by `Mod+q`. On the last tiled panel, it prunes the empty workspace and follows
the surviving workspace when another workspace still owns panels; the
whole-window last-panel path remains window close. A workspace with detached
or local floats is retained while its tiled shell closes. Zoom mutations
restore the real layout first; multi-pane zoom closes only the focused real
leaf, while single-pane zoom may prune. This paragraph records implementation
evidence only and makes no release, merge, or tag claim.

Open: whether the shipped set grows CLI flags or a command-palette surface;
the leader chord override plus bounded fail-open timeout above are shipped
(CTX-0715/CTX-0723), while Leader sequences and flash-style jump remain
unimplemented candidates in the [Input and Pointer Contract](../specifications/input-pointer-rfc.md).
Candidate configuration surfaces are not accepted and have no schema yet, so
none of them may be documented as working: bounded modal use of the leader
beyond the shipped override ([OQ-088](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)), and the Bitty Beacon label
pools, handedness preference, and script-action registrations
([OQ-089](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md),
[Semantic Terminal RFC](../specifications/semantic-terminal-rfc.md#p7-bitty-beacon-spatial-action-engine-candidate)).

## Mouse button bindings (shipped defaults)

Status: **implementation reference** for `bitty` #2474 (task CTX-1449). This
section records the behavior implemented for that issue and makes no release,
merge, or tag claim. It changes no normative contract above and weakens no
security control.

Shipped schema:

```lua
-- Shipped schema (bitty#2474).
return {
    mouse = {
        right = "none", -- explicit no-op: no paste, no dialog, no PTY bytes
        middle = "paste_from_primary", -- Linux middle-click selection paste
    },
}
```

- Both buttons accept `"none"` or any chrome-action spelling from the
  `keymaps[].action` vocabulary (`paste_from_clipboard`, `paste_from_primary`,
  `copy_to_clipboard`, `toggle_help`, `command:<owner:cmd>`, and the rest of
  the catalog). Unknown spellings and non-string values fail closed with the
  owning field path (`mouse.right` / `mouse.middle`), never coerced.
- Every `mouse` leaf is independent and presence-gated: a layer that omits
  `mouse.right`/`mouse.middle` (or `focus_follows_mouse`, or its delay) says
  nothing, so the lower-precedence value survives with its attribution and
  the shipped default applies only when no layer declares the leaf. A
  hover-only table or an empty `mouse = {}` therefore never resets a profile
  binding, and a policy layer that pins one button does not pin the other.
- `right` ships as `"none"`: a right-click is host chrome with no action. It
  reads no clipboard, opens no suspicious-paste dialog, and writes no PTY
  bytes, so an accidental right-click over a multi-line clipboard cannot trap
  the user behind the confirmation gate (owner directive for 0.0.26).
- `middle` ships as `"paste_from_primary"`, the Linux middle-click selection
  paste, and stays configurable (including `"none"`) like any other binding.
- Both buttons dispatch through the same `ChromeAction` path as a bound chord:
  no parallel mouse action table exists. `bitty list actions` reports the
  bound buttons beside each action's chord (`mouse` field). The
  `bitty inspect config` lookup reports the shipped default, and
  `bitty config check` reports the effective value and source.
- A binding that pastes still passes the CTX-0186 suspicious-paste gate:
  multi-line or otherwise suspicious text waits for an explicit confirmation,
  and the default `none` never reads either selection.
- Capture precedence is unchanged: a pane that enabled mouse reporting
  (`DECSET 1000`/`1002`/`1003` plus `1006`) receives the button as bounded SGR
  protocol bytes, and no host action runs. Shift remains the unconditional
  capture escape.
- Merge and reload: scalar-replace with per-field source attribution,
  restart-required (adopted into the runtime configuration at startup), and a
  project layer may not bind either button.

## Reload classification (shipped schema inventory)

Status: **implementation reference** read-only from `bitty` `origin/main` at
`7d98f53` (verified read-only via `merge-base --is-ancestor`; the
`appearance.colors`, `leader_key`, `leader_timeout_ms`, and `close_confirm`
rows below are included in that current revision).
The accepted
framework is the
[Configuration Model RFC](../specifications/configuration-model-rfc.md)
"Reload classification" section (OQ-010). Classification is declared by the
schema in `bitty` `crates/bitty-config/src/reload.rs` (`classify_field`), never
inferred at runtime, and reload reuses the startup validation and merge path.
This section is the per-field inventory the RFC defers; it changes no normative
contract and weakens no security control.

| Class             | Meaning                                                                      |
| ----------------- | ---------------------------------------------------------------------------- |
| Live-reconcilable | Applied by diff-and-reconcile to running instances without restart           |
| Restart-required  | Accepted and persisted, effective after the next process start               |
| Rejected          | Validation failure; the previous good plan stays active, diagnostics emitted |

Shipped leaf inventory:

| Key                                                                                          | Class    | `bitty --safe`       |
| -------------------------------------------------------------------------------------------- | -------- | -------------------- |
| `font.family`, `font.size`, `font.line_height`, `font.letter_spacing`                        | live     | built-in default     |
| `window.opacity`, `window.padding`, `window.radius_px`                                       | live     | built-in default     |
| `decoration.gaps_in`, `decoration.gaps_out`                                                  | live     | `0`, `0`             |
| `decoration.border`, `decoration.radius`, `decoration.content_inset`                         | live     | `1`, `0`, `0`        |
| `decoration.border_color`                                                                    | live     | unset                |
| `decoration.border_color_focused`, `decoration.border_color_idle`                            | live     | `#FFFFFF`, `#808080` |
| `decoration.border_width`, `decoration.border_width_focused`, `decoration.border_width_idle` | live     | `1`, `1`, `1`        |
| `appearance.theme`                                                                           | live     | built-in default     |
| `appearance.colors`                                                                          | live     | unset                |
| `appearance.animations.enabled`, `appearance.animations.reduced_motion`                      | live     | built-in default     |
| `appearance.animations.duration_ms.*`                                                        | live     | `0` ms               |
| `appearance.animations.easing.*`                                                             | live     | built-in default     |
| `mod_key`, `keymaps`                                                                         | live     | built-in default     |
| `leader_key`, `leader_timeout_ms`                                                            | live     | built-in default     |
| `terminal.scrollback`, `terminal.shell`                                                      | restart  | built-in default     |
| `terminal.scroll_lines_per_notch`, `terminal.scroll_pixels_per_notch`                        | restart  | built-in default     |
| `selection.auto_copy`                                                                        | restart  | built-in default     |
| `close_confirm`                                                                              | restart  | built-in default     |
| `layout.gaps_in`, `layout.gaps_out`                                                          | restart  | built-in default     |
| `layout.resize_step`                                                                         | live     | built-in default     |
| `scrollbar.mode`, `scrollbar.width`                                                          | restart  | built-in default     |
| `mouse.focus_follows_mouse`, `mouse.focus_follows_mouse_delay_ms`                            | restart  | built-in default     |
| `mouse.right`                                                                                | restart  | `none`               |
| `mouse.middle`                                                                               | restart  | `paste_from_primary` |
| `plugins[].id`, `plugins[].enabled`                                                          | restart  | built-in default     |
| unknown or undeclared key                                                                    | rejected | n/a                  |

- `duration_ms` and `easing` are per-transition tables over the closed set
  `open`, `close`, `focus`, `workspace`, `move`, `resize`, `drag`;
  `.*` abbreviates the seven leaves (CTX-0967 adds the last three).
- The `bitty --safe` column records the pinned value where `--safe` forces one.
  "built-in default" means the key is not force-pinned beyond normal core
  defaults, but every external layer is skipped entirely (`fallback_builtin`,
  R-009), so the built-in default is the value in effect.
- Restart-required keys are accepted and persisted but need the next process
  start: `terminal.shell` and `terminal.scrollback` are spawn-time state, and
  `selection.auto_copy`, `layout.gaps_in`/`gaps_out`, `scrollbar.*`, and
  `mouse.*` are adopted into the runtime configuration once at startup.
- **Activation status.** "Live-reconcilable" is the declared class, and every
  `Live` key has a runtime adopter. `reconcile_live` has a production caller:
  the composition root installs a reload context at startup (skipped under
  `--safe`), and both `bitty ctl config reload` and an automatic file poll
  (mtime + length at most every 500 ms, so atomic-rename writes are seen
  without a per-frame `stat`) drive the same path. A live reload diffs the
  incoming file against the active config, and on an all-`Live` change adopts
  it. The runtime live-adopt setters are driven from the resulting
  `RuntimeConfig`: `set_theme_palette` (`appearance.theme` / `colors`; live
  OSC 4/10/11/12 overrides are kept), `set_decoration`, `set_outline`,
  `set_outline_widths`, `set_background_appearance`
  (`decoration.background_*` and `views`; the fail-closed image pipeline and
  the RFC-0001 AC-1/AC-2 check against every existing View run before any
  swap), `set_animations`, `set_window_padding`, `set_window_radius_px`,
  `set_font_face` (`font.family`, `font.size`, `font.line_height`, and
  `font.letter_spacing` in one atlas rebuild; the face loads before commit,
  then the grid reflows), `set_window_opacity` (GPU surface alpha), and the
  workspace-bar setters. The theme and outline colors and widths are
  installed before the per-View check, and a rollback restores the previously
  decoded backgrounds from memory. The app-owned keys (`keymaps`, `mod_key`,
  `leader_key`, `leader_timeout_ms`, `hints_enabled`, and the window
  transparency hint for `window.opacity`) are re-resolved with the startup
  resolvers and adopted on the same tick; a Leader window or hint session
  armed under the old bindings is cancelled. Any resolve or setter error
  rolls the reload back and reports `apply-error`. On X11, winit honors the
  transparency hint only at window creation, so raising transparency on a
  window that started opaque can stay visually opaque until restart; the
  renderer half still adopts. The control reply reports
  `{"reloaded":true,"applied":<bool>,"kind":...,"path":...,"changed":[...],"restart_required":[...]}`;
  `restart_required` lists changed `Live`-class fields without a runtime
  adopter, which is currently none. A change that needs a restart or a
  rejected key keeps the previous good plan active (`should_retain_previous`)
  and applies nothing. With no reload context installed (for example a
  config-probing or `--safe` process) the reply degrades to the older
  probe-only `"hot_swap":"follow-up"` shape, which validates the file without
  applying it.
- Unknown and undeclared keys are rejected by validation; the previous good
  plan stays active (`should_retain_previous`).
- Per-plugin settings files are outside this inventory and outside the live
  reload path: each is read at plugin activation and its resolved map is
  pinned to that generation. `bitty ctl config reload` and the file poll do
  not reread them; a new activation (for example a process restart) applies
  edits. See [Restricted plugin settings Lua](#restricted-plugin-settings-lua).

## Starters and distributions

Status: **accepted direction.**

Bitty core remains minimal. Starter configurations and distributions use the
same public configuration and plugin contracts available to the community;
official distributions do not receive hidden core branches.

Candidate initial experiences are:

- `minimal`: one small `init.lua`;
- `starter`: a commented modular scaffold comparable to `kickstart.nvim`;
- a later official distribution containing ordinary plugins for workspace,
  statusline, search, sessions, command palette, and sensible key mappings.

Distributions should layer under user overrides rather than require users to
fork and continually merge a copied configuration:

```lua
-- Candidate API only.
local distro = require("bitty.distro")

return distro.extend("bitty-terminal/starter", {
    font = { family = "Maple Mono" },
    plugins = {
        { "example/bitty-markdown" },
    },
})
```

The distribution mechanism, source, trust model, and multiple-extends behavior
are unresolved. Neovim legacy directories such as `after/`, `ftplugin/`, and
`autoload/` should not be copied without a Bitty-specific requirement.

## Local project configuration

Status: **accepted direction.**

Bitty must never execute an unfamiliar project's Lua merely because the user
entered its directory. Project configuration, if introduced, needs explicit
workspace trust and should expose a restricted declarative schema.

Status: **candidate behavior.**

A `.wheel.lua` could request a profile or environment values. On first use,
Bitty asks the user to trust it once, trust it persistently, or reject it.
Process execution and unrestricted host APIs remain unavailable to local
configuration. This feature is deferred until the trust model is designed.

Status: **candidate direction.**

A project could also carry a declarative `.wheel/` project definition (for
example `project.toml`, `agents/`, `workflows/`, `prompts/`, `policies/`,
`tools/`, and `skills/`), portable and safe to commit to Git because it holds
definitions only. Dynamic runtime state — current task, agent sessions,
execution logs, token statistics, runtime locks, overlays, and any database —
must never live in `.wheel/`; it belongs to repository-local or user runtime
state so the project tree stays clean.

`.agents/` is a compatibility adapter rather than a second source of truth,
and candidate project discovery resolves in one order:

```text
.wheel/          native project definition (highest fidelity)
.agents/         compatibility adapter for existing agent conventions
AGENTS.md etc.   contextual conventions, never configuration authority
```

Candidate rules: `.wheel/` wins where both exist, a conflict is reported
rather than merged silently, and the declarative-data-only rule for project
content is unchanged. The directory name, schema, trust mechanics, and adapter
scope are undecided; tracked as
[OQ-068](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).

## Data, state, cache, and runtime layouts

Status: **candidate layouts.**

```text
$XDG_DATA_HOME/bitty/
├── plugins/
├── themes/
└── runtime/

$XDG_STATE_HOME/bitty/
├── sessions/
├── layouts/
├── history/
├── crash/
└── plugin-state/

$XDG_CACHE_HOME/bitty/
├── fonts/
├── glyphs/
├── plugins/
├── shaders/
└── registry/

$XDG_RUNTIME_DIR/bitty/
├── instances/
├── sockets/
└── locks/
```

Installed themes belong in data; a user's own theme source lives in config.
`bitty` 0.0.26 implements an **implemented-only candidate** read path for
`$XDG_CONFIG_HOME/bitty/themes/*.toml`, selected explicitly as
`local:<name>`; the 30 built-in presets remain compiled into the binary and
select through `appearance.theme` with no file I/O, while inline
`appearance.colors` stays a shipped custom-color surface. The config
`themes/` directory is therefore no longer inert, but its schema and trust
model are not accepted until OQ-047 closes; the `$XDG_DATA_HOME/bitty/themes/`
installed-theme half remains a candidate layout with no loader. See the
[theme preset catalog](themes.md) and the
[Local Theme Files design note](../specifications/local-theme-files-candidate.md)
for the candidate schema, bounds, readability gate, and open questions. Cache is
rebuildable.
Runtime sockets and locks belong to the login session, while sessions and
layouts intended to survive restart belong in state.

A candidate generator path extends [OQ-047](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md):
a tool such as Matugen writes a `local:<name>` theme file with
`background`, `foreground`, and the 16 ANSI entries under the config
`themes/` directory; the existing configuration tick observes the file change
and reparses it, and Core applies the accepted palette through the normal
theme setter with no PTY reset. The implemented-only candidate and its bounds
are in the [Local Theme Files design note](../specifications/local-theme-files-candidate.md);
generated-file ownership, generator invocation, and schema acceptance remain
OQ-047 work. Dynamic palette sequences (`OSC 4`) and dynamic
foreground/background (`OSC 10`/`OSC 11`) are shipped behind the default-deny
`set_osc_color_set_allowed` capability gate (CTX-0381, CTX-0392).

## Cross-platform paths

Status: **candidate contract.**

XDG names must not leak into portable plugin APIs. Core resolves a semantic path
set:

```rust
// Candidate type shape.
struct BittyDirs {
    config: PathBuf,
    data: PathBuf,
    state: PathBuf,
    cache: PathBuf,
    runtime: PathBuf,
}
```

Linux/BSD can use XDG; macOS and Windows should use a documented native mapping
with an explicitly designed XDG-compatibility option if desired. Plugins query
semantic host paths rather than concatenate `HOME` with `/.config/bitty`.
An XDG-compatibility override is explicit and opt-in, never implicit; the exact
mapping, precedence, and migration rules remain open.

Status: **candidate contract, unimplemented.** No `BittyDirs` symbol exists in
the `bitty` tree yet. The shipped code resolves only the configuration root
(read-only from `bitty` `origin/main`, `crates/bitty-config/src/file.rs`):
`$XDG_CONFIG_HOME` > `%APPDATA%` > `$HOME/.config` > `%LOCALAPPDATA%`, with
the Windows variables participating through the platform-aware probe
(CTX-0479, `bitty` #774); data, state, cache, runtime, and bin resolution plus
every native mapping below are candidates. The table uses relative forms only
(environment-variable roots, never absolute host paths).

| Role    | Linux / BSD                 | macOS (candidate)                                              | Windows (candidate)                                                                 |
| ------- | --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Config  | `$XDG_CONFIG_HOME/bitty`    | `~/Library/Application Support/bitty`                          | `%APPDATA%\bitty` (roaming; also the plugin lock file)                              |
| Data    | `$XDG_DATA_HOME/bitty`      | `~/Library/Application Support/bitty`                          | `%LOCALAPPDATA%\bitty` (non-roaming; candidate `data\` split)                       |
| State   | `$XDG_STATE_HOME/bitty`     | `~/Library/Application Support/bitty` (no separate state role) | `%LOCALAPPDATA%\bitty` (candidate `state\` split; never roams)                      |
| Cache   | `$XDG_CACHE_HOME/bitty`     | `~/Library/Caches/bitty`                                       | `%LOCALAPPDATA%\bitty` (candidate `cache\` split; never roams)                      |
| Runtime | `$XDG_RUNTIME_DIR/bitty`    | `$TMPDIR/bitty-<uid>/` (per-user temp)                         | Named pipe `\\.\pipe\bitty-<instance-id>` (current-user DACL; no filesystem socket) |
| Bin     | `~/.local/bin` (user scope) | `/Applications/Bitty.app` or `~/Applications`                  | `%LOCALAPPDATA%\Programs\Bitty` (per-user scope)                                    |

Notes on the candidate mapping:

- Roaming versus local on Windows: configuration roams with the user profile
  (`%APPDATA%`); rebuildable caches, session state, and data stay machine-local
  (`%LOCALAPPDATA%`) so roaming profiles never sync them.
- Runtime IPC on Windows uses named pipes rather than Unix-domain sockets. The
  endpoint is `\\.\pipe\bitty-<instance-id>`: the pipe carries a protected
  current-user-only DACL, and endpoint peers are checked by process-token SID
  comparison on connect. Cross-user separation therefore comes from the ACL and
  SID check, not from a user-name segment in the pipe name.
- File modes are POSIX-only: the `0600` tiers below map to per-user NTFS DACLs
  scoped to the current user SID on Windows (see
  [Credential sources](#credential-sources-and-secret-storage-candidate)).
- macOS has no separate state role: sessions, layouts, and history live under
  Application Support alongside data; only cache splits out.

> Implementation note (Implemented-only, CTX-1405): `bitty-ipc` maps an instance
> id verbatim to `\\.\pipe\bitty-<instance-id>` (`windows_pipe_name`), and the
> Windows listener creates the endpoint with a protected current-user-only DACL
> and re-attests each connected instance; clients reject a server whose
> process-token SID is not the current user
> (`crates/bitty-ipc-devtools/src/devtools.rs`,
> `crates/bitty-ipc-winpipe/src/pipe.rs`). The endpoint and protection are the
> accepted transport in the
> [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
> (OQ-018). The directory-role mapping above remains a candidate; this note
> claims no Verified status.

### Environment variables and path overrides

Configuration and runtime paths are controllable through explicit environment variables alongside CLI flags:

| Variable                      | Target and semantics                   | Precedence and scope                                                                                                           |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `BITTY_CONFIG`                | Explicit configuration file path       | `--config <PATH>` > `BITTY_CONFIG` > probed defaults; fails closed (exit 2) if missing                                         |
| `BITTY_PROFILE`               | Named configuration profile            | `--profile <NAME>` > `BITTY_PROFILE` > persisted `init.lua` selector; loads `profiles/<name>.lua`; never an init output target |
| `BITTY_SOCKET`                | IPC socket or named pipe path override | Overrides platform-default runtime socket / named pipe path                                                                    |
| `BITTY_PLUGIN_DIR`            | Plugin search and load root override   | Local plugin testing and staging                                                                                               |
| `BITTY_LOG` / `BITTY_VERBOSE` | Logging filter and verbosity           | `--log-level` > `--verbose`/`BITTY_VERBOSE=1` > `BITTY_LOG` > default quiet                                                    |
| `BITTY_FAIL_LOUD`             | Abort immediately on startup fault     | Turns shell or IPC startup errors into fatal aborts (exit 1)                                                                   |

Precedence order for the configuration file is strict:

1. CLI flag `--config <path>` (highest precedence, explicit).
2. Environment variable `BITTY_CONFIG` (honored when `--config` is absent).
3. System default probe: `$XDG_CONFIG_HOME/bitty/init.lua` > `%APPDATA%\bitty\init.lua` > `$HOME/.config/bitty/init.lua` > `%LOCALAPPDATA%\bitty\init.lua`.

When `--config` or `BITTY_CONFIG` is explicitly specified, the target file must exist. If it is missing, Bitty exits immediately with error code 2; it never silently falls back to the default configuration.

### Environment isolation and the PTY boundary

Bitty enforces strict process and memory boundaries between the terminal host and child PTY processes:

- **Config VM isolation:** Lua configuration code cannot call `os.getenv` (denied fail-closed with `E_ENV_DENIED`, [ADR 0006](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0006-os-env-policy.md)). Configuration reads environment variables solely through the mediated `bitty.env.get(name)` host bridge under an allowlisted key set.
- **PTY child-to-parent boundary:** In Unix process models, environment mutations in child processes (`export FOO=bar` in bash/zsh or `set -x FOO bar` in fish) exist only within the child shell's memory space and its descendants. A child process cannot mutate parent process environment variables.
- **Immutable VM snapshot:** Bitty captures the allowed environment snapshot once at VM construction time. Environment changes in the host process or child PTYs do not retroactively alter a running Config VM or plugin VM, protecting against Confused Deputy attacks.
- **Dynamic control:** Terminal settings (such as themes, layouts, or font sizes) are modified dynamically via authenticated IPC commands (`bitty ctl theme set <name>`), never through ambient environment pollution.

Candidate discovery commands include:

```sh
bitty paths
bitty config path
bitty config check
bitty config show --source
bitty config diff
```

These commands are further described in [CLI](../interfaces/cli.md).

## Credential sources and secret storage (candidate)

Status: **candidate.** API keys and comparable secrets are never hardcoded in
`init.lua`, committed, or written to world-readable files. Candidate sources,
in preference order:

1. Environment bridge: configuration declares the variable name
   (`api_key_env = "ANTHROPIC_API_KEY"`); the value is read at request time and
   never persisted by Bitty. This tier is capability-scoped per
   [ADR 0006](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0006-os-env-policy.md):
   `os.getenv` stays denied in every VM and the only path is the desensitized
   `bitty.env.get(name)` / `bitty.env.has(name)` host bridge. Keys must match
   `^[A-Z_][A-Z0-9_]*$` (1..64 bytes), values are size-bounded (4 KiB), and a
   denied or unset key returns `nil` indistinguishably so callers cannot probe
   allowlist membership. The allowlist is host-owned and never Lua-widenable;
   per-plugin VMs additionally need a manifest `env:<KEY>` (or narrow
   `env:BITTY_*`) capability plus an explicit user grant. There is no
   enumeration API. Every result is tagged sensitive: diagnostics, traces, crash
   reports, and `bitty config check` output redact values by default (key name
   and presence only), denial messages never echo values, local trace files
   carry mode `0600`, and every `get`/`has` call plus every grant/revocation
   emits a host-side audit event (`timestamp`, `vm_class`, `key`, `granted`,
   `caller_location` — never the value).
2. OS keyring: an async host API requests the secret from Secret Service
   (Linux), Keychain (macOS), or Windows Credential Manager / DPAPI (Windows).
3. Dedicated headless store: a `credentials.toml` file under the configuration
   root (`$XDG_CONFIG_HOME/bitty/credentials.toml`,
   `%APPDATA%\bitty\credentials.toml`) carrying owner-only mode `0600`,
   opened only after explicit `ai.provider` authorization, with each access
   audited. On Windows the `0600` requirement maps to its NTFS DACL
   equivalent: a per-user discretionary access list scoped to the current user
   SID, with no access granted to other accounts.

The host reports source and presence, never the value. Rotation, revocation,
and redaction follow [ADR 0006](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0006-os-env-policy.md)
and the security corpus, and diagnostics redact secret-shaped values
(`*_SECRET*`, `*_TOKEN*`, `*_KEY*`, `*_PASSWORD*`, `DATABASE_URL`, and similar
patterns). Precedence across the three tiers and keyring-unavailable fallback
remain open.

## Plugin host process.spawn surface (candidate mechanism record)

Status: **candidate record** — shipped mechanism in `bitty` `origin/main`
(read-only: CTX-0445 [bitty PR #717](https://github.com/bitty-terminal/bitty/pull/717)
merge `9830edb`, CTX-0444 [bitty PR #716](https://github.com/bitty-terminal/bitty/pull/716)
merge `64e1709`), not an accepted terminal-docs contract. This section records
the Lua-visible shape and references the canonical contracts by link; it copies
no struct or allowlist that would rot. It changes no normative contract above
and touches no accepted ownership table in
[Core and Plugin Boundaries](../architecture/core-boundaries.md).

Placement rationale: this document already records the first Lua-visible host
bridge (`bitty.env.get` in [Credential sources](#credential-sources-and-secret-storage-candidate));
`bitty.process.spawn` is the second such bridge, aimed at the same Lua-author
reader with the same fail-closed bounded-bridge posture. The accepted
panel-runtime specifications and the plugin capability-matrix rows that already
name `process.spawn` shapes are left untouched: this record adds a
pointer-friendly inventory without editing their normative or candidate text.

### Lua call shape

Status: **shipped mechanism** (bridge shape test-pinned in `bitty`).

Lua supplies only the argv array; the tool identity is resolved host-side from
the caller's install grant, so there is no Lua-widenable tool parameter:

```lua
-- Verified shape (bitty crates/bitty-lua/tests/host_bridge.rs).
local result = bitty.process.spawn({ "status", "--porcelain" })
-- result: { output = "...", stderr = "...", truncated = false,
--           exit_code = 0, untrusted = true }
```

The argv must be a dense 1-based string array: empty, sparse, non-string, or
empty-entry shapes fail closed at the bridge. The `bitty.process` table is a
read-only proxy like the other host tables. Bridge shape bounds are 64 entries
of at most 4 KiB each; tighter per-tool bounds live host-side with the
allowlist and are linked, not copied, below.

### Result table

Status: **shipped mechanism**.

Every successful spawn delivers `output` (bounded stdout), `stderr`,
`truncated`, `exit_code` (nil when the outcome is unknown), and `untrusted`
(always true): child bytes are untrusted observation data, never instructions.
Failure text on the error path is host-authored and carries only the observed
exit code, never child bytes.

### Error codes

Status: **shipped mechanism** (all codes verified first-hand on `bitty`
`origin/main`; note the spawn timeout code is `E_SPAWN_TIMEOUT`, not the
generic bridge `E_TIMEOUT`).

| Code                                               | Domain         | Meaning                                                                                                                            |
| -------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `E_SPAWN_UNAVAILABLE`                              | runtime        | no spawn backend is wired for this VM or generation (the `HostServices` default)                                                   |
| `E_CAPABILITY_DENIED`                              | runtime        | the `process.spawn:<tool>` grant gate refused: missing scope, or consent required, expired, or revoked (re-checked on every call)  |
| `E_SPAWN_DENIED`                                   | runtime/budget | shape violation, allowlist denial (including the interim authorizer below), unknown tool or missing declaration, or budget overrun |
| `E_SPAWN_FAILED`                                   | runtime        | spawn or host failure, including non-zero exits (message carries only the exit code) and non-timeout unknown outcomes to reconcile |
| `E_SPAWN_TIMEOUT`                                  | runtime        | timeout-path unknown outcome: the child was killed and reaped, with no exit code                                                   |
| `E_VALUE_TYPE` / `E_VALUE_NODES` / `E_VALUE_BYTES` | value          | malformed argv at the bridge (non-array, empty, sparse, non-string, empty entry, entry-count or byte-limit excess)                 |
| `E_BRIDGE_REENTRANT`                               | runtime        | re-entrant bridge call rejected (the one guard `process.spawn` keeps)                                                              |

The generic cheap-call `E_TIMEOUT` (budget domain) does not apply to
`process.spawn`: see [Bridge accounting](#bridge-accounting-no-orphan-leak)
below.

### Execution hardening

Status: **shipped mechanism** (qualitative record; the implementation is linked,
not copied).

Argv arrays go directly to the OS process API: no shell is ever constructed on
any platform, so metacharacters in args are inert data. The child starts from a
cleared environment plus explicit request entries only; ambient environment
never crosses the boundary. Explicit entries are validated against a
host-side denylist before routing, scope, or consent, closing the env-encoded
forms of vectors the argv gate already rejects: `GIT_CONFIG_*` (including the
numbered key/value pair families), the external-process helpers
`GIT_EXTERNAL_DIFF`/`GIT_DIFF_OPTS` plus the editor/ssh/askpass variables, and
the repo-identity escapes `GIT_DIR`/`GIT_WORK_TREE` fail closed, with ASCII
case-insensitive and numbered-family prefix matching so a case-folded Windows
env lookup cannot bypass (`bitty` #806, CTX-0488; predicate in
[tools.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-plugin-host/src/tools.rs)).
Stdout and stderr drain concurrently on two bounded
reaper threads, so a verbose child cannot wedge the pipes; the supervisor
enforces the timeout, kills and reaps on expiry (no zombie), and reports the
outcome as unknown rather than success or failure. Byte output converts lossily
to text; only portable process APIs are used.

Dispatch composes six fail-closed gates with no partial state on refusal:
shape, allowlist routing, scope authorization, explicit effect opt-in, ledger
consent, and supervised outcome.

### Lua-visible bounds

Status: **shipped mechanism** (numeric record for the Lua-visible surface only;
deeper struct and per-tool bounds are linked, not copied).

- Argv: at most 64 entries, each at most 4 KiB, 16 KiB total.
- Supervision timeout: 1 to 30000 ms, default 5000 ms.
- Panel-path per-call output: 8 KiB, so spawn output always fits the panel bus
  admission bound.
- Tracked outcomes: 64; bursts beyond the registry fail closed instead of
  evicting silently.

The bound inheritance (IPC execution, channel, tool-dispatch, and panel-bus
precedents) is documented in the `Bounds` section of
[spawn.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/plugin_runtime/spawn.rs);
the bridge entry validation lives in
[host.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-lua/src/host.rs).

### Bridge accounting (no orphan leak)

Status: **shipped mechanism**.

`process.spawn` is exempt from the bridge's post-hoc 50 ms cheap-call deadline
but keeps the re-entrancy guard (`bounded_spawn` in `host.rs`): a
slow-but-successful spawn is delivered instead of being run to completion,
stored, and then discarded as a timeout, which would orphan a registry slot Lua
can never reconcile. Every stored spawn outcome is therefore a delivered
outcome; the 64-slot bound covers delivered outcomes only.

### Tools-enforcement references (CTX-0444)

Status: **shipped mechanism** (install- and validate-time enforcement plus pure
predicates; the runtime seam below is still interim).

The canonical Layer-2 contract is the accepted `[tools.git]` slice (v1) in the
[Layer-2 System CLI specification](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/packaging/plugin-reuse-and-providers.md)
(`Accepted [tools.git] contract (v1)`, CTX-0425): that document owns the verb
list and per-tool bounds, which are linked here and never copied. The host
enforcement that merged in `bitty` PR #716:

- The install-path manifest reader accepts `[tools.git]` alongside quoted
  capability keys and `[[capabilities.filesystem]]`; unknown sections and
  bypass shapes fail closed
  ([manifest_toml.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/plugin_runtime/manifest_toml.rs),
  [package.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/plugin_runtime/package.rs)).
- Each `[tools.<name>]` declaration is validated, paired in both directions
  with its `process.spawn:<tool>` capability (a spawn capability without a
  tool declaration, or a tool declaration without its capability, fails
  closed), and hash-bound under manifest hash v3, so raising `required` from
  false to true is a capability increase whose grant must be re-confirmed
  ([manifest.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-plugin-host/src/manifest.rs)).
- The pure allowlist predicates (accepted tool, tool-name grammar, verb and
  flag policy) live in
  [tools.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-plugin-host/src/tools.rs)
  with no I/O: the spawn surface must call them, never re-implement them.
  Review hardened the flag policy beyond the v1 spec text; that delta is owned
  bitty-side (see the PR #716 body) and is not reconciled here.

The runtime seam is the `SpawnAuthorizer` trait in `spawn.rs`, still served by
the fail-closed `DenyAllAuthorizer` interim on `bitty` `origin/main`: the
surface is fully wired through the grant gate, but execution denies everything
until the production authorizer against the installed manifest table lands.
The per-generation grant gate and backend injection live in
[services.rs](https://github.com/bitty-terminal/bitty/blob/main/crates/bitty-runtime/src/plugin_runtime/services.rs).

### Sequel, explicitly not claimed

Per-spawn UI prompting that refreshes consent, per-spawn working-directory
plumbing from terminal state, `execution_id` surfacing for Lua-side reconcile,
exit-code-tolerant handling, binary-safe transport, and the production
authorizer wiring above are sequel work. Nothing in this section claims them.

## Security review

The normative security sources above remain authoritative. Restricted plugin
settings supply values only, with no host authority; file rejection preserves
lower layers. The merged diagnostics are host-internal implementation evidence,
not independent security verification or closure of any security risk.

## Verification plan

Compare plugin settings claims with the pinned Core sources in the
[configuration reference](../reference/configuration-options.md), including
canonical selection, alias ambiguity, rejected-file fallback, declared-key
filtering, and Lua versus TOML bounds. Run the repository's documentation,
link, metadata, language, and hygiene gates. Cross-platform and release claims
require their own implementation evidence.

## Alternatives considered

The configuration pipeline alternatives and their dispositions are recorded in
the [Configuration Model RFC](../specifications/configuration-model-rfc.md#pipeline-candidates).
Ambient module resolution and imperative live mutation remain subject to those
accepted boundaries and the candidate qualifications above.

## Affected contracts

This page depends on the accepted configuration model, plugin settings API,
Lua runtime, and security baseline linked above. The settings status and bounds
correction changes implementation evidence only; it introduces no policy,
schema, capability, or installation contract.

## Open points

### Open questions

- What exact Lua version/runtime and standard libraries are available in the
  configuration VM?
- What are the module search rules and trusted-module boundaries?
- What is the final typed configuration schema and source-location model?
- Two-stage `ConfigPlan` and Rust validate/diff/reconcile pipeline is accepted in [Configuration Model RFC](../specifications/configuration-model-rfc.md) (OQ-010, 2026-08-27); remaining per-field and tooling details are follow-up work.
- Are system defaults and policy expressed in Lua or a restricted data format?
- Which layer types may be non-overridable, and how are policy errors reported?
- What are the final list, keymap, and plugin merge semantics?
- Reload classification is the accepted framework with a shipped per-field
  inventory (see [Reload classification](#reload-classification-shipped-schema-inventory));
  the canonical table still moves to the
  [Configuration Model RFC](../specifications/configuration-model-rfc.md)
  once the schema stabilizes.
- What are the native macOS and Windows directory mappings?
- What is the trust database location and invalidation rule for local project
  configuration?
- What is the `.wheel/` project-definition directory contract (layout, schema,
  Git-tracked versus runtime-state split, and trust), and how does `.agents/`
  compatibility resolve against it without becoming a competing source of
  truth? ([OQ-068](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md))
- Which remaining appearance knobs beyond the shipped set (workspace/tab label
  position, frame and margin-line color, per-surface background opacity, blur)
  are adopted, and under what render/compositor contract?
  (OQ-036/OQ-037/OQ-038;
  [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md);
  OQ-039 focused/idle outline colors is accepted and shipped.)
- Which panel transitions animate, with what bounded durations/easings and
  reduced-motion behavior? ([OQ-040](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  [Panel Animations and Effects RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md);
  accepted and shipped in `bitty` `3c5878e`; `appearance.animations.*` is a
  supported `init.lua` key.)
- The per-View/per-panel appearance override contract (selector grammar,
  precedence, inheritance, reload, fail-closed validation, safe mode, and
  per-View contrast) and the focus/idle outline-width contract are accepted
  ([OQ-041/OQ-045](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), resolved 2026-09-12, docs
  CTX-0163;
  [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)).
  What remains open is the per-panel animation override field set
  ([OQ-043](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), narrowed) and plugin-supplied
  appearance ([OQ-044](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)), with plugin-supplied
  images under [OQ-049](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md);
  [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md).
  Accepted-but-unshipped, not a supported `init.lua` key yet.
- The per-panel background-image contract is accepted
  ([OQ-042](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), resolved 2026-09-12); the
  plugin-supplied-image path remains open as
  [OQ-049](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md), and no image key is supported yet.
- What are the final manifest/lock names, and how do they coexist with Lua
  plugin specifications or distribution imports?

## Acceptance criteria

Configuration claims must retain their accepted, candidate, implemented-only,
or deferred qualification. Settings limits must match the owning loader and
parser; rejection must preserve existing precedence and capability boundaries.
A Verified or stable claim requires separate evidence and acceptance.

## P0 Review Sign-off

This documentation correction records no new P0 sign-off or security-risk
closure. Independent post-merge review of the correction remains required
before task acceptance; merged source alone does not establish Verified status.

## References

- [Configuration Model RFC](../specifications/configuration-model-rfc.md).
- [Configuration options reference](../reference/configuration-options.md),
  including pinned implementation sources for Lua and legacy TOML settings.
- [Core PR #2198](https://github.com/bitty-terminal/bitty/pull/2198): merged
  host-internal settings diagnostics.
