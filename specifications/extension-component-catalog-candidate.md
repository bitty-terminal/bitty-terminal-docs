---
title: Extension Composition Boundary (Candidate)
description: Terminal-platform boundary for extension UI composition, naming the corpus that owns the plugin-facing component catalog, the surfaces and budgets Core owns, and the bitty#2114 evidence state
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 75
---

# Extension Composition Boundary (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This record states a boundary, not a
> catalog: it names which terminal-platform surfaces an extension composition
> lands on, what Core owns at each of them, which budgets every composition
> inherits, and what the `bitty` implementation actually carries for
> [bitty#2114](https://github.com/bitty-terminal/bitty/issues/2114).
>
> **This record is not the extension component catalog and does not maintain
> one.** The plugin-facing catalog of reusable composition patterns — per-entry
> scene shape, style hooks, accessibility notes, caller evidence, availability,
> and headed example — lives in exactly one corpus,
> [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs)
> ([Extension Component Catalog (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/extension-component-catalog-candidate.md)).
> That placement is argued in [Corpus ownership](#corpus-ownership) below.
>
> It changes no accepted text: the [Rich Presentation RFC](rich-presentation-rfc.md)
> still owns `SceneNode` and SCN-1..SCN-5, the
> [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
> still owns the accepted `Text`/`Row`/`Column`/`List` surface and its
> exclusions, the [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)
> still owns the slot envelopes, and the [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md)
> and [Status System Specification](status-system.md) still own edge-band
> regions and status slots.

## Corpus ownership

Four documentation corpora overlap by design, and each topic has exactly one
canonical home; the others cross-link. Until this revision the five-pattern
catalog existed in two of them — here (599 lines, `category: specifications`)
and in bitty-plugins-docs (1293 lines, `category: extensibility`, plus the
deprecated [Plugin UI Component Catalog](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/ui-component-catalog-candidate.md)
that points at it). Two records with the same five entry names, the same scene
shapes, and different statements of the same caps is the duplication this
revision removes.

**Ruling: bitty-plugins-docs owns the plugin-facing extension component
catalog.** The catalog is plugin SDK material, and the owning corpus says so in
its own words:

| Evidence                                                       | Statement                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| bitty-plugins-docs `README.md`, "Scope / This repository owns" | "Plugin SDK documentation: public API surface, versioning, and compatibility." A catalog that tells a plugin author which scene shape to compose is public API guidance.                                                                             |
| bitty-plugins-docs `README.md`, "This repository does not own" | Terminal-platform documentation stays in bitty-terminal-docs; the inverse boundary is the same rule read the other way.                                                                                                                              |
| bitty-plugins-docs `extensibility/README.md`                   | The catalog is an indexed Draft row of the extensibility topic tree, beside the per-slot inventory, the Lua UI component model, cross-plugin composition, and the DevTools live view — the whole "how a plugin builds UI" topic already lives there. |
| bitty-plugins-docs catalog, per-entry fields                   | Every entry carries caller evidence at plugin `file:line`, the closed-set slot and capability it needs, and an availability verdict against the current build. Only the plugin corpus can verify plugin sources.                                     |

Two consequences follow, and they are the substance of this revision:

- **This corpus keeps the platform half.** Which surfaces and slots exist, what
  Core owns at each, the node vocabulary, the budgets every composition
  inherits, the composition rules that hold platform-wide, and the implementation
  evidence for bitty#2114. None of that is a per-pattern contract, and none of
  it is duplicated in the plugin corpus.
- **This corpus stops maintaining the pattern half.** Scene shapes, style hooks,
  per-entry caps, accessibility notes, headed examples, and caller evidence for
  `band`, `pill-row`, `tooltip-detail-fallback`, `modal-sheet`, and
  `status-strip` are removed from this record and cross-linked. The removal is
  deliberate: where the two records disagreed, this one was not automatically
  right, and the plugin corpus is the one with caller evidence.

### Why the file keeps its path

The filename stays `extension-component-catalog-candidate.md` because three
things cite the path rather than the title: the headless module's own doc
comment (`crates/bitty-lua/src/ui_catalog.rs`, "the candidate
`bitty-terminal-docs/specifications/extension-component-catalog-candidate.md`
record"), the [Lua UI Style and Layout Vocabulary (Candidate)](lua-ui-style-layout-candidate.md)
record, and the Draft row in the [specifications index](README.md). Renaming the
path would break those citations in other repositories to buy a cosmetic change;
the title and the opening paragraph carry the correction instead. Follow-up
FU-C2 records the one in-repo citation that should be reworded.

## Purpose and scope

Extensions compose UI by building scene trees by hand. The platform question is
not "what should a band look like" — that is the plugin corpus's job — but
**which surfaces such a composition can land on, what the host does with it
there, and which bounds and refusals apply to every composition regardless of
which pattern it implements.**

In scope:

- the closed slot set and the node vocabulary a composition may use;
- the style table the bridge parses and the caps it enforces, counted from code;
- what Core owns at each surface (placement, focus, modality, tokens, status);
- the composition rules that hold for any extension tree;
- the budgets a composition inherits, with the symbol that enforces each;
- the `bitty` headless composition slice as implementation evidence, including
  the bitty#2114 checkbox state.

Out of scope, with the owner named:

- the five reusable patterns, their scene shapes, style hooks, accessibility
  notes, headed examples, caller evidence, and availability — owned by
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs)
  ([Extension Component Catalog (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/extension-component-catalog-candidate.md));
- the accepted `SceneNode` schema, SCN-1..SCN-5, and the rule that presentation
  never becomes Terminal Truth (accepted, [Rich Presentation RFC](rich-presentation-rfc.md));
- the accepted v1 extension node set and slot set (accepted,
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md));
- per-slot purpose, multiplicity, and conflict resolution (candidate,
  [Plugin UI Slot Inventory](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-ui-slot-inventory-candidate.md));
- edge-band geometry, region hit-testing, and reserved thickness (candidate,
  [Chrome Band Contract](chrome-band-contract-candidate.md));
- slot envelopes and fragment composition (candidate,
  [Chrome Surface Contract](chrome-surface-contract-candidate.md));
- status modules, slots, sampling cadence, and privileged metrics (draft,
  [Status System Specification](status-system.md));
- overlay placement, focus, modality, and input capture (accepted identity and
  focus routing, [Panel Runtime RFC](panel-runtime-rfc.md); the three-owner
  boundary, [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md));
- the candidate style primitives and their precedence (draft,
  [Scene Style Primitives](scene-style-primitives-candidate.md));
- the bounded Lua composition API and host parity (open,
  [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191)).

## The composition surface

Everything below is read from `bitty` at `origin/main` `af348588`. Line numbers
are that revision's; a re-read is the only way to keep them honest.

### Slot set — closed at seven

| Fact                                                                                                     | Symbol at `af348588`                                                                                  |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Seven accepted slots, canonical order `terminal`, `top`, `bottom`, `left`, `right`, `tabline`, `overlay` | `UI_SLOTS: [&str; 7]`, `crates/bitty-lua/src/ui.rs:183`; `UiSlot::ALL`, `:143`; `enum UiSlot`, `:114` |
| Parsing is exact and case-sensitive, with no aliases                                                     | `UiSlot::parse`, `ui.rs:156`; `is_ui_slot`, `:1151`                                                   |
| `statusline` is retired and rejected, as are `status`, `workspaceline`, `tabs`, and padded spellings     | test `ui_slot_enum_is_the_closed_v1_set`, `ui.rs:1546`, bad-name list at `:1554`-`:1561`              |
| Whether a host presents an admitted slot is host policy, never a silent drop                             | `ui.rs:104` module note; `ui_slot_placement`, `crates/bitty-runtime/src/runtime/band_slots.rs:154`    |

Slot envelopes, thickness, degradation, and fragment composition stay in the
[Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md),
which carries them clause by clause against the same pin. This record cites that
table rather than restating it — a second copy is how the two drifted apart in
the first place.

### Node vocabulary — four accepted kinds, five excluded

| Fact                                                                             | Symbol at `af348588`                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Accepted v1 kinds: `Text`, `Row`, `Column`, `List`                               | `UI_V1_NODE_KINDS: [&str; 4]`, `ui.rs:209`                                           |
| Excluded, with a typed rejection: `Block`, `Image`, `CodeBlock`, `Table`, `Rule` | `UI_V1_EXCLUDED_NODE_KINDS: [&str; 5]`, `ui.rs:212`                                  |
| The node model carries no coordinate, no role, and no renderer handle            | `enum UiNode`, `ui.rs:553`; the fields are text, tokens, children, and bindings only |

The richer nine-kind vocabulary that the `terminal` slot reads is a different
surface (`crates/bitty-lua/src/ui_rich.rs`, `UI_RICH_NODE_KINDS: [&str; 9]`) and
is not available to a band, an overlay, or a catalog-style composition. A
pattern that needs `Table` or `Image` is not a band pattern; it is terminal
content.

### Style table — ten keys, counted from the parser

The bridge parses **ten** style keys. This is counted from the constant, not
read from prose, because prose in three records still says four or seven:

| Key            | Cap                                           | Symbol at `af348588`                                                                  |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `padding`      | 32 cells per side                             | `UI_STYLE_MAX_PADDING_CELLS`, `crates/bitty-lua/src/ui_style.rs:295`                  |
| `radius`       | 16 px                                         | `UI_STYLE_MAX_RADIUS_PX`, `ui_style.rs:300`                                           |
| `border`       | 16 px                                         | `UI_STYLE_MAX_BORDER_PX`, `ui_style.rs:305`                                           |
| `border_token` | 32-byte name, six-name closed set             | `UI_STYLE_MAX_NAME_BYTES`, `ui_style.rs:311`; `UiBorderToken::ALL: [Self; 6]`, `:375` |
| `min_width`    | 1000 cells                                    | `UI_STYLE_MAX_WIDTH_CELLS`, `ui_style.rs:320`                                         |
| `max_width`    | 1000 cells                                    | same constant                                                                         |
| `min_height`   | 1000 cells                                    | `UI_STYLE_MAX_HEIGHT_CELLS`, `ui_style.rs:329`                                        |
| `max_height`   | 1000 cells                                    | same constant                                                                         |
| `gap`          | 32 cells                                      | `UI_STYLE_MAX_GAP_CELLS`, `ui_style.rs:340`                                           |
| `align`        | closed three-value set `start`/`center`/`end` | `UiStyleAlign::ALL: [Self; 3]`, `ui_style.rs:440`                                     |

The closed key list itself is `UI_STYLE_FIELDS: [&str; 10]`
(`ui_style.rs:279`). Every cap is a declaration ceiling, not a clamp: one past
it is a typed refusal (`UiStyleError`, `ui_style.rs:600`-`:715`).

Two platform facts follow, and both are refusals rather than grants:

1. **The table is parsed for the rich vocabulary.** On a band, an overlay, or a
   `List`-less v1 tree the `style` key is an unknown optional key that paints
   nothing; the mount path reports it once per generation through
   `HostServices::ui_style_ignored` so the author learns it did not take effect
   (`ui.rs:60`-`:68`, bitty#3176). It is a diagnostic, never a mount failure.
2. **A styled node costs one node and one depth level**, because a non-flat
   declaration lowers to a wrapper (`UiStyle::rich_style_nodes`, `ui.rs:540`).
   A tree at the node or depth ceiling therefore cannot afford styling, which is
   a budget consequence no catalog entry can design away.

## What Core owns

Every row is a boundary a composition may not cross, and each is owned by a
record, not by this one:

| Concern                                           | Owner                                                                                                                      | Boundary in one line                                                                                                                                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Placement, thickness, and the resulting PTY inset | [Chrome Band Contract](chrome-band-contract-candidate.md), [Chrome Surface Contract](chrome-surface-contract-candidate.md) | A mount supplies no geometry; `ui_slot_placement` (`band_slots.rs:154`) decides, and a band reservation resizes the PTY rather than rendering over it.                                                                                                      |
| Slot shape admission                              | [Chrome Surface Contract](chrome-surface-contract-candidate.md)                                                            | `left`/`right` are column bands and refuse a row-shaped root (`band_scene_matches`, `band_slots.rs:241`); `tabline` mounts fail closed.                                                                                                                     |
| Focus, modality, and input capture                | [Panel Runtime RFC](panel-runtime-rfc.md), [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)         | `modal_active` is the single modal authority; overlay capacity is four non-modal plus one modal per window (`MAX_OVERLAYS_PER_WINDOW`, `crates/bitty-ui/src/panel.rs:224`); text truncates at 128 char boundaries (`MAX_OVERLAY_TEXT_LEN`, `panel.rs:225`). |
| Theme and colour tokens                           | [Theme Token Contract](theme-token-contract-candidate.md)                                                                  | A plugin names closed tokens; it never colours Core chrome or another plugin's content.                                                                                                                                                                     |
| Status modules and privileged metrics             | [Status System Specification](status-system.md)                                                                            | Modules sample off the input and render paths; a composition receives text, never a provider.                                                                                                                                                               |
| Accessibility projection                          | [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md)                                                  | Semantics is derived and read-only; every presented `SceneNode` kind maps to a role (`text`, `list`, `table`, `button`, `input`, `tablist`), chrome is out of the tab order, and nothing routes on the projection.                                          |
| Command dispatch                                  | [Input and Pointer Contract](input-pointer-rfc.md), [CLI Contract RFC](cli-contract-rfc.md)                                | A pointer interaction routes through the command registry as a validated update; presentation data never carries authority.                                                                                                                                 |

## Composition rules

These hold for any extension tree on any slot, which is why they belong to the
terminal platform rather than to one pattern:

1. **Presentation is never Terminal Truth.** A composition alters presentation
   only: no grid cell, cursor position, mode, scrollback, attachment, or IPC
   policy. Accepted, [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
   invariants 3 and 4.
2. **No hot-path execution.** Composition happens when a host validates or
   mounts a contribution, never per frame, keystroke, PTY read, VT parse, or
   damage computation.
3. **No new authority in data.** A node carries text, closed tokens, children,
   and a command binding with a region identity. It never carries a coordinate,
   a renderer handle, a shader, a path, an image, a focus request, or a
   capability (`enum UiNode`, `ui.rs:553`; command, argument, token, and
   region-id caps at `ui.rs:236`-`:263`).
4. **Declared order is render order.** Regions, siblings, and list items keep
   declaration order; nothing sorts, deduplicates, evicts, or samples a clock.
   The host's own exception — per-edge band fragments sorting by plugin id
   (`band_slots.rs:341`) — is a host policy that contradicts the fragment rule
   and is tracked in the Chrome Surface Contract as S-24, not a licence for a
   composition to sort.
5. **Fail closed, never degrade silently.** An unknown kind, an over-cap tree, an
   unsupported slot, or a missing capability is a typed refusal with nothing
   mounted (`E_UI_COMPONENT_INVALID`, `E_UI_CLAIM_REQUIRED`,
   `unsupported_slot_error`, `band_slots.rs:268`). There is no clamp,
   truncation, best-effort render, or "store but do not paint" path.
6. **Caps are inherited, not invented.** A composition adds no ceiling and
   widens none; the budgets below apply to the mounted tree whatever produced
   it.
7. **Unused paths are byte-identical.** A tree that declares no extension
   construct composes exactly the bytes it composed before the construct
   existed.
8. **Accessibility is not optional and not a second state.** Ordained by
   [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md):
   every kind has a role, reading order is composition order, and no state may
   be conveyed by colour, emphasis, or position alone.

## Inherited budgets

| Budget                               | Bound                                      | Enforced at `af348588`                                                                                | Accepted source                                              |
| ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Nodes per mounted component          | 2048                                       | `UI_MAX_NODES`, `ui.rs:218`; `check_scene_bounds`, `ui_catalog.rs:508`                                | SCN-1, [Rich Presentation RFC](rich-presentation-rfc.md):585 |
| Tree depth per block                 | 32 accepted, **16 for the v1 bridge**      | `UI_MAX_DEPTH`, `ui.rs:215` (CSN-2 is 32; the bridge is deliberately stricter, `ui.rs:80`-`:88`)      | SCN-2; bridge `CTX-0428`                                     |
| Text bytes per component             | 256 KiB                                    | `UI_MAX_TEXT_BYTES`, `ui.rs:221`                                                                      | SCN-3, `rich-presentation-rfc.md`:587                        |
| Retained string bytes per generation | 2 MiB                                      | `UI_MAX_AGGREGATED_TEXT_BYTES`, `ui.rs:233` — charges every retained string, not only text (CTX-1340) | SCN-4, `rich-presentation-rfc.md`:588                        |
| Blocks per plugin generation         | 64                                         | `UI_MAX_BLOCKS`, `ui.rs:225`                                                                          | SCN-5, `rich-presentation-rfc.md`:589                        |
| Click command identifier             | 64 bytes                                   | `UI_CLICK_MAX_COMMAND_BYTES`, `ui.rs:236`                                                             | —                                                            |
| Click arguments                      | 16 entries, 256-byte strings, 64-byte keys | `UI_CLICK_MAX_ARGS`, `:239`; `UI_CLICK_MAX_ARG_BYTES`, `:242`; `UI_CLICK_MAX_ARG_KEY_BYTES`, `:251`   | —                                                            |
| Theme token name                     | 32 bytes                                   | `UI_MAX_THEME_TOKEN_BYTES`, `ui.rs:254`                                                               | —                                                            |
| Hover queue                          | 8 events                                   | `UI_HOVER_QUEUE_MAX`, `ui.rs:323`                                                                     | —                                                            |

SCN-4 and SCN-5 are accepted per terminal; the bridge enforces the same numbers
per plugin generation, which is a strict subset. Terminal-wide aggregation across
generations is owned by the host composer and is outside this boundary.

## Implementation evidence: the headless composition slice

`bitty` carries a headless module for bitty#2114 at
`crates/bitty-lua/src/ui_catalog.rs` (1973 lines including its suite, `CTX-1416`).
It is evidence of work done, not of a contract, and this record does not
transcribe its per-entry content — the plugin-facing entries are
[bitty-plugins-docs' catalog](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/extension-component-catalog-candidate.md).
What the terminal platform can state about it:

| Fact                                                                                                                        | Symbol at `af348588`                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Five declaration names exist as a closed enum: `band`, `pill-row`, `tooltip-detail-fallback`, `modal-sheet`, `status-strip` | `CatalogEntry`, `ui_catalog.rs:139`; `CatalogEntry::ALL: [Self; 5]`, `:154`; `parse`, `:179`                                                                                                                                                                                                                                                                                     |
| Typed descriptors hold the declaration as data                                                                              | `CatalogBlock`, `ui_catalog.rs:292`; `StripDescriptor`, `:221`; `PillRowDescriptor`, `:261`; `DetailFallbackDescriptor`, `:268`; `ModalSheetDescriptor`, `:275`                                                                                                                                                                                                                  |
| Composition emits accepted kinds only                                                                                       | `compose`, `ui_catalog.rs:325`; `compose_strip`, `:565`; `compose_pill_row`, `:590`; `compose_modal_sheet`, `:604`                                                                                                                                                                                                                                                               |
| Recognition re-parses the canonical shape and refuses decoration                                                            | `from_scene`, `ui_catalog.rs:352`; `verify`, `:401`; `strip_from_scene`, `:735`; `pill_row_from_scene`, `:808`; `modal_sheet_from_scene`, `:835`                                                                                                                                                                                                                                 |
| Validation is typed and fail-closed                                                                                         | `validate`, `ui_catalog.rs:412`; `validate_strip`, `:424`; `validate_pill_row`, `:448`; `validate_modal_sheet`, `:469`; `CatalogError`                                                                                                                                                                                                                                           |
| Bounds reuse the bridge constants rather than inventing a ceiling                                                           | `CATALOG_MAX_TEXT_BYTES = UI_MAX_TEXT_BYTES`, `CATALOG_MAX_NODES = UI_MAX_NODES`, `CATALOG_MAX_DEPTH = UI_MAX_DEPTH`, `ui_catalog.rs:117`-`:123`; the item caps (`CATALOG_MAX_SEGMENTS`, `CATALOG_MAX_PILLS`, `CATALOG_MAX_ROWS` at `64`; `CATALOG_MAX_PILL_LABEL_BYTES` at `32`; `CATALOG_MAX_DETAIL_BYTES` at `128`) are module-local candidate constants, not accepted bounds |

**No production consumer exists.** `ui_catalog` is reachable only through the
crate's own module list and re-export (`crates/bitty-lua/src/lib.rs:87`,
`:138`-`:146`); a grep of `crates/` outside `bitty-lua/src/ui_catalog.rs` finds
no `CatalogBlock` use at all, and the `CatalogEntry` hits elsewhere in the tree
are the unrelated `CommandCatalogEntry` command registry type
(`crates/bitty-lua/src/host.rs:3534`). No host path, band host, overlay path,
bridge call, render loop, or Lua surface installs, composes, or paints these
descriptors, and no plugin can opt in.

## bitty#2114 status

[bitty#2114](https://github.com/bitty-terminal/bitty/issues/2114) carries three
checkboxes. Read against `af348588`:

| #   | Checkbox                                                                                                          | Verdict                                        | What proves it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Catalog the reusable patterns (band, pill row, tooltip/detail fallback, modal sheet, status strip) with contracts | **Landed** (as a draft, single-corpus catalog) | The five patterns are catalogued once, with a per-entry contract block, in bitty-plugins-docs `extensibility/extension-component-catalog-candidate.md` (`## E-1`..`## E-5`); the five declaration names exist in code as `CatalogEntry::ALL: [Self; 5]` (`ui_catalog.rs:154`). This revision removed the competing copy from this corpus. Neither copy is an accepted contract, which is what "with contracts" can mean today.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2   | Each catalog entry: Scene shape, style hooks (post style-primitives), accessibility notes, headed example         | **Partial** — two of four landed               | Scene shape: `compose_strip` / `compose_pill_row` / `compose_modal_sheet` (`ui_catalog.rs:565`, `:590`, `:604`) with `from_scene` (`:352`) as the recognizer, and the shapes described per entry in the plugin corpus. Accessibility notes: [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) required-mapping table plus per-entry notes in the plugin corpus; the code side adds no role — `enum UiNode` has no role field (`ui.rs:553`). **Style hooks did not land**: the catalog descriptors carry no style field, and the ten-key table is parsed for the rich vocabulary only (`UI_STYLE_FIELDS`, `ui_style.rs:279`; band/overlay drop `style` with `ui_style_ignored`). **Headed example did not land**: there is no screenshot, run log, or headed lane for any entry; the plugin corpus states the same absence. |
| 3   | Bar migrated onto catalog entries (dogfood proof)                                                                 | **Not landed**                                 | No consumer: see the grep result above (`lib.rs:87`, `:138`-`:146` are the only references). The bar is `plugins/bar` in `bitty-plugins`, and no Lua source there composes a catalog entry; the plugin corpus records the same residual ("the bar still hand-rolls every pattern it is cited for"). A dogfood needs a plugin-facing surface first, and no surface exists — the descriptors are host-side Rust with no Lua binding.                                                                                                                                                                                                                                                                                                                                                                                                                 |

The honest summary: checkbox 1 is satisfied by documentation in the owning
corpus; checkbox 2 is satisfied for shape and accessibility and open for style
hooks and headed evidence; checkbox 3 is untouched and cannot be closed from a
documentation repository.

## Affected contracts

- [Rich Presentation RFC](rich-presentation-rfc.md) — unchanged. No
  `SceneNode` variant, no SCN bound moves.
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
  — unchanged. No slot, capability, error code, or Lua key is added.
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md) —
  owns the slot envelopes this record cites; its S-24 and S-25 remain its own
  findings.
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md) —
  unchanged; supplies the role mapping every composition inherits.
- [Lua UI Style and Layout Vocabulary (Candidate)](lua-ui-style-layout-candidate.md)
  — unchanged in substance; its bitty#2114 consequence paragraph now points at
  the plugin corpus for the per-entry hook statements it cites.
- [Extension Component Catalog (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/extension-component-catalog-candidate.md)
  — **the owner of the plugin-facing catalog.** This record defers to it and
  duplicates none of it.
- [Plugin UI Slot Inventory](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-ui-slot-inventory-candidate.md)
  — unchanged; per-slot purpose and multiplicity are its subject.

## Follow-ups

Named so they can be scheduled rather than remembered. All of them are changes
in other repositories and are out of scope for this revision.

1. **FU-C1 — bitty-plugins-docs: re-pin and re-count the style table.**
   Path: `bitty-plugins-docs/extensibility/extension-component-catalog-candidate.md`.
   Its status block, its style-table row, its per-entry style-hook statements
   (E-1..E-5), and residual 11 all describe the bridge as parsing **seven**
   style keys at `bitty@90deb814` (`UI_STYLE_FIELDS: [&str; 7]`). At
   `bitty@af348588` the constant is `UI_STYLE_FIELDS: [&str; 10]`
   (`crates/bitty-lua/src/ui_style.rs:279`): `min_height`, `max_height`, and
   `align` exist, and the caps are `32`/`16`/`16`/`32`-byte name/`1000`/`1000`/
   `1000`/`1000`/`32`. The sibling record in this corpus already carries the
   ten-key count, so the two corpora currently disagree about the same symbol.
2. **FU-C1 (continued) — bitty-plugins-docs: state the ownership split.**
   Same path: add one line naming
   `bitty-terminal-docs/specifications/extension-component-catalog-candidate.md`
   as the owner of the composition boundary, slot envelopes, and inherited
   budgets, so its entries cite that boundary instead of restating caps.
   `bitty-plugins-docs/extensibility/ui-component-catalog-candidate.md` needs no
   change: its deprecated-pointer table already resolves to the maintained
   record.
3. **FU-C2 — `bitty`: reword one citation.** Path:
   `crates/bitty-lua/src/ui_catalog.rs` module doc (and the matching line in
   `crates/bitty-lua/src/lib.rs:21`) still calls this record "the candidate
   record" it implements. After this revision the entry contracts live in the
   plugin corpus, so the module doc should cite the plugin-facing catalog for
   entry semantics and this record for the boundary and budgets. Until that
   lands the citation is stale but not wrong: the path resolves to a record that
   still describes the slice.

## Open points

1. **Whether a host-side typed catalog is ever accepted.** The descriptors are
   candidate Rust data with no Lua binding. If a successor wants an accepted
   mechanism, the contract belongs to this corpus (terminal platform) and must be
   proposed and reviewed here; the plugin corpus documents patterns, not
   mechanisms.
2. **Where the per-pattern bounds live.** The item caps in the slice (`64`
   segments, `64` pills, `64` rows, `64`-byte segment text, `32`-byte pill
   label, `128`-byte detail) are module constants. Whether they become an
   accepted bound, and in which corpus, is undecided; the accepted budgets above
   are not affected either way.
3. **Lua surface.** Whether a plugin may name an entry and supply bounded fields,
   and which capability and API version would carry it. No surface is defined
   here or in the plugin corpus.
4. **Style hooks.** Blocked on the style-primitives acceptance and on the band
   path consuming the table at all; a hook is meaningless while `style` paints
   only on the rich vocabulary.
5. **Headed evidence.** No screenshot, pixel, or live-host artifact exists for
   any entry. Nothing in either corpus should be read as headed-verified.
6. **Dogfood vehicle.** The bar migration needs an accepted plugin-facing
   surface plus headed proof in `bitty-plugins`; neither exists.

## P0 Review Sign-off

| Reviewer role          | Verdict | Evidence |
| ---------------------- | ------- | -------- |
| UI/architecture owner  | Pending | —        |
| Security reviewer      | Pending | —        |
| Docs curator           | Pending | —        |
| Plugin ecosystem owner | Pending | —        |

## References

- [Rich Presentation RFC](rich-presentation-rfc.md)
- [Chrome Surface Contract (Candidate)](chrome-surface-contract-candidate.md)
- [Chrome Band Contract (Candidate)](chrome-band-contract-candidate.md)
- [Accessibility Baseline (Candidate)](accessibility-baseline-candidate.md)
- [Scene Style Primitives (Candidate)](scene-style-primitives-candidate.md)
- [Lua UI Style and Layout Vocabulary (Candidate)](lua-ui-style-layout-candidate.md)
- [Overlay Ownership Reconciliation](overlay-ownership-reconciliation.md)
- [Panel Runtime RFC](panel-runtime-rfc.md)
- [Status System Specification](status-system.md)
- [UI Runtime Candidate](ui-runtime-candidate.md)
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
- [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md)
- [Extension Component Catalog (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/extension-component-catalog-candidate.md)
  — the plugin-facing catalog, owned by bitty-plugins-docs
- [Plugin UI Slot Inventory](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/extensibility/plugin-ui-slot-inventory-candidate.md)
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md)
- [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md)
- [bitty#2114](https://github.com/bitty-terminal/bitty/issues/2114)
- [bitty#2191](https://github.com/bitty-terminal/bitty/issues/2191)
