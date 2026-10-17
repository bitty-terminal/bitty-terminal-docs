---
title: Phodopus Host ABI (Candidate)
description: Draft candidate direction for the terminal-side Phodopus Lua runtime boundary, async host trampoline, utf8 versus typography split, and bitty-lua deferral
category: specifications
audience: contributor
document_type: specification
status: draft
website_publish: false
sidebar_order: 39
---

# Phodopus Host ABI (Candidate)

## Document status

> Status: **draft candidate** — not **Accepted**, not **Verified**, not
> **Compatible**, and not normative. This document is a design record for the
> terminal-platform slice of the successor direction to adopt **Phodopus** (a
> sandbox-first successor fork of Piccolo) as the generic Lua runtime behind
> `bitty-lua`. The direction itself is now recorded as accepted in
> [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md);
> this terminal-side host-ABI record stays **draft** until the `bitty-lua`
> migration lands, and `bitty-lua` still depends on `piccolo` 0.3.3 today. It
> authorizes no shipped, stable, or compatibility-guaranteed behavior, weakens
> no accepted source it cites, and makes no implementation claim. Crate names,
> call spellings, and bounds repeated here are direction, not contract.

## Purpose and scope

The Phodopus direction spans several owning repositories: the generic runtime
and its standard library, the sandboxed module resolver, the plugin ecosystem
binding, and the Bitty host layer. This document freezes only the
**terminal-platform side** — the `bitty-lua` Host ABI boundary and the
terminal-owned consequences — so future design work starts from a stable input
instead of reconstructing the cross-repository discussion.

In scope (all **Candidate** unless cited otherwise):

- P-1: `bitty-lua` as the only Bitty-specific consumer of a generic Lua runtime.
- P-2: the typed pending-handle async trampoline across the host boundary.
- P-3: standard Lua `utf8.*` kept distinct from terminal typography.
- P-4: the six-phase roadmap ending at Bitty integration, and the `bitty-lua`
  implementation deferral.

Out of scope and owned elsewhere (pointers, not content):

- the generic VM, compiler, stackless executor, `gc-arena` cycle collector, and
  Fuel mechanism (owner-pending, the `phodopus` runtime project);
- the modular standard library, native Lua patterns, and `utf8.*` implementation
  (owner-pending, the `phodopus` runtime project);
- the sandboxed module resolver (`require`, searcher chain, capability VFS),
  hard memory quotas, and capability-gated resource accounting (owner-pending,
  the `phodopus` runtime project and the plugin ecosystem);
- the plugin-side `HostOp` consumer mapping, `LuxPackageSearcher` binding, and
  dependency-management direction (draft candidate,
  [Phodopus Plugin Runtime (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/phodopus-runtime-candidate.md));
- plugin manifest, capability grammar, and package lifecycle (accepted,
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md),
  [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md),
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md));
- shared governance and the supersession of the Piccolo watch-list clause
  (recorded, [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md),
  [bitty-docs](https://github.com/bitty-terminal/bitty-docs)).

## Normative sources this specification must not weaken

The scope and relation tables cite the accepted Lua Runtime, Plugin Host Runtime, Plugin Platform, isolation, and Core boundary contracts. Those retain per-plugin isolation, restricted libraries, budgets, host-service Send behavior, and Terminal Truth ownership. ADR 0012 records the successor direction without moving current pins or accepting the terminal-side ABI mechanisms below.

## Terminology

### Status vocabulary

| Status            | Meaning in this document                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| Accepted          | An accepted specification already requires the rule; this document only restates it. |
| Candidate         | Proposed by the recorded owner direction only; no review has accepted it.            |
| Owner-pending     | Belongs to another repository owner; recorded here as a pointer, never as content.   |
| Illustrative-only | A sketch whose spelling, bounds, or defaults are explicitly undecided.               |

## P-1 Runtime boundary: one Bitty-specific consumer (Candidate)

**Candidate.** `bitty-lua` remains the only Bitty-specific consumer of a generic
Lua runtime. The generic VM and its standard library stay Bitty-agnostic:

- no `bitty.ui`, `bitty.panel`, `bitty.fs`, or `bitty.command` knowledge inside
  the VM core or its standard library;
- no hard Tokio (or other async-runtime) dependency in the VM core;
- Bitty-specific host surfaces mount strictly on top of the generic runtime, as
  an unprivileged consumer.

Terminal-side conclusions, composed with the accepted contracts:

- The accepted [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md)
  and its sandbox, standard-library subset, module search, and diagnostics
  contract stay authoritative for the plugin VM; this direction changes no
  accepted clause and weakens no normative P0 gate.
- The accepted per-plugin VM, restricted standard library, and resource
  ceilings remain in force ([Core and Plugin Boundaries](../architecture/core-boundaries.md#lifecycle),
  [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)).
  A Bitty-agnostic VM core is what makes those ceilings attributable and the
  runtime independently auditable.
- The generic runtime is an independent sibling project; the accepted
  dependency policy still governs its adoption, whose direction is recorded in
  [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md)
  without changing the current pins.

**Open.** The exact crate split, crate names, and the host-seam module boundary
between `bitty-lua` and the generic runtime; and the licensing and vendoring
policy for the adopted runtime. The governance supersession of the Piccolo
watch-list clause of the accepted dependency and Lua-pin ADRs is recorded as a
direction in ADR 0012; its adoption timing remains deferred with the migration.

## P-2 Async host ABI: typed pending-handle trampoline (Candidate)

**Candidate.** Asynchronous host operations cross the boundary as a typed
pending-handle trampoline. The VM yields a suspension descriptor, for example
`HostOp::Pending(handle)`, back to the host; the host adapter drives the
corresponding future and resumes the suspended Lua coroutine when the operation
completes. The VM core mandates no specific async runtime.

Terminal-side conclusions, composed with the accepted contracts:

- The host adapter — not the VM core — owns future polling, wakeup, and
  coroutine resume; this replaces a NOOP-waker path that cannot drive an
  external future.
- The accepted host-service wiring boundary and its synchronous non-blocking
  `Send` contract stay authoritative
  ([Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md));
  this direction composes with it and does not restate or amend it.
- Pending handles are bounded and cancellable under the accepted budget model;
  a host operation must fail closed under the accepted timeouts rather than
  block the terminal or the plugin VM.
- No async mechanism enters the terminal hot paths; the accepted hot-path
  isolation and no-plugin-in-hot-path rules remain in force
  ([Performance Budget RFC](performance-budget-rfc.md)).

**Open.** The `HostOp` variant set and handle representation; the cancellation,
ordering, and re-entrancy semantics of resume; the bounded pending-queue size
and timeout attribution; and how the trampoline composes with the accepted
`Send` boundary without weakening it.

## P-3 utf8 code points versus terminal typography (Candidate)

**Candidate.** Standard Lua `utf8.*` operates on Unicode **code points** and
stays distinct from terminal typography. Terminal width, grapheme clustering,
and East Asian Width are not the concern of `utf8.*` and must not be conflated
with it:

- Lua `utf8.*` — decoding, iteration, and encoding over code points;
- terminal typography — grapheme clusters (UAX #29), cell width, and East Asian
  Width (UAX #11), owned by the terminal text domain.

Terminal-side conclusions, composed with the accepted contracts:

- Terminal Truth width and grapheme mapping remain terminal-owned and are never
  delegated to Lua
  ([Core and Plugin Boundaries](../architecture/core-boundaries.md#normative-security-constraints));
  this restates the accepted boundary and adds no new authority.
- The current single width implementation and its compact-approximation caveat
  stay as recorded in the draft [Text and Rendering RFC](text-rendering-rfc.md)
  and [Text Compatibility (draft)](text-compatibility.md); a Lua string helper
  must not become a second, divergent width authority.
- A plugin that needs display width requests it through a terminal host surface
  (for example a future `bitty.text.width`), not through `utf8.*`.

**Open.** The exact terminal-side width surface name and shape; whether the host
exposes a grapheme-segmentation helper alongside width; and how the direction
composes with the pending authoritative width tables and ambiguous-width policy
of the text-domain drafts.

## P-4 Roadmap and deferral (Candidate)

**Candidate.** The path to Bitty integration is a six-phase roadmap that ends
with the Bitty host ABI:

1. baseline fork with preserved history and attribution;
2. absorb mature upstream contributions (formatting, patterns, `utf8`, stack
   diagnostics);
3. build the module resolver and standard-library gaps;
4. hard memory quotas, Fuel policy, and capability sandboxing;
5. generic async bridge with an optional host adapter;
6. Bitty integration through the `bitty-lua` Host ABI.

The terminal-side consequence is a **deferral**: `bitty-lua` implementation work
waits until the generic runtime is usable at the required phase. Until then the
accepted mlua/Lua 5.4 contract and the accepted Lua-pin decision remain
unchanged, and no `bitty-lua` runtime swap is claimed or scheduled.

- The accepted Lua Runtime RFC and the accepted Lua-pin, `os.getenv`, and
  async/GC ADR decisions stay authoritative today
  ([Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md),
  [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md)
  and the [bitty-docs decisions](https://github.com/bitty-terminal/bitty-docs)).
- The deferral is not a rejection of the accepted path; it is a scheduling
  statement that this document records without editing any accepted status.

**Open.** The phase-to-milestone mapping, the readiness gate that ends the
deferral, and the migration and parity evidence required before any runtime
swap at the `bitty-lua` seam.

## Relation to existing systems

| Direction                  | Status                                                                     | Owning document                                                                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-1 runtime boundary       | Candidate; accepted Lua Runtime RFC and per-plugin VM ceilings unchanged   | [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md) (Accepted), [Core and Plugin Boundaries](../architecture/core-boundaries.md) (Accepted)                                                    |
| P-2 async trampoline       | Candidate composing with the accepted host-service `Send` contract         | [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md) (Accepted), [Performance Budget RFC](performance-budget-rfc.md) (Accepted)                                                 |
| P-3 utf8 versus typography | Candidate restating the accepted Terminal Truth split                      | [Text and Rendering RFC](text-rendering-rfc.md) (Draft), [Text Compatibility (draft)](text-compatibility.md) (Draft)                                                                                                                                    |
| P-4 roadmap and deferral   | Candidate; accepted mlua/Lua 5.4 contract unchanged until a readiness gate | [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md) (Accepted), [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md) (Accepted) |

## Related owner records

- Governance decision and Piccolo successor-fork record (Accepted): [ADR 0012](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md)
  records the successor direction, refining but not rewriting the accepted
  [ADR 0004](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0004-upstream-dependencies.md)
  and [ADR 0005](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0005-lua-pins-and-stdlib.md)
  pins; it does not migrate code or change the current runtime. This document
  still decides nothing.
- Plugin-runtime candidate (Draft) — module resolution, sandbox quotas, async
  bridge, and dependency binding:
  [Phodopus Plugin Runtime (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/phodopus-runtime-candidate.md);
  the plugin-side halves are not restated here.
- Generic runtime project and generic-runtime documentation:
  [phodopus](https://github.com/bitty-terminal/phodopus).
- Plugin-ecosystem halves — `LuxPackageSearcher`, `PluginVfsSearcher`, and the
  Lua UI standard library:
  [bitty-plugins-docs](https://github.com/bitty-terminal/bitty-plugins-docs).

## Security review

The proposed generic VM gains no Bitty-specific or ambient host authority. Pending operations remain bounded/cancellable and must fail closed under accepted timeouts without entering terminal hot paths. Terminal width/grapheme truth stays terminal-owned, and plugin sandbox/library/memory ceilings remain authoritative. Exact handle cancellation, re-entrancy, queue bounds, and parity evidence are still open.

## Verification plan

P-4 defers integration until generic-runtime readiness, and its open item requires migration/parity evidence before a bitty-lua runtime swap. Review must reconcile P-2 with the accepted Send host boundary and bounded pending semantics and P-3 with the text-domain width authority. This candidate supplies no swap, benchmark, test result, or completed host-ABI acceptance.

## Alternatives considered

P-1 separates a Bitty-agnostic VM from its one Bitty-specific host consumer rather than embedding Bitty APIs/runtime dependencies in the VM. P-2 assigns future polling and coroutine resume to the adapter rather than a NOOP-waker path. P-3 keeps code-point utf8 helpers distinct from typography, and P-4 defers the swap until readiness instead of claiming adoption from the direction alone.

## Affected contracts

The Relation to existing systems and Related owner records retain the accepted Lua/plugin/security contracts, draft text-domain contracts, generic Phodopus ownership, and plugin-side resolver/binding ownership. ADR 0012's accepted direction does not change current pins through this record; exact ABI, adoption timing, and terminal width surface remain pending.

## Open points

### Open items (not global open questions)

None of these is a global `OQ`: this document proposes no new contract boundary
and blocks no current-milestone gate, so they stay parked here until one
qualifies. A reviewed governance ADR, runtime RFC, or host-ABI specification
settles them:

- the generic runtime adoption, licensing, and governance supersession (P-1);
- the `HostOp` variant set, handle representation, cancellation, and bounded
  pending semantics (P-2);
- the terminal-side width surface name, grapheme helper, and composition with
  the pending authoritative width tables (P-3);
- the phase-to-milestone mapping and the readiness gate that ends the `bitty-lua`
  deferral (P-4).

## Acceptance criteria

The reviewed governance/runtime/host-ABI track identified in Open points must settle adoption/licensing, bounded HostOp/resume semantics, terminal typography surfaces, and the readiness/migration parity gate. Until then the accepted contracts stay authoritative and this terminal-side record remains draft; no runtime swap is claimed or scheduled.

## P0 Review Sign-off

No P0 acceptance of the host-ABI candidate is recorded. The accepted sandbox/resource/hot-path controls remain in force, while cancellation, pending bounds, migration parity, and readiness await their owning reviews. ADR 0012's direction does not self-accept these mechanisms.

## References

- [Core and Plugin Boundaries](../architecture/core-boundaries.md) — accepted
  mechanism-versus-policy split, declarative-UI boundary, and P0 gates.
- [Lua configuration and filesystem layout](../configuration/lua-and-xdg.md) —
  candidate Lua configuration contract and appearance surface.
- [Text and Rendering RFC](text-rendering-rfc.md) — draft text, grapheme, width,
  and East Asian Width contract.
- [Text Compatibility (draft)](text-compatibility.md) — draft Unicode
  text-domain and IME-adjacent contract.
- [Performance Budget RFC](performance-budget-rfc.md) — accepted hot-path and
  budget rules.
- [Lua Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/lua-runtime-rfc.md)
  — accepted Lua runtime, sandbox, and standard-library subset.
- [Plugin Host Runtime RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/plugin-host-runtime-rfc.md)
  — accepted host bridge, VM lifecycle, and host-service `Send` contract.
- [Isolation and Resource RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/isolation-resource-rfc.md)
  — accepted isolation boundaries and resource ceilings.
- [Phodopus Plugin Runtime (Candidate)](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/runtime/phodopus-runtime-candidate.md)
  — draft plugin-side counterpart; module resolution, sandbox quotas, async
  bridge, and Lux binding.
- [ADR 0012 — Phodopus Runtime as the Lua Successor Path](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0012-phodopus-runtime.md)
  — accepted successor-direction record; `bitty-lua` migration deferred.
- [bitty-docs](https://github.com/bitty-terminal/bitty-docs) — shared
  governance, ADRs, and the open-question register.
