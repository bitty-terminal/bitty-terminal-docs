# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 0.0.45 post-release hardening and evidence currency: the `bittyd` daemon
  process is proven to open zero TCP sockets (`bitty#2921` via `#3218`), the
  AC-1 presentation-mode clause is homed at the generation rebind edge
  (`bitty#2476` via `#3219`), and Windows adopts `CONIN$` on attached consoles
  while resolving `%APPDATA%`/`%LOCALAPPDATA%` roots (`bitty#3223` via
  `#3226`). The `chrono` unmaintained advisory is recorded as a dated
  exception (`#3221`), a stale `tokio` lock entry is bumped past
  `RUSTSEC-2026-0386` (`#3225`), and a nightly `cargo-fuzz` campaign is wired
  as the evidence vehicle for R-001 / P0-AC-002 (`#3228`, CI only). These
  entries record implementation evidence only, not a `Verified` or
  `Compatible` claim.

- 0.0.44 bounded Lua UI composition and plugin-owned panels: `ui.rich` content
  height and cross-axis align bounds complete the bounded composition surface
  (`bitty#2191` via `#3212`, `#3198`); plugin-owned Dwindle panels gain a
  panel-scoped UI mount and focus input routing (`#3200`); multi-named
  configurable scratchpads spawn through `alt+shift+s` / `ctrl+alt+s` with
  PTY/plugin auto-spawn (`#3208`), and floating-panel cell-background
  occlusion, TUI drag, border resize, and zoom are corrected (`#3206`).
  Watchdog `Release`/`Acquire` ordering and Block-border clipping are fixed
  (`#3217`), and plugin network/filesystem denial with the zero-TCP lifecycle
  is proven by test (`#3209`). These entries record implementation evidence
  only, not a `Verified` or `Compatible` claim.

- 0.0.43 bounded Lua UI composition and chrome bands: style `gap` spacing
  (`bitty#2191` via `#3188`), band root align distribution (`#3190`), and
  bounded `content_width` on the `ui.rich` style table (`#3186`) land alongside
  the left/right chrome-band Lua mount (`#3167`), tab interaction verbs wired to
  `ctl` and the keymap (`#3168`, `#3174`), and the accessibility snapshot
  adapter constructed at the composition root (`#3164`). The displaced
  generation verb fence is proven (`#3185`), the daemon `ctl` cells and the
  confused-deputy amplification refusal are proven against P0-AC-022/024/025/026
  (`#3182`, `#3183`, `#3184`, `#3187`), alt-stash Kitty images are protected
  from store reclamation (`#3162`), and the unfocused Wayland occlusion
  freeze, bar RC-1 budget reset, `Ctrl+Alt+h/j` recovery, and `move_split`
  animation are fixed (`#3193`). These entries record implementation evidence
  only, not a `Verified` or `Compatible` claim.

- 0.0.42 panel lifecycle and runtime recovery: `move_split` and `toggle_split`
  actions ship with a Wayland frame-callback flush before present (`#3157`);
  Kitty graphics quotas are reclaimed across long-running sessions (`#3160`);
  suspended plugins recover from parked, command, and event paths (`#3158`);
  panel ownership keeps the controller predecessor pair across an
  allocation-epoch edge and names a created panel at its creating generation
  (`#3150`, `#3153`); phodopus advances to `v0.2.0` (`#3152`). These entries
  record implementation evidence only, not a `Verified` or `Compatible` claim.

- 0.0.41 multi-window support and panel generation rebind:
  `bitty ctl window new` asks a live instance for one more window
  (`bitty#1765` slice 5, `#3140`), over a real multi-window
  create/close/teardown lifecycle
  (`#3139`) with per-window surfaces, paint fan-out, focus tracking, and
  graceful per-window close (`#3134`, `#3138`) on a window-registry seam
  (`#3133`). The panel generation edge is wired to the production rebind and
  placeholder (`#3142`), the `bitty.wheel` bridge is exposed under
  `config.manage` (`#3144`), and release binary size, font memory, frame
  handoff, and idle wakeups are optimized (`#3131`). These entries record
  implementation evidence only, not a `Verified` or `Compatible` claim.

- 0.0.40 panel generation ownership residuals and synchronized-frame
  coalescing: `PanelRecord` gains an owner and a controller generation distinct
  from the allocation epoch (`bitty#2476` residual 1, `#3120`),
  `ControllerConflict`/`ControllerReleased` revalidate the binding at use
  (`#3121`), workspace close disposes panels in MRU order (`#3124`), and an
  unbound panel carries a placeholder with a capped recovery counter (`#3125`).
  `bitty.ui.state` exposes mounted-block visibility and focus queries
  (`#3119`), large synchronized TUI frames coalesce without intermediate
  redraws and non-ASCII remote input is fixed (`#3123`), and the Hyprland
  workspace-switch freeze and SwashSingle font RSS are resolved (`#3118`).
  These entries record implementation evidence only, not a `Verified` or
  `Compatible` claim.

- 0.0.39 help overlay ownership and plugin provenance: the Core-drawn
  help/which-key paint is retired in favor of the `bitty-terminal.help` plugin
  (`#3105`), `bitty.ui.unmount` adds a release primitive (`#3110`), band corner
  glyphs are dropped while presenter acknowledgements drain before band
  hit-test and system chords no longer snap (`#3109`), and inline TUI
  status-bar staircasing and border duplication during panel resize drag are
  fixed (`#3104`). `bitty plugin` reports `show-source`, a mandatory update
  diff, a source pin, and a Lua readability gate (`#3102`). These entries
  record implementation evidence only, not a `Verified` or `Compatible` claim.

- 0.0.38 Wayland and Windows platform fixes: the Wayland ANR/render freeze,
  scroll snap, wide cursor, Shift+Enter, and OSC 8 file links are resolved
  (`#3098`); the daemon wires a Windows ConPTY and Job Object worker spawn path
  (`#3093`); panel generations release every family at the unbind edge and
  panel restore is keyed by workspace plus persistent id (`#3094`). Redundant
  surface resizes are skipped and font bytes deduplicated (`#3101`), and the
  five live-spawn test sites are gated with `pty-gate` in CI (`#3097`). These
  entries record implementation evidence only, not a `Verified` or `Compatible`
  claim.

- 0.0.37 behavior synchronization: `config.manage` plugin profile lifecycle
  surface (`bitty.profiles` / `bitty.config.profiles`: `list`,
  `preview_use`/`use`, `preview_create`/`create`, `preview_clone`/`clone`,
  `preview_rename`/`rename`, `preview_delete`/`delete`) with two-step SHA-256
  digest approval, `--force` / `force = true` `<name>.lua.bak-<epoch>`
  backups, and verbatim `extends` inheritance on `clone` and `create --from`
  (`bitty#3047` / `bitty#3035`, `bitty#2884`, `bitty#3019`); focused-pane
  working-directory (`cwd`) inheritance across new panels, splits, and
  workspaces (`bitty#3028`); scratchpad toggle (`toggle_scratchpad` /
  `scratchpad_toggle` / `bitty.workspace:scratchpad-toggle`) over emptied base
  layouts with snapshot-restore cleanup, direct detached-float pinning
  preserving `PaneSession`, and detached-float / pinned-view resolution across
  overlay coordinate/rule handling, `search_host`, unbound `search_refresh`,
  `cw_latest_command_id`, `copy_mode`, and `bitty ctl` (`bitty#3078` /
  `bitty#3074`, `bitty#3085`); and Windows interactive `bitty init` default
  shell seeding (`pwsh.exe` / `powershell.exe` / `cmd.exe`) when `$SHELL` is
  unset (`bitty#3049`). These entries record implementation evidence only, not
  a `Verified` or `Compatible` claim.

- 0.0.28 crash and exit diagnostics documentation: a troubleshooting guide for
  `BITTY_CRASH_REPORT` (default-on for interactive runs, opt-out values,
  `--headless` exclusion), the `crash-report.log`, `exit-report.log`, and
  `stall-watchdog.log` state slots, report contents and bounds, the
  `SIGTERM`/`SIGHUP` capture limitation, and the opt-in
  `BITTY_STALL_WATCHDOG` with its 2 s default threshold. These entries record
  implementation evidence only, not a `Verified` or `Compatible` claim.

- 0.0.27 image and present-path synchronization: Kitty image content in a pane
  survives entering and leaving a full-screen TUI on the alternate screen,
  including a TUI that clears the alternate screen before `?1049l`, with
  placements and pixel content restored at the original primary rect and no
  alt-screen content leaking into shell scrollback; and rapid full-screen
  redraws present complete frames instead of ghost/stale rows because the
  real-GUI present path holds a dirty frame for a bounded PTY-quiescence
  window. The settle window is an internal Core constant, not a user tunable.
  These entries record implementation evidence only, not a `Verified` or
  `Compatible` claim.

- 0.0.27 behavior synchronization: balanced adaptive new-panel placement,
  gap-aware 10x4 minimum panes, corner-zone drag insertion, directional focus
  ranking, expanding-sibling close focus, dense workspace IDs, deterministic
  English `os.date` conversions, and centered/clamped anchored tooltips.
  These entries record implementation evidence only, not a `Verified` or
  `Compatible` claim.

- 0.0.27 selection, reflow, and font/DPI synchronization: caret-based pointer
  anchoring with a real one-cell selection, an I-beam limited to selectable
  grid text, Block-versus-Simple highlight paint, scrollback-spanning selections
  with detached-float and pinned-leaf owners, and `PersistentSelection`
  re-clamping across reflow/DPI; height-only resize row retention and exact
  space/CJK/emoji reflow with canonical hash v12 `Cell::padding`; and
  fractional-DPI glyph sampling plus font metrics measured at the resolved
  point size. These entries record implementation evidence only, not a
  `Verified` or `Compatible` claim.

- 0.0.24 behavior synchronization: `bitty init` single-keypress TTY picker
  navigation and mascot removal; corrected fcitx5 IME commit ownership;
  detached/pinned float scrolling, discard, Alt-only drag, and full occlusion;
  Kitty `16t` probing, Yazi/Chafa detection, alternate-screen scrollback and
  image semantics; and plugin install/enable next-step guidance. These entries
  record implementation evidence only, not a `Verified` or `Compatible` claim.

- Repository bootstrap (CTX-0187 Phase 1): docs-quality toolchain (justfile,
  `.github/scripts/check-docs.mjs`, docs-quality workflow), CarryCtx baseline,
  and an empty documentation skeleton.
- Terminal-platform documentation corpus migrated from bitty-docs
  (`docs/projects/bitty/` at `c664214`) with history preserved (CTX-0001).
  AI-core and plugin-ecosystem documents were split out to the separately
  migrated `bitty-ai-docs` and `bitty-plugins-docs` repositories, and
  cross-repository links were rewritten to absolute URLs.

### Changed

- Docs-quality metadata validation now covers the root content trees in
  addition to `docs/`, and SVG validation scans every tracked or new SVG.
