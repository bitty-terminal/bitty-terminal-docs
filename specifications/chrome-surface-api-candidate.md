---
title: Chrome Surface API (Candidate)
description: Candidate generic Core APIs for plugin-owned chrome covering edge band surfaces domain data reads events and commands and shared Lua composition modules
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 65
---

# Chrome Surface API (Candidate)

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record states the owner direction
> that Core renders no built-in workspace bar: the workspace bar and the status
> line are optional, independent Lua plugins, and Core provides generic
> infrastructure they assemble. It authorizes no shipped behavior, weakens no
> accepted source it cites, and makes no implementation claim beyond the
> current-state section. Every API name, capability, event, command, and
> constant below is a candidate spelling pending
> [OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md).
>
> The ownership direction (Workspace is Core mechanism; workspace bars, tabs,
> and sidebars are optional plugins; the Core workspaceline and the bundled
> `bitty-terminal.workspace` manifest retire) is **accepted** by
> [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md). The API shapes in this record remain candidate.

## Purpose and scope

The [Chrome Band Contract](chrome-band-contract-candidate.md) fixed band
geometry so chrome no longer occludes terminal content
([bitty#1431](https://github.com/bitty-terminal/bitty/issues/1431)). It still
assumed a Core-rendered `workspace` module. The owner direction replaces that
assumption with a compositor-and-bar split in the style of a Wayland
compositor and an independent bar: Core reserves space, renders declarative
trees, routes input, and exposes bounded domain data; plugins decide what a
bar shows. The APIs are generic so any domain, not only workspaces, reuses
them.

The contract has three layers:

- **L0 Surfaces** — edge bands requested through `bitty.ui.mount`, rendered
  and hit-tested by Core.
- **L1 Domain data** — one uniform read, event, and command pattern per
  domain, with workspaces as the first domain.
- **L2 Composition** — shared Lua modules in the plugin SDK that several
  plugins import.

In scope: the three layers, the migration from the Core text workspaceline to
plugins, and the capability and budget rules. Out of scope and owned
elsewhere: band geometry, reflow, and degradation (candidate,
[Chrome Band Contract](chrome-band-contract-candidate.md)); the chrome
inventory and read-only rules (candidate,
[Chrome Surface Contract](chrome-surface-contract-candidate.md)); panel tabs
(candidate PW-10,
[Panel and Workspace Interaction](panel-workspace-interaction-candidate.md));
token resolution (candidate,
[Theme Token Contract](theme-token-contract-candidate.md)); the `workspacebar`
and `statusline` plugin implementations (plugin repositories).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  invariant 3 (presentation never Terminal Truth), invariant 4 (no hot-path
  execution), invariant 7 (bounded inputs).
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  (accepted): deny-by-default capabilities, no ambient authority, command
  dispatch as the only invocable path, manifest-declared bounded bus topics.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): `bitty.ui.mount(slot, component)`, the closed slot set
  (`terminal | top | bottom | left | right | tabline | statusline | overlay`),
  the v1 node subset (`Text | Row | Column | List`), the exclusive `tabline`
  claim, and "host layout owns placement and decoration". The RFC's frozen
  vocabulary predates the CTX-1140 removal of `statusline`; the current Core
  build accepts the seven remaining names (see "Current state").
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): `SCN-1`
  (2048 nodes per block) and `SCN-3` (256 KiB text per block).
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  command-registry interactions and undo through the same command surface.
- [Chrome Band Contract](chrome-band-contract-candidate.md) (candidate): band
  geometry, reflow, PTY-size, degradation, and hit-test geometry rules.
- [Chrome Surface Contract](chrome-surface-contract-candidate.md) (candidate):
  chrome reads identity and declarative state only and is never a focus
  target.

## Terminology

| Term               | Meaning in this document                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Surface            | A band-hosted mount: one plugin's `UiNode` tree placed by Core on an edge band.                                   |
| Exclusive zone     | Space a surface reserves on its edge so tiled content never lies beneath it, as with layer-shell exclusive zones. |
| Stacking order     | The deterministic order in which several surfaces on one edge are placed from the window edge inward.             |
| Domain             | A Core-owned model a plugin may observe, such as workspaces, panels, terminal status, or plugins.                 |
| Snapshot read      | A bounded, copy-out read of a domain's identity-level state; never a live reference.                              |
| Bound command      | An `on_click` or `on_scroll` binding naming a registered command plus bounded arguments.                          |
| Composition module | A plain Lua module shipped in the plugin SDK and loaded inside each importing plugin's own VM.                    |

## Current state (implemented facts only)

These facts describe the `bitty` main branch at the time of writing; nothing
else in this record is implemented.

- Core reserves no band and paints no workspaceline: the layout container is
  the full window (`W-104`, `bitty#1721` `819f286`). `workspace.show_bar`
  and `workspace.bar.edge` (`top` or `bottom`) are bar-plugin keys —
  `bitty-config` still parses them for the bar plugin while the Core runtime
  mapping is deleted.
- The workspace query path is retained: the lifecycle, state, and `ctl`
  workspace commands keep working, with no workspaceline string attached.
- `bitty.ui.mount(slot, tree)` and `bitty.ui.update(handle, tree)` exist behind
  `ui.rich`, with the closed slot set, the `Text`/`Row`/`Column`/`List` nodes,
  and the limits `UI_MAX_DEPTH = 16`, `UI_MAX_NODES = 2048`, and
  `UI_MAX_TEXT_BYTES = 256 KiB` (`bitty@da63e42e`).
- `top` and `bottom` mounts are retained and painted as edge bands. `overlay`
  mounts are retained by the Core focusable-overlay host and are not edge
  bands (CTX-0941).
- `left` and `right` mounts fail closed with the typed runtime error
  `E_UI_UNAVAILABLE` because this build has no vertical band host; no handle is
  returned, no block is stored, and no columns are reserved
  (`bitty#2234`, CTX-1341).
- `terminal` mounts fail closed with `E_UI_UNAVAILABLE` (no terminal-attached
  block host). `tabline` fails closed with `E_UI_UNAVAILABLE` (reserved for
  panel tabs, PW-10).
- `statusline` is not a slot in this build. Core removed it as a breaking
  change in CTX-1140 (`bitty#1962`); the name is rejected as an unknown slot
  with `E_UI_COMPONENT_INVALID`, and status presentation is a `bottom`-band
  composition (bar replacement). The accepted Lua Surface RFC still lists
  `statusline` in its frozen v1 vocabulary, so that accepted text and this
  implementation fact diverge until the RFC is revised.
- No Lua workspace read API and no workspace events exist.
- A Core pill renderer with `workspace.bar.colors` and `workspace.bar.pill_align`
  was attempted and not merged; it is dropped by this record.
- Every `UiNode` variant (`Text | Row | Column | List`) carries an optional
  `on_scroll` binding reusing the `ClickCommand` `{ command, args }` shape
  (`bitty` #2008, PR #2054): a wheel over a bound node invokes the declared
  command with the declared args plus a host-computed `delta` number (signed
  lines, positive for wheel-up), overwriting a declared entry of the same
  name. Parse reserves one arg slot for the injected delta so dispatch can
  never exceed `UI_CLICK_MAX_ARGS`.

## L0 Surfaces

### Requesting a band

1. Any plugin holding `ui.rich` requests an edge band by mounting on the `top`
   or `bottom` slot. The mount is the request; there is no separate band API.
   Core paints a placed surface on its edge and reserves that edge's exclusive
   zone.
2. `left` and `right` are accepted slot names with no vertical band host in
   this build. A mount on either fails closed at `ui.mount` with the typed
   runtime error `E_UI_UNAVAILABLE` after the capability and claim gates; no
   handle is returned and nothing is stored or placed. Vertical bands stay
   deferred until a host implements the four-edge geometry the Chrome Band
   Contract already defines.
3. `statusline` is not a slot: Core removed it in CTX-1140 (`bitty#1962`), and
   the name fails as an unknown slot with `E_UI_COMPONENT_INVALID`. A bar
   plugin composes status presentation on `bottom` instead.
4. A mount never supplies coordinates, edge overrides, or thickness. Core
   derives the surface's thickness from the tree's laid-out extent, clamped to
   `BAND_MAX_THICKNESS_PX`.
5. **No mount, no band.** When no plugin has a placed surface on an edge, that
   edge reserves zero space. Keyboard workspace switching and every other
   command keep working with no bar at all.

### Exclusive zone and stacking

1. Each placed surface reserves an exclusive zone on its edge; the band
   thickness for that edge is the sum of the zones of its surfaces. The
   Chrome Band Contract geometry, reflow, PTY-size, and degradation rules apply
   unchanged to the resulting band.
2. When several plugins mount on one edge, Core stacks them from the window
   edge inward in a deterministic order: explicit user order from
   configuration (candidate key `chrome.<edge>.order`, a list of plugin ids),
   then plugin id in byte order for any surface not listed. Mount order and
   timing never affect placement.
3. One plugin may hold at most one surface per edge (candidate); a second
   mount on the same edge replaces nothing and fails with a diagnostic so
   `ui.update` stays the only way to change a surface.
4. Narrow-window degradation hides whole surfaces, innermost first, before
   content drops below the content floor.

### Rendering and budgets

1. Core renders placed `UiBlocks` into band rectangles. Existing per-component
   limits (`UI_MAX_DEPTH`, `UI_MAX_NODES`, `UI_MAX_TEXT_BYTES`) apply at mount
   time, and the per-band per-frame cap `BAND_MAX_NODES_PER_FRAME` from the
   Chrome Band Contract applies at render time across all surfaces on a band.
2. Nodes beyond the cap are not laid out for that frame; the band draws a
   truncation marker at the overflow point and records a diagnostic naming the
   plugin. The frame still presents; one plugin's overflow truncates only its
   own surface when the cap is split per surface (open point).
3. Content updates that keep thickness cause band damage only, never reflow.

### Style attributes

1. `UiNode` gains optional style attributes: `fg`, `bg` (theme token names),
   and `bold` (Boolean). Token names resolve through the
   [Theme Token Contract](theme-token-contract-candidate.md); raw colors are not
   accepted.
2. Validation fails closed: an unknown token name, a wrong type, or an
   unknown attribute rejects the mount or update with a source-attributed
   error; nothing renders with a guessed style.

### Click bindings

1. `UiNode` gains an optional `on_click` binding:
   `{ command = "<registered command id>", args = { ... } }`. There are no Lua
   function values in a tree and no direct callback into render or input hot
   paths.
2. Arguments are bounded: scalar strings, integers, and Booleans only, at most
   `UI_CLICK_MAX_ARGS` entries and `UI_CLICK_MAX_ARG_BYTES` total (candidate
   constants), validated at mount time.
3. The command must be in the mounting plugin's command allowlist: a command
   the plugin registered itself, or a Core command its capabilities grant it to
   invoke (see L1 mutations). An unlisted command rejects the mount.
4. **Hit-test shares render geometry.** Core hit-tests against the node
   rectangles of the presented frame; there is no second geometry source. A
   primary click on a bound node dispatches the command through the command
   registry exactly as a keybinding would, with the same validation and undo.
5. Chrome is never a focus target: clicks never move keyboard or IME focus
   into a band, and a pointer event inside a band never reaches the grid.

### Scroll bindings

1. `UiNode` gains an optional `on_scroll` binding on every node variant
   (`Text | Row | Column | List`), reusing the `ClickCommand`
   `{ command = "<registered command id>", args = { ... } }` shape
   (`bitty` #2008, PR #2054). There are no Lua function values in a tree
   and no plugin code runs on the input path; scroll dispatch reuses the
   command path exactly as clicks do.
2. At dispatch the host merges the declared args with a host-computed
   `delta` number (signed lines, positive for wheel-up), carried under the
   `delta` arg name and overwriting a declared entry of the same name, so a
   scroll carries one named table (for example `run({ id = 3, delta = 1 })`)
   with declaration order preserved and `delta` merged last. Parse reserves
   one arg slot for the injected delta so dispatch can never exceed
   `UI_CLICK_MAX_ARGS` (`16`).
3. The click allowlist rule applies unchanged: the command must be in the
   mounting plugin's command allowlist or the mount is rejected. No new
   capability head is introduced; the binding reuses the command path and
   its registration and capability gates.
4. Scroll inheritance follows the band flattening: `on_scroll` applies to
   descendant spans that do not declare their own binding.
5. Burst policy: consecutive wheel ticks for one target coalesce with
   saturating `i32` math into a single queued request, and the drain queue
   holds at most `BAND_SCROLL_QUEUE_MAX` (`8`) requests, dropping the
   newest past the cap. Routing, the drain contract, and the counters live
   in the [Chrome Band Contract](chrome-band-contract-candidate.md).

### Per-item hit regions

1. A click or scroll binding may declare one optional region identity:
   `region = { id = "<bounded id>", kind = "module" | "item" }` (candidate
   spelling, `bitty` #2248). `id` is 1-64 bytes of `[a-z0-9._:-]`; `kind`
   defaults to `module`; an unknown id or kind rejects the mount with
   `E_UI_COMPONENT_INVALID`. The region lives beside the binding, so one
   span can carry click and scroll under one identity; declaring different
   regions on the two bindings rejects the mount.
2. Core derives the rectangle. A plugin never supplies coordinates: the
   host flattens the tree through the paint path, gives every declared
   region the display-cell span of its runs, clips it to the painted window
   width, and merges adjacent runs with the same identity into one item. A
   module composed of several leaves (icon plus label) is therefore one
   region, not one region per leaf.
3. Core emits a bounded table of `{ plugin_id, edge, visible_index, row,
region { id, kind }, start_col, end_col, version }` records through
   `Runtime::band_item_regions`. At most `BAND_MAX_REGIONS` (`64`) distinct
   regions per band; a band above the cap fails closed as a whole (no click
   or scroll on it routes, the frame still paints, and the overflow is
   counted). Regions are derived from the current tree on demand, so a
   remount or reflow can never expose stale geometry.
4. Hit-testing maps a pointer column to exactly one region: later
   registration wins where spans overlap ("topmost/last-registered"), and
   the emitted table is disjoint by construction. A column outside every
   region is unclaimed chrome.
5. A region-aware click carries the region id under `region` and the button
   spelling (`left`, `right`, `middle`) under `button`; a region-aware
   scroll carries `region` and the host-computed `delta`. Both merge last
   and overwrite declared entries of the same names. A span without a
   region keeps its pre-2248 payload exactly and routes only the primary
   button, so existing strict command schemas stay valid. Bands consume
   left, right, and middle presses and releases, so chrome can never paste
   the clipboard; back and forward fall through unchanged. No capability is
   added: the command still needs its declared grants.
6. A queued action is fenced by the presented band origin (plugin
   generation, mount handle, slot, version, edge, row); a remount, edge
   move, or replacement version refuses the action before dispatch. No
   plugin VM is entered on the input path; region emission and hit-testing
   are pure data walks over the mounted tree.

### Overlay input pump and modifier channel

1. A plugin that mounted a block into the focusable `overlay` slot claims
   exclusive keyboard focus for one bounded interaction through the Core-owned
   capture switch (`bitty` CTX-0941, W-28; `crates/bitty-runtime/src/plugin_runtime/overlay.rs`).
   Core owns the switch, the permission, and the queue; the plugin never
   captures input directly and never registers a synchronous callback on the
   input path. At most one capture is active; a second `acquire` fails closed
   and the queue drops the oldest past its cap with a count.
2. The application delivers at most one `overlay.input.available` observation
   per tick from the `input_available()` snapshot (live owner plus queued
   count, `None` when no owner or nothing queued), so tick cost stays O(1).
   The owner drains through `poll` on its own cold path; `enqueue` never calls
   into a VM.
3. The flat key event carries only produced text, so the chord rides alongside
   as `data` (`{ key, ctrl, alt, shift, super }`) with the shared keymap
   spelling (`KeyName::canonical`, for example `"enter"`) plus the live
   modifier bits (`bitty` #2098, CTX-1236). It is present only when at least
   one modifier is held; unmodified input marshals byte-identical to before.
4. Shift-Char rule (`bitty` #2104, CTX-1240): a shift-only `Char` produces
   text, not a chord, so it queues flat and inserts (`Shift+A`, `!`, and
   shifted symbols stay literals). Named keys keep all modifiers
   (`Shift+Enter` stays a chord); `Char` with `ctrl`, `alt`, or `super` keeps
   its chord (real chord intent).

### Terminal submit bridge

1. `bitty.terminal.submit(text)` submits the accepted buffer to the focused
   panel's PTY through the capability-gated terminal input API (`bitty`
   #2101, CTX-1239; `crates/bitty-runtime/src/plugin_runtime/services.rs`,
   `crates/bitty-runtime/src/runtime/submit_host.rs`). The extension passes
   raw text; the byte-exact bracketed-paste frame (`ESC[200~` content
   `ESC[201~` `CR`) stays host-side.
2. Grant `terminal.input.submit` from the activation snapshot; the Lua key is
   present only while the generation holds both the grant and a wired submit
   queue, otherwise the call fails closed with `E_CAPABILITY_DENIED` (grant)
   or `E_NOT_IMPLEMENTED` (unwired). A legacy host without the bridge probes
   absent.
3. Caps are host-owned and fail-closed: content at most `COMPOSER_MAX_BYTES`
   (`64 KiB`, `too-large` past the cap); per-generation window
   `TERMINAL_SUBMIT_WINDOW_BYTES` (`1 MiB`, `budget-exceeded` when exhausted,
   charged only on enqueue success); shared queue saturated reports
   `queue-full` with nothing charged (newest dropped, counted). The outcome is
   a table: accepted (`{ status = "accepted", bytes }`) or denied
   (`{ status = "denied", deny }` naming the rule, never the payload).

### Reserved slots

`tabline` stays an exclusive claim reserved for PW-10 panel tabs. It is not a
band surface and hosts no workspace bar.

## L1 Domain data

### Uniform domain pattern

Every domain exposes the same four parts; nothing is workspace-specific in the
pattern itself.

| Part      | Shape                                                                      | Gate                                   |
| --------- | -------------------------------------------------------------------------- | -------------------------------------- |
| Read      | `bitty.<domain>.list()` returns a bounded snapshot array                   | `<domain>.read`                        |
| Events    | `<domain>.*` bus topics carrying identity-level payloads                   | `<domain>.read`                        |
| Mutations | Registered commands only, invoked by `bitty.commands.invoke` or `on_click` | `<domain>.control`, separate from read |
| Bounds    | Fixed per-domain maximum entries and per-field byte limits                 | Core-owned constants                   |

1. Snapshots are copies taken at call time; they never expose live handles
   and never include panel or terminal content.
2. Events notify; they carry enough identity for a plugin to decide whether to
   re-read. A plugin that misses an event re-reads with `list()`.
3. Event delivery is coalesced per frame and never runs on the render or PTY
   path.

### Workspace (first domain)

| Item      | Candidate spelling                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------- |
| Read      | `bitty.workspace.list()` returning `{ id, name, active, panel_count, attention }` per workspace, in order |
| Events    | `workspace.created`, `workspace.closed`, `workspace.renamed`, `workspace.focused`, `workspace.changed`    |
| Mutations | `workspace:focus`, `workspace:new`, `workspace:close`, `workspace:rename`, `workspace:move_panel`         |
| Gates     | `workspace.read` for list and events; `workspace.control` for mutations                                   |

1. `attention` is a bounded flag set (candidate members: `bell`, `activity`,
   `exited`); its sources remain an open point inherited from the Chrome Band
   Contract.
2. `name` is bounded by the workspace name limit; `id` is the stable
   workspace identity, never a display counter.
3. Mutation commands reuse the existing Core workspace command handlers,
   including the capacity bound, the never-empty invariant (PW-6), and undo.
   They are Core commands, not plugin commands: the
   `bitty-terminal.workspace:new|close|next` names from the retiring bundled
   manifest are not the target namespace, and the final namespace is pending
   OQ-056.

```lua
-- Illustrative-only candidate shape; not an implemented API.
local items = {}
for _, ws in ipairs(bitty.workspace.list()) do
  items[#items + 1] = {
    kind = "Text",
    text = ws.name,
    fg = ws.active and "chrome.bar.active" or "chrome.bar.foreground",
    on_click = { command = "workspace:focus", args = { id = ws.id } },
  }
end
local handle = bitty.ui.mount("top", { kind = "Row", children = items })
bitty.events.on("workspace.changed", function() --[[ rebuild and ui.update ]] end)
```

### Further domains

Later domains follow the same table without new mechanism:

- **Panels** — `panel.read` for `bitty.panel.list()` (id, workspace id, kind,
  title, focused); `panel.*` events; `panel.control` commands (focus, move,
  close).
- **Terminal status** — `terminal.status.read` for identity-level status
  (cwd, exit status, busy flag) of panels; never grid, scrollback, or
  selection.
- **Plugins** — `plugins.read` for id, state, and diagnostics count; lifecycle
  commands stay Core- and user-owned.

Each domain is admitted by its own scoped record that fixes its fields and
bounds; this record fixes only the shape.

## L2 Composition

1. Reusable chrome pieces are plain Lua modules shipped in the plugin SDK, for
   example a workspace-segment module that returns a `UiNode` subtree from a
   `bitty.workspace.list()` snapshot. Both `statusline` and `workspacebar`
   import it and render it in their own surfaces.
2. A composition module runs inside the importing plugin's VM with that
   plugin's grants; it adds no authority. A module that calls
   `bitty.workspace.list()` works only in a plugin holding `workspace.read`.
3. v0.1 has no cross-VM embedding: one plugin cannot mount another plugin's
   tree or call into another plugin's VM. Sharing happens through code reuse
   and L1 data, not live composition.

## Migration

1. **Core APIs land first.** L0 rendering, style attributes, `on_click`, and
   the workspace L1 domain are implemented and tested in `bitty` before any
   plugin rework. Plugin-side work is deferred until these APIs are stable.
2. **Plugins migrate next.** The existing `statusline` plugin adopts L0 and the
   workspace-segment L2 module; a new first-party `workspacebar` plugin
   repository provides the workspace bar. Both are optional and independent.
3. **Core workspaceline retired.** The Core text workspaceline was removed
   under `W-104` (`bitty#1721` `819f286`); `bitty-config` still parses
   `workspace.show_bar` and `workspace.bar.edge` for the bar plugin while the
   Core runtime mapping is deleted. The `bitty-terminal.tabs` alias was
   purged earlier (`bitty#1717` `471b3f9`). The bundled
   `bitty-terminal.workspace` manifest and `workspaceline` claim remainder
   stays open under `bitty#1572` (ADR 0014).
4. **Key mapping.** `workspace.show_bar` and `workspace.bar.edge` either map to
   `workspacebar` plugin settings (enable state and preferred edge) with a
   deprecation window, or are removed with the Core workspaceline; the choice
   is an open point. `workspace.bar.colors` and `workspace.bar.pill_align` are
   not introduced.

## Security review

- **Default-deny capabilities.** `ui.rich` stays required for any surface;
  `workspace.read` and `workspace.control` are new, separate, and denied
  unless granted. Read never implies control. Later domains add their own
  `<domain>.read`/`<domain>.control` pairs.
- **Bounded payloads.** Mount limits, the per-band per-frame cap, snapshot
  entry and field limits, event coalescing, and click-argument limits bound
  every input a plugin supplies or receives.
- **No content reads.** L1 exposes identity and state only; no grid,
  scrollback, selection, clipboard, or process environment.
- **Command allowlist.** `on_click` names only a command the plugin registered
  or a Core command its grants allow; bindings are validated at mount time and
  dispatched through the command registry with its normal validation, so a
  click has no more authority than the plugin already holds.
- **No spoofing of content.** Surfaces render only inside reserved bands and
  never over grid content (Chrome Band Contract), and are never focus targets,
  so chrome cannot capture keystrokes.
- **Safe startup.** `bitty --safe` loads no third-party plugin; with no
  mount, no band is reserved and keyboard workspace switching still works.

## Verification plan

1. Headless tests: no mount reserves zero space on every edge; one mount
   reserves its laid-out thickness; two mounts stack in configured order,
   then plugin id order, independent of mount timing.
2. Render tests: placed `UiBlocks` render inside the band; a tree above
   `BAND_MAX_NODES_PER_FRAME` draws a truncation marker, records a diagnostic,
   and the frame presents.
3. Validation tests: unknown token names, unknown attributes, function values,
   oversized click arguments, and unlisted commands reject the mount.
4. Hit-test tests: a click on a bound node dispatches its command through the
   registry using presented-frame geometry; clicks never move focus or reach
   the grid. Region tests cover the kind/rect round trip, adjacent merge,
   overlapping tie-break, click/scroll routing to the right item, right and
   middle clicks never pasting, overflow fail-closed, and stale-version
   refusal.
5. Capability tests: `bitty.workspace.list()` and `workspace.*` events fail
   without `workspace.read`; mutation commands fail without
   `workspace.control`.
6. Bound tests: snapshot size and field lengths stay within Core constants at
   the workspace capacity bound.
7. Scroll tests: a wheel over a bound node dispatches its command with the
   declared args plus the host-computed `delta`; a burst of ticks drains as
   one request with a saturated delta; unbound rows fall through to the
   viewport path unchanged.
8. Overlay pump tests: `overlay.input.available` reports the live owner plus
   queued count only; a shift-only `Char` queues flat while `Shift+Enter`
   and `ctrl`/`alt`/`super` `Char` keep their chord.
9. Submit tests: `bitty.terminal.submit` without the grant fails closed;
   over-cap, budget-exhausted, and queue-full intents deny with the rule
   name and leave the buffer and modal session intact.
10. Migration test: with the Core workspaceline retired and no plugin enabled,
    workspace keybindings still switch, create, and close workspaces.
11. `just check` passes for this document and every linked update.

## Alternatives considered

| Alternative                                    | Trade-off                                                                                 | Disposition              |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------ |
| Core-rendered workspace pills with config keys | Works without plugins; hard-codes one bar design in Core and grows Core config per domain | Rejected by the owner    |
| Plugin-drawn raw cells or pixels               | Maximum freedom; bypasses budgets, theming, hit-test geometry, and accessibility          | Rejected                 |
| Workspace-specific bar API                     | Simple first step; every later domain needs a parallel API                                | Rejected — generic L0/L1 |
| Direct Lua callbacks for clicks                | Familiar; puts plugin code on the input path and bypasses the command registry and undo   | Rejected                 |
| Cross-VM embedding of other plugins' trees     | Live composition; new trust and lifetime coupling between plugins                         | Deferred past v0.1       |

## Affected contracts

| Contract                                                                                                                                        | Effect                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Chrome Band Contract](chrome-band-contract-candidate.md) (candidate)                                                                           | Geometry kept; Core `workspace` pills and `workspace.bar.colors` superseded by this record |
| [Status System Specification](status-system.md) (draft)                                                                                         | `workspace` module content comes from a plugin via L1                                      |
| [Panel and Workspace Interaction](panel-workspace-interaction-candidate.md) (candidate)                                                         | PW-4 appearance plugin-owned; PW-8 consumes L0 hit-test and L1 `move_panel`; PW-9 shape    |
| [Tabs Scope Decision](tabs-scope-decision.md) (draft)                                                                                           | Unchanged: `tabline` stays reserved for PW-10                                              |
| [Theme Token Contract](theme-token-contract-candidate.md) (candidate)                                                                           | Consumed for `fg`/`bg` token names                                                         |
| [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md) (accepted) | Extended additively: style attributes and `on_click` on existing nodes; slot set unchanged |

## Open points

- Final API, capability, event, and command spellings and the API version
  (OQ-056).
- Stacking configuration key spelling and whether one plugin may hold more
  than one surface per edge.
- Whether `BAND_MAX_NODES_PER_FRAME` is shared per band or split per surface.
- Values for `UI_CLICK_MAX_ARGS`, `UI_CLICK_MAX_ARG_BYTES`, and snapshot bounds.
- Fate of `workspace.show_bar` and `workspace.bar.edge`: plugin-setting
  mapping with deprecation, or removal with the Core workspaceline.
- Attention flag sources and bounds.
- Pointer events beyond primary click (hover, secondary click, drag source)
  and their accessibility roles.
- Whether drag-to-bar (PW-8) needs a drop-target binding on nodes in addition
  to `on_click`.

## Acceptance criteria

1. A reviewer confirms each rule composes with the normative sources above and
   weakens none of them.
2. The Chrome Band Contract, Status System, PW-4, PW-8, PW-9, and the Tabs
   Scope Decision link this record and agree with it.
3. A security reviewer signs off the new capabilities, the click allowlist,
   and the payload bounds.
4. The verification plan maps to planned `bitty` tests before any
   implementation claim is recorded here.
5. Plugin migration starts only after the L0 and workspace L1 APIs are
   accepted and implemented.

## P0 Review Sign-off

Pending. This record adds capabilities (`workspace.read`,
`workspace.control`) and a new input-to-command path (`on_click`, extended
by `on_scroll` reusing the same command path with no new authority), so
acceptance requires owner and security-reviewer sign-off recorded here.

## References

- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) — band
  geometry, reflow, and degradation.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  chrome inventory and read-only rules.
- [Status System Specification](status-system.md) — registry regions and
  modules.
- [Panel and Workspace Interaction (Candidate)](panel-workspace-interaction-candidate.md)
  — PW-4, PW-8, PW-9, PW-10.
- [Tabs Scope Decision](tabs-scope-decision.md) — tab strip ownership.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) —
  token names for style attributes.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — `bitty.ui.mount` and the closed slot set.
- [bitty#1431](https://github.com/bitty-terminal/bitty/issues/1431) — workspace
  bar occludes terminal content.
