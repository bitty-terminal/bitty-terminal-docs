---
title: Small-Core Capability Floor
description: Defines what bitty --safe guarantees at modern-terminal parity and what belongs to upstream extensions
category: specifications
audience: contributor
document_type: specification
status: accepted
website_publish: true
sidebar_order: 73
---

# Small-Core Capability Floor

> Status: **accepted** definition. The floor below records the owner directive
> of 2026-10-14 on [bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059):
> Bitty is a terminal emulator first, everything not in the floor belongs to
> upstream extensions (never Core), and Lua APIs serving extensions live in
> the corresponding extension repositories (never `bitty` Core). This document
> defines the contract; it claims no implementation. The `--safe` acceptance
> suite and the extension-boundary lint in
> [bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059) remain
> open tracking items.

## Document status

This document is `Accepted` as the canonical definition of the Small-Core
capability floor for the 0.0.23 gate
([bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059)).

- Owning task: CarryCtx `CTX-0114` (team terminal-docs), gate Issue
  [bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059).
- Authority: owner directive 2026-10-14 recorded in the Issue body. The three
  rules there (extension-only remainder, extension-owned Lua APIs,
  `bitty-plugin-sdk` redesign tracked by the bitty-plugins commander) are
  accepted direction; this document is their terminal-platform elaboration.
- Implementation status: no acceptance-suite evidence is claimed here. Every
  budget number is an accepted target from the
  [Performance Budget RFC](performance-budget-rfc.md) (none measured yet);
  every behavior row cites its owning accepted contract. A `Verified` claim
  for the floor requires the `--safe` suite green on all OSes plus the
  boundary lint per the [risk evidence RFC](risk-evidence-rfc.md) lifecycle
  (`Specified -> Accepted -> Implemented -> Verified -> Compatible ->
Release-ready`); that evidence does not exist yet.

## Purpose and scope

[bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059) asks what
`bitty --safe` (Core only, no third-party plugins) must deliver at
modern-terminal parity before 0.0.23, and proves it with an acceptance gate.
This document answers the "what" so the gate has a fixed target.

In scope:

- the `bitty --safe` guarantee: PTY ownership, rendering, input, mouse,
  clipboard, unicode, and the startup/memory budgets (with current accepted
  numbers where they exist);
- the remainder rule: what belongs to upstream extensions and never to Core;
- the Lua-API ownership rule: extension repositories own their Lua API, and
  extension-serving API surface in Core is a defect;
- the pointer to the `bitty-plugin-sdk` redesign (owned elsewhere, noted
  here, not designed here).

Out of scope and owned elsewhere:

- the Core-versus-plugin ownership tables and P0 gates themselves
  ([Core and Plugin Boundaries](../architecture/core-boundaries.md));
- the decided extraction boundaries and focused contracts `W-71` through
  `W-75` plus the `W-130`/ADR 0016 set (ADRs and handoff in `bitty-docs`,
  summarized in Core and Plugin Boundaries);
- the `extensions/` versus `plugins/` versus reserved `components/`
  directory meanings
  ([Extension, Plugin, and Component Directory Semantics](../architecture/directory-semantics.md));
- the Plugin API surface spellings and the SDK redesign itself (plugin
  ecosystem corpus, bitty-plugins commander);
- the exact benchmark harness, corpus, and reference machines for the
  budgets ([Performance Budget RFC](performance-budget-rfc.md) open items).

This document does not reopen any accepted contract. It fixes the floor the
gate measures against and records residual questions under "Open points".

## Normative sources this specification must not weaken

This definition must be read together with, and must not weaken:

- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`accepted`): Core keeps terminal-emulator mechanisms and security
  boundaries; everything else is an extension through public,
  capability-gated interfaces; plugins never enter the terminal, render, or
  input hot paths and receive no ambient authority.
- [Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md),
  [Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md),
  [Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md),
  and [P0 Acceptance Criteria](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/p0-acceptance-criteria.md):
  bounded parsing, separate clipboard read/write policies, image limits,
  per-plugin VMs with restricted standard libraries and budgets, and
  read-only-by-default MCP/Agent access.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md) (`accepted`,
  closes OQ-004): the M1 protocol set that anchors the floor's parity rows.
- [Performance Budget RFC](performance-budget-rfc.md) (`accepted`, closes
  OQ-001): budgets PB-1 through PB-7, accepted targets, none measured yet.
- [CLI Contract RFC](cli-contract-rfc.md) (`accepted`, closes OQ-017): the
  stable v1 command tree, the safe-mode CLI obligations, and exit codes 0
  through 8.
- [Terminal State RFC](terminal-state-rfc.md) (`accepted`, OQ-007),
  [Rich Presentation RFC](rich-presentation-rfc.md) (`accepted`, OQ-008/015/016),
  [Configuration Model RFC](configuration-model-rfc.md) (`accepted`, OQ-010),
  and [Workspace Compositor Specification](workspace-compositor.md)
  (`accepted`): grid, snapshot/damage, image placement, config layers, and
  decoration invariants the floor relies on.
- [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
  and
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md):
  the decided small-core extraction boundaries this floor assumes.
- [Command-line interface](../interfaces/cli.md) (candidate): the `--safe`
  precedence table (`Implemented` experimental at `20519bc`, not `Verified`).

## Terminology

| Term                   | Meaning in this document                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floor                  | The minimum Core-only capability set below. `bitty --safe` must deliver all of it; anything above it is extension policy.                                                                                                                                                                   |
| `bitty --safe`         | Core-only startup: no third-party plugin is loaded or executed, and no external configuration layer is read (built-in defaults win).                                                                                                                                                        |
| Modern-terminal parity | The M1 protocol set plus the table-stakes interactive behaviors a daily-driver user expects (PTY, render, input, unicode, budgets).                                                                                                                                                         |
| Upstream extension     | Any capability not in the floor: an L1 Rust Core Extension repository or an L2 Lua plugin, delivered through public capability-gated APIs.                                                                                                                                                  |
| Extension-serving API  | A Lua (or host) API whose purpose is to serve an extension's policy or UX rather than a Core mechanism. Its presence in Core is a defect.                                                                                                                                                   |
| Zero-plugin baseline   | With no plugin enabled, Bitty is a plain terminal window comparable to Alacritty: shell, grid, scrollback, selection, clipboard, fonts, colors, themes, keymaps, typed configuration, and Core split/workspace primitives via commands and key bindings; no chrome (accepted via ADR 0014). |

## The floor: what `bitty --safe` guarantees

Each row is a guarantee at modern-terminal parity. Owning contracts hold the
normative detail; this table fixes the set. Numbers are the current accepted
values where they exist; rows with no accepted number say so.

### PTY and process

| Guarantee                                                                              | Owning contract                                                   | Current number, where known                                                                                         |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| PTY/ConPTY ownership, child process lifecycle, resize, signals, and I/O backpressure   | [Core and Plugin Boundaries](../architecture/core-boundaries.md)  | No accepted numeric bound; platform relaxations (for example ConPTY startup) belong to the platform policy (OQ-003) |
| `TERM=xterm-256color` with `TERM_PROGRAM=bitty`; no shipped `bitty` terminfo entry yet | [Terminfo TERM Decision](terminfo-decision.md)                    | `check-terminfo.sh` guard is the current evidence                                                                   |
| Session save/restore stays Core-owned and `--safe` never reads stored session state    | [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md) | Bounded to 200 scrollback lines per pane; corrupt or missing state starts clean                                     |

### VT, grid, and protocols (M1 parity)

| Guarantee                                                                                                                    | Owning contract                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| UTF-8 input/output with deterministic invalid-sequence recovery (`U+FFFD`, one cell)                                         | [Compatibility Milestone RFC](compatibility-milestone-rfc.md), [Terminal State RFC](terminal-state-rfc.md) |
| ECMA-48/VT100/VT220/xterm-compatible core subset; alternate screen, origin mode, margins, scroll regions                     | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| 16/256/truecolor SGR; DECSCUSR cursor shape/style; synchronized output (DECSET 2026) with a bounded 100 ms defer timeout     | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| Mouse tracking 1000/1002/1003 plus SGR 1006; focus events 1004; alternate scroll 1007; bracketed paste 2004                  | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| Window title via OSC 0/2 through a sanitized, change-gated path                                                              | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| OSC 10/11 dynamic color query (answered from the resolved palette) and set (capability-gated, default deny)                  | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| OSC 7 cwd and OSC 133 command zones parsed; prompt navigation is Core mechanism                                              | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| OSC 8 hyperlinks parsed with a click-to-open gate; shell integration never infers state by parsing prompt text               | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| Clipboard write via OSC 52 only, gated by user permission; clipboard read-back by untrusted output is out of scope (P0 risk) | [Compatibility Milestone RFC](compatibility-milestone-rfc.md), security corpus                             |
| Kitty keyboard as opt-in progressive enhancement over required legacy xterm modifier encoding                                | [Compatibility Milestone RFC](compatibility-milestone-rfc.md)                                              |
| Kitty Graphics present path only; Sixel refused, iTerm2 deferred, via a demand-gated admission path                          | [Image Protocol Decision](image-protocol-decision.md)                                                      |

Title updates are bounded (`WINDOW_TITLE_MAX_CHARS = 256`, C0/DEL/C1
stripped, change-gated). Parser, terminal state, and image decode stay
fuzz-covered untrusted-input surfaces with hard payload, pixel, dimension,
time, and aggregate limits.

### Rendering and presentation

| Guarantee                                                                                                                                                                      | Owning contract                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scene/render snapshots with damage; renderer consumes only the public snapshot, never Terminal private structures                                                              | [Core and Plugin Boundaries](../architecture/core-boundaries.md), [Terminal State RFC](terminal-state-rfc.md)                                     |
| Glyph cache and software-fallback interface; `winit`/`wgpu` substrate with frame-on-demand rendering (zero periodic wakeups when idle)                                         | [Performance Budget RFC](performance-budget-rfc.md) (PB-7)                                                                                        |
| Scroll-follow keeping typed input visible; resize reflow (primary reflows, alternate truncates)                                                                                | [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                                                 |
| Scrollback `0..=100000` with configurable wheel speed; scrollbar overlay (`auto` default, width 8 logical px, bounds `1..=32`)                                                 | [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                                                 |
| Scrollback search and vi/copy-mode selection as Core modal states reachable by default bindings (`ctrl+shift+f`, `ctrl+shift+space`) with word/line/block mouse gestures       | [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md)                                                                                 |
| Ligature shaping stack with `font.features` control and `font.disable_ligatures` policy (`always`, `never`, `cursor`)                                                          | [Ligature Decision](ligature-decision.md)                                                                                                         |
| `--safe` has no optional tab/status chrome; Core still provides its default workspace strip, and splits/workspace semantics remain reachable through commands and key bindings | [Workspace Compositor](workspace-compositor.md#workspace-presentation-contract), [Core and Plugin Boundaries](../architecture/core-boundaries.md) |

Underline style fidelity beyond single/double, full grapheme-cluster width
completeness, BiDi reorder, OSC 22 pointer shapes, and the Kitty text-sizing
and file-transfer protocols are above the floor: deferred or refused per
their owning decisions, never silent Core additions.

### Input, selection, clipboard, and IME

| Guarantee                                                                                                                                                                                                | Current bound, where accepted                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Keyboard/mouse encoding, IME, focus, paste, and the keymap registry stay Core-owned; plugins never enter the input hot path                                                                              | Normative rule ([Core and Plugin Boundaries](../architecture/core-boundaries.md); PB-4 rationale)      |
| Interception events are rare, cold-path only, with timeout and failure policies; byte/cell/glyph hot-path events are never exposed to Lua                                                                | [Core and Plugin Boundaries](../architecture/core-boundaries.md)                                       |
| Paste intake bounded and inspected (`CLIPBOARD_MAX_BYTES = 8192`, char-boundary truncation) with suspicious-paste handling                                                                               | [Input and Pointer Contract](input-pointer-rfc.md) (`draft`, experimental evidence only)               |
| IME preedit overlay paints without mutating grid truth; preedit `IME_PREEDIT_MAX_CHARS = 128`, commit `IME_COMMIT_MAX_CHARS = 256` / `IME_COMMIT_MAX_BYTES = 1024`; focus loss cancels deterministically | [Input and Pointer Contract](input-pointer-rfc.md) (`draft`); commit-path defect bitty#1449 stays open |
| Per-event wire bounds: key at most 64 bytes, mouse at most 32 bytes, IME commit at most 1024 bytes; gesture bursts coalesced to at most 4 commands per 100 ms                                            | [Input and Pointer Contract](input-pointer-rfc.md) (`draft`)                                           |
| OSC 52 clipboard read requires explicit consent under the normal policy; plugin clipboard history or formatting UI is extension policy, never Core                                                       | Security corpus; [Core and Plugin Boundaries](../architecture/core-boundaries.md)                      |

Bounds from the still-`draft` Input and Pointer Contract are recorded here as
the current candidate values the floor will pin on that contract's
acceptance; they are not claimed as accepted until then.

### Unicode and text

| Guarantee                                                                                                                                                                                                                                 | Owning contract                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| UTF-8 foundation; `cell.width` 1 or 2 with the trailing-spacer invariant; combining marks, fallback, emoji, and shaping as Core-owned mechanisms (reorder and shaping change Terminal Truth, so plugins may only present above that seam) | [Terminal State RFC](terminal-state-rfc.md), [Text and Rendering RFC](text-rendering-rfc.md) (`draft`) |
| The compact `char_cell_width` approximation is the single implementation today (headless, `forbid(unsafe)`); authoritative East-Asian-Width tables and ambiguous-width policy are candidate until accepted                                | [Text and Rendering RFC](text-rendering-rfc.md) (`draft`)                                              |
| BiDi split mechanics only (paragraph splits with a bounded cell cap); reorder deferred                                                                                                                                                    | [BiDi Scope Decision](bidi-scope-decision.md)                                                          |

### Budgets

The [Performance Budget RFC](performance-budget-rfc.md) targets below are
accepted design constraints for the default configuration with the safe
startup path (no third-party plugins). None has been measured against a real
build; measurement harnesses, corpora, and reference machines are a
follow-up implementation task before any budget becomes a hard gate.

| Budget                          | Accepted target                                                                                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PB-1 cold startup               | At most 100 ms p50 and 200 ms p99, process launch to first rendered prompt frame, default config, warm OS file cache, local shell                                           |
| PB-2 idle memory                | At most 80 MB RSS p50, one window, default scrollback, 60 s idle, plugins disabled beyond the bundled minimum                                                               |
| PB-3 typical session and growth | At most 250 MB RSS with 8 tabs after a 4-hour mixed session; no monotonic growth (post-close reclaim within 15% of baseline)                                                |
| PB-4 input latency              | At most 8 ms key-to-screen p50 and 15 ms p99, 60 Hz minimum display                                                                                                         |
| PB-5 package size               | Stripped `bitty-app` binary at most 25 MB per Tier 1 platform; default distribution download at most 40 MB compressed (lower confidence; revisit after the first real link) |
| PB-6 throughput floor           | At least 40 MB/s sustained VT parse-and-render on one core of the slowest Tier 1 reference machine                                                                          |
| PB-7 idle resources             | At most 1% average CPU over 10 minutes idle; zero Bitty-attributable periodic wakeups when idle                                                                             |

Budget violations are treated like failing tests: fix, renegotiate via an
updated RFC, or document a time-boxed exception. Silent drift is not allowed.
Plugin-enabled configurations get their own budgets in the isolation/resource
contract, never charged against PB-2/PB-3.

### Safe-mode CLI

`bitty --safe` selects the built-in safe effective configuration and reads no
external layer: system defaults, profiles, user files, `BITTY_CONFIG`,
`BITTY_PROFILE`, and CLI appearance overrides are all ignored; every schema
field attributes to Core defaults; decoration is forced to `0/0/1/0/0`
(`gaps_in`/`gaps_out`/`border`/`radius`/`content_inset`) with the opaque
`#FFFFFF`/`#808080` focused/idle outline pair. `bitty --help`,
`bitty version`, `bitty config check`, `bitty plugin list`, `bitty doctor`,
`bitty list`, and `bitty inspect` work in safe mode, and `bitty doctor`
reports when it ran that path. Exit codes 0 through 8 and the `--format
json`/`jsonl` envelope (version 1) are stable for v1 per the
[CLI Contract RFC](cli-contract-rfc.md).

## What belongs to upstream extensions (never Core)

Everything not in the floor above belongs to upstream extensions, never
Core. The non-exhaustive register below restates the accepted ownership;
the authoritative tables stay in
[Core and Plugin Boundaries](../architecture/core-boundaries.md).

- Presentation chrome: tab strips, workspace bars, sidebars, pills, status
  lines, command palettes, pickers, file managers, and git panels.
- Layout and workflow policy: when to split, default direction, balancing,
  tab/split UX, sessions save/restore UX, SSH-manager UX, quake/hotkey
  window policy, multi-window management.
- Search, shell-enhancement, and hint UX: search UI and history policy over
  the Core snapshot, prompt navigation UX over Core zones, quick-select
  overlays over the Core hint model.
- Notification and clipboard policy: which events notify, message text,
  silence rules, clipboard history and formatting UI. Core keeps only the
  platform primitive, the permission gate, and the bounds.
- AI, Agent, MCP, and browser experiences: provider integration, Agent
  panes, tasks, context UX, MCP client consumption, webview panels.
- Image browsers, previews, and operation UI above the Core protocol
  adapters, store, placement, and quotas.
- Install-time package management: owned by the external package manager
  under the accepted package-manager boundary; Core keeps only read-only
  startup validation (manifest/lock schema, bounded parser, integrity
  primitives) with no network path.
- L1 Rust Core Extensions (`bitty-ipc`, `bitty-network`, `bitty-agent`,
  `bitty-observability`, package manager): independent repositories on
  public, capability-gated interfaces with no private first-party bypass.

The default distribution may bundle some of these, but bundling grants no
additional authority: first-party and community extensions use the same API,
capabilities, and lifecycle with no private channel.

## Lua-API ownership rule

Lua APIs serving extensions live in the corresponding extension
repositories, never in `bitty` Core. Extension-owned API surface in Core is
a defect.

Concretely:

- A Lua spelling whose purpose is an extension's policy or UX (palette
  commands, bar/status presentation, session UX, AI workflows) is owned,
  versioned, and documented by that extension's repository. Core must not
  carry it, even temporarily, and a Core review that finds one returns
  `NEEDS-FIX`.
- Core's Lua surface is limited to the generic runtime boundary it cannot
  delegate (configuration evaluation, the typed command/event/capability
  host seam). Domain APIs reach plugins through the uniform pattern from
  [Core and Plugin Boundaries](../architecture/core-boundaries.md): a
  bounded `<domain>.read` snapshot plus events, with mutation only through
  registered commands gated by `<domain>.control`.
- Fine-grained hot-path events (byte received, cell changed, glyph
  rendered) are never exposed to Lua. Interception events stay rare,
  cold-path, and policy-bound.
- A follow-up defect that finds extension-serving Lua API merged into Core
  after this point is filed as a Core defect and removed toward the owning
  extension repository; it is never kept as a convenience.

The current `bitty-lua` tail crate keeps its generic-runtime boundary; its
`piccolo` 0.3.3 runtime is unchanged by the accepted Phodopus successor
direction, and the terminal-side Phodopus host ABI stays a draft candidate.
Neither fact changes the ownership rule above.

## bitty-plugin-sdk redesign pointer

The `bitty-plugin-sdk` needs a redesign so future upstream extensions carry
their own Lua API. That redesign is owned by the bitty-plugins commander
and tracked there; it is out of scope here. This document notes the
dependency and designs nothing about it: the SDK remains generated output
and development support, while the authoritative Plugin API v1 contract
text lives in the plugin-ecosystem corpus. The floor above is written so it
needs no SDK change: it adds no Core API surface and moves no extension
spelling into Core.

## Implementation status

No floor row is claimed as implemented or verified by this document. Cited
`Implemented` states (Kitty Graphics path, search/copy-mode states,
multi-click selection, session restore, ligature stack, `--safe`
precedence at `20519bc`) are `Implemented-only` or experimental evidence
from their owning documents, never `Verified`. A `Verified` claim for any
row requires independent review plus the acceptance evidence its owning
contract names.

## Security review

- The floor preserves every normative P0 gate named in
  [Core and Plugin Boundaries](../architecture/core-boundaries.md): two
  security domains (terminal protocols versus plugin capabilities),
  separate clipboard read/write policies with explicit consent for OSC 52
  read, hard protocol/image limits, per-plugin VMs with restricted standard
  libraries and CPU/instruction/memory/task/callback/queue budgets, and
  origin-carrying capability checks on cross-boundary requests.
- Safe mode is the always-available no-third-party-plugin startup path; a
  hostile, invalid, or missing user configuration cannot abort or influence
  it.
- No new trust boundary, ambient authority, bypass API, or silent
  capability increase is introduced. Any future change to a trust boundary
  updates the security corpus first.
- Required reviewers for this document: the architecture category owner, a
  docs curator (taxonomy, metadata, links, self-containment), and a
  security reviewer (floor rows touch PTY, clipboard, images, IME, and
  safe-mode boundaries).

## Verification plan

Every row needs automation; no manual-only gate closes the floor. The
`--safe` acceptance suite (owned by the `bitty` repository under
[bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059)) covers,
at minimum:

| Gate                    | What it checks                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safe-startup suite      | `bitty --safe` loads no third-party plugin and reads no external config layer; hostile/invalid/missing user config still starts; decoration and outline pairs are the forced values                              |
| PTY/parity suite        | M1 protocol rows headed where behavior differs, headless elsewhere: DECSET 2026 deferral, OSC 0/2 title path, OSC 10/11 query/set gating, mouse modes, 1004/1007, 2004, bracketed paste, Kitty keyboard fallback |
| Render/input suite      | Damage-driven present, scroll-follow, reflow, search/copy-mode states, multi-click gestures, IME overlay bounds (128/256/1024), paste bound (8192)                                                               |
| Budget suite            | PB-1 through PB-7 harnesses run against the safe configuration once harnesses, corpora, and reference machines exist; until then budgets remain design constraints                                               |
| CLI safe-mode suite     | `--help`, `version`, `config check`, `plugin list`, `doctor`, `list`, `inspect` pass in safe mode with the safe-mode banner and redacted previews                                                                |
| Extension-boundary lint | No extension-serving Lua API merges into Core after this point: the lint fails on new Lua surface whose purpose is extension policy/UX, enforced in Core CI                                                      |

The suite runs green on all OSes (headed where behavior, headless
elsewhere) before the 0.0.23 gate closes. Fuzz and differential coverage
for the parser, terminal state, and image decoder follow the existing
untrusted-input gates.

## Alternatives considered

- A larger floor that keeps first-party chrome (tabs, status line) in Core:
  rejected. The zero-plugin baseline (ADR 0014) already accepts that every
  bar, tab strip, and status line is plugin composition on generic Core
  mechanisms; re-absorbing them would recreate the Core the small-core
  direction removes.
- A floor without numeric budgets (parity behavior only): rejected. The
  product vision accepts "lightweight" as a core property, and the accepted
  PB-1 through PB-7 targets are what make it gateable; unmeasured targets
  are kept honestly as targets, not dropped.
- Housing extension Lua APIs in Core "temporarily" until the SDK redesign
  lands: rejected by the owner directive. Extension-owned surface in Core is
  a defect from this point, not technical debt with a grace period; the
  extension repositories own their spellings now.

## Affected contracts

This document changes no accepted contract. It depends on, and must stay
synchronized with:

- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`accepted`): ownership tables, P0 gates, zero-plugin baseline.
- [Compatibility Milestone RFC](compatibility-milestone-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md),
  [CLI Contract RFC](cli-contract-rfc.md),
  [Terminal State RFC](terminal-state-rfc.md),
  [Rich Presentation RFC](rich-presentation-rfc.md),
  [Configuration Model RFC](configuration-model-rfc.md),
  [Workspace Compositor Specification](workspace-compositor.md): parity,
  budget, CLI, state, image, config, and decoration sources.
- [Extension, Plugin, and Component Directory Semantics](../architecture/directory-semantics.md)
  (`draft`): on-disk and distribution placement once accepted.
- [Input and Pointer Contract](input-pointer-rfc.md) (`draft`),
  [Text and Rendering RFC](text-rendering-rfc.md) (`draft`): candidate
  bounds and width rules the floor will pin on acceptance.
- [Image Protocol Decision](image-protocol-decision.md),
  [Terminfo TERM Decision](terminfo-decision.md),
  [Ligature Decision](ligature-decision.md),
  [BiDi Scope Decision](bidi-scope-decision.md),
  [Tabs Scope Decision](tabs-scope-decision.md),
  [Multi-Window Scope Decision](multi-window-scope-decision.md),
  [Quake Scope Decision](quake-scope-decision.md),
  [Kitty Family Scope Decision](kitty-family-scope-decision.md): above-floor
  deferrals and refusals.
- [Legacy Chrome and Validation Suite Disposition](legacy-chrome-and-validation-disposition.md)
  (`draft`, `W-83`/`W-84`): terminal-side disposition the floor assumes.
- Plugin-ecosystem corpus (Plugin Platform, Lua surface, host runtime,
  package lifecycle, isolation/resource contracts) and the `bitty-plugin-sdk`
  redesign tracker: extension side, linked, never copied.

## Open points

- The exact `--safe` benchmark harness, corpus, and reference machines
  (follow-up implementation task; budgets cannot hard-gate before they exist).
- Whether startup budgets need a separate Windows/ConPTY variant (owned by
  the platform policy, OQ-003).
- PB-5 revisit after the first real `bitty-app` link produces actual sizes.
- Acceptance of the `draft` Input and Pointer Contract and Text and
  Rendering RFC, which pins the candidate bounds recorded here.
- The `bitty-plugin-sdk` redesign scope and schedule (bitty-plugins
  commander; tracked outside this repository).
- The extension-boundary lint's exact mechanism in Core CI (owned by the
  `bitty` repository under
  [bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059)).

## Acceptance criteria

Mirroring [bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059):

- [x] Capability floor written down (this canonical document plus the
      governance pointer it carries; the `bitty` repository links here rather
      than duplicating the definition).
- [ ] `--safe` acceptance suite green on all OSes (headed where behavior,
      headless elsewhere) — owned by the `bitty` repository, tracked by the
      gate Issue.
- [ ] Extension-boundary lint: no extension-serving Lua API merged into
      Core after this point — owned by the `bitty` repository, tracked by the
      gate Issue.

The first box is the terminal-docs share of the gate; the remaining two
stay open under the gate Issue and are not claimed here.

## P0 Review Sign-off

- [ ] Architecture category owner: floor rows match the owning accepted
      contracts; no row weakens a normative gate.
- [ ] Docs curator: metadata schema, title/H1 match, taxonomy, links,
      self-containment (no research references), and index synchronization.
- [ ] Security reviewer: PTY, clipboard, image, IME, and safe-mode rows
      preserve the P0 gates; no new trust boundary introduced.

## References

- Gate: [bitty#2059](https://github.com/bitty-terminal/bitty/issues/2059)
  ([0.0.23 gate] Small-Core `--safe` modern-terminal parity: capability
  floor + acceptance).
- Ownership: [Core and Plugin Boundaries](../architecture/core-boundaries.md),
  [Future Boundaries](../architecture/future-boundaries.md) (`draft`).
- Parity and budgets: [Compatibility Milestone RFC](compatibility-milestone-rfc.md),
  [Performance Budget RFC](performance-budget-rfc.md),
  [Terminal Feature Gap Analysis](terminal-feature-gap-analysis.md).
- Text and input: [Terminal State RFC](terminal-state-rfc.md),
  [Text and Rendering RFC](text-rendering-rfc.md) (`draft`),
  [Input and Pointer Contract](input-pointer-rfc.md) (`draft`),
  [Rich Presentation RFC](rich-presentation-rfc.md).
- CLI and config: [CLI Contract RFC](cli-contract-rfc.md),
  [Command-line interface](../interfaces/cli.md),
  [Configuration Model RFC](configuration-model-rfc.md),
  [Workspace Compositor Specification](workspace-compositor.md).
- Above-floor decisions: [Image Protocol Decision](image-protocol-decision.md),
  [Terminfo TERM Decision](terminfo-decision.md),
  [Ligature Decision](ligature-decision.md),
  [BiDi Scope Decision](bidi-scope-decision.md).
- Extraction direction:
  [ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md),
  [ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md),
  [small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).
- Extension side (linked, never copied):
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md).
