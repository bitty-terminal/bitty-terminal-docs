---
title: Scene Style Primitives (Candidate)
description: Candidate bounded style primitives for extension-owned scene nodes covering padding radius border caps theme resolution precedence and fail-closed overflow
category: specifications
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 74
---

# Scene Style Primitives (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record designs a bounded style
> vocabulary for extension-owned scene nodes. It changes no accepted text:
> the [Rich Presentation RFC](rich-presentation-rfc.md) still owns the v1
> `SceneNode` schema, the [Workspace Compositor Specification](workspace-compositor.md)
> still owns Core decoration geometry, and the
> [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) still
> owns the token vocabulary. The primitive names, wire keys, caps, and
> resolution order below are candidate spellings that a successor acceptance
> (owner-pending UI Runtime RFC) adopts or rejects. An experimental
> implementation may exist as review evidence and carries no compatibility
> promise.

## Purpose and scope

A scene tree can express structure (`Text`, `Row`, `Column`, `Block`, `List`,
`Table`, `Rule`) and resolve theme colour tokens, but it has no style
primitives: no spacing, corner radius, or typed border/stroke model beyond
`Block`'s accepted `Border`. Extension authors can only choose token colours,
so extension content is limited to theme-coloured terminal text and boxes.

This record answers one question: **which style primitives may an extension
set on a scene node it owns, how do they resolve, and what bounds keep them
from becoming an arbitrary styling surface?**

In scope:

- a closed primitive set for extension-owned scene nodes and the accepted
  analogue each primitive reuses;
- per-field resolution across a theme content style, the node's own
  declaration, and `bitty --safe`;
- documented caps, units, defaults, and fail-closed overflow behaviour;
- the closed wire shape an extension API would expose, including the fields
  it must reject;
- rendering, budget, accessibility, input, and security consequences;
- the verification plan and the open points a successor acceptance must
  decide.

Out of scope and owned elsewhere:

- the accepted `SceneNode` schema, scene limits (SCN-1..SCN-5), and the rule
  that presentation never becomes Terminal Truth (accepted,
  [Rich Presentation RFC](rich-presentation-rfc.md));
- Core-owned `View` decoration (`gaps_in`, `gaps_out`, `border`, `radius`,
  `content_inset`) and its `ConfigPlan` validation, `Live` reload, and safe
  values (accepted, [Workspace Compositor Specification](workspace-compositor.md));
- the theme token namespace, source order, plugin boundary, and contrast
  obligations (candidate, [Theme Token Contract (Candidate)](theme-token-contract-candidate.md));
  the accepted colour grammar, per-key resolution, AC-1..AC-3 contrast, and
  `bitty --safe` pair come from
  [RFC-0001](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md);
- plugin-supplied appearance for content a plugin owns as a **capability**
  (candidate, [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md),
  OQ-044);
- the panel content scene path and its paint consumer (draft,
  [Panel Content Scene Path Decision](panel-content-scene-path-decision.md));
- motion, opacity, blur, and transitions (accepted bounds live in
  [RFC-0002](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md);
  per-panel animation overrides stay candidate under OQ-043).

## Normative sources this specification must not weaken

- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md):
  untrusted-by-default posture and invariants 3 (presentation, never Terminal
  Truth), 4 (no hot-path execution), 7 (bounded inputs), and 10
  (`bitty --safe`).
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md):
  T-01 resource exhaustion, T-06/T-07 plugin authority and hot paths, and
  T-13 terminal-to-desktop capability gates.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md): mechanism
  versus policy, the primitive-or-composable test, and the rule that a plugin
  alters presentation only.
- [Rich Presentation RFC](rich-presentation-rfc.md) (accepted): `SceneNode`,
  `RichBlock`, scene limits, and the prohibition on shaders, pipelines,
  native windows, and global-coordinate drawing.
- [Workspace Compositor Specification](workspace-compositor.md) (accepted):
  Core-owned decoration, its valid ranges, and the rule that no plugin,
  `LayoutProvider`, or panel rule mutates those values at runtime.
- [RFC-0001](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
  (accepted): colour value grammar, per-key resolution, contrast floors, and
  `bitty --safe` forced values.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  (accepted): the closed declarative UI surface and its node vocabulary.

This record selects no threshold that moves a requirement between owners and
creates no bypass. Where it proposes a cap, the cap reuses an accepted range
and does not widen it.

## Terminology

| Term                | Meaning in this document                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Primitive           | One typed style property with a unit, a cap, and a defined resolution rule.                                |
| Style declaration   | A set of primitive values an extension or theme claims for one node; absent fields are "not declared".     |
| Resolved style      | Concrete primitive values plus the layer that supplied each one, after precedence and fail-closed checks.  |
| Theme content style | Resolved theme values offered as the baseline for extension content (not Core chrome).                     |
| Content token       | A theme token in the `content.*` or `state.*` namespace; the only colour source an extension may name.     |
| Flat style          | A resolved style where padding, radius, and border are all zero/absent; it emits no style paint operation. |
| Cap                 | The inclusive maximum value a primitive accepts; overflow is a typed rejection, never a clamp.             |

## Problem statement

Today an extension declares `fg`/`bg` token names and `bold` on `UiNode`
trees, and the scene model offers `Block { border: Option<Border> }` with a
width in cells and a producer-supplied colour string. Neither surface is a
style system:

- there is no spacing, radius, or stroke vocabulary, so extension content
  cannot express visual hierarchy beyond coloured text;
- `Border.color` is an unbounded producer string rather than a theme-resolved
  value, so a producer can smuggle an arbitrary colour, and the string counts
  against the text budget without a resolution rule;
- there is no documented cap or failure mode for style-like values, so any
  future property risks silent clamping or an accidental CSS-like surface;
- there is no stated precedence between a theme's content style and the
  extension's own declaration.

At the same time, terminal cells and the scene budget make a full CSS model
neither feasible nor desirable: no transforms, no shaders, no per-node
pipeline, no layout ownership, and no input authority.

## Candidate primitive set

The set is closed at four primitives. Units follow the surface each primitive
affects: padding is measured in cells because scene layout is cell-based;
radius and border width are logical pixels because they are clip/stroke
geometry, consistent with Core decoration's pixel units.

| Primitive     | Wire key       | Unit  | Default              | Inclusive cap | Accepted analogue                             |
| ------------- | -------------- | ----- | -------------------- | ------------- | --------------------------------------------- |
| Padding       | `padding`      | cells | `0`                  | `32`          | `decoration.content_inset` range (`0..32` px) |
| Corner radius | `radius`       | px    | `0`                  | `16`          | `decoration.radius` range (`0..16` px)        |
| Border width  | `border`       | px    | `0`                  | `16`          | outline `border_width` range (`0..16`)        |
| Border colour | `border_token` | token | `content.foreground` | closed set    | theme token contract, content namespace only  |

Rules:

1. `border` is the stroke primitive. A separate `stroke` key is rejected:
   two spellings for one width invite conflicting declarations and double
   painting.
2. `border_token` names one of `content.foreground`, `content.accent`,
   `content.muted`, `state.error`, `state.warning`, or `state.success`. A
   colour literal (`#RRGGBB`, `rgb()`, a named colour, a gradient, or an
   image) is rejected. Core chrome tokens (`border.*`, `chrome.*`) are
   rejected: a plugin never sets Core-owned chrome.
3. A token declared with an effective border width of `0` is inert; it paints
   nothing and is not an error. A width above `0` without a token resolves the
   `content.foreground` default.
4. **Elevation is deferred and not part of this set.** No accepted contract
   defines a shadow or elevation model, a compositing budget for it, or its
   accessibility treatment. Inventing a tier here would create a visual
   contract without an owner. It stays an open point below.
5. Opacity, blur, transitions, transforms, z-order, per-node fonts, and
   background images are not primitives of this record. They have separate
   owners and accepted bounds; none is smuggled in through a style table.

## Resolution and precedence

Resolution is per field, from lowest to highest:

1. **Framework default** — flat (`padding = 0`, `radius = 0`, `border = 0`,
   no border). This is what an unstyled node has today.
2. **Theme content style** — the resolved theme baseline for extension
   content. The theme's own internal source order is not redefined here; the
   theme-token cascade and the `ResolvedStyle` direction supply it.
3. **Node override** — the declaration on the extension node that owns the
   content. The extension may style its own content; it cannot style Core
   chrome or another plugin's content.
4. **`bitty --safe`** — forces every geometry primitive flat (`0`, no
   border), regardless of the layers below.

Rules:

1. Each field resolves independently: a node may claim padding while radius
   and border still come from the theme. A field that is absent is "not
   declared", which is distinct from a declared `0`.
2. Border colour resolves through the theme token cascade, so the winning
   layer is reportable per token (`framework-default`, `theme-preset`,
   `plugin-package`, `user-keys`, `safe-forced`). A missing token fails
   closed; the resolver never substitutes an unthemed colour.
3. Attribution scope is explicit: padding and radius report their winning
   layer for every resolved value. Border width and colour report their
   winning layers only when the resolved width is non-zero; an explicit
   `border = 0` resolves no border and therefore reports no border
   attribution.
4. The node override never grants a capability. It is presentation data
   scoped to content the extension already owns; a node that owns no content
   cannot use it to paint anything.
5. Core-owned decoration is not reachable: `gaps_in`, `gaps_out`,
   `content_inset`, `radius`, and `border` on `View` frames remain
   `ConfigPlan`-validated and Core-applied. The primitives here style a node
   **inside** the content rectangle that Core already computed.
6. When style is not declared anywhere, resolution is flat and contributes
   zero paint operations. A consumer that emits operations only for a
   non-empty resolved style therefore renders byte-identically to today.

## Caps and fail-closed overflow

| Input                                             | Result                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `padding` `0..=32`                                | Accepted.                                                                                           |
| `padding` `33` or greater                         | `PaddingOverCap { found, cap }`; the declaration is rejected.                                       |
| `radius` `0..=16`                                 | Accepted.                                                                                           |
| `radius` `17` or greater                          | `RadiusOverCap { found, cap }`; rejected.                                                           |
| `border` `0..=16`                                 | Accepted.                                                                                           |
| `border` `17` or greater                          | `BorderOverCap { found, cap }`; rejected.                                                           |
| Negative, fractional, boolean, or table value     | `InvalidValue { field }`; rejected.                                                                 |
| Unknown key (including CSS-like names)            | `UnsupportedField { field }`; rejected, never ignored.                                              |
| Field or token name longer than `32` bytes        | `OversizedField` / `OversizedToken`; rejected without echoing an unbounded input in the diagnostic. |
| Duplicate key                                     | `DuplicateField { field }`; rejected, never last-write-wins.                                        |
| Token outside the closed content set or a literal | `UnknownToken { token }`; rejected.                                                                 |

Rules:

1. There is no silent clamp and no "best effort" default on overflow. A
   rejected declaration mounts nothing and produces a typed diagnostic; the
   last good scene is retained by the scene admission path.
2. Caps are inclusive at the boundary and apply at every entry point: the
   typed constructor, the wire parser, and the resolver all observe the same
   constants.
3. The cap values reuse accepted ranges. Raising any cap is a contract change
   requiring an accepted revision, not a local constant edit.
4. A style value is not text: it does not consume the SCN-3 text budget, but
   it is bounded per node and adds no unbounded collection. SCN-1..SCN-5 are
   unchanged.

## Extension API shape

The wire shape is a closed table of typed fields. It is candidate direction,
not a supported key today; the accepted Plugin API v1 remains unchanged.

```lua
-- Candidate only. Not shipped, not supported, and not a compatibility promise.
bitty.ui.mount("bottom", {
  kind = "Row",
  style = {
    padding = 2,          -- integer, cells, 0..32
    radius = 6,           -- integer, logical px, 0..16
    border = 1,           -- integer, logical px, 0..16
    border_token = "content.accent", -- closed content token
  },
  children = { { kind = "Text", text = "ready" } },
})
```

Rules:

1. The parser accepts only the four keys above, with the two value shapes
   (integer, token string). Unknown keys fail closed.
2. The parser never accepts a function, table, closure, renderer handle,
   shader, path, or image. It has no authority fields: `on_click`,
   `on_scroll`, `command`, `capability`, and any future input binding are
   rejected if they appear in a style table.
3. The wire form round-trips canonically: parse, resolve, and re-encode
   produce the same declaration in declaration order. Field order is not
   semantic.
4. Resolution is a pure cold-path function. No plugin VM runs during
   resolution, no Lua callback is invoked, and no per-frame script executes.
   The host may resolve once per mounted revision and cache the result.
5. Style is presentation only: it cannot change focus, hit-testing, input
   capture, clipboard, search, selection, terminal state, or the
   accessibility tree's content. A decoration never hides text from the
   accessibility tree.

### Scene-layer authoring (implemented candidate evidence)

The scene model already accepts the vocabulary, so an extension author can
express it today at the `RichBlock` layer even though no Lua key ships. The
kind is additive: a v1 producer never emits it, and a consumer that predates
it still sees the same v1 kinds and the bounded `Unknown` fallback.

```rust
// Illustrative scene-layer shape. Candidate, not a stable API.
use bitty_rich::scene::{ContentToken, SceneNode, SceneNodeStyle, StyledSpan};

let card = SceneNode::Styled {
    style: SceneNodeStyle::new(
        2,                     // padding, cells, 0..=32
        6,                     // radius, logical px, 0..=16
        1,                     // border, logical px, 0..=16
        ContentToken::Accent,  // closed content token
    ),
    child: Box::new(SceneNode::Column(vec![
        SceneNode::Text(StyledSpan {
            text: "ready".to_string(),
            bold: false,
            italic: false,
        }),
        SceneNode::Rule,
    ])),
};
```

The producer declares data only. Core measures the box, insets the child by
the padding cells, paints the rounded ring in the existing rounded pass, and
resolves the token through the content palette. A flat
`SceneNodeStyle::default()` (or `SceneNodeStyle::FLAT`) is a pure wrapper: it
measures and paints exactly like the unwrapped child.

## Rendering and budget impact

The candidate consumer contract is a small typed paint-operation list:
padding, radius clip, and border stroke, in that order. A flat style emits
none. This keeps the present path independent of the extension's language
runtime and keeps wgpu batching unchanged when no style is used.

- **No style (default).** Zero operations, zero bytes, no new draw call, no
  new pipeline state. This is the byte-identical path the tests pin.
- **Padding only.** Layout inset inside the node's own rectangle; no new
  pipeline or texture.
- **Radius.** A clip applied to the node's frame; it does not change hit
  testing beyond the clipped bounds, mirroring the accepted Core decoration
  rule.
- **Border.** A stroke inside the node rectangle; it does not add a batch
  when the renderer can reuse its existing rounded-rectangle/stroke path.
- **Budget.** Resolution is O(fields) = O(1) per node on the cold path and
  adds no per-frame allocation beyond the bounded operation list. Style does
  not raise SCN-1..SCN-5 and adds no text bytes to SCN-3; a scene-layer
  wrapper is accounted as one extra node and one extra depth level on top of
  the content it styles (see the evidence below), so a styled tree stays
  inside the accepted ceilings.

### Scene-layer paint path (candidate evidence, `CTX-1659`)

The scene-model half of this record now has a bounded, headless paint
consumer (`bitty` `CTX-1659`, issue `#2112`). It is **candidate evidence**,
not an acceptance claim:

- `bitty-rich` carries the additive `SceneNode::Styled { style, child }` kind
  with a data-only `SceneNodeStyle` (`padding` cells `0..=32`, `radius` px
  `0..=16`, `border` px `0..=16`, `border_token` from the closed content set).
  Construction is unchecked data; every admission entry point
  (`RichBlock::new`, `Scene::insert`, `Scene::replace_content`) validates it
  and rejects an over-cap block as a parent, exactly like an SCN overflow.
- `bitty-render::scene` measures and paints it. Padding insets the child by
  whole cells and emits no operation. A border emits **one**
  `ScenePaintOp::Rounded` ring, converted to the accepted `RoundedFill`
  geometry the compositor already paints for View frames, so the existing
  rounded pass and its SDF do the work: no new pipeline, no new draw call, no
  per-node allocation on the present hot path. Radius is the ring's corner
  radius; the ring is a stroke inside the node's own measured frame and never
  expands it.
- A flat style measures and paints byte-identically to the unwrapped child,
  and a v1-only scene's paint list is frozen by a golden test. The scene
  version field stays the revision counter; `schema_version()` reports the
  additive v2 revision when a styled node is present.
- Style is paint only for accessibility: the text projection and the
  `SceneKind` mapping unwrap a styled node, so roles, order, and text are
  unchanged and a border or radius never hides content.
- Styling adds **one node and one depth level per wrapper** to the accepted
  SCN-1/SCN-2 accounting, and no text bytes under SCN-3.

Remaining for a successor: wiring the live theme palette into
`ScenePaintStyle` (the default palette resolves the Bitty Dark reference
roles), and the wgpu batch-count measurement for a styled scene. The
extension API (`ui.rich`) remains v1 and ships no style key.

If a future renderer cannot batch radius/border without a new pipeline, that
is a paint-path decision for the owning implementation task; this record does
not claim a batching result.

## Accessibility, input, and safety

- **No input authority.** Style tables carry no bindings, no pointer
  coordinates, and no commands. The parser rejects authority-shaped keys, and
  resolution returns values only.
- **No terminal authority.** Style cannot write grid, cursor, modes, or
  scrollback; presentation never becomes Terminal Truth.
- **Accessibility.** Style changes paint only. Text, roles, reading order,
  selection, and search indices are unchanged; a border or radius never
  removes content from the accessibility tree.
- **Contrast.** Border colour comes from theme-resolved content tokens; an
  extension cannot inject a literal. The token contract's AC-1..AC-3 floors
  govern the focused/idle outline pair, not arbitrary content tokens, so
  content-token contrast remains an owner-pending theme concern. If a named
  token is absent, resolution fails closed rather than substituting an
  unthemed colour.
- **Safe mode.** `bitty --safe` forces all style geometry flat, so extension
  content degrades to plain themed text without a second policy path.
- **No hot path.** No PTY read, VT parse, damage computation, keystroke, or
  render-per-frame path invokes the extension runtime for style. Resolution
  happens at mount/update, not per frame.

## Security review

| Concern                     | Control                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Arbitrary styling surface   | Closed four-key vocabulary; unknown and duplicate keys fail closed.                      |
| Untrusted colour input      | Token-only colour from a closed content set; literals and Core chrome tokens rejected.   |
| Unbounded input             | Documented inclusive caps on every integer; typed overflow errors; no clamp.             |
| Renderer or platform escape | No handle, path, image, shader, pipeline, or function crosses the wire form.             |
| Privilege escalation        | Presentation data scoped to owned content; no capability, command, or input binding.     |
| Hot-path execution          | Pure cold-path resolution; no plugin VM, callback, or per-frame script.                  |
| Silent degradation          | Missing token, bad type, duplicate key, and overflow all reject with a typed diagnostic. |
| Safe mode                   | All geometry forced flat, independent of declarations.                                   |
| Resource exhaustion         | O(1) bounded values per node; SCN-1..SCN-5 unchanged; no new collection or decode path.  |
| Accessibility regression    | Paint-only changes; content, roles, order, selection, and search are untouched.          |

This record adds no capability identifier and no fourth security domain. Any
future capability for plugin-supplied appearance remains OQ-044 and follows
the accepted `PluginCapabilities` model.

## Verification plan

The experimental implementation records these checks; they are evidence, not
an acceptance claim:

| Check                           | Expected result                                                              |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Primitive resolution from theme | Declared values resolve to concrete values with theme attribution.           |
| Undeclared border token         | Resolves `content.foreground` from the theme cascade.                        |
| Per-field override precedence   | Node fields win individually; theme fields survive where the node is silent. |
| Explicit zero override          | A declared `border = 0` disables a theme border without becoming "unset".    |
| Caps inclusive and overflow     | Boundary values pass; one past the cap is a typed error naming both values.  |
| Wire round-trip                 | Parse, encode, and re-parse preserve the declaration in canonical order.     |
| Authoring authority rejection   | Input, command, colour-literal, CSS-like, and renderer keys fail closed.     |
| Mutation/ignore-style posture   | `--safe` ignores every declaration; resolution is pure and repeatable.       |
| Unused style byte identity      | Flat resolution emits zero operations and zero bytes.                        |
| Styled golden encoding          | A styled node matches a frozen deterministic byte sequence.                  |
| Scene-layer paint output        | Padding insets by cells, a border emits one ring op, flat emits none.        |
| Scene-layer bounds              | One past any cap fails the parent block and scene admission, never a clamp.  |
| Scene-layer v1 compatibility    | An unstyled paint list is frozen; a flat style equals the unwrapped child.   |
| Scene-layer a11y projection     | Styled text lines and `SceneKind` are identical to the unwrapped subtree.    |

### Experimental implementation evidence

`bitty` (`CTX-1414`, issue `#2112`) carries the candidate resolver at
`crates/bitty-ui/src/scene_style.rs` and the verification suite at
`crates/bitty-ui/tests/scene_style_primitives.rs`. The evidence is
**`Implemented`-only**: headless, not `Verified` or `Compatible`, with no paint
consumer and no plugin-facing API change. This record does not promote the
implementation beyond candidate status.

The scene-model and paint half (`CTX-1659`, issue `#2112`) is also
**`Implemented`-only** headless evidence:

| Piece                                   | Location                                                                                                      | Evidence                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additive v2 node and bounded style data | `crates/bitty-rich/src/scene.rs` (`SceneNode::Styled`, `SceneNodeStyle`, `ContentToken`, `SCENE_STYLE_MAX_*`) | unit tests: inclusive caps, per-primitive parent-block rejection, unchecked block rejected at `Scene::insert`, v1/v2 `schema_version`, unknown-kind fallback                    |
| Admission and budget accounting         | the same module, `check_block_content_limits`                                                                 | style bounds checked at every entry point; wrapper = one node/one depth level, zero SCN-3 bytes                                                                                 |
| Measurement and paint                   | `crates/bitty-render/src/scene.rs` (`ScenePaintOp::Rounded`, `ContentPalette`, `ScenePaint::append_into`)     | 18 tests in `crates/bitty-render/tests/scene_style_paint.rs`: paint output per primitive, leaf bounds, op budget, frozen v1 golden, flat-style identity, text-projection parity |
| Present composition                     | `crates/bitty-runtime/src/runtime/scene_present.rs`, `present.rs`                                             | styled ring lands in the compositor's existing rounded pass; `crates/bitty-runtime/tests/scene_paint_path.rs` samples the frame pixel                                           |
| One closed vocabulary                   | `crates/bitty-runtime/tests/scene_style_vocabulary.rs`                                                        | every cap and token spelling pinned equal between the resolver and the scene model                                                                                              |
| Accessibility projection                | `crates/bitty-ui/tests/a11y_baseline.rs`, `ScenePaint::text_lines`                                            | a style wrapper projects the child's `SceneKind`; painted lines are unchanged by style                                                                                          |

Limits recorded by the evidence: the palette used by the paint path is the
Bitty Dark reference resolution (`ContentPalette::from_theme_palette`), not yet
the live user theme; and no wgpu batch count is measured. Both stay open in
this record and are not claimed as done.

## Alternatives considered

| Alternative                            | Why it was not selected                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Arbitrary CSS subset or `style` string | Unbounded parser and paint surface, no owner for layout semantics, and a direct path to untrusted styling.       |
| Plugin-supplied hex colour for borders | Bypasses theme resolution, contrast obligations, and the plugin colour boundary; invites low-contrast content.   |
| Separate `stroke` primitive            | Duplicates border width, creates conflicting declarations, and has no distinct paint meaning.                    |
| Elevation or shadow now                | No accepted model, compositing budget, or accessibility treatment; would invent a visual contract without owner. |
| Per-node theme names for geometry      | Geometry has no theme namespace today; naming one here would pre-empt the theme token contract.                  |
| Clamp overflow to the cap              | Silent degradation hides authoring errors and makes the rendered result depend on an unstated policy.            |
| Resolve style per frame in Lua         | Puts the plugin VM on the present path, violating invariant 4 and the frame-on-demand budget.                    |

## Affected contracts

- [Rich Presentation RFC](rich-presentation-rfc.md) — the `SceneNode` schema
  is unchanged at v1; a future minor version would carry the optional style
  field only after acceptance.
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md) — the
  border token set uses its `content.*`/`state.*` names; no new token is
  created here.
- [Workspace Compositor Specification](workspace-compositor.md) — Core-owned
  decoration is untouched; the caps reuse its ranges without delegating
  ownership.
- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md) —
  the paint consumer that would apply these operations is that path's
  decision, not this record's.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — unchanged; a style table would be a future additive surface.
- [UI Runtime Candidate](ui-runtime-candidate.md) — the owner-pending runtime
  RFC is the acceptance vehicle for the primitive set and precedence.

## Open points

1. **Acceptance owner and vehicle.** The UI Runtime RFC (owner-pending) or a
   successor appearance contract must accept the primitive set, caps, units,
   and precedence. This record does not.
2. **Elevation.** A shadow/elevation model needs a token namespace, a
   compositing budget, an occlusion rule against terminal cells, and an
   accessibility treatment. None is accepted today.
3. **Paint integration.** The scene path now has a bounded style paint
   consumer (`CTX-1659`: padding, one rounded ring per bordered node, token
   colour through the rounded pass), but the live theme palette wiring and the
   wgpu batch-count evidence are still open; the
   [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)
   owns that wiring and the batching evidence.
4. **Unit choice.** Padding in cells and radius/border in logical pixels is a
   candidate split. A successor may unify units or make padding DPI-scaled.
5. **Theme content-style source.** No accepted configuration key supplies a
   theme content style; today the theme layer is empty and resolution falls
   back to framework defaults. The key surface and reload semantics are
   owner-pending.
6. **User authority over content geometry.** Whether a user theme may
   override an extension's own padding/radius, or only its colours, is not
   decided. The candidate order puts the node above the theme for owned
   content.
7. **Capability gating.** Whether a style table needs a dedicated capability
   or rides the existing UI slot capability is OQ-044/OQ-056 territory.
8. **Schema placement.** Whether style is a new `SceneNode` field, a wrapper,
   or a per-block attribute is a Rich Presentation RFC minor-version
   decision.

## Acceptance criteria

This candidate can be accepted only when:

- the primitive set, units, caps, and closed token set are reviewed by the
  UI/architecture owner and a security reviewer;
- the precedence order, including `bitty --safe`, is accepted without
  weakening RFC-0001 or the theme token contract;
- the extension API shape is accepted as an additive surface with a stated
  version and capability posture;
- a paint consumer demonstrates byte-identical output for flat styles and
  bounded batching for styled nodes;
- every verification-plan row has executable evidence in `bitty`;
- elevation and paint integration are either accepted with owners or
  explicitly deferred.

## P0 Review Sign-off

| Reviewer role          | Verdict | Evidence |
| ---------------------- | ------- | -------- |
| UI/architecture owner  | Pending | —        |
| Security reviewer      | Pending | —        |
| Docs curator           | Pending | —        |
| Plugin ecosystem owner | Pending | —        |

## References

- [Rich Presentation RFC](rich-presentation-rfc.md)
- [Workspace Compositor Specification](workspace-compositor.md)
- [Theme Token Contract (Candidate)](theme-token-contract-candidate.md)
- [UI Runtime Candidate](ui-runtime-candidate.md)
- [Panel Content Scene Path Decision](panel-content-scene-path-decision.md)
- [RFC-0001 Appearance Configuration](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
- [RFC-0002 Panel Animations](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0002-panel-animations.md)
- [UI Extensibility Architecture](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/architecture/ui-extensibility-architecture.md)
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
