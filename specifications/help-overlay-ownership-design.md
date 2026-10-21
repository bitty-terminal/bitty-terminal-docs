---
title: Help and Which-Key Overlay Ownership Design
description: Design note that moves the help and which-key panel out of Core into a first-party plugin over a bounded read-only keymap and action registry API and a presentation-only overlay session
category: specifications
audience: maintainer
document_type: specification
status: accepted
website_publish: true
sidebar_order: 77
---

# Help and Which-Key Overlay Ownership Design

## Document status

This document records the accepted ownership design for the help and which-key
overlay tracked by
[bitty#2397](https://github.com/bitty-terminal/bitty/issues/2397). The
ownership split is accepted; the Lua spellings, capability identifier, and
error-code placement below are candidates under the open `OQ-056` API-spelling
process and do not authorize implementation by themselves. The document
describes current source as `Implemented`-only evidence at `bitty`
`origin/main` `2e0077a1`, never as `Verified`, stable, or
compatibility-guaranteed behavior. It authorizes no code, changes no accepted
security control, and closes no open question.

## Purpose and scope

The help/which-key panel is the largest remaining Core-drawn product surface
after the workspace bar, tab strip, and status-line retirements. Core currently
paints a titled floating panel listing every bound shortcut, with its own
palette tokens and a `toggle_help` chrome action. That is presentation. Core's
accepted role is the mechanism: the keymap and command registries, overlay
geometry and stacking, paint order, and key and pointer routing. The decision
about what a help surface shows, when it opens, and how its rows are formatted
belongs to a plugin.

The immediate blocker is data access: no plugin can read the resolved keymap
registry, so moving the panel without a new read surface would either keep a
private first-party channel or ship a help plugin with no data.

In scope: the ownership split, a bounded read-only keymap/action registry read
API, the first-party plugin surface over that API and the generic overlay
mechanism, the behavior-parity requirements, and the staged removal of the Core
paint path.

Out of scope and owned elsewhere: the `Esc` and confirmation-gate precedence
(`Core` safety, unchanged); the candidate Leader namespace and its which-key
candidate (unimplemented, `OQ-088`); the focusable overlay capture contract
(`bitty-docs` `UI and Input-Capture Host Contract`, unchanged and not used by
this surface); the general Plugin API v2 surface; and theme-token design.

## Normative sources this specification must not weaken

- [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md):
  Core owns workspace and panel mechanisms; presentation is plugin-only; a
  first-party plugin uses only the public surfaces and gets no private API.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): the
  keymap registry and overlay primitives are Core; plugins cannot enter the
  input, render, or parser hot paths; first-party and third-party plugins share
  one capability-gated surface.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md):
  geometry, stacking, and requested display mode are three owners; one modal
  authority per `Window`; extension must add a tier or kind, never a fourth
  overlay system.
- [UI and Input-Capture Host Contract](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/overlay-input-capture-contract.md):
  the v1 `overlay` slot is presentation-only and non-focusable; the focusable
  capture surface is a separate, capability-gated v2 grant.
- [Input and Pointer Contract](input-pointer-rfc.md): the shipped dispatch
  priority, the current help evidence, and the `Esc`-does-not-consume rule.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  and [ADR 0009](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md):
  declarative UI, capability grants, no ambient authority.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  presentation is never Terminal Truth, no hot-path execution, bounded inputs.

## Terminology

| Term                         | Meaning in this document                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keymap registry              | The resolved table of chord-to-action bindings after defaults, user overrides, and the configured Mod slot are applied.                           |
| Action catalog               | The closed `ChromeAction` vocabulary plus `command:<owner:command>` invocations; it is data, not authority.                                       |
| Binding row                  | One `{ chord, action, source, context, title?, command? }` record returned by the read API.                                                       |
| Help overlay                 | The informational floating panel listing bound shortcuts; a plugin composition, never Core chrome.                                                |
| Presentation overlay session | A non-focusable, paint-only presentation of a plugin-mounted `overlay` block, shown and hidden by the owner, with no keyboard or pointer capture. |
| Capture session              | The separate, capability-gated focusable overlay that owns transient keyboard input; not used by this design.                                     |
| Plugin suggestion            | A chord a plugin proposes for its own registered command through `bitty.keymaps.suggest`; inert until the dispatch layer publishes it.            |

## Current state (implementation evidence)

At `bitty` `origin/main` `2e0077a1`, the help panel is fully Core-owned:

| Surface                                                                              | Location                                        | Role today                                                                                                  |
| ------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ChromeAction::ToggleHelp` (`toggle_help`, alias `show_help`)                        | `crates/bitty-config/src/keymap.rs`             | Core action; default chords ``alt+` ``, `alt+?`, `alt+shift+?`, `alt+shift+/` (four bindings, one action).  |
| `help_rows_from_keymaps`                                                             | `crates/bitty-config/src/keymap.rs`             | Formats one `"<chord>  <action>"` string per resolved binding.                                              |
| `Runtime::help_visible`, `help_rows`, `set_help_rows`, `toggle_help`, `dismiss_help` | `crates/bitty-runtime/src/runtime/help.rs`      | Core state: visibility, rows, and toggle/dismiss operations.                                                |
| `paint_help_panel`, `help_panel_layout`, `HelpPanelLayout`                           | `crates/bitty-runtime/src/runtime/help.rs`      | Core geometry and paint: centered panel, border, title, rows, `+N more`, footer, clipping, glyph occlusion. |
| `HELP_PANEL_TITLE`, `HELP_PANEL_FOOTER`, `HELP_MAX_ROWS`                             | `crates/bitty-runtime/src/runtime/help.rs`      | Core content strings and the 256-row retention bound.                                                       |
| `help_panel_border_in`, `help_panel_bg_in`, `help_panel_fg_in`                       | `crates/bitty-render/src/grid.rs`               | Core palette helpers used only by the help panel.                                                           |
| `A::ToggleHelp` arm                                                                  | `crates/bitty-terminal/src/chrome_keys.rs`      | Regenerates rows from the live table, stores them, then toggles visibility on every show.                   |
| Help dismissal branch                                                                | `crates/bitty-runtime/src/runtime/selection.rs` | `Esc` dismisses the popup without consuming the press; confirmation gates keep the consume.                 |
| `help_popup.rs`, `esc_routing.rs`                                                    | `crates/bitty-runtime/tests/`                   | Geometry, clipping, row regeneration, and `Esc` routing coverage.                                           |

Two gaps block the migration:

1. **No keymap read API.** No `bitty.keymaps.*` read verb exists in
   `crates/bitty-lua/src/host.rs` or
   `crates/bitty-runtime/src/plugin_runtime/services.rs`; `bitty.keymaps.suggest`
   only writes suggestions.
2. **Plugin-suggested bindings are inert.** `bitty.keymaps.suggest` captures up
   to `REGISTRATION_MAX_KEYMAP_SUGGESTIONS` (128) suggestions at activation and
   the commit gate validates them, but the capture is not published to the
   application. `match_plugin_binding` in
   `crates/bitty-terminal/src/chrome_keys.rs` always returns `None`, and
   `DispatchPriority::Plugin` never dispatches. A plugin therefore cannot bring
   a default chord today; a user can only bind
   `command:<owner:command>` explicitly.

The v1 `overlay` slot is accepted and mountable, but the current host surfaces
an overlay block only while that plugin owns the focusable capture session
(`update_plugin_overlay` in `crates/bitty-terminal/src/terminal_app.rs`). A
presentation-only show/hide path does not exist yet; the design depends on it.

## Ownership decision

### Core keeps the mechanism

- The keymap registry, its resolution and validation, the Mod slot, user
  overrides, and dispatch priority.
- The action catalog and the command registry; command registration,
  invocation guards, and liveness checks.
- Overlay geometry, stacking, tier and kind admission, paint order, clipping,
  and the single modal authority. Core also owns the presentation overlay
  session that shows a plugin-mounted block without capturing input.
- Key routing, the `Esc` dismissal of a presentation overlay without
  consumption, and the confirmation-gate precedence.
- The host side of the keymap read API, including bounds, validation, typed
  denials, and generation fencing.
- Plugin lifecycle teardown: unload, disable, crash, and reload clear the
  plugin's overlay and bindings; no stale surface survives.

### The plugin owns the presentation

- The panel's declarative scene: title, rows, footer, empty state, and overflow
  indicator.
- Row formatting and optional ordering; the canonical data comes from the read
  API.
- Show and hide policy, including regeneration on every show.
- The `toggle` command and the suggested chords that preserve the old
  `toggle_help` binding and aliases.
- Bounded error presentation when the read API denies or is unavailable; it
  never fabricates rows or reads another source.

### No Core fallback

With zero plugins, the help overlay does not exist, and no Core action is bound
to open it. This includes `bitty --safe`: safe mode has no plugin VM, so the
command, the read API caller, and the panel are all absent. Core keeps the
keymap registry and normal dispatch; the old help chords fall through to the
terminal unless a user has bound them to something else. This is the accepted
zero-plugin baseline and matches the issue's acceptance criterion.

## Bounded keymap/action registry read API

### Surface and call shape

The read surface extends the existing `bitty.keymaps` namespace rather than
consuming a new top-level namespace:

```lua
local page, err = bitty.keymaps.list({ offset = 0, limit = 256 })
```

- `opts` is optional; `nil` is equivalent to `{}`.
- `offset` is an integer in `0..=1024` (default `0`).
- `limit` is an integer in `1..=256` (default `256`).
- Unknown fields are ignored per the v1 rule; a wrong type or an out-of-range
  value fails closed with a typed validation error before any host read.
- There is no string input of any kind. No field is interpreted as a path,
  glob, command, URL, argv entry, environment key, host name, socket, or
  pattern. The call cannot become a path, exec, or network primitive.

The result is a table:

```lua
{
  entries = {
    {
      chord = "alt+h",
      action = "goto_split:left",
      source = "default",
      context = "global",
      title = "Move focus spatially to the neighboring pane.",
    },
    {
      chord = "alt+shift+p",
      action = "command:bitty-terminal.help:toggle_help",
      source = "user",
      context = "global",
      command = "bitty-terminal.help:toggle_help",
    },
  },
  total = 95,
  offset = 0,
  truncated = false,
}
```

### Row fields

| Field     | Type            | Bound                   | Rule                                                                                                                              |
| --------- | --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `chord`   | string          | `1..=64` bytes          | Canonical chord spelling; re-parsed and re-canonicalized host-side; a malformed row is dropped, never echoed.                     |
| `action`  | string          | `1..=320` bytes         | Canonical action spelling from the closed catalog, or `command:<owner:command>`; re-parsed host-side; a malformed row is dropped. |
| `source`  | string          | `"default"` or `"user"` | Whether the winning binding came from the shipped defaults or a user override.                                                    |
| `context` | string          | `"global"`              | The only accepted context today; future contexts require a contract revision.                                                     |
| `title`   | string or `nil` | `0..=128` characters    | Static Core action description; absent for a `command:` row, whose title is resolved through `bitty.commands.list`.               |
| `command` | string or `nil` | `1..=257` bytes         | The validated qualified `owner:command` target, present only for a `command:` row; never includes arguments or argv.              |

No other fields are exposed. The API does not return the configuration file
path, raw user text, environment values, working directory, URLs, clipboard
content, terminal content, plugin store values, timestamps, or host
diagnostics.

### Caps, ordering, and truncation

- At most `256` rows per call (`KEYMAP_LIST_MAX_ROWS`) and `1024` total rows
  (`KEYMAP_LIST_MAX_TOTAL`, matching `MAX_KEYMAPS`).
- At most `65536` bytes of serialized result per call
  (`KEYMAP_LIST_MAX_BYTES`); when the byte cap is reached, deterministic tail
  truncation drops whole rows and sets `truncated = true`.
- `total` is the number of rows in the resolved table, not the number returned.
- Rows are returned in resolved-table order. The plugin may sort for display,
  but the host order is stable and deterministic.
- `offset` beyond `total` returns an empty `entries` array, `total`, and
  `truncated = false`.
- Prefix-sequence entries (`"leader <second>"`) are not part of the resolved
  immediate binding table and are not returned. The Leader namespace remains a
  candidate and needs its own contract when it lands.

### Snapshot consistency and hot-path rule

The host resolves the live keymap table at call time, clones the bounded rows,
releases the registry borrow, then marshals to Lua. It never caches rows across
calls and never invokes plugin code while holding the registry borrow. The call
is a cold-path host call from the plugin's command or timer, never a callback
from the input, parser, or render path. A configuration reload that lands
before the call is visible on the next call; the open panel is not live-updated,
matching the current behavior where rows regenerate only on each show.

### Capability and denial

The read requires a new closed identifier, **`runtime.keymaps.read`**
(candidate spelling). It belongs to the existing `runtime` family rather than a
new family, and it is distinct from `runtime.inspect`, `runtime.configure`,
`runtime.plugin-manage`, and `ui.overlay.focus`.

- Deny by default; an absent grant fails with `E_CAPABILITY_DENIED` naming the
  capability.
- No wildcard, no family-wide grant, no implicit grant from `runtime.inspect`.
- Read never implies control, dispatch, capture, or overlay presentation
  authority.
- The identifier and its closed-catalog entry are candidate under `OQ-056`; the
  capability catalog review may rename it, but the semantics above are fixed.

### Safe-mode and lifecycle behavior

| Condition                                       | Required behavior                                                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bitty --safe`                                  | No plugin VM; no caller; no help panel. Core registry and dispatch are unchanged.                                 |
| Safe policy with a VM present (host-level test) | The call fails closed with `E_CAPABILITY_DENIED`; no keymap rows cross the boundary.                              |
| Plugin disabled, unloaded, crashed, or reloaded | The generation's handles are invalid; Core clears its presentation overlay; no stale panel or stale rows survive. |
| Configuration reload while the panel is open    | The open panel keeps its current rows; the next show reads the new table.                                         |
| No source attached                              | `E_NOT_IMPLEMENTED`; the plugin shows a bounded error state, never fabricated rows.                               |

### Failure table

| Condition                        | Class        | Code                  | Effect                                              |
| -------------------------------- | ------------ | --------------------- | --------------------------------------------------- |
| Missing `runtime.keymaps.read`   | `runtime`    | `E_CAPABILITY_DENIED` | No rows returned; no state change.                  |
| `offset` or `limit` out of range | `validation` | `E_DEF_LIMIT`         | Rejected before the host read.                      |
| Wrong option type                | `validation` | `E_VALUE_TYPE`        | Rejected before the host read.                      |
| No keymap source                 | `runtime`    | `E_NOT_IMPLEMENTED`   | Plugin shows a bounded unavailable state.           |
| Malformed resolved row           | host-side    | none                  | Row dropped and counted; `truncated` set if needed. |
| Byte cap reached                 | host-side    | none                  | Whole tail rows dropped; `truncated = true`.        |

## Presentation overlay mechanism

The help panel needs a paint-only overlay that is visible without capturing
input. The accepted v1 `overlay` slot is presentation-only, but the current host
only paints a mounted overlay block while the plugin owns the focusable capture
session. The design requires one generic addition, not a help-specific one.

### Surface

```lua
local handle, err = bitty.ui.mount({ slot = "overlay", root = scene })
local ok, err = bitty.ui.overlay.show(handle)
local ok, err = bitty.ui.overlay.hide(handle)
```

The final namespace placement and verb spellings are candidate under `OQ-056`.
The semantics below are the contract:

- `bitty.ui.overlay.show` presents the block without acquiring keyboard or pointer
  capture and without requiring `ui.overlay.focus`.
- `bitty.ui.overlay.hide` removes the presentation; it is idempotent.
- The block is mounted through the accepted `overlay` slot and therefore needs
  `ui.rich` and `ui.overlay`, exactly like any overlay mount. It needs no
  capture grant.
- At most one presentation overlay exists per window. A second `show` call
  by another plugin fails closed with `E_UI_UNAVAILABLE` instead of stacking.
  The same plugin may re-show its own handle to replace content.
- The overlay is admitted as `OverlayKind::NonModal` on `OverlayTier::Popup`
  and consumes a non-modal slot under `max_overlays_per_window`. It never sets
  `modal_active` and never becomes the modal authority.
- Geometry is Core-owned: centered over the focused view, clipped to that
  frame, with the accepted v1 scene budgets. The plugin cannot set global
  coordinates or window handles.
- The overlay is paint-only: no hit-testing, no pointer capture, and no click
  routing. Clicks pass through to the grid beneath, matching the current
  paint-only help panel. This is not a focusable surface.
- The overlay follows the focused view; a focus switch re-centers it and does
  not dismiss it, matching the current panel. If a focusable capture session is
  active, the modal paints above it; `Esc` belongs to the capture session until
  it ends.
- On `Esc`, Core hides the presentation, routes the press onward (no consume),
  and emits one `overlay.dismissed` observation with
  `{ owner, handle, reason = "escape" }`. Delivery is queued to the owner's
  event path, never a synchronous callback on the input path. If a real
  confirmation gate (paste, workspace close, view/window close) also coincides,
  the gate keeps the consume and both the gate and the overlay drop together,
  preserving the current `Esc` matrix.
- Plugin unload, disable, crash, or generation change removes the overlay. No
  stale surface survives.
- No animation is required. If a future revision animates it, the accepted
  duration, easing, reduced-motion, and `--safe` collapse rules apply.

This is an extension of the existing overlay owner, not a fourth overlay system:
it adds a presentation session over the same `overlay` slot, tier, and kind
vocabulary, and it adds no parallel modal gate.

## First-party plugin surface

The first-party help plugin is an independent plugin repository and package
(candidate identity `bitty-terminal.help`, command `bitty-terminal.help:toggle_help`).
It uses the same public API as a third party and receives no private channel.

### Grants

| Capability             | Why                                  |
| ---------------------- | ------------------------------------ |
| `runtime.keymaps.read` | Read the bounded keymap/action rows. |
| `ui.rich`              | Mount a declarative scene.           |
| `ui.overlay`           | Use the accepted `overlay` slot.     |

No `ui.overlay.focus`, `terminal.*`, `clipboard.*`, `fs.*`, `process.*`,
`network.*`, `env.*`, `platform.*`, or `debug.*` grant is requested or needed.
The plugin cannot read configuration files, environment variables, terminal
content, or another plugin's state.

### Commands and bindings

- Registers one command, `toggle_help`, which opens the panel when hidden and
  hides it when shown.
- The old `show_help` Core action alias retires with the Core action. A
  configuration that used `show_help` migrates to
  `command:bitty-terminal.help:toggle_help`; the plugin does not register a
  second command for the retired alias.
- Suggests the four historical chords for its own command:
  ``alt+` ``, `alt+?`, `alt+shift+?`, and `alt+shift+/`. The suggestion layer
  applies the configured Mod slot exactly like the shipped defaults, so a
  `mod_key = "super"` configuration produces the corresponding `super+`
  spellings without a second suggestion set.
- A user binding always wins over a plugin suggestion; an explicit
  `command:bitty-terminal.help:toggle_help` binding remains the manual fallback
  while the suggestion dispatch layer is not live.

### Show flow

1. On every open, call `bitty.keymaps.list` (paging if `truncated` is true) and
   optionally join `command:` rows with `bitty.commands.list` for titles.
2. Format bounded rows, clip to the panel, and render a `+N more` tail when the
   available height cannot show every row.
3. Mount or update the scene in the `overlay` slot, then call
   `bitty.ui.overlay.show(handle)`.
4. On `Esc` or the toggle chord, hide the panel. On the `overlay.dismissed`
   observation, clear local visibility state; do not re-show.

No row cache survives across shows. If the read is denied or unavailable, the
command returns a typed error and no panel appears; the plugin does not fall
back to a hardcoded list.

### Behavior-parity constraints

| Requirement from the issue                        | Plugin/mechanism behavior                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regeneration from the live registry on every show | The plugin calls `bitty.keymaps.list` on every open; the host resolves the live table at call time; no cache across calls.                                 |
| `Esc` dismissal that does not consume the press   | Core hides the presentation overlay, routes the `Esc`, and emits `overlay.dismissed`; a coincident confirmation gate keeps the consume.                    |
| The `toggle_help` binding and aliases             | The plugin registers `toggle` and suggests the four historical chords; the Mod slot is applied by the suggestion layer; a user binding always wins.        |
| Bounded rows and clipping                         | 256 rows per call, 64 KiB per response, a 256-row panel retention bound, frame clipping, and a bounded `+N more` tail.                                     |
| Informational, not modal                          | No capture grant; the overlay is `NonModal` on `Popup`; other bound chords still dispatch and unbound keys still reach the shell.                          |
| Follows the focused view                          | Core re-centers the presentation on the focused view; a focus switch does not dismiss it.                                                                  |
| Tiny views                                        | Core refuses to paint when the frame is too small to hold a legible panel; the state stays available for a later resize, matching the current layout rule. |
| Theme integration                                 | The plugin uses the host's closed theme tokens; the help-specific palette helpers are retired with the Core panel.                                         |

## Dependency: live plugin-suggested bindings

The historical chords cannot come from the plugin until the reserved
`DispatchPriority::Plugin` layer is live. The current capture path validates
suggestions but does not publish them to the application, and
`match_plugin_binding` is a deny-by-default stub. The required layer is:

- Active generations' suggestions, ordered deterministically, consulted after
  the user table and before terminal encoding, exactly at the existing reserved
  slot.
- An explicit user binding always wins; a suggestion never shadows it.
- The configured Mod slot is applied to `alt`-bearing suggestions so the
  historical chords follow `mod_key`.
- Only a command registered by the same generation can be suggested; an
  unqualified, foreign, stale, or suspended target fails closed.
- Unload, disable, crash, or generation change removes the suggestions.
- No plugin callback runs on the input path; dispatch invokes the registered
  command through the normal host-mediated path.

This is a separate Core task from the read API. Without it, the plugin remains
usable only with a manual `command:` binding, and the "binding and aliases"
parity requirement is not met, so #2397 cannot close.

## Removal plan

Each stage is a tracked task; none is authorized by this document alone.

| Stage | Scope                                                                                                                                                                                                                                                                                                                   | Exit condition                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1     | Add the `runtime.keymaps.read` identifier, the host keymap source, `bitty.keymaps.list`, bounds, redaction, and typed denials.                                                                                                                                                                                          | Headless tests cover caps, ordering, truncation, denial, no-source, and no hot path.                                       |
| 2     | Add the presentation overlay session: show/hide, `NonModal`/`Popup` admission, Core geometry, paint-only behavior, `Esc` dismissal observation without consumption, and teardown.                                                                                                                                       | Headless tests cover `Esc` delivery to the PTY, confirmation-gate precedence, clipping, one-surface admission, and unload. |
| 3     | Make plugin-suggested bindings live at the reserved priority slot, including Mod application and unload cleanup.                                                                                                                                                                                                        | Tests cover user-wins, Mod flip, owner-only targets, stale generation, and terminal fall-through.                          |
| 4     | Publish the first-party help plugin: command, suggestions, scene, paging, clipping, empty/error states, and plugin tests.                                                                                                                                                                                               | Plugin parity matrix passes against the Core behavior; no private API.                                                     |
| 5     | Remove the Core paint path and state: `help.rs`, `help_visible`/`help_rows`/`set_help_rows`/`toggle_help`/`dismiss_help`, `paint_help_panel`/`help_panel_layout`/`HelpPanelLayout`, `HELP_*`, and the `present.rs` call.                                                                                                | Zero-plugin and `bitty --safe` draw no panel; no dead code; no coverage deleted.                                           |
| 6     | Remove `ChromeAction::ToggleHelp`, the `toggle_help`/`show_help` parse arms, catalog/description/hint entries, the four default chords, and the `chrome_keys` arm; decide and document the unknown-action migration.                                                                                                    | Config validation fails closed for the retired spellings with a migration note; tests updated.                             |
| 7     | Remove `help_panel_border_in`/`help_panel_bg_in`/`help_panel_fg_in` and their tests; update any theme-token list.                                                                                                                                                                                                       | No renderer or theme reference remains.                                                                                    |
| 8     | Update canonical docs: this document, [Input and Pointer Contract](input-pointer-rfc.md) implementation evidence, the [Configuration Model RFC](configuration-model-rfc.md) action list, the [configuration options](../reference/configuration-options.md) catalog, the shipped-defaults reference, and release notes. | Docs describe the plugin as the surface and the retired Core action honestly; migration is documented.                     |
| 9     | Close [bitty#2397](https://github.com/bitty-terminal/bitty/issues/2397) only after stages 1-8 are merged and shipped and the zero-plugin and safe-mode criteria are verified.                                                                                                                                           | Acceptance criteria met by shipped code, not by this design.                                                               |

### Removal inventory

| Surface                                                                    | Disposition                                                                                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `crates/bitty-runtime/src/runtime/help.rs`                                 | Delete the module after stage 4 parity.                                                                                     |
| `Runtime` help fields and methods                                          | Delete with the module; no Core fallback state remains.                                                                     |
| `ChromeAction::ToggleHelp` and `toggle_help`/`show_help`                   | Retire; config files using them fail closed with a migration message pointing at `command:bitty-terminal.help:toggle_help`. |
| Four default help chords                                                   | Move to the plugin's suggestions; not Core defaults.                                                                        |
| `help_rows_from_keymaps`                                                   | Retire from the public helper surface; the read bridge returns structured rows, not formatted strings.                      |
| `HELP_PANEL_TITLE`, `HELP_PANEL_FOOTER`, `HELP_MAX_ROWS`, `HELP_MIN_INNER` | Delete; title/footer become plugin content and the row bound becomes the API/panel bound.                                   |
| `help_panel_border_in`, `help_panel_bg_in`, `help_panel_fg_in`             | Delete; the plugin uses standard theme tokens.                                                                              |
| `help_popup.rs` and help cases in `esc_routing.rs`                         | Move coverage to the plugin and the presentation overlay mechanism; keep the Core `Esc`/confirm matrix.                     |
| `present.rs` help paint call                                               | Delete with the module.                                                                                                     |
| `selection.rs` help dismissal branch                                       | Delete; gate precedence stays untouched.                                                                                    |

The removal must not delete coverage. Every behavior the current help tests pin
either moves to a plugin test, becomes a presentation overlay mechanism test,
or stays as a Core `Esc`/confirmation test with the help-specific setup removed.

## Security review

This design is presentation and read-only metadata, not a new trust boundary,
but it touches the input and overlay paths:

- The read API takes no path, command, URL, argv, environment, or pattern
  input; it cannot become a path, exec, or network primitive.
- The read API returns only validated, canonical binding metadata. It never
  returns configuration file paths, raw user text, terminal content, clipboard,
  environment values, or plugin store data.
- The plugin receives no key capture, no input callback, no terminal read, no
  filesystem, process, network, or clipboard authority, and no private channel.
- The presentation overlay is paint-only, non-modal, and cannot set the modal
  authority or capture input. It adds no parallel modal gate.
- `Esc` routing and confirmation-gate precedence stay Core-owned and unchanged;
  the overlay dismissal observation is queued, not a hot-path callback.
- Safe mode loads no plugin VM, draws no help panel, and keeps the keymap
  registry and dispatch functional.

No P0 control is weakened. A security reviewer is required if a later revision
adds key capture, free-text action arguments, or pointer routing to the surface.

## Verification plan

1. Read API caps: 256 rows per call, 1024 total, 64 KiB response, deterministic
   tail truncation with `truncated = true`, offset beyond total, and malformed
   row dropping.
2. Read API denial: missing grant, safe policy, no source, wrong option type,
   and out-of-range offset or limit each return the typed failure and no rows.
3. Read API content: no path, argv, environment, URL, terminal content, or
   config path appears in any field; `command:` rows carry only the qualified
   target.
4. Presentation overlay: `Esc` hides the overlay and still delivers `0x1b` to
   the PTY; a pending paste, workspace close, or view/window close still
   consumes the press and drops both; a release does not dismiss.
5. Presentation overlay bounds: one surface per window, `NonModal`/`Popup`
   admission, no `modal_active`, frame clipping, tiny-view no-paint, and
   unload/crash teardown.
6. Suggestion layer: user binding wins, Mod flip produces the expected chords,
   stale/foreign/unregistered targets fail closed, and unload removes the
   binding.
7. Plugin parity: rows regenerate on every show; 256-row and clipping behavior
   match the old panel; no cache; denied read shows no fabricated rows.
8. Zero-plugin and `bitty --safe`: no help panel, no help command, no help
   chords bound by Core, and all other key dispatch unchanged.
9. Documentation gates: the repository-local `just check` passes with zero
   issues.

## Alternatives considered

| Alternative                                                         | Trade-off                                                                                                    | Disposition                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Keep the Core help panel                                            | No new API and no migration, but leaves a product surface in Core and contradicts ADR 0014                   | Rejected; this is the surface being retired                                         |
| Move the panel without a read API                                   | No new capability, but the plugin has no data or needs a private channel                                     | Rejected; the issue's explicit blocker                                              |
| Expose the whole keymap table in one call                           | Simple plugin code, but a large unbounded-shaped result and no paging discipline                             | Rejected; capped pages with `truncated` keep the bridge bounded                     |
| Reuse `runtime.inspect` for the read                                | No new identifier, but grants a broad runtime-inspection capability for a narrow metadata read               | Rejected; a narrow read head is the safer grant                                     |
| Reuse `ui.overlay.focus` capture for the help panel                 | No new presentation mechanism, but `Esc` would be consumed and the informational panel would become modal    | Rejected; violates the parity and non-modal requirements                            |
| Add a new top-level `bitty.overlay` namespace                       | Names the operation directly, but consumes a new top-level namespace and splits UI surfaces                  | Rejected; the existing `bitty.ui` and `bitty.keymaps` namespaces are the closer fit |
| Keep `toggle_help` as a Core action that invokes the plugin command | Preserves the old chord without the suggestion layer, but keeps a Core action and a private first-party path | Rejected; the command must be a plugin command                                      |
| Ship the plugin without default chords                              | No dependency on the suggestion layer, but breaks the binding/alias parity requirement                       | Rejected as the final state; acceptable only as an interim manual-binding path      |

## Affected contracts

| Contract                                                                                                                                          | Effect                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                                                                  | Gains the help/which-key ownership row and the keymap read surface in the extension composition.                             |
| [Input and Pointer Contract](input-pointer-rfc.md)                                                                                                | Its implementation-evidence help section gains the decided migration and stops being the final ownership statement.          |
| [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)                                                                           | Gains the presentation-only help surface as a `NonModal`/`Popup` consumer; the three-owner boundary is unchanged.            |
| [Chrome Surface API (Candidate)](chrome-surface-api-candidate.md) and [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) | The help panel is not a chrome slot; no band or chrome-surface claim is added.                                               |
| [Configuration Model RFC](configuration-model-rfc.md) and [configuration options](../reference/configuration-options.md)                          | The action catalog changes when `toggle_help` retires; the migration is part of stage 8.                                     |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)              | The read verb and presentation overlay are additive host-mediated surfaces; exact spellings remain candidate under `OQ-056`. |
| [Platform Services Contract](platform-services-contract.md)                                                                                       | Unchanged; the notification banner is not a help surface.                                                                    |

## Open points

- `OQ-056` owns the final Lua spellings, capability identifier, and API
  version boundary for `bitty.keymaps.list` and the presentation overlay verbs.
- The presentation overlay's exact error-code placement (`E_UI_UNAVAILABLE`
  versus a new typed code) is candidate and follows the existing UI error
  family.
- Whether the overlay follows a focus switch or hides on it is fixed here as
  "follows", matching the current panel; a later UX decision may change it.
- The plugin's exact repository name, package identity, and whether it enters
  the enabled-by-default set belong to the distribution decision, not this
  design.
- The Leader namespace and its which-key candidate remain unimplemented
  (`OQ-088`); this API deliberately exposes only immediate chords.

## Acceptance criteria

1. The ownership split is recorded: Core keeps the keymap registry, dispatch,
   overlay geometry/stacking, `Esc` routing, and the read API host; the help
   panel is plugin presentation with no Core fallback.
2. The read API is bounded, read-only, capability-gated, redacted, and takes no
   input that could become a path, exec, or network operation.
3. The first-party plugin surface uses only public grants and preserves the
   four behavior-parity constraints from the issue.
4. The removal plan names every Core symbol and test to retire and a stage that
   keeps or moves its coverage.
5. Zero plugins and `bitty --safe` draw no help panel; `toggle_help` is a
   plugin command, not a Core action.
6. Docs no longer describe `help.rs` as the shipped surface once the removal
   merge lands; before then, the implementation evidence is labeled honestly.
7. `just check` passes with zero issues.

## P0 Review Sign-off

Not required for this design record: it adds no capability, no hot-path
callback, no capture authority, and no Terminal Truth access, and it weakens no
P0 control. The input-path and overlay rules above restate existing controls.
Independent security review is required before implementation if a later
revision adds key capture, free-text action arguments, or pointer routing.

## References

- [bitty#2397](https://github.com/bitty-terminal/bitty/issues/2397) - the
  ownership question, blockers, scope, and acceptance criteria.
- [ADR 0014 - Workspace as Core Mechanism with Plugin-Only Presentation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  - the accepted mechanism/presentation boundary.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md) - Core
  ownership, plugin ownership, and the extension composition.
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md) -
  the three overlay owners, tiers, kinds, and single modal authority.
- [UI and Input-Capture Host Contract](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/overlay-input-capture-contract.md)
  - the v1 presentation-only overlay slot and the separate capture grant.
- [Input and Pointer Contract](input-pointer-rfc.md) - dispatch priority,
  shipped help evidence, and the `Esc` rules.
- [Platform Services Contract](platform-services-contract.md) - the
  notification primitive and its display floor, which is not a help surface.
- [Documentation workflow](../docs/development/documentation-workflow.md) -
  metadata, status, and review rules.
