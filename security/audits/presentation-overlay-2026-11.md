---
title: Presentation Overlay Security Audit — 2026-11 (bitty#2849)
description: Independent revision-locked review of the ui.present presentation-only overlay surface against terminal-content read, input capture, and generation-outliving concerns.
category: security
audience: security-reviewer
document_type: register
status: draft
website_publish: false
sidebar_order: 59
---

<!-- markdownlint-disable MD025 -->

# Presentation Overlay Security Audit — 2026-11 (bitty#2849)

## Independence and review scope

- Reviewer: **agent-reviewer**, an independent reviewer that did not author the implementation under review. The review ran read-only; no code, branch, or worktree state was modified.
- Task: CTX-1677 records this review; the review itself was performed on 2026-11-03 under the guard tick that recorded bitty#2849.
- Reviewed repository revision: `8108e4f7`, the squash merge of bitty PR #2856, in `bitty-terminal/bitty`.
- Reviewed implementation paths at that revision: `crates/bitty-lua/src/host.rs` (the `present` and `overlay` tables), `crates/bitty-runtime/src/plugin_runtime/presentation_overlay.rs`, `crates/bitty-runtime/src/plugin_runtime/services.rs` (`require_presentation_overlay`, `ui_overlay_show_with_expiry`, `ui_overlay_hide`), `crates/bitty-runtime/src/runtime/present.rs` (`paint_presentation_overlay` and the paint order in `tick_at`), `crates/bitty-runtime/src/runtime/layout_focus.rs` (`is_live_view`), and `crates/bitty-terminal/src/terminal_app.rs` (`update_plugin_overlay`, `dismiss_presentation_overlay`, `deliver_overlay_dismissed`).
- Security scope: the presentation-only overlay surface introduced for bitty#2849, measured against the normative invariants in the canonical governance corpus ([bitty-docs security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)): invariant 3 (plugins may alter presentation but must not alter Terminal Truth), invariant 4 (plugins do not execute in the terminal, render, or input hot paths), and invariant 2 (third-party plugins start without host authority). Invariants 3, 4, and 2 are normative but are not among the release-blocking set that overview names (1, 5, 6, 7, and 8); this record is evidence for the surface, not a release-wide security sign-off.
- Review records:
  - <https://github.com/bitty-terminal/bitty/issues/2849#issuecomment-6603095333>
  - <https://github.com/bitty-terminal/bitty/pull/2856#pullrequestreview-5751722036>
- Limits of this review: the reviewing tick had no compositor access, so paint behaviour was established from the headless test harness and the code paths, not from a live window. No fuzzing, timing measurement, or long-duration soak was performed.

## Property 1: the surface cannot read terminal content

At `8108e4f7` the paint path renders the presenting plugin's own mounted `Data` payload, never the grid: `Runtime::paint_presentation_overlay` consumes `self.presentation_overlay`, a `BandContent` whose `root` is the plugin's retained `UiNode` (`crates/bitty-runtime/src/runtime/present.rs`). No grid, scrollback, selection, clipboard, or search input reaches the flattening walk.

The one Core-side read of terminal text is a geometric occlusion step: `paint_overlay_surface` retains `layers.combined_glyphs` entries that fall outside the card so underlay glyphs do not draw through the opaque surface. That step runs inside Core, removes glyph instances from the frame, and never returns anything to the plugin runtime.

The dismissal observation carries no content: the payload is exactly `{ owner, handle, reason }` (`crates/bitty-terminal/src/terminal_app.rs`), with no key code, text, modifiers, coordinates, or cell contents. `bitty.ui.present` is a read-only table with `show` and `hide` only (`crates/bitty-lua/src/host.rs`), so the surface exposes no poll, acquire, or register verb that could return frame data.

## Property 2: the surface cannot capture input

The session is admitted into its own `OverlayManager` as `OverlayKind::NonModal` on `OverlayTier::Popup` (`plugin_runtime/presentation_overlay.rs`), so it can never set the modal authority and never consumes the focusable capture owner's slot. `E_UI_ALREADY_CAPTURED` remains raised by the unchanged `plugin_runtime/overlay.rs`, which this change does not touch.

No key or pointer event is routed to the surface: it is not hit-tested, and clicks pass through to the grid beneath. The focus ring does not move; a dedicated test asserts the runtime focus is unchanged across a present and a dismiss.

`Esc` dismisses the panel without consuming the press: the key still reaches the focused PTY, or a coincident confirmation gate that owns the consume. That is normal routing, not a plugin-visible leak. A plugin that also wants raw keys needs a separate `terminal.input.*` grant; `ui.present` neither implies nor is implied by `ui.overlay.focus`.

## Property 3: the surface cannot outlive its generation

Suspend, dispose/unload/crash, and failed-activation rollback all funnel through `PluginRuntime` revoke paths into `PresentationOverlay::revoke_plugin` → `clear()`, which drops the session and releases the admitted slot. `clear()` queues no dismissal observation, because lifecycle teardown is not a user dismissal.

Paint content is re-resolved on every cold tick from the live generation's retained blocks, so a revoked, unloaded, or replaced generation yields no block to paint and the surface clears. Handles from a previous generation can never alias: the mount registry keys them by the activation epoch, and a stale handle is refused with `E_UI_NOT_OWNER`.

## Gate ordering observed at `8108e4f7`

`bitty.ui.present.show` (and the `bitty.ui.overlay.show` spelling of the same session) is checked in this order: argument type, call deadline, safe mode (`E_UI_UNAVAILABLE`), the `ui.present` grant (`E_CAPABILITY_DENIED` naming the head), handle ownership (`E_UI_NOT_OWNER`), then admission (`E_UI_UNAVAILABLE`). The safe-mode refusal is therefore decided before the grant check and before any admission, so a generation that reaches the host under safe policy leaves no admitted slot behind. `hide` is deliberately ungated under every shape so cleanup cannot wedge; a foreign, stale, or repeated hide reports a successful no-op and never steals another plugin's surface.

## Residual risks

These are the gaps the review named that this record does **not** close. They are carried here so the acceptance decision can weigh them rather than assume they were resolved.

1. **One-frame ghost after a cold-path revoke.** Session state and the admitted slot drop immediately, but the cloned `Runtime`-side paint copy clears on the next `update_plugin_overlay`. The exposure is bounded at one frame and contains only the plugin's own scene.
2. **Admission accounting is local to the presentation session.** The session owns its own `OverlayManager`, so "one non-modal slot under `MAX_OVERLAYS_PER_WINDOW`" bounds what the presentation path consumes and does not bound overlays held by the window's live manager. A separate global bound would be a contract change, not a defect in this surface.
3. **Identifier status.** `ui.present` and the Lua spellings remain candidates under `OQ-056` (bitty-docs open questions). This record states what the code does at `8108e4f7`; it does not accept the identifier.
4. **No live-window paint verification.** See the limits paragraph above.

## What this record does not assert

It does not promote bitty#2849 to a verified or shipped status, does not close `OQ-056`, and does not extend to the focusable capture overlay (`bitty.ui.overlay.acquire`), whose contract is reviewed separately and is unchanged by this work. It records one independent review of one surface at one revision.

## References

- bitty#2849 — presentation-only overlay session acceptance criteria.
- bitty PR #2856 — implementation (squash `8108e4f7`).
- [bitty-docs security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md) — normative invariants 2, 3, and 4.
- [`overlay-ownership-reconciliation.md`](../../specifications/overlay-ownership-reconciliation.md) — the three overlay owners and the single modal authority.
- [`help-overlay-ownership-design.md`](../../specifications/help-overlay-ownership-design.md) — the help/which-key presentation case this surface exists for.
