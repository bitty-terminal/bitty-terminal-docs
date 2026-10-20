---
title: Extension, Plugin, and Component Directory Semantics
description: Defines which on-disk and distribution directories hold upstream prebuilt extensions, downstream Lua plugins, and reserved boot-required components.
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 24
---

# Extension, Plugin, and Component Directory Semantics

## Document status

Draft directory contract recording the decided extension/plugin naming split
and the clean-break migration in closed
[bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949). The public
`extension` verbs are canonical; the hidden deprecated `component` alias and
internal field names remain. These observations do not accept a new trust
boundary or establish compatibility or runtime verification.

## Purpose and scope

This specification fixes the meaning of the three directory names that meet
in Bitty's data and distribution layouts: `extensions/`, `plugins/`, and
`components/`. It answers one question: given an optional capability, where
does its artifact live on disk, where does it publish on the network, and
which name must new work use.

In scope:

- the local install roots for upstream prebuilt extensions and downstream
  Lua plugins, including precedence when both tiers exist;
- the remote distribution prefix for versioned extension payloads;
- the reserved meaning of `components/` and the rule against using it for
  new prebuilt work;
- the relationship of these directories to the accepted
  [Core and Plugin Boundaries](core-boundaries.md) ownership split.

Out of scope (owned elsewhere):

- the Core versus plugin ownership tables and P0 security gates themselves
  ([Core and Plugin Boundaries](core-boundaries.md));
- the Lua configuration tree, layer precedence, and merge rules
  ([Lua configuration and filesystem layout](../configuration/lua-and-xdg.md));
- the plugin manifest, capability grant lifecycle, and package integrity
  model (Plugin Platform and Package Lifecycle contracts in the plugin
  ecosystem corpus);
- the R2/CDN cache policies, checksum sidecars, and bootstrap artifact
  matrix (the `R2 bucket layout and CDN mapping` section of the
  [bitty packaging README](https://github.com/bitty-terminal/bitty/blob/main/packaging/README.md)).

This document is `draft`. The directory meanings below record a decided
direction (tracked in
[bitty#1945](https://github.com/bitty-terminal/bitty/issues/1945)); the
migration handling for installs created under the old name is decided
as a clean break with no compatibility shim (decided in closed
[bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949)).
The one-line 0.0.23 release note carrying that instruction is still to
be written at release time. Draft text does not authorize shipped,
stable, normative, or compatibility-guaranteed behavior.

## Normative sources this specification must not weaken

- [Core and Plugin Boundaries](core-boundaries.md) (`accepted`): Core keeps
  terminal-emulator mechanisms and security boundaries; everything else is
  an extension delivered through public, capability-gated interfaces. Its
  L1 Rust Core Extensions versus L2 Lua plugins split is the ownership
  basis for the directory split here. This page redefines no ownership
  row and weakens no P0 gate.
- The security corpus in `bitty-docs` (overview, threat model, risk
  register): installation never executes package code, updates never
  silently elevate capabilities, and third-party failure preserves a safe
  startup path. Directory placement must not create an ambient-authority
  or install-time execution path.
- [Lua configuration and filesystem layout](../configuration/lua-and-xdg.md):
  configuration (`~/.config/bitty/`), data (`~/.local/share/bitty/`),
  state, cache, and runtime stay distinct categories. Both directories
  defined here live under data, never under configuration.

## Terminology

| Term                  | Meaning                                                                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extension             | An upstream prebuilt host-side capability increment (for example graphics, accessibility, execution, storage, observability, platform services, plugin manager) shipped as a binary plus descriptor. |
| Plugin                | A downstream Lua package (first-party or community) checked out as source and run sandboxed on the embedded Lua VM through the public plugin API.                                                    |
| Component (reserved)  | The historic name for prebuilt units. Retained only for boot-required units and existing identifiers; must not name new prebuilt work.                                                               |
| Install root          | A filesystem directory Bitty searches for installed units. The user root wins over the system root on collision.                                                                                     |
| Distribution prefix   | The R2 bucket key prefix under which versioned, immutable payloads publish.                                                                                                                          |
| Upstream / downstream | Upstream is the Bitty organization shipping prebuilt binaries; downstream is plugin authors and users composing Lua packages on top of the public API.                                               |

`<name>` is the unit name (`[a-z][a-z0-9-]{0,31}` per the component
descriptor rules). `<version>` is the strict `X.Y.Z` unit version.
`<target>` is the Rust target triple the binary was built for.
`$XDG_DATA_HOME` defaults to `~/.local/share` when unset.

## Directory meanings (draft)

The three names partition by producer and form, not by importance:

| Directory     | Producer   | Form                                              | Examples                                                                                            |
| ------------- | ---------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `extensions/` | Upstream   | Prebuilt binary plus descriptor                   | graphics decode worker, accessibility adapter, execution supervisor, plugin manager seed            |
| `plugins/`    | Downstream | Lua source checkout (git)                         | workspace bar, status line, tabs, palette, sessions, AI panels                                      |
| `components/` | Reserved   | Boot-required units and historic identifiers only | Hidden deprecated `bitty component` CLI alias and `components_dir` fields (transitional, see below) |

Rules:

1. New upstream prebuilt work uses `extensions/` on disk and under the
   distribution prefix. It must not use `components/` as a directory or
   key name.
2. Downstream Lua packages use `plugins/`. A Lua checkout must never be
   placed under `extensions/`, and a prebuilt binary must never be placed
   under `plugins/`.
3. `components/` as a directory name is frozen: no new on-disk root, R2
   key, or documented path uses it. The word survives only where
   renaming would break a boot-required unit or a shipped identifier,
   each recorded explicitly where it occurs.
4. The host runs without any extension installed. Extensions are optional
   capability increments composed through public, capability-gated
   interfaces; first-party extensions receive no private bypass, per the
   accepted boundary contract.

## extensions/ (upstream prebuilt)

Upstream prebuilt extensions are optional host-side capabilities the core
calls through typed seams but never links as mandatory dependencies. The
fence convention names them extension crates: the core composition root
lists them in one place and the host works with the list empty.

### Extension install roots

```text
$XDG_DATA_HOME/bitty/extensions/<name>/
├── current                       # active version, one line ("0.0.23\n")
└── <version>/
    └── bitty-<name> (+ bitty-component.toml at pack time)
// typical: ~/.local/share/bitty/extensions/net/0.0.23/

/usr/lib/bitty/extensions/<name>/<version>/
└── bitty-<name> (or platform equivalent)

$XDG_STATE_HOME/bitty/extensions/<name>/
└── activation                    # last recorded transition, one bounded line
// typical: ~/.local/state/bitty/extensions/net/activation
```

The state tree reuses the approved `extensions/` name and does not create a
new `components/` root; activation is runtime state, not an installed unit.

- The user root (`$XDG_DATA_HOME/bitty/extensions/`, normally
  `~/.local/share/bitty/extensions/`) wins over the system root
  (`/usr/lib/bitty/extensions/`, or platform equivalent) on collision.
- `current` names the version the host should run for that component
  name, one line of text; `bitty extension remove <name> <version>`
  drops it when it removed the named version, and a name with no
  complete version directory lists as missing rather than running.
- `activation` is the last activation transition the component broker
  recorded for that component name: one bounded `v1 <state>` line, one of
  `installed`, `active`, `stopped`, `crashed`, or `denied:<class>`. It
  lives under the user state directory rather than either install tier,
  so a system-only install reports activation too and the record survives
  a reinstall; removing the last installed version does not delete it.
  The value is diagnostics, not a liveness probe: `active` means a spawn
  was recorded, not that the process is running now, and it describes the
  component name rather than one version. It is not a second state store:
  `bitty extension list` reads it, and no execution decision depends on
  it. A denial never overwrites a recorded `crashed` latch, and a
  denial never masks a component that is currently running. A record the
  host cannot read safely (symlink, non-regular file, over 64 bytes, or
  malformed) reads as "nothing recorded" instead of as an unearned state.
  A legacy record beside `current` is still read as a fallback until the
  next activation writes the state location. Stale `activation.tmp-*`
  writer temps are swept when the last version is removed, so they cannot
  keep a versionless component visible.
- `bitty extension list` enumerates installed units across both tiers;
  removal of a system-wide install belongs to the system package
  manager, never to the user-side remove path.
- A missing optional extension fails soft: resolution reports the name
  instead of aborting the host.

### Distribution layout

Versioned extension payloads publish under the immutable prefix:

```text
bitty/extensions/<name>/<version>/<target>.tar.gz
bitty/extensions/<name>/<version>/SHA256SUMS
```

Worked example:

```text
bitty/extensions/net/0.0.23/x86_64-unknown-linux-gnu.tar.gz
bitty/extensions/net/0.0.23/SHA256SUMS
```

The full URL template, pack mechanics (`scripts/make-component-dist.sh`),
tarball membership (exactly `bitty-<name>` plus `bitty-component.toml`,
no wrapper directory), and cache policy (immutable,
`public, max-age=31536000, immutable`) are owned by the
[bitty packaging README](https://github.com/bitty-terminal/bitty/blob/main/packaging/README.md)
and are not restated here beyond the prefix both sides must share.

## plugins/ (downstream Lua)

Downstream plugins are Lua source checkouts composed on the public plugin
API. They carry behavior, policy, and user experience; Core carries
mechanisms.

### Plugin install root

```text
$XDG_DATA_HOME/bitty/plugins/
└── <plugin-source-checkout>...
// typical: ~/.local/share/bitty/plugins/
```

- Each checkout is a git clone of a downstream Lua package (one
  independent repository per plugin). No plugin code runs during
  install, update, or listing operations.
- `plugins/` under the data root holds installed plugin source. It is
  distinct from the `plugins/` configuration subtree under
  `$XDG_CONFIG_HOME/bitty/plugins/`, which holds behavior configuration
  and declarative imports, not installed source. Per-plugin settings files
  under that configuration subtree follow the canonical Lua and XDG settings
  contract; the plugin ecosystem owns the public `bitty.settings` API in its
  [`settings` reference](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/reference/settings.md).
- With no plugin enabled, Bitty is a plain terminal window with Core
  primitives reachable through commands and key bindings; every bar, tab
  strip, and status line is plugin presentation, per the accepted
  zero-plugin baseline in
  [Core and Plugin Boundaries](core-boundaries.md).

## components/ (reserved historic name)

`components/` is the historic name for prebuilt units, predating the
extension-versus-plugin split. It is reserved, not removed, for one
reason: existing identifiers still spell it.

Transitional evidence, recorded honestly:

- The canonical user-facing CLI spells `bitty extension ...` (`list`,
  `install`, `remove`). `bitty component ...` remains a hidden deprecated
  compatibility alias; internal context fields retain the names
  `components_dir` / `system_components_dir`.
- The on-disk search roots and the R2 prefix already use `extensions/`
  (`$XDG_DATA_HOME/bitty/extensions/` over
  `/usr/lib/bitty/extensions/`; `bitty/extensions/<name>/<version>/`).

The rule going forward: no new directory, key, field, or documented path
uses the `components/` name. The public CLI verb migration is complete; the
deprecated alias and internal field names are retained for compatibility and
implementation continuity, not pending public renames.
The migration handling for installs created under the old directory name
is decided as a clean break with no compatibility shim in closed
[bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949):
remove the old directory and re-seed under the new name. The one-line
0.0.23 release note carrying that instruction is still to be written at
release time.

## How the split maps to the accepted boundary

```text
Core (mechanisms) ──typed seam── extensions/ (L1, upstream prebuilt, optional)
                  ──plugin API── plugins/    (L2, downstream Lua, sandboxed)
```

- An L1 Rust Core Extension on the ownership table installs under
  `extensions/` and publishes under `bitty/extensions/`.
- An L2 Lua plugin on the ownership table checks out under `plugins/`.
- Nothing in this mapping moves a mechanism into a plugin or grants a
  plugin ambient authority. Capability, policy, authenticated-scope, and
  resource-budget gates apply at every trust transition regardless of
  which directory the unit arrived from.

## Security review

- Install-time code execution stays forbidden: placing files under
  either root, or publishing under the distribution prefix, never runs
  unit code. Execution begins only through the capability-gated load
  path with manifest discovery, version checks, dependency resolution,
  and permission evaluation first.
- Path traversal and lookalike-host inputs fail closed before any fetch
  or emission; the pack and seed tooling pins the literal URL templates
  and refuses non-HTTPS bases, schemes, and traversal segments.
- Per-plugin VMs, restricted standard libraries, and attributable
  resource budgets apply to everything under `plugins/`; extensions
  under `extensions/` receive no private bypass and pass the same
  origin-carrying capability checks at each cross-boundary request.
- The no-third-party-plugin safe startup path (`bitty --safe`) reads
  neither root and draws no plugin chrome.

## Verification plan

- [ ] The three local roots resolve as stated: user
      `$XDG_DATA_HOME/bitty/extensions/<name>/<version>/` wins over system
      `/usr/lib/bitty/extensions/`; Lua checkouts resolve under
      `$XDG_DATA_HOME/bitty/plugins/`.
- [ ] No documented path, key, or field introduced after this page uses
      the `components/` directory name.
- [ ] The distribution prefix `bitty/extensions/<name>/<version>/`
      matches the owning implementation's pack and seed URL templates
      byte-for-byte.
- [ ] `just check` (format, markdownlint, links, metadata, language,
      hygiene) passes; this page links rather than duplicates the owning
      contracts.

## Alternatives considered

- Keep `components/` for prebuilt units and use `extensions/` only for
  the R2 prefix. Rejected: one concept with two names across local and
  remote layouts is the confusion being removed; the fence convention
  already calls them extension crates.
- Use `plugins/` for both prebuilt binaries and Lua checkouts.
  Rejected: it merges two trust and lifecycle domains (host-side
  processes versus sandboxed Lua) into one directory and one audit
  story.
- Migrate old installs silently with a compatibility shim. Rejected by
  owner decision in closed
  [bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949):
  the pre-0.0.23 user base is tiny, so no shim code ships; migration is
  a one-line release note (remove the old directory, re-seed).

## Affected contracts

- [Core and Plugin Boundaries](core-boundaries.md): unchanged; this page
  is a directory consequence of its accepted L1/L2 split.
- [Lua configuration and filesystem layout](../configuration/lua-and-xdg.md):
  unchanged; the data-versus-configuration separation constrains both
  roots defined here.
- [bitty packaging README](https://github.com/bitty-terminal/bitty/blob/main/packaging/README.md)
  (`R2 bucket layout and CDN mapping`, `Component dist layout`): the
  `bitty/extensions/` prefix defined there is the remote half of this
  contract. A follow-up one-line pointer from that section to this page
  lands separately in the `bitty` repository.
- Plugin ecosystem contracts (Plugin Platform, Package Lifecycle): no
  wording change; Lua packages keep checking out under `plugins/`.

## Open points

1. One-line 0.0.23 release note for installs created under the old
   `components/` directory name (remove the old directory, re-seed).
   The migration itself is decided as a clean break with no
   compatibility shim in closed
   [bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949);
   only the release-note line is still to be written at release time.
2. CLI and field naming status: the public `extension` verbs are canonical;
   the hidden deprecated `component` alias and internal
   `components_dir` / `system_components_dir` field names remain. No public
   CLI rename is pending.
3. System-root platform equivalents (macOS, Windows) for
   `/usr/lib/bitty/extensions/`: named but not pinned here; the owning
   implementation records each platform's equivalent.
4. First shippable extension upload (the future `r2-components`
   publisher): lands with the first shippable extension; until then
   nothing uploads to `bitty/extensions/`.

## Acceptance criteria

- A reader can state, for any optional capability, whether it installs
  under `extensions/` or `plugins/`, what its versioned path looks
  like, which tier wins on collision, and why `components/` must not
  name new work.
- Every path, prefix, and precedence claim on this page agrees with
  [Core and Plugin Boundaries](core-boundaries.md) and the owning
  `bitty` implementation sources cited in Verification; no claim
  exceeds `draft`.
- The migration handling states the decided clean break with no shim
  per closed
  [bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949),
  with the 0.0.23 release-note line recorded as the remaining follow-up.

## P0 Review Sign-off

Not requested. This page defines no trust boundary, grants no
capability, and weakens no P0 gate. Security review stays with the
authoritative security corpus and the owning implementation's focused
reviews. A P0 sign-off entry will be added only if a later revision
touches a trust transition.

## References

- [Core and Plugin Boundaries](core-boundaries.md) — accepted ownership
  split and P0 gates this page must not weaken.
- [Lua configuration and filesystem layout](../configuration/lua-and-xdg.md)
  — data versus configuration separation constraining both roots.
- [bitty packaging README](https://github.com/bitty-terminal/bitty/blob/main/packaging/README.md)
  — owner of the R2/CDN key convention and component pack mechanics.
- [bitty#1945](https://github.com/bitty-terminal/bitty/issues/1945) —
  rename decision context: upstream prebuilts are extensions by
  composition-versus-augmentation.
- [bitty#1949](https://github.com/bitty-terminal/bitty/issues/1949) —
  closed migration decision: clean break with no compatibility shim
  (remove the old directory, re-seed); the release-note line lands at
  0.0.23 time.
