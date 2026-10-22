---
title: Local Theme Files (Candidate)
description: Bounded local-first theme file schema, explicit selection, readability gate, and hot-reload behavior
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 78
---

# Local Theme Files (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, and not
> normative. This document records the bounded local-theme read path that
> `bitty` implemented for the 0.0.27 slice under OQ-047. The 30 built-in
> presets and the inline `appearance.colors` table remain the accepted,
> shipped surfaces; this candidate adds a user-authored file surface without
> changing their behavior. OQ-047 stays **Open** in the shared register: the
> schema, the `local:` selection namespace, and the trust rules below are
> review input, not an accepted contract. No network fetch exists on any
> theme path.

## Purpose and scope

The built-in catalog is compiled into `bitty-config`, so selecting any of the
30 presets performs no file or network I/O. Users who need a palette outside
the catalog currently must copy the whole inline `appearance.colors` table into
`init.lua`. This candidate defines the smallest local-first alternative:

- a flat, data-only TOML file per theme under the platform config root;
- explicit selection through a reserved `local:<name>` namespace, so the
  existence of a file never changes the meaning of a built-in name;
- the same contrast policy as the built-in catalog, applied at load;
- hot reload through the existing configuration tick, with last-good retention
  when an edit is invalid; and
- a `bitty list themes` presentation that names the origin (`builtin`/`local`)
  instead of showing upstream URLs as if they were fetched.

Out of scope: remote theme downloads, plugin-supplied themes, installed/theme
packages, import/export formats, theme-editor UI, per-View theme files, and
dual `light:`/`dark:` selections that mix local files. Those remain OQ-047
follow-ups or other open questions.

## Normative sources this specification must not weaken

- The catalog and inline-palette behavior documented in the
  [theme preset reference](../configuration/themes.md), including zero-I/O
  selection of built-in presets and the complete-table rejection rule for
  `appearance.colors`.
- The appearance contract in RFC-0001 and the outline AC-1/AC-2 floors
  (`focused >= 3:1` against the background and, without a width cue, against
  the idle outline). A local file supplies optional outline tokens; when it
  omits them, the selected built-in base tokens remain in force and are
  measured against the local background.
- The XDG layout in [Lua and XDG](../configuration/lua-and-xdg.md): the config
  root is resolved from platform environment values, never from a hard-coded
  host path.
- The workspace no-network and bounded-resource rules: local theme parsing is
  data-only, never code, and every read is capped.

## Terminology

- **Local theme**: one `.toml` file accepted from
  `<config-root>/bitty/themes/`.
- **Selection namespace**: `appearance.theme = "local:<name>"`. The prefix is
  mandatory and is matched case-insensitively after trimming; the name body is
  a canonical lowercase slug.
- **Rejected file**: a candidate file that fails a structural, size, or
  readability check. It produces one bounded diagnostic and is not selectable.
- **Last good palette**: the most recently adopted effective palette. A
  rejected edit never replaces it.

## Schema (candidate)

Files are flat TOML keys (no sections, dotted keys, tables, or multi-line
values), parsed by the same bounded subset used for legacy plugin data:

```toml
name = "sunset"                 # required, canonical lowercase slug
category = "dark"               # required: "dark" | "light"
aliases = ["sunset-warm"]       # optional, up to 8 distinct slugs
source = "https://example"      # optional provenance URL (never fetched)
license = "MIT"                 # optional license identifier
background = "#1e1e2e"          # required, canonical #RRGGBB
foreground = "#cdd6f4"          # required
cursor = "#f5e0dc"              # required
selection = "#313244"           # required
ansi = ["#45475a", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de", "#585b70", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#cdd6f4"]  # required, exactly 16
border_focused = "#33CCFF"      # optional #RRGGBB or #RRGGBBAA
border_idle = "#595959AA"       # optional #RRGGBB or #RRGGBBAA
```

| Rule                 | Bound / behavior                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Directory            | `<config-root>/bitty/themes/` from `$XDG_CONFIG_HOME`, `%APPDATA%`, `$HOME/.config`, or `%LOCALAPPDATA%`, in that order.                                    |
| File count           | At most 64 `.toml` candidates; exceeding the bound rejects the whole scan fail-closed.                                                                      |
| File size            | At most 64 KiB; larger files are rejected before parsing.                                                                                                   |
| Line size            | At most 4096 bytes; longer lines are rejected.                                                                                                              |
| File type            | Regular files only. Symlinks are rejected without being followed.                                                                                           |
| Name                 | Lowercase ASCII letters, digits, `-`, `_`; starts with a letter or digit; at most 58 bytes (the `local:` prefix fits the 64-byte `appearance.theme` bound). |
| Unknown fields       | Rejected with the line number and field name.                                                                                                               |
| Duplicate keys/names | Rejected; the first file in name order owns a name or alias.                                                                                                |
| Colors               | Canonical `#RRGGBB` only for the four chrome roles and ANSI entries; `#RGB`, alpha, names, and functions are rejected.                                      |
| ANSI cardinality     | Exactly 16 entries; short or long arrays reject the file.                                                                                                   |

The `name` field is the canonical identity. `aliases` are alternate selectable
slugs (`local:<alias>`). A file name need not match the `name` field; the
field is authoritative, and the file name appears only in diagnostics. A local
name may duplicate a built-in name because the namespaces are disjoint: the
built-in continues to resolve under its plain name, and the file resolves only
under `local:`.

## Selection and resolution (candidate)

- `appearance.theme` (or the `theme` alias) may be `local:<name>`. Structural
  validation accepts the namespace without filesystem access; the load path
  then resolves the file.
- The built-in/default path stays zero-I/O: `None`, empty, and every built-in
  name or alias never read the themes directory.
- A missing file, a rejected file, or a readability failure fails the load
  with one bounded diagnostic naming the directory, the selected slug, the
  available local names, and the number of rejected files. When the selected
  slug matches a rejected `<name>.toml`, its specific reason is included.
- A local selection cannot be combined with a non-identical inline
  `appearance.colors` table; the two custom-palette sources are ambiguous and
  fail closed. Re-applying an already-adopted local palette is idempotent.
- Dual `light:<name>,dark:<name>` selections cannot reference local files in
  this candidate; the load fails with a diagnostic. Dual built-in selections
  are unchanged.
- On adoption, the local palette is folded into the existing
  `appearance.colors` path. The optional outline tokens ride the same
  `CustomPalette`, so the already-accepted outline validation and rendering
  path are reused; the static `Theme` registry is not refactored.

## Readability gate (candidate)

Every accepted file runs the built-in policy at load:

- default text and the chromatic ANSI text slots must reach **4.5:1** against
  the file background;
- the cursor, selected text, selection visibility, help ring, and banner text
  keep their existing floors;
- the focused outline must reach **3:1** against the background and, when it
  differs from the idle outline, **3:1** against the idle outline (AC-1/AC-2);
  a file that omits outline tokens inherits the built-in base pair, which must
  still clear those floors against the file background.

A failing file is rejected and reported; it is never adopted or shown as a
selectable row.

## Hot reload (candidate)

The existing configuration poll (once per 500 ms maximum) watches both the
config file and the themes directory:

- A `.toml` candidate in the directory gains, disappears, or changes
  `(mtime, length)`, and the watcher triggers one full re-resolution.
- With a local theme active, a valid edit is reparsed, re-gated, folded into
  the effective palette, and adopted atomically through the existing
  `set_theme_palette` path on the next tick.
- An invalid edit (syntax, bounds, malformed color, readability failure)
  produces a `load-error` diagnostic; the engine keeps the last good effective
  config and the live palette does not change.
- The watcher never follows symlinks, walks at most 4096 directory entries,
  and stats at most 64 `.toml` candidates per poll.

There is no file-event dependency and no network path.

## `bitty list themes` (candidate)

- Built-in rows report origin `builtin`; accepted local rows report `local`.
- Local rows are named `local:<name>` in the NAME column so the value is
  directly selectable, and their aliases are shown in the same namespace.
- The human table column is `PROVENANCE` and carries the origin token, never a
  URL. This removes the visual suggestion that listing performs a fetch.
- JSON keeps a machine-readable `source` (`builtin`/`local`) and a separate
  `provenance` field (the upstream URL for built-ins, the optional file
  `source` for local themes, or an empty string).
- Rejected files produce one bounded stderr diagnostic each while the command
  still exits successfully with the accepted catalog. `--safe` keeps the
  listing built-in-only and reads no external files.

## Security review

- **Trust boundary**: a user-owned config file is untrusted data. The parser is
  a closed flat-key TOML subset, never evaluates code, never expands includes
  or environment values, and rejects unknown keys.
- **Path safety**: the directory is resolved from platform roots; only direct
  regular children with a `.toml` suffix are considered; symlinks and
  non-regular entries are rejected without traversal.
- **Resource bounds**: 64 files, 64 KiB each, 4096-byte lines, bounded strings,
  aliases, and diagnostics. A directory over the file cap is rejected as a
  whole rather than silently truncated.
- **Fail-closed behavior**: malformed input, unreadable files, and readability
  failures reject the file; a reload failure never commits a partial palette.
- **No network**: no theme path imports or calls a network API. `source` is
  metadata and is never fetched, validated as a live URL, or contacted.
- **No privilege widening**: this path grants no plugin, process, shell, or
  native-code capability. Local themes are terminal paint data only.

## Verification plan

The candidate is exercised by:

- `bitty-config` unit tests: passing theme, failing readability, malformed hex,
  short ANSI, unknown field, oversize file, over-count directory, symlink
  rejection, duplicate names, selection/dual/missing-file diagnostics, and
  last-good retention on an invalid edit.
- `bitty-terminal` reload tests: valid local edit adopts the new palette on the
  config tick; invalid edit and file removal report `load-error` while the
  runtime keeps the last good palette; re-creation is adopted.
- `bitty-terminal` CLI tests: local rows and `PROVENANCE`/JSON origin fields,
  no URL in the human table, and a rejected file diagnostic without a command
  failure.
- `bitty config check` against a local selection reports the same contrast
  policy rows as a built-in preset.

## Alternatives considered

- **Refactor the static `Theme` registry into a runtime catalog.** Rejected for
  this slice: it would touch all 30 pinned presets, the zero-I/O default path,
  and every selection/validation caller. Folding the accepted file palette
  into `CustomPalette` reuses the already-shipped custom-color pipeline.
- **Accept plain local names.** Rejected because structural validation is pure
  and must not perform filesystem I/O; accepting arbitrary plain names would
  weaken the fail-closed unknown-preset check. The explicit `local:` namespace
  keeps built-ins stable and makes opt-in literal.
- **Store themes as Lua files.** Rejected: evaluating a user file as Lua for
  paint data adds an interpreter and code-shaped trust surface for no schema
  gain. The flat TOML subset is data-only.
- **Poll a file event library.** Rejected: a new dependency is gated behind an
  ADR, and the existing `(mtime, length)` poll already survives atomic-rename
  writes.
- **Ship themes from plugins or a remote registry.** Deferred: plugin
  contribution and installed theme packages are OQ-047 follow-ups.

## Affected contracts

- `bitty-config`: new `local_theme` module, `local:` namespace helpers, optional
  outline tokens on `CustomPalette`, and local acceptance in
  `AppearanceConfig::validate`.
- `bitty-terminal`: config load selection, the adaptive config watcher, list
  rows/JSON, and title identity for local selections.
- User documentation: theme reference and manual pages, which must not claim
  network fetching or an accepted file contract.

## Open points

- **OQ-047 remains Open.** This candidate records an implemented-only 0.0.27
  slice; it does not close the question or promote the schema to an accepted
  contract. Acceptance must decide at least: the `local:` namespace versus
  plain-name overrides; whether local names may shadow built-ins; the
  `$XDG_DATA_HOME` installed-theme half; and plugin/theme-package contribution.
- Whether dual `light:`/`dark:` selections should accept local files with two
  independent palettes.
- Whether a future schema version should support an explicit
  `schema_version` key, a description/author field, or a color-role table
  rather than flat keys.
- Whether local themes should be included in `--safe` listing (the candidate
  reads no external files under `--safe`).
- Whether theme-file provenance should be shown as a URL anywhere in human
  output; the candidate keeps URLs JSON-only.

## Acceptance criteria

- Selecting `local:<name>` with a valid, readable file adopts exactly the file
  palette and optional outline tokens; the built-in default path remains
  zero-I/O.
- Missing, malformed, oversized, over-count, symlinked, and unreadable inputs
  fail closed with a bounded diagnostic and no panic.
- A local theme failing the 4.5:1 text or 3:1 focused-outline floors is
  rejected at load and reported, never adopted.
- A valid file edit hot-reloads on the existing tick; an invalid edit retains
  the last good palette and reports `load-error`.
- `bitty list themes` shows `builtin`/`local` provenance, includes local rows,
  keeps URLs out of the human table, and performs no network request.
- OQ-047 is still recorded as Open, and this document is the reviewable design
  note for its local-file half.

## P0 Review Sign-off

| Reviewer | Scope                                        | Result       |
| -------- | -------------------------------------------- | ------------ |
| Pending  | Appearance/config, security, and docs review | Not reviewed |

## References

- [Theme presets](../configuration/themes.md)
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md)
- [Configuration Model RFC](configuration-model-rfc.md)
- [bitty-docs open questions: OQ-047](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
