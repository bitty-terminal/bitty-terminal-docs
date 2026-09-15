---
title: Graphics and Appearance Model
description: Candidate direction for terminal graphics protocols as image producers, the GPU composition layer order, opacity and blur ownership, shared image infrastructure, Theme system placement, and small-core crate guidance.
category: architecture
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 23
---

# Graphics and Appearance Model

> Status: **draft** (frontmatter `draft`), docs-only, candidate direction not
> implementation. This document distills the user rendering/appearance
> direction recorded as
> [DIR-021](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/index.md)
> (CTX-0207, companion note `recording/research/035.md`). Every layer order,
> type name, and crate sketch below is a **model to plan against**, not an
> implementation claim. It changes nothing accepted: not the
> [Rich Presentation RFC](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/rich-presentation-rfc.md)
> image contract (OQ-008, IMG-1 through IMG-9), not the
> [Workspace Compositor Specification](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/specifications/workspace-compositor.md),
> not [Core and Plugin Boundaries](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/core-boundaries.md),
> not the shipped [Theme presets](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/configuration/themes.md)
> catalog, and not the accepted
> [Appearance Configuration RFC](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/rfcs/RFC-0001-appearance-configuration.md)
> (OQ-039). Those documents stay authoritative for their subject matter; where
> this candidate disagrees with them, they win.
>
> Verification basis: read-only inspection of the `bitty` checkout at
> `eef983e` (2026-09-15; shared checkout, not modified). No product code was
> changed for this task. Implementation-status notes in the appendix cite exact
> paths; everything else is direction.

## Core principle

> **Terminal graphics protocols are image producers, not rendering backends.**

Kitty Graphics and Sixel handle bytes, decode, and image resource plus
placement semantics. The Bitty renderer owns alpha, z-order, GPU textures,
composition, background, theme, blur, and UI. Future image sources plug the
same seam without architectural change:

```text
Kitty Graphics
Sixel
iTerm2 graphics
background image
animated wallpaper
desktop pet
Markdown image
AI generated UI
plugin texture
video
```

This converges with the
[Architecture Overview](https://github.com/bitty-terminal/bitty-terminal-docs/blob/main/architecture/overview.md)
direction that terminal characters are one scene-content class among others:
Bitty grows toward a small GPU-composited scene system, and Kitty Graphics is
one more content class alongside glyphs, background, and UI.

## Composition layer order (model)

Candidate scene order, background to foreground, following Kitty specification
semantics for the graphics layers. Recorded as a model, not an implementation
claim (the shipped Kitty present path is currently topmost-only; see the
appendix):

```text
Scene
|
|-- OS desktop / wallpaper
|-- window backdrop (opacity / blur, platform-owned)
|-- Bitty background (color, image, tint / dim)
|-- negative Kitty images (z < 0)
|-- terminal cell backgrounds (ANSI colors / theme)
|-- normal Kitty images
|-- text / glyphs
|-- positive Kitty images
|-- Bitty UI / panels / floating UI (borders, tabs, selection)
|-- plugins / overlays / pet
```

The exact ordering of the graphics layers against cells and glyphs must follow
the Kitty graphics protocol specification precisely when implemented; the point
of this model is that ordering is a **scene composition problem**, not a
protocol problem.

## Opacity: three different things

Do not model one vague `opacity`. The direction distinguishes, at least at the
subsystem level:

```rust
// Illustrative subsystem-type sketch only; not an accepted API.
BackgroundOpacity
SurfaceOpacity
ImageAlpha
UiOpacity
```

### Window and background opacity

Example configuration shape (illustrative only):

```lua
appearance = {
    opacity = 0.85,
}
```

This means the Bitty window reveals the desktop or wallpaper behind it. It has
no direct relationship with the Kitty Graphics Protocol. Kitty itself scopes
`background_opacity` to cells carrying the default terminal background so that
status bars and powerline-style content do not turn transparent with it; Bitty
should adopt the same semantic:

```text
background opacity != whole-window opacity
```

Scaling text, images, cursor, panels, and UI by one global factor is explicitly
not the goal.

### Image alpha

This is the opacity that belongs to Kitty Graphics: RGBA pixel alpha with
alpha blending, including graphics above or below text. A transparent PNG
travels Kitty Graphics into an image object, into a GPU RGBA texture, and is
alpha-blended into the frame. It is a different opacity from window opacity.

### Plugin and UI opacity

Floating panels, pets, notifications, the command palette, and AI panels carry
their own scene-graph alpha (for example `panel.opacity = 0.9`). Cursor opacity
and cursor color belong to this appearance family as well.

## Blur is a platform and windowing backend duty

Backdrop blur (for example `blur = 20` alongside `opacity = 0.8`) means the
desktop behind Bitty is blurred by the compositor; it never means blurring a
Kitty image. The direction abstracts it as:

```rust
// Illustrative trait sketch only; not an accepted API.
trait BackdropEffect {
    fn set_opacity(...);
    fn set_blur(...);
}
```

with per-platform mechanisms (Linux Wayland compositor capability,
macOS native visual effect, Windows DWM backdrop APIs). Blur is meaningful
only with opacity below 1, needs platform support, and must never live in the
Kitty or Sixel protocol modules.

## Background image: shared backends, separate namespaces

A configured background image and a Kitty-transmitted image share the backend
path (decode into RGBA pixels into a GPU texture into a layer) but never the
protocol or lifecycle:

```text
                    |-- background image
Image Decoder ------|-- Kitty Graphics
                    |-- Sixel
                    |-- plugin image
                    |-- pet texture
                           |
                     Texture Manager
                           |
                          GPU
```

> **Protocols are never shared, but image backends are shared.**

Candidate shared infrastructure (names illustrative only):

```rust
// Illustrative type sketch only; not an accepted API.
ImageAsset
ImageDecoder
Texture
TextureCache
ImagePlacement
ImageRenderer
```

Each source (Kitty, Sixel, background, plugin) resolves into `ImageAsset`, but
lifecycles and placement namespaces stay separate. Kitty's own background-image
handling (tinting the background image against the window background color for
readability) is the precedent for keeping theme tint inside the composition
pipeline rather than inside any protocol.

## Kitty-primary plus Sixel-compat rationale

Kitty Graphics fits the composited scene model better, which is why it is the
primary protocol with Sixel as compatibility:

```text
Kitty: RGBA, alpha blending, image id, placement id,
       z-index, relative placement, animation
```

The `z-index` maps naturally onto the composition order above, including
negative values that paint below text. Sixel is a legacy raster-in-stream
model (with notions such as background-erase modes that belong to its era);
Bitty should normalize Sixel input into the image object and texture form and
must not let the Sixel rendering model leak into the renderer.

## Theme sits above protocols

Candidate Theme shape (illustrative only; the shipped preset catalog in
`configuration/themes.md` stays authoritative for what exists today):

```rust
// Illustrative struct sketch only; not an accepted API.
Theme {
    foreground,
    background,

    ansi_0..ansi_15,
    ansi_256,

    cursor,
    selection_fg,
    selection_bg,

    border,
    panel_bg,
    panel_fg,

    accent,
    warning,
    error,
    success,
}
```

Theme fans out to terminal cells, Bitty UI, and plugins. Images never read the
Theme. Theme composes with background and translucency in this order (model):

```text
Wallpaper
   |
  Blur
   |
Background image
   |
Theme background tint
   |
Cell background
   |
Terminal graphics
   |
Text
```

## Matugen-style generation sits on the Theme system

A wallpaper-derived palette plugin (matugen-style) must not know Kitty or Sixel
exist. Candidate pipeline (model):

```text
wallpaper.jpg
      |
bitty-colorgen plugin
      |
Palette Generator
      |
Theme
      |
semantic palette
      |
+-----+-----------+
|     |           |
ANSI  Bitty UI    Panel UI
16    colors
|
ANSI 256 mapping
```

Background and Theme form a reactive loop (model): a background change emits
`BackgroundChanged`, the plugin recomputes a palette (for example OKLCH
extraction into ANSI 16, ANSI 256 approximations, and semantic colors), and a
`ThemeChanged` event drives a global transition across terminal, panels, and
plugins with smooth interpolation. Configuration and event shapes here are
illustrative; the accepted appearance contract stays in RFC-0001.

## Subsystem split (direction)

```text
bitty-render
|
|-- compositor (layers, alpha, blending)
|-- image (decode, texture, cache, placement)
|-- text (glyph renderer)
|-- effects (tint, dim, etc.)

bitty-terminal
|
|-- ansi
|-- kitty-graphics
|-- sixel

bitty-theme
|
|-- palette
|-- semantic colors
|-- ansi palette
|-- theme manager

bitty-platform
|
|-- window transparency
|-- backdrop blur
|-- compositor integration

bitty-plugin
      |
Theme API, Background API, Appearance API
```

The load-bearing boundary, restated: **every image source converges on the
image and texture system, but where the image came from stays independent.**

## Crate guidance (direction, not a dependency decision)

Do not pull the whole `termwiz` tree into production: its dependency surface
is heavy relative to the small-core philosophy, and Bitty already owns a VT
parser, terminal state, a screen model, and a renderer. The direction is a
small owned graphics-protocol layer:

```text
bitty-core
|-- vt (APC detection)
|-- graphics
|   |-- kitty (parser, command, transmit, placement, animation, state)
|   |-- sixel (parser, decoder)
|-- image (store, texture, placement)
```

unified behind something like:

```rust
// Illustrative enum sketch only; not an accepted API.
enum GraphicsCommand {
    Kitty(KittyCommand),
    Sixel(SixelImage),
}
```

flowing into `ImageStore` and `ImagePlacement` and then the renderer.
References: `termwiz` Kitty parser design (receive-side model, not the whole
crate), the Kitty official specification, and the WezTerm implementation
layering (APC parse, baseline protocol parse, placement model, renderer
quads, animation and composition).

The `kitty-graphics-protocol` crate (light dependencies, sender-oriented
public API) is worth studying, but before any dependency: verify first-hand
whether it exposes a receiver-side API (`parse`, `decode_command`, or
`KittyCommand::from_str`). If it does not, its fitting role is a
`dev-dependency` test sender that generates APC sequences for Bitty's parser,
store, and placement tests, so handmade escape strings stop spreading through
the test suite.

## Appendix: current truth, verified read-only (2026-09-15)

Checked against the `bitty` checkout at `eef983e` without modifying it. This
is status evidence for this candidate only; owning contracts and test suites
remain authoritative.

- VT parser is vte-based: `crates/bitty-vt/Cargo.toml` pins `vte = "0.15"`.
  `crates/bitty-vt/src/parser.rs` pre-scans `APC` (`ESC _ ... ST`) before
  `vte` because vte 0.15 leaves `SOS`/`PM`/`APC` strings inert with no
  callback. The note's APC-interception question is therefore **answered for
  the current tree**: Bitty already intercepts APC outside `Perform`, matching
  the `par-term-emu-core-rust` pattern. Remaining follow-up (owner: bitty
  VT/parser track): full command-model coverage, not the interception
  mechanism itself.
- Kitty `APC G` intake exists: `crates/bitty-vt/src/kitty_apc.rs` (CTX-0256)
  parses the `G` control list (`f`, `s`, `v`, `a`, `c`, `r`, `m`),
  base64-unwraps with a fail-closed alphabet check, reassembles chunked `m=`
  streams under a 320 MB ledger cap mirroring `bitty-rich`, and rejects
  oversize raw claims before allocation. Unknown keys are ignored for
  forward compatibility. This is a transmit/display routing intake, not yet a
  full command model.
- Kitty image pipeline shape exists in `crates/bitty-rich/src/`: `kitty.rs`
  (`KittyGraphicsStub`: `ingest`, `begin_chunk`, `append_chunk`), plus
  `kitty_decode.rs`, `kitty_place.rs`, `image.rs` (`ImageStore` /
  `ImagePlacement` under the accepted IMG-1 through IMG-9 ceilings),
  `background.rs` (CTX-0347: `BackgroundStore` / `BackgroundRasterCache`;
  BG ceilings alias the image-store ceilings, which is partial in-tree
  evidence for the shared-backend direction), `loader.rs` (deny-by-default
  `ResourcePolicy`), and `scene.rs` (bounded scene limits). There is **no
  sixel module** in `bitty-rich/src`: Sixel is unimplemented, as the Rich
  Presentation RFC already records.
- Present path (per the Rich Presentation RFC evidence section, not
  re-verified here): decoded bitmaps composite topmost over the grid via CPU
  blend plus wgpu blit. Negative/positive z-ordering against glyphs is
  therefore direction, not current behavior.
- Dependency direction already in effect: `Cargo.lock` contains neither
  `termwiz` nor `kitty-graphics-protocol`, and no crate manifest references
  them. The own-parser guidance above ratifies the current tree; it does not
  ask for a removal.
- Cursor opacity/color, per-platform backdrop blur, `BackdropEffect`-style
  platform abstraction, `BackgroundChanged`/`ThemeChanged` events, and the
  matugen-style plugin are **not verified** in the checkout and stay pure
  direction.

## Follow-ups (not opened as tasks here)

1. APC full-command-model coverage (delete/query/animation/put actions,
   z-index, Unicode placeholders, scroll behavior): owner is the bitty
   VT/parser track; the interception mechanism itself is verified present.
2. `bitty-graphics-protocol` extraction as an owned small layer: needs its own
   scoped task; this document only records the direction.
3. `kitty-graphics-protocol` receiver-side API check before any
   dev-dependency use; sender-side test use only until then.
4. Owning-RFC follow-ups already recorded in the Rich Presentation RFC (IMG-2
   side-cap wording, cursor-on-top, per-origin quotas, Sixel/iTerm2 adapters):
   untouched here, not duplicated as new items.
5. No new open question is admitted by this task: none of the above blocks the
   current milestone beyond already-tracked work.
