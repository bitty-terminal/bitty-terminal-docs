---
title: Provider contracts for bar modules
description: Contract-level pointer index for Core-owned provider interfaces backing bar modules with versions rate ceilings and stale policy
category: extensibility
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 20
---

# Provider contracts for bar modules

> Status: **draft candidate** — not **Accepted**, not **Verified**, and not
> normative. This record is a contract-level pointer index only: interface
> identities, versions, backing heads, rate ceilings, and stale policy for
> the Core-owned provider families that bar modules consume. It copies no
> rustdoc; field shapes and parser detail stay in the owning `bitty`
> modules. The interface-plus-contract slices are merged in `bitty`, and the
> live host publication plus the Lua `get()` bridge methods are shipped
> (`bitty` #2072 / #2074 / #2071 / #2102, see Activation below), so bar
> modules consume through the broker; no stable or supported public contract
> is claimed beyond that shipped wiring.

## Shared conventions

Every family below follows the frozen dynapi rules unchanged:

- Owner-qualified identity `owner:iface@version`; all three families mint
  version `1.0.0`.
- Grant-gated and fail-closed: an ungranted `get()` returns `None` without
  touching the source, indistinguishable from absent.
- Read never implies control: no interface carries both a read head and a
  control head. Control lives on a sibling `*.control` interface or is
  absent entirely.
- Stale-then-hide, never fabricated zeros: over-poll coalesces to
  last-good, monitor loss serves last-good with age inside the hide grace,
  then hides.
- Thresholds (warning/critical), icon buckets, and toggle semantics stay
  Lua-side: providers return raw numbers and states only.

## System sensors (`system.*@1.0.0`)

Source: `bitty` #2055 (CTX-1193; `crates/bitty-runtime/src/plugin_runtime/system_sensors/`).
Short interfaces served by native component `bitty-terminal.sensors`.
Live publication plus the Lua `get()` bridge shipped in `bitty` #2072
(CTX-1199) and the runtime broker path in #2102 (CTX-1238): the runtime owns
a sensor host shared at activation and dispatches through
`PluginServices::service_call`; ungranted stays absent and fail-closed.

| Interface        | Method | Backing head            | Ceiling |
| ---------------- | ------ | ----------------------- | ------- |
| `system.cpu`     | `get`  | `platform.cpu-read`     | 2 s     |
| `system.memory`  | `get`  | `platform.memory-read`  | 2 s     |
| `system.battery` | `get`  | `platform.battery-read` | 5 s     |

- Every `get()` carries `stale_age_ms`; stale past three windows hides.
  First CPU poll hides (no baseline delta yet); hotplug re-baselines one
  tick.
- Sources (Linux only; other targets hide): CPU from `/proc/stat` (total
  plus per-core, truncated at `MAX_CPU_CORES = 1024` with exact total);
  memory from `/proc/meminfo` (`MemAvailable` with `MemFree` fallback,
  exact swap triple); battery UPower-preferred with a live
  `/sys/class/power_supply` fallback (per-entry disqualification).
- The grant catalog entries for the three heads live in the
  [manifest and capability grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md);
  the Lua consumption shapes live in the
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md).

## Platform providers (`bitty:*@1.0.0`)

Source: `bitty` #2056 (CTX-1197; `crates/bitty-platform/src/providers.rs`,
`network_state.rs`, `bluetooth_state.rs`, `backlight_state.rs`). Core owner
`bitty`; one batch version for all eight interfaces. Live host wiring
shipped in `bitty` #2074 (CTX-1201) with the runtime broker path in #2102
(CTX-1238): native device component `bitty-terminal.devices` serves the
eight interfaces at `1.0.0` with deny-by-default grant translation, live
sysfs adapters for link counters and backlight, and fail-closed stubs for
NM, BlueZ, and Wayland inhibit.

| Interface           | Methods     | Backing head                  |
| ------------------- | ----------- | ----------------------------- |
| `network.state`     | `get`       | `platform.network.read`       |
| `network.essid`     | `get`       | `platform.network.essid.read` |
| `bluetooth.state`   | `get`       | `platform.bluetooth.read`     |
| `bluetooth.control` | `set_power` | `platform.bluetooth.control`  |
| `backlight.state`   | `get`       | `platform.backlight.read`     |
| `backlight.control` | `set_step`  | `platform.backlight.control`  |
| `idle.state`        | `get`       | `platform.idle.read`          |
| `idle.control`      | `set`       | `platform.idle.control`       |

- The eight head names are registered in the closed capability tables
  (`bitty-package`/`bitty-plugin-host`); the samplers gate on the injected
  deny-by-default grant snapshot taken at activation.
- Network is read-only by construction (no control method, no control
  head); ESSID is a separately-granted read because it is
  location-adjacent (ungranted is byte-identical to NM-less). The broker
  head for ESSID is `platform.essid.read`: the registry spelling
  `platform.network.essid.read` carries four dot segments and cannot enter
  the closed `family.resource.scope` set, so the bridge maps the alias with
  no authority change. Bandwidth
  rates are wrap-aware: counter wrap re-baselines with unknown rates that
  tick, never a spike.
- Bluetooth read is bounded at 16 entries with a true total plus an
  explicit truncated flag; `set_power` without the control head fails
  closed (`E_NOT_PERMITTED`) with the backend untouched.
- Backlight `set_step` attempts only when permitted (`E_NOT_PERMITTED`
  otherwise, never escalates, never setuid per `DEC-0115`); idle-inhibit toggle lives on its own head.
  Every snapshot carries `stale_age_ms`.

## Audio (`audio.*@1.0.0`)

Source: `bitty` #2058 (CTX-1196; `crates/bitty-plugin-host/src/audio.rs`).
Live monitor binding plus the Lua bridge shipped in `bitty` #2071
(CTX-1200) with the runtime broker path in #2102 (CTX-1238); the pre-init
poll gate is bounded with a regression test in #2063 (CTX-1198).
Manifest allowlist is permission only; the rate contract below is the rate
answer. Scope travels with the host call, never as a grant parameter.

| Interface        | Methods                   | Backing head          |
| ---------------- | ------------------------- | --------------------- |
| `audio.spectrum` | `spectrum`                | `audio.spectrum`      |
| `audio.state`    | `get`                     | `audio.state.read`    |
| `audio.control`  | `set_volume, toggle_mute` | `audio.state.control` |

| Poll         | Ceiling | Bound per poll                                  |
| ------------ | ------- | ----------------------------------------------- |
| `spectrum`   | 5 Hz    | at most 32 buckets, at most 1024 response bytes |
| `get`        | 0.5 Hz  | one 6-field snapshot                            |
| control call | 10 Hz   | one spawn, step at most 10                      |

- Over-poll coalesces to last-good (a 5 Hz bar renders steadily, never
  blinks on phase drift); spectrum hides past a 2000 ms grace, state past
  10 s. Pre-init polls are bounded by the same gate and never storm.
  Wheel-burst safety composes through a saturating control gate (one
  step per 100 ms window) with the `on_scroll` delta from the
  [Chrome Surface API](../specifications/chrome-surface-api-candidate.md).
  Control spawn is bounded (`pactl` fixed argv with a kill deadline; step
  at most 10; over-bound deltas denied, never clamped).
- Scope is cava-lite: a 4–5 fps block-glyph Text meter with Lua-side glyphs
  and pause/falloff/peak-hold; 60 fps is explicitly out. The Lua shapes and
  the Text-meter recipe live in the
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  and the SDK `bitty.d.lua`.

## Activation

Gating is evaluated from the grant snapshot taken at activation; an absent
grant fails closed and never touches the source. Per generation the
application wires the runtime-owned hosts once before the generation's
`init.lua` runs: the sensor host, the device host, and the audio host are
shared at activation, and the broker dispatches provider calls in
`PluginServices::service_call`. Handles pin the activation generation
epoch, so a handle from a prior generation cannot cross into the next;
re-activation after revoke starts clean. The manifest declares the heads;
activation rejects unbacked provisions. Settings values never grant
anything (see the settings plane in the configuration model RFC):
`services.required`, heads, and settings stay separate lanes.

## Open points

- Live UPower D-Bus transport behind the source seam; the sandbox decision
  for the production audio monitor.
- Bar-side modules in `bitty-plugins` consuming these interfaces
  (negotiate-poll-render-hide).

## References

- `bitty` #2019 / #2011 / #2016 (system sensors), #2012 / #2017 / #2020
  (platform providers), #2009 / #2013 (audio) — bar-render and sandbox
  acceptances remain open there; this record claims only the
  interface-plus-contract slice plus the shipped host publication
  (#2072 / #2074 / #2071 / #2102) and the bounded pre-init audio gate
  (#2062).
- [Chrome Surface API (Candidate)](../specifications/chrome-surface-api-candidate.md) —
  `on_scroll` bindings that compose with audio control stepping.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — the Lua consumption surface (owned by `bitty-plugins-docs`).
