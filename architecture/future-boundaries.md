---
title: Future Boundaries
description: Draft candidate decision rules, cross-cutting evolution rules, and pending decisions for the Bitty core and plugin boundary.
category: architecture
audience: plugin-author
document_type: specification
status: draft
website_publish: false
sidebar_order: 22
---

# Future Boundaries

This document is `draft`. It tracks candidate decision rules, cross-cutting
evolution rules, and pending decisions for the Core and Plugin boundary. It is
the evolution companion to [Core and Plugin Boundaries](core-boundaries.md)
(`accepted`): nothing here changes any accepted ownership table and nothing
here weakens any normative P0 gate. Candidate text here does not authorize
shipped, stable, or compatibility-guaranteed behavior.

Provenance: extracted from `core-boundaries.md` by CTX-0007 so that each
document carries one truthful machine-readable status.

## Candidate decision rule

To decide whether a capability belongs in Core, first ask:

> Without it, can Bitty still be a correct, secure, compatible, and presentable
> terminal emulator?

If the answer is no, the capability belongs in Core or in a Core primitive.
Then ask:

> Does it primarily define a user workflow, layout policy, or optional
> experience?

If the answer is yes, it should preferentially be a plugin.

If adopted, this rule will matter more than a permanently frozen feature list.
New requirements should pass through these two questions first.

## Candidate 009 cross-cutting rules

The following rules are candidates from the platform-architecture research
direction. They refine the candidate decision rule above; they do not change
any accepted ownership table and do not weaken any normative P0 gate.

### Primitive-or-composable test

For every new capability ask:

> Is it a Platform Primitive, or is it composable from existing primitives?

`Workspace`, `Panel`, `Focus`, `Event`, `Command`, `Service`, `Capability`,
`IPC`, and `Terminal Session` are candidate Platform Primitives. `AI`,
`Git`, file management, and similar experiences are candidate composables
that belong in plugins. A capability that fails this test as a primitive
but is proposed for Core anyway requires an explicit ADR justifying why
composition is insufficient.

### Semantic API stability rule

The Lua API exposes system semantics, never Rust implementation structure,
so that Rust may refactor freely while the Lua surface stays stable:

```lua
-- Accepted v1 semantic API spellings (ADR 0009; Plugin API v1 Lua Surface RFC).
bitty.terminal.snapshot({ scope = "semantic" })
bitty.ui.mount("statusline", component)
bitty.services.get("ai.chat", { version = ">=2.0" })
```

```lua
-- Deliberately unsupported direction: Rust internals must never be public.
terminal.grid.rows[3].cells[5].glyph
bitty.ipc.send_raw_frame(...)
bitty.renderer.draw(...)
```

Concretely: Rust owns mechanism (PTY, VT, GPU, IPC framing, concurrency,
streaming, HTTP/SSE, resource bounds, capability enforcement, terminal
state, provider protocols, lifecycle) while Lua owns policy (keymaps,
workflows, commands, panel composition, automation, plugin behavior,
prompt logic, provider preference, UX). In short: Rust makes things
possible and safe; Lua decides how they are used.

### Health signals beyond lines of code

Total lines of code must never be compared directly against minimal
terminals: Bitty carries a config runtime, Lua VM, plugin host, package
manager, workspace model, UI extension, rich content, IPC, agent
infrastructure, and security model that a bare emulator omits. Healthier
candidate signals:

- **Dependency direction**: the crate graph stays close to a DAG with no
  reverse edges from lower layers to higher ones.
- **Stable API surface growth**: the public Rust API, Lua API, IPC
  protocol, plugin manifest, and service API grow slowly; surface growth
  is more dangerous than line growth.
- **Core hot path isolation**: nothing from Lua, plugins, IPC, or AI
  enters the PTY read, VT, state, snapshot, and render path.
- **Failure containment**: each subsystem failure degrades only its owner
  (AI crash removes AI, plugin crash disables that plugin, IPC crash
  removes control) while the terminal keeps working.
- **Core-to-total ratio**: core complexity grows slowly while ecosystem
  lines grow through composition; irreducible complexity and its placement
  matter more than totals.

Related extensibility challenges that remain open as follow-up work:
dependency-conflict resolution, service disappearance semantics, and UI
composition conflicts (multiple plugins claiming panels, status areas, or
input). Dependency cycles are already rejected and lifecycle, capability,
and event-storm controls are already accepted in the
[Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md); the three
open items above still require their own RFCs.

## Pending decisions

- The minimum Command, Event, UI, and Service set for the first Plugin API
  version.
- The manifest format and dependency resolution; the current candidate is
  `bitty-plugin.toml`.
- The implementation mechanism for per-plugin VMs, asynchronous callbacks, and
  resource-budget thresholds and enforcement. The VM bridge, lifecycle, source
  staging, and host-service wiring are defined by the accepted
  [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-host-runtime-rfc.md)
  (OQ-033/OQ-034/OQ-035, ratified through
  [ADR 0010](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0010-plugin-host-runtime-acceptance.md));
  implementation evidence remains per-crate.
- Plugin signing, source trust, installation, and update models.
- The default bundled-plugin set and disabling behavior.
- Observation-event batching, dropping, and backpressure semantics.
- Which user actions allow interception and the default behavior after a
  timeout.
