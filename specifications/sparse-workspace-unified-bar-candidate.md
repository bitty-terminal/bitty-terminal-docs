---
title: Sparse Workspaces and Unified Chrome Bar Contract (Candidate)
description: Candidate contract for tiling window manager style sparse on-demand workspace addressing and single-band unified chrome integration
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 66
---

# Sparse Workspaces and Unified Chrome Bar Contract (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record defines the candidate Core
> mechanism and chrome interface for tiling-window-manager-style sparse,
> non-contiguous workspace addressing (`1, 2, 4, 7, 9`) and unifies the tab
> strip and statusline presentation into a single Core-reserved ChromeBand. It
> authorizes no shipped behavior and changes no accepted source it cites.

## Purpose and scope

Historically, Bitty's internal workspace runtime allocated workspaces as a
dense, contiguous array (`0..N-1`), and key bindings (`Alt+N`) clamped to the
highest existing index. Furthermore, early drafts treated tabs (window/view
switching) and the statusline (system and terminal state reporting) as two
separate chrome surfaces, which would cost two rows of vertical terminal grid
space if rendered simultaneously.

This candidate reconciles both areas:

1. **Sparse, on-demand workspace addressing**: Adopts the Hyprland and i3 model
   where workspaces exist by numerical identity rather than dense ordinal
   sequence. Workspaces are allocated on demand upon focus or target assignment
   and pruned when empty.
2. **Unified single-edge ChromeBand**: In accordance with [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md),
   Core renders no hardcoded tabs or status widgets. Instead, Core provides a
   single, non-occluding edge band (`BarEdge::Top` or `BarEdge::Bottom`, 1 row
   high) where a unified presentation plugin (similar to Waybar) renders
   workspace navigation pills, active process/cwd context, and status widgets in
   one row.

In scope:

- Sparse workspace lifecycle: on-demand creation, switch-or-create semantics,
  and prune-on-empty cleanup.
- Core data model: mapping sparse `WorkspaceId` values inside
  `workspaces: HashMap<u64, Workspace>`.
- ChromeBand reservation integration: zero-occlusion layout partitioning via
  `ChromeInsets`.
- Pointer interaction and event protocol: dispatching `workspace_focus:N` and
  publishing sparse workspace occupancy snapshots.

Out of scope:

- Specific widget rendering, theming, and font icons (owned by presentation
  plugins, such as `bitty-plugins/plugins/bar`).
- External status bar daemons (Waybar, eww, ags) communicating via `bitty-ipc`.

## Normative sources this candidate must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), invariant 7 (bounded inputs).
- [ADR 0014: Workspace as Core Mechanism with Plugin-Only Presentation](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  (accepted): Core owns workspace state and mechanism; workspace presentation
  is strictly plugin-only.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md):
  the 1-row non-occluding reservation geometry (`ChromeInsets`).
- [Workspace Compositor Specification](workspace-compositor.md):
  the `Window -> Workspace -> LayoutTree -> View` hierarchy.

## Sparse workspace model

### On-demand dynamic addressing

1. **Sparse identity**: A workspace is identified by an integer tag
   `WorkspaceId(u64)` in the range `1..=MAX_WORKSPACE_INDEX` (default bound 64).
   Workspaces are not required to form a contiguous sequence `1, 2, 3...`.
   Active workspaces may form arbitrary sparse subsets, such as `{1, 2, 4, 7, 9}`.
2. **Switch-or-create**:
   - Invoking `workspace_focus:N` checks whether workspace `N` currently exists.
   - If workspace `N` exists, the compositor switches focus to workspace `N`.
   - If workspace `N` does not exist, Core immediately allocates workspace `N`,
     spawns its primary shell session within a root `LayoutNode::leaf`, and
     transitions focus to it.
   - Bounded invariant: If the total number of currently active workspaces
     reaches `MAX_WORKSPACES_PER_WINDOW` (16), creating a new sparse workspace
     fails closed with a typed error without dropping existing state.
3. **Prune-on-empty lifecycle**:
   - When the last pane session in a workspace is closed or reparented to
     another workspace via `workspace_move_focused_to:M`, the vacated workspace
     is evaluated for automatic pruning.
   - Pinned/persistent workspaces (such as the default initial workspace `1`)
     remain allocated even when empty (holding an idle primary shell).
   - Dynamic workspaces without active sessions are cleanly pruned from the
     internal `HashMap<u64, Workspace>`, and a `workspace.destroyed` event is
     emitted to the event bus.

## Unified ChromeBand presentation

### Single-row spatial economy

Separate tablines and statuslines consume two vertical terminal rows, which
constitutes a significant reduction in available editor and pager height on
compact screens (e.g. 24-row terminals).

Core reserves exactly one chrome band using `ChromeInsets`:

```text
+-------------------------------------------------------------------------------+
|  1  [2]  4   /mnt/data/Workspace/Project        2 Agents   CPU 8%   Fri 03:53 |
+-------------------------------------------------------------------------------+
| (Full Terminal Grid - 100% unoccluded content area)                           |
| $ cargo test --workspace                                                      |
| ...                                                                           |
+-------------------------------------------------------------------------------+
```

1. **Configurable edge**: The user configures `workspace.bar.edge = "top"` or
   `workspace.bar.edge = "bottom"`.
2. **Thickness**: `STATUS_BAR_ROWS = 1`.
3. **Zero occlusion**: Terminal grid rows are calculated strictly from the
   remaining container height after subtracting the band, ensuring that full-screen
   TUI applications (such as Neovim or htop) never suffer from clipped or
   occluded bottom lines.

### Event bus and interaction contract

Core exposes read-only observations and command dispatches to presentation
plugins:

1. **State observation**:
   - `bitty.workspace.snapshot`: Emits the list of active sparse workspace tags
     (such as `[1, 2, 4, 7]`), the active workspace identifier, the title of the
     focused panel, and current working directory.
   - `bitty.runtime.status`: Emits background agent activity counters
     (such as the count of active headless panels running agent tasks).
2. **Pointer interaction**:
   - Clicking on a workspace pill dispatches the Core command
     `workspace_focus:N`.
   - Clicking on the `+` pill dispatches `workspace_new`.
   - Middle-clicking or closing on a pill dispatches `workspace_close_request:N`.

## Migration and compatibility

- The previous contiguous clamping behavior (`workspace_focus_clamped`) remains
  available as a fallback mode for configurations specifying
  `workspace.addressing = "contiguous"`.
- Existing `workspace_prev` and `workspace_next` navigation commands traverse the
  sorted sequence of currently active sparse workspace IDs in circular order.
