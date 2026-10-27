---
title: Positioning in the Agent Era
description: Explains why falling implementation cost raises the value of system semantics, contracts, and verification, and how Bitty's small core and session host fit that shift
category: product
audience: mixed
document_type: explanation
status: draft
website_publish: false
sidebar_order: 17
---

# Positioning in the Agent Era

> Status: **draft explanation, not an accepted decision.** It records why the
> project's small-core direction and the `bittyd` session host are complementary
> rather than competing bets. It cites accepted sources instead of redefining
> them, commits no roadmap, and claims no implementation.

## Purpose and scope

Agent-integrated terminals are multiplying: some bundle an agent, some add a
daemon and a session sidebar, some stay pure renderers and let an agent harness
run inside them. This document explains what that market is actually competing
on, why feature parity stops being a useful differentiator once implementation
gets cheap, and where Bitty's architecture sits in that shift.

In scope: the economics of cheap implementation, the four observable product
archetypes, Bitty's chosen position, and the conditions under which that
position fails.

Out of scope: competitor roadmaps, pricing, market forecasts, and any claim
about another product's internals beyond its publicly documented shape. It also
does not restate the accepted product direction in the
[Bitty Product Vision](vision.md); it elaborates the "why now" beside it.

## Normative sources this document must not weaken

- [Bitty Product Vision](vision.md) (`accepted`): small core, plugin
  extensions, agent-friendly rather than agent-centric, and the zero-plugin
  baseline.
- [Small-Core Capability Floor](../specifications/small-core-capability-floor.md)
  (`accepted`): what `bitty --safe` guarantees and what belongs to extensions.
- [bittyd Scope Charter](../specifications/bittyd-scope-charter.md) (`draft`):
  the session-host mechanism floor this document refers to.
- [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md)
  (`accepted`): the local daemon staging, daemon-absent operation, and the
  per-domain single-writer rule.
- [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md)
  (`accepted`): the detach/reattach and remote trust-boundary gates.
- [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md)
  (`accepted`): the extension runtime, closed capability families, and the
  native-payload prohibition.
- [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md)
  (`accepted`): the agent-facing scopes and the read-only default.
- [Core and Plugin Boundaries](../architecture/core-boundaries.md)
  (`accepted`): Core mechanisms versus extension policy.

## What changes when implementation gets cheap

The useful distinction is not "AI writes code" but **which costs fall and which
do not**.

| Cost                        | Direction with cheap generation | Why                                                                                          |
| --------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| First working version       | Falls sharply                   | Boilerplate, scaffolding, and common patterns are the easiest thing to generate.             |
| Feature-list breadth        | Falls sharply                   | Each additional surface is cheaper to demo than to make correct.                             |
| Discovering the requirement | Barely moves                    | Someone still has to decide what should exist and what must not.                             |
| Understanding the system    | Barely moves                    | Interaction between lifecycle, authority, and failure modes is not visible in a diff.        |
| Verification and evidence   | Rises in relative terms         | More generated code means more surface to confirm, and confirmation is not automatable away. |
| Long-run operation          | Rises in relative terms         | Logs, state growth, migrations, and recovery failures accumulate over months, not demos.     |

Two consequences follow.

First, **supply expands faster than adoption**. When the cost of a credible demo
falls, more products appear with similar feature lists, and users can no longer
tell them apart by checking boxes. Differentiation moves to things that are
expensive to fake: reliability, coherent semantics, extension ecosystems, and
the cost of being wrong.

Second, **the binding constraint moves from generation to verification**. A
team that can produce ten implementations but cannot tell which one survives a
month has not gained leverage; it has gained options it cannot evaluate. The
scarce skill is not writing the code, it is knowing which questions to ask of it.

### The failure mode is not reinvention; it is uninformed reinvention

Reimplementation is often correct: a new architecture may need a new
abstraction, an existing implementation may have limits that cannot be worked
around, or the new design may be materially safer.

The failure mode is repeating **the same lifecycle costs** without knowing they
exist. A terminal agent panel is a good example. The demo is quick; the
questions that decide whether it is a product are not:

| Question                                                      | Who must own the answer                                     |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| What happens when the agent process exits unexpectedly?       | Session host: lifecycle, reaping, terminal causes           |
| Does work continue after the user closes the panel?           | Session host: attach/detach and lease semantics             |
| How do several agents share context without contaminating it? | AI layer: generation-scoped context and snapshot boundaries |
| How is "working" versus "waiting for you" defined?            | A status contract between agent events and presentation     |
| May a plugin read sensitive files?                            | Core: capability grants and consent ledger                  |
| What happens to old plugins when the API changes?             | Plugin platform: versioning and compatibility               |
| Do logs, caches, and state grow without bound over months?    | Retention policy plus enforced bounds                       |

Only the first two are session-host mechanisms. The last is a bounds mechanism
plus a retention policy, and the middle four are contracts that must exist
somewhere. If they do not exist in the platform, every integration invents its
own — which is how a category ends up with many similar products and no shared
reliability.

## Why feature parity stops being differentiation

If a competitor can generate the same visible feature in a week, then the
feature is not a moat; it is table stakes. What remains defensible is the part
that cannot be generated from a description:

- **Semantics that hold under failure.** What happens on crash, reconnect,
  takeover, upgrade, or partial write.
- **Authority that can be audited.** Who was allowed to do what, recorded where,
  revocable by whom.
- **Extension ceilings.** Whether a third party can replace the experience
  without forking the product.
- **Operational honesty.** Bounded queues, explicit retention, no silent loss,
  no unbounded growth.

These are architectural properties. They are also the properties a demo cannot
show, which is exactly why they remain differentiating after demos become cheap.

## Four archetypes

The market is easier to reason about as four archetypes than as a list of
products. Examples are illustrative of the archetype, not a claim about every
feature of every product.

| Archetype                      | Session owner                 | Strength                                                            | Structural limit                                                        |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Single-process terminal        | The window                    | Rendering and input quality; minimal surface; predictable resources | A session and a window share a lifetime; no cross-client session facts  |
| Multiplexer server             | A server process              | Durable sessions, attach/detach, remote familiarity                 | The server owns policy too: status bar, copy-mode, keybindings, config  |
| Daemon-backed agent terminal   | A purpose-built daemon        | Durable sessions plus visible agent status plus a control CLI       | Status and control are inferred at the text layer; no capability model  |
| Vertically integrated platform | The vendor's cloud and client | Coherent end-to-end UX, governance, managed execution               | The agent, the workflow, and the execution environment are the vendor's |

Each archetype solves something real. Each also leaves something unowned:

- the single-process terminal has no shared session semantics at all;
- the multiplexer server has session semantics but a low extension ceiling,
  because the server also owns the experience;
- the agent-native daemon has session durability but typically decides status
  and drive semantics itself, at the text layer, without a capability model;
- the integrated platform has the best out-of-box experience and the least
  substitutability.

None of these is wrong. They are different bets about where value accrues.

## Bitty's position

Bitty's bet is that the durable position is **the substrate, not the agent**:

> **A narrow semantic surface, stable contracts, and a wide product surface.**

This requires correcting a common reading of "small core". Small core does not
mean "few features and the rest is plugins". It means:

- the core owns **few semantic facts**, but owns them completely;
- the contracts around those facts are **stable and versioned**;
- the product surface above them is **wide, replaceable, and not required for
  the baseline**.

In practice there are three layers, with one direction of authority:

```text
terminal core      PTY, grid, scrollback, input, render, config
      |
session host       registry, lifecycle, generations, leases, audit
      |
extensions         panels, status, workflow, agents, providers, approvals
```

The terminal core is thin because a terminal must be correct before it is
extensible. The session host is thinner because it exists only to own facts no
one else can own. Extensions are thick because that is where products differ.

### The zero-plugin constraint

A platform whose value only appears after installing many extensions loses to a
product that works out of the box. The accepted zero-plugin baseline exists for
this reason: with no plugin enabled, Bitty must still be a good terminal.

This yields a rule that governs every ownership argument:

> Extensions are amplifiers, not a passing grade.

Anything without which the terminal is incomplete belongs in the core. Anything
on which reasonable products disagree belongs in an extension. The
[Small-Core Capability Floor](../specifications/small-core-capability-floor.md)
applies that rule to the terminal; the
[bittyd Scope Charter](../specifications/bittyd-scope-charter.md) applies it to
the session host.

## Why the session host is the differentiator, not a feature

"Durable sessions" sounds like a feature. It is better understood as **the
absorber of repeated cost**.

Without a session host, every agent integration reimplements recovery, attach
semantics, stale-generation rejection, and terminal-cause recording. With one,
those costs are paid once and shared by every consumer — the GUI, `bitty ctl`,
agent adapters, and any external harness.

That is the same move the Language Server Protocol made: before it, every editor
implemented every language, and every language implemented every editor; after
it, both sides depend on a neutral contract instead of each other.

Applied here: if the session-host surface stays generic and versioned, then
agent harnesses become clients of the terminal instead of each terminal
inventing its own agent integration. Bitty does not need to build the agent to
benefit from every agent.

Two disciplines make or break that:

1. **Session facts, not session content.** The host owns registry, lifecycle,
   fences, leases, and refusal audit. It must not own prompts, context, tools,
   or approvals.
2. **A neutral, published contract.** A private API for one harness turns the
   host into that harness's daemon and forfeits the ecosystem argument.

The scope charter exists to enforce the first; the conformance suite and service
versioning exist to make the second adoptable.

## Platform conditions

An extension platform needs more than a good UI architecture. Four conditions,
and where Bitty stands:

| Condition                                | Status                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Isolated extension runtime               | Present in the accepted direction: restricted VM, closed capability families, no native payloads.             |
| Neutral protocol for external ecosystems | Partial: the agent-facing IPC contract exists; a published, conformance-tested session protocol does not yet. |
| Trust and distribution layer             | Incomplete: package lifecycle and integrity exist; signing, registry, and provenance are not settled.         |
| Baseline quality without extensions      | Required by the accepted zero-plugin floor; it must keep holding as features land.                            |

The first is an architecture problem, the second is a contract problem, the
third is an ecosystem problem, and the fourth is a discipline problem. Feature
work does not substitute for any of them.

## Non-goals

- **Not a terminal built around one agent.** The product does not become a
  coding-agent front end, and it does not adopt a single agent's workflow as its
  own.
- **Not a bundled agent platform.** Bitty does not ship a first-party agent as
  the reason to use it; agents arrive as consumers or extensions.
- **Not a cloud execution product.** Remote hosts and cloud workers need their
  own accepted transport and trust contract; they are not roadside additions.
- **Not feature-parity accretion.** Closing a feature gap by absorbing the
  feature into the core is rejected when the feature is policy.
- **Not a plugin-required experience.** If the terminal is not good with zero
  plugins, the platform argument has already failed.

## What would falsify this position

A position that cannot fail is marketing. These are the observable signals that
would mean the bet is wrong, and they should be checked rather than argued:

- **Baseline drift.** Users need a set of extensions before the terminal is
  usable, or `bitty --safe` stops being a credible daily driver.
- **Protocol non-adoption.** Agent harnesses each ship their own daemon or
  terminal integration, and none adopts the neutral session surface; the host
  then reduces to a local feature rather than an ecosystem layer.
- **Verification without demand.** The reliability and audit properties exist
  but do not change adoption, because buyers select on demo speed alone.
- **Daemon capture.** The daemon becomes required for startup, diagnostics, or
  single-window use, contradicting `ADR 0019` `D5`; the small-core promise then
  breaks from the inside.
- **Policy creep.** Status judgment, notification policy, or workflow logic
  lands in the daemon because it was convenient; the extension ceiling drops to
  the multiplexer outcome.

## Open points

- Which contract defines agent status semantics (`working`, `waiting`,
  `needs-approval`) and which layer computes it.
- Whether the session-host surface is published as a standalone protocol with a
  conformance suite, and who owns that publication.
- Which distribution and signing model turns extensions into a trusted
  ecosystem rather than a list of repositories.
- Whether the first external consumer beyond the project's own harness will
  adopt the neutral surface, and what evidence would demonstrate it.
- How the zero-plugin baseline is measured over time, so "extensions are
  amplifiers" stays true rather than aspirational.

## References

- Direction: [Bitty Product Vision](vision.md),
  [Panel Extensibility Vision](panel-vision.md).
- Floor and boundaries:
  [Small-Core Capability Floor](../specifications/small-core-capability-floor.md),
  [bittyd Scope Charter](../specifications/bittyd-scope-charter.md),
  [Core and Plugin Boundaries](../architecture/core-boundaries.md).
- Session staging:
  [ADR 0019](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0019-bittyd-staging-advance.md),
  [ADR 0008](https://github.com/bitty-terminal/bitty-docs/blob/main/docs/decisions/adrs/ADR-0008-headless.md),
  [bittyd Session-Host Contract](../specifications/bittyd-session-host-contract.md),
  [promotion record](../specifications/bittyd-session-host-promotion-record.md).
- Agent and extension contracts:
  [IPC and Agent RFC](https://github.com/bitty-terminal/bitty-ai-docs/blob/main/specifications/ipc-agent-rfc.md),
  [Plugin Platform RFC](https://github.com/bitty-terminal/bitty-plugins-docs/blob/main/specifications/plugin-platform-rfc.md).
