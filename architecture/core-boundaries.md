---
title: Core and Plugin Boundaries
description: Specifies the ownership boundary between the Bitty core and plugins, including normative P0 security gates.
category: architecture
audience: plugin-author
document_type: specification
status: accepted
website_publish: true
sidebar_order: 21
---

# Core and Plugin Boundaries

## Document status

This document is `Accepted`. The project initiator has confirmed the
small-core and plugin-extension direction, the placement of most AI and Agent
experiences in plugins, and one independent repository per plugin. The
ownership tables and P0 gates below are `Accepted` via the Plugin Platform RFC
(OQ-011/012/013), Isolation Resource RFC (OQ-014), Rich Presentation RFC
(OQ-008/015/016), CLI Contract RFC (OQ-017), IPC and Agent RFC (OQ-018), and
Lua ADRs (OQ-030/031/032); tail crate `bitty-rich` is `Implemented` but not yet
`Verified`. Out-of-process IPC (`bitty-ipc`), shared networking
(`bitty-network`), agent protocol queues (`bitty-agent`), and observability
(`bitty-observability`) exist as independent L1 Rust Core Extension
repositories. Their existence is current-location evidence, not acceptance that
Core has adopted an extracted boundary. The small-core extraction boundaries and
the retained Core mechanisms are now decided as direction by
[ADR 0015](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
and
[ADR 0016](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md),
with the focused contracts `W-71` through `W-75`; those decisions alone claim
no extraction, migration, or implementation. See "Decided extraction boundaries" below and the
[small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).
The terminal-platform disposition, the required validation commands, the
no-plugin baseline, and the deprecation links for both boundaries are collected
in the candidate
[Legacy Chrome and Validation Suite Disposition](../specifications/legacy-chrome-and-validation-disposition.md)
(`W-83`/`W-84`).
The `bitty-lua` tail crate keeps a generic-runtime boundary. Source inventory
at `bitty` `1c68de25` (2026-10-17), `crates/bitty-lua/Cargo.toml`, records
Phodopus `0.2.0-alpha.1`, pinned at `f6aa59a`, following the successor direction
in [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md).
The terminal-side host-ABI
[Phodopus Host ABI (Candidate)](../specifications/phodopus-host-abi-candidate.md)
stays a draft candidate; the dependency inventory accepts no host ABI and
establishes no `Verified` runtime behavior.
“Core” and “Plugin” in the tables indicate accepted ownership with lifecycle
`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`
per the [risk evidence RFC](../specifications/risk-evidence-rfc.md); risk
evidence matrix remains `pending`. The adopted workspace decomposition is fixed
in
[ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md)
and `bitty/Cargo.toml`; current crate counts, revisions, and milestone
evidence live in
[project-state.json](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json),
which this document links to instead of duplicating. Tail crates are
`Implemented` but not yet `Verified` and do not imply shipped or
compatibility-guaranteed behavior.

Candidate decision rules, cross-cutting evolution rules, and the pending
decision list live in [Future Boundaries](future-boundaries.md) (`draft`) and
are not part of this accepted contract. A few bounded mechanism gaps inside
the extension-API composition below are labeled inline as requiring an RFC;
they do not change any ownership table and do not weaken any normative P0
gate.

## Purpose and scope

This specification assigns terminal-platform mechanisms to Core and optional
experience policy to plugins. It covers the ownership tables, public extension
composition, the zero-plugin baseline, and the security gates that constrain
both domains. Candidate API spellings and future extraction work remain with
their linked specifications; this page does not accept them by implication.

## Normative sources this specification must not weaken

- [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  fixes plugin-only workspace and panel-tab presentation over Core mechanisms.
- The Plugin Platform, Isolation Resource, Rich Presentation, CLI, IPC, and
  Lua contracts named in Document status govern their respective boundaries.
- The security overview, threat model, and risk register linked under
  [Normative security constraints](#normative-security-constraints) remain
  authoritative; no ownership assignment relaxes their P0 controls.

## Terminology

- **Core mechanism**: resource, state, invariant, or enforcement primitive
  retained inside the terminal platform.
- **Plugin policy**: optional behavior, composition, and user experience over
  the public capability-gated API.
- **Terminal Truth**: the grid, cursor, modes, scrollback, and replies that
  plugins may observe only through granted interfaces and never mutate.
- **Implemented / Verified**: distinct lifecycle stages; source presence and
  headless tests do not substitute for independent acceptance evidence.

## Accepted directions

- Keep the foundational terminal lightweight and add more capabilities through
  plugins.
- Keep AI, Agent panes, and related workflows primarily in plugins rather than
  fixed Core product paths.
- Give every plugin its own independent repository.

## Accepted boundary principles

- Core manages resources, state, invariants, and mechanisms. Plugins manage
  behavior, policy, and user experience (accepted via Plugin Platform RFC
  OQ-011/012/013).
- First-party and community plugins use the same API, capabilities, and
  lifecycle, with no private channel (Governance RFC OQ-024).
- The authoritative Plugin API v1 contract text lives in the `bitty-docs`
  corpus ([Plugin API v1 Lua Surface RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/sdk/plugin-api-v1-lua-surface-rfc.md),
  [ADR 0009](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0009-plugin-api-v1-lua-surface.md)). The
  `bitty` repository owns the implementation and parity evidence; the SDK is
  generated output and development support (Plugin Platform RFC).
- The debug protocol sits inside the core boundary. DevTools and MCP consume it
  from outside that boundary (DevTools RFC OQ-019; IPC/Agent RFC OQ-018).

## Decided extraction boundaries

The small-core direction is now decided at the boundary level. Core keeps only
the terminal-emulator mechanisms and security boundaries it cannot delegate:
Terminal Truth, the PTY and process/permission/resource enforcement, identity and
generation fencing, bounded protocol intake, renderer validation, the safe
startup path, package integrity validation, the accessibility baseline, plugin
isolation, and the public host APIs. Everything else is an extension — a
Rust-level component or a Lua plugin — delivered through the same public,
capability-gated interfaces; first-party extensions receive no private bypass.

The decisions below are direction and ownership only. They authorize focused
contracts and later, separately tracked implementation and migration tasks; they
authorize no code by themselves. Dated source observations of retirement and
validation relocation live in the linked disposition record; they do not
establish acceptance of every extraction or migration gate. The accepted boundary decisions are
[ADR 0015 - Small-Core Extraction Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0015-small-core-extraction-boundaries.md)
(`W-70`) and
[ADR 0016 - Execution, Graphics, Accessibility, Storage, and Platform-Service Boundaries](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0016-execution-graphics-accessibility-storage-platform-boundaries.md)
(`W-130`).

| Boundary                           | Retained Core mechanism                                                                                                                                                                     | Focused contract and decision                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observability                      | Minimal, read-only observation seam plus the default-deny authorization gate, redaction, and bounded buffers                                                                                | [`W-71` observability boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/observability-boundary.md) (draft); aligned by `W-110`             |
| Package manager and runtime loader | Startup validation of installed-plugin integrity, compatibility, and capability grants; no network path in Core                                                                             | [`W-72` package-manager boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/package-manager-boundary.md) (accepted); executed by `W-101`     |
| Beacon                             | `TargetEngine` and `AnnotationEngine` targeting and annotation, plus target safety; policy moves to the `beacon` plugin                                                                     | [ADR 0018](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0018-beacon-mechanism-policy-split.md) / `W-03`; host API `W-29`, SDK `W-120`    |
| Composer                           | Terminal Truth, the input pipeline, paste inspection, and process/temp-file permission control                                                                                              | [`W-73` composer boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/composer-boundary.md) (accepted); gated on `W-01`, `W-82`, `W-103`      |
| Legacy chrome                      | Workspace lifecycle and state, panel and layout primitives, the generic chrome mechanism, and the scratchpad slot                                                                           | [`W-74` legacy-chrome retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md) (accepted); `W-104`, ADR 0017       |
| Validation suites                  | None for the two relocated suites; the runtime-owned M1 suites (`m1_mode_input`, `m1_color_title`, `m1_shell_coverage`) and the `bitty-test-support`/`bitty-test-vm` members remain in Core | [`W-75` validation-suite ownership](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/validation-suite-ownership.md) (accepted); executed by `W-105` |

The `W-130`/ADR 0016 set (execution supervisor, graphics decode, platform
accessibility, restricted storage, and platform services) follows the same
retained-mechanism rule and is not repeated here. `W-71` through `W-75` fix
ownership and security boundaries; the corresponding implementation, extraction,
and migration tasks remain gated on their contracts. Dated source changes do
not by themselves establish completion of those tasks.
The cross-repository execution map and dependency order are recorded in the
[small-core refactor execution handoff](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/handoff/2026-10-02-small-core-refactor.md).

## Normative security constraints

The authoritative security requirements are the
[Security Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md), the
[Threat Model](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/threat-model.md), and the
[Security Risk Register](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/risk-register.md). This page describes only
their effect on Core and Plugin ownership:

- Protocol correctness, Terminal Truth, rendering, input encoding, the PTY, and
  security policy cannot be delegated to Lua.
- Plugins cannot enter the terminal, render, or input hot paths and cannot
  receive ambient OS authority.
- Every trust transition must pass the applicable capability, policy,
  authenticated-scope, and resource-budget gates.
- MCP and Agent access is read-only by default. Terminal output is untrusted
  observation data, not instructions.
- Installation cannot execute package code, updates cannot silently elevate
  capabilities, and third-party plugin failure must preserve a safe startup
  path.

These are `Accepted` contracts, `Implemented` but not yet `Verified`
(`Implemented` for IPC/rich headless tests; package dependency resolution is
manager-owned after bitty#1999, so no Core resolver is claimed). A `Verified`
claim requires independent security-auditor and P0-AC acceptance evidence per
the [risk evidence RFC](../specifications/risk-evidence-rfc.md)
(`Specified -> Accepted -> Implemented -> Verified -> Compatible -> Release-ready`).

## Accepted Core ownership

The table describes architecture ownership. It does not claim that every
capability or protocol belongs in the first milestone. Crate presence follows
[ADR 0003](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0003-core-workspace-topology.md)
and is `Implemented` but not yet `Verified`; `bitty-package`
lifecycle and integrity model is `Accepted` (OQ-021) with signatures
still draft, `bitty-lua` `Accepted` (OQ-009/030-032), and `bitty-rich`
is `Implemented`. Under the accepted
[`W-72` package-manager boundary](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/package-manager-boundary.md),
`bitty-package`'s retained Core role narrows to the shared manifest/lock schema,
the bounded parser, and the integrity primitives Core links for read-only
startup validation; install-time package management is contracted to the
external `bitty-plugin-manager`, and Core keeps no network path. IPC,
networking, and agent protocols are partitioned into dedicated L1 Rust Core
Extensions (`bitty-ipc`, `bitty-network`, `bitty-agent`), decoupling them from
Core terminal platform dependencies; `bitty-observability` is an independent
extension repository, and Core's adoption of an observation seam is a decided
direction (`W-71`) that is not yet accepted or implemented. Current revision and
milestone evidence lives in
[project-state.json](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json).

| Domain               | Core mechanisms and invariants                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Process and terminal | PTY/ConPTY, process lifecycle, resize, signals, and I/O backpressure                                 |
| VT and state         | Parser, semantic actions, grid, cursor, modes, scrollback, damage, and replies                       |
| Text                 | UTF-8, graphemes, cell width, combining marks, fallback, bidi, shaping, and emoji                    |
| Protocols            | CSI/OSC/DCS/APC parsing, security limits, and compatible semantics for selected protocols            |
| Images               | Protocol adapters, `ImageStore`, `ImagePlacement`, resource limits, and scrolling/stacking semantics |
| Input                | Keyboard/mouse encoding, IME, focus, paste, and the keymap registry                                  |
| Presentation         | Scene/render snapshots, damage, renderer, glyph cache, and the software-fallback interface           |
| UI primitives        | View, `LayoutNode`, split, stack, overlay, focus, resize, and selection primitives                   |
| Workspaces           | Workspace lifecycle and state: create, close, rename, focus, order, move panels, active workspace    |
| Platform             | Windows, clipboard primitives, DPI, monitors, notification primitives, and the open-URL gate         |
| Extension host       | Command, Event, Capability, plugin lifecycle, API version, and lazy triggers                         |
| Configuration        | Typed runtime configuration, validation, migration, and reload/reconcile semantics                   |
| Reliability          | Error isolation, resource quotas, traces, record/replay hooks, and debug instrumentation             |

Kitty Graphics, Sixel, iTerm2 images, Kitty keyboard, and OSC 7/8/52/133 belong
to the “if supported, Core must implement it correctly” category. The protocol
roadmap still determines their priorities.

Current implementation status (2026-09-16, `bitty` `origin/main` `e8dc9e5`):
the Kitty Graphics path is the only image protocol implemented end to end
(APC `G` intake, bounded PNG/RGB/RGBA decode, and placement in `bitty-rich`;
texture upload and blit in the `bitty-render` present path driven by
`bitty-runtime`); Sixel and iTerm2 inline images have no parser or decode
path, and `ImageSource::Sixel`/`ImageSource::Iterm2` are data-model variants
only. See the [Rich Presentation RFC](../specifications/rich-presentation-rfc.md)
decode/placement evidence and its recorded deviations.

## Accepted Plugin ownership

| Optional experience  | Policy owned by the plugin                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| Tabs                 | Tab strip and tab line presentation over Core panel and workspace commands                              |
| Notifications        | Which events notify, message text, silence rules, and whether to use the OS path; Core keeps the banner |
| Help / which-key     | Help panel content, show/hide policy, and the toggle command over the bounded keymap read API           |
| Splits               | When to split, default direction, layout policy, and key bindings; the split primitive remains in Core  |
| Search               | Search UI, navigation, and history policy using a controlled Terminal snapshot                          |
| Status line          | Presentation of cwd, modes, Git, tasks, and similar state                                               |
| Workspace bar        | Workspace bar, tabs, sidebar, or pills over published workspace state; Core keeps the workspaces        |
| Sessions             | Saving, restoring, naming, and organizing user workflows                                                |
| SSH manager          | Host management and connection UX; PTY and transport security mechanisms remain in Core or a Service    |
| Shell enhancement    | Optional UX for prompt marks, jump-to-prompt, and command regions                                       |
| Project / Git        | Project discovery, status presentation, and command composition                                         |
| Quick/Quake terminal | Window and presentation policy                                                                          |
| AI / Agent           | Provider integration, Agent panes, status, tasks, and context UX                                        |
| MCP client           | Consumption of external MCP services; the MCP adapter for Bitty debug is a separate tool                |
| Palette / picker     | Command palette, file picker, and optional UI                                                           |

The default distribution may bundle some of these plugins, but it cannot grant
first-party plugins additional authority through private APIs.

### Zero-plugin baseline

Status: **accepted** by
[ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
(owner decision 2026-10-01, `bitty` #1558). Workspace is a Core mechanism;
every workspace bar, tab strip, and sidebar is an optional plugin, in the way a
tiling compositor owns workspaces while a separate bar shows them. The
mechanism APIs it relies on are specified in the draft
[Chrome Surface API (Candidate)](../specifications/chrome-surface-api-candidate.md),
whose spellings stay candidate.

With no plugin enabled, Bitty is a plain terminal window comparable to
Alacritty: a shell, the grid, scrollback, selection and clipboard, fonts,
colors, and themes, keymaps, typed configuration, and splits and workspaces as
Core primitives reachable through commands and key bindings. Core owns the
workspace state and semantics, but does not present them. With no workspace
presentation plugin, no workspace strip is drawn and edge bands reserve zero
space; workspace operations remain available through Core commands and key
bindings, including in `bitty --safe`. The Core-strip fallback described in
later candidate records is an unaccepted proposal and deviates from ADR 0014;
it is not the accepted baseline or current source behavior. Other optional
chrome, including tab and status surfaces, remains plugin presentation.
Generic Core chrome-band mechanisms remain available to mounted presentation
plugins and do not themselves imply Core-drawn chrome.

The help/which-key panel follows the same baseline. Once the first-party help
plugin covers it, no plugin means no help panel and no Core `toggle_help`
action; the help chords are supplied by the plugin and are absent in
`bitty --safe`. Until that migration is merged and released, the current
`help.rs` panel is transitional `Implemented`-only evidence, not an accepted
Core feature. The ownership design and removal plan are the
[Help and Which-Key Overlay Ownership Design](../specifications/help-overlay-ownership-design.md).

Retired state (`W-104`, `bitty#1677` `c246e52`, `bitty#1680` `34b6d83`):
the retired Core workspaceline, tab strip, and status-line presentation are no
longer the replacement surface. There is no Core-strip replacement, including
in `bitty --safe`; the optional first-party bar presentation plugin uses
read-only observations. Core retains workspace lifecycle, state, query
commands, and generic chrome-band mechanisms; bands reserve space only for
mounted surfaces. The accepted
[`W-74` legacy-chrome retirement](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/development/legacy-chrome-retirement.md)
contract and
[ADR 0017](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0017-tabs-alias-shell-integration-retirement.md)
assign every legacy path an owner and disposition, retire the
`bitty-terminal.tabs` compatibility alias and the bundled
`bitty-terminal.shell-integration` manifest at a `>= v0.2.0` floor with a
stored-grant migration, and retain the Core mechanism; execution was `W-104`.

### L1 Core Extensions and Programmability

Under Bitty's small-core philosophy, capabilities that do not belong to the
fundamental terminal emulation loop are not built into Core. Instead, Bitty
provides two distinct extension tiers:

1. **L1 Rust Core Extensions**: Standalone first-party Rust repositories providing
   optional, host-side system capabilities without polluting the Core crate graph:
   - `bitty-ipc`: Generic out-of-process IPC bridge (`bitty-ipc-api`, `ipc-auth`,
     `ipc-core`, `ipc-devtools`, `ipc-mcp`), default-off.
   - `bitty-network`: Shared optional networking runtime (`bitty-network-api`,
     `bitty-network`), default-off, network-free Core baseline.
   - `bitty-agent`: AI agent protocol layer (`bitty-agent-api`, `bitty-agent`),
     default-off.
   - `bitty-observability`: Zero-dependency tracing and metrics definitions
     (`bitty-observability-api`). It is an independent extension repository:
     Core has not adopted an observation seam yet, and the decided direction
     (`W-71`) retains only a minimal read-only observation mechanism plus the
     authorization, redaction, and bound rules in Core; the `W-71` contract is
     still a draft.
   - `bitty-plugin-manager`: The external package manager that owns install-time
     package management under the accepted `W-72` boundary; Core keeps only
     read-only startup validation and no network path.
2. **L2 Plugins (Lua Runtime)**: Lightweight, sandboxed user-facing extensions
   running on the embedded Lua VM (`bitty-lua` / `phodopus`). All window chrome
   (workspace bars, statuslines, unified bars) and auxiliary tools (file
   managers, git panels, command palettes) are implemented as L2 plugins.

## Mechanism and policy examples

| Scenario          | Core mechanism                                                                                     | Plugin policy                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Split             | Create, close, resize, and focus `LayoutNode` values                                               | Key bindings, direction, balancing policy, and tab/split UX                   |
| Notifications     | Platform notification primitive, security gate, bounds, and the in-grid banner display floor       | Which events notify, message text, silence rules, and OS-versus-banner policy |
| Help / which-key  | Keymap and action registry, the bounded read API, overlay geometry and stacking, and `Esc` routing | Panel content, show/hide policy, formatting, and the `toggle_help` command    |
| Clipboard         | Platform read/write primitives and OSC 52 policy                                                   | History, formatting, and interaction UI                                       |
| Shell integration | OSC 7/133 parser and semantic zones                                                                | Prompt navigation, status line, and command-history UX                        |
| Images            | Protocol parsing, placement, and quotas                                                            | Image browser, previews, and operation UI                                     |
| Commands          | Registry, dispatch, permissions, and results                                                       | Concrete workflows and composed commands                                      |

### Notification display floor

The in-grid notification banner is the display floor of the notification
primitive, not plugin chrome. Core owns intake, redaction, rate and queue
bounds, the consent and OS gates, and one bounded transient pill; plugins own
which events notify, the message text, and silence policy. The display path
exists in every run, including `bitty --safe` and a run with no OS adapter, so
a plugin-only banner would either lose the notice or force a Core fallback. It
exposes no plugin slot, no hit region, and no per-surface appearance settings.
The full disposition, including the rejected plugin-owned alternative, is the
[Notification Banner Ownership Decision](../specifications/notification-banner-ownership-decision.md).

### Help and which-key presentation

The help/which-key panel is plugin presentation over Core mechanisms. Core
keeps the keymap and action registry, the bounded read API, overlay geometry
and stacking, and `Esc` and confirmation-gate routing; a plugin supplies the
panel content, show/hide policy, and the toggle command. The transition is
staged: the current `help.rs` panel is `Implemented`-only evidence of the
retiring surface, not an accepted Core feature, and the zero-plugin baseline
draws no help panel once the plugin covers it. The design, read-API contract,
and removal plan are the
[Help and Which-Key Overlay Ownership Design](../specifications/help-overlay-ownership-design.md).

## Extension API composition

### Command

The keyboard, menus, command palette, CLI, IPC, and plugins should trigger
behavior through the same Command Registry. Plugins register commands instead of
modifying internal managers.

Command lazy loading is a candidate approach. An unloaded plugin can first
register a command-to-loader mapping. The first invocation creates the plugin
runtime, completes registration, and then replays the command. Failure,
reentrancy, and cancellation semantics require an RFC.

### Event

Events must distinguish at least:

- **Observation events**: read-only notifications such as Terminal creation or
  closure, cwd or title changes, bells, focus, selection, process exit, and
  configuration reload.
- **Interception events**: events that can affect a user action, such as command
  execution, Terminal spawning, paste, and opening a URL.

Interception events must be rare, have timeout and failure policies, and exist
only on cold paths. Fine-grained hot-path events such as byte received, cell
changed, and glyph rendered cannot be exposed to Lua.

### Capability

Plugins cannot directly receive the filesystem, sockets, processes, clipboard,
PTY file descriptors, GPU objects, or window handles. They request capabilities
through host services. Before executing a plugin, its manifest completes
discovery, version checks, dependency resolution, and permission evaluation.

The [Capability families in the Security
Overview](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/security/overview.md#capability-families) are normative. The Core
and Plugin boundary must distinguish at least:

- Terminal semantic read, raw read, self input, all-terminal input, and manage;
- UI rich presentation, overlay, and high-risk protocol registration;
- clipboard read and write;
- filesystem read and write constrained by explicit path patterns;
- fine-grained process, network, runtime, debug, and platform scopes.

Concrete identifiers, default permissions, the user authorization UX, and the
audit format still require an RFC. A generic write or allow-all permission that
does not distinguish target and effect cannot replace the required separation.

### Declarative UI

Plugins should submit declarative descriptions for text, rows, columns, lists,
popups, overlays, and status areas. They cannot create shaders, pipelines,
glyphs, or native windows directly. This keeps the renderer backend replaceable
and prevents the Plugin API from freezing the GPU implementation.

Candidate clarification (see the draft
[Chrome Surface API](../specifications/chrome-surface-api-candidate.md)):
chrome surfaces are generic host mechanisms, not named Core features. Core
reserves edge bands only for mounted surfaces, stacks and renders their
declarative trees within budgets, hit-tests clicks against the rendered
geometry, and dispatches bound commands through the Command Registry. Domain
data (workspaces, panels, terminal status, plugins) reaches plugins through
one uniform pattern: a bounded `<domain>.read` snapshot and events, with
mutations only through registered commands gated by `<domain>.control`.
Which surfaces exist, what they show, and how they compose is plugin policy.

### Lifecycle

The candidate lifecycle model gives every plugin an owner and a generation.
Reload first cancels the old generation's commands, events, timers, tasks, and
UI, then loads a new generation. On failure, it should restore the previous
state or isolate the failure explicitly.

A separate Lua VM for every plugin, a restricted standard library, and
attributable resource budgets are normative P0 gates. They are `Implemented`
but not yet `Verified` until independent P0-AC audit per
[risk evidence RFC](../specifications/risk-evidence-rfc.md); queue budgets
follow the accepted Plugin Platform contract. VM creation cost, generation
reload, cross-plugin services, state migration, and budget-enforcement
mechanisms remain pending `Verified`. Current implementation evidence lives in
[project-state.json](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/project/project-state.json).

## Two security domains

The authoritative security contract requires separate models for Terminal
protocols and Plugin capabilities:

```text
remote/local process -> escape sequence -> TerminalSecurityPolicy -> local resource
Lua plugin           -> host API        -> PluginCapabilities     -> local resource
```

For example, a remote shell requesting the clipboard through OSC 52 and a Lua
plugin invoking the clipboard service have different origins, trust
relationships, and audit events. A single boolean switch cannot cover both merely
because they ultimately access the same clipboard.

The following controls are normative P0 gates, not optional research items:

- Clipboard reads and writes use separate policies. Under the normal policy, an
  OSC 52 read requires explicit consent.
- Protocol and image input has hard limits for payload, decoded pixels,
  dimensions, time, and aggregate storage.
- Image-file and shared-memory access is denied by default and passes through a
  controlled regular-file and path policy.
- Plugins use per-plugin VMs, restricted standard libraries, and budgets for CPU,
  instructions, memory, tasks, callbacks, and queues.
- Cross-boundary requests for URLs, notifications, filesystems, processes,
  networks, runtime, and debug carry an origin and a fine-grained capability.

RFCs decide thresholds, enforcement mechanisms, platform differences, and user
interaction only. Whether configuration scripts and runtime plugins share a
capability model remains open, but that decision cannot weaken the P0 gates
above.

## Security review

The normative constraints and two security domains above are the review basis.
No ownership table permits ambient authority, a private first-party channel,
hot-path Lua execution, or a weakened protocol/resource limit. Independent
security-auditor and P0-AC evidence remains required before any `Verified`
claim; this documentation correction supplies none of that runtime evidence.

## Verification plan

Boundary acceptance follows `Specified -> Accepted -> Implemented -> Verified`.
The following existing mechanisms and gates require independent evidence:

- Architecture tests inspect the crate dependency DAG and prevent lower layers
  from depending on higher layers (`Implemented`, pending `Verified`).
- The parser, Terminal state, and image decoder receive fuzzing as
  untrusted-input surfaces (headless soak `Implemented`, `Verified` pending).
- Recorded corpora and reference implementations support differential and replay
  tests (`Implemented`).
- The renderer consumes only a public snapshot or model and does not read
  Terminal private structures (`Implemented` via `bitty-render` snapshot).
- First-party plugins use only the public SDK. CI cannot allow a feature flag to
  bypass a capability (Governance RFC OQ-024).
- Debug consumers read state only through a versioned protocol and do not link
  application-private types (`Accepted` DevTools RFC OQ-019; `Implemented` but not yet `Verified`).

## Alternatives considered

- Put workspace state and commands behind a plugin: rejected by ADR 0014
  because workspace operations must work with zero plugins and in safe mode.
- Keep Core-drawn bars or tabs: rejected by ADR 0014; presentation is optional
  plugin policy over generic geometry and commands.
- Give first-party plugins private APIs: prohibited by the accepted boundary
  and capability model; bundled status changes neither authority nor lifecycle.

## Affected contracts

The Plugin Platform and public Lua surface govern extension composition;
the [Workspace Compositor](../specifications/workspace-compositor.md) owns
layout and workspace mechanisms. The
[Legacy Chrome and Validation Suite Disposition](../specifications/legacy-chrome-and-validation-disposition.md)
records retirement consequences, and the
[Phodopus Host ABI candidate](../specifications/phodopus-host-abi-candidate.md)
retains its draft status. The
[Notification Banner Ownership Decision](../specifications/notification-banner-ownership-decision.md)
fixes the notification primitive's display floor, and the
[Help and Which-Key Overlay Ownership Design](../specifications/help-overlay-ownership-design.md)
fixes the help/which-key ownership split and the bounded keymap read API. This
page changes none of their API spellings.

## Open points

Candidate decision rules, cross-cutting evolution rules, health signals, and
the pending decision list are tracked in [Future Boundaries](future-boundaries.md)
(`draft`). They refine this accepted contract without changing any ownership
table and without weakening any normative P0 gate.

The exact Lua spellings and capability identifier for the keymap/action read
surface stay open under `OQ-056`; the ownership split and bounds are fixed by
the help design record. The notification policy (`OQ-076`) remains open and is
separate from the banner's ownership.

The inline Command, Event, Capability, and Lifecycle discussions retain their
unresolved lazy-loading, scope, migration, and verification questions; this
page settles no new API or enforcement threshold.

## Acceptance criteria

- Ownership tables agree with the accepted mechanism/policy decisions and
  keep all workspace and panel-tab presentation in plugins.
- The zero-plugin and safe-mode baseline retains Core commands, reserves no
  workspace band, and introduces no built-in strip fallback.
- The notification banner stays the Core notification primitive's display
  floor and exposes no plugin slot, hit region, or per-surface appearance
  policy.
- Once the help migration is shipped, the zero-plugin and `bitty --safe`
  baseline also draws no help panel and keeps `toggle_help` out of the Core
  action catalog.
- Dependency and source inventories name their revision and do not promote
  draft APIs or Implemented-only mechanisms to `Verified`.
- All verification and P0 gates above remain required; documentation gates
  establish prose consistency only.

## P0 Review Sign-off

Independent security-auditor and P0-AC acceptance remains pending as stated in
Document status and Normative security constraints. No new sign-off or risk
transition is recorded by this correction.

## References

- [ADR 0014](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0014-workspace-core-presentation-plugins.md)
  — accepted workspace and panel-tab ownership.
- [Notification Banner Ownership Decision](../specifications/notification-banner-ownership-decision.md)
  — in-grid banner stays the Core notification primitive's display floor.
- [Help and Which-Key Overlay Ownership Design](../specifications/help-overlay-ownership-design.md)
  — plugin presentation, bounded keymap read API, and Core removal plan.
- [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md)
  — runtime successor direction.
- [Risk evidence RFC](../specifications/risk-evidence-rfc.md) — lifecycle and
  independent evidence requirements.
- [Future Boundaries](future-boundaries.md) — candidate evolution and pending
  decisions.
- `bitty` `1c68de25`, `crates/bitty-lua/Cargo.toml` — dependency inventory,
  not host-ABI acceptance or runtime verification.
