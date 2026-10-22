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
> provisional target. A bounded **local theme file** candidate shipped for
> 0.0.26 (opt-in `local:<name>` selection; see
> [Local Theme Files](../specifications/local-theme-files-candidate.md)) but
> remains under OQ-047, not an accepted contract; the inline table stays a
> shipped alternative. The owning configuration
> contract remains the
> [Configuration Model RFC](../specifications/configuration-model-rfc.md) and
> the accepted [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
> (OQ-039); this page documents shipped data and the shipped inline schema.

## Purpose and scope

This reference documents the shipped preset catalog, the shipped inline
`appearance.colors` schema, the candidate local-theme read path, and the exact
roles a theme owns versus the roles derived from it. It does not define an
accepted theme-file format, plugin theme contribution, or any ownership outside
the terminal palette; those remain open questions stated at the end. The local
file candidate has its own design note
([Local Theme Files](../specifications/local-theme-files-candidate.md)).

Bitty resolves terminal colors from a **built-in preset registry**, a
complete inline palette, or an explicitly selected local theme file. A theme
owns the window background, default foreground, cursor, selection background,
and the 16 ANSI colors. Presets also carry the focused/idle outline tokens; an
inline palette keeps the selected preset's outline tokens, and a local file may
supply its own optional pair. The registry is compiled into the binary
(`bitty` `crates/bitty-config/src/theme.rs`); built-in selection performs no
file or network I/O. `bitty list themes` enumerates the catalog and any
accepted local files.

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

A user-authored local theme is selected explicitly through the `local:`
namespace:

```lua
return {
    appearance = {
        theme = "local:sunset",
    },
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

| Surface                                  | Source                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| Window clear and default cell background | `background`                                                                                |
| Default glyph/foreground text            | `foreground`                                                                                |
| ANSI 0–15, normal and bright             | `ansi[0..15]` (OSC 4 can override individual entries live)                                  |
| Block cursor fill                        | `cursor`                                                                                    |
| Selection background                     | `selection`                                                                                 |
| Selected glyph foreground                | Derived: the cell's own foreground (default or ANSI), unchanged                             |
| Scrollbar thumb                          | Derived: `foreground` at reduced alpha                                                      |
| URL-hover underline                      | Derived: `foreground`                                                                       |
| Leader hint pills                        | Derived: `selection` ground + `foreground` label                                            |
| Plugin chrome bands                      | `foreground` / `background` / `cursor` / `selection` tokens, plus `accent` = ANSI 12        |
| Pending paste / close-confirm banner     | Derived: ANSI 3 ground + black/white text chosen for contrast                               |
| Help panel                               | Derived: `selection` ground, ANSI 12 ring (fallback ANSI 4/6/foreground), `foreground` text |
| IME preedit                              | Derived: `selection` ground, `cursor` underline/caret, `foreground` glyphs                  |
| Focused/idle View outline                | Preset outline tokens, or explicit `decoration.border_color*` keys                          |
| Window/panel glow, shadow, tint, fade    | Explicit `appearance.style` / `decoration` keys, never a theme                              |
| Visual bell flash strip                  | Intentionally fixed: translucent amber accent, never a theme role                           |

The table is the complete ownership statement: a theme never changes layout,
input, Terminal Truth, a role listed as explicit configuration, or the one
surface listed as intentionally non-themed.

The bounded visual-bell flash is that surface. With `terminal.bell` set to
`visual` (the default) or `both`, the runtime paints a one-cell-high,
translucent amber strip (`BELL_FLASH_BG` in
`bitty` `crates/bitty-runtime/src/runtime/present.rs`) on the focused view's
top edge for 120 ms. It is a transient attention signal over content rather
than a preset-owned chrome surface, so it keeps the same amber under every
preset and every `appearance.colors` palette and a theme switch never
recolors it.

## Readability policy (shipped)

Built-in presets are user-facing defaults, so their readability is a product
contract. Every shipped preset is measured against the same WCAG 2.1 floors
and the same rules by the `bitty-config` catalog tests (which run in CI) and by
`bitty config check`; the two cannot disagree because they call the same
`contrast_checks` function.

| Role                                   | Floor                                    | Why                                                                                                                                                   |
| -------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default foreground on background       | 4.5:1 (AA normal text)                   | Body text and prompts.                                                                                                                                |
| ANSI 1–6 and 9–14 on background        | 4.5:1                                    | Syntax highlighting, `ls --color`, diffs, Vim.                                                                                                        |
| ANSI 7/15 on background (dark presets) | 4.5:1                                    | White/bright-white are text roles on dark.                                                                                                            |
| ANSI 0/8, and 7/15 on light presets    | advisory 1.2:1, reported but never gated | Surface/neutral tokens, never body text. Canonical palettes may deliberately keep them close to the background.                                       |
| Cursor fill on background              | 4.5:1                                    | The cursor is a solid block cue; a block cannot also clear 3:1 against a 4.5:1 foreground, so the glyph-under-cursor rendering is a separate concern. |
| Foreground on selection                | 4.5:1                                    | Selected text keeps its own foreground.                                                                                                               |
| Selection fill on background           | 1.3:1                                    | The selection must stay visible without relying on text color.                                                                                        |
| Cursor fill on selection               | 3:1 (AA large/UI)                        | IME preedit underline and caret over the preedit ground.                                                                                              |
| Help-panel ring on selection           | 3:1 (AA non-text)                        | Panel boundary and focus cue. The ring is ANSI 12, falling back to ANSI 4, ANSI 6, then the foreground.                                               |
| Banner text on ANSI 3                  | 4.5:1                                    | Pending-paste/close-confirm text is derived black or white, whichever measures higher.                                                                |
| Focused View outline on background     | 3:1                                      | AC-1 (RFC-0001/OQ-039); AC-2 additionally holds against the idle outline.                                                                             |

Neutral surface tokens below the advisory floor are reported as
`theme.contrast.advisory.*` and never turn `theme.contrast.result` into a
failure: several canonical palettes intentionally place ANSI 0 near a dark
background (or ANSI 15 near a light one), and that is a surface choice rather
than unreadable text.

Two rules protect palette identity while the contrast repairs are applied:

- **Hue preservation.** Text repairs change lightness and saturation only; a
  repaired slot stays within the same hue family. The only deliberate hue
  move is `one-light` ANSI 6 (cyan), which upstream aliases to ANSI 2
  (green); it is rotated to teal so the two families are distinguishable.
- **Cross-family separation.** Every pair of different chromatic ANSI
  families must separate by `ΔE*ab >= 14` (CIE76) or `>= 15°` of HSL hue.
  Normal/bright aliases inside one family are intentional and skipped.

Exemptions are explicit and fail-closed: a preset listed as exempt must still
measure below its floor, so an exemption cannot silently become dead policy.

- `solarized-light` foreground/bg is 4.13:1 upstream. Solarized is designed
  as a low-contrast scheme; the value is retained verbatim.
- Both Solarized presets retain their selection, because a visible selection
  cannot also hold selected text at 4.5:1 given their foreground headroom.
- Both Solarized presets keep the canonical neutral bright ramp (ANSI 9–14
  are `base0`/`base1`/orange tones, not six hues), so cross-family hue
  separation is exempt and documented.
- `tokyo-night-day` keeps its 1.38:1 idle outline (AC-3 advisory); see the
  outline derivation above.

## Measured preset results (shipped)

Measured by `bitty` `crates/bitty-config/src/theme.rs` (`contrast_checks`) at
the merge revision. "min ANSI text" is the worst of ANSI 1–6 and 9–14; "help
ring" includes the ANSI 4/6/foreground fallback; "min cross-family ΔE" is the
closest pair of different chromatic families after the hue rule.

| Preset                 | Category | fg / bg | min ANSI text | cursor / bg | selection text | selection fill | help ring | focused outline | min cross-family ΔE |
| ---------------------- | -------- | ------: | ------------: | ----------: | -------------: | -------------: | --------: | --------------: | ------------------: |
| `bitty-dark`           | Dark     | 11.34:1 |        7.08:1 |     12.95:1 |         8.69:1 |         1.30:1 |    5.97:1 |          8.76:1 |                27.0 |
| `tokyo-night`          | Dark     | 10.59:1 |        6.46:1 |     10.59:1 |         5.64:1 |         1.88:1 |    3.61:1 |         11.44:1 |                22.0 |
| `tokyo-night-storm`    | Dark     |  9.02:1 |        5.51:1 |      9.02:1 |         5.29:1 |         1.71:1 |    3.39:1 |          9.75:1 |                22.0 |
| `tokyo-night-day`      | Light    |  6.23:1 |        4.51:1 |      4.52:1 |         4.77:1 |         1.31:1 |    3.49:1 |          4.26:1 |                26.4 |
| `catppuccin-mocha`     | Dark     | 11.34:1 |        6.18:1 |     12.95:1 |         4.62:1 |         2.46:1 |    3.17:1 |         11.01:1 |                21.5 |
| `catppuccin-macchiato` | Dark     |  9.92:1 |        5.19:1 |     11.18:1 |         4.51:1 |         2.20:1 |    3.98:1 |          8.74:1 |                27.2 |
| `catppuccin-frappe`    | Dark     |  8.06:1 |        4.53:1 |      8.91:1 |         4.52:1 |         1.78:1 |    3.60:1 |          6.41:1 |                29.5 |
| `catppuccin-latte`     | Light    |  7.06:1 |        4.51:1 |      4.78:1 |         4.53:1 |         1.56:1 |    4.53:1 |          7.06:1 |                49.8 |
| `dracula`              | Dark     | 13.36:1 |        4.53:1 |     13.36:1 |         8.59:1 |         1.56:1 |    4.88:1 |         12.43:1 |                24.8 |
| `nord`                 | Dark     |  9.25:1 |        4.52:1 |     10.84:1 |         6.39:1 |         1.45:1 |    3.21:1 |          6.24:1 |                15.8 |
| `gruvbox-dark`         | Dark     | 10.75:1 |        4.52:1 |     10.75:1 |         4.75:1 |         2.26:1 |    4.75:1 |          7.01:1 |                23.6 |
| `gruvbox-light`        | Light    | 10.22:1 |        4.52:1 |     10.22:1 |         6.76:1 |         1.51:1 |    3.85:1 |          3.33:1 |                18.9 |
| `solarized-dark`       | Dark     |  4.75:1 |        4.51:1 |      4.75:1 |         4.11:1 |         1.15:1 |    4.11:1 |          5.61:1 |                 1.2 |
| `solarized-light`      | Light    |  4.13:1 |        4.51:1 |      4.99:1 |         3.64:1 |         1.14:1 |    4.01:1 |          3.41:1 |                 1.6 |
| `one-dark`             | Dark     |  7.22:1 |        4.82:1 |      7.22:1 |         5.52:1 |         1.31:1 |    4.98:1 |          6.51:1 |                31.2 |
| `one-light`            | Light    | 13.24:1 |        4.51:1 |      4.57:1 |         9.88:1 |         1.34:1 |    3.84:1 |          5.14:1 |                42.9 |
| `ayu-dark`             | Dark     | 10.27:1 |        6.34:1 |     10.13:1 |         4.55:1 |         2.26:1 |    4.31:1 |         13.30:1 |                44.7 |
| `ayu-mirage`           | Dark     |  9.45:1 |        5.95:1 |     10.41:1 |         4.53:1 |         2.09:1 |    4.32:1 |         10.68:1 |                38.2 |
| `ayu-light`            | Light    |  5.93:1 |        4.51:1 |      4.51:1 |         4.53:1 |         1.31:1 |    3.45:1 |          3.42:1 |                31.5 |
| `kanagawa-wave`        | Dark     | 11.26:1 |        4.51:1 |     11.26:1 |         5.97:1 |         1.89:1 |    3.83:1 |          7.23:1 |                17.3 |
| `kanagawa-lotus`       | Light    |  6.19:1 |        4.51:1 |      7.75:1 |         4.58:1 |         1.35:1 |    3.34:1 |          3.88:1 |                12.2 |
| `rose-pine`            | Dark     | 13.39:1 |        4.56:1 |     13.39:1 |         7.93:1 |         1.69:1 |    6.14:1 |         10.45:1 |                27.2 |
| `rose-pine-moon`       | Dark     | 11.86:1 |        4.52:1 |     11.86:1 |         7.41:1 |         1.60:1 |    5.74:1 |          9.19:1 |                25.4 |
| `rose-pine-dawn`       | Light    |  6.66:1 |        4.51:1 |      6.66:1 |         5.10:1 |         1.30:1 |    3.46:1 |          5.59:1 |                12.8 |
| `everforest-dark`      | Dark     |  8.62:1 |        4.52:1 |      6.32:1 |         5.99:1 |         1.44:1 |    3.15:1 |          6.88:1 |                15.9 |
| `everforest-light`     | Light    |  6.30:1 |        4.51:1 |      4.53:1 |         4.84:1 |         1.30:1 |    3.48:1 |          4.66:1 |                10.7 |
| `monokai`              | Dark     | 14.69:1 |        4.51:1 |      8.17:1 |         7.12:1 |         2.06:1 |    3.30:1 |          9.01:1 |                40.3 |
| `night-owl`            | Dark     | 13.54:1 |        5.26:1 |      8.59:1 |         4.96:1 |         2.73:1 |    3.13:1 |         11.25:1 |                28.4 |
| `github-dark`          | Dark     | 16.02:1 |        7.45:1 |      6.82:1 |         7.19:1 |         2.23:1 |    4.37:1 |         10.69:1 |                32.7 |
| `github-light`         | Light    | 15.80:1 |        4.52:1 |      5.19:1 |        10.65:1 |         1.48:1 |    3.05:1 |          5.19:1 |                24.4 |

## Ghostty alignment and recorded deviations

Where Ghostty ships a canonical theme file for a preset name
(`/usr/share/ghostty/themes/`), the preset reproduces that file's background,
foreground, cursor, selection, and 16 ANSI entries. `bitty-dark` has no
Ghostty counterpart and keeps its designed values. `everforest-dark` uses
Ghostty's `Everforest Dark Hard` background (the closest canonical file);
`everforest-light` uses `Everforest Light Med`.

A canonical value that fails a floor above is repaired minimally — lightness
first, hue preserved — and every repair is recorded below. Ghostty's
`selection-background` is frequently the foreground (an inverse selection);
Bitty keeps the selection as a ground because selected text retains its own
foreground, so those selections are adapted rather than copied. The table is
the complete deviation record; the shipped values themselves are pinned by
the catalog tests.

| Preset                 | Role        | Shipped   | Ghostty   | Reason                                                                     |
| ---------------------- | ----------- | --------- | --------- | -------------------------------------------------------------------------- |
| `tokyo-night-day`      | `fg`        | `#2A4C9B` | `#3760BF` | text contrast                                                              |
| `tokyo-night-day`      | `selection` | `#BEC7DF` | `#99A7DF` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `tokyo-night-day`      | `ansi[1]`   | `#C1214F` | `#F52A65` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[2]`   | `#526D35` | `#587539` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[3]`   | `#7C6037` | `#8C6C3E` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[4]`   | `#2563B9` | `#2E7DE9` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[5]`   | `#7E46C8` | `#9854F1` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[6]`   | `#006D91` | `#007197` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[9]`   | `#C1214F` | `#F52A65` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[10]`  | `#526D35` | `#587539` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[11]`  | `#7C6037` | `#8C6C3E` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[12]`  | `#2563B9` | `#2E7DE9` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[13]`  | `#7E46C8` | `#9854F1` | text contrast, hue preserved                                               |
| `tokyo-night-day`      | `ansi[14]`  | `#006D91` | `#007197` | text contrast, hue preserved                                               |
| `catppuccin-macchiato` | `selection` | `#565B72` | `#5B6078` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `catppuccin-frappe`    | `selection` | `#545970` | `#626880` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `catppuccin-frappe`    | `ansi[9]`   | `#E87E7E` | `#E67172` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `cursor`    | `#935C50` | `#DC8A78` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `catppuccin-latte`     | `selection` | `#BFC3CE` | `#ACB0BE` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `catppuccin-latte`     | `ansi[2]`   | `#327D22` | `#40A02B` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[3]`   | `#996214` | `#DF8E1D` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[4]`   | `#1D63EF` | `#1E66F5` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[5]`   | `#A2518C` | `#EA76CB` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[6]`   | `#13797F` | `#179299` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[9]`   | `#D2273B` | `#DE293E` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[10]`  | `#347D2C` | `#49AF3D` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[11]`  | `#95641C` | `#EEA02D` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[12]`  | `#3E63E4` | `#456EFF` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[13]`  | `#9F5488` | `#FE85D8` | text contrast, hue preserved                                               |
| `catppuccin-latte`     | `ansi[14]`  | `#227980` | `#2D9FA8` | text contrast, hue preserved                                               |
| `nord`                 | `selection` | `#434C5E` | `#ECEFF4` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `nord`                 | `ansi[1]`   | `#CF898F` | `#BF616A` | text contrast, hue preserved                                               |
| `nord`                 | `ansi[5]`   | `#B690AF` | `#B48EAD` | text contrast, hue preserved                                               |
| `nord`                 | `ansi[9]`   | `#CF898F` | `#BF616A` | text contrast, hue preserved                                               |
| `nord`                 | `ansi[13]`  | `#B690AF` | `#B48EAD` | text contrast, hue preserved                                               |
| `gruvbox-dark`         | `ansi[1]`   | `#DD6D68` | `#CC241D` | text contrast, hue preserved                                               |
| `gruvbox-dark`         | `ansi[4]`   | `#61989A` | `#458588` | text contrast, hue preserved                                               |
| `gruvbox-dark`         | `ansi[5]`   | `#BD7B99` | `#B16286` | text contrast, hue preserved                                               |
| `gruvbox-dark`         | `ansi[9]`   | `#FB5440` | `#FB4934` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `selection` | `#D5C4A1` | `#3C3836` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `gruvbox-light`        | `ansi[2]`   | `#727114` | `#98971A` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[3]`   | `#906616` | `#D79921` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[4]`   | `#3D7679` | `#458588` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[5]`   | `#9E5778` | `#B16286` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[6]`   | `#4F7751` | `#689D6A` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[10]`  | `#75700E` | `#79740E` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[11]`  | `#976211` | `#B57614` | text contrast, hue preserved                                               |
| `gruvbox-light`        | `ansi[14]`  | `#417957` | `#427B58` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[1]`   | `#E56462` | `#DC322F` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[4]`   | `#3694D5` | `#268BD2` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[5]`   | `#DD629E` | `#D33682` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[9]`   | `#D67147` | `#CB4B16` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[10]`  | `#7F9095` | `#586E75` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[11]`  | `#7E9097` | `#657B83` | text contrast, hue preserved                                               |
| `solarized-dark`       | `ansi[13]`  | `#8387CD` | `#6C71C4` | text contrast, hue preserved                                               |
| `solarized-light`      | `cursor`    | `#586E75` | `#657B83` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `solarized-light`      | `ansi[1]`   | `#D5312E` | `#DC322F` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[2]`   | `#697800` | `#859900` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[3]`   | `#8F6C00` | `#B58900` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[4]`   | `#2076B3` | `#268BD2` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[5]`   | `#CA347D` | `#D33682` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[6]`   | `#217E77` | `#2AA198` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[9]`   | `#C44915` | `#CB4B16` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[11]`  | `#60747C` | `#657B83` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[12]`  | `#667375` | `#839496` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[13]`  | `#656AB8` | `#6C71C4` | text contrast, hue preserved                                               |
| `solarized-light`      | `ansi[14]`  | `#697373` | `#93A1A1` | text contrast, hue preserved                                               |
| `one-light`            | `cursor`    | `#727272` | `#BBBBBB` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `one-light`            | `selection` | `#D9D9D9` | `#EDEDED` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `one-light`            | `ansi[1]`   | `#D23B32` | `#DE3E35` | text contrast, hue preserved                                               |
| `one-light`            | `ansi[2]`   | `#378233` | `#3F953A` | text contrast, hue preserved                                               |
| `one-light`            | `ansi[3]`   | `#82714D` | `#D2B67C` | text contrast, hue preserved                                               |
| `one-light`            | `ansi[6]`   | `#0B6E85` | `#3F953A` | cyan separated from green (upstream aliases the two families)              |
| `one-light`            | `ansi[9]`   | `#D23B32` | `#DE3E35` | text contrast, hue preserved                                               |
| `one-light`            | `ansi[10]`  | `#378233` | `#3F953A` | text contrast, hue preserved                                               |
| `one-light`            | `ansi[11]`  | `#82714D` | `#D2B67C` | text contrast, hue preserved                                               |
| `one-light`            | `ansi[14]`  | `#0B6E85` | `#3F953A` | cyan separated from green (upstream aliases the two families)              |
| `ayu-dark`             | `selection` | `#234E7D` | `#409FFF` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `ayu-mirage`           | `selection` | `#2D5787` | `#409FFF` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `ayu-light`            | `cursor`    | `#9C681F` | `#FFAA33` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `ayu-light`            | `selection` | `#CCDDF4` | `#035BD6` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `ayu-light`            | `ansi[1]`   | `#B75455` | `#EA6C6D` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[2]`   | `#49802D` | `#6CBF43` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[3]`   | `#956B2B` | `#ECA944` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[4]`   | `#2778B1` | `#3199E1` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[5]`   | `#8664A9` | `#9E75C7` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[6]`   | `#308066` | `#46BA94` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[9]`   | `#B55555` | `#F07171` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[10]`  | `#5E7D00` | `#86B300` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[11]`  | `#946B2D` | `#F2AE49` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[12]`  | `#2B78AF` | `#399EE6` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[13]`  | `#8664A8` | `#A37ACC` | text contrast, hue preserved                                               |
| `ayu-light`            | `ansi[14]`  | `#337F66` | `#4CBF99` | text contrast, hue preserved                                               |
| `kanagawa-wave`        | `selection` | `#2D4F67` | `#DCD7BA` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `kanagawa-wave`        | `ansi[1]`   | `#CF6769` | `#C34043` | text contrast, hue preserved                                               |
| `kanagawa-wave`        | `ansi[9]`   | `#EC4F4F` | `#E82424` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `selection` | `#C9CBD1` | `#545464` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `kanagawa-lotus`       | `ansi[1]`   | `#BB3C4E` | `#C84053` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[2]`   | `#5B7040` | `#6F894E` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[3]`   | `#716B3C` | `#77713F` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[5]`   | `#9F516C` | `#B35B79` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[6]`   | `#51706B` | `#597B75` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[9]`   | `#BB3E41` | `#D7474B` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[10]`  | `#56714A` | `#6E915F` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[11]`  | `#7A6745` | `#836F4A` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[12]`  | `#4C6D8D` | `#6693BF` | text contrast, hue preserved                                               |
| `kanagawa-lotus`       | `ansi[14]`  | `#507067` | `#5E857A` | text contrast, hue preserved                                               |
| `rose-pine`            | `ansi[2]`   | `#4F89A0` | `#31748F` | text contrast, hue preserved                                               |
| `rose-pine`            | `ansi[10]`  | `#4F89A0` | `#31748F` | text contrast, hue preserved                                               |
| `rose-pine-moon`       | `ansi[2]`   | `#4493B2` | `#3E8FB0` | text contrast, hue preserved                                               |
| `rose-pine-moon`       | `ansi[10]`  | `#4493B2` | `#3E8FB0` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `selection` | `#DCD7D7` | `#DFDAD9` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `rose-pine-dawn`       | `ansi[1]`   | `#A35A6F` | `#B4637A` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[2]`   | `#205870` | `#286983` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[3]`   | `#986622` | `#EA9D34` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[4]`   | `#467880` | `#56949F` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[5]`   | `#7B6891` | `#907AA9` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[6]`   | `#9E5F5D` | `#D7827E` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[9]`   | `#A35A6F` | `#B4637A` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[10]`  | `#205870` | `#286983` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[11]`  | `#986622` | `#EA9D34` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[12]`  | `#467880` | `#56949F` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[13]`  | `#7B6891` | `#907AA9` | text contrast, hue preserved                                               |
| `rose-pine-dawn`       | `ansi[14]`  | `#9E5F5D` | `#D7827E` | text contrast, hue preserved                                               |
| `everforest-dark`      | `bg`        | `#232A2E` | `#1E2326` | closest canonical variant's background                                     |
| `everforest-dark`      | `selection` | `#543A48` | `#4C3743` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `everforest-dark`      | `ansi[9]`   | `#F85855` | `#F85552` | text contrast, hue preserved                                               |
| `everforest-dark`      | `ansi[12]`  | `#4098C7` | `#3A94C5` | text contrast, hue preserved                                               |
| `everforest-light`     | `fg`        | `#4A565D` | `#5C6A72` | text contrast                                                              |
| `everforest-light`     | `cursor`    | `#A4541A` | `#F57D26` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `everforest-light`     | `selection` | `#D0D0BF` | `#EAEDC8` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `everforest-light`     | `ansi[1]`   | `#9C5557` | `#E67E80` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[2]`   | `#606F48` | `#9AB373` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[3]`   | `#7B6741` | `#C1A266` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[4]`   | `#4C706C` | `#7FBBB3` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[5]`   | `#855F72` | `#D699B6` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[6]`   | `#4E7257` | `#83C092` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[9]`   | `#B9403D` | `#F85552` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[10]`  | `#637001` | `#8DA101` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[11]`  | `#8A6300` | `#DFA000` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[12]`  | `#2C7096` | `#3A94C5` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[13]`  | `#A04C86` | `#DF69BA` | text contrast, hue preserved                                               |
| `everforest-light`     | `ansi[14]`  | `#267759` | `#35A77C` | text contrast, hue preserved                                               |
| `monokai`              | `ansi[1]`   | `#FA4988` | `#F92672` | text contrast, hue preserved                                               |
| `monokai`              | `ansi[9]`   | `#FA4988` | `#F92672` | text contrast, hue preserved                                               |
| `night-owl`            | `cursor`    | `#BDA8E0` | `#7E57C2` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `night-owl`            | `selection` | `#405F78` | `#5F7E97` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `github-dark`          | `cursor`    | `#5B9CF9` | `#2F81F7` | cursor visibility (4.5:1 block floor and 3:1 on the selection)             |
| `github-dark`          | `selection` | `#264F78` | `#E6EDF3` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `github-light`         | `selection` | `#B6D7FF` | `#1F2328` | selection ground kept as a fill (Ghostty often uses an inverse foreground) |
| `github-light`         | `ansi[12]`  | `#1C76D9` | `#218BFF` | text contrast, hue preserved                                               |
| `github-light`         | `ansi[13]`  | `#8861CE` | `#A475F9` | text contrast, hue preserved                                               |
| `github-light`         | `ansi[14]`  | `#2B8096` | `#3192AA` | text contrast, hue preserved                                               |

## Custom and third-party theme files

**Candidate, implemented-only under OQ-047.** `bitty` 0.0.26 accepts one flat,
data-only TOML file per theme in `$XDG_CONFIG_HOME/bitty/themes/*.toml`
(platform config roots; no hard-coded host path). A file is read only when
`appearance.theme` explicitly selects `local:<name>`; it never changes the
meaning of a built-in name, and the built-in/default path stays zero-I/O.

```toml
# $XDG_CONFIG_HOME/bitty/themes/sunset.toml
name = "sunset"
category = "dark"
source = "https://example.invalid/sunset"   # metadata only; never fetched
license = "MIT"
background = "#1e1e2e"
foreground = "#cdd6f4"
cursor = "#f5e0dc"
selection = "#313244"
ansi = ["#45475a", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#bac2de", "#585b70", "#f38ba8", "#a6e3a1", "#f9e2af", "#89b4fa", "#f5c2e7", "#94e2d5", "#cdd6f4"]  # exactly 16 entries
border_focused = "#33CCFF"                  # optional
border_idle = "#595959AA"                   # optional
```

The full candidate contract (schema, 64-file/64 KiB/symlink bounds, explicit
selection, readability gate, hot reload, and diagnostics) is the
[Local Theme Files design note](../specifications/local-theme-files-candidate.md).
In short:

- unknown fields, malformed hex, short/long ANSI arrays, oversize files,
  symlinks, and directories over the file cap are rejected with a bounded
  per-file diagnostic;
- every accepted file must clear the normal-text **4.5:1** and focused-outline
  **3:1** contrast floors before it can be selected;
- a valid edit hot-reloads on the existing configuration tick, while an invalid
  edit keeps the last good palette and reports `load-error`;
- `bitty list themes` marks local rows with origin `local` and keeps any
  optional upstream URL in JSON `provenance`, never in the human table.

Installed/theme-package distributions, plugin theme contribution, remote
downloads, and the `$XDG_DATA_HOME/bitty/themes/` installed half remain
unsupported and undecided. There is no network fetching on any theme path. Do
not treat the candidate schema as an accepted contract until OQ-047 closes.

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
  shipped, and the candidate local-file path above is implemented-only for
  0.0.26. The question remains Open: it still asks what schema, load path, and
  trust model are accepted, and whether local names may shadow built-ins,
  whether dual `light:`/`dark:` selections may mix local files, and how
  installed theme packages or plugin contributions enter scope.
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
