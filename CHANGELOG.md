# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
