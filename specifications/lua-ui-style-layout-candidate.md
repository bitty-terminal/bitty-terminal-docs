---
title: Lua UI Style and Layout Vocabulary (Candidate)
description: Candidate additive spacing alignment size-constraint and interaction-state fields for the bounded Plugin API v1 Lua UI surface with defaults caps and fail-closed refusal
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 89
---

# Lua UI Style and Layout Vocabulary (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record defines the additive
> style/layout vocabulary that the bounded Lua UI surface would accept next. It
> adds no field to the accepted surface, authorizes no implementation, and
> changes no accepted text: the
> [Rich Presentation RFC](rich-presentation-rfc.md) still owns `SceneNode` and
> `SCN-1..SCN-5`, the
> [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
> still owns the accepted `Text`/`Row`/`Column`/`List` surface, the
> [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) still
> owns token namespaces, the
> [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) still
> owns band geometry, and the
> [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md)
> still owns `padding`, `radius`, and `border` on scene-layer nodes.
>
> Field names, units, caps, and refusal messages below are candidate spellings
> that a successor acceptance adopts or rejects. Nothing in this record is
> implemented in `bitty`; no test, constant, or parser branch in this record's
> tables may be read as shipped behavior.
>
> **Related [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191).**
> The issue stays open. This record supplies the contract half of its
> additive-vocabulary item only; implementation, headed validation, and the
> release decision remain open there.

## Purpose and scope

`UiNode` accepts `fg`, `bg`, `bold`, `anchor`, `region`, and three command
bindings today, and nothing that expresses space, distribution, extents, or
state. A bar that wants grouped capsules composes
`Row`/`Text` and accepts whatever spacing the flatten walk produces; a chip that
must occupy a fixed width cannot ask for one; a clickable item cannot look
hovered because no style state exists. The
[Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md)
records exactly that shape: three "candidate" rows for spacing, size, and
interaction-state styling, and residual gap 1 for the same thing.

This record answers one question: **which additive fields may the bounded v1
surface accept, with what default, what cap, and what refusal, without adding
layout ownership, geometry authority, or a second style system?**

In scope (all **Candidate**):

- four additive fields — `gap` (spacing), `align` (alignment), `size` (size
  constraint), `states` (closed interaction states) — each with its type, unit,
  default, inclusive cap, and refusal behaviour;
- which of the four v1 primitives (`Text`, `Row`, `Column`, `List`) gains which
  field first, and which combinations are refused;
- an explicit non-goal list;
- composition against the records that already settle the neighbouring pieces,
  cited rather than restated;
- the consequence for the downstream issues that are waiting on this
  vocabulary.

Out of scope and owned elsewhere:

- the accepted node set, slot set, and capability gates (accepted,
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md);
  reconciled, [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md));
- every existing budget and refusal precedent: 2048 nodes, depth 16, 256 KiB
  text, 64 blocks, 2 MiB retained strings, 64 regions, 32-byte tokens
  (reconciled, same document; this record re-decides none of them);
- band geometry, thickness, stacking, and degradation
  ([Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md));
- `padding`, `radius`, `border`, `border_token`, and their resolution ladder on
  scene-layer nodes
  ([Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md));
- token namespaces, source order, and contrast
  ([Theme Token Contract (Candidate)](theme-token-contract-candidate.md));
- motion, transitions, and animation bounds
  ([UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md),
  [RFC-0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md));
- reusable composition entries over the v1 node set
  ([Extension Component Catalog (Candidate)](extension-component-catalog-candidate.md));
- panel/floating/fullscreen presentation modes
  ([Panel GUI Content Presentation (Candidate)](panel-gui-content-presentation-candidate.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture and invariants 3 (presentation, never Terminal
  Truth), 4 (no hot-path execution), 7 (bounded inputs), and 10 (`bitty --safe`).
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-01 resource exhaustion and T-06/T-07 plugin authority and hot paths.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism
  versus policy, and the rule that a plugin alters presentation only.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): `SceneNode`,
  `SCN-1..SCN-5`, and the prohibition on shaders, pipelines, native windows, and
  global-coordinate drawing.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md): the
  band is Core-owned geometry; a plugin surface never claims rows.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md): the
  `fg`/`bg` value vocabulary and the rule that a plugin never themes Core chrome.
- [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md):
  the implemented field set, the budgets, and the status vocabulary this record
  uses.

This record selects no threshold that moves a requirement between owners and
creates no bypass. Every numeric cap is either an existing constant quoted from
the implementation or a new cap for a new field, marked as such.

## Terminology

| Term              | Meaning in this document                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Band walk         | The flatten pass that turns a mounted tree into text plus styled runs, one row per band (`flatten_band_runs_in_width`).                   |
| Composed axis     | The axis the host joins adjacent siblings on: horizontal in a band for every kind, vertical only where an overlay stacks rows.            |
| Bounded container | A container whose presented width the host knows: today only the band root `Row`.                                                         |
| Declared          | A field present on the node table. Absent is not the same as declared-as-default, exactly as the scene candidates already rule for style. |
| Inert             | Declared, accepted, and provably without effect in this position (for example a `gap` on a childless row). Never an error.                |
| Refuse            | Reject the whole mount or update with a typed diagnostic and install nothing. Never a clamp, never a silent drop.                         |
| Clip              | Drop cells that do not fit the container's slot, by the walk's existing rule. A fit failure is not an error.                              |
| State             | A style override the host selects from its own observation, not from plugin-supplied data.                                                |
| Reserved          | Named in the closed set, refused by the parser today, so that adopting it later is additive.                                              |

## What the surface accepts today

The evidence below was read from `bitty` at `d4cb95ba` (`origin/main`). Line
numbers move with the file, so each row names the symbol a reviewer can match.

| Field                               | Type                                           | Accepted where                    | Symbol at `d4cb95ba`                                                                      |
| ----------------------------------- | ---------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `kind`                              | closed string (`Text`/`Row`/`Column`/`List`)   | every node                        | `UiNode::from_value` (`crates/bitty-lua/src/ui.rs:820`), `UI_V1_NODE_KINDS` (`ui.rs:185`) |
| `text`                              | string, bounded by `SCN-3`                     | `Text`                            | `ui.rs:865`                                                                               |
| `children`                          | dense 1-based array                            | `Row`/`Column`/`List`             | `UiNode::children_array` (`ui.rs:933`)                                                    |
| `fg`, `bg`                          | theme token string, ≤ 32 bytes                 | every node                        | `extract_theme_token` (`ui.rs:1034`), `UI_MAX_THEME_TOKEN_BYTES` (`ui.rs:230`)            |
| `bold`                              | boolean                                        | every node                        | `extract_bool_opt` (`ui.rs:1051`)                                                         |
| `anchor`                            | `left`/`center`/`right`                        | band scope, root-`Row` child only | `extract_anchor` (`ui.rs:1098`), `UiAnchor` (`ui.rs:308`), `UiSceneScope` (`ui.rs:352`)   |
| `on_click`, `on_scroll`, `on_hover` | binding table with `command`, `args`, `region` | band scope                        | `extract_click_command` (`ui.rs:1060`), `UI_CLICK_MAX_*` (`ui.rs:212-227`)                |
| `region`                            | `{ id, kind }`, through a binding              | band scope                        | `extract_region` (`ui.rs:1245`), `UI_MAX_REGION_ID_BYTES` (`ui.rs:239`)                   |

Three properties of that reader matter to everything below, and each is a
property of the code rather than of any candidate:

1. **The reader is a fixed key read, not an allowlist scan.** `from_value`
   reads the keys listed above and never enumerates the node table
   (`ui.rs:844-858`), so an unrecognised key is dropped rather than rejected.
   A host that predates an additive field therefore ignores it, and a tree that
   uses one degrades to today's render instead of failing. This record relies on
   that property; it does not extend the leniency to tables it introduces.
2. **Scope is parsed, not inferred.** `UiSceneScope` is threaded into every
   field extractor (`Band` for `top`/`bottom`, `Unanchored` for the overlay),
   which is why `anchor` can be refused outside a band at parse time. A new
   scope-sensitive field has the same hook available.
3. **There is exactly one field-level refusal code.** Every shape, type, cap,
   and placement violation returns `E_UI_COMPONENT_INVALID` with a message that
   names the field (`component_invalid`, `ui.rs:1303`). The only other code on
   this path is `E_UI_BLOCK_BUDGET` for the 2 MiB aggregate
   (`crates/bitty-runtime/src/plugin_runtime/services.rs:1258`).

A `spacing`, `align`, `padding`, or `gap` field does not exist anywhere on the
surface: the strings return zero field references in `ui.rs`, and the single
textual match is a test fixture literal (`ui.rs:1524`).

## The additive vocabulary

Four fields. Each is closed: an unlisted key, value, or state name is refused,
and no field carries a function, table-of-tables, path, image, handle, or
callback.

### `gap` — spacing between adjacent siblings

| Property | Value                                      |
| -------- | ------------------------------------------ |
| Wire key | `gap`                                      |
| Type     | integer, display cells                     |
| Default  | `0` (absent), which is today's render      |
| Cap      | inclusive `0..=32`                         |
| Kinds    | `Row`, `Column`, `List`; refused on `Text` |
| Scope    | band and overlay (the walk is shared)      |

Rules:

1. `gap` separates adjacent siblings whose spans are non-empty. It is inserted
   on the composed axis, between the end of one sibling's span and the start of
   the next, and it advances the walk cursor, so a following sibling starts
   `gap` cells later.
2. `gap` on `Text` is refused, not ignored: a leaf has no siblings to separate,
   and the parser refuses position-invalid fields elsewhere rather than dropping
   them (the `anchor` precedent, `extract_anchor`).
3. A declared `0` and an absent `gap` render identically. The distinction is kept
   because a declared value is a plugin decision that a later revision can
   attribute, while absence is the absence of a decision; the scene-layer
   candidates keep the same distinction for the same reason.
4. `gap` never wraps, never scrolls, and never truncates a node to make room. If
   the sibling group plus its gaps does not fit the slot, the existing walk
   clips at the slot boundary under the existing degradation order (declaration
   order, `left` before `right` before `center`). A fit failure is a clip, not a
   refusal.
5. `gap` is spacing _between_ siblings. It is not inset padding: no v1 node has
   an interior rectangle to inset, so `padding` stays a scene-layer field owned
   by the [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md).
   This record deliberately does not introduce a second spelling of padding.
6. The total added spacing is bounded by construction: at most
   `(children - 1) * 32` cells per container, and the painted result is clipped
   at the slot width, so paint work per band row stays bounded by the row, not
   by the declaration.
7. `gap` is an integer field: it retains no string, so it adds nothing to the
   retained-string aggregate (`SCN-4` shape).
8. In a band, `Column` and `List` compose horizontally (`flatten_band_runs`,
   `crates/bitty-runtime/src/runtime/band_host.rs:308`), so a `gap` on them is
   horizontal there. The same field is vertical only where an overlay stacks
   `Column`/`List` children as rows (`overlay_scene_rows`,
   `crates/bitty-runtime/src/runtime/present.rs:7057`). This asymmetry is a
   property of the two paint paths, and it is recorded rather than smoothed
   over: a plugin must not read `gap` on a `Column` as a vertical rhythm inside
   a band.

### `align` — distribution inside a bounded container

| Property | Value                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------ |
| Wire key | `align`                                                                                          |
| Type     | closed string: `start`, `center`, `end`, `space-between`                                         |
| Default  | `start` (absent), which is today's render                                                        |
| Kinds    | `Row` only, and only as the **band root**; refused on `Text`/`Column`/`List` and on nested `Row` |
| Scope    | band only                                                                                        |

Rules:

1. `align` distributes the container's children inside the container's bounded
   width. Only the band root `Row` has such a width today
   (`flatten_band_runs_in_width`), which is the same bound that makes `anchor`
   resolvable, so `align` is refused everywhere else — the `anchor` policy, not
   a new one.
2. `start` is today's left-to-right flow. `center` centres the whole child
   group; `end` right-aligns it; `space-between` distributes the leftover width
   across the inter-child gaps (integer division, remainder to the leftmost
   gaps), so the first child stays flush left and the last flush right.
3. `align` and a child `anchor` in the same root `Row` are mutually exclusive
   and the combination is refused. One row is placed by one mechanism: `anchor`
   places named groups against the row edges, `align` places an unnamed group.
   Refusing the mix keeps the result independent of resolution order, which a
   silent precedence rule would not.
4. Leftover width is never negative at paint time: an over-subscribed group
   clips at the slot boundary by the existing walk, so `align` cannot push a
   sibling past the band edge or into another band.
5. `align` carries no offset, no weight, no percentage, and no coordinate. It
   selects one of four distributions of the nodes the tree already declared,
   and it cannot place a node that is not in the tree.
6. Overlay containers are refused, with a reason: an overlay paints each
   `Column`/`List` child as a content-sized pill whose horizontal origin is the
   card's inset (`paint_overlay_surface`, `present.rs:6562`), so there is no
   bounded row to align against. Overlay alignment is an open point below, not a
   silent no-op.

### `size` — size constraint in display cells

| Property | Value                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Wire key | `size`                                                                          |
| Type     | table, closed to `min_width` and `max_width`, each an integer in display cells  |
| Default  | absent: natural extent                                                          |
| Cap      | each field inclusive `0..=32`; when both are declared, `min_width <= max_width` |
| Kinds    | all four (`Text`, `Row`, `Column`, `List`)                                      |
| Scope    | band and overlay                                                                |

Rules:

1. `size` constrains the node's **own** span. It is not a flex weight, not a
   percentage, and not a request for layout: the host does not redistribute
   children to satisfy a parent's `size`.
2. `max_width` narrows the clip the walk already applies to that node, so an
   over-long node loses whole characters at its own boundary instead of at the
   slot boundary. Clipped characters are not emitted, which is what keeps a
   clipped item from claiming a hit region (the existing width-walk rule).
3. `min_width` appends trailing blank fill cells after the node's content until
   the span reaches `min_width`. The fill belongs to the declaring node's span
   and its region, and it advances the cursor, so a following sibling starts
   after the fill. A fixed-width chip is therefore a `Text` with
   `min_width = 8`; a right-aligned fixed-width chip is that `Text` as a direct
   child of the band root `Row` declaring `anchor = "right"`, using the field
   that already exists rather than a new fill-side knob.
4. Fill cells are host-generated. They are not plugin text, so they are not
   charged to `SCN-3`; they are bounded at 32 per node and by the slot width at
   paint, and they add no retained string.
5. `size` on a container constrains the container's composed span, which is the
   sum of its children plus gaps. It does not resize the children.
6. A `min_width` above `max_width`, a non-integer, a negative, a fractional, a
   boolean, an unknown key inside `size`, or a value above the cap refuses the
   mount with `E_UI_COMPONENT_INVALID`. There is no clamp.
7. `size` is the only field in this contract that a leaf and a container both
   accept, because it constrains extent rather than composition.

### `states` — closed interaction states

| Property | Value                                                                                        |
| -------- | -------------------------------------------------------------------------------------------- |
| Wire key | `states`                                                                                     |
| Type     | table, closed to `hover`, `active`, `focus`; each value a table closed to `fg`, `bg`, `bold` |
| Default  | absent: the base style is the only style                                                     |
| Adopted  | `hover`                                                                                      |
| Reserved | `active`, `focus` — accepted as names, refused by the parser today                           |
| Kinds    | every v1 kind                                                                                |
| Scope    | band only                                                                                    |

Rules:

1. The state set is closed at three names. A fourth name, a nested `states`
   inside a state, a function, or any key other than `fg`/`bg`/`bold` refuses
   the mount. A state payload is a new closed table introduced by this record,
   so it is strict from the start; the node table's pre-existing "unknown key is
   dropped" property is deliberately not extended to it.
2. State values are the same value shapes as the base fields: `fg`/`bg` are
   theme token strings resolved by the same band resolver (`resolve_band_token`,
   `band_host.rs:813`) with the same unknown-token fallback and diagnostic
   count, and `bold` is a boolean. No new token namespace, no colour literal, no
   state-only token, and no second resolver.
3. `hover` is adopted because the host already observes enter/leave. It requires
   `on_hover`, which already requires `region`: the host's only hover
   observation is a region carrying a routable command (`band_hover_probe`,
   `update_band_hover`, `band_host.rs`). `states.hover` without `on_hover` is
   refused rather than retained as data that can never activate.
4. `active` is reserved because no press state is tracked anywhere: a band click
   resolves a region and dispatches a command, and nothing retains "button is
   down over this item" between events. `focus` is reserved because chrome is
   never a focus target by accepted rule (a band press consumes the row and the
   pointer never reaches the grid). Both names are refused today, so adopting
   either later is additive.
5. Static variants are not states. A "disabled" or "selected" appearance is the
   node's base `fg`/`bg`/`bold`, which the plugin already sets. This record adds
   no `disabled` flag and no `selected` flag, because a flag that the host never
   toggles is data that looks authoritative and is not.
6. A state changes paint only. Because the allowed keys cannot change a span,
   hit geometry is invariant by construction: a hovered node's runs, cell
   columns, and region are identical to its unhovered runs. No measurement runs
   again on a state change, no Lua is entered, and no command is dispatched by
   the state itself.
7. At most one hovered region is live at a time (`band_hover`), so at most one
   node's state style is applied in a frame. The work is O(1) in the number of
   styled nodes. A leave transition restores the base style in the same event.
8. State token strings are retained strings. The implementing slice must charge
   them through `retained_style_bytes` (`ui.rs:986`), which today enumerates
   `fg`, `bg`, and the three bindings; a state token that is not charged would
   put a hole in the 2 MiB aggregate without changing any constant.
9. A state payload may not carry `gap`, `size`, `align`, `border`, `radius`, or
   a binding. A state is a colour/emphasis override, not a second node.

## Refusal behaviour

One table, one code. Field-level refusals return `E_UI_COMPONENT_INVALID` with a
message naming the field, matching the existing messages
(`"anchor must be 'left', 'center', or 'right'"`, `"{key} must be a boolean"`).

| Input                                                                        | Result                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| `gap` `0..=32` on `Row`/`Column`/`List`                                      | Accepted.                                     |
| `gap` `33` or greater, negative, fractional, boolean, table                  | Refused, field named.                         |
| `gap` on `Text`                                                              | Refused: position-invalid field, not ignored. |
| `gap` on a container with fewer than two non-empty children                  | Accepted, inert: nothing to separate.         |
| `align` in the accepted closed set on the band root `Row`                    | Accepted.                                     |
| `align` on `Text`/`Column`/`List`, on a nested `Row`, or on any overlay node | Refused: no bounded container.                |
| `align` together with a child `anchor` in the same root `Row`                | Refused: two placement mechanisms on one row. |
| `align` outside the closed set (including `"justify"`, `"middle"`, `"left"`) | Refused, closed set named.                    |
| `size` with `min_width <= max_width`, both `0..=32`                          | Accepted.                                     |
| `size` with `min_width > max_width`                                          | Refused, both values named.                   |
| `size` with a non-integer, a value above 32, or an unknown key               | Refused, field named.                         |
| `states` naming `hover` with `on_hover` present, band scope                  | Accepted; adopted.                            |
| `states` naming `active` or `focus`                                          | Refused: reserved, not adopted.               |
| `states` naming any other key                                                | Refused: closed set.                          |
| `states` in `Unanchored` scope (overlay)                                     | Refused: no hover routing on that surface.    |
| `states.hover` without `on_hover`                                            | Refused: the state could never activate.      |
| A state payload key other than `fg`/`bg`/`bold`, or a nested `states`        | Refused.                                      |
| A fit failure inside the slot (spacing, fill, or clipping)                   | Clipped by the existing walk. Not an error.   |
| Aggregate retained strings above 2 MiB on `update`                           | `E_UI_BLOCK_BUDGET`, unchanged.               |

Rules:

1. No clamp, no partial acceptance, no last-write-wins, no "best effort"
   default. A refused tree installs nothing.
2. Refusal happens in the parser, before any host effect: the `bitty.ui.update`
   binding parses the tree in `bitty-lua` before calling
   `services.rs:6720`, and `UiBlocks::update` (`services.rs:1258`) only runs on a
   tree that already parsed, so a refused update leaves the previously mounted
   tree in place rather than replacing it with a partial one.
3. "Does not fit" and "is not allowed" are different outcomes. A value above a
   cap is not allowed. A node group that exceeds the slot after a legal
   declaration is clipped by the rule the walk already implements, with no
   diagnostic, because the band is one row and clipping is its normal
   degradation.
4. This record introduces no new error code and no sub-code. The scene-layer
   candidates model per-field typed errors (`PaddingOverCap { found, cap }`);
   the v1 bridge has one code and a message, and a richer diagnostic taxonomy is
   a separate refinement (open point).

## First adopters

The vocabulary lands per kind, not as one switch. The order is by evidence
available, not by preference.

| Kind     | `gap`   | `align`                | `size` | `states` |
| -------- | ------- | ---------------------- | ------ | -------- |
| `Row`    | First   | First (band root only) | First  | First    |
| `Text`   | Refused | Refused                | Second | First    |
| `Column` | Third   | Refused                | Third  | First    |
| `List`   | Third   | Refused                | Third  | First    |

`states` is the one field that is not sequenced per kind: it observes the
pointer rather than composing a container, so it lands for all four kinds in the
same slice as the batch that introduces it. The ordering below is the layout
fields.

1. **`Row` first.** It is the only kind that can be a band root, so it is the
   only container with a bounded width to distribute in. `gap` and `align` are
   meaningful on day one, and a bar capsule row is a `Row`.
2. **`Text` second, on `size`.** The fixed-width chip is leaf-shaped and needs no
   container machinery, while `states` arrives with the first batch for every
   kind.
3. **`Column` and `List` third, on `gap` and `size`.** Their `gap` is only a
   vertical rhythm where an overlay stacks them as rows, so they ride the
   overlay paint path that already exists rather than inventing a vertical band
   layout. `align` stays refused for both: no bounded vertical container exists.
4. A kind that does not appear in a column above refuses that field. Nothing is
   accepted "for symmetry".

## Non-goals

This record explicitly does not add, and a successor may not read it as
authorizing:

- **No per-frame draw loop, render handle, retained callback, or Lua execution on
  a paint frame.** Every field is declarative data consumed by the existing walk.
- **No absolute coordinates.** No `x`, `y`, `offset`, `row`/`col`, `top`/`left`,
  window origin, or cell position. Placement stays derived from the slot,
  declaration order, `anchor`, and `align`.
- **No physical pixels.** `gap`, `size`, and every unit here are display cells.
  Physical-pixel `radius` and `border` belong to the scene layer and stay there.
- **No theme-token override of Core chrome or borders.** No `border`,
  `border_token`, `radius`, or `padding` on a v1 node, and no `chrome.*`,
  `border.*`, or `surface` token claim. A plugin never themes chrome; the scene
  candidates already refuse Core chrome tokens.
- **No new node kind, slot, capability, or error code.** `Block`, `Image`,
  `CodeBlock`, `Table`, and `Rule` stay excluded from v1
  (`UI_V1_EXCLUDED_NODE_KINDS`, `ui.rs:188`).
- **No change to any accepted bound.** `UI_MAX_NODES` (2048), `UI_MAX_DEPTH`
  (16), `UI_MAX_TEXT_BYTES` (256 KiB), `UI_MAX_BLOCKS` (64),
  `UI_MAX_AGGREGATED_TEXT_BYTES` (2 MiB), `BAND_MAX_REGIONS` (64), and
  `UI_MAX_THEME_TOKEN_BYTES` (32) are quoted, not re-decided. The depth 16
  bridge budget stays deliberately stricter than the accepted `SCN-2 = 32`.
- **No flex, weight, grow, shrink, percentage, or intrinsic sizing.** `size` is
  two inclusive cell bounds.
- **No motion.** No transition, animation, easing, or duration on a state
  change; a state change is instantaneous paint.
- **No new input authority.** States add no hit-testing, no pointer capture, no
  drag target, and no focus target. `on_click`/`on_scroll`/`on_hover` remain the
  only bindings and remain command dispatches.
- **No accessibility claim.** No role, name, or state is announced; the
  accessibility consequence of a state is "the painted text is unchanged", which
  is the only thing the code can support today.
- **No selection, scroll, or clipboard semantics on `List`.** A `List` stays a
  vertical composition; `gap` is its only new control.

## Resolution, compatibility, and lifecycle

**Resolution has two layers, not four.** A v1 node resolves each field from the
framework default and then from the node's own declaration; `bitty --safe`
forces every field in this record to its default, so a `--safe` render equals
today's render for every tree. The four-layer ladder in the
[Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md)
(framework, theme content style, node, `--safe`) applies to scene-layer content
style, where a theme content style exists; a band has no content style, so this
record does not borrow that ladder and does not create a theme layer for chrome.
That is why there is no "theme spacing" and no `gap` token.

**Compatibility is additive and one-directional.**

1. Absent field: byte-identical to today. No field in this record changes the
   render of a tree that does not use it.
2. Present field on an older host: dropped by the fixed key read (property 1
   above), so the tree renders unstyled instead of failing. This is forward
   compatibility by degradation, and it is the only behaviour the current reader
   can offer.
3. A plugin cannot detect support: there is no version query and this record adds
   none. A plugin that depends on `gap` renders without spacing on an older host
   and cannot tell. That is an open point, not a solved property.
4. `mount` and `update` read the same fields through the same reader, so a tree
   that mounts also updates. There is no per-call variant.
5. Revocation, safe mode, and teardown are unchanged: a revoked generation's
   blocks drop through the existing path, and `--safe` resolves to defaults
   without a second policy branch.

**Lifecycle.** Nothing here is retained across a generation. A refused tree
installs nothing and leaves the previous one mounted; an accepted tree replaces
the previous one wholesale, as today. Nothing stateful survives a replacement: a
hover in flight is re-resolved against the new tree on the next pointer motion,
and the teardown leave is queued by `clear_band_hover` when focus or capture
state changes, so a replaced tree cannot keep a node styled from the old one.

## Resource limits

| Quantity                                  | Bound                                                  | Changed by this record                             |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Nodes per mounted component (`SCN-1`)     | 2048                                                   | No                                                 |
| Tree depth from Lua                       | 16                                                     | No                                                 |
| Text bytes per component (`SCN-3`)        | 256 KiB                                                | No (fill cells are host-generated and not charged) |
| Blocks per plugin generation (`SCN-5`)    | 64                                                     | No                                                 |
| Retained strings per generation (`SCN-4`) | 2 MiB                                                  | No number change; state tokens must be charged     |
| Regions per band                          | 64                                                     | No                                                 |
| Theme token bytes                         | 32                                                     | No                                                 |
| New per-field value size                  | one integer (≤ 8 bytes) or a ≤ 32-byte token           | New, bounded by construction                       |
| Added spacing per container               | `(children - 1) * 32` cells, clipped at the slot width | New, bounded by construction                       |
| Added fill per node                       | 32 cells, clipped at the slot width                    | New, bounded by construction                       |
| Layout work per frame                     | **not measured** by the host                           | No — see below                                     |

The [reconciliation's](lua-ui-composition-reconciliation.md) residual gap 3
stands: layout work per frame, style-resolution work, and update cadence have no
counter in the host, and this record does not add one. What it can say honestly
is that the four fields add O(1) arithmetic per node to the walk that already
runs, no second pass, no second traversal, no per-frame Lua entry, and no
per-node allocation. That is a shape argument, not a measurement, and it must not
be quoted as a budget.

## Verification plan

No row has an implementation. Each row is the check the implementing slice owes;
none is evidence that anything works.

| Check                                  | Expected result                                                                                   | Evidence |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | -------- |
| Unstyled tree identity                 | A tree using none of the four fields paints byte-identically to `d4cb95ba`.                       | Pending  |
| `gap` spacing and cursor advance       | Adjacent siblings are `gap` cells apart and the following sibling shifts by it.                   | Pending  |
| `gap` clipping under over-subscription | The group clips at the slot; no sibling exceeds the row width; runs never overlap.                | Pending  |
| `align` four values                    | `start` equals today; `center`/`end` shift the group; `space-between` pins edges.                 | Pending  |
| `align` + `anchor` refusal             | The mixed row refuses with `E_UI_COMPONENT_INVALID` naming the conflict.                          | Pending  |
| `size.max_width` clip                  | Clipped characters are absent and claim no hit region.                                            | Pending  |
| `size.min_width` fill                  | The span reaches the minimum, the fill carries the node's region, the cursor advances.            | Pending  |
| `size` bound pair                      | `min_width > max_width` refuses; the inclusive caps pass at 32 and fail at 33.                    | Pending  |
| `states.hover` paint                   | The hovered node's runs change `fg`/`bg`/`bold`; columns and region are identical.                | Pending  |
| `states` refusal set                   | `active`, `focus`, fourth names, nested states, overlay scope, and missing `on_hover` all refuse. | Pending  |
| State geometry invariance              | Painted text lines and cell columns are unchanged by a state change.                              | Pending  |
| Retained-string accounting             | State tokens raise the aggregate; the 2 MiB refusal still triggers at the boundary.               | Pending  |
| `--safe` flattening                    | Every field resolves to its default and the render matches the pre-contract tree.                 | Pending  |
| Unknown-key forward compatibility      | A tree with an unread key mounts and renders unstyled rather than failing.                        | Pending  |

## Security review

| Concern                      | Control                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Arbitrary styling surface    | Four closed fields; closed enums and closed state names; unknown keys inside new tables refused.            |
| Untrusted colour input       | State colours are the existing token strings, resolved by the existing resolver; no literals.               |
| Unbounded input              | Every numeric field has an inclusive cap and a typed refusal; no clamp; no unbounded string.                |
| Layout or geometry authority | Cell-space values inside Core's slot; no coordinates, no px, no weight, no row reservation.                 |
| Hot-path execution           | Declarative data only; the walk is host code; a state change enters no plugin VM and runs no Lua.           |
| Dead authority               | A state the host cannot observe (`active`, `focus`, hover without `on_hover`) is refused.                   |
| Silent degradation           | Over-cap and out-of-set refuse; only a legal fit failure clips, and clipping is the band's normal rule.     |
| Resource exhaustion          | O(1) per node, no new collection, no new traversal; existing aggregates unchanged and state tokens charged. |
| Accessibility regression     | Paint-only; text, order, and cell columns are unchanged; no role claim is made or removed.                  |
| Capability escalation        | No new capability; states and layout grant nothing that `ui.rich` did not already grant.                    |

This record adds no capability identifier and no fourth security domain. A
dedicated capability for style remains OQ-044 territory, cited not decided here.

## Affected contracts

- [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md) —
  its three "candidate" field rows and its residual gap 1 are what this record
  answers; its budgets and slot table are unchanged and are cited, not restated.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — unchanged; a successor acceptance would add an optional field set, not a new
  surface.
- [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md) —
  owns `padding`/`radius`/`border` and the four-layer ladder; this record reuses
  its cell range and its fail-closed overflow discipline, and keeps padding off
  the v1 surface.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) — owns
  namespaces and contrast; this record adds no token name and no namespace.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) — owns
  band geometry, thickness, and degradation; a band is still one row.
- [Rich Presentation RFC](rich-presentation-rfc.md) — `SCN-1..SCN-5` unchanged.
- [Extension Component Catalog (Candidate)](extension-component-catalog-candidate.md)
  — its reserved style hooks are what this vocabulary would fill; see below.

## Consequences for downstream work

Once this vocabulary is accepted — not before — three open items become
mechanical rather than open design:

1. **[bitty#2114](https://github.com/bitty-terminal/bitty/issues/2114), the
   extension component catalog.** Every catalog entry currently states "Style
   hooks: none" and reserves token-only hooks for padding, radius, border, and a
   border token. With this vocabulary, the _layout_ half of each hook becomes a
   mapping rather than a decision, because each entry already emits the shape the
   field would replace: `band` and `status-strip` pad their region groups with
   `Text(" ")` separators, which become `gap`, and a group that must sit flush to
   an edge uses the existing `anchor`; `pill-row`'s single-space separators
   become `gap` and its pills can take a fixed extent with `size.min_width`. The
   _decoration_ half stays blocked: no padding, radius, or border arrives on the
   v1 surface here, so the catalog keeps two hook families instead of one and its
   acceptance criteria split accordingly. It is still a separate follow-up; this
   record does not absorb it.
2. **[bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388), plugin
   GUI presentation modes.** Mode selection is placement; with spacing, bounded
   extents, and hover feedback available in the tree itself, one composed tree
   can target a band, an overlay stack, and a panel scene without a per-mode
   layout branch in the plugin. What stays open there — lifecycle, PTY
   replacement, restore-on-exit, per-mode caps, and input ownership — is
   untouched by this record, which decides no placement.
3. **[bitty#2478](https://github.com/bitty-terminal/bitty/issues/2478), compound
   primitives.** Its item 2 lists "cannot express file trees, diffs, charts,
   rich text, or self-drawn controls" as one gap. This record removes "and no
   spacing, no fixed extents, no hover feedback" from that list, which narrows
   the remaining decision to data-shaped content and the drawing tier of
   [bitty#2477](https://github.com/bitty-terminal/bitty/issues/2477) — a
   compound primitive over spaced rows is now expressible; a diff or a chart is
   not, and this record does not claim otherwise.

None of the three is closed by this record. Each is unblocked for the part it
was waiting on, and still needs its own acceptance and evidence.

## Open points

1. **Acceptance owner and vehicle.** The [UI Runtime Candidate](ui-runtime-candidate.md)
   or a successor appearance contract must accept the field set, units, caps,
   and refusal set. This record does not.
2. **`active` and `focus`.** Adopting `active` needs press-state tracking in the
   band host (a down/up identity per region), which does not exist. `focus`
   contradicts the accepted rule that chrome is never a focus target. Both are
   refused today so that adopting either stays additive.
3. **Hover without a command.** A styling-only hover needs a region without a
   hover binding, which the host cannot observe today. Whether to add a no-op
   `on_hover` form, a `hoverable` flag, or to leave the authoring cost (declare a
   command you do not need) is undecided.
4. **Overlay alignment and vertical rhythm.** Overlay rows are content-sized
   pills whose origin the card owns; aligning or spacing them needs overlay row
   geometry, which belongs to the overlay surface contract, not here.
5. **Cap choice.** 32 cells is borrowed from the accepted `0..32` decoration
   range so that no new ceiling is invented. Whether `size` should instead carry
   a larger per-node cap, or a slot-relative cap, is a review question — the
   number here is a candidate, not a derivation.
6. **Diagnostic taxonomy.** One code plus a message is the current reality. A
   per-field typed error, or a sub-code for "reserved state", needs an
   error-surface decision that is wider than this record.
7. **Version discovery.** A plugin cannot detect whether `gap` is honoured. A
   capability or version query is undecided and is the same gap the catalog
   records for its own hooks.
8. **Theme layer for chrome.** Whether a user theme may set band spacing or
   state colours is not decided; this record has no theme layer, which is the
   conservative reading, not an accepted one.
9. **Layout-work instrumentation.** The shape argument in the resource-limits
   section is not a measurement. A counter for per-frame layout work is the
   reconciliation's residual gap 3 and stays open.
10. **`List` semantics.** `gap` is the only new `List` control. Whether `List`
    ever gains item identity, selection, or a separator is a separate question
    about the node, not about this vocabulary.

## Acceptance criteria

This candidate can be accepted only when:

- the four fields, their caps, and their refusal set are reviewed by the UI and
  architecture owner and by a security reviewer;
- the two-layer resolution (default, node, `--safe`) is accepted without
  weakening the accepted bounds or contradicting the scene-layer ladder;
- the first-adopter matrix is accepted, including the refused combinations, so
  that no field is later adopted "for symmetry";
- every verification-plan row has executable evidence in `bitty`;
- the reserved states are either adopted with their tracking slice or explicitly
  deferred with an owner;
- the retained-string accounting for state tokens is demonstrated, not assumed.

## P0 Review Sign-off

| Reviewer role          | Verdict | Evidence |
| ---------------------- | ------- | -------- |
| UI/architecture owner  | Pending | —        |
| Security reviewer      | Pending | —        |
| Docs curator           | Pending | —        |
| Plugin ecosystem owner | Pending | —        |

## References

- [Lua UI Composition Reconciliation](lua-ui-composition-reconciliation.md)
- [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md)
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md)
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md)
- [Rich Presentation RFC](rich-presentation-rfc.md)
- [UI Runtime Candidate](ui-runtime-candidate.md)
- [Extension Component Catalog (Candidate)](extension-component-catalog-candidate.md)
- [UI Motion and Budget (Candidate)](ui-motion-and-budget-candidate.md)
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
- [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191) — the
  bounded Lua UI composition issue this record supplies vocabulary for; it stays
  open.
- [bitty#2114](https://github.com/bitty-terminal/bitty/issues/2114) — extension
  component catalog.
- [bitty#2388](https://github.com/bitty-terminal/bitty/issues/2388) — plugin GUI
  presentation modes.
- [bitty#2478](https://github.com/bitty-terminal/bitty/issues/2478) — UI
  architecture umbrella and compound primitives.
