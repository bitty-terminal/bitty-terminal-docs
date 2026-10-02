---
title: Search, Selection, and Snapshots Contract
description: Draft terminal-side contract for bounded search selection snapshots stable identity viewport navigation result coalescing clipboard permission and the focusable-overlay input-capture dependency
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: true
sidebar_order: 70
---

# Search, Selection, and Snapshots Contract

## Document status

This is the terminal-side contract that Core and extension tasks cite for the
search, selection, and snapshot mechanisms owned by plan key `W-135`. It states
the bounded snapshot surface a plugin may read, stable target and result
identity, the viewport navigation interface, result coalescing, the selection
semantics and clipboard permission Core retains, the bounded search Core
retains, and the dependency on the not-yet-decided focusable-overlay and
transient input-capture host API. It does not start, schedule, or authorize
implementation, and it does not authorize extraction.

The contract depends on the `W-01` focusable-overlay and transient
input-capture host API ([Issue #396](https://github.com/bitty-terminal/bitty-docs/issues/396),
under `OQ-056`); this page references that dependency and does not decide it.
`OQ-074` (scrollback search UX) and `OQ-075` (keyboard-selection and copy mode)
remain **Open**; this draft is owner-pending input and closes neither question.

- Owning task: `W-135` (bitty-terminal-docs), CarryCtx `CTX-0091`, Issue
  [bitty-terminal-docs#168](https://github.com/bitty-terminal/bitty-terminal-docs/issues/168).
- Predecessor decisions: [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  (retained Terminal Truth, permission, and the bootstrap fence) and
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md),
  which records that search and selection are **not** a `W-130` boundary and are
  owned by `W-135` with prerequisites `W-01` and `OQ-074`/`OQ-075`.
- Host dependency: the `W-01` focusable-overlay and transient input-capture host
  API, co-owned with the [Composer Architecture and Host API](composer-architecture.md)
  and [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md).
- Cross-session map:
  [Small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md),
  plan keys `W-135`, `W-138`, `W-139`, `W-143`, `W-144`.

## Purpose and scope

Core already keeps a bounded, headless search over Terminal Truth and a
presentation-layer selection model, but the accepted corpus leaves the search
and copy-mode **UX** contract open (`OQ-074`, `OQ-075`). ADR 0016 records that
`W-135` (this page) and `W-138` (bitty-plugins-docs) own the search and copy-mode
mechanisms and policy, with prerequisites `W-01` and the two open questions.
This page fixes the terminal-side mechanism boundary and the exact surface the
search and copy-mode extension consumes, so the Core integration, the SDK
binding, and the plugin package can be built against one reviewed contract
without re-deciding where the trust boundary sits.

In scope:

- the bounded, read-only snapshot or projection surface a plugin may read, its
  per-view scope, its finite bounds, and the stable identity a snapshot target
  carries;
- the viewport navigation interface and result coalescing rules;
- the selection semantics Core retains (anchor and range, word, line, and
  rectangular block, normalization, snapping, reclamp, and pruning truncation)
  and the clipboard permission control Core retains;
- the bounded search Core retains over Terminal Truth, the presentation and
  policy the extension owns, search result identity and match highlighting, and
  stale-result handling;
- the dependency on the `W-01` focusable-overlay and transient input-capture
  host API, referenced but not decided;
- an explicit statement of what Core retains, a security review, a verification
  plan with negative-path evidence, alternatives, affected contracts, open
  points, acceptance criteria, and P0 sign-off.

Out of scope and owned elsewhere:

- the exact `W-01` host primitive spellings, capture event payloads, focus-order
  rules, and timeout values; this page marks the search/copy-mode-facing host
  operations it needs as provisional until `W-01` accepts its contract;
- the search/copy-mode plugin package, page set, keybinding namespace, result
  presentation, and case or regex policy (`CTX-0003`, `W-138`); this page names
  the owner and decides no content of that policy;
- the Core integration that consumes the extension (`W-143` `CTX-0936` and
  `W-144` `CTX-0937`);
- the SDK binding for the snapshot, search, selection, and clipboard host
  operations (`W-139` `CTX-0066`);
- IME capture, pointer capture, and the Leader or chord namespace, which stay
  with their owning input contracts;
- the renderer's scene composition and present path, owned by the accepted
  [Rich Presentation RFC](rich-presentation-rfc.md) and the scene contracts.

## Normative sources this specification must not weaken

This contract must be read together with, and must not weaken:

- The bitty-docs security corpus:
  [security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md).
  The binding controls include suspicious paste inspection (`P0-AC-008`),
  deny-by-default local files (`P0-AC-005`), hyperlink and process launch
  without shell interpolation (`P0-AC-009`), capability-checked host APIs and
  official-plugin parity (`P0-AC-012`), per-plugin resource budgets
  (`P0-AC-014`), exclusion from the input, parser, and render hot paths
  (`P0-AC-015`), Core-owned Terminal Truth (`P0-AC-016`), safe mode
  (`P0-AC-019`), trace minimization (`P0-AC-026`), and the panel lease write
  gate (`P0-AC-039`).
- [ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md):
  Terminal Truth and permission are retained, there is no private first-party
  bypass, no raw PTY, GPU, or window handle, and no input hot-path callback.
- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md):
  volatile Terminal Truth includes the in-memory scrollback behind `PageUp`,
  wheel, and search; search and selection are not a `W-130` boundary; `W-135`
  and `W-138` stay gated on `W-01` and `OQ-074`/`OQ-075`.
- The accepted [Terminal State RFC](terminal-state-rfc.md): parser-to-action-to-
  state is the only write path into Terminal Truth, and damage and snapshot
  rules apply.
- The draft [Input and Pointer Contract](input-pointer-rfc.md): the selection
  model, owner resolution, drag confinement, lifecycle, copy and paste, the
  `R-004` boundary, `CLIPBOARD_MAX_BYTES=8192`, hot-path exclusion, and the
  observation and interception limits this page composes with.
- The accepted [Composer Architecture and Host API](composer-architecture.md):
  the consumer shape of the `W-01` focusable-overlay and transient input-capture
  host API, the capture lifecycle states, and the typed-outcome and
  hot-path-exclusion rules.
- The draft [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md):
  transient input capture is an existing Core host mechanism, generation-fenced,
  revocable, and never a plugin callback on the input hot path.
- The accepted [Workspace Compositor Specification](workspace-compositor.md):
  the identity hierarchy `PanelId != ViewId != TerminalId` and the rule that a
  projection or read path never becomes a cross-panel read path.
- The accepted [Performance Budget RFC](performance-budget-rfc.md): `PB-4`
  input latency and the invariant that plugins do not enter the input hot path.
- The accepted plugin-ecosystem contracts that bound any extension packaging:
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md),
  and the
  [manifest and capability grammar](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/manifest-capability-authority.md).
- The accepted [Compatibility Milestone RFC](compatibility-milestone-rfc.md):
  the mouse modes, focus reporting, alternate scroll, and bracketed paste the
  copy and search interactions must not change.

## Terminology

| Term                 | Meaning in this document                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core                 | The always-available terminal mechanism that works with zero plugins and in `bitty --safe`; it owns Terminal Truth, permission, and resource enforcement.                                 |
| Extension            | Optional behavior delivered through a public, versioned, capability-gated interface, whether a Lua plugin or a Rust-level component; first-party and third-party use the same interfaces. |
| Terminal Truth       | Parser state, grid semantics, cursor state, modes, and canonical scrollback; mutable only by Core.                                                                                        |
| Snapshot             | A bounded, read-only, cold-path projection of one owning view's Terminal Truth, copied out for an extension; never a mutable handle into the grid.                                        |
| Stable identity      | A reference to content that survives scroll, resize, reflow, and pruning by pairing an owning view with a stable line id when available, plus a generation.                               |
| Line identity        | The Core-assigned stable id for a scrollback line, used in place of a raw row number that shifts under reflow.                                                                            |
| Generation           | A monotonic stamp attached to a snapshot, result, or capture handle so a stale reference is rejected by Core rather than trusted from the caller.                                         |
| Selection            | A presentation-layer range over grid cells; not terminal state.                                                                                                                           |
| Selection semantics  | Core's anchor and focus range, word, line, and rectangular block expansion, normalization, snapping, reclamp, and pruning truncation rules.                                               |
| Clipboard permission | The Core capability and consent gate around clipboard read and write, distinct from a direct trusted user copy gesture.                                                                   |
| Search result        | One bounded match returned by Core search, carrying a stable identity, a column span, and the matched text.                                                                               |
| Match highlighting   | A presentation-only projection that paints search results over the owning view's grid without changing content geometry or Terminal Truth.                                                |
| Result coalescing    | The bounded, order-preserving replacement of a view's result set on refresh, never an unbounded append of stale matches.                                                                  |
| Stale result         | A result or anchor whose line identity, view, or generation no longer resolves to live content.                                                                                           |
| Viewport navigation  | A Core-owned scroll-window move that brings a target into view; it changes the view offset, never Terminal Truth, and writes no PTY bytes.                                                |
| Input capture        | The capability-gated Core host mechanism that takes exclusive keyboard and overlay focus for one UI interaction, transiently and revocably.                                               |
| Typed outcome        | A structured result (success, denied, stale, timeout, unavailable) that names the missing capability or violated rule on denial, never a bare boolean.                                    |
| Safe mode            | `bitty --safe`, which starts with zero third-party plugins and no optional policy; Core search and selection remain usable.                                                               |
| No-plugin mode       | The startup and runtime state in which the search/copy-mode extension is absent, disabled, failed, or incompatible; the retained Core behavior applies.                                   |

## Snapshot surface and stable identity

The extension reads Terminal Truth only through a **bounded, read-only
snapshot**: a copy of the owning view's ordered buffer and cell geometry, not a
live handle, pointer, or mutation path. A snapshot is a projection; it can never
write and can never become a second state.

- **What is exposed.** For one owning view, a snapshot may expose the ordered
  combined buffer of retained scrollback followed by the live grid; per-row text
  with lead columns and wide-character widths; the view's rows, columns, and
  column window; the owning `ViewId` and its attached terminal identity; and,
  for a search or selection target, the stable identity, column span, and
  matched text. Nothing else in Terminal Truth, and no other view's content, is
  exposed.
- **Scope is per view.** A snapshot is always scoped to exactly one owning view
  and its attached terminal. There is no window-wide, workspace-wide, or
  cross-panel snapshot: reading another view's content is a cross-panel read
  path and is refused fail-closed with a typed outcome. This matches the
  accepted rule that exposing one panel's content must not become a cross-panel
  read path for plugins.
- **Bounds are finite and enforced before allocation.** A pattern is truncated
  at a char boundary at `SEARCH_MAX_PATTERN_LEN` (`256` bytes); results are
  clamped to `SEARCH_MAX_RESULTS` (`1000`); a snapshot's row count is bounded by
  the retained scrollback plus live grid, and its per-row text and total
  serialized size are bounded. An over-bound request is denied or truncated
  under one documented rule; it never grows without bound and never allocates
  the refused bytes. These values are reviewed Core-internal evidence, not
  accepted ceilings; the binding requirement is that a finite bound exists and
  is enforced before the implementation lands.
- **Stable identity, not raw rows.** A target or result is identified by its
  owning view, its stable scrollback line id when it lives in history (or its
  live buffer row inside the owned grid otherwise), its column span, and a
  generation. A raw viewport row is never the identity because resize and reflow
  shift rows. When a line is pruned, replaced, or moved into history, its
  identity fails closed rather than resolving to unrelated content.
- **Generation fencing.** Every snapshot, result, and capture reference carries
  a generation. Core rejects a stale reference itself instead of trusting the
  caller; a re-registered or recycled identity stales prior references. A
  generation mismatch is a typed `Stale` outcome, never a silent retarget.

### Viewport navigation interface

Navigation is a Core-owned presentation operation on the owning view's scroll
window. The extension requests a move; Core clamps it and performs it.

- Navigation targets a result or anchor by stable identity within one owning
  view. Core scrolls that view so the target becomes visible, using the same row
  translation that hit testing and highlight painting use.
- Navigation never mutates Terminal Truth, writes no PTY bytes, and never
  changes content geometry; it only changes the view offset.
- Navigation may synchronize a Core-owned selection to the target so a
  subsequent user copy acts on it. The selection it drives is owned by the bound
  view and follows the accepted selection lifecycle.
- A navigation request whose owning view no longer resolves to a live grid, or
  whose target identity is stale, fails closed: no jump, no retarget, and no
  content read. Navigation is available at all times and cannot pin input.

### Result coalescing

Repeated queries and refreshes coalesce into exactly one bounded,
order-preserving result set per owning view.

- A refresh **replaces** the set; it does not append. Order is deterministic
  (oldest retained scrollback first), so two runs over the same revision and
  input produce the same set.
- A coalesced batch is bounded by the finite result and highlight limits; an
  over-limit request is rejected or truncated under one documented rule.
- Coalescing merges only results of the same generation; a stale result is
  discarded, never merged into a live set.
- A refresh is triggered by the owning view's own grid changes; output on
  another view's grid never refreshes a bound result set.

## Selection semantics

Core retains selection semantics. The extension may present and drive a
selection, but it never owns the rules and never mutates Terminal Truth.

- **Kinds.** Selection has the accepted modes `Simple` (stream or range),
  `Word`, `Line`, and rectangular `Block`. Mode is chosen by the gesture policy
  (for example click count or a modifier), which the extension may drive; the
  expansion and text-extraction rules stay Core-owned.
- **Anchor, focus, normalization.** A selection is stored as an anchor and a
  focus plus its kind and active flag. Normalization orders the endpoints; word,
  line, and block expansion resolve against the owner's grid, and wide
  characters are snapped so a pair is never split. Invalid or out-of-order
  ranges are normalized, not trusted.
- **Stability.** A selection intended to persist is anchored in combined-buffer
  coordinates with optional stable line ids for scrollback endpoints. Resize
  reclamps it; scrollback pruning truncates or invalidates it; a grid erase on
  the owner's grid drops it, and an erase on another grid does not.
- **Single owner.** At most one live selection exists, owned by exactly one view.
  A selection without an owner is not representable. Starting a selection in
  another view replaces the live one.
- **Clipboard permission control.** Copy and paste stay behind Core's permission
  and consent gate. A plugin-initiated clipboard read or write is
  capability-gated and attributed; a direct user copy is a trusted user gesture.
  Copied content is exactly the selected text, bounded by
  `CLIPBOARD_MAX_BYTES=8192` with char-boundary truncation and a `truncated`
  flag, and paste passes the authoritative suspicious-paste inspector and the
  bracketed-paste framing. OSC 52 read remains deny-by-default and write remains
  gated. The extension cannot bypass the gate, the inspector, or the bound.
- **No Terminal Truth mutation.** A selection is presentation state. It never
  writes the grid, cursor, modes, scrollback, or a semantic zone, and no
  selection ever becomes persisted terminal content.

This page does not redefine the accepted selection model; it fixes only the
mechanism-versus-policy split and the rules an extension must respect.

## Search

Core retains bounded search over Terminal Truth. The extension owns the UX.

- **Core-retained search.** Search is a pure function of `(State, pattern,
options)`: no I/O, no wall-clock, and no platform variance. It is bounded on
  pattern length and result count, deterministic in ordering, ASCII
  case-folding only when case-insensitive (so the match offset to column mapping
  stays stable), and never panics on empty or truncated input. Search covers the
  live grid and retained scrollback, so folded or hidden presentation content is
  still searched.
- **Extension-owned policy.** The extension owns the input UI (the search field
  or overlay), the presentation of results, the navigation keybindings, the
  keybinding namespace, case and regex scope policy, and the interaction with
  selection persistence. These are policy over the Core mechanism, not Core
  features, and they are decided by `CTX-0003` and `W-138`, not here.
- **Result identity.** A search result is one match carrying its owning view, a
  stable line id when in scrollback or a live buffer row otherwise, an inclusive
  column span, the matched text, and a generation. Results are ordered oldest
  retained scrollback first.
- **Match highlighting.** Highlighting is a presentation-only projection over
  the owning view's grid, coordinates clipped to the view's column window and
  translated by the same row mapping as hit testing. It paints only inside the
  owner's content frame, distinguishes the current navigated match from the
  remaining matches, changes no content geometry, and writes no Terminal Truth.
  A highlight whose owner no longer resolves to a live grid is not painted.
- **Stale-result handling.** A result set is invalidated or refreshed on the
  owning view's scroll, resize or reflow, scrollback prune, grid erase, or grid
  replacement, and when the bound view leaves the active layout. A stale
  navigation or copy target fails closed: no jump, no content read, and no stale
  highlight lingers. On refresh the set is replaced, not appended; no result
  from a prior generation survives.
- **No hot path.** Search and snapshot collection run off the input, parser, and
  render hot paths, and never invoke a plugin callback on the input path.

## Input capture dependency

Search and copy mode require the `W-01` focusable-overlay and transient
input-capture host API. This page **depends on** that contract and does not
decide it.

- The `W-01` host API is the `bitty-docs` contract for a capability-gated Core
  host mechanism a plugin claims to take exclusive keyboard and overlay focus
  for the duration of one UI interaction
  ([Issue #396](https://github.com/bitty-terminal/bitty-docs/issues/396), under
  `OQ-056`). Its primitive spellings, capture payloads, focus-order rules, and
  timeout values are co-owned and marked provisional here until `W-01` accepts
  them.
- The constraints this page composes with, without redefining them: capture is
  capability-gated, transient, bounded, and revocable on cancel, submit, focus
  switch, plugin unload, plugin crash, and Core-side timeout; it never places a
  plugin callback on the input hot path; it is Core-owned and can never pin
  input; and it opens no second input channel beyond the accepted input-pointer
  and IME direction.
- The reviewed Core-internal search and copy mode are **not** this host API.
  They are Core-internal modal routing above the user keymap and are
  `Implemented-only` evidence; the public focusable-overlay and
  transient-capture surface does not exist yet, exactly as recorded for the
  Composer.
- Until `W-01` lands, Core keeps its internal search and copy mode usable with
  zero plugins and in `bitty --safe`.

## What Core retains

| Retained mechanism      | Contract                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Bounded search          | Own deterministic, headless, bounded search over Terminal Truth; pattern and result caps; ASCII case folding; no panic on truncated input. |
| Selection semantics     | Own range, word, line, and rectangular block rules, normalization, wide-char snapping, resize reclamp, and pruning truncation.             |
| Clipboard permission    | Own the capability and consent gate, the `8192`-byte bound, the paste inspector, OSC 52 read denial, and write gating.                     |
| Terminal Truth          | Keep the grid, cursor, modes, and canonical scrollback mutable only by Core; snapshots, search, selection, and highlights never write it.  |
| Snapshot projection     | Produce the bounded per-view read-only projection; deny cross-panel and cross-view reads; expose no mutable grid handle.                   |
| Viewport and navigation | Own the scroll window, the shared row translation, clamp and fail closed on a stale target or missing grid.                                |
| Identity and generation | Own stable line ids and generation stamps; reject stale snapshot, result, selection, and capture references itself.                        |
| Capability and budgets  | Grant, revoke, attribute, and bound every extension operation; enforce per-plugin budgets; support safe mode.                              |
| Hot-path exclusion      | Never run search, snapshot collection, or an extension callback on the input, parser, or render hot path.                                  |

No private first-party bypass is introduced. The first-party search/copy-mode
extension reaches Core only through the same public, capability-gated contract a
third-party extension uses.

## Current implementation status

No part of this contract is implemented as an extension or as the public host
API. There is no focusable overlay, no transient input-capture host API, and no
SDK binding; `OQ-074` and `OQ-075` remain Open. The reviewed Core-internal
behavior below is `Implemented-only` evidence read from the workspace `bitty`
checkout at short revision `5670d9ae` (2026-10-02, `main`) and is bounded to
source inspection; it is not `Verified`, not `Compatible`, not the extension,
and not the host API.

- Bounded search: `crates/bitty-term-state/src/search.rs` provides
  `State::search`, `SearchOptions`, `SearchMatch`, `SEARCH_MAX_PATTERN_LEN`
  (`256`), and `SEARCH_MAX_RESULTS` (`1000`); `SearchMatch` carries `buffer_row`,
  an optional scrollback `line_id`, `col_start`, `col_end`, and the matched text.
- Search UI state: `crates/bitty-ui/src/search.rs` provides `SearchState`,
  `SearchHighlight`, `visible_highlights`, `scroll_to_current`, and the
  `PersistentSelection` integration.
- Selection: `crates/bitty-ui/src/selection.rs` provides `Selection`,
  `SelectionKind` (`Simple`/`Word`/`Line`/`Block`), `SelectionRange`, and the
  buffer-anchored `PersistentSelection` with `anchor_line_id`/`focus_line_id`
  and `normalized`/`snapped`/`clamped`/`text`; the runtime constructs `Simple`,
  `Word`, `Line`, and `Block` today (mouse click-count and Alt, plus the
  copy-mode visual selection).
- Runtime binding and navigation: `crates/bitty-runtime/src/runtime/search.rs`
  and `search_mode.rs` bind a search to one focused view (`search_view`),
  open fail-closed when the leaf has no live grid, consume keys with no PTY
  bytes while modal, and stay mutually exclusive with copy mode.
- Copy mode: `crates/bitty-runtime/src/runtime/copy_mode.rs` provides
  `CopyModeState`, `copy_mode_visual_kind`, and `copy_mode_yank`.
- Selection lifecycle and clipboard: `crates/bitty-runtime/src/runtime/selection.rs`
  owns the single-owner selection state, the view-bound lifecycle funnels, and
  the capability-gated clipboard write and primary paths.
- Headless tests exist under `crates/bitty-runtime/tests/`
  (`search_overlay.rs`, `copy_search_view_bound.rs`,
  `scrollback_search_selection_persistence.rs`, `selection_clipboard.rs`,
  `selection_view_owned.rs`, `search_overlay.rs`); passing tests are parity
  evidence for the mechanic, not acceptance of this contract.

Contract versus the reviewed Core-internal behavior (gaps the host-API and
extraction tasks must close; none weakens a control and none is authorization):

- There is no snapshot surface, no generation-stamped result handle, and no
  public navigation or clipboard host operation; these are Core-internal
  mechanics, not the typed host outcomes this contract requires.
- Search and copy mode consume keys through Core-internal modal routing rather
  than the `W-01` capture API, so capture acquisition, release, and crash
  guarantees are not yet the public host contract.
- Cross-panel denial is enforced today by view binding and fail-closed grid
  resolution, not by a reviewed snapshot-scope host rule.

## Security review

This contract crosses the snapshot read boundary, the selection and clipboard
trust decisions, the bounded search surface, and the input-capture dependency.
Independent security review is required before this contract is promoted beyond
draft. The reviewer must confirm:

- the extension uses only the public, capability-gated API, with no private
  first-party bypass, no raw grid or PTY handle, and no input hot-path callback
  (`P0-AC-012`, `P0-AC-015`);
- a snapshot is a bounded, read-only per-view projection; a cross-panel or
  cross-view read is refused, and no snapshot, search result, or highlight
  becomes a cross-panel read path or an Event-Bus exposure of another panel's
  content (`P0-AC-016`);
- selection and clipboard stay Core-owned and permission-gated: at most one live
  selection per view, copy bounded by `8192` bytes with char-boundary
  truncation, paste inspected by the authoritative inspector, and OSC 52 read
  deny-by-default (`P0-AC-008`, `P0-AC-039`);
- search and snapshot collection are bounded on pattern, result, row, and
  serialized size, and a stale identity fails closed rather than resolving to
  unrelated content (`P0-AC-014`);
- input capture is Core-owned, transient, bounded, revocable, and guaranteed on
  cancel, submit, focus switch, plugin unload, plugin crash, and Core-side
  timeout, and never places a plugin callback on the input hot path;
- safe mode and zero-plugin startup keep Core search and selection usable
  (`P0-AC-019`).

The focused `W-01` host contract and the search/copy-mode package each require
security review again before their own merge.

## Verification plan

This is a contract specification; it has no executable verification of its own.
Any later implementation that cites this contract must prove, at minimum:

1. **Scope escape.** A plugin bound to view A cannot read, search, select, or
   navigate view B's grid; an out-of-scope snapshot request is denied with a
   typed outcome and returns no data.
2. **Stale identity.** A result, anchor, or capture invalidated by erase,
   resize, reflow, scrollback prune, or grid replacement fails closed; a
   re-registered identity stales prior references; navigation or copy against a
   stale identity performs no jump and reads no content.
3. **Clipboard denial.** A plugin without the clipboard capability is denied
   read and write with a typed failure and no partial write; an over-limit copy
   truncates at the bound with a `truncated` flag; OSC 52 read stays
   deny-by-default and write stays gated.
4. **Cross-panel read denial.** Output or a search on another view's grid never
   refreshes a bound result set, and a failed owner resolution yields no
   selection and no highlight.
5. **Input-capture release on crash.** After cancel, submit, focus switch,
   plugin unload, plugin crash, and Core-side timeout, capture is released,
   terminal input is restored, and no captured key reaches the terminal
   unintentionally; modal keys produce no PTY bytes.
6. **Safe mode.** With zero third-party plugins and in `bitty --safe`, Core
   search and selection remain usable; the extension is absent with no partial
   activation.
7. **Bounds.** An over-limit pattern truncates at a char boundary; an over-limit
   result or snapshot request is clamped or rejected before allocation with the
   previous state intact; empty and truncated input never panics.
8. **No hot-path work.** Search, snapshot collection, and navigation run off the
   input, parser, and render hot paths.
9. **Documentation gates.** The repository-local `just check` passes with zero
   issues.

## Alternatives considered

| Alternative                                                           | Trade-off                                                                                                | Disposition                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Keep the search and copy-mode UX inside Core and extract nothing      | Fewest moving parts, but leaves optional policy in the small core and contradicts ADR 0015 and ADR 0016. | Rejected; the mechanism stays in Core and the UX policy moves to the extension.         |
| Let the extension receive a live grid handle or mutate Terminal Truth | Simplest read path, but withdraws Core ownership and opens a cross-panel mutation path.                  | Rejected; the extension reads a bounded snapshot only.                                  |
| Expose a window-wide or workspace-wide snapshot                       | Convenient search across panels, but becomes a cross-panel read path for plugins.                        | Rejected; snapshots are per-view and cross-panel reads are refused.                     |
| Identify results and anchors by raw row numbers                       | Cheap to compute, but rows shift under resize and reflow and can retarget unrelated content.             | Rejected; identity uses stable line ids and generation fencing.                         |
| Append results across refreshes and reconcile later                   | Avoids recompute, but grows stale results without bound.                                                 | Rejected; a refresh replaces the set under coalescing.                                  |
| Let the extension own selection semantics or the clipboard gate       | Centralizes copy logic in the extension, but moves a Core trust decision out of Core.                    | Rejected; selection semantics and clipboard permission stay Core-owned.                 |
| Build search and copy mode on the v1 non-focusable overlay            | Reuses an existing slot, but the slot cannot hold focus or receive modal input.                          | Rejected; the dependency is the focusable-overlay and transient input-capture host API. |
| Decide the `W-01` host primitive spellings and timeouts on this page  | One fewer contract to wait for, but the host surface is co-owned and would be invented twice.            | Rejected; this page references `W-01` and marks its host operations provisional.        |

## Affected contracts

| Contract                                                                                                                                                                   | Effect                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md) (accepted)                             | Consumed; retained Terminal Truth, permission, and the no-bypass fence are not reopened.                                          |
| [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md) (accepted) | Records that search and selection are not a `W-130` boundary and are owned by `W-135`/`W-138` under `W-01` and `OQ-074`/`OQ-075`. |
| [Input and Pointer Contract](input-pointer-rfc.md) (draft)                                                                                                                 | Owns the selection model, copy and paste, clipboard audit, and hot-path exclusion this page composes with.                        |
| [Terminal State RFC](terminal-state-rfc.md) (accepted)                                                                                                                     | Unchanged; Terminal Truth ownership is consumed.                                                                                  |
| [Composer Architecture and Host API](composer-architecture.md) (accepted)                                                                                                  | Defines the consumer shape and lifecycle of the `W-01` host API this page depends on.                                             |
| [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md) (draft)                                                                                                | Records transient input capture as Core-owned, revocable, and generation-fenced.                                                  |
| [Workspace Compositor Specification](workspace-compositor.md) (accepted)                                                                                                   | Unchanged; the identity hierarchy and no-cross-panel-read rule are consumed.                                                      |
| [Semantic Terminal RFC](semantic-terminal-rfc.md) (draft)                                                                                                                  | Its Hint Mode target set includes search results; the interaction direction is not redefined here.                                |
| [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) (draft)                                                                                                  | Owns the `OQ-074`/`OQ-075` gap rows this page addresses as owner-pending input.                                                   |
| Search/copy-mode extension package `CTX-0003`                                                                                                                              | Gains the snapshot, selection, search, clipboard, and capture constraints it must implement.                                      |
| Plugin-side policy contract `W-138` (bitty-plugins-docs)                                                                                                                   | Owns the search/copy-mode UX policy, keybinding namespace, and page set, under this page's constraints.                           |
| Core integration `W-143` (`CTX-0936`) and `W-144` (`CTX-0937`)                                                                                                             | Gain the retained-mechanism and host-surface requirements they must implement.                                                    |
| SDK surface `W-139` (`CTX-0066`)                                                                                                                                           | Gains the snapshot, search, selection, and clipboard host bindings it must derive.                                                |

## Open points

None of these is a new global open question; each is parked with its named
owner.

- **`W-01` host primitive spellings, capture payloads, focus-order rules, and
  timeout values** are owned by `W-01` ([Issue #396](https://github.com/bitty-terminal/bitty-docs/issues/396),
  under `OQ-056`); the search/copy-mode-facing host operations in this page are
  provisional until `W-01` accepts its contract.
- **Delivery shape and package layout** parked to `CTX-0003`: whether search and
  copy mode ship as a Lua plugin or a Rust-level extension, and the manifest
  compatibility declaration.
- **Keybinding namespace, case and regex scope, and result presentation**
  parked to `CTX-0003` and `W-138`: these are extension policy over the Core
  mechanism and stay owner decisions.
- **Selection persistence policy** parked to `CTX-0003` and `W-138`: whether
  one persistent selection per view is enabled and how it interacts with search
  navigation.
- **Numeric bounds for snapshot rows, serialized size, and the capture queue**
  co-owned with `W-01` and `CTX-0003`: they must be finite and enforced, but
  only the pattern, result, clipboard, and edit-buffer values are confirmed by
  current implementation evidence.
- **Regex versus literal search and Unicode case-folding scope** (`OQ-074`):
  the accepted headless search folds ASCII only; extending it is an owner
  decision, not a change here.
- **Keyboard-selection and copy-mode semantics, and mouse-mode precedence**
  (`OQ-075`): the `Word`/`Line`/`Block` kinds are constructed by the runtime today,
  but the keyboard-selection and mouse-mode precedence rules stay open.
- **Capture interaction with IME and pointer capture** owned by the input and
  IME contracts; this page requires no second channel and does not redefine
  those interfaces.
- **Cross-panel or cross-window snapshot visibility** defaults to no; any future
  visibility is a scoped security decision, not a change here.

## Acceptance criteria

1. The bounded snapshot surface, its per-view scope, its finite bounds, stable
   identity, viewport navigation, and result coalescing are defined.
2. Selection semantics (range, word, line, rectangular block, normalization,
   snapping, reclamp, pruning truncation) and clipboard permission control are
   retained by Core; the extension may present and drive but never mutates
   Terminal Truth or bypasses clipboard permission.
3. Search is retained by Core over Terminal Truth; the extension owns the input
   UI, results, navigation, and keybindings; result identity, match
   highlighting, and stale-result handling are defined.
4. The input-capture dependency references `W-01`
   ([Issue #396](https://github.com/bitty-terminal/bitty-docs/issues/396),
   `OQ-056`) without deciding it, and marks the dependent host operations
   provisional.
5. What Core retains is explicit: bounded search, selection semantics, clipboard
   permission, Terminal Truth, and the viewport and navigation mechanism.
6. Security review and a verification plan with negative-path evidence cover
   scope escape, stale identity, clipboard denial, cross-panel read denial,
   input-capture release on crash, and safe mode.
7. Downstream owners `CTX-0003`, `W-138`, `W-143`/`W-144` (`CTX-0936`/
   `CTX-0937`), and `W-139` (`CTX-0066`) are named without deciding their
   content.
8. The current implementation status is accurately stated as `Implemented-only`
   Core-internal evidence bounded to a revision; `OQ-074` and `OQ-075` stay
   Open; nothing is described as an implemented extension or host API.
9. The page is self-contained with no research-repository reference, and
   `just check` passes with zero issues.

## P0 Review Sign-off

Not signed. This document is a **draft** terminal-side contract. Independent
category-owner, docs-curator, and security review are required before it is
promoted beyond draft; the security review above records the required controls,
and no P0 control is changed by this page.

| Role                 | Scope                                                                          | Requirement                                                               |
| -------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `architecture-owner` | Snapshot, selection, search, retained mechanisms, and boundary correctness     | Approve; confirms the mechanism and policy split and Core-retained scope. |
| `security-architect` | Snapshot reads, selection, clipboard, bounded search, input capture, safe mode | Independent security sign-off required before promotion.                  |
| `docs-curator`       | Metadata, links, terminology, and status honesty                               | Approve; confirms schema, discoverability, and draft marking.             |

## References

- [bitty-terminal-docs#168](https://github.com/bitty-terminal/bitty-terminal-docs/issues/168)
  (CarryCtx `CTX-0091`, plan key `W-135`).
- [ADR 0015 - Small-Core Extraction
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md).
- [ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service
  Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md).
- [Open-question register, OQ-056](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/open-questions.md)
  (the focusable-overlay and transient input-capture host API is v2 scope),
  together with `OQ-074` and `OQ-075`, which stay Open.
- [Small-core refactor execution
  handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md),
  plan keys `W-01`, `W-135`, `W-138`, `W-139`, `W-143`, `W-144`.
- [Terminal State RFC](terminal-state-rfc.md) — Terminal Truth and the only
  write path.
- [Input and Pointer Contract](input-pointer-rfc.md) — selection model, copy and
  paste, `R-004`, and the `8192`-byte clipboard bound.
- [Composer Architecture and Host API](composer-architecture.md) and
  [Beacon Core Mechanism Contract](beacon-core-mechanism-contract.md) — the
  `W-01` consumer shape and the Core-owned transient-capture rules.
- [Workspace Compositor Specification](workspace-compositor.md) — identity
  hierarchy and no-cross-panel-read rule.
- [Performance Budget RFC](performance-budget-rfc.md) — `PB-4` and hot-path
  exclusion.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) — mouse modes and
  bracketed paste the interactions must not change.
- [Semantic Terminal RFC](semantic-terminal-rfc.md) and
  [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) —
  interaction direction and the `OQ-074`/`OQ-075` rows.
- [Security overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [threat model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [risk register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and
  [P0 acceptance criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md)
  (`P0-AC-005`, `P0-AC-008`, `P0-AC-009`, `P0-AC-012`, `P0-AC-014`, `P0-AC-015`,
  `P0-AC-016`, `P0-AC-019`, `P0-AC-026`, `P0-AC-039`).
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  and
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
- [Documentation workflow](../docs/development/documentation-workflow.md) and
  [documentation map](../docs/README.md).
