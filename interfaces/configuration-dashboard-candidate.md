---
title: Configuration dashboard (Plugin) (Candidate)
description: Plugin-owned configuration and status panel with accepted read-only Core state queries and the accepted config.manage write contract
category: specifications
audience: mixed
document_type: specification
status: accepted
website_publish: true
sidebar_order: 37
---

# Configuration dashboard (Plugin) (Candidate)

## Document status

> Status: **accepted** ([bitty#2396](https://github.com/bitty-terminal/bitty/issues/2396),
> [bitty#2393](https://github.com/bitty-terminal/bitty/issues/2393),
> [bitty#2745](https://github.com/bitty-terminal/bitty/issues/2745),
> [bitty#3035](https://github.com/bitty-terminal/bitty/issues/3035) /
> [bitty#3047](https://github.com/bitty-terminal/bitty/pull/3047)). Presentation
> belongs to plugins/extensions; Core owns mechanism only. The dashboard is a
> **plugin** (`bitty-terminal.dashboard`), not a Core surface. An earlier Core
> UI implementation was drafted and withdrawn without merging; it is not
> shipped, and no Core presentation code for this feature exists.
>
> Both the read-only Core state query (`bitty.runtime.inspect` under
> `runtime.inspect`, [bitty#2396](https://github.com/bitty-terminal/bitty/issues/2396))
> and the typed user-layer write contract (`config.manage`,
> [bitty#2393](https://github.com/bitty-terminal/bitty/issues/2393) /
> [bitty#2745](https://github.com/bitty-terminal/bitty/issues/2745) /
> [bitty#3035](https://github.com/bitty-terminal/bitty/issues/3035)) are
> **accepted** and implemented in Core. Full dashboard snapshot reads remain
> gated on `runtime.inspect`; `config.manage` is a recorded-approval,
> parameter-free head where `preview_*` binds the exact candidate bytes and the
> two-press confirmation is a plugin UI contract rather than host-enforced
> per-change human consent.

## Purpose and scope

Users who do not want to edit `init.lua` or drive the CLI need to answer four
questions: what configuration is active, which plugins are installed and
enabled, what one plugin's settings are, and where the files live. The
configuration dashboard plugin answers them in one full-panel overlay using the
accepted plugin UI surface.

In scope:

- P-1: the plugin surface, its read-only sections, bounds, and fail-closed
  behavior;
- P-2: the accepted read-only Core state query (`bitty.runtime.inspect`) the
  plugin consumes, with its capability and security constraints;
- P-3: the accepted `config.manage` capability that authorizes preview-bound,
  persisted user-layer writes, with its approval/token model, host-enforced
  versus UI-enforced boundaries, allowlist and budgets, atomic write and
  rolling `.bak` recovery rules, and security review disposition.

Out of scope: Core-owned dashboard presentation, arbitrary file editing, shell
execution, network access, plugin installation from the panel, and any
dashboard-specific Core UI component. Those stay separate decisions.

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
- [Extension execution mediation](../architecture/extension-execution-mediation.md)
  and the shared security corpus in
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs): required controls
  override this document where they disagree.

## Terminology

| Term            | Meaning                                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin          | `bitty-terminal.dashboard`, an official package installed through the normal plugin pipeline.                                                         |
| State query     | The read-only, bounded Core call the plugin consumes (`bitty.runtime.inspect` under `runtime.inspect`).                                               |
| Preview digest  | The host-computed `sha256:...` token returned by a `preview_*` call binding the plugin identity, verb, target, options, and exact preimage/postimage. |
| Session consent | The second `Enter` on the same row in the plugin UI; any cursor movement cancels it. Enforced by the dashboard plugin UI, not by the Core host.       |
| User layer      | `$XDG_CONFIG_HOME/bitty/init.lua` and `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`, never a system path or arbitrary filesystem location.             |

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
unreadable managed ledger, store index, profiles directory, or extension root
must never read as "none installed". The plugin reads no environment dump,
credential, token, or process command line, so it cannot leak a secret.

## P-2 Read-only Core state query (accepted)

Core provides one typed query (`bitty.runtime.inspect`,
[bitty#2396](https://github.com/bitty-terminal/bitty/issues/2396)); the plugin
supplies no paths and gets no authority beyond reading this snapshot. Full
dashboard snapshot reads remain gated on `runtime.inspect` even when a plugin
also holds `config.manage`.

| Field         | Content                                                                                                                                                                | Bounds     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `diagnostics` | app version; config file/dir; plugin ledger; store root; extension user/system roots and state root; profile name + source layer; theme name + layer; font; decoration | 240 B/path |
| `plugins`     | `(id, name, version, source, enabled, recorded)`                                                                                                                       | 128 rows   |
| `settings`    | `(plugin_id, key, current, default, source)` where source is `default`/`user`/`host` from the existing settings resolver                                               | 256 rows   |
| `extensions`  | `(name, version, tier, abi_compatible, sha256, executable_path, activation, trust)`                                                                                    | 64 rows    |
| `profiles`    | names + active marker                                                                                                                                                  | 64 rows    |

Rules:

1. Capability: the accepted `runtime.inspect` head (deny by default, hash-bound
   grant). Full snapshot reads stay on `runtime.inspect`; `config.manage` does
   not replace `runtime.inspect` for dashboard state snapshots.
2. No argument is a path, command, URL, or raw Lua text.
3. No write, no executable hashing on the call path, no environment or
   credential read. `activation` is the last recorded state, never a liveness
   probe; `trust` is a projection of that record.
4. An unreadable source returns a typed per-section error, never an empty list.
5. 16 calls/s per generation, 10 ms per call, 64 KiB total payload;
   `--safe` returns the built-in configuration only and reads no third-party
   store tree.

## P-3 Accepted `config.manage` write contract (accepted)

The persisted user-layer write surface is accepted and implemented in Core
([bitty#2393](https://github.com/bitty-terminal/bitty/issues/2393),
[bitty#2745](https://github.com/bitty-terminal/bitty/issues/2745),
[bitty#3035](https://github.com/bitty-terminal/bitty/issues/3035) /
[bitty#3047](https://github.com/bitty-terminal/bitty/pull/3047), `7d513caf`,
CTX-1749). It exposes the two-step preview-and-apply scalar configuration
surface (`bitty.config.get`, `bitty.config.preview_set`, `bitty.config.set`)
and the two-step profile lifecycle surface (`bitty.profiles` /
`bitty.config.profiles`: `list`, `preview_use`/`use`,
`preview_create`/`create`, `preview_clone`/`clone`, `preview_rename`/`rename`,
`preview_delete`/`delete`), with `force = true` `<name>.lua.bak-<epoch>`
backups and verbatim `extends` preservation on `clone` and
`create { from = ... }` (see
[Profile management commands](../configuration/lua-and-xdg.md#profile-management-commands)).

### Capability

| Field     | Value                                                                   |
| --------- | ----------------------------------------------------------------------- |
| id        | `config.manage`                                                         |
| family    | `config` family beside `terminal.*`, `runtime.*`, `workspace.*`         |
| risk      | high (writes user configuration and user-layer profile files)           |
| parameter | none; `config.manage` is a recorded-approval, parameter-free head       |
| grant     | explicit user consent bound to the manifest hash, like every capability |
| holders   | only trusted plugin identities granted `config.manage`; never ambient   |

`config.manage` never implies arbitrary filesystem authority. No method accepts
a filesystem path, a shell command, a URL, or raw Lua source text. Full
dashboard state snapshots remain gated on `runtime.inspect`.

### Approval and preview-digest token model

Every write under `config.manage` uses a two-step preview-then-apply protocol:

1. **Preview (`preview_*`)**: the plugin calls `bitty.config.preview_set(key, value)`
   or one of `bitty.profiles.preview_{use,create,clone,rename,delete}(...)`.
   Core validates the allowlisted key or profile identifier
   (`^[a-z0-9][a-z0-9_-]{0,62}$`, `default` reserved where applicable),
   evaluates the candidate against the live `bitty-config` typed plan, reads
   the current user-layer file preimage, synthesizes the exact candidate
   postimage bytes, and returns a bounded preview record containing
   `preview_digest = "sha256:<hex>"`.
2. **Digest binding**: `preview_digest` is computed by the host over the
   calling plugin identity, the verb name, the normalized target key or profile
   names, normalized options (`force`, `from`), the exact preimage bytes (or
   absence marker) of every affected user-layer file, and the exact candidate
   postimage bytes.
3. **Apply (`set` / `use` / `create` / `clone` / `rename` / `delete`)**: the
   plugin passes the exact arguments plus `preview_digest` (or `{ force = true,
preview_digest = ... }`). Core recomputes the expected digest against the
   current on-disk preimage under the configuration lock before writing. If the
   file on disk changed, the arguments differ, or the digest is malformed or
   forged, the call fails closed (`E_CONFIG_STALE_PREVIEW` /
   `E_CONFIG_INVALID_PREVIEW`) with zero disk or memory mutation.

### Host-enforced vs UI-enforced boundaries

| Boundary                          | Enforced by | Mechanism                                                                                                                                                        |
| --------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capability admission              | Core host   | Manifest-hash-bound `config.manage` grant checked on every call; added capability on plugin update blocks pending re-consent (`P0-AC-030`).                      |
| Key and identifier allowlist      | Core host   | Closed scalar key allowlist and strict profile-name grammar (`^[a-z0-9][a-z0-9_-]{0,62}$`); no path separators, dots, or arbitrary Lua expressions.              |
| Typed configuration validation    | Core host   | Candidate postimage is parsed and validated through the `bitty-config` typed planner before preview succeeds and again before apply commits.                     |
| Candidate byte binding (TOCTOU)   | Core host   | `preview_digest` binds plugin identity, verb, target, options, preimage bytes, and candidate postimage bytes; mismatch aborts before write.                      |
| Rate, payload, and wall budgets   | Core host   | 16 calls/s per generation, 4 KiB/s per generation, 10 ms wall budget per call, bounded string/key/table sizes.                                                   |
| Safe-mode and read-only refusal   | Core host   | `--safe` and read-only targets refuse all `config.manage` writes with a typed error.                                                                             |
| Atomic write and `.bak` retention | Core host   | Same-directory temp file (`0600`), `fsync`, atomic rename, directory `fsync`, and rolling `.bak` / `.bak-<epoch>` backup.                                        |
| Per-change two-press confirmation | Plugin UI   | Two `Enter` presses on the same row (`Session consent`, cancelled on cursor move) is a UI contract in `bitty-terminal.dashboard`, **not** host-enforced consent. |

The host never claims to verify physical human key presses per write: once a
plugin generation holds the `config.manage` grant and presents a matching
`preview_digest`, the host enforces the allowlist, typed plan, preimage match,
budgets, and atomic write rules.

### Allowlist, typed methods, and budgets

All values are validated by the `bitty-config` typed plan before any write.
Unknown keys fail closed; no method takes a table of loose key/value pairs.

| Method                                             | Arguments                                   | Result                                     | Notes                                                                                                                |
| -------------------------------------------------- | ------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `config.get(key)`                                  | one dotted key from the scalar allowlist    | typed value + source layer                 | `appearance.theme`, `font.family`, `font.size`, `decoration.*`, `close_confirm`, `terminal.scrollback`, `profile`    |
| `config.preview_set(key, value)`                   | allowlisted key + typed scalar value        | `{ preview_digest, diff, ... }`            | validates candidate via typed planner without mutating disk                                                          |
| `config.set(key, value, preview_digest)`           | allowlisted key + typed value + digest      | applied + source layer + backup path       | re-verifies `preview_digest` against live preimage; writes user layer atomically with rolling `.bak`                 |
| `profiles.list()`                                  | none                                        | bounded names (`default` + files) + active | read-only helper under `bitty.profiles` / `bitty.config.profiles`                                                    |
| `profiles.preview_use(name)` / `use(name, digest)` | validated profile name (+ `preview_digest`) | preview record / applied active profile    | updates `profile = "<name>"` in user `init.lua` and triggers live runtime reload                                     |
| `profiles.preview_create` / `create`               | `name`, optional `{ from, force, digest }`  | preview record / created profile metadata  | writes `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`; preserves `extends` verbatim when seeded via `from`             |
| `profiles.preview_clone` / `clone`                 | `src`, `dst`, optional `{ force, digest }`  | preview record / cloned profile metadata   | copies source profile body (preserving `extends`) into `<dst>.lua`                                                   |
| `profiles.preview_rename` / `rename`               | `old`, `new`, optional `{ force, digest }`  | preview record / renamed profile metadata  | renames `<old>.lua` to `<new>.lua` and updates `init.lua` `profile` when `<old>` was active                          |
| `profiles.preview_delete` / `delete`               | `name`, `{ force = true, preview_digest }`  | preview record / deleted + `.bak-<epoch>`  | refuses `default` and refuses deleting the active profile unless switched first; always retains `<name>.lua.bak-...` |

Allowlisted scalar keys for `bitty.config.{get,preview_set,set}`:

- `appearance.theme`
- `font.family`, `font.size`
- `decoration.gaps_in`, `decoration.gaps_out`, `decoration.border`, `decoration.radius`
- `close_confirm`
- `terminal.scrollback`
- `profile`

Budgets: at most 64 rows per list, 128 bytes per string, 64 bytes per key,
1 KiB per value table, 16 calls per second per generation, 4 KiB per
generation per second, and a 10 ms wall budget per call. A violated bound fails
closed with a typed error; nothing is clamped silently.

### Atomic write and rolling `.bak` recovery rules

1. The capability is requested in the manifest and granted only by explicit
   user consent bound to that manifest hash; an update that adds it re-prompts.
2. In the dashboard UI, every write carries a two-press confirmation on the
   same row (`preview_*` on the first `Enter`, apply with `preview_digest` on
   the second `Enter`; any cursor movement cancels the pending preview).
3. Writes go to the user layer only: `$XDG_CONFIG_HOME/bitty/init.lua` and
   `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua`. System paths and the managed
   plugin ledger are never written by `config.set` or `bitty.profiles.*`.
4. Every write is atomic and durable: temp file in the same directory with
   owner-only mode (`0600`), `fsync`, atomic rename, and directory `fsync`.
   Whenever an existing user-layer file is modified, overwritten (`force =
true`), or deleted (`profiles.delete`), Core retains a rolling backup
   (`init.lua.bak` or `<name>.lua.bak-<epoch>`) in the same directory so the
   previous content is recoverable without data loss. A crash leaves either the
   old or the new file, never a partial one.
5. Managed scalar writes update only the targeted assignment in the user-layer
   `init.lua` (preserving surrounding user comments and statements) and are
   re-parsed by the restricted `ConfigLuaVm` before commit; arbitrary Lua text
   cannot be injected.
6. A refused validation, stale `preview_digest`, or I/O failure leaves memory
   and disk unchanged and reports the typed error code; no partial application
   and no screen/file divergence.
7. `--safe` and read-only filesystems fail closed: the host refuses the call
   and keeps the previous state.

### Security review (accepted)

| Threat                                      | Control                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Arbitrary file write / path traversal       | no path argument; target directory resolved by Core (`$XDG_CONFIG_HOME/bitty`); closed scalar key allowlist and strict profile names |
| Secret exfiltration                         | no env/credential/process reads; values are validated config scalars; full state reads require `runtime.inspect`                     |
| Consent bypass or silent re-grant           | manifest-hash-bound `config.manage` grant (`P0-AC-030`); UI two-press confirmation is documented honestly as a UI-layer contract     |
| TOCTOU between preview and write            | `preview_digest` (`sha256:...`) binds exact preimage and candidate postimage bytes; apply re-verifies under lock before rename       |
| Stale row applied to a different generation | `preview_digest` binds plugin identity, verb, target, and preimage; any intervening edit fails closed with `E_CONFIG_STALE_PREVIEW`  |
| Symlink or foreign-owner target             | Core rejects symlinks/reparse points and enforces `0600` owner-only temp/backup/target files                                         |
| Denial of service through write volume      | 16 calls/s and 4 KiB/s per generation, 10 ms wall budget per call, bounded keys and values                                           |
| Partial write or unrecoverable overwrite    | same-directory temp + `fsync` + rename + directory `fsync`; rolling `.bak` / `<name>.lua.bak-<epoch>` recovery                       |

Status of this review: **accepted**
([bitty#2393](https://github.com/bitty-terminal/bitty/issues/2393),
[bitty#2745](https://github.com/bitty-terminal/bitty/issues/2745),
[bitty#3035](https://github.com/bitty-terminal/bitty/issues/3035) /
[bitty#3047](https://github.com/bitty-terminal/bitty/pull/3047), synchronized
with
[Extension execution mediation](../architecture/extension-execution-mediation.md)).

## Relation to existing systems

- `bitty config path|check|edit` remains the file-level authority; the plugin
  shows the same resolved path and never replaces `config edit`.
- `bitty plugin list|info|enable|disable|config show|config scaffold` remains
  the ledger and per-plugin settings authority.
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
   install pipeline (`bitty-terminal.dashboard`).
4. **Combine `config.manage` with `runtime.inspect`.** Rejected: full snapshot
   reads and persisted user-layer writes have different risk profiles and stay
   separated under `runtime.inspect` (read) and `config.manage` (preview-bound
   write).

## Affected contracts

- Core: `bitty.runtime.inspect` under `runtime.inspect` (read-only, bounded)
  and `bitty.config.{get,preview_set,set}` plus `bitty.profiles.*` under
  `config.manage` (preview-digest-bound user-layer writes); no Core dashboard
  presentation code, no new node kind, no Core dashboard action.
- Plugin: the `bitty-terminal.dashboard` manifest, overlay scenes, and command;
  capability set `runtime.inspect`, `config.manage`, and `ui.overlay.focus`.
- No `ChromeAction`, `bitty list actions`, or manual action-catalog changes.

## Open points

1. OQ-D1 (**resolved**): full snapshot reads belong under `runtime.inspect`
   (`bitty.runtime.inspect`, [bitty#2396](https://github.com/bitty-terminal/bitty/issues/2396)),
   and user-layer writes use the single parameter-free `config.manage` head
   ([bitty#2393](https://github.com/bitty-terminal/bitty/issues/2393) /
   [bitty#2745](https://github.com/bitty-terminal/bitty/issues/2745)).
2. OQ-D2 (**resolved**): `profiles.use` updates `profile = "<name>"` in the
   user-layer `init.lua` and triggers a live configuration reload
   ([bitty#3035](https://github.com/bitty-terminal/bitty/issues/3035) /
   [bitty#3047](https://github.com/bitty-terminal/bitty/pull/3047)).
3. OQ-D3 (**resolved**): scalar writes update the targeted key in user-layer
   `init.lua` with rolling `init.lua.bak` backup and profile lifecycle verbs
   manage `$XDG_CONFIG_HOME/bitty/profiles/<name>.lua` with
   `<name>.lua.bak-<epoch>` backups.
4. OQ-D4 (**resolved by the owner**): presentation is plugin-owned. Core UI is
   withdrawn.
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
- Every user-layer write requires `config.manage`, a valid `preview_digest`
  from `preview_*`, atomic write with rolling `.bak` retention, and UI-level
  two-press confirmation in `bitty-terminal.dashboard`.

## P0 Review Sign-off

- Implementation review: accepted ([bitty#2396](https://github.com/bitty-terminal/bitty/issues/2396),
  [bitty#2393](https://github.com/bitty-terminal/bitty/issues/2393),
  [bitty#2745](https://github.com/bitty-terminal/bitty/issues/2745),
  [bitty#3035](https://github.com/bitty-terminal/bitty/issues/3035) /
  [bitty#3047](https://github.com/bitty-terminal/bitty/pull/3047)).
- Security review: accepted for both `runtime.inspect` (`P-2`) and
  `config.manage` (`P-3`); recorded in
  [Extension execution mediation](../architecture/extension-execution-mediation.md).
- Architecture: owner-confirmed plugin-owned presentation (OQ-D4 resolved) and
  preview-bound `config.manage` contract (`bitty-terminal-docs#340`).

## References

- [Command-line interface](cli.md)
- [Extension execution mediation](../architecture/extension-execution-mediation.md)
- [Plugin Configuration](https://github.com/bitty-terminal/bitty-manual/blob/main/en/configuration/plugin-config.md)
- [Lua configuration and XDG layout](../configuration/lua-and-xdg.md)
- [Theme presets](../configuration/themes.md)
- [Plugin platform contract](https://github.com/bitty-terminal/bitty-plugins-docs)
