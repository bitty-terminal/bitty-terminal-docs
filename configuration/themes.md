---
title: Theme presets
description: Shipped built-in theme preset catalog with dark and light categories, selection keys, aliases, provenance, and open questions
category: configuration
audience: user
document_type: reference
status: stable
website_publish: true
sidebar_order: 11
---

# Theme presets

## Status and provenance

> Status: **shipped catalog and shipped inline palette.** All 30 built-in
> presets below (20 dark, 10 light) resolve in `bitty` today, and the inline
> `appearance.colors` table is a shipped, complete alternative to a preset.
> The catalog is compiled into the binary in
> `bitty` `crates/bitty-config/src/theme.rs` and belongs to `bitty` CarryCtx
> task `CTX-0350` (PR #578, merge commit `20cd735`; the AC-2 outline-contrast
> correction shipped in PR #586, merge commit `a7d9e6a`). The names, aliases,
> dark/light categories, source URLs, and exact palette values are pinned by
> fail-closed catalog tests in `bitty`, so this page is reference data, not a
> provisional target. Theme **files** are still unsupported (OQ-047); the
> inline table is the only custom-palette surface. The owning configuration
> contract remains the
> [Configuration Model RFC](../specifications/configuration-model-rfc.md) and
> the accepted [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
> (OQ-039); this page documents shipped data and the shipped inline schema.

## Purpose and scope

This reference documents the shipped preset catalog, the shipped inline
`appearance.colors` schema, and the exact roles a theme owns versus the roles
derived from it. It does not define a theme-file format, plugin theme
contribution, or any ownership outside the terminal palette; those remain open
questions stated at the end.

Bitty resolves terminal colors from a **built-in preset registry** or a
complete inline palette. A theme owns the window background, default
foreground, cursor, selection background, and the 16 ANSI colors. Presets also
carry the focused/idle outline tokens; an inline palette keeps the selected
preset's outline tokens. The registry is compiled into the binary
(`bitty` `crates/bitty-config/src/theme.rs`); there is no theme file loading
today. `bitty list themes` enumerates the shipped catalog.

## Selecting a theme

A theme is selected by **name**, not by category or file path. The canonical
key is the `appearance.theme` scalar in `init.lua`:

```lua
-- Canonical key.
return {
    appearance = {
        theme = "tokyo-night",
    },
}
```

A top-level `theme` alias is also accepted. `appearance.theme` wins when both
are present:

```lua
-- Alias form; appearance.theme takes precedence over this key.
return {
    theme = "dark",
}
```

Accepted identifiers:

- **`appearance.theme = "<name>"`** — canonical single selection key. Matching
  is case-insensitive and surrounding whitespace is trimmed.
- **`appearance.theme = "light:<name>,dark:<name>"`** — canonical dual
  selection key for OS appearance switching (shipped in `bitty` CTX-0951,
  PR #1687). Either order, whitespace around every token ignored, side keys
  case-insensitive, both halves required. See
  [dual light/dark selection](#dual-lightdark-selection-shipped).
- **`theme = "<name>"`** — top-level alias for `appearance.theme`. It loses to
  `appearance.theme` when both are set, and accepts the same single and dual
  shapes.
- **`dark`** — convenience alias for the default preset `bitty-dark`.

Resolution rules (shipped behavior, `bitty` `crates/bitty-config/src/types.rs`
`AppearanceConfig::validate`, CTX-0951):

| Input                                 | Result                                                             |
| ------------------------------------- | ------------------------------------------------------------------ |
| `appearance.theme` unset / empty      | designed default preset `bitty-dark`                               |
| known single name or alias            | that preset's exact values                                         |
| known dual `light:<name>,dark:<name>` | active half per OS appearance (dark-first when unknown; see below) |
| unknown single name or unknown half   | fail-closed validation error naming the offender and the valid set |
| malformed dual shape                  | fail-closed validation error naming the expected shape             |

`appearance.theme` is declared reload class `Live` in the config layer
(CTX-0295) and the running app adopts it without restart (CTX-0898): the
resolved palette is installed on the renderer and the window surface, and one
full redraw repaints existing grid cells, scrollback viewports, the selection
overlay, the cursor, and cached shaped glyphs on the next presented frame.
Unknown names fail closed at load and reload validation with a diagnostic
naming the valid preset set (run `bitty list themes` for the catalog); they
never silently fall back. The compiled-in `resolve_theme` fallback to
`bitty-dark` with a stderr warning remains only as runtime last-resort for
values that bypass validation. A `#RRGGBB`/`#RRGGBBAA` color value is never
accepted here — only a preset name, alias, or dual pair; custom colors use the
inline table below.

### Dual light/dark selection (shipped)

A dual value selects one preset per OS appearance with a single string
(`bitty` `crates/bitty-config/src/theme.rs` `parse_theme_selection`,
ghostty-compatible):

```lua
return {
    appearance = {
        theme = "light:catppuccin-latte,dark:catppuccin-mocha",
    },
}
```

Rules:

- Either order is accepted (`dark:<name>,light:<name>` works); whitespace
  around the whole value, around commas, around side keys, and around names is
  ignored, and side keys and names are case-insensitive (names are stored
  normalized).
- Both `light:<name>` and `dark:<name>` halves are required. A lone
  `light:<name>`, an empty half, a duplicate side, or a non-`light`/`dark`
  side key is malformed and fails closed.
- Both halves must name known presets or aliases. An unknown half fails closed
  with the same valid-set diagnostic as an unknown single name, even when that
  half is not the currently active one, so a later OS toggle cannot silently
  land on a fallback.
- The runtime resolves the half matching the OS appearance
  (`EffectiveConfig::effective_theme_for`): `Light` selects the `light:` half,
  `Dark` or `Unknown` selects the `dark:` half (dark-first default). Startup
  queries the OS via `bitty-platform` `query_system_appearance`, which degrades
  to `Unknown` on every platform in this slice (no native portal, AppKit, or
  registry seam yet), so startup stays dark-first; live `ThemeChanged` events
  swap the palette via `Runtime::apply_system_appearance` where the backend
  emits them (natively on macOS and Windows; backends without OS theme support
  never emit, so Linux Wayland and X11 stay on the dark half). Config reload
  keeps the last live appearance event when one was recorded.
- Single selections ignore the OS signal.

`bitty config check` reports the startup-active half under the same dark-first
rule.

## Built-in preset catalog (shipped)

Names follow lowercase kebab-case and separate a family from a tone or variant
(for example `gruvbox-dark`). Aliases are alternate spellings resolved by
`normalize_theme_name` (trim + lowercase) and are registry-owned, not
user-extensible.

### Dark presets (20)

| Preset                 | Aliases                         | Note                                               |
| ---------------------- | ------------------------------- | -------------------------------------------------- |
| `bitty-dark`           | `dark`                          | Designed in-house default; dark-first indigo-gray. |
| `tokyo-night`          | `tokyonight`                    | Tokyo Night classic; blue/violet night palette.    |
| `tokyo-night-storm`    | `tokyonight-storm`              | Darker, higher-contrast Tokyo Night variant.       |
| `catppuccin-mocha`     | `catppuccin`                    | Darkest Catppuccin flavor.                         |
| `catppuccin-macchiato` | —                               | Mid-dark Catppuccin flavor.                        |
| `catppuccin-frappe`    | —                               | Softest dark Catppuccin flavor.                    |
| `dracula`              | —                               | High-contrast purple/pink dark scheme.             |
| `nord`                 | —                               | Cool arctic blue-gray dark scheme.                 |
| `gruvbox-dark`         | `gruvbox`                       | Retro warm earth tones on dark.                    |
| `solarized-dark`       | `solarized`                     | Precision low-contrast dark palette.               |
| `one-dark`             | `onedark`                       | Atom One dark scheme.                              |
| `ayu-dark`             | `ayu`                           | Warm amber-on-dark scheme.                         |
| `ayu-mirage`           | —                               | Muted blue-gray Ayu variant.                       |
| `kanagawa-wave`        | `kanagawa`                      | Ink-and-sumi Japanese-influenced dark scheme.      |
| `rose-pine`            | `rosepine`, `rose-pine-main`    | Muted rose/pine dark scheme.                       |
| `rose-pine-moon`       | `rosepine-moon`                 | Cooler, dimmer Rosé Pine variant.                  |
| `everforest-dark`      | `everforest`                    | Comfortable green-gray dark scheme.                |
| `monokai`              | `monokai-classic`               | Classic Monokai warm dark scheme (single preset).  |
| `night-owl`            | `nightowl`                      | Deep navy dark scheme for low-light use.           |
| `github-dark`          | `github`, `github-dark-default` | GitHub's default dark UI palette.                  |

### Light presets (10)

| Preset             | Aliases                | Note                                  |
| ------------------ | ---------------------- | ------------------------------------- |
| `tokyo-night-day`  | `tokyonight-day`       | Light counterpart of Tokyo Night.     |
| `catppuccin-latte` | —                      | Light Catppuccin flavor.              |
| `gruvbox-light`    | —                      | Warm earth tones on light.            |
| `solarized-light`  | —                      | Precision low-contrast light palette. |
| `one-light`        | `onelight`             | Atom One light scheme.                |
| `ayu-light`        | —                      | Light Ayu variant.                    |
| `kanagawa-lotus`   | —                      | Light Kanagawa variant.               |
| `rose-pine-dawn`   | `rosepine-dawn`        | Light Rosé Pine variant.              |
| `everforest-light` | —                      | Green-gray light scheme.              |
| `github-light`     | `github-light-default` | GitHub's default light UI palette.    |

There is no `night-owl-light`, `tokyo-night-moon`, `tokyo-night-light`, or
`kanagawa` light preset: the shipped light set is exactly the ten names above.
The **Dark** and **Light** headings are the registry's `ThemeCategory`
metadata. Whether a category is itself selectable is an open question; see
[open questions](#status-and-open-questions). Selection stays by name today.

## Provenance

Every preset is derived from an upstream project and is attributed in the
registry. Bitty reproduces each palette faithfully from its upstream export and
owns the values it writes; where a canonical Alacritty/kitty export exists it
is preferred, otherwise the MIT-licensed `iTerm2-Color-Schemes` export of that
project is used and the owning project is still the `source`. No non-permissive
palette is included, and no value is invented to fill a gap.

| Family      | Upstream project                                                                       | License           | Presets                                               |
| ----------- | -------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- |
| Bitty       | In-tree (`bitty-terminal/bitty`, `crates/bitty-config`)                                | MIT OR Apache-2.0 | `bitty-dark`                                          |
| Tokyo Night | <https://github.com/folke/tokyonight.nvim>                                             | Apache-2.0        | `tokyo-night`, `tokyo-night-storm`, `tokyo-night-day` |
| Catppuccin  | <https://github.com/catppuccin/alacritty>                                              | MIT               | `catppuccin-mocha`, `-macchiato`, `-frappe`, `-latte` |
| Dracula     | <https://github.com/dracula/alacritty>                                                 | MIT               | `dracula`                                             |
| Nord        | <https://github.com/nordtheme/nord>                                                    | MIT               | `nord`                                                |
| Gruvbox     | <https://github.com/morhetz/gruvbox>                                                   | MIT               | `gruvbox-dark`, `gruvbox-light`                       |
| Solarized   | <https://github.com/altercation/solarized>                                             | MIT               | `solarized-dark`, `solarized-light`                   |
| One         | <https://github.com/atom/one-dark-syntax> / <https://github.com/atom/one-light-syntax> | MIT               | `one-dark`, `one-light`                               |
| Ayu         | <https://github.com/ayu-theme/ayu-colors>                                              | MIT               | `ayu-dark`, `ayu-mirage`, `ayu-light`                 |
| Kanagawa    | <https://github.com/rebelot/kanagawa.nvim>                                             | MIT               | `kanagawa-wave`, `kanagawa-lotus`                     |
| Rosé Pine   | <https://github.com/rose-pine/rose-pine-theme>                                         | MIT               | `rose-pine`, `rose-pine-moon`, `rose-pine-dawn`       |
| Everforest  | <https://github.com/sainnhe/everforest>                                                | MIT               | `everforest-dark`, `everforest-light`                 |
| Monokai     | <https://github.com/mbadolato/iTerm2-Color-Schemes>                                    | MIT               | `monokai`                                             |
| Night Owl   | <https://github.com/sdras/night-owl-vscode-theme>                                      | MIT               | `night-owl`                                           |
| GitHub      | <https://github.com/primer/github-vscode-theme>                                        | MIT               | `github-dark`, `github-light`                         |

`MIT` and `Apache-2.0` are the SPDX identifiers reported by each upstream
repository at the time of writing. License text is not bundled; only names and
attribution are recorded. The catalog is additive: adding a family requires its
source URL and license here and in the registry.

## Inline custom palette (`appearance.colors`)

`appearance.colors` is a complete inline palette. It is not a theme file and
it does not read any path: the table is evaluated from the already-trusted
`init.lua`/`config.lua` configuration layer and becomes the terminal palette
directly (CTX-0392, issue #648; completed as a first-class preset alternative
in issue #2333). Presets are shorthand over the same terminal roles.

```lua
return {
    appearance = {
        -- Optional: the base preset keeps its focused/idle outline tokens and
        -- is the fallback for any future theme-owned chrome role.
        theme = "bitty-dark",
        colors = {
            background = "#0b1020",
            foreground = "#e6e6fa",
            cursor = "#ff2e88",
            selection = "#24304a",
            ansi = {
                "#101020", "#ff5555", "#50fa7b", "#f1fa8c",
                "#7aa2f7", "#ff79c6", "#8be9fd", "#c0caf5",
                "#414868", "#ff6e6e", "#69ff94", "#ffffa5",
                "#d6acff", "#ff92df", "#a4ffff", "#ffffff",
            },
        },
    },
}
```

Schema and validation rules (shipped, fail-closed):

| Field                          | Type                | Requirement                                                     |
| ------------------------------ | ------------------- | --------------------------------------------------------------- |
| `appearance.colors`            | table               | Closed table; unknown keys reject the layer.                    |
| `appearance.colors.background` | string              | Required. Canonical `#RRGGBB` (no alpha, shorthand, or names).  |
| `appearance.colors.foreground` | string              | Required. Canonical `#RRGGBB`.                                  |
| `appearance.colors.cursor`     | string              | Required. Canonical `#RRGGBB`.                                  |
| `appearance.colors.selection`  | string              | Required. Canonical `#RRGGBB`.                                  |
| `appearance.colors.ansi`       | array of 16 strings | Required. Exactly 16 canonical `#RRGGBB` entries, indices 0–15. |

Every role is required. A partial table is **not** merged with the preset and
does not fall back per role: a missing role, a wrong-length `ansi` array, or a
non-canonical hex leaf rejects the whole layer or reload with a typed
diagnostic naming the exact field (for example
`appearance.colors.ansi[7]`). The previous theme is never partially retained.
`appearance.colors` is reload class `Live` and the same redraw path applies as
for a preset switch.

The inline palette owns the terminal roles it declares. The focused/idle
outline pair stays owned by the selected preset (or explicit
`decoration.border_color*` keys), and glow/shadow/tint/fade stay explicit
style configuration, so a custom table cannot silently rewrite those tokens.
Chrome accents that are _derived_ from terminal roles (below) do follow the
custom palette, because they are computed from its colors.

## Which roles a theme controls

| Surface                                  | Source                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Window clear and default cell background | `background`                                                                         |
| Default glyph/foreground text            | `foreground`                                                                         |
| ANSI 0–15, normal and bright             | `ansi[0..15]` (OSC 4 can override individual entries live)                           |
| Block cursor fill                        | `cursor`                                                                             |
| Selection background                     | `selection`                                                                          |
| Selected glyph foreground                | Derived: the cell's own foreground (default or ANSI), unchanged                      |
| Scrollbar thumb                          | Derived: `foreground` at reduced alpha                                               |
| URL-hover underline                      | Derived: `foreground`                                                                |
| Leader hint pills                        | Derived: `selection` ground + `foreground` label                                     |
| Plugin chrome bands                      | `foreground` / `background` / `cursor` / `selection` tokens, plus `accent` = ANSI 12 |
| Pending paste / close-confirm banner     | Derived: ANSI 3 ground + black/white text chosen for contrast                        |
| Help panel                               | Derived: `selection` ground, ANSI 12 ring, `foreground` text                         |
| IME preedit                              | Derived: `selection` ground, `cursor` underline/caret, `foreground` glyphs           |
| Focused/idle View outline                | Preset outline tokens, or explicit `decoration.border_color*` keys                   |
| Window/panel glow, shadow, tint, fade    | Explicit `appearance.style` / `decoration` keys, never a theme                       |

The table is the complete ownership statement: a theme never changes layout,
input, Terminal Truth, or a role listed as explicit configuration.

## Custom and third-party theme files

Theme **files** and third-party theme packages are **not supported**. There is
no theme file format, no `$XDG_DATA_HOME/bitty/themes/` or
`$XDG_CONFIG_HOME/bitty/themes/` loading path, and no plugin theme contribution
contract today. The `themes/` directory is reserved in the
[XDG data layout](lua-and-xdg.md#data-state-cache-and-runtime-layouts) but is
inert. Selecting an unknown name fails closed at validation; it does not load a
file. The inline `appearance.colors` table is the supported custom-palette
surface.

Whether theme files, a file schema, or plugin-supplied themes enter scope is an
open question; see below. Do not document or rely on a theme-file path until a
reviewed contract defines its schema, load path, and trust model.

## Status and open questions

This catalog is a reference for shipped data. It ratifies no configuration
semantics beyond the accepted
[Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
and its `appearance.theme` / `theme` alias contract. The following are genuine
open questions and are registered rather than decided in this page:

- **OQ-046 — category selection.** Is a preset's `Dark`/`Light` category
  exposed as a selectable or queryable config surface, or is it non-selectable
  documentation metadata only?
- **OQ-047 — custom theme files.** The inline `appearance.colors` palette is
  shipped; this question covers user-authored or third-party theme **files**
  and asks what schema, load path, and trust model they would use.
- **OQ-048 — automatic light/dark switching (partially shipped).** Dual
  `light:<name>,dark:<name>` OS-appearance switching shipped in `bitty`
  CTX-0951 (PR #1687): the key is the `appearance.theme` dual string and the
  mechanism is the OS appearance event with a dark-first default. Open
  remainder: schedule-based switching, and the native cold-path OS query seams
  (portal, AppKit, registry) behind the current `Unknown` degradation.

See the [open-question register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md) for the
authoritative state. The catalog is `stable` reference data because the shipped
preset set is pinned by `bitty` catalog tests; the open questions above are
about additional surfaces, not about the shipped set.
