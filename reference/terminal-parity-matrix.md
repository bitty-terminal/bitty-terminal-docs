---
title: Terminal parity matrix
description: Evidence-backed comparison of the Bitty configuration and feature surface against Ghostty, Kitty, and WezTerm, with gaps listed as follow-up candidates
category: reference
audience: mixed
document_type: reference
status: draft
website_publish: false
sidebar_order: 40
---

# Terminal parity matrix

## Status and provenance

- Status: **draft**. This page is a lookup reference, not a stability
  promise or a roadmap commitment. No row is a stable or supported public
  contract; the owning configuration contracts remain `Proposed` under
  `OQ-010`.
- Scope: the user-visible configuration and feature surface of Ghostty
  (its configuration reference is the primary comparison axis), plus
  notable Kitty and WezTerm options that have no Ghostty equivalent.
- Evidence rule: a row is **implemented** or **partial** only when the
  `bitty` repository contains the named configuration key or behavior, a
  code path, and a test that exercises it. Every other row is **planned**
  (a specification in this corpus covers it), **gap** (no owning
  specification or code), or **wont-do** (out of scope by design).
- Source revision: extracted from `bitty` `main` at `7d7ec91b`. When code
  and this page disagree, the code wins and this page needs a fix.
- Key-level detail (types, defaults, ranges, reload class) lives in the
  [configuration options reference](configuration-options.md); escape
  sequence behavior lives in the
  [terminal compatibility matrix](compatibility-matrix.md). This page only
  records parity status and links there.

## How to read the matrix

| Column   | Meaning                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Feature  | User-visible capability, named neutrally.                                                                              |
| Peers    | `G` Ghostty, `K` Kitty, `W` WezTerm: which peers expose it as configuration or built-in behavior.                      |
| Bitty    | Bitty configuration key, keymap action, or behavior, when one exists.                                                  |
| Status   | `implemented`, `partial`, `planned`, `gap`, or `wont-do`.                                                              |
| Evidence | Repository-relative `bitty` path and test name for implemented/partial rows; a specification link or reason otherwise. |

Test names are `path::test_name`. Paths are relative to the `bitty`
repository root.

## Matrix

### Window and background

| Feature                     | Peers | Bitty                                                                | Status      | Evidence                                                                                                                                                                                                                                      |
| --------------------------- | ----- | -------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Window background opacity   | G K W | `window.opacity`, CLI `--opacity`                                    | implemented | `crates/bitty-platform/src/app.rs` (`set_opacity`, `sanitize_opacity`); `crates/bitty-runtime/tests/window_padding_opacity.rs::opacity_mapping_is_total_and_fail_soft`; `crates/bitty-config/src/file.rs::cli_opacity_overrides_only_opacity` |
| Background blur             | G W   | `WindowConfig.blur_radius` (schema only)                             | partial     | `crates/bitty-config/src/types.rs` (`DEFAULT_WINDOW_BLUR_RADIUS`, `MAX_WINDOW_BLUR_RADIUS`). The Lua loader does not admit `window.blur_radius` and no platform path applies blur, so users cannot enable it.                                 |
| Background image            | G W   | `decoration.background_image`, `views.<sel>.background_image`        | implemented | `crates/bitty-runtime/tests/background_images_present.rs::image_loads_at_construction_and_paints_behind_cells`; `crates/bitty-config/src/file.rs::decoration_background_image_parses_and_validates`                                           |
| Background image trust root | —     | `decoration.background_image_roots`                                  | implemented | `crates/bitty-runtime/tests/background_images_present.rs::empty_roots_deny_every_image`; `crates/bitty-config/src/file.rs::decoration_background_image_roots_bounds_fail_closed`                                                              |
| Background image fit        | G W   | `decoration.background_fit` (`fill`/`fit`/`center`/`tile`/`stretch`) | implemented | `crates/bitty-render/src/software.rs::draw_list_paints_background_image_between_fills_and_overlay`; `crates/bitty-config/src/file.rs::decoration_background_image_parses_and_validates`                                                       |
| Background image opacity    | G W   | —                                                                    | gap         | No key; the image paints at full alpha under the cell layer.                                                                                                                                                                                  |
| Background image position   | G W   | —                                                                    | gap         | Only the fit modes above; no anchor position.                                                                                                                                                                                                 |
| Background gradient         | W     | —                                                                    | wont-do     | Decorative; a plugin-rendered background is the extension path.                                                                                                                                                                               |
| Cell background opacity     | G K W | —                                                                    | gap         | Opacity applies to the window surface, not per cell background.                                                                                                                                                                               |
| Window padding              | G K W | `window.padding`                                                     | implemented | `crates/bitty-render/src/window.rs::bound_matches_config_window_padding`; `crates/bitty-runtime/tests/window_padding_opacity.rs::default_surface_spans_window_extent_with_padding`                                                            |
| Window corner radius        | —     | `window.radius_px` (parsed no-op)                                    | partial     | `crates/bitty-runtime/tests/window_radius_noop.rs::default_radius_is_zero_square_noop`; parsed and validated, zero render effect.                                                                                                             |
| Window title from app       | G K W | OSC 0/2                                                              | implemented | `crates/bitty-runtime/tests/m1_color_title.rs::osc_title_reaches_state_and_cold_handoff`                                                                                                                                                      |
| Title override / template   | G K W | —                                                                    | gap         | Platform title is fixed at creation (`crates/bitty-platform/src/app.rs` `with_title`); no user key.                                                                                                                                           |
| Initial window size         | G K W | —                                                                    | gap         | Platform builder accepts an inner size, but no configuration key exposes it.                                                                                                                                                                  |
| Window decorations toggle   | G K W | —                                                                    | gap         | No decorations key or platform call.                                                                                                                                                                                                          |
| Fullscreen / maximize       | G K W | —                                                                    | gap         | No keymap action or platform call.                                                                                                                                                                                                            |
| Quick (dropdown) terminal   | G K   | —                                                                    | gap         | No owning specification.                                                                                                                                                                                                                      |
| Unfocused split dimming     | G W   | —                                                                    | gap         | Idle views get a distinct border (`decoration.border_color_idle`), not a content dim.                                                                                                                                                         |
| Idle / focused view borders | —     | `decoration.border_*`, `views.<sel>.border_*`                        | implemented | `crates/bitty-config/src/file.rs::lua_decoration_colors_parse_and_validate`; see the [configuration options reference](configuration-options.md).                                                                                             |

### Fonts and text rendering

| Feature                       | Peers | Bitty                                                           | Status      | Evidence                                                                                                                                                         |
| ----------------------------- | ----- | --------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Font family                   | G K W | `font.family`, CLI `--font-family`                              | implemented | `crates/bitty-config/src/file.rs::cli_font_family_overrides_only_family`                                                                                         |
| Font size                     | G K W | `font.size`                                                     | implemented | `crates/bitty-config/src/file.rs::lua_font_spacing_optional_with_defaults`                                                                                       |
| Runtime font zoom             | G K W | `increase_font_size` / `decrease_font_size` / `reset_font_size` | implemented | `crates/bitty-runtime/tests/font_zoom.rs::zoom_steps_and_resets`                                                                                                 |
| Line height                   | G K W | `font.line_height`                                              | implemented | `crates/bitty-config/src/file.rs::lua_font_spacing_optional_with_defaults`                                                                                       |
| Letter spacing                | G K W | `font.letter_spacing`                                           | implemented | `crates/bitty-config/src/file.rs::lua_font_spacing_optional_with_defaults`                                                                                       |
| Glyph fallback chain          | G K W | built-in `FONT_FALLBACK_CHAIN`                                  | partial     | `crates/bitty-render/src/fallback.rs::default_chain_matches_config_tails`, `::primary_hit_never_walks_fallbacks`; the chain is built in, not user-configurable.  |
| User fallback families        | G K W | —                                                               | gap         | No key to extend or reorder the fallback chain.                                                                                                                  |
| Bold / italic face choice     | G K W | —                                                               | gap         | No per-style family keys.                                                                                                                                        |
| Ligatures / OpenType features | G K W | —                                                               | gap         | The rasterizer backend has no shaping stage; no feature key.                                                                                                     |
| Codepoint-to-font mapping     | G K W | —                                                               | gap         | No mapping key.                                                                                                                                                  |
| Wide / grapheme width         | G K W | built-in                                                        | implemented | `crates/bitty-compat-lab/tests/dogfooding_corpus.rs::dogfooding_unicode_ime_width_invariants`; see the [terminal compatibility matrix](compatibility-matrix.md). |
| HiDPI scaling                 | G K W | platform scale factor                                           | implemented | `crates/bitty-platform/src/dpi.rs::scale_factor_accepts_positive_finite_values`                                                                                  |

### Cursor

| Feature                     | Peers | Bitty                      | Status      | Evidence                                                                                                                                                                                               |
| --------------------------- | ----- | -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cursor shape default        | G K W | `terminal.cursor_style`    | implemented | `crates/bitty-runtime/tests/cursor_bell_config.rs::construction_seeds_configured_cursor_style_and_bell_mode`; `crates/bitty-config/src/file.rs::lua_terminal_cursor_style_and_bell_parse_and_validate` |
| App cursor shape            | G K W | DECSCUSR                   | implemented | `crates/bitty-compat-lab/tests/m1_mode_golden.rs::golden_decscusr_cursor_shape`; `crates/bitty-render/src/grid/tests.rs::cursor_fill_shapes_per_decscusr`                                              |
| Cursor blink                | G K W | `blinking_*` style values  | partial     | Blinking styles parse (`crates/bitty-config/src/types.rs` `CursorStyle`); the renderer paints the steady shape and leaves blink timing to the embedder.                                                |
| Cursor color                | G K W | `appearance.colors.cursor` | implemented | `crates/bitty-config/src/file.rs::lua_decoration_colors_parse_and_validate`; custom palette rows in the [configuration options reference](configuration-options.md).                                   |
| Cursor text color / opacity | G K   | —                          | gap         | No key.                                                                                                                                                                                                |

### Colors and themes

| Feature                  | Peers | Bitty                                    | Status      | Evidence                                                                                                                                   |
| ------------------------ | ----- | ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Built-in theme catalog   | G K W | `appearance.theme` (preset names)        | implemented | `crates/bitty-config/src/theme.rs` (`ALL_PRESETS`); `crates/bitty-config/src/theme.rs::none_resolves_to_default`                           |
| Inline custom palette    | G K W | `appearance.colors.*` (16 ANSI + chrome) | implemented | `crates/bitty-config/src/file.rs::cli_appearance_all_flags_override_together`; [configuration options reference](configuration-options.md) |
| Theme file path          | G K W | —                                        | gap         | Inline `colors` only; no theme-file loader.                                                                                                |
| Light / dark auto switch | G W   | —                                        | gap         | No appearance-change subscription.                                                                                                         |
| Selection colors         | G K W | `appearance.colors.selection`            | implemented | Custom palette rows in the [configuration options reference](configuration-options.md).                                                    |
| App palette query / set  | G K W | OSC 4/10/11/12                           | implemented | `crates/bitty-runtime/tests/m1_osc_color.rs::osc10_osc11_query_reply_bytes_use_xterm_rgb_form`                                             |
| Minimum contrast         | G K   | —                                        | gap         | Contrast is enforced only for view outlines, not text.                                                                                     |
| Bold-as-bright           | G K W | —                                        | gap         | No key.                                                                                                                                    |

### Scrollback, selection, and search

| Feature                  | Peers | Bitty                                                         | Status      | Evidence                                                                                                                                                                              |
| ------------------------ | ----- | ------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scrollback limit         | G K W | `terminal.scrollback`                                         | implemented | `crates/bitty-runtime/tests/scrollback_cap.rs::configured_scrollback_cap_bounds_retained_lines`                                                                                       |
| Wheel scroll speed       | K W   | `terminal.scroll_lines_per_notch` / `scroll_pixels_per_notch` | implemented | [configuration options reference](configuration-options.md); `crates/bitty-runtime/tests/wheel_scroll_1338.rs`                                                                        |
| Scrollbar                | G K W | `scrollbar.mode`, `scrollbar.width`                           | implemented | `crates/bitty-runtime/tests/scrollbar.rs::hidden_and_always_modes_remain_selectable`; `crates/bitty-config/src/file.rs::lua_scrollbar_parses_and_validates`                           |
| Scrollback search        | G K W | `open_search`, `search_next`, `search_prev`                   | implemented | `crates/bitty-runtime/tests/scrollback_search_ui_integration.rs::search_ui_set_and_navigate_headless`; `crates/bitty-runtime/tests/search_overlay.rs::enter_sets_overlay_with_status` |
| Copy mode (keyboard)     | K W   | `enter_copy_mode`                                             | implemented | `crates/bitty-runtime/tests/copy_mode.rs::enter_sets_active_with_status_and_cursor`                                                                                                   |
| Word / line selection    | G K W | double / triple click                                         | implemented | `crates/bitty-runtime/tests/selection_multiclick.rs::double_click_selects_word`, `::triple_click_selects_full_line`                                                                   |
| Copy on select           | G K W | `selection.auto_copy`                                         | implemented | `crates/bitty-config/src/file.rs::lua_selection_auto_copy_parses_and_validates`                                                                                                       |
| Custom word boundaries   | G K W | —                                                             | gap         | No key.                                                                                                                                                                               |
| Scrollback to pager/file | K     | —                                                             | gap         | No action.                                                                                                                                                                            |

### Clipboard and paste

| Feature                         | Peers | Bitty                                       | Status      | Evidence                                                                                                                   |
| ------------------------------- | ----- | ------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| Copy / paste actions            | G K W | `copy_to_clipboard`, `paste_from_clipboard` | implemented | `crates/bitty-runtime/tests/selection_clipboard.rs::selection_drag_extracts_text_headlessly`                               |
| OSC 52 clipboard write          | G K W | gated write                                 | implemented | `crates/bitty-runtime/tests/selection_clipboard.rs::osc52_write_is_bridged_to_clipboard`                                   |
| OSC 52 read policy key          | G K W | —                                           | gap         | Write gate exists in runtime (`set_osc_clipboard_write_allowed`); no user-facing read/write policy key.                    |
| Bracketed paste                 | G K W | DECSET 2004                                 | implemented | `crates/bitty-runtime/tests/m1_mode_input.rs::bracketed_paste_mode_wraps_and_plain_mode_does_not`                          |
| Unsafe paste confirmation       | G K W | built-in                                    | implemented | `crates/bitty-runtime/tests/suspicious_paste.rs::paste_from_clipboard_suspicious_requires_confirmation_no_silent_delivery` |
| Primary selection (X11/Wayland) | G K W | —                                           | gap         | No primary-selection path.                                                                                                 |

### Keyboard and mouse

| Feature                   | Peers | Bitty                                                                          | Status      | Evidence                                                                                                                                                                                                                                                                                             |
| ------------------------- | ----- | ------------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom keybindings        | G K W | `keymaps[]`                                                                    | implemented | `crates/bitty-config/src/file.rs::lua_full_scalar_tables_and_keymaps_parse`; `crates/bitty-config/src/keymap.rs::defaults_parse_and_leave_shell_keys_unbound`                                                                                                                                        |
| Leader / key sequences    | G K W | `input.leader`, `input.timeout_len` (legacy `leader_key`, `leader_timeout_ms`) | implemented | `crates/bitty-config/src/file.rs::lua_leader_parses_absent_means_silent_and_bad_fails_closed`; canonical `input.leader`/`input.timeout_len` win over legacy keys, `100..=60000` ms default `1000`, two-step `<Leader> <second>` only with multi-step deferred fail-closed (`bitty#1650` via `#1748`) |
| Modifier remap for chrome | —     | `mod_key`                                                                      | implemented | `crates/bitty-config/src/keymap.rs::default_mod_is_identity_over_shipped_map`                                                                                                                                                                                                                        |
| Send-text binding         | G K W | —                                                                              | gap         | The action catalog has no send-text or send-escape action.                                                                                                                                                                                                                                           |
| Kitty keyboard protocol   | G K W | CSI `u` flags                                                                  | implemented | `crates/bitty-runtime/tests/enhanced_keyboard_protocol.rs::disambiguate_encodes_ctrl_letter_as_csi_u`                                                                                                                                                                                                |
| Mouse reporting (SGR)     | G K W | DECSET 1000/1002/1006                                                          | implemented | `crates/bitty-runtime/tests/mouse_encoding.rs::sgr_encoding_still_keeps_button_identity_and_modifiers`                                                                                                                                                                                               |
| Alternate scroll          | G K W | DECSET 1007                                                                    | implemented | `crates/bitty-runtime/tests/m1_mode_input.rs::alternate_scroll_translates_wheel_on_alt_screen`                                                                                                                                                                                                       |
| Focus reporting           | G K W | DECSET 1004                                                                    | implemented | `crates/bitty-runtime/tests/m1_mode_input.rs::focus_reporting_emits_in_and_out_only_when_enabled`                                                                                                                                                                                                    |
| Focus follows mouse       | G K W | `mouse.focus_follows_mouse`                                                    | implemented | `crates/bitty-config/src/file.rs::lua_mouse_focus_follows_mouse_parses_and_validates`                                                                                                                                                                                                                |
| Hide mouse while typing   | G K W | —                                                                              | gap         | No key.                                                                                                                                                                                                                                                                                              |
| Custom mouse bindings     | K W   | —                                                                              | gap         | Mouse actions are built in; no mouse-binding grammar.                                                                                                                                                                                                                                                |
| IME composition           | G K W | built-in preedit                                                               | implemented | `crates/bitty-runtime/tests/ime_input.rs::preedit_state_is_bounded_and_never_touches_grid_truth`, `::empty_preedit_then_commit_inserts_exactly_once`                                                                                                                                                 |

### Links, images, and notifications

| Feature                              | Peers | Bitty                                  | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ----- | -------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OSC 8 hyperlinks                     | G K W | click to open (safe schemes)           | implemented | `crates/bitty-runtime/tests/m1_hyperlink_open.rs::click_on_safe_hyperlink_opens_through_the_live_consumer`; live UX with hover feedback and TUI interception (`bitty#1759` via `#1771`)                                                                                                                                                                                                |
| Link quick-select hints              | K W   | hint overlay                           | implemented | `crates/bitty-rich/src/hints.rs::link_provider_collects_safe_spans_only`                                                                                                                                                                                                                                                                                                               |
| Plain-text URL detection             | G K W | `detect_urls` via `bitty-url-detector` | implemented | Plaintext URL pattern detection with Ctrl+click to open (`bitty#1760` via `#1774`); `detect_urls` returns `(col_start, col_end, url)` tuples with trimmed prose punctuation and a 4096-byte cap; grid mapping, hover cues, and click-to-open stay Core-owned                                                                                                                           |
| Kitty graphics protocol              | G K W | APC `G`, unicode placeholders          | implemented | `crates/bitty-runtime/tests/kitty_apc_wiring.rs::apc_g_single_shot_routes_to_display_and_paints`; `crates/bitty-runtime/tests/kitty_images_present.rs::display_paints_image_pixels_topmost`                                                                                                                                                                                            |
| Sixel                                | W     | —                                      | gap         | Rich-content image source enum names Sixel; no VT parser path.                                                                                                                                                                                                                                                                                                                         |
| Bell behavior                        | G K W | `terminal.bell`                        | implemented | `crates/bitty-runtime/tests/m1_bell_notification.rs::bel_defaults_to_bounded_visual_flash`; `crates/bitty-runtime/tests/m1_bell_os_delivery.rs::audible_bell_rings_sink_once_per_admitted_bel`                                                                                                                                                                                         |
| Desktop notifications (OSC 9/777/99) | G K W | default-deny with RC-8 bridge cap      | partial     | `crates/bitty-runtime/tests/m1_bell_notification.rs::osc9_denied_by_default_and_counted`, `::osc777_denied_by_default_and_counted`; Kitty OSC 99 parsing plus RC-8 plus bridge cap (`bitty#1763` via `#1773`); `terminal.bell` (`off`/`visual`/`audible`/`both`, default `visual`); `bitty-platform-services` bridge API at `0.0.1` with fail-closed stubs, Core integration follow-up |

### Shell integration

| Feature                         | Peers | Bitty                 | Status      | Evidence                                                                                                                                                            |
| ------------------------------- | ----- | --------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt marks (OSC 133)          | G K W | consumed when emitted | implemented | `crates/bitty-runtime/tests/m1_shell_coverage.rs::injected_osc7_osc133_bash`                                                                                        |
| Jump to previous / next prompt  | G K W | prompt jump           | implemented | `crates/bitty-runtime/tests/shell_prompt_jump.rs::prev_jump_from_live_lands_on_last_prompt`                                                                         |
| Working directory (OSC 7)       | G K W | new pane inherits cwd | implemented | `crates/bitty-runtime/tests/cwd_inherit.rs::new_pane_inherits_focused_pane_osc7_cwd`                                                                                |
| Automatic integration injection | G K W | —                     | gap         | Bitty runs shells with zero injected integration by design today; see the [compatibility milestone RFC](../specifications/compatibility-milestone-rfc.md).          |
| Shell override                  | G K W | `terminal.shell`      | implemented | `crates/bitty-runtime/tests/runtime_panes.rs::spawn_shell_blank_program_rejected_without_touching_pty`; [configuration options reference](configuration-options.md) |
| Synchronized output             | G K W | DECSET 2026           | implemented | `crates/bitty-runtime/tests/m1_synchronized_update.rs::decset_2026_set_clear_parse_toggles_live_mode`                                                               |

### Splits, workspaces, and session

| Feature                 | Peers | Bitty                                                  | Status      | Evidence                                                                                                                                                                                              |
| ----------------------- | ----- | ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Splits                  | G K W | `new_split`, `goto_split`, `resize_split`              | implemented | `crates/bitty-runtime/tests/split_tiling.rs::horizontal_split_tiles_side_by_side_with_one_frame_per_pane`, `::vertical_split_tiles_top_bottom`                                                        |
| Split zoom              | G K W | `toggle_zoom`                                          | implemented | `crates/bitty-runtime/tests/split_zoom_repaint.rs::split_geometry_only_forces_full_present`                                                                                                           |
| Split gaps              | K     | `layout.gaps_*`, `decoration.gaps_*`                   | implemented | `crates/bitty-runtime/tests/panel_gaps.rs::stack_leaves_get_gaps_out_inset_only`                                                                                                                      |
| Workspaces (tab-like)   | G K W | `workspace_new` / `workspace_next` / `workspace_focus` | implemented | `crates/bitty-runtime/src/runtime/workspaces.rs::fresh_runtime_is_one_idle_workspace`                                                                                                                 |
| Workspace bar placement | G K W | `workspace.show_bar`                                   | planned     | Edge placement and pills: [chrome band contract](../specifications/chrome-band-contract-candidate.md).                                                                                                |
| Per-panel tab strip     | G K W | —                                                      | planned     | PW-10 in the [panel and workspace interaction candidate](../specifications/panel-workspace-interaction-candidate.md).                                                                                 |
| Multiple OS windows     | G K W | —                                                      | gap         | One window per process today.                                                                                                                                                                         |
| Close confirmation      | G K W | `close_confirm`                                        | implemented | `crates/bitty-runtime/tests/close_confirm.rs::window_close_proceeds_immediately_under_defaults`; `crates/bitty-config/src/file.rs::lua_close_confirm_parses_absent_means_silent_and_bad_fails_closed` |
| Session save / restore  | K W   | built-in snapshot                                      | implemented | `crates/bitty-runtime/tests/session_save_restore.rs::snapshot_encode_decode_round_trip_preserves_layout_scrollback_cwd`                                                                               |
| Open / close animations | —     | `appearance.animations.*`                              | implemented | `crates/bitty-runtime/tests/panel_animations.rs::open_transition_presents_bounded_frames_then_idles`; `crates/bitty-config/src/file.rs::lua_animations_parses_and_fails_closed`                       |

### Configuration system

| Feature                | Peers | Bitty                                    | Status      | Evidence                                                                                                                                  |
| ---------------------- | ----- | ---------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Programmable config    | W     | Lua `init.lua`                           | implemented | `crates/bitty-config/src/file.rs::lua_full_scalar_tables_and_keymaps_parse`; [Lua and XDG configuration](../configuration/lua-and-xdg.md) |
| Live reload            | G K W | diff-and-reconcile, per-key reload class | implemented | `crates/bitty-terminal/src/config_reload.rs::only_runtime_adopted_fields_are_reported_as_live`                                            |
| Profiles / inheritance | W     | profile `extends`                        | implemented | `crates/bitty-config/src/file.rs::profile_name_validation_accepts_simple_names`                                                           |
| Config includes        | G K W | —                                        | gap         | Single file plus profile chain; no include directive.                                                                                     |
| Per-view overrides     | —     | `views.<selector>.*`                     | implemented | `crates/bitty-config/src/file.rs::views_reload_classification_is_live`                                                                    |

## Summary

| Status      | Rows |
| ----------- | ---- |
| implemented | 58   |
| partial     | 6    |
| planned     | 2    |
| gap         | 32   |
| wont-do     | 1    |

## Follow-up candidates

Each gap below is a candidate for its own scoped issue in `bitty`. "Lua
surface" marks items that would add configuration keys admitted through the
Lua loader or plugin API surface under the plugin contract; configuration
keys follow the fail-closed validation and reload-class rules in the
[configuration options reference](configuration-options.md).

| Candidate title                                                      | Labels                      | Lua surface |
| -------------------------------------------------------------------- | --------------------------- | ----------- |
| Admit `window.blur_radius` in the Lua loader and apply platform blur | `feat` `P1` `area:platform` | yes         |
| Background image opacity and anchor position                         | `feat` `P2` `area:render`   | yes         |
| Per-cell background opacity                                          | `feat` `P2` `area:render`   | yes         |
| Window title template and initial window size keys                   | `feat` `P2` `area:platform` | yes         |
| Window decorations toggle and fullscreen/maximize actions            | `feat` `P2` `area:platform` | yes         |
| Quick (dropdown) terminal                                            | `feat` `P2` `area:platform` | yes         |
| Unfocused split content dimming                                      | `feat` `P2` `area:render`   | yes         |
| User font fallback families and per-style faces                      | `feat` `P2` `area:render`   | yes         |
| Ligatures and OpenType feature shaping                               | `feat` `P2` `area:render`   | yes         |
| Cursor blink timing and cursor text color                            | `feat` `P2` `area:render`   | yes         |
| Theme file loading and light/dark auto switch                        | `feat` `P2` `area:config`   | yes         |
| Minimum text contrast and bold-as-bright                             | `feat` `P2` `area:render`   | yes         |
| Custom word boundaries and scrollback export                         | `feat` `P2` `area:ui`       | yes         |
| OSC 52 read/write policy key and primary selection                   | `feat` `P2` `area:security` | yes         |
| Send-text keymap action and custom mouse bindings                    | `feat` `P2` `area:config`   | yes         |
| Hide mouse while typing                                              | `feat` `P2` `area:platform` | yes         |
| Plain-text URL detection for quick-select                            | `feat` `P2` `area:rich`     | yes         |
| Sixel image parsing                                                  | `feat` `P2` `area:term`     | no          |
| Multiple OS windows per process                                      | `feat` `P2` `area:runtime`  | no          |
| Config include directive                                             | `feat` `P2` `area:config`   | yes         |
| Opt-in automatic shell integration injection                         | `feat` `P2` `area:pty`      | yes         |

Security-sensitive candidates (OSC 52 policy, shell integration injection,
background image roots) must be reviewed against the security corpus before
implementation; none of them may weaken default-deny behavior.

## References

- [Configuration options reference](configuration-options.md)
- [Terminal compatibility matrix](compatibility-matrix.md)
- [Chrome band contract candidate](../specifications/chrome-band-contract-candidate.md)
- [Panel and workspace interaction candidate](../specifications/panel-workspace-interaction-candidate.md)
- [Lua and XDG configuration](../configuration/lua-and-xdg.md)
- Ghostty configuration reference: <https://ghostty.org/docs/config/reference>
- Kitty configuration reference: <https://sw.kovidgoyal.net/kitty/conf/>
- WezTerm configuration reference: <https://wezterm.org/config/lua/config/index.html>
