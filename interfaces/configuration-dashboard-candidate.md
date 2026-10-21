---
title: Configuration dashboard (Candidate)
description: Core-owned configuration panel for profile theme font decoration plugins settings and extensions with the deferred config.manage write contract
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: true
sidebar_order: 37
---

# Configuration dashboard (Candidate)

## Document status

> Status: **draft candidate**. The read-only surface and the two bounded writes
> described under "Shipped MVP" exist in `bitty` `0.0.25` and carry
> implementation evidence in that repository. The `config.manage` host
> capability, its typed methods, and any persisted theme/profile/dashboard
> write are **candidate** and authorize nothing: no capability id is accepted,
> no Lua surface exists, and no security review has signed them off. This
> document weakens no accepted source it cites.

## Purpose and scope

Users who do not want to edit `init.lua` or drive the CLI still need to answer
four questions: what configuration is active, which plugins are installed and
enabled, what one plugin's settings are, and where the files live. The
configuration dashboard is a single full-panel surface for those answers, opened
from a keybinding the user binds explicitly.

In scope:

- D-1: the shipped read-only sections and their bounds;
- D-2: the two writes the MVP performs, each through an existing Core path;
- D-3: the deferred `config.manage` capability that would allow persisted
  theme/profile/settings writes, with typed methods, bounds, consent, atomic
  user-layer write rules, and the security review it must pass.

Out of scope: arbitrary file editing, shell execution, network access, plugin
installation from the panel, live profile switching, and any plugin-visible
dashboard API. Those stay separate decisions.

## Normative sources this specification must not weaken

- The plugin platform contract in
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs) and
  the capability vocabulary (`bitty-plugin-host::capability`): deny by default,
  closed identifiers, no wildcard, no first-party bypass.
- [CLI contract RFC](../specifications/cli-contract-rfc.md): the `bitty config`,
  `bitty plugin`, and `bitty extension` verbs remain the authority the panel
  reads.
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md): one user
  layer, `CLI > file > profile > defaults`.
- Shared security corpus in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): required controls
  override this document where they disagree.

## Terminology

| Term            | Meaning                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Panel           | The Core-owned full-panel overlay described here.                                                 |
| Snapshot        | Plain, bounded data the app builds on a cold path and hands to the runtime.                       |
| Intent          | A typed row action (`preview theme`, `set plugin enabled`) the app applies after confirmation.    |
| Session consent | The second `Enter` on the same row; any move cancels it.                                          |
| User layer      | `$XDG_CONFIG_HOME/bitty/init.lua` and its sibling plugin files, never a profile or a system path. |

## D-1 Shipped surface (0.0.25)

### Shape

The panel is a near-full-panel overlay on the focused view (one-cell margin,
minimum 30×9 cells; below that it paints nothing and stays open for a later
resize). It is Core presentation state: fills and glyphs only, never grid
truth, scrollback, layout, focus, or terminal state.

| Section    | Rows                                                                                                                   | Source                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Overview   | profile, resolved theme + layer, font family/size, decoration geometry, config path, one row per built-in theme preset | effective config, live runtime values, startup paths  |
| Plugins    | one row per bundled catalog entry and installed record: state, source, version                                         | managed plugin manifest + package store index         |
| Settings   | one row per declared setting: current value, shipped default, source (`user`/`default`)                                | manifest `[settings]` schema + the plugin's user file |
| Profiles   | `default` plus every valid `profiles/<name>.lua` with the active marker                                                | profiles directory                                    |
| Extensions | one row per installed native extension: active version, tier, version count                                            | component inventory                                   |

### Opening and navigation

There is no shipped default chord: the action never enters `DEFAULT_KEYMAPS`,
so a fresh configuration keeps Normal Mode byte-identical. The user opts in:

```lua
keymaps = {
    { chord = "alt+c", action = "toggle_dashboard", context = "global" },
}
```

`toggle_dashboard` (aliases `config_dashboard`, `dashboard`) toggles the panel
and is also reachable from any surface that dispatches chrome actions
(`ChromeAction::ToggleDashboard`). The open is refused while a plugin overlay
holds transient input capture, so two surfaces never compete for the same keys.

While open the panel is modal for **unmodified** keys: `j`/`k` (or arrows) move,
`h`/`l` (or left/right, Tab) changes section, `1`–`5` jump, `g`/`G` jump to the
first/last row, `PageUp`/`PageDown` page, `Enter` activates, `r` reloads the
snapshot, and `q`/`Esc` closes. Chorded presses (Ctrl/Alt/Super) stay with the
user keymap, which is how the toggle chord closes the panel again. Nothing typed
while open reaches the shell.

### Bounds and fail-closed rules

| Bound               | Value                    | Effect                                             |
| ------------------- | ------------------------ | -------------------------------------------------- |
| rows per section    | 128                      | tail replaced by a visible `+more` note row        |
| label / value bytes | 48 / 96                  | truncated on a character boundary with an ellipsis |
| note bytes          | 96                       | truncated on a character boundary                  |
| snapshot rebuild    | open, `r`, after a write | no polling, no per-frame I/O                       |

A section whose source fails (unreadable managed manifest, unreadable store
index, missing config root, unreadable profiles directory) renders
`unavailable: <reason>` and exposes **no** actionable row. An empty result is
reported as an empty result ("none installed"), never conflated with a failure.
The panel reads no environment dump, credential, token, or process command line,
so it cannot leak a secret by construction.

## D-2 Shipped writes (0.0.25)

Every write is typed, confirmed in-panel, and routed through a mutation path
that already exists. The runtime performs none of them: it returns an intent and
the app applies it.

### Theme preview (non-persisting)

Selecting a preset header row and pressing `Enter` twice calls
`Runtime::preview_theme_preset`, which validates the name against the closed
preset registry, then live-applies the palette through `set_theme_palette` —
exactly the `bitty.theme.preview` path. No file is written. The Overview labels
the result `live preview, not saved` and the persisted layer label returns on
the next config reload or restart. An unknown name is refused with the palette
untouched.

### Plugin enable / disable (persisting, atomic)

A bundled plugin row with a managed record reveals `SetPluginEnabled`. The app
calls the managed-manifest enable/disable path the `bitty plugin enable|disable`
CLI owns: load → re-check the recorded pin and granted set → mutate → the
existing atomic write (temporary file, `fsync`, rename, `.bak`, owner-only
mode). The CLI's checks are unchanged, so a manifest whose pin or grants moved
is refused with the CLI's diagnostic instead of written. An unknown record is
refused, and no file is created.

### Read-only by design

Profiles list and switch semantics are restart-scoped today (a launch selects
one profile; `init.lua` still wins). The panel therefore lists profiles and
names the active one without offering a switch. Settings rows are read-only
because no Core API can write one plugin setting atomically yet. Both gaps are
D-3 work, not silent authority.

## D-3 Deferred `config.manage` capability (Candidate)

A persisted write surface requires a new capability; it is **not** implemented
in 0.0.25 and must not be added without this section's review. Read access does
not need it: the panel is Core UI and reads Core state directly. A plugin-visible
read API would reuse the accepted `runtime.inspect` head and stay separate.

### Capability

| Field     | Value                                                                    |
| --------- | ------------------------------------------------------------------------ |
| id        | `config.manage`                                                          |
| family    | new `config` family beside `terminal.*`, `runtime.*`, `workspace.*`      |
| risk      | high (writes user configuration)                                         |
| parameter | none; scope travels with each call                                       |
| grant     | explicit consent bound to the manifest hash, like every other capability |
| holders   | only the trusted bundled dashboard identity; never a third-party id      |

`config.manage` never implies filesystem authority. No method accepts a path,
a command, a URL, or raw Lua text.

### Typed methods

All values are validated by the `bitty-config` typed plan before any write.
Unknown keys fail closed; no method takes a table of loose key/value pairs.

| Method                             | Arguments                         | Result                                        | Notes                                                                                                  |
| ---------------------------------- | --------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `config.get(key)`                  | one dotted key from the allowlist | typed value + source layer                    | `appearance.theme`, `font.family`, `font.size`, `decoration.*`, `close_confirm`, `terminal.scrollback` |
| `config.set(key, value)`           | allowlisted key + typed value     | applied/source                                | re-validated by the planner; persisted to the user layer only                                          |
| `config.sources()`                 | none                              | bounded list of `(key, layer)`                | read-only layer attribution                                                                            |
| `plugins.list()`                   | none                              | bounded rows `(id, enabled, source, version)` | no grants in the payload                                                                               |
| `plugins.set_enabled(id, enabled)` | qualified id + bool               | changed bool                                  | re-checks pin and grants; refuses unknown records                                                      |
| `profiles.list()`                  | none                              | bounded names + active marker                 | read-only                                                                                              |
| `profiles.use(name)`               | validated name                    | pending-restart marker                        | only after a live re-merge contract exists                                                             |

Bounds: at most 64 rows per list, 128 bytes per string, 64 bytes per key,
1 KiB per value table, 16 calls per second per generation, 4 KiB per
generation per second, and a 10 ms wall budget per call. A violated bound fails
closed with a typed error; nothing is clamped silently.

### Consent and write rules

1. The capability is requested in the manifest and granted only by explicit
   user consent bound to that manifest hash; an update that adds it re-prompts.
2. Every write carries a panel-level confirmation (two `Enter` presses on the
   same row) and a per-generation call budget; there is no "write everything"
   call.
3. Writes go to the user layer only: `<config-root>/bitty/…`. Profiles, system
   paths, and the managed plugin ledger are never written by `config.set`.
4. The write is atomic and durable: temp file in the same directory, `fsync`,
   rename, directory `fsync`, owner-only mode (`0600`), and a `.bak` of the
   previous content. A crash leaves either the old or the new file, never a
   partial one.
5. Theme and profile writes are structured settings, not rewritten Lua source.
   The dashboard never edits `init.lua` text; it records the value in a managed
   settings file the config loader merges at the same user-layer precedence.
6. A refused validation, consent, or write leaves memory and disk unchanged and
   reports the reason; no partial application, no screen/file divergence.
7. `--safe` and read-only filesystems fail closed: the panel reports the
   refusal and keeps the previous state.

### Security review (required before acceptance)

| Threat                                      | Control                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Arbitrary file write / path traversal       | no path argument; the target directory is resolved by Core; keys are an allowlist                |
| Secret exfiltration                         | no env/credential/process reads; values are config scalars; rows are bounded display strings     |
| Consent bypass or silent re-grant           | hash-bound grants; added capability re-prompts; in-panel confirmation is separate from the grant |
| TOCTOU between read and write               | write re-validates against the live typed plan under the same lock the CLI uses                  |
| Stale row applied to a different generation | every intent re-checks the record/pin at apply time and refuses on mismatch                      |
| Symlink or foreign-owner target             | Core resolves and validates the target directory; the CLI's owner-only hardening applies         |
| Denial of service through write volume      | per-call and per-generation budgets; bounded keys and values                                     |
| Partial write after crash                   | temp + `fsync` + rename + directory `fsync`; `.bak` retention                                    |

Status of this review: **open**. It is not an accepted control set until the
shared security corpus records it; reviewers must treat the table as a proposal,
not evidence.

## Relation to existing systems

- `bitty config path|check|edit` remains the file-level authority; the panel
  links to the same resolved path and never replaces `config edit`.
- `bitty plugin list|info|enable|disable` remains the ledger authority; the
  panel reuses its reads and its enable/disable mutation.
- `bitty extension list` remains the component authority; the panel reuses
  `discover_components`.
- `bitty list themes` and the theme registry remain the preset authority; the
  panel resolves names through the same closed registry.

## Alternatives considered

1. **Ship a bundled Lua plugin (`bitty-terminal.dashboard`).** Rejected for
   0.0.25: the bundled catalog is a manifest-only dogfood set with an empty
   `bundled_roots`, so no Lua payload can ship inside the binary; a manifest id
   backed by Core code would be a private channel. A real bundled payload needs
   its own packaging decision.
2. **Ship a separate official plugin repository.** Rejected for the MVP: the
   plugin would need a read API plus write authority before it could show
   anything, which is exactly the `config.manage` work this document defers.
3. **Add `config.manage` now.** Rejected: it widens authority before the
   security review and before a structured user-layer settings store exists.
4. **Rewrite `init.lua` text for writes.** Rejected: fragile against user
   formatting and comments; structured settings with the same precedence are
   auditable and atomic.

## Affected contracts

- `ChromeAction` gains `toggle_dashboard` (parseable, manual-bind-only).
- `bitty list actions` gains one row; the manual actions catalog follows.
- No capability id, plugin manifest, Lua namespace, or file format changes in
  0.0.25. D-3 would add the `config` capability family and a managed settings
  file, both of which need their own accepted contracts.

## Open points

1. OQ-D1: whether `config.manage` belongs in the capability vocabulary as one
   head or as `config.read` + `config.write` (read never implies control, the
   pattern used by `terminal.*`).
2. OQ-D2: live profile switching semantics — re-merge in place versus a
   restart-required marker — before `profiles.use` can exist.
3. OQ-D3: the structured user-layer settings file format and its interaction
   with `init.lua` precedence.
4. OQ-D4: whether the dashboard should later be packaged as a bundled plugin
   once payload shipping exists, and whether the panel then keeps the same
   surface.
5. OQ-D5: an accessibility pass (screen-reader description, monochrome/contrast
   behavior) for the selected-row highlight.

## Acceptance criteria

- The panel opens from a user binding and from the chrome action, and closes on
  `q`, `Esc`, or the toggle chord.
- Unmodified keys never reach the PTY while the panel is open; chorded keys keep
  working.
- Every section renders either bounded data or an explicit `unavailable`
  reason; no section silently reads as empty on failure.
- No plugin VM is created, no file is read on the hot path, and no shell or
  network call is made by the panel.
- Theme preview changes the live palette and leaves the config file
  byte-identical.
- Plugin enable/disable stays byte-identical to the CLI's managed-manifest
  result, requires two presses, and refuses unknown or stale records.
- Every write is refused without an armed confirmation.

## P0 Review Sign-off

- Implementation review: pending (independent reviewer, separate from the
  implementer).
- Security review: pending for D-3 only; the shipped D-2 writes reuse accepted
  paths and add no capability.

## References

- [Command-line interface](cli.md)
- [Plugin Configuration](https://github.com/bitty-terminal/bitty-manual/blob/main/en/configuration/plugin-config.md)
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md)
- [Theme presets](../configuration/themes.md)
- [Plugin platform contract](https://github.com/bitty-terminal/bitty-plugins-docs)
