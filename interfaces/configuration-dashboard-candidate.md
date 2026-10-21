---
title: Configuration dashboard (Plugin) (Candidate)
description: Plugin-owned configuration and status panel with read-only Core state queries and the deferred typed write contract
category: specifications
audience: mixed
document_type: specification
status: draft
website_publish: true
sidebar_order: 37
---

# Configuration dashboard (Plugin) (Candidate)

## Document status

> Status: **draft candidate**. Presentation belongs to plugins/extensions; Core
> owns mechanism only. The dashboard is a **plugin** (`bitty-terminal.dashboard`),
> not a Core surface. An earlier Core UI implementation was drafted and
> withdrawn without merging; it is not shipped, and no Core presentation code
> for this feature exists.
>
> The read-only Core query this plugin needs (`bitty.runtime.inspect`, issue
> bitty#2396) and the typed write capability (`config.manage`, issue bitty#2393)
> are **candidate**. This document authorizes nothing by itself: no capability
> id is accepted, no Lua surface exists, and no security review has signed them
> off. It weakens no accepted source it cites.

## Purpose and scope

Users who do not want to edit `init.lua` or drive the CLI need to answer four
questions: what configuration is active, which plugins are installed and
enabled, what one plugin's settings are, and where the files live. The
configuration dashboard plugin answers them in one full-panel overlay using the
accepted plugin UI surface.

In scope:

- P-1: the plugin surface, its read-only sections, bounds, and fail-closed
  behavior (acceptance criteria, not shipped code);
- P-2: the read-only Core state query the plugin consumes, with its capability
  and security constraints;
- P-3: the deferred `config.manage` capability that would allow persisted
  writes, with typed methods, bounds, consent, atomic user-layer write rules,
  and the security review it must pass.

Out of scope: Core-owned dashboard presentation, arbitrary file editing, shell
execution, network access, plugin installation from the panel, live profile
switching, and any dashboard-specific Core UI component. Those stay separate
decisions.

## Normative sources this specification must not weaken

- The plugin platform contract in
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs) and
  the capability vocabulary (`bitty-plugin-host::capability`): deny by default,
  closed identifiers, no wildcard, no first-party bypass.
- [CLI contract RFC](../specifications/cli-contract-rfc.md): the `bitty config`,
  `bitty plugin`, and `bitty extension` verbs remain the authority the plugin
  reads.
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md): one user
  layer, `CLI > file > profile > defaults`.
- Shared security corpus in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): required controls
  override this document where they disagree.

## Terminology

| Term            | Meaning                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| Plugin          | `bitty-terminal.dashboard`, an official package installed through the normal plugin pipeline.     |
| State query     | The read-only, bounded Core call the plugin consumes (`bitty.runtime.inspect`).                   |
| Session consent | The second `Enter` on the same row in the plugin UI; any move cancels it.                         |
| User layer      | `$XDG_CONFIG_HOME/bitty/init.lua` and its sibling plugin files, never a profile or a system path. |

## P-1 Plugin surface (acceptance criteria)

### Shape

A near-full-panel focusable overlay (`ui.overlay.focus`, the accepted W-01
capture contract) opened by the plugin's command. The plugin paints
through `bitty.ui.overlay.update`; it holds no terminal-grid authority.

| Section     | Rows                                                                                                                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview    | profile, resolved theme + layer, font family/size, decoration geometry, config path                                                                                                                                               |
| Plugins     | one row per bundled catalog entry and installed record: state, source, version                                                                                                                                                    |
| Settings    | one row per declared setting of every installed plugin: current value, shipped default, source (`user`/`default`)                                                                                                                 |
| Profiles    | `default` plus every valid `profiles/<name>.lua` with the active marker                                                                                                                                                           |
| Extensions  | per extension: active version, tier, ABI, descriptor digest, target path, last-recorded activation, liveness (explicitly not probed), trust derived from that record, and the exact install/update/remove CLI command (read-only) |
| Diagnostics | app version; config file and directory; plugin ledger; plugin store; extension user/system roots; extension state root; profile and theme source layers; each path marked present/missing                                         |

A read-only Overview/Plugins/Extensions/Diagnostics slice is the MVP; Settings,
Profiles, and any write row stay read-only until P-3 lands.

### Navigation and bounds

`j`/`k` (or arrows) move, `h`/`l` (or left/right, Tab) change section, `1`–`6`
jump, `g`/`G` first/last, `PageUp`/`PageDown` page, `Enter` activates, `r`
reloads the state query, and `q`/`Esc` closes. The plugin owns the overlay
capture while open; nothing typed reaches the shell.

Bounds: at most 128 rows per section, 96 bytes per ordinary string, 240 bytes
per path (long macOS temp roots must not clip the marker or executable name),
and a full state query at most 64 KiB. Rows past the cap are replaced by a
visible `+N more` note. A view too small for a legible panel shows
`terminal too small` instead of consuming keys invisibly.

### Fail-closed

Every section either renders bounded data or `unavailable: <reason>`. An
unreadable managed manifest, store index, profiles directory, or extension root
must never read as "none installed". The plugin reads no environment dump,
credential, token, or process command line, so it cannot leak a secret.

## P-2 Read-only Core state query (candidate)

Core provides one typed query; the plugin supplies no paths and gets no
authority beyond reading this snapshot.

| Field         | Content                                                                                                                                                                | Bounds     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `diagnostics` | app version; config file/dir; plugin ledger; store root; extension user/system roots and state root; profile name + source layer; theme name + layer; font; decoration | 240 B/path |
| `plugins`     | `(id, name, version, source, enabled, recorded)`                                                                                                                       | 128 rows   |
| `settings`    | `(plugin_id, key, current, default, source)` where source is `default`/`user`/`host` from the existing settings resolver                                               | 256 rows   |
| `extensions`  | `(name, version, tier, abi_compatible, sha256, executable_path, activation, trust)`                                                                                    | 64 rows    |
| `profiles`    | names + active marker                                                                                                                                                  | 64 rows    |

Rules:

1. Capability: the accepted `runtime.inspect` head (deny by default, hash-bound
   grant). No new capability family unless the security review splits read from
   `runtime.configure`.
2. No argument is a path, command, URL, or raw Lua text.
3. No write, no executable hashing on the call path, no environment or
   credential read. `activation` is the last recorded state, never a liveness
   probe; `trust` is a projection of that record.
4. An unreadable source returns a typed per-section error, never an empty list.
5. 16 calls/s per generation, 10 ms per call, 64 KiB total payload;
   `--safe` returns the built-in configuration only and reads no third-party
   store tree.

## P-3 Deferred `config.manage` capability (candidate)

A persisted write surface requires a new capability; it is **not** implemented
and must not be added without this section's review. The plugin's Settings
write UI must not ship before it.

### Capability

| Field     | Value                                                                    |
| --------- | ------------------------------------------------------------------------ |
| id        | `config.manage`                                                          |
| family    | new `config` family beside `terminal.*`, `runtime.*`, `workspace.*`      |
| risk      | high (writes user configuration)                                         |
| parameter | none; scope travels with each call                                       |
| grant     | explicit consent bound to the manifest hash, like every other capability |
| holders   | only the trusted dashboard plugin identity; never a third-party id       |

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
2. Every write carries a plugin-level confirmation (two `Enter` presses on the
   same row) and a per-generation call budget; there is no "write everything"
   call.
3. Writes go to the user layer only: `<config-root>/bitty/…`. Profiles, system
   paths, and the managed plugin ledger are never written by `config.set`.
4. The write is atomic and durable: temp file in the same directory, `fsync`,
   rename, directory `fsync`, owner-only mode (`0600`), and a `.bak` of the
   previous content. A crash leaves either the old or the new file, never a
   partial one.
5. Theme and profile writes are structured settings, not rewritten Lua source.
   The plugin never edits `init.lua` text; it records the value in a managed
   settings file the config loader merges at the same user-layer precedence.
6. A refused validation, consent, or write leaves memory and disk unchanged and
   reports the reason; no partial application, no screen/file divergence.
7. `--safe` and read-only filesystems fail closed: the plugin reports the
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
shared security corpus records it; reviewers must treat the table as a
proposal, not evidence.

## Relation to existing systems

- `bitty config path|check|edit` remains the file-level authority; the plugin
  shows the same resolved path and never replaces `config edit`.
- `bitty plugin list|info|enable|disable|config show|config scaffold` remains
  the ledger and settings authority; the plugin reuses its reads and names the
  CLI for edits until P-3 lands.
- `bitty extension list` remains the component authority; the plugin consumes
  the same inventory/activation projection.
- `bitty list themes` and the theme registry remain the preset authority.

## Alternatives considered

1. **Core UI (withdrawn).** A Core-owned panel was drafted in bitty#2390 and
   closed unmerged: presentation in Core contradicts the architecture and
   duplicates surfaces the plugin platform exists to own. No Core code remains.
2. **A bundled plugin manifest backed by Core code.** Rejected: a manifest id
   behind Core presentation is a private channel.
3. **A separate official plugin (chosen).** Delivered through the normal
   install pipeline once the read-only Core query lands. Bundled packaging
   needs embedded payload shipping (`bundled_roots` is empty today).
4. **Add `config.manage` with the read query.** Rejected: writes need their own
   capability and security review, and a structured user-layer store.

## Affected contracts

- Core: `bitty.runtime.inspect` under `runtime.inspect` (read-only, bounded);
  no presentation code, no new node kind, no Core dashboard action.
- Plugin: the `bitty-terminal.dashboard` manifest, overlay scenes, and command;
  capability set limited to `runtime.inspect` + `ui.overlay.focus`.
- P-3 would add the `config` capability family and a managed settings file,
  both of which need their own accepted contracts.
- No `ChromeAction`, `bitty list actions`, or manual action-catalog changes.

## Open points

1. OQ-D1: whether the read query belongs under the existing `runtime.inspect`
   head or a dedicated read-only head, and whether writes are one
   `config.manage` head or `config.read` + `config.write`.
2. OQ-D2: live profile switching semantics — re-merge in place versus a
   restart-required marker — before `profiles.use` can exist.
3. OQ-D3: the structured user-layer settings file format and its interaction
   with `init.lua` precedence.
4. OQ-D4 (**resolved by the owner**): presentation is plugin-owned. Core UI is
   withdrawn; the bundled-payload limitation (`bundled_roots` empty) is the
   only blocking infrastructure item for the bundled route.
5. OQ-D5: an accessibility pass for the plugin overlay (screen-reader
   description, monochrome/contrast behavior for the selected row).

## Acceptance criteria

- The plugin opens through its own command/overlay binding and closes on `q`,
  `Esc`, or the toggle command; no Core dashboard action exists.
- Unmodified keys never reach the PTY while the overlay is open.
- Every section renders either bounded data or an explicit `unavailable`
  reason; no section silently reads as empty on failure.
- The plugin creates no runtime beyond its own VM, reads no file directly, and
  makes no shell or network call. All state comes from the Core query.
- Long host paths (macOS `/var/folders/...`) keep the marker and executable
  name; path rows use the path-sized bound.
- Extension rows show digest, target, activation, liveness, trust, and the
  exact CLI commands without executing them.
- No settings write exists before `config.manage` is accepted and reviewed.

## P0 Review Sign-off

- Implementation review: pending (plugin repository).
- Security review: pending for the read query (bitty#2396) and P-3.
- Architecture: owner-confirmed plugin-owned presentation (OQ-D4 resolved).

## References

- [Command-line interface](cli.md)
- [Plugin Configuration](https://github.com/bitty-terminal/bitty-manual/blob/main/en/configuration/plugin-config.md)
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md)
- [Theme presets](../configuration/themes.md)
- [Plugin platform contract](https://github.com/bitty-terminal/bitty-plugins-docs)
