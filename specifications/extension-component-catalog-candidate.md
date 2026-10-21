---
title: Extension Component Catalog (Candidate)
description: Candidate catalog of five reusable extension building blocks over the accepted v1 node set with typed descriptors caps deterministic order and no new authority
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 75
---

# Extension Component Catalog (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record defines a candidate catalog of
> reusable extension building blocks and records a headless implementation
> slice. It changes no accepted text: the
> [Rich Presentation RFC](rich-presentation-rfc.md) still owns `SceneNode` and
> SCN-1..SCN-5, the
> [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
> still owns the accepted `Text`/`Row`/`Column`/`List` surface and its
> exclusions, and the [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md)
> and [Status System Specification](status-system.md) still own edge-band
> regions and status slots. Entry names, shapes, caps, and ordering below are
> candidate spellings that a successor acceptance adopts or rejects. The
> implementation is **`Implemented`-only**, headless, has no consumer, and
> carries no compatibility promise.
>
> This record is the separate follow-up that
> [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191) keeps out of
> the bounded Lua composition API. It authorizes no Lua surface, no new node
> kind, no capability, and no release scope. The bar dogfood remains deferred
> to the `bitty-plugins` repository.

## Purpose and scope

Downstream extensions currently hand-roll the same presentation patterns: a bar
composes one `Row` with bracket-wrapped workspace pills; a status line orders
modules into `left`/`center`/`right`; a tooltip-less click falls back to a
detail line; an overlay modal paints a titled row stack. Each plugin invents the
shape, its caps, and its failure behavior, so the same content renders
differently and over-cap input fails inconsistently.

This record answers one question: **which reusable extension building blocks
may a typed, host-side catalog compose from the accepted v1 node set, with what
documented bounds and failure behavior, without creating a new input, style,
rendering, or code surface?**

In scope (all **Candidate**):

- a closed five-entry catalog: `band`, `pill-row`,
  `tooltip-detail-fallback`, `modal-sheet`, `status-strip`;
- each entry's typed descriptor fields and canonical Scene shape;
- documented caps, inclusive boundaries, and typed fail-closed overflow;
- deterministic composition order and canonical round-trip recognition;
- reserved style hooks (not implemented) and accessibility notes;
- a headless implementation slice and its verification evidence;
- the explicit remainder: bar migration, Lua exposure, and headed proof.

Out of scope and owned elsewhere:

- the accepted `SceneNode` schema, SCN-1..SCN-5, and the rule that presentation
  never becomes Terminal Truth (accepted,
  [Rich Presentation RFC](rich-presentation-rfc.md));
- the accepted v1 extension node set and slot set (accepted,
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md);
  `Image`, `CodeBlock`, `Table`, `Rule`, and bordered `Block` stay excluded);
- edge-band geometry, region hit-testing, and reserved thickness (candidate,
  [Chrome Band Contract](chrome-band-contract-candidate.md)); the band host
  remains the only owner of placement in `bitty`;
- status modules, slots, sampling cadence, and privileged metrics (draft,
  [Status System Specification](status-system.md));
- overlay placement, focus, modality, and input capture (accepted identity and
  focus routing, [Panel Runtime RFC](panel-runtime-rfc.md); presentation
  surface, [Chrome Surface Contract](chrome-surface-contract-candidate.md));
- the candidate Scene Style Primitives set and its precedence (draft,
  [Scene Style Primitives](scene-style-primitives-candidate.md));
- the bounded Lua composition API and host parity (open,
  [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191));
- the plugin-side Lua component ecosystem (candidate,
  [Lua UI Component Model](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/lua-ui-component-model-candidate.md)).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture and invariants 3 (presentation, never Terminal
  Truth), 4 (no hot-path execution), 7 (bounded inputs), and 10
  (`bitty --safe`).
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-01 resource exhaustion and T-06/T-07 plugin authority and hot paths.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism
  versus policy and the primitive-or-composable test; a plugin alters
  presentation only.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): `SceneNode`,
  SCN-1..SCN-5, and the prohibition on shaders, pipelines, native windows, and
  global-coordinate drawing.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the closed slot set, the v1 node subset, and the typed
  `E_UI_COMPONENT_INVALID` rejection for an invalid component.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md):
  `left`/`center`/`right` regions, declaration-order rendering, and the
  `64`-region contribution bound.
- [Status System Specification](status-system.md) (draft): slot ordering,
  bounded segment output, and the rule that modules never run on the input or
  render path.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md):
  the band/overlay surface split and its existing text bounds.
- [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md):
  the candidate style vocabulary whose acceptance is a prerequisite for any
  style hook here.
- [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191): the
  catalog stays a separate follow-up; the bounded composition API does not
  absorb it.

This record selects no threshold that moves a requirement between owners and
creates no bypass. Every cap reuses an accepted or already-drafted bound and
does not widen it.

## Terminology

| Term            | Meaning in this document                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Catalog entry   | One closed, named building block (`band`, `pill-row`, ...) with its own contract.                            |
| Descriptor      | Typed Rust data for one entry: segment, pill, detail, or sheet content.                                      |
| Composition     | The pure function that turns a descriptor into a bounded `Text`/`Row`/`Column` tree.                         |
| Canonical shape | The one tree shape `compose` emits for an entry; recognition is strict and rejects every divergence.         |
| Region / slot   | The ordered `left`, `center`, and `right` groups of a band or status strip.                                  |
| Pill            | A bracketed text label in a `pill-row`; its active state is redundant bold emphasis, not a second node kind. |
| Cap             | The inclusive maximum a field accepts; overflow is a typed rejection, never a clamp or silent omission.      |
| Mutation        | A presented tree that diverges from its declared descriptor (dropped item, changed text, added style).       |
| Style hook      | A reserved place for the candidate style primitives; **none** is implemented or accepted here.               |

## Catalog model

The catalog is a **closed set of five entries** over the accepted v1 extension
primitives. It is not an element taxonomy and adds no node kind:

```rust
// Candidate shape; implemented headlessly in bitty CTX-1416.
enum CatalogBlock {
    Band(StripDescriptor),                    // Text/Row only
    PillRow(PillRowDescriptor),               // Text/Row only
    TooltipDetailFallback(DetailFallbackDescriptor), // Text only
    ModalSheet(ModalSheetDescriptor),         // Text/Row/Column only
    StatusStrip(StripDescriptor),             // Text/Row only
}
```

Rules:

1. **Accepted primitives only.** Every emitted node is `Text`, `Row`, or
   `Column`; `List` remains accepted but no entry needs it. `Block`, `Image`,
   `CodeBlock`, `Table`, `Rule`, and unknown kinds never appear, matching the
   accepted v1 exclusions.
2. **Descriptors are data.** A descriptor is host-side Rust data. No Lua
   value, function, closure, table, renderer handle, shader, path, image,
   capability, or command crosses it.
3. **Composition is pure and cold.** Composition runs once when a host builds
   or validates a contribution, never per frame, keystroke, PTY read, VT parse,
   or damage computation. No plugin VM is constructed or called.
4. **The entry id is declared, never inferred.** A composed tree carries no
   entry tag. Recognition takes the caller's expected entry; `band` and
   `status-strip` share a shape and are interchangeable only when their
   descriptors are identical (both are presentation data with no authority).
5. **No style surface.** Descriptors carry no padding, radius, border, colour
   token, background, opacity, or motion field. Bold is the only attribute
   emitted, as redundant emphasis. Style hooks are reserved below.
6. **No authority.** No `on_click`, `on_scroll`, `region`, command, argument,
   coordinate, focus request, modality flag, or capability appears.
7. **Round-trip is canonical recognition, not a wire format.** `from_scene`
   re-parses exactly the emitted shape and rejects decoration or omission. There
   is no new serialization grammar and no plugin-facing parser.
8. **A declaration is all-or-nothing.** An empty, unknown, over-cap, or
   mismatched declaration fails closed. A host may never ignore a declared
   block and present a partial surface.

## Entry contracts

### `band`

**Declaration.** `StripDescriptor { left, center, right }`, each an ordered
list of `Segment { text, emphasis }`.

**Scene shape.** A `Row` of three to five children: the `left` group, an
optional structural space, the `center` group, an optional structural space,
and the `right` group. Each group is itself a `Row` of alternating `Text`
segments and single-space separators; an empty group is an empty `Row`, so all
three regions keep their identity. A region separator is emitted only between
two non-empty regions, so an empty leading or trailing region adds no edge
blank.

```text
Row[
  Row[Text("ws:1"), Text(" "), Text("ws:2")],
  Text(" "),
  Row[Text("cpu")],
  Text(" "),
  Row[Text("clock")]
]
```

**Order.** `left`, then `center`, then `right`; segments keep declaration order.
Duplicates are preserved; nothing sorts, deduplicates, or evicts.

**Caps.** At most `64` segments across all three regions; each segment is
`1..=64` bytes. Empty groups are allowed; an all-empty descriptor is rejected.

**Style hooks.** None. No `fg`/`bg` token is emitted; emphasis is
`bold = true` only. Theme resolution remains host/plugin policy outside the
catalog.

**Accessibility.** Groups add no role and no focus stop. Reading order is the
composed order. Emphasis must not be the sole carrier of any state; the segment
text must remain meaningful without bold.

**Headed example (illustrative, not run evidence).**

```text
[ws:1] [ws:2]        cpu 42%        clock 12:04
```

The equivalent hand-rolled tree a bar plugin writes today is the same
`Text`/`Row` shape; the catalog only fixes the region order and bounds.

### `pill-row`

**Declaration.** `PillRowDescriptor { pills: [Pill { label, active }] }`.

**Scene shape.** A `Row` of alternating `Text` pills and single-space
separators. A pill renders as `[label]`; `active` renders as `bold = true`.

```text
Row[Text("[ws:1]"), Text(" "), Text("[ws:2]")]   // ws:2 active -> bold
```

**Order.** Declaration order, left to right; duplicate labels are preserved.

**Caps.** At most `64` pills; each label is `1..=32` bytes and must not contain
`[` or `]` (the rendered delimiters are reserved). An empty pill row is
rejected.

**Style hooks.** None. Active state is redundant bold; a plugin that needs a
theme token or a click binding composes its own accepted tree instead of this
entry.

**Accessibility.** A pill is text, not a button. The catalog adds no role, no
focus, and no activation. The label must identify the item without relying on
bold; plugins that need interaction use their own `on_click` binding under the
accepted command path, which this entry never emits.

**Headed example (illustrative, not run evidence).**

```text
[ws:1] [ws:2] [ws:3]
```

### `tooltip-detail-fallback`

**Declaration.** `DetailFallbackDescriptor { text }`.

**Scene shape.** One plain `Text` node, no style, no binding.

**Order.** A single line; there is no ordering question.

**Caps.** `1..=128` bytes; an empty detail is rejected.

**Style hooks.** None.

**Accessibility.** This is plain content, not a tooltip. It creates no hover
surface, no popup, no live region, and no announcement. A host that wants to
announce it uses its own accepted notification/announcement path and
capability; the catalog neither calls nor implies one.

**Headed example (illustrative, not run evidence).** The bar's current
tooltip-without-command fallback shows the module detail as notification text;
the catalog only standardizes the detail line content, not the notification
vehicle. A plugin that cannot use a notification may mount this text in its own
band or overlay subtree.

### `modal-sheet`

**Declaration.** `ModalSheetDescriptor { title, rows }`.

**Scene shape.** A `Column` whose first child is a one-text `Row` with
`bold = true` (the title), followed by one one-text `Row` per body line.

```text
Column[
  Row[Text("Confirm")],   // bold
  Row[Text("Apply the change?")],
  Row[Text("[y] yes  [n] no")]
]
```

**Order.** Title first, then body rows in declaration order.

**Caps.** Title is `1..=128` bytes; each body row is `1..=128` bytes; at most
`64` body rows. An empty title, empty row, or empty body is rejected.

**Style hooks.** None. The title's bold is redundant emphasis.

**Accessibility.** This is **content only**. It creates no overlay, no focus
trap, no modality, no input capture, and no second modal authority. A plugin
that mounts it into the accepted `overlay` slot still needs `ui.overlay` and
still obeys the host's overlay capacity, focus routing, and modal rules; a
plugin that presents it inside its own panel owns that panel's focus contract.
The title must be meaningful without bold, and body rows read in order.

**Headed example (illustrative, not run evidence).** The host's implemented
overlay scene path already paints a titled `Column` as one pill row per child;
this entry fixes that row shape for extension reuse without claiming the host
path is the catalog consumer.

### `status-strip`

**Declaration.** `StripDescriptor { left, center, right }`, identical to
`band`.

**Scene shape.** Identical to `band` (three region `Row`s inside one `Row`,
with a structural space only between non-empty regions).

**Order.** `left`, then `center`, then `right`; modules keep declaration order
inside a slot, matching the Status System rule.

**Caps.** At most `64` modules across all slots; each module text is
`1..=64` bytes.

**Style hooks.** None. Per-module cadence, icons, tooltips, and provider
metrics stay in the Status System; the catalog composes presentation text only.

**Accessibility.** Slot groups add no role. Reading order is `left`, `center`,
`right`; a module must not rely on position or emphasis alone to convey state.

**Headed example (illustrative, not run evidence).**

```text
ws:2  git:main*        cpu 42%  mem 61%        clock 12:04
```

**Relationship to `band`.** The shape is shared on purpose. `band` names an
edge-band surface contract and `status-strip` names a status-module composition;
a future contract may add alignment zones or a distinguishing tag. Until then,
entry ids are declaration metadata, not tree metadata.

## Caps and fail-closed behavior

| Field / dimension             | Accepted range  | Overflow result                   | Anchor                                      |
| ----------------------------- | --------------- | --------------------------------- | ------------------------------------------- |
| Strip segments across regions | `0..=64` total  | `TooManyItems { found, cap }`     | chrome-band `BAND_MAX_REGIONS` (`64`)       |
| Pill count                    | `1..=64`        | `TooManyItems { found, cap }`     | same contribution bound                     |
| Modal body rows               | `1..=64`        | `TooManyItems { found, cap }`     | same contribution bound                     |
| Segment text                  | `1..=64` bytes  | `ItemTooLong { index, len, cap }` | status-system draft module text (`64`)      |
| Pill label                    | `1..=32` bytes  | `ItemTooLong { index, len, cap }` | bar plugin workspace pill-name bound (`32`) |
| Detail / title / sheet row    | `1..=128` bytes | `ItemTooLong { index, len, cap }` | overlay/tooltip text bound (`128`)          |
| Composed text                 | `<=256 KiB`     | `TextTooLong { bytes, cap }`      | accepted `SCN-3`                            |
| Composed nodes                | `<=2048`        | `TooManyNodes { found, cap }`     | accepted `SCN-1`                            |
| Composed depth                | `<=16`          | `TooDeep { found, cap }`          | accepted v1 bridge budget                   |

Rules:

1. Caps are inclusive at the boundary and enforced by the same typed
   validation used by composition and recognition.
2. There is no clamp, truncation, "best effort", or last-write-wins path. A
   rejected declaration composes nothing and yields a typed diagnostic.
3. **Empty is a failure, not an omission.** An entry with no content, an empty
   segment, an empty pill, an empty detail, an empty title, an empty sheet row,
   or an empty body is rejected. A host may never ignore a declared block.
4. **Unknown entry names fail closed.** The closed name parser accepts only the
   five canonical spellings with no aliases or case folding. A host that accepts
   names from configuration or a package rejects an unknown name rather than
   dropping the block.
5. **Reserved delimiters fail closed.** A pill label containing `[` or `]` is
   rejected so the rendered form stays unambiguous and round-trips.
6. **Mutation fails closed.** A presented tree that drops, changes, or decorates
   any item is not the canonical shape; verification returns
   `ShapeMismatch { entry }` instead of accepting a partial surface.
7. A style value is not text and does not exist here. The caps add no
   unbounded collection, no decode path, and no new budget; SCN-1..SCN-5 are
   unchanged.

## Composition order and determinism

- Declared order is render order everywhere: region order is `left`, `center`,
  `right`; segments, pills, and sheet rows keep declaration order.
- Structural separators are fixed single spaces; no alignment, wrapping, or
  width negotiation is part of this record. Host layout still owns placement
  and clipping.
- No sorting, deduplication, eviction, hash iteration, clock, randomness, or
  platform state participates. The same descriptor composes byte-identical
  output on every run.
- Composition is `O(items)` and allocates one bounded tree; recognition walks
  the supplied tree only until a cap is breached (iteratively, never
  recursively), so it is `O(min(n, caps))` and cannot grow past the caps.
- **Unused path is byte-identical.** The catalog is not a global hook. A tree
  that declares no catalog block composes exactly the bytes it composed before
  the catalog existed; an empty declaration fails rather than emitting zero
  nodes. The headless suite pins a frozen baseline encoding.

## Style hooks and accessibility

**Style hooks are reserved, not implemented.** The catalog descriptors have no
style fields, and composition emits no `fg`/`bg` token. The candidate
[Scene Style Primitives](scene-style-primitives-candidate.md) set is not
accepted and has no consumer; when a successor accepts it, a catalog revision
may add token-only hooks (padding, radius, border, border token) and must state
its precedence. This record pre-empts none of it:

- no CSS-like shorthand, style string, or arbitrary property bag;
- no colour literal, gradient, image, shadow/elevation, opacity, blur,
  transform, or per-node font;
- no motion or transition field;
- no style on Core chrome or another plugin's content.

**Accessibility rules for every entry:**

1. Entries add no role, accessible name, focus stop, selection, or search
   entry. They compose text and containers; the host's existing accessibility
   mapping for those primitives is unchanged.
2. Reading order is composition order. Separators are structural and must not
   become content that changes the reading order.
3. Bold is redundant emphasis only. No state may be conveyed solely by bold,
   colour, or position; the text must carry it.
4. `pill-row` is not a button, `modal-sheet` is not a modal, and
   `tooltip-detail-fallback` is not a tooltip. Interaction, focus, modality,
   announcements, and capture stay with the owning accepted contracts.
5. A future style hook must preserve content, roles, order, selection, search,
   and contrast; a decoration never hides content from the accessibility tree.

## Security review

| Concern                          | Control                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Arbitrary code surface           | Pure data descriptors; no Lua value, callback, closure, handle, path, image, or shader crosses.      |
| New input authority              | No `on_click`/`on_scroll`, region, command, argument, coordinate, focus, or capability is emitted.   |
| Presentation vs truth            | Output is `Text`/`Row`/`Column` presentation data; no grid, cursor, mode, scrollback, or PTY effect. |
| Hot-path execution               | Composition is cold-path and bounded; no plugin VM on PTY, input, damage, or render paths.           |
| Unbounded input                  | Documented inclusive caps on items and bytes; aggregate SCN-1/SCN-3 bounds; no clamp.                |
| Silent degradation               | Empty, unknown, over-cap, reserved-delimiter, and mutated declarations all fail closed with a type.  |
| Cross-plugin or chrome authority | Entries carry no chrome geometry and no cross-plugin selector; placement remains host-owned.         |
| Accessibility regression         | Text-only composition, unchanged roles/order; no modal, tooltip, or announcement claim.              |
| Safe mode                        | Composition is inert data; `bitty --safe` and plugin revocation simply stop calling it.              |

This record adds no capability identifier and no fourth security domain. It
does not change the plugin host, capability grammar, or admission path.

## Implementation evidence

`bitty` (`CTX-1416`, issue `#2114`) carries the candidate catalog at
`crates/bitty-lua/src/ui_catalog.rs` with its headless suite in the same module.
The evidence is **`Implemented`-only**:

- headless, no renderer, no window, no PTY, no VM;
- no consumer: the band host, overlay path, host bridge, and plugin API do not
  call the catalog;
- no Lua exposure, no new capability, and no change to
  `bitty.ui.mount`/`bitty.ui.update`;
- not `Verified`, not `Compatible`, and no headed proof;
- the bar migration is not performed here (the bar lives in `bitty-plugins`,
  and a Lua-visible catalog needs an accepted SDK surface first).

The suite covers entry-name parse/round-trip, canonical descriptor round-trip,
inclusive caps and one-past rejection, empty and reserved-delimiter rejection,
declaration order with duplicates, deterministic repeat composition, accepted
v1 kinds only, absent style/bindings, mutation and ignored-block verification,
early rejection of oversized or over-deep trees, and a frozen byte-identical
unused path.

## Verification plan

| Check                           | Expected result                                                                               | Evidence                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| Entry-name parse and round-trip | Five exact names round-trip; aliases and case variants return `None`.                         | Headless test (this slice)     |
| Descriptor round-trip           | `compose` then `from_scene` returns the same descriptor for every entry.                      | Headless test (this slice)     |
| Caps inclusive and overflow     | Boundary values pass; one past is a typed error naming found and cap.                         | Headless test (this slice)     |
| Empty declaration               | Every empty entry/item is rejected; nothing is omitted silently.                              | Headless test (this slice)     |
| Reserved pill delimiters        | `[`/`]` in a label is rejected.                                                               | Headless test (this slice)     |
| Composition order               | Regions and items keep declaration order; duplicates survive; empty edges add no blank space. | Headless test (this slice)     |
| Deterministic repeat            | Same descriptor composes identical trees and encodings across runs.                           | Headless test (this slice)     |
| Unused path byte identity       | A no-catalog tree keeps a frozen byte encoding; empty declarations fail.                      | Headless test (this slice)     |
| Mutation / ignored block        | Dropped or changed items fail verification; an ignored block never passes.                    | Headless test (this slice)     |
| No authority / accepted kinds   | Every node is `Text`/`Row`/`Column`; no style token or binding appears.                       | Headless test (this slice)     |
| Oversized/deep recognition      | A node, depth, or text breach rejects early without recursion.                                | Headless test (this slice)     |
| Host integration                | No host, bridge, band, overlay, or render path calls the catalog.                             | Source inspection (this slice) |
| Headed bar/status proof         | A bar or statusline renders from catalog entries with plugin-owned policy.                    | **Pending** (bitty-plugins)    |
| Style-hook acceptance           | A successor accepts the style primitives and the hook precedence.                             | **Pending** (owner)            |
| Lua surface                     | An accepted additive surface exposes entry names and bounded fields.                          | **Pending** (owner)            |

## Alternatives considered

| Alternative                             | Why it was not selected                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| One new `SceneNode` kind per pattern    | Expands the accepted schema, duplicates composition policy in Core, and needs a version bump for no mechanism.  |
| Lua library only (`bitty-ui-core`)      | Puts shape and caps inside each plugin VM; host-side admission cannot verify a declaration without parsing Lua. |
| Arbitrary style/property bag            | Unbounded parser and paint surface; pre-empts the unaccepted style contract and invites untrusted styling.      |
| Clamp or truncate over-cap input        | Silent degradation hides authoring errors and makes the rendered result depend on an unstated policy.           |
| Skip empty or unknown blocks            | Presents a partial surface as complete and makes a plugin failure invisible.                                    |
| Entry inferred from the tree            | `band` and `status-strip` share a shape; inference would guess policy and break round-trip attribution.         |
| Catalog owns clicks, focus, or modality | Creates input and chrome authority the v1 surface does not grant; those stay with the accepted owners.          |
| Migrate the bar in this record          | Cross-repository change with no accepted Lua surface; the dogfood needs an actual consumer contract first.      |

## Affected contracts

- [Rich Presentation RFC](rich-presentation-rfc.md) — unchanged; the catalog
  composes only accepted v1 primitives and adds no `SceneNode` variant.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — unchanged; no Lua key, slot, capability, or error code is added. A future
  surface would be additive and versioned.
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md) — the
  `band` regions and `64`-region bound are reused, not delegated; host geometry
  and hit-testing are untouched.
- [Status System Specification](status-system.md) — the `status-strip` slot
  order and module text bound are reused; sampling, providers, and privileged
  metrics are untouched.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)
  — the band/overlay split and text bounds are unchanged; the catalog mounts
  nothing.
- [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md) —
  hooks are reserved and unimplemented; nothing here accepts or extends that
  set.
- [Lua UI Component Model (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/lua-ui-component-model-candidate.md)
  — a plugin-side component library could consume the catalog later; this
  record adds no component library and no framework.
- [UI Runtime Candidate](ui-runtime-candidate.md) — the owner-pending runtime
  RFC is the acceptance vehicle for a catalog surface, if one is pursued.

## Open points

1. **Acceptance owner and vehicle.** The UI Runtime RFC (owner-pending), the
   Plugin API v1 successor, or an explicit SDK contract must accept entry names,
   shapes, caps, and ordering. This record does not.
2. **Where the catalog lives.** Host-side Rust descriptors (this slice) versus a
   pure-Lua Level 2 library or both. The split determines whether admission can
   verify a declaration without parsing Lua.
3. **Lua surface.** Whether plugins may name a catalog entry and supply bounded
   fields, and which capability/version carries it. No surface is defined here.
4. **Style hooks.** Which candidate style primitives become available, at what
   precedence, and whether a theme content style can override them. Blocked on
   the style-primitives acceptance.
5. **`band` versus `status-strip` shape tag.** They share a tree shape today.
   A future contract may add a tag or alignment zones; that is a shape revision.
6. **Tooltip/detail vehicle.** Whether a detail fallback becomes a real tooltip,
   an overlay, or a notification, and which contract owns its announcement and
   dismissal.
7. **Modal sheet authority.** Focus, modality, dismissal, and capture remain
   with the panel/overlay contracts; whether a catalog sheet may be mounted
   directly into `overlay` is that surface's decision.
8. **Cap ownership.** Whether the `64`/`32`/`128` bounds stay catalog constants
   or move to the Chrome Band and Status System contracts when those are
   accepted.
9. **Bar and statusline dogfood.** Migration belongs to `bitty-plugins` and
   needs the accepted surface plus headed evidence; no plugin was changed here.
10. **Headed evidence.** No screenshot, pixel, or live-host evidence exists for
    this record. The examples are illustrative.

## Acceptance criteria

A successor can accept this catalog only when:

- the five entries, their shapes, caps, and ordering are reviewed by the
  UI/architecture owner and a security reviewer;
- every entry composes only the accepted v1 node set, with no style, input,
  chrome, focus, or modality authority;
- fail-closed behavior for empty, unknown, over-cap, and mutated declarations is
  demonstrated by executable evidence;
- a Lua surface, if proposed, is additive, versioned, capability-scoped, and
  does not put a VM on the hot path;
- the style hooks are either accepted with an owner or explicitly deferred;
- the bar/statusline dogfood and headed evidence exist, or the entries remain
  candidate-only with that gap recorded;
- every verification-plan row has evidence, with pending rows explicitly
  marked.

## P0 Review Sign-off

| Reviewer role          | Verdict | Evidence |
| ---------------------- | ------- | -------- |
| UI/architecture owner  | Pending | —        |
| Security reviewer      | Pending | —        |
| Docs curator           | Pending | —        |
| Plugin ecosystem owner | Pending | —        |

## References

- [Rich Presentation RFC](rich-presentation-rfc.md)
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md)
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)
- [Status System Specification](status-system.md)
- [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md)
- [UI Runtime Candidate](ui-runtime-candidate.md)
- [Panel Runtime RFC](panel-runtime-rfc.md)
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
- [Lua UI Component Model (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/lua-ui-component-model-candidate.md)
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
- [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191)
- [bitty#2114](https://github.com/bitty-terminal/bitty/issues/2114)
